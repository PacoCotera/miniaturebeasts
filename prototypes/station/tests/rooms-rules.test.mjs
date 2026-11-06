// The rooms' rules (rooms-rules.json, read by state.mjs): the ladder, the ceiling of ten, the settling times, and the themed find as save state, with the find requirement (rooms.needFind) off and on.
//   node --test prototypes/station/tests/rooms-rules.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import RULES from "../../ui/specs/station/rooms-rules.json" with { type: "json" };
S.useNameList("en-short-1");

const here = path.dirname(fileURLToPath(import.meta.url)), fdir = path.resolve(here, "../../workbench/frames");
setFrames(readdirSync(fdir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(fdir, f), "utf8"))));
const on = { ...S.DEFAULT_SETTINGS, economy: "decided", roomRules: { needFind: true } }, off = { ...S.DEFAULT_SETTINGS, economy: "decided" };
const world = (turn = 5, e = 99) => { const st = S.freshSt("w1", turn, 1000); S.normalize(st); st.e = e; st.firstMibi = false; return st; };

test("the rules are data: ten rooms at most, the ladder 4, 8, 12 then 4 more each, the settling times, four themes with their finds, the find requirement off on this branch", () => {
  assert.deepEqual([RULES.max, RULES.ladder.first, RULES.ladder.step, RULES.settle.second, RULES.settle.later, RULES.settle.lifeSupport, RULES.needFind], [10, [4, 8, 12], 4, 1, 2, 3, false]);
  assert.deepEqual(RULES.themes.map((t) => t.id), ["roots", "reeds", "boulders", "ferns"]); assert.deepEqual(RULES.themes.slice(1).map((t) => t.find.name), ["reed bundle", "moss stone", "fern crown"]);
  assert.equal(S.ROOMS_MAX, 10); assert.equal(S.roomRules(off).needFind, false, "off by default"); assert.equal(S.roomRules(on).needFind, true, "a rules override turns it on");
});

test("the ladder: 4, 8, 12, then 4 more each room, to ten rooms", () => {
  assert.deepEqual(Array.from({ length: 10 }, (_, k) => S.ladderPrice(k + 1)), [4, 8, 12, 16, 20, 24, 28, 32, 36, 40]);
  const st = world(); assert.equal(S.nextRoomPrice(st), 4); st.rooms = 4; assert.equal(S.nextRoomPrice(st), 16, "the put-away price reads the ladder past the painted rooms too");
  assert.equal(S.tuckPrice(st, off), 2); st.rooms = 9; assert.equal(S.nextRoomPrice(st), 36); assert.equal(S.tuckPrice(st, off), 5, "36 Energy over eight places, rounded up");
});

test("settling times: room 2 one turn, rooms 3 on two, a water or air room three; nothing shortens them", () => {
  assert.deepEqual([2, 3, 4, 5, 10].map((n) => S.settleTurns(n, "reeds")), [1, 2, 2, 2, 2]);
  const life = { ...RULES, themes: RULES.themes.map((t) => (t.id === "reeds" ? { ...t, lifeSupport: true } : t)) };
  assert.deepEqual([2, 3].map((n) => S.settleTurns(n, "reeds", life)), [3, 3], "a life-support room takes three whichever room it is");
  const st = world(5); const r1 = S.addRoom(st, off); assert.deepEqual([r1.ok, r1.room, r1.theme, r1.turns], [true, 1, "reeds", 1]);
  assert.deepEqual([S.settlingLeft(st, 1), S.isSettling(st, 1), S.settlingLeft(st, 0)], [1, true, 0]); assert.equal(st.roomMeta[1].settleUntil, 6);
  const r2 = S.addRoom(st, off); assert.deepEqual([r2.room, r2.theme, r2.turns, S.settlingLeft(st, 2)], [2, "boulders", 2, 2]);
  st.turn = 6; assert.deepEqual([S.settlingLeft(st, 1), S.settlingLeft(st, 2)], [0, 1], "a world turn takes one off; a visit takes nothing off");
  st.e = 0; st.turn = 6; assert.deepEqual([S.settlingLeft(st, 2), S.addRoomBlock(st, off).key], [1, "short"], "Energy does not hurry a room");
  st.turn = 7; assert.deepEqual([S.isSettling(st, 1), S.isSettling(st, 2)], [false, false]);
  assert.match(st.log.find((l) => /Reeds/.test(l)), /settles in 1 turn$/); assert.match(st.log.find((l) => /Boulders/.test(l)), /settles in 2 turns$/);
});

