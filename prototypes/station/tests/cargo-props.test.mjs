// Cargo's props (lvgl-switch.md §2.1, §4 L2.2): the view the face takes, views/cargo-props.mjs, in Node. Plain JSON that names what and never where: it validates against cargo.props.json in every state (bay, opening,
// report), holds no rectangle, no measure and no layout rule, fits the 32 KiB props budget with the frame beside it, spells the line from cargo.json's strings (the crates, the empty bay, the shut bay, the waiting pods,
// the opening, the report), words the report's rows (the pods, the reach, what was gathered, the Probe, the world), and puts the rack in the same wells and order as Pods' collection.
//   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, podGenome, speciesIndex } from "../src/genome.mjs";
import { traitLooks } from "../../workbench/framework/describe.mjs";
import * as S from "../src/state.mjs";
import { cargoBuild, reachStep, ribbonOf } from "../src/views/cargo-props.mjs";
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
const sv0 = (bay = []) => ({ v: 8, seed: 7, wid: "w1", turn: 0, bay, mibis: [], carried: [], tier: 1, shield: 3 });
const cargoUI = (over = {}) => ({ cargo: { state: "bay", crate: 0, at: 0, mend: null, run: null, shown: null, ...over }, meet: null });
const build = (st, sv, ui = cargoUI()) => cargoBuild({ st, sv, settings, docked: S.docked(st), ui }, spec, home, frameSpec);
// the opening through the real intent, on a recording host (no clock: the timers are read, not run)
function opened(st, sv, motion = true) {
  const ui = { screen: "cargo", home: { f: "room" }, pods: { view: "collection", cur: null, ci: 0, cmp: null, wildArm: 0, focus: { set() {}, cur: null } }, ...cargoUI() };
  const h = { st, sv, settings, ui, specs: { cargo: spec, home, frame: frameSpec }, played: [], timers: [], said: [], t: T0, now: () => h.t, motion: () => motion, say: (t) => h.said.push(t), goto: () => {}, play: (e) => h.played.push(e), at: (ms, fn) => h.timers.push({ ms, fn }), save() {} };
  INTENTS.cargo.intent(h, "room", "confirm"); return h;
}

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

test("Cargo's props validate against cargo.props.json in the bay, the opening and the report, name no rectangle, and fit the budget", () => {
  const all = [];
  for (const [name, { st, sv }] of Object.entries(scenes())) all.push([name, build(st, sv)]);
  for (const n of [1, 2, 3]) {   // the opening and the report of one to three crates, at a step and at the end
    const st = world(), sv = sv0(Array.from({ length: n }, (_, i) => crate(i + 1, 3)));
    const h = opened(st, sv); all.push([`opening-${n}`, build(st, sv, h.ui)]);
    h.ui.cargo.crate = n - 1; h.ui.cargo.at = 1500; all.push([`opening-${n}-staged`, build(st, sv, h.ui)]);
    h.timers.sort((a, b) => a.ms - b.ms).forEach((t) => t.fn()); all.push([`report-${n}`, build(st, sv, h.ui)]);
  }
  for (const [name, b] of all) {
    const bad = validate(b.props, schema); assert.deepEqual(bad, [], `${name}: ${bad.slice(0, 3).join("; ")}`);
    const json = JSON.stringify(b.props);
    assert.ok(!/"(x|y|w|h|rect|size|box|pitch)"\s*:/.test(json), `${name}: props name what, never where`);
    assert.ok(json.length + JSON.stringify(b.line).length < 8 * 1024, `${name}: ${json.length} bytes`);
    for (const id of b.requests.map((r) => r.id)) assert.ok(typeof id === "string" && id.length);
  }
});

