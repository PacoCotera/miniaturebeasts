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
import { homeBuild, lightAt } from "../src/views/home-props.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames"), specs = path.resolve(here, "../../ui/specs/station");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const J = (f) => JSON.parse(readFileSync(path.join(specs, f), "utf8")), spec = J("home.json"), frameSpec = J("frame.json"), schema = J("home.props.json");
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 12 }, T0 = 1_000_000;

function validate(v, sc, at = "$", out = []) {
  if (sc.$ref) return validate(v, schema.$defs[sc.$ref], at, out);
  if (sc.oneOf) { const ok = sc.oneOf.filter((o) => validate(v, o, at, []).length === 0).length; if (ok !== 1) out.push(`${at}: matches ${ok} of oneOf`); return out; }   // the moving prop: "" or one object form (Station M1 §2.2)
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
const build = (st, sv, over = {}) => homeBuild({ st, sv, settings, docked: S.docked(st), ui: {}, focus: null, light: "day", ...over }, spec, frameSpec);
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

test("residents at home walk (a seed each), the carried set sleeps on the bed (a seed each too: its breath's phase, Station M1 §2.6), the bed is a PH plate in every state", () => {
  const sc = scenes(), d = build(sc.docked.st, sc.docked.sv).props.regions;
  assert.equal(d.residents.length, 2); assert.ok(d.residents.every((r) => r.seed > 0)); assert.ok(d.bed.sleepers.every((s) => s.seed > 0)); assert.notDeepEqual(d.bed.sleepers.map((s) => s.seed), d.residents.map((r) => r.seed)); assert.equal(d.bed.state, "docked"); assert.equal(d.bed.mark, "", "docked: no mark on the bed"); assert.match(d.bed.picture, /^home-bed-day-192x56/);
  const a = build(sc.away.st, sc.away.sv).props.regions; assert.equal(a.bed.state, "away"); assert.deepEqual(a.bed.sleepers, []); assert.equal(a.bed.mark, "home-bed-mark-16x24", "away: the bed shows its mark"); assert.equal(a.cargo.state, "away"); assert.equal(a.probe.state, "away");
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
    const n = S.need(st, sv, settings, {}), mine = S.needKey(st, sv, settings, {});
    assert.equal(mine?.act ?? null, n.act ? ACT[n.act] : null, name);
  }
  const { st, sv } = scenes().docked; const m = st.mibis[0];
  assert.equal(S.needKey(st, sv, settings, { meet: m.id }).key, "meet"); assert.equal(build(st, sv, { ui: { meet: m.id } }).line.need, "meet " + m.name);
});

test("the short notices carry each short material once, Energy before Essence, and ◆ for a read", () => {
  const mk = (e, sEss) => { const st = world(); dock(st); const p = pod(st, "S01"); p.read = [frameOf("S01").chapters[0].id]; st.e = e; st.s = sEss; st.d = 99; const c = S.growCost(st, {}, settings); return { st, c }; };
  const need = (st) => build(st, sv0()).line.need;
  { const { st, c } = mk(0, 99); assert.ok(c.e > 0); assert.match(need(st), /pod needs more ⚡$/); assert.equal((need(st).match(/⚡/g) || []).length, 1); }
  { const { st, c } = mk(99, 0); assert.ok(c.s > 0); assert.match(need(st), /pod needs more ❀$/); assert.ok(!/⚡/.test(need(st))); }
  { const { st } = mk(0, 0); assert.match(need(st), /pod needs more ⚡ ❀$/); }
  { const st = world(); dock(st); const p = pod(st, "S01"); st.d = 0; st.bud = { kind: "founder", species: "S01", start: Date.now(), minutes: 5 }; p.read = []; st.readEver = true; const n = need(st); assert.match(n, /^an? \S+ pod needs more ◆$/); assert.equal((n.match(/◆/g) || []).length, 1); }
});

