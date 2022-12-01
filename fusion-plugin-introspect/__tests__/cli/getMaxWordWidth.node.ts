import { getMaxWordWidth } from "../../src/shared/getMaxWordWidth.js";

test("getMaxWordWidth", () => {
  const dep = (name) => ({ name, type: "both", sources: [], dependencies: [] });
  const width = getMaxWordWidth([
    { timestamp: 0, dependencies: [dep("foo"), dep("hello")] },
    { timestamp: 0, dependencies: [dep("bar"), dep("foobar")] },
  ]);
  expect(width).toBe(6);
});
