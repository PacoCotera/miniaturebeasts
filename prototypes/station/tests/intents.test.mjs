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
import { openBay } from "../src/intents/home.mjs";
import { HATCH_MS } from "../src/intents/incubator.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), fdir = path.resolve(here, "../../workbench/frames"), specs = path.resolve(here, "../../ui/specs/station");
setFrames(readdirSync(fdir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(fdir, f), "utf8"))));
const J = (n) => JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8")), podsSpec = J("pods"), frameSpec = J("frame"), homeSpec = J("home");
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 12 }, T0 = 1_000_000;

const newUI = () => ({ screen: "home", home: { f: "room" }, pods: { view: "collection", cur: null, ci: 0, cmp: null, wildArm: 0, focus: createFocus({}, null) }, create: null, cross: null, lib: { sp: null, f: "spread", page: 0, i: 0 }, hab: { id: null, f: "stage", wildArm: 0 }, bench: { f: 0, arm: 0 }, meet: null, idle: false, report: null });
// A recording host: the effects are lists to read afterwards.
function host(st, sv = { v: 8, seed: 7, wid: "w1", turn: 0, bay: [], mibis: [], with: null, tier: 1, shield: 3 }, ui = newUI()) {
  const h = { st, sv, settings, ui, specs: { pods: podsSpec, frame: frameSpec, home: homeSpec }, said: [], went: [], played: [], timers: [], saved: 0, t: T0, now: () => h.t };
  Object.assign(h, { say: (t) => h.said.push(t), goto: (s) => { h.went.push(s); ui.screen = s; }, play: (e) => h.played.push(e), at: (ms, fn) => h.timers.push({ ms, fn }), save: () => { h.saved++; } });
  return h;
}
const world = () => { const st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = 99; st.d = 99; st.s = 99; st.firstMibi = false; return st; };
function pod(st, id, read = [], gs = 5, identified = true) { S.seedPodFromGenome(st, podGenome(frameOf(id), gs), settings, T0); const p = st.tray[st.tray.length - 1]; if (identified) S.skipIdentify(st, p); p.read = read.slice(); return p; }
const chapters = (id) => frameOf(id).chapters.map((c) => c.id);

test("every screen with intents has a module, and a face intent reaches it; the frame's verbs are the same on every screen", () => {
  assert.deepEqual(Object.keys(INTENTS).sort(), ["create", "frame", "habitat", "home", "incubator", "library", "pods"]);
  const st = world(), h = host(st); h.ui.screen = "library";
  dispatch(h, { screen: "library", target: "x", verb: "room:home" }); assert.deepEqual(h.went, ["home"]); assert.equal(h.ui.home.f, "room");
});

test("the room keys: the unpaid choices of Create and Cross are dropped; Research opens the collection with the ring on the pod that most needs the player; the others open their tops", () => {
  const st = world(), a = pod(st, "S01", [], 3, false), h = host(st); h.ui.create = { podId: a.id }; h.ui.cross = {};
  assert.equal(INTENTS.frame.roomKey(h, "research"), true);
  assert.equal(h.ui.create, null); assert.equal(h.ui.cross, null); assert.deepEqual(h.went, ["pods"]); assert.equal(h.ui.pods.view, "collection"); assert.equal(h.ui.pods.cur, a.id); assert.equal(h.ui.pods.focus.cur, "place.0");
  h.ui.lib.f = "book"; INTENTS.frame.roomKey(h, "library"); assert.equal(h.ui.lib.f, "spread"); assert.equal(h.went.at(-1), "library");
  h.ui.hab.wildArm = 1; INTENTS.frame.roomKey(h, "habitat"); assert.deepEqual([h.ui.hab.f, h.ui.hab.wildArm, h.went.at(-1)], ["stage", 0, "habitat"]);
  assert.equal(INTENTS.frame.roomKey(h, "nonsense"), false);
});

