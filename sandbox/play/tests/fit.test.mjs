// The play page's fit choice (src/fit.mjs): window sizes and device pixel ratios to the tier and z.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fitChoice, chosen, baseK, clampZ } from "../src/fit.mjs";

test("fit: today's layout where no larger z fits (z = floor(dpr), today's tier)", () => {
  assert.deepEqual(fitChoice(1920, 1080, 1), { tier: "row", z: 1 });
  assert.deepEqual(fitChoice(1366, 768, 1), { tier: "stack", z: 1 });
  assert.deepEqual(fitChoice(1280, 720, 1), { tier: "stack", z: 1 });
  assert.deepEqual(fitChoice(1440, 900, 1.25), { tier: "stack", z: 1 });
  assert.deepEqual(fitChoice(1920, 700, 1), { tier: "stack", z: 1 });
  assert.deepEqual(fitChoice(1000, 800, 1), { tier: "narrow", z: 1 });
  assert.deepEqual(fitChoice(1000, 800, 2), { tier: "narrow", z: 2 });
});

test("fit: the stack whenever it gives a larger z than the row", () => {
  assert.deepEqual(fitChoice(2560, 1440, 1), { tier: "stack", z: 2 });   // the row fits only at 1; the stack at 2 (2104 wide, a block 1376 tall)
  assert.deepEqual(fitChoice(3840, 2160, 1), { tier: "stack", z: 3 });   // the row fits at 2, the stack at 3
  assert.deepEqual(fitChoice(1920, 1080, 2), { tier: "stack", z: 3 });   // a 4K window at 200%: 1.5 CSS px per lp
  assert.deepEqual(fitChoice(1440, 900, 1.75), { tier: "stack", z: 2 });   // at dpr 1.75 today's k is 1; 2 fits (1212 wide, a block 848 tall)
});

test("fit: the row when it gives the largest z", () => {
  assert.deepEqual(fitChoice(3400, 1400, 1), { tier: "row", z: 2 });   // the row at 2 (3384 wide); the stack at 3 does not fit the height
});

test("fit: never below today's k, and the height counts", () => {
  for (const [W, H, dpr] of [[800, 600, 1], [800, 600, 2], [800, 600, 3], [1366, 768, 1.5], [5000, 900, 1]]) assert.ok(fitChoice(W, H, dpr).z >= baseK(dpr), `${W}×${H} @${dpr}`);
  assert.deepEqual(fitChoice(2560, 1300, 1), { tier: "row", z: 1 });   // 2 is wide enough for the stack, but a block 1376 tall does not fit 1300
});

test("a chosen z: kept even when it does not fit; the row only where it fits at that z", () => {
  assert.deepEqual(chosen(2, 1920, 1080, 1), { tier: "stack", z: 2 });
  assert.deepEqual(chosen(3, 1366, 768, 1), { tier: "stack", z: 3 });
  assert.deepEqual(chosen(2, 1000, 800, 1), { tier: "narrow", z: 2 });
  assert.deepEqual(chosen(1, 1920, 1080, 1), { tier: "row", z: 1 });
  assert.deepEqual(chosen(2, 3400, 1400, 1), { tier: "row", z: 2 });
  assert.deepEqual(chosen(1, 1920, 1080, 2), { tier: "row", z: 1 });   // below k: the row fits at half the CSS size
  assert.deepEqual([clampZ(0), clampZ("3"), clampZ(99), clampZ("x")], [1, 3, 8, 1]);
});
