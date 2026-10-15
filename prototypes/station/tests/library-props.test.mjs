// The Library spread as props (lvgl-switch.md §2.1, §4 L; library.json spread): the view the face takes, views/library-props.mjs, in Node. Plain JSON that names what and never where: it validates against
// library.props.json in every scene, holds no rectangle, fits the props budget, lists sixteen frames in their own places and sixteen enabled targets, derives the progress in integer quarters, counts a released mibi's
// portrait for the gilt corner, and says the line of each status from the spec's strings.
//   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameIds } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import * as Lib from "../src/library.mjs";
import { libraryBuild } from "../src/views/library-props.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames"), specs = path.resolve(here, "../../ui/specs/station");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const J = (f) => JSON.parse(readFileSync(path.join(specs, f), "utf8")), spec = J("library.json"), frameSpec = J("frame.json"), schema = J("library.props.json"), SP = spec.spread;
const T0 = 1_000_000, settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 12, sealedOpen: true };

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
const world = () => { const st = S.freshSt("w1", 3, T0); S.normalize(st); st.firstMibi = false; return st; };
const build = (st, ui = { page: 0, i: 0 }, set = settings) => libraryBuild({ st, settings: set, ui }, spec, frameSpec);
const items = (b) => [...b.props.regions.leftPage.items, ...b.props.regions.rightPage.items];
// find k looks of a species' guide, in order, until `n` are found
const findLooks = (st, id, n) => { const g = Lib.fieldGuide(st, id, settings); let left = n; for (const ch of g.chapters) for (const t of ch.traits) for (const l of t.possible) { if (left <= 0) return; if (S.guideLooks(st, id, t.id).includes(l)) continue; S.guideAdd(st, id, t.id, [l]); left--; } };   // n looks not yet found
const total = (st, id) => { const g = Lib.fieldGuide(st, id, settings); return g.found + g.unseen; };

test("a fresh world: sixteen unmet frames in their own places, nothing known, all sixteen targets enabled, the ring on S01, the line says an empty frame", () => {
  const st = world(), b = build(st), its = items(b);
  assert.deepEqual(validate(b.props, schema), [], "validates"); assert.equal(b.props.state, "spread");
  assert.deepEqual(its.map((i) => i.id), frameIds().slice(0, 16), "the species' own places, in frame order"); assert.equal(b.props.regions.leftPage.items.length, 8); assert.equal(b.props.regions.rightPage.items.length, 8);
  for (const i of its) assert.deepEqual([i.status, i.name, i.clan, i.portrayed, i.complete, i.progress, i.picture, i.roundel], ["unmet", null, null, false, false, null, null, null], i.id + " draws nothing");
  assert.equal(b.props.focus.cur, "frame.S01"); assert.equal(b.props.focus.targets.length, 16); assert.ok(b.props.focus.targets.every((t) => t.enabled && t.group === "frame" && /^frame\.S\d\d$/.test(t.id)));
  assert.deepEqual(b.line, { ok: null, subject: SP.strings.subjects.unmet, back: SP.strings.back, need: null });
  assert.ok(b.requests.some((r) => r.id === "library-stage-spread-1024x522" && r.kind === "spread"), "the stage"); assert.equal(b.props.regions.stage.picture, "library-stage-spread-1024x522");
  assert.equal(new Set(b.requests.map((r) => r.id)).size, b.requests.length, "one request an id");
});

