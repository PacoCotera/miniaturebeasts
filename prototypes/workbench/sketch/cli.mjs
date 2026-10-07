#!/usr/bin/env node
// Writes a sketch set to prototypes/workbench/out/sketch/<species>/<id>/ as PNGs and a manifest.
//
//   node sketch/cli.mjs --species S03                 # the type specimen
//   node sketch/cli.mjs --species S03 --seed 7        # a random individual
//   node sketch/cli.mjs --species S03 --genome g.json # an exported genome
//   node sketch/cli.mjs --all                         # every species' type specimen
//   node sketch/cli.mjs --species S03 --verify        # render twice, compare every byte
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sketchIndividual, manifest, speciesCameras } from "./sketch.mjs";
import { typeSpecimen, sampleIndividual, rng } from "../framework/species.mjs";
import { encodePNG } from "../framework/png.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const flag = (k) => args.includes(`--${k}`);
const framesDir = path.resolve(here, "../frames");
const outRoot = path.resolve(here, "../out/sketch");
const sha = (buf) => createHash("sha256").update(buf).digest("hex");

export function writeSketch(frame, genome, { verify = false, out = outRoot } = {}) {
  const cameras = speciesCameras(frame);
  const sketch = sketchIndividual(frame, genome, { cameras });
  if (sketch.status !== "sketched") throw new Error(`${frame.species.id}: ${sketch.problems.join("; ")}`);
  const dir = path.join(out, frame.species.id, genome.origin?.kind === "type-specimen" ? "type-specimen" : sketch.genomeDigest);
  mkdirSync(dir, { recursive: true });
  const hashes = {};
  const pngs = {};
  for (const im of sketch.images) { pngs[im.key] = encodePNG(im.image); hashes[im.key] = sha(pngs[im.key]); }
  hashes.sketch = sha(Object.keys(hashes).sort().map((k) => `${k}:${hashes[k]}`).join("\n"));
  if (verify) {
    const again = sketchIndividual(frame, genome, { cameras: speciesCameras(frame) });
    for (const im of again.images) if (sha(encodePNG(im.image)) !== hashes[im.key]) throw new Error(`not deterministic: ${im.key}`);
  }
  for (const [key, buf] of Object.entries(pngs)) writeFileSync(path.join(dir, `${key}.png`), buf);
  const m = manifest(frame, genome, sketch, hashes);
  writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(m, null, 1) + "\n");
  writeFileSync(path.join(dir, "genome.json"), JSON.stringify(genome, null, 1) + "\n");
  return { dir, manifest: m, count: sketch.images.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const frames = readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))).sort((a, b) => a.species.order - b.species.order);
  const chosen = flag("all") ? frames : [frames.find((f) => f.species.id === opt("species", "S01"))];
  for (const frame of chosen) {
    const genome = opt("genome") ? JSON.parse(readFileSync(opt("genome"), "utf8")) : opt("seed") ? sampleIndividual(frame, rng(`${frame.species.id}:${opt("seed")}`), { kind: "random", seed: Number(opt("seed")) }) : typeSpecimen(frame);
    const t0 = Date.now();
    const { dir, manifest: m, count } = writeSketch(frame, genome, { verify: flag("verify") });
    console.log(`${frame.species.id}: ${count} images, sketch ${m.sketch.hash.slice(0, 12)}${m.outputs.some((o) => o.clipped) ? ", some views clipped" : ""} → ${path.relative(process.cwd(), dir)} (${((Date.now() - t0) / 1000).toFixed(1)} s${flag("verify") ? ", verified byte-identical" : ""})`);
  }
}
