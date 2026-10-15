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
import { traitLooks } from "../../workbench/framework/describe.mjs";
import { homeBuild, lightAt, wordsOf } from "../src/views/home-props.mjs";
import { goalWords } from "../src/views/goal-words.mjs";

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
  const need = (st) => wordsOf(S.needKey(st, sv0(), settings, {}), spec).notice;   // the soft need's words (the notice zone shows the goal instead while there is one, below)
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
  const young = ids(build(st, sv)); assert.ok(young.length >= 4 && young.every((id) => /^mibi:S\d+-[0-9a-f]{8}:juvenile:\d+x\d+$/.test(id)), young.join(" "));
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
// ---- the goal in the notice zone (frame.json strings.goal; station-x10-economy.md) ----
const G = frameSpec.strings.goal;
test("the goal: a soft need gives its notice to the goal, the room's ✓ keeps the need's action; a first-group need keeps the zone", () => {
  // loop 2: the pair (Dot) is short of ⚡ for the Loika pod it holds; a Tuikis pod waits unread
  const st = world(); dock(st); const [dot] = S.seedAdults(st, "S01", 5, 1, settings).mibis; dot.name = "Dot"; st.e = 1;
  const lk = pod(st, "S01"); lk.read = [frameOf("S01").chapters[0].id];
  const b = build(st, sv0());
  assert.equal(b.line.ok, "Look at the pods"); assert.deepEqual(b.line.goal, { text: "go out for more", icons: "⚡", plain: "" }); assert.equal(b.line.need, "", "no amber notice");
  assert.equal(S.needKey(st, sv0(), settings, {}).key, "couldGrow", "needKey is unchanged");
  // a new pod (first group): the notice as now, no goal
  const st2 = world(); dock(st2); S.seedAdults(st2, "S01", 5, 1, settings); pod(st2, "S01", 5, false);
  const c = build(st2, sv0()); assert.equal(c.line.need, "a new pod in the rack"); assert.equal(c.line.goal, undefined);
  // no goal: the soft need as now (two adults, the guide complete, a bud growing)
  const st3 = world(); dock(st3); S.seedAdults(st3, "S01", 5, 2, settings); { const fr = frameOf("S01"); st3.readOnce.S01 = fr.chapters.map((c) => c.id); for (const ch of fr.chapters) for (const t of ch.traits) S.guideAdd(st3, "S01", t.id, traitLooks(fr, t)); } st3.bud = { kind: "founder", species: "S03", start: Date.now(), minutes: 5 };
  st3.probe = { tier: 2, shield: 3, smax: 3 }; const d = build(st3, sv0()); assert.equal(S.goalKey(st3, sv0()), null); assert.equal(d.line.need, "a bud is growing"); assert.equal(d.line.goal, undefined);
});
test("the goal away reads the aim, growUp counts the walks in words, and the Probe's context follows its goal", () => {
  const st = world(); dock(st, false); const [dot] = S.seedAdults(st, "S01", 5, 1, settings).mibis; dot.name = "Dot";
  assert.equal(S.goalKey(st, sv0()).step.key, "findPod"); assert.deepEqual(build(st, sv0()).line.goal, { text: "find a Loika pod", icons: "", plain: "" }, "away, pair, findPod: only goOut reads the aim, so the step's own words show");
  const w = world(); dock(w, false); const [a, b2] = S.seedAdults(w, "S01", 5, 2, settings).mibis; a.name = "Dot"; b2.name = "Moss"; a.born = 1; b2.born = 2; w.turn = 2;
  assert.equal(build(w, sv0()).line.goal.text, "walks grow Dot up"); assert.equal(build(w, sv0()).line.goal.plain, "walks grow the pair up");
  dock(w, true); w.turn = 2; assert.equal(build(w, sv0()).line.goal.text, "more walks grow the pair"); w.turn = 3; assert.equal(build(w, sv0()).line.goal.text, "one more walk grows the pair");
  // the Probe's context: save, fit, docked, away
  w.probe = { tier: 1, shield: 3, smax: 3 }; w.e = 3; w.d = 0; const pr = (x) => build(x, sv0(), { focus: "probe" }).line.subject;
  assert.equal(pr(w), frameSpec ? spec.strings.subjects.probe.save : "", "saving up for its upgrade"); w.e = 12; w.d = 4; assert.equal(pr(w), spec.strings.subjects.probe.fit);
  w.e = 0; w.d = 0; w.probe = { tier: 2, shield: 3, smax: 3 }; assert.equal(pr(w), spec.strings.subjects.probe.docked, "the Probe in its cradle: tier 2, nothing to save for");
});
test("goalWords: a name too wide falls back to the nameless sibling of the four keys that have one; the other keys have none", () => {
  const face = (goal, docked = true) => goalWords(goal, docked, frameSpec);
  assert.deepEqual(face({ key: "growUp", names: ["Dot", "Moss"], walks: 2, bondedWaits: true, step: { key: "goOut" } }), { text: "Dot grows with care", icons: "", plain: "the young mibi grows with care" });
  assert.deepEqual(face({ key: "guide", species: "S01", step: { key: "read", species: "S01", pod: "p", chapter: frameOf("S01").chapters[0].id, cost: 1 } }), { text: `read ${frameOf("S01").chapters[0].name} on the Loika pod`, icons: "", plain: "" }, "the guide's read has no name, so no nameless sibling");
  assert.equal(face({ key: "guide", species: "S01", step: { key: "findPod", species: "S01" } }, false).text, "find a Loika pod", "away, a findPod step reads its own words, not the aim");
  assert.deepEqual(face({ key: "readChild", name: "Dot", step: { key: "read", name: "Dot" } }), { text: "read Dot's chapters", icons: "", plain: "read the new mibi's chapters" });
  assert.equal(face({ key: "growUp", names: ["Dot", "Moss"], walks: 2, bondedWaits: false, step: { key: "goOut" } }, false).plain, "walks grow the pair up");
  assert.equal(face({ key: "readChild", name: "Dot", step: { key: "goOut" } }, false).plain, "read the new mibi's chapters");
  for (const goal of [{ key: "cross", names: ["Dot", "Moss"], step: { key: "cross" } }, { key: "firstPod", step: { key: "goOut" } }, { key: "pair", name: "Dot", species: "S01", step: { key: "identify", species: "S01" } }]) assert.equal(face(goal).plain, "", goal.key);
  assert.equal(face({ key: "firstMibi", step: { key: "short", icons: "◆ ⚡", from: "fieldAndBench" } }).text, "go out and watch for more"); assert.equal(face({ key: "firstMibi", step: { key: "short", icons: "◆", from: "bench" } }).icons, "◆");
});
test("a mibi with no painting changes nothing on Home: the Incubator is empty with its lamp off and nobody waits (Grow paints nothing)", () => {
  const { st, sv } = scenes().docked; assert.ok(st.mibis.every((m) => !m.paint), "no mibi has a painting");
  const r = build(st, sv).props.regions;
  assert.equal(r.incubator.state, "empty"); assert.equal(r.incubator.lamp, "off");
  assert.ok(r.residents.every((p) => p.waiting === false) && r.bed.sleepers.every((p) => p.waiting === false), "no person has waiting: true");
});

