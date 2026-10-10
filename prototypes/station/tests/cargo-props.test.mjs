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
import * as S from "../src/state.mjs";
import { cargoBuild, reachWord, ribbonOf } from "../src/views/cargo-props.mjs";
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

test("the bay: one sealed crate a walk crate (at most three), the lid shut away, the waiting mark while pods wait, no ring and no target", () => {
  const sc = scenes(), reg = (n) => build(sc[n].st, sc[n].sv).props.regions;
  assert.equal(reg("two").crates.places.length, 2); assert.equal(reg("three").crates.places.length, 3); assert.equal(reg("empty").crates.places.length, 0);
  assert.deepEqual([reg("two").bay.state, reg("two").bay.lid], ["open", ""]); assert.equal(reg("away").bay.state, "shut"); assert.match(reg("away").bay.lid, /^cargo-bay-shut-976x304/); assert.equal(reg("away").crates.places.length, 0, "away: no walk crates");
  assert.equal(reg("waiting").waiting.length > 0, true); assert.equal(reg("two").waiting, "");
  const b = build(sc.two.st, sc.two.sv); assert.deepEqual(b.props.focus, { cur: "room", targets: [] });
});

test("the line: the action, the subject and the way back of each state (cargo.json line), the notice the most pressing after the crates", () => {
  const sc = scenes(), L = (n, ui) => build(sc[n].st, sc[n].sv, ui).line;
  assert.deepEqual(L("one"), { ok: "Open the bay", back: "Home", subject: "a sealed crate", need: "" });
  assert.equal(L("two").subject, "two sealed crates"); assert.equal(L("three").subject, "three sealed crates");
  assert.deepEqual(L("empty"), { ok: null, back: "Home", subject: "the bay is empty", need: "" });
  assert.deepEqual(L("away"), { ok: null, back: "Home", subject: "the bay is shut", need: "" });
  assert.deepEqual([L("waiting").ok, L("waiting").subject], [null, "a pod waits for a well"]);
  const st = world(); S.seedPodFromGenome(st, podGenome(frameOf("S01"), 5), settings, T0); assert.equal(build(st, sv0([crate(1)])).line.need, "a new pod waits", "the notice after the crates, not the crates' own");
  assert.equal(build(st, sv0([crate(1)])).line.need.includes("crate"), false);
});

test("the rack is the six wells of Pods' collection in rack order, each its pod (the unknown shell for a pod not identified) or empty", () => {
  const st = world(); for (const gs of [5, 6]) S.seedPodFromGenome(st, podGenome(frameOf("S01"), gs), settings, T0); S.skipIdentify(st, st.tray[0]); st.knownIds = ["S01"];
  const w = build(st, sv0()).props.regions.rack.wells; assert.equal(w.length, 6);
  assert.deepEqual(w.map((x) => !!x.pod), [true, true, false, false, false, false]); assert.match(w[0].pod, /^pod:S01:i:88x112$/); assert.match(w[1].pod, /^pod:-:s:88x112$/);
  assert.ok(w.every((x) => /^cargo-well-96x128/.test(x.well) && x.from === null), "an empty bay: nothing travelling");
});

test("the opening: one entry a crate in the order they open, its ribbon, its pods and the well each goes to; a pod with no free well waits and has no well", () => {
  const st = world(); for (let i = 0; i < 5; i++) S.seedPodFromGenome(st, podGenome(frameOf("S01"), 20 + i), settings, T0);   // five wells taken: one free
  const sv = sv0([crate(1, 2), crate(2, 1, { dev: true })]), h = opened(st, sv), o = build(st, sv, h.ui).props.regions.opening;
  assert.deepEqual(o.crates.map((c) => c.ribbon), ["First crate home", "Developer crate home"]);
  assert.deepEqual(o.crates[0].pods.map((p) => p.well), [5, -1], "the first pod found the free well, the second waits"); assert.deepEqual(o.crates[1].pods.map((p) => p.well), [-1]);
  const r = build(st, sv, h.ui).props.regions.rack.wells; assert.deepEqual(r.filter((w) => w.from).map((w) => w.from), [{ crate: 0, order: 0 }], "the one pod that landed names its crate and its place in it");
  assert.equal(build(st, sv, h.ui).line.subject, "the bay is opening"); assert.equal(build(st, sv, h.ui).line.ok, null); assert.equal(build(st, sv, h.ui).line.back, null);
});

