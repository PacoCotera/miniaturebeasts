// scratch: tile digests of a list of places, for checking that a speed-up changes no tile: node dbg-place-digests.mjs > file (run before and after, diff the files)
import { realm7 } from '../src/gen7/region.mjs';
import { cellTerrain } from '../src/gen7/place.mjs';
import { placeDigest } from '../src/gen7/slices.mjs';
const seeds = (process.argv[2] || '1,7,13').split(',').map(Number), per = +(process.argv[3] || 40);
for (const seed of seeds) {
  const R = realm7(seed), stairs = R.realm.stairs, cells = new Set();
  const add = (X, Y) => { if (X >= 0 && Y >= 0 && X < 80 && Y < 100) cells.add(X + ',' + Y); };
  for (let i = 0; i < stairs.length && cells.size < per; i += 3) { add(stairs[i].X, stairs[i].Y); add(stairs[i].X, stairs[i].Y + 1); add(stairs[i].X + 1, stairs[i].Y); }
  for (let i = 0; cells.size < per + 8; i++) add(5 + ((i * 37) % 70), 5 + ((i * 53) % 90));
  const t0 = performance.now(); let n = 0;
  for (const k of [...cells].sort()) { const [X, Y] = k.split(',').map(Number); console.log(seed, X, Y, placeDigest(cellTerrain(seed, X, Y))); n++; }
  console.error('seed', seed, n, 'places', Math.round(performance.now() - t0), 'ms');
}
