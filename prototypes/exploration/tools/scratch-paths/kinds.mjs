// usage: node kinds.mjs <seed>...  -> counts of keepers' places by kind (home region) and realm-wide
import { keeperKinds } from '../../src/gen7/keepers.mjs';
import { MW, MH } from '../../src/world.mjs';
import { CENTER } from '../../src/regions.mjs';
const [ax, ay] = CENTER;
for (const seed of process.argv.slice(2).map(Number)) {
  const m = keeperKinds(seed), home = {}, all = {};
  for (const [k, v] of m) { all[v] = (all[v] || 0) + 1; const [X, Y] = k.split(',').map(Number); if (Math.floor(X / MW) === ax && Math.floor(Y / MH) === ay) home[v] = (home[v] || 0) + 1; }
  console.log(JSON.stringify({ seed, home, all }));
}