test("Home: ✓ goes to the target's screen (Cargo, Pods on the pod that most needs the player, the Incubator, the Probe bench, the Library, the Vivarium on a resident); the rest knob holds input for events.rest and the face's done takes Idle; ← does nothing", () => {
  const st = world(); S.seedAdults(st, "S01", 5, 2, settings); st.dock = { docked: true, at: T0 }; pod(st, "S01", [], 5, false);
  const h = host(st), m = st.mibis[0], go = (t) => INTENTS.home.intent(h, t, "confirm");
  go("cargo"); assert.equal(h.went.at(-1), "cargo"); go("incubator"); assert.equal(h.went.at(-1), "incubator"); go("probe"); assert.deepEqual([h.went.at(-1), h.ui.bench.f], ["bench", 0]); go("library"); assert.deepEqual([h.went.at(-1), h.ui.lib.f], ["library", "spread"]);
  go("pods"); assert.equal(h.went.at(-1), "pods"); assert.equal(h.ui.pods.cur, S.neediestPod(st).id);
  go("resident." + m.id); assert.deepEqual([h.ui.hab.id, h.ui.hab.f, h.went.at(-1)], [m.id, "stage", "habitat"]);
  h.ui.hab.id = st.mibis[1].id; go("vivarium"); assert.deepEqual([h.ui.hab.id, h.went.at(-1)], [st.mibis[1].id, "habitat"], "the Vivarium opens on the mibi last seen up close");
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
test("Cargo's bay opening is the rule, kept for the developer panel until Cargo is built: it opens every crate, an arrival each, input held, and says why when the bay is empty or shut", () => {
  const st = world(); S.seedCrate(st, "S01", 2, 4101, T0); st.dock = { docked: true, at: T0 };
  const h = host(st); openBay(h);
  assert.equal(h.played.filter((e) => e.kind === "arrival").length, 1, "one crate, one arrival"); assert.ok(h.ui.report && h.saved === 1); assert.equal(st.tray.length, 2);
});

test("the incubator: ✓ on a ready bud opens it (the hatch event, the new mibi to meet), on a growing one grows it now; ← goes Home", () => {
  const st = world(), p = pod(st, "S01", chapters("S01")); assert.ok(S.grow(st, p, {}, settings, T0).ok);
  const h = host(st); h.t = T0;
  INTENTS.incubator.intent(h, "bud", "confirm"); assert.equal(h.said.at(-1), "The bud grows now"); assert.ok(S.budReady(st, settings, T0));
  INTENTS.incubator.intent(h, "bud", "confirm"); const hatch = h.played.find((e) => e.kind === "hatch"); assert.ok(hatch && hatch.hold === HATCH_MS && Number.isInteger(hatch.hold)); const meet = h.timers.at(-1); assert.equal(meet.ms, HATCH_MS, "the hand-off to the meet is scheduled at the hatch's end"); meet.fn(); assert.deepEqual([h.went.at(-1), h.ui.hab.f], ["habitat", "door"]); assert.equal(h.ui.meet, st.mibis.at(-1).id); assert.equal(st.bud, null);
  INTENTS.incubator.intent(h, "bud", "back"); assert.equal(h.went.at(-1), "home");
});

test("the Library: ✓ on a known or met species opens its book, on an empty frame says so; in the book ← returns to the spread and ✓ visits", () => {
  const st = world(), h = host(st); st.knownIds.push("S01");
  INTENTS.library.intent(h, "sp:S02", "confirm"); assert.equal(h.said.at(-1), "Nothing is known of this frame yet"); assert.equal(h.ui.lib.f, "spread");
  INTENTS.library.intent(h, "sp:S01", "confirm"); assert.deepEqual([h.ui.lib.f, h.ui.lib.sp], ["book", "S01"]);
  INTENTS.library.intent(h, "book", "back"); assert.equal(h.ui.lib.f, "spread"); INTENTS.library.intent(h, "sp:S01", "back"); assert.equal(h.went.at(-1), "home");
  S.seedAdults(st, "S01", 5, 2, settings); INTENTS.library.openBook(h, "S01"); INTENTS.library.intent(h, "book", "confirm"); assert.equal(h.went.at(-1), "habitat"); assert.ok(h.ui.hab.id != null);
});

test("the Vivarium: the stage leans, the door takes the resident with you (a queued add), the gate arms on the first ✓ and acts on the second, any other key disarms, ← goes Home", () => {
  const st = world(); S.seedAdults(st, "S01", 5, 2, settings); const [a, b] = st.mibis, h = host(st); h.ui.hab.id = b.id;
  INTENTS.habitat.intent(h, "stage", "confirm"); assert.match(h.said.at(-1), /leans on the glass/); assert.equal(h.played.at(-1).kind, "moment");
  INTENTS.habitat.intent(h, "wild", "confirm"); assert.equal(h.ui.hab.wildArm, 1); assert.equal(b.released, false); INTENTS.habitat.intent(h, "wild", "back"); assert.equal(h.ui.hab.wildArm, 0); assert.equal(h.went.at(-1), "home");
  INTENTS.habitat.intent(h, "door", "confirm"); assert.deepEqual(st.carryReqs, [{ seq: 1, op: "add", id: b.id }], "the door queued an add"); assert.deepEqual(S.projectCarried(st, h.sv), [b.id]); assert.deepEqual(S.carriedIds(st, h.sv), [], "nothing is carried until the Companion applies it");
  h.ui.hab.id = a.id; INTENTS.habitat.intent(h, "wild", "confirm"); INTENTS.habitat.intent(h, "wild", "confirm");
  if (S.returnMibiBlock(st, h.sv, a)) assert.ok(h.said.at(-1)); else { assert.equal(a.released, true); assert.equal(h.ui.hab.id, null); }
});

test("the Vivarium's door: take and bring say the signed words docked and away; a waiting request makes ✓ do nothing; a full set is refused with its plate; a blocked return says nothing", () => {
  const st = world(); S.seedAdults(st, "S01", 5, 4, settings); const [a, b, c, d] = st.mibis, sv = { v: 8, seed: 7, wid: "w1", turn: 3, bay: [], mibis: [], carried: [a.id], carrySeen: 0, tier: 1, shield: 3 }, h = host(st, sv);
  const door = (m) => { h.ui.hab.id = m.id; INTENTS.habitat.intent(h, "door", "confirm"); return h.said.at(-1); };
  assert.equal(door(b), b.name + " goes at the next dock", "away: an add");
  const n = st.carryReqs.length, said = h.said.length; door(b); assert.deepEqual([st.carryReqs.length, h.said.length], [n, said], "a request for it waits: ✓ does nothing (it does not cancel it)");
  st.dock = { docked: true, at: T0 }; assert.equal(door(c), c.name + " goes with you now", "docked: an add");
  assert.equal(door(d), "The Companion takes three at most", "a full set"); assert.equal(st.carryReqs.length, 2, "nothing queued");
  assert.equal(door(a), a.name + " comes home now", "docked: a home"); st.dock = { docked: false, at: T0 }; sv.carried = [b.id]; sv.carrySeen = 3; st.carryReqs = [];
  assert.equal(door(b), b.name + " comes home when you dock", "away: a home");
  h.said.length = 0; h.ui.hab.id = b.id; INTENTS.habitat.intent(h, "wild", "confirm"); INTENTS.habitat.intent(h, "wild", "confirm"); assert.deepEqual(h.said, [], "a carried mibi's return is blocked: the Wild module says why, the intent says nothing"); assert.equal(b.released, false);
});

test("Create: ◀ ▶ walk the read traits, ✓ grows the founder (a stamp event, input held, the incubator), a refusal is said, ← returns to the pod's overview", () => {
  const st = world(), p = pod(st, "S01", chapters("S01").slice(0, 2)), h = host(st), frame = frameOf("S01"); h.ui.create = { podId: p.id, choices: {}, f: 0, clash: [] };
  INTENTS.create.intent(h, "x", "step:right"); assert.equal(h.ui.create.f, 1); INTENTS.create.intent(h, "x", "step:left"); assert.equal(h.ui.create.f, 0);
  INTENTS.create.intent(h, "x", "back"); assert.deepEqual([h.went.at(-1), h.ui.pods.view, h.ui.pods.focus.cur, h.ui.create], ["pods", "overview", "pod", null]);
  h.ui.create = { podId: p.id, choices: {}, f: 0, clash: [] }; INTENTS.create.intent(h, "x", "confirm");
  assert.equal(h.went.at(-1), "incubator"); assert.ok(h.played.some((e) => e.kind === "stamp")); assert.ok(st.bud); assert.equal(h.ui.create, null); assert.match(h.said.at(-1), /^Grown · /);
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
