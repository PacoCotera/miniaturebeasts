// The intents (src/intents): the rule call behind a key on a focused target, DOM-free, run here against a recording host over the real rules: what each ✓ and ← does to the state, the screen state, the events
// and the plate. Pods carries the ✓ rule (an identified pod opens Create) and the way back from Compare onto the kin that opened it.
//   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, podGenome } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { createFocus } from "../../ui/focus.mjs";
import { INTENTS, dispatch } from "../src/intents/index.mjs";
import { openBay } from "../src/intents/cargo.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), fdir = path.resolve(here, "../../workbench/frames"), specs = path.resolve(here, "../../ui/specs/station");
setFrames(readdirSync(fdir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(fdir, f), "utf8"))));
const J = (n) => JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8")), podsSpec = J("pods"), frameSpec = J("frame"), homeSpec = J("home"), cargoSpec = J("cargo"), createSpec = J("create"), vivariumSpec = J("vivarium"), benchSpec = J("bench"), incubatorSpec = J("incubator"), habitatSpec = J("habitat"), namerSpec = J("namer");
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 12 }, T0 = 1_000_000;

const newUI = () => ({ screen: "home", home: { f: "room" }, viv: { f: "tile.9" }, cargo: { state: "bay", crate: 0, at: 0, mend: null, run: null, shown: null }, pods: { view: "collection", cur: null, ci: 0, cmp: null, wildArm: 0, focus: createFocus({}, null) }, create: null, inc: {}, cross: null, lib: { sp: null, f: "spread", page: 0, i: 0 }, hab: { id: null, f: "resident", wildArm: 0, namer: null, prev: null }, bench: { f: null, arm: 0, install: false }, meet: null, idle: false, report: null });
// A recording host: the effects are lists to read afterwards.
function host(st, sv = { v: 8, seed: 7, wid: "w1", turn: 0, bay: [], mibis: [], with: null, tier: 1, shield: 3 }, ui = newUI()) {
  const h = { st, sv, settings, ui, specs: { pods: podsSpec, frame: frameSpec, home: homeSpec, cargo: cargoSpec, create: createSpec, vivarium: vivariumSpec, bench: benchSpec }, holds: [], motion: () => h.moving !== false, said: [], went: [], played: [], timers: [], saved: 0, t: T0, now: () => h.t };
  Object.assign(h, { say: (t) => h.said.push(t), goto: (s, hold = 0) => { h.went.push(s); h.holds.push(hold); ui.screen = s; }, play: (e) => h.played.push(e), at: (ms, fn) => h.timers.push({ ms, fn }), save: () => { h.saved++; } });
  return h;
}
const world = () => { const st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = 99; st.d = 99; st.s = 99; st.firstMibi = false; return st; };
function pod(st, id, read = [], gs = 5, identified = true) { S.seedPodFromGenome(st, podGenome(frameOf(id), gs), settings, T0); const p = st.tray[st.tray.length - 1]; if (identified) S.skipIdentify(st, p); p.read = read.slice(); return p; }
const chapters = (id) => frameOf(id).chapters.map((c) => c.id);

test("every screen with intents has a module, and a face intent reaches it; the frame's verbs are the same on every screen", () => {
  assert.deepEqual(Object.keys(INTENTS).sort(), ["bench", "cargo", "create", "frame", "habitat", "home", "incubator", "library", "namer", "pods", "vivarium"]);
  const st = world(), h = host(st); h.ui.screen = "library";
  dispatch(h, { screen: "library", target: "x", verb: "room:home" }); assert.deepEqual(h.went, ["home"]); assert.equal(h.ui.home.f, "room");
});

test("the room keys: the unpaid choices of Create and Cross are dropped; Research opens the collection with the ring on the pod that most needs the player; the others open their tops", () => {
  const st = world(), a = pod(st, "S01", [], 3, false), h = host(st); h.ui.create = { podId: a.id }; h.ui.cross = {};
  assert.equal(INTENTS.frame.roomKey(h, "research"), true);
  assert.equal(h.ui.create, null); assert.equal(h.ui.cross, null); assert.deepEqual(h.went, ["pods"]); assert.equal(h.ui.pods.view, "collection"); assert.equal(h.ui.pods.cur, a.id); assert.equal(h.ui.pods.focus.cur, "place.0");
  h.ui.lib.f = "book"; INTENTS.frame.roomKey(h, "library"); assert.equal(h.ui.lib.f, "spread"); assert.equal(h.went.at(-1), "library");
  h.ui.hab.wildArm = 1; INTENTS.frame.roomKey(h, "habitat"); assert.deepEqual([h.ui.viv.f, h.ui.hab.wildArm, h.went.at(-1)], [null, 0, "vivarium"], "the Vivarium key opens the whole, the ring by the way in");
  assert.equal(INTENTS.frame.roomKey(h, "nonsense"), false);
});

