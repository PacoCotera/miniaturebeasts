// land-reach-1: a schematic of the stitched realm (a diagram, no art): raised land green, low cream, water blue, deep navy, thicket dark green, path tan, ways up orange, walkable tiles the place
// test leaves unreached in red; the cell grid faint. Reads land-reach.mjs's cache and its --mask file.
//   node land-reach-overview.mjs <seed> <cacheDir> <mask.bin|-> <x0> <y0> <w> <h> <scale> <out.png>
import { readFileSync, writeFileSync } from 'node:fs';
import { TV, CW, CH, RW, RH } from '../src/gen7/place.mjs';
import { newImage, encodePng } from '../../places/src/png.mjs';
const a = process.argv.slice(2), seed = a[0], dir = a[1], maskF = a[2], [x0, y0, w, h, S] = a.slice(3, 8).map(Number), out = a[8];
const WW = RW * CW, T = new Uint8Array(readFileSync(`${dir}/stitch-${seed}.bin`)), M = maskF === '-' ? null : new Uint8Array(readFileSync(maskF));
const wu = new Set(); for (const b of JSON.parse(readFileSync(`${dir}/wayups-${seed}.json`, 'utf8'))) for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) wu.add(y * WW + x);
const img = newImage(w * S, h * S);
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const gx = x0 + x, gy = y0 + y, i = gy * WW + gx, v = T[i];
  let c = v === TV.CLIFF ? [150, 190, 120] : v === TV.WATER ? [120, 170, 220] : v === TV.DEEP ? [50, 80, 140] : v === TV.THICKET ? [70, 110, 70] : v === TV.PATH ? [205, 180, 135] : [236, 232, 218];
  if (M && M[i]) c = v === TV.CLIFF ? [200, 60, 60] : [240, 120, 110];
  if (wu.has(i)) c = [250, 150, 20];
  const grid = (gx % CW === 0) || (gy % CH === 0);
  for (let j = 0; j < S; j++) for (let k = 0; k < S; k++) { const o = ((y * S + j) * img.w + x * S + k) * 4; const g = grid && (j === 0 || k === 0) && S > 1 ? 0.85 : 1; img.data[o] = c[0] * g; img.data[o + 1] = c[1] * g; img.data[o + 2] = c[2] * g; img.data[o + 3] = 255; }
}
writeFileSync(out, encodePng(img)); console.log(out);
