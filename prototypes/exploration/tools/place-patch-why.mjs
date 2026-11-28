// place-walk-1: why a bed heart has no patch: the ground under the footprint of each, over the hashed sample (as place-patch-stats.mjs).
//   node place-patch-why.mjs <cells a seed> <seed> ...
import { realm7 } from '../src/gen7/region.mjs';
import { cellIR, cellTerrain, TV } from '../src/gen7/place.mjs';
import { planOf } from '../src/gen7/places.mjs';
import { hash, L, MW, MH } from '../src/logic/world.mjs';
import { ATLAS } from '../src/regions.mjs';

const [per, ...seedArgs] = process.argv.slice(2), N = Number(per || 64), seeds = seedArgs.map(Number), names = Object.fromEntries(Object.entries(TV).map(([k, v]) => [v, k.toLowerCase()]));
const why = {};
for (const seed of seeds) {
  const R = realm7(seed), cells = [];
  for (let Y = 0; Y < MH * ATLAS; Y++) for (let X = 0; X < MW * ATLAS; X++) { const G = R.regions[Math.floor(Y / MH) * ATLAS + Math.floor(X / MW)], c = (Y % MH) * MW + (X % MW); if (G.land[c] !== L.WATER && !G.island[c]) cells.push([X, Y, G.biome, G.land[c]]); }
  const pick = cells.map(c => ({ c, k: hash(seed, 'places-check', c[0], c[1]) })).sort((a, b) => a.k - b.k).slice(0, N).map(o => o.c);
  for (const [X, Y, biome] of pick) {
    const ir = cellIR(seed, X, Y), plan = planOf(seed, X, Y), heart = plan && plan.spots.find(s => s.role === 'heart'); if (!heart || heart.kind === 'split-stone-ground') continue;
    const ct = cellTerrain(seed, X, Y), w = ct.w, mix = {};
    for (let y = heart.y; y < heart.y + heart.h; y++) for (let x = heart.x; x < heart.x + heart.w; x++) { const t = ct.terrain[y * w + x], k = t === TV.CLIFF ? 'top-' + (names[ct.top[y * w + x]] || 'grass') : names[t]; mix[k] = (mix[k] || 0) + 1; }
    let patch = 0; for (let i = 0; i < ir.w * ir.h; i++) if ([15, 16].includes(ir.terrain[i]) || (ir.top && [17, 18].includes(ir.top[i]))) patch++;
    const key = (patch ? 'patched' : 'NO patch') + ' ' + biome; const o = (why[key] ||= { n: 0, mix: {} }); o.n++; for (const [k, v] of Object.entries(mix)) o.mix[k] = (o.mix[k] || 0) + v;
  }
}
for (const [k, o] of Object.entries(why).sort()) console.log(k, o.n, JSON.stringify(o.mix));
