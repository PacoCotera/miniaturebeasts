// The Wall's key walk (the inventory page's design §4): every key from every stop, on a wall of twelve (five across) and of forty (seven across).
//   node --test prototypes/station/tests/wall-walk.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { walk, wallEntry, firstLive } from "../src/views/wall-walk.mjs";

const plates = (held = []) => Array.from({ length: 6 }, (_, k) => ({ id: "plate." + k, held: held.includes(k) }));
const ctx = (n, over = {}) => ({ order: Array.from({ length: n }, (_, i) => 100 + i), cols: n > 15 ? 7 : 5, rail: ["all", "0", "1", "tucked", "add"], lit: "all", sort: "room", last: null, plates: plates(), ...over });
const to = (c, cur, key) => walk(c, cur, key).to;

test("the rail: ◀ nudges, ▶ goes to the wall (the last ringed mibi if it is in the filter, else the first), ▲▼ walk the rows and refilter (Add a room does not)", () => {
  const c = ctx(12);
  assert.equal(to(c, "rail.0", "left"), null); assert.equal(to(c, "rail.0", "right"), "cell.100", "the first when the card's mibi is not in the filter");
  assert.equal(to(ctx(12, { last: 105 }), "rail.0", "right"), "cell.105", "the last ringed one when it is in the filter"); assert.equal(to(ctx(12, { last: 999 }), "rail.0", "right"), "cell.100");
  assert.deepEqual(walk(c, "rail.all", "down"), { to: "rail.0", refilter: "0" }); assert.deepEqual(walk(c, "rail.tucked", "down"), { to: "rail.add", refilter: null }, "the ring on Add a room leaves the filter as it was");
  assert.deepEqual(walk(c, "rail.add", "up"), { to: "rail.tucked", refilter: "tucked" }); assert.equal(to(c, "rail.all", "up"), null, "▲ at the top nudges"); assert.equal(to(c, "rail.add", "down"), null, "▼ at the foot nudges");
  assert.equal(to(ctx(0), "rail.all", "right"), null, "an empty wall has nothing to go to");
});

test("the toolbar: ◀ the previous stop (the lit rail row from Room), ▶ the next (the card from Pick several), ▲ nudges, ▼ the wall", () => {
  const c = ctx(12, { lit: "1", last: 103 });
  assert.equal(to(c, "sort.room", "left"), "rail.1"); assert.equal(to(c, "sort.kind", "left"), "sort.room"); assert.equal(to(c, "sort.age", "right"), "pill"); assert.equal(to(c, "pill", "left"), "sort.age");
  assert.equal(to(c, "pill", "right"), "plate.0", "the card's first live plate"); assert.equal(to(ctx(12, { plates: plates([0, 1]) }), "pill", "right"), "plate.2", "past the held ones");
  for (const s of ["sort.room", "sort.kind", "sort.age", "pill"]) { assert.equal(to(c, s, "up"), null); assert.equal(to(c, s, "down"), "cell.103", "the last ringed mibi"); }
  assert.equal(to(ctx(12), "pill", "down"), "cell.100");
});

test("the wall of twelve, five across: ◀▶ along the row, the edges go to the lit rail row and the card; ▲ to the active sort from the first row; ▼ the row below in the same column, the last row nudges", () => {
  const c = ctx(12, { lit: "0", sort: "kind" });
  assert.equal(to(c, "cell.101", "left"), "cell.100"); assert.equal(to(c, "cell.100", "left"), "rail.0", "the left edge: the lit rail row"); assert.equal(to(c, "cell.105", "left"), "rail.0");
  assert.equal(to(c, "cell.101", "right"), "cell.102"); assert.equal(to(c, "cell.104", "right"), "plate.0", "the right edge: the card's first live plate"); assert.equal(to(c, "cell.111", "right"), "plate.0", "the last of a short row too");
  assert.equal(to(c, "cell.102", "up"), "sort.kind", "the first row: the active sort"); assert.equal(to(c, "cell.107", "up"), "cell.102"); assert.equal(to(c, "cell.102", "down"), "cell.107");
  assert.equal(to(c, "cell.109", "down"), "cell.111", "the row below is shorter: its last"); assert.equal(to(c, "cell.111", "down"), null, "the last row nudges"); assert.equal(to(c, "cell.106", "down"), "cell.111");
  assert.equal(to(c, "cell.110", "up"), "cell.105");
});

test("the wall of forty, seven across: the same walk on the larger grid", () => {
  const c = ctx(40);
  assert.equal(to(c, "cell.106", "right"), "plate.0"); assert.equal(to(c, "cell.107", "left"), "rail.all"); assert.equal(to(c, "cell.110", "up"), "cell.103"); assert.equal(to(c, "cell.103", "down"), "cell.110");
  assert.equal(to(c, "cell.134", "down"), "cell.139", "five rows of seven and a sixth of five: ▼ from the fifth row's last lands on the last"); assert.equal(to(c, "cell.139", "down"), null);
});

test("the card: ◀ the ringed mibi, ▶ nudges, ▲ the plate above (the room band from the top one), ▼ the plate below (held ones included), the last nudges; the band: ◀ the mibi, ▼ the first plate", () => {
  const c = ctx(12, { last: 104, plates: plates([2, 3]) });
  assert.equal(to(c, "plate.3", "left"), "cell.104"); assert.equal(to(c, "plate.3", "right"), null); assert.equal(to(c, "plate.3", "up"), "plate.2", "held ones included"); assert.equal(to(c, "plate.2", "down"), "plate.3");
  assert.equal(to(c, "plate.0", "up"), "band"); assert.equal(to(c, "plate.5", "down"), null, "the last nudges");
  assert.equal(to(c, "band", "left"), "cell.104"); assert.equal(to(c, "band", "down"), "plate.0"); assert.equal(to(c, "band", "up"), null); assert.equal(to(c, "band", "right"), null);
  assert.equal(to(ctx(12, { last: 999 }), "plate.0", "left"), null, "the card's mibi is not on the wall: nothing to go back to (the host shows it first)");
});

test("the wall's entry and the card's first live plate", () => {
  assert.equal(wallEntry(ctx(3, { last: 101 })), "cell.101"); assert.equal(wallEntry(ctx(3)), "cell.100"); assert.equal(wallEntry(ctx(0)), null);
  assert.equal(firstLive(ctx(3, { plates: plates([0]) })), "plate.1"); assert.equal(firstLive(ctx(3, { plates: plates([0, 1, 2, 3, 4, 5]) })), "plate.0", "every one held: the first");
});
