// Home's props (lvgl-switch.md §2.1): the view the face takes, views/home-props.mjs, in Node. Plain JSON that names what and never where: it validates against home.props.json in every state, holds no rectangle, no measure and no layout rule,
// fits the 32 KiB props budget, says the top bar's words (the date and the clock), the line (the needs in their order, the goal, a target's verb), the four stations' words and the Vivarium's readout from home.json's strings, and agrees with the host's
// rules on what the room's ✓ does. The living window's shared selectors (residents' seeds, rest, light, picture ids), which Idle and the Vivarium's whole use, are tested through Idle's view beneath.
//   node --test prototypes/station/tests/
import { lineCased } from "./fixtures/line-case.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, podGenome } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { traitLooks } from "../../workbench/framework/describe.mjs";
import { homeBuild as homeBuildUnchecked, homeNeeds, dateWords, clockWords, lightAt, wordsOf } from "../src/views/home-props.mjs";
const homeBuild = lineCased(homeBuildUnchecked, "home");   // every body it builds goes through assertLineCase (report mode)
import { idleBuild } from "../src/views/idle-props.mjs";
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
const crate = (n, turn = 0) => ({ id: "c" + n, n, turn, at: T0, e: 3, d: 3, s: 4, pods: [], met: [], explored: 0, of: 0, lines: [] });
const build = (st, sv, over = {}) => homeBuild({ st, sv, settings, docked: S.docked(st), ui: {}, focus: null, time: 12 * 3600 + 41 * 60, date: { y: 2026, m: 9, d: 17 }, now: Date.now(), place: "", ...over }, spec, frameSpec);
const dock = (st, d = true) => { st.dock = { docked: d, at: T0 }; };
const portrait = (st) => st.sittingCrates.push({ id: "sit1", mibiId: st.mibis[0].id, pose: "stand", place: "meadow", start: 0, source: "x", painted: true, opened: false });

function scenes() {
  const out = {};
  { const st = world(); dock(st); out.empty = { st, sv: sv0() }; }
  { const st = world(); dock(st); S.seedAdults(st, "S01", 5, 4, settings); const [a, b] = st.mibis; out.docked = { st, sv: sv0({ carried: [a.id, b.id] }) }; }
  { const st = world(); dock(st, false); S.seedAdults(st, "S01", 5, 3, settings); out.away = { st, sv: sv0({ carried: [st.mibis[0].id] }) }; }
  { const st = world(); dock(st); S.seedAdults(st, "S01", 5, 2, settings); out.crates = { st, sv: sv0({ bay: [crate(1), crate(2)] }) }; }
  { const st = world(); dock(st); pod(st, "S01"); pod(st, "S01", 6, false); out.pods = { st, sv: sv0() }; }
  { const st = world(); dock(st); out.waiting = { st, sv: sv0() }; st.waiting.push({ id: "w1" }); }
  { const st = world(); dock(st); S.seedAdults(st, "S01", 5, 2, settings); portrait(st); out.portrait = { st, sv: sv0({ bay: [crate(1)] }) }; }
  return out;
}

test("Home's props validate against home.props.json in every scene, name no rectangle, and fit the budget", () => {
  for (const [name, { st, sv }] of Object.entries(scenes())) {
    const b = build(st, sv), bad = validate(b.props, schema);
    assert.deepEqual(bad, [], `${name}: ${bad.slice(0, 3).join("; ")}`);
    const json = JSON.stringify(b.props);
    assert.ok(!/"(x|y|w|h|rect|at|size|box|pitch)"\s*:/.test(json), `${name}: props name what, never where`);
    assert.ok(json.length < 8 * 1024, `${name}: ${json.length} bytes`); assert.ok(b.requests.some((r) => r.id === b.props.regions.glass.picture), "the window's painting of the light is asked for; the bar, the lamps and the cap are the frame's"); const ids = new Set(b.requests.map((r) => r.id)); for (const p of b.props.regions.residents) assert.ok(ids.has(p.picture), `${name}: ${p.id}'s picture is asked for`);
  }
});