// ---- the light by the clock (frame.json light): the hours, the pictures of a light, the bed's masters ----
test("lightAt: the hour's light from frame.json light.from, the last wrapping midnight", () => {
  const L = frameSpec.light;
  for (const [h, want] of [[0, "night"], [5, "night"], [6, "dawn"], [7, "day"], [12, "day"], [17, "day"], [18, "dusk"], [19, "dusk"], [20, "night"], [23, "night"]]) assert.equal(lightAt(h, L), want, `${h}:00`);
});
test("the light picks the pictures: Home's glass, the bed and Idle's painting are the masters of that light, the bed the same on both screens", async () => {
  const { idleBuild } = await import("../src/views/idle-props.mjs"), sc = scenes();
  for (const light of ["dawn", "day", "dusk", "night"]) {
    const h = build(sc.docked.st, sc.docked.sv, { light }), i = idleBuild({ st: sc.docked.st, sv: sc.docked.sv, settings, docked: true, light }, frameSpec), ids = (b) => b.requests.filter((r) => r.kind === "slot");
    const glass = ids(h).find((r) => r.id.startsWith("home-glass-")), bed = ids(h).find((r) => r.id.startsWith("home-bed-")), bedI = ids(i).find((r) => r.id.startsWith("home-bed-")), viv = ids(i).find((r) => r.id.startsWith("idle-vivarium-"));
    assert.deepEqual([glass.id, glass.master], [`home-glass-${light}:640x488`, `home-glass-${light}-640x488`]);
    assert.deepEqual([bed.id, bed.master], [`home-bed-${light}-192x56`, `home-bed-${light}-192x56`]); assert.deepEqual([bedI.id, bedI.master], [bed.id, bed.master], "one bed on Home and Idle");
    assert.deepEqual([viv.id, viv.master], [`idle-vivarium-${light}:1024x568`, `idle-vivarium-${light}-1024x568`]);
  }
});
test("every light of frame.light.from has its pictures on both screens and its bed, and no more", () => {
  const lights = frameSpec.light.from.map(([, l]) => l).sort();
  for (const m of [frameSpec.idle.light.pictures, spec.light.pictures, frameSpec.light.bed]) assert.deepEqual(Object.keys(m).sort(), lights);
});

test("a mibi that grows up changes every picture id from :juvenile: to :adult: with the sleepers' size unchanged and a resident's following its stage (the residents and the sleepers on the bed)", () => {
  const st = world(); dock(st); S.seedAdults(st, "S01", 5, 4, settings); for (const m of st.mibis) { m.paint = { state: "landed" }; m.born = st.turn; }
  const ids = (b) => b.requests.filter((r) => r.kind === "mibi").map((r) => r.id), sv = sv0({ carried: [st.mibis[0].id, st.mibis[1].id] });
  const young = ids(build(st, sv)); assert.ok(young.length >= 4 && young.every((id) => /^mibi:\d+:juvenile:\d+x\d+$/.test(id)), young.join(" "));
  st.turn += settings.adultTurns ?? S.JUVENILE_TURNS; for (const m of st.mibis) assert.equal(S.mibiStage(st, m, settings), "adult");
  const grown = ids(build(st, sv));
  // every id has the stage swapped; a resident's size is its stage's (home.json sizes: a juvenile's 104×112, an adult's 144×152), the sleepers' and the tiles' size does not change with it
  assert.deepEqual(grown.map((id) => id.replace(/:adult:\d+x\d+$/, "")), young.map((id) => id.replace(/:juvenile:\d+x\d+$/, "")));
  assert.ok(young.some((id) => id.endsWith(":104x112")) && young.some((id) => id.endsWith(":96x88")), young.join(" ")); grown.forEach((id, i) => assert.equal(id, young[i].replace(":juvenile:", ":adult:").replace(/:104x112$/, ":144x152"), `${young[i]} → ${id}`));
});

