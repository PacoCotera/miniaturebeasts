import test from "node:test";
import assert from "node:assert/strict";
import { labScale, LAB_BASE } from "../src/scale.mjs";

test("a whole ratio keeps the lab's own scale; a fractional one shrinks it with the frame", () => {
  assert.ok(Math.abs(labScale(1) - LAB_BASE) < 1e-9);
  assert.ok(Math.abs(labScale(3) - LAB_BASE) < 1e-9);
  assert.ok(Math.abs(labScale(2.625) - LAB_BASE * 2 / 2.625) < 1e-9);
  assert.ok(Math.abs(318 * labScale(2.625) - 1024 * 2 / 2.625 * 530 / 1024) < 1);   // the screen's width is the frame's, times 530/1024
  assert.ok(Math.abs(labScale(0.5) - LAB_BASE * 2) < 1e-9);
});
