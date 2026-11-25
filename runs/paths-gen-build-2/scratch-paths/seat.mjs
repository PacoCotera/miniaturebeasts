// usage: node seat.mjs <seed>... -> per seed: keepers' places by kind, seated, and why not (home region)
import { planOf } from '../../src/gen7/places.mjs';
import { keeperKinds } from '../../src/gen7/keepers.mjs';
import { MW, MH } from '../../src/world.mjs';
import { CENTER } from '../../src/regions.mjs';
const [ax, ay] = CENTER, tot = { want: 0, seated: 0 };
for (const seed of process.argv.slice(2).map(Number)) {
  const row = { seed, want: 0, seated: 0, why: {}, kinds: {} };
  for (const [k, kind] of keeperKinds(seed)) {
    const [X, Y] = k.split(',').map(Number); if (Math.floor(X / MW) !== ax || Math.floor(Y / MH) !== ay) continue;
    row.want++; const p = planOf(seed, X, Y);
    if (p && p.keepers) { row.seated++; row.kinds[kind] = (row.kinds[kind] || 0) + 1; } else { const w = p ? p.keepersWhy || 'none' : 'noplan'; row.why[w] = (row.why[w] || 0) + 1; }
  }
  tot.want += row.want; tot.seated += row.seated; console.log(JSON.stringify(row));
}
console.log(JSON.stringify(tot));
