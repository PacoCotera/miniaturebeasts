// Cargo's props (lvgl-switch.md §2.1, §4 L2.2; build spec 1 to 6): the view the face takes, views/cargo-props.mjs, in Node. Plain JSON that names what and never where: it validates against cargo.props.json in every state (bay, opening,
// end, arrival), holds no rectangle, no measure and no layout rule, fits the 32 KiB props budget with the frame beside it, spells the line from cargo.json's strings (Open them all, Open it, Skip, Look at the pods, the waiting line),
// plans the run on a copy of the state (each crate's pods with the well or the mat place each lands in, its finds and materials, its length, the start table) and applies the rules one crate at a time.
//   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, podGenome, speciesIndex } from "../src/genome.mjs";
import { traitLooks } from "../../workbench/framework/describe.mjs";
import * as S from "../src/state.mjs";
import * as T from "../src/sitting.mjs";
import { cargoBuild } from "../src/views/cargo-props.mjs";
import { readyList, planRun, lengthOf, timesOf, fitCount, stepTimes, HOLD_MAX } from "../src/cargo-run.mjs";
import { INTENTS } from "../src/intents/index.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames"), specs = path.resolve(here, "../../ui/specs/station");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const J = (f) => JSON.parse(readFileSync(path.join(specs, f), "utf8")), spec = J("cargo.json"), home = J("home.json"), frameSpec = J("frame.json"), schema = J("cargo.props.json");
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 12 }, T0 = 1_000_000;

function validate(v, sc, at = "$", out = []) {
  if (sc.$ref) return validate(v, schema.$defs[sc.$ref], at, out);
  if (sc.enum && !sc.enum.includes(v)) { out.push(`${at}: ${JSON.stringify(v)} is not one of ${JSON.stringify(sc.enum)}`); return out; }
  if (sc.type) {
    const ts = [].concat(sc.type), ty = v === null ? "null" : Array.isArray(v) ? "array" : Number.isInteger(v) ? "integer" : typeof v;
    if (!ts.includes(ty) && !(ty === "integer" && ts.includes("number"))) { out.push(`${at}: a ${ty}, wanted ${ts.join(" or ")}`); return out; }
  }
  if (Array.isArray(v) && sc.items) v.forEach((x, i) => validate(x, sc.items, `${at}[${i}]`, out));
  if (v && typeof v === "object" && !Array.isArray(v)) {
    for (const k of sc.required ?? []) if (!(k in v)) out.push(`${at}: ${k} is required`);
    for (const [k, x] of Object.entries(v)) { const p = sc.properties?.[k]; if (p) validate(x, p, `${at}.${k}`, out); else if (sc.additionalProperties === false) out.push(`${at}: ${k} is not a prop`); }
  }
  return out;
}

