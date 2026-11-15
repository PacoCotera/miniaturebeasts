// land-b3d-face3-1: slivers on the 15 fixed windows (a cell's tile with no 2 x 2 block of its own level, in the window's own raster, one ring in from its rim cells).
//   node land-slivers.mjs
import { readFileSync } from 'node:fs';
import { realm7 } from '../src/gen7/region.mjs';
import { levelsOf, windowLevels, CW, CH } from '../src/gen7/levels.mjs';

const WINDOWS = JSON.parse(readFileSync(new URL('./land-windows.json', import.meta.url), 'utf8'));
let slivers = 0, tiles = 0; const at = [];
for (const w of WINDOWS) {
  const L = levelsOf(realm7(w.seed).realm), PW = w.w / CW, PH = w.h / CH;
  for (let j = 0; j < PH; j++) for (let i = 0; i < PW; i++) {
    const X = w.X + i, Y = w.Y + j, win = windowLevels(L, X, Y), o = L.rule.window, R = win.R, W = win.W;
    for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CW; tx++) {
      const x = o * CW + tx, y = o * CH + ty, v = R[y * W + x] > 0 ? 1 : 0; let ok = false; tiles++;
      const g = (a, b) => (R[b * W + a] > 0 ? 1 : 0);
      for (let oy = -1; oy <= 0 && !ok; oy++) for (let ox = -1; ox <= 0 && !ok; ox++) ok = g(x + ox, y + oy) === v && g(x + ox + 1, y + oy) === v && g(x + ox, y + oy + 1) === v && g(x + ox + 1, y + oy + 1) === v;
      if (!ok) { slivers++; at.push(`${w.seed}:${X},${Y}:${tx},${ty}`); }
    }
  }
}
console.log(JSON.stringify({ windows: WINDOWS.length, tiles, slivers, at: at.slice(0, 20) }));
