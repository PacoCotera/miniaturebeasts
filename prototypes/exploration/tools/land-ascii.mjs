// Prints one window's raised land as text (# raised, . low, ^ south lip, v back rim) for the rule at a setting; marks the lips with fewer than faceRows + 1 low rows below.
//   node land-ascii.mjs <seed> [--d 5200] [--face 3] [--min 4] [--reach 6]
import { readFileSync } from 'node:fs';
import { setLandRule } from '../src/gen7/levels.mjs';
import { rasterOf } from './land-measure.mjs';
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i < 0 ? d : process.argv[i + 1]; };
const seed = +process.argv[2], wv = JSON.parse(readFileSync(new URL('./land-windows.json', import.meta.url), 'utf8')).find(w => w.seed === seed), face = +arg('face', 3);
setLandRule({ detail: +arg('d', 5200), warpReach: +arg('reach', 6), wobbleReach: +arg('wobble', 3), window: +arg('window', 2), minFeature: +arg('min', 4), faceRows: face });
const r = rasterOf(seed, wv.X, wv.Y, wv.w, wv.h), R = (x, y) => (x < 0 || y < 0 || x >= wv.w || y >= wv.h ? 0 : r.raised[y * wv.w + x] === '1' ? 1 : 0);
// a tile in a straight run of 9 or more along a side wall (S) or back rim (R) is marked
const mark = new Set();
const runMark = (get, along, lines, len, ch) => { for (let l = 1; l < lines - 1; l++) { let n = 0; for (let k = 0; k <= len; k++) { if (k < len && get(along ? k : l, along ? l : k)) n++; else { if (n >= 9) for (let j = k - n; j < k; j++) mark.add((along ? j : l) + ',' + (along ? l : j) + ch); n = 0; } } } };
runMark((x, y) => R(x, y) && !R(x - 1, y), false, wv.w, wv.h, 'S'); runMark((x, y) => R(x, y) && !R(x + 1, y), false, wv.w, wv.h, 'S'); runMark((x, y) => R(x, y) && !R(x, y - 1), true, wv.h, wv.w, 'R');
for (let y = 0; y < wv.h; y++) {
  let s = '';
  for (let x = 0; x < wv.w; x++) {
    if (mark.has(x + ',' + y + 'S')) { s += 'S'; continue; }
    if (mark.has(x + ',' + y + 'R')) { s += 'R'; continue; }
    if (!R(x, y)) { s += '.'; continue; }
    if (!R(x, y + 1)) { let k = 0; while (k < face + 1 && !R(x, y + 1 + k)) k++; s += k < face + 1 ? 'X' : '^'; } else s += R(x, y - 1) ? '#' : 'v';
  }
  console.log(String(y).padStart(2), s);
}
