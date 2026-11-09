// Runs the views audit (tools/views-audit.mjs) over a range of seeds.
//   node prototypes/exploration/tools/views-audit-run.mjs [seedFrom seedTo] [--gens 6,2,5] [--every]   (--every: every biome on every seed; default one biome per seed, in turn)
import { makePage } from "../tests/page-harness.mjs";
import { genWorld, genPlace, softGround, bankEdges, ALL_BIOMES } from "../src/world.mjs";
import { newTally, auditPage, auditGenerated, setGenPlace, report } from "./views-audit.mjs";

const args = process.argv.slice(2), flag = n => args.includes(n), val = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const nums = args.filter(a => /^\d+$/.test(a)).map(Number), from = nums[0] ?? 1, to = nums[1] ?? 200;
const gens = (val("--gens") || "6,2").split(",").map(Number), every = flag("--every");
setGenPlace((G, seed, c) => genPlace(G, seed, String(c)));
for (const gen of gens) {
  const t = newTally(), page = gen === 6 ? makePage({ gen: 6, console: "silent" }) : null;
  for (let seed = from; seed <= to; seed++) {
    const biomes = every ? ALL_BIOMES : [ALL_BIOMES[seed % ALL_BIOMES.length]];
    for (const biome of biomes) {
      if (gen === 6) auditPage(page, seed, biome, t);
      else { const G = genWorld(seed, gen, biome); G.soft = softGround(G, seed); G.banks = bankEdges(G, seed); auditGenerated(G, seed, biome, t); }
    }
  }
  console.log(report(t, `generator ${gen}, seeds ${from}-${to}`));
}
