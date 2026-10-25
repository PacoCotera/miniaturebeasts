// The Library's Level 1 as props (library.json l1): the view the face takes, views/library-props.mjs, in Node. Plain JSON that names what and never where: it validates against library.props.json in every scene, holds no
// rectangle, lists every species in species order with its state, targets the met and found cells only, keeps the ring on ui.lib.l1, marks the wish and the looks new this visit, and says the line from the spec's strings.
//   node --test prototypes/station/tests/
import { lineCased } from "./fixtures/line-case.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameIds, frameOf } from "../src/genome.mjs";
import { currentLooks } from "../../workbench/framework/describe.mjs";
import * as S from "../src/state.mjs";
import * as Lib from "../src/library.mjs";
import { libraryBuild as libraryBuildUnchecked, subjectOf } from "../src/views/library-props.mjs";
const libraryBuild = lineCased(libraryBuildUnchecked, "library");   // every body it builds goes through assertLineCase (report mode)

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames"), specs = path.resolve(here, "../../ui/specs/station");
const FRAMES = readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8")));
setFrames(FRAMES);
const J = (f) => JSON.parse(readFileSync(path.join(specs, f), "utf8")), spec = J("library.json"), frameSpec = J("frame.json"), schema = J("library.props.json"), L = spec.l1;
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
const build = (st, ui = { l1: null }) => libraryBuild({ st, settings, ui }, spec, frameSpec);
const cellOf = (b, id) => b.props.regions.cells.find((c) => c.id === id);
const findLooks = (st, id, n) => { let left = n; for (const ch of frameOf(id).chapters) for (const t of ch.traits) for (const l of currentLooks(frameOf(id), t)) { if (left <= 0) return; if (S.guideLooks(st, id, t.id).includes(l)) continue; S.guideAdd(st, id, t.id, [l]); left--; } };

test("a fresh world: sixteen unmet cells in species order, no target and no ring, no ✓, the subject says no species is seen yet; the readout", () => {
  const st = world(), b = build(st);
  assert.deepEqual(validate(b.props, schema), [], "validates"); assert.equal(b.props.state, "all");
  assert.deepEqual(b.props.regions.cells.map((c) => c.id), frameIds(), "every species of the catalogue, in species order");
  for (const c of b.props.regions.cells) assert.deepEqual([c.status, c.name, c.picture, c.mark, c.face, c.wish, c.glint], ["unmet", "", "", "", "", false, false], c.id + " shows nothing of the species");
  assert.deepEqual(b.props.focus, { cur: "", targets: [] }, "no target: the pad skips every cell, and there is no ring");
  assert.deepEqual(b.line, { ok: null, subject: L.strings.subjects.none, back: L.strings.back, need: null });
  assert.deepEqual(b.top, { readout: { text: "All species", mark: null } });
  assert.deepEqual(b.props.regions.stage.picture, [L.stage.master]); assert.ok(b.requests.some((r) => r.id === L.stage.master && r.kind === "slot"), "the ground master");
  for (const id of [L.cell.seed.slice, L.cell.wish.slice, L.cell.glint.slice]) assert.ok(b.requests.some((r) => r.id === id), id);
  assert.equal(new Set(b.requests.map((r) => r.id)).size, b.requests.length, "one request an id");
});

