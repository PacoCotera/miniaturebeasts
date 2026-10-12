// The Vivarium's whole as props (lvgl-switch.md §2.1, §4 V; vivarium.json): the view the face takes, views/vivarium-props.mjs, in Node. Plain JSON that names what and never where: it validates against vivarium.props.json in every scene,
// holds no rectangle, fits the props budget, lists every mibi at home as a walker and the docked carried set as sleepers, a tile a bay (housed, out, free), the targets in bay order and the ring where the way in puts it.
//   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { vivariumBuild } from "../src/views/vivarium-props.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames"), specs = path.resolve(here, "../../ui/specs/station");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const J = (f) => JSON.parse(readFileSync(path.join(specs, f), "utf8")), spec = J("vivarium.json"), frameSpec = J("frame.json"), home = J("home.json"), schema = J("vivarium.props.json");
const T0 = 1_000_000, cfg = (bays) => ({ ...S.DEFAULT_SETTINGS, economy: "decided", bays });

function validate(v, sc, at = "$", out = []) {
  if (sc.$ref) return validate(v, schema.$defs[sc.$ref], at, out);
  if (sc.oneOf) { const ok = sc.oneOf.filter((o) => validate(v, o, at, []).length === 0).length; if (ok !== 1) out.push(`${at}: matches ${ok} of oneOf`); return out; }   // the moving prop: "" or one object form (Station M1 §2.2)
  if (sc.enum && !sc.enum.includes(v)) { out.push(`${at}: ${JSON.stringify(v)} is not one of ${JSON.stringify(sc.enum)}`); return out; }
  if (sc.type) {
    const ts = [].concat(sc.type), ty = v === null ? "null" : Array.isArray(v) ? "array" : Number.isInteger(v) ? "integer" : typeof v;
    if (!ts.includes(ty) && !(ty === "integer" && ts.includes("number"))) { out.push(`${at}: a ${ty}, wanted ${ts.join(" or ")}`); return out; }
  }
  if (Array.isArray(v) && sc.maxItems !== undefined && v.length > sc.maxItems) out.push(`${at}: more than ${sc.maxItems}`);
  if (Array.isArray(v) && sc.items) v.forEach((x, i) => validate(x, sc.items, `${at}[${i}]`, out));
  if (v && typeof v === "object" && !Array.isArray(v)) {
    for (const k of sc.required ?? []) if (!(k in v)) out.push(`${at}: ${k} is required`);
    for (const [k, x] of Object.entries(v)) { const p = sc.properties?.[k]; if (p) validate(x, p, `${at}.${k}`, out); else if (sc.additionalProperties && typeof sc.additionalProperties === "object") validate(x, sc.additionalProperties, `${at}.${k}`, out); else if (sc.additionalProperties === false) out.push(`${at}: ${k} is not a prop`); }
  }
  return out;
}
const world = (bays = 8) => { const st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = 99; st.d = 99; st.s = 99; st.firstMibi = false; return { st, settings: cfg(bays) }; };
const sv0 = (over = {}) => ({ v: 8, seed: 7, wid: "w1", turn: 0, bay: [], mibis: [], carried: [], tier: 1, shield: 3, ...over });
const dock = (st, d = true) => { st.dock = { docked: d, at: T0 }; };
const build = ({ st, settings }, sv, over = {}) => vivariumBuild({ st, sv, settings, docked: S.docked(st), light: "day", focus: null, seen: null, ...over }, spec, frameSpec, home);
const mibis = (w, n) => { S.seedAdults(w.st, "S01", 5, n, w.settings); for (const m of w.st.mibis) m.paint = { state: "landed" }; return w.st.mibis; };   // every painting has landed unless a test says otherwise

function scenes() {
  const out = {};
  { const w = world(6); dock(w.st); out.empty = { w, sv: sv0() }; }
  { const w = world(6); dock(w.st, false); out.emptyAway = { w, sv: sv0() }; }
  { const w = world(); dock(w.st); const m = mibis(w, 7); out.docked = { w, sv: sv0({ carried: [m[5].id, m[6].id] }) }; }
  { const w = world(); dock(w.st, false); const m = mibis(w, 7); out.away = { w, sv: sv0({ carried: [m[5].id, m[6].id] }) }; }
  { const w = world(12); dock(w.st); mibis(w, 12); out.twelve = { w, sv: sv0() }; }
  { const w = world(); dock(w.st); const m = mibis(w, 3); out.noneCarried = { w, sv: sv0() }; }
  return out;
}