test("Home: ✓ goes to the target's screen (Cargo, Pods on the pod that most needs the player, the Incubator, the Probe bench, the Library, the Vivarium on a resident); the rest knob holds input for events.rest and the face's done takes Idle; ← does nothing", () => {
  const st = world(); S.seedAdults(st, "S01", 5, 2, settings); st.dock = { docked: true, at: T0 }; pod(st, "S01", [], 5, false);
  const h = host(st), m = st.mibis[0], go = (t) => INTENTS.home.intent(h, t, "confirm");
  go("cargo"); assert.equal(h.went.at(-1), "cargo"); go("incubator"); assert.equal(h.went.at(-1), "incubator"); go("probe"); assert.deepEqual([h.went.at(-1), h.ui.bench.f], ["bench", null]); go("library"); assert.deepEqual([h.went.at(-1), h.ui.lib.f], ["library", "spread"]);
  go("pods"); assert.equal(h.went.at(-1), "pods"); assert.equal(h.ui.pods.cur, S.neediestPod(st).id);
  go("resident." + m.id); assert.deepEqual([h.ui.hab.id, h.ui.hab.f, h.went.at(-1)], [m.id, "resident", "habitat"]);
  h.ui.hab.id = st.mibis[1].id; go("vivarium"); assert.deepEqual([h.ui.hab.id, h.went.at(-1)], [st.mibis[1].id, "vivarium"], "Home's panel opens the whole (its ring is the view's: the mibi last seen up close)");
  go("room"); assert.equal(h.went.at(-1), "pods", "the room's ✓ does what needs the player: a new pod");
  const ev = h.specs.home.events.rest; go("knob"); assert.deepEqual(h.played.at(-1), { kind: "rest", target: "knob", ms: ev.ms, hold: ev.hold }); assert.equal(h.ui.idle, false, "Idle comes at the end of the hold, on the host's own clock"); assert.deepEqual(h.timers.map((t) => t.ms), [ev.steps[1].at, ev.hold], "the dither at 200 and Idle at 380 are scheduled, not waited for"); h.timers.at(-1).fn(); assert.equal(h.ui.idle, true); assert.equal(h.ui.resting, false); h.ui.idle = false; h.motion = () => false; go("knob"); assert.equal(h.ui.idle, true, "reduced motion: a cut, Idle at once");
  const n = h.went.length; INTENTS.home.intent(h, "room", "back"); INTENTS.home.intent(h, "cargo", "back"); assert.equal(h.went.length, n, "Home is the top: ← does nothing");
});
test("Home: the room's ✓ with crates in the bay goes to Cargo; the Dock key plays the crates in while Home shows (events.crateIn: one arrival, the stagger's length)", () => {
  const st = world(); st.dock = { docked: false, at: T0 }; const sv = { v: 8, seed: 7, wid: "w1", turn: 0, bay: [{ id: "c1", n: 1, turn: 0, at: T0, e: 3, d: 3, s: 4, pods: [], met: [], explored: 0, of: 0, lines: [] }, { id: "c2", n: 2, turn: 0, at: T0, e: 3, d: 3, s: 4, pods: [], met: [], explored: 0, of: 0, lines: [] }], mibis: [], carried: [], tier: 1, shield: 3 };
  const h = host(st, sv), ev = h.specs.home.events.crateIn.each;
  INTENTS.frame.dock(h); assert.equal(st.dock.docked, true); assert.deepEqual(h.said, [], "no message plate on Home"); assert.deepEqual(h.played.filter((e) => e.kind === "arrival"), [{ kind: "arrival", target: "cargo", ms: ev.ms + ev.stagger }]);
  INTENTS.home.intent(h, "room", "confirm"); assert.equal(h.went.at(-1), "cargo");
  const h2 = host(world(), sv); h2.ui.screen = "pods"; h2.st.dock = { docked: false, at: T0 }; INTENTS.frame.dock(h2); assert.equal(h2.played.filter((e) => e.kind === "arrival").length, 0, "docked on another screen: no arrival, the crates are in the bay when Home next shows");
});
test("Cargo's opening: ✓ Open the bay opens every crate at once as the rule and plays them one at a time: the arrival (crates × 3000 + 180, hold + 200), the dither, the counters and the turn at each crate's step, the report at the end", () => {
  const st = world(); S.seedCrate(st, "S01", 2, 4101, T0); S.seedCrate(st, "S01", 1, 4102, T0); st.dock = { docked: true, at: T0 };
  const h = host(st); h.ui.screen = "cargo"; h.motion = () => true; const e0 = st.e;
  INTENTS.cargo.intent(h, "room", "confirm");
  const ar = h.played.find((e) => e.kind === "arrival"); assert.deepEqual(ar, { kind: "arrival", target: "crate", ms: 6180, hold: 6200 }, "two crates: 2 × 3000 + 180, hold 2 × 3000 + 200");
  assert.equal(h.ui.cargo.state, "opening"); assert.deepEqual(h.ui.cargo.shown, { e: e0, d: st.d - 6, s: st.s - 8, turn: st.turn }, "the top bar shows the counters before the crates");
  assert.equal(st.tray.length, 3, "the rule opened both at once"); assert.ok(h.saved >= 1);
  const at = (ms) => h.timers.filter((t) => t.ms === ms);
  assert.equal(h.ui.cargo.shown.e, e0, "nothing shown before the first crate's counters"); assert.ok(at(800).length === 1 && at(3800).length === 1, "each crate's counters at +800");
  assert.ok(at(1650).length === 1 && at(3000).length === 1 && at(4650).length === 1 && at(6000).length === 1, "the turn at +1650, the next crate at 3000, the report at the end");
  const ordered = h.timers.slice().sort((a, b) => a.ms - b.ms); for (const t of ordered.slice(0, -1)) t.fn();
  assert.deepEqual(h.ui.cargo.shown, { e: st.e, d: st.d, s: st.s, turn: st.turn }, "by the last crate's turn the top bar shows what the rules hold");
  ordered.at(-1).fn(); assert.deepEqual([h.ui.cargo.state, h.ui.cargo.shown], ["report", null]); 
  assert.equal(h.ui.cargo.run.report.newPods, 3); assert.equal(h.ui.cargo.run.report.crates.length, 2);
});
test("Cargo's bay and report: ✓ opens the crates, ← goes Home with the ring on the Cargo module, nothing acts while the crates open, and any key on the report closes it and ✓ also follows the bottom line (the jump to Pods)", () => {
  const st = world(); S.seedCrate(st, "S01", 1, 4101, T0); st.dock = { docked: true, at: T0 };
  const h = host(st); h.ui.screen = "cargo"; h.motion = () => true;
  INTENTS.cargo.intent(h, "room", "back"); assert.deepEqual([h.went.at(-1), h.ui.home.f], ["home", "cargo"]); h.ui.screen = "cargo";
  INTENTS.cargo.intent(h, "room", "confirm"); const n = h.went.length; INTENTS.cargo.intent(h, "room", "confirm"); INTENTS.cargo.intent(h, "room", "back"); assert.equal(h.went.length, n, "the hold: ✓ and ← do nothing");
  for (const t of h.timers.slice().sort((a, b) => a.ms - b.ms)) t.fn();
  assert.equal(h.ui.cargo.state, "report"); INTENTS.cargo.intent(h, "room", "pad"); assert.deepEqual([h.ui.cargo.state, h.went.length], ["bay", n], "the pad only closes the card");
  S.seedCrate(st, "S01", 1, 4102, T0); INTENTS.cargo.intent(h, "room", "confirm"); for (const t of h.timers.slice().sort((a, b) => a.ms - b.ms)) t.fn();
  INTENTS.cargo.intent(h, "room", "confirm"); assert.deepEqual([h.ui.cargo.state, h.went.at(-1), h.ui.pods.view], ["bay", "pods", "collection"], "✓ on the report: the new pods, the collection");
  const st2 = world(); st2.dock = { docked: true, at: T0 }; const h2 = host(st2); h2.ui.screen = "cargo"; INTENTS.cargo.intent(h2, "room", "confirm"); assert.equal(h2.ui.cargo.state, "bay", "an empty bay opens nothing");
});

