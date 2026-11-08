// SPEED check, moved out of tests/library-sheet.test.mjs (the correctness gate): each of the eight review states renders in under 3 s
// (targets on the development machine: a sheet or lit variant 1.5 s, a met sheet 1.2 s). Run alone, on a quiet machine (the gate's perf stage,
// tools/gate/full-parallel.sh): a loaded machine measures the load, not the code.
//   node --test prototypes/station/perf/library-sheet.perf.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as L from "../src/library-sheet.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), frames = path.resolve(here, "../../workbench/frames");
const frameOf = (id) => JSON.parse(readFileSync(path.join(frames, `species-${id}.json`), "utf8"));
const F = Object.fromEntries(["S01", "S02", "S04", "S09", "S11", "S16"].map((id) => [id, frameOf(id)]));
const mid = JSON.parse(readFileSync(path.join(here, "../tests/fixtures/specimen/states/mid.json"), "utf8"));
const all = (fr, k = 1) => { const s = {}; for (const ch of fr.chapters) for (const t of ch.traits) s[t.id] = t.looks.slice(0, Math.ceil(t.looks.length * k)); return s; };
const found = (id, f, extra = {}) => ({ species: id, mode: "found", found: f, shut: [], fresh: [], readOnce: [], sealedOpen: false, ...extra });
const met = (id) => ({ species: id, mode: "met", found: {}, shut: [], fresh: [], readOnce: [], sealedOpen: false });
const belatzHalf = () => { const sh = all(F.S09, 0.5); for (const t of F.S09.chapters.find((c) => c.id === "movement").traits) delete sh[t.id]; return found("S09", sh, { shut: ["movement"] }); };
const STATES = () => [
  ["Loika mid", F.S01, found("S01", mid.S01), null], ["Loika Coat lit", F.S01, found("S01", mid.S01), "coat"], ["Belatz half found, Movement sealed", F.S09, belatzHalf(), null],
  ["Belatz Coat lit, complete", F.S09, found("S09", all(F.S09)), "coat"], ["Kilpo all found", F.S11, found("S11", all(F.S11)), null], ["Hiljan all found", F.S04, found("S04", all(F.S04)), null],
  ["Blikur all found", F.S16, found("S16", all(F.S16)), null], ["Untuva met-only", F.S02, met("S02"), null]];

test("each review state's sheet renders in under 3 s", () => {
  console.log(`# the paper and the vignette, once per process: ${L.paperMs().toFixed(0)} ms`);
  for (const [name, fr, inp, lit] of STATES()) {
    const a = L.renderSheet(fr, inp, { lit }), target = inp.mode === "met" ? 1200 : 1500;
    console.log(`# ${name}: rendered in ${a.ms.toFixed(0)} ms (target ${target} ms)`); assert.ok(a.ms < 3000, `${name}: ${a.ms.toFixed(0)} ms`);
  }
});
