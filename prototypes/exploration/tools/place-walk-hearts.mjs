// place-walk-2: world tiles of bed hearts that carry a patch on a given ground (for stills).
//   node place-walk-hearts.mjs <treeRoot> <seed> <ground: turf|litter|drygrass|grass> <count>
import { pathToFileURL } from 'node:url';

const [root, seedArg, ground, cnt] = process.argv.slice(2), seed = +seedArg, WANT = { grass: 6, litter: 11, drygrass: 12, turf: 13 }[ground], N = +(cnt || 2);
const M = n => import(pathToFileURL(root + '/prototypes/exploration/src/' + n).href);
const { realm7 } = await M('gen7/region.mjs'), { cellTerrain, cellIR, TV } = await M('gen7/place.mjs'), { planOf } = await M('gen7/places.mjs'), { hash, L, MW, MH } = await M('world.mjs'), { ATLAS } = await M('regions.mjs');
const R = realm7(seed), cells = [];
for (let Y = 0; Y < MH * ATLAS; Y++) for (let X = 0; X < MW * ATLAS; X++) { const G = R.regions[Math.floor(Y / MH) * ATLAS + Math.floor(X / MW)], c = (Y % MH) * MW + (X % MW); if (G.land[c] !== L.WATER && !G.island[c]) cells.push([X, Y]); }
const pick = cells.map(c => ({ c, k: hash(seed, 'places-check', c[0], c[1]) })).sort((a, b) => a.k - b.k).map(o => o.c);
let found = 0;
for (const [X, Y] of pick) {
  const plan = planOf(seed, X, Y), heart = plan && plan.spots.find(s => s.role === 'heart' && /bed/.test(s.kind)); if (!heart) continue;
  const ct = cellTerrain(seed, X, Y), w = ct.w, cx = heart.x + (heart.w >> 1), cy = heart.y + (heart.h >> 1), i = cy * w + cx;
  if (ct.terrain[i] !== WANT) continue;   // the ground under the heart before the patch (cellTerrain is the unpatched ground)
  const ir = cellIR(seed, X, Y); let patch = 0; for (let k = 0; k < ir.w * ir.h; k++) if (ir.terrain[k] === 15) patch++;
  if (patch < 6) continue;
  console.log(`${seed} ${ct.x0 + cx},${ct.y0 + cy} cell ${X},${Y} patch ${patch}`); if (++found >= N) break;
}
