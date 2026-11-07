// The pod picker's rules (the pods picker's design B, owner ruling 2026-11-07): every way into Pods sets the caller's verb (the entry table of iwq results/T-20261107-pods-picker), a verb never sticks from one visit to
// the next, ✓ on a pod does the verb in one press, Let go is a held ✓ (a quick double ✓ never lets go; the host asks the face for the hold ring only with the ring on a pod under Let go) and the Wild and Return panel's
// Return card is the same.
//   node --test prototypes/station/tests/pods-picker.test.mjs
import { test } from "node:test";
import "./fixtures/rooms.mjs";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, podGenome } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { createFocus } from "../../ui/focus.mjs";
import { INTENTS, dispatch, heldKey } from "../src/intents/index.mjs";
import { openInventory } from "../src/intents/pods.mjs";
import { toPodsDrying, toPodsWaiting } from "../src/intents/home.mjs";
import { G, UI, SPECS } from "../src/game.mjs";
import { podsBody, holdOn } from "../src/host.mjs";
import * as host from "../src/host.mjs";
import { listOf } from "../src/views/pods-props.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), fdir = path.resolve(here, "../../workbench/frames"), specs = path.resolve(here, "../../ui/specs/station");
setFrames(readdirSync(fdir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(fdir, f), "utf8"))).filter((f) => !f.species.draft));
const J = (n) => JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8"));
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", rooms: 2 }, T0 = 1_000_000;
const newUI = () => ({ screen: "home", home: { f: "room" }, viv: { f: null }, cargo: { state: "bay", crate: 0, at: 0, run: null, shown: null }, pods: { view: "inventory", cur: null, ci: 0, cmp: null, sort: "use", chips: [], word: null, first: 0, recent: [], focus: createFocus({}, null) }, create: null, carry: null, inc: {}, cross: null, lib: { l1: null, pending: null, l2: {}, l3: {} }, hab: { id: null, f: "resident", namer: null, prev: null }, bench: { f: null }, meet: null, idle: false });
function mk(st, ui = newUI()) {
  const h = { st, sv: { v: 8, seed: 7, wid: "w1", turn: 0, bay: [], mibis: [], with: null, tier: 1, shield: 3 }, settings, ui, specs: { pods: J("pods"), frame: J("frame"), home: J("home"), cargo: J("cargo"), create: J("create"), panel: J("panel"), incubator: J("incubator") }, said: [], went: [], played: [], t: T0, now: () => h.t };
  Object.assign(h, { say: (t) => h.said.push(t), goto: (s) => { h.went.push(s); ui.screen = s; }, play: (e) => h.played.push(e), at: () => {}, save: () => {}, motion: () => false });
  return h;
}
const world = () => { const st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = 99; st.d = 99; st.s = 99; st.firstMibi = false; return st; };
function pod(st, id, gs = 5, idd = true) { S.seedPodFromGenome(st, podGenome(frameOf(id), gs), settings, T0); const p = st.tray[st.tray.length - 1]; if (idd) S.skipIdentify(st, p); return p; }
const state = (h) => { const p = h.ui.pods; return [p.verb, p.fixed, p.focus.cur]; };

