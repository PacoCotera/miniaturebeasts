// land-b3e-seam-1: the land rule's shape checks over the whole realm, cell by cell (each cell from its own window): lone face, pinch, square corner, one-tile sliver and foot room, where they fall inside the cell
//   node land-realm-viol.mjs <seed> <Y0> <Y1>   -> {seed, cells, counts: {lone, pinch, square, sliver, foot}, at: [[kind, x, y], ...first 40]}
import { realm7 } from '../src/gen7/region.mjs';
import { levelsOf, windowLevels, CW, CH } from '../src/gen7/levels.mjs';
import { RW, RH } from '../src/gen7/world.mjs';
const [seed, Y0, Y1] = process.argv.slice(2).map(Number), L = levelsOf(realm7(seed).realm), o = L.rule.window, fr = L.rule.faceRows;
const counts = { lone: 0, pinch: 0, square: 0, sliver: 0, foot: 0 }, at = []; let cells = 0;
for (let Y = Y0; Y < Math.min(Y1, RH); Y++) for (let X = 0; X < RW; X++) {
  const w = windowLevels(L, X, Y), W = w.W, H = w.H, R = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : w.R[y * W + x] > 0 ? 1 : 0), lip = (x, y) => R(x, y) === 1 && R(x, y + 1) === 0;
  cells++;
  const x0 = o * CW, y0 = o * CH, note = (k, x, y) => { counts[k]++; if (at.length < 40) at.push([k, X * CW + x - x0, Y * CH + y - y0]); };
  for (let y = y0; y < y0 + CH; y++) for (let x = x0; x < x0 + CW; x++) {
    if (lip(x, y) && !lip(x - 1, y) && !lip(x + 1, y) && !(lip(x - 1, y - 1) || lip(x + 1, y - 1) || lip(x - 1, y + 1) || lip(x + 1, y + 1))) note('lone', x, y);
    const c = R(x, y) * 8 + R(x + 1, y) * 4 + R(x, y + 1) * 2 + R(x + 1, y + 1); if (c === 6 || c === 9) note('pinch', x, y);
    if (lip(x, y)) for (const dx of [-1, 1]) { if (lip(x + dx, y) || !lip(x - dx, y)) continue; if (!R(x + dx, y) && !R(x + dx, y - 1) && !R(x + dx, y - 2)) note('square', x, y); }
    const v = R(x, y); let ok = false; for (let oy = -1; oy <= 0 && !ok; oy++) for (let ox = -1; ox <= 0 && !ok; ox++) ok = R(x + ox, y + oy) === v && R(x + ox + 1, y + oy) === v && R(x + ox, y + oy + 1) === v && R(x + ox + 1, y + oy + 1) === v; if (!ok) note('sliver', x, y);
    if (lip(x, y)) for (let k = 2; k <= fr + 1; k++) if (R(x, y + k)) { note('foot', x, y); break; }
  }
}
console.log(JSON.stringify({ seed, Y0, Y1, cells, counts, at }));