test("Cargo's opening with reduced motion (the host stages each step as props at its time): per crate k from k × 3000: open at 200, the ribbon 500, the counters 800, pod i at 1200 + 150 · i, the turn 1650; the arrival and its hold are the same as with motion", () => {
  const st = world(); S.seedCrate(st, "S01", 3, 4101, T0); S.seedCrate(st, "S01", 2, 4102, T0); st.dock = { docked: true, at: T0 };
  const h = host(st); h.ui.screen = "cargo"; h.motion = () => false; INTENTS.cargo.intent(h, "room", "confirm");
  assert.deepEqual(h.played.find((e) => e.kind === "arrival"), { kind: "arrival", target: "crate", ms: 6180, hold: 6200 }, "ms and hold unchanged");
  const seen = []; for (const t of h.timers.slice().sort((a, b) => a.ms - b.ms)) { const before = [h.ui.cargo.crate, h.ui.cargo.at, h.ui.cargo.state]; t.fn(); const c = h.ui.cargo; if (c.crate !== before[0] || c.at !== before[1] || c.state !== before[2]) seen.push([t.ms, c.crate, c.at, c.state]); }
  const steps = (k, pods) => [200, 500, 800, ...Array.from({ length: pods }, (_, i) => 1200 + 150 * i), 1650].map((at) => [k * 3000 + at, k, at, "opening"]);
  assert.deepEqual(seen.filter((x) => x[3] === "opening"), [...steps(0, 3), [3000, 1, 0, "opening"], ...steps(1, 2)].filter((x, i, a) => a.findIndex((y) => y[0] === x[0]) === i), "the host's stage by time");
  assert.deepEqual(seen.at(-1), [6000, 0, 0, "report"], "the report at crates × 3000");
});
test("the incubator: Choose a pod (empty), Grow now (growing, growNow with the leaves before and after), Open (ready: the hatch held 2780 ms, the hand-off at 2600 on the resident); ← Home on Home's Incubator module", () => {
  const st = world(), h = host(st); h.t = T0; h.specs.incubator = incubatorSpec;
  INTENTS.incubator.intent(h, "room", "confirm"); assert.deepEqual([h.went.length, h.played.length], [0, 0], "no pod in the rack: ✓ does nothing");
  const a = pod(st, "S01", [], 5, false), b = pod(st, "S01", chapters("S01"), 6); INTENTS.incubator.intent(h, "room", "confirm");
  assert.deepEqual([h.went.at(-1), h.ui.pods.view, h.ui.pods.focus.cur, h.ui.pods.cur], ["pods", "collection", "place.1", b.id], "the first identified pod in rack order");
  S.skipIdentify(st, a); st.tray = [a, b]; h.ui.pods.focus.set("x"); INTENTS.incubator.intent(h, "room", "confirm"); assert.equal(h.ui.pods.focus.cur, "place.0");
  const q = pod(st, "S01", chapters("S01")); st.tray = [q]; assert.ok(S.grow(st, q, {}, settings, T0).ok); h.played.length = 0; h.timers.length = 0;
  INTENTS.incubator.intent(h, "bud", "confirm"); const gn = h.played.at(-1); assert.deepEqual([gn.kind, gn.target, gn.ms, gn.hold, gn.to, gn.from <= gn.to], ["growNow", "room", 400, 400, st.bud.minutes, true]); assert.ok(S.budReady(st, settings, T0));
  h.played.length = 0; INTENTS.incubator.intent(h, "bud", "confirm"); const hatch = h.played.find((e) => e.kind === "hatch"); assert.deepEqual([hatch.ms, hatch.hold], [2600, 2780]); const meet = h.timers.at(-1); assert.equal(meet.ms, 2600, "the hand-off by the timer, never on done");
  assert.ok(h.ui.inc.hatch && h.ui.inc.hatch.mibi === st.mibis.at(-1).id); INTENTS.incubator.intent(h, "bud", "back"); assert.notEqual(h.went.at(-1), "home", "← does nothing in the hatch");
  meet.fn(); assert.deepEqual([h.went.at(-1), h.ui.hab.f, h.ui.inc.hatch], ["habitat", "resident", null]); assert.equal(h.ui.meet, st.mibis.at(-1).id); assert.equal(st.bud, null);
  INTENTS.incubator.intent(h, "bud", "back"); assert.deepEqual([h.went.at(-1), h.ui.home.f], ["home", "incubator"]);
  const h2 = host(world()); h2.moving = false; h2.specs.incubator = incubatorSpec; { const st2 = h2.st, p2 = pod(st2, "S01", chapters("S01")); S.grow(st2, p2, {}, settings, T0); st2.bud.early = true; INTENTS.incubator.intent(h2, "bud", "confirm"); assert.deepEqual([h2.went.at(-1), h2.played.length, h2.timers.length], ["habitat", 0, 0], "a cut: the meet on the frame of ✓"); }
});

test("the Library's spread: the ring's frame is kept; ✓ on a found frame opens its Book, on a met or an unmet frame says its plate and opens nothing; in the Book ← returns to the spread with the ring on that species and ✓ visits; ← on the spread is Home with the ring on the Library module", () => {
  const st = world(), h = host(st); h.specs.library = J("library"); const Sg = h.specs.library.spread.strings; st.knownIds.push("S01"); st.metIds.push("S03");
  INTENTS.library.focus(h, "frame.S02"); assert.equal(h.ui.lib.i, 1, "the face said the ring moved: the Library keeps it"); INTENTS.library.focus(h, "frame.S16"); assert.equal(h.ui.lib.i, 15); INTENTS.library.focus(h, "tile.1"); assert.equal(h.ui.lib.i, 15, "not a frame: kept");
  INTENTS.library.intent(h, "frame.S02", "confirm"); assert.equal(h.said.at(-1), Sg.unmet); assert.equal(h.ui.lib.f, "spread", "an unmet frame opens nothing"); assert.equal(h.ui.lib.i, 1);
  INTENTS.library.intent(h, "frame.S03", "confirm"); assert.equal(h.said.at(-1), Sg.met); assert.equal(h.ui.lib.f, "spread", "a met frame opens nothing");
  INTENTS.library.intent(h, "sp:S01", "confirm"); assert.equal(h.ui.lib.f, "spread", "only frame.<SNN> is a target"); h.said.length = 0;
  INTENTS.library.intent(h, "frame.S01", "confirm"); assert.deepEqual([h.ui.lib.f, h.ui.lib.sp, h.ui.lib.i, h.said.length], ["book", "S01", 0, 0]);
  INTENTS.library.intent(h, "screen", "back"); assert.deepEqual([h.ui.lib.f, h.ui.lib.i], ["spread", 0], "the Book's ← is the spread, the ring on that species (a cut)");
  INTENTS.library.intent(h, "frame.S01", "back"); assert.deepEqual([h.went.at(-1), h.ui.home.f], ["home", "library"]);
  S.seedAdults(st, "S01", 5, 2, settings); INTENTS.library.openBook(h, "S01"); INTENTS.library.intent(h, "screen", "confirm"); assert.equal(h.went.at(-1), "habitat"); assert.ok(h.ui.hab.id != null);
  INTENTS.habitat.intent(h, "species", "confirm"); assert.deepEqual([h.ui.lib.f, h.ui.lib.sp, h.went.at(-1)], ["guide", "S01", "library"], "the card's species word reaches the species' guide (not built yet), ← reads Library");
});

