// The raw threshold (q >= 0) beside the cleaned land for a block of a window: shows what the passes did. node land-signs.mjs <seed> <x0> <x1> <y0> <y1> [--wobble 5] [--d 5200]
import { readFileSync } from 'node:fs';
import { realm7 } from '../src/gen7/region.mjs';
import { levelsOf, qCell, tileLevel, setLandRule, CW, CH } from '../src/gen7/levels.mjs';
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i < 0 ? d : process.argv[i + 1]; };
const [seed, x0, x1, y0, y1] = process.argv.slice(2, 7).map(Number), wv = JSON.parse(readFileSync(new URL('./land-windows.json', import.meta.url), 'utf8')).find(w => w.seed === seed);
setLandRule({ detail: +arg('d', 5200), wobbleReach: +arg('wobble', 3), warpReach: +arg('reach', 6), minFeature: +arg('min', 4), window: +arg('window', 2) });
const L = levelsOf(realm7(seed).realm), gx0 = wv.X * CW, gy0 = wv.Y * CH;
for (let y = y0; y < y1; y++) {
  let a = '', b = '';
  for (let x = x0; x < x1; x++) { const gx = gx0 + x, gy = gy0 + y, X = Math.floor(gx / CW), Y = Math.floor(gy / CH); a += qCell(L, X, Y)[(gy - Y * CH) * CW + gx - X * CW] >= 0 ? '#' : '.'; b += tileLevel(L, gx, gy) ? '#' : '.'; }
  console.log(String(y).padStart(3), a, ' ', b);
}