test("the bay: one sealed crate a walk crate (at most three) on the painted bay, the door shut when it holds nothing (docked or away), the waiting pods on the floor (at most three, docked or away), no ring and no target", () => {
  const sc = scenes(), reg = (n) => build(sc[n].st, sc[n].sv).props.regions;
  assert.equal(reg("two").crates.places.length, 2); assert.equal(reg("three").crates.places.length, 3); assert.equal(reg("empty").crates.places.length, 0);
  for (const n of ["empty", "one", "two", "three", "away", "waiting", "waitingAway"]) assert.equal(reg(n).bay.open, "cargo-bay-992x320", n + ": the painted bay in every state");
  assert.deepEqual([reg("two").bay.state, reg("two").bay.door], ["open", ""]); assert.equal(reg("two").waitingPods, undefined);
  for (const n of ["empty", "away"]) { assert.equal(reg(n).bay.state, "shut", n + ": nothing held: the door"); assert.equal(reg(n).bay.door, "cargo-bay-shut-976x304"); }
  assert.equal(reg("away").crates.places.length, 0, "away: no walk crates");
  for (const n of ["waiting", "waitingAway"]) { assert.equal(reg(n).bay.state, "open", n + ": a waiting pod holds the bay open"); assert.equal(reg(n).bay.door, ""); }
  assert.equal(reg("waiting").waitingPods.pods.length, 1); assert.equal(reg("waitingAway").waitingPods.pods.length, 3, "at most three stand on the floor"); assert.equal(reg("waiting").waitingPods.shadow, "pod-collection-shadow");
  assert.equal(reg("two").crates.shadow, "crate-shadow-256x24"); assert.equal(reg("two").rack.insert, "cargo-rack-992x168"); assert.equal(reg("two").waiting, undefined, "the mark left Cargo");
  const b = build(sc.two.st, sc.two.sv); assert.deepEqual(b.props.focus, { cur: "room", targets: [] });
});

test("the line: the action, the subject and the way back of each state (cargo.json line), the notice the most pressing after the crates", () => {
  const sc = scenes(), L = (n, ui) => build(sc[n].st, sc[n].sv, ui).line;
  assert.deepEqual(L("one"), { ok: "Open the bay", back: "Home", subject: "a sealed crate", need: "" });
  assert.equal(L("two").subject, "two sealed crates"); assert.equal(L("three").subject, "three sealed crates");
  assert.deepEqual(L("empty"), { ok: null, back: "Home", subject: "the bay is empty", need: "" });
  assert.deepEqual(L("away"), { ok: null, back: "Home", subject: "the bay is shut", need: "" });
  assert.deepEqual([L("waiting").ok, L("waiting").subject], [null, "a pod waits for a well"]);
  assert.equal(L("waitingAway").subject, "four pods wait for a well", "the waiting line before the away line: the open bay shows them (order: crates, waiting, away, empty)");
  assert.equal(L("three", cargoUI({ drawn: 2 })).subject, "two sealed crates", "while crates slide in the line counts the crates drawn"); assert.equal(L("three", cargoUI({ drawn: 1 })).subject, "a sealed crate"); assert.equal(L("three", cargoUI({ drawn: null })).subject, "three sealed crates");
  const st = world(); S.seedPodFromGenome(st, podGenome(frameOf("S01"), 5), settings, T0); assert.equal(build(st, sv0([crate(1)])).line.need, "a new pod in the rack", "the notice after the crates, not the crates' own");
  assert.equal(build(st, sv0([crate(1)])).line.need.includes("crate"), false);
});

test("the rack is the six wells of Pods' collection in rack order, each its pod (the unknown shell for a pod not identified) or empty", () => {
  const st = world(); for (const gs of [5, 6]) S.seedPodFromGenome(st, podGenome(frameOf("S01"), gs), settings, T0); S.skipIdentify(st, st.tray[0]); st.knownIds = ["S01"];
  const w = build(st, sv0()).props.regions.rack.wells; assert.equal(w.length, 6);
  assert.deepEqual(w.map((x) => !!x.pod), [true, true, false, false, false, false]); assert.match(w[0].pod, /^pod:S01:i:88x112$/); assert.match(w[1].pod, /^pod:-:s:88x112$/);
  assert.ok(w.every((x) => x.well === undefined && x.from === null), "an empty bay: nothing travelling; the wells are the insert's painting"); assert.equal(build(st, sv0()).props.regions.rack.insert, "cargo-rack-992x168");
});

