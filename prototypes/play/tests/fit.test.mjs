// The play page's size control bounds (src/fit.mjs): the faces' own scale and the − / + range. The layout is tests/layout.test.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { baseK, clampZ, Z_MAX } from "../src/fit.mjs";

test("baseK: whole device pixels per CSS px, never under 1", () => {
  assert.deepEqual([1, 1.25, 1.5, 2, 3, 0, undefined].map(baseK), [1, 1, 1, 2, 3, 1, 1]);
});

test("a chosen z is a whole number from 1 to the top step", () => {
  assert.deepEqual([clampZ(0), clampZ("3"), clampZ(99), clampZ("x"), clampZ(2.4)], [1, 3, Z_MAX, 1, 2]);
});
