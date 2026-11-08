// The carry's flight and first-time teaching (intents/frame.mjs startFlight, landFlight, teachTick): a colour key that carries first sends the ringed thing's picture to the key's cue (200 ms, 400 for the first three carries
// of a save) and only then opens the room; a press lands it at once; the first time a key has a live cue it hops and says its line once. Run against the recording host of carry.test.mjs over the real rules.
//   node --test prototypes/station/tests/carry-flight.test.mjs
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
import { cuesOf, carryPlan, subjectOf } from "../src/carry.mjs";
import { toRoom } from "../src/intents/pods.mjs";
import { listOf } from "../src/views/pods-props.mjs";
import { taughtOf, landFlight, teachTick } from "../src/intents/frame.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), fdir = path.resolve(here, "../../workbench/frames"), specs = path.resolve(here, "../../ui/specs/station");
setFrames(readdirSync(fdir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(fdir, f), "utf8"))).filter((f) => !f.species.draft));
const J = (n) => JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8"));
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", rooms: 2 }, T0 = 1_000_000;
const newUI = () => ({ screen: "home", home: { f: "room" }, viv: { f: "tile.9" }, cargo: { state: "bay", crate: 0, at: 0, mend: null, run: null, shown: null }, pods: { view: "inventory", cur: null, ci: 0, cmp: null, sort: "use", chips: [], word: null, first: 0, recent: [], focus: createFocus({}, null) }, create: null, carry: null, flight: null, teach: null, inc: {}, cross: null, lib: { l1: null, pending: null, l2: {}, l3: {} }, hab: { id: null, f: "resident", wildArm: 0, namer: null, prev: null }, bench: { f: null, arm: 0, install: false }, meet: null, idle: false, report: null });
function host(st, motion = true, ui = newUI()) {
  const h = { st, sv: { v: 8, seed: 7, wid: "w1", turn: 0, bay: [], mibis: [], with: null, tier: 1, shield: 3 }, settings, ui, specs: { pods: J("pods"), frame: J("frame"), home: J("home"), cargo: J("cargo"), create: J("create"), vivarium: J("vivarium"), bench: J("bench"), panel: J("panel"), library: J("library") }, said: [], went: [], played: [], timers: [], saved: 0, t: T0, now: () => h.t };
  Object.assign(h, { say: (t) => h.said.push(t), goto: (s) => { h.went.push(s); ui.screen = s; }, play: (e) => h.played.push(e), at: (ms, fn) => h.timers.push({ ms, fn }), save: () => { h.saved++; }, motion: () => motion, holding: () => false, flightPic: (sub) => (["pod", "chapter", "mibi"].includes(sub.kind) ? "pic:test" : "") });   // as the host's: a species or the growing bud has no picture to fly
  return h;
}
const world = () => { const st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = 99; st.d = 99; st.s = 99; st.firstMibi = false; return st; };
function inPods(motion = true) {
  const st = world(); S.seedPodFromGenome(st, podGenome(frameOf("S01"), 3), settings, T0); const p = st.tray[st.tray.length - 1]; S.skipIdentify(st, p); p.read = ["coat"];
  const h = host(st, motion); h.ui.screen = "pods"; openInventory(h, { from: "home" }); h.went.length = 0; h.ui.pods.focus.set("card.0"); return h;
}
const key = (h, k) => dispatch(h, { screen: h.ui.screen, target: "x", verb: "room:" + k });
const press = (h, verb, target = "x") => dispatch(h, { screen: h.ui.screen, target, verb });

