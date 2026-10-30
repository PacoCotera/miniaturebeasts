#!/usr/bin/env node
// The worst cases of the cute envelope: for a species, every open proportion locus rolled to its
// extremes (each locus at its lowest and its highest allele, homozygous, the rest typical; then the
// corners: all low, all high, and alternating), the controls rendered, and a contact sheet of the
// portrait view with the locus values under each, for the eye to pick the ugliest. Writes the genomes
// under grow/out/<species>/extremes/<name>/genome.json and the sheet grow/sheets/extremes-<species>.png.
//   node grow/extremes.mjs S09
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildIndividual, typeSpecimen } from "../framework/species.mjs";
import { render, fitCamera } from "../framework/raster.mjs";
import { encodePNG } from "../framework/png.mjs";
import { LOCI, resolveCopies } from "../framework/catalogue.mjs";
import { growCameras } from "./controls.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const wb = path.resolve(here, "..");
const species = process.argv[2] ?? "S09";
const frame = JSON.parse(readFileSync(path.join(wb, "frames", `species-${species}.json`), "utf8"));
const specimen = typeSpecimen(frame);

// The open proportion loci: growth ratios and region forms among the open traits.
const open = frame.chapters.flatMap((ch) => ch.traits).flatMap((t) => t.loci).filter((id) => /^growth\.|^anatomy\.region/.test(id));
// The extremes of a locus: its pool's lowest and highest allele by resolved value (a form locus: first and last).
const extremes = {};
for (const id of open) {
  const locus = LOCI.get(id), pool = frame.pools[id];
  const val = (a) => { const v = resolveCopies(locus, [a, a]); return typeof v === "number" ? v : pool.indexOf(a); };
  const sorted = [...pool].sort((a, b) => val(a) - val(b));
  extremes[id] = { lo: sorted[0], hi: sorted.at(-1) };
}
const cases = [];
const withLoci = (name, set) => { const g = structuredClone(specimen); for (const [id, a] of Object.entries(set)) g.loci[id] = [a, a]; g.origin = { kind: "extreme", name }; cases.push({ name, set, genome: g }); };
withLoci("type-specimen", {});
for (const [id, e] of Object.entries(extremes)) { withLoci(`${id.split(".").pop()}=${e.lo}`, { [id]: e.lo }); withLoci(`${id.split(".").pop()}=${e.hi}`, { [id]: e.hi }); }
withLoci("all-low", Object.fromEntries(Object.entries(extremes).map(([id, e]) => [id, e.lo])));
withLoci("all-high", Object.fromEntries(Object.entries(extremes).map(([id, e]) => [id, e.hi])));
withLoci("alternate-a", Object.fromEntries(Object.entries(extremes).map(([id, e], i) => [id, i % 2 ? e.lo : e.hi])));
withLoci("alternate-b", Object.fromEntries(Object.entries(extremes).map(([id, e], i) => [id, i % 2 ? e.hi : e.lo])));
// Two more corners: the head and eyes low with the body high, and the reverse.
const headish = (id) => /head|eye|beak|crown|crest|muzzle|antenna/.test(id);
withLoci("small-head-big-body", Object.fromEntries(Object.entries(extremes).map(([id, e]) => [id, headish(id) ? e.lo : e.hi])));
withLoci("big-head-small-body", Object.fromEntries(Object.entries(extremes).map(([id, e]) => [id, headish(id) ? e.hi : e.lo])));

const cameras = growCameras(frame);
const cell = [200, 207], cols = 6, pad = 8, textH = 46;
const rows = Math.ceil(cases.length / cols);
const W = cols * (cell[0] + pad) + pad, H = rows * (cell[1] + textH + pad) + pad;
const sheet = { width: W, height: H, data: new Uint8ClampedArray(W * H * 4).fill(255) };
const outDir = path.join(here, "out", species, "extremes"); mkdirSync(outDir, { recursive: true });
const index = [];
cases.forEach((c, i) => {
  let scene, status = "built";
  try { const b = buildIndividual(frame, c.genome); if (b.validation.status !== "valid") status = "rejected: " + b.validation.problems.join("; "); scene = b.scene; } catch (e) { status = "throws: " + e.message; }
  const dir = path.join(outDir, c.name.replace(/[^A-Za-z0-9=._-]/g, "_")); mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "genome.json"), JSON.stringify(c.genome, null, 1) + "\n");
  index.push({ name: c.name, dir: path.relative(here, dir), set: c.set, status });
  if (!scene) return;
  const cam = { ...cameras.portrait.station, size: cell, scale: cameras.portrait.station.scale * (cell[0] / 300) };
  const im = render(scene, cam, "shaded");
  const x0 = pad + (i % cols) * (cell[0] + pad), y0 = pad + Math.floor(i / cols) * (cell[1] + textH + pad);
  for (let y = 0; y < cell[1]; y++) for (let x = 0; x < cell[0]; x++) for (let k = 0; k < 4; k++) sheet.data[((y0 + y) * W + x0 + x) * 4 + k] = im.data[(y * cell[0] + x) * 4 + k];
});
writeFileSync(path.join(outDir, "index.json"), JSON.stringify({ species, loci: extremes, cases: index }, null, 1) + "\n");
mkdirSync(path.join(here, "sheets"), { recursive: true });
writeFileSync(path.join(here, "sheets", `extremes-${species}-cells.png`), encodePNG(sheet));
console.log(JSON.stringify({ species, open, cases: cases.length, rejected: index.filter((c) => c.status !== "built").map((c) => c.name + ": " + c.status) }));
