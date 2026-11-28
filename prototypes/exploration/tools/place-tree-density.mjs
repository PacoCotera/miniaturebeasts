// place-walk-1: props per 100 tiles by biome against the table (the sampling of gen7-decor-props.mjs, alone), for any checkout.
//   node place-tree-density.mjs <treeRoot> <seed> [samplesPerRegion]      (treeRoot: the checkout whose modules are read)
import { pathToFileURL } from 'node:url';
const [root, seedArg, nArg] = process.argv.slice(2), seed = +seedArg, SAMPLES = +(nArg || 40000);
const M = n => import(pathToFileURL(root + '/prototypes/exploration/src/gen7/' + n).href);
const { decorOf, biomeAtTile, CW, CH, RW, RH } = await M('place.mjs'), { TABLE, FAMS, expectedPer100 } = await M('decor.mjs');
const { MW, MH } = await import(pathToFileURL(root + '/prototypes/exploration/src/logic/world.mjs').href);
const U32 = (seed, n, k) => { let h = Math.imul(seed ^ 0x9e3779b9, 2654435761) ^ Math.imul(n + 1, 40503) ^ Math.imul(k, 2246822519); h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; return h >>> 0; };
const D = decorOf(seed), cnt = {};
for (let ay = 0; ay < RH / MH; ay++) for (let ax = 0; ax < RW / MW; ax++) {
  const gx0 = ax * MW * CW + 24, gy0 = ay * MH * CH + 24, gx1 = (ax + 1) * MW * CW - 25, gy1 = (ay + 1) * MH * CH - 25, b = biomeAtTile(seed, gx0 + 20, gy0 + 20), c = (cnt[b] ||= { tiles: 0, el: [0, 0, 0, 0, 0], got: [0, 0, 0, 0, 0] });
  for (let n = 0; n < SAMPLES; n++) {
    const x = gx0 + (U32(seed, n + ax * 100000, 11 + ay) % (gx1 - gx0 + 1)), y = gy0 + (U32(seed, n + ay * 100000, 97 + ax) % (gy1 - gy0 + 1));
    c.tiles++;
    for (let fi = 0; fi < 5; fi++) { if (!TABLE[b][FAMS[fi]]) continue; if (D.free(fi, x, y)) { c.el[fi]++; if (D.memberOf(fi, x, y)) c.got[fi]++; } }
  }
}
const out = {}; for (const [b, c] of Object.entries(cnt)) { out[b] = {}; FAMS.forEach((f, fi) => { if (!TABLE[b][f]) return; out[b][f] = { per100: +(100 * c.got[fi] / Math.max(1, c.el[fi])).toFixed(2), table: +expectedPer100(b, f).toFixed(2), tiles: c.el[fi] }; }); }
console.log(JSON.stringify({ seed, root, perBiome: out }));
