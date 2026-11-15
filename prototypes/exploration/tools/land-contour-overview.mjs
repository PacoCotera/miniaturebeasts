// cliff-contour-1: a zoomed-out schematic of one whole region (16 x 20 cells), the land as the cells' own windows make it: raised land filled, the outline as the set draws it (a corner the set draws as a
// slope cut at 45 degrees through its half-tile points; a right angle kept), straight runs of 6 or more in red, the smooth contour (the field at the minimum feature's scale) as a thin blue line.
//   node land-contour-overview.mjs <seed> <RX> <RY> <old|new> <out.png> [label]
import { writeFileSync } from 'node:fs';
import { realm7 } from '../src/gen7/region.mjs';
import { levelsOf, levelCell, qCell, CW, CH } from '../src/gen7/levels.mjs';
import { drawnSegments, isoLine } from './contour-lib.mjs';
import { newImage, encodePng } from '../../places/src/png.mjs';

const [SEED, RX, RY, MODEL, OUT] = process.argv.slice(2), seed = Number(SEED), X0 = 16 * Number(RX), Y0 = 20 * Number(RY), NX = 16, NY = 20, S = 3;
const L = levelsOf(realm7(seed).realm), w = NX * CW, h = NY * CH, R = new Uint8Array(w * h), q = new Int32Array(w * h);
for (let Y = 0; Y < NY; Y++) for (let X = 0; X < NX; X++) {
  const c = levelCell(L, X0 + X, Y0 + Y), qc = qCell(L, X0 + X, Y0 + Y);
  for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CW; tx++) { const i = (Y * CH + ty) * w + X * CW + tx; R[i] = c[ty * CW + tx] > 0 ? 1 : 0; q[i] = qc[ty * CW + tx]; }
}
// the smooth field (rounded element of radius 2)
const qs = new Int32Array(w * h);
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0, c = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { if (Math.abs(dx) === 2 && Math.abs(dy) === 2) continue; const a = Math.max(0, Math.min(w - 1, x + dx)), b = Math.max(0, Math.min(h - 1, y + dy)); s += q[b * w + a]; c++; } qs[y * w + x] = Math.floor(s / c); }
const img = newImage(w * S, h * S), set = (x, y, c) => { if (x >= 0 && y >= 0 && x < img.w && y < img.h) img.data.set([...c, 255], (y * img.w + x) * 4); };
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = R[y * w + x] ? [176, 204, 140] : [236, 232, 218]; for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) set(x * S + i, y * S + j, c); }
const line = (x0, y0, x1, y1, c) => { const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * S * 2) + 1; for (let k = 0; k <= n; k++) { const t = k / n; set(Math.round((x0 + (x1 - x0) * t) * S), Math.round((y0 + (y1 - y0) * t) * S), c); } };
const iso = isoLine(qs, w, h); for (const a of iso.B.values()) for (const s of a) line(s[0], s[1], s[2], s[3], [90, 150, 230]);
for (const [x0, y0, x1, y1, long] of drawnSegments(R, w, h, MODEL)) line(x0, y0, x1, y1, long ? [214, 40, 40] : [40, 40, 40]);
for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) if (x % (CW * S) === 0 || y % (CH * S) === 0) { const o = (y * img.w + x) * 4; for (let c = 0; c < 3; c++) img.data[o + c] = Math.round(img.data[o + c] * 0.85); }
writeFileSync(OUT, encodePng(img)); console.log(OUT);