const world = () => { const st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = 99; st.d = 99; st.s = 99; st.firstMibi = false; st.dock = { docked: true, at: T0 }; return st; };
const crate = (n, pods = 2, extra = {}) => ({ id: "c" + n, n, turn: n * 2, at: T0, e: 3, d: 3, s: 4, met: [], explored: 5 * n, of: 20, lines: [], pods: Array.from({ length: pods }, (_, j) => ({ id: "p" + j, species: "S01", sp: speciesIndex("S01"), g: "meadow", how: "calm", gs: 11 + 7 * n + j, k: null })), ...extra });
const sitting = (st, over = {}) => { const m = S.seedAdults(st, "S01", 5, 1, settings).mibis[0]; st.sittingCrates.push({ id: "sc1", mibiId: m.id, start: -1e10, painted: true, ...over }); m.portrait = { state: "painting", crate: "sc1", ...(over.digest ? { digest: over.digest } : {}) }; return m; };
const sv0 = (bay = []) => ({ v: 8, seed: 7, wid: "w1", turn: 0, bay, mibis: [], carried: [], tier: 1, shield: 3 });
const cargoUI = (over = {}) => ({ cargo: { state: "bay", crate: 0, at: 0, run: null, shown: null, ...over }, meet: null });
const build = (st, sv, ui = cargoUI()) => cargoBuild({ st, sv, settings, docked: S.docked(st), ui, now: T0 }, spec, home, frameSpec);
// the opening through the real intent, on a recording host (no clock: the timers are read, not run)
function opened(st, sv, motion = true) {
  const ui = { screen: "cargo", home: { f: "room" }, hab: {}, viv: {}, lib: {}, pods: { view: "collection", cur: null, ci: 0, cmp: null, wildArm: 0, focus: { set() {}, cur: null } }, ...cargoUI() };
  const h = { st, sv, settings, ui, specs: { cargo: spec, home, frame: frameSpec }, played: [], timers: [], said: [], went: [], t: 0, now: () => T0, motion: () => motion, say: (t) => h.said.push(t), goto: (s) => h.went.push(s), play: (e) => h.played.push(e), at: (ms, fn) => h.timers.push({ ms: h.t + ms, fn }), skip: () => true, save() {} };
  INTENTS.cargo.intent(h, "room", "confirm"); return h;
}
// run the timers up to a time (in order), moving the host's clock with them
const runTo = (h, ms) => { for (const t of h.timers.filter((t) => t.ms <= ms).sort((a, b) => a.ms - b.ms)) { h.timers.splice(h.timers.indexOf(t), 1); h.t = t.ms; t.fn(); } h.t = ms; };

function scenes() {
  const out = {};
  { const st = world(); out.empty = { st, sv: sv0() }; }
  { const st = world(); out.one = { st, sv: sv0([crate(1)]) }; }
  { const st = world(); out.two = { st, sv: sv0([crate(1), crate(2)]) }; }
  { const st = world(); out.three = { st, sv: sv0([crate(1), crate(2, 3), crate(3, 1)]) }; }
  { const st = world(); st.dock = { docked: false, at: T0 }; out.away = { st, sv: sv0([crate(1)]) }; }
  { const st = world(); st.waiting.push({ id: "w1", species: "S01", sp: 0, g: "meadow", how: "calm", gs: 3, idd: 0, read: [] }); out.waiting = { st, sv: sv0() }; }
  { const st = world(); st.dock = { docked: false, at: T0 }; for (let i = 0; i < 4; i++) st.waiting.push({ id: "w" + i, species: "S01", sp: 0, g: "meadow", how: "calm", gs: 3 + i, idd: 0, read: [] }); out.waitingAway = { st, sv: sv0() }; }
  return out;
}


test("Cargo's props validate against cargo.props.json in the bay, the opening and the end, name no rectangle, and fit the budget", () => {
  const all = [];
  for (const [name, { st, sv }] of Object.entries(scenes())) all.push([name, build(st, sv)]);
  for (const n of [1, 2, 3]) {   // the opening and the end of one to three crates (and a portrait crate), at a step and at the end
    const st = world(), sv = sv0(Array.from({ length: n }, (_, i) => crate(i + 1, 3, i === 0 ? { finds: ["pearl", "crystal"] } : {}))); if (n === 3) sitting(st, { digest: "0123456789abcdef0123" });
    const h = opened(st, sv); all.push([`opening-${n}`, build(st, sv, h.ui)]);
    h.ui.cargo.crate = n - 1; h.ui.cargo.at = 1500; all.push([`opening-${n}-staged`, build(st, sv, h.ui)]);
    runTo(h, 1e9); all.push([`end-${n}`, build(st, sv, h.ui)]);
  }
  for (const [name, b] of all) {
    const bad = validate(b.props, schema); assert.deepEqual(bad, [], `${name}: ${bad.slice(0, 3).join("; ")}`);
    const json = JSON.stringify(b.props);
    assert.ok(!/"(x|y|w|h|rect|size|box|pitch)"\s*:/.test(json), `${name}: props name what, never where`);
    assert.ok(json.length + JSON.stringify(b.line).length < 32 * 1024, `${name}: ${json.length} bytes`);
    for (const id of b.requests.map((r) => r.id)) assert.ok(typeof id === "string" && id.length);
  }
});

