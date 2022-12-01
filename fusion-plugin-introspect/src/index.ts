/** Copyright (c) 2018 Uber Technologies, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import browser from "./browser";
import server from "./server";
import * as fs from "./fs-store";

export type {
  IntrospectionSchema,
  Dependencies,
  Dependency,
  Metadata,
} from "./server";

export default __NODE__ ? server : browser;
// $FlowFixMe
export const fsStore = __NODE__ ? fs : undefined;