test("the opening: one entry a crate in the order they open, its ribbon, its pods and the well each goes to; a pod with no free well waits and has no well", () => {
  const st = world(); for (let i = 0; i < 5; i++) S.seedPodFromGenome(st, podGenome(frameOf("S01"), 20 + i), settings, T0);   // five wells taken: one free
  const sv = sv0([crate(1, 2), crate(2, 1, { dev: true })]), h = opened(st, sv), o = build(st, sv, h.ui).props.regions.opening;
  assert.deepEqual(o.crates.map((c) => c.ribbon), ["First crate home", "Another crate home"]);
  assert.deepEqual(o.crates[0].pods.map((p) => p.well), [5, -1], "the first pod found the free well, the second waits"); assert.deepEqual(o.crates[1].pods.map((p) => p.well), [-1]);
  const r = build(st, sv, h.ui).props.regions.rack.wells; assert.deepEqual(r.filter((w) => w.from).map((w) => w.from), [{ crate: 0, order: 0 }], "the one pod that landed names its crate and its place in it");
  assert.equal(build(st, sv, h.ui).line.subject, "the bay is opening"); assert.equal(build(st, sv, h.ui).line.ok, null); assert.equal(build(st, sv, h.ui).line.back, null);
});

// the report through the real opening: the dock's mend is in Cargo's UI state when ✓ Open the bay is pressed (intents/frame.mjs dock sets it), every timer runs, the report shows
function reported(st, sv, mend = null) {
  const ui = { screen: "cargo", home: { f: "room" }, ...cargoUI({ mend }) }, h = { st, sv, settings, ui, specs: { cargo: spec, home, frame: frameSpec }, timers: [], say() {}, goto() {}, play() {}, at(ms, fn) { this.timers.push({ ms, fn }); }, now: () => T0, motion: () => true, save() {} };
  INTENTS.cargo.intent(h, "room", "confirm"); h.timers.sort((a, b) => a.ms - b.ms).forEach((t) => t.fn()); return build(st, sv, ui);
}
test("the report: a tile a crate with its pods and its reach step, what was gathered, the Probe's plates and price from the dock's mend; figures and counts only", () => {
  const st = world(), sv = sv0([crate(1, 3, { explored: 4, of: 20 }), crate(2, 0, { explored: 20, of: 20 }), crate(3, 12, { of: 0 })]);
  const b = reported(st, sv, { free: 1, paid: 2, broke: false, spent: 2 }), r = b.props.regions.report;
  assert.deepEqual(r.crates.map((c) => [c.pods, c.more, c.reach]), [[3, "", 1], [0, "", 4], [7, "+5", 0]], "pods, the +n past 8 (7 icons and the rest), the reach step (0: no map)");
  assert.deepEqual([r.gathered.e, r.gathered.d, r.gathered.s], ["+9", "+9", "+12"]); assert.deepEqual(Object.keys(r.gathered), ["e", "d", "s"], "no lead");
  assert.deepEqual(r.probe, { plates: 3, spent: "2" }); assert.equal(r.heading, undefined); assert.equal(r.label, undefined); assert.equal(r.world, undefined, "the world lines left the card");
  assert.equal(r.crate, "cargo-crate-64x64"); assert.equal(r.map, "icon-map-14x12");
  assert.match(r.plate, /^cargo-report-plate-560x(136|176|208)$/);
  assert.ok(["See the new pods", "See the new pod", "Done"].includes(b.line.ok)); assert.equal(b.line.back, "Cargo"); assert.equal(b.line.subject, "what came home");
  assert.deepEqual(b.props.regions.crates, undefined, "the bay is emptied under the card"); assert.equal(b.props.regions.bay.state, "shut", "the report always hangs on the shut door"); assert.equal(b.props.regions.bay.door, "cargo-bay-shut-report-976x304", "GB-R6: the report door is the one with the plain sage panel"); assert.equal(b.props.regions.waitingPods, undefined);
  assert.equal(reported(world(), sv0([crate(1, 1)]), { free: 0, paid: 0, broke: false, spent: 0 }).props.regions.report.probe, null, "no mend, nothing at x 320");
  assert.deepEqual(reported(world(), sv0([crate(1, 1)]), { free: 2, paid: 0, broke: true, spent: 0 }).props.regions.report.probe, { plates: 2, spent: "" }, "mended free: the plates alone");
  assert.equal(reported(world(), sv0([crate(1, 1)])).props.regions.report.probe, null, "after a reload the report has no Probe");
  const bad = crate(1, 2); bad.pods[1] = { id: "p9", sp: -1, g: "cave", how: "ground", gs: 7, k: "3" };
  assert.deepEqual(reported(world(), sv0([bad])).props.regions.report.crates.map((c) => c.pods), [1], "the tile counts the pods that landed, not the crate's raw contents");
  assert.deepEqual(reported(world(), sv0([crate(1, 8)])).props.regions.report.crates.map((c) => [c.pods, c.more]), [[8, ""]], "8 pods: eight icons, no +n"); assert.deepEqual(reported(world(), sv0([crate(1, 9)])).props.regions.report.crates.map((c) => [c.pods, c.more]), [[7, "+2"]], "9 pods: 7 icons and +2");
  const one = reported(world(), sv0([crate(1, 1)])); assert.equal(one.line.ok, "See the new pod"); assert.equal(reported(world(), sv0([crate(1, 0)])).line.ok, "Done", "no new pod: Done closes the card");
  const loose = { ...settings, economy: "loose" }; const st3 = world(), h3 = { st: st3, sv: sv0([crate(1, 1)]), settings: loose, ui: { screen: "cargo", home: {}, ...cargoUI() }, specs: { cargo: spec, home, frame: frameSpec }, timers: [], say() {}, goto() {}, play() {}, at(ms, fn) { this.timers.push({ ms, fn }); }, now: () => T0, motion: () => true, save() {} };
  INTENTS.cargo.intent(h3, "room", "confirm"); h3.timers.forEach((t) => t.fn()); assert.equal(cargoBuild({ st: st3, sv: h3.sv, settings: loose, docked: true, ui: h3.ui }, spec, home, frameSpec).props.regions.report.gathered.top, undefined, "no top-up figure: Gathered ends after Essence");
});

