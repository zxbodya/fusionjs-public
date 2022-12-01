/** Copyright (c) 2018 Uber Technologies, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

/* eslint-env browser */

import {UniversalEventsToken} from 'fusion-plugin-universal-events';
import {createPlugin} from 'fusion-core';
import type {FusionPlugin} from 'fusion-core';
import browserPerfCollector from './helpers/enhancedBrowserMetrics';
import type {BrowserPerfDepsType} from './flow';
import {getTimeFromMarks} from './utils';

class BrowserPerformanceEmitter {
  tags: {route: string};
  constructor() {
    this.tags = {route: window.location.href};
  }

  calculate(timing, resourceEntries) {
    if (
      (!window.performance ||
        !window.performance.timing ||
        !window.performance.getEntriesByType) &&
      !timing &&
      !resourceEntries
    ) {
      return {};
    }

    timing = timing || window.performance.timing;
    resourceEntries =
      resourceEntries ||
      window.performance
        .getEntriesByType('resource')
        .filter((entry) => {
          return entry.name.indexOf('data:') !== 0 && entry.toJSON;
        })
        .map((entry) => entry.toJSON());

    return {
      timing,
      resourceEntries,
      paintTimes: this.getPaintTimes(),
    };
  }

  /* Helper methods */
  getPaintTimes() {
    let firstPaint = null;
    let firstContentfulPaint = null;
    const paint = window.performance.getEntriesByType('paint');
    if (paint) {
      firstPaint = getTimeFromMarks(paint, 'first-paint');
      firstContentfulPaint = getTimeFromMarks(paint, 'first-contentful-paint');
    } else if (typeof window.performance.timing.msFirstPaint === 'number') {
      // IE
      firstPaint =
        window.performance.timing.msFirstPaint -
        window.performance.timing.navigationStart;
    } else {
      return null;
    }
    return {
      firstPaint,
      firstContentfulPaint,
    };
  }
}

const plugin: FusionPlugin<BrowserPerfDepsType, void> =
  // $FlowFixMe
  __BROWSER__ &&
  createPlugin({
    deps: {emitter: UniversalEventsToken},
    middleware: (deps) => {
      const emitter = deps.emitter;
      const emit = (payload) => {
        emitter.emit('browser-performance-emitter:stats:browser-only', payload);
      };

      return async (ctx, next) => {
        const browserPerformanceEmitter = new BrowserPerformanceEmitter();

        window.addEventListener('load', () => {
          // window.performance.timing.loadEventEnd not ready until the next tick
          window.setTimeout(() => {
            // for testing purposes pass timing and resourceEntries from options
            const {timing, resourceEntries, paintTimes} =
              browserPerformanceEmitter.calculate();
            emit({
              timing,
              resourceEntries,
              paintTimes,
              tags: browserPerformanceEmitter.tags,
              // Piggy-back enhaned metrics, for perf dashboard etc on this emit.
              // Eventually this will probably be the only data emitted but preserving
              // legacy data shape for now
              enhancedMetrics: browserPerfCollector(window),
            });
          }, 0);
        });

        return next();
      };
    },
  });
export default plugin;