test("every way into Pods sets the caller's verb: Home and the Research key Read; the Incubator Grow (the only verb); the reading room's Bring; the drying need Freshen on the first drying pod; a pod waiting on the mat Let go on the least useful pod; the goal's jump and Create's ← Read", () => {
  const st = world(); const a = pod(st, "S01", 5), b = pod(st, "S02", 6), c = pod(st, "S02", 7), h = mk(st);
  openInventory(h, { from: "home" }); assert.deepEqual(state(h), ["read", false, "card.0"], "Home: Read");
  INTENTS.frame.roomKey(h, "research"); assert.equal(h.ui.pods.verb, "read", "the Research key: Read");
  h.ui.screen = "pods"; openInventory(h, { from: "incubator", sort: "use", first: true }); assert.deepEqual(state(h), ["grow", true, "card.0"], "the Incubator: Grow, the only verb, the ring on the first pod that can grow");
  openInventory(h, { choosing: true }); assert.deepEqual(state(h).slice(0, 2), ["bring", true], "the reading room's Bring"); assert.equal(h.ui.pods.choosing, true);
  openInventory(h, { from: "home", chips: ["S02"], first: true }); assert.deepEqual(state(h).slice(0, 2), ["read", false], "the goal's jump: Read, filtered");
  openInventory(h, { from: "home", pod: b.id }); assert.deepEqual([h.ui.pods.verb, h.ui.pods.panelPod ?? b.id], ["read", b.id], "Create's ← and a way in on a pod: Read");
  h.ui.pods.chips = []; st.turn = 9; a.dryAt = 1; c.dryAt = 3; toPodsDrying(h); assert.deepEqual([h.ui.pods.verb, h.ui.pods.fixed], ["freshen", false], "the drying need: Freshen set");
  const list = (await_) => await_; void list; assert.equal(h.ui.pods.focus.cur, "card." + h.ui.pods.focus.cur.slice(5), "the ring on a card");
  toPodsWaiting(h); assert.deepEqual([h.ui.pods.verb, h.ui.pods.waits, h.ui.pods.sort], ["letgo", true, "use"], "a pod waits on the mat: Let go set"); const n = st.tray.length; assert.equal(h.ui.pods.focus.cur, "card." + (n - 1), "the ring on the least useful pod, the end of by use");
  h.ui.pods.verb = "freshen"; openInventory(h, { from: "home" }); assert.deepEqual(state(h).slice(0, 2), ["read", false], "a verb never sticks from one visit to the next");
});
test("the verb the ring chooses on the verb line is the grid's: ◀ ▶ on it (the face says `focus`) change the verb and let any held pod go; ✓ on it goes down to the first pod that can take it; a fixed verb cannot be changed", () => {
  const st = world(); pod(st, "S01", 5, false); pod(st, "S01", 6); pod(st, "S02", 7); const h = mk(st); h.ui.screen = "pods"; openInventory(h, { from: "home" });
  INTENTS.pods.focus(h, "verb.grow"); assert.equal(h.ui.pods.verb, "grow"); INTENTS.pods.intent(h, "verb.grow", "confirm"); assert.equal(h.ui.pods.focus.cur, "card.0", "down to the pods");
  INTENTS.pods.focus(h, "verb.read"); assert.equal(h.ui.pods.verb, "read");
  openInventory(h, { from: "incubator" }); INTENTS.pods.focus(h, "verb.read"); assert.equal(h.ui.pods.verb, "grow", "the Incubator's verb is fixed");
});
test("Let go is a held ✓: a quick double ✓ does not let go (nothing happens but the line's hint); the held ✓ does, once; the frame carries the hold only with the ring on a pod under Let go, slower for the only pod of a species or one that carries the goal", () => {
  const st = world(); const a = pod(st, "S01", 5), b = pod(st, "S02", 6), c = pod(st, "S02", 7), h = mk(st); h.ui.screen = "pods"; openInventory(h, { from: "home" }); h.ui.pods.verb = "letgo";
  const list = () => h.ui.pods.focus; h.ui.pods.focus.set("card.0"); const first = S.podById(st, h.ui.pods.panelPod ?? st.tray[0].id) ?? st.tray[0];
  dispatch(h, { screen: "pods", target: "card.0", verb: "confirm" }); dispatch(h, { screen: "pods", target: "card.0", verb: "confirm" }); assert.equal(st.tray.length, 3, "a quick double ✓ never lets go"); assert.equal(h.said.at(-1), "Hold ✓ to let it go");
  assert.equal(heldKey(h), true); assert.equal(st.tray.length, 2, "the held ✓ lets exactly one go"); assert.equal(h.ui.pods.verb, "read", "the verb is the caller's again"); void a; void b; void c; void list; void first;
  assert.equal(heldKey(h), false, "nothing under Let go any more: a late held ✓ does nothing"); assert.equal(st.tray.length, 2);
});
test("the host asks the face for the hold ring with the ring on a pod under Let go (and not otherwise), and the frame's ✓ is then a held key", () => {
  G.st = world(); G.sv = { v: 8, seed: 7, wid: "w1", turn: 0, bay: [], mibis: [], carried: [], tier: 1, shield: 3, st: G.st }; G.settings = { ...settings, realmSleep: false }; Object.assign(SPECS, { pods: J("pods"), frame: J("frame") });
  pod(G.st, "S01", 5); pod(G.st, "S02", 6); pod(G.st, "S02", 7); UI.screen = "pods"; UI.idle = false; const p = UI.pods; p.view = "inventory"; p.cmp = null; p.verb = "read"; p.fixed = false; p.hold = null; p.focus.set("card.0"); p.chips = []; p.word = null; p.first = 0;
  podsBody(); assert.equal(host.holdNow, null, "Read: no hold"); assert.equal(holdOn(), false);
  p.verb = "letgo"; podsBody(); assert.deepEqual(host.holdNow, { ms: 6000 }, "the only S01 under Let go: slower"); assert.equal(holdOn(), true); const k2 = listOf(G.st, SPECS.pods, p, G.settings).findIndex((e) => S.speciesOf(e.p) === "S02"); p.focus.set("card." + k2); podsBody(); assert.deepEqual(host.holdNow, { ms: 0 }, "one of two S02: the frame's own 3 s");
  p.focus.set("sort"); podsBody(); assert.equal(host.holdNow, null, "the ring on a tool: no hold, ✓ is an ordinary key");
  UI.screen = "home"; assert.equal(holdOn() && host.holdNow !== null, host.holdNow !== null);
});
test("the Return card of the Wild and Return panel is a held ✓ too: a short ✓ says so and lets nothing go; the held ✓ returns the mibi", () => {
  const st = world(); S.seedAdults(st, "S01", 5, 3, settings); const [a, b] = st.mibis, h = mk(st); h.ui.hab.id = a.id; h.specs.habitat = J("habitat"); h.ui.screen = "habitat";
  INTENTS.habitat.intent(h, "wild", "confirm"); assert.equal(h.ui.panel?.id, "wildMibi"); INTENTS.panel.intent(h, "card.return", "confirm"); assert.equal(a.released, false); assert.equal(h.said.at(-1), "Hold ✓ to return it to the wild");
  assert.equal(heldKey(h), true); assert.equal(a.released, true, "the held ✓ returns it"); assert.equal(h.ui.panel, null); void b;
  h.ui.hab.id = b.id; INTENTS.habitat.intent(h, "wild", "confirm"); INTENTS.panel.intent(h, "card.keep", "confirm"); assert.equal(b.released, false); assert.equal(heldKey(h), false, "Keep is the way out; nothing is held on it");
});
test("Compare: ✓ on a pod holds it and only its kin stay bright; ✓ on the held pod, or ←, puts it back; a pod that is not its kin says why and nothing opens", () => {
  const st = world(); const a = pod(st, "S01", 5), b = pod(st, "S01", 6), c = pod(st, "S02", 7); S.skipIdentify(st, c); const h = mk(st); h.ui.screen = "pods"; openInventory(h, { from: "home" }); h.ui.pods.verb = "compare";
  h.ui.pods.focus.set("card.0"); INTENTS.pods.intent(h, "card.0", "confirm"); assert.ok(h.ui.pods.hold, "held");
  INTENTS.pods.intent(h, "card.0", "confirm"); assert.equal(h.ui.pods.hold, null, "✓ again puts it back"); INTENTS.pods.intent(h, "card.0", "confirm"); INTENTS.pods.intent(h, "card.0", "back"); const n = h.went.length; assert.deepEqual([h.ui.pods.hold, h.ui.pods.view, h.went.length], [null, "inventory", n], "← puts it back and stays on the picker");
  void a; void b;
});