test("the reach step 0 to 4: under a third 1, under two thirds 2, under all 3, all 4; no map 0; the ribbon is the developer's, else first, second, third", () => {
  const c = (explored, of) => ({ explored, of });
  assert.deepEqual([c(0, 20), c(6, 20), c(7, 20), c(13, 20), c(14, 20), c(19, 20), c(20, 20), c(5, 0)].map(reachStep), [1, 1, 2, 2, 3, 3, 4, 0]);
  assert.deepEqual([0, 1, 2].map((k) => ribbonOf(spec, {}, k)), ["First crate home", "Second crate home", "Third crate home"]); assert.equal(ribbonOf(spec, { dev: true }, 1), "Another crate home"); assert.equal(spec.strings.ribbon.dev, undefined, "no developer ribbon words");
});
test("the event plays at most nine crates (hold ≤ 30000): the rest are taken in by the rule, the counters and the turn reach their final values at the end, the report has three tiles and adds up every crate", () => {
  const st = world(), sv = sv0(Array.from({ length: 11 }, (_, i) => crate(i + 1, 1, {}))), e0 = st.e;
  const h = opened(st, sv), ar = h.played.find((e) => e.kind === "arrival"); assert.deepEqual(ar, { kind: "arrival", target: "crate", ms: 9 * 3000 + 180, hold: 9 * 3000 + 200, skip: true }); assert.ok(ar.hold <= 30000);
  assert.equal(build(st, sv, h.ui).props.regions.opening.crates.length, 9, "nine crates are staged");
  const ordered = h.timers.slice().sort((a, b) => a.ms - b.ms); assert.equal(ordered.at(-1).ms, 9 * 3000, "the report at the ninth crate's end");
  for (const t of ordered.slice(0, -1)) t.fn(); assert.equal(h.ui.cargo.shown.e, e0 + 9 * 3, "nine crates' energy is shown, not eleven");
  ordered.at(-1).fn(); assert.equal(h.ui.cargo.shown, null, "the top bar's props carry the final values from here: " + st.e);
  const r = build(st, sv, h.ui).props.regions.report; assert.equal(r.crates.length, 3); assert.equal(r.gathered.e, "+" + 11 * 3, "Gathered adds up every crate");
});
test("the report: a developer crate counts for a tile like any crate (the first three opened) and adds to Gathered", () => {
  const st = world(), sv = sv0([crate(1, 1), crate(2, 2, { dev: true }), crate(3, 3, { dev: true }), crate(4, 1)]);
  const h = opened(st, sv); h.timers.sort((a, b) => a.ms - b.ms).forEach((t) => t.fn());
  const r = build(st, sv, h.ui).props.regions.report; assert.deepEqual(r.crates.map((c) => c.pods), [1, 2, 3], "three tiles, the fourth crate none"); assert.equal(r.gathered.e, "+12", "Gathered sums every crate");
});
test("the Probe's price is the Energy the plates cost: free when the economy is free", () => {
  const st = world(), sv = sv0([crate(1, 1)]); st.probe = { shield: 0, smax: 3, tier: 1, seq: 1 };
  const free = { ...settings, economy: "free" }, ui = { screen: "cargo", home: { f: "room" }, ...cargoUI({ mend: { free: 0, paid: 2, broke: false, spent: 0 } }) };
  const h = { st, sv, settings: free, ui, specs: { cargo: spec, home, frame: frameSpec }, timers: [], say() {}, goto() {}, play() {}, at(ms, fn) { this.timers.push({ ms, fn }); }, now: () => T0, motion: () => true, save() {} };
  INTENTS.cargo.intent(h, "room", "confirm"); h.timers.forEach((t) => t.fn());
  assert.deepEqual(cargoBuild({ st, sv, settings: free, docked: true, ui }, spec, home, frameSpec).props.regions.report.probe, { plates: 2, spent: "" });
});

