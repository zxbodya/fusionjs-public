/** Copyright (c) 2018 Uber Technologies, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/* eslint-env browser */
import NodePerformanceEmitterPlugin from '../src/browser';

test('null export, as expected', () => {
  expect(NodePerformanceEmitterPlugin).toBe(null);
});
