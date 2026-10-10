#!/usr/bin/env node
// Writes a sketch set to prototypes/workbench/out/sketch/<species>/<id>/ as PNGs and a manifest.
//
//   node sketch/cli.mjs --species S03                 # the type specimen
//   node sketch/cli.mjs --species S03 --seed 7        # a random individual
//   node sketch/cli.mjs --species S03 --genome g.json # an exported genome
//   node sketch/cli.mjs --all                         # every species' type specimen
//   node sketch/cli.mjs --species S03 --verify        # render twice, compare every byte
//   node sketch/cli.mjs --species S03 --fit-species   # per-species camera instead of the registry-wide one
//   node sketch/cli.mjs --species S03 --set 8         # a reference set: the type specimen and 8 individuals, with index.json
//   node sketch/cli.mjs --species S03 --digest S03-1a2b3c4d   # one individual again, by its genome digest (or a sha256 prefix):
//                                                    # from its saved genome.json, else regenerated from the deterministic streams
//
// Per individual the output is the control-image set a generation service receives (README, "The
// control-image spec"): genome.json, manifest.json and one PNG per pass, view and size, named
// <pass>[-field].<view>.<size>.png, under a directory named by the genome digest. Same genome, same
// bytes, same digest, same directory.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sketchIndividual, manifest, speciesCameras, registryCameras } from "./sketch.mjs";
import { typeSpecimen, sampleIndividual, rng, genomeDigest, FRAME_VERSION } from "../framework/species.mjs";
import { encodePNG } from "../framework/png.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const flag = (k) => args.includes(`--${k}`);
const framesDir = path.resolve(here, "../frames");
const outRoot = path.resolve(here, "../out/sketch");
const sha = (buf) => createHash("sha256").update(buf).digest("hex");
// The canonical genome text and its SHA-256: the strong hash beside the short digest (species.mjs
// genomeDigest, a 32-bit FNV that names directories); both are in the manifest.
export const canonicalGenome = (genome) => JSON.stringify({ schema: genome.schema, species: genome.species, frameVersion: genome.frameVersion, loci: Object.fromEntries(Object.keys(genome.loci).sort().map((k) => [k, [...genome.loci[k]].sort()])) });
export const genomeSha256 = (genome) => sha(canonicalGenome(genome));
export const REFERENCE_STREAM = 256, SEED_STREAM = 256;

// The genome behind a digest, deterministically: the short digest or a sha256 prefix, matched against
// the reference-set stream (rng `${species}:reference-set`, the first REFERENCE_STREAM members) and
// the seed stream (`--seed 1..SEED_STREAM`). Null when neither stream holds it.
export function genomeByDigest(frame, digest, { members = REFERENCE_STREAM, seeds = SEED_STREAM } = {}) {
  const match = (g) => genomeDigest(g) === digest || genomeSha256(g).startsWith(digest);
  const specimen = typeSpecimen(frame);
  if (match(specimen) || digest === frame.species.id || digest === "type-specimen") return specimen;
  const r = rng(`${frame.species.id}:reference-set`);
  for (let i = 0; i < members; i++) { const g = sampleIndividual(frame, r, { kind: "random", seed: i + 1 }); if (match(g)) return g; }
  for (let seed = 1; seed <= seeds; seed++) { const g = sampleIndividual(frame, rng(`${frame.species.id}:${seed}`), { kind: "random", seed }); if (match(g)) return g; }
  return null;
}
// A saved genome under out/reference or out/sketch, by digest.
function savedGenome(species, digest) {
  for (const root of ["../out/reference", "../out/sketch"]) {
    const dir = path.resolve(here, root, species);
    if (!existsSync(dir)) continue;
    for (const d of readdirSync(dir)) if (d === digest || d.startsWith(digest)) { const f = path.join(dir, d, "genome.json"); if (existsSync(f)) return JSON.parse(readFileSync(f, "utf8")); }
  }
  return null;
}

