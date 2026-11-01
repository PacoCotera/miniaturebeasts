// The Vivarium as props (the collection v2 design; vivarium.json): the view the face takes, views/vivarium-props.mjs, in Node. Plain JSON that names what and never where: it validates against vivarium.props.json in every scene and view,
// holds no rectangle, fits the props budget; the room view's walkers at one scale, the chip row, the card and its plates.
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
import { loadStandLayersFs, loadStandLooksFs, loadStandSizesFs, unloadStands as unloadAll } from "../tools/stand-layers-fs.mjs";
const unloadStands = () => { unloadAll(); loadStandSizesFs(); };   // the factor views' table (stand-sizes.json) stays loaded, as on the page
loadStandSizesFs();
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

const inRoom = (w, room, n, sp = "S01") => { const k = w.st.mibis.length, s0 = w.settings.rooms; w.settings.rooms = 4; S.seedAdults(w.st, sp, 5 + room + k, n, w.settings); w.settings.rooms = s0; const made = w.st.mibis.slice(k), taken = new Set(S.inRoom(w.st, room).filter((x) => !made.includes(x)).map((x) => x.slot));
  for (const m of made) { let slot = 0; while (taken.has(slot)) slot++; taken.add(slot); m.room = room; m.slot = slot; m.bay = room * S.ROOM + slot; m.paint = { state: "landed" }; } return made; };   // n adults housed in a room, in its lowest free slots (seeded with four rooms' places, so a full first room is no limit)
const roomsWorld = (rooms) => { const w = world(rooms); w.st.rooms = rooms; dock(w.st); return w; };
const tuck = (w, m) => { w.st.tuckSeq = (w.st.tuckSeq | 0) + 1; m.tucked = { turn: w.st.turn | 0, seq: w.st.tuckSeq, from: m.room }; m.room = m.slot = m.bay = null; };
const tuckN = (w, n, seed = 77) => { const out = []; while (out.length < n) { const k = w.st.mibis.length; S.seedAdults(w.st, "S01", seed + out.length, Math.min(n - out.length, 8), w.settings); const made = w.st.mibis.slice(k); if (!made.length) break; for (const m of made) { m.paint = { state: "landed" }; tuck(w, m); out.push(m); } } return out; };   // seeding fills free places only: seed, then tuck, in batches
const forty = () => { const w = roomsWorld(4); tuckN(w, 8); for (let r = 0; r < 4; r++) inRoom(w, r, 8); return w; };

function scenes() {
  const out = {};
  { const w = world(1); dock(w.st); out.empty = { w, sv: sv0() }; }
  { const w = world(1); dock(w.st, false); out.emptyAway = { w, sv: sv0() }; }
  { const w = world(); dock(w.st); const m = mibis(w, 7); out.docked = { w, sv: sv0({ carried: [m[5].id, m[6].id] }) }; }
  { const w = world(); dock(w.st, false); const m = mibis(w, 7); out.away = { w, sv: sv0({ carried: [m[5].id, m[6].id] }) }; }
  { const w = world(2); dock(w.st); mibis(w, 12); out.twelve = { w, sv: sv0() }; }
  { const w = forty(); out.forty = { w, sv: sv0() }; }
  { const w = world(); dock(w.st); mibis(w, 1); out.one = { w, sv: sv0() }; }
  return out;
}
const VIEWS = [{}];

test("the Vivarium's props validate against vivarium.props.json in every scene and view, name no rectangle, and fit the budget", () => {
  for (const [name, { w, sv }] of Object.entries(scenes())) for (const o of VIEWS) {
    const b = build(w, sv, o), bad = validate(b.props, schema);
    assert.deepEqual(bad, [], `${name} ${o.view ?? "room"}: ${bad.slice(0, 3).join("; ")}`);
    const json = JSON.stringify(b.props);
    assert.ok(!/"(x|y|w|h|rect|at|size|box|pitch)"\s*:/.test(json), `${name}: props name what, never where`);
    assert.ok(json.length + JSON.stringify(b.line).length < 24 * 1024, `${name} ${o.view ?? "room"}: ${json.length} bytes`);
    assert.equal(b.props.view, o.view ?? "room");
  }
});