test("one mibi up close: ✓ on the resident greets (the spec's moment: 1800 ms, held 300, a cut), on the name opens the namer, the gate arms on the first ✓ and acts on the second, any other key disarms, ← goes to the whole with the ring on this mibi", () => {
  const st = world(); S.seedAdults(st, "S01", 5, 2, settings); const [a, b] = st.mibis, h = host(st); h.ui.hab.id = b.id; h.specs.habitat = habitatSpec; h.specs.namer = namerSpec;
  INTENTS.habitat.intent(h, "resident", "confirm"); assert.deepEqual(h.played.at(-1), { kind: "moment", target: "resident", ms: 1800, hold: 300, cut: true }); assert.deepEqual(h.said, [], "nothing said, nothing rewarded");
  h.moving = false; INTENTS.habitat.intent(h, "resident", "confirm"); assert.equal(h.played.at(-1).hold, 0, "reduced motion: the host sends hold 0"); h.moving = true;
  INTENTS.habitat.intent(h, "name", "confirm"); assert.deepEqual([h.ui.hab.namer.mode, h.ui.hab.namer.text, h.ui.hab.namer.fs, h.ui.hab.namer.f], ["rename", b.name, "selected", "act.done"]); h.ui.hab.namer = null;
  INTENTS.habitat.intent(h, "wild", "confirm"); assert.equal(h.ui.hab.wildArm, 1); assert.equal(b.released, false); INTENTS.habitat.intent(h, "wild", "back"); assert.equal(h.ui.hab.wildArm, 0); assert.deepEqual([h.went.at(-1), h.holds.at(-1)], ["vivarium", 180]); assert.equal(h.ui.hab.id, b.id, "the whole's ring follows this mibi");
  INTENTS.habitat.intent(h, "door", "confirm"); assert.deepEqual(st.carryReqs, [{ seq: 1, op: "add", id: b.id }], "the door queued an add"); assert.deepEqual(S.projectCarried(st, h.sv), [b.id]); assert.deepEqual(S.carriedIds(st, h.sv), [], "nothing is carried until the Companion applies it"); assert.deepEqual(h.said, [], "no plate");
  h.ui.hab.id = a.id; INTENTS.habitat.intent(h, "wild", "confirm"); INTENTS.habitat.intent(h, "wild", "confirm");
  assert.equal(a.released, true, "the second ✓ returns it"); assert.equal(h.ui.hab.id, b.id, "the next housed mibi in bay order"); assert.equal(h.played.at(-1).kind, "dither"); assert.match(h.said.at(-1), /goes back to the/);
  INTENTS.habitat.intent(h, "wild", "back"); h.ui.hab.id = b.id; INTENTS.habitat.intent(h, "wild", "confirm"); assert.equal(h.ui.hab.wildArm, 0, "a carried-to-be mibi's return is blocked: nothing arms");
});

test("one mibi up close, the Companion module: take and bring change the request queue and say nothing; a waiting request makes ✓ do nothing; a full set is refused with its plate", () => {
  const st = world(); S.seedAdults(st, "S01", 5, 4, settings); const [a, b, c, d] = st.mibis, sv = { v: 8, seed: 7, wid: "w1", turn: 3, bay: [], mibis: [], carried: [a.id], carrySeen: 0, tier: 1, shield: 3 }, h = host(st, sv); h.specs.habitat = habitatSpec;
  const door = (m) => { h.ui.hab.id = m.id; INTENTS.habitat.intent(h, "door", "confirm"); };
  st.dock = { docked: false, at: T0 }; door(b); assert.deepEqual(st.carryReqs, [{ seq: 1, op: "add", id: b.id }]); const n = st.carryReqs.length; door(b); assert.equal(st.carryReqs.length, n, "a request for it waits: ✓ does nothing (it does not cancel it)");
  st.dock = { docked: true, at: T0 }; door(c); assert.equal(st.carryReqs.length, 2); h.said.length = 0; door(d); assert.equal(st.carryReqs.length, 2, "a full set: nothing queued"); assert.equal(h.said.at(-1), d.name + " stayed home, no room");
  door(a); assert.deepEqual(st.carryReqs.at(-1), { seq: 3, op: "home", id: a.id }, "a carried mibi is brought home");
  st.dock = { docked: false, at: T0 }; sv.carried = [b.id]; sv.carrySeen = 3; st.carryReqs = []; h.said.length = 0; h.ui.hab.id = b.id; INTENTS.habitat.intent(h, "wild", "confirm"); INTENTS.habitat.intent(h, "wild", "confirm"); assert.deepEqual(h.said, [], "a carried mibi's return is blocked: the Wild module says why, the intent says nothing"); assert.equal(b.released, false);
});

test("one mibi up close, the meet: the first ✓ opens the namer and ends the meet; any other key ends it and acts", () => {
  const st = world(); S.seedAdults(st, "S01", 5, 2, settings); const [a] = st.mibis, h = host(st); h.specs.habitat = habitatSpec; h.specs.namer = namerSpec;
  h.ui.hab.id = a.id; h.ui.meet = a.id; INTENTS.habitat.intent(h, "resident", "confirm"); assert.equal(h.ui.meet, null); assert.deepEqual([h.ui.hab.namer.mode, h.ui.hab.namer.text], ["meet", a.name]); assert.deepEqual(h.played, [], "the moment is not played: the first ✓ names");
  h.ui.hab.namer = null; h.ui.meet = a.id; INTENTS.habitat.intent(h, "resident", "back"); assert.equal(h.ui.meet, null); assert.equal(h.went.at(-1), "vivarium");
});