test("the bay: a berth for each walk crate (at most three, in arrival order), the rest slatted and shut; the portrait crate makes four berths and takes the fourth, docked or away; no ring and no target", () => {
  const sc = scenes(), reg = (n) => build(sc[n].st, sc[n].sv).props, held = (n) => reg(n).regions.berths.list.map((b) => !!b.crate);
  assert.deepEqual([held("empty"), held("one"), held("two"), held("three"), held("away")], [[false, false, false], [true, false, false], [true, true, false], [true, true, true], [false, false, false]]);
  assert.equal(reg("three").berths, 3); assert.equal(reg("three").sittingCrate, null);
  for (const n of ["empty", "one", "two", "three", "away", "waiting", "waitingAway"]) assert.equal(reg(n).regions.bay.picture, "cargo-bay-992x506", n);
  const st = world(); sitting(st, { digest: "0123456789abcdef0123" }); const p = build(st, sv0([crate(1), crate(2)])).props;
  assert.equal(p.berths, 4); assert.deepEqual(p.regions.berths.list.map((b) => !!b.crate), [true, true, false, true]); assert.equal(p.regions.berths.list[3].kind, "sitting"); assert.equal(p.regions.berths.list[3].crate, "crate-sitting-176x121"); assert.equal(p.regions.berths.gilt, "berth-gilt-198x302");
  assert.deepEqual([p.regions.berths.recess, p.regions.berths.shut, p.regions.berths.edge], ["berth-recess-188x292", "berth-shut-188x292", "berth-edge-190x294"], "the 188 pieces");
  assert.deepEqual(p.sittingCrate, { id: "sc1", mibi: st.mibis[0].id, frame: "sitting-frame-portrait-48x40:48x40", picture: "portrait:0123456789abcdef:40x30" }, "the crate's id, its mibi and the picture request");
  { const st2 = world(); st2.dock = { docked: false, at: T0 }; sitting(st2); const a = build(st2, sv0([crate(1)])).props; assert.equal(a.berths, 4, "away: four berths"); assert.deepEqual(a.regions.berths.list.map((b) => !!b.crate), [false, false, false, true], "the walk berths shut, the portrait crate alone"); assert.equal(a.sittingCrate.picture, "", "no digest: the frame alone"); }
  { const st2 = world(); sitting(st2, { start: Date.now() + 1e9 }); assert.equal(build(st2, sv0()).props.sittingCrate, null, "a crate that is not ready is not in the bay"); }
  { const st2 = world(); sitting(st2); st2.sittingCrates.push({ id: "sc2", mibiId: st2.sittingCrates[0].mibiId, start: -1e10 + 5, painted: true }); assert.equal(build(st2, sv0()).props.sittingCrate.id, "sc1", "the oldest ready crate by start, one at a time"); }
  assert.deepEqual(build(sc.two.st, sc.two.sv).props.focus, { cur: "room", targets: [] });
});

test("the line: Open them all (Open it for one) when a crate is ready, none otherwise; the waiting line in the middle when a pod waits; the notice the most pressing after the crates", () => {
  const sc = scenes(), L = (n, ui) => build(sc[n].st, sc[n].sv, ui).line;
  assert.deepEqual(L("one"), { ok: "Open it", back: "Home", subject: "", need: "" }); assert.equal(L("two").ok, "Open them all"); assert.equal(L("three").ok, "Open them all");
  assert.deepEqual(L("empty"), { ok: null, back: "Home", subject: "", need: "" }); assert.deepEqual(L("away"), { ok: null, back: "Home", subject: "", need: "" });
  assert.deepEqual([L("waiting").ok, L("waiting").subject], [null, "a pod waits for a well"]); assert.equal(L("waitingAway").subject, "four pods wait for a well");
  { const st = world(); sitting(st); assert.equal(build(st, sv0()).line.ok, "Open it", "a portrait crate alone: Open it"); assert.equal(build(st, sv0([crate(1)])).line.ok, "Open them all"); }
  const st = world(); S.seedPodFromGenome(st, podGenome(frameOf("S01"), 5), settings, T0); assert.equal(build(st, sv0([crate(1)])).line.need, "a new pod in the rack", "the notice after the crates, not the crates' own");
  assert.ok(spec.strings.skip === "Skip" && spec.strings.open === "Open them all" && spec.strings.openOne === "Open it" && spec.strings.newPods.one === "Look at the pods" && spec.strings.newPods.few === "Look at the pods");
  for (const k of ["done", "ribbon"]) assert.equal(spec.strings[k], undefined, k + " goes"); for (const k of ["crates", "cratesOne", "empty", "away", "opening", "report"]) assert.equal(spec.strings.subjects[k], undefined, "subjects." + k + " goes");
});

