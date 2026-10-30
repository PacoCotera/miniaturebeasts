// Idle's props (lvgl-switch.md §2.1, §4 L2.2; frame.json idle): the view the face takes, views/idle-props.mjs, in Node. Plain JSON that names what and never where: it validates against idle.props.json, holds no rectangle, shares the
// living window's people with Home (the same seeds, the bed, the carried set asleep), and says the one line the spec's order gives: the crates in the bay while docked, the bud ready, the bud growing, the mibis out with the Companion
// (only while away); none, empty; six words or fewer, no digits.
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
import { idleBuild as idleBuildUnchecked, idleLine } from "../src/views/idle-props.mjs";
const idleBuild = lineCased(idleBuildUnchecked, "idle");   // every body it builds goes through assertLineCase (report mode)
import { vivariumBuild } from "../src/views/vivarium-props.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames"), specs = path.resolve(here, "../../ui/specs/station");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const J = (f) => JSON.parse(readFileSync(path.join(specs, f), "utf8")), frame = J("frame.json"), home = J("home.json"), vivSpec = J("vivarium.json"), schema = J("idle.props.json");
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", rooms: 2 }, T0 = 1_000_000;

function validate(v, sc, at = "$", out = []) {
  if (sc.$ref) return validate(v, schema.$defs[sc.$ref], at, out);
  if (sc.oneOf) { const ok = sc.oneOf.filter((o) => validate(v, o, at, []).length === 0).length; if (ok !== 1) out.push(`${at}: matches ${ok} of oneOf`); return out; }   // the moving prop: "" or one object form (Station M1 §2.2)
  if (sc.enum && !sc.enum.includes(v)) { out.push(`${at}: ${JSON.stringify(v)} is not one of ${JSON.stringify(sc.enum)}`); return out; }
  if (sc.type) { const ts = [].concat(sc.type), ty = v === null ? "null" : Array.isArray(v) ? "array" : Number.isInteger(v) ? "integer" : typeof v; if (!ts.includes(ty) && !(ty === "integer" && ts.includes("number"))) { out.push(`${at}: a ${ty}, wanted ${ts.join(" or ")}`); return out; } }
  if (Array.isArray(v) && sc.items) v.forEach((x, i) => validate(x, sc.items, `${at}[${i}]`, out));
  if (v && typeof v === "object" && !Array.isArray(v)) { for (const k of sc.required ?? []) if (!(k in v)) out.push(`${at}: ${k} is required`); for (const [k, x] of Object.entries(v)) { const p = sc.properties?.[k]; if (p) validate(x, p, `${at}.${k}`, out); else if (sc.additionalProperties === false) out.push(`${at}: ${k} is not a prop`); } }
  return out;
}
const world = () => { const st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = 99; st.d = 99; st.s = 99; st.firstMibi = false; st.dock = { docked: true, at: T0 }; return st; };
const crate = (n) => ({ id: "c" + n, n, turn: 0, at: T0, e: 3, d: 3, s: 4, pods: [], met: [], explored: 0, of: 0, lines: [] });
const sv0 = (over = {}) => ({ v: 8, seed: 7, wid: "w1", turn: 0, bay: [], mibis: [], carried: [], tier: 1, shield: 3, ...over });
const RULES = J("vivarium.json").rules;
const build = (st, sv, light = "day") => idleBuild({ st, sv, settings, docked: S.docked(st), light, time: 12 * 3600, now: T0 + 12 * 3600 * 1000, restRules: RULES.rest, rules: RULES }, frame);
const adults = (st, n) => { S.seedAdults(st, "S01", 5, n, settings); for (const m of st.mibis) m.paint = { state: "landed" }; };

