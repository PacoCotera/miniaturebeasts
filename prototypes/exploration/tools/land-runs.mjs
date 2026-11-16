// land-b3e-seam-1: the straight runs over their caps (south face 10, side wall 10, back rim 14) on the fixed windows, in world tiles:  node land-runs.mjs [--seeds 7,13,42]
// each window is stitched from the cells' own windows (the centre cell of each); prints per run: seed, kind, world position of its first tile, length
import { readFileSync } from 'node:fs';
import { realm7 } from '../src/gen7/region.mjs';
import { levelsOf, windowLevels, CW, CH } from '../src/gen7/levels.mjs';
const args = process.argv.slice(2), opt = (n, d) => { const i = args.indexOf('--' + n); return i < 0 ? d : args[i + 1]; };
const WINDOWS = JSON.parse(readFileSync(new URL('./land-windows.json', import.meta.url), 'utf8')), SEEDS = String(opt('seeds', '7,13,42')).split(',').map(Number), CAP = { south: 10, side: 10, rim: 14 };
for (const seed of SEEDS) {
  const wv = WINDOWS.find(v => v.seed === seed), L = levelsOf(realm7(seed).realm), o = L.rule.window, w = wv.w, h = wv.h, R = new Uint8Array(w * h);
  for (let j = 0; j < h / CH; j++) for (let i = 0; i < w / CW; i++) { const win = windowLevels(L, wv.X + i, wv.Y + j); for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CW; tx++) R[(j * CH + ty) * w + i * CW + tx] = win.R[(o * CH + ty) * win.W + o * CW + tx] > 0 ? 1 : 0; }
  const g = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : R[y * w + x]), X0 = wv.X * CW, Y0 = wv.Y * CH;
  const kinds = [['south', true, (x, y) => g(x, y) && !g(x, y + 1)], ['rim', true, (x, y) => g(x, y) && !g(x, y - 1)], ['side', false, (x, y) => g(x, y) && !g(x - 1, y)], ['side', false, (x, y) => g(x, y) && !g(x + 1, y)]];
  for (const [k, alongX, is] of kinds) for (let l = 0; l < (alongX ? h : w); l++) { let n = 0, from = 0;
    for (let t = 0; t <= (alongX ? w : h); t++) { const on = t < (alongX ? w : h) && (alongX ? is(t, l) : is(l, t)); if (on) { if (!n) from = t; n++; } else { if (n > CAP[k] && from > 0 && t < (alongX ? w : h) && l > 0 && l < (alongX ? h : w) - 1) console.log(`seed ${seed} ${k} at ${alongX ? X0 + from : X0 + l},${alongX ? Y0 + l : Y0 + from} n ${n}`); n = 0; } } }
}