test("one scale (§3): every figure of a view at that view's one factor, never fitted per mibi, never upscaled: the room view 96 x 99, the card 144 x 148; a juvenile is smaller than its adult", () => {
  loadStandLooksFs(); loadStandLayersFs();
  try {
    const w = roomsWorld(1); inRoom(w, 0, 2); const j = inRoom(w, 0, 1)[0]; j.born = w.st.turn;
    const room = build(w, sv0()), sizes = (b, re) => b.requests.filter((r) => r.kind === "mibi" && re.test(r.id)).map((r) => r.size.join("x"));
    assert.ok(room.props.regions.residents.every((p) => /:96x99(:|$)/.test(p.picture)), room.props.regions.residents.map((p) => p.picture).join(" "));
    assert.match(room.props.regions.card.picture, /:144x148(:|$)/);
    const fig = (id) => room.props.regions.residents.find((p) => p.id === String(id)).figure;
    assert.ok(fig(j.id)[3] < fig(w.st.mibis[0].id)[3], "the juvenile's ink is shorter than its adult's at the one factor");
    assert.ok(sizes(room, /./).every((s) => ["96x99", "144x148", "96x103", "96x102", "96x101", "96x100"].includes(s) || /^96x\d+$/.test(s)), sizes(room, /./).join(" "));
  } finally { unloadStands(); }
});

test("the room view: the room shown's present mibis walk at 96/304 (a seed each, in house order); a carried mibi (docked or away) is never drawn; the bed at the window's centre (Roots only); the window is the room's own painting with the edge's facts", () => {
  const S0 = scenes();
  { const { w, sv } = S0.docked, b = build(w, sv).props, R = b.regions;
    assert.equal(b.state, "rest"); assert.equal(R.residents.length, 5); assert.ok(R.residents.every((p) => Number.isInteger(p.seed) && p.seed !== 0)); assert.equal(R.bed.state, "empty"); assert.equal(R.bed.sleepers.length, 0);
    for (const m of sv.carried) assert.ok(!R.residents.some((p) => p.id === String(m)) && !b.focus.targets.some((t) => t.id === "resident." + m), "a carried mibi is neither a resident nor a target");
    assert.equal(R.window.picture, "room-roots-idle-day-1024x568"); assert.deepEqual(R.window.edge.crop, [0, 96]); assert.deepEqual(R.window.edge.painting, [1024, 568]); assert.ok(R.window.edge.keep.some((k) => k.id === "roots-tree" && k.leaves === "top")); assert.equal(R.window.edge.joins.length, 1);
    assert.deepEqual(R.drops.items, [], "no drop spot at rest"); assert.ok(!("carry" in R) && !("house" in R) && !("tucked" in R)); }
  { const { w, sv } = S0.away, R = build(w, sv).props.regions; assert.equal(R.residents.length, 5, "the carried two are not in the window"); }
  { const { w, sv } = S0.twelve, b = build(w, sv).props; assert.equal(b.regions.residents.length, 8, "a room shows its eight"); w.st.face.room = 1; const o = build(w, sv).props; assert.equal(o.regions.residents.length, 4, "the second room: the other four"); assert.ok(!("bed" in o.regions), "Reeds has no bed"); assert.deepEqual(o.regions.window.edge.crop, [176, 96]); }
  { const { w, sv } = S0.empty, b = build(w, sv).props; assert.equal(b.state, "empty"); assert.equal(b.regions.residents.length, 0); assert.deepEqual([b.regions.bed.state, b.regions.bed.sleepers.length], ["empty", 0], "the nest alone"); }
});

