// The navigation (design/style-guide/station-screens.md "Keys and navigation"): the tree and its back words from frame.json, the room keys, Home's and Habitat's fixed pad
// orders, the Book's Visit. Pure: no page. The keys on the real page are walked in tools/journey.mjs.   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as N from "../src/nav.mjs";
import * as S from "../src/state.mjs";
import * as L from "../src/library.mjs";
import { setFrames } from "../src/genome.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
setFrames(readdirSync(path.resolve(here, "../../workbench/frames")).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.resolve(here, "../../workbench/frames", f), "utf8"))));
const nav = JSON.parse(readFileSync(path.resolve(here, "../../ui/specs/station/frame.json"), "utf8")).navigation;

test("the tree: every screen's parent is in the tree, Home alone has none, and ← is the parent whichever way you came", () => {
  const places = Object.keys(nav.screens);
  for (const p of places) { const up = N.upFrom(nav, p); if (p === "home") assert.equal(up, null); else assert.ok(places.includes(up), p + " has a parent"); }
  assert.equal(N.upFrom(nav, "incubator"), "home", "after Grow the Incubator reads ← Home"); assert.equal(N.upFrom(nav, "habitat"), "home", "after the Book's Visit Habitat reads ← Home");
  assert.equal(N.upFrom(nav, "cross"), "habitat"); assert.equal(N.upFrom(nav, "book"), "library"); assert.equal(N.upFrom(nav, "pods.chapter"), "pods.overview"); assert.equal(N.upFrom(nav, "pods.compare"), "pods.overview");
  assert.equal(N.upFrom(nav, "create"), "pods.overview"); assert.equal(N.upFrom(nav, "pods.overview"), "pods.collection"); assert.equal(N.upFrom(nav, "pods.collection"), "home");
  assert.equal(N.placeOf({ screen: "bench" }), "probe", "the live Probe bench screen is the tree's probe"); assert.equal(N.placeOf({ screen: "pods", podsView: "chapter" }), "pods.chapter"); assert.equal(N.placeOf({ screen: "pods", podsView: "overview", compare: true }), "pods.compare");
});

test("the back words: Home none, the titles, the pod's label under the overview, and Back when the name will not fit", () => {
  assert.equal(N.backWord(nav, "home"), null, "no ← cap on Home");
  for (const [p, w] of [["pods.collection", "Home"], ["pods.overview", "Pods"], ["incubator", "Home"], ["probe", "Home"], ["library", "Home"], ["book", "Library"], ["habitat", "Home"], ["cross", "Habitat"]]) assert.equal(N.backWord(nav, p), w, p);
  for (const p of ["pods.chapter", "pods.compare", "create"]) { assert.equal(N.backWord(nav, p, "Loika"), "Loika", p); assert.equal(N.backWord(nav, p, "Wideishname", () => false), "Back", "wider than the room reads Back"); }
});

test("the room keys open the top of their room, Create and Cross are the places whose unpaid choices a room key drops", () => {
  assert.deepEqual(Object.keys(nav.roomKeys).sort(), Object.keys(N.ROOM_KEYS).sort());
  assert.equal(N.roomTop("research"), "pods.collection"); assert.equal(N.roomTop("library"), "library"); assert.equal(N.roomTop("habitat"), "habitat"); assert.equal(N.roomTop("home"), "home"); assert.equal(N.roomTop("confirm"), null);
  assert.deepEqual(N.DROPS_ON_ROOM_KEY, ["create", "cross"]);
});

