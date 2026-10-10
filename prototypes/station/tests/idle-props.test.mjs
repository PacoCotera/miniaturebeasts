// Idle's props (lvgl-switch.md §2.1, §4 L2.2; frame.json idle): the view the face takes, views/idle-props.mjs, in Node. Plain JSON that names what and never where: it validates against idle.props.json, holds no rectangle, shares the
// living window's people with Home (the same seeds, the bed, the carried set asleep), and says the one line the spec's order gives: the crates in the bay while docked, the bud ready, the bud growing, the mibis out with the Companion
// (only while away); none, empty; six words or fewer, no digits.
//   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { idleBuild, idleLine } from "../src/views/idle-props.mjs";
import { homeBuild } from "../src/views/home-props.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames"), specs = path.resolve(here, "../../ui/specs/station");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const J = (f) => JSON.parse(readFileSync(path.join(specs, f), "utf8")), frame = J("frame.json"), home = J("home.json"), schema = J("idle.props.json");
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 12 }, T0 = 1_000_000;

function validate(v, sc, at = "$", out = []) {
  if (sc.$ref) return validate(v, schema.$defs[sc.$ref], at, out);
  if (sc.enum && !sc.enum.includes(v)) { out.push(`${at}: ${JSON.stringify(v)} is not one of ${JSON.stringify(sc.enum)}`); return out; }
  if (sc.type) { const ts = [].concat(sc.type), ty = v === null ? "null" : Array.isArray(v) ? "array" : Number.isInteger(v) ? "integer" : typeof v; if (!ts.includes(ty) && !(ty === "integer" && ts.includes("number"))) { out.push(`${at}: a ${ty}, wanted ${ts.join(" or ")}`); return out; } }
  if (Array.isArray(v) && sc.items) v.forEach((x, i) => validate(x, sc.items, `${at}[${i}]`, out));
  if (v && typeof v === "object" && !Array.isArray(v)) { for (const k of sc.required ?? []) if (!(k in v)) out.push(`${at}: ${k} is required`); for (const [k, x] of Object.entries(v)) { const p = sc.properties?.[k]; if (p) validate(x, p, `${at}.${k}`, out); else if (sc.additionalProperties === false) out.push(`${at}: ${k} is not a prop`); } }
  return out;
}
const world = () => { const st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = 99; st.d = 99; st.s = 99; st.firstMibi = false; st.dock = { docked: true, at: T0 }; return st; };
const crate = (n) => ({ id: "c" + n, n, turn: 0, at: T0, e: 3, d: 3, s: 4, pods: [], met: [], explored: 0, of: 0, lines: [] });
const sv0 = (over = {}) => ({ v: 8, seed: 7, wid: "w1", turn: 0, bay: [], mibis: [], carried: [], tier: 1, shield: 3, ...over });
const build = (st, sv) => idleBuild({ st, sv, settings, docked: S.docked(st) }, frame);
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
test("the living window is Home's: the same residents with the same seeds, the same bed and sleepers", () => {
  const st = world(); adults(st, 5); const sv = sv0({ carried: [st.mibis[0].id, st.mibis[1].id] }), h = homeBuild({ st, sv, settings, docked: true, ui: {}, focus: null }, home, frame).props.regions, i = build(st, sv).props.regions;
  assert.deepEqual(i.residents, h.residents); assert.deepEqual(i.bed, h.bed); assert.equal(i.bed.state, "docked"); assert.equal(i.bed.sleepers.length, 2);
  assert.equal(i.vivarium.picture, "idle-vivarium-day:1024x568");
});
test("the line: the first that holds of crates (docked), the bud ready, the bud growing, out with the Companion (away, mibis carried); none, empty; six words or fewer and no digits", () => {
  const L = (st, sv) => idleLine({ st, sv, settings, docked: S.docked(st) }, frame.idle);
  { const st = world(); assert.equal(L(st, sv0()), "", "nothing: empty"); assert.equal(L(st, sv0({ bay: [crate(1)] })), "a crate waits in the bay"); assert.equal(L(st, sv0({ bay: [crate(1), crate(2)] })), "two crates wait in the bay"); assert.equal(L(st, sv0({ bay: [1, 2, 3, 4].map(crate) })), "three crates wait in the bay", "more reads three"); }
  { const st = world(); st.dock = { docked: false, at: T0 }; assert.equal(L(st, sv0({ bay: [crate(1)] })), "", "crates only while docked"); }
  { const st = world(); st.bud = { kind: "founder", species: "S01", start: Date.now(), minutes: 5 }; assert.equal(L(st, sv0()), "a bud is growing"); st.bud.start = Date.now() - 1e9; assert.equal(L(st, sv0()), "the bud is ready"); assert.equal(L(st, sv0({ bay: [crate(1)] })), "a crate waits in the bay", "the crates come first"); }
  { const st = world(); adults(st, 3); st.dock = { docked: false, at: T0 }; const one = L(st, sv0({ carried: [st.mibis[0].id] })); assert.equal(one, `${st.mibis[0].name} is out with the Companion`);
    assert.equal(L(st, sv0({ carried: [st.mibis[0].id, st.mibis[1].id] })), "two mibis are with the Companion"); assert.equal(L(st, sv0({ carried: st.mibis.map((m) => m.id) })), "three mibis are with the Companion");
    st.dock = { docked: true, at: T0 }; assert.equal(L(st, sv0({ carried: [st.mibis[0].id] })), "", "docked, nothing about them"); }
  for (const t of [...Object.values(frame.idle.strings.crates), frame.idle.strings.budReady, frame.idle.strings.budGrowing, ...Object.values(frame.idle.strings.out)]) { assert.ok(t.replace("{name}", "Bean").split(" ").length <= 6, t); assert.ok(!/\d/.test(t), t); }
});
