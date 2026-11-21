// place-walk-1: the overview of one seed's land window (land-windows.json, grown by 2 cells each side) as a schematic of the walk: what the realm flood reaches and what it leaves, the thicket gaps cut and the
// necks lowered by this job (read against a "before" stitch). A diagram (code), 5 px a tile; the key is added by place-walk-key.py.
//   node place-walk-overview.mjs <seed> <afterDir> <beforeDir> <out.png>
import { readFileSync, writeFileSync } from 'node:fs';
import { TV, CW, CH, RW, RH } from '../src/gen7/place.mjs';
import { genRegion7 } from '../src/gen7/region.mjs';
import { MW, MH } from '../src/world.mjs';
import { newImage, encodePng } from '../../places/src/png.mjs';

const NB4 = [[1, 0], [-1, 0], [0, 1], [0, -1]], [seedArg, adir, bdir, outFile] = process.argv.slice(2), seed = +seedArg, WW = RW * CW, WH = RH * CH, SW = MW * CW, SH = MH * CH, S = 5;
const A = new Uint8Array(readFileSync(`${adir}/stitch-${seed}.bin`)), B = new Uint8Array(readFileSync(`${bdir}/stitch-${seed}.bin`)), wayups = JSON.parse(readFileSync(`${adir}/wayups-${seed}.json`, 'utf8'));
const wu = new Uint8Array(WW * WH); for (const a of wayups) for (let y = a.y; y < a.y + a.h; y++) for (let x = a.x; x < a.x + a.w; x++) if (x >= 0 && y >= 0 && x < WW && y < WH) wu[y * WW + x] = 1;
const at = (x, y) => (x < 0 || y < 0 || x >= WW || y >= WH ? TV.THICKET : A[y * WW + x]);
const regions = []; for (let ay = 0; ay < RH / MH; ay++) for (let ax = 0; ax < RW / MW; ax++) regions.push({ ax, ay, G: genRegion7(seed, ax, ay) });
const fordAt = (x, y) => regions[Math.floor(y / SH) * (RW / MW) + Math.floor(x / SW)].G.ford[Math.floor((y % SH) / CH) * MW + Math.floor((x % SW) / CW)];
const lip = (x, y) => at(x, y) === TV.CLIFF && NB4.some(([dx, dy]) => at(x + dx, y + dy) !== TV.CLIFF);
const pass = (x, y) => { const v = at(x, y); return !((v === TV.WATER && !fordAt(x, y)) || v === TV.THICKET || v === TV.DEEP || (v === TV.CLIFF && lip(x, y) && !wu[y * WW + x])); };
const seen = new Uint8Array(WW * WH), q = [];
for (const R of regions) { const sp = R.G.spawns[0], sx = R.ax * SW + (sp % MW) * CW + CW / 2, sy = R.ay * SH + ((sp / MW) | 0) * CH + CH / 2; let st = -1;
  for (let r = 0; r < 12 && st < 0; r++) for (let dy = -r; dy <= r && st < 0; dy++) for (let dx = -r; dx <= r; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === r && pass(sx + dx, sy + dy)) { st = (sy + dy) * WW + sx + dx; break; }
  if (st >= 0 && !seen[st]) { seen[st] = 1; q.push(st); } }
for (let k = 0; k < q.length; k++) for (const [dx, dy] of NB4) { const x = (q[k] % WW) + dx, y = ((q[k] / WW) | 0) + dy; if (x < 0 || y < 0 || x >= WW || y >= WH || seen[y * WW + x] || !pass(x, y)) continue; seen[y * WW + x] = 1; q.push(y * WW + x); }
const w0 = JSON.parse(readFileSync(new URL('./land-windows.json', import.meta.url), 'utf8')).find(v => v.seed === seed), X0 = (w0.X - 2) * CW, Y0 = (w0.Y - 2) * CH, W = w0.w + 4 * CW, H = w0.h + 4 * CH;
const img = newImage(W * S, H * S), put = (x, y, c) => { for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) img.data.set([...c, 255], ((y * S + j) * img.w + x * S + i) * 4); };
const COL = { low: [160, 196, 128], top: [112, 150, 88], lip: [128, 82, 48], thicket: [36, 84, 48], water: [79, 134, 198], unLow: [214, 40, 40], unTop: [240, 150, 30], gap: [235, 0, 215], neck: [0, 205, 225], way: [250, 232, 60] };
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const gx = X0 + x, gy = Y0 + y, i = gy * WW + gx, v = at(gx, gy); let c;
  if (A[i] !== B[i] && B[i] === TV.THICKET && v !== TV.WATER && v !== TV.DEEP) c = COL.gap;
  else if (A[i] !== B[i] && B[i] === TV.CLIFF && v !== TV.CLIFF) c = COL.neck;
  else if (wu[i]) c = COL.way;
  else if (v === TV.WATER || v === TV.DEEP) c = COL.water;
  else if (v === TV.THICKET) c = COL.thicket;
  else if (!pass(gx, gy)) c = COL.lip;
  else if (!seen[i]) c = v === TV.CLIFF ? COL.unTop : COL.unLow;
  else c = v === TV.CLIFF ? COL.top : COL.low;
  put(x, y, c);
}
for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) if ((x + X0 * S) % (CW * S) === 0 || (y + Y0 * S) % (CH * S) === 0) img.data.set([255, 255, 255, 255], (y * img.w + x) * 4);   // the cell lines
writeFileSync(outFile, encodePng(img)); console.log(outFile, W * S, H * S);
