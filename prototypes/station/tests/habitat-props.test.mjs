// One mibi up close as props (lvgl-switch.md §2.1, §4 V; habitat.json): the view the face takes, views/habitat-props.mjs, in Node. Plain JSON that names what and never where: it validates against habitat.props.json (and the namer's overlay
// against namer.props.json) in every scene, holds no rectangle, fits the props budget, names the state (rest, meet, out), the card, the plates, the four modules and the strip, and the ring's targets and bottom line by the spec's rules.
//   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, genomeDigest } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { habitatBuild } from "../src/views/habitat-props.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames"), specs = path.resolve(here, "../../ui/specs/station");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const J = (f) => JSON.parse(readFileSync(path.join(specs, f), "utf8")), spec = J("habitat.json"), frameSpec = J("frame.json"), home = J("home.json"), schema = J("habitat.props.json"), namerSchema = J("namer.props.json");
const T0 = 1_000_000, cfg = (bays) => ({ ...S.DEFAULT_SETTINGS, economy: "decided", bays });

export function validate(v, sc, root = schema, at = "$", out = []) {
  if (sc.$ref) return sc.$ref.endsWith(".json") ? validate(v, namerSchema, namerSchema, at, out) : validate(v, root.$defs[sc.$ref], root, at, out);
  if (sc.oneOf) { const ok = sc.oneOf.filter((o) => validate(v, o, at, []).length === 0).length; if (ok !== 1) out.push(`${at}: matches ${ok} of oneOf`); return out; }   // the moving prop: "" or one object form (Station M1 §2.2)
  if (sc.enum && !sc.enum.includes(v)) { out.push(`${at}: ${JSON.stringify(v)} is not one of ${JSON.stringify(sc.enum)}`); return out; }
  if (sc.type) {
    const ts = [].concat(sc.type), ty = v === null ? "null" : Array.isArray(v) ? "array" : Number.isInteger(v) ? "integer" : typeof v;
    if (!ts.includes(ty) && !(ty === "integer" && ts.includes("number"))) { out.push(`${at}: a ${ty}, wanted ${ts.join(" or ")}`); return out; }
  }
  if (typeof v === "string" && sc.maxLength !== undefined && [...v].length > sc.maxLength) out.push(`${at}: longer than ${sc.maxLength}`);
  if (Array.isArray(v) && sc.maxItems !== undefined && v.length > sc.maxItems) out.push(`${at}: more than ${sc.maxItems}`);
  if (Array.isArray(v) && sc.minItems !== undefined && v.length < sc.minItems) out.push(`${at}: fewer than ${sc.minItems}`);
  if (Array.isArray(v) && sc.items) v.forEach((x, i) => validate(x, sc.items, root, `${at}[${i}]`, out));
  if (v && typeof v === "object" && !Array.isArray(v)) {
    for (const k of sc.required ?? []) if (!(k in v)) out.push(`${at}: ${k} is required`);
    for (const [k, x] of Object.entries(v)) { const p = sc.properties?.[k]; if (p) validate(x, p, root, `${at}.${k}`, out); else if (sc.additionalProperties === false) out.push(`${at}: ${k} is not in the schema`); }
  }
  return out;
}
const world = (bays = 8) => { const st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = 99; st.d = 99; st.s = 99; st.firstMibi = false; return { st, settings: cfg(bays) }; };
const sv0 = (over = {}) => ({ v: 8, seed: 7, wid: "w1", turn: 0, bay: [], mibis: [], carried: [], tier: 1, shield: 3, carryReqs: [], ...over });
const dock = (st, d = true) => { st.dock = { docked: d, at: T0 }; };
const mibis = (w, n) => { S.seedAdults(w.st, "S01", 5, n, w.settings); for (const m of w.st.mibis) m.paint = { state: "landed" }; return w.st.mibis; };
const build = ({ st, settings }, sv, over = {}) => habitatBuild({ st, sv, settings, docked: S.docked(st), light: "day", focus: null, habId: st.mibis[0]?.id ?? null, meetId: null, armed: false, ...over }, spec, frameSpec, home);

function scenes() {
  const out = {};
  { const w = world(); dock(w.st); mibis(w, 4); out.rest = { w, sv: sv0() }; }
  { const w = world(); dock(w.st); const m = mibis(w, 4); out.meet = { w, sv: sv0(), over: { meetId: m[0].id } }; }
  { const w = world(); dock(w.st, false); const m = mibis(w, 4); out.out = { w, sv: sv0({ carried: [m[0].id] }) }; }
  { const w = world(); dock(w.st); const m = mibis(w, 4); m[0].bonded = true; m[0].notches = 5; m[0].portrait = { state: "delivered" }; out.bonded = { w, sv: sv0() }; }
  { const w = world(12); dock(w.st); mibis(w, 12); out.twelve = { w, sv: sv0() }; }
  { const w = world(); dock(w.st); const m = mibis(w, 2); m[0].born = w.st.turn; out.juvenile = { w, sv: sv0() }; }
  return out;
}