test("the chip row (§1, §8): a chip a room bought, Add a room below four rooms; the lit chip names the room; a full room says full", () => {
  for (const rooms of [1, 2, 3, 4]) {
    const w = roomsWorld(rooms), b = build(w, sv0()), items = b.props.regions.rooms.items, want = [...Array.from({ length: rooms }, (_, i) => String(i)), ...(rooms < 4 ? ["new"] : [])];
    assert.deepEqual(items.map((c) => c.id), want, `${rooms} rooms`); assert.deepEqual(items.filter((c) => c.lit).map((c) => c.id), ["0"], "the room shown is lit");
    assert.deepEqual(b.props.focus.targets.filter((t) => t.group === "room").map((t) => [t.id, t.index]), want.map((id, i) => ["room." + id, i]), "the chips are targets, by index");
    assert.ok(items.filter((c) => c.kind === "room").every((c) => /^room-(roots|reeds|boulders|ferns)-chip-day-128x32$/.test(c.picture)), "the 128 x 32 cuts (rooms.json chip)");
  }
  const w = roomsWorld(2); inRoom(w, 1, 8); const b = build(w, sv0()), c1 = b.props.regions.rooms.items[1]; assert.deepEqual([c1.count, c1.full], ["full", true]); assert.equal(b.props.regions.rooms.items[0].count, "0 of 8");
  const t = forty(); assert.ok(!build(t, sv0()).props.regions.rooms.items.some((c) => c.id === "new"), "no Add a room at four rooms");
  assert.deepEqual(build(roomsWorld(2), sv0()).top, {}, "no crumb: the lit chip names the view");
});

test("the card (§2): the focused mibi's portrait at 144/304, its name, the looks on which it differs from its kin, its one state, the five plates in their fixed places (no Move: the build's sign-off); your only {Species}; No mibis yet with one plate", () => {
  { const { w, sv } = scenes().empty, b = build(w, sv); assert.equal(b.props.regions.card.state, "empty"); assert.deepEqual(b.props.regions.card.plates.map((p) => p.id), ["plate.incubator"]); assert.equal(b.props.focus.cur, "plate.incubator", "the ring on it"); assert.equal(b.line.ok, "Go to the Incubator"); }
  { const { w, sv } = scenes().one, b = build(w, sv), C = b.props.regions.card, m = w.st.mibis[0];
    assert.deepEqual([C.state, C.name, C.looks], ["mibi", m.name, ["your only Loika"]]);
    assert.deepEqual(C.plates.map((p) => p.verb), ["Look", "Take along", "Tuck away", "Breed", "Return"]); assert.deepEqual(C.plates.map((p) => p.held), [false, false, true, true, true], "one mibi: Tuck away and Return held (the last at home), Breed held");
    assert.equal(C.plates[2].price, "⚡ 2"); assert.equal(C.plates[4].price, "", "Return has no price");
    assert.equal(build(w, sv, { focus: "plate.2" }).props.regions.card.why, "Your last mibi at home stays"); assert.equal(build(w, sv, { focus: "plate.3" }).props.regions.card.why, "no partner at home yet"); }
  { const w = roomsWorld(1), [a, b2] = inRoom(w, 0, 2); const looks = (m) => build(w, sv0(), { focus: "resident." + m.id }).props.regions.card.looks;
    const twin = Object.assign({}, b2); void twin; assert.ok(looks(a).length <= 3);
    assert.ok(looks(a).every((s) => typeof s === "string" && s.length > 0)); }
  { const { w, sv } = scenes().docked, m = w.st.mibis, C = build(w, sv, { focus: "resident." + m[0].id }).props.regions.card;
    assert.equal(C.words, "", "an adult with nothing to report has no state line"); assert.equal(C.mark, "");
    const t = build(w, sv, { last: m[5].id, focus: "plate.0" }).props.regions.card; assert.deepEqual([t.words, t.plates.filter((p) => !p.held).map((p) => p.verb)], ["on the Companion", ["Look", "Bring home"]], "a traveller: every plate held but Look and Bring home"); assert.equal(t.mark, "mark-companion-solid-16"); }
  { const w = roomsWorld(1), [a, b2, c] = inRoom(w, 0, 3); c.bonded = true; assert.equal(build(w, sv0(), { focus: "resident." + c.id }).props.regions.card.mark, "mark-heart-16"); tuck(w, a);
    const C = build(w, sv0(), { last: a.id, focus: "plate.0" }).props.regions.card; assert.deepEqual([C.words, C.mark, C.plates.map((p) => p.verb)[2], C.plates.filter((p) => !p.held).map((p) => p.verb)], ["since turn " + ((w.st.turn | 0) + 1), "mark-cold-16", "Bring out", ["Look", "Bring out"]], "a tucked mibi: Bring out live, the rest held"); void b2; }
});