test("one mibi up close, a chapter plate: ✓ reads an unread chapter (the read event, 300 ms held 300), a read or sealed plate does nothing", () => {
  const st = world(); S.seedAdults(st, "S01", 5, 1, settings); const m = st.mibis[0], fr = frameOf("S01"), h = host(st); h.specs.habitat = habitatSpec; h.ui.hab.id = m.id; st.readEver = true;
  m.read = fr.chapters.filter((c, i) => i > 0 && !c.sealed).map((c) => c.id); const d0 = st.d;
  INTENTS.habitat.intent(h, "plate.0", "confirm"); assert.ok(m.read.includes(fr.chapters[0].id)); assert.ok(st.d <= d0); assert.deepEqual(h.played.at(-1), { kind: "read", target: "plate.0", ms: 300, hold: 300 });
  h.played.length = 0; INTENTS.habitat.intent(h, "plate.0", "confirm"); assert.deepEqual(h.played, [], "read: nothing");
});

test("one mibi up close, Cross: only a partner at home can be picked (the first not away); a mibi out with the Companion, or with only away partners, does not open it", () => {
  const st = world(); S.seedAdults(st, "S01", 5, 3, settings); const [a, b, c] = st.mibis, sv = { v: 8, seed: 7, wid: "w1", turn: 3, bay: [], mibis: [], carried: [b.id], tier: 1, shield: 3 }, h = host(st, sv); h.specs.habitat = habitatSpec; st.dock = { docked: false, at: T0 };
  h.ui.hab.id = a.id; INTENTS.habitat.intent(h, "cross", "confirm"); assert.equal(h.went.at(-1), "cross"); assert.equal(h.ui.cross.bId, c.id, "b is out: the first partner not away");
  h.went.length = 0; h.ui.hab.id = b.id; INTENTS.habitat.intent(h, "cross", "confirm"); assert.deepEqual(h.went, [], "the shown mibi is out: it cannot cross until it docks");
  sv.carried = [b.id, c.id]; h.ui.hab.id = a.id; INTENTS.habitat.intent(h, "cross", "confirm"); assert.deepEqual(h.went, [], "only away partners: refused");
  st.dock = { docked: true, at: T0 }; INTENTS.habitat.intent(h, "cross", "confirm"); assert.equal(h.went.at(-1), "cross", "docked, the carried mibi crosses as any adult");
});

test("Create: ◀ ▶ walk the read traits, ← returns to the pod's overview with nothing spent", () => {
  const st = world(), p = pod(st, "S01", chapters("S01").slice(0, 2)), h = host(st); h.ui.create = { podId: p.id, choices: {}, f: 0, clash: [], grown: null };
  INTENTS.create.intent(h, "x", "step:right"); assert.equal(h.ui.create.f, 1); INTENTS.create.intent(h, "x", "step:left"); assert.equal(h.ui.create.f, 0);
  INTENTS.create.intent(h, "x", "back"); assert.deepEqual([h.went.at(-1), h.ui.pods.view, h.ui.pods.focus.cur, h.ui.create], ["pods", "overview", "pod", null]); assert.equal(st.tray.length, 1);
});

test("Create ▲ ▼: a trait that rolls changes its look and the founder cross-dithers (a dither on the founder from the old picture's id, 200 ms, no hold); a doing or a trait with one look does nothing, no plate", () => {
  const st = world(), p = pod(st, "S01", chapters("S01").slice(0, 2)), h = host(st), fr = frameOf("S01"); h.ui.create = { podId: p.id, choices: {}, f: 0, clash: [], grown: null };
  const list = fr.chapters.filter((c) => p.read.includes(c.id)).flatMap((c) => c.traits), at = list.findIndex((t) => S.rollOptions(p, t.id).length > 1), still = list.findIndex((t) => S.rollOptions(p, t.id).length <= 1);
  assert.ok(at >= 0, "a trait that rolls");
  h.ui.create.f = at; INTENTS.create.intent(h, "roll", "step:down");
  assert.equal(h.ui.create.choices[list[at].id], 1); const ev = h.played.at(-1);
  assert.deepEqual([ev.kind, ev.target, ev.ms, ev.hold, typeof ev.from], ["dither", "founder", 200, 0, "string"]); assert.match(ev.from, /^founder:S01:/); assert.equal(h.ui.create.prev, ev.from);
  INTENTS.create.intent(h, "roll", "step:up"); assert.equal(h.ui.create.choices[list[at].id], undefined, "back to the pod's own look");
  if (still >= 0) { h.played.length = 0; h.said.length = 0; h.ui.create.f = still; INTENTS.create.intent(h, "roll", "step:down"); assert.deepEqual([h.played.length, h.said.length], [0, 0]); }
});

test("Create ✓: the rule pays and the grow event plays (900 ms, input held 1080), the code is the screen's while it holds, and the jump to the Incubator comes at 900 ms from the timer; with reduced motion the jump is on the frame of ✓", () => {
  const st = world(), p = pod(st, "S01", chapters("S01").slice(0, 2)), h = host(st); h.ui.create = { podId: p.id, choices: {}, f: 0, clash: [], grown: null };
  INTENTS.create.intent(h, "roll", "confirm");
  assert.ok(st.bud); assert.ok(!st.tray.includes(p), "the pod is gone from the rack"); assert.deepEqual(h.played.map((e) => [e.kind, e.target, e.ms, e.hold]), [["grow", "pod", 900, 1080]]);
  assert.deepEqual([h.went.length, h.ui.create.grown.code, typeof h.ui.create.grown.cost.e], [0, st.bud.code, "number"], "still on Create, holding"); assert.deepEqual(h.timers.map((t) => t.ms), [900]); assert.deepEqual(h.said, [], "no plate");
  INTENTS.create.intent(h, "roll", "confirm"); INTENTS.create.intent(h, "roll", "step:down"); assert.equal(h.timers.length, 1, "nothing acts while it grows");
  h.timers[0].fn(); assert.deepEqual([h.went.at(-1), h.ui.create], ["incubator", null]);
  const st2 = world(), p2 = pod(st2, "S01", []), h2 = host(st2); h2.moving = false; h2.ui.create = { podId: p2.id, choices: {}, f: 0, clash: [], grown: null };
  INTENTS.create.intent(h2, "room", "confirm"); assert.deepEqual([h2.went.at(-1), h2.ui.create, h2.played.length, h2.timers.length], ["incubator", null, 0, 0], "a cut: nothing to wait for");
});