// ---- the goal rows (cargo.json regions.report.goal; station-x10-economy.md) ----
test("the report plate: one signed plate of 136, 176 or 208 by the goal and the read, whatever the tiles (one to three crates, with and without the Probe)", () => {
  const seen = new Set();
  for (const crates of [[crate(1, 1)], [crate(1, 1), crate(2, 2)], [crate(1, 3), crate(2, 0), crate(3, 12, { of: 0 })]]) for (const mend of [null, { free: 1, paid: 0, broke: false, spent: 0 }]) {
    const r = reported(world(), sv0(crates), mend ?? undefined).props.regions.report, m = /^cargo-report-plate-560x(\d+)$/.exec(r.plate); assert.ok(m, r.plate);
    const h = +m[1]; assert.equal(h, 136 + (r.goal ? 40 : 0) + (r.goal && r.meanwhile ? 32 : 0)); seen.add(h);
    const y = 64 + 8 * Math.floor((288 - h) / 16); assert.ok(y % 8 === 0 && y + h <= 352, `at y ${y} the plate's bottom ${y + h} is inside the door (352)`);
  }
  assert.ok(seen.size >= 1, "a height: " + [...seen]);
});
test("the report's goal row names the next step after the crates; the read only for the wait steps and only when it can be paid: its chapter, whether it glints, its price; the plate is 176 or 208", () => {
  const st = world(), [dot] = S.seedAdults(st, "S01", 5, 1, settings).mibis; dot.name = "Dot";
  const lk = { id: "kept", sp: 0, species: "S01", g: "meadow", how: "calm", gs: 9, k: null, n: 0, idd: 1, read: [], fresh: 0, genome: null }; st.tray.push(lk); st.bud = { kind: "founder", species: "S03", start: Date.now() + 1e9, minutes: 5 };
  const sv = sv0([crate(1, 3, { explored: 4, of: 20 }), crate(2, 0, { explored: 20, of: 20 }), crate(3, 12, { of: 0 })]);
  const r = reported(st, sv, { free: 1, paid: 2, broke: false, spent: 2 }).props.regions.report;
  assert.deepEqual(r.goal, { text: "wait for the bud", icons: "", plain: "" }); assert.ok(r.meanwhile, "the bud is a wait: a read to suggest"); assert.match(r.meanwhile.emblem, /^emblem:[a-z-]+:unread:24$/); assert.equal(typeof r.meanwhile.price, "string"); assert.ok(r.meanwhile.glint === "" || r.meanwhile.glint === "star:12");
  assert.equal(r.plate, "cargo-report-plate-560x208", "136 + 40 + 32");
  // no read can be paid: no meanwhile row
  const st2 = world(), [d2] = S.seedAdults(st2, "S01", 5, 1, settings).mibis; d2.name = "Dot"; st2.tray.push({ ...lk, id: "k2" }); st2.bud = st.bud; st2.readEver = true; st2.d = 0;
  const r2 = reported(st2, sv0([crate(1, 1, { d: 0 })])).props.regions.report; assert.ok(r2.goal); assert.equal(r2.meanwhile, null); assert.equal(r2.plate, "cargo-report-plate-560x176");
  // a step that is not a wait (identify): a goal row and no read
  const st3 = world(), [d3] = S.seedAdults(st3, "S01", 5, 1, settings).mibis; d3.name = "Dot"; const r3 = reported(st3, sv0([crate(1, 1)])).props.regions.report;
  assert.equal(r3.goal.text, "identify the Loika pod"); assert.equal(r3.meanwhile, null);
  // no goal: no row (two adults, the guide complete, nothing named): 136
  const st4 = world(); S.seedAdults(st4, "S01", 5, 2, settings); { const fr = frameOf("S01"); st4.readOnce.S01 = fr.chapters.map((c) => c.id); for (const ch of fr.chapters) for (const t of ch.traits) S.guideAdd(st4, "S01", t.id, traitLooks(fr, t)); } st4.probe = { tier: 2, shield: 3, smax: 3 }; assert.equal(S.goalKey(st4, sv0()), null); const r4 = reported(st4, sv0([crate(1, 0)])).props.regions.report; assert.equal(r4.goal, null); assert.equal(r4.plate, "cargo-report-plate-560x136");
});

