/** Copyright (c) 2018 Uber Technologies, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import React from 'react';
import {createToken, type Context, type Token} from 'fusion-core';
import type {ApolloClient} from 'apollo-client';

/*::
import {GraphQLOptions} from 'apollo-server-koa';
type GraphQLOptionsType = typeof GraphQLOptions;
*/

export type InitApolloClientType<TInitialState> = (
  ctx: Context,
  initialState: TInitialState
) => ApolloClient<TInitialState>;

// We should have better flow types for the schema
export const GraphQLSchemaToken: Token<any> = createToken('GraphQlSchemaToken');

export type ApolloContext<T> = (a: Context) => T | T;

export const ApolloContextToken: Token<ApolloContext<unknown>> =
  createToken('ApolloContextToken');

export const ApolloCacheContext = React.createContext<any>();

export const GraphQLEndpointToken: Token<string> = createToken(
  'GraphQLEndpointToken'
);

export const ApolloClientToken: Token<InitApolloClientType<unknown>> =
  createToken('ApolloClientToken');

export const GetDataFromTreeToken: Token<any> = createToken(
  'GetDataFromTreeToken'
);

type BodyParserConfigType = {
  enableTypes?: Array<string>;
  encoding?: string;
  formLimit?: string;
  jsonLimit?: string;
  textLimit?: string;
  strict?: boolean;
  detectJSON?: (ctx: Context) => boolean;
  extendTypes?: any;
  onerror?: (err: any, ctx: Context) => any;
  disableBodyParser?: (ctx: Context, next: () => Promise<any>) => Promise<any>;
};

export const ApolloBodyParserConfigToken: Token<BodyParserConfigType> =
  createToken('ApolloBodyParserConfigToken');

export const ApolloDefaultOptionsConfigToken: Token<GraphQLOptionsType> =
  createToken('ApolloDefaultOptionsConfigToken');
