/** Copyright (c) 2018 Uber Technologies, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/* eslint-env browser */
import * as React from "react";

import FusionApp, {
  createToken,
  createPlugin,
  CriticalChunkIdsToken,
  SSRDeciderToken,
  type Context,
} from "fusion-core";
import { prepare } from "./async/index";
import PrepareProvider from "./async/prepare-provider";
import { LoggerToken } from "fusion-tokens";

import serverRender from "./server";
import clientRender from "./client";

import ProviderPlugin from "./plugin";
import ProvidedHOC from "./hoc";
import Provider from "./provider";

import {
  FusionContext,
  ServiceConsumer,
  ServiceContext,
  useService,
  withServices,
} from "./context";

export const SkipPrepareToken = createToken<boolean>("SkipPrepareToken");

export type Render = (el: React.ReactElement<any>, context: Context) => any;

declare var __NODE__: Boolean;

export default class App extends FusionApp {
  constructor(root: React.ReactElement<any>, render?: Render | null) {
    if (!React.isValidElement(root)) {
      throw new Error(
        "Invalid React element. Ensure your root element is a React.Element (e.g. <Foo />) and not a React.Component (e.g. Foo)"
      );
    }
    const getService = (token) => {
      // $FlowFixMe
      const provides = this.getService(token);
      const isRequiredToken = Boolean(token.optional);
      if (typeof provides === "undefined" && isRequiredToken) {
        throw new Error(
          `Token ${token.name} not registered or registered plugin does not provide a service. To use an optional plugin, use \`Token.optional\`.`
        );
      }
      return provides;
    };
    // Defined here to access closure value of this. fusion-react inherits from fusion-core/core
    // which is where the boundary is defined
    const resolvePrepareBoundary = () => {
      // $FlowFixMe[reference-before-declaration]
      this.prepareBoundary.done();
    };
    const renderer = createPlugin({
      deps: {
        criticalChunkIds: CriticalChunkIdsToken.optional,
        skipPrepare: SkipPrepareToken.optional,
        logger: LoggerToken.optional,
        ssrDecider: SSRDeciderToken,
      },
      provides({ skipPrepare, logger, ssrDecider }) {
        return (el: React.ReactElement<any>, ctx) => {
          return (skipPrepare ? Promise.resolve() : prepare(el, ctx))
            .catch(() => {}) // recover from failed `prepare`
            .then(() => {
              resolvePrepareBoundary();
              if (render) {
                return render(el, ctx);
              }
              if (__NODE__) {
                return serverRender(el, ctx, logger, ssrDecider);
              } else {
                return clientRender(el, logger);
              }
            });
        };
      },
      middleware({ criticalChunkIds }) {
        return (ctx, next) => {
          if (__NODE__ && !ctx.element) {
            return next();
          }

          const markAsCritical = __NODE__
            ? (chunkId) => {
                // Push to legacy context for backwards compat w/ legacy SSR template
                ctx.preloadChunks.push(chunkId);

                // Also use new service if registered
                if (criticalChunkIds) {
                  let chunkIds = criticalChunkIds.from(ctx);
                  chunkIds.add(chunkId);
                }
              }
            : noop;

          // This is used to collect arbitrary metadata during a given SSR
          // The primary use case is to collect bundler-specific information
          // about import() statements encountered during SSR so that async
          // bundle-split client code can be preloaded/fetched appropriately
          ctx.ssrMetadata = [];
          const pushSSRMetadata = __NODE__
            ? (metadata) => {
                ctx.ssrMetadata.push(metadata);
              }
            : noop;

          ctx.element = (
            <PrepareProvider
              markAsCritical={markAsCritical}
              pushSSRMetadata={pushSSRMetadata}
            >
              <FusionContext.Provider value={ctx}>
                <ServiceContext.Provider value={getService}>
                  {ctx.element}
                </ServiceContext.Provider>
              </FusionContext.Provider>
            </PrepareProvider>
          );
          return next();
        };
      },
    });
    super(root, renderer);
  }
}

export {
  FusionContext,
  ProviderPlugin,
  ProvidedHOC,
  Provider,
  ServiceConsumer,
  ServiceContext,
  useService,
  withServices,
};

function noop() {}

export * from "./async/index";
