// The Vivarium's whole as props (lvgl-switch.md §2.1, §4 V; vivarium.json): the view the face takes, views/vivarium-props.mjs, in Node. Plain JSON that names what and never where: it validates against vivarium.props.json in every scene,
// holds no rectangle, fits the props budget, lists every mibi at home as a walker and the docked carried set as sleepers, a tile a bay (housed, out, free), the targets in bay order and the ring where the way in puts it.
//   node --test prototypes/station/tests/
import { lineCased } from "./fixtures/line-case.mjs";
import "./fixtures/rooms.mjs";   // the rooms spec, as the page registers it
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { vivariumBuild as vivariumBuildUnchecked } from "../src/views/vivarium-props.mjs";
const vivariumBuild = lineCased(vivariumBuildUnchecked, "vivarium");   // every body it builds goes through assertLineCase (report mode)
import { loadStandLayersFs, loadStandLooksFs, unloadStands } from "../tools/stand-layers-fs.mjs";
import { placeMaster, dropAsset } from "../../ui/assets.mjs";
import { layeredStand, composeStand, inkBox } from "../src/layered-stand.mjs";
import { keepOutOf, measureCurls } from "../tools/curl-measure.mjs";
import { decodePNG } from "../../ui/png.mjs";
import { G, UI, SPECS } from "../src/game.mjs";
import { createHost, onFaceMessage, screenProps, showRoom } from "../src/host.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames"), specs = path.resolve(here, "../../ui/specs/station");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const J = (f) => JSON.parse(readFileSync(path.join(specs, f), "utf8")), spec = J("vivarium.json"), frameSpec = J("frame.json"), home = J("home.json"), schema = J("vivarium.props.json");
const T0 = 1_000_000, cfg = (rooms) => ({ ...S.DEFAULT_SETTINGS, economy: "decided", rooms });

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
const world = (rooms = 1) => { const st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = 99; st.d = 99; st.s = 99; st.firstMibi = false; return { st, settings: cfg(rooms) }; };
const sv0 = (over = {}) => ({ v: 8, seed: 7, wid: "w1", turn: 0, bay: [], mibis: [], carried: [], tier: 1, shield: 3, ...over });
const dock = (st, d = true) => { st.dock = { docked: d, at: T0 }; };
const pods = J("pods.json");
const build = ({ st, settings }, sv, over = {}) => vivariumBuild({ st, sv, settings, docked: S.docked(st), light: "day", focus: null, seen: null, time: 12 * 3600, now: T0 + 12 * 3600 * 1000, rules: spec.rules, ...over }, spec, frameSpec, home, pods);
const mibis = (w, n) => { S.seedAdults(w.st, "S01", 5, n, w.settings); for (const m of w.st.mibis) m.paint = { state: "landed" }; return w.st.mibis; };   // every painting has landed unless a test says otherwise