test("found, met and unmet cells: the picture, the mark and the name by state; met and found cells are the targets; the ring on ui.lib.l1, else the first; ✓ Open {species}; no rectangle", () => {
  const st = world(); st.knownIds = ["S02", "S03"]; st.metIds = ["S01", "S04"]; findLooks(st, "S02", 3);
  const b = build(st, { l1: "S03" });
  assert.deepEqual(validate(b.props, schema), [], "validates");
  for (const id of ["S02", "S03"]) { const c = cellOf(b, id); assert.equal(c.status, "found"); assert.equal(c.name, frameOf(id).species.name); assert.match(c.picture, new RegExp(`^library-cell-${id}-[0-9a-f]{8}$`)); assert.equal(c.mark, `species-mark-${id}-10`); }
  for (const id of ["S01", "S04"]) { const c = cellOf(b, id); assert.equal(c.status, "met"); assert.match(c.picture, new RegExp(`^library-cell-${id}-`)); assert.equal(c.mark, `species-mark-${id}-10`); }
  assert.deepEqual([cellOf(b, "S05").status, cellOf(b, "S05").picture], ["unmet", ""]);
  assert.deepEqual(b.props.focus.targets.map((t) => t.id), ["cell.S01", "cell.S02", "cell.S03", "cell.S04"], "met and found only, in species order");
  assert.equal(b.props.focus.cur, "cell.S03"); assert.equal(b.line.ok, `Open ${frameOf("S03").species.name}`); assert.equal(b.line.back, "Home");
  assert.equal(build(st, { l1: "S04" }).line.ok, `Open ${frameOf("S04").species.name}`, "a met cell opens too");
  assert.equal(build(st, { l1: "S09" }).props.focus.cur, "cell.S01", "a species that is not a target: the first target");
  assert.equal(build(st, { l1: null }).props.focus.cur, "cell.S01");
  const reqOf = (id) => b.requests.find((r) => r.id === cellOf(b, id).picture);
  assert.deepEqual([reqOf("S02").kind, reqOf("S02").status, reqOf("S02").ground, reqOf("S02").size], ["librarycell", "found", "libPanel", [140, 114]]);
  assert.deepEqual([reqOf("S01").status, reqOf("S01").ground, reqOf("S01").found], ["met", "libQuiet", {}]);
  assert.notEqual(cellOf(b, "S02").picture, cellOf(build((() => { const s2 = world(); s2.knownIds = ["S02"]; return s2; })()), "S02").picture, "another set of found looks is another picture");
  assert.ok(!/"(rect|x|y|w|h|colour|color|at)":/.test(JSON.stringify(b.props)), "names no rectangle and no colour"); assert.ok(JSON.stringify(b.props).length < 8 * 1024, "props " + JSON.stringify(b.props).length);
});

test("the subject: a new look, two to six spelled, seven or more drop the count, none empty; no digits", () => {
  const Sg = L.strings, want = ["", "a new look", "two new looks", "three new looks", "four new looks", "five new looks", "six new looks", "new looks", "new looks"];
  want.forEach((w, n) => assert.equal(subjectOf(Sg, n, true), w, n + " new looks"));
  assert.equal(subjectOf(Sg, 3, false), "no species seen yet");
  for (const w of want) { assert.ok(!/\d/.test(w)); assert.ok(w.split(" ").filter(Boolean).length <= 6); }
});

test("new this visit: a found species with looks found since the seen record glints, and the subject counts them across species; a met one never glints", () => {
  const st = world(); st.knownIds = ["S02", "S03"]; st.metIds = ["S04"]; findLooks(st, "S02", 4); findLooks(st, "S03", 2); st.libSeen = S.libSnapshot(st);
  let b = build(st); assert.ok(b.props.regions.cells.every((c) => !c.glint)); assert.equal(b.line.subject, "");
  findLooks(st, "S02", 2); b = build(st); assert.deepEqual(b.props.regions.cells.filter((c) => c.glint).map((c) => c.id), ["S02"]); assert.equal(b.line.subject, "two new looks");
  findLooks(st, "S03", 1); b = build(st); assert.deepEqual(b.props.regions.cells.filter((c) => c.glint).map((c) => c.id), ["S02", "S03"]); assert.equal(b.line.subject, "three new looks");
  assert.equal(cellOf(b, "S04").glint, false);
});

test("the wish's species carries the wish mark; a face chip names the species' face, faded once that mibi is released", () => {
  const st = world(); S.seedAdults(st, "S01", 4, 2, settings); const [a] = st.mibis;
  let b = build(st); assert.equal(cellOf(b, "S01").status, "found"); assert.deepEqual([cellOf(b, "S01").wish, cellOf(b, "S01").face], [false, ""]);
  const tr = Object.keys(st.guide.S01)[0]; assert.ok(Lib.wishPin(st, "S01", tr, st.guide.S01[tr][0], settings).ok); b = build(st); assert.equal(cellOf(b, "S01").wish, true);
  a.portrait = { state: "delivered" }; assert.ok(Lib.makeFace(st, a).ok); b = build(st);
  assert.equal(cellOf(b, "S01").face, `face:${a.id}:18`); const fr = b.requests.find((r) => r.id === `face:${a.id}:18`); assert.deepEqual([fr.kind, fr.size, fr.faded, fr.species], ["face", [18, 18], false, "S01"]);
  a.released = true; b = build(st); assert.equal(cellOf(b, "S01").face, `face:${a.id}:18:faded`); assert.equal(b.requests.find((r) => r.id === `face:${a.id}:18:faded`).faded, true);
  assert.deepEqual(validate(b.props, schema), []);
});

test("another catalogue size is refused: it comes back to UI/UX", () => {
  setFrames(FRAMES.slice(0, 15));
  try { assert.throws(() => build(world()), /another size comes back to UI\/UX/); } finally { setFrames(FRAMES); }
});