test("the focus at rest (§3): the room view's targets are the present mibis in house order, then the chips, then the card's five plates; the ring on the mibi last seen up close, else the first; ▼ (and ▶ from the row's last) goes to the first live plate (Look), ▲ to the lit chip, ◀ from a plate to its mibi", () => {
  const { w, sv } = scenes().docked, m = w.st.mibis, b = build(w, sv), ids = b.props.focus.targets.map((t) => t.id);
  assert.deepEqual(ids, [...m.slice(0, 5).map((x) => "resident." + x.id), "room.0", "room.new", ...[0, 1, 2, 3, 4].map((k) => "plate." + k)]);
  assert.equal(b.props.focus.cur, "resident." + m[0].id); assert.equal(build(w, sv, { seen: m[3].id }).props.focus.cur, "resident." + m[3].id);
  const r = b.props.focus.resolve; assert.deepEqual([r["plate.first"], r["room.lit"], r["card.of"]], ["plate.0", "room.0", "resident." + m[0].id], "Look is the first live plate");
  assert.equal(build(w, sv, { focus: "plate.2", last: m[2].id }).props.regions.card.name, m[2].name, "the ring on a plate keeps the card on its mibi");
  assert.equal(b.line.ok, "Pick up " + m[0].name); assert.equal(b.line.back, "Home"); assert.equal(b.line.subject, "", "no context line");
  assert.equal(build(w, sv, { focus: "plate.0" }).line.ok, "Look at " + m[0].name); assert.equal(build(w, sv, { focus: "plate.2" }).line.ok, "Tuck " + m[0].name + " away ⚡2");
  assert.equal(build(w, sv, { focus: "room.0" }).line.ok, null, "a room's chip has no ✓ cap");
  { const { w: e, sv: s2 } = scenes().twelve; e.st.face.room = 0; e.st.rooms = 2; const x = inRoom(e, 1, 0); void x; e.st.mibis.forEach((q) => { if (q.room === 1) q.room = 0; }); }
});



test("coming out (§3, §6): the reserved silhouette on its drop spot with the lamp mark; the card says back in 2 turns and holds every plate but Look; the room counts it", () => {
  const w = roomsWorld(1), a = inRoom(w, 0, 3), q = inRoom(w, 0, 1)[0]; q.tucked = { turn: w.st.turn | 0, seq: 1, from: 0, out: (w.st.turn | 0) + 2, shift: 2, spot: 4 };
  const b = build(w, sv0(), { focus: "resident." + q.id }), R = b.props.regions;
  assert.deepEqual(R.reserved.items.map((x) => [x.id, x.spot, x.mark]), [[String(q.id), 4, "home-lamp-sky-12x12"]]); assert.match(R.reserved.items[0].picture, /^mibi:/);
  assert.ok(!R.residents.some((p) => p.id === String(q.id)), "not a walker"); assert.ok(b.props.focus.targets.some((t) => t.id === "resident." + q.id), "a target");
  assert.deepEqual([R.card.words, R.card.plates.filter((p) => !p.held).map((p) => p.verb)], ["back in 2 turns", ["Look"]]); assert.equal(b.line.ok, null, "no ✓: Pick up is held");
  assert.equal(R.rooms.items[0].count, "4 of 8"); void a;
});




