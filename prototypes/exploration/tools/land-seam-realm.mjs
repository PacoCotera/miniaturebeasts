// land-b3e-seam-1: every pair of adjacent windows (east and south neighbours) of the realm's cells, rows Y0 .. Y1 - 1:  node land-seam-realm.mjs <seed> <Y0> <Y1>
// prints {pairs, differing, first: [...]}: the tiles of the two cells that the windows centred on each see differently (as land-seam-pair.mjs, for a whole band of rows)
import { realm7 } from '../src/gen7/region.mjs';
import { levelsOf, windowLevels, CW, CH } from '../src/gen7/levels.mjs';
import { RW, RH } from '../src/gen7/world.mjs';
const [seed, Y0, Y1] = process.argv.slice(2).map(Number), L = levelsOf(realm7(seed).realm), o = L.rule.window;
const at = (W, cx, cy, gx, gy) => { const x = gx - (cx - o) * CW, y = gy - (cy - o) * CH; return x < 0 || y < 0 || x >= W.W || y >= W.H ? -1 : W.R[y * W.W + x]; };
const diff = (A, X, Y, B, X2, Y2, out) => {
  let n = 0;
  for (const [cx, cy] of [[X, Y], [X2, Y2]]) for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CW; tx++) {
    const gx = cx * CW + tx, gy = cy * CH + ty, a = at(A, X, Y, gx, gy), b = at(B, X2, Y2, gx, gy);
    if (a >= 0 && b >= 0 && (a > 0) !== (b > 0)) { n++; if (out.length < 20) out.push(`${gx},${gy}`); }
  }
  return n;
};
const row = Y => { const w = []; for (let X = 0; X < RW; X++) w.push(windowLevels(L, X, Y)); return w; };
let pairs = 0, differing = 0, bad = 0; const first = []; let cur = row(Y0);
for (let Y = Y0; Y < Y1 && Y < RH; Y++) {
  const nxt = Y + 1 < RH ? row(Y + 1) : null;
  for (let X = 0; X < RW; X++) {
    if (X + 1 < RW) { pairs++; const d = diff(cur[X], X, Y, cur[X + 1], X + 1, Y, first); if (d) { differing += d; bad++; } }
    if (nxt) { pairs++; const d = diff(cur[X], X, Y, nxt[X], X, Y + 1, first); if (d) { differing += d; bad++; } }
  }
  cur = nxt;
}
console.log(JSON.stringify({ seed, Y0, Y1, pairs, badPairs: bad, differing, first }));
