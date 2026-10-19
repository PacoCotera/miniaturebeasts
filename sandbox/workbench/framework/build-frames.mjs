#!/usr/bin/env node
// Builds the frame registry: one JSON file per species under prototypes/workbench/frames/, each
// checked by 200 random individuals (frames.py's check, rule 6 of taxonomy §3: a trait whose
// individuals do not all build is locked for the species, or the seed moves on; a gene is never
// repaired).
//
//   node prototypes/workbench/framework/build-frames.mjs            # write
//   node prototypes/workbench/framework/build-frames.mjs --check    # fail if a file is stale
//   FRAME_SAMPLES=50 node ... for a quicker run
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SPECIES, specOf } from "./roster.mjs";
import { buildFrame } from "./species.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, "../frames");
const check = process.argv.includes("--check");
const samples = Number(process.env.FRAME_SAMPLES ?? 200);
mkdirSync(out, { recursive: true });

export function buildRegistry({ log = () => {} } = {}) {
  const frames = [];
  for (const species of SPECIES) {
    let spec = specOf(species);
    const rejected = [];
    let frame = null;
    for (let attempt = 0; attempt < 40 && !frame; attempt++) {
      try { frame = buildFrame(spec, { samples }); }
      catch (err) {
        const why = err.message;
        rejected.push({ seed: spec.seed, locked: spec.lockTraits ?? [], why: why.slice(0, 200) });
        if (process.env.FRAME_VERBOSE) log(`  ${species.id} seed ${spec.seed} [${(spec.lockTraits ?? []).join(",")}]: ${why.slice(0, 160)}`);
        if (spec.open) throw err; // authored frames are not re-rolled
        const culprit = [["eyes", "eye"], ["head", "eye"], ["snout", "muzzle"], ["feet", "terminal"]].find(([t, w]) => why.includes(w) && !(spec.lockTraits ?? []).includes(t));
        spec = culprit ? { ...spec, lockTraits: [...(spec.lockTraits ?? []), culprit[0]] } : { ...spec, seed: spec.seed + 1, lockTraits: [] };
      }
    }
    if (!frame) throw new Error(`${species.id}: no seed builds (${rejected.at(-1)?.why})`);
    frame.taxonomy.seed = spec.seed; frame.taxonomy.lockedByCheck = spec.lockTraits ?? []; frame.taxonomy.attemptsRejected = rejected;
    frames.push(frame);
    const c = frame.counts;
    log(`${frame.species.name.padEnd(9)} ${frame.plan.code.padEnd(14)} ${frame.plan.rig.padEnd(5)} carried ${String(c.carried).padStart(3)} (trunk ${c.trunk}, branch ${c.branch}) open ${String(c.open).padStart(2)} in ${String(c.traits).padStart(2)} traits · absent ${c.absent} · viable ${frame.viability.constructed}/${frame.viability.sampled}${rejected.length ? ` · ${rejected.length} seeds/locks skipped` : ""}`);
  }
  return frames;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const frames = buildRegistry({ log: console.log });
  const index = { schema: "mb-frame-registry/1", catalogue: frames[0].catalogue, species: frames.map((f) => ({ id: f.species.id, name: f.species.name, clan: f.taxonomy.clan, plan: f.plan.code, rig: f.plan.rig, tier: f.taxonomy.tier, file: `species-${f.species.id}.json`, open: f.counts.open, traits: f.counts.traits, carried: f.counts.carried })) };
  const files = [["index.json", JSON.stringify(index, null, 1) + "\n"], ...frames.map((f) => [`species-${f.species.id}.json`, JSON.stringify(f, null, 1) + "\n"])];
  let stale = 0;
  for (const [name, text] of files) {
    const p = path.join(out, name);
    if (check) { if (!existsSync(p) || readFileSync(p, "utf8") !== text) { console.error(`${name} is stale: run build-frames.mjs`); stale++; } }
    else writeFileSync(p, text);
  }
  if (check && stale) process.exit(1);
  console.log(check ? "ok" : `written ${files.length} files to ${path.relative(process.cwd(), out)}`);
}
