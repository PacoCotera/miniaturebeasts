// W4: the samples a crate brings reach the Station's waiting list (st.samples), tagged with their chapter; the bench is a later stage.
//   node --test prototypes/station/tests/samples-waiting.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { freshSt, openCrates } from "../src/state.mjs";

test("a crate's samples wait at the Station, one entry each, with their habit and chapter", () => {
  const st = freshSt("w1", 0, 1000); st.dock.docked = true;
  const crate = { id: "x1", n: 1, turn: 0, e: 0, d: 1, s: 0, pods: [], met: [], lines: [], samples: [
    { id: "sa", lo: 3, name: "Nettle", sp: 0, habit: "shake", item: "tuft", chapter: "coat", turn: 0 },
    { id: "sb", lo: 3, name: "Nettle", sp: 0, habit: "calm", item: "whisker", chapter: "face", turn: 0 }] };
  const r = openCrates(st, {}, undefined, 1000, [crate]); assert.ok(r.ok);
  assert.deepEqual(st.samples.map(q => [q.id, q.habit, q.item, q.chapter]), [["x1:sa", "shake", "tuft", "coat"], ["x1:sb", "calm", "whisker", "face"]]);
  assert.equal(freshSt("w2", 0, 1).samples.length, 0, "a fresh save has none");
});
test("a crate without samples changes nothing", () => {
  const st = freshSt("w1", 0, 1000); st.dock.docked = true;
  openCrates(st, {}, undefined, 1000, [{ id: "x2", n: 1, turn: 0, e: 1, d: 0, s: 0, pods: [], met: [], lines: [] }]);
  assert.deepEqual(st.samples, []);
});
