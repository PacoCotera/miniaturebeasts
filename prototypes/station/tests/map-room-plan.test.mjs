// The map room's plan (state.mjs): ✓ sets and clears, a new one replaces, nothing is spent, only the aim changes with an expedition under way, and it lapses after an ended, docked expedition.
//   node --test prototypes/station/tests/map-room-plan.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import * as S from "../src/state.mjs";

const fresh = () => { const st = S.freshSt("w1", 0, 1e12); st.dock = { docked: true, at: 1e12 }; return st; };
const home = (expN = 1) => ({ wid: "w1", seed: 1, expN, exp: null });
const afield = (n = 1) => ({ wid: "w1", seed: 1, expN: n, exp: { n, pos: 5, reach: [5] } });
const ok = (c) => c !== 99;   // 99 is a cell no start may go
const sig = (st) => JSON.stringify([st.e, st.d, st.s]);

test("✓ on a valid cell sets the start; ✓ on it again clears; a new one replaces", () => {
  const st = fresh(), sv = home();
  assert.deepEqual(S.planStart(st, sv, { region: "g1", cell: 12, valid: ok }), { ok: true, start: 12 });
  assert.equal(S.planOf(st).start, 12);
  S.planStart(st, sv, { region: "g1", cell: 13, valid: ok }); assert.equal(S.planOf(st).start, 13);
  assert.deepEqual(S.planStart(st, sv, { region: "g1", cell: 13, valid: ok }), { ok: true, cleared: true });
  assert.equal(S.planOf(st), null, "no start and no aim is no plan");
});
test("✓ on a cell where no start may go changes nothing", () => {
  const st = fresh(), sv = home();
  assert.deepEqual(S.planStart(st, sv, { region: "g1", cell: 99, valid: ok }), { ok: false, why: "invalid" });
  assert.equal(S.planOf(st), null);
});
test("✓ on a list row sets the aim, again clears it, a new one replaces; the start stays", () => {
  const st = fresh(), sv = home();
  S.planStart(st, sv, { region: "g1", cell: 12, valid: ok });
  S.planAim(st, sv, { region: "g1", aim: { kind: "wild", id: 7 } }); assert.deepEqual(S.planOf(st).aim, { kind: "wild", id: 7 }); assert.equal(S.planOf(st).start, 12);
  S.planAim(st, sv, { region: "g1", aim: { kind: "mark", c: 30, mark: "pod" } }); assert.deepEqual(S.planOf(st).aim, { kind: "mark", c: 30, mark: "pod" });
  assert.deepEqual(S.planAim(st, sv, { region: "g1", aim: { kind: "mark", c: 30, mark: "pod" } }), { ok: true, cleared: true });
  assert.equal(S.planOf(st).aim, null); assert.equal(S.planOf(st).start, 12);
  assert.equal(S.planAim(st, sv, { region: "g1", aim: { kind: "wild", id: 7 } }).ok, true);
  assert.equal(S.planAim(st, sv, { region: "g1", aim: { kind: "other" } }).ok, false);
});
test("nothing is spent", () => {
  const st = fresh(), sv = home(), before = sig(st), mibis = st.mibis.length;
  S.planStart(st, sv, { region: "g1", cell: 12, valid: ok }); S.planAim(st, sv, { region: "g1", aim: { kind: "wild", id: 7 } }); S.planStart(st, sv, { region: "g1", cell: 12, valid: ok });
  assert.equal(sig(st), before); assert.equal(st.mibis.length, mibis);
});
test("with an expedition under way only the aim can change", () => {
  const st = fresh(), sv = afield();
  assert.deepEqual(S.planStart(st, sv, { region: "g1", cell: 12, valid: ok }), { ok: false, why: "afield" });
  assert.equal(S.planOf(st), null);
  assert.equal(S.planAim(st, sv, { region: "g1", aim: { kind: "wild", id: 7 } }).ok, true);
  assert.equal(S.planOf(st).expN, 1);
});
test("the plan lapses once the expedition it rode on has been ended and docked, and never before", () => {
  const st = fresh();
  S.planStart(st, home(1), { region: "g1", cell: 12, valid: ok }); S.planAim(st, home(1), { region: "g1", aim: { kind: "wild", id: 7 } });
  assert.equal(S.planLapse(st, home(1)), false, "lifted and seated with nothing set out: kept");
  st.dock = { docked: false, at: 1 };
  assert.equal(S.planLapse(st, afield(1)), false, "under way: kept");
  assert.equal(S.planLapse(st, home(2)), false, "ended but the Companion is not seated yet: kept");
  st.dock = { docked: true, at: 2 };
  assert.equal(S.planLapse(st, afield(1)), false, "seated mid-expedition: kept");
  assert.equal(S.planLapse(st, home(2)), true, "ended and docked: lapsed");
  assert.equal(S.planOf(st), null);
});
test("a plan written mid-expedition lapses with that expedition", () => {
  const st = fresh(); S.planAim(st, afield(3), { region: "g1", aim: { kind: "wild", id: 7 } });
  assert.equal(S.planOf(st).expN, 3);
  assert.equal(S.planLapse(st, home(3)), false); assert.equal(S.planLapse(st, home(4)), true);
});
