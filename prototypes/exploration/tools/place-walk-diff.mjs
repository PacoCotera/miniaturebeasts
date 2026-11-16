// place-walk-1: what the walk job changed in the land, tile by tile, between two stitched seeds (place-walk-causes.mjs's caches):
//   node place-walk-diff.mjs <seed> <beforeDir> <afterDir> [out.json]
// A gap is thicket that became ground; a lowered neck is raised land that became low ground. Prints the counts and writes the clusters (4-connected, with their cell and box) as JSON.
import { readFileSync, writeFileSync } from 'node:fs';
import { TV, CW, CH, RW, RH } from '../src/gen7/place.mjs';
const [seedArg, bdir, adir, out] = process.argv.slice(2), seed = +seedArg, WW = RW * CW, WH = RH * CH;
const A = new Uint8Array(readFileSync(`${bdir}/stitch-${seed}.bin`)), B = new Uint8Array(readFileSync(`${adir}/stitch-${seed}.bin`));
const kinds = { gap: i => A[i] === TV.THICKET && B[i] !== TV.THICKET && B[i] !== TV.WATER && B[i] !== TV.DEEP, neck: i => A[i] === TV.CLIFF && B[i] !== TV.CLIFF && B[i] !== A[i], thickened: i => A[i] !== TV.THICKET && B[i] === TV.THICKET, other: i => A[i] !== B[i] };
const res = { seed, changed: 0, gap: 0, neck: 0, thickened: 0, clusters: { gap: [], neck: [] } };
const mark = new Uint8Array(WW * WH);
for (let i = 0; i < WW * WH; i++) { if (A[i] === B[i]) continue; res.changed++; if (kinds.gap(i)) { res.gap++; mark[i] = 1; } else if (kinds.neck(i)) { res.neck++; mark[i] = 2; } else if (kinds.thickened(i)) res.thickened++; }
for (const k of [1, 2]) { const seen = new Uint8Array(WW * WH);
  for (let s = 0; s < WW * WH; s++) { if (mark[s] !== k || seen[s]) continue; const q = [s]; seen[s] = 1; let x0 = WW, x1 = 0, y0 = WH, y1 = 0;
    for (let h = 0; h < q.length; h++) { const x = q[h] % WW, y = (q[h] / WW) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = x + dx, b = y + dy; if (a < 0 || b < 0 || a >= WW || b >= WH) continue; const m = b * WW + a; if (mark[m] === k && !seen[m]) { seen[m] = 1; q.push(m); } } }
    (k === 1 ? res.clusters.gap : res.clusters.neck).push({ n: q.length, box: [x0, y0, x1, y1], cell: [Math.floor((x0 + x1) / 2 / CW), Math.floor((y0 + y1) / 2 / CH)], centre: [(x0 + x1) >> 1, (y0 + y1) >> 1] }); } }
console.log(JSON.stringify({ seed, changedTiles: res.changed, gapTiles: res.gap, gaps: res.clusters.gap.length, neckTiles: res.neck, necks: res.clusters.neck.length, thickened: res.thickened }));
if (out) writeFileSync(out, JSON.stringify(res, null, 1));
