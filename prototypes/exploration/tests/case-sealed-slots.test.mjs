// The Case's 'Sealed for home' row has as many places as the pods the Companion can carry (TIER hold: 2, 3 with the Probe upgrade).
//   node --test prototypes/exploration/tests/case-sealed-slots.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./walk-fixture.mjs";

const crates = f => f.run("caseCells().filter(c => c.k === 'crate').length");
const pods = f => f.run("caseCells().filter(c => c.k === 'pod').length");

test("docked, before the upgrade: 2 sealed places and 2 pod cradles", () => {
  const f = fixture({ partner: 0 });
  f.run("S.exp = null; S.hold = null; S.bay = []; S.tier = 1; S.phase = 'cargo'");
  assert.equal(crates(f), 2); assert.equal(pods(f), 2);
});

test("docked, upgraded: 3 sealed places and 3 pod cradles", () => {
  const f = fixture({ partner: 0 });
  f.run("S.exp = null; S.hold = null; S.bay = []; S.tier = 2; S.phase = 'cargo'");
  assert.equal(crates(f), 3); assert.equal(pods(f), 3);
});

test("on an expedition the row follows the hold it set out with", () => {
  const f = fixture({ partner: 0 });
  f.run("S.exp.hold = 2; S.bay = []");
  assert.equal(crates(f), 2);
  f.run("S.exp.hold = 3");
  assert.equal(crates(f), 3);
});

test("a crate already sealed is never hidden by a smaller hold", () => {
  const f = fixture({ partner: 0 });
  f.run("S.exp = null; S.hold = null; S.tier = 1; S.bay = [{ n: 1, e: 0, d: 0, s: 0, pods: [] }, { n: 2, e: 0, d: 0, s: 0, pods: [] }, { n: 3, e: 0, d: 0, s: 0, pods: [] }]");
  assert.equal(crates(f), 3);
});