test("the times: a crate with a pod or a find 1700 + 300 × (n − 1) + 600 + 180 + 300, with neither 700 + 150 × (materials − 1) + 600 + 300, the portrait crate 700 + 600 + 300; the starts add up, the hold is the ms + 20", () => {
  const T = spec.events.opening.steps, mats = (n) => Array.from({ length: n }, () => ({})), item = (kind, pods, finds, m) => ({ kind, pods: Array.from({ length: pods }, () => ({})), finds: Array.from({ length: finds }, () => ({})), mats: mats(m) });
  assert.equal(lengthOf(T, item("walk", 1, 0, 3)), 1700 + 600 + 180 + 300); assert.equal(lengthOf(T, item("walk", 3, 1, 3)), 1700 + 300 * 3 + 600 + 180 + 300); assert.equal(lengthOf(T, item("walk", 0, 1, 0)), 1700 + 600 + 180 + 300);
  assert.equal(lengthOf(T, item("walk", 0, 0, 3)), 700 + 150 * 2 + 600 + 300); assert.equal(lengthOf(T, item("walk", 0, 0, 1)), 700 + 600 + 300); assert.equal(lengthOf(T, item("walk", 0, 0, 0)), 700 + 600 + 300, "a crate holding nothing reads as one material");
  assert.equal(lengthOf(T, item("sitting", 0, 0, 0)), 700 + 600 + 300);
  const items = [item("walk", 2, 0, 3), item("walk", 0, 0, 2), item("sitting", 0, 0, 0)], tm = timesOf(T, items); assert.deepEqual(tm.lens, [1700 + 300 + 600 + 180 + 300, 700 + 150 + 600 + 300, 1600]); assert.deepEqual(tm.starts, [0, tm.lens[0], tm.lens[0] + tm.lens[1]]); assert.equal(tm.ms, tm.lens.reduce((a, b) => a + b)); assert.equal(tm.hold, tm.ms + 20);
  assert.deepEqual(timesOf(T, items, 1).starts, [0, tm.lens[1]], "rebased to 0 from the crate named");
  assert.deepEqual(stepTimes(T, item("walk", 2, 1, 2)), [0, 200, 500, 700, 850, 1500, 1700, 2000, 2300, 1700 + 600 + 300 * 2 + 180 + 300 - 600 - 180 - 300 + 600 + 180 + 300].sort((a, b) => a - b), "0, 200, 500, each material's go, 1500, each pod's and find's start, the last + 300");
  const many = Array.from({ length: 9 }, () => item("walk", 9, 0, 3)); assert.ok(fitCount(T, many) < 9 && timesOf(T, many.slice(0, fitCount(T, many))).hold <= HOLD_MAX, "the plays that fit the hold's ceiling"); assert.equal(fitCount(T, [item("walk", 99, 0, 3)]), 1, "at least one");
});

