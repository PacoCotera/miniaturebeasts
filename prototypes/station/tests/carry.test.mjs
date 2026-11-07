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
import { cuesOf, carryPlan, originWord } from "../src/carry.mjs";
import { listOf } from "../src/views/pods-props.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), fdir = path.resolve(here, "../../workbench/frames"), specs = path.resolve(here, "../../ui/specs/station");
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

test("green on a pod: Grow it, Create with that pod; ← goes back to the inventory with the ring on the card (the carry's origin)", () => {
  const h = inPods(); h.ui.pods.sort = "arrival"; h.ui.pods.focus.set("card.0");   // by arrival the first card is the newest pod
  const q = h.st.tray[h.st.tray.length - 1]; assert.equal(cuesOf(h).find((c) => c.key === "habitat")?.word, "Grow it");
  key(h, "habitat"); assert.deepEqual([h.went.at(-1), h.ui.create?.podId], ["create", q.id]); assert.deepEqual(h.ui.carry && [h.ui.carry.key, h.ui.carry.to], ["habitat", "create"]);
  press(h, "back"); assert.deepEqual([h.went.at(-1), h.ui.pods.view, h.ui.pods.sort, h.ui.pods.focus.cur, h.ui.carry], ["pods", "inventory", "arrival", "card.0", null]);
});
test("green on a pod that cannot grow (sealed, or the incubator busy) carries nothing: the key is the Vivarium's top as today", () => {
  const st = world(); pod(st, "S01", [], 3, false); const h = host(st); h.ui.screen = "pods"; openInventory(h, { from: "home" }); h.went.length = 0;
  assert.equal(carryPlan(h, "habitat"), null); assert.equal(cuesOf(h).some((c) => c.key === "habitat"), false);
  key(h, "habitat"); assert.deepEqual([h.went.at(-1), h.ui.carry], ["vivarium", null]);
  const g = inPods(); g.st.bud = { species: "S01", started: T0 }; assert.equal(carryPlan(g, "habitat"), null, "the incubator is busy");
});
test("blue on a pod: Read it (its reading room on that pod); purple on a pod: its species page; a sealed pod has no page", () => {
  const h = inPods(0), p = podOf(h); key(h, "research"); assert.deepEqual([h.ui.pods.view, h.st.readingPod, h.ui.carry?.to], ["room", p.id, "pods"]);
  const g = inPods(0); key(g, "library"); assert.deepEqual([g.went.at(-1), g.ui.lib.species], ["library.species", S.speciesOf(podOf(g))]); press(g, "back"); assert.deepEqual([g.went.at(-1), g.ui.pods.view], ["pods", "inventory"], "← goes back to the inventory");
  const st = world(); pod(st, "S01", [], 3, false); const s = host(st); s.ui.screen = "pods"; openInventory(s, { from: "home" }); assert.equal(carryPlan(s, "library"), null);
});
test("a mibi: purple its family (Level 3, close on it), blue Pods filtered to its kind (carrying the filter until the next way in), green up close except from Habitat", () => {
  const st = world(); pod(st, "S01", [], 3); S.seedAdults(st, "S01", 5, 2, settings); const [m] = st.mibis, h = host(st); h.ui.screen = "habitat"; h.ui.hab.id = m.id;
  assert.deepEqual(cuesOf(h).map((c) => c.key), ["research", "library"], "up close the green key has nothing more to show");
  key(h, "library"); assert.deepEqual([h.went.at(-1), h.ui.lib.species, h.ui.lib.l3.S01.node], ["library.family", "S01", "node." + m.id]); press(h, "back"); assert.deepEqual([h.went.at(-1), h.ui.hab.id], ["habitat", m.id]);
  key(h, "research"); assert.deepEqual([h.went.at(-1), h.ui.pods.chips, h.ui.pods.view, h.ui.pods.focus.cur], ["pods", ["S01"], "inventory", "card.0"]); press(h, "back"); assert.deepEqual([h.went.at(-1), h.ui.pods.chips, h.ui.hab.id], ["habitat", [], m.id], "← restores the origin, filter and all");
  key(h, "research"); key(h, "home"); openInventory(h, { from: "home" }); assert.deepEqual(h.ui.pods.chips, [], "a way in without the filter clears the carried one");
  const v = host(st); v.ui.screen = "vivarium"; v.ui.viv.f = "resident." + m.id; assert.equal(carryPlan(v, "habitat").act, "close"); key(v, "habitat"); assert.deepEqual([v.went.at(-1), v.ui.hab.id], ["habitat", m.id]);
});
test("blue on a mibi whose kind has no pod carries nothing", () => {
  const st = world(); S.seedAdults(st, "S01", 5, 2, settings); const h = host(st); h.ui.screen = "habitat"; h.ui.hab.id = st.mibis[0].id; assert.equal(carryPlan(h, "research"), null);
});
test("a chapter on Create: blue the reading room on that chapter, purple the species page lit on that chapter; the unpaid choices are kept and ← goes back to Create", () => {
  const st = world(); const p = pod(st, "S01", ["coat", "face"], 3); S.seedAdults(st, "S01", 5, 2, settings); const h = host(st); openCreate(h, p); h.ui.create.f = 1; h.ui.create.choices = { body: 1 };
  const cr = h.ui.create, chs = frameOf("S01").chapters.filter((c) => p.read.includes(c.id));
  assert.deepEqual(cuesOf(h).map((c) => c.key), ["research", "library"]); assert.equal(cuesOf(h)[0].word, "Read " + frameOf("S01").chapters.filter((c) => p.read.includes(c.id))[0].name, "Read {Chapter}: the cue says what you will see");
  key(h, "research"); assert.deepEqual([h.went.at(-1), h.ui.pods.view, h.st.readingPod, h.ui.create === cr], ["pods", "room", p.id, true], "a peek: Create's state stays");
  press(h, "back"); assert.deepEqual([h.went.at(-1), h.ui.create.f, h.ui.create.choices], ["create", 1, { body: 1 }], "← back to Create with its choices");
  const ch = chs[0]; h.ui.create.f = 0; key(h, "library"); assert.deepEqual([h.went.at(-1), h.ui.lib.state, h.ui.lib.lit], ["library.species", "lit", ch.id]); press(h, "back"); assert.equal(h.went.at(-1), "create");
});
test("a species on the Library: green Visit its mibi up close, blue its pods; purple is the Library's top", () => {
  const st = world(); pod(st, "S01", [], 3); S.seedAdults(st, "S01", 5, 2, settings); const [m] = st.mibis, h = host(st); h.ui.screen = "library"; h.ui.lib.l1 = "S01";
  assert.deepEqual(cuesOf(h).map((c) => [c.key, c.word]), [["research", S.cap(frameOf("S01").species.name) + " pods"], ["habitat", "Visit"]], "blue, then green: the order the keys stand in");
  key(h, "habitat"); assert.deepEqual([h.went.at(-1), h.ui.hab.id], ["habitat", m.id]); press(h, "back"); assert.equal(h.went.at(-1), "library");
  key(h, "library"); assert.equal(h.ui.carry, null, "nothing to carry: the top");
});
test("a second tap of the key just carried is the room's top, and ← after it is today's (the parent), not the carry's", () => {
  const h = inPods(0); key(h, "research"); assert.equal(h.ui.pods.view, "room"); key(h, "research"); assert.deepEqual([h.ui.pods.view, h.ui.carry], ["inventory", null]);
  const g = inPods(0); key(g, "library"); assert.equal(g.went.at(-1), "library.species"); key(g, "library"); assert.deepEqual([g.went.at(-1), g.ui.carry], ["library", null]); press(g, "back"); assert.equal(g.went.at(-1), "home", "today's ←: the Library's parent");
});
test("yellow is always Home, a carry never spends, and ✓ on the destination ends the carry: ← is then today's", () => {
  const h = inPods(0), before = [h.st.e, h.st.d, h.st.s]; key(h, "home"); assert.deepEqual([h.went.at(-1), h.ui.carry], ["home", null]);
  const g = inPods(0); key(g, "library"); assert.deepEqual([g.st.e, g.st.d, g.st.s], before, "nothing spent");
  press(g, "back"); assert.equal(g.went.at(-1), "pods"); const k = inPods(0); key(k, "library"); assert.ok(k.ui.carry); press(k, "confirm", "chapter.coat"); assert.equal(k.ui.carry, null, "✓ ends it"); press(k, "back"); press(k, "back"); assert.equal(k.went.at(-1), "library", "today's ←: clears the lit chapter, then up to Level 1");
});
test("the cues: one a live carry, in key order, each the key's room icon; none on Idle, over a panel or on screens without a ring subject", () => {
  const h = inPods(0); assert.deepEqual(cuesOf(h).map((c) => [c.key, c.room]), [["habitat", "vivarium"], ["library", "library"]], "blue on a pod in the collection is what ✓ says: no cue");
  h.ui.panel = { id: "x" }; assert.deepEqual(cuesOf(h), []); h.ui.panel = null; h.ui.idle = true; assert.deepEqual(cuesOf(h), []); h.ui.idle = false; h.ui.screen = "home"; assert.deepEqual(cuesOf(h), []);
  void INTENTS;
});
test("← names the jump back while a carry is live: Pods after green from Pods, the mibi's name after purple from up close, the pod's after a carry from Create; none once ✓ or a second tap ended it", () => {
  const h = inPods(0); key(h, "habitat"); assert.equal(h.ui.screen, "create"); assert.equal(originWord(h), "Pods", "Create reached from Pods: ← Pods");
  const st = world(); S.seedAdults(st, "S01", 5, 2, settings); const [m] = st.mibis, g = host(st); g.ui.screen = "habitat"; g.ui.hab.id = m.id; key(g, "library"); assert.equal(originWord(g), m.name, "the mibi's name");
  press(g, "back"); assert.equal(originWord(g), null, "back where it started: no carry, the word is the screen's own");
  const p = pod(st, "S01", ["coat"], 3), c = host(st); openCreate(c, p); key(c, "research"); assert.equal(originWord(c), S.cap(S.spName(p)), "Create's: the pod's label");
  key(c, "research"); assert.equal(originWord(c), null, "a second tap ended the carry");
});
test("no cue for a carry that equals ✓: blue on a pod in the collection under Read, green on a mibi in the Vivarium; the key still carries; under another verb the blue cue returns", () => {
  const h = inPods(0); assert.equal(cuesOf(h).some((c) => c.key === "research"), false); assert.equal(carryPlan(h, "research").act, "read", "but the key still carries");
  h.ui.pods.verb = "freshen"; assert.equal(cuesOf(h).some((c) => c.key === "research"), true, "✓ freshens now: the blue cue says Read");
  const st = world(); S.seedAdults(st, "S01", 5, 2, settings); const [m] = st.mibis, v = host(st); v.ui.screen = "vivarium"; v.ui.viv.f = "resident." + m.id;
  assert.equal(cuesOf(v).some((c) => c.key === "habitat"), false, "no green cue in the Vivarium"); assert.equal(carryPlan(v, "habitat").act, "close"); key(v, "habitat"); assert.deepEqual([v.went.at(-1), v.ui.hab.id], ["habitat", m.id], "and it still goes up close");
  const l = host(st); l.ui.screen = "library"; l.ui.lib.l1 = "S01"; assert.equal(cuesOf(l).some((c) => c.key === "habitat"), true, "Visit from the Library is not what ✓ says");
});
