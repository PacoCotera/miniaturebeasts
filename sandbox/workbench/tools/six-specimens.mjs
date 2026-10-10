#!/usr/bin/env node
// The figure the owner judges: six type specimens (the cat, the fox, the bear, the bird, the
// turtle and the slug) side by side at Station scale and as 48 px tiles, one shared camera, so a
// human can see that a cat reads as a cat at 48 px. Writes img/six-specimens.png.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildIndividual, typeSpecimen } from "../framework/species.mjs";
import { render } from "../framework/raster.mjs";
import { registryCameras } from "../sketch/sketch.mjs";
import { encodePNG } from "../framework/png.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const ids = process.argv.slice(2).length ? process.argv.slice(2) : ["S04", "S05", "S07", "S09", "S11", "S14"];
const frames = ids.map((id) => JSON.parse(readFileSync(path.resolve(here, `../frames/species-${id}.json`), "utf8")));
const all = JSON.parse(readFileSync(path.resolve(here, "../frames/index.json"), "utf8")).species.map((s) => JSON.parse(readFileSync(path.resolve(here, `../frames/${s.file}`), "utf8")));
const cameras = registryCameras(all);
const W = 300, H = 310, TILE = 48, ZOOM = 4, GAP = 8, BG = [246, 243, 236];
const rowH = H + GAP + TILE * ZOOM + GAP + TILE + GAP + 18;
const out = { width: ids.length * (W + GAP) + GAP, height: 2 * rowH + GAP, data: new Uint8ClampedArray((ids.length * (W + GAP) + GAP) * (2 * rowH + GAP) * 4) };
for (let i = 0; i < out.data.length; i += 4) { out.data[i] = BG[0]; out.data[i + 1] = BG[1]; out.data[i + 2] = BG[2]; out.data[i + 3] = 255; }
const blit = (img, x0, y0, zoom = 1) => { for (let y = 0; y < img.height * zoom; y++) for (let x = 0; x < img.width * zoom; x++) { const s = ((Math.floor(y / zoom)) * img.width + Math.floor(x / zoom)) * 4, d = ((y0 + y) * out.width + x0 + x) * 4; out.data[d] = img.data[s]; out.data[d + 1] = img.data[s + 1]; out.data[d + 2] = img.data[s + 2]; } };
frames.forEach((frame, i) => {
  const scene = buildIndividual(frame, typeSpecimen(frame)).scene;
  ["three-quarter", "side"].forEach((view, row) => {
    const x = GAP + i * (W + GAP), y = GAP + row * rowH;
    blit(render(scene, cameras[view].station, "shaded"), x, y);
    const tile = render(scene, cameras[view].tile, "shaded");
    blit(tile, x, y + H + GAP, ZOOM);
    blit(tile, x + TILE * ZOOM + GAP, y + H + GAP);
    blit(render(scene, cameras[view].tile, "silhouette"), x + TILE * ZOOM + GAP + TILE + GAP, y + H + GAP);
  });
  console.log(`${frame.species.id} ${frame.taxonomy.resembles}`);
});
writeFileSync(path.resolve(here, "../img/six-specimens.png"), encodePNG(out));
console.log("wrote img/six-specimens.png");
