/** Copyright (c) 2018 Uber Technologies, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */
/* eslint-env browser */

import {createPlugin} from 'fusion-core';
import type App, {FusionPlugin} from 'fusion-core';
import {collectDependencyData} from './collectDependencyData.js';

const plugin = (app: App, _: any) => {
  /* istanbul ignore else  */
  if (__BROWSER__) {
    /* istanbul ignore else  */
    if (document.querySelector('meta[name=diagnostics]')) {
      const x = new XMLHttpRequest();
      x.open('POST', `${getRoutePrefix()}/_diagnostics`);
      x.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
      x.send(JSON.stringify(collectDependencyData(app)));
    }
    return createPlugin({});
  }
};
export default ((plugin: any): (App, Object) => FusionPlugin<void, void>);

function getRoutePrefix() {
  return window.__ROUTE_PREFIX__ || '';
}
