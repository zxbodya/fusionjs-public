/** Copyright (c) 2018 Uber Technologies, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/* eslint-env node */
import MockEmitter from "events";

import App, { createPlugin } from "fusion-core";
import { UniversalEventsToken } from "fusion-plugin-universal-events";
import { getSimulator } from "fusion-test-utils";

import type { FusionPlugin } from "fusion-core";

import BrowserPerformanceEmitterPlugin from "../src/server";

/* Mock Results */
const mockTiming = {
  connectEnd: 1467935411926,
  connectStart: 1467935411926,
  domComplete: 1467935412992,
  domContentLoadedEventEnd: 1467935412858,
  domContentLoadedEventStart: 1467935412729,
  domInteractive: 1467935412729,
  domLoading: 1467935412016,
  domainLookupEnd: 1467935411926,
  domainLookupStart: 1467935411926,
  fetchStart: 1467935411926,
  loadEventEnd: 1467935412992,
  loadEventStart: 1467935412992,
  navigationStart: 1467935411926,
  redirectEnd: 0,
  redirectStart: 0,
  requestStart: 1467935411933,
  responseEnd: 1467935412008,
  responseStart: 1467935412007,
  secureConnectionStart: 0,
  unloadEventEnd: 1467935412009,
  unloadEventStart: 1467935412009,
};

const mockResourceEntries = [
  {
    initiatorType: "link",
    name: "http://localhost:5663/trips-viewer/stylesheets/main.css",
    entryType: "resource",
    startTime: 132.92000000000002,
    duration: 4.435000000000002,
  },
  {
    initiatorType: "link",
    name: "https://d1a3f4spazzrp4.cloudfront.net/uber-icons/3.13.0/uber-icons.css",
    entryType: "resource",
    startTime: 132.995,
    duration: 77.06,
  },
  {
    initiatorType: "link",
    name: "https://d1a3f4spazzrp4.cloudfront.net/uber-fonts/4.0.0/superfine.css",
    entryType: "resource",
    startTime: 133.06500000000003,
    duration: 83.655,
  },
  {
    initiatorType: "script",
    name: "http://localhost:5663/trips-viewer/javascripts/main.js",
    entryType: "resource",
    startTime: 133.355,
    duration: 16.785000000000025,
  },
  {
    initiatorType: "link",
    duration: 155.39500000000007,
    entryType: "resource",
    name: "https://image.et.uber.com/lib/fe8c12737c64037b71/m/1/us_144x144_teal_community.png",
    startTime: 150.095,
  },
  {
    initiatorType: "link",
    name: "http://localhost:5663/trips-viewer/stylesheets/main.css?someVersion=foo",
    entryType: "resource",
    startTime: 132.92000000000002,
    duration: 4.435000000000002,
  },
  {
    initiatorType: "script",
    duration: 4.545000000000073,
    entryType: "resource",
    name: "https://www.google-analytics.com/collect?v=1&_v=j41&a=2108927418&t=pageview&_s=1&dl=https%3A%2F%2Fweb-platform.uberinternal.com%2Ftrips-viewer%2Fuser&dr=https%3A%2F%2Fapp.onelogin.com%2Ftrust%2Fsaml2%2Fhttp-post%2Fsso%2F358421%3FSAMLRequest%3DnVPBjpswEP0V5DsQSLLLWiESzapqpG2LEtprNbGHXUvGpvbQpH9fQ5Iqh24OPdnMPN578xhWHjrd82qgN7PDnwN6ik6dNp5PjZINznALXnluoEPPSfB99fmF58mM986SFVazqL7cPigjlXm9%252F9rhDPL8U9PUcf1137DoOzqvrClZALBo6%252F2AW%252BMJDIXSLHuIZ4s4nzXZI5%252FnfDlCnkuWLQtY5nMBD2KxKB4zODy1oijmT60Mh0QWVd6jo0C8scYPHbo9ul9K4LfdS8neiHrP0%252FSIh7jXQK11XTIc0ClD6AzoRNgutUpCSCcd8%252FghzjRsvRof%252BeTT3QR2f3C4umHrqzb0fWINavuqzCQ3sqQdEkggSOfLYpFnq%252FRG7Szd8y%252BBfvtcW63E76jS2h43DoGwZOSGMPrHMA3Q%252B4ayJJsqSsbtBOXYgdKVlA69Z%252BlV57IVKKcdCTkSnija2K4Hp%252Fz4yfAEgq6R3KI2Oky8w%252FZ%252FAroLE1yM1KFch%252BNonRwXEEVw2TgwvreOLqH9y8%252F63Htntr%252Fd259i%252FQc%253D%26RelayState%3D%252Ftrips-viewer%252F&dp=trips-viewer&ul=en-us&de=UTF-8&dt=User%20Info&sd=24-bit&sr=2560x1440&vp=1180x818&je=0&fl=21.0%20r0&_u=AACAAEABI~&jid=&cid=1657993685.1456163541&tid=UA-7157694-45&z=2009568991",
    startTime: 1700.3400000000001,
  },
];