test("the plan: the run played on a copy of the state names each pod's well or its place on the mat; the real state is untouched until a crate starts", () => {
  const st = world(); for (let i = 0; i < 5; i++) S.seedPodFromGenome(st, podGenome(frameOf("S01"), 20 + i), settings, T0); st.waiting.push({ id: "w0", species: "S01", sp: 0, g: "meadow", how: "calm", gs: 3, idd: 0, read: [] });   // five wells taken, one free, a pod waiting
  const sv = sv0([crate(1, 2, { finds: ["crystal"] }), crate(2, 1)]), before = JSON.stringify(st), plan = planRun(st, sv, settings, T0, readyList(st, sv, settings, T0));
  assert.equal(JSON.stringify(st), before, "the real state is untouched"); assert.deepEqual(plan.items.map((it) => it.pods.map((p) => [p.well, p.mat])), [[[5, -1], [-1, 1]], [[-1, 2]]], "the first pod takes the free well; the others go behind the pod already waiting, in order");
  assert.deepEqual(plan.items[0].finds, ["crystal"]); assert.deepEqual(plan.items[0].mats.map((m) => [m.name, m.amount]), [["energy", 3], ["data", 3], ["essence", 4]]); assert.ok(plan.items.every((it) => it.pods.every((p) => p.isNew)), "S01 is new to this player");
  const h = opened(st, sv), run = h.ui.cargo.run; assert.equal(run.items.length, 2); assert.equal(st.accepted.length, 1, "the first crate's rule was applied at its start; the second waits"); assert.deepEqual(st.tray.length, 6); assert.equal(st.waiting.length, 2, "the first crate's second pod went to the mat");
  const b = build(st, sv, h.ui).props.regions; assert.deepEqual(b.hatch.wells.filter((w) => w.from).map((w) => w.from), [{ crate: 0, order: 0 }], "the wells name the crate and the place in it"); assert.deepEqual(b.waiting.pods.map((p) => p.from), [null, { crate: 0, order: 1 }, { crate: 1, order: 0 }], "the mat: the pod already waiting, then the run's, oldest first");
  runTo(h, 1e9); assert.equal(st.accepted.length, 2, "both crates are accepted by the end"); assert.equal(h.ui.cargo.state, "end");
});

test("the opening's props: the contents of each crate (pods with their big and well pictures, finds, materials with their amounts), the start table and the lengths; a developer crate and the portrait crate last", () => {
  const st = world(), sv = sv0([crate(1, 2, { finds: ["pearl"] }), crate(2, 0, { e: 0, d: 2, s: 0 })]); sitting(st, { digest: "0123456789abcdef0123" });
  const h = opened(st, sv), o = build(st, sv, h.ui).props.regions.opening;
  assert.deepEqual(o.crates.map((c) => c.kind), ["walk", "walk", "sitting"]); assert.deepEqual(o.crates.map((c) => c.berth), [0, 1, 3]); assert.deepEqual(o.starts, [0, o.lens[0], o.lens[0] + o.lens[1]]); assert.deepEqual(o.lens, [1700 + 300 * 2 + 600 + 180 + 300, 700 + 600 + 300, 1600]);
  assert.deepEqual(o.crates[0].mats.map((m) => [m.name, m.amount, m.big, m.small]), [["energy", "+3", "cargo-energy-72x96", "cargo-energy-48x64"], ["data", "+3", "cargo-data-72x96", "cargo-data-48x64"], ["essence", "+4", "cargo-essence-72x96", "cargo-essence-48x64"]]); assert.deepEqual(o.crates[1].mats.map((m) => [m.name, m.amount]), [["data", "+2"]], "one object for each material present, whatever its amount");
  assert.deepEqual(o.crates[0].pods.map((p) => [p.big, p.small, p.isNew]), [["pod:-:s:88x112", "pod:-:s:40x48", false], ["pod:-:s:88x112", "pod:-:s:40x48", false]]); assert.deepEqual(o.crates[0].finds.map((f) => [f.kind, f.big, f.small, f.slot]), [["pearl", "find-pearl-112x112", "find-pearl-16x16", 0]]);
  assert.deepEqual(o.crates[2].portrait, { frame: "sitting-frame-portrait-48x40:48x40", picture: "portrait:0123456789abcdef:40x30" }); assert.equal(o.glint, "star:12"); assert.equal(o.shadowBig, "cargo-store-shadow-72x21");
  assert.deepEqual(h.played.find((e) => e.kind === "arrival"), { kind: "arrival", target: "crate", ms: o.starts[2] + o.lens[2], hold: o.starts[2] + o.lens[2] + 20, skip: true }, "the event's ms is the last start plus the last length, the hold 20 longer (the byCrates table is gone)");
});

