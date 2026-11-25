// paths-gen-build-2: the 20-seed rule. usage: node tips2.mjs <seed> [<seed> ...]
// A tip of sand = the end of a road component of a place: a tile where the distance over the road from the place's ports is greatest locally (clusters of ties are one tip), not on a port. A component touching
// no port is a loose piece (counted apart, not a tip: it is not an 'end', fragments are not fixed here). A tip is fine when it lies within one tile of a keepers' place's yard, within one tile of a bridge or ford,
// or on a port of the place's edge (within 1 tile of the frame's edge). Prints a line a seed and a total with the failures by cause.
import { cellTerrain, TV, CW, CH } from '../../src/gen7/place.mjs';
import { planOf } from '../../src/gen7/places.mjs';
import { realm7 } from '../../src/gen7/region.mjs';
import { RW } from '../../src/gen7/world.mjs';
import { MW, MH } from '../../src/world.mjs';
import { CENTER } from '../../src/regions.mjs';
import { keeperKinds } from '../../src/gen7/keepers.mjs';
const seeds = process.argv.slice(2).map(Number), [ax, ay] = CENTER;
const tot = { seeds: seeds.length, places: 0, tips: 0, atYard: 0, atCrossing: 0, atPort: 0, bad: 0, loose: 0, keepersSeated: 0, keepersWanted: 0, bad_noKeeper_realmEnd: 0, bad_wantedNotSeated: 0, bad_other: 0 };
const isPath = (c, k) => c.terrain[k] === TV.PATH || c.top[k] === TV.PATHTOP;
for (const seed of seeds) {
  const R = realm7(seed), re = R.realm, ends = new Set(re.roads.ends), kinds = keeperKinds(seed), row = { seed, tips: 0, bad: 0, loose: 0 };
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const X = ax * MW + x, Y = ay * MH + y, wc = Y * RW + X; if (re.land[wc] === 4) continue;
    const c = cellTerrain(seed, X, Y), W = c.w, comp = new Int32Array(W * c.h), want = kinds.get(X + ',' + Y), plan = planOf(seed, X, Y);
    if (want) { tot.keepersWanted++; if (plan && plan.keepers) tot.keepersSeated++; }
    const near = (i, j, pred) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (pred(i + dx, j + dy)) return true; return false; };
    let nc = 0;
    for (let j = 1; j <= CH; j++) for (let i = 1; i <= CW; i++) {
      const k = j * W + i; if (comp[k] || !isPath(c, k)) continue;
      nc++; const tiles = [k], dist = new Map(); comp[k] = nc;
      for (let q = 0; q < tiles.length; q++) for (const n of [tiles[q] - 1, tiles[q] + 1, tiles[q] - W, tiles[q] + W]) { const ni = n % W, nj = (n / W) | 0; if (ni < 1 || ni > CW || nj < 1 || nj > CH || comp[n] || !isPath(c, n)) continue; comp[n] = nc; tiles.push(n); }
      const onEdge = t => { const ti = t % W, tj = (t / W) | 0; return ti <= 1 || ti >= CW || tj <= 1 || tj >= CH; };
      const ports = tiles.filter(onEdge);
      if (!ports.length) { row.loose++; tot.loose++; continue; }
      const q = [...ports]; for (const p of ports) dist.set(p, 0);
      for (let h = 0; h < q.length; h++) for (const n of [q[h] - 1, q[h] + 1, q[h] - W, q[h] + W]) if (comp[n] === nc && !dist.has(n)) { dist.set(n, dist.get(q[h]) + 1); q.push(n); }
      const maxima = tiles.filter(t => { const d = dist.get(t); if (!(d > 1)) return false; return [t - 1, t + 1, t - W, t + W].every(n => !(dist.get(n) > d)); });
      const seen = new Set();
      for (const m of maxima) {   // a cluster of tied maxima is one tip
        if (seen.has(m)) continue; const st = [m]; seen.add(m); for (let h = 0; h < st.length; h++) for (const n of [st[h] - 1, st[h] + 1, st[h] - W, st[h] + W]) if (maxima.includes(n) && !seen.has(n)) { seen.add(n); st.push(n); }
        { const cx = Math.round(st.reduce((s, t) => s + (t % W), 0) / st.length), cy = Math.round(st.reduce((s, t) => s + ((t / W) | 0), 0) / st.length); let n7 = 0;
          for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (cx + dx >= 0 && cy + dy >= 0 && cx + dx < W && cy + dy < c.h && comp[(cy + dy) * W + cx + dx] === nc) n7++;
          if (n7 > 10 || dist.get(st[0]) < 4) continue; }   // a tip is a leaf of the road: a thin end, not a wobble of a bend
        row.tips++; tot.tips++;
        const how = (() => { for (const t of st) { const ti = t % W, tj = (t / W) | 0; for (const kk of plan ? [plan.keepers, ...(plan.rests || []), ...plan.spots] : []) { if (!kk) continue; const y0 = kk.yard || kk; if (ti >= y0.x - 1 && ti <= y0.x + y0.w && tj >= y0.y - 1 && tj <= y0.y + y0.h) return 'yard'; } }
          for (const t of st) if (near(t % W, (t / W) | 0, (a, b) => { const v = c.terrain[b * W + a]; return v === TV.FORD || v === TV.BRIDGE; })) return 'crossing';
          for (const t of st) { const ti = t % W, tj = (t / W) | 0; if (ti <= 3 || ti >= CW - 2 || tj <= 3 || tj >= CH - 2) return 'port'; }
          return null; })();
        if (how === 'yard') tot.atYard++; else if (how === 'crossing') tot.atCrossing++; else if (how === 'port') tot.atPort++;
        else { row.bad++; tot.bad++; if (process.env.TIPS_DEBUG) console.log('bad', seed, X, Y, 'tip', (st[0] % W), ((st[0] / W) | 0), 'realmEnd', ends.has(wc), 'want', want, 'seated', !!(plan && plan.keepers), plan && plan.keepersWhy, plan && plan.keepers ? JSON.stringify(plan.keepers.yard) : ''); if (ends.has(wc) && !want) tot.bad_noKeeper_realmEnd++; else if (want && !(plan && plan.keepers)) tot.bad_wantedNotSeated++; else tot.bad_other++; }
      }
    }
  }
  console.log(JSON.stringify(row));
}
console.log(JSON.stringify(tot));