test("the way in (§7): an empty room puts the ring on its chip and the card keeps the last mibi seen; every mibi away: the ring on the chip; no mibi at all: Go to the Incubator", () => {
  { const w = roomsWorld(2), a = inRoom(w, 0, 3); w.st.face.room = 1; const b = build(w, sv0(), { last: a[1].id }); assert.deepEqual([b.props.state, b.props.focus.cur, b.props.regions.card.name], ["empty", "room.1", a[1].name]);
    const c = build(w, sv0()).props.regions.card; assert.deepEqual([c.state, c.name, c.plates.length], ["mibi", a[0].name, 5], "none seen yet: the house's first, never a blank card"); }
  { const w = roomsWorld(1), a = inRoom(w, 0, 2); dock(w.st, false); const b = build(w, sv0({ carried: a.map((m) => m.id) })); assert.deepEqual([b.props.state, b.props.focus.cur, b.props.regions.residents.length], ["rest", "room.0", 0]); }
  { const w = roomsWorld(3), a = inRoom(w, 0, 2); inRoom(w, 2, 2); w.st.face.room = 2; assert.equal(build(w, sv0()).props.regions.room.id, "boulders"); assert.deepEqual(build(w, sv0()).props.regions.window.edge.crop, [178, 96]); void a; }
});

test("a mibi that grows up changes every picture id from :juvenile: to :adult:, at the same one-factor size (the collection's views)", () => {
  const w = world(); dock(w.st); const m = mibis(w, 4); for (const x of m) x.born = w.st.turn;
  const ids = (b) => b.requests.filter((r) => r.kind === "mibi").map((r) => r.id), sv = sv0();
  const young = ids(build(w, sv)); assert.ok(young.length >= 4 && young.every((id) => /:juvenile:\d+x\d+(:|$)/.test(id)), young.join(" "));
  w.st.turn += w.settings.adultTurns ?? S.JUVENILE_TURNS; const grown = ids(build(w, sv)); assert.ok(grown.every((id) => /:adult:\d+x\d+(:|$)/.test(id)), grown.join(" "));
  assert.deepEqual(grown.map((id) => id.match(/:(\d+x\d+)/)[1]).sort(), young.map((id) => id.match(/:(\d+x\d+)/)[1]).sort(), "one factor: the picture's size does not follow the stage");
});

// ---- the moving sets at one scale: at the room view's factor the moving sets' atlases (cut at the world size) do not play ----
import { setMoving } from "../src/moving.mjs";
{ const ix = J("moving/index.json"), sets = {}; for (const id of ix.sets) sets[id] = J(`moving/${id}.json`); setMoving(sets); }
test("the room view's residents carry no moving set at its factor (vivarium.json notes.scale), and their rest still follows the Station time", () => {
  const { w, sv } = scenes().docked, rules = spec.rules.rest;
  for (const [time, want] of [[23 * 3600, "asleep"], [12 * 3600, "awake"]]) { const b = build(w, sv, { time, restRules: rules, motionSets: true }); assert.deepEqual(validate(b.props, schema), []); assert.ok(b.props.regions.residents.every((r) => !r.moving && r.rest === want), JSON.stringify(b.props.regions.residents.map((r) => [r.rest, !!r.moving]))); assert.ok(!b.requests.some((q) => q.kind === "moving")); }
});

