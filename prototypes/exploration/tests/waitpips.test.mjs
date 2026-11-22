// The first-load wait's pips (src/waitpips.mjs): 0 to 10 from the real steps, never past 10, never backwards by itself being fed more.
import { test } from "node:test";
import assert from "node:assert/strict";
import { waitPips, fracPips, startPlaceWait, placeWaitPips, BAKE_STAGES, PIPS } from "../src/waitpips.mjs";

// #104 part 2: the first place of a set-out takes seconds in the worker; its real stages (terrain window, IR, bake) move the pips before the place is made.
test("a place's real stages light the pips before any place is made; never full while on; never fewer for more stages", () => {
  const cells = 9, none = Array(cells).fill(0), at = (first, others = 0) => [first, ...Array(cells - 1).fill(others)];
  assert.equal(placeWaitPips(none, 0, true), 0);
  assert.equal(placeWaitPips(at(1), 0, true), 0, "the first stage alone is under a pip");
  assert.ok(placeWaitPips(at(BAKE_STAGES >> 1), 0, true) >= 2, "half the first place's stages, no place made yet: pips are lit (his case sat at 0 here)");
  assert.equal(placeWaitPips(Array(cells).fill(BAKE_STAGES), cells, true), PIPS - 1, "all made and laid out: still not full");
  assert.equal(placeWaitPips([BAKE_STAGES], 1, true), PIPS - 1, "one place, made and laid out: not full");
  assert.ok(placeWaitPips([1], 0, false) === 0 && placeWaitPips([BAKE_STAGES >> 1], 0, false) === 4, "a one-place wait moves with its stages");
  let prev = 0;
  for (let k = 0; k <= cells * BAKE_STAGES; k++) { const st = Array.from({ length: cells }, (_, i) => Math.max(0, Math.min(BAKE_STAGES, k - i * BAKE_STAGES))); const p = placeWaitPips(st, Math.floor(k / BAKE_STAGES), true); assert.ok(p >= prev, "never fewer"); prev = p; }
});

test("a one-thing wait (the reach's places): empty at the start, a pip a tenth, never full while the wait is on", () => {
  assert.equal(fracPips(0, 40), 0);
  assert.equal(fracPips(0, 0), 0);
  assert.equal(fracPips(20, 40), 5);
  assert.equal(fracPips(40, 40), PIPS - 1);
  assert.equal(fracPips(99, 40), PIPS - 1);
});

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

// #104: the set-out's wait (nine places, then the first pods asking for one more) went back to 0 pips for the pods' wait and counted one cell.
test("a place wait asked inside a set-out's wait goes on under its pips; a new one starts empty", () => {
  const RT = { making: false, placeWait: null, pips: 0, wait: null };
  const reach = { cells: [1, 2, 3, 4, 5, 6, 7, 8, 9], laying: true, laid: 9 };
  assert.equal(startPlaceWait(RT, reach, 100), true);
  RT.pips = 9;   // the reach made and laid out
  assert.equal(startPlaceWait(RT, { cells: [10], laying: false, laid: 0 }, 200), false, "the pods' wait does not replace the set-out's");
  assert.equal(RT.pips, 9, "the pips do not go back");
  assert.equal(RT.placeWait, reach, "the count stays the reach's");
  assert.equal(RT.makingAt, 100);
  RT.making = false; RT.placeWait = null;   // the set-out is over
  assert.equal(startPlaceWait(RT, { cells: [11], laying: false, laid: 0 }, 300), true, "a later wait starts empty");
  assert.equal(RT.pips, 0);
});