test("the whole's props validate against vivarium.props.json in every scene, name no rectangle, and fit the budget", () => {
  for (const [name, { w, sv }] of Object.entries(scenes())) {
    const b = build(w, sv), bad = validate(b.props, schema);
    assert.deepEqual(bad, [], `${name}: ${bad.slice(0, 3).join("; ")}`);
    const json = JSON.stringify(b.props);
    assert.ok(!/"(x|y|w|h|rect|at|size|box|pitch)"\s*:/.test(json), `${name}: props name what, never where`);
    assert.ok(json.length + JSON.stringify(b.line).length < 8 * 1024, `${name}: ${json.length} bytes`);
  }
});

test("every mibi at home walks (a seed each, in bay order), the docked carried set sleeps on the bed, an out mibi is only a tile; a tile a bay, housed first then free", () => {
  const S0 = scenes();
  { const { w, sv } = S0.docked, b = build(w, sv).props, R = b.regions;
    assert.equal(b.state, "rest"); assert.equal(R.residents.length, 5); assert.ok(R.residents.every((p) => Number.isInteger(p.seed) && p.seed !== 0)); assert.equal(R.bed.state, "docked"); assert.equal(R.bed.sleepers.length, 2); assert.equal(R.bed.mark, "");
    assert.equal(R.tiles.items.length, 8); assert.deepEqual(R.tiles.items.map((t) => t.state), ["housed", "housed", "housed", "housed", "housed", "housed", "housed", "free"]); assert.ok(R.tiles.items[0].picture.startsWith("mibi:")); }
  { const { w, sv } = S0.away, b = build(w, sv).props, R = b.regions;
    assert.equal(R.residents.length, 5, "the carried two are not in the window"); assert.equal(R.bed.state, "away"); assert.equal(R.bed.sleepers.length, 0); assert.ok(R.bed.mark.length, "the Companion's mark on the bed");
    assert.deepEqual(R.tiles.items.map((t) => t.state), ["housed", "housed", "housed", "housed", "housed", "out", "out", "free"]); assert.equal(R.tiles.items[5].picture, "", "an out tile shows the glyph, not a thumbnail"); assert.equal(R.tiles.glyph, "frame-companion-outline-16x24"); }
  { const { w, sv } = S0.noneCarried, b = build(w, sv).props; assert.equal(b.regions.bed.state, "none"); assert.equal(b.regions.residents.length, 3); }
  { const { w, sv } = S0.twelve, b = build(w, sv).props; assert.equal(b.regions.residents.length, 12); assert.equal(b.regions.tiles.items.length, 12); }
  { const { w, sv } = S0.empty, b = build(w, sv).props; assert.equal(b.state, "empty"); assert.equal(b.regions.residents.length, 0); assert.equal(b.regions.tiles.items.length, 6); assert.deepEqual([b.regions.bed.state, b.regions.bed.mark, b.regions.bed.sleepers.length], ["none", "", 0], "the nest alone while docked"); assert.ok(b.regions.tiles.items.every((t) => t.state === "free")); assert.deepEqual(b.focus.targets, []); assert.equal(b.focus.cur, "room"); }
  { const { w, sv } = S0.emptyAway, b = build(w, sv).props; assert.equal(b.state, "empty"); assert.equal(b.regions.bed.state, "away"); assert.ok(b.regions.bed.mark.length, "the nest and its mark while away"); assert.equal(b.regions.tiles.glyph, "frame-companion-outline-16x24"); }
});

test("the targets are the residents in bay order (sleepers in their bays' places) then the tiles; the ring starts on the mibi last seen up close (its resident, else its tile), else the first resident, else the first tile, else the room", () => {
  const S0 = scenes();
  { const { w, sv } = S0.docked, b = build(w, sv), ids = b.props.focus.targets.map((t) => t.id), m = w.st.mibis;
    assert.deepEqual(ids, [...m.map((x) => "resident." + x.id), ...m.map((x) => "tile." + x.id)], "every housed mibi is a resident (the sleepers too) and a tile");
    assert.equal(b.props.focus.cur, "resident." + m[0].id, "none seen yet: the first resident in bay order");
    assert.equal(build(w, sv, { seen: m[3].id }).props.focus.cur, "resident." + m[3].id);
    assert.equal(build(w, sv, { seen: m[6].id }).props.focus.cur, "resident." + m[6].id, "a sleeper's resident");
    assert.equal(build(w, sv, { focus: "tile." + m[2].id }).props.focus.cur, "tile." + m[2].id, "the ring where the face left it");
    assert.equal(build(w, sv, { focus: "tile.nobody", seen: m[1].id }).props.focus.cur, "resident." + m[1].id, "a ring on nothing present takes the way in"); }
  { const { w, sv } = S0.away, b = build(w, sv), m = w.st.mibis, ids = b.props.focus.targets.map((t) => t.id);
    assert.deepEqual(ids, [...m.slice(0, 5).map((x) => "resident." + x.id), ...m.map((x) => "tile." + x.id)], "an out mibi is a tile and no resident");
    assert.equal(build(w, sv, { seen: m[5].id }).props.focus.cur, "tile." + m[5].id, "last seen out: its tile");
    const t = build(w, sv, { focus: "tile." + m[5].id }), r = t.props.focus.resolve; assert.equal(r["resident.of"], "", "an out tile's resident is null: the graph takes the first resident");
    assert.equal(t.line.ok, "Look at " + m[5].name); assert.equal(t.line.subject, "out with the Companion"); assert.equal(t.line.back, "Home");
    const res = build(w, sv, { focus: "resident." + m[0].id }); assert.equal(res.props.focus.resolve["tile.of"], "tile." + m[0].id); assert.match(res.line.subject, /^an? (young|adult|elder) /); }
  { const { w, sv } = S0.docked, m = w.st.mibis, tl = build(w, sv, { focus: "tile." + m[1].id }); assert.equal(tl.props.focus.resolve["resident.of"], "resident." + m[1].id); const sl = build(w, sv, { focus: "resident." + m[6].id }); assert.match(sl.line.subject, /, asleep$/); }
  { const { w, sv } = S0.empty, b = build(w, sv); assert.equal(b.line.ok, null); assert.equal(b.line.subject, "nobody lives here yet"); assert.equal(b.line.back, "Home"); }
});

