// Prints the raster round the one-wide slivers and the square corners of a window (a debugging aid for the measure's loneBlk and square counts).  node dbg-sliver.mjs <seed>
import { readFileSync } from 'node:fs';
import { rasterOf } from './land-measure.mjs';
const WINDOWS = JSON.parse(readFileSync(new URL('./land-windows.json', import.meta.url), 'utf8'));
const seed = +process.argv[2], wv = WINDOWS.find(w => w.seed === seed), { w, h } = wv, r = rasterOf(seed, wv.X, wv.Y, w, h), bits = r.raised;
const R = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : bits[y * w + x] === '1' ? 1 : 0), lip = (x, y) => R(x, y) === 1 && R(x, y + 1) === 0;
const show = (cx, cy, tag) => { console.log(tag, 'world', wv.X * 24 + cx, wv.Y * 28 + cy, 'win', cx, cy); for (let y = cy - 6; y <= cy + 6; y++) { let s = ''; for (let x = cx - 12; x <= cx + 12; x++) s += (x === cx && y === cy ? (R(x, y) ? 'O' : 'o') : R(x, y) ? '#' : '.'); console.log(s); } };
for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
  const v = R(x, y); let ok = false; for (let oy = -1; oy <= 0 && !ok; oy++) for (let ox = -1; ox <= 0 && !ok; ox++) ok = R(x + ox, y + oy) === v && R(x + ox + 1, y + oy) === v && R(x + ox, y + oy + 1) === v && R(x + ox + 1, y + oy + 1) === v;
  if (!ok) show(x, y, 'SLIVER');
}
for (let y = 3; y < h - 1; y++) for (let x = 1; x < w - 1; x++) if (lip(x, y)) for (const dx of [-1, 1]) { if (lip(x + dx, y) || !lip(x - dx, y)) continue; if (!R(x + dx, y) && !R(x + dx, y - 1) && !R(x + dx, y - 2)) show(x, y, 'SQUARE dx=' + dx); }