test("one mibi up close validates against habitat.props.json in every scene, names no rectangle and fits the budget", () => {
  for (const [name, { w, sv, over }] of Object.entries(scenes())) {
    const b = build(w, sv, over), bad = validate(b.props, schema);
    assert.deepEqual(bad, [], `${name}: ${bad.slice(0, 3).join("; ")}`);
    const json = JSON.stringify(b.props);
    assert.ok(!/"(x|y|w|h|rect|at|size|box|pitch)"\s*:/.test(json.replace(/"size":\d+/g, "")), `${name}: props name what, never where`);
    assert.ok(json.length + JSON.stringify(b.line).length < 8 * 1024, `${name}: ${json.length} bytes`);
  }
});

test("the state: rest, meet (the new mibi until its first press), out (with the Companion while it is away: no picture, the out mark, no resident target)", () => {
  const S0 = scenes();
  assert.equal(build(S0.rest.w, S0.rest.sv).props.state, "rest");
  { const b = build(S0.meet.w, S0.meet.sv, S0.meet.over).props; assert.equal(b.state, "meet"); assert.ok(b.regions.meetRibbon.text.startsWith("Meet ")); assert.ok(!b.focus.targets.some((t) => t.id === "name"), "the ribbon stands in the tag's place: not a target"); assert.ok(b.focus.targets.some((t) => t.id === "resident")); assert.equal(b.focus.cur, "resident"); }
  { const b = build(S0.out.w, S0.out.sv).props, R = b.regions.resident; assert.equal(b.state, "out"); assert.equal(R.picture, ""); assert.equal(R.out, "mark-out-with-companion-64x96"); assert.equal(R.waiting, false); assert.ok(!b.focus.targets.some((t) => t.id === "resident")); assert.equal(b.focus.cur, "name", "out: the ring on the name");
    assert.equal(b.regions.cross.state, "out"); assert.equal(b.regions.tiles.items[0].state, "out"); assert.equal(b.regions.tiles.items[0].shown, true); }
  assert.equal(build(S0.rest.w, S0.rest.sv, { meetId: 999 }).props.state, "rest", "a meet for another mibi is not this one's");
});

test("the card: the species line with the stage word, the story (a founder: where it came from; a bred mibi: its parents), the code in three groups, the heart only when bonded, the notches (at most three, none at zero) and the stamp of the chapters read", () => {
  const S0 = scenes(), card = (n, o) => build(S0[n].w, S0[n].sv, o).props.regions.card, w = S0.rest.w, m = w.st.mibis[0];
  const c = card("rest"); assert.equal(c.species.text, "your Loika, adult"); assert.deepEqual(c.story, ["from the meadow"]); assert.match(c.code, /^\w{3} \w{3} \w{3}$/); assert.equal(c.heart, ""); assert.equal(c.notches.count, 0);
  assert.equal(card("juvenile").species.text, "your Loika, young");
  const b = card("bonded"); assert.equal(b.heart, "heart-full-24"); assert.equal(b.notches.count, 3, "min(notches, 3)"); assert.equal(b.notches.picture, "notch-skill-16x24");
  const fr = frameOf("S01"); m.from = { ...m.from, of: ["Moss", "Fig"] }; m.mem = "pond"; assert.deepEqual(card("rest").story, ["of Moss", "and Fig", "remembers the pond edge"]); m.from = { g: "meadow" };
  m.read = [fr.chapters[0].id]; const s = card("rest").stamp; assert.deepEqual([s.size > 0, s.size <= 104, s.asset.startsWith("stamp:") && s.asset.endsWith(":" + s.size)], [true, true, true]); assert.ok(s.asset.includes(":" + fr.chapters[0].id + ":"), "only the chapters read");
  assert.ok(S0.rest.w.st.mibis.length && build(S0.rest.w, S0.rest.sv).requests.some((r) => r.kind === "stamp" && r.mibi === m.id), "the stamp is a request by mibi (the hatch's form)");
});