test("a new pod is firm until Pods has drawn it: firm, the goal is absent; seen, the goal takes the notice, the room's ✓ stays and the Pods lamp is not amber; a second unseen pod is firm again, counting one", () => {
  const st = world(); dock(st); const [dot] = S.seedAdults(st, "S01", 5, 1, settings).mibis; dot.name = "Dot";
  const p1 = pod(st, "S01", 5, false);
  let b = build(st, sv0());
  assert.equal(b.line.need, "a new pod in the rack"); assert.equal(b.line.goal, undefined, "firm: no goal"); assert.equal(b.props.regions.pods.lamp, "needsYou");
  p1.seen = 1; b = build(st, sv0());
  assert.equal(b.line.need, ""); assert.ok(b.line.goal, "soft: the goal takes the notice"); assert.equal(b.line.ok, "Look at the pods"); assert.equal(b.props.regions.pods.lamp, "well");
  const p2 = pod(st, "S01", 6, false); assert.ok(!p2.seen); b = build(st, sv0());
  assert.equal(b.line.need, "a new pod in the rack", "one unseen pod: one"); assert.equal(b.line.goal, undefined); assert.equal(b.props.regions.pods.lamp, "needsYou");
});

test("a waiting pod in the bay is a first-group need ahead of a seen unidentified pod's soft notice: amber, the Pods lamp amber, no goal; with it gone the goal takes the zone and the lamp is well", () => {
  const st = world(); dock(st); const [dot] = S.seedAdults(st, "S01", 5, 1, settings).mibis; dot.name = "Dot";
  const p1 = pod(st, "S01", 5, false); p1.seen = 1;
  st.waiting.push({ id: "wait0", species: "S01", sp: 0, g: "meadow", how: "calm", gs: 9, idd: 0, read: [] });
  let b = build(st, sv0()); assert.equal(S.needKey(st, sv0(), settings, {}).key, "waitingPods");
  assert.notEqual(b.line.need, ""); assert.equal(b.line.goal, undefined, "no goal"); assert.equal(b.props.regions.pods.lamp, "needsYou");
  st.waiting = []; b = build(st, sv0());
  assert.equal(S.needKey(st, sv0(), settings, {}).soft, true); assert.equal(b.line.need, ""); assert.ok(b.line.goal, "the goal in mist"); assert.equal(b.props.regions.pods.lamp, "well");
});
test("the Probe's context follows the Probe goal wherever it comes from: every guide complete, tier 1 and ⚡3 reads save; with the upgrade payable it reads fit", () => {
  const st = world(); dock(st); S.seedAdults(st, "S01", 5, 2, settings); { const fr = frameOf("S01"); st.readOnce.S01 = fr.chapters.map((c) => c.id); for (const ch of fr.chapters) for (const t of ch.traits) S.guideAdd(st, "S01", t.id, traitLooks(fr, t)); }
  st.probe = { tier: 1, shield: 3, smax: 3 }; st.e = 3; st.d = 0; const pr = () => build(st, sv0(), { focus: "probe" }).line.subject;
  assert.equal(S.goalKey(st, sv0()).key, "probe"); assert.equal(pr(), spec.strings.subjects.probe.save);
  st.e = 12; st.d = 4; assert.equal(S.goalKey(st, sv0()).step.key, "fit"); assert.equal(pr(), spec.strings.subjects.probe.fit);
});

