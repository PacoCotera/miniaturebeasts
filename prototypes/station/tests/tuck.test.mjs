// Tucked away (the put-away rules §7, the builder's tests) and moving from the mibi manager (the manager's design): the rules in state.mjs.   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
S.useNameList("en-short-1");

const here = path.dirname(fileURLToPath(import.meta.url)), fdir = path.resolve(here, "../../workbench/frames");
setFrames(readdirSync(fdir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(fdir, f), "utf8"))));
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided" };
// a Station of n adult Loikas in room 0 (more than eight fill the next rooms), the given rooms bought and the Energy held
function world(n = 3, { rooms = 2, e = 20, turn = 5 } = {}) {
  const st = S.freshSt("w1", turn, 1000); S.normalize(st); st.rooms = rooms; st.e = e; st.firstMibi = false;
  S.seedAdults(st, "S01", 7, n, settings); for (const m of st.mibis) m.born = turn - 4;
  return st;
}
const docked = { carried: [] };

test("put away: the place frees, ⚡2 is spent, the store gains one and the clocks stop (§7.1)", () => {
  const st = world(3), m = st.mibis[0], [room, slot] = [m.room, m.slot];
  assert.equal(S.tuckPrice(st, settings), 2, "two rooms: the next room is 12 Energy, 1.5 a place, never under 2");
  const r = S.tuckAway(st, docked, m, settings, Date.UTC(2026, 9, 29));
  assert.equal(r.ok, true); assert.equal(st.e, 18); assert.deepEqual([m.room, m.slot], [null, null]); assert.equal(S.inStore(m), true);
  assert.deepEqual(S.tuckedAway(st).map((x) => x.id), [m.id]);
  assert.equal(S.inRoom(st, room).some((x) => x.id === m.id), false, "not in any room");
  assert.deepEqual(S.freePlace(st, settings, room), { room, slot }, "its place is free at once");
  assert.equal(S.homeMibis(st, docked).includes(m), false, "not at home: not drawn in a room, the rail, Home or Idle");
  const stage = S.mibiStage(st, m, settings); st.turn += 40;
  assert.equal(S.mibiStage(st, m, settings), stage, "it does not age: still an adult 40 turns on (an elder at 18)");
  assert.equal(S.stageTurn(st, m), 5, "its clocks read the turn it went away at");
});
test("put away is refused with its reason, spending nothing: a traveller, the last at home, short of Energy, coming back (§7.1, §5)", () => {
  { const st = world(3), m = st.mibis[0], sv = { carried: [m.id] }, e0 = st.e; assert.equal(S.tuckAway(st, sv, m, settings).key, "carried"); assert.equal(st.e, e0); assert.equal(m.room, 0); }
  { const st = world(3), m = st.mibis[0], sv = { carried: [] }; st.carryReqs = [{ seq: 1, op: "add", id: m.id }]; st.carrySeq = 1; assert.equal(S.tuckBlock(st, sv, m, settings).key, "carried", "a request to go counts as on the Companion"); }
  { const st = world(1), m = st.mibis[0]; assert.equal(S.tuckBlock(st, docked, m, settings).key, "last"); assert.equal(S.tuckAway(st, docked, m, settings).ok, false); assert.equal(st.e, 20); }
  { const st = world(2), [a, b] = st.mibis, sv = { carried: [b.id] }; assert.equal(S.tuckBlock(st, sv, a, settings).key, "last", "the other is carried: the last present at home stays"); }
  { const st = world(3, { e: 1 }), m = st.mibis[0]; assert.deepEqual(S.tuckBlock(st, docked, m, settings), { key: "short", price: 2, have: 1 }); }
  { const st = world(3), m = st.mibis[0]; S.tuckAway(st, docked, m, settings); assert.equal(S.tuckBlock(st, docked, m, settings).key, "tucked"); S.bringOut(st, docked, m, 1, settings); assert.deepEqual(S.tuckBlock(st, docked, m, settings), { key: "coming", n: 2 }); }
});
test("bring out: a free place, ⚡2 and the place reserved at the press; back after 2 world turns, never sooner; the clocks restart from the stored values (§7.2)", () => {
  const st = world(3), m = st.mibis[0], born0 = m.born;
  S.tuckAway(st, docked, m, settings); st.turn = 9; const age0 = S.mibiStage(st, m, settings);
  const e0 = st.e, r = S.bringOut(st, docked, m, 1, settings);
  assert.equal(r.ok, true); assert.equal(st.e, e0 - 2); assert.deepEqual([m.room, m.slot], [1, 0]); assert.equal(S.comingOut(st, m), true); assert.equal(S.backIn(st, m), 2);
  assert.equal(S.inRoom(st, 1).some((x) => x.id === m.id), true, "the room counts it");
  assert.equal(S.homeMibis(st, docked).includes(m), false, "not drawn as present while it comes back");
  assert.equal(S.mibiStage(st, m, settings), age0, "still stopped while it comes back");
  assert.deepEqual(S.freePlace(st, settings, 1), { room: 1, slot: 1 }, "a hatch or a traveller cannot take the reserved place");
  st.turn = 10; assert.equal(S.comingOut(st, m), true, "one turn on: not yet"); assert.deepEqual(S.tuckArrivals(st), []);
  st.turn = 11; assert.equal(S.comingOut(st, m), false, "two world turns: back");
  assert.equal(S.homeMibis(st, docked).includes(m), true);
  assert.equal(m.born, born0 + (11 - 5), "born moved on by the turns it was away (5 to 11)");
  assert.equal(S.stageTurn(st, m) - m.born, 5 - born0, "its age is the age it went away with");
  assert.deepEqual(S.tuckArrivals(st, Date.UTC(2026, 9, 29)).map((x) => x.id), [m.id]); assert.equal(m.tucked, undefined, "its record closes");
  st.turn = 12; assert.equal(S.stageTurn(st, m) - m.born, 5 - born0 + 1, "and its clock runs again");
});
test("bring out needs a free place and the Energy; it never starts a cap: any number may be tucked away while Energy allows (§7.2, §7.3)", () => {
  const st = world(16, { rooms: 2, e: 99 });
  for (const m of st.mibis.slice(0, 15)) assert.equal(S.tuckAway(st, docked, m, settings).ok, true, "no limit on the store");
  assert.equal(S.tuckedAway(st).length, 15); assert.equal(st.e, 99 - 30);
  const fill = world(16, { rooms: 2, e: 99 }), m = fill.mibis[0]; S.tuckAway(fill, docked, m, settings); S.seedAdults(fill, "S01", 9, 1, settings);
  assert.equal(S.vivFull(fill, settings), true); assert.equal(S.bringOutBlock(fill, docked, m, null, settings).key, "noPlace"); assert.equal(S.bringOut(fill, docked, m, 0, settings).ok, false);
  const poor = world(3, { e: 3 }), q = poor.mibis[0]; S.tuckAway(poor, docked, q, settings); assert.deepEqual(S.bringOutBlock(poor, docked, q, 1, settings), { key: "short", price: 2, have: 1 });
});
test("the price is never under the next room's price per place, rounded up, or 2 Energy; the next room is 4, 8, 12, then 4 more each (§7.3)", () => {
  const st = world(3);
  for (const [rooms, room, tuck] of [[1, 4, 2], [2, 8, 2], [3, 12, 2], [4, 16, 2], [5, 20, 3], [6, 24, 3], [8, 32, 4]]) { st.rooms = rooms; assert.equal(S.nextRoomPrice(st), room); assert.equal(S.tuckPrice(st, settings), tuck, rooms + " rooms"); }
  assert.equal(S.tuckPrice(st, { ...settings, economy: "free" }), 0, "the developer's free economy");
});
test("bonded, young, elder: each may be tucked away and keeps what it is; a bond is never lost (the put-away rules)", () => {
  const st = world(4), [a, b, c] = st.mibis;
  a.bonded = true; a.bondCare = 3; b.born = st.turn; c.grownTurn = st.turn - 30;
  assert.equal(S.mibiStage(st, b, settings), "juvenile"); assert.equal(S.mibiStage(st, c, settings), "elder");
  for (const m of [a, b, c]) assert.equal(S.tuckAway(st, docked, m, settings).ok, true);
  st.turn += 10; assert.equal(a.bonded, true); assert.equal(S.mibiStage(st, b, settings), "juvenile", "a young one stays young"); assert.equal(S.mibiStage(st, c, settings), "elder");
});
test("a tucked-away mibi cannot act: no cross, no Companion, no return; nor one coming back (the put-away rules, §5)", () => {
  const st = world(4), [a, b] = st.mibis; S.tuckAway(st, docked, a, settings);
  assert.equal(S.crossBlock(st, docked, a, b, settings), "tucked away"); assert.equal(S.carryAdd(st, docked, a).why, "tucked"); assert.match(S.returnMibiBlock(st, docked, a), /tucked away/);
  assert.equal(S.crossPartners(st, docked, b, settings).find((p) => p.id === a.id)?.away, true, "listed dimmed, never picked");
  S.bringOut(st, docked, a, 1, settings);
  assert.equal(S.crossBlock(st, docked, a, b, settings), "tucked away"); assert.equal(S.carryAdd(st, docked, a).why, "tucked"); assert.match(S.returnMibiBlock(st, docked, a), /back in 2 turns/);
});
test("the last mibi at home is refused by both Put away and Return, with the same reason (§7.3b)", () => {
  const st = world(1), m = st.mibis[0];
  assert.equal(S.tuckBlock(st, docked, m, settings).key, "last"); assert.equal(S.returnMibiBlock(st, docked, m), "your last mibi at home stays");
  assert.equal(S.returnMibi(st, docked, m, settings).ok, false); assert.equal(m.released, false);
  const two = world(2); assert.equal(S.returnMibiBlock(two, docked, two.mibis[0]), "", "with another at home it may go");
});
test("an older save has an empty store; nothing to migrate (§7.5)", () => {
  const st = world(3); for (const m of st.mibis) assert.equal(m.tucked, undefined);
  assert.deepEqual(S.tuckedAway(st), []); assert.equal(S.stageTurn(st, st.mibis[0]), st.turn); assert.deepEqual(S.tuckArrivals(st), []);
});
test("the manager's moves: free and instant to a free place (the house rule); a swap between two rooms keeps both counts; never a traveller or one coming back", () => {
  const st = world(9, { rooms: 2 }), a = st.mibis[0], b = st.mibis[8];
  assert.deepEqual([a.room, b.room], [0, 1]); const n0 = S.inRoom(st, 0).length, n1 = S.inRoom(st, 1).length;
  assert.equal(S.swapMibis(st, docked, a, b).ok, true); assert.deepEqual([a.room, b.room], [1, 0]);
  assert.deepEqual([S.inRoom(st, 0).length, S.inRoom(st, 1).length], [n0, n1], "both rooms keep their counts");
  assert.equal(S.swapBlock(st, docked, S.inRoom(st, 0)[0], S.inRoom(st, 0)[1]).key, "own", "two of one room: nothing to swap");
  const c = S.inRoom(st, 0)[1], sv = { carried: [c.id] }; assert.equal(S.swapMibis(st, sv, a, c).key, "carried");
  S.tuckAway(st, docked, b, settings); S.bringOut(st, docked, b, 0, settings); assert.equal(S.swapMibis(st, docked, a, b).key, "coming");
  const d = S.inRoom(st, 0).find((x) => x !== c && !S.comingOut(st, x)), r = S.moveMibi(st, d, 1, settings); assert.equal(r.ok, true); assert.equal(d.room, 1);
  assert.equal(S.inRoom(st, 0).length, 7, "the reserved place counts in its room");
});
