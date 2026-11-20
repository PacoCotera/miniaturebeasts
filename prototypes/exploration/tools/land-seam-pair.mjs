// land-b3d-face3-1: where two windows disagree: node land-seam-pair.mjs <seed> <X> <Y> <X2> <Y2>: tiles of cells (X, Y) and (X2, Y2) that the two windows (centred on each) see differently, inside the cells' own area
import { realm7 } from '../src/gen7/region.mjs';
import { levelsOf, windowLevels, CW, CH } from '../src/gen7/levels.mjs';
const [seed, X, Y, X2, Y2] = process.argv.slice(2).map(Number), L = levelsOf(realm7(seed).realm), o = L.rule.window;
const A = windowLevels(L, X, Y), B = windowLevels(L, X2, Y2), at = (W, cx, cy, gx, gy) => { const x = gx - (cx - o) * CW, y = gy - (cy - o) * CH; return x < 0 || y < 0 || x >= W.W || y >= W.H ? -1 : W.R[y * W.W + x]; };
const diffs = [];
for (const [cx, cy] of [[X, Y], [X2, Y2]]) for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CW; tx++) { const gx = cx * CW + tx, gy = cy * CH + ty, a = at(A, X, Y, gx, gy), b = at(B, X2, Y2, gx, gy); if (a >= 0 && b >= 0 && (a > 0) !== (b > 0)) diffs.push(`${gx},${gy}`); }
console.log(JSON.stringify({ differing: diffs.length, at: diffs.slice(0, 30) }));
