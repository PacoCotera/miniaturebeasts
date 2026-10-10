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
  assert.equal(N.upFrom(nav, "incubator"), "home", "after Grow the Incubator reads ← Home"); assert.equal(N.upFrom(nav, "habitat"), "vivarium", "one mibi up close is under the whole"); assert.equal(N.upFrom(nav, "vivarium"), "home", "the whole is under Home");
  assert.equal(N.upFrom(nav, "cross"), "habitat"); assert.equal(N.upFrom(nav, "sitting"), "habitat"); assert.equal(N.upFrom(nav, "book"), "library"); assert.equal(N.upFrom(nav, "pods.chapter"), "pods.overview"); assert.equal(N.upFrom(nav, "pods.compare"), "pods.overview");
  assert.equal(N.upFrom(nav, "create"), "pods.overview"); assert.equal(N.upFrom(nav, "pods.overview"), "pods.collection"); assert.equal(N.upFrom(nav, "pods.collection"), "home");
  assert.equal(N.placeOf({ screen: "bench" }), "probe", "the live Probe bench screen is the tree's probe"); assert.equal(N.placeOf({ screen: "pods", podsView: "chapter" }), "pods.chapter"); assert.equal(N.placeOf({ screen: "pods", podsView: "overview", compare: true }), "pods.compare");
});

test("the back words: Home none, the titles, the pod's label under the overview, and Back when the name will not fit", () => {
  assert.equal(N.backWord(nav, "home"), null, "no ← cap on Home");
  for (const [p, w] of [["pods.collection", "Home"], ["pods.overview", "Pods"], ["incubator", "Home"], ["probe", "Home"], ["library", "Home"], ["book", "Library"], ["vivarium", "Home"], ["habitat", "Vivarium"]]) assert.equal(N.backWord(nav, p), w, p);
  assert.equal(N.backWord(nav, "cross", "Bean"), "Bean", "← from Cross names the mibi"); assert.equal(N.backWord(nav, "sitting", "Bean"), "Bean"); assert.equal(N.backWord(nav, "cross", "", () => true), "Back"); assert.equal(N.backWord(nav, "cross", "Bean Bean Bean", () => false), "Back", "a name that does not fit reads Back");
  for (const p of ["pods.chapter", "pods.compare", "create"]) { assert.equal(N.backWord(nav, p, "Loika"), "Loika", p); assert.equal(N.backWord(nav, p, "Wideishname", () => false), "Back", "wider than the room reads Back"); }
});

test("the room keys open the top of their room, Create and Cross are the places whose unpaid choices a room key drops", () => {
  assert.deepEqual(Object.keys(nav.roomKeys).sort(), Object.keys(N.ROOM_KEYS).sort());
  assert.equal(N.roomTop("research"), "pods.collection"); assert.equal(N.roomTop("library"), "library"); assert.equal(N.roomTop("habitat"), "vivarium"); assert.equal(N.roomTop("home"), "home"); assert.equal(N.roomTop("confirm"), null);
  assert.deepEqual(N.DROPS_ON_ROOM_KEY, ["create", "cross"]);
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

test("Dock on Idle wakes and still acts (a source check on the host: the Dock key is the Caddy's, not a face verb)", () => {
  const src = (f) => readFileSync(path.resolve(here, "../src", f), "utf8");
  assert.match(src("main.mjs"), /const wasIdle = UI\.idle; if \(wasIdle\) \{ UI\.idle = false;.*frameIntents\.dock\(H, wasIdle\)/, "Dock on Idle wakes and still acts");
});
