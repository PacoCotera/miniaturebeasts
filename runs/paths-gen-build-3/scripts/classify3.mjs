// usage: node classify3.mjs <tips3 output files...>  -> kinds of the remaining misses
import { readFileSync } from 'node:fs';
import { planOf } from '../../src/gen7/places.mjs';
import { cellTerrain, TV } from '../../src/gen7/place.mjs';
const lines = process.argv.slice(2).flatMap(f => readFileSync(f, 'utf8').split('\n')).filter(l => l.startsWith('bad '));
const kinds = {}, ex = {};
for (const l of lines) {
  const m = l.split(' '), seed = +m[1], X = +m[2], Y = +m[3], tx = +m[5], ty = +m[6];
  const c = cellTerrain(seed, X, Y), W = c.w, p = planOf(seed, X, Y);
  let nTop = 0, nPath = 0, edge = Math.min(tx - 1, ty - 1, 24 - tx, 28 - ty);
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const k = (ty + dy) * W + tx + dx; if (c.top[k] === TV.PATHTOP) nTop++; if (c.terrain[k] === TV.PATH) nPath++; }
  const left = (p.restsLeft || []).find(r => Math.abs(r[0] - tx) <= 2 && Math.abs(r[1] - ty) <= 2);
  let k; const got = (p.rests || []).concat(p.keepers ? [p.keepers] : []).some(r => tx >= r.yard.x - 1 && tx <= r.yard.x + r.yard.w && ty >= r.yard.y - 1 && ty <= r.yard.y + r.yard.h);
  if (got) k = 'RESOLVED by a rest' + (nTop > 0 ? ' (cliff top)' : '');
  else if (left) k = (nTop > 0 && nPath <= nTop ? 'cliff-top road, ' : 'ground road, ') + 'no room for a 3x3 box beside the tip (' + left[2] + ')';
  else if (nTop > 0 && nPath <= nTop) k = 'cliff-top road, tip not listed by the plan';
  else if (nTop > 0) k = 'mixed top';
  else k = 'tip the plan does not list (plan sees a different shape)';
  kinds[k] = (kinds[k] || 0) + 1; (ex[k] = ex[k] || []).push(`${seed}:${X},${Y}@${tx},${ty}`);
}
console.log(JSON.stringify(kinds, null, 1)); console.log(JSON.stringify(ex).slice(0, 1500));