test("Create ✓ refused: a short purse says what is short and nothing is spent, the screen stays", () => {
  const st = world(), p = pod(st, "S01", chapters("S01").slice(0, 1)), h = host(st); st.e = 0; h.ui.create = { podId: p.id, choices: {}, f: 0, clash: [], grown: null };
  const e = st.e; INTENTS.create.intent(h, "roll", "confirm"); assert.equal(st.e, e); assert.ok(!st.bud); assert.equal(h.ui.create.grown, null); assert.equal(h.said.length, 1); assert.deepEqual(h.played, []);
});

test("Create ✓ blocked (busy, no bay, clash): nothing happens and no plate", () => {
  const mk = (over) => { const st = world(), p = pod(st, "S01", chapters("S01").slice(0, 1)), h = host(st); h.ui.create = { podId: p.id, choices: {}, f: 0, clash: [], grown: null }; over(st, h); return { st, h }; };
  const cases = { busy: (st) => { st.bud = { minutes: 5 }; }, noBay: (st) => { st.mibis = Array.from({ length: S.bayCount(st, settings) }, (_, i) => ({ id: 900 + i, bay: i, released: false })); }, clash: (st, h) => { h.ui.create.clash = ["x"]; } };
  for (const [k, f] of Object.entries(cases)) {
    const { st, h } = mk(f), e = st.e; assert.equal(S.growBlockKey(st, st.tray[0], {}, settings, h.ui.create.clash)?.key, k);
    INTENTS.create.intent(h, "room", "confirm");
    assert.deepEqual([h.said, h.played, h.timers.length, st.e, h.ui.create.grown], [[], [], 0, e, null], k + ": ✓ does nothing, no plate");
  }
});

test("Pods ✓: Identify plays the seal (and a ribbon for a new species), an identified pod opens Create whatever has been read, a tab opens its page free and on the page reads, ← climbs one level", () => {
  const st = world(), a = pod(st, "S01", [], 5, false), h = host(st); h.ui.pods.cur = a.id; h.ui.pods.view = "overview";
  INTENTS.pods.intent(h, "pod", "confirm"); assert.equal(a.idd, 1); assert.ok(h.played.some((e) => e.kind === "seal" && e.hold === 2000)); assert.ok(h.played.some((e) => e.kind === "ribbon"), "a new species"); assert.equal(h.saved, 1);
  assert.equal(a.read.length, 0); INTENTS.pods.intent(h, "pod", "confirm"); assert.equal(h.went.at(-1), "create", "identified with nothing read opens Create"); assert.equal(h.ui.create.podId, a.id);
  h.went.length = 0; h.ui.create = null;
  INTENTS.pods.intent(h, "rail.1", "confirm"); assert.deepEqual([h.ui.pods.view, h.ui.pods.ci, h.ui.pods.focus.cur], ["chapter", 1, "rail.1"]); assert.equal(a.read.length, 0, "opening a page is free");
  INTENTS.pods.intent(h, "rail.1", "confirm"); assert.deepEqual(a.read, [chapters("S01")[1]]); assert.ok(h.played.some((e) => e.kind === "wipe" && e.chapter === chapters("S01")[1]));
  INTENTS.pods.intent(h, "rail.1", "back"); assert.deepEqual([h.ui.pods.view, h.ui.pods.focus.cur], ["overview", "rail.1"]);
  INTENTS.pods.intent(h, "pod", "back"); assert.deepEqual([h.ui.pods.view, h.ui.pods.focus.cur], ["collection", "place.0"]); INTENTS.pods.intent(h, "place.0", "back"); assert.equal(h.went.at(-1), "home");
  INTENTS.pods.intent(h, "place.0", "confirm"); assert.deepEqual([h.ui.pods.view, h.ui.pods.cur, h.ui.pods.focus.cur], ["overview", a.id, "pod"]);
});

test("Pods, the hatch: the first ✓ arms (the spec's '✓ again'), the second returns the pod to the wild, any other key disarms", () => {
  const st = world(), a = pod(st, "S01", [], 5), h = host(st); h.ui.pods.cur = a.id; h.ui.pods.view = "overview";
  INTENTS.pods.intent(h, "hatch", "confirm"); assert.equal(h.ui.pods.wildArm, 1); assert.equal(h.said.at(-1), podsSpec.strings.hatchAgain); assert.equal(st.tray.length, 1);
  INTENTS.pods.intent(h, "hatch", "step:left"); assert.equal(h.ui.pods.wildArm, 0);
  INTENTS.pods.intent(h, "hatch", "confirm"); INTENTS.pods.intent(h, "hatch", "confirm"); assert.equal(st.tray.length, 0); assert.deepEqual([h.ui.pods.view, h.ui.pods.cur], ["collection", null]);
});

test("Pods, Compare: ✓ on a kin opens it; ◀ ▶ step the chapter and the ring follows to its tab, never past the ends; ← closes it and the ring lands on the kin that opened it, else on the pod", () => {
  const st = world(), a = pod(st, "S01", chapters("S01"), 5), b = pod(st, "S01", chapters("S01"), 6), c = pod(st, "S01", chapters("S01"), 7), h = host(st); h.ui.pods.cur = a.id; h.ui.pods.view = "overview";
  assert.ok(S.canCompare(st, a, b));
  INTENTS.pods.intent(h, "kin.1", "confirm"); assert.deepEqual(h.ui.pods.cmp, { a: a.id, b: c.id, ci: 0 });
  INTENTS.pods.intent(h, "rail.0", "step:left"); assert.equal(h.ui.pods.cmp.ci, 0, "never a wrap"); INTENTS.pods.intent(h, "rail.0", "step:right"); assert.deepEqual([h.ui.pods.cmp.ci, h.ui.pods.focus.cur], [1, "rail.1"]);
  const n = chapters("S01").length; for (let i = 0; i < n + 2; i++) INTENTS.pods.intent(h, "rail.x", "step:right"); assert.equal(h.ui.pods.cmp.ci, n - 1);
  INTENTS.pods.intent(h, "rail.x", "back"); assert.equal(h.ui.pods.cmp, null); assert.deepEqual([h.ui.pods.view, h.ui.pods.focus.cur], ["overview", "kin.1"], "the kin that opened Compare, not the pod");
  h.ui.pods.cmp = { a: a.id, b: "nobody", ci: 0 }; INTENTS.pods.intent(h, "rail.0", "back"); assert.equal(h.ui.pods.focus.cur, "pod", "else the pod");
});

