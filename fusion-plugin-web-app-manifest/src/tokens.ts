/** Copyright (c) 2019 Uber Technologies, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {createToken} from 'fusion-core';
import type {Token} from 'fusion-core';
import type {WebAppManifestType} from './types.js';

export const WebAppManifestToken: Token<WebAppManifestType> = createToken(
  'WebAppManifestToken'
);
