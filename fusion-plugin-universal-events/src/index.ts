/** Copyright (c) 2018 Uber Technologies, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {createToken} from 'fusion-core';
import type {FusionPlugin, Token} from 'fusion-core';

import ServerEvents from './server';
import BrowserEvents from './browser';
import type {
  IEmitter,
  UniversalEventsPluginDepsType as DepsType,
} from './types';

const UniversalEventsPlugin: FusionPlugin<DepsType, IEmitter> = __BROWSER__
  ? BrowserEvents
  : ServerEvents;

// eslint-disable-next-line prettier/prettier
export default UniversalEventsPlugin;

export const UniversalEventsToken: Token<IEmitter> = createToken(
  'UniversalEventsToken'
);

export * from './storage/index';

export type UniversalEventsDepsType = DepsType;
export type UniversalEventsType = IEmitter;
