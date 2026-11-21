// Generator 7 soft ground in the places (tuliko-soft-7-1): per seed, the soft cells and edges softGround names, and how many of them the places lay tiles for (ir.soft: mud, scree),
// regions with a Tuliko gate (at least one laid tile), and the tiles laid.
// node tools/gen7-soft-sweep.mjs [seed ...]   (default 7 13 42)
import { MW, MH, softGround } from '../src/world.mjs';
import { genRegion7 } from '../src/gen7/region.mjs';
import { cellIR } from '../src/gen7/place.mjs';

const ATLAS = 5;
const seeds = process.argv.slice(2).map(Number); if (!seeds.length) seeds.push(7, 13, 42);
for (const seed of seeds) {
  let wadeCells = 0, wadeLaid = 0, wadeTiles = 0, screeEdges = 0, screeLaid = 0, screeTiles = 0, regions = 0, gated = 0;
  for (let ay = 0; ay < ATLAS; ay++) for (let ax = 0; ax < ATLAS; ax++) {
    const G = genRegion7(seed, ax, ay), sg = softGround(G, seed); regions++; let here = 0;
    for (let c = 0; c < MW * MH; c++) if (sg.wade[c]) { wadeCells++; const ir = cellIR(seed, ax * MW + (c % MW), ay * MH + ((c / MW) | 0)); const n = ir.soft ? ir.soft.wade.length : 0; if (n) { wadeLaid++; wadeTiles += n; here++; } }
    for (let i = 0; i < 2 * MW * MH; i++) if (sg.scree[i]) { screeEdges++;
      const a = i >> 1, b = i & 1 ? a + MW : a + 1; let n = 0;
      for (const q of [a, b]) { const ir = cellIR(seed, ax * MW + (q % MW), ay * MH + ((q / MW) | 0)); n = Math.max(n, ir.soft && ir.soft.scree ? ir.soft.scree.filter(s => s.ei === i).length * 2 : 0); }
      if (n) { screeLaid++; screeTiles += n; here++; } }
    if (here) gated++;
  }
  console.log(`seed ${seed}: ${regions} regions; mud cells ${wadeCells}, laid ${wadeLaid} (${wadeTiles} tiles); scree edges ${screeEdges}, laid ${screeLaid} (${screeTiles} tiles); regions with a Tuliko gate ${gated}/${regions}`);
}
