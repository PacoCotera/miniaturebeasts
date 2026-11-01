// Chunk 1: the three pictures, the calibration table and the rule report. node prototypes/workbench/foundation/cli.mjs [ball|head|snail|grid|nose|feet|silhouette|litter|all]
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadHouseFile } from "../form/house/house-file.mjs";
import { loadSpecimens } from "./specimens.mjs";
import { headSizeSheet, snailSheet, gridSheet, noseSheet, feetSheet, snailLitter, silhouetteSheet } from "./sheets.mjs";
import { headSheet } from "./headsheet.mjs";
import { renderSheet, loadPlaywright } from "./page.mjs";
import { RESULTS } from "./paths.mjs";

const what = process.argv[2] ?? "all", house = loadHouseFile(), sp = loadSpecimens(house);
mkdirSync(RESULTS, { recursive: true });
const rec = {}, T0 = performance.now(), pw = await loadPlaywright(), shot = async (spec, name) => { const r = await renderSheet(spec, RESULTS, name, pw); console.log("sheet", name, "labels", r.layout.labels.length, "ok"); };
const rowOf = (t) => ({ label: t.label, measured: t.measured, fails: t.fails.map((x) => `${x.id} ${x.value?.toFixed?.(3)} (${x.range[0] ?? ""} to ${x.range[1] ?? ""})`), ms: t.ms, clampLog: t.ex.log });
if (what === "ball" || what === "all") { const b = headSheet(house, sp.S01); await shot(b.spec, "0-head-ball"); await shot(b.numbersSpec, "0-head-numbers"); rec.ball = b.numbers; }
if (what === "head" || what === "all") { const h = headSizeSheet(house, sp.S01, RESULTS); await shot(h.spec, "1-head-size-choice"); rec.head = h.tiles.map((x) => rowOf(x.tile)); }
if (what === "snail" || what === "all") { const s = snailSheet(house, sp.S14, RESULTS); await shot(s.spec, "2-snail"); rec.snail = rowOf(s.tile); }
if (what === "grid" || what === "all") for (const k of ["eye-spacing", "muzzle-lid"]) { const g = gridSheet(house, sp.S01, RESULTS, k); await shot(g.spec, `3-grid-${k}`); rec[`grid-${k}`] = g.tiles.map((x) => rowOf(x.tile)); }
if (what === "nose" || what === "all") { const n = noseSheet(house, sp.S01, RESULTS); await shot(n.spec, "4-nose-rule"); rec.nose = n.tiles.map(rowOf); }
if (what === "feet" || what === "all") { const f = feetSheet(house, sp.S01, RESULTS); await shot(f.spec, "5-feet"); }
if (what === "silhouette" || what === "all") { const q = silhouetteSheet(house, sp.S01, RESULTS); await shot(q.spec, "7-back-line"); rec.silhouette = q.tiles.map((x) => ({ hs: x.hs, at: x.profile.at, measured: x.tile.measured })); rec.silhouetteMaster = q.master; }
if (what === "litter" || what === "all") { const l = snailLitter(house, sp.S14, RESULTS); await shot(l.spec, "6-snail-litter-96"); rec.litter = l.tiles.map(rowOf); }
writeFileSync(path.join(RESULTS, `report-${what}.json`), JSON.stringify(rec, null, 1));
console.log(`done in ${Math.round(performance.now() - T0)} ms ->`, RESULTS);
