// One mibi up close as props (lvgl-switch.md §2.1, §4 V; habitat.json): the view the face takes, views/habitat-props.mjs, in Node. Plain JSON that names what and never where: it validates against habitat.props.json (and the namer's overlay
// against namer.props.json) in every scene, holds no rectangle, fits the props budget, names the state (rest, meet, out), the card, the plates, the four modules and the strip, and the ring's targets and bottom line by the spec's rules.
//   node --test prototypes/station/tests/
import { lineCased } from "./fixtures/line-case.mjs";
import "./fixtures/rooms.mjs";   // the rooms spec, as the page registers it
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, genomeDigest } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { habitatBuild as habitatBuildUnchecked } from "../src/views/habitat-props.mjs";
import { INTENTS } from "../src/intents/index.mjs";
import { returnNow } from "../src/intents/habitat.mjs";
import { panelBuild } from "../src/views/panel-props.mjs";
import { roomIds } from "../src/views/room-props.mjs";
import { capLine } from "../src/views/words.mjs";
const habitatBuild = lineCased(habitatBuildUnchecked, "habitat");   // every body it builds goes through assertLineCase (report mode)

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames"), specs = path.resolve(here, "../../ui/specs/station");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const J = (f) => JSON.parse(readFileSync(path.join(specs, f), "utf8")), sittingSpec = J("sitting.json"), spec = J("habitat.json"), frameSpec = J("frame.json"), home = J("home.json"), schema = J("habitat.props.json"), namerSchema = J("namer.props.json"), panelSpec = J("panel.json"), podsSpec = J("pods.json");
const T0 = 1_000_000, cfg = (rooms) => ({ ...S.DEFAULT_SETTINGS, economy: "decided", rooms });

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
const world = (rooms = 1) => { const st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = 99; st.d = 99; st.s = 99; st.firstMibi = false; return { st, settings: cfg(rooms) }; };
const sv0 = (over = {}) => ({ v: 8, seed: 7, wid: "w1", turn: 0, bay: [], mibis: [], carried: [], tier: 1, shield: 3, carryReqs: [], ...over });
const dock = (st, d = true) => { st.dock = { docked: d, at: T0 }; };
const mibis = (w, n) => { S.seedAdults(w.st, "S01", 5, n, w.settings); for (const m of w.st.mibis) m.paint = { state: "landed" }; return w.st.mibis; };
const build = ({ st, settings }, sv, over = {}) => habitatBuild({ st, sv, settings, docked: S.docked(st), light: "day", focus: null, habId: st.mibis[0]?.id ?? null, meetId: null, armed: false, ...over }, spec, frameSpec, home, sittingSpec, podsSpec);

function scenes() {
  const out = {};
  { const w = world(); dock(w.st); mibis(w, 4); out.rest = { w, sv: sv0() }; }
  { const w = world(); dock(w.st); const m = mibis(w, 4); out.meet = { w, sv: sv0(), over: { meetId: m[0].id } }; }
  { const w = world(); dock(w.st, false); const m = mibis(w, 4); out.out = { w, sv: sv0({ carried: [m[0].id] }) }; }
  { const w = world(); dock(w.st); const m = mibis(w, 4); m[0].bonded = true; m[0].notches = 5; m[0].portrait = { state: "delivered" }; out.bonded = { w, sv: sv0() }; }
  { const w = world(2); dock(w.st); mibis(w, 12); out.twelve = { w, sv: sv0() }; }
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
  { const b = build(S0.out.w, S0.out.sv).props, R = b.regions.resident; assert.equal(b.state, "out"); assert.equal(R.picture, ""); assert.equal(R.out, "mark-out-with-companion-64x96", "out: the out mark at its spot, no mibi"); assert.equal(R.waiting, false); assert.ok(!b.focus.targets.some((t) => t.id === "resident")); assert.equal(b.focus.cur, "name", "out: the ring on the name");
    assert.equal(b.regions.cross.state, "out"); assert.equal(b.regions.tiles.items[0].state, "out"); assert.equal(b.regions.tiles.items[0].shown, true); }
  assert.equal(build(S0.rest.w, S0.rest.sv, { meetId: 999 }).props.state, "rest", "a meet for another mibi is not this one's");
});

