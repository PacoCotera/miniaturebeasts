// Runs the random module's vectors, the generator 7 region vectors and the world maker once, in Node or in a small JavaScript engine, and prints one JSON line.
//   node engine-time.mjs [--seed=7]
//   <small engine> --std engine-time.mjs -- [--seed=7]        (from a copy whose bare imports are rewritten to relative paths: see core-cut-1's report)
// Read-only. The same file runs in both, so the digests can be compared and the times read side by side.
import { mulberry32, seeded24, seedFromText } from "../../core/base/random.mjs";
import { genRegion7, realm7 } from "../src/gen7/region.mjs";

const inQjs = typeof globalThis.scriptArgs !== "undefined";
const args = inQjs ? globalThis.scriptArgs : process.argv;
const SEED = Number((args.find((a) => a.startsWith("--seed=")) ?? "--seed=7").slice(7));
let std = null;
if (inQjs) { try { std = await import("qjs:std"); } catch { std = await import("std"); } }
const now = () => Date.now();
const here = import.meta.url.replace(/^file:\/\//, "").replace(/[^/]*$/, "");
const readText = async (rel) => {
  const p = here + rel;
  if (inQjs) return std.loadFile(p);
  const { readFileSync } = await import("node:fs");
  return readFileSync(p, "utf8");
};

// A running digest of whole numbers (FNV-1a over 32-bit words).
const mix = (h, v) => { h ^= v >>> 0; return Math.imul(h, 16777619) >>> 0; };

// 1. The random module: the draws and every whole-number question, for a list of seeds.
const t0 = now();
let hr = 2166136261;
for (const seed of [1, 7, 13, 42, 4094, 2654435761, seedFromText("S01:viability")]) {
  const m = mulberry32(seed), s = seeded24(seed);
  for (let i = 0; i < 20000; i++) {
    hr = mix(hr, m.next()); hr = mix(hr, s.next());
    hr = mix(hr, m.below(1 + (i % 97))); hr = mix(hr, m.chance(1, 2) ? 1 : 0); hr = mix(hr, m.range(3, 40));
  }
  hr = mix(hr, m.pick([1, 2, 3, 4, 5])); hr = mix(hr, m.shuffle([1, 2, 3, 4, 5, 6, 7, 8]).join("").length);
}
const randomMs = now() - t0;

// 2. The world maker, first so that nothing is cached: one realm, every region (seed SEED).
const t2 = now();
const realm = realm7(SEED);
const realmMs = now() - t2;

// 3. The generator 7 region vectors on file (land, levels, edges, fords of each seed and slot); their seeds not yet made are made here.
const t1 = now();
const file = JSON.parse(await readText("../tests/gen7-vectors.json"));
let checked = 0, same = 0;
for (const key of Object.keys(file)) {
  const [seed, slot] = key.split(":"), [ax, ay] = slot.split(",").map(Number);
  const G = genRegion7(Number(seed), ax, ay), want = file[key];
  const got = { land: Array.from(G.land).join(""), levels: Array.from(G.level).join(""), edges: Array.from(G.edge).join(""), fords: Array.from(G.ford).join("") };
  for (const f of ["land", "levels", "edges", "fords"]) { checked++; if (got[f] === want[f]) same++; }
}
const vectorsMs = now() - t1;


console.log(JSON.stringify({ engine: inQjs ? "small engine" : "node " + process.version, seed: SEED, randomDigest: hr, randomMs, vectorFields: checked, vectorFieldsEqual: same, vectorsMs, realmMs, regions: realm && realm.regions ? realm.regions.length : null }));