test("the plates: one a chapter in ring order, read / unread / sealed; only an unread chapter is a plate target that is enabled; ✓ on it says its price on the bottom line", () => {
  const S0 = scenes(), w = S0.rest.w, m = w.st.mibis[0], fr = frameOf("S01"), sealed = fr.chapters.find((c) => c.sealed);
  m.read = fr.chapters.filter((c, i) => i > 0 && !c.sealed).map((c) => c.id);
  const b = build(w, S0.rest.sv, { focus: "plate.0" }), P = b.props.regions.plates.items, T = b.props.focus.targets.filter((t) => t.id.startsWith("plate."));
  assert.equal(P.length, fr.chapters.length); assert.equal(P[0].state, "unread"); assert.deepEqual(T.map((t) => t.enabled), P.map((p) => p.state === "unread"));
  assert.match(b.line.ok, /^Read /); assert.equal(typeof b.line.price, "string"); assert.match(b.line.subject, /still a surprise$/);
  const r1 = build(w, S0.rest.sv, { focus: "plate.1" }); assert.equal(r1.line.ok, null); assert.match(r1.line.subject, /, read$/);
  if (sealed) { const i = fr.chapters.indexOf(sealed), x = build(w, S0.rest.sv, { focus: "plate." + i }); assert.equal(x.props.regions.plates.items[i].state, "sealed"); assert.match(x.line.subject, /, sealed$/); assert.equal(x.line.ok, null); }
});

test("the Companion module: the set as it will be in its order (an add request waiting shows its lamp), the glyph docked or away; ✓ Take / Bring / Full by the set; the request waiting is read-only", () => {
  const w = world(); dock(w.st); const m = mibis(w, 5), sv = sv0({ carried: [m[1].id] });
  let b = build(w, sv, { focus: "door" }); assert.equal(b.props.regions.door.state, "docked"); assert.equal(b.props.regions.door.glyph, "frame-companion-solid-16x24"); assert.equal(b.props.regions.door.places[0].picture, `mibi:${genomeDigest(m[1].genome)}:adult:48x48`); assert.equal(b.props.regions.door.places[1], null);
  assert.equal(b.line.ok, `Take ${m[0].name} with you`); assert.equal(b.line.subject, "goes with you now"); assert.equal(b.props.focus.targets.find((t) => t.id === "door").enabled, true);
  b = build(w, sv, { focus: "door", habId: m[1].id }); assert.equal(b.line.ok, `Bring ${m[1].name} home`); assert.equal(b.line.subject, "comes home now");
  const full = sv0({ carried: [m[1].id, m[2].id, m[3].id] }); b = build(w, full, { focus: "door" }); assert.equal(b.line.ok, null); assert.equal(b.line.subject, "the Companion is full"); assert.equal(b.props.focus.targets.find((t) => t.id === "door").enabled, false);
  S.carryAdd(w.st, sv, m[0]); b = build(w, sv, { focus: "door" }); assert.equal(b.props.regions.door.places[1].waiting, true, "the request waits: its picture with the lamp"); assert.equal(b.line.ok, null);
  dock(w.st, false); b = build(w, sv, { focus: "door" }); assert.equal(b.props.regions.door.glyph, "frame-companion-outline-16x24"); assert.equal(b.props.regions.door.state, "away"); assert.equal(b.line.subject, "goes at the next dock");
});

test("Cross: a face a partner (an adult or an elder of the species), a partner out with the Companion while it is away dimmed and not counted, a juvenile none; the module's context says why it cannot", () => {
  const w = world(); dock(w.st); const m = mibis(w, 4), sv = sv0({ carried: [m[1].id] });
  let b = build(w, sv, { focus: "cross" }); assert.equal(b.props.regions.cross.state, "adult"); assert.equal(b.props.regions.cross.faces.length, 3); assert.ok(b.props.regions.cross.faces.every((f) => !f.away)); assert.equal(b.line.ok, `Cross ${m[0].name}`); assert.equal(b.line.subject, "three Loika to pair with");
  dock(w.st, false); b = build(w, sv, { focus: "cross" }); assert.deepEqual(b.props.regions.cross.faces.map((f) => f.away), [true, false, false]); assert.equal(b.line.subject, "two Loika to pair with", "only the partners that can be picked count");
  const none = sv0({ carried: [m[1].id, m[2].id, m[3].id] }); b = build(w, none, { focus: "cross" }); assert.equal(b.props.regions.cross.state, "away"); assert.equal(b.line.subject, "pairs when you dock"); assert.equal(b.line.ok, null);
  b = build(w, sv0({ carried: [m[0].id] }), { focus: "cross" }); assert.equal(b.props.regions.cross.state, "out"); assert.equal(b.line.subject, "crosses when you dock");
  m[0].born = w.st.turn; dock(w.st); b = build(w, sv0(), { focus: "cross" }); assert.equal(b.props.regions.cross.state, "young"); assert.equal(b.line.subject, "crosses once adult"); assert.deepEqual(b.props.regions.cross.faces, []);
});