test("Idle's props validate against idle.props.json, name no rectangle, carry the line as props.frame.idle.line and nothing of the frame", () => {
  for (const [name, mk] of Object.entries({
    empty: () => ({ st: world(), sv: sv0() }),
    docked: () => { const st = world(); adults(st, 4); return { st, sv: sv0({ carried: [st.mibis[0].id, st.mibis[1].id] }) }; },
    away: () => { const st = world(); adults(st, 3); st.dock = { docked: false, at: T0 }; return { st, sv: sv0({ carried: [st.mibis[0].id] }) }; },
  })) {
    const { st, sv } = mk(), b = build(st, sv), bad = validate(b.props, schema); assert.deepEqual(bad, [], `${name}: ${bad.slice(0, 3).join("; ")}`);
    assert.ok(!/"(x|y|w|h|rect|size|box|pitch)"\s*:/.test(JSON.stringify(b.props)), `${name}: props name what, never where`);
    assert.deepEqual(Object.keys(b.props.frame), ["idle"]); assert.equal(b.props.idle, true);
  }
});
test("the living window is the Vivarium's whole's: the same residents with the same seeds, the same bed and sleepers", () => {
  const st = world(); adults(st, 5); const sv = sv0({ carried: [st.mibis[0].id, st.mibis[1].id] }), v = vivariumBuild({ st, sv, settings, docked: true, light: "day", focus: null, seen: null, time: 12 * 3600, now: T0 + 12 * 3600 * 1000, restRules: RULES.rest, rules: RULES }, vivSpec, frame, home).props.regions, i = build(st, sv).props.regions;
  assert.deepEqual(i.residents, v.residents); assert.deepEqual(i.bed, v.bed); assert.equal(i.bed.state, "empty"); assert.equal(i.bed.sleepers.length, 0, "R4b: the carried set is never drawn: the bed is the nappers' alone"); assert.equal(i.residents.length, 3, "five housed, two carried");
  assert.equal(i.vivarium.picture, "room-roots-idle-day-1024x568"); assert.equal(i.room.base, i.vivarium.picture);
});
const ROOMS = J("rooms.json"), LIGHTS = ["dawn", "day", "dusk", "night"];
test("R3: the shown room's ids per light (its painting and the pieces that have a picture), one request each; the bed only in Roots, so no bed outside it", () => {
  for (const [ri, name] of ROOMS.order.entries()) for (const light of LIGHTS) {
    const st = world(); st.rooms = 4; adults(st, 3); for (const m of st.mibis) { m.room = ri; } st.face.room = ri; const sv = sv0({ carried: [st.mibis[0].id] }), b = build(st, sv, light), r = b.props.regions, R = ROOMS.rooms[name];
    assert.deepEqual(validate(b.props, schema), [], `${name} ${light}`); assert.equal(r.room.id, name); assert.equal(r.room.base, `room-${name}-idle-${light}-1024x568`); assert.equal(r.vivarium.picture, r.room.base, "the painting is the room's base");
    const want = R.pieces.filter((p) => p.picture).map((p) => [p.id, p.picture.replace("{light}", light)]); assert.deepEqual(Object.entries(r.room.pieces), want, `${name} ${light}: the pieces with a picture, in data order, the light filled in`);
    assert.ok(!JSON.stringify(r.room).includes("{light}"));
    for (const id of [r.room.base, ...Object.values(r.room.pieces)]) { const q = b.requests.filter((x) => x.id === id); assert.equal(q.length, 1, id + " is requested once"); assert.deepEqual([q[0].kind, q[0].master, q[0].size.join("x")], ["slot", id, id.match(/(\d+x\d+)$/)[1]]); }
    assert.equal(r.residents.length, 2, "the residents of the room shown only");
    if (name === "roots") { assert.equal(r.bed.picture, `room-roots-bed-${light}-192x56`); assert.equal(r.bed.state, "empty"); assert.equal(r.bed.sleepers.length, 0); } else { assert.ok(!("bed" in r), `${name}: no bed`); assert.ok(!b.requests.some((x) => /bed/.test(x.id)), `${name}: no bed picture`); }
    assert.ok(!b.requests.some((x) => /^(idle-vivarium|home-bed|vivarium-near)/.test(x.id)), "the legacy ids are no longer referenced");
  }
});
test("F2: Idle shows the room of the mibi being met (st.face.room 0, a mibi housed in room 1): Reeds' painting and room 1's residents", () => {
  const st = world(); st.rooms = 2; adults(st, 4); st.mibis.forEach((m, i) => { m.room = i < 2 ? 0 : 1; }); st.face.room = 0;
  const sv = sv0({ carried: [st.mibis[0].id] }), meet = st.mibis[2].id, at = idleBuild({ st, sv, settings, docked: true, light: "day", meet }, frame), none = build(st, sv);
  assert.equal(none.props.regions.room.id, ROOMS.order[0], "no meet: the room on the face");
  const r = at.props.regions, want = ROOMS.order[1]; assert.equal(r.room.id, want); assert.equal(r.room.base, `room-${want}-idle-day-1024x568`); assert.equal(r.vivarium.picture, r.room.base);
  assert.deepEqual(validate(at.props, schema), []); assert.equal(r.residents.length, st.mibis.filter((m) => m.room === 1).length, "room 1's residents");
});
test("the line: the first that holds of crates (docked), the bud ready, the bud growing, out with the Companion (away, mibis carried); none, empty; six words or fewer and no digits", () => {
  const L = (st, sv) => idleLine({ st, sv, settings, docked: S.docked(st) }, frame.idle);
  { const st = world(); assert.equal(L(st, sv0()), "", "nothing: empty"); assert.equal(L(st, sv0({ bay: [crate(1)] })), "A crate waits in the Bay"); assert.equal(L(st, sv0({ bay: [crate(1), crate(2)] })), "Two crates wait in the Bay"); assert.equal(L(st, sv0({ bay: [1, 2, 3, 4].map(crate) })), "Crates wait in the Bay", "more than three: the count is dropped"); }
  { const st = world(); st.dock = { docked: false, at: T0 }; assert.equal(L(st, sv0({ bay: [crate(1)] })), "", "crates only while docked"); }
  { const st = world(); st.bud = { kind: "founder", species: "S01", start: Date.now(), minutes: 5 }; assert.equal(L(st, sv0()), "A bud is growing"); st.bud.start = Date.now() - 1e9; assert.equal(L(st, sv0()), "The bud is ready"); assert.equal(L(st, sv0({ bay: [crate(1)] })), "A crate waits in the Bay", "the crates come first"); }
  { const st = world(); adults(st, 3); st.dock = { docked: false, at: T0 }; const one = L(st, sv0({ carried: [st.mibis[0].id] })); assert.equal(one, `${st.mibis[0].name} is out with the Companion`);
    assert.equal(L(st, sv0({ carried: [st.mibis[0].id, st.mibis[1].id] })), "Two mibis are with the Companion"); assert.equal(L(st, sv0({ carried: st.mibis.map((m) => m.id) })), "Three mibis are with the Companion");
    st.dock = { docked: true, at: T0 }; assert.equal(L(st, sv0({ carried: [st.mibis[0].id] })), "", "docked, nothing about them"); }
  for (const t of [...Object.values(frame.idle.strings.crates), frame.idle.strings.budReady, frame.idle.strings.budGrowing, ...Object.values(frame.idle.strings.out)]) { assert.ok(t.replace("{name}", "Bean").split(" ").length <= 6, t); assert.ok(!/\d/.test(t), t); }
});
test("the line's one fact comes from the rule (state.mjs idleKey) and its order is frame.json's: crates, budReady, budGrowing, out", () => {
  const order = frame.idle.strings.order, st = world(); adults(st, 3); st.dock = { docked: true, at: T0 }; st.bud = { kind: "founder", species: "S01", start: Date.now() - 1e9, minutes: 5 };
  const seen = [], sv = sv0({ bay: [crate(1)], carried: [st.mibis[0].id] });
  seen.push(S.idleKey(st, sv, settings).key); sv.bay = []; seen.push(S.idleKey(st, sv, settings).key); st.bud.start = Date.now(); seen.push(S.idleKey(st, sv, settings).key); st.bud = null; st.dock = { docked: false, at: T0 }; seen.push(S.idleKey(st, sv, settings).key);
  assert.deepEqual(seen, order, "each key shows only when the ones before it do not hold"); assert.deepEqual(S.idleKey(st, sv0(), settings), null);
  assert.deepEqual(S.idleKey(st, sv, settings), { key: "out", n: 1, name: st.mibis[0].name });
});

