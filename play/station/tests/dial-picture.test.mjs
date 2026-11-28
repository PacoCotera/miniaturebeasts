// The reading dial's picture: 14 x 14, 25 x 14 with the lock; empty ring, half pie, full disc; only fog and mist (never a hue).
import { test } from "node:test";
import assert from "node:assert/strict";
import { dialSize, dialPixels, DIAL } from "../src/dial-picture.mjs";

const at = (px, w, x, y) => [...px.slice((y * w + x) * 4, (y * w + x) * 4 + 4)];
test("sizes: 14 x 14, and 25 x 14 with the lock", () => { assert.deepEqual(dialSize(false), [14, 14]); assert.deepEqual(dialSize(true), [25, 14]); });
test("empty ring has no fog in the middle; full disc has; half fills the right side only", () => {
  const e = dialPixels(0, 4, false), f = dialPixels(4, 4, false), h = dialPixels(2, 4, false);
  assert.equal(at(e, 14, 7, 7)[3], 0); assert.deepEqual(at(f, 14, 7, 7), [...DIAL.fog, 255]);
  assert.deepEqual(at(h, 14, 10, 7), [...DIAL.fog, 255]); assert.equal(at(h, 14, 3, 7)[3], 0);
  assert.ok(at(e, 14, 7, 0)[3] > 0 && at(e, 14, 0, 7)[3] > 0, "the ring is drawn");
});
test("the lock sits after the dial, 3 px, fog, keyhole clear", () => {
  const p = dialPixels(1, 3, true);
  assert.deepEqual(at(p, 25, 17 + 3, 2 + 0), [...DIAL.fog, 255]);   // shackle top
  assert.equal(at(p, 25, 17 + 3, 2 + 6)[3], 0);                      // keyhole
  assert.equal(at(p, 25, 15, 7)[3], 0);                              // the gap
});