// ---- Station M1 §2.6, the game designer's R1: the rest, a household function of the Station time ----
import { restOf } from "../src/views/home-props.mjs";
import { setMoving } from "../src/moving.mjs";
{ const ix = J("moving/index.json"), sets = {}; for (const id of ix.sets) sets[id] = J(`moving/${id}.json`); setMoving(sets); }
const REST = J("vivarium.json").rules.rest, hm = (h, m = 0, s = 0) => h * 3600 + m * 60 + s;
test("restOf (R1): the worked example: four diurnal residents settle across the 20:00 window one at a time (J1 20:01:40, J2 20:07:30, A1 20:15:50, A2 20:22:55) and wake at the same offsets from 06:00", () => {
  const here = [{ id: "J1", seed: 100, species: "S01", stage: "juvenile" }, { id: "J2", seed: 900, species: "S01", stage: "juvenile" }, { id: "A1", seed: 50, species: "S01", stage: "adult" }, { id: "A2", seed: 7000, species: "S01", stage: "adult" }];
  const flips = { J1: hm(20, 1, 40), J2: hm(20, 7, 30), A1: hm(20, 15, 50), A2: hm(20, 22, 55) };
  assert.deepEqual(Object.values(restOf(here, hm(19, 59, 59), REST)), ["awake", "awake", "awake", "awake"], "19:59:59 all awake");
  for (const [id, t] of Object.entries(flips)) { assert.equal(restOf(here, t - 1, REST)[id], "awake", `${id} a second before its flip`); assert.equal(restOf(here, t, REST)[id], "asleep", `${id} at its flip`); const w = t - hm(20) + hm(6); assert.equal(restOf(here, w - 1, REST)[id], "asleep"); assert.equal(restOf(here, w, REST)[id], "awake", `${id} wakes at the same offset from 06:00`); }
  assert.deepEqual(Object.values(restOf(here, hm(20, 30), REST)), ["asleep", "asleep", "asleep", "asleep"], "20:30 all asleep"); assert.deepEqual(Object.values(restOf(here, hm(5, 59, 59), REST)), ["asleep", "asleep", "asleep", "asleep"], "05:59:59 asleep");
  assert.deepEqual(Object.values(restOf(here, hm(6, 30), REST)), ["awake", "awake", "awake", "awake"], "06:30 all diurnal awake");
});
test("restOf (R1): an elder settles in the 18:00 window and wakes last in the 06:00 window; S16 sleeps by day (asleep at 06:30, awake at 18:30); a household of one flips in its first 900 s; a household of twelve flips at least 75 s apart", () => {
  const E = { id: "E", seed: 12345, species: "S01", stage: "elder" }, here = [{ id: "J1", seed: 100, species: "S01", stage: "juvenile" }, E];
  const off = E.seed % 900; assert.equal(restOf(here, hm(18) + off - 1, REST).E, "awake"); assert.equal(restOf(here, hm(18) + off, REST).E, "asleep", "the elder alone in the 18:00 window");
  const wake = (id, list) => { for (let t = hm(6); t < hm(6, 31); t++) if (restOf(list, t, REST)[id] === "awake") return t; return null; }; assert.ok(wake("E", here) > wake("J1", here), "the elder wakes after the juvenile");
  const n = [{ id: "N", seed: 77, species: "S16", stage: "adult" }]; assert.equal(restOf(n, hm(6, 30), REST).N, "asleep"); assert.equal(restOf(n, hm(18, 30), REST).N, "awake");
  const one = [{ id: "P", seed: 31337, species: "S01", stage: "adult" }]; let t1 = null; for (let t = hm(20); t < hm(20, 30); t++) if (restOf(one, t, REST).P === "asleep") { t1 = t; break; } assert.ok(t1 - hm(20) < 900, "a household of one flips in its first 900 s");
  const twelve = Array.from({ length: 12 }, (_, i) => ({ id: "M" + i, seed: (i * 7919 + 13) % 65521, species: "S01", stage: i < 5 ? "juvenile" : "adult" })), at = {};
  for (let t = hm(20); t <= hm(20, 30); t++) { const r = restOf(twelve, t, REST); for (const m of twelve) if (at[m.id] == null && r[m.id] === "asleep") at[m.id] = t; }
  const times = Object.values(at).sort((a, b) => a - b); assert.equal(times.length, 12); for (let i = 1; i < times.length; i++) assert.ok(times[i] - times[i - 1] >= 75, `flips ${times[i] - times[i - 1]} s apart`);
});
test("Home's residents with moving sets fit home.props.json: moving (the walk and its shadow; a bed sleeper its nap) and rest", () => {
  const sc = scenes(), b = build(sc.docked.st, sc.docked.sv, { time: hm(23), restRules: REST, motionSets: true });
  assert.deepEqual(validate(b.props, schema), []); assert.ok(b.props.regions.residents.every((r) => r.moving && r.moving.walk && r.rest === "asleep"), "each resident names its walk atlas, asleep at 23:00");
  assert.ok(b.props.regions.bed.sleepers.every((s) => s.moving && s.moving.nap), "the sleepers name their nap atlas");
  const off = build(sc.docked.st, sc.docked.sv, { time: hm(12), restRules: REST, motionSets: false }); assert.ok(off.props.regions.residents.every((r) => !r.moving), "the play gate: no moving set without its masters or the developer switch");
});