test("the card: the species line with the stage word, the story (a founder: where it came from; a bred mibi: its parents), the code in three groups, the heart only when bonded, the notches (at most three, none at zero) and the stamp of the chapters read", () => {
  const S0 = scenes(), card = (n, o) => build(S0[n].w, S0[n].sv, o).props.regions.card, w = S0.rest.w, m = w.st.mibis[0];
  const c = card("rest"); assert.equal(c.species.text, "your Loika, adult"); assert.deepEqual(c.story, ["from the meadow"]); assert.match(c.code, /^\w{3} \w{3} \w{3}$/); assert.equal(c.heart, ""); assert.equal(c.notches.count, 0);
  assert.equal(card("juvenile").species.text, "your Loika, young");
  const b = card("bonded"); assert.equal(b.heart, "heart-full-24"); assert.equal(b.notches.count, 3, "min(notches, 3)"); assert.equal(b.notches.picture, "notch-skill-16x24");
  const fr = frameOf("S01"); m.from = { ...m.from, of: ["Moss", "Fig"] }; m.mem = "pond"; assert.deepEqual(card("rest").story, ["of Moss", "and Fig", "remembers the pond edge"]); m.from = { g: "meadow" };
  m.read = [fr.chapters[0].id]; const s = card("rest").stamp; assert.deepEqual([s.size > 0, s.size <= 104, s.asset.startsWith("stamp:") && s.asset.endsWith(":" + s.size + ":k20")], [true, true, true]); assert.ok(s.asset.includes(":" + fr.chapters[0].id + ":"), "only the chapters read");
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
  let b = build(w, sv, { focus: "door" }); assert.equal(b.props.regions.door.state, "docked"); assert.equal(b.props.regions.door.glyph, "frame-companion-solid-16x24"); assert.equal(b.props.regions.door.places[0].picture, `mibi:${genomeDigest(m[1].genome)}:adult:48x48`); assert.deepEqual(b.props.regions.door.places[1], { picture: "", waiting: false, well: "plate-well-48x48" }, "a free place is the well alone (fix 2 F4)");
  assert.equal(b.line.ok, `Take ${m[0].name} with you`); assert.equal(b.line.subject, "goes with you now"); assert.equal(b.props.focus.targets.find((t) => t.id === "door").enabled, true);
  b = build(w, sv, { focus: "door", habId: m[1].id }); assert.equal(b.line.ok, `Bring ${m[1].name} home`); assert.equal(b.line.subject, "comes home now");
  const full = sv0({ carried: [m[1].id, m[2].id, m[3].id] }); b = build(w, full, { focus: "door" }); assert.deepEqual([b.line.ok, b.line.dim, b.line.subject], [`Take ${m[0].name} with you`, true, "the Companion is full"], "the house rule: the verb stays, dimmed, the context gives the reason"); assert.equal(b.props.regions.door.held, true); assert.equal(b.props.focus.targets.find((t) => t.id === "door").enabled, false);
  S.carryAdd(w.st, sv, m[0]); b = build(w, sv, { focus: "door" }); assert.equal(b.props.regions.door.places[1].waiting, true, "the request waits: its picture with the lamp"); assert.equal(b.line.ok, null);
  dock(w.st, false); b = build(w, sv, { focus: "door" }); assert.equal(b.props.regions.door.glyph, "frame-companion-outline-16x24"); assert.equal(b.props.regions.door.state, "away"); assert.equal(b.line.subject, "goes at the next dock");
});

test("Cross: a face a partner (an adult or an elder of the species), a partner out with the Companion while it is away dimmed and not counted, a juvenile none; the module's context says why it cannot", () => {
  const w = world(); dock(w.st); const m = mibis(w, 4), sv = sv0({ carried: [m[1].id] });
  let b = build(w, sv, { focus: "cross" }); assert.equal(b.props.regions.cross.state, "adult"); assert.equal(b.props.regions.cross.faces.length, 3); assert.equal(b.props.regions.cross.faces.filter((f) => f.away).length, 1, "R4b: a carried partner is dimmed docked too (no breeding while carried)"); assert.deepEqual([b.line.ok, b.line.dim, b.props.regions.cross.held], [`Cross ${m[0].name}`, true, true], "the door is shut: the verb stays, dimmed (the house rule)"); assert.equal(b.line.subject, "crossing is not open yet"); assert.equal(b.props.focus.targets.find((t) => t.id === "cross").enabled, false);
  dock(w.st, false); b = build(w, sv, { focus: "cross" }); assert.deepEqual(b.props.regions.cross.faces.map((f) => f.away), [true, false, false]); assert.equal(b.line.subject, "crossing is not open yet", "the shut line stands whatever the partners");
  const none = sv0({ carried: [m[1].id, m[2].id, m[3].id] }); b = build(w, none, { focus: "cross" }); assert.equal(b.props.regions.cross.state, "away"); assert.equal(b.line.subject, "its partners are travelling"); assert.deepEqual([b.line.ok, b.line.dim], [`Cross ${m[0].name}`, true]);
  b = build(w, sv0({ carried: [m[0].id] }), { focus: "cross" }); assert.equal(b.props.regions.cross.state, "out"); assert.deepEqual([b.line.ok, b.line.dim, b.line.subject], [`Cross ${m[0].name}`, true, "out exploring"], "held while carried: the verb dimmed, the reason in the context");
  m[0].born = w.st.turn; dock(w.st); b = build(w, sv0(), { focus: "cross" }); assert.equal(b.props.regions.cross.state, "young"); assert.equal(b.line.subject, "crosses once adult"); assert.deepEqual(b.props.regions.cross.faces, []); assert.deepEqual([b.line.ok, b.line.dim, b.props.regions.cross.held], [`Cross ${m[0].name}`, true, true], "a young mibi's Cross is held before it is focused");
});

