// The Incubator's props (lvgl-switch.md §2.1, §4 R; incubator.json): the view the face takes, views/incubator-props.mjs, in Node. The four states (empty, growing, ready, hatch), the leaves of the wait, the rail's tabs, the bottom line, the budget.
//   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, podGenome } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { incubatorBuild } from "../src/views/incubator-props.mjs";
import { habitatBuild } from "../src/views/habitat-props.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames"), specs = path.resolve(here, "../../ui/specs/station");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const schema = JSON.parse(readFileSync(path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../ui/specs/station"), "incubator.props.json"), "utf8"));
const J = (f) => JSON.parse(readFileSync(path.join(specs, f), "utf8")), spec = J("incubator.json"), pods = J("pods.json");
function validate(v, sc, at = "$", out = []) {
  if (sc.$ref) return validate(v, schema.$defs[sc.$ref], at, out);
  if (sc.oneOf) { const ok = sc.oneOf.filter((o) => validate(v, o, at, []).length === 0).length; if (ok !== 1) out.push(`${at}: matches ${ok} of oneOf`); return out; }   // the moving prop: "" or one object form (Station M1 §2.2)
  if ("const" in sc && v !== sc.const) out.push(`${at}: ${JSON.stringify(v)} is not ${JSON.stringify(sc.const)}`);
  if (sc.enum && !sc.enum.includes(v)) { out.push(`${at}: ${JSON.stringify(v)} is not one of ${JSON.stringify(sc.enum)}`); return out; }
  if (sc.type) { const ts = [].concat(sc.type), ty = v === null ? "null" : Array.isArray(v) ? "array" : Number.isInteger(v) ? "integer" : typeof v; if (!ts.includes(ty) && !(ty === "integer" && ts.includes("number"))) { out.push(`${at}: a ${ty}, wanted ${ts.join(" or ")}`); return out; } }
  if (typeof v === "number" && ((sc.minimum !== undefined && v < sc.minimum) || (sc.maximum !== undefined && v > sc.maximum))) out.push(`${at}: ${v} is outside ${sc.minimum}..${sc.maximum}`);
  if (Array.isArray(v) && sc.items) v.forEach((x, i) => validate(x, sc.items, `${at}[${i}]`, out));
  if (Array.isArray(v) && sc.maxItems !== undefined && v.length > sc.maxItems) out.push(`${at}: more than ${sc.maxItems}`);
  if (v && typeof v === "object" && !Array.isArray(v)) {
    for (const k of sc.required ?? []) if (!(k in v)) out.push(`${at}: ${k} is required`);
    for (const [k, x] of Object.entries(v)) { const p = sc.properties?.[k]; if (p) validate(x, p, `${at}.${k}`, out); else if (sc.additionalProperties === false) out.push(`${at}: ${k} is not a prop`); }
  }
  return out;
}
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 12 }, T0 = 1_000_000;
const SPECIES = readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => f.slice(8, 11));

function world(species = SPECIES[0]) {
  const st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = 99; st.d = 99; st.s = 99; st.firstMibi = false;
  S.seedPodFromGenome(st, podGenome(frameOf(species), 0), settings, T0); const p = st.tray[0]; S.skipIdentify(st, p);
  return { st, p };
}
const build = (st, ui = { inc: {} }, now = T0, lamp = "") => incubatorBuild({ st, settings, now, ui, lamp }, spec, pods);

test("an empty Incubator offers Choose a pod only when the rack holds a pod and a bay is free", () => {
  const { st } = world(), e = build(st);
  assert.deepEqual(validate(e.props, schema), [], "empty validates"); assert.equal(e.props.state, "empty"); assert.equal(e.line.ok, spec.bottomLine.states?.empty?.ok ?? spec.strings.choose); assert.equal(e.props.regions.leaves, undefined);
  st.tray.length = 0; assert.equal(build(st).line.ok, null);
});

test("a growing bud: the leaves count the minutes, the filling one its rows; Grow now and its price; ready: Open", () => {
  const { st, p } = world(); const r = S.grow(st, p, {}, settings, T0); assert.ok(r.ok);
  const g = build(st, { inc: {} }, T0 + 1000);
  assert.equal(g.props.state, "growing"); assert.equal(g.line.ok, spec.strings.grow); assert.match(g.line.subject, /^an? \w+ bud$/, "a founder's bud reads in the spec's lower case"); assert.ok(g.line.price);
  const L = g.props.regions.leaves; assert.ok(L.total >= 1 && L.full === 0 && L.rows >= 0 && L.rows <= 19);
  const mid = S.budLeaves(st, settings, T0 + st.bud.minutes * 30_000, 40); assert.ok(mid.full >= 0 && mid.rows <= 19);
  const rd = build(st, { inc: {} }, T0 + st.bud.minutes * 60_000 + 10_000);
  assert.equal(rd.props.state, "ready"); assert.equal(rd.line.ok, spec.strings.open); assert.equal(rd.props.regions.leaves.full, rd.props.regions.leaves.total);
});

