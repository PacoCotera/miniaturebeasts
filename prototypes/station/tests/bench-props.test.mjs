// The Probe bench as props (lvgl-switch.md §2.1, §4 P; bench.json): the view the face takes, views/bench-props.mjs, in Node. Plain JSON that names what and never where: it validates against bench.props.json in every scene (a fresh world's
// away included: no Probe yet), holds no rectangle and no colour, fits the props budget, picks its first focus by the Probe's state, flags what is enabled, lights the lamps, counts the switch's meaning from the tier, and says the bottom line
// of each focus from the spec's strings.
//   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as S from "../src/state.mjs";
import { benchBuild } from "../src/views/bench-props.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), specs = path.resolve(here, "../../ui/specs/station");
const J = (f) => JSON.parse(readFileSync(path.join(specs, f), "utf8")), spec = J("bench.json"), frameSpec = J("frame.json"), schema = J("bench.props.json"), Sg = spec.strings;
const T0 = 1_000_000, settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 12 };

function validate(v, sc, at = "$", out = []) {
  if (sc.$ref) return validate(v, schema.$defs[sc.$ref], at, out);
  if ("const" in sc && v !== sc.const) out.push(`${at}: ${JSON.stringify(v)} is not ${JSON.stringify(sc.const)}`);
  if (sc.enum && !sc.enum.includes(v)) { out.push(`${at}: ${JSON.stringify(v)} is not one of ${JSON.stringify(sc.enum)}`); return out; }
  if (sc.type) {
    const ts = [].concat(sc.type), ty = v === null ? "null" : Array.isArray(v) ? "array" : Number.isInteger(v) ? "integer" : typeof v;
    if (!ts.includes(ty) && !(ty === "integer" && ts.includes("number"))) { out.push(`${at}: a ${ty}, wanted ${ts.join(" or ")}`); return out; }
  }
  if (typeof v === "string" && sc.pattern && !new RegExp(sc.pattern).test(v)) out.push(`${at}: ${JSON.stringify(v)} does not match ${sc.pattern}`);
  if (typeof v === "number" && ((sc.minimum !== undefined && v < sc.minimum) || (sc.maximum !== undefined && v > sc.maximum))) out.push(`${at}: ${v} is outside ${sc.minimum}..${sc.maximum}`);
  if (Array.isArray(v) && sc.maxItems !== undefined && v.length > sc.maxItems) out.push(`${at}: more than ${sc.maxItems}`);
  if (Array.isArray(v) && sc.minItems !== undefined && v.length < sc.minItems) out.push(`${at}: fewer than ${sc.minItems}`);
  if (Array.isArray(v) && sc.items) v.forEach((x, i) => validate(x, sc.items, `${at}[${i}]`, out));
  if (v && typeof v === "object" && !Array.isArray(v)) {
    for (const k of sc.required ?? []) if (!(k in v)) out.push(`${at}: ${k} is required`);
    for (const [k, x] of Object.entries(v)) { const p = sc.properties?.[k]; if (p) validate(x, p, `${at}.${k}`, out); else if (sc.additionalProperties === false) out.push(`${at}: ${k} is not a prop`); }
  }
  return out;
}

// the state through the rules' own fields: docked or not, the Probe's shield and tier, the materials, the switch
function world({ docked = true, shield = 3, tier = 1, e = 99, d = 99, mendFull = true, noProbe = false } = {}) {
  const st = S.freshSt("w1", 3, T0); S.normalize(st); st.firstMibi = false; st.e = e; st.d = d; st.s = 0; st.mendFull = mendFull;
  st.dock = { docked, at: T0 }; if (!noProbe) st.probe = { shield, smax: S.TIER[tier].shield, tier, seq: 1 };
  return st;
}
const sv = () => ({ v: 8, seed: 7, wid: "w1", turn: 3, bay: [], mibis: [], carried: [], tier: 1, shield: 3 });
const build = (st, ui = { f: null, arm: 0, install: false }) => benchBuild({ st, sv: sv(), settings, docked: S.docked(st), ui }, spec, frameSpec);
const SCENES = {
  "a fresh world: no Probe, away": () => world({ docked: false, noProbe: true }),
  "docked, tier 1, two plates of three": () => world({ shield: 2 }),
  "docked, tier 1, every plate whole": () => world({ shield: 3 }),
  "docked, tier 1, short of the upgrade": () => world({ shield: 2, e: 5, d: 1 }),
  "docked, tier 2": () => world({ tier: 2, shield: 4, mendFull: false }),
  "away, tier 1": () => world({ docked: false, shield: 3 }),
  "away, tier 2": () => world({ docked: false, tier: 2, shield: 4 }),
};

