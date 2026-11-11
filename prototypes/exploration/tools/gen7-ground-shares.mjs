// Generator 7, the biome ground (V2): the share of each ground in every biome's cells over the given seeds, on the low ground (raised land is left out), as percent of the tiles.
//   node tools/gen7-ground-shares.mjs 7 13 42
// Used while tuning art/places/map-rules.json `ground`; the property test reads groundShares() too.
import { cellTerrain, TV, biomeAtTile, CW, CH, RW, RH } from '../src/gen7/place.mjs';

export const NAMES = Object.fromEntries(Object.entries(TV).map(([k, v]) => [v, k.toLowerCase()]));

// { biome: { cells, low, share: { grass: %, ... } } }; cells of the biome's slot (the edges between slots are within BLEND tiles of each other and are left out when `inner` is set)
export function groundShares(seeds, inner = true) {
  const out = {};
  for (const seed of seeds) for (let Y = 0; Y < RH; Y++) for (let X = 0; X < RW; X++) {
    const b = biomeAtTile(seed, X * CW + CW / 2, Y * CH + CH / 2);
    if (inner && (biomeAtTile(seed, X * CW - 8, Y * CH + CH / 2) !== b || biomeAtTile(seed, X * CW + CW + 8, Y * CH + CH / 2) !== b || biomeAtTile(seed, X * CW + CW / 2, Y * CH - 8) !== b || biomeAtTile(seed, X * CW + CW / 2, Y * CH + CH + 8) !== b)) continue;
    const o = out[b] || (out[b] = { cells: 0, low: 0, n: {} }), c = cellTerrain(seed, X, Y), w = c.w;
    o.cells++;
    for (let y = 1; y <= CH; y++) for (let x = 1; x <= CW; x++) { const v = c.terrain[y * w + x]; if (v === TV.CLIFF) continue; o.low++; o.n[v] = (o.n[v] || 0) + 1; }
  }
  for (const o of Object.values(out)) { o.share = {}; for (const [v, n] of Object.entries(o.n)) o.share[NAMES[v]] = +(100 * n / o.low).toFixed(1); delete o.n; }
  return out;
}
if (process.argv[2] && /gen7-ground-shares/.test(process.argv[1])) console.log(JSON.stringify(groundShares(process.argv.slice(2).map(Number)), null, 1));