function scenes() {
  const out = {};
  { const w = world(1); dock(w.st); out.empty = { w, sv: sv0() }; }
  { const w = world(1); dock(w.st, false); out.emptyAway = { w, sv: sv0() }; }
  { const w = world(); dock(w.st); const m = mibis(w, 7); out.docked = { w, sv: sv0({ carried: [m[5].id, m[6].id] }) }; }
  { const w = world(); dock(w.st, false); const m = mibis(w, 7); out.away = { w, sv: sv0({ carried: [m[5].id, m[6].id] }) }; }
  { const w = world(2); dock(w.st); mibis(w, 12); out.twelve = { w, sv: sv0() }; }
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

test("every shown mibi at home walks (a seed each, in bay order); a carried mibi (docked or away) is never drawn: no resident, no sleeper, a dimmed tile with the Companion glyph by where it is; a tile a place, housed first then free", () => {
  const S0 = scenes();
  { const { w, sv } = S0.docked, b = build(w, sv).props, R = b.regions;
    assert.equal(b.state, "rest"); assert.equal(R.residents.length, 5); assert.ok(R.residents.every((p) => Number.isInteger(p.seed) && p.seed !== 0)); assert.equal(R.bed.state, "empty"); assert.equal(R.bed.sleepers.length, 0); assert.ok(!("mark" in R.bed), "R4b: no Companion mark");
    assert.equal(R.tiles.items.length, 8); assert.deepEqual(R.tiles.items.map((t) => t.state), ["housed", "housed", "housed", "housed", "housed", "out", "out", "free"], "docked: the carried two keep their places"); assert.deepEqual(R.tiles.items.slice(5, 7).map((t) => t.where), ["docked", "docked"]); assert.ok(R.tiles.items[0].picture.startsWith("mibi:")); assert.ok(R.tiles.items[5].picture.startsWith("mibi:"), "a carried tile keeps its thumbnail (drawn dimmed)");
    for (const m of sv.carried) assert.ok(!R.residents.some((p) => p.id === String(m)) && !b.focus.targets.some((t) => t.id === "resident." + m), "a carried mibi is neither a resident nor a target"); assert.equal(R.tiles.glyphDocked, "frame-companion-solid-16x24"); }
  { const { w, sv } = S0.away, b = build(w, sv).props, R = b.regions;
    assert.equal(R.residents.length, 5, "the carried two are not in the window"); assert.equal(R.bed.state, "empty"); assert.equal(R.bed.sleepers.length, 0);
    assert.deepEqual(R.tiles.items.map((t) => t.state), ["housed", "housed", "housed", "housed", "housed", "out", "out", "free"]); assert.deepEqual(R.tiles.items.slice(5, 7).map((t) => t.where), ["away", "away"]); assert.ok(R.tiles.items[5].picture.startsWith("mibi:"), "an out tile keeps its thumbnail beside the glyph"); assert.equal(R.tiles.glyph, "frame-companion-outline-16x24"); }
  { const { w, sv } = S0.noneCarried, b = build(w, sv).props; assert.equal(b.regions.bed.state, "empty"); assert.equal(b.regions.residents.length, 3); }
  { const { w, sv } = S0.twelve, b = build(w, sv).props; assert.equal(b.regions.residents.length, 8, "a room shows its eight"); assert.equal(b.regions.tiles.items.length, 8); assert.ok(b.regions.tiles.items.every((t) => t.state === "housed")); w.st.face.room = 1; const o = build(w, sv).props; assert.equal(o.regions.residents.length, 4, "the second room: the other four"); assert.deepEqual(o.regions.tiles.items.map((t) => t.state), ["housed", "housed", "housed", "housed", "free", "free", "free", "free"]); w.st.face.room = 0; }
  { const { w, sv } = S0.empty, b = build(w, sv).props; assert.equal(b.state, "empty"); assert.equal(b.regions.residents.length, 0); assert.equal(b.regions.tiles.items.length, 8); assert.deepEqual([b.regions.bed.state, b.regions.bed.sleepers.length], ["empty", 0], "the nest alone"); assert.ok(b.regions.tiles.items.every((t) => t.state === "free")); assert.deepEqual(b.focus.targets, [{ id: "room.0", group: "room" }, { id: "room.new", group: "room" }], "no resident or place: the chips are the targets"); assert.equal(b.focus.cur, "room"); }
  { const { w, sv } = S0.emptyAway, b = build(w, sv).props; assert.equal(b.state, "empty"); assert.equal(b.regions.bed.state, "empty"); assert.equal(b.regions.tiles.glyph, "frame-companion-outline-16x24"); }
});

test("the targets are the shown residents in bay order (the resters on the bed in their places) then the tiles; the ring starts on the mibi last seen up close (its resident, else its tile), else the first resident, else the first tile, else the room", () => {
  const S0 = scenes();
  { const { w, sv } = S0.docked, b = build(w, sv), ids = b.props.focus.targets.map((t) => t.id), m = w.st.mibis;
    assert.deepEqual(ids, [...m.slice(0, 5).map((x) => "resident." + x.id), ...m.map((x) => "tile." + x.id), "room.0", "room.new"], "every housed mibi is a tile; the carried two are no resident");
    assert.equal(b.props.focus.cur, "resident." + m[0].id, "none seen yet: the first resident in bay order");
    assert.equal(build(w, sv, { seen: m[3].id }).props.focus.cur, "resident." + m[3].id);
    assert.equal(build(w, sv, { seen: m[6].id }).props.focus.cur, "tile." + m[6].id, "a carried mibi last seen: its tile");
    assert.equal(build(w, sv, { focus: "tile." + m[2].id }).props.focus.cur, "tile." + m[2].id, "the ring where the face left it");
    assert.equal(build(w, sv, { focus: "tile.nobody", seen: m[1].id }).props.focus.cur, "resident." + m[1].id, "a ring on nothing present takes the way in"); }
  { const { w, sv } = S0.away, b = build(w, sv), m = w.st.mibis, ids = b.props.focus.targets.map((t) => t.id);
    assert.deepEqual(ids, [...m.slice(0, 5).map((x) => "resident." + x.id), ...m.map((x) => "tile." + x.id), "room.0", "room.new"], "an out mibi is a tile and no resident");
    assert.equal(build(w, sv, { seen: m[5].id }).props.focus.cur, "tile." + m[5].id, "last seen out: its tile");
    const t = build(w, sv, { focus: "tile." + m[5].id }), r = t.props.focus.resolve; assert.equal(r["resident.of"], "", "an out tile's resident is null: the graph takes the first resident");
    assert.equal(t.line.ok, "Look at " + m[5].name); assert.equal(t.line.subject, "out exploring"); assert.equal(t.line.back, "Home");
    const res = build(w, sv, { focus: "resident." + m[0].id }); assert.equal(res.props.focus.resolve["tile.of"], "tile." + m[0].id); assert.match(res.line.subject, /^an? (young|adult|elder) /); }
  { const { w, sv } = S0.docked, m = w.st.mibis, tl = build(w, sv, { focus: "tile." + m[1].id }); assert.equal(tl.props.focus.resolve["resident.of"], "resident." + m[1].id); const sl = build(w, sv, { focus: "tile." + m[6].id }); assert.equal(sl.line.subject, "ready to go exploring", "a carried tile, docked"); }
  { const { w, sv } = S0.empty, b = build(w, sv); assert.equal(b.line.ok, null); assert.equal(b.line.subject, "nobody lives here yet"); assert.equal(b.line.back, "Home"); }
});

test("the window's picture is Idle's painting of the light (no slot of its own), a painting on its way is no longer the line's context (Grow paints nothing)", () => {
  const { w, sv } = scenes().docked;
  for (const light of ["dawn", "day", "dusk", "night"]) { const b = build(w, sv, { light }), id = b.props.regions.window.picture; assert.equal(id, `room-roots-idle-${light}-1024x568`); assert.equal(b.props.regions.room.base, id); assert.ok(b.requests.some((r) => r.id === id && r.kind === "slot")); assert.ok(!b.requests.some((r) => /vivarium-whole/.test(r.id)), "no register entry of its own"); }
  const id = w.st.mibis[0].id; w.st.mibis[0].paint = { state: "sent" };
  assert.notEqual(build(w, sv, { focus: "resident." + id }).line.subject, "its painting is on its way");
});

test("a mibi that grows up changes every picture id from :juvenile: to :adult: with the tiles' size unchanged and a resident's following its stage (the whole's residents and the tiles)", () => {
  const w = world(); dock(w.st); const m = mibis(w, 4); for (const x of m) x.born = w.st.turn;
  const ids = (b) => b.requests.filter((r) => r.kind === "mibi").map((r) => r.id), sv = sv0();
  const young = ids(build(w, sv)); assert.ok(young.length >= 6 && young.every((id) => /^mibi:S\d+-[0-9a-f]{8}:juvenile:\d+x\d+$/.test(id)), young.join(" "));
  w.st.turn += w.settings.adultTurns ?? S.JUVENILE_TURNS; for (const x of m) assert.equal(S.mibiStage(w.st, x, w.settings), "adult");
  const grown = ids(build(w, sv));
  // every id has the stage swapped; a resident's size is its stage's (home.json sizes: a juvenile's 104×112, an adult's 144×152), the sleepers' and the tiles' size does not change with it
  assert.deepEqual(grown.map((id) => id.replace(/:adult:\d+x\d+$/, "")), young.map((id) => id.replace(/:juvenile:\d+x\d+$/, "")));
  assert.ok(young.some((id) => id.endsWith(":104x112")) && young.some((id) => id.endsWith(":48x48")), young.join(" "));   // with no nap master a sleeper sleeps as its standing figure, never at the old 96 × 88 grown.forEach((id, i) => assert.equal(id, young[i].replace(":juvenile:", ":adult:").replace(/:104x112$/, ":144x152"), `${young[i]} → ${id}`));
});

// ---- Station M1 §2.6: residents with moving sets and their rest fit vivarium.props.json ----
import { setMoving } from "../src/moving.mjs";
{ const ix = J("moving/index.json"), sets = {}; for (const id of ix.sets) sets[id] = J(`moving/${id}.json`); setMoving(sets); }
test("the whole's residents with moving sets fit vivarium.props.json: moving and rest (asleep at 23:00, awake at 12:00); with the play gate shut, none", () => {
  const { w, sv } = scenes().docked, rules = spec.rules.rest;
  for (const [time, want] of [[23 * 3600, "asleep"], [12 * 3600, "awake"]]) { const b = build(w, sv, { time, restRules: rules, motionSets: true }); assert.deepEqual(validate(b.props, schema), []); assert.ok(b.props.regions.residents.every((r) => r.moving?.walk && r.moving?.shadow && r.rest === want)); assert.ok(b.requests.some((q) => q.kind === "moving")); }
  assert.ok(build(w, sv, { time: 12 * 3600, restRules: rules, motionSets: false }).props.regions.residents.every((r) => !r.moving));
});

test("fix 7: the Vivarium's residents take the scene's light (id suffix and request light; the count as at day), the 48×48 tiles never do", () => {
  const w = world(2); mibis(w, 6); dock(w.st); const sv = sv0({ carried: [w.st.mibis[0].id] });
  const reqs = (light) => build(w, sv, { light }).requests.filter((r) => r.kind === "mibi"), day = reqs("day");
  assert.ok(day.length >= 6 && day.every((r) => !("light" in r)));
  for (const light of ["dawn", "dusk", "night"]) { const got = reqs(light); assert.equal(got.length, day.length); for (const r of got) assert.equal(r.size[0] === 48 && r.size[1] === 48 ? !("light" in r) : r.light === light && r.id.endsWith(":" + light), true, r.id); assert.ok(got.some((r) => r.light === light) && got.some((r) => r.size[0] === 48)); }
});

// T-20261018-235: the figure the props carry and the keep-out against the sleepers' tags, on the signed stands and the placed nap masters
test("residents carry their figure, sleepers the world-size curl and its figure, and keepOut holds against the sleepers' tags", () => {
  const masters = path.resolve(here, "../../ui/assets/masters"), index = JSON.parse(readFileSync(path.join(masters, "index.json"), "utf8")).masters, placed = [];
  loadStandLooksFs(); loadStandLayersFs();
  try {
    for (const id of ["mibi-adult-S01-96x88", "mibi-juvenile-S01-96x88"]) { const e = index[id], p = decodePNG(readFileSync(path.join(masters, e.file))); placeMaster({ id, w: e.w, h: e.h, file: e.file, hash: e.sha256, signed: e.signed, status: "master" }, { w: p.width, h: p.height, rgba: () => new Uint8ClampedArray(p.data) }); placed.push(id); }
    const w = world(); dock(w.st); const m = mibis(w, 3); S.seedAdults(w.st, "S01", 9, 5, w.settings); for (const x of w.st.mibis) x.paint = { state: "landed" };
    const b = build(w, sv0()), R = b.props.regions;   // eight housed: three rest, on the bed (R4b)
    for (const r of R.residents) { assert.ok(Array.isArray(r.figure) && r.figure.length === 4 && r.figure.every(Number.isInteger), "a walker carries its figure [dx, dy, W, H]"); assert.ok(r.figure[2] > 0 && r.figure[3] > 0 && r.figure[1] + r.figure[3] <= (r.stage === "juvenile" ? 112 : 152)); }
    assert.equal(R.bed.sleepers.length, 3, "the three resters take the bed's three places in rest order"); assert.equal(R.bed.state, "resting"); assert.deepEqual(R.bed.sleepers.map((q) => q.id), R.residents.filter((p) => !p.shown).map((p) => p.id), "rest order"); assert.ok(R.bed.sleepers.every((q) => q.rester && q.shown === false));
    for (const sl of R.bed.sleepers) { assert.ok(sl.figure, "a sleeper carries the curl's figure"); assert.match(sl.picture, /^mibi:S01~[0-9a-f]{8}:(adult|juvenile):\d+x\d+$/); }
    const curlH = Math.max(...R.bed.sleepers.map((sl) => sl.figure[3])), tagTop = 456 - curlH - 32, K = spec.regions.resident.walk.keepOut;
    assert.ok(curlH >= 28 && curlH <= 34, "the adult's curl is about 34 × 31: " + curlH);
    assert.ok(K[1] <= tagTop - 40, `keepOut's top ${K[1]} holds a walker's tag (feetY + 16 to + 40) above the sleepers' tag top ${tagTop} (measured curlH ${curlH})`);
    assert.deepEqual(K, keepOutOf(spec, measureCurls()), "keepOut is derived from the measured curls (station/tools/make-keepout.mjs), never typed"); assert.equal(K[1], 356); assert.equal(K[1] + K[3], 472);
    assert.ok(b.requests.some((r) => r.kind === "curl"));
  } finally { for (const id of placed) dropAsset(id); unloadStands(); }
});

test("the figure is measured on the stand without its shadow: feetY is the last ink row of the shadowless composition", () => {
  loadStandLooksFs(); loadStandLayersFs();
  try {
    for (const [stage, place] of [["adult", [144, 152]], ["juvenile", [104, 112]]]) for (const looks of [{ colour: "charcoal", markings: "none", crown: "bare" }, { colour: "russet", markings: "stripes", crown: "leaf crest" }]) {
      const st = layeredStand("S01", stage, place, "vivarium"), plain = layeredStand("S01", stage, place, "vivarium"); plain.layers = plain.layers.filter((l) => l.op !== "under");
      const withShadow = composeStand(st, looks), without = composeStand(plain, looks), box = inkBox(without.rgba(), without.w, without.h), all = inkBox(withShadow.rgba(), withShadow.w, withShadow.h, 1, 1);
      assert.ok(Math.abs(withShadow.figure[2] - box[2]) <= 1 && Math.abs(withShadow.figure[3] - box[3]) <= 1, `${stage}: the figure is the shadowless figure's size (to a rounding row): ${withShadow.figure} against ${box}`);
      assert.ok(all[1] + all[3] > withShadow.figure[1] + withShadow.figure[3], `${stage}: the shadow's rows reach past the feet, and are not in the figure`);
    }
  } finally { unloadStands(); }
});

// T-20261018-235: a moving resident of a species with a layered stand is that stand, translated along its path: its own coat and marks, at the stand's size, with no moving set
test("with the moving sets on, a resident with a layered stand is its stand (same picture, its figure) and carries no moving set", () => {
  loadStandLooksFs(); loadStandLayersFs();
  try {
    const w = world(); dock(w.st); mibis(w, 3); const on = build(w, sv0(), { motionSets: true }).props.regions.residents, off = build(w, sv0(), { motionSets: false }).props.regions.residents;
    assert.equal(on.length, 3); on.forEach((r, i) => { assert.ok(!r.moving, "no moving set"); assert.equal(r.picture, off[i].picture, "the stand's own picture, with its looks"); assert.deepEqual(r.figure, off[i].figure); assert.match(r.picture, /^mibi:S01~[0-9a-f]{8}:adult:144x152$/); });
  } finally { unloadStands(); }
});

test("a sleeping S01 resident carries its curl and the curl's figure; awake it carries neither", () => {
  const masters = path.resolve(here, "../../ui/assets/masters"), index = JSON.parse(readFileSync(path.join(masters, "index.json"), "utf8")).masters, placed = [];
  loadStandLooksFs(); loadStandLayersFs();
  try {
    for (const id of ["mibi-adult-S01-96x88", "mibi-juvenile-S01-96x88"]) { const e = index[id], p = decodePNG(readFileSync(path.join(masters, e.file))); placeMaster({ id, w: e.w, h: e.h, file: e.file, hash: e.sha256, signed: e.signed, status: "master" }, { w: p.width, h: p.height, rgba: () => new Uint8ClampedArray(p.data) }); placed.push(id); }
    const w = world(); dock(w.st); mibis(w, 3);
    const night = build(w, sv0(), { time: 2 * 3600, restRules: spec.rules.rest }).props.regions.residents, noon = build(w, sv0(), { time: 12 * 3600, restRules: spec.rules.rest }).props.regions.residents;
    assert.ok(night.every((r) => r.rest === "asleep") && noon.every((r) => r.rest === "awake"));
    for (const r of night) { assert.ok(r.curl && r.curlFigure?.length === 4, "asleep: its curl"); assert.match(r.curl, /^mibi:S01~[0-9a-f]{8}:adult:\d+x\d+$/); assert.ok(r.figure, "and still its stand's figure for the walk"); }
    for (const r of noon) assert.ok(!r.curl && !r.curlFigure, "awake: its stand");
  } finally { for (const id of placed) dropAsset(id); unloadStands(); }
});

// ---- R5 (T-20261027-318): the rooms pane, the contexts, the way in and the room shown ----
const inRoom = (w, room, n) => { const k = w.st.mibis.length; S.seedAdults(w.st, "S01", 5 + room + k, n, w.settings); for (const [i, m] of w.st.mibis.slice(k).entries()) { m.room = room; m.slot = i; m.bay = room * S.ROOM + i; m.paint = { state: "landed" }; } return w.st.mibis.slice(k); };   // n adults housed in a room, their slots 0 to n − 1
const roomsWorld = (rooms) => { const w = world(rooms); w.st.rooms = rooms; dock(w.st); return w; };

test("the rooms pane: a chip a room and the new-room chip while there are fewer than four; the room shown is the one step up; the chips are the last targets and the new-room chip is gone at four rooms", () => {
  for (const rooms of [1, 2, 3, 4]) {
    const w = roomsWorld(rooms), b = build(w, sv0()), items = b.props.regions.rooms.items, want = [...Array.from({ length: rooms }, (_, i) => String(i)), ...(rooms < 4 ? ["new"] : [])];
    assert.deepEqual(items.map((c) => c.id), want, `${rooms} rooms: a chip a room, then the new-room chip`); assert.deepEqual(items.map((c) => c.state), want.map((id) => (id === "0" ? "shown" : id === "new" ? "new" : "room")));
    assert.deepEqual(b.props.focus.targets.filter((t) => t.group === "room").map((t) => t.id), want.map((id) => "room." + id), "the chips are targets, after the residents and the places");
    assert.equal(b.props.focus.targets.some((t) => t.id === "room.new"), rooms < 4, rooms === 4 ? "four rooms: no room.new" : "fewer than four: room.new");
    assert.ok(items.every((c) => c.picture === ""), "no chip picture until the art director cuts rooms.json chip: the recess alone");
    assert.deepEqual(validate(b.props, schema), [], "the props fit vivarium.props.json");
  }
  const w = roomsWorld(3); w.st.face.room = 2; assert.deepEqual(build(w, sv0()).props.regions.rooms.items.map((c) => c.state), ["room", "room", "shown", "new"], "the room shown moves the step up");
  assert.equal(build(w, sv0({}), { focus: "room.new" }).props.focus.cur, "room.new"); { const f = roomsWorld(4); assert.notEqual(build(f, sv0(), { focus: "room.new" }).props.focus.cur, "room.new", "no such chip at four rooms: the way in"); }
});

test("F5 the crumb: with two or more rooms the top readout is the room shown's name and no mark; with one room there is none", () => {
  assert.deepEqual(build(roomsWorld(1), sv0()).top, {}, "one room: no readout");
  for (const rooms of [2, 3, 4]) for (let r = 0; r < rooms; r++) { const w = roomsWorld(rooms); w.st.face.room = r; assert.deepEqual(build(w, sv0()).top, { readout: { text: spec.strings.rooms[r], mark: null } }, `${rooms} rooms, room ${r}`); }
});
import { panelBuild as panelBuildUnchecked } from "../src/views/panel-props.mjs";
test("F8 the Add the room card's picture is the next room's Idle painting cut 1:1 at [338, 376, 348, 160], with no stage, glow, light or contact shadow of its own; the other card keeps its art", () => {
  for (const [rooms, name] of [[1, "reeds"], [2, "boulders"], [3, "ferns"]]) for (const light of ["day", "night"]) {
    const w = roomsWorld(rooms), v = panelBuildUnchecked({ st: w.st, sv: sv0(), settings: w.settings, ui: { panel: { screen: "vivarium", id: "addRoom", focus: "" }, pods: {}, hab: {} }, light, jump: false }, J("panel.json"), frameSpec, pods), add = v.overlay.regions.cards[0], keep = v.overlay.regions.cards[1];
    const crop = v.requests.find((r) => r.kind === "crop"); assert.ok(crop, `${name} ${light}: a crop request`);
    assert.deepEqual([crop.master, crop.of, crop.at, crop.size], [`room-${name}-idle-${light}-1024x568`, [1024, 568], [338, 376], [348, 160]]); assert.equal(add.picture, crop.id); assert.deepEqual(add.pictureSize, [348, 160]);
    assert.deepEqual([add.art.stage, add.art.glow, add.art.light], ["", "", ""], "no stage, no pedestal"); assert.ok(keep.art.stage, "the other card keeps its stage"); assert.ok(!("bare" in add));
  }
});
test("the new-room chip's lamp is mint when the next room can be paid and stone when it cannot (never amber)", () => {
  const pay = roomsWorld(1), short = roomsWorld(1); short.st.e = 3;
  assert.equal(build(pay, sv0()).props.regions.rooms.items.at(-1).lamp, "frame-lamp-8-mint"); assert.equal(build(short, sv0()).props.regions.rooms.items.at(-1).lamp, "frame-lamp-8-stone");
  const second = roomsWorld(2); second.st.e = 7; assert.equal(build(second, sv0()).props.regions.rooms.items.at(-1).lamp, "frame-lamp-8-stone", "the second room costs 8"); second.st.e = 8; assert.equal(build(second, sv0()).props.regions.rooms.items.at(-1).lamp, "frame-lamp-8-mint");
  assert.ok(build(pay, sv0()).requests.some((r) => r.id === "frame-lamp-8-mint" && r.kind === "slot" && r.size[0] === 8), "the lamp is a signed master, requested");
});

test("C4: the ring on a room's chip says where there is room: n places free, one place free, this room is full, nobody lives here yet; the chip has no ✓ cap", () => {
  const w = roomsWorld(2), WORDS = ["nobody lives here yet", "seven places free", "six places free", "five places free", "four places free", "three places free", "two places free", "one place free", "this room is full"];
  for (let n = 0; n <= 8; n++) { const k = w.st.mibis.length; w.st.mibis.splice(0, k); inRoom(w, 0, n); const l = build(w, sv0(), { focus: "room.0" }).line; assert.equal(l.subject, WORDS[n], `${n} housed`); assert.equal(l.ok, null, "no ✓ cap on a room's chip"); assert.equal(l.back, "Home"); }
  inRoom(w, 1, 3); assert.equal(build(w, sv0(), { focus: "room.1" }).line.subject, "five places free", "a chip speaks of its own room, whichever is shown");
});

test("C2, C3: the new-room chip says ✓ Add a room with ⚡ and the price (4, 8, 12 by the rooms there are), eight more places; short of Energy the dimmed cap, the short icon and pods.json's words", () => {
  for (const [rooms, price] of [[1, "⚡ 4"], [2, "⚡ 8"], [3, "⚡ 12"]]) { const w = roomsWorld(rooms), l = build(w, sv0(), { focus: "room.new" }).line; assert.deepEqual([l.ok, l.price, l.subject, l.dim ?? false], ["Add a room", price, "eight more places", false], `${rooms} rooms`); }
  const w = roomsWorld(1); w.st.e = 3; const l = build(w, sv0(), { focus: "room.new" }).line;
  assert.deepEqual([l.ok, l.price, l.dim, l.short, l.need, l.subject], ["Add a room", "⚡ 4", true, "⚡", "needs more ⚡: go out", "eight more places"]);
});

test("the way in: an empty room puts the ring on its chip, the ring is on nothing only when the whole Vivarium is empty, the mibi last seen up close wins in the room shown; room.shown names the chip ◀ from the first place goes to", () => {
  { const w = roomsWorld(2); assert.equal(build(w, sv0()).props.focus.cur, "room", "nobody housed anywhere: the ring on nothing"); assert.equal(build(w, sv0()).props.state, "empty"); }
  { const w = roomsWorld(2); inRoom(w, 0, 3); w.st.face.room = 1; const b = build(w, sv0()); assert.deepEqual([b.props.state, b.props.focus.cur, b.props.focus.resolve["room.shown"]], ["empty", "room.1", "room.1"], "room 2 is empty, room 1 is not: the ring on room 2's chip");
    assert.equal(b.line.subject, "nobody lives here yet"); assert.equal(b.props.regions.residents.length, 0); assert.ok(b.props.regions.tiles.items.every((t) => t.state === "free"), "eight free places, each its recess"); }
  { const w = roomsWorld(2); const m = inRoom(w, 0, 3); const b = build(w, sv0(), { seen: m[2].id }); assert.deepEqual([b.props.focus.cur, b.props.focus.resolve["room.shown"]], ["resident." + m[2].id, "room.0"]); }
  { const w = roomsWorld(3); inRoom(w, 0, 2); inRoom(w, 2, 2); w.st.face.room = 2; assert.equal(build(w, sv0()).props.regions.room.id, "boulders", "the window shows the room last shown"); assert.equal(build(w, sv0()).props.focus.resolve["room.shown"], "room.2"); }
});

test("the places pane is the room shown's eight places in slot order; while the swap runs each place carries the old room's thumbnail to dither from", () => {
  const w = roomsWorld(2), a = inRoom(w, 0, 3), b2 = inRoom(w, 1, 2), old = ["x:0", "x:1", "x:2", "", "", "", "", ""]; w.st.face.room = 1;
  const t = build(w, sv0(), { prev: { base: "room-roots-idle-day-1024x568", tiles: old } }).props.regions.tiles.items;
  assert.deepEqual(t.map((x) => x.state), ["housed", "housed", "free", "free", "free", "free", "free", "free"]); assert.deepEqual(t.map((x) => x.from), old, "from: the old room's place i");
  assert.ok(build(w, sv0()).props.regions.tiles.items.every((x) => x.from === ""), "no swap: no from"); assert.equal(a.length + b2.length, 5);
});

// ---- the host: the ring on a chip shows that room (st.face.room is the rules' one home for it), the swap's dither, the way in ----
for (const k of ["frame", "pods", "home", "vivarium", "habitat", "panel"]) SPECS[k] = J(k + ".json");
const hostRig = ({ motion = true } = {}) => {
  const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", rooms: null }; G.settings = settings; G.st = S.freshSt("w1", 1, 1000); S.normalize(G.st); G.st.firstMibi = false; G.st.rooms = 2; G.st.e = 99; G.st.dock = { docked: true, at: 1000 };
  G.sv = { v: 8, seed: 7, wid: "w1", turn: 3, bay: [], mibis: [], carried: [], tier: 1, shield: 3, st: G.st }; const a = inRoomG(0, 3), b = inRoomG(1, 2);
  UI.screen = "vivarium"; UI.idle = false; UI.panel = null; UI.viv = { f: "resident." + a[0].id, prev: null }; UI.hab.id = null;
  const sent = []; let t = 0; const h = createHost({ send: (m) => sent.push(m), nowMs: () => t, light: () => "day", motion: () => motion }); h.save = () => { h.saved = (h.saved ?? 0) + 1; };
  return { h, sent, a, b, at: (ms) => { t = ms; h.frame(); } };
};
const inRoomG = (room, n) => { const k = G.st.mibis.length; S.seedAdults(G.st, "S01", 5 + room + k, n, G.settings); const out = G.st.mibis.slice(k); out.forEach((m, i) => { m.room = room; m.slot = i; m.bay = room * S.ROOM + i; m.paint = { state: "landed" }; }); return out; };
const focusMsg = (h, target) => onFaceMessage(h, { t: "focus", screen: "vivarium", target });
test("the ring on a room's chip sets st.face.room and shows that room: the window and the places pane cross-dither from the old room in 200 ms (the swap event, a dither on `window`), then the old pictures go", () => {
  const { h, sent, a, at } = hostRig(); at(0);
  focusMsg(h, "room.1"); assert.deepEqual([G.st.face.room, UI.viv.f], [1, "room.1"], "the host sets st.face.room");
  assert.deepEqual(sent.at(-1), { t: "event", kind: "dither", target: "window", from: "room-roots-idle-day-1024x568", ms: 200, hold: 0 }, "the swap: habitat's dither, from the room that was shown");
  assert.deepEqual(UI.viv.prev.tiles.slice(0, 4).map((x) => x.startsWith("mibi:")), [true, true, true, false], "the old room's three places' thumbnails, kept for the event");
  { const p = screenProps(""); assert.equal(p.msg.regions.window.picture, "room-reeds-idle-day-1024x568"); assert.ok(p.ids.includes("room-roots-idle-day-1024x568") && UI.viv.prev.tiles.filter(Boolean).every((id) => p.ids.includes(id)), "the old painting and thumbnails stay on the face until the event ends"); assert.equal(p.msg.regions.tiles.items[0].from, UI.viv.prev.tiles[0]); }
  at(199); assert.ok(UI.viv.prev); at(200); assert.equal(UI.viv.prev, null, "the swap ends: the old pictures are no longer named"); assert.equal(G.st.face.room, 1);
  focusMsg(h, "room.new"); assert.deepEqual([G.st.face.room, UI.viv.f, sent.filter((m) => m.kind === "dither").length], [1, "room.new", 1], "the new-room chip shows the room as it was: no swap");
  focusMsg(h, "tile." + G.st.mibis.find((m) => m.room === 1).id); assert.equal(G.st.face.room, 1, "a place does not change the room");
  focusMsg(h, "room.0"); assert.equal(G.st.face.room, 0); assert.ok(h.saved >= 2, "the room last shown is saved");
});
test("reduced motion: the ring on a chip still sets the room, the swap is a cut (the face reads motion: false)", () => {
  const { h, a, at } = hostRig({ motion: false }); at(0); focusMsg(h, "room.1"); assert.equal(G.st.face.room, 1); assert.equal(screenProps("").msg.regions.window.picture, "room-reeds-idle-day-1024x568");
});
test("F9 the way in reads only st.face.room: a mibi seen up close, met or moved sets it; the ring is on the mibi last seen if it is in that room, else the room's first resident, else its chip; Home and Idle show st.face.room", () => {
  const { h, a, b, at } = hostRig(); at(0); G.st.face.room = 0; UI.screen = "home"; UI.hab.id = b[1].id; h.goto("habitat");
  assert.equal(G.st.face.room, 1, "up close sets the room shown to the mibi's room"); h.goto("vivarium"); assert.deepEqual([G.st.face.room, UI.viv.f], [1, null]); assert.equal(screenProps("").msg.focus.cur, "resident." + b[1].id, "the mibi last seen, in the room");
  showRoom(h, 0); UI.screen = "home"; assert.equal(screenProps("").msg.regions.room.id, "roots", "the ring moved to Roots' chip: Home shows Roots"); h.goto("vivarium"); assert.equal(G.st.face.room, 0, "the way in does not jump to the mibi seen in the other room");
  assert.equal(screenProps("").msg.focus.cur, "resident." + S.inRoom(G.st, 0)[0].id, "not in that room: its first resident");
  UI.screen = "home"; UI.hab.id = null; G.st.face.room = 0; h.goto("vivarium"); assert.equal(G.st.face.room, 0, "none seen: the room last shown");
  UI.screen = "home"; assert.equal(screenProps("").msg.regions.room.id, "roots", "Home shows the room last shown"); G.st.face.room = 1; assert.equal(screenProps("").msg.regions.room.id, "reeds");
  UI.idle = true; assert.equal(screenProps("").msg.regions.room.id, "reeds", "Idle too"); UI.idle = false;
  G.st.face.room = 0; S.seeRoom(G.st, b[1]); assert.equal(G.st.face.room, 1, "a meet's start (seeRoom)");
});
test("a move sets the room shown to the mibi's new room", () => {
  const w = roomsWorld(2); const m = inRoom(w, 0, 2)[0]; w.st.face.room = 0; const r = S.moveMibi(w.st, m, 1, w.settings); assert.ok(r.ok); assert.equal(w.st.face.room, 1);
});
test("the Add a room? panel rides on the whole: its cards, the bottom line of the focused card; ✓ on Add the room through the host adds the room and shows it", () => {
  const { h, at } = hostRig(); at(0); G.st.rooms = 1; G.st.mibis = G.st.mibis.filter((m) => m.room === 0); G.st.face.room = 0; UI.viv.f = "room.new";
  onFaceMessage(h, { t: "intent", seq: 1, screen: "vivarium", target: "room.new", verb: "confirm" }); assert.equal(UI.panel.id, "addRoom");
  const p = screenProps(""); assert.deepEqual([p.msg.overlay.id, p.msg.overlay.focus.cur, p.msg.overlay.regions.title, p.msg.frame.line.ok, p.msg.frame.line.price], ["panel", "card.add", "Add a room?", "Add the room", "⚡ 4"]);
  assert.deepEqual(p.msg.overlay.regions.cards.map((c) => [c.name, c.line, c.cost]), [["Add the room", "Eight more places to live", "⚡ 4"], ["Not now", "The Vivarium stays as it is", ""]]);
  onFaceMessage(h, { t: "intent", seq: 2, screen: "panel", target: "card.add", verb: "confirm" });
  assert.deepEqual([G.st.rooms, G.st.e, G.st.face.room, UI.viv.f, UI.panel], [2, 95, 1, "room.1", null]); const q = screenProps(""); assert.equal(q.msg.focus.cur, "room.1"); assert.equal(q.msg.state, "empty", "the new room is shown empty");
});

// ---- R4b: where the resters rest (vivarium.json rules.show.where, the owner's cats) ----
test("R4b rest places: Roots' resters take the bed in rest order, drawn as sleepers; in a room with no bed they curl or go out by hash(id) mod 100 against the stage's percentage (at most two curls), a mibi with no curl picture always goes out; the style is the id's, not the stage's; a tile focused pins its mibi shown", () => {
  const masters = path.resolve(here, "../../ui/assets/masters"), index = JSON.parse(readFileSync(path.join(masters, "index.json"), "utf8")).masters, placed = [];
  loadStandLooksFs(); loadStandLayersFs();
  try {
    for (const id of ["mibi-adult-S01-96x88", "mibi-juvenile-S01-96x88"]) { const e = index[id], p = decodePNG(readFileSync(path.join(masters, e.file))); placeMaster({ id, w: e.w, h: e.h, file: e.file, hash: e.sha256, signed: e.signed, status: "master" }, { w: p.width, h: p.height, rgba: () => new Uint8ClampedArray(p.data) }); placed.push(id); }
    const mk = (room) => { const w = world(2); dock(w.st); mibis(w, 8); w.st.mibis.forEach((m, i) => { m.room = room; m.slot = i; m.bay = room * 8 + i; m.born = w.st.turn - 100; }); w.st.face.room = room; return w; };
    // Roots: all three on the bed
    { const w = mk(0), b = build(w, sv0()).props.regions, rest = b.residents.filter((p) => !p.shown); assert.equal(rest.length, 3); assert.ok(rest.every((p) => p.restAt === "bed")); assert.equal(b.bed.sleepers.length, 3); }
    // Reeds: no bed
    { const w = mk(1), b = build(w, sv0()).props.regions, rest = b.residents.filter((p) => !p.shown); assert.equal(rest.length, 3); assert.ok(!("bed" in b)); assert.ok(rest.every((p) => ["curl", "out"].includes(p.restAt)));
      assert.ok(rest.filter((p) => p.restAt === "curl").length <= 2, "at most two curled off the bed"); for (const p of rest.filter((q) => q.restAt === "curl")) assert.ok(p.curl && p.curlFigure, "a curl names its picture");
      const again = build(w, sv0()).props.regions.residents.map((p) => [p.id, p.shown, p.restAt]); assert.deepEqual(again, b.residents.map((p) => [p.id, p.shown, p.restAt]), "determinism");
      // the style is the id's: whatever stage, the same hash; a curler as a juvenile still curls as an adult
      const hash = (n) => (Math.imul(n + 1, 2654435761) >>> 0) % 65521, pct = spec.rules.show.curl.pct;
      for (const p of rest) { const want = hash(+p.id) % 100 < pct[p.stage]; assert.equal(p.restAt !== "curl" || want, true, `${p.id}: curls only if its hash allows`); }
      assert.ok(pct.juvenile < pct.adult && pct.adult < pct.elder, "a stage that curled at 30 still curls at 50 and 80");
      // a tile focused pins its mibi shown
      const r0 = rest[0].id; const f = build(w, sv0(), { focus: "tile." + r0 }).props.regions.residents.find((p) => p.id === r0); assert.equal(f.shown, true, "the focused tile's mibi comes out"); }
    // a species with no adult nap picture always goes out
    { const w = world(2); dock(w.st); S.seedAdults(w.st, "S10", 5, 8, w.settings); for (const m of w.st.mibis) { m.paint = { state: "landed" }; m.room = 1; m.slot = w.st.mibis.indexOf(m); m.bay = 8 + m.slot; m.born = 0; } w.st.turn = 99; w.st.face.room = 1; const b = build(w, sv0()).props.regions; assert.ok(b.residents.filter((p) => !p.shown).every((p) => p.restAt === "out"), "no curl picture: out"); }
  } finally { for (const id of placed) dropAsset(id); unloadStands(); }
});

test("R4b a traveller home: it is fresh (roomSince = now pins it among the five), marked enter: edge while the walk runs, and is a resident again (no longer on the Companion)", () => {
  const w = world(); dock(w.st); const m = mibis(w, 8), now = T0 + 12 * 3600 * 1000, sv = sv0({ carried: [m[0].id] });
  assert.ok(!build(w, sv).props.regions.residents.some((p) => p.id === String(m[0].id)), "carried: not in the room");
  const back = sv0(); m[0].roomSince = now - 1000;   // the Companion's home at this dock: noteCarried wrote roomSince = now
  const b = build(w, back, { arrived: [m[0].id], now }), p = b.props.regions.residents.find((q) => q.id === String(m[0].id));
  assert.equal(p.enter, "edge"); assert.equal(p.shown, true, "fresh: pinned inside the five"); assert.equal(b.props.regions.residents.filter((q) => q.shown).length, 5);
  assert.deepEqual(validate(b.props, schema), []);
  m[0].roomSince = undefined; assert.equal(build(w, back, { now }).props.regions.residents.find((q) => q.id === String(m[0].id)).shown, false, "not fresh: it ranks like anyone (the first by id rests)");
});