// the report through the real opening: the dock's mend is in Cargo's UI state when ✓ Open the bay is pressed (intents/frame.mjs dock sets it), every timer runs, the report shows
function reported(st, sv, mend = null) {
  const ui = { screen: "cargo", home: { f: "room" }, ...cargoUI({ mend }) }, h = { st, sv, settings, ui, specs: { cargo: spec, home, frame: frameSpec }, timers: [], say() {}, goto() {}, play() {}, at(ms, fn) { this.timers.push({ ms, fn }); }, now: () => T0, motion: () => true, save() {} };
  INTENTS.cargo.intent(h, "room", "confirm"); h.timers.sort((a, b) => a.ms - b.ms).forEach((t) => t.fn()); return build(st, sv, ui);
}
test("the report: a row a crate with its pods and its reach in words, what was gathered, the Probe from the dock's mend, the world's lines (the last crate's, at most three)", () => {
  const st = world(), sv = sv0([crate(1, 3, { explored: 4, of: 20 }), crate(2, 0, { explored: 20, of: 20 }), crate(3, 12, { of: 0, lines: ["The mist burned off", "A pond filled", "The wood stirred", "A fourth"] })]);
  const b = reported(st, sv, { free: 1, paid: 2, broke: false }), r = b.props.regions.report;
  assert.equal(r.heading, "Home from the field");
  assert.deepEqual(r.crates.map((c) => [c.lead, c.pods, c.text, c.reach]), [["First crate", 3, "", "a first look around"], ["Second crate", 0, "no pods", "all the land explored"], ["Third crate", 0, "many pods", ""]]);
  assert.deepEqual([r.gathered.lead, r.gathered.e, r.gathered.d, r.gathered.s, r.gathered.top], ["Gathered", "+9", "+9", "+12", ""], "economy decided: no top-up");
  assert.deepEqual(r.probe, { lead: "Probe", plates: 3, text: "mended for ⚡ 2" }); assert.deepEqual(r.world, { lead: "Meanwhile, the world turned", lines: ["The mist burned off", "A pond filled", "The wood stirred"] });
  assert.ok(["See the new pods", "See the new pod", "Done"].includes(b.line.ok)); assert.equal(b.line.back, "Cargo"); assert.equal(b.line.subject, "what came home");
  assert.deepEqual(b.props.regions.crates, undefined, "the bay is emptied under the card");
  assert.equal(reported(world(), sv0([crate(1, 1)]), { free: 0, paid: 0, broke: false }).props.regions.report.probe, null, "no mend, no row");
  assert.deepEqual(reported(world(), sv0([crate(1, 1)]), { free: 2, paid: 0, broke: true }).props.regions.report.probe, { lead: "Probe", plates: 2, text: "mended free" });
  assert.equal(reported(world(), sv0([crate(1, 1)])).props.regions.report.probe, null, "after a reload the report has no Probe row");
  const one = reported(world(), sv0([crate(1, 1)])); assert.equal(one.line.ok, "See the new pod"); assert.equal(reported(world(), sv0([crate(1, 0)])).line.ok, "Done", "no new pod: Done closes the card");
  const loose = { ...settings, economy: "loose" }; const st3 = world(), h3 = { st: st3, sv: sv0([crate(1, 1)]), settings: loose, ui: { screen: "cargo", home: {}, ...cargoUI() }, specs: { cargo: spec, home, frame: frameSpec }, timers: [], say() {}, goto() {}, play() {}, at(ms, fn) { this.timers.push({ ms, fn }); }, now: () => T0, motion: () => true, save() {} };
  INTENTS.cargo.intent(h3, "room", "confirm"); h3.timers.forEach((t) => t.fn()); assert.equal(cargoBuild({ st: st3, sv: h3.sv, settings: loose, docked: true, ui: h3.ui }, spec, home, frameSpec).props.regions.report.gathered.top, "with the top-up");
});

test("the reach in words: under a third, under two thirds, under all, all; no map says nothing; the ribbon is the developer's, else first, second, third", () => {
  const W = spec.strings.report.reach, c = (explored, of) => ({ explored, of });
  assert.equal(reachWord(spec, c(0, 20)), W.underThird); assert.equal(reachWord(spec, c(6, 20)), W.underThird); assert.equal(reachWord(spec, c(7, 20)), W.underTwoThirds); assert.equal(reachWord(spec, c(13, 20)), W.underTwoThirds); assert.equal(reachWord(spec, c(14, 20)), W.underAll); assert.equal(reachWord(spec, c(19, 20)), W.underAll); assert.equal(reachWord(spec, c(20, 20)), W.all); assert.equal(reachWord(spec, c(5, 0)), "");
  assert.deepEqual([0, 1, 2].map((k) => ribbonOf(spec, {}, k)), ["First crate home", "Second crate home", "Third crate home"]); assert.equal(ribbonOf(spec, { dev: true }, 1), "Developer crate home");
});

