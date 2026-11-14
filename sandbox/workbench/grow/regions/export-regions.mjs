#!/usr/bin/env node
// Per-part regions of a species' standard painting, from the rig (the index pass's parts): for each species, the bounding box of every body part the
// rig names, in pixels of the standard painting's view and size (the portrait at 600×620, fitted with the Station's 0.06 margin), and, for each trait the
// frame names, the union of the parts that trait is about (the Station's part rule), so a crop can be placed on the painting exactly.
//   node prototypes/workbench/grow/regions/export-regions.mjs S01 S09 S12            (writes trait-regions-<SNN>.json beside this file)
//   node prototypes/workbench/grow/regions/export-regions.mjs --check S01             (prints instead of writing)
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, buildIndividual } from "../../../station/src/genome.mjs";
import { fitCamera, resolveCamera, VIEWS, SCALES } from "../../framework/raster.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../frames");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
// the Station's rule from a trait to the parts it is about (station/src/art.mjs, PART_OF); no match: the whole body
const PART_OF = [
  [/crown|crest|horn|antenna/, ["crown", "horn", "antenna", "head"]], [/eye/, ["eye", "head"]], [/snout|muzzle|beak|jaw/, ["muzzle", "beak", "jaw", "head"]], [/ear/, ["ear", "head"]], [/head|face/, ["head"]],
  [/leg|feet|foot|stride|pace|gait|waddle|turning|weave/, ["leg", "ray", "foot-skirt"]], [/tail/, ["tail", "tail-bulb"]], [/wing|fin|flap/, ["flap", "fin"]], [/cap/, ["cap"]], [/shell/, ["shell", "wing-case"]],
];
const partsFor = (traitId) => (PART_OF.find(([re]) => re.test(traitId)) || [null, null])[1];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const SIZE = SCALES.large, VIEW = "portrait", MARGIN = 0.06;

export function regionsOf(speciesId) {
  const frame = frameOf(speciesId); if (!frame) throw new Error(`no frame for ${speciesId}`);
  const built = buildIndividual(frame, frame.typeSpecimen.genome); if (built.error || built.validation?.status === "invalid") throw new Error(`${speciesId}: the standard painting does not build: ${built.error ?? built.validation.status}`);
  const scene = built.scene, cam = resolveCamera(scene, fitCamera(scene, VIEW, SIZE, MARGIN)), view = VIEWS[cam.view], [W, H] = cam.size;
  const boxOf = (nodes) => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const n of nodes) for (const v of n.mesh.vertices) { const x = W / 2 + (dot(v, view.right) - cam.center[0]) * cam.scale, y = H / 2 - (dot(v, view.up) - cam.center[1]) * cam.scale; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return nodes.length ? [Math.floor(x0), Math.floor(y0), Math.ceil(x1) - Math.floor(x0), Math.ceil(y1) - Math.floor(y0)] : null; };   // [x, y, w, h]
  const names = [...new Set(scene.nodes.map((n) => n.part ?? n.id))], parts = Object.fromEntries(names.map((p) => [p, boxOf(scene.nodes.filter((n) => (n.part ?? n.id) === p))]));
  const inParts = (list) => (n) => { const p = n.part ?? n.id; return list.some((q) => p === q || p.startsWith(q + "-")); };
  const traits = {};
  for (const ch of frame.chapters) for (const t of ch.traits) {
    const list = partsFor(t.id), nodes = list ? scene.nodes.filter(inParts(list)) : [];
    traits[t.id] = { chapter: ch.id, parts: [...new Set(nodes.map((n) => n.part ?? n.id))], box: nodes.length ? boxOf(nodes) : null, whole: !nodes.length };
  }
  return { species: speciesId, painting: { view: VIEW, size: SIZE, margin: MARGIN, genome: "the frame's typeSpecimen" }, bodyBox: boxOf(scene.nodes), note: "boxes are [x, y, w, h] in pixels of the painting; `whole` marks a trait with no part of its own (its box is null: use bodyBox)", parts, traits };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes("--check"), ids = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  if (!ids.length) { console.error("usage: export-regions.mjs [--check] S01 S09 S12"); process.exit(2); }
  for (const id of ids) { const r = regionsOf(id), text = JSON.stringify(r, null, 1) + "\n"; if (check) console.log(text); else { const f = path.join(here, `trait-regions-${id}.json`); writeFileSync(f, text); console.log(`wrote ${path.relative(process.cwd(), f)}: ${Object.keys(r.parts).length} parts, ${Object.keys(r.traits).length} traits`); } }
}