test("found, met and unmet frames: the plate, the study, the name, the clan and the roundel by status; the line by status; no digit in a name; no rectangle; the budget", () => {
  const st = world(); st.knownIds = ["S01", "S02", "S03"]; st.metIds = ["S04"]; S.seedAdults(st, "S05", 4, 1, settings);
  const b = build(st, { page: 0, i: 2 }), its = items(b), by = Object.fromEntries(its.map((i) => [i.id, i]));
  assert.deepEqual(validate(b.props, schema), [], "validates");
  for (const id of ["S01", "S02", "S03", "S05"]) { const i = by[id]; assert.equal(i.status, "found", id); assert.equal(i.picture, `spread-plate-${id}-80x96`); assert.match(i.roundel, /^clan-roundel-C\d\d-12x12$/); assert.ok(i.name && !/\d/.test(i.name)); assert.ok(i.progress >= 1 && i.progress <= 4); }
  assert.deepEqual([by.S04.status, by.S04.picture, by.S04.progress, by.S04.portrayed, by.S04.complete], ["met", "spread-study-S04-80x96", null, false, false]); assert.match(by.S04.roundel, /^clan-roundel-/); assert.ok(by.S04.name);
  assert.deepEqual([by.S06.status, by.S06.name, by.S06.picture, by.S06.roundel], ["unmet", null, null, null]);
  assert.equal(b.props.focus.cur, "frame.S03"); assert.equal(b.line.ok, null, "found: no ✓ cap until slot 8 (the Book is shut)"); assert.equal(b.line.subject, by.S03.name);
  assert.deepEqual(build(st, { page: 0, i: 3 }).line, { ok: null, subject: `${by.S04.name}, only seen`, back: "Home", need: null }, "met: no ✓ cap");
  assert.equal(build(st, { page: 0, i: 8 }).line.subject, "an empty frame");
  assert.ok(!/"(rect|x|y|w|h|colour|color)":/.test(JSON.stringify(b.props)), "names no rectangle and no colour"); assert.ok(JSON.stringify(b.props).length < 8 * 1024, "props " + JSON.stringify(b.props).length);
  for (const r of b.requests) assert.ok(["spread", "species", "slot"].includes(r.kind), r.kind);
});

test("the progress is four integer steps of the share of looks found; complete shows four and the seal's flag", () => {
  const st = world(); st.knownIds = ["S02"]; const T = total(st, "S02"), at = () => items(build(st)).find((i) => i.id === "S02");
  assert.equal(at().progress, 1, "none found: 1"); findLooks(st, "S02", Math.ceil(T / 4)); assert.equal(at().progress, 2, "a quarter: 2");
  findLooks(st, "S02", Math.ceil(T / 4)); assert.ok(at().progress >= 3, "a half: 3"); findLooks(st, "S02", Math.ceil(T / 4)); assert.equal(at().progress, 4, "three quarters: 4"); assert.equal(at().complete, false);
  findLooks(st, "S02", T); assert.deepEqual([at().progress, at().complete], [4, true], "every look found: four and the seal");
  // the steps are exact on every boundary, through the view: one look more at a time from none to all, the step read from the props against a quarter, a half and three quarters of the total
  { const sx = world(); sx.knownIds = ["S02"]; const Tx = total(sx, "S02"), fx = () => items(build(sx)).find((i) => i.id === "S02");
    for (let f = 0; f <= Tx; f++) { if (f > 0) findLooks(sx, "S02", 1); const want = 4 * f < Tx ? 1 : 2 * f < Tx ? 2 : 4 * f < 3 * Tx ? 3 : 4; assert.equal(fx().progress, want, `${f} of ${Tx} looks found`); } }
});

test("the gilt corner: any delivered portrait of a mibi of the species, a released mibi's included; none otherwise", () => {
  const st = world(); S.seedAdults(st, "S01", 4, 2, settings); const [a, b2] = st.mibis;
  assert.equal(items(build(st)).find((i) => i.id === "S01").portrayed, false);
  a.portrait = { state: "painting" }; assert.equal(items(build(st)).find((i) => i.id === "S01").portrayed, false, "a portrait on its way is not one");
  a.portrait = { state: "delivered" }; a.released = true; assert.equal(items(build(st)).find((i) => i.id === "S01").portrayed, true, "released, still counted");
  assert.equal(b2.portrait == null || b2.portrait.state !== "delivered", true);
});

test("the Library's ring: the kept frame (ui.i) is the cur, clamped to the spread; a second page is not built", () => {
  const st = world(); assert.equal(build(st, { page: 0, i: 15 }).props.focus.cur, "frame.S16"); assert.equal(build(st, { page: 0, i: 99 }).props.focus.cur, "frame.S16"); assert.equal(build(st, { page: 0, i: -3 }).props.focus.cur, "frame.S01");
  assert.ok(!JSON.stringify(build(st).props).includes("turn"), "no turn node, no turn prop");
});