test("fix 7: the room view's residents take the scene's light (id suffix and request light), the house view's and the card's too", () => {
  const w = world(2); mibis(w, 6); dock(w.st); const sv = sv0({ carried: [w.st.mibis[0].id] });
  for (const o of [{}, { view: "house" }]) { const reqs = (light) => build(w, sv, { light, ...o }).requests.filter((r) => r.kind === "mibi"), day = reqs("day");
    assert.ok(day.length >= 5 && day.every((r) => !("light" in r)));
    for (const light of ["dawn", "dusk", "night"]) { const got = reqs(light); assert.equal(got.length, day.length); for (const r of got) assert.ok(r.light === light && r.id.endsWith(":" + light), r.id); } }
});

test("residents carry their figure, sleepers the curl at 96/304 and its figure; the keep-out is the bed's span from the tallest curl's top, derived (make-keepout.mjs), and every drop spot of Roots is off it", () => {
  const masters = path.resolve(here, "../../ui/assets/masters"), index = JSON.parse(readFileSync(path.join(masters, "index.json"), "utf8")).masters, placed = [];
  loadStandLooksFs(); loadStandLayersFs();
  try {
    for (const id of ["mibi-adult-S01-curl-304x312", "mibi-juvenile-S01-curl-304x312", "mibi-adult-S01-304x312", "mibi-juvenile-S01-304x312"]) { const e = index[id]; if (!e) continue; const p = decodePNG(readFileSync(path.join(masters, e.file))); placeMaster({ id, w: e.w, h: e.h, file: e.file, hash: e.sha256, signed: e.signed, status: "master" }, { w: p.width, h: p.height, rgba: () => new Uint8ClampedArray(p.data) }); placed.push(id); }
    const w = world(); dock(w.st); mibis(w, 3); S.seedAdults(w.st, "S01", 9, 5, w.settings); for (const x of w.st.mibis) x.paint = { state: "landed" };
    const b = build(w, sv0()), R = b.props.regions;
    for (const r of R.residents) { assert.ok(Array.isArray(r.figure) && r.figure.length === 4 && r.figure.every(Number.isInteger), "a walker carries its figure [dx, dy, W, H]"); assert.ok(r.figure[2] > 0 && r.figure[3] > 0 && r.figure[1] + r.figure[3] <= 99); }
    assert.equal(R.bed.sleepers.length, 3); assert.equal(R.bed.state, "resting"); for (const sl of R.bed.sleepers) assert.ok(sl.figure, "a sleeper carries the curl's figure");
    const K = spec.regions.resident.walk.keepOut; assert.deepEqual(K, keepOutOf(spec, measureCurls()), "keepOut is derived from the measured curls, never typed");
    assert.deepEqual([K[0], K[2]], [spec.regions.bed.rect[0], spec.regions.bed.rect[2]], "the bed's span"); assert.equal(K[1] + K[3], spec.regions.window.foot[1]);
    const rooms = J("rooms.json"); for (const [x, y] of rooms.rooms.roots.drops) { const fx = x, feet = y - 8; assert.ok(!(fx >= K[0] && fx < K[0] + K[2] && feet > K[1]), `drop (${x}, ${y}) is off the keep-out`); }
  } finally { for (const id of placed) dropAsset(id); unloadStands(); }
});