test("a settling room takes no mibi: no free place in it, no move, no bring out; it takes the next hatch only when settled", () => {
  const st = world(5); S.seedAdults(st, "S01", 5, 8, { ...off, rooms: 1 }); S.addRoom(st, off);
  assert.equal(S.roomCount(st, off), 2, "the room is on the rail at once");
  assert.equal(S.freePlace(st, off), null, "the new room settles: the full house has no place");
  const m = st.mibis[0]; assert.deepEqual(S.moveBlock(st, m, 1, off), { key: "settling", n: 1 }); assert.equal(S.moveMibi(st, m, 1, off).ok, false);
  const t = st.mibis[1]; st.tuckSeq = 1; t.tucked = { turn: 5, seq: 1, from: 0 }; t.room = t.slot = t.bay = null;
  assert.deepEqual(S.freePlace(st, off), { room: 0, slot: 1 }, "the vacated place is room 0's; none in room 1"); st.mibis[0].released = true; st.mibis[2].released = true;
  assert.deepEqual(S.freePlace(st, off, 1), { room: 0, slot: 0 }, "even preferred, the settling room is skipped");
  assert.equal(S.bringOutBlock(st, { carried: [] }, t, 1, off)?.key, "noPlace", "bring out into the settling room is refused");
  st.turn = 6; assert.deepEqual(S.moveBlock(st, st.mibis[3], 1, off), null); assert.equal(S.moveMibi(st, st.mibis[3], 1, off).ok, true);
});

test("ten rooms at most: at ten the Add a room row is gone; with every themed room built it is gone too; the ladder holds to ten", () => {
  const st = world(); assert.deepEqual([S.canAddRoom(st, off), S.roomPrice(st, off)], [true, 4]);
  for (let n = 1; n <= 3; n++) { assert.equal(S.addRoom(st, off).ok, true); st.turn += 3; }
  assert.deepEqual([st.rooms, S.canAddRoom(st, off), S.roomPrice(st, off), S.addRoomBlock(st, off)], [4, false, null, { key: "all" }], "four themes, four rooms: the row is gone");
  assert.deepEqual([0, 1, 2, 3].map((i) => S.roomName(st, i)), ["Roots", "Reeds", "Boulders", "Ferns"]);
  const rules = { ...off, roomRules: { themes: [...RULES.themes, ...["a", "b", "c", "d", "e", "f"].map((id) => ({ id, name: id, lifeSupport: false, find: { id: "find-" + id, name: id } }))] } };
  const ten = world(); ten.rooms = 9; assert.deepEqual([S.canAddRoom(ten, rules), S.roomPrice(ten, rules)], [true, 36], "nine rooms and themes left: the tenth costs 36");
  ten.rooms = 10; assert.deepEqual([S.canAddRoom(ten, rules), S.roomPrice(ten, rules), S.addRoomBlock(ten, rules)], [false, null, { key: "all" }], "at ten rooms the row is gone, themes or not");
  assert.deepEqual([4, 5, 6, 7, 8, 9].map((i) => S.roomName(ten, i)), ["Glade", "Mist", "Dell", "Brook", "Cairn", "Hollow"], "past the painted rooms a fixture's rooms carry stand-in names");
  assert.equal(S.roomCount(ten, off), 10);
});

