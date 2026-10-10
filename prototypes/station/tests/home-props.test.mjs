// Home's props (lvgl-switch.md §2.1, §4 L2.2): the view the face takes, views/home-props.mjs, in Node. Plain JSON that names what and never where: it validates against home.props.json in every state, holds no rectangle,
// no measure and no layout rule, fits the 32 KiB props budget with the frame beside it, spells the notice and the line from home.json's strings, and agrees with state.need() on what the room's ✓ does.
//   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, podGenome } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { homeBuild, needOf } from "../src/views/home-props.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames"), specs = path.resolve(here, "../../ui/specs/station");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const J = (f) => JSON.parse(readFileSync(path.join(specs, f), "utf8")), spec = J("home.json"), frameSpec = J("frame.json"), schema = J("home.props.json");
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

const world = () => { const st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = 99; st.d = 99; st.s = 99; st.firstMibi = false; return st; };
const sv0 = (over = {}) => ({ v: 8, seed: 7, wid: "w1", turn: 0, bay: [], mibis: [], carried: [], tier: 1, shield: 3, ...over });
const pod = (st, id, gs = 5, identified = true) => { S.seedPodFromGenome(st, podGenome(frameOf(id), gs), settings, T0); const p = st.tray[st.tray.length - 1]; if (identified) S.skipIdentify(st, p); return p; };
const crate = (n) => ({ id: "c" + n, n, turn: 0, at: T0, e: 3, d: 3, s: 4, pods: [], met: [], explored: 0, of: 0, lines: [] });
const build = (st, sv, over = {}) => homeBuild({ st, sv, settings, docked: S.docked(st), ui: {}, focus: null, ...over }, spec, frameSpec);
const dock = (st, d = true) => { st.dock = { docked: d, at: T0 }; };

function scenes() {
  const out = {};
  { const st = world(); dock(st); out.empty = { st, sv: sv0() }; }
  { const st = world(); dock(st); S.seedAdults(st, "S01", 5, 4, settings); const [a, b] = st.mibis; out.docked = { st, sv: sv0({ carried: [a.id, b.id] }) }; }
  { const st = world(); dock(st, false); S.seedAdults(st, "S01", 5, 3, settings); out.away = { st, sv: sv0({ carried: [st.mibis[0].id] }) }; }
  { const st = world(); dock(st); S.seedAdults(st, "S01", 5, 2, settings); out.crates = { st, sv: sv0({ bay: [crate(1), crate(2)] }) }; }
  { const st = world(); dock(st); pod(st, "S01"); pod(st, "S01", 6, false); out.pods = { st, sv: sv0() }; }
  { const st = world(); dock(st); out.waiting = { st, sv: sv0() }; st.waiting.push({ id: "w1" }); }
  return out;
}

test("Home's props validate against home.props.json in every scene, name no rectangle, and fit the budget", () => {
  for (const [name, { st, sv }] of Object.entries(scenes())) {
    const b = build(st, sv), bad = validate(b.props, schema);
    assert.deepEqual(bad, [], `${name}: ${bad.slice(0, 3).join("; ")}`);
    const json = JSON.stringify(b.props);
    assert.ok(!/"(x|y|w|h|rect|at|size|box|pitch)"\s*:/.test(json), `${name}: props name what, never where`);
    assert.ok(json.length + JSON.stringify(b.line).length < 8 * 1024, `${name}: ${json.length} bytes`);
    for (const id of b.requests.map((r) => r.id)) assert.ok(typeof id === "string" && id.length);
  }
});

test("residents at home walk (a seed each), the carried set sleeps on the bed (no seed), the bed is a PH plate in every state", () => {
  const sc = scenes(), d = build(sc.docked.st, sc.docked.sv).props.regions;
  assert.equal(d.residents.length, 2); assert.ok(d.residents.every((r) => r.seed > 0)); assert.deepEqual(d.bed.sleepers.map((s) => s.seed), [0, 0]); assert.equal(d.bed.state, "docked"); assert.ok(!("mark" in d.bed), "no Companion mark is drawn on the bed"); assert.match(d.bed.picture, /^home-bed-192x56/);
  const a = build(sc.away.st, sc.away.sv).props.regions; assert.equal(a.bed.state, "away"); assert.deepEqual(a.bed.sleepers, []); assert.equal(a.cargo.state, "away"); assert.equal(a.probe.state, "away");
  const n = build(sc.empty.st, sc.empty.sv).props.regions; assert.equal(n.bed.state, "none"); assert.deepEqual(n.residents, []);
  const seeds = d.residents.map((r) => r.seed), again = build(sc.docked.st, sc.docked.sv).props.regions.residents.map((r) => r.seed); assert.deepEqual(again, seeds, "the seed is the mibi's, the same every time");
});