test("the targets are the two bezels and the four stations, in that order; the ring is on the focus or on the room, and at rest on nothing", () => {
  const { st, sv } = scenes().docked, b = build(st, sv), ids = ["vivarium", "library", "pods", "incubator", "companion", "bay"];
  assert.deepEqual(b.props.focus.targets, ids.map((id) => ({ id, group: id }))); assert.equal(b.props.focus.cur, "room");
  for (const id of ids) assert.equal(build(st, sv, { focus: id }).props.focus.cur, id);
  for (const gone of ["resident.1", "knob", "cargo", "probe", "nobody"]) assert.equal(build(st, sv, { focus: gone }).props.focus.cur, "room", `${gone} is not a target: the ring goes to the room`);
});

test("the top bar's words: the date as Sat 17 Oct and the clock as 24 hours from the device's, the place name when the save has one", () => {
  assert.equal(dateWords({ y: 2026, m: 9, d: 17 }), "Sat 17 Oct"); assert.equal(dateWords({ y: 2026, m: 0, d: 1 }), "Thu 1 Jan"); assert.equal(dateWords({ y: 2024, m: 1, d: 29 }), "Thu 29 Feb");
  assert.equal(clockWords(9 * 3600 + 41 * 60 + 59), "09:41"); assert.equal(clockWords(0), "00:00"); assert.equal(clockWords(23 * 3600 + 59 * 60), "23:59");
  const { st, sv } = scenes().docked, r = build(st, sv).props.regions.bar; assert.deepEqual(r, { place: "", date: "Sat 17 Oct", clock: "12:41" });
  assert.equal(build(st, sv, { place: "Burrow Station" }).props.regions.bar.place, "Burrow Station");
});

test("the needs hold in the spec's order: crates, the bud, a portrait, a new mibi to meet, new pods, glinting pods, pods waiting for a well, a pod that could be incubated; a soft need is not a need", () => {
  const needs = (st, sv, ui = {}) => homeNeeds(st, sv, settings, ui, Date.now() + 1000).map((n) => n.key), sc = scenes();
  assert.deepEqual(spec.strings.line.order, ["crates", "budReady", "portrait", "meet", "newPods", "glints", "waitingPods", "couldGrow"]);
  assert.deepEqual(needs(sc.empty.st, sc.empty.sv), []); assert.deepEqual(needs(sc.crates.st, sc.crates.sv), ["crates"]); assert.deepEqual(needs(sc.crates.st, { ...sc.crates.sv, bay: [] }), []); assert.deepEqual(needs(sc.away.st, sc.away.sv), [], "away: the crates are not in the bay");
  assert.deepEqual(needs(sc.waiting.st, sc.waiting.sv), ["waitingPods"]); assert.deepEqual(needs(sc.portrait.st, sc.portrait.sv), ["crates", "portrait"]);
  { const st = world(); dock(st); S.seedAdults(st, "S01", 5, 2, settings); st.bud = { kind: "founder", species: "S01", start: Date.now() - 1e8, minutes: 5 }; portrait(st); st.waiting.push({ id: "w" }); pod(st, "S01", 5, false);
    assert.deepEqual(needs(st, sv0({ bay: [crate(1)] }), { meet: st.mibis[0].id }), ["crates", "budReady", "portrait", "meet", "newPods", "waitingPods"], "every need, in order"); }
  { const st = world(); dock(st); const p = pod(st, "S01", 5, false); assert.deepEqual(needs(st, sv0()), ["newPods"]); p.seen = 1; assert.deepEqual(needs(st, sv0()), [], "seen: soft, the goal takes the line"); }
  { const st = world(); dock(st); S.seedAdults(st, "S01", 5, 1, settings); const p = pod(st, "S01"); p.read = [frameOf("S01").chapters[0].id]; p.seen = 1; assert.deepEqual(needs(st, sv0()), ["couldGrow"], "a pod that can be incubated, the price in hand"); st.e = 0; assert.deepEqual(needs(st, sv0()), [], "short of the price: no need"); }
});

