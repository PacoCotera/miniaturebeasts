// Generator 7, the map and the walk: for every land label of the map (L.MEADOW, POND, ROCK, WOOD, WATER) the share of each ground in its cells, over the given seeds, as percent of the tiles
// (all tiles: raised land counts as cliff). Used while tuning art/places/map-rules.json `ground` and by the test that the map's land and the walk's ground agree.
//   node tools/gen7-label-shares.mjs 7 13 42
import { cellTerrain, TV, CW, CH } from '../src/gen7/place.mjs';
import { genRegion7 } from '../src/gen7/region.mjs';
import { ATLAS } from '../src/regions.mjs';
import { MW, MH, L } from '../src/world.mjs';

const LN = Object.fromEntries(Object.entries(L).map(([k, v]) => [v, k.toLowerCase()]));
const TN = Object.fromEntries(Object.entries(TV).map(([k, v]) => [v, k.toLowerCase()]));

// the ground shares of one cell (percent of its own 24 x 28 tiles, by terrain name)
export function cellShares(seed, X, Y) {
  const c = cellTerrain(seed, X, Y), w = c.w, n = {};
  for (let y = 1; y <= CH; y++) for (let x = 1; x <= CW; x++) { const k = TN[c.terrain[y * w + x]]; n[k] = (n[k] || 0) + 1; }
  for (const k of Object.keys(n)) n[k] = +(100 * n[k] / (CW * CH)).toFixed(1);
  return n;
}
export function byLabel(seeds) {
  const out = {};
  for (const seed of seeds) for (let ay = 0; ay < ATLAS; ay++) for (let ax = 0; ax < ATLAS; ax++) {
    const G = genRegion7(seed, ax, ay);
    for (let c = 0; c < MW * MH; c++) {
      const lab = LN[G.land[c]], o = out[lab] || (out[lab] = { cells: 0, sum: {} }), s = cellShares(seed, ax * MW + (c % MW), ay * MH + ((c / MW) | 0));
      o.cells++; for (const [k, v] of Object.entries(s)) o.sum[k] = (o.sum[k] || 0) + v;
    }
  }
  for (const o of Object.values(out)) { o.mean = {}; for (const [k, v] of Object.entries(o.sum)) o.mean[k] = +(v / o.cells).toFixed(1); delete o.sum; }
  return out;
}
if (process.argv[2] && /gen7-label-shares/.test(process.argv[1])) console.log(JSON.stringify(byLabel(process.argv.slice(2).map(Number)), null, 1));
