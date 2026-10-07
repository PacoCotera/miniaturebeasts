#!/usr/bin/env node
// Encoder CLI: genome -> ring SVG + PNG.
//
//   node encode.mjs examples/hopper.json --size 300 --out ring
//   node encode.mjs --random 7 --size 300 --out ring            (random genome, worked hopper frame)
//   node encode.mjs examples/hopper.json --mm 20 --dpi 203 --out print   (monochrome thermal print)
import { readFileSync, writeFileSync } from "node:fs";
import { HOPPER, frameFor } from "./src/frames.mjs";
import { randomGenome, rng, ringCode } from "./src/codec.mjs";
import { ringGeometry } from "./src/geometry.mjs";
import { toSVG, rasterize } from "./src/render.mjs";
import { encodePNG } from "./src/png.mjs";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const file = args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
if (!file && opt("random") === undefined) {
  console.error("usage: node encode.mjs <genome.json> | --random <seed>  [--size 300] [--out ring] [--mm 20 --dpi 203]");
  process.exit(2);
}
const genome = file ? JSON.parse(readFileSync(file, "utf8")) : randomGenome(HOPPER, rng(Number(opt("random"))));
const frame = frameFor(genome.species, genome.version);
if (!frame) throw new Error(`no frame for species ${genome.species} v${genome.version}`);
const out = opt("out", "ring");
const mm = opt("mm");
if (mm) {
  // monochrome print: one pixel per printer dot
  const dpi = Number(opt("dpi", 203));
  const D = (Number(mm) / 25.4) * dpi;
  const geom = ringGeometry(genome, { mono: true });
  writeFileSync(`${out}.svg`, toSVG(geom, D));
  writeFileSync(`${out}.png`, encodePNG(rasterize(geom, D, { bilevel: true }), { gray: true, dpi }));
  console.log(`${out}.png: ${mm} mm at ${dpi} dpi = ${D.toFixed(1)} dots`);
} else {
  const D = Number(opt("size", 300));
  const geom = ringGeometry(genome);
  writeFileSync(`${out}.svg`, toSVG(geom, D, { title: `genome ring ${ringCode(frame, genome)}` }));
  writeFileSync(`${out}.png`, encodePNG(rasterize(geom, D)));
  console.log(`${out}.svg, ${out}.png: ${D} px`);
}
if (!file) writeFileSync(`${out}.json`, JSON.stringify(genome, null, 1) + "\n");
console.log(`code ${ringCode(frame, genome)}`);