test("the line at rest: at most two needs, the first by its action and the second by its notice; with none, the goal; the verb of a target on a focus; the Companion away says it is on a trip", () => {
  const sc = scenes(), line = (x, over) => build(x.st, x.sv, over).props.regions.line;
  assert.deepEqual(line(sc.crates), { needs: ["Open the Bay"] }); assert.deepEqual(line(sc.portrait), { needs: ["Open the Bay", "A portrait waits in the Bay"] }, "walk crates and a portrait: the action, then the portrait's notice; no name");
  { const st = world(); dock(st); S.seedAdults(st, "S01", 5, 2, settings); st.bud = { kind: "founder", species: "S01", start: Date.now() - 1e8, minutes: 5 }; portrait(st); assert.deepEqual(line({ st, sv: sv0({ bay: [crate(1), crate(2)] }) }), { needs: ["Open the Bay", "The bud is ready"] }, "two at most, the example of the spec; each zone a line with its capital"); }
  { const st = world(); dock(st); S.seedAdults(st, "S01", 5, 2, settings); portrait(st); assert.deepEqual(line({ st, sv: sv0() }), { needs: ["Open the Bay"] }, "a portrait alone: the Bay's action"); st.waiting.push({ id: "w1" }); assert.deepEqual(line({ st, sv: sv0() }), { needs: ["Open the Bay", "The Pods rack is full"] }, "then the next need's notice"); dock(st, false); assert.deepEqual(line({ st, sv: sv0() }), { needs: ["Open the Bay", "The Pods rack is full"] }, "away, a portrait still waits"); }
  { const st = world(); dock(st); S.seedAdults(st, "S01", 5, 2, settings); st.bud = { kind: "founder", species: "S01", start: Date.now() - 1e8, minutes: 5 }; portrait(st); assert.deepEqual(line({ st, sv: sv0() }), { needs: ["Open the bud", "A portrait waits in the Bay"] }, "a ready bud takes the first slot, the portrait the second"); }
  { const { st, sv } = sc.docked; assert.ok(line({ st, sv }).goal, "nothing needs the player: the goal"); }
  for (const [id, verb] of Object.entries({ vivarium: "Go to the Vivarium", library: "Go to the Library", pods: "Go to Pods", incubator: "Go to the Incubator", companion: "Go to the Probe bench", bay: "Open the Bay" })) assert.deepEqual(line(sc.docked, { focus: id }), { verb }, id);
  assert.deepEqual(line(sc.away, { focus: "companion" }), { note: "The Companion is on a trip" }); assert.deepEqual(line(sc.away, { focus: "bay" }), { verb: "Open the Bay" });
});