const T = (id, x, y, w = 60, h = 60) => ({ id, x, y, w, h });
const HOME = [T("r:1", 100, 100), T("r:2", 100, 300), T("r:3", 300, 220), T("bay", 664, 50, 346, 118), T("tray", 664, 178, 346, 92), T("inc", 664, 280, 168, 170), T("cradle", 842, 280, 168, 170), T("lamp", 956, 460, 54, 84)];
test("Home's pad: ▲▼ walk the column Bay, Rack, Incubator, Probe, Rest; ◀▶ cross to the residents and back on the nearest row; from the room ▶ is the bay and ◀ the nearest resident", () => {
  const m = (c, d) => N.homeMove(HOME, c, d);
  assert.deepEqual(["bay", "tray", "inc", "cradle", "lamp"].map((c, i, a) => m(c, "down")), ["tray", "inc", "cradle", "lamp", "lamp"], "▼ down the column, still at the end");
  assert.deepEqual(["lamp", "cradle", "inc", "tray", "bay"].map((c) => m(c, "up")), ["cradle", "inc", "tray", "bay", "bay"]);
  assert.equal(m("inc", "left"), "r:2", "from the Incubator the resident on the nearest row"); assert.equal(m("bay", "left"), "r:1"); assert.equal(m("lamp", "left"), "r:2");
  assert.equal(m("r:3", "right"), "tray", "back to the column on the nearest row"); assert.equal(m("r:1", "right"), "bay"); assert.equal(m("r:2", "right"), "inc");
  assert.equal(m("r:1", "down"), "r:2", "among the residents the nearest one that way"); assert.equal(m("r:3", "up"), "r:1"); assert.equal(m("r:1", "up"), "r:1");
  assert.equal(m("room", "right"), "bay"); assert.equal(m("room", "left"), "r:3", "the nearest to the room"); assert.equal(m("room", "up"), "room"); assert.equal(m("bay", "right"), "bay");
  assert.equal(N.homeMove(HOME.filter((t) => !t.id.startsWith("r:")), "room", "left"), "room", "no residents, nowhere to go");
});

test("Habitat's pad is a fixed order: the stage, the chapter plates, Cross, the door row, then the strip; Cross is reached directly", () => {
  const rows = N.habitatRows({ chapters: 5, adult: true, bays: [7, 9] }), m = (c, d, shown = 7) => N.habitatMove(rows, c, d, shown);
  assert.deepEqual(rows, [["stage"], ["ch0", "ch1", "ch2", "ch3"], ["ch4"], ["cross"], ["door", "heart", "wild"], ["s7", "s9"]]);
  assert.equal(m("stage", "right"), "ch0"); assert.equal(m("ch0", "left"), "stage"); assert.equal(m("stage", "down"), "s7"); assert.equal(m("stage", "up"), "stage");
  assert.equal(m("ch1", "right"), "ch2"); assert.equal(m("ch3", "right"), "ch3"); assert.equal(m("ch1", "down"), "ch4", "the next row, the column kept as near as it can"); assert.equal(m("ch4", "down"), "cross");
  assert.equal(m("cross", "down"), "door"); assert.equal(m("door", "up"), "cross", "Cross is one ▲ from the door row"); assert.equal(m("heart", "up"), "cross"); assert.equal(m("cross", "up"), "ch4");
  assert.equal(m("door", "right"), "heart"); assert.equal(m("wild", "right"), "wild"); assert.equal(m("heart", "left"), "door"); assert.equal(m("door", "left"), "stage");
  assert.equal(m("wild", "down"), "s7"); assert.equal(m("s7", "right"), "s9"); assert.equal(m("s9", "left"), "s7"); assert.equal(m("s7", "up"), "door", "the strip goes up to the door row"); assert.equal(m("s9", "up"), "heart");
  const walk = (c, d, n) => { for (let i = 0; i < n; i++) c = m(c, d); return c; };
  assert.equal(walk("ch0", "down", 2), "cross", "from the first plate: two ▼"); assert.equal(walk("ch0", "down", 3), "door"); assert.equal(walk("stage", "right", 1), "ch0");
  const juv = N.habitatRows({ chapters: 2, adult: false, bays: [7] }); assert.ok(!juv.flat().includes("cross"), "a juvenile has no Cross"); assert.equal(N.habitatMove(juv, "ch1", "down", 7), "heart", "the door row, the column kept");
  assert.deepEqual(N.habitatRows({ chapters: 0, adult: false, bays: [] }), [["stage"], ["door", "heart", "wild"]]);
});

test("the Book's Visit goes to a housed mibi of the species: its face if one is chosen, else the first, none when there is none", () => {
  const st = S.freshSt("w1", 0, 1); S.normalize(st);
  assert.equal(L.visitTarget(st, "S01"), null, "nobody to visit");
  S.seedAdults(st, "S01", 5, 3, S.DEFAULT_SETTINGS); const [a, b] = st.mibis;
  assert.equal(L.visitTarget(st, "S01").id, a.id, "the first housed one");
  b.portrait = { state: "delivered" }; st.face.S01 = b.id; assert.equal(L.visitTarget(st, "S01").id, b.id, "the face");
  b.released = true; assert.equal(L.visitTarget(st, "S01").id, a.id, "a released face is not visited"); a.released = true; assert.equal(L.visitTarget(st, "S01").id, st.mibis[2].id);
  assert.equal(L.visitTarget(st, "S02"), null, "another species");
});
