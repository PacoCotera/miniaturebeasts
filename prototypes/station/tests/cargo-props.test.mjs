// The Bay's props (cargo.json; bay-design-1 design.md 2; views/cargo-props.mjs), in Node: plain JSON that names what and never where, validated against cargo.props.json, in every state of the Bay (empty, one to three crates
// waiting, a crate open, the end, away, the Bay full with a fourth aboard, a portrait crate behind them); the words are cargo.json's strings (bay-words-1); the line says ✓ Open the crate, ✓ Put away, ✓ To the Nursery.
//   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { cargoBuild } from "../src/views/cargo-props.mjs";
import { readyList } from "../src/cargo-run.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../species/frames/language"), specs = path.resolve(here, "../../ui/specs/station");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const J = (f) => JSON.parse(readFileSync(path.join(specs, f), "utf8")), spec = J("cargo.json"), home = J("home.json"), frameSpec = J("frame.json"), schema = J("cargo.props.json");
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", rooms: 2 }, T0 = 1_000_000;

function validate(v, sc, at = "$", out = []) {
  if (sc.$ref) return validate(v, schema.$defs[sc.$ref], at, out);
  if (sc.enum && !sc.enum.includes(v)) { out.push(`${at}: ${JSON.stringify(v)} is not one of ${JSON.stringify(sc.enum)}`); return out; }
  if (sc.type) {
    const ts = [].concat(sc.type), ty = v === null ? "null" : Array.isArray(v) ? "array" : Number.isInteger(v) ? "integer" : typeof v;
    if (!ts.includes(ty) && !(ty === "integer" && ts.includes("number"))) { out.push(`${at}: a ${ty}, wanted ${ts.join(" or ")}`); return out; }
  }
  if (Array.isArray(v) && sc.items) v.forEach((x, i) => validate(x, sc.items, `${at}[${i}]`, out));
  if (v && typeof v === "object" && !Array.isArray(v)) {
    for (const k of sc.required ?? []) if (!(k in v)) out.push(`${at}: ${k} is required`);
    for (const [k, x] of Object.entries(v)) { const p = sc.properties?.[k]; if (p) validate(x, p, `${at}.${k}`, out); else if (sc.additionalProperties === false) out.push(`${at}: ${k} is not a prop`); }
  }
  return out;
}
const world = (docked = true) => { const st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = 4; st.d = 6; st.s = 6; st.firstMibi = false; st.dock = { docked, at: T0 }; st.knownIds = ["S02"]; return st; };
const crate = (n, pods = 2) => ({ id: "c" + n, n, turn: n * 2, at: T0, e: 3, d: 0, s: 4, met: [], explored: 5 * n, of: 20, lines: [], pods: Array.from({ length: pods }, (_, j) => ({ id: "p" + j, species: "S01", sp: 0, g: "meadow", how: "calm", gs: 7 + j })) });
const sv0 = (bay = []) => ({ v: 8, seed: 7, wid: "w1", turn: 0, bay, mibis: [], carried: [], tier: 1, shield: 3 });
const ui = (over = {}) => ({ cargo: { state: "bay", open: false, sum: null, portrait: null, arrival: null, ...over }, meet: null });
const build = (st, sv, u = ui(), docked = S.docked(st)) => { if (docked) S.crossCrates(st, sv); return cargoBuild({ st, sv, settings, docked, ui: u, now: T0 }, spec, home, frameSpec); };

