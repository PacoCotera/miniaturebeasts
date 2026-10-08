#!/usr/bin/env node
// Renders the plain look (framework/plain.mjs) for the first six members of a species' reference set
// (the type specimen and five random individuals, as `node sketch/cli.mjs --species S01 --set 5`
// writes them under out/reference/) at the three device sizes, under plain/renders/<species>/<id>/:
// station-300x310.png, station-600x620.png, companion-280x300.png, token-48.png, and the rig's
// shaded pass beside them for the sheet. Then `python3 plain/compose.py` lays the sheets.
//   node plain/render.mjs [S01 S09 S12]
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildIndividual } from "../framework/species.mjs";
import { render, fitCamera } from "../framework/raster.mjs";
import { plainRender, downsample2 } from "../framework/plain.mjs";
import { registryCameras } from "../sketch/sketch.mjs";
import { encodePNG } from "../framework/png.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const wb = path.resolve(here, "..");
const species = process.argv.slice(2).length ? process.argv.slice(2) : ["S01", "S09", "S12"];
const framesDir = path.join(wb, "frames");
const allFrames = readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))).sort((a, b) => a.species.order - b.species.order);
const cameras = registryCameras(allFrames);
// The Companion's 48 colours (ui-kit §2), as the Retro Diffusion trial exported them.
const palette = JSON.parse(readFileSync(path.resolve(wb, "../../art/retro-diffusion-trial/companion-palette-48.json"), "utf8")).map((c) => c.rgb);
for (const sp of species) {
  const frame = JSON.parse(readFileSync(path.join(wb, "out/reference", sp, `species-${sp}.json`), "utf8"));
  const index = JSON.parse(readFileSync(path.join(wb, "out/reference", sp, "index.json"), "utf8"));
  const sheet = JSON.parse(readFileSync(path.join(here, "species-sheets", `${sp}.json`), "utf8"));
  // The plain picture fills its frame as Pip does: the portrait camera is fitted to the species' type
  // specimen with a 7 % margin and shared by its individuals, so they keep their relative size.
  const specimenScene = buildIndividual(frame, JSON.parse(readFileSync(path.join(wb, "out/reference", sp, index.members[0].dir, "genome.json"), "utf8"))).scene;
  const cam = {}; for (const [name, size] of Object.entries({ station: [300, 310], large: [600, 620], companion: [280, 300], tile: [48, 48] })) cam[name] = { ...fitCamera(specimenScene, "portrait", size, name === "tile" ? 0.04 : 0.07), fixed: true };
  for (const m of index.members.slice(0, 6)) {
    const genome = JSON.parse(readFileSync(path.join(wb, "out/reference", sp, m.dir, "genome.json"), "utf8"));
    const scene = buildIndividual(frame, genome).scene;
    const out = path.join(here, "renders", sp, m.id); mkdirSync(out, { recursive: true });
    const t0 = Date.now();
    const master = plainRender(scene, cam.large, { device: "station", sheet }); // the 600×620 master; the Station size is its 2×2 box filter
    writeFileSync(path.join(out, "station-600x620.png"), encodePNG(master));
    writeFileSync(path.join(out, "station-300x310.png"), encodePNG(downsample2(master)));
    writeFileSync(path.join(out, "companion-280x300.png"), encodePNG(plainRender(scene, cam.companion, { device: "companion", sheet, palette })));
    writeFileSync(path.join(out, "token-48.png"), encodePNG(plainRender(scene, cam.tile, { device: "tile", sheet, palette })));
    writeFileSync(path.join(out, "shaded-300x310.png"), encodePNG(render(scene, cam.station, "shaded")));
    console.log(`${sp} ${m.id} plain ×4 in ${Date.now() - t0} ms`);
  }
}
