// Runs the views audit (tools/views-audit.mjs) over a range of seeds.
//   node prototypes/exploration/tools/views-audit-run.mjs [seedFrom seedTo] [--gens 7,2,5] [--every]   (--every: every biome on every seed for the frozen generated generators; default one biome per seed, in turn)
// Generator 7 builds one realm a seed (about 10 s) and reads every land cell's IR (35 ms each): a sweep of seeds 1-200 takes an hour on one core, so run it in shards (1 50, 51 100, ...).
import { genWorld, genPlace, softGround, bankEdges, ALL_BIOMES } from "../src/world.mjs";
import { realm7 } from "../src/gen7/region.mjs";
import { cellIR } from "../src/gen7/place.mjs";
import { ATLAS } from "../src/regions.mjs";
import { newTally, auditGen7, auditGenerated, setGenPlace, report } from "./views-audit.mjs";

const args = process.argv.slice(2), flag = n => args.includes(n), val = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const nums = args.filter(a => /^\d+$/.test(a)).map(Number), from = nums[0] ?? 1, to = nums[1] ?? 200;
const gens = (val("--gens") || "7").split(",").map(Number), every = flag("--every");
setGenPlace((G, seed, c) => genPlace(G, seed, String(c)));
for (const gen of gens) {
  const t = newTally();
  for (let seed = from; seed <= to; seed++) {
    if (gen === 7) { auditGen7(seed, t, { realm7, cellIR, softGround, bankEdges, ATLAS }); continue; }
    const biomes = every ? ALL_BIOMES : [ALL_BIOMES[seed % ALL_BIOMES.length]];
    for (const biome of biomes) { const G = genWorld(seed, gen, biome); G.soft = softGround(G, seed); G.banks = bankEdges(G, seed); auditGenerated(G, seed, biome, t); }
  }
  console.log(report(t, `generator ${gen}, seeds ${from}-${to}`));
}