import { createFramePresenter } from "../src/present.mjs";
test("the frame presenter's events: a counter that rose ticks (one unit every 70 ms, 240 ms behind the figure), a fall or the first values send nothing, a changed turn flashes for a second", () => {
  const p = createFramePresenter(), v = { e: 5, d: 3, s: 2, turn: 4 };
  assert.deepEqual(p.events(v), [], "the first values");
  assert.deepEqual(p.events({ ...v, e: 9 }), [{ kind: "tick", target: "e", from: 5, to: 9, ms: 3 * 70 + 240 }]);
  assert.deepEqual(p.events({ e: 9, d: 5, s: 1, turn: 5 }), [{ kind: "tick", target: "d", from: 3, to: 5, ms: 70 + 240 }, { kind: "flash", target: "turn", ms: 1000 }], "d rose, s fell, the turn changed");
  assert.deepEqual(p.events({ e: 9, d: 5, s: 1, turn: 5 }), [], "nothing changed");
  assert.deepEqual(p.events({ e: 10, d: 5, s: 1, turn: 5 }), [{ kind: "tick", target: "e", from: 9, to: 10, ms: 240 }]);
});

import { readdirSync as ls2, readFileSync as rf2, existsSync as ex2 } from "node:fs";
// The transitive import graph of intents/: every module it reaches, followed through relative imports (and `import()`), reads like a Node program: no document, window, canvas, storage or clock of the page, and none of
// the drawing half, the screens, the renderer or the game's singletons.
const FORBIDDEN = /\b(document|window|canvas|getContext|localStorage|sessionStorage|performance|requestAnimationFrame|createImageBitmap|OffscreenCanvas|Image)\b/;
const NOT_REACHED = /(^|\/)(screens|render|components)\/|(^|\/)(gfx|game|scene|layout|context|type|main|face-lvgl|masters|podsprites|pictures|dev|caddy)\.mjs$/;
function graph(entry) {
  const seen = new Map(), todo = [entry];
  while (todo.length) {
    const f = todo.pop(); if (seen.has(f)) continue;
    const src = rf2(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, ""); seen.set(f, src);
    for (const m of src.matchAll(/(?:from|import\()\s*"(\.[^"]+)"/g)) { const to = path.resolve(path.dirname(f), m[1]); if (/\.(mjs|js)$/.test(to) && ex2(to)) todo.push(to); }
  }
  return seen;
}
test("the intents are DOM-free, transitively: nothing they import reaches a document, a canvas, storage, the page's clock, a screen, the drawing half or the game's singletons", () => {
  const dir = path.resolve(here, "../src/intents"), all = new Map();
  for (const f of ls2(dir).filter((x) => x.endsWith(".mjs"))) for (const [k, v] of graph(path.join(dir, f))) all.set(k, v);
  assert.ok(all.size > 12, "the graph was followed: " + all.size + " modules");
  for (const [f, src] of all) {
    const rel = path.relative(path.resolve(here, ".."), f);
    assert.doesNotMatch(f, NOT_REACHED, rel + " is in the intents' graph");
    const code = src.replace(/"(?:[^"\\\n]|\\.)*"/g, '""');   // a word in a string or a data key is not a use
    assert.doesNotMatch(code, FORBIDDEN, rel + " names " + (code.match(FORBIDDEN) || [])[0]);
  }
});

test("the Vivarium's whole: ✓ on a resident or a tile looks at that mibi up close (the transition held for events.look), nothing on the room or an unknown mibi; ← goes Home with the ring on the panel", () => {
  const st = world(); S.seedAdults(st, "S01", 5, 3, settings); st.dock = { docked: true, at: T0 };
  const h = host(st), m = st.mibis[1], ev = h.specs.vivarium.events.look;
  INTENTS.vivarium.intent(h, "resident." + m.id, "confirm"); assert.deepEqual([h.ui.hab.id, h.ui.hab.f, h.went.at(-1)], [m.id, "resident", "habitat"]); assert.equal(h.holds.at(-1), ev.hold, "the look holds input for events.look.hold");
  h.ui.meet = st.mibis[2].id; INTENTS.vivarium.intent(h, "tile." + st.mibis[2].id, "confirm"); assert.equal(h.ui.meet, st.mibis[2].id, "looking at the mibi that was to be met opens its meet: the first press up close ends it");
  const n = h.went.length; INTENTS.vivarium.intent(h, "room", "confirm"); INTENTS.vivarium.intent(h, "tile.nobody", "confirm"); assert.equal(h.went.length, n, "nothing to look at, nothing happens");
  INTENTS.vivarium.intent(h, "resident." + m.id, "back"); assert.deepEqual([h.went.at(-1), h.ui.home.f], ["home", "vivarium"]);
});