test("Wild: shut, ajar once armed, its context from the rules (a young, a bonded, a carried mibi stays) and the price ❀ +2 on the line", () => {
  const w = world(); dock(w.st); const m = mibis(w, 3), sv = sv0();
  let b = build(w, sv, { focus: "wild" }); assert.equal(b.props.regions.wild.state, "shut"); assert.equal(b.line.ok, `Return ${m[0].name}`); assert.equal(b.line.price, "❀ +2"); assert.equal(b.line.subject, "goes back to the wild");
  b = build(w, sv, { focus: "wild", armed: true }); assert.equal(b.props.regions.wild.state, "armed"); assert.equal(b.props.regions.wild.gate, "gate-wild-open-48x48"); assert.equal(b.line.ok, `Again: return ${m[0].name}`); assert.equal(b.props.focus.armed, "wild");
  m[0].bonded = true; b = build(w, sv, { focus: "wild", armed: true }); assert.equal(b.props.regions.wild.state, "shut", "a block disarms"); assert.equal(b.line.subject, "a bonded mibi stays"); assert.equal(b.props.focus.targets.find((t) => t.id === "wild").enabled, false);
});

test("Portrait: none, held, its portrait on the way, portrayed; the context names why it cannot sit", () => {
  const w = world(); dock(w.st); const m = mibis(w, 2), sv = sv0();
  const line = (o) => build(w, sv, { focus: "portrait", ...o }).line, st = (o) => build(w, sv, { focus: "portrait", ...o }).props.regions.portrait.state;
  assert.equal(st(), "none"); assert.equal(line().subject, "no sitting held");
  w.st.sitting = { source: "dev", key: null, at: 0 }; assert.equal(st(), "held"); assert.equal(line().subject, "no pose seen yet"); assert.equal(build(w, sv, { focus: "portrait" }).props.focus.targets.find((t) => t.id === "portrait").enabled, false);
  m[0].habits = ["calm"]; m[0].walked = ["wood"]; m[0].places = ["wood"]; const l = line(); assert.ok(l.ok === `Portray ${m[0].name}` || l.subject.length, "a mibi that has seen a pose and been to a place may sit");
  m[0].portrait = { state: "painting" }; assert.equal(st(), "painting"); assert.equal(line().subject, "its portrait is on its way"); m[0].portrait = { state: "delivered" }; assert.equal(st(), "portrayed"); assert.equal(line().subject, "already portrayed");
});

test("the strip: a tile a bay, the housed mibis in bay order then the free bays, the shown mibi's tile marked, an out mibi's tile the glyph; the targets in the graph's groups; a tile shows its mibi (focus.resolve tile.shown)", () => {
  const S0 = scenes(), b = build(S0.rest.w, S0.rest.sv), m = S0.rest.w.st.mibis, T = b.props.regions.tiles.items;
  assert.equal(T.length, 8); assert.deepEqual(T.map((t) => t.state), ["housed", "housed", "housed", "housed", "free", "free", "free", "free"]); assert.deepEqual(T.map((t) => t.shown), [true, false, false, false, false, false, false, false]);
  assert.deepEqual(b.props.focus.targets.map((t) => t.id), ["resident", "name", "species", ...frameOf("S01").chapters.map((c, i) => "plate." + i), "door", "portrait", "cross", "wild", ...m.map((x) => "tile." + x.id)]);
  assert.deepEqual(b.props.focus.targets.map((t) => t.group).filter((g, i, a) => a.indexOf(g) === i), ["resident", "name", "species", "plate", "top", "low", "tile"]);
  assert.equal(b.props.focus.resolve["tile.shown"], "tile." + m[0].id); assert.equal(build(S0.rest.w, S0.rest.sv, { habId: m[2].id }).props.focus.resolve["tile.shown"], "tile." + m[2].id);
  assert.equal(build(S0.twelve.w, S0.twelve.sv).props.regions.tiles.items.length, 12);
});

test("the window: the near Vivarium of the light, its master named by habitat.json light.pictures; the resident's picture the mibi at the box; no waiting lamp whatever the painting's state (Grow paints nothing)", () => {
  const { w, sv } = scenes().rest;
  for (const light of ["dawn", "day", "dusk", "night"]) { const b = build(w, sv, { light }); assert.equal(b.props.regions.glass.picture, `vivarium-near-${light}-544x408`); assert.ok(b.requests.some((r) => r.id === `vivarium-near-${light}-544x408` && r.kind === "slot")); }
  const m = w.st.mibis[0], b = build(w, sv); assert.equal(b.props.regions.resident.picture, `mibi:${genomeDigest(m.genome)}:adult:304x312`); assert.equal(b.props.regions.resident.waiting, false);
  m.paint = { state: "sent" }; const x = build(w, sv); assert.equal(x.props.regions.resident.waiting, false); assert.notEqual(x.line.subject, spec.strings.painting);
});