const mockEvent = {
  timing: mockTiming,
  resourceEntries: mockResourceEntries,
  firstPaint: null,
  tags: null,
};

/* Fixture */
function createTestFixture() {
  const app = new App("content", (el) => el);
  app.register(BrowserPerformanceEmitterPlugin);
  return app;
}

/* Tests */
test("Correct metrics are emitted", () => {
  const mockEmitter = new MockEmitter();
  const mockEmitterPlugin: FusionPlugin<any, any> = createPlugin({
    provides: () => mockEmitter,
  });

  const app = createTestFixture();
  app.register(UniversalEventsToken, mockEmitterPlugin);

  // Process emits
  expect.assertions(14);
  const handlePerfEvent = function (event) {
    const calculatedStats = event.calculatedStats;
    expect(calculatedStats).not.toBe(undefined);

    const redirectionTimeArgs = calculatedStats.redirection_time;
    const timeToFirstByteArgs = calculatedStats.time_to_first_byte;
    const domContentLoadedArgs = calculatedStats.dom_content_loaded;
    const fullPageLoadArgs = calculatedStats.full_page_load;
    const dnsArgs = calculatedStats.dns;
    const tcpConnectionTimeArgs = calculatedStats.tcp_connection_time;
    const browserRequestTimeArgs = calculatedStats.browser_request_time;
    const browserRequestFirstByteArgs =
      calculatedStats.browser_request_first_byte;
    const browserRequestResponseTimeArgs =
      calculatedStats.browser_request_response_time;
    const domInteractiveTimeArgs = calculatedStats.dom_interactive_time;
    const totalResourceLoadTimeArgs = calculatedStats.total_resource_load_time;
    const totalBlockingResourceLoadTimeArgs =
      calculatedStats.total_blocking_resource_load_time;
    const resourcesAvgLoadTime = calculatedStats.resources_avg_load_time;

    expect(redirectionTimeArgs).toBe(0);
    expect(timeToFirstByteArgs).toBe(81);
    expect(domContentLoadedArgs).toBe(932);
    expect(fullPageLoadArgs).toBe(1066);
    expect(dnsArgs).toBe(0);

    expect(tcpConnectionTimeArgs).toBe(0);
    expect(browserRequestTimeArgs).toBe(75);
    expect(browserRequestFirstByteArgs).toBe(74);
    expect(browserRequestResponseTimeArgs).toBe(1);
    expect(domInteractiveTimeArgs).toBe(721);
    expect(totalResourceLoadTimeArgs).toBe(984);
    expect(totalBlockingResourceLoadTimeArgs).toBe(721);
    expect(resourcesAvgLoadTime).toStrictEqual({ css: 42, image: 155, js: 16 }); // 'logs the total_blocking_resource_load_time'
  };

  /* Simulator */
  getSimulator(
    app,
    createPlugin({
      provides: () => {
        mockEmitter.on("browser-performance-emitter:stats", handlePerfEvent);
      },
    })
  );
  mockEmitter.emit("browser-performance-emitter:stats:browser-only", mockEvent);
});

test("Re-emitting events from browser to server correctly", () => {
  const mockEmitter = new MockEmitter();
  const mockEmitterPlugin: FusionPlugin<any, any> = createPlugin({
    provides: () => mockEmitter,
  });

  const app = createTestFixture();
  app.register(UniversalEventsToken, mockEmitterPlugin);

  const mockEvent = { foo: { bar: 99 } };

  expect.assertions(1);

  /* Simulator */
  getSimulator(
    app,
    createPlugin({
      provides: () => {
        mockEmitter.on("browser-performance-emitter:stats", (e) => {
          expect(e.foo).toEqual(mockEvent.foo);
        });
      },
    })
  );
  mockEmitter.emit("browser-performance-emitter:stats:browser-only", mockEvent);
});