// ---- the Probe bench (bench.json): ✓ on the plates mends one, the switch toggles the dock's mend, the slot arms and fits ----
function benchHost({ docked = true, shield = 2, tier = 1, e = 99, d = 99, mendFull = true, moving = true } = {}) {
  const st = world(); st.e = e; st.d = d; st.mendFull = mendFull; st.dock = { docked, at: T0 }; st.probe = { shield, smax: S.TIER[tier].shield, tier, seq: 1 };
  const h = host(st); h.ui.screen = "bench"; h.moving = moving; return h;
}
const BE = JSON.parse(readFileSync(path.join(specs, "bench.json"), "utf8")).events, BS = JSON.parse(readFileSync(path.join(specs, "bench.json"), "utf8")).strings;
test("the bench: ✓ on the plates mends one plate for ⚡ 1, plays the mend (from the whole before, to one more) holding 300 ms, and saves; reduced motion holds nothing", () => {
  let h = benchHost(); INTENTS.bench.intent(h, "plates", "confirm");
  assert.equal(h.st.probe.shield, 3); assert.equal(h.st.e, 98); assert.deepEqual(h.played, [{ kind: "mend", target: "plates", ms: BE.mend.ms, hold: BE.mend.hold, from: 2, to: 3 }]); assert.equal(h.saved, 1); assert.deepEqual(h.said, [], "no plate: the context and the counters say it");
  h = benchHost({ moving: false }); INTENTS.bench.intent(h, "plates", "confirm"); assert.deepEqual(h.played, [{ kind: "mend", target: "plates", ms: BE.mend.ms, hold: 0, from: 2, to: 3 }]);
  h = benchHost({ shield: 3 }); INTENTS.bench.intent(h, "plates", "confirm"); assert.deepEqual([h.played, h.said, h.saved], [[], [], 0], "every plate whole: nothing");
  h = benchHost({ docked: false }); INTENTS.bench.intent(h, "plates", "confirm"); assert.deepEqual([h.played.length, h.st.e], [0, 99], "away: nothing");
});
test("the bench: ✓ on the plates short of ⚡ says it on the message plate and spends nothing, plays nothing", () => {
  const h = benchHost({ e: 0 }); INTENTS.bench.intent(h, "plates", "confirm");
  assert.equal(h.st.probe.shield, 2); assert.equal(h.st.e, 0); assert.deepEqual(h.played, []); assert.deepEqual(h.said, [BS.short.replace("{icons}", "⚡")]); assert.equal(h.saved, 0);
});
test("the bench: ✓ on the switch toggles whether the dock mends every plate, plays the switch (from and to), holds nothing, saves; set away too", () => {
  let h = benchHost({ mendFull: true }); INTENTS.bench.intent(h, "switch", "confirm");
  assert.equal(h.st.mendFull, false); assert.deepEqual(h.played, [{ kind: "switch", target: "switch", ms: BE.switch.ms, hold: 0, from: 1, to: 0 }]); assert.equal(h.saved, 1);
  INTENTS.bench.intent(h, "switch", "confirm"); assert.equal(h.st.mendFull, true); assert.deepEqual(h.played.at(-1), { kind: "switch", target: "switch", ms: BE.switch.ms, hold: 0, from: 0, to: 1 });
  h = benchHost({ docked: false, mendFull: false }); INTENTS.bench.intent(h, "switch", "confirm"); assert.equal(h.st.mendFull, true, "away: the standing choice is still set");
  assert.ok(h.st.log.some((l) => /mends every plate/.test(l)), "a log line");
});
test("the bench: the slot's two-press gate: short says so and spends nothing; the first ✓ arms; the second fits (⚡ −12 ◆ −4, tier 2, four plates), plays the install holding 900 ms and sets then clears the install flag; reduced motion sets none", () => {
  let h = benchHost({ e: 5, d: 1 }); INTENTS.bench.intent(h, "slot", "confirm"); assert.deepEqual([h.said, h.ui.bench.arm, h.played, h.st.e], [[BS.short.replace("{icons}", "⚡ ◆")], 0, [], 5], "short: the plate, no arm");
  h = benchHost({ shield: 2 }); INTENTS.bench.intent(h, "slot", "confirm"); assert.deepEqual([h.ui.bench.arm, h.played, h.st.e], [1, [], 99], "the first ✓ arms and spends nothing");
  INTENTS.bench.intent(h, "slot", "confirm");
  assert.deepEqual([h.st.e, h.st.d, S.tierNow(h.st, h.sv), h.st.probe.shield, h.ui.bench.arm, h.ui.bench.install], [87, 95, 2, 4, 0, true]);
  assert.deepEqual(h.played, [{ kind: "install", target: "slot", ms: BE.install.ms, hold: BE.install.hold, from: 2, to: 4 }]); assert.equal(h.saved, 1);
  assert.deepEqual(h.timers.map((t) => t.ms), [BE.install.ms]); h.timers[0].fn(); assert.equal(h.ui.bench.install, false, "the flag clears when the install ends");
  h = benchHost({ moving: false }); INTENTS.bench.intent(h, "slot", "confirm"); INTENTS.bench.intent(h, "slot", "confirm"); assert.deepEqual([h.ui.bench.install, h.played[0].hold, h.timers.length, S.tierNow(h.st, h.sv)], [false, 0, 0, 2]);
  h = benchHost({ tier: 2, shield: 4 }); INTENTS.bench.intent(h, "slot", "confirm"); INTENTS.bench.intent(h, "slot", "confirm"); assert.deepEqual([h.played, h.said, h.ui.bench.arm], [[], [], 0], "fitted: nothing");
  h = benchHost({ docked: false }); INTENTS.bench.intent(h, "slot", "confirm"); assert.deepEqual([h.played, h.said, h.ui.bench.arm], [[], [], 0], "away: nothing");
});
test("the bench: any verb but ✓ clears the arm; ← goes Home with the ring on the Probe module; the ring the face says is kept", () => {
  const h = benchHost(); INTENTS.bench.intent(h, "slot", "confirm"); assert.equal(h.ui.bench.arm, 1);
  INTENTS.bench.intent(h, "slot", "room:home"); assert.equal(h.ui.bench.arm, 0, "a key but ✓ clears it"); INTENTS.bench.intent(h, "slot", "confirm"); assert.equal(h.ui.bench.arm, 1);
  INTENTS.bench.intent(h, "slot", "back"); assert.deepEqual([h.ui.bench.arm, h.ui.home.f, h.went.at(-1)], [0, "probe", "home"]);
  INTENTS.bench.focus(h, "switch"); assert.equal(h.ui.bench.f, "switch");
});
test("the Dock key on the bench: lifted, the ring on the plates moves to the switch and the arm clears; docked, the ring stays", () => {
  const st = world(); st.dock = { docked: true, at: T0 }; st.probe = { shield: 2, smax: 3, tier: 1, seq: 1 }; const sv = { v: 8, seed: 7, wid: "w1", turn: 0, bay: [], mibis: [], with: null, tier: 1, shield: 3 }, h = host(st, sv);
  h.ui.screen = "bench"; h.ui.bench.f = "plates"; h.ui.bench.arm = 1; INTENTS.frame.dock(h); assert.equal(h.st.dock.docked, false); assert.deepEqual([h.ui.bench.f, h.ui.bench.arm], ["switch", 0]);
  h.ui.bench.f = "slot"; INTENTS.frame.dock(h); assert.equal(h.st.dock.docked, true); assert.equal(h.ui.bench.f, "slot", "away to docked: the ring stays");
});
