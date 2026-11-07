// The Station's Call key (the controls scheme): things answer. A view state only: it never changes the screen, never spends, never writes the save; ← while answering only puts the answer away; ✓ or a colour key puts it away and
// then acts once; it fades 8 s after the last press and with any screen change; on Idle it only wakes. The tags the frame carries are the keys' carries (carryPlan) or their rooms' names, in the order the keys stand.
//   node --test prototypes/station/tests/call.test.mjs
import { test } from "node:test";
import "./fixtures/rooms.mjs";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, podGenome } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { createFocus } from "../../ui/focus.mjs";
import { dispatch } from "../src/intents/index.mjs";
import { call, idleTick, ANSWER_MS } from "../src/intents/frame.mjs";
import { openInventory } from "../src/intents/pods.mjs";
import { answerOf, carryPlan } from "../src/carry.mjs";
import { UI, G, goScreen } from "../src/game.mjs";
import { podsProps } from "../src/views/pods-props.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), fdir = path.resolve(here, "../../workbench/frames"), specs = path.resolve(here, "../../ui/specs/station");
setFrames(readdirSync(fdir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(fdir, f), "utf8"))).filter((f) => !f.species.draft));
const J = (n) => JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8"));
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", rooms: 2 }, T0 = 1_000_000;
const newUI = () => ({ screen: "home", home: { f: "room" }, viv: { f: null }, cargo: { state: "bay", crate: 0, at: 0, run: null, shown: null }, pods: { view: "inventory", cur: null, ci: 0, cmp: null, sort: "use", chips: [], word: null, first: 0, recent: [], focus: createFocus({}, null) }, create: null, carry: null, answer: false, answerAt: 0, inc: {}, cross: null, lib: { l1: null, pending: null, l2: {}, l3: {} }, hab: { id: null, f: "resident", namer: null, prev: null }, bench: { f: null }, meet: null, idle: false });
function host(st, ui = newUI()) {
  const h = { st, sv: { v: 8, seed: 7, wid: "w1", turn: 0, bay: [], mibis: [], with: null, tier: 1, shield: 3 }, settings, ui, specs: { pods: J("pods"), frame: J("frame"), home: J("home"), cargo: J("cargo"), create: J("create"), panel: J("panel"), library: J("library") }, said: [], went: [], played: [], saved: 0, t: T0, now: () => h.t, arriving: () => false, holding: () => false };
  Object.assign(h, { say: (t) => h.said.push(t), goto: (s) => { h.went.push(s); ui.screen = s; }, play: (e) => h.played.push(e), at: () => {}, save: () => { h.saved++; }, motion: () => false });
  return h;
}
const world = () => { const st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = 99; st.d = 99; st.s = 99; st.firstMibi = false; return st; };
function pod(st, id, gs = 5) { S.seedPodFromGenome(st, podGenome(frameOf(id), gs), settings, T0); const p = st.tray[st.tray.length - 1]; S.skipIdentify(st, p); return p; }
const inPods = () => { const st = world(); pod(st, "S01", 3); pod(st, "S02", 4); S.seedAdults(st, "S01", 5, 2, settings); const h = host(st); h.ui.screen = "pods"; openInventory(h, { from: "home" }); h.went.length = 0; h.ui.pods.focus.set("card.0"); return h; };

test("Call toggles the answer and nothing else: the screen, the save, the materials and the ring stay; the pad leaves it on", () => {
  const h = inPods(), before = [h.st.e, h.st.d, h.st.s, h.ui.pods.focus.cur, h.ui.screen];
  assert.equal(call(h, 100), true); assert.equal(h.ui.answer, true); assert.equal(h.ui.answerAt, 100);
  assert.deepEqual([h.st.e, h.st.d, h.st.s, h.ui.pods.focus.cur, h.ui.screen], before); assert.equal(h.saved, 0, "never writes the save"); assert.deepEqual(h.went, []); assert.deepEqual(h.said, []);
  dispatch(h, { screen: "pods", target: "card.0", verb: "step:right" }); assert.equal(h.ui.answer, true, "a pad step leaves it on");
  call(h, 200); assert.equal(h.ui.answer, false, "Call again puts it away");
});
test("← while answering only puts the answer away, ✓ puts it away and acts once, a colour key puts it away and carries", () => {
  const h = inPods(); call(h, 0); dispatch(h, { screen: "pods", target: "card.0", verb: "back" }); assert.deepEqual([h.ui.answer, h.ui.screen, h.went], [false, "pods", []], "← navigates nowhere");
  call(h, 0); dispatch(h, { screen: "pods", target: "card.0", verb: "confirm" }); assert.equal(h.ui.answer, false); assert.equal(h.ui.pods.view, "room", "✓ acted, once (Read: the reading room)");
  const g = inPods(); call(g, 0); dispatch(g, { screen: "pods", target: "card.0", verb: "room:library" }); assert.deepEqual([g.ui.answer, g.went.at(-1)], [false, "library.species"], "the book key carries the pod's page");
});
test("the answer fades 8 s after the last press and with a screen change; on Idle Call only wakes", () => {
  const h = inPods(); call(h, 1000); idleTick(h, 1000 + ANSWER_MS - 1, 60000); assert.equal(h.ui.answer, true); idleTick(h, 1000 + ANSWER_MS + 1, 60000); assert.equal(h.ui.answer, false);
  UI.answer = true; UI.screen = "home"; goScreen("pods"); assert.equal(UI.answer, false, "any screen change puts it away"); void G;
  const i = inPods(); i.ui.idle = true; assert.equal(call(i, 0), false); assert.equal(i.ui.answer, false, "Idle: not toggled (core.mjs wakes the screen and nothing else)");
});
test("the frame's tags: the four keys in the order they stand (Home, Pods, Vivarium, Library), each the key's carry or its room's name, then ✓'s and ←'s words and Call's", () => {
  const h = inPods(), a = answerOf(h, { ok: "Take to the reading room", back: "Home" });
  assert.deepEqual(a.keys.map((k) => k.room), ["home", "research", "vivarium", "library"]);
  assert.deepEqual(a.keys.map((k) => k.word), ["Home", carryPlan(h, "research").word, carryPlan(h, "habitat").word, carryPlan(h, "library").word]);
  assert.deepEqual([a.ok, a.back, a.call], ["Take to the reading room", "Home", "Hide this"]);
  const home = host(world()); assert.deepEqual(answerOf(home, {}).keys.map((k) => k.word), ["Home", "Pods", "Vivarium", "Library"], "nothing to carry: the rooms' names");
});
test("Pods under Call: the pods that need you (goal, drying, new) carry a bubble, the others dim; nothing changes with the answer off", () => {
  const st = world(); const a = pod(st, "S01", 3), b = pod(st, "S02", 4); a.seen = 1; b.seen = 0; st.turn = 0;
  const m = (answer) => ({ st, settings, docked: true, crates: 0, now: 5000, ui: { view: "inventory", sort: "use", chips: [], word: null, first: 0, focus: { cur: null } }, focus: "card.0", answer });
  const off = podsProps(m(false), J("pods"), J("frame")).props.regions.inv; assert.equal(off.answer, false); assert.ok(off.grid.cards.every((c) => !c.dim && c.bubble === ""));
  const on = podsProps(m(true), J("pods"), J("frame")).props.regions.inv; assert.equal(on.answer, true);
  const nw = on.grid.cards.find((c) => c.mark === "new"), none = on.grid.cards.find((c) => c.mark === ""); assert.deepEqual([nw.bubble, nw.dim, nw.bubbleKind], ["new", false, "new"]); assert.deepEqual([none.bubble, none.dim], ["", true]);
});
