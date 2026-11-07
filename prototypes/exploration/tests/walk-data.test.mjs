// L2b: the walk data (src/walk-data.mjs) and the SPECIES rows the page builds from it.
//   node --test prototypes/exploration/tests/walk-data.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { WALK_DEFAULT, BUILT, WALK, FIELD, walkRow, settlesAt, noticeRange, stepFrames } from "../src/walk-data.mjs";
import { makePage } from "./page-harness.mjs";
import { plain } from "./walk-fixture.mjs";

// the row the seventeen newer kinds shared on origin/station-gate before this ticket
const TODAY = { notice: [2, 4], flee: 2, eats: true, shedP: .1, how: "calm" };
const TUNED = { 3: "S04", 4: "S05", 7: "S08", 11: "S12", 16: "S17", 19: "S20" };
const UNTUNED = [5, 6, 8, 9, 10, 12, 13, 14, 15, 17, 18];   // S06, S07, S09 to S11, S13 to S16, S18, S19

test("WALK_DEFAULT is today's row for the newer kinds, plus the new fields at their plain values", () => {
  for (const k of Object.keys(TODAY)) assert.deepEqual(WALK_DEFAULT[k], TODAY[k], k);
  assert.deepEqual({ drinks: WALK_DEFAULT.drinks, settle: WALK_DEFAULT.settle, shed: WALK_DEFAULT.shed, wander: WALK_DEFAULT.wander }, { drinks: false, settle: null, shed: null, wander: .4 });
  assert.ok(Object.isFrozen(WALK_DEFAULT));
});

test("the table of the brief, row by row", () => {
  const want = {   // sp: [notice, flee, eats, drinks, settle, shed, wander]
    3: [[2, 5], 2, true, false, null, "grab", .25], 4: [[2, 5], 3, true, false, null, "warm", .55], 7: [[1, 3], 1, true, false, null, "dig", .5],
    11: [[3, 6], 3, false, true, "fog", "fog", .5], 16: [[1, 3], 1, false, true, "any", "still", .2], 19: [[1, 4], 1, true, false, null, "air", .5] };
  assert.deepEqual(Object.keys(WALK).map(Number), Object.keys(want).map(Number));
  for (const [sp, [notice, flee, eats, drinks, settle, shed, wander]] of Object.entries(want)) {
    const r = walkRow(+sp);
    assert.deepEqual(plain({ notice: r.notice, flee: r.flee, eats: r.eats, drinks: r.drinks, settle: r.settle, shed: r.shed, wander: r.wander }), { notice, flee, eats, drinks, settle, shed, wander }, "sp " + sp);
    assert.equal(r.how, shed, "the pod's how is the kind's moment");
    assert.equal(r.shedP, .1, "the ready chance is the plain one");
    assert.equal(r.eats, !r.drinks, "a drinker does not eat fruit and an eater does not drink");
  }
  for (const sp of UNTUNED) assert.deepEqual(plain(walkRow(sp)), plain(WALK_DEFAULT), "sp " + sp);
  // the built three keep what they had; only the new fields are named
  assert.deepEqual(plain(BUILT), { 0: { drinks: false, settle: null, shed: "shake", wander: .4 }, 1: { drinks: true, settle: "burrow", shed: "calm", wander: .4 }, 2: { drinks: false, settle: null, shed: "meal", wander: .25 } });
});

test("the field habits: one per tuned kind and the Loika and Tuikis, each a habit of its kind", () => {
  assert.deepEqual(plain(FIELD), { 0: "calm", 1: "dig", 3: "tiptoe", 4: "stone-sense", 7: "bank-dig", 11: "dew-find", 16: "beacon-sit", 19: "hop-down" });
});

test("settlesAt: burrow in the cave or by a hole, any anywhere, fog only in a fog bank, null never", () => {
  const at = (cave, hole, fog) => ({ cave, hole, fog });
  assert.equal(settlesAt("burrow", at(true, false, false)), true); assert.equal(settlesAt("burrow", at(false, true, false)), true); assert.equal(settlesAt("burrow", at(false, false, true)), false);
  assert.equal(settlesAt("any", at(false, false, false)), true);
  assert.equal(settlesAt("fog", at(false, false, true)), true); assert.equal(settlesAt("fog", at(true, true, false)), false);
  assert.equal(settlesAt(null, at(true, true, true)), false);
});

test("a fog bank never raises any kind's notice (book p. 66: nothing startles in the fog)", () => {
  for (let sp = 0; sp < 20; sp++) {
    const row = sp < 3 ? null : walkRow(sp); if (!row) continue;
    for (const curious of [false, true]) for (const calm of [false, true]) assert.ok(noticeRange(row, { curious, calm, fog: true }) <= noticeRange(row, { curious, calm, fog: false }), `sp ${sp}`);
  }
  for (const sp of [0, 1, 2]) { const p = makePage({ console: "silent", els: true, raf: 1 }); const row = p.run(`SPECIES[${sp}]`);
    assert.ok(noticeRange(row, { fog: true }) < noticeRange(row, {})); }
});

test("stepFrames: both frames of an age non-empty, else nothing", () => {
  assert.ok(!stepFrames(undefined, false));
  assert.ok(!stepFrames({ adult: ["", ""], juvenile: ["", ""] }, false));
  assert.ok(!stepFrames({ adult: ["a", ""], juvenile: ["", ""] }, false));
  assert.deepEqual(plain(stepFrames({ adult: ["a", "b"], juvenile: ["", ""] }, false)), ["a", "b"]);
  assert.ok(!stepFrames({ adult: ["a", "b"], juvenile: ["", ""] }, true), "the juvenile has its own pair");
});

test("the page's SPECIES rows: the tuned kinds take their walk data, the built three keep every value they had, and the 11 untuned kinds are unchanged", () => {
  const p = makePage({ console: "silent", els: true, raf: 1 });
  const row = sp => plain(p.run(`SPECIES[${sp}]`));
  for (const [sp, sid] of Object.entries(TUNED)) { const r = row(sp), w = WALK[sp];
    for (const k of Object.keys(w)) assert.deepEqual(r[k], w[k], `${sid} ${k}`); }
  // the built three: their old values
  assert.deepEqual([row(0).notice, row(0).flee, row(0).eats, row(0).shedP, row(0).how, row(0).wander], [[2, 5], 2, true, .1, "shake", .4]);
  assert.deepEqual([row(1).notice, row(1).flee, row(1).eats, row(1).shedP, row(1).how, row(1).wander, row(1).settle, row(1).drinks], [[2, 4], 2, false, .1, "calm", .4, "burrow", true]);
  assert.deepEqual([row(2).notice, row(2).flee, row(2).eats, row(2).shedP, row(2).how, row(2).wander], [[1, 3], 1, true, .1, "meal", .25]);
  // the 11 untuned kinds: every field of the old row, and the new ones at the default
  for (const sp of UNTUNED) { const r = row(sp);
    for (const k of Object.keys(TODAY)) assert.deepEqual(r[k], TODAY[k], `sp ${sp} ${k}`);
    assert.deepEqual([r.ab, r.abText, r.born, r.learn, r.col], [null, null, null, null, { body: "bone", light: "bone", shade: "bone", dark: "bone" }], `sp ${sp} the rest of the row`);
    assert.deepEqual([r.drinks, r.settle, r.shed, r.wander], [false, null, null, .4], `sp ${sp} new fields`); }
});