test("the find off: a room needs its price and its settling only (the first unbuilt theme, no find asked, none spent)", () => {
  const st = world(); st.finds = ["ferns"];
  assert.equal(S.addRoomBlock(st, off), null, "no find at home asked"); const r = S.addRoom(st, off); assert.deepEqual([r.ok, r.theme], [true, "reeds"]);
  assert.deepEqual(st.finds, ["ferns"], "a find held at home is not spent while the flag is off");
});

test("the find on: the row needs a find at home; a find is held per theme, one each, only for a theme not built; building the room consumes it", () => {
  const st = world(5, 99); assert.deepEqual([S.findsHome(st, on), S.addRoomBlock(st, on)], [[], { key: "find" }], "needs a find"); assert.deepEqual(S.addRoom(st, on), { ok: false, key: "find" });
  assert.equal(st.rooms, 1); assert.equal(st.e, 99, "nothing spent");
  assert.equal(S.addFind(st, "reeds", on), true); assert.equal(S.addFind(st, "reeds", on), false, "one find a theme"); assert.equal(S.addFind(st, "roots", on), false, "the first room's theme is built: no find for it"); assert.equal(S.addFind(st, "nope", on), false);
  assert.deepEqual(S.findsHome(st, on), ["reeds"]); assert.equal(S.addRoomBlock(st, on), null);
  st.e = 3; assert.deepEqual(S.addRoomBlock(st, on), { key: "short", short: ["e"] }, "found, short of Energy"); st.e = 99;
  const r = S.addRoom(st, on); assert.deepEqual([r.ok, r.theme, r.room], [true, "reeds", 1]); assert.deepEqual(S.findsHome(st, on), [], "the find was consumed with the room"); assert.deepEqual(st.finds, []);
  assert.deepEqual([st.roomMeta[1].theme, S.roomName(st, 1)], ["reeds", "Reeds"]);
});

test("the find on, several finds: the room built is the one asked (or the first found); the order of finds decides the house; the rail keeps the bought order", () => {
  const st = world(5, 99); S.addFind(st, "ferns", on); S.addFind(st, "boulders", on);
  assert.deepEqual(S.findsHome(st, on), ["ferns", "boulders"]); assert.equal(S.nextTheme(st, on), "ferns"); assert.equal(S.nextTheme(st, on, "boulders"), "boulders"); assert.equal(S.nextTheme(st, on, "reeds"), "ferns", "a theme with no find is not chosen");
  const r = S.addRoom(st, on, "boulders"); assert.deepEqual([r.room, r.theme, S.roomName(st, 1), S.themeIndex(st, 1)], [1, "boulders", "Boulders", 2], "the painting follows the theme, not the place in the order");
  assert.deepEqual(S.findsHome(st, on), ["ferns"], "only the used find is spent"); st.turn += 3;
  const r2 = S.addRoom(st, on); assert.deepEqual([r2.room, r2.theme, S.roomName(st, 2), S.themeIndex(st, 2)], [2, "ferns", "Ferns", 3]);
  assert.equal(S.canAddRoom(st, on), true, "Reeds is unbuilt; with no find the row stays and is held"); assert.equal(S.addRoomBlock(st, on).key, "find");
});

test("the rooms and the finds survive the save", () => {
  const st = world(5); S.addFind(st, "ferns", on); S.addRoom(st, off); const back = S.normalize(JSON.parse(JSON.stringify(st)));
  assert.deepEqual([back.roomMeta, back.finds], [st.roomMeta, st.finds]); assert.deepEqual([S.settlingLeft(back, 1), S.roomName(back, 1)], [1, "Reeds"]);
  const old = S.normalize({ ...JSON.parse(JSON.stringify(world(5))), roomMeta: undefined, finds: undefined, rooms: 3 }); assert.deepEqual([old.roomMeta, old.finds], [[], []]);
  assert.deepEqual([0, 1, 2].map((i) => S.roomName(old, i)), ["Roots", "Reeds", "Boulders"], "a save of before: the i-th theme, settled"); assert.equal(S.isSettling(old, 2), false);
});