export function writeSketch(frame, genome, { verify = false, out = outRoot, cameras = speciesCameras(frame) } = {}) {
  const sketch = sketchIndividual(frame, genome, { cameras });
  if (sketch.status !== "sketched") throw new Error(`${frame.species.id}: ${sketch.problems.join("; ")}`);
  const dir = path.join(out, frame.species.id, genome.origin?.kind === "type-specimen" ? "type-specimen" : sketch.genomeDigest);
  mkdirSync(dir, { recursive: true });
  const hashes = {};
  const pngs = {};
  for (const im of sketch.images) { pngs[im.key] = encodePNG(im.image); hashes[im.key] = sha(pngs[im.key]); }
  hashes.sketch = sha(Object.keys(hashes).sort().map((k) => `${k}:${hashes[k]}`).join("\n"));
  if (verify) {
    const again = sketchIndividual(frame, genome, { cameras: structuredClone(cameras) });
    for (const im of again.images) if (sha(encodePNG(im.image)) !== hashes[im.key]) throw new Error(`not deterministic: ${im.key}`);
  }
  for (const [key, buf] of Object.entries(pngs)) writeFileSync(path.join(dir, `${key}.png`), buf);
  const m = manifest(frame, genome, sketch, hashes, { genomeSha256: genomeSha256(genome) });
  writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(m, null, 1) + "\n");
  writeFileSync(path.join(dir, "genome.json"), JSON.stringify(genome, null, 1) + "\n");
  return { dir, manifest: m, count: sketch.images.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const frames = readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))).sort((a, b) => a.species.order - b.species.order);
  const chosen = flag("all") ? frames : [frames.find((f) => f.species.id === opt("species", "S01"))];
  const cameras = flag("fit-species") ? null : registryCameras(frames); // registry-wide scale by default; --fit-species for a per-species fit
  for (const frame of chosen) {
    if (opt("set")) {
      const n = Number(opt("set"));
      const r = rng(`${frame.species.id}:reference-set`);
      const members = [typeSpecimen(frame), ...Array.from({ length: n }, (_, i) => sampleIndividual(frame, r, { kind: "random", seed: i + 1 }))];
      const index = { schema: "mb-reference-set/1", species: frame.species.id, frameVersion: FRAME_VERSION, catalogue: frame.catalogue, members: [] };
      for (const genome of members) {
        const { dir, manifest: m } = writeSketch(frame, genome, { out: path.resolve(here, "../out/reference"), cameras: cameras ?? speciesCameras(frame) });
        index.members.push({ id: m.id, level: m.level, genomeDigest: m.genomeDigest, genomeSha256: m.genomeSha256, seed: genome.origin?.seed ?? null, dir: path.relative(path.resolve(here, "../out/reference", frame.species.id), dir), sketch: m.sketch.hash, outputs: m.outputs.length });
      }
      writeFileSync(path.resolve(here, "../out/reference", frame.species.id, "index.json"), JSON.stringify(index, null, 1) + "\n");
      writeFileSync(path.resolve(here, "../out/reference", frame.species.id, `species-${frame.species.id}.json`), JSON.stringify(frame, null, 1) + "\n");
      console.log(`${frame.species.id}: reference set of ${members.length} under out/reference/${frame.species.id}/`);
      continue;
    }
    let genome;
    if (opt("digest")) {
      genome = savedGenome(frame.species.id, opt("digest")) ?? genomeByDigest(frame, opt("digest"));
      if (!genome) { console.error(`${frame.species.id}: no genome with digest ${opt("digest")} is saved under out/ or in the first ${REFERENCE_STREAM} reference-set members and ${SEED_STREAM} seeds`); process.exit(1); }
    } else genome = opt("genome") ? JSON.parse(readFileSync(opt("genome"), "utf8")) : opt("seed") ? sampleIndividual(frame, rng(`${frame.species.id}:${opt("seed")}`), { kind: "random", seed: Number(opt("seed")) }) : typeSpecimen(frame);
    const t0 = Date.now();
    const { dir, manifest: m, count } = writeSketch(frame, genome, { verify: flag("verify"), cameras: cameras ?? speciesCameras(frame) });
    console.log(`${frame.species.id}: ${count} images, genome ${m.genomeDigest} (sha256 ${m.genomeSha256.slice(0, 12)}), sketch ${m.sketch.hash.slice(0, 12)}${m.outputs.some((o) => o.clipped) ? ", some views clipped" : ""} → ${path.relative(process.cwd(), dir)} (${((Date.now() - t0) / 1000).toFixed(1)} s${flag("verify") ? ", verified byte-identical" : ""})`);
  }
}
