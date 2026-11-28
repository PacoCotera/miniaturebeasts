#!/usr/bin/env node
// Encoder CLI: genome -> stamp SVG + PNG. Same genome, same bytes.
//
//   node encode.mjs examples/glowtail.json --size 300 --out stamp
//   node encode.mjs --random 7 --species glowtail --out stamp      (random individual)
//   node encode.mjs examples/glowtail.json --mm 20 --dpi 203 --out print   (monochrome thermal print)
import { readFileSync, writeFileSync } from "node:fs";
import { frameFor, byName } from "./src/frames.mjs";
import { stampCode, sizeFor } from "./src/codec.mjs";
import { stampGeometry, toSVG, rasterize } from "./src/stamp.mjs";
import { encodePNG } from "./src/png.mjs";
import { individual } from "./tests/cases.mjs";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const file = args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
if (!file && opt("random") === undefined) {
  console.error("usage: node encode.mjs <genome.json> | --random <seed> [--species S01…S16|future100|future150|hopper|puffcap|glowtail]  (frame ids: the registry's S01 Loika … S16 Blikur, the two synthetic future species, and the legacy ids; Tuikis)  [--size 300] [--out stamp] [--mm 20 --dpi 203]");
  process.exit(2);
}
const genome = file ? JSON.parse(readFileSync(file, "utf8")) : individual(byName(opt("species", "S03")), Number(opt("random")));
const frame = frameFor(genome.species, genome.version);
if (!frame) throw new Error(`no frame for species ${genome.species} v${genome.version}`);
const out = opt("out", "stamp"), mm = opt("mm");
const N = sizeFor(frame).N;
if (mm) {
  const dpi = Number(opt("dpi", 203)), D = (Number(mm) / 25.4) * dpi, geom = stampGeometry(genome, { mono: true });
  writeFileSync(`${out}.svg`, toSVG(geom, D));
  writeFileSync(`${out}.png`, encodePNG(rasterize(geom, D, { bilevel: true }), { gray: true, dpi }));
  console.log(`${out}.png: ${mm} mm at ${dpi} dpi, ${N}×${N} cells of ${(Number(mm) / N).toFixed(2)} mm (${(D / N).toFixed(1)} dots)`);
} else {
  const D = Number(opt("size", 300)), geom = stampGeometry(genome);
  writeFileSync(`${out}.svg`, toSVG(geom, D, { title: `genome stamp ${stampCode(frame, genome)}` }));
  writeFileSync(`${out}.png`, encodePNG(rasterize(geom, D)));
  console.log(`${out}.svg, ${out}.png: ${D} px, ${N}×${N} cells`);
}
if (!file) writeFileSync(`${out}.json`, JSON.stringify(genome, null, 1) + "\n");
console.log(`code ${stampCode(frame, genome)}`);