test("Wild: shut (no armed state), its context from the rules (a young, a bonded, a carried mibi stays) and no price on the line: a release pays nothing", () => {
  const w = world(); dock(w.st); const m = mibis(w, 3), sv = sv0();
  let b = build(w, sv, { focus: "wild" }); assert.equal(b.props.regions.wild.state, "shut"); assert.equal(b.line.ok, `Return ${m[0].name}`); assert.equal(b.line.price, undefined, "a release pays nothing"); assert.equal(b.line.subject, "leaves a pod of its line", "C13a"); assert.equal(b.props.regions.wild.held, false);
  m[0].born = w.st.turn; b = build(w, sv, { focus: "wild" }); assert.deepEqual([b.props.regions.wild.state, b.props.regions.wild.held, b.line.ok, b.line.dim], ["shut", false, `Return ${m[0].name}`, undefined], "C12a: a young mibi may be returned: not held");
  m[0].born = w.st.turn - 99; m[0].bonded = true; b = build(w, sv, { focus: "wild" }); assert.deepEqual([b.props.regions.wild.state, b.props.regions.wild.held, b.line.ok, b.line.dim, b.line.price, b.line.subject], ["held", true, `Return ${m[0].name}`, true, undefined, "a bonded mibi stays"], "the verb stays, dimmed"); assert.equal(b.props.focus.targets.find((t) => t.id === "wild").enabled, false);
});

test("Portrait: none, held, its portrait on the way, portrayed; the context names why it cannot sit", () => {
  const w = world(); dock(w.st); const m = mibis(w, 2), sv = sv0();
  const line = (o) => build(w, sv, { focus: "portrait", ...o }).line, st = (o) => build(w, sv, { focus: "portrait", ...o }).props.regions.portrait.state;
  assert.equal(st(), "none"); assert.equal(line().subject, "no sitting held");
  w.st.sitting = { source: "dev", key: null, at: 0 }; assert.equal(st(), "held"); assert.equal(line().subject, "no pose seen yet"); assert.equal(build(w, sv, { focus: "portrait" }).props.focus.targets.find((t) => t.id === "portrait").enabled, false);
  m[0].habits = ["calm"]; m[0].walked = ["wood"]; m[0].places = ["wood"]; const l = line(); assert.equal(l.ok, `Portray ${m[0].name}`); assert.equal(l.subject, spec.strings.portrayContext, "a mibi that has seen a pose and been to a place may sit: the door is open"); assert.equal(build(w, sv, { focus: "portrait" }).props.focus.targets.find((t) => t.id === "portrait").enabled, true);
  m[0].portrait = { state: "painting" }; assert.equal(st(), "painting"); assert.equal(line().subject, "its portrait is on its way"); m[0].portrait = { state: "delivered" }; assert.equal(st(), "portrayed"); assert.equal(line().subject, "already portrayed");
});

