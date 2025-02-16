/** Copyright (c) 2018 Uber Technologies, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LoggerConfig} from 'winston';

import {createToken} from 'fusion-core';
import type {Token} from 'fusion-core';

export const UniversalLoggerConfigToken: Token<LoggerConfig<any>> = createToken(
  'UniversalLoggerConfigToken'
);