test("the stations' words and lamps: Pods, the Incubator in each state, the Companion docked and away, the Bay waiting and clear, a portrait crate in", () => {
  const sc = scenes(), R = (x, over) => build(x.st, x.sv, over).props.regions, W = ({ wells, capsule, picture, plates, crates, pictures, ...words }) => words;   // the words and states; the pictures are asserted below
  assert.deepEqual(W(R(sc.empty).pods), { line1: "empty", line2: "", lamp: "off", slots: 0 }); assert.deepEqual(W(R(sc.pods).pods), { line1: "2 in the case", line2: "", lamp: "needsYou", slots: 2 }, "a new pod unread: amber");
  assert.deepEqual([R(sc.empty).incubator.state, R(sc.empty).incubator.line1, R(sc.empty).incubator.lamp], ["empty", "empty", "off"]);
  { const st = world(); dock(st); S.seedAdults(st, "S01", 5, 1, settings); const p = pod(st, "S01"); p.read = [frameOf("S01").chapters[0].id]; p.seen = 1; const i = R({ st, sv: sv0() }).incubator; assert.deepEqual([i.line1, i.line2], ["empty", "a pod can incubate"]); }
  { const st = world(); dock(st); st.bud = { kind: "founder", species: "S01", start: Date.now(), minutes: 5 }; const i = R({ st, sv: sv0() }).incubator; assert.deepEqual([i.state, i.line1, i.line2, i.lamp], ["growing", "a bud growing", "a Loika", "off"]); st.bud.start = Date.now() - 1e8; const r = R({ st, sv: sv0() }).incubator; assert.deepEqual([r.state, r.line1, r.line2, r.lamp], ["ready", "the bud is ready", "a Loika", "needsYou"]); }
  { const c = R(sc.docked).companion; assert.equal(c.state, "docked"); assert.match(c.line1, /^\S+ at home$/); assert.equal(c.line2, ""); assert.equal(c.lamp, "off", "never amber: the dock lights the Bay"); }
  { const c = R(sc.away).companion; assert.equal(c.state, "away"); assert.match(c.line1, /^\S+ on a trip$/); assert.equal(c.line2, ""); }
  assert.deepEqual(W(R(sc.empty).companion), { state: "docked", line1: "at home", line2: "", lamp: "off" }, "no one carried: no name to say");
  assert.deepEqual(W(R(sc.crates).bay), { state: "waiting", berths: 3, line1: "2 crates in", line2: "from the last trip", lamp: "needsYou" });
  assert.deepEqual(W(R(sc.empty).bay), { state: "clear", berths: 3, line1: "berths clear", line2: "", lamp: "off" }); assert.deepEqual(R(sc.away).bay.line1, "berths clear", "away: the berths are clear");
  assert.deepEqual(W(R(sc.portrait).bay), { state: "waiting", berths: 4, line1: "a crate in", line2: "from the last trip", lamp: "needsYou" });
  { const b = R({ st: sc.portrait.st, sv: { ...sc.portrait.sv, bay: [] } }).bay; assert.deepEqual([b.state, b.berths, b.line1, b.lamp], ["waiting", 4, "a portrait in", "needsYou"]); assert.match(b.line2, /^(.+'s portrait|from a sitting)$/, "a portrait alone: whose it is, or where from"); }
  assert.equal(R({ st: sc.crates.st, sv: { ...sc.crates.sv, bay: [crate(1, 1), crate(2, 2), crate(3, 2)] } }).bay.line2, "from 2 trips");  // the console's pictures (build spec 4.3, 11.4): ids of the signed masters and of the rack pods, the capsule's layers, the plates
  { const p = R(sc.pods).pods; assert.equal(p.wells.length, 6); assert.deepEqual(p.wells.map((w) => !!w.pod), [true, true, false, false, false, false]); assert.ok(p.wells.slice(0, 2).every((w) => /^rackpod:/.test(w.pod))); assert.deepEqual(R(sc.empty).pods.wells, Array(6).fill({ pod: "", glint: "" })); }
  { const c = R(sc.docked).companion; assert.equal(c.picture, "companion-upright-docked-28x46:28x46"); assert.ok(c.plates.count >= 1 && c.plates.count <= 4 && c.plates.wholePicture === "home-shield-whole-12x24:12x24" && c.plates.lostPicture === "home-shield-lost-12x24:12x24"); const a = R(sc.away).companion; assert.equal(a.picture, "companion-upright-away-28x46:28x46"); assert.equal(a.plates, undefined, "away: no plates"); }
  { const b = R(sc.crates).bay; assert.deepEqual([b.crates, b.berths], [2, 3]); assert.deepEqual(b.pictures, { shut: "berth-shut-26x24:26x24", crate: "berth-crate-26x24:26x24", portrait: "berth-portrait-18x24:18x24" }); assert.equal(R(sc.empty).bay.crates, 0); assert.equal(R({ st: sc.crates.st, sv: { ...sc.crates.sv, bay: [crate(1, 1), crate(2, 1), crate(3, 1), crate(4, 1)] } }).bay.crates, 3, "at most three berths show a crate"); }
  { const st = world(); dock(st); S.seedAdults(st, "S01", 5, 1, settings); st.bud = { kind: "founder", species: "S01", start: Date.now(), minutes: 5 }; const g = R({ st, sv: sv0() }).incubator.capsule; assert.ok(g.pod && g.barPx >= 1 && g.barPx < 34, "growing: the bud's pod and a part of the bar"); st.bud.start = Date.now() - 1e8; const r = R({ st, sv: sv0() }).incubator.capsule; assert.equal(r.barPx, 34, "ready: the whole bar"); assert.equal(R(sc.empty).incubator.capsule.barPx, 0); assert.equal(R(sc.empty).incubator.capsule.pod, undefined); }
});

test("the Vivarium's readout: the mibis at home and on a trip, each part only when non-zero, 'all on a trip' when nobody is home, nothing with no mibi", () => {
  const sc = scenes(), ro = (x) => build(x.st, x.sv).props.regions.vivarium.readout;
  assert.equal(ro(sc.empty), ""); assert.equal(ro(sc.crates), "2 at home"); assert.equal(ro(sc.docked), "4 at home", "docked, the carried two are home too");
  assert.equal(ro(sc.away), "2 at home \u00b7 1 on a trip"); { const st = world(); dock(st, false); S.seedAdults(st, "S01", 5, 2, settings); assert.equal(ro({ st, sv: sv0({ carried: st.mibis.map((m) => m.id) }) }), "all on a trip"); }
});

test("the room's \u2713 is the first need's action: homeNeeds and state.needKey agree on every firm need, and a soft need leaves \u2713 with nothing to do", () => {
  for (const [name, { st, sv }] of Object.entries(scenes())) {
    const first = homeNeeds(st, sv, settings, {}, Date.now() + 1000)[0], k = S.needKey(st, sv, settings, {});
    if (first && first.key !== "portrait") { assert.equal(first.key, k?.key, name); assert.equal(first.act, k.act, name); }   // a portrait crate is not in needKey: the sitting crates were left out until the reveal was designed
    if (!first) assert.ok(!k || k.soft || ["couldGrow", "toRead", "budGrowing", "newPods"].includes(k.key), `${name}: ${k?.key}`);
  }
  const { st, sv } = scenes().docked; const m = st.mibis[0]; assert.equal(S.needKey(st, sv, settings, { meet: m.id }).key, "meet"); assert.deepEqual(build(st, sv, { ui: { meet: m.id } }).props.regions.line.needs, ["Meet " + m.name]);
});

test("the short notices carry each short material once, Energy before Essence, and ◆ for a read", () => {
  const mk = (e, sEss) => { const st = world(); dock(st); const p = pod(st, "S01"); p.read = [frameOf("S01").chapters[0].id]; st.e = e; st.s = sEss; st.d = 99; const c = S.growCost(st, {}, settings); return { st, c }; };
  const need = (st) => wordsOf(S.needKey(st, sv0(), settings, {}), spec).notice;   // the soft need's words (the notice zone shows the goal instead while there is one, below)
  { const { st, c } = mk(0, 99); assert.ok(c.e > 0); assert.match(need(st), /pod needs more ⚡$/); assert.equal((need(st).match(/⚡/g) || []).length, 1); }
  { const { st, c } = mk(99, 0); assert.ok(c.s > 0); assert.match(need(st), /pod needs more ❀$/); assert.ok(!/⚡/.test(need(st))); }
  { const { st } = mk(0, 0); assert.match(need(st), /pod needs more ⚡ ❀$/); }
  { const st = world(); dock(st); const p = pod(st, "S01"); st.d = 0; st.bud = { kind: "founder", species: "S01", start: Date.now(), minutes: 5 }; p.read = []; st.readEver = true; const n = need(st); assert.match(n, /^an? \S+ pod needs more ◆$/); assert.equal((n.match(/◆/g) || []).length, 1); }
});

// ---- the light by the clock (frame.json light): the hours ----
test("lightAt: the hour's light from frame.json light.from, the last wrapping midnight", () => {
  const L = frameSpec.light;
  for (const [h, want] of [[0, "night"], [5, "night"], [6, "dawn"], [7, "day"], [12, "day"], [17, "day"], [18, "dusk"], [19, "dusk"], [20, "night"], [23, "night"]]) assert.equal(lightAt(h, L), want, `${h}:00`);
});

// ---- the living window's shared selectors, through Idle's view (Idle and the Vivarium's whole use them; Home no longer shows residents) ----
const idle = (st, sv, over = {}) => idleBuild({ st, sv, settings, docked: S.docked(st), light: "day", ...over }, frameSpec);
test("the residents at home walk (a seed each), the carried set sleeps on the bed (a seed each too: its breath's phase, Station M1 §2.6), the bed is a PH plate in every state, the seed is the mibi's, the same every time", () => {
  const sc = scenes(), d = idle(sc.docked.st, sc.docked.sv).props.regions;
  assert.equal(d.residents.length, 2); assert.ok(d.residents.every((r) => r.seed > 0)); assert.ok(d.bed.sleepers.every((s) => s.seed > 0)); assert.notDeepEqual(d.bed.sleepers.map((s) => s.seed), d.residents.map((r) => r.seed)); assert.equal(d.bed.state, "docked"); assert.equal(d.bed.mark, "", "docked: no mark on the bed"); assert.match(d.bed.picture, /^home-bed-day-192x56/);
  const a = idle(sc.away.st, sc.away.sv).props.regions; assert.equal(a.bed.state, "away"); assert.deepEqual(a.bed.sleepers, []); assert.equal(a.bed.mark, "", "away: the bed's mark is not drawn");
  const n = idle(sc.empty.st, sc.empty.sv).props.regions; assert.equal(n.bed.state, "none"); assert.deepEqual(n.residents, []);
  assert.deepEqual(idle(sc.docked.st, sc.docked.sv).props.regions.residents.map((r) => r.seed), d.residents.map((r) => r.seed));
});
test("the light picks the pictures: Idle's painting and the bed are the masters of that light", () => {
  const sc = scenes();
  for (const light of ["dawn", "day", "dusk", "night"]) {
    const i = idle(sc.docked.st, sc.docked.sv, { light }), ids = i.requests.filter((r) => r.kind === "slot"), bed = ids.find((r) => r.id.startsWith("home-bed-")), viv = ids.find((r) => r.id.startsWith("idle-vivarium-"));
    assert.deepEqual([bed.id, bed.master], [`home-bed-${light}-192x56`, `home-bed-${light}-192x56`]); assert.deepEqual([viv.id, viv.master], [`idle-vivarium-${light}:1024x568`, `idle-vivarium-${light}-1024x568`]);
  }
});
test("every light of frame.light.from has its pictures on Idle and its bed, and no more", () => {
  const lights = frameSpec.light.from.map(([, l]) => l).sort();
  for (const m of [frameSpec.idle.light.pictures, frameSpec.light.bed]) assert.deepEqual(Object.keys(m).sort(), lights);
});
test("a mibi that grows up changes every picture id from :juvenile: to :adult: with the sleepers' size unchanged and a resident's following its stage (the residents and the sleepers on the bed)", () => {
  const st = world(); dock(st); S.seedAdults(st, "S01", 5, 4, settings); for (const m of st.mibis) { m.paint = { state: "landed" }; m.born = st.turn; }
  const ids = (b) => b.requests.filter((r) => r.kind === "mibi").map((r) => r.id), sv = sv0({ carried: [st.mibis[0].id, st.mibis[1].id] });
  const young = ids(idle(st, sv)); assert.ok(young.length >= 4 && young.every((id) => /^mibi:S\d+-[0-9a-f]{8}:juvenile:\d+x\d+$/.test(id)), young.join(" "));
  st.turn += settings.adultTurns ?? S.JUVENILE_TURNS; for (const m of st.mibis) assert.equal(S.mibiStage(st, m, settings), "adult");
  const grown = ids(idle(st, sv));
  assert.deepEqual(grown.map((id) => id.replace(/:adult:\d+x\d+$/, "")), young.map((id) => id.replace(/:juvenile:\d+x\d+$/, "")));
  assert.ok(young.some((id) => id.endsWith(":104x112")), young.join(" ")); grown.forEach((id, i) => assert.equal(id, young[i].replace(":juvenile:", ":adult:").replace(/:104x112$/, ":144x152"), `${young[i]} \u2192 ${id}`));
});
test("a picture id is keyed by the genome, not the mibi id: two worlds with the same mibi id and different genomes give different picture ids, the same genome the same id", () => {
  const mk = (gs) => { const st = world(); dock(st); S.seedAdults(st, "S01", gs, 1, settings); st.mibis[0].paint = { state: "landed" }; return st; };
  const a = mk(5), b = mk(6), c = mk(5), ids = (st) => idle(st, sv0({ carried: [st.mibis[0].id] })).requests.filter((r) => r.kind === "mibi").map((r) => r.id);
  assert.equal(a.mibis[0].id, b.mibis[0].id); assert.notEqual(a.mibis[0].genome && JSON.stringify(a.mibis[0].genome.loci), JSON.stringify(b.mibis[0].genome.loci));
  assert.notDeepEqual(ids(a), ids(b)); assert.deepEqual(ids(a), ids(c));
});

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

// ---- the goal in the line (frame.json strings.goal) ----
const G = frameSpec.strings.goal;
test("the goal: with no firm need the goal is the line; a first-group need keeps it", () => {
  // loop 2: the pair (Dot) is short of \u26a1 for the Loika pod it holds
  const st = world(); dock(st); const [dot] = S.seedAdults(st, "S01", 5, 1, settings).mibis; dot.name = "Dot"; st.e = 1;
  const lk = pod(st, "S01"); lk.read = [frameOf("S01").chapters[0].id]; lk.seen = 1;
  const b = build(st, sv0()); assert.deepEqual(b.props.regions.line, { goal: { text: "Go out for more", icons: "\u26a1", plain: "" } }); assert.equal(S.needKey(st, sv0(), settings, {}).key, "couldGrow", "needKey is unchanged");
  // a new pod (first group): the need as now, no goal
  const st2 = world(); dock(st2); S.seedAdults(st2, "S01", 5, 1, settings); pod(st2, "S01", 5, false);
  assert.deepEqual(build(st2, sv0()).props.regions.line, { needs: ["Look at the pods"] });
  // no goal: nothing at all (two adults, the guide complete, a bud growing)
  const st3 = world(); dock(st3); S.seedAdults(st3, "S01", 5, 2, settings); { const fr = frameOf("S01"); st3.readOnce.S01 = fr.chapters.map((c) => c.id); for (const ch of fr.chapters) for (const t of ch.traits) S.guideAdd(st3, "S01", t.id, traitLooks(fr, t)); } st3.bud = { kind: "founder", species: "S03", start: Date.now(), minutes: 5 };
  st3.probe = { tier: 2, shield: 3, smax: 3 }; assert.equal(S.goalKey(st3, sv0()), null); assert.deepEqual(build(st3, sv0()).props.regions.line, {});
});
test("the goal away reads the aim, and growUp counts the walks in words", () => {
  const st = world(); dock(st, false); const [dot] = S.seedAdults(st, "S01", 5, 1, settings).mibis; dot.name = "Dot";
  assert.equal(S.goalKey(st, sv0()).step.key, "findPod"); assert.deepEqual(build(st, sv0()).props.regions.line, { goal: { text: "Find a Loika pod", icons: "", plain: "" } }, "away, pair, findPod: only goOut reads the aim, so the step's own words show");
  const w = world(); dock(w, false); const [a, b2] = S.seedAdults(w, "S01", 5, 2, settings).mibis; a.name = "Dot"; b2.name = "Moss"; a.born = 1; b2.born = 2; w.turn = 2;
  assert.equal(build(w, sv0()).props.regions.line.goal.text, "Walks grow Dot up"); assert.equal(build(w, sv0()).props.regions.line.goal.plain, "Walks grow the pair up");
  dock(w, true); w.turn = 2; assert.equal(build(w, sv0()).props.regions.line.goal.text, "More walks grow the pair"); w.turn = 3; assert.equal(build(w, sv0()).props.regions.line.goal.text, "One more walk grows the pair");
});
test("goalWords: a name too wide falls back to the nameless sibling of the four keys that have one; the other keys have none", () => {
  const face = (goal, docked = true) => goalWords(goal, docked, frameSpec);
  assert.deepEqual(face({ key: "growUp", names: ["Dot", "Moss"], walks: 2, bondedWaits: true, step: { key: "goOut" } }), { text: "Dot grows with care", icons: "", plain: "The young mibi grows with care" });
  assert.deepEqual(face({ key: "guide", species: "S01", step: { key: "read", species: "S01", pod: "p", chapter: frameOf("S01").chapters[0].id, cost: 1 } }), { text: `Read ${frameOf("S01").chapters[0].name} on the Loika pod`, icons: "", plain: "" }, "the guide's read has no name, so no nameless sibling");
  assert.equal(face({ key: "guide", species: "S01", step: { key: "findPod", species: "S01" } }, false).text, "Find a Loika pod", "away, a findPod step reads its own words, not the aim");
  assert.deepEqual(face({ key: "readChild", name: "Dot", step: { key: "read", name: "Dot" } }), { text: "Read Dot's chapters", icons: "", plain: "Read the new mibi's chapters" });
  assert.equal(face({ key: "growUp", names: ["Dot", "Moss"], walks: 2, bondedWaits: false, step: { key: "goOut" } }, false).plain, "Walks grow the pair up");
  assert.equal(face({ key: "readChild", name: "Dot", step: { key: "goOut" } }, false).plain, "Read the new mibi's chapters");
  for (const goal of [{ key: "cross", names: ["Dot", "Moss"], step: { key: "cross" } }, { key: "firstPod", step: { key: "goOut" } }, { key: "pair", name: "Dot", species: "S01", step: { key: "identify", species: "S01" } }]) assert.equal(face(goal).plain, "", goal.key);
  assert.equal(face({ key: "firstMibi", step: { key: "short", icons: "◆ ⚡", from: "fieldAndBench" } }).text, "Go out and watch for more"); assert.equal(face({ key: "firstMibi", step: { key: "short", icons: "◆", from: "bench" } }).icons, "◆");
});

test("a mibi with no painting changes nothing on Home: the Incubator is empty with its lamp off (Grow paints nothing)", () => {
  const { st, sv } = scenes().docked; assert.ok(st.mibis.every((m) => !m.paint), "no mibi has a painting");
  const r = build(st, sv).props.regions; assert.equal(r.incubator.state, "empty"); assert.equal(r.incubator.lamp, "off");
});
test("the goal sentence names no species before it is known: identify a pod (fresh game), identify the Loika pod once Loikas are known; no warning words for an unknown species", () => {
  const sv = sv0({ carried: [] }), st = world(); st.dock = { docked: false, at: T0 }; pod(st, "S01", 5, false); assert.deepEqual(st.knownIds, []);
  const g = S.goalKey(st, sv, settings); assert.equal(g.step.key, "identify"); assert.equal(g.step.species, null);
  const w = goalWords(g, false, frameSpec); assert.ok(JSON.stringify(w).includes("Identify a pod") && !/Loika/.test(JSON.stringify(w)), JSON.stringify(w));
  assert.equal(frameSpec.strings.goal.step.identifyAny, "Identify a pod"); assert.equal(frameSpec.strings.goal.step.identify, "Identify the {species} pod");
  st.knownIds.push("S01"); st.tray.length = 0; pod(st, "S01", 6, false); const g2 = S.goalKey(st, sv, settings); assert.equal(g2.step.species, "S01"); assert.ok(/Identify the Loika pod/.test(JSON.stringify(goalWords(g2, false, frameSpec))));
});

test("the Vivarium window's props (build spec 3): the painting of the light, the residents at home (at most six, the carried too while docked), the event tag on the mibi to meet, the first mibi out in the away frame; nothing names a rectangle", () => {
  const sc = scenes(), W = (x, over) => build(x.st, x.sv, over).props.regions;
  for (const light of ["dawn", "day", "dusk", "night"]) assert.equal(W(sc.docked, { light }).glass.picture, `idle-vivarium-${light}:1024x568`, "the Idle painting the Vivarium uses: no new master");
  assert.equal(W(sc.docked).residents.length, 4, "docked: the carried two are at home and walk"); assert.equal(W(sc.docked).glass.away, undefined, "docked: no away frame");
  assert.equal(W(sc.away).residents.length, 2, "one of three is out on the trip"); const a = W(sc.away).glass.away; assert.ok(a && /^mibi:/.test(a.picture) && a.figure.length === 4, "the first mibi out, its stand and its figure");
  { const st = world(); dock(st); S.seedAdults(st, "S01", 5, 9, settings); const r = build(st, sv0()).props.regions; assert.equal(r.residents.length, 6, "nine at home: six show"); assert.match(r.vivarium.readout, /^9 at home$/, "the readout counts all nine"); assert.deepEqual(r.residents.map((p) => p.id), st.mibis.slice(0, 6).map((m) => String(m.id)), "every life event the same turn: ties in bay order"); }
  { const { st, sv } = sc.docked, id = st.mibis[2].id; assert.equal(W({ st, sv }, { ui: { meet: id } }).glass.tag, String(id)); assert.equal(W({ st, sv }).glass.tag, undefined, "no event, no tag"); }
  assert.ok(!("bed" in W(sc.docked)), "the bed leaves Home");
  assert.deepEqual(W(sc.empty).residents, []);
  // the newest life event, born or grown up (born + adultTurns): a mibi that grew up recently outranks one born more recently that has not grown up yet
  { const st = world(); dock(st); st.turn = 5; S.seedAdults(st, "S01", 5, 2, settings); const [a, b] = st.mibis; a.born = 3; b.born = 4; a.bay = 1; b.bay = 0;   // a grew up at turn 5 (3 + 2), b, born later, is still a juvenile (4 + 2 = 6)
    const one = JSON.parse(JSON.stringify(spec)); one.regions.resident.max = 1; const ids = (sp, over = {}) => homeBuild({ st, sv: sv0(), settings, docked: true, ui: over, focus: null, time: 43200, date: { y: 2026, m: 9, d: 17 }, now: Date.now(), place: "" }, sp, frameSpec).props.regions.residents.map((p) => p.id);
    assert.deepEqual(ids(one), [String(a.id)], "grown up at 5 outranks born at 4"); assert.deepEqual(ids(one, { meet: b.id }), [String(b.id)], "the mibi being met first");
    b.born = 2; assert.deepEqual(ids(one), [String(a.id)], "born 2, grown up 4: a still first"); b.born = 3; assert.deepEqual(ids(one), [String(b.id)], "the same event turn: bay order (b is in bay 0)"); }
});
