// rupar-banks-slice-2: the banks of the region lists beside the base's (src/gen7/levels-old.mjs, a copy of the base's levels.mjs; never committed).
//   node bank-region-equal.mjs <seed> ...   per seed: banks by region lists vs by the old scan, and banksIn of every 2nd cell (both axes) new vs old, with ms
import { realm7 } from '../src/gen7/region.mjs';
import * as N from '../src/gen7/levels.mjs';
import * as O from '../src/gen7/levels-old.mjs';
const key = b => `${b.x0},${b.lip},${b.loose ? 1 : 0},${b.n}`;
for (const seed of process.argv.slice(2).map(Number)) {
  const R = realm7(seed).realm, Ln = N.levelsOf({ ...R }), Lo = O.levelsOf({ ...R });
  for (const [M, L] of [[N, Ln], [O, Lo]]) for (const s of L.stairs.values()) M.findWayup(L, s.X, s.Y, s.port);
  const t0 = Date.now(), perRegion = []; const all = [];
  for (let rb = 0; rb < 5; rb++) for (let ra = 0; ra < 5; ra++) { const t = Date.now(), l = N.regionBanks(Ln, ra, rb); perRegion.push(Date.now() - t); for (const b of l) all.push(key(b)); }
  const tNew = Date.now() - t0, old = []; const t1 = Date.now();
  for (const p of O.bankScan(Lo)) { if (p.big || p.n < O.BANK_PART) continue; const b = O.partBank(Lo, p); if (b) old.push(key(b)); }
  const a = new Set(all), b = new Set(old);
  console.log(seed, 'regions: banks', a.size, 'old scan', b.size, 'only new', [...a].filter(x => !b.has(x)).join(' ') || '-', 'only old', [...b].filter(x => !a.has(x)).join(' ') || '-', 'ms new', tNew, 'old', Date.now() - t1, 'per region', perRegion.join(','));
  let cmp = 0, bad = [];
  for (let Y = 0; Y < 100; Y += 2) for (let X = 0; X < 80; X += 2) { const u = N.banksIn(Ln, X, Y).map(key), v = O.banksIn(Lo, X, Y).map(key); cmp++; const sv = new Set(v);
    // the old list holds banks whose part touches the window, the new the banks whose site corner lies in it: equal where the site lies whole in the window (what a window uses)
    const WR = 2, gx0 = (X - WR) * 24, gy0 = (Y - WR) * 28, inside = x => { const [x0, lip] = x.split(',').map(Number); const lx = x0 - gx0, ly = lip - gy0; return lx >= 1 && lx + 6 < 5 * 24 && ly - 4 >= 1 && ly + 5 < 5 * 28 - 1; };
    const fu = u.filter(inside).sort().join(' '), fv = v.filter(inside).sort().join(' '); if (fu !== fv) bad.push(`${X},${Y}`); }
  console.log(seed, 'windows compared', cmp, 'banksIn differ (sites whole in the window)', bad.length, bad.slice(0, 8).join(' '));
}