test("Portrait picture: \"\" for none, held, painting and portrayed with no digest; portrait:<d16>:40x30 once a digest is kept (not the mibi's id, not the genome's); an old save normalizes unchanged and gives \"\"", () => {
  const w = world(); dock(w.st); const m = mibis(w, 2), sv = sv0(), pic = () => build(w, sv, { focus: "portrait" }).props.regions.portrait.picture, reqs = () => build(w, sv, { focus: "portrait" }).requests.filter((r) => r.kind === "portrait");
  assert.equal(pic(), "", "none"); w.st.sitting = { source: "dev", key: null, at: 0 }; assert.equal(pic(), "", "held");
  m[0].portrait = { state: "painting" }; assert.equal(pic(), "", "painting"); m[0].portrait = { state: "delivered" }; assert.equal(pic(), "", "portrayed, no digest (a save from before)"); assert.deepEqual(reqs(), []);
  m[0].portrait = { state: "delivered", digest: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef" }; assert.equal(pic(), "portrait:0123456789abcdef:40x30"); assert.match(pic(), /^portrait:[0-9a-f]{16}:40x30$/);
  assert.deepEqual(reqs().map((r) => [r.id, r.digest.slice(0, 16), r.size]), [["portrait:0123456789abcdef:40x30", "0123456789abcdef", [40, 30]]]);
  const v = validate(build(w, sv, { focus: "portrait" }).props, schema); assert.deepEqual(v, [], "the props schema takes the picture");
  const w2 = world(); dock(w2.st); const n = mibis(w2, 2); assert.equal(n[0].id, m[0].id, "the same mibi id in another world"); n[0].portrait = { state: "delivered", digest: "fedcba9876543210" + "0".repeat(48) };
  const pic2 = build(w2, sv0(), { focus: "portrait" }).props.regions.portrait.picture; assert.equal(pic2, "portrait:fedcba9876543210:40x30"); assert.notEqual(pic2, pic(), "two worlds, one mibi id, two digests: two ids");
  assert.equal(n[0].genome && m[0].genome && JSON.stringify(n[0].genome) === JSON.stringify(m[0].genome), true, "the same genome in both: the id is not the genome's");
  const old = world(); dock(old.st); const o = mibis(old, 1); o[0].portrait = { state: "delivered", at: 5 }; const before = JSON.stringify(o[0].portrait); S.normalize(old.st); assert.equal(JSON.stringify(old.st.mibis[0].portrait), before, "normalize leaves a portrait without a digest as it was");
  assert.equal(build(old, sv0(), { focus: "portrait" }).props.regions.portrait.picture, "");
});

test("the strip: a tile a place, the room shown's mibis in slot order then the free places, the shown mibi's tile marked, an out mibi's tile the glyph; the targets in the graph's groups; a tile shows its mibi (focus.resolve tile.shown)", () => {
  const S0 = scenes(), b = build(S0.rest.w, S0.rest.sv), m = S0.rest.w.st.mibis, T = b.props.regions.tiles.items;
  assert.equal(T.length, 8); assert.deepEqual(T.map((t) => t.state), ["housed", "housed", "housed", "housed", "free", "free", "free", "free"]); assert.deepEqual(T.map((t) => t.shown), [true, false, false, false, false, false, false, false]);
  assert.deepEqual(b.props.focus.targets.map((t) => t.id), ["resident", "name", "species", "family", ...frameOf("S01").chapters.map((c, i) => "plate." + i), "door", "portrait", "cross", "wild", ...m.map((x) => "tile." + x.id), "room.0", "room.new"]);
  assert.deepEqual(b.props.focus.targets.map((t) => t.group).filter((g, i, a) => a.indexOf(g) === i), ["resident", "name", "species", "family", "plate", "top", "low", "tile", "room"]);
  const fam = b.props.focus.targets.find((t) => t.id === "family"); assert.deepEqual([fam.group, fam.enabled, fam.lines], ["family", true, m[0].from?.of?.length === 2 ? 2 : 1], "the story's origin lines: See the family");
  assert.deepEqual(build(S0.rest.w, S0.rest.sv, { focus: "family" }).line, { ok: "See the family", subject: "", back: "Vivarium", need: null }, "✓ See the family, the jump to Level 3");
  assert.deepEqual(b.props.regions.rooms.items.map((c) => [c.id, c.state]), [["0", "shown"], ["new", "new"]], "R6: a chip a room, the mibi's own one step up, then the new-room chip"); assert.equal(b.props.regions.strip, undefined, "the strip row is two panes"); assert.equal(b.props.focus.resolve["room.shown"], "room.0");
  assert.equal(b.props.focus.resolve["tile.shown"], "tile." + m[0].id); assert.equal(build(S0.rest.w, S0.rest.sv, { habId: m[2].id }).props.focus.resolve["tile.shown"], "tile." + m[2].id);
  { const T12 = build(S0.twelve.w, S0.twelve.sv).props.regions.tiles.items, w = S0.twelve.w; assert.equal(T12.length, 8, "a room holds eight places"); assert.deepEqual(T12.map((t) => t.id), S.inRoom(w.st, 0).map((x) => String(x.id)), "the first room's eight"); const far = S.inRoom(w.st, 1)[0], T2 = build(w, S0.twelve.sv, { habId: far.id }).props.regions.tiles.items; assert.deepEqual(T2.map((t) => t.state), ["housed", "housed", "housed", "housed", "free", "free", "free", "free"], "a mibi of the second room: its room's four"); assert.deepEqual(T2.map((t) => t.shown), [true, false, false, false, false, false, false, false], "its own tile shown");
    w.st.face.room = 1; assert.deepEqual(build(w, S0.twelve.sv).props.regions.tiles.items.map((t) => t.id), S.inRoom(w.st, 0).map((x) => String(x.id)), "the room the whole shows does not take the strip off the mibi up close"); }
});

test("R3: the mibi's room's ids per light: its near view as the glass and the room's base, no pieces up close and no bed outside Roots (the bed is the whole's)", () => {
  const ROOMS = JSON.parse(readFileSync(path.join(specs, "rooms.json"), "utf8"));
  for (const [ri, name] of ROOMS.order.entries()) for (const light of ["dawn", "day", "dusk", "night"]) {
    const w = world(4); dock(w.st); mibis(w, 3); for (const mb of w.st.mibis) mb.room = ri; w.st.face.room = (ri + 1) % 4;   // the room the whole shows is another: the mibi's own room is the one up close
    const b = build(w, sv0(), { light }), r = b.props.regions; assert.deepEqual(validate(b.props, schema), [], `${name} ${light}`);
    assert.equal(r.glass.picture, `room-${name}-near-${light}-544x408`); assert.deepEqual(r.room, { id: name, base: r.glass.picture, pieces: {} });
    assert.ok(!("bed" in r) && !b.requests.some((q) => /bed/.test(q.id) && q.id.startsWith("room-")), "Habitat draws no bed"); assert.ok(!b.requests.some((q) => /^(idle-vivarium|home-bed|vivarium-near)/.test(q.id)));
  }
});

test("the window: the near Vivarium of the light is the mibi's room's (room-<room>-near-<light>-544x408); the resident's picture the mibi at the box; no waiting lamp whatever the painting's state (Grow paints nothing)", () => {
  const { w, sv } = scenes().rest;
  for (const light of ["dawn", "day", "dusk", "night"]) { const b = build(w, sv, { light }); assert.equal(b.props.regions.glass.picture, `room-roots-near-${light}-544x408`); assert.ok(b.requests.some((r) => r.id === `room-roots-near-${light}-544x408` && r.kind === "slot" && r.master === r.id)); }
  const m = w.st.mibis[0], b = build(w, sv); assert.equal(b.props.regions.resident.picture, `mibi:${genomeDigest(m.genome)}:adult:304x312`); assert.equal(b.props.regions.resident.waiting, false);
  m.paint = { state: "sent" }; const x = build(w, sv); assert.equal(x.props.regions.resident.waiting, false); assert.notEqual(x.line.subject, spec.strings.painting);
});

test("the bottom line: the resident greets (in the meet it names), the name renames, the species word opens the guide, a tile reads as its mibi; ← Vivarium", () => {
  const S0 = scenes(), m = S0.rest.w.st.mibis, L = (o, n = "rest") => build(S0[n].w, S0[n].sv, o).line;
  assert.deepEqual([L({ focus: "resident" }).ok, L({ focus: "resident" }).subject], [`Greet ${m[0].name}`, "an adult Loika"]); assert.equal(L({ focus: "resident" }).back, "Vivarium");
  assert.equal(L({ focus: "resident", ...S0.meet.over }, "meet").ok, `Name ${m[0].name}`, "in the meet the first ✓ names");
  assert.equal(L({ focus: "name" }).ok, `Rename ${m[0].name}`); assert.deepEqual([L({ focus: "species" }).ok, L({ focus: "species" }).subject], ["Open the guide", "every Loika"], "the species word opens the Library on its species");
  assert.equal(L({ focus: "tile." + m[2].id, habId: m[2].id }).ok, `Greet ${m[2].name}`); assert.match(L({ focus: "name" }, "bonded").subject, /^a bonded (young|adult|elder) Loika$/);
  assert.equal(L({ focus: "name" }, "out").subject, "out exploring", "R4b: the held verb's reason, the tile's words"); assert.equal(L({ focus: "name" }, "out").dim, true);
});

test("a mibi that grows up changes every picture id from :juvenile: to :adult: with its size unchanged (the resident 304×312, the tiles and the door's places 48×48)", () => {
  const w = world(); dock(w.st); const m = mibis(w, 3); for (const x of m) x.born = w.st.turn;
  const ids = (b) => b.requests.filter((r) => r.kind === "mibi").map((r) => r.id), sv = sv0({ carried: [m[1].id, m[2].id] });
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

test("the portrayed corner and ✓ Look at the portrait: the stamp label carries spread-gilt-corner-16x16 once the portrait came (never before, never while painting); ✓ strings.lookPortrait only while its 528×392 opening is held", async () => {
  const { injectPortraitSource, dropPortraitSources } = await import("../src/portrait-source.mjs");
  const w = world(); dock(w.st); const m = mibis(w, 2), sv = sv0(), b = () => build(w, sv, { focus: "portrait" }), corner = () => b().props.regions.card.stamp.corner;
  const P = spec.regions.stamp.portrayed, sitP = sittingSpec.regions.stamp.portrayed; for (const k of ["slice", "rect", "at", "sprite", "rule"]) assert.deepEqual(P[k], sitP[k], "habitat.json regions.stamp.portrayed is sitting.json's: " + k);
  assert.deepEqual(P.inStates, ["rest", "meet", "out"]); assert.equal(spec.drawOrder[spec.drawOrder.indexOf("stamp") + 1], "stamp.portrayed"); assert.equal(spec.focus.entry.backFromPortrait, "portrait");
  dropPortraitSources(); assert.equal(corner(), "", "none"); w.st.sitting = { source: "dev", key: null, at: 0 }; assert.equal(corner(), "", "held");
  m[0].portrait = { state: "painting" }; assert.equal(corner(), "", "painting");
  m[0].portrait = { state: "delivered" }; assert.equal(corner(), P.slice, "portrayed, its picture not come"); assert.ok(b().requests.some((r) => r.id === P.slice && r.kind === "slot"), "the corner is a slot request");
  assert.deepEqual([b().line.ok, b().line.dim, b().line.subject], [`Portray ${m[0].name}`, true, spec.strings.portrayed], "no picture held: the verb stays, dimmed");
  const digest = "0123456789abcdef0011223344556677"; m[0].portrait = { state: "delivered", digest };
  assert.deepEqual([b().line.ok, b().line.dim, b().line.subject], [`Portray ${m[0].name}`, true, spec.strings.portrayed], "its digest but no opening held: the verb stays, dimmed");
  const a = new Uint8ClampedArray(528 * 392 * 4); for (let i = 0; i < a.length; i += 4) { a[i] = 7; a[i + 1] = (i >> 2) & 255; a[i + 2] = 40; a[i + 3] = 255; } assert.equal(injectPortraitSource(digest, a).ok, true);
  assert.deepEqual([b().line.ok, b().line.subject, b().line.back], [sittingSpec.strings.lookPortrait, spec.strings.portrayed, spec.strings.back], "the opening held: ✓ Look at the portrait"); assert.equal(sittingSpec.strings.lookPortrait, "Look at the portrait");
  assert.equal(b().props.focus.targets.find((t) => t.id === "portrait").enabled, true); assert.deepEqual(validate(b().props, schema), [], "the props schema takes the corner");
  assert.equal(build(w, sv, { focus: "resident" }).props.regions.card.stamp.corner, P.slice, "the corner whatever the ring is on");
  dropPortraitSources();
});

test("✓ Look at the portrait is never a cap that does nothing: portrayed with its opening held but out with the Companion while it is away, or built without sitting.json, the Portrait target is disabled and the line is { ok null, strings.portrayed }", async () => {
  const { injectPortraitSource, dropPortraitSources } = await import("../src/portrait-source.mjs");
  const w = world(); dock(w.st); const m = mibis(w, 2), digest = "00112233445566778899aabbccddeeff"; m[0].portrait = { state: "delivered", digest };
  const a = new Uint8ClampedArray(528 * 392 * 4); for (let i = 0; i < a.length; i += 4) { a[i] = 7; a[i + 1] = (i >> 2) & 255; a[i + 2] = 40; a[i + 3] = 255; } dropPortraitSources(); assert.equal(injectPortraitSource(digest, a).ok, true);
  const off = (b, why = spec.strings.portrayed) => { assert.equal(b.props.focus.targets.find((t) => t.id === "portrait").enabled, false); assert.deepEqual([b.line.ok, b.line.dim, b.line.subject], [`Portray ${b.shown.name}`, true, why]); };
  assert.equal(build(w, sv0(), { focus: "portrait" }).line.ok, sittingSpec.strings.lookPortrait, "docked: the cap");
  w.st.dock = { docked: false, at: 1 }; const away = { ...sv0(), carried: [m[0].id] }; assert.ok(S.isAway(w.st, away, m[0]));
  off(build(w, away, { focus: "portrait" }), "out exploring");   // a carried mibi's card is held (heldRule): the traveller's context
  dock(w.st); off(habitatBuild({ st: w.st, sv: sv0(), settings: w.settings, docked: true, light: "day", focus: "portrait", habId: m[0].id, meetId: null, armed: false }, spec, frameSpec, home));
  dropPortraitSources();
});

// ---- R6 (T-20261027-319): moving a mibi between rooms, the house rule's held rows and their plates, the Return with its pod ----
const upClose = (w, id) => (over = {}, sv = sv0()) => build(w, sv, { habId: id, ...over });
// A recording host over the real rules: what ✓ does to the state, the plate and the events.
function hostFor(w, sv, id) {
  const ui = { screen: "habitat", hab: { id, f: "resident", prev: null, prevRoom: null, namer: null }, panel: null, viv: { f: null } };
  const h = { st: w.st, sv, settings: w.settings, ui, specs: { habitat: spec, sitting: sittingSpec, panel: panelSpec, frame: frameSpec, pods: podsSpec, home }, said: [], played: [], timers: [], saved: 0, went: [], motion: () => true, light: () => "day", now: () => T0 };
  return Object.assign(h, { say: (x) => h.said.push(x), play: (e) => h.played.push(e), at: (ms, fn) => h.timers.push({ ms, fn }), save: () => { h.saved++; }, goto: (s) => { h.went.push(s); ui.screen = s; } });
}
const press = (h, target) => INTENTS.habitat.intent(h, target, "confirm");

test("R6 the chips up close (the rooms screens 1b, the rooms words C5): the ring on a chip does not change the room shown; its own room has no action, a room with space offers ✓ Move {name} here with the room's count, a full room the same verb dimmed, the new-room chip is the whole's", () => {
  const w = world(3); dock(w.st); const m = mibis(w, 15), sv = sv0();   // Roots 8 (full), Reeds 7, Boulders empty
  assert.deepEqual([S.inRoom(w.st, 0).length, S.inRoom(w.st, 1).length, S.inRoom(w.st, 2).length], [8, 7, 0]);
  const at = (mb, chip) => build(w, sv, { habId: mb.id, focus: "room." + chip }), reeds = m[8], roots = m[0];
  let b = at(roots, 0); assert.deepEqual([b.line.ok, b.line.subject, b.line.dim], [null, "its home room", undefined], "its own room: no action"); assert.equal(b.props.regions.glass.picture, roomIds(0, "day").near, "the ring on a chip does not change the room shown");
  b = at(roots, 1); assert.deepEqual([b.line.ok, b.line.subject, b.line.dim], [`Move ${roots.name} here`, "Reeds: one place free", undefined], "a room with space: one place free"); assert.equal(b.props.regions.glass.picture, roomIds(0, "day").near);
  b = at(roots, 2); assert.deepEqual([b.line.ok, b.line.subject, b.line.dim], [`Move ${roots.name} here`, "Boulders: eight places free", undefined]);
  b = at(reeds, 0); assert.deepEqual([b.line.ok, b.line.subject, b.line.dim], [`Move ${reeds.name} here`, "Roots: no place free", true], "a full room: the same verb, dimmed"); assert.equal(b.props.focus.targets.find((t) => t.id === "room.0").enabled, false);
  b = at(reeds, 2); assert.equal(b.line.subject, "Boulders: eight places free"); assert.equal(b.props.focus.targets.find((t) => t.id === "room.2").enabled, true);
  assert.deepEqual(b.props.regions.rooms.items.map((c) => [c.id, c.state]), [["0", "room"], ["1", "shown"], ["2", "room"], ["new", "new"]], "the mibi's own room one step up");
  assert.equal(b.props.regions.tiles.items.filter((x) => x.state !== "free").length, 7, "the places pane is the mibi's own room's");
  b = at(roots, "new"); assert.deepEqual([b.line.ok, b.line.price, b.line.subject, b.line.dim], ["Add a room", S.priceText(S.roomPrice(w.st, w.settings), 0, 0), "eight more places", undefined], "the new-room chip, as the whole's");
  w.st.e = 0; b = at(roots, "new"); assert.equal(b.line.dim, true); assert.ok(b.line.short, "short of Energy: the dimmed cap and the short icons"); w.st.e = 99;
  for (const x of at(roots, 1).props.focus.targets) assert.ok(["resident", "name", "species", "family", "plate", "top", "low", "tile", "room"].includes(x.group));
  w.st.dock.docked = false; const away = sv0({ carried: [roots.id] });   // a carried mibi's Move is held (heldRule): the verb dimmed, the traveller context
  b = build(w, away, { habId: roots.id, focus: "room.2" }); assert.deepEqual([b.line.ok, b.line.dim, b.line.subject], [`Move ${roots.name} here`, true, "out exploring"]);
});

test("R6 ✓ Move {name} here moves the mibi (the near painting cross-dithers 200 ms, the places pane cuts to the new room, the ring stays on the chip, the plate says where); a full room's ✓ plays the rooms words C7; the new-room chip opens Add a room?", () => {
  const w = world(3); dock(w.st); const m = mibis(w, 15), sv = sv0(), roots = m[0], reeds = m[8];
  let h = hostFor(w, sv, reeds.id); h.ui.hab.f = "room.0";
  press(h, "room.0"); assert.deepEqual(h.said, ["The Roots room is full\nMove one of its mibis out"], "C7: two lines, the room named"); assert.equal(reeds.room, 1, "nothing moved"); assert.deepEqual(h.played, []);
  h = hostFor(w, sv, reeds.id); press(h, "room.1"); assert.deepEqual([h.said, reeds.room], [[], 1], "its home room: nothing");
  h = hostFor(w, sv, roots.id); h.ui.hab.f = "room.2"; press(h, "room.2");
  assert.deepEqual([roots.room, roots.slot, S.inRoom(w.st, 2).map((x) => x.id)], [2, 0, [roots.id]]); assert.deepEqual(h.said, [`${roots.name} moves to the Boulders room`], "C6");
  assert.deepEqual(h.played.map((e) => [e.kind, e.target, e.from, e.ms, e.hold]), [["dither", "glass", roomIds(0, "day").near, 200, 0]], "the near painting from the old room's view, 200 ms"); assert.equal(h.ui.hab.prevRoom, roomIds(0, "day").near); h.timers[0].fn(); assert.equal(h.ui.hab.prevRoom, null);
  assert.equal(h.ui.hab.f, "room.2", "the ring stays on the chip"); assert.equal(w.st.face.room, 2);
  const b = build(w, sv, { habId: roots.id, focus: h.ui.hab.f }); assert.deepEqual([b.line.ok, b.line.subject], [null, "its home room"], "now its home room"); assert.equal(b.props.regions.glass.picture, roomIds(2, "day").near, "the places pane and the painting are the new room's"); assert.deepEqual(b.props.regions.tiles.items.filter((x) => x.state !== "free").map((x) => x.id), [String(roots.id)]); assert.deepEqual(b.top, { readout: { text: "Boulders", mark: null } });
  assert.ok(S.moveBlock(w.st, roots, 2, w.settings)?.key === "own");
  h = hostFor(w, sv, roots.id); press(h, "room.new"); assert.deepEqual([h.ui.panel?.screen, h.ui.panel?.id], ["habitat", "addRoom"], "the Add a room? panel opens over one mibi up close");
  // after buying: the ring stays on the place, now the new room's chip, and ✓ Move {name} here is offered
  const v = { st: S.freshSt("w1", 3, T0), settings: cfg(null) }; S.normalize(v.st); v.st.e = 99; v.st.d = 99; v.st.s = 99; v.st.firstMibi = false; dock(v.st); const k = mibis(v, 8);
  h = hostFor(v, sv0(), k[0].id); h.ui.hab.f = "room.new"; press(h, "room.new"); assert.equal(h.ui.panel.id, "addRoom");
  INTENTS.panel.intent(h, "card.add", "confirm"); assert.deepEqual([v.st.rooms, h.ui.panel, h.ui.hab.f, h.said.length], [2, null, "room.1", 1], "the room is bought, the ring stays on the place");
  const c = build(v, sv0(), { habId: k[0].id, focus: h.ui.hab.f }); assert.deepEqual([c.line.ok, c.line.subject], [`Move ${k[0].name} here`, "Reeds: eight places free"], "✓ Move {name} here is offered");
  press(h, "room.1"); assert.equal(k[0].room, 1);
});

test("R6 the house rule on one mibi up close: a held module is drawn held before it is focused (props held), focused its verb stays dimmed with the reason, ✓ plays its plate and never stays silent", () => {
  const w = world(); dock(w.st); const m = mibis(w, 4), sv = sv0(), id = m[0].id;
  const row = (target, over = {}, svx = sv) => { const b = build(w, svx, { habId: id, focus: target, ...over }), h = hostFor(w, svx, id); h.ui.hab.f = target; press(h, target); return { b, said: h.said, held: b.props.regions[target].held, panel: h.ui.panel }; };
  // Wild: bonded (C12b), a young bonded one with the third line, going at the next dock (C12d), and live
  let r = row("wild"); assert.deepEqual([r.held, r.said, r.panel?.id], [false, [], "wildMibi"], "live: ✓ opens the Return panel");
  m[0].bonded = true; m[0].grownTurn = 0; r = row("wild"); assert.deepEqual([r.held, r.b.line.ok, r.b.line.dim, r.b.line.subject, r.said], [true, `Return ${m[0].name}`, true, "a bonded mibi stays", [`A bond is for good\n${m[0].name} stays with you`]]);
  delete m[0].grownTurn; r = row("wild"); assert.equal(S.mibiStage(w.st, m[0], w.settings), "juvenile", "a bonded mibi waits young until it is carried and tended"); assert.deepEqual(r.said, [`A bond is for good\n${m[0].name} stays with you\nCarried and tended, ${m[0].name} grows up`], "a bonded juvenile: the third line"); m[0].bonded = false;
  S.carryAdd(w.st, sv, m[0]); r = row("wild"); assert.deepEqual([r.held, r.b.line.subject, r.said], [true, "goes at the next dock", [`${m[0].name} goes at the next dock`]], "the plate lines are separate lines");
  const carried = sv0({ carried: [m[0].id] }); r = row("wild", {}, carried); assert.deepEqual([r.held, r.b.line.subject, r.said], [true, "ready to go exploring", [`${m[0].name} is ready to go exploring\nBring ${m[0].name} home first`]], "with the Companion: the held look of R4b, one plate");
  S.carryHome(w.st, carried, m[0]); w.st.carryReqs = []; sv.carryReqs = [];
  // the other held modules: the reason's own sentence capitalised (the plates owed to the copywriter)
  const w2 = world(); dock(w2.st); const n = mibis(w2, 2); n[1].born = w2.st.turn;
  const row2 = (target, mb = n[0]) => { const b = build(w2, sv0(), { habId: mb.id, focus: target }), h = hostFor(w2, sv0(), mb.id); h.ui.hab.f = target; press(h, target); return { b, said: h.said, held: b.props.regions[target].held }; };
  r = row2("portrait"); assert.deepEqual([r.held, r.b.line.ok, r.b.line.dim, r.b.line.subject, r.said], [true, `Portray ${n[0].name}`, true, "no sitting held", ["No sitting held"]], "the empty Portrait module is held");
  r = row2("cross", n[1]); assert.deepEqual([r.held, r.b.line.ok, r.b.line.dim, r.said], [true, `Cross ${n[1].name}`, true, [capLine(spec.strings.crossLater)]]);
  const w3 = world(); dock(w3.st); const k = mibis(w3, 5); const full = sv0({ carried: [k[1].id, k[2].id, k[3].id] });
  { const b = build(w3, full, { habId: k[0].id, focus: "door" }), h = hostFor(w3, full, k[0].id); press(h, "door"); assert.deepEqual([b.props.regions.door.held, b.line.dim, h.said, w3.st.mibis.length], [true, true, ["The Companion is full"], 5], "the Companion full: held, ✓ plays its plate and takes nobody"); }
  { const b = build(w3, sv0(), { habId: k[0].id, focus: "door" }); assert.equal(b.props.regions.door.held, false, "a set with a place is live"); }
});

test("R6 the Return with its pod: the Wild context (C13a), the Return card's line for a grown (C13b) and a young mibi (C13c), the release plate (C13d, C13e)", () => {
  const w = world(); dock(w.st); const m = mibis(w, 3), sv = sv0();
  assert.equal(build(w, sv, { focus: "wild" }).line.subject, "leaves a pod of its line");
  const card = (id) => { const ui = { panel: { screen: "habitat", id: "wildMibi", focus: "" }, hab: { id } }; return panelBuild({ st: w.st, sv, settings: w.settings, ui, jump: "arrival" }, panelSpec, frameSpec, podsSpec).cards.find((c) => c.id === "return"); };
  assert.equal(card(m[0].id).line, `${m[0].name}'s pod waits in the wild`); m[1].born = w.st.turn; assert.equal(card(m[1].id).line, `${m[1].name}'s pod comes once grown`); assert.equal(card(m[1].id).name, `Return ${m[1].name}`); assert.equal(card(m[1].id).cost, "", "the same card otherwise: no gain");
  let h = hostFor(w, sv, m[0].id); returnNow(h); assert.deepEqual(h.said, [`${m[0].name} goes back to the meadow\nLook for its pod in two turns`], "C13d");
  h = hostFor(w, sv, m[1].id); returnNow(h); assert.deepEqual(h.said, [`${m[1].name} goes back to the meadow\n${m[1].name} grows up in its place\nbefore it leaves a pod`], "C13e"); assert.ok(m[1].released);
  assert.equal(w.st.sheds.length, 2, "both leave a shed record"); assert.equal(spec.strings.wildBlocks.young, undefined, "C12a: the young row retires");
});
