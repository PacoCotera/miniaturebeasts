#!/usr/bin/env node
// The Grow service's control step (service.py calls it): one genome in, its control images and its
// plain placeholder out, under a directory named by the genome's SHA-256. Same genome, same bytes,
// same directory.
//
//   node grow/controls.mjs --species S01 --genome g.json [--out-root grow/out]
//   node grow/controls.mjs --species S01 --digest S01-26c1ef67        # by digest or sha256 prefix (sketch/cli.mjs streams)
//
// Writes <out-root>/<species>/<sha256[:16]>/:
//   genome.json                       the genome as given
//   controls/<pass>.<view>.<size>.png  shaded, key (each slot flat in its own pigment), slots, index, silhouette; views portrait and side;
//                                     sizes large 600×620, station 300×310, companion 280×300, tile 48;
//                                     translucency rendered flat (a tint, never a dither)
//   controls/legend.json              the species, caption, the description in trait words, slots with pigments, parts with index colours, hashes
//   plain/*.png                       the plain placeholder set (framework/plain.mjs)
// and prints the directory as JSON.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildIndividual, typeSpecimen, brief, genomeDigest, FRAME_VERSION } from "../framework/species.mjs";
import { render, fitCamera, VIEWS, slotLegend, partLegend, markingFields } from "../framework/raster.mjs";
import { plainSet, PLAIN_VERSION } from "../framework/plain.mjs";
import { describeGenome } from "../framework/describe.mjs";
import { encodePNG } from "../framework/png.mjs";
import { genomeSha256, genomeByDigest } from "../sketch/cli.mjs";

export const GROW_CONTROLS_VERSION = "mb-grow-controls/1";
export const GROW_VIEWS = ["portrait", "side"]; // the main view (the front quarter, the face toward viewer-left) and the side
const SIZES = { large: [600, 620], station: [300, 310], companion: [280, 300], tile: [48, 48] };
const here = path.dirname(fileURLToPath(import.meta.url));
const wb = path.resolve(here, "..");

// The species' camera rig for Grow: fitted to the type specimen per view and size and shared by its
// individuals, so the subject fills the frame as the accepted Pip does and individuals keep their
// relative size.
export function growCameras(frame) {
  const specimen = buildIndividual(frame, typeSpecimen(frame)).scene;
  const cameras = {};
  for (const view of GROW_VIEWS) {
    cameras[view] = {};
    for (const [name, size] of Object.entries(SIZES)) cameras[view][name] = { ...fitCamera(specimen, view, size, name === "tile" ? 0.04 : 0.09), fixed: true };
  }
  return cameras;
}

export function writeControls(frame, genome, outRoot, { palette }) {
  const built = buildIndividual(frame, genome);
  if (built.validation.status !== "valid") throw new Error(`${frame.species.id}: ${built.validation.problems.join("; ")}`);
  const scene = built.scene, sha = genomeSha256(genome);
  const dir = path.join(outRoot, frame.species.id, sha.slice(0, 16));
  mkdirSync(path.join(dir, "controls"), { recursive: true }); mkdirSync(path.join(dir, "plain"), { recursive: true });
  const cameras = growCameras(frame);
  const hashes = {};
  const put = (file, img) => { const buf = encodePNG(img); writeFileSync(path.join(dir, file), buf); hashes[file] = createHash("sha256").update(buf).digest("hex"); };
  for (const view of GROW_VIEWS) for (const [size, cam] of Object.entries(cameras[view])) {
    for (const pass of ["shaded", "key", "slots", "index", "silhouette"]) put(`controls/${pass}.${view}.${size}.png`, render(scene, cam, pass, { translucency: "flat" }));
  }
  for (const [key, img] of Object.entries(plainSet(scene, cameras, palette))) put(`plain/${key}.png`, img);
  writeFileSync(path.join(dir, "genome.json"), JSON.stringify(genome, null, 1) + "\n");
  const legend = {
    schema: GROW_CONTROLS_VERSION, species: frame.species.id, name: frame.species.name, clan: frame.taxonomy.clan, plan: frame.plan.code, rig: frame.plan.rig,
    level: genome.origin?.kind === "type-specimen" ? "species" : "individual", genomeDigest: genomeDigest(genome), genomeSha256: sha, frameVersion: FRAME_VERSION, catalogue: frame.catalogue,
    caption: brief(scene, frame), covering: scene.covering?.kind ?? null, views: GROW_VIEWS, sizes: SIZES,
    description: describeGenome(frame, genome, scene, { typeSpecimen: genome.origin?.kind === "type-specimen" }), // the genome in the player's words (describe.mjs)
    slots: slotLegend(scene), parts: partLegend(scene), markingFields: markingFields(scene),
    translucent: scene.nodes.filter((n) => n.opacity !== undefined && n.opacity < 1).map((n) => ({ id: n.id, part: n.part, opacity: n.opacity })),
    plainVersion: PLAIN_VERSION, outputs: hashes,
  };
  writeFileSync(path.join(dir, "controls", "legend.json"), JSON.stringify(legend, null, 1) + "\n");
  return { dir, legend };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
  const species = opt("species");
  if (!species) { console.error("--species is required"); process.exit(2); }
  const frameFile = [path.join(wb, "out/reference", species, `species-${species}.json`), path.join(wb, "frames", `species-${species}.json`)].find(existsSync);
  const frame = JSON.parse(readFileSync(frameFile, "utf8"));
  let genome;
  if (opt("genome")) genome = JSON.parse(readFileSync(opt("genome"), "utf8"));
  else if (opt("digest")) { genome = genomeByDigest(frame, opt("digest")); if (!genome) { console.error(`no genome in the streams for ${opt("digest")}`); process.exit(1); } }
  else genome = typeSpecimen(frame);
  const palette = JSON.parse(readFileSync(path.resolve(wb, "../../art/retro-diffusion-trial/companion-palette-48.json"), "utf8")).map((c) => c.rgb);
  const { dir, legend } = writeControls(frame, genome, path.resolve(opt("out-root", path.join(here, "out"))), { palette });
  console.log(JSON.stringify({ dir, species, genomeDigest: legend.genomeDigest, genomeSha256: legend.genomeSha256 }));
}
