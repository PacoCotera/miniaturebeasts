// Prints the field q (Q16) along a few rows of a window of the fixed list: where the contour crosses zero and how steep it is. node land-q.mjs <seed> <x0> <x1> [--wobble 5] [--d 5200]
import { readFileSync } from 'node:fs';
import { realm7 } from '../src/gen7/region.mjs';
import { levelsOf, qCell, setLandRule, CW, CH } from '../src/gen7/levels.mjs';
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i < 0 ? d : process.argv[i + 1]; };
const seed = +process.argv[2], x0 = +process.argv[3], x1 = +process.argv[4], wv = JSON.parse(readFileSync(new URL('./land-windows.json', import.meta.url), 'utf8')).find(w => w.seed === seed);
setLandRule({ detail: +arg('d', 5200), wobbleReach: +arg('wobble', 3), window: 2 });
const L = levelsOf(realm7(seed).realm), gx0 = wv.X * CW, gy0 = wv.Y * CH;
for (const y of (arg('rows', '1,4,7,10,13,16,20')).split(',').map(Number)) {
  let s = '';
  for (let x = x0; x < x1; x++) { const gx = gx0 + x, gy = gy0 + y, X = Math.floor(gx / CW), Y = Math.floor(gy / CH); s += String(qCell(L, X, Y)[(gy - Y * CH) * CW + gx - X * CW]).padStart(7); }
  console.log(String(y).padStart(2), s);
}