test("more than three crates (developer only): the bay draws the first three, the line counts all; the ribbon counts walk crates only (first, second, third, later) and every dev crate reads dev", () => {
  const st = world(), sv = sv0([crate(1), crate(2), crate(3, 2, { dev: true }), crate(4), crate(5), crate(6)]);
  const b = build(st, sv); assert.equal(b.props.regions.crates.places.length, 3, "three in the bay"); assert.equal(b.line.subject, "six sealed crates", "the context counts all");
  const h = opened(st, sv), o = build(st, sv, h.ui).props.regions.opening;
  assert.deepEqual(o.crates.map((c) => c.ribbon), ["First crate home", "Second crate home", "Developer crate home", "Third crate home", "Another crate home", "Another crate home"]);
  assert.deepEqual(h.played.find((e) => e.kind === "arrival"), { kind: "arrival", target: "crate", ms: 6 * 3000 + 180, hold: 6 * 3000 + 200 });
});
test("the event plays at most nine crates (hold ≤ 30000): the rest are taken in by the rule, the counters and the turn reach their final values at the end, the report has three rows and adds up every crate", () => {
  const st = world(), sv = sv0(Array.from({ length: 11 }, (_, i) => crate(i + 1, 1, i === 10 ? { lines: ["The last walk's line"] } : {}))), e0 = st.e;
  const h = opened(st, sv), ar = h.played.find((e) => e.kind === "arrival"); assert.deepEqual(ar, { kind: "arrival", target: "crate", ms: 9 * 3000 + 180, hold: 9 * 3000 + 200 }); assert.ok(ar.hold <= 30000);
  assert.equal(build(st, sv, h.ui).props.regions.opening.crates.length, 9, "nine crates are staged");
  const ordered = h.timers.slice().sort((a, b) => a.ms - b.ms); assert.equal(ordered.at(-1).ms, 9 * 3000, "the report at the ninth crate's end");
  for (const t of ordered.slice(0, -1)) t.fn(); assert.equal(h.ui.cargo.shown.e, e0 + 9 * 3, "nine crates' energy is shown, not eleven");
  ordered.at(-1).fn(); assert.equal(h.ui.cargo.shown, null, "the top bar's props carry the final values from here: " + st.e);
  const r = build(st, sv, h.ui).props.regions.report; assert.equal(r.crates.length, 3); assert.equal(r.gathered.e, "+" + 11 * 3, "Gathered adds up every crate"); assert.deepEqual(r.world.lines, ["The last walk's line"], "the lines of the last walk crate opened");
});
test("the report: the lead counts walk crates only; the world's lines are the last walk crate's, never a dev crate's (dev crates carry none)", () => {
  const st = world(), sv = sv0([crate(1, 1, { lines: ["A walk line"] }), crate(2, 1, { dev: true }), crate(3, 1, { dev: true })]);
  const h = opened(st, sv); h.timers.sort((a, b) => a.ms - b.ms).forEach((t) => t.fn());
  const r = build(st, sv, h.ui).props.regions.report; assert.deepEqual(r.crates.map((c) => c.lead), ["First crate", "Developer crate", "Developer crate"]); assert.deepEqual(r.world.lines, ["A walk line"]);
  const st2 = world(), sv2 = sv0([crate(1, 1, { dev: true }), crate(2, 1), crate(3, 1)]), h2 = opened(st2, sv2); h2.timers.sort((a, b) => a.ms - b.ms).forEach((t) => t.fn());
  assert.deepEqual(build(st2, sv2, h2.ui).props.regions.report.crates.map((c) => c.lead), ["Developer crate", "First crate", "Second crate"]);
});
test("the Probe row's price is the Energy the plates cost: free when the economy is free", () => {
  const st = world(), sv = sv0([crate(1, 1)]); st.probe = { shield: 0, smax: 3, tier: 1, seq: 1 };
  const free = { ...settings, economy: "free" }, ui = { screen: "cargo", home: { f: "room" }, ...cargoUI({ mend: { free: 0, paid: 2, broke: false } }) };
  const h = { st, sv, settings: free, ui, specs: { cargo: spec, home, frame: frameSpec }, timers: [], say() {}, goto() {}, play() {}, at(ms, fn) { this.timers.push({ ms, fn }); }, now: () => T0, motion: () => true, save() {} };
  INTENTS.cargo.intent(h, "room", "confirm"); h.timers.forEach((t) => t.fn());
  assert.deepEqual(cargoBuild({ st, sv, settings: free, docked: true, ui }, spec, home, frameSpec).props.regions.report.probe, { lead: "Probe", plates: 2, text: "mended free" });
});
