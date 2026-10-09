#!/usr/bin/env node
// Writes prototypes/face/tests/vectors/layout.json: the derived rules (ui/specs/derive.mjs) evaluated over the Station's spec files on the counts the screens can reach. face_test runs the C
// rules (src/layout/layout.c) on the same cases and layout.test.mjs checks the file is current, so the two implementations give the same answer for every case.
//   node prototypes/face/tools/make-layout-vectors.mjs          (writes)     node prototypes/face/tools/make-layout-vectors.mjs --check   (fails when the file is not current)
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { evaluate } from "../../ui/specs/derive.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), specs = path.resolve(here, "../../ui/specs/station"), out = path.resolve(here, "../tests/vectors/layout.json");
const spec = Object.fromEntries(["frame", "pods"].map((n) => [n, JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8"))]));
const at = (name, p) => p.split(".").reduce((o, k) => o[k], spec[name]);
const cases = [];
const add = (rule, name, p, args) => cases.push({ rule, spec: name, path: p, args, expect: evaluate(rule, at(name, p), args) });
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

for (const n of range(0, 13)) for (const centred of [0, 1]) for (const open of n ? [...new Set([0, Math.min(n - 1, 3), n - 1])] : [0]) add("slantTabs", "frame", "regions.rail", [n, open, centred]);
for (const r of range(0, 39)) add("slantAt", "frame", "regions.rail", [r]);
for (const p of ["regions.chapter.page", "regions.compareA"]) for (const n of range(0, 10)) { add("pageSize", "pods", p, [n]); add("pageGrid", "pods", p, [n]); }
for (const i of range(0, 5)) { add("placeRect", "pods", "regions.collection", [i]); add("kinRect", "pods", "regions.overview.kin", [i]); }
for (const w of range(0, 40).map((i) => i * 7)) add("plateWidth", "pods", "regions.overview.name", [w]);
for (const lines of [0, 1, 2, 3]) for (const widest of [0, 90, 400, 700]) for (const focal of [null, [200, 400, 400, 150], [0, 0, 1024, 100], [900, 540, 100, 10]]) add("platePosition", "frame", "regions.plate", [lines, widest, focal ? 1 : 0, ...(focal ?? [0, 0, 0, 0])]);
for (const n of range(0, 12)) add("stampCell", "pods", "regions.overview", [n, 104, 2]);
const text = JSON.stringify({ note: "Made by tools/make-layout-vectors.mjs from ui/specs/derive.mjs and the spec files. Each case: a rule, a spec file and a path in it, integer args, and the answer flattened to integers (derive.mjs `evaluate`, layout.c `layout_eval`).", cases }, null, 0).replace(/\},\{"rule"/g, "},\n{\"rule\"") + "\n";
if (process.argv.includes("--check")) { if (readFileSync(out, "utf8") !== text) { console.error("tests/vectors/layout.json is not current: run tools/make-layout-vectors.mjs"); process.exit(1); } console.log(`layout vectors current: ${cases.length} cases`); }
else { writeFileSync(out, text); console.log(`wrote ${cases.length} cases`); }
