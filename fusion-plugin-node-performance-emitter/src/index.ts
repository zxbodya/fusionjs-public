/** Copyright (c) 2018 Uber Technologies, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// Main export file
import browser from './browser.js';
import server from './server.js';

const plugin = __NODE__ ? server : browser;

// Use comment so server is unused and therefore pruned from browser
/*::
type PluginType = typeof server;
*/

// Cast to typeof server for now to avoid requiring consumers to use refinements
export default ((plugin: any): PluginType);

export {
  NodePerformanceEmitterToken,
  TimersToken,
  EventLoopLagIntervalToken,
  MemoryIntervalToken,
  SocketIntervalToken,
} from './tokens';
