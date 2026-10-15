#!/usr/bin/env node
// A contact sheet of every species' type specimen (or N random individuals of one species), for
// inspection. node tools/contact-sheet.mjs [--species id] [--n 8] [--view three-quarter] [--size 160] [--pass shaded] [--out file.png]
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildIndividual, sampleIndividual, typeSpecimen, rng } from "../framework/species.mjs";
import { fitCamera, render } from "../framework/raster.mjs";
import { encodePNG } from "../framework/png.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const framesDir = path.resolve(here, "../frames");
const frames = readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))).sort((a, b) => a.species.order - b.species.order);
const views = opt("view", "three-quarter,side").split(",");
const size = Number(opt("size", 160)), pass = opt("pass", "shaded");
const species = opt("species", null), n = Number(opt("n", 8));
const cells = [];
if (species) {
  const frame = frames.find((f) => f.species.id === species);
  const r = rng(`sheet:${species}:${opt("seed", 1)}`);
  cells.push({ frame, genome: typeSpecimen(frame), label: "type" });
  for (let i = 0; i < n; i++) cells.push({ frame, genome: sampleIndividual(frame, r), label: `#${i + 1}` });
} else for (const frame of frames) cells.push({ frame, genome: typeSpecimen(frame), label: frame.species.name });
const cols = views.length, rows = cells.length;
const W = cols * size, H = rows * size;
const out = { width: W, height: H, data: new Uint8ClampedArray(W * H * 4).fill(255) };
cells.forEach((cell, row) => {
  const built = buildIndividual(cell.frame, cell.genome);
  views.forEach((view, col) => {
    const img = render(built.scene, fitCamera(built.scene, view, [size, size], 0.06), pass);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const s = (y * size + x) * 4, d = ((row * size + y) * W + col * size + x) * 4;
      out.data[d] = img.data[s]; out.data[d + 1] = img.data[s + 1]; out.data[d + 2] = img.data[s + 2]; out.data[d + 3] = 255;
    }
  });
  console.log(`${cell.label}: ${built.validation.status} ${built.validation.counts.nodes} nodes`);
});
const file = opt("out", path.resolve(here, "../out/contact-sheet.png"));
writeFileSync(file, encodePNG(out));
console.log(`wrote ${file}`);