test("the window's picture is Idle's painting of the light (no slot of its own), a painting on its way is no longer the line's context (Grow paints nothing)", () => {
  const { w, sv } = scenes().docked;
  for (const light of ["dawn", "day", "dusk", "night"]) { const b = build(w, sv, { light }), id = b.props.regions.window.picture; assert.equal(id, `idle-vivarium-${light}:1024x568`); assert.ok(b.requests.some((r) => r.id === id && r.kind === "slot")); assert.ok(!b.requests.some((r) => /vivarium-whole/.test(r.id)), "no register entry of its own"); }
  const id = w.st.mibis[0].id; w.st.mibis[0].paint = { state: "sent" };
  assert.notEqual(build(w, sv, { focus: "resident." + id }).line.subject, "its painting is on its way");
});

test("a mibi that grows up changes every picture id from :juvenile: to :adult: with the tiles' and sleepers' size unchanged and a resident's following its stage (the whole's residents, the sleepers and the tiles)", () => {
  const w = world(); dock(w.st); const m = mibis(w, 4); for (const x of m) x.born = w.st.turn;
  const ids = (b) => b.requests.filter((r) => r.kind === "mibi").map((r) => r.id), sv = sv0({ carried: [m[2].id, m[3].id] });
  const young = ids(build(w, sv)); assert.ok(young.length >= 6 && young.every((id) => /^mibi:S\d+-[0-9a-f]{8}:juvenile:\d+x\d+$/.test(id)), young.join(" "));
  w.st.turn += w.settings.adultTurns ?? S.JUVENILE_TURNS; for (const x of m) assert.equal(S.mibiStage(w.st, x, w.settings), "adult");
  const grown = ids(build(w, sv));
  // every id has the stage swapped; a resident's size is its stage's (home.json sizes: a juvenile's 104×112, an adult's 144×152), the sleepers' and the tiles' size does not change with it
  assert.deepEqual(grown.map((id) => id.replace(/:adult:\d+x\d+$/, "")), young.map((id) => id.replace(/:juvenile:\d+x\d+$/, "")));
  assert.ok(young.some((id) => id.endsWith(":104x112")) && young.some((id) => id.endsWith(":96x88")), young.join(" ")); grown.forEach((id, i) => assert.equal(id, young[i].replace(":juvenile:", ":adult:").replace(/:104x112$/, ":144x152"), `${young[i]} → ${id}`));
});

// ---- Station M1 §2.6: residents with moving sets and their rest fit vivarium.props.json ----
import { setMoving } from "../src/moving.mjs";
{ const ix = J("moving/index.json"), sets = {}; for (const id of ix.sets) sets[id] = J(`moving/${id}.json`); setMoving(sets); }
test("the whole's residents with moving sets fit vivarium.props.json: moving and rest (asleep at 23:00, awake at 12:00); with the play gate shut, none", () => {
  const { w, sv } = scenes().docked, rules = spec.rules.rest;
  for (const [time, want] of [[23 * 3600, "asleep"], [12 * 3600, "awake"]]) { const b = build(w, sv, { time, restRules: rules, motionSets: true }); assert.deepEqual(validate(b.props, schema), []); assert.ok(b.props.regions.residents.every((r) => r.moving?.walk && r.moving?.shadow && r.rest === want)); assert.ok(b.requests.some((q) => q.kind === "moving")); }
  assert.ok(build(w, sv, { time: 12 * 3600, restRules: rules, motionSets: false }).props.regions.residents.every((r) => !r.moving));
});
