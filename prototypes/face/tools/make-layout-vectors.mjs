#!/usr/bin/env node
// Writes prototypes/face/tests/vectors/layout.json: the derived rules (ui/specs/derive.mjs) evaluated over the Station's spec files on the counts the screens can reach. face_test runs the C
// rules (src/layout/layout.c) on the same cases and layout.test.mjs checks the file is current, so the two implementations give the same answer for every case.
//   node prototypes/face/tools/make-layout-vectors.mjs          (writes)     node prototypes/face/tools/make-layout-vectors.mjs --check   (fails when the file is not current)
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { evaluate } from "../../ui/specs/derive.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), specs = path.resolve(here, "../../ui/specs/station"), out = path.resolve(here, "../tests/vectors/layout.json");
const spec = Object.fromEntries(["frame", "pods", "incubator", "vivarium", "habitat", "home", "cargo", "namer", "bench"].map((n) => [n, JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8"))]));
const at = (name, p) => p.split(".").reduce((o, k) => o[k], spec[name]);
const cases = [];
const add = (rule, name, p, args) => cases.push({ rule, spec: name, path: p, args, expect: evaluate(rule, at(name, p), args) });
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

for (const n of range(0, 13)) for (const centred of [0, 1]) for (const open of n ? [...new Set([0, Math.min(n - 1, 3), n - 1])] : [0]) add("slantTabs", "frame", "regions.rail", [n, open, centred]);
for (const r of range(0, 39)) add("slantAt", "frame", "regions.rail", [r]);
for (const p of ["regions.chapter.page", "regions.compareA"]) for (const n of range(0, 10)) { add("pageSize", "pods", p, [n]); add("pageGrid", "pods", p, [n]); }
for (const cols of range(0, 5)) for (const rows of range(0, 3)) add("pageOrigin", "pods", "regions.chapter.page", [cols, rows]);   // the frame's origin, and a frame past either end of the table
for (const i of range(0, 5)) { add("placeRect", "pods", "regions.collection", [i]); add("kinRect", "pods", "regions.overview.kin", [i]); }
for (const w of [...range(0, 40).map((i) => i * 7), 0, 56, 57, 200, 500, 80 - 25, 224 - 24, 224 - 23]) add("plateWidth", "pods", "regions.overview.name", [w]);
for (const w of [0, 56, 57, 200, 500]) add("plateIndex", "pods", "regions.overview.name", [w]);   // the series id the width names: its place in the series and the series' length
for (const lines of [0, 1, 2, 3]) for (const widest of [0, 90, 400, 700]) for (const focal of [null, [200, 400, 400, 150], [0, 0, 1024, 100], [900, 540, 100, 10]]) add("platePosition", "frame", "regions.plate", [lines, widest, focal ? 1 : 0, ...(focal ?? [0, 0, 0, 0])]);
for (const spec2 of ["habitat", "vivarium"]) for (const n of [0, 1, 6, 7, 12, 13]) for (const i of new Set([0, n - 1])) add("listPitch", spec2, "regions.tiles", [n, i]);   // the bay strip's forms: both ends of each form, and 13 (refused)
// K5: the name tags' plates (Home, the Vivarium, Habitat) and Cargo's dock ribbon, the widths round the step and at each end of the range
for (const [name, p] of [["home", "regions.nameTag"], ["vivarium", "regions.nameTag"], ["habitat", "regions.nameTag"], ["cargo", "regions.dockRibbon"]]) for (const w of [0, 1, 40, 41, 57, 100, 150, 160, 200, 300, 500, 700]) add("plateWidth", name, p, [w]);
// K5: the lists the kit's tiles stand on, every item of every count from none to one past the form that holds the most (refused), the counts a form ends at and the one after
const LISTS = [["namer", "regions.keys", [0, 1, 27, 28, 29]], ["home", "regions.pods.slots", range(0, 7)], ["home", "regions.companion.plates", range(0, 5)], ["habitat", "regions.cross.faces", range(0, 12)], ["cargo", "regions.hatch.strip.find", range(0, 8)],
  ["cargo", "regions.arrival.band.leaving", range(0, 4)], ["cargo", "regions.arrival.band.probe", range(0, 6)], ["bench", "regions.switch.meaning.plates", range(0, 5)], ["bench", "regions.slot.adds.pods", range(0, 4)], ["bench", "regions.slot.adds.plates", range(0, 5)], ["frame", "regions.panel.cards", range(0, 4)], ["frame", "regions.panel.strip.cards", range(0, 3)]];
for (const [name, p, ns] of LISTS) for (const n of ns) for (const i of range(0, Math.max(n, 1) - 1)) add("listPitch", name, p, [n, i]);
for (const n of range(0, 12)) add("stampCell", "pods", "regions.overview", [n, 104, 2]);
const text = JSON.stringify({ note: "Made by tools/make-layout-vectors.mjs from ui/specs/derive.mjs and the spec files. Each case: a rule, a spec file and a path in it, integer args, and the answer flattened to integers (derive.mjs `evaluate`, layout.c `layout_eval`).", cases }, null, 0).replace(/\},\{"rule"/g, "},\n{\"rule\"") + "\n";
if (process.argv.includes("--check")) { if (readFileSync(out, "utf8") !== text) { console.error("tests/vectors/layout.json is not current: run tools/make-layout-vectors.mjs"); process.exit(1); } console.log(`layout vectors current: ${cases.length} cases`); }
else { writeFileSync(out, text); console.log(`wrote ${cases.length} cases`); }
