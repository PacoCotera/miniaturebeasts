// The first-load wait's pips (src/waitpips.mjs): 0 to 10 from the real steps, never past 10, never backwards by itself being fed more.
import { test } from "node:test";
import assert from "node:assert/strict";
import { waitPips, PIPS } from "../src/waitpips.mjs";

test("nothing done: no pip; everything done: all ten", () => {
  assert.equal(waitPips(0, 18, 0, 20), 0);
  assert.equal(waitPips(18, 18, 20, 20), PIPS);
});

test("the realm is 60 % of the wait, the files 40 %", () => {
  assert.equal(waitPips(18, 18, 0, 20), 6);
  assert.equal(waitPips(0, 18, 20, 20), 4);
  assert.equal(waitPips(9, 18, 10, 20), 5);
});

test("a part not owed yet is no progress; over-counting is clamped", () => {
  assert.equal(waitPips(0, 0, 0, 0), 0);
  assert.equal(waitPips(1, 1, 0, 0), 6);   // a realm already cached (1 of 1) before the files are counted
  assert.equal(waitPips(99, 18, 99, 20), PIPS);
});

test("more steps never lights fewer pips", () => {
  let last = -1; for (let r = 0; r <= 18; r++) for (let f = 0; f <= 20; f += 5) { const p = waitPips(r, 18, f, 20); if (f === 0) assert.ok(p >= last || r === 0, "realm steps"); if (f === 0) last = p; }
  for (let f = 0, prev = 0; f <= 20; f++) { const p = waitPips(9, 18, f, 20); assert.ok(p >= prev); prev = p; }
});
