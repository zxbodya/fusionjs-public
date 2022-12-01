/** Copyright (c) 2018 Uber Technologies, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

/* eslint-env browser */
import ReactDOM from 'react-dom';

import type {Element} from 'react';

export default (root: Element<*>) => {
  const domElement = document.getElementById('root');

  if (!domElement) {
    throw new Error("Could not find 'root' element");
  }

  ReactDOM.hydrate
    ? ReactDOM.hydrate(root, domElement)
    : ReactDOM.render(root, domElement);
};