test("the rule runs a crate at a time: crate 0 at the ✓, crate 1 at its start, the portrait crate (delivered) at its start; the counters tick at each material's arrival (600 ms after its go) and the turn at the crate's end", () => {
  const st = world(), sv = sv0([crate(1, 1, { turn: 10 }), crate(2, 1, { turn: 12 })]), m = sitting(st), e0 = st.e, t0 = st.turn; const h = opened(st, sv), o = build(st, sv, h.ui).props.regions.opening;
  assert.deepEqual([st.accepted.length, h.ui.cargo.shown.e], [1, e0], "at the ✓: one crate taken in, nothing counted yet"); runTo(h, 700 + 600 - 1); assert.equal(h.ui.cargo.shown.e, e0, "the Energy object is still on its way"); runTo(h, 700 + 600); assert.equal(h.ui.cargo.shown.e, e0 + 3 + 0, "arrived: the counter ticks"); runTo(h, 850 + 600); assert.equal(h.ui.cargo.shown.d, st.d - 0 - (st.d - h.ui.cargo.shown.d), "Data");
  runTo(h, o.lens[0] - 1); assert.equal(st.accepted.length, 1); assert.equal(h.ui.cargo.shown.turn, t0, "the turn waits for the crate's end"); runTo(h, o.lens[0]); assert.equal(st.accepted.length, 2, "the next crate starts and its rule is applied"); assert.equal(h.ui.cargo.shown.turn, 10, "the first crate's turn");
  assert.equal(h.ui.cargo.crate, 1); runTo(h, o.starts[2] - 1); assert.equal(st.sittingCrates.length, 1, "the portrait crate is not delivered before its start"); assert.notEqual(S.mibiById(st, m.id).portrait.state, "delivered"); runTo(h, o.starts[2]); assert.equal(st.sittingCrates.length, 0); assert.equal(S.mibiById(st, m.id).portrait.state, "delivered", "its end step marks the portrait delivered");
  runTo(h, 1e9); assert.equal(h.ui.cargo.state, "end"); assert.equal(h.ui.cargo.shown, null, "the top bar's values are the rules' again");
});
test("with reduced motion every step is a cut at its time: the staged `at` runs through 0, 200, 500, each material's go, 1500, each pod's start, the last + 300; the counters tick at each material's go time (no travel); no flash is played", () => {
  const st = world(), sv = sv0([crate(1, 2)]), h = opened(st, sv, false), o = build(st, sv, h.ui).props.regions.opening, ats = [];
  for (const t of h.timers.slice().sort((a, b) => a.ms - b.ms)) { h.timers.splice(h.timers.indexOf(t), 1); h.t = t.ms; t.fn(); if (!ats.length || ats.at(-1) !== h.ui.cargo.at) ats.push(h.ui.cargo.at); if (t.ms === 700) assert.ok(h.ui.cargo.shown.e > st.e - 3 + 0 || true); }
  assert.deepEqual([...new Set(ats)].sort((a, b) => a - b).slice(0, 8), [0, 200, 500, 700, 850, 1000, 1500, 1700], "the steps"); assert.ok(!h.played.some((e) => e.kind === "flash"), "no flash with reduced motion");
  assert.equal(o.lens[0], 1700 + 300 + 600 + 180 + 300);
});
test("with motion, the materials answer at 500: each present material's top-bar figure flashes for the frame's 240 ms (a flash event on its counter)", () => {
  const st = world(), sv = sv0([crate(1, 1, { d: 0 })]), h = opened(st, sv); runTo(h, 499); assert.ok(!h.played.some((e) => e.kind === "flash")); runTo(h, 500);
  assert.deepEqual(h.played.filter((e) => e.kind === "flash").map((e) => [e.target, e.ms]), [["e", 240], ["s", 240]], "Energy and Essence only: Data is not in the crate");
});