// ---- Station M1 §2.6: Idle's residents with moving sets fit idle.props.json ----
import { setMoving } from "../src/moving.mjs";
{ const ix = J("moving/index.json"), sets = {}; for (const id of ix.sets) sets[id] = J(`moving/${id}.json`); setMoving(sets); }
test("Idle's residents with moving sets fit idle.props.json: moving and rest; the bed's sleepers their nap set", () => {
  const st = world(); adults(st, 4); const sv = sv0({ carried: [st.mibis[0].id] }), rules = J("vivarium.json").rules.rest;
  const b = idleBuild({ st, sv, settings, docked: true, light: "night", time: 23 * 3600, restRules: rules, motionSets: true }, frame);
  assert.deepEqual(validate(b.props, schema), []); assert.ok(b.props.regions.residents.every((r) => r.moving && r.rest === "asleep")); assert.ok(b.props.regions.bed.sleepers.every((s) => s.moving?.nap));
});

test("fix 7: Idle's residents take the scene's light (suffix, request light, the count as at day)", () => {
  const st = world(); adults(st, 5); const sv = sv0(), reqs = (light) => build(st, sv, light).requests.filter((r) => r.kind === "mibi"), day = reqs("day");
  assert.ok(day.length >= 4 && day.every((r) => !("light" in r)));
  for (const light of ["dawn", "dusk", "night"]) { const got = reqs(light); assert.equal(got.length, day.length); assert.ok(got.every((r) => r.light === light && r.id.endsWith(":" + light)), light); }
});