test("the Bay's props validate against cargo.props.json in every state and name no rectangle", () => {
  const all = [], mk = (n, over = {}, docked = true) => { const st = world(docked); const sv = sv0(Array.from({ length: n }, (_, i) => crate(i + 1, i === 1 ? 0 : 2))); return [st, sv, over, docked]; };
  for (const [name, [st, sv, over, docked]] of Object.entries({ empty: mk(0), one: mk(1), two: mk(2), three: mk(3), four: mk(4), away: mk(2, {}, false), open: mk(3, { open: true }), end: mk(0, { sum: { crates: 3, pods: 4, newest: "x" } }) })) all.push([name, build(st, sv, ui(over), docked)]);
  for (const [name, b] of all) {
    const bad = validate(b.props, schema); assert.deepEqual(bad, [], `${name}: ${bad.slice(0, 3).join("; ")}`);
    assert.ok(!/"(x|y|w|h|rect|size|box|pitch)"\s*:/.test(JSON.stringify(b.props)), `${name}: props name what, never where`);
    for (const r of b.requests) assert.ok(typeof r.id === "string" && r.id.length, name + ": every request has an id");
  }
});
test("the Bay: the first crate is on the table, the next two on the ledge, tagged with their expedition; a crate that holds a pod has the ring, one with none has none", () => {
  const st = world(), sv = sv0([crate(5), crate(6, 0), crate(7)]), b = build(st, sv).props.bay;
  assert.equal(b.table.tag, spec.strings.tag.replace("{n}", 5)); assert.equal(b.table.ring, true); assert.equal(b.table.open, false);
  assert.deepEqual(b.ledge.map((c) => [c.tagShort, c.ring]), [["6", false], ["7", true]]); assert.equal(b.behind, 0);
});
test("the Bay open: the crate in hand shows its pods and each supply with its amount; the line says Put away", () => {
  const st = world(), sv = sv0([crate(1, 3), crate(2)]), r = build(st, sv, ui({ open: true })), t = r.props.bay.table;
  assert.equal(t.open, true); assert.equal(t.pods.length, 3); assert.deepEqual(t.pods.map((p) => p.side), [false, true, true]); assert.deepEqual(t.mats.map((m) => [m.name, m.amount]), [["energy", "+3"], ["essence", "+4"]], "a supply the crate does not hold is not drawn");
  assert.equal(r.line.ok, spec.strings.putAway); assert.equal(r.line.back, "Home"); assert.equal(r.props.bay.all, spec.strings.all);
  assert.equal(build(world(), sv0([crate(1)])).line.ok, spec.strings.open, "a closed crate: Open the crate");
});
test("the Companion's state on the ledge: Hold empty · ready to go out when nothing is aboard, the crates aboard and the Bay is full when the Bay holds three and one stays aboard, an empty cradle away", () => {
  let c = build(world(), sv0([crate(1)])).props.bay.companion; assert.deepEqual([c.docked, c.l1, c.l2], [true, "Hold empty", "ready to go out"]);
  c = build(world(), sv0([crate(1), crate(2), crate(3), crate(4)])).props.bay.companion; assert.deepEqual([c.l1, c.l2], ["1 crate aboard", "the Bay is full"]);
  c = build(world(false), sv0([crate(1)])).props.bay.companion; assert.deepEqual([c.docked, c.l1, c.l2, c.mark], [false, "", "", ""]);
});
test("the stores: the shelf counts the pods at home and shows the newest; the counters are the three figures", () => {
  const st = world(), sv = sv0([crate(1, 3)]); const r0 = build(st, sv).props.bay; assert.equal(r0.shelf.count, "0 on the shelf"); assert.deepEqual(r0.counters.map((c) => [c.label, c.value]), [["Energy", "4"], ["Data", "6"], ["Essence", "6"]]);
  S.openCrates(st, sv, settings, T0, [S.bayCrates(st)[0]]); const r1 = build(st, sv, ui({ sum: { crates: 1, pods: 3, newest: "x" } })), b = r1.props.bay;
  assert.equal(b.shelf.count, "3 on the shelf"); assert.equal(b.shelf.pods.length, 3); assert.equal(b.end, "1 crate unloaded · 3 pods home"); assert.equal(b.table, null); assert.equal(r1.line.ok, spec.strings.toNursery);
});
test("the end: crates unloaded and pods home in words, none when no pod came; with no end the line is Look at the pods only when a pod waits on the mat", () => {
  const st = world(); const e = (sum) => build(st, sv0(), ui({ sum })).props.bay.end;
  assert.equal(e({ crates: 3, pods: 6, newest: null }), "3 crates unloaded · 6 pods home"); assert.equal(e({ crates: 2, pods: 0, newest: null }), "2 crates unloaded · no pods home"); assert.equal(e({ crates: 1, pods: 1, newest: "x" }), "1 crate unloaded · 1 pod home");
  assert.equal(build(st, sv0(), ui()).line.ok, null, "nothing to do: no ✓ cap");
  st.waiting.push({ id: "w1", species: "S01", sp: 0, g: "meadow", how: "calm", gs: 3, idd: 0, read: [] }); assert.equal(build(st, sv0(), ui()).line.ok, spec.strings.newPods.few);
});
test("the crates that wait are the walk crates the dock crossed, the same whether the Companion is docked or away", () => {
  const st = world(false), sv = sv0([]); st.bayHeld = [crate(1), crate(2)]; assert.equal(readyList(st, sv, settings, T0).length, 2); assert.equal(build(st, sv, ui(), false).props.bay.ledge.length, 1);
});