test("every state is plain JSON, names no rectangle, and fits the 32 KiB budget", () => {
  const { st, p } = world(); S.grow(st, p, {}, settings, T0);
  for (const now of [T0 + 1000, T0 + st.bud.minutes * 60_000 + 10_000]) {
    const b = build(st, { inc: {} }, now), s = JSON.stringify(b.props); assert.deepEqual(validate(b.props, schema), [], "validates");
    assert.ok(s.length < 24_000, "props " + s.length); assert.ok(!/"(rect|x|y|w|h)":/.test(s));
  }
  const now = T0 + st.bud.minutes * 60_000 + 10_000, o = S.openBud(st, {}, settings, now); assert.ok(o.ok);
  const hatch = { mibi: o.mibi.id, species: o.mibi.species, code: o.mibi.code, read: o.mibi.read, kind: "founder", parents: null };
  const h = build(st, { inc: { hatch } }, now, "painting");
  assert.deepEqual(validate(h.props, schema), [], "hatch validates"); assert.equal(h.props.state, "hatch"); assert.equal(h.line.ok, null); assert.ok(h.props.regions.juvenile.picture); assert.ok(JSON.stringify(h.props).length < 24_000);
});

// L3: the hatch draws the mibi at the stage it has now, and the meet after it draws the same picture (one id, one request), whatever the world's adult turns
test("the hatch's juvenile and the meet's resident are one picture, for adultTurns 2 (a juvenile) and 0 (an adult already)", () => {
  const frameSpec = J("frame.json"), habSpec = J("habitat.json"), home = J("home.json");
  for (const adultTurns of [2, 0]) {
    const cfg = { ...settings, adultTurns }, { st, p } = world(); const r = S.grow(st, p, {}, cfg, T0); assert.ok(r.ok);
    const now = T0 + st.bud.minutes * 60_000 + 10_000, o = S.openBud(st, {}, cfg, now); assert.ok(o.ok);
    const hatch = { mibi: o.mibi.id, species: o.mibi.species, code: o.mibi.code, read: o.mibi.read, kind: "founder", parents: null };
    const inc = incubatorBuild({ st, settings: cfg, now, ui: { inc: { hatch } }, lamp: "" }, spec, pods), sv = { v: 8, seed: 7, wid: "w1", turn: 0, bay: [], mibis: [], carried: [], tier: 1, shield: 3, carryReqs: [] };
    const hab = habitatBuild({ st, sv, settings: cfg, docked: S.docked(st), light: "day", focus: null, habId: o.mibi.id, meetId: o.mibi.id, armed: false }, habSpec, frameSpec, home);
    assert.equal(S.mibiStage(st, o.mibi, cfg), adultTurns === 2 ? "juvenile" : "adult", "the stage of the world");
    assert.equal(inc.props.regions.juvenile.picture, hab.props.regions.resident.picture, `adultTurns ${adultTurns}: one picture id`);
    const a = inc.requests.find((x) => x.id === inc.props.regions.juvenile.picture), b = hab.requests.find((x) => x.id === hab.props.regions.resident.picture); assert.deepEqual(a, b, "one request");
  }
});

// ---- Station M1 §2.6: the hatch's juvenile with its moving set ----
import { setMoving } from "../src/moving.mjs";
{ const J2 = (f) => JSON.parse(readFileSync(path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../ui/specs/station"), f), "utf8")), ix = J2("moving/index.json"), sets = {}; for (const id of ix.sets) sets[id] = J2(`moving/${id}.json`); setMoving(sets); }
test("the hatch's juvenile names its close atlas and shadow when its set may play, and fits incubator.props.json", () => {
  const st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = 99; st.d = 99; st.s = 99; S.seedPodFromGenome(st, podGenome(frameOf("S01"), 3), settings, T0); const p = st.tray[0]; S.skipIdentify(st, p); assert.ok(S.grow(st, p, {}, settings, T0).ok);
  const r = S.openBud(st, {}, settings, T0 + 3600000); assert.ok(r.ok); const hatch = { mibi: r.mibi.id, species: r.mibi.species, code: r.mibi.code, read: r.mibi.read, kind: "founder", parents: null };
  const b = incubatorBuild({ st, settings, now: T0, ui: { inc: { hatch } }, lamp: "", motionSets: true }, spec, pods);
  assert.deepEqual(validate(b.props, schema), []); assert.deepEqual(b.props.regions.juvenile.moving, { set: "S01", close: "moving:juvenile:S01:close:304x312:species", shadow: "moving:juvenile:S01:shadow:304x24" });
  assert.equal(incubatorBuild({ st, settings, now: T0, ui: { inc: { hatch } }, lamp: "", motionSets: false }, spec, pods).props.regions.juvenile.moving, undefined, "the play gate shut: none");
});
test("the ready bud's front is requested as a slot of bud-ready-front-128x160 at the bud's rect (nothing drawn until placed); the other five bud pictures stay placeholders", () => {
  const { st, p } = world(); assert.ok(S.grow(st, p, {}, settings, T0).ok);
  const e = build(st, { inc: {} }, T0 + st.bud.minutes * 60_000 + 10_000), B = e.props.regions.bud;
  assert.equal(B.front.split(":")[0], "bud-ready-front-128x160"); assert.deepEqual(validate(e.props, schema), []);
  const front = e.requests.find((r) => r.id.startsWith("bud-ready-front-128x160")); assert.ok(front, "the front is requested"); assert.equal(front.kind, "slot"); assert.deepEqual(front.size, [128, 160]);
  for (const id of ["early", "late", "ready", "crack1", "crack2"]) assert.ok(B[id], `${id} is a picture of the bud`);
});
