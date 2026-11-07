#!/usr/bin/env node
// Renders the plain placeholder (framework/plain.mjs) for the first six members of a species'
// reference set (the type specimen and five random individuals, as `node sketch/cli.mjs --species
// S01 --set 5` writes them under out/reference/) at the three device sizes, under
// plain/renders/<species>/<id>/: station-300x310.png (from a 600×620 master by a 2×2 box),
// companion-280x300.png and token-48.png, portrait view. Then `python3 plain/compose.py` lays the sheet.
//   node plain/render.mjs [S01 S09 S12]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildIndividual } from "../framework/species.mjs";
import { plainSet } from "../framework/plain.mjs";
import { encodePNG } from "../framework/png.mjs";
import { growCameras } from "../grow/controls.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const wb = path.resolve(here, "..");
const species = process.argv.slice(2).length ? process.argv.slice(2) : ["S01", "S09", "S12"];
// The Companion's 48 colours (ui-kit §2), as the Retro Diffusion trial exported them.
const palette = JSON.parse(readFileSync(path.resolve(wb, "../../art/retro-diffusion-trial/companion-palette-48.json"), "utf8")).map((c) => c.rgb);
for (const sp of species) {
  const frame = JSON.parse(readFileSync(path.join(wb, "out/reference", sp, `species-${sp}.json`), "utf8"));
  const index = JSON.parse(readFileSync(path.join(wb, "out/reference", sp, "index.json"), "utf8"));
  const cameras = growCameras(frame);
  for (const m of index.members.slice(0, 6)) {
    const genome = JSON.parse(readFileSync(path.join(wb, "out/reference", sp, m.dir, "genome.json"), "utf8"));
    const scene = buildIndividual(frame, genome).scene;
    const out = path.join(here, "renders", sp, m.id); mkdirSync(out, { recursive: true });
    const t0 = Date.now();
    const set = plainSet(scene, cameras, palette);
    for (const key of ["plain-portrait-300x310", "plain-side-300x310", "plain-companion-280x300", "plain-token-48"]) writeFileSync(path.join(out, `${key.slice(6)}.png`), encodePNG(set[key]));
    console.log(`${sp} ${m.id} plain set in ${Date.now() - t0} ms`);
  }
}