// ---- the host: the ring on a chip shows its view (st.face.room is the rules' one home for the room shown), the swap's dither, the way in, the flip ----
for (const k of ["frame", "pods", "home", "vivarium", "habitat", "panel"]) SPECS[k] = J(k + ".json");
const hostRig = ({ motion = true } = {}) => {
  const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", rooms: null }; G.settings = settings; G.st = S.freshSt("w1", 1, 1000); S.normalize(G.st); G.st.firstMibi = false; G.st.rooms = 2; G.st.e = 99; G.st.dock = { docked: true, at: 1000 };
  G.sv = { v: 8, seed: 7, wid: "w1", turn: 3, bay: [], mibis: [], carried: [], tier: 1, shield: 3, st: G.st }; const a = inRoomG(0, 3), b = inRoomG(1, 2);
  UI.screen = "vivarium"; UI.idle = false; UI.panel = null; UI.viv = { f: "resident." + a[0].id, prev: null, view: "room", page: 0, carry: null, pick: null, last: null }; UI.hab.id = null;
  const sent = []; let t = 0; const h = createHost({ send: (m) => sent.push(m), nowMs: () => t, light: () => "day", motion: () => motion }); h.save = () => { h.saved = (h.saved ?? 0) + 1; };
  return { h, sent, a, b, at: (ms) => { t = ms; h.frame(); } };
};
const inRoomG = (room, n) => { const k = G.st.mibis.length; S.seedAdults(G.st, "S01", 5 + room + k, n, G.settings); const out = G.st.mibis.slice(k); out.forEach((m, i) => { m.room = room; m.slot = i; m.bay = room * S.ROOM + i; m.paint = { state: "landed" }; }); return out; };
const focusMsg = (h, target) => onFaceMessage(h, { t: "focus", screen: "vivarium", target });
const intent = (h, target, verb = "confirm") => onFaceMessage(h, { t: "intent", seq: 1, screen: "vivarium", target, verb });
test("the ring on a room's chip shows that room: st.face.room is set and the window cross-dithers from the old room in 200 ms (the swap event)", () => {
  const { h, sent, at } = hostRig(); at(0);
  focusMsg(h, "room.1"); assert.deepEqual([G.st.face.room, UI.viv.f, UI.viv.view], [1, "room.1", "room"]);
  assert.deepEqual(sent.at(-1), { t: "event", kind: "dither", target: "window", from: "room-roots-idle-day-1024x568", ms: 200, hold: 0 });
  { const p = screenProps(""); assert.equal(p.msg.regions.window.picture, "room-reeds-idle-day-1024x568"); assert.ok(p.ids.includes("room-roots-idle-day-1024x568"), "the old painting stays on the face until the event ends"); }
  at(200); assert.equal(UI.viv.prev, null);
  focusMsg(h, "room.0"); assert.deepEqual([UI.viv.view, G.st.face.room], ["room", 0]); assert.ok(h.saved >= 2, "the room last shown is saved");
});
test("the Add a room? panel rides on the Vivarium: ✓ on Add a room opens it; ✓ on Add the room through the host adds the room and shows it empty with the ring on its chip", () => {
  const { h, at } = hostRig(); at(0); G.st.rooms = 1; G.st.mibis = G.st.mibis.filter((m) => m.room === 0); G.st.face.room = 0; UI.viv.f = "room.new";
  intent(h, "room.new"); assert.equal(UI.panel.id, "addRoom");
  const p = screenProps(""); assert.deepEqual([p.msg.overlay.id, p.msg.overlay.focus.cur, p.msg.frame.line.ok, p.msg.frame.line.price], ["panel", "card.add", "Add the room", "⚡ 4"]);
  onFaceMessage(h, { t: "intent", seq: 2, screen: "panel", target: "card.add", verb: "confirm" });
  assert.deepEqual([G.st.rooms, G.st.e, G.st.face.room, UI.viv.f, UI.panel], [2, 95, 1, "room.1", null]); const q = screenProps(""); assert.equal(q.msg.focus.cur, "room.1"); assert.equal(q.msg.state, "empty", "the new room is shown empty");
});
test("✓ Look opens one mibi up close and ← comes back to the ring on it; ✓ on a held plate says its message plate and changes nothing; ← at rest goes Home with the ring on the panel", () => {
  const { h, a, at } = hostRig(); at(0); UI.viv.f = "plate.0"; UI.viv.last = a[0].id; intent(h, "plate.0"); assert.deepEqual([UI.screen, UI.hab.id], ["habitat", a[0].id]); at(1000);   // the look's hold ends
  UI.screen = "vivarium"; UI.viv.f = null; const p = screenProps(""); assert.equal(p.msg.focus.cur, "resident." + a[0].id);
  G.st.mibis = [a[0]]; UI.viv.f = "plate.2"; UI.viv.last = a[0].id; const said = []; h.say = (m) => said.push(m); intent(h, "plate.2"); assert.deepEqual(said, ["Your last mibi at home stays"]); assert.ok(!S.inStore(a[0]));
  intent(h, "plate.2", "back"); assert.equal(UI.viv.view, "wall", "← from the look at the room is the Wall"); intent(h, "cell." + a[0].id, "back"); assert.deepEqual([UI.screen, UI.home.f], ["home", "vivarium"]);
});