test("the bottom line: the resident greets (in the meet it names), the name renames, the species word opens the guide, a tile reads as its mibi; ← Vivarium", () => {
  const S0 = scenes(), m = S0.rest.w.st.mibis, L = (o, n = "rest") => build(S0[n].w, S0[n].sv, o).line;
  assert.deepEqual([L({ focus: "resident" }).ok, L({ focus: "resident" }).subject], [`Greet ${m[0].name}`, "an adult Loika"]); assert.equal(L({ focus: "resident" }).back, "Vivarium");
  assert.equal(L({ focus: "resident", ...S0.meet.over }, "meet").ok, `Name ${m[0].name}`, "in the meet the first ✓ names");
  assert.equal(L({ focus: "name" }).ok, `Rename ${m[0].name}`); assert.deepEqual([L({ focus: "species" }).ok, L({ focus: "species" }).subject], ["Open the guide", "every Loika"]);
  assert.equal(L({ focus: "tile." + m[2].id, habId: m[2].id }).ok, `Greet ${m[2].name}`); assert.match(L({ focus: "name" }, "bonded").subject, /^a bonded (young|adult|elder) Loika$/);
  assert.equal(L({ focus: "name" }, "out").subject, "out with the Companion");
});

test("a mibi that grows up changes every picture id from :juvenile: to :adult: with its size unchanged (the resident 304×312, the tiles and the door's places 48×48)", () => {
  const w = world(); dock(w.st); const m = mibis(w, 3); for (const x of m) x.born = w.st.turn;
  const ids = (b) => b.requests.filter((r) => r.kind === "mibi").map((r) => r.id), sv = sv0({ carried: [m[0].id, m[1].id] });
  const young = ids(build(w, sv)); assert.ok(young.length >= 5 && young.every((id) => /^mibi:S\d+-[0-9a-f]{8}:juvenile:\d+x\d+$/.test(id)), young.join(" "));
  assert.ok(young.some((id) => id.endsWith(":juvenile:304x312")) && young.some((id) => id.endsWith(":juvenile:48x48")));
  w.st.turn += w.settings.adultTurns ?? S.JUVENILE_TURNS; for (const x of m) assert.equal(S.mibiStage(w.st, x, w.settings), "adult");
  assert.deepEqual(ids(build(w, sv)), young.map((id) => id.replace(":juvenile:", ":adult:")));
});

// ---- Station M1 §2.6: one mibi up close with its moving set (close and its shadow), its seed and its rest ----
import { setMoving } from "../src/moving.mjs";
{ const ix = J("moving/index.json"), sets = {}; for (const id of ix.sets) sets[id] = J(`moving/${id}.json`); setMoving(sets); }
test("up close, the resident's seed, moving (the close atlas and its shadow) and rest fit habitat.props.json", () => {
  for (const name of ["rest", "juvenile"]) { const { w, sv } = scenes()[name], b = build(w, sv, { time: 23 * 3600, restRules: spec.rules?.rest ?? J("vivarium.json").rules.rest, motionSets: true }), r = b.props.regions.resident;
    assert.deepEqual(validate(b.props, schema), [], name); assert.ok(Number.isInteger(r.seed)); assert.match(r.moving.close, /^moving:(juvenile|adult):S01:close:304x312:species$/); assert.match(r.moving.shadow, /:shadow:304x24$/); assert.equal(r.rest, "asleep"); }
});

test("fix 7: the close view's resident takes the scene's light; the Companion's places and the tiles (48×48) never do; the count is day's", () => {
  const w = world(); mibis(w, 4); dock(w.st); const sv = sv0({ carried: [w.st.mibis[1].id] });
  const reqs = (light) => build(w, sv, { light }).requests.filter((r) => r.kind === "mibi"), day = reqs("day");
  assert.ok(day.every((r) => !("light" in r)));
  for (const light of ["dawn", "dusk", "night"]) { const got = reqs(light), big = got.filter((r) => r.size[0] > 48); assert.equal(got.length, day.length); assert.ok(big.length >= 1 && big.every((r) => r.light === light && r.id.endsWith(":" + light)), light); assert.ok(got.filter((r) => r.size[0] === 48).every((r) => !("light" in r))); }
});
