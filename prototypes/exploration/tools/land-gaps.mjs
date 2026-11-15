// land-b3e-seam-1: one-wide gaps between blocking tiles (relief.mjs's ring, face and flank cells) on the fixed windows: a tile that walks with a blocking tile on both sides, east and west or north and south
//   node land-gaps.mjs [--seeds 7,13,42,8,1] [--list]
// the windows are stitched from each cell's own window; a tile within 4 of the stitched window's edge is not counted. A way up's tiles walk and are never counted.
import { readFileSync } from 'node:fs';
import { realm7 } from '../src/gen7/region.mjs';
import { levelsOf, windowLevels, findWayup, CW, CH } from '../src/gen7/levels.mjs';
const args = process.argv.slice(2), opt = (n, d) => { const i = args.indexOf('--' + n); return i < 0 ? d : args[i + 1]; };
const WINDOWS = JSON.parse(readFileSync(new URL('./land-windows.json', import.meta.url), 'utf8')), SEEDS = String(opt('seeds', '7,13,42,8,1')).split(',').map(Number), FR = 3;
let all = 0;
for (const seed of SEEDS) {
  const wv = WINDOWS.find(v => v.seed === seed), L = levelsOf(realm7(seed).realm), o = L.rule.window, w = wv.w, h = wv.h, R = new Uint8Array(w * h);
  for (let j = 0; j < h / CH; j++) for (let i = 0; i < w / CW; i++) { const win = windowLevels(L, wv.X + i, wv.Y + j); for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CW; tx++) R[(j * CH + ty) * w + i * CW + tx] = win.R[(o * CH + ty) * win.W + o * CW + tx] > 0 ? 1 : 0; }
  const rs = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : R[y * w + x] === 1), lw = (x, y) => !rs(x, y);
  const up = (x, y) => { let k = 0; while (k < 3 && lw(x, y - k)) k++; return k; };
  const endAt = (x, y) => { if (!lw(x, y)) return false; for (let Lr = y + 2; Lr >= y - 1; Lr--) { if (!lw(x, Lr)) continue; for (const xl of [x - 1, x + 1]) { if (!rs(xl, Lr) || !lw(xl, Lr + 1)) continue; const k = up(x, Lr), top = k >= 3 ? Lr - 2 : k === 2 ? Lr - 1 : Lr; if (y >= top && y <= Lr + 1) return true; } } return false; };
  const blocked = (x, y) => { if (rs(x, y)) return lw(x + 1, y) || lw(x - 1, y) || lw(x, y + 1) || lw(x, y - 1); if (rs(x, y - 1)) return true; return endAt(x, y) || rs(x - 1, y) || rs(x + 1, y); };
  const gaps = [];
  for (let y = 4; y < h - 4; y++) for (let x = 4; x < w - 4; x++) { if (blocked(x, y)) continue; if ((blocked(x - 1, y) && blocked(x + 1, y)) || (blocked(x, y - 1) && blocked(x, y + 1))) gaps.push(`${wv.X * CW + x},${wv.Y * CH + y}`); }
  all += gaps.length;
  console.log(`seed ${seed}: one-wide gaps ${gaps.length}${args.includes('--list') ? ' ' + gaps.join(' ') : ''}`);
}
void FR; void findWayup;
console.log('all', all);
