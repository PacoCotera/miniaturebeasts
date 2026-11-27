// What the dock brings to the Bay (arrival.mjs arrivalOf; the Bay build): read from the rules, never from the strings: the crates the dock crossed, the ones holding a species new to the player, the Probe plates and the mend, who came home and who leaves. The Bay itself is cargo-props.test.mjs and intents.test.mjs.
//   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, speciesIndex } from "../src/genome.mjs";
import { withSeals } from "./fixtures/sealed.mjs";
import * as S from "../src/state.mjs";
import { arrivalOf, holdsNewSpecies } from "../src/arrival.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../species/frames/language"), specs = path.resolve(here, "../../ui/specs/station");
setFrames(withSeals(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8")))));
const J = (n) => JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8")), cargo = J("cargo"), home = J("home"), frame = J("frame"), panel = J("panel"), pods = J("pods");
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", rooms: 2 }, T0 = 1_000_000, words = (t) => t.trim().split(/\s+/).filter(Boolean).length;
const SPELL = ["no", "one", "two", "three"];

const crate = (n, species = "S01") => ({ id: "c" + n, n, turn: 0, at: T0, e: 3, d: 3, s: 4, met: [], explored: 0, of: 0, lines: [], pods: [{ id: "p0", species, sp: speciesIndex(species), g: "meadow", how: "calm", gs: 11 + n, k: null }] });
function world({ crates = 2, mibis = 3, mend = { free: 1, paid: 0, broke: false }, shield = 2, known = ["S01"], reqs = [] } = {}) {
  const st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = st.d = st.s = 99; st.firstMibi = false; st.dock = { docked: true, at: T0 }; S.seedAdults(st, "S01", 5, mibis, settings);
  st.knownIds = known; st.probe = { shield, smax: 3, tier: 1, seq: 1 };
  const sv = { v: 8, seed: 7, wid: "w1", turn: 0, bay: Array.from({ length: crates }, (_, i) => crate(i + 1, i === 1 ? "S02" : "S01")), mibis: [], carried: [], tier: 1, shield: 3 };
  st.carryReqs = reqs.map((r, i) => ({ seq: i + 1, ...r })); st.carrySeq = reqs.length;
  S.crossCrates(st, sv);   // the crates cross at the dock (16b): arrivalOf reads the Station-held list, not the Companion's hold
  return { st, sv, r: { ok: true, docked: true, home: [], mend } };
}
const ui = (arrival, extra = {}) => ({ cargo: { state: "arrival", crate: 0, at: 0, mend: null, run: null, shown: null, drawn: null, arrival, ...extra }, meet: null, skip: null });
const build = (w, a, extra) => cargoBuild({ st: w.st, sv: w.sv, settings, docked: true, light: "day", ui: ui(a, extra) }, cargo, home, frame);

test("arrivalOf: the crates in the bay (the first three drawn), the one holding a species new to the player, the Probe's plates and the mend, who came home and who leaves", () => {
  const w = world({ crates: 3, reqs: [] }); w.sv.bay = [crate(1), crate(2, "S02"), crate(3), crate(4)]; w.st.bayHeld = []; const x = S.crossCrates(w.st, w.sv);
  assert.deepEqual([x.crossed, x.aboard], [3, 1], "OWNER 07:1x three sealed crates: the Bay takes three, the fourth stays aboard");
  let a = arrivalOf(w.st, w.sv, w.r); assert.deepEqual([a.crates, a.shown, a.newCrates], [3, 3, [false, true, false]], "the three in the Bay are counted and drawn; S02 is new, S01 is known");
  assert.equal(holdsNewSpecies(w.st, w.sv.bay[0]), false); assert.equal(holdsNewSpecies(w.st, w.sv.bay[1]), true);
  assert.deepEqual(a.plates, { max: 3, whole: 1, mended: 1 }, "shield 2 after the dock's mend of 1: one whole before it");
  a = arrivalOf(w.st, w.sv, { ...w.r, mend: { free: 3, paid: 0, broke: true } }); assert.deepEqual([a.broke, a.plates.mended], [true, 3]);
  const ms = w.st.mibis; const w2 = world({ reqs: [{ op: "home", id: 1 }, { op: "add", id: 3 }] }); const b = arrivalOf(w2.st, w2.sv, { ...w2.r, home: [w2.st.mibis[1].id] });
  assert.deepEqual([b.back, b.leaving].map((x) => x.length), [2, 1], "a Bring asked and a mibi that walked come home; a Take asked leaves"); void ms;
  assert.equal(arrivalOf(world({ crates: 0 }).st, world({ crates: 0 }).sv, w.r).crates, 0);
});