for (const [name, mk] of Object.entries(SCENES)) {
  test(`the bench, ${name}: validates against bench.props.json, names no rectangle or colour, fits the budget`, () => {
    const b = build(mk()); assert.deepEqual(validate(b.props, schema), [], JSON.stringify(b.props).slice(0, 200));
    assert.ok(!/"(rect|rects|x|y|w|h|colour|color)":/.test(JSON.stringify(b.props)), "names no rectangle and no colour");
    assert.ok(!("tier" in b.props), "no top-level tier");
    assert.ok(JSON.stringify(b.props).length < 2 * 1024, "props " + JSON.stringify(b.props).length);
    for (const r of b.requests) assert.ok(["ph", "slot"].includes(r.kind), r.kind);
    assert.deepEqual(b.props.regions.bench.room, [`${spec.regions.bench.slice}:1024x522`]);
  });
}

test("the state, the plates and the cradle follow the dock and the tier; away draws no plates", () => {
  let b = build(world({ shield: 2 })); assert.equal(b.props.state, "docked"); assert.deepEqual(b.props.regions.plates, { tier: 1, whole: 2 }); assert.equal(b.props.regions.cradle.picture, spec.regions.cradle.pictures.tier1);
  b = build(world({ tier: 2, shield: 4 })); assert.deepEqual(b.props.regions.plates, { tier: 2, whole: 4 }); assert.equal(b.props.regions.cradle.picture, spec.regions.cradle.pictures.tier2);
  b = build(world({ docked: false })); assert.equal(b.props.state, "away"); assert.ok(!("plates" in b.props.regions)); assert.equal(b.props.regions.cradle.picture, spec.regions.cradle.pictures.away);
  b = build(world({ docked: false, noProbe: true })); assert.equal(b.props.state, "away"); assert.equal(b.props.regions.switch.count, 3, "a fresh world's Probe is tier 1: three plates");
});

test("the switch: its count is the tier's plates, its whole the dock's floor or all; the lamp is well when on", () => {
  let b = build(world({ mendFull: false })); assert.deepEqual(b.props.regions.switch, { state: "off", lamp: "off", count: 3, whole: S.DOCK_MEND_FLOOR });
  b = build(world({ mendFull: true })); assert.deepEqual(b.props.regions.switch, { state: "on", lamp: "well", count: 3, whole: 3 });
  b = build(world({ tier: 2, shield: 4, mendFull: false })); assert.deepEqual(b.props.regions.switch, { state: "off", lamp: "off", count: 4, whole: S.DOCK_MEND_FLOOR });
  b = build(world({ tier: 2, shield: 4, mendFull: true })); assert.deepEqual([b.props.regions.switch.count, b.props.regions.switch.whole], [4, 4]);
  b = build(world({ docked: false, mendFull: true })); assert.equal(b.props.regions.switch.state, "on", "set at any time: away too");
});

test("the slot, in order: fitted at tier 2; dim away; ready (armed after the first ✓) when affordable; else dim; the lamp off only when dim", () => {
  const sl = (st, ui) => build(st, ui).props.regions.slot;
  assert.deepEqual(sl(world({ tier: 2, shield: 4 })), { state: "fitted", lamp: "well" }); assert.deepEqual(sl(world({ docked: false, tier: 2, shield: 4 })), { state: "fitted", lamp: "well" });
  assert.deepEqual(sl(world({ docked: false })), { state: "dim", lamp: "off" });
  assert.deepEqual(sl(world({})), { state: "ready", lamp: "well" }); assert.deepEqual(sl(world({}), { f: null, arm: 1, install: false }), { state: "armed", lamp: "well" });
  assert.deepEqual(sl(world({ e: 11 })), { state: "dim", lamp: "off" }, "short of ⚡"); assert.deepEqual(sl(world({ d: 3 })), { state: "dim", lamp: "off" }, "short of ◆");
  assert.equal(build(world({}), { f: null, arm: 1, install: false }).props.focus.armed, "slot"); assert.equal(build(world({})).props.focus.armed, null);
  assert.equal(build(world({ e: 11 }), { f: null, arm: 1, install: false }).props.focus.armed, null, "an arm with nothing affordable is not armed");
});