test("a picture id is keyed by the genome, not the mibi id: two worlds with the same mibi id and different genomes give different picture ids, the same genome the same id", () => {
  const mk = (gs) => { const st = world(); dock(st); S.seedAdults(st, "S01", gs, 1, settings); st.mibis[0].paint = { state: "landed" }; return st; };
  const a = mk(5), b = mk(6), c = mk(5), ids = (st) => build(st, sv0({ carried: [st.mibis[0].id] })).requests.filter((r) => r.kind === "mibi").map((r) => r.id);
  assert.equal(a.mibis[0].id, b.mibis[0].id); assert.notEqual(a.mibis[0].genome && JSON.stringify(a.mibis[0].genome.loci), JSON.stringify(b.mibis[0].genome.loci));
  assert.notDeepEqual(ids(a), ids(b)); assert.deepEqual(ids(a), ids(c));
});

test("fix 7: at day the residents' and sleepers' picture ids are today's; at dawn, dusk and night every one carries its light (id ends :<light>, request carries light), the count equals day's, and the walk, nap and close atlases name the light but the shadows never; the tiles and the bed take none", () => {
  const st = world(); dock(st); S.seedAdults(st, "S01", 5, 4, settings); for (const m of st.mibis) { m.paint = { state: "landed" }; m.born = st.turn; }
  const sv = sv0({ carried: [st.mibis[0].id, st.mibis[1].id] }), mibiReqs = (light) => build(st, sv, { light }).requests.filter((r) => r.kind === "mibi"), day = mibiReqs("day");
  assert.ok(day.length >= 4 && day.every((r) => !("light" in r) && !/:(dawn|dusk|night)$/.test(r.id)));
  for (const light of ["dawn", "dusk", "night"]) {
    const got = mibiReqs(light); assert.equal(got.length, day.length); assert.ok(got.every((r) => r.light === light && r.id.endsWith(":" + light)), light);
    assert.deepEqual(got.map((r) => r.id.replace(":" + light, "")), day.map((r) => r.id), "only the suffix differs");
    const mv = build(st, sv, { light, motionSets: true }).requests.filter((r) => r.kind === "moving"); assert.ok(mv.length > 0);
    for (const r of mv) assert.equal(/:shadow:/.test(r.id), !r.id.endsWith(":" + light), r.id);
  }
});

// the rack pod is the host-composed rackpod:<species> picture (home.json regions.pods.pod.picture), never a PH plate
test("an identified pod in the rack asks for rackpod:S01, an unidentified one for rackpod:unknown; no home-rack-pod-24x32 and no ph request for a pod", () => {
  const st = world(); dock(st); pod(st, "S01"); pod(st, "S02", 6, false);   // S01 is known; S02's pod is not identified and its species not yet known
  const b = build(st, sv0()), picks = b.props.regions.pods.wells.map((w) => w.pod).filter(Boolean), reqs = new Map(b.requests.map((r) => [r.id, r]));
  assert.deepEqual(picks, ["rackpod:S01", "rackpod:unknown"]);
  for (const id of picks) assert.equal(reqs.get(id).kind, "rackpod");
  assert.equal(reqs.get("rackpod:S01").species, "S01"); assert.deepEqual(reqs.get("rackpod:S01").size, spec.regions.pods.pod.size); assert.equal(reqs.get("rackpod:unknown").species, null);
  assert.ok(!b.requests.some((r) => r.id === "home-rack-pod-24x32" || (r.kind === "ph" && /rack-pod/.test(r.id))), "no PH plate for a rack pod");
});
