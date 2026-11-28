// land-b3c: shape failures (sliver, pinch, lone face, foot room, square corner) in the raster of given cells (their own window, the cell and a tile round it), world tiles
//   node dbg-cell.mjs <seed> <X,Y> [<X,Y> ...]
import { realm7 } from '../src/gen7/region.mjs';
import { levelsOf, windowLevels, landRule, CW, CH } from '../src/gen7/levels.mjs';
globalThis.B3C_DBG = 1;
const [seedS, ...cells] = process.argv.slice(2), seed = +seedS, L = levelsOf(realm7(seed).realm), o = landRule().window, fr = landRule().faceRows;
for (const cs of cells) {
  const [X, Y] = cs.split(',').map(Number), w = windowLevels(L, X, Y), W = w.W, H = w.H, out = [];
  const R = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : w.R[y * W + x]), lip = (x, y) => R(x, y) === 1 && R(x, y + 1) === 0;
  for (let y = o * CH - 1; y <= (o + 1) * CH; y++) for (let x = o * CW - 1; x <= (o + 1) * CW; x++) {
    const at = n => out.push(`${n}@${X * CW + x - o * CW},${Y * CH + y - o * CH}`);
    const v = R(x, y); let ok = false; for (let oy = -1; oy <= 0 && !ok; oy++) for (let ox = -1; ox <= 0 && !ok; ox++) ok = R(x + ox, y + oy) === v && R(x + ox + 1, y + oy) === v && R(x + ox, y + oy + 1) === v && R(x + ox + 1, y + oy + 1) === v;
    if (!ok) at('sliver');
    const c = R(x, y) * 8 + R(x + 1, y) * 4 + R(x, y + 1) * 2 + R(x + 1, y + 1); if (c === 6 || c === 9) at('pinch');
    if (lip(x, y)) { if (!lip(x - 1, y) && !lip(x + 1, y) && !(lip(x - 1, y - 1) || lip(x + 1, y - 1) || lip(x - 1, y + 1) || lip(x + 1, y + 1))) at('lone'); for (let k = 2; k <= fr + 1; k++) if (R(x, y + k)) { at('foot'); break; } }
  }
  console.log(cs, out.join(' ') || 'clean', JSON.stringify({ ...w.info, pre: undefined, why: undefined }).slice(0, 300));
}
