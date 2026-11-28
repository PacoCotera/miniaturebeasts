// Carrying keys (src/carry.mjs, intents/frame.mjs roomKey, intents/index.mjs): a colour key goes to its room carrying what the ring is on; a second tap is the room's top; ← after a carry goes back to where it
// started; yellow is always Home; the bottom line's cues name each live carry. Run against the recording host of intents.test.mjs over the real rules.
//   node --test prototypes/station/tests/carry.test.mjs
import { test } from "node:test";
import "./fixtures/rooms.mjs";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, podGenome } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { createFocus } from "../../ui/focus.mjs";
import { INTENTS, dispatch } from "../src/intents/index.mjs";
import { openInventory } from "../src/intents/pods.mjs";
import { openCreate } from "../src/intents/create.mjs";
import { cuesOf, carryPlan, originWord, tagRoom } from "../src/carry.mjs";
import { createMeasure } from "../../ui/specs/measure.mjs";
import { listOf } from "../src/views/pods-props.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), fdir = path.resolve(here, "../../species/frames"), specs = path.resolve(here, "../../ui/specs/station");
setFrames(readdirSync(fdir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(fdir, f), "utf8"))).filter((f) => !f.species.draft));
const J = (n) => JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8"));
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", rooms: 2 }, T0 = 1_000_000;
const newUI = () => ({ screen: "home", home: { f: "room" }, viv: { f: "tile.9" }, cargo: { state: "bay", crate: 0, at: 0, mend: null, run: null, shown: null }, pods: { view: "inventory", cur: null, ci: 0, cmp: null, sort: "use", chips: [], word: null, first: 0, recent: [], focus: createFocus({}, null) }, create: null, carry: null, inc: {}, cross: null, lib: { l1: null, pending: null, l2: {}, l3: {} }, hab: { id: null, f: "resident", wildArm: 0, namer: null, prev: null }, bench: { f: null, arm: 0, install: false }, meet: null, idle: false, report: null });
function host(st, ui = newUI()) {
  const h = { st, sv: { v: 8, seed: 7, wid: "w1", turn: 0, bay: [], mibis: [], with: null, tier: 1, shield: 3 }, settings, ui, specs: { pods: J("pods"), frame: J("frame"), home: J("home"), cargo: J("cargo"), create: J("create"), vivarium: J("vivarium"), bench: J("bench"), panel: J("panel"), library: J("library") }, said: [], went: [], played: [], timers: [], t: T0, now: () => h.t };
  Object.assign(h, { say: (t) => h.said.push(t), goto: (s) => { h.went.push(s); ui.screen = s; }, play: (e) => h.played.push(e), at: (ms, fn) => h.timers.push({ ms, fn }), save: () => {}, motion: () => false });
  return h;
}
const world = () => { const st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = 99; st.d = 99; st.s = 99; st.firstMibi = false; return st; };
function pod(st, id, read = [], gs = 5, identified = true) { S.seedPodFromGenome(st, podGenome(frameOf(id), gs), settings, T0); const p = st.tray[st.tray.length - 1]; if (identified) S.skipIdentify(st, p); p.read = read.slice(); return p; }
const key = (h, k) => dispatch(h, { screen: h.ui.screen, target: "x", verb: "room:" + k });
const press = (h, verb, target = "x") => dispatch(h, { screen: h.ui.screen, target, verb });
// a world with pods of S01 and S02 and one S01 mibi, the Pods inventory open on the pod at `card`
function inPods(card = 0) {
  const st = world(); pod(st, "S01", ["coat"], 3); pod(st, "S02", [], 4); pod(st, "S01", [], 6); S.seedAdults(st, "S01", 5, 2, settings);
  const h = host(st); h.ui.screen = "pods"; openInventory(h, { from: "home" }); h.went.length = 0; h.ui.pods.focus.set("card." + card); return h;
}
const podOf = (h, k = h.ui.pods.focus.cur) => listOf(h.st, h.specs.pods, h.ui.pods, h.settings)[+k.slice(5)].p;   // the pod of a card: the list is sorted, the tray is not

test("green on a pod that cannot grow (sealed, or the incubator busy) carries nothing: the key is the Vivarium's top as today", () => {
  const st = world(); pod(st, "S01", [], 3, false); const h = host(st); h.ui.screen = "pods"; openInventory(h, { from: "home" }); h.went.length = 0;
  assert.equal(carryPlan(h, "habitat"), null); assert.equal(cuesOf(h).some((c) => c.key === "habitat"), false);
  key(h, "habitat"); assert.deepEqual([h.went.at(-1), h.ui.carry], ["vivarium", null]);
  const g = inPods(); g.st.bud = { species: "S01", started: T0 }; assert.equal(carryPlan(g, "habitat"), null, "the incubator is busy");
});
test("blue on a mibi whose kind has no pod carries nothing", () => {
  const st = world(); S.seedAdults(st, "S01", 5, 2, settings); const h = host(st); h.ui.screen = "habitat"; h.ui.hab.id = st.mibis[0].id; assert.equal(carryPlan(h, "research"), null);
});
test("a species on the Library: green Visit its mibi up close, blue its pods; purple is the Library's top", () => {
  const st = world(); pod(st, "S01", [], 3); S.seedAdults(st, "S01", 5, 2, settings); const [m] = st.mibis, h = host(st); h.ui.screen = "library"; h.ui.lib.l1 = "S01";
  assert.deepEqual(cuesOf(h).map((c) => [c.key, c.word]), [["research", S.cap(frameOf("S01").species.name) + " pods"], ["habitat", "Visit"]], "blue, then green: the order the keys stand in");
  key(h, "habitat"); assert.deepEqual([h.went.at(-1), h.ui.hab.id], ["habitat", m.id]); press(h, "back"); assert.equal(h.went.at(-1), "library");
  key(h, "library"); assert.equal(h.ui.carry, null, "nothing to carry: the top");
});
