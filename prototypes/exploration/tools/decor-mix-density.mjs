// decor-mix-1: only the per-biome tree density of gen7-decor-props.mjs (the last block), one seed, fast: node decor-mix-density.mjs <seed> [fam]
// PW_* env switches (see decor.mjs) turn single place-walk-2 changes off for the halving.
import { decorOf, biomeAtTile, CW, CH, RW, RH } from '../src/gen7/place.mjs';
import { TABLE, FAMS, expectedPer100 } from '../src/gen7/decor.mjs';
import { MW, MH } from '../src/world.mjs';

const seed = +process.argv[2], only = process.argv[3] || 'trees';
const SAMPLES = 40000;
const U32 = (seed, n, k) => { let h = Math.imul(seed ^ 0x9e3779b9, 2654435761) ^ Math.imul(n + 1, 40503) ^ Math.imul(k, 2246822519); h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; return h >>> 0; };
const D = decorOf(seed), cnt = {};
for (let ay = 0; ay < RH / MH; ay++) for (let ax = 0; ax < RW / MW; ax++) {
  const gx0 = ax * MW * CW + 24, gy0 = ay * MH * CH + 24, gx1 = (ax + 1) * MW * CW - 25, gy1 = (ay + 1) * MH * CH - 25, b = biomeAtTile(seed, gx0 + 20, gy0 + 20), c = (cnt[b] ||= { el: [0, 0, 0, 0, 0], got: [0, 0, 0, 0, 0] });
  for (let n = 0; n < SAMPLES; n++) {
    const x = gx0 + (U32(seed, n + ax * 100000, 11 + ay) % (gx1 - gx0 + 1)), y = gy0 + (U32(seed, n + ay * 100000, 97 + ax) % (gy1 - gy0 + 1));
    for (let fi = 0; fi < 5; fi++) { if (!TABLE[b][FAMS[fi]] || FAMS[fi] !== only) continue; if (D.free(fi, x, y)) { c.el[fi]++; if (D.memberOf(fi, x, y)) c.got[fi]++; } }
  }
}
const out = {}; for (const [b, c] of Object.entries(cnt)) { const fi = FAMS.indexOf(only); if (!TABLE[b][only]) continue; out[b] = { per100: +(100 * c.got[fi] / Math.max(1, c.el[fi])).toFixed(2), table: +expectedPer100(b, only).toFixed(2), tiles: c.el[fi] }; }
console.log(JSON.stringify({ seed, env: Object.keys(process.env).filter(k => k.startsWith('PW_')).join(','), [only]: out }));
