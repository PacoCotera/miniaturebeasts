// land-b3e-seam-1: ledges of stacked faces (cliff-rules.md 2): where a level-v face stands above a level-(v-1) face, the walkable top between the upper face's foot line and the lower face's lip (rows)
//   node land-ledges.mjs [--seeds 7,13,42]
// per seed (the fixed 4 x 3 window, stitched from each cell's own window): the number of stacked pairs found down the columns, the narrowest ledge, and how many are under 2; also the highest tile level seen
// (the land rule's `levels` list has one threshold today, so tiles are 0 or 1 and no face stacks)
import { readFileSync } from 'node:fs';
import { realm7 } from '../src/gen7/region.mjs';
import { levelsOf, windowLevels, CW, CH } from '../src/gen7/levels.mjs';
const args = process.argv.slice(2), opt = (n, d) => { const i = args.indexOf('--' + n); return i < 0 ? d : args[i + 1]; };
const WINDOWS = JSON.parse(readFileSync(new URL('./land-windows.json', import.meta.url), 'utf8')), SEEDS = String(opt('seeds', '7,13,42')).split(',').map(Number);
for (const seed of SEEDS) {
  const wv = WINDOWS.find(v => v.seed === seed), L = levelsOf(realm7(seed).realm), o = L.rule.window, w = wv.w, h = wv.h, R = new Uint8Array(w * h), fr = L.rule.faceRows;
  for (let j = 0; j < h / CH; j++) for (let i = 0; i < w / CW; i++) { const win = windowLevels(L, wv.X + i, wv.Y + j); for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CW; tx++) R[(j * CH + ty) * w + i * CW + tx] = win.R[(o * CH + ty) * win.W + o * CW + tx]; }
  let top = 0, pairs = 0, narrow = 99, under = 0; const where = [];
  for (let x = 0; x < w; x++) { const lips = [];
    for (let y = 0; y + 1 < h; y++) { top = Math.max(top, R[y * w + x]); if (R[y * w + x] > R[(y + 1) * w + x]) lips.push([y, R[y * w + x]]); }
    for (let k = 0; k + 1 < lips.length; k++) { const [y, v] = lips[k], [y2, v2] = lips[k + 1]; if (v - 1 !== v2) continue; pairs++; const ledge = y2 - y - fr - 1; if (ledge < narrow) narrow = ledge; if (ledge < 2) { under++; where.push(`${wv.X * CW + x},${wv.Y * CH + y}`); } }
  }
  console.log(JSON.stringify({ seed, highestTileLevel: top, stackedPairs: pairs, narrowestLedge: pairs ? narrow : null, under2: under, at: where.slice(0, 8) }));
}
