// Chunk 1: the three pictures, the calibration table and the rule report. node prototypes/workbench/foundation/cli.mjs [head|snail|grid|all]
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadHouseFile } from "../form/house/house-file.mjs";
import { loadSpecimens } from "./specimens.mjs";
import { headSizeSheet, snailSheet, gridSheet, noseSheet } from "./sheets.mjs";
import { saveImage } from "./imgtools.mjs";
import { RESULTS } from "./paths.mjs";

const what = process.argv[2] ?? "all", house = loadHouseFile(), sp = loadSpecimens(house);
mkdirSync(RESULTS, { recursive: true });
const rec = {}, T0 = performance.now();
const rowOf = (t) => ({ label: t.label, measured: t.measured, fails: t.fails.map((x) => `${x.id} ${x.value?.toFixed?.(3)} (${x.range[0] ?? ""} to ${x.range[1] ?? ""})`), ms: t.ms, clampLog: t.ex.log });
if (what === "head" || what === "all") { const h = headSizeSheet(house, sp.S01, RESULTS); saveImage(path.join(RESULTS, "1-head-size-choice.png"), h.img); rec.head = h.tiles.map((x) => rowOf(x.tile)); }
if (what === "snail" || what === "all") { const s = snailSheet(house, sp.S14, RESULTS); saveImage(path.join(RESULTS, "2-snail.png"), s.img); rec.snail = rowOf(s.tile); }
if (what === "grid" || what === "all") for (const k of ["eye-spacing", "muzzle-lid"]) { const g = gridSheet(house, sp.S01, RESULTS, k); saveImage(path.join(RESULTS, `3-grid-${k}.png`), g.img); rec[`grid-${k}`] = g.tiles.map((x) => rowOf(x.tile)); }
if (what === "nose" || what === "all") { const n = noseSheet(house, sp.S01, RESULTS); saveImage(path.join(RESULTS, "4-nose-rule.png"), n.img); rec.nose = n.tiles.map(rowOf); }
writeFileSync(path.join(RESULTS, `report-${what}.json`), JSON.stringify(rec, null, 1));
console.log(`done in ${Math.round(performance.now() - T0)} ms ->`, RESULTS);
