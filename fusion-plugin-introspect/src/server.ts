/** Copyright (c) 2018 Uber Technologies, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */
import type App, {FusionPlugin} from 'fusion-core';
import {createPlugin, html} from 'fusion-core';
import parser from 'koa-bodyparser';
import {collectDependencyData} from './collectDependencyData.js';
import {collectMetadata} from './collectMetadata.js';
import * as fsStore from './fs-store.js';

const {parseRuntimeMetadata} = require('./shared/parseRuntimeMetadata.js');
const {getMaxWordWidth} = require('./shared/getMaxWordWidth.js');
const {listDependencies} = require('./shared/listDependencies.js');
const {listSourceLines} = require('./shared/listSourceLines.js');
const {sortDependencies} = require('./shared/sortDependencies.js');
const {describeUsage} = require('./shared/describeUsage.js');
const {graphParents} = require('./shared/graphParents.js');
const {graphChildren} = require('./shared/graphChildren.js');
const {describeType} = require('./shared/describeType.js');
const path = require('path');

export type IntrospectionSchema = {
  version: string,
  server: Array<Dependencies>,
  browser: Array<Dependencies>,
  runtime: Metadata,
};
export type Dependencies = {
  timestamp: number,
  dependencies: Array<Dependency>,
  enhanced: Array<{name: string}>,
};
export type Dependency = {
  name: string,
  stack: string,
  dependencies: Array<string>,
};
export type Metadata = {
  timestamp: number,
  pid: number,
  nodeVersion: string,
  npmVersion: string,
  yarnVersion: string,
  lockFileType: string,
  dependencies: {[string]: string},
  devDependencies: {[string]: string},
  varNames: Array<string>,
  vars: {[string]: string},
};

const plugin = (app: App, {store, env = [], deps = {}}: Object = {}) => {
  // istanbul ignore else
  if (__NODE__) {
    if (!app) throw new Error('`app` is required for introspection');

    // allow store to be falsy, so we can do `app.register(introspect(app, {store: !__DEV__ && someStore})`
    // istanbul ignore next
    if (!store) store = fsStore;

    let data = {};
    let browserDataCollected = false;

    // collect data once at startup to at least have some data in case of a crash
    // $FlowFixMe
    data.version = require(`${__dirname}/../package.json`).version; // eslint-disable-line import/no-dynamic-require
    data.server = [collectDependencyData(app)];
    data.runtime = collectMetadata('.', env);
    // store as much as we can before running the DI resolution algorithm (which could throw an error that we cannot catch)
    store.storeSync(data);

    return createPlugin({
      deps,
      middleware(deps) {
        // if the DI graph is resolvable, collect dep data again in case this plugin was registered too early
        data.server = [collectDependencyData(app)];

        // the data is the same in every browser session, so just collect once:
        // 1) if browser data has not been collected, write a <meta> tag in the HTML template
        // 2) if the browser detects the meta tag, it sends an XHR request with the browser data
        // 3) the server stores the browser data and sets a flag to store it
        // 4) subsequent requests no-op due to the flag being set
        const parse = parser();
        return async (ctx, next) => {
          if (!browserDataCollected) {
            if (ctx.element) {
              ctx.template.head.push(html` <meta name="diagnostics" /> `);
            }
            if (ctx.method === 'POST' && ctx.path.startsWith('/_diagnostics')) {
              ctx.status = 200;
              ctx.body = 'OK';
              // if requests happen in parallel, ensure only one triggers store call
              // by setting flag in same tick as flag check at the top of this middleware function
              browserDataCollected = true;
              // only then do async stuff
              await parse(ctx, async () => {});
              data.browser = [ctx.request.body]; // as array, to avoid schema break if we ever need to log per-browser graphs
              await store.store(data, deps);
            }
          } else if (
            ctx.method === 'POST' &&
            ctx.path.startsWith('/_diagnostics')
          ) {
            ctx.status = 200;
            ctx.body = 'OK';
          }
          if (
            ctx.method === 'GET' &&
            ctx.path.startsWith('/_diagnostics_api')
          ) {
            if (ctx.path.startsWith('/_diagnostics_api/tokens')) {
              const data = await parseRuntimeMetadata();

              const tabulateTokens = (data, type) => {
                const space = ' '.repeat(getMaxWordWidth(data[type]) + 2);
                return sortDependencies(listDependencies(data[type]))
                  .map((dep) => {
                    const name = dep.name;
                    return (
                      `${name}${space.slice(name.length)}` +
                      listSourceLines(dep, 'register').join(space)
                    );
                  })
                  .join('\n');
              };

              const lists = [
                data.browser
                  ? `Browser:\n${tabulateTokens(data, 'browser')}\n\n`
                  : '',
                data.server
                  ? `Server:\n${tabulateTokens(data, 'server')}\n\n`
                  : '',
              ];

              ctx.response.body = lists.filter(Boolean).join('\n');
            } else if (ctx.path.startsWith('/_diagnostics_api/why')) {
              var token = ctx.query.token;

              const data = await parseRuntimeMetadata();
              const deps = listDependencies(data.server);
              const dep = deps.find((dep) => dep.name === token);

              if (!dep) return '';

              const explanation = [
                describeType(dep, token),
                describeUsage(dep, token),
                `${token} is used by:\n` + graphParents(deps, token),
                `${token} depends on:\n` + graphChildren(deps, token),
              ];

              ctx.response.body = explanation.filter(Boolean).join('\n');
            } else if (ctx.path.startsWith('/_diagnostics_api/middleware')) {
              const data = await parseRuntimeMetadata();

              const tabulateTokens = (data, type) => {
                const space = ' '.repeat(getMaxWordWidth(data[type]) + 2);
                const deps = sortDependencies(listDependencies(data[type]));

                const list = [];
                deps.forEach((dep) => {
                  const name = dep.name;
                  const sources = listSourceLines(dep, 'plugin');
                  if (['middleware', 'both'].includes(dep.type)) {
                    list.push(
                      `${name}${space.slice(name.length)}${sources[0]}`
                    );
                  }
                });
                return list.join('\n');
              };

              const lists = [
                data.browser
                  ? `Browser:\n${tabulateTokens(data, 'browser')}\n\n`
                  : '',
                data.server
                  ? `Server:\n${tabulateTokens(data, 'server')}\n\n`
                  : '',
              ];

              ctx.response.body = lists.filter(Boolean).join('\n');
            } else if (ctx.path.startsWith('/_diagnostics_api/where')) {
              token = ctx.query.token;

              const data = await parseRuntimeMetadata();
              const dep = [
                ...listDependencies(data.server || []),
                ...listDependencies(data.browser || []),
              ].find((dep) => dep.name === token);

              if (!dep) {
                ctx.response.body = 'No dependencies';
                return;
              }

              const sources = listSourceLines(dep, 'register').map((source) => {
                return path.resolve(process.cwd(), source);
              });

              ctx.response.body = sources.join('\n');
            }
          }
          return next();
        };
      },
    });
  }
};

export default ((plugin: any): (App, Object) => FusionPlugin<void, void>);
