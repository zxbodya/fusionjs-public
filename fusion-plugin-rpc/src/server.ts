/** Copyright (c) 2018 Uber Technologies, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

/* eslint-env node */

import bodyparser from 'koa-bodyparser';
import formidable from 'formidable';

import {createPlugin, memoize, RouteTagsToken} from 'fusion-core';
import type {Context} from 'fusion-core';
import {UniversalEventsToken} from 'fusion-plugin-universal-events';
import type {Fetch} from 'fusion-tokens';

import MissingHandlerError from './missing-handler-error';
import ResponseError from './response-error';
import {
  BodyParserOptionsToken,
  RPCHandlersToken,
  RPCHandlersConfigToken,
} from './tokens.js';
import type {HandlerType} from './tokens.js';
import type {RPCPluginType, IEmitter} from './types.js';
import {formatApiPath} from './utils.js';

const statKey = 'rpc:method';

/* Helper function */
function hasHandler(handlers: HandlerType, method: string): boolean {
  return Object.prototype.hasOwnProperty.call(handlers, method);
}

class RPC {
  ctx: ?Context;
  emitter: ?IEmitter;
  handlers: ?HandlerType;
  fetch: ?Fetch;

  constructor(emitter: IEmitter, handlers: any, ctx: Context): RPC {
    if (!ctx || !ctx.headers) {
      throw new Error('fusion-plugin-rpc requires `ctx`');
    }
    this.ctx = ctx;
    this.emitter = emitter;
    this.handlers = handlers;

    return this;
  }

  async request<TArgs, TResult>(method: string, args: TArgs): Promise<TResult> {
    const startTime = ms();

    if (!this.ctx) {
      throw new Error('fusion-plugin-rpc requires `ctx`');
    }
    if (!this.emitter) {
      throw new Error('fusion-plugin-rpc requires `emitter`');
    }
    const scopedEmitter = this.emitter.from(this.ctx);

    if (!this.handlers) {
      throw new Error('fusion-plugin-rpc requires `handlers`');
    }
    if (!hasHandler(this.handlers, method)) {
      const e = new MissingHandlerError(method);
      if (scopedEmitter) {
        scopedEmitter.emit('rpc:error', {
          method,
          origin: 'server',
          error: e,
        });
      }
      throw e;
    }
    try {
      const result = await this.handlers[method](args, this.ctx);
      if (scopedEmitter) {
        scopedEmitter.emit(statKey, {
          method,
          status: 'success',
          origin: 'server',
          timing: ms() - startTime,
        });
      }
      return result;
    } catch (e) {
      if (scopedEmitter) {
        scopedEmitter.emit(statKey, {
          method,
          error: e,
          status: 'failure',
          origin: 'server',
          timing: ms() - startTime,
        });
      }
      throw e;
    }
  }
}

const pluginFactory: () => RPCPluginType = () =>
  createPlugin({
    deps: {
      RouteTags: RouteTagsToken.optional,
      emitter: UniversalEventsToken,
      handlers: RPCHandlersToken,
      bodyParserOptions: BodyParserOptionsToken.optional,
      rpcConfig: RPCHandlersConfigToken.optional,
    },

    provides: (deps) => {
      const {emitter, handlers} = deps;

      const service = {
        from: memoize((ctx) => new RPC(emitter, handlers, ctx)),
      };
      return service;
    },

    middleware: (deps) => {
      const {emitter, handlers, bodyParserOptions, rpcConfig} = deps;
      if (!handlers)
        throw new Error('Missing handlers registered to RPCHandlersToken');
      if (!emitter)
        throw new Error('Missing emitter registered to UniversalEventsToken');
      const parseBody = bodyparser(bodyParserOptions);

      const apiPath = formatApiPath(
        rpcConfig && rpcConfig.apiPath ? rpcConfig.apiPath : 'api'
      );

      return async (ctx, next) => {
        await next();
        const routeTags = (deps.RouteTags && deps.RouteTags.from(ctx)) || {};
        const scopedEmitter = emitter.from(ctx);
        if (ctx.method === 'POST' && ctx.path.startsWith(apiPath)) {
          const startTime = ms();
          // eslint-disable-next-line no-useless-escape
          const pathMatch = new RegExp(`${apiPath}([^/]+)`, 'i');
          const [, method] = ctx.path.match(pathMatch) || [];
          if (hasHandler(handlers, method)) {
            routeTags.name = method;
            let body;
            try {
              if (
                ctx.req &&
                ctx.req.headers &&
                ctx.req.headers['content-type'] &&
                ctx.req.headers['content-type'].indexOf(
                  'multipart/form-data'
                ) !== -1
              ) {
                const form = new formidable.IncomingForm();
                body = await new Promise((resolve, reject) => {
                  form.parse(ctx.req, (err, fields: {[string]: any}, files) => {
                    if (err) {
                      reject(err);
                    }

                    resolve({
                      ...fields,
                      ...files,
                    });
                  });
                });
              } else {
                await parseBody(ctx, () => Promise.resolve());
              }
            } catch (e) {
              ctx.body = {
                status: 'failure',
                data: {
                  message: e.message,
                  code: e.type || 'ERR_BAD_BODY',
                  meta: e.meta,
                },
              };
              if (scopedEmitter) {
                scopedEmitter.emit(statKey, {
                  method,
                  error: e,
                  status: 'failure',
                  origin: 'browser',
                  timing: ms() - startTime,
                });
              }
              // don't try to call handler
              return;
            }

            try {
              const result = await handlers[method](
                body || ctx.request.body,
                ctx
              );
              ctx.body = {
                status: 'success',
                data: result,
              };
              if (scopedEmitter) {
                scopedEmitter.emit(statKey, {
                  method,
                  status: 'success',
                  origin: 'browser',
                  timing: ms() - startTime,
                });
              }
            } catch (e) {
              const error =
                e instanceof ResponseError
                  ? e
                  : new Error(
                      __DEV__
                        ? 'UnknownError - Use ResponseError from fusion-plugin-rpc (or fusion-plugin-rpc-redux-react if you are using React) package for more detailed error messages'
                        : 'Internal Server Error'
                    );
              ctx.body = {
                status: 'failure',
                data: {
                  message: error.message,
                  // $FlowFixMe
                  code: error.code,
                  // $FlowFixMe
                  meta: error.meta,
                },
              };
              if (scopedEmitter) {
                scopedEmitter.emit(statKey, {
                  method,
                  error: e,
                  status: 'failure',
                  origin: 'browser',
                  timing: ms() - startTime,
                });
              }
            }
          } else {
            const e = new MissingHandlerError(method);
            ctx.body = {
              status: 'failure',
              data: {
                message: e.message,
                code: e.code,
              },
            };
            ctx.status = 404;
            if (scopedEmitter) {
              scopedEmitter.emit('rpc:error', {
                origin: 'browser',
                method,
                error: e,
              });
            }
          }
        }
      };
    },
  });

/* Helper functions */
function ms() {
  const [seconds, ns] = process.hrtime();
  return Math.round(seconds * 1000 + ns / 1e6);
}

export default ((__NODE__ && pluginFactory(): any): RPCPluginType);
