// The Case: the 'Sealed for home' row stays as accepted (the bay's places); the round pod places hold 2, 3 after the Probe upgrade (TIER hold, ex.hold on a walk).
//   node --test prototypes/exploration/tests/case-sealed-slots.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./walk-fixture.mjs";

const crates = f => f.run("caseCells().filter(c => c.k === 'crate').length");
const pods = f => f.run("caseCells().filter(c => c.k === 'pod').length");
const bay = f => f.run("BAY");

test("docked, before the upgrade: the sealed row is the bay's places, the rounds are 2", () => {
  const f = fixture({ partner: 0 });
  f.run("S.exp = null; S.hold = null; S.bay = []; S.tier = 1; S.phase = 'cargo'");
  assert.equal(crates(f), bay(f)); assert.equal(pods(f), 2);
});

test("docked, upgraded: the sealed row is unchanged, the rounds are 3", () => {
  const f = fixture({ partner: 0 });
  f.run("S.exp = null; S.hold = null; S.bay = []; S.tier = 2; S.phase = 'cargo'");
  assert.equal(crates(f), bay(f)); assert.equal(pods(f), 3);
});

test("on a walk the rounds follow the hold it set out with; the sealed row does not move", () => {
  const f = fixture({ partner: 0 });
  f.run("S.exp.hold = 2; S.bay = []");
  assert.equal(pods(f), 2); assert.equal(crates(f), bay(f));
  f.run("S.exp.hold = 3");
  assert.equal(pods(f), 3); assert.equal(crates(f), bay(f));
});

test("a pod already carried is never hidden by a smaller hold", () => {
  const f = fixture({ partner: 0 });
  f.run("S.exp = null; S.tier = 1; S.hold = { e: 0, d: 0, s: 0, pods: [{}, {}, {}], samples: [] }");
  assert.equal(pods(f), 3);
});
