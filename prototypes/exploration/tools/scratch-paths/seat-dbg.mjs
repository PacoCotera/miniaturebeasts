// usage: node seat-dbg.mjs <seed> -> ascii of the first few no-room places: terrain, spine (s), solid (#), path (=)
import { planOf } from '../../src/gen7/places.mjs';
import { cellTerrain } from '../../src/gen7/place.mjs';
import { keeperKinds } from '../../src/gen7/keepers.mjs';
import { MW, MH } from '../../src/world.mjs';
import { CENTER } from '../../src/regions.mjs';
const [ax, ay] = CENTER, seed = +process.argv[2]; let shown = 0;
for (const [k, kind] of keeperKinds(seed)) {
  const [X, Y] = k.split(',').map(Number); if (Math.floor(X / MW) !== ax || Math.floor(Y / MH) !== ay) continue;
  const p = planOf(seed, X, Y); if (!p || p.keepers || p.keepersWhy !== 'no-room' || shown++ > 1) continue;
  const c = cellTerrain(seed, X, Y), w = p.w; console.log(kind, X, Y);
  for (let y = 0; y < p.h; y++) { let s = ''; for (let x = 0; x < w; x++) { const i = y * w + x, t = c.terrain[i]; s += t === 5 ? '=' : p.spine[i] ? 's' : p.solid[i] ? '#' : p.spots.some(q => x >= q.x - 1 && x < q.x + q.w + 1 && y >= q.y - 1 && y < q.y + q.h + 1) ? 'o' : t === 6 ? '.' : t === 3 ? 'z' : String.fromCharCode(97 + t % 26); } console.log(s); }
}