// ---- R4b: where the resters rest (vivarium.json rules.show.where, the owner's cats) ----
test("R4b rest places: Roots' resters take the bed in rest order, drawn as sleepers; in a room with no bed they curl or go out (at most two curls); a mibi brought in from the house view is pinned shown, the ring alone wakes no rester", () => {
  const masters = path.resolve(here, "../../ui/assets/masters"), index = JSON.parse(readFileSync(path.join(masters, "index.json"), "utf8")).masters, placed = [];
  loadStandLooksFs(); loadStandLayersFs();
  try {
    for (const id of ["mibi-adult-S01-curl-304x312", "mibi-juvenile-S01-curl-304x312", "mibi-adult-S01-304x312", "mibi-juvenile-S01-304x312"]) { const e = index[id]; if (!e) continue; const p = decodePNG(readFileSync(path.join(masters, e.file))); placeMaster({ id, w: e.w, h: e.h, file: e.file, hash: e.sha256, signed: e.signed, status: "master" }, { w: p.width, h: p.height, rgba: () => new Uint8ClampedArray(p.data) }); placed.push(id); }
    const mk = (room) => { const w = world(2); dock(w.st); mibis(w, 8); w.st.mibis.forEach((m, i) => { m.room = room; m.slot = i; m.bay = room * 8 + i; m.born = w.st.turn - 100; }); w.st.face.room = room; return w; };
    { const w = mk(0), b = build(w, sv0()).props.regions, rest = b.residents.filter((p) => !p.shown); assert.equal(rest.length, 3); assert.ok(rest.every((p) => p.restAt === "bed")); assert.equal(b.bed.sleepers.length, 3); }
    { const w = mk(1), b = build(w, sv0()).props.regions, rest = b.residents.filter((p) => !p.shown); assert.equal(rest.length, 3); assert.ok(!("bed" in b)); assert.ok(rest.every((p) => ["curl", "out"].includes(p.restAt))); assert.ok(rest.filter((p) => p.restAt === "curl").length <= 2);
      const r0 = rest[0].id; assert.equal(build(w, sv0(), { focus: "resident." + r0, pin: r0 }).props.regions.residents.find((p) => p.id === r0).shown, true, "brought in from the house view (pin): it walks in");
      assert.equal(build(w, sv0(), { focus: "resident." + r0 }).props.regions.residents.find((p) => p.id === r0).shown, false, "the ring alone on a rester does not wake it (the room is not reshuffled under the ring)"); }
  } finally { for (const id of placed) dropAsset(id); unloadStands(); }
});

test("R4b a traveller home: it is fresh (roomSince = now pins it among the five), marked enter: edge while the walk runs, and is a resident again (no longer on the Companion)", () => {
  const w = world(); dock(w.st); const m = mibis(w, 8), now = T0 + 12 * 3600 * 1000, sv = sv0({ carried: [m[0].id] });
  assert.ok(!build(w, sv).props.regions.residents.some((p) => p.id === String(m[0].id)), "carried: not in the room");
  const back = sv0(); m[0].roomSince = now - 1000;
  const b = build(w, back, { arrived: [m[0].id], now }), p = b.props.regions.residents.find((q) => q.id === String(m[0].id));
  assert.equal(p.enter, "edge"); assert.equal(p.shown, true); assert.equal(b.props.regions.residents.filter((q) => q.shown).length, 5);
  assert.deepEqual(validate(b.props, schema), []);
});