test("the targets are the Vivarium, each resident and sleeper, the five modules and the knob; the ring is on the focus or on the room", () => {
  const { st, sv } = scenes().docked, b = build(st, sv);
  const home = S.homeMibis(st, sv).map((m) => "resident." + m.id), asleep = S.carriedIds(st, sv).map((id) => "resident." + id);
  assert.deepEqual(b.props.focus.targets.map((t) => t.id), ["vivarium", ...home, ...asleep, "cargo", "pods", "incubator", "probe", "library", "knob"], "the Vivarium, the residents, the sleepers, then the column");
  assert.equal(b.props.focus.cur, "room");
  const r = "resident." + st.mibis[0].id; assert.equal(build(st, sv, { focus: r }).props.focus.cur, r);
  assert.equal(build(st, sv, { focus: "resident.999" }).props.focus.cur, "room", "a target that is not present puts the ring on the room");
});

test("the lamps: Cargo needs you with crates, Pods with a new pod; amber on one module at most", () => {
  const sc = scenes(), c = build(sc.crates.st, sc.crates.sv).props.regions;
  assert.equal(c.cargo.lamp, "needsYou"); assert.equal(c.cargo.state, "crates"); assert.equal(c.cargo.crates, 2); assert.ok(["pods", "incubator", "probe", "library"].every((k) => c[k].lamp !== "needsYou"));
  const p = build(sc.pods.st, sc.pods.sv).props.regions; assert.equal(p.pods.lamp, "needsYou"); assert.equal(p.cargo.lamp, "off");
  for (const { st, sv } of Object.values(sc)) { const r = build(st, sv).props.regions; assert.ok(["cargo", "pods", "incubator", "probe", "library"].filter((k) => r[k].lamp === "needsYou").length <= 1); }
  const w = build(sc.waiting.st, sc.waiting.sv).props.regions; assert.equal(w.cargo.state, "waiting"); assert.equal(w.cargo.lamp, "off", "the waiting mark is never amber"); assert.ok(w.cargo.waiting);
});

test("the notice and the line spell the counts and read home.json's strings", () => {
  const sc = scenes(), c = build(sc.crates.st, sc.crates.sv);
  assert.equal(c.line.need, "two crates wait in the bay"); assert.equal(c.line.ok, "Open Cargo"); assert.equal(c.line.back, null); assert.equal(c.line.subject, "");
  assert.equal(build(sc.crates.st, sc.crates.sv, { focus: "cargo" }).line.subject, "two sealed crates");
  assert.equal(build(sc.crates.st, { ...sc.crates.sv, bay: [crate(1)] }).line.need, "a crate waits in the bay");
  const d = scenes().docked; const m = d.st.mibis[2];
  const l = build(d.st, d.sv, { focus: "resident." + m.id }).line; assert.equal(l.ok, "Look at " + m.name); assert.match(l.subject, /^an? (adult|young|elder) \S+$/);
  const sl = d.st.mibis[0]; assert.match(build(d.st, d.sv, { focus: "resident." + sl.id }).line.subject, /, asleep$/);
  assert.equal(build(d.st, d.sv, { focus: "vivarium" }).line.subject, "four mibis at home", "two at home and two asleep on the bed"); assert.equal(build(d.st, d.sv, { focus: "knob" }).line.ok, "Rest");
  assert.equal(build(sc.empty.st, sc.empty.sv, { focus: "vivarium" }).line.subject, "nobody lives here yet"); assert.equal(build(sc.empty.st, sc.empty.sv).line.ok, null, "nothing needs the player: no ✓ cap");
  assert.equal(build(sc.away.st, sc.away.sv, { focus: "cargo" }).line.subject, "the bay is shut"); assert.equal(build(sc.away.st, sc.away.sv, { focus: "probe" }).line.subject, "the Probe is away");
});

test("the room's ✓ agrees with state.need(): the same action, the same screen", () => {
  const ACT = { bay: "cargo", inc: "incubator", meet: "meet", pods: "pods" };
  for (const [name, { st, sv }] of Object.entries(scenes())) {
    const n = S.need(st, sv, settings, {}), mine = needOf({ st, sv, settings, docked: S.docked(st), ui: {} }, spec);
    assert.equal(mine?.act ?? null, n.act ? ACT[n.act] : null, name);
  }
  const { st, sv } = scenes().docked; const m = st.mibis[0];
  assert.equal(needOf({ st, sv, settings, docked: true, ui: { meet: m.id } }, spec).key, "meet"); assert.equal(build(st, sv, { ui: { meet: m.id } }).line.need, "meet " + m.name);
});