// the haul's containers (cargo.json regions.stores): a material's container only when the crate brought it (gained > 0, the report's Gathered figure), whatever the mend spent
const openedWith = (st, sv, stg) => {
  const ui = { screen: "cargo", home: { f: "room" }, ...cargoUI() }, h = { st, sv, settings: stg, ui, specs: { cargo: spec, home, frame: frameSpec }, timers: [], say() {}, goto() {}, play() {}, at(ms, fn) { this.timers.push({ ms, fn }); }, now: () => T0, motion: () => true, save() {} };
  INTENTS.cargo.intent(h, "room", "confirm"); return h;
};
const storesOf = (st, sv, stg, k = 0) => { const h = openedWith(st, sv, stg); return { h, stores: cargoBuild({ st, sv, settings: stg, docked: true, ui: h.ui }, spec, home, frameSpec).props.regions.opening.crates[k].stores }; };
test("a crate that brought Energy and Essence shows those two containers, in the order Energy, Data, Essence, and validates", () => {
  const st = world(), sv = sv0([crate(1, 1, { e: 1, d: 0, s: 2 })]), { h, stores } = storesOf(st, sv, settings);
  assert.deepEqual(stores, ["cargo-energy-72x96", "cargo-essence-72x96"]);
  assert.deepEqual(validate(cargoBuild({ st, sv, settings, docked: true, ui: h.ui }, spec, home, frameSpec).props, schema), []);
});
test("the developer top-up (loose economy) gives all three containers, a developer crate only what it carries", () => {
  const loose = { ...settings, economy: "loose" }, st = world(), sv = sv0([crate(1, 1, { e: 0, d: 0, s: 0 }), crate(2, 1, { dev: true, e: 0, d: 2, s: 0 })]);
  assert.deepEqual(storesOf(st, sv, loose, 0).stores, ["cargo-energy-72x96", "cargo-data-72x96", "cargo-essence-72x96"]);
  assert.deepEqual(storesOf(world(), sv0([crate(1, 1, { e: 0, d: 0, s: 0 }), crate(2, 1, { dev: true, e: 0, d: 2, s: 0 })]), loose, 1).stores, ["cargo-data-72x96"]);
});
test("a mend that spends the Energy a crate brought still shows its Energy container, while the top bar's Energy is unchanged", () => {
  const st = world(); st.e = 0; st.probe = { shield: 2, smax: 3, tier: 1, seq: 1 }; st.mendFull = true; const sv = sv0([crate(1, 1, { e: 1, d: 0, s: 0 })]);
  const h = openedWith(st, sv, settings), run = h.ui.cargo.run, before = h.ui.cargo.shown.e;
  assert.equal(st.probe.shield, 3, "the rule mended one plate from the Energy the crate brought"); assert.equal(run.crates[0].gained.e, 1);
  h.timers.filter((t) => t.ms <= 800).forEach((t) => t.fn());
  assert.equal(h.ui.cargo.shown.e, before, "the top bar's Energy tick is the net of the mend: unchanged");
  assert.deepEqual(cargoBuild({ st, sv, settings, docked: true, ui: h.ui }, spec, home, frameSpec).props.regions.opening.crates[0].stores, ["cargo-energy-72x96"]);
});