test("a carrying key flies first: the screen stays, a flight event plays on the key's room, the carry lands when it ends", () => {
  const h = inPods(); key(h, "habitat");
  assert.equal(h.ui.screen, "pods", "the room has not cut in"); assert.ok(h.ui.flight, "a flight is under way"); assert.equal(h.ui.carry, null);
  assert.deepEqual(h.played.filter((e) => e.kind === "flight").map((e) => [e.target, e.ms]), [["vivarium", 400]], "the first carries of a save take 400 ms");
  assert.deepEqual(h.timers.map((t) => t.ms), [400]); assert.equal(h.went.length, 0);
  h.timers[0].fn(); assert.deepEqual([h.ui.screen, h.ui.flight, h.ui.carry?.key], ["create", null, "habitat"]);
  assert.equal(taughtOf(h.st).carries, 1); assert.ok(h.saved >= 1, "the count of the first carries is saved");
});
test("a press during the flight lands the carry at once (and the timer's own landing then does nothing)", () => {
  const h = inPods(); key(h, "habitat"); assert.equal(landFlight(h), true); assert.equal(h.ui.screen, "create");
  const n = h.went.length; h.timers[0].fn(); assert.equal(h.went.length, n, "landed once");
  key(h, "habitat"); assert.equal(h.ui.screen, "vivarium", "a second tap of the key just carried is the room's top");
});
test("after three carries the flight is 200 ms", () => {
  const h = inPods(); taughtOf(h.st).carries = 3; key(h, "habitat"); assert.deepEqual(h.played.filter((e) => e.kind === "flight").map((e) => e.ms), [200]);
});
test("no flight with reduced motion, with no picture to send, or in a host that has none: the carry is at once", () => {
  const a = inPods(false); key(a, "habitat"); assert.deepEqual([a.ui.screen, a.ui.flight], ["create", null]); assert.equal(a.played.some((e) => e.kind === "flight"), false);
  const b = inPods(); b.flightPic = () => ""; key(b, "habitat"); assert.equal(b.ui.screen, "create");
  const c = inPods(); delete c.flightPic; key(c, "habitat"); assert.equal(c.ui.screen, "create");
});
test("a flight whose screen changed under it (an arrival) carries nothing", () => {
  const h = inPods(); key(h, "habitat"); h.ui.screen = "home"; assert.equal(landFlight(h), false); assert.equal(h.ui.screen, "home"); assert.equal(h.ui.carry, null);
});
test("the first time a key has a live cue it hops and its line stands once; never again, and the flags are saved", () => {
  const h = inPods(); const live = cuesOf(h).map((c) => c.key); assert.ok(live.length >= 1);
  teachTick(h); const first = live[0];
  assert.equal(h.ui.teach.key, first); assert.deepEqual(h.played.filter((e) => e.kind === "hop").map((e) => [e.target, e.ms]), [[cuesOf(h)[0].room, 300]]); assert.equal(taughtOf(h.st).carry[first], true); assert.ok(h.saved >= 1);
  h.t += 6000; teachTick(h); assert.equal(h.ui.teach?.key === first, false, "the line was for 5 s");
  const n = h.played.length; for (let i = 0; i < 5; i++) teachTick(h); const hops = h.played.slice(n).filter((e) => e.kind === "hop").length; assert.ok(hops <= live.length - 1, "one hop for each key, once: " + hops);
  const again = inPods(); again.st.taught = JSON.parse(JSON.stringify(h.st.taught)); for (let i = 0; i < 4; i++) teachTick(again); assert.equal(again.played.filter((e) => e.kind === "hop").length, 0, "taught keys do not hop again");
});
test("Call's first press is remembered (taught.call) and writes no save; the first-day line is Home's until then", () => {
  const h = inPods(); assert.ok(!taughtOf(h.st).call); const saved = h.saved; INTENTS.frame.call(h, T0); assert.equal(taughtOf(h.st).call, true); assert.equal(h.saved, saved, "Call writes nothing");
  assert.ok(J("frame").regions.cues.callUntilTurn > 0 && J("frame").strings.teach.call.startsWith("Press Call"));
});
test("item 9: after a carry the carried key's cue is its room's name, second: true (mist), in key order; the others as before; teaching never takes it", () => {
  const h = inPods(false); key(h, "habitat"); assert.equal(h.ui.carry.key, "habitat");
  const c = cuesOf(h); assert.deepEqual(c.find((q) => q.key === "habitat"), { key: "habitat", room: "vivarium", word: "Vivarium", second: true });
  assert.deepEqual(c.map((q) => q.key), [...c.map((q) => q.key)].sort((a, b) => ["research", "habitat", "library"].indexOf(a) - ["research", "habitat", "library"].indexOf(b)), "key order");
  h.ui.idle = false; teachTick(h); assert.equal(h.ui.teach?.key === "habitat", false, "the second-tap cue is not taught");
  press(h, "back"); assert.equal(cuesOf(h).some((q) => q.second), false, "← ends the carry: no second-tap cue");
});
test("item 7: blue on the reading room's pod is the collection with the ring on that pod, not the reading room again", () => {
  const h = inPods(); const q = h.st.tray[0]; INTENTS.pods.toRoom ? 0 : 0; toRoom(h, q); assert.equal(h.ui.pods.view, "room");
  assert.equal(carryPlan(h, "research"), null, "nothing to carry: the key is the room's other face");
  key(h, "research"); assert.deepEqual([h.ui.screen, h.ui.pods.view, h.ui.carry], ["pods", "inventory", null]); assert.equal(h.ui.pods.focus.cur?.startsWith("card."), true, "the ring is on a card: " + h.ui.pods.focus.cur);
  assert.equal(listOf(h.st, h.specs.pods, h.ui.pods, h.settings)[+h.ui.pods.focus.cur.slice(5)].p.id, q.id, "the card of the pod that was in the room");
  assert.equal(h.ui.flight, null, "no flight: it carries nothing");
});
test("item 13: the Incubator's growing pod carries for purple (its species page) once the species is met", () => {
  const h = inPods(); h.ui.screen = "incubator"; h.st.bud = { kind: "founder", species: "S01", start: T0, minutes: 5 };
  assert.equal(subjectOf(h)?.kind, "bud"); assert.equal(carryPlan(h, "library")?.act, "page", "S01 is known to this save (a pod of it was read)");
  assert.equal(carryPlan(h, "habitat"), null); assert.equal(carryPlan(h, "research"), null);
  assert.deepEqual(cuesOf(h).map((c) => c.key), ["library"]);
  h.st.knownIds = []; h.st.metIds = []; h.st.mibis = []; assert.equal(carryPlan(h, "library"), null, "an unmet species has no page");
  const g = inPods(); g.ui.screen = "incubator"; g.st.bud = null; assert.equal(subjectOf(g), null, "nothing growing, nothing to carry");
  const k = inPods(); k.ui.screen = "incubator"; k.st.bud = { kind: "founder", species: "S01", start: T0, minutes: 5 }; key(k, "library"); assert.deepEqual([k.ui.screen, k.ui.carry?.key], ["library.species", "library"]);
});
test("item 14: the first key on Idle only wakes the screen: no carry, no flight, no room", () => {
  const h = inPods(); h.ui.idle = true; const before = [h.ui.screen, h.ui.pods.view];
  const r = INTENTS.frame.intent(h, "x", "wake"); assert.equal(h.ui.idle, false); assert.equal(r.woke, true);
  assert.deepEqual([h.ui.screen, h.ui.pods.view], before); assert.equal(h.ui.carry, null); assert.equal(h.ui.flight, null); assert.equal(h.timers.length, 0); assert.equal(h.went.length, 0);
  h.ui.idle = true; assert.deepEqual(cuesOf(h), [], "no cues on Idle"); assert.equal(carryPlan(h, "habitat"), null, "and a key on Idle carries nothing");
});
test("the teaching words are the frame's, one for each key", () => { const T = J("frame").strings.teach; assert.ok(T.research && T.habitat && T.library && T.call); });
