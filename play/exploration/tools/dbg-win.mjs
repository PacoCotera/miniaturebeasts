// land-b3c: the window info of cells (jogs, pockets, sites) and the raster of a tile box as that window sees it
//   node dbg-win.mjs <seed> <cellX> <cellY> <gx0> <gy0> <gx1> <gy1>
import { realm7 } from '../src/gen7/region.mjs';
import { levelsOf, windowLevels, landRule, CW, CH } from '../src/gen7/levels.mjs';
globalThis.B3C_DBG = 1;
const [seed, cx, cy, x0, y0, x1, y1] = process.argv.slice(2).map(Number), L = levelsOf(realm7(seed).realm), o = landRule().window, w = windowLevels(L, cx, cy);
const pre = w.info.pre; for (let y = y0; y <= y1; y++) { let s = 'pre ' + String(y).padStart(5) + ' '; for (let x = x0; x <= x1; x++) { const wx = x - (cx - o) * CW, wy = y - (cy - o) * CH; s += wx < 0 || wy < 0 || wx >= w.W || wy >= w.H ? ' ' : pre[wy * w.W + wx] ? '#' : '.'; } console.log(s); }
console.log(JSON.stringify({ ...w.info, why: undefined, pre: undefined }), (w.info.why || []).slice(0, 8).join(' | '));
for (let y = y0; y <= y1; y++) { let s = String(y).padStart(5) + ' '; for (let x = x0; x <= x1; x++) { const wx = x - (cx - o) * CW, wy = y - (cy - o) * CH; s += wx < 0 || wy < 0 || wx >= w.W || wy >= w.H ? ' ' : w.R[wy * w.W + wx] ? '#' : '.'; } console.log(s); }