test("the focus: the plates when docked and a plate is gone, else the switch; the ring the player left is kept; the plates are not offered away; the targets and what is enabled", () => {
  assert.equal(build(world({ shield: 2 })).props.focus.cur, "plates"); assert.equal(build(world({ shield: 3 })).props.focus.cur, "switch"); assert.equal(build(world({ docked: false, shield: 1 })).props.focus.cur, "switch");
  assert.equal(build(world({ shield: 2 }), { f: "slot", arm: 0, install: false }).props.focus.cur, "slot", "kept"); assert.equal(build(world({ docked: false }), { f: "plates", arm: 0, install: false }).props.focus.cur, "switch", "no plates away");
  let t = build(world({ shield: 2 })).props.focus.targets; assert.deepEqual(t, [{ id: "plates", group: "plates", enabled: true }, { id: "switch", group: "module", enabled: true }, { id: "slot", group: "module", enabled: true }]);
  t = build(world({ shield: 3, e: 0, d: 0 })).props.focus.targets; assert.deepEqual(t.map((x) => [x.id, x.enabled]), [["plates", false], ["switch", true], ["slot", true]], "every plate whole: the plates disabled; the slot short is still enabled");
  t = build(world({ docked: false })).props.focus.targets; assert.deepEqual(t.map((x) => [x.id, x.enabled]), [["switch", true], ["slot", false]], "away: no plates target, the slot nothing to send");
  t = build(world({ tier: 2, shield: 4 })).props.focus.targets; assert.deepEqual(t.map((x) => [x.id, x.enabled]), [["plates", false], ["switch", true], ["slot", false]], "fitted: the slot sends nothing");
});

test("the bottom line, by the focused target, from the spec's strings", () => {
  const line = (st, f, arm = 0) => build(st, { f, arm, install: false }).line;
  let l = line(world({ shield: 2 }), "plates"); assert.deepEqual([l.ok, l.price, l.subject, l.dim ?? null], [Sg.mend, "⚡ 1", "one plate to mend", null]);
  l = line(world({ shield: 1 }), "plates"); assert.equal(l.subject, "two plates to mend");
  l = line(world({ shield: 2, e: 0 }), "plates"); assert.deepEqual([l.dim, l.short, l.price], [true, "⚡", "⚡ 1"], "short: the dimmed cap, the short figure");
  l = line(world({ shield: 3 }), "plates"); assert.deepEqual([l.ok, l.subject], [null, Sg.whole]);
  l = line(world({ mendFull: false }), "switch"); assert.deepEqual([l.ok, l.subject, l.price ?? null], [Sg.switchOn, Sg.offContext, null]);
  l = line(world({ mendFull: true }), "switch"); assert.deepEqual([l.ok, l.subject], [Sg.switchOff, Sg.onContext]);
  l = benchBuild({ st: world({ mendFull: true }), sv: sv(), settings: { ...settings, economy: "free" }, docked: true, ui: { f: "switch", arm: 0, install: false } }, spec, frameSpec).line; assert.equal(l.subject, Sg.onContextFree, "free economy: the dock mends all, free");
  l = line(world({}), "slot"); assert.deepEqual([l.ok, l.price, l.subject, l.dim ?? null], [Sg.fit, "⚡ 12 ◆ 4", Sg.adds, null]);
  l = line(world({}), "slot", 1); assert.deepEqual([l.ok, l.price], [Sg.fitAgain, "⚡ 12 ◆ 4"]);
  l = line(world({ e: 3, d: 0 }), "slot"); assert.deepEqual([l.ok, l.dim, l.short], [Sg.fit, true, "⚡ ◆"], "short of both: the dimmed cap");
  l = line(world({ docked: false }), "slot"); assert.deepEqual([l.ok, l.subject], [null, Sg.dockFirst]);
  l = line(world({ tier: 2, shield: 4 }), "slot"); assert.deepEqual([l.ok, l.subject], [null, Sg.fitted]);
  for (const f of ["plates", "switch", "slot"]) assert.equal(line(world({}), f).back, Sg.back); assert.equal(line(world({}), "slot").need, null, "the host fills the notice");
});

test("while the install plays the tier-1 cradle picture is requested too (it cuts at 300)", () => {
  const ids = (ui) => build(world({ tier: 2, shield: 4 }), ui).requests.map((r) => r.id);
  assert.ok(!ids({ f: null, arm: 0, install: false }).includes(spec.regions.cradle.pictures.tier1)); assert.ok(ids({ f: null, arm: 0, install: true }).includes(spec.regions.cradle.pictures.tier1));
});
