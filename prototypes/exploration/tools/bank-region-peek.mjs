// rupar-banks-slice-2: the region lists of a seed, printed (one line a region with banks) and the time each takes cold
import { realm7 } from '../src/gen7/region.mjs';
import * as N from '../src/gen7/levels.mjs';
for (const seed of process.argv.slice(2).map(Number)) {
  const R = realm7(seed).realm, L = N.levelsOf({ ...R }); const out = [];
  for (let rb = 0; rb < 5; rb++) for (let ra = 0; ra < 5; ra++) { const t = Date.now(), l = N.regionBanks(L, ra, rb); out.push(`${ra},${rb}:${l.length}:${Date.now() - t}ms ${l.map(b => b.x0 + '/' + b.lip).join(' ')}`); }
  console.log(seed, R.seed, out.join(' | '));
}