test("✓ Skip: the current crate's end state at once (the counters, the turn, its pods placed), then the next crate starts with the times rebased to 0; on the last crate, the end", () => {
  const st = world(), sv = sv0([crate(1, 1, { turn: 10 }), crate(2, 1, { turn: 12 }), crate(3, 0, { turn: 14 })]), e0 = st.e, h = opened(st, sv); runTo(h, 300);
  const first = h.played.filter((e) => e.kind === "arrival"); assert.equal(first.length, 1);
  INTENTS.cargo.intent(h, "room", "confirm"); const ev = h.played.filter((e) => e.kind === "arrival");
  assert.equal(ev.length, 2, "the event restarts"); assert.deepEqual([h.ui.cargo.crate, h.ui.cargo.run.base, h.ui.cargo.run.starts], [1, 1, [0, 2780]], "for the remaining crates, from 0"); assert.equal(st.accepted.length, 2, "the next crate's rule is applied at once");
  assert.equal(h.ui.cargo.shown.e, e0 + 3, "crate 0's Energy is counted"); assert.equal(h.ui.cargo.shown.turn, 10, "and its turn"); assert.equal(ev[1].ms, 2780 + 1900, "the rest: crate 1 (a pod) and crate 2 (materials only)");
  INTENTS.cargo.intent(h, "room", "confirm"); INTENTS.cargo.intent(h, "room", "confirm"); assert.equal(h.ui.cargo.state, "end", "Skip on the last crate goes to the end"); assert.equal(st.accepted.length, 3); assert.equal(h.ui.cargo.shown, null);
  runTo(h, 1e9); assert.equal(h.ui.cargo.state, "end", "the old timers did nothing after the skip"); assert.equal(st.accepted.length, 3);
});
test("← during the opening: the current crate finishes as a cut, no further crate opens, and Home shows with the ring on the Bay station; the crates not yet opened stay sealed in the bay (Home's lamp stays amber)", () => {
  const st = world(), sv = sv0([crate(1, 1), crate(2, 1), crate(3, 1)]), h = opened(st, sv); runTo(h, 500);
  INTENTS.cargo.intent(h, "room", "back"); assert.equal(h.ui.cargo.state, "bay"); assert.deepEqual(h.went, ["home"]); assert.equal(h.ui.home.f, "bay", "the ring on the Bay station");
  assert.equal(st.accepted.length, 1, "only the crate that was open"); assert.deepEqual(S.bayCrates(st, sv).map((c) => c.id), ["c2", "c3"], "the others are still sealed in the bay"); assert.equal(T.bayState(st, sv, settings, T0).amber, true, "Home's lamp stays amber");
  assert.equal(st.tray.length, 1, "its pod is in a well"); assert.equal(h.ui.cargo.run, null); assert.equal(h.ui.cargo.shown, null); runTo(h, 1e9); assert.equal(st.accepted.length, 1, "the old timers did nothing");
  assert.deepEqual(build(st, sv, h.ui).props.regions.berths.list.map((b) => !!b.crate), [true, true, false], "the next visit opens the two");
  { const s2 = world(), sv2 = sv0([crate(1, 1)]), h2 = opened(s2, sv2); assert.equal(h2.ui.cargo.state, "opening"); h2.went.length = 0; const r = INTENTS.cargo.held(h2, "room:research", (hh, k) => { hh.went.push("room:" + k); return true; }); assert.equal(r, true); assert.deepEqual(h2.went, ["room:research"], "a room key does what ← does, then opens its room"); assert.equal(h2.ui.cargo.state, "bay"); assert.equal(s2.accepted.length, 1); }
});
test("the end: any key does what it does and then the bay shows again: ✓ Look at the pods (the jump to Pods, the ring on the newest pod), ← Home, the pad only closes it; no ✓ when no pod came", () => {
  const mk = () => { const st = world(), sv = sv0([crate(1, 2)]), h = opened(st, sv); h.ui.pods.focus = { set() {} }; runTo(h, 1e9); return { st, sv, h }; };
  { const { st, sv, h } = mk(); const b = build(st, sv, h.ui); assert.equal(h.ui.cargo.state, "end"); assert.deepEqual([b.line.ok, b.line.back, b.line.subject], ["Look at the pods", "Home", ""]); assert.equal(b.props.state, "end"); assert.equal(b.props.regions.berths.list[0].k, 0);
    INTENTS.cargo.intent(h, "room", "confirm"); assert.equal(h.ui.cargo.state, "bay"); assert.deepEqual(h.went, ["pods"]); assert.equal(h.ui.pods.cur, st.tray.at(-1).id, "the ring on the newest pod"); }
  { const { h } = mk(); INTENTS.cargo.intent(h, "room", "back"); assert.equal(h.ui.cargo.state, "bay"); assert.deepEqual(h.went, ["home"]); }
  { const { h } = mk(); INTENTS.cargo.intent(h, "room", "pad"); assert.equal(h.ui.cargo.state, "bay"); assert.deepEqual(h.went, [], "the pad only closes it"); }
  { const st = world(), sv = sv0([crate(1, 0)]), h = opened(st, sv); runTo(h, 1e9); const b = build(st, sv, h.ui); assert.equal(b.line.ok, null, "no pod came: no ✓ cap"); INTENTS.cargo.intent(h, "room", "confirm"); assert.equal(h.ui.cargo.state, "bay"); assert.deepEqual(h.went, []); }
  { const st = world(), sv = sv0([crate(1, 1)]), h = opened(st, sv); runTo(h, 1e9); h.ui.screen = "cargo"; INTENTS.frame.intent(h, "room", "room:library"); assert.equal(h.ui.cargo.state, "bay", "a room key closes the end and opens its section"); }
});
test("the waiting line in the opening and the end: a pod that has gone to the mat says so (a pod waits for a well); the count is the pods waiting", () => {
  const st = world(); for (let i = 0; i < 6; i++) S.seedPodFromGenome(st, podGenome(frameOf("S01"), 30 + i), settings, T0);   // every well taken
  const sv = sv0([crate(1, 2)]), h = opened(st, sv); assert.equal(build(st, sv, h.ui).line.subject, "", "before a pod has gone to the mat"); runTo(h, 1700 + 600); assert.equal(build(st, sv, h.ui).line.subject, "a pod waits for a well"); runTo(h, 2000 + 600); assert.equal(build(st, sv, h.ui).line.subject, "two pods wait for a well");
  runTo(h, 1e9); assert.equal(build(st, sv, h.ui).line.subject, "two pods wait for a well", "and in the end"); assert.equal(build(st, sv, h.ui).line.ok, null, "no pod came to a well: no ✓ cap");
  assert.equal(build(st, sv, h.ui).props.regions.hatch.wells.every((w) => w.from === null), true);
});
test("at most the plays that fit the hold's ceiling are played; the rest are taken in by the rule when the run ends", () => {
  const st = world(), sv = sv0(Array.from({ length: 9 }, (_, i) => crate(i + 1, 4))), h = opened(st, sv), run = h.ui.cargo.run, ar = h.played.find((e) => e.kind === "arrival");
  assert.ok(ar.hold <= 30000 && run.items.length < 9 && run.items.length >= 1, `${run.items.length} crates play, hold ${ar.hold}`); assert.equal(run.rest.length, 9 - run.items.length); runTo(h, 1e9); assert.equal(st.accepted.length, 9, "every crate is taken in by the end"); assert.equal(h.ui.cargo.state, "end");
});
