// cliff-contour-1, step 1: the whole realm's outline against the smooth contour, one seed:  node land-contour.mjs <seed> <out.json> [--model old|new] [--cells X0,Y0,X1,Y1]
// The land is every cell as its own window makes it (levelCell); the smooth contour is the field q (levels.mjs qCell) with the water and the coast held low as the land rule holds them.
// Prints and writes the summary (contour-lib.mjs measureLand): straight runs, staircases, jogs, distances; the 60 first long runs and staircases with their world tiles.
import { writeFileSync } from 'node:fs';
import { realm7 } from '../src/gen7/region.mjs';
import { levelsOf, levelCell, qCell, wetCell, inlandOf, RAISE_OFF, CW, CH } from '../src/gen7/levels.mjs';
import { RW, RH } from '../src/gen7/world.mjs';
import { L as LAND } from '../src/world.mjs';
import { measureLand, summary } from './contour-lib.mjs';

const args = process.argv.slice(2), [SEED, OUT] = args, opt = (n, d) => { const i = args.indexOf('--' + n); return i < 0 ? d : args[i + 1]; };
const seed = Number(SEED), model = opt('model', 'old'), [X0, Y0, X1, Y1] = String(opt('cells', `0,0,${RW - 1},${RH - 1}`)).split(',').map(Number);
const t0 = Date.now(), L = levelsOf(realm7(seed).realm), w = (X1 - X0 + 1) * CW, h = (Y1 - Y0 + 1) * CH, gx0 = X0 * CW, gy0 = Y0 * CH;
const R = new Uint8Array(w * h), q = new Int32Array(w * h), wet = new Uint8Array(w * h);
for (let Y = Y0; Y <= Y1; Y++) for (let X = X0; X <= X1; X++) {
  const c = levelCell(L, X, Y), qc = qCell(L, X, Y), wc = wetCell(L, X, Y), water = L.realm.land[Y * RW + X] === LAND.WATER && !L.realm.ford[Y * RW + X];
  for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CW; tx++) {
    const i = ((Y - Y0) * CH + ty) * w + (X - X0) * CW + tx, k = ty * CW + tx;
    R[i] = c[k] > 0 ? 1 : 0; q[i] = qc[k]; wet[i] = wc[k] || water ? 1 : 0;
  }
}
// held low: a wet tile and the tiles round it, the coast's tiles
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  let held = inlandOf(gx0 + x, gy0 + y) < RAISE_OFF + 1;
  for (let dy = -1; dy <= 1 && !held; dy++) for (let dx = -1; dx <= 1 && !held; dx++) { const a = x + dx, b = y + dy; if (a >= 0 && b >= 0 && a < w && b < h && wet[b * w + a]) held = true; }
  if (held && q[y * w + x] >= 0) q[y * w + x] = -1;
}
// the smooth reference: the field's mean over the rounded element of radius 2 (the minimum feature's scale: the 5 x 5 square without its corners), held tiles held
const qs = new Int32Array(w * h);
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  if (q[y * w + x] === -1) { qs[y * w + x] = -1; continue; }
  let s = 0, c = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { if (Math.abs(dx) === 2 && Math.abs(dy) === 2) continue; const a = Math.max(0, Math.min(w - 1, x + dx)), b = Math.max(0, Math.min(h - 1, y + dy)); s += q[b * w + a]; c++; }
  qs[y * w + x] = Math.floor(s / c);
}
const tBuild = Date.now() - t0, inside = (x, y) => x >= 2 && y >= 2 && x < w - 2 && y < h - 2;
const st = measureLand(R, w, h, q, model, inside), sm = summary(measureLand(R, w, h, qs, model, inside));
const s = summary(st), out = { seed, model, cells: [X0, Y0, X1, Y1], raisedShare: +(R.reduce((a, v) => a + v, 0) / R.length).toFixed(4), ...s, smoothRef: { tileDist: sm.tileDist, drawnDist: sm.drawnDist, noise5: sm.noise5, rule5: sm.rule5 },
  longAt: st.longAt.map(([k, x, y, n]) => [k, gx0 + x, gy0 + y, n]), stairsAt: st.stairsAt.map(([x, y, n, d]) => [gx0 + x, gy0 + y, n, d]), jogsAt: st.jogsAt.map(([x, y]) => [gx0 + x, gy0 + y]), ms: { build: tBuild, measure: Date.now() - t0 - tBuild } };
writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
console.log(JSON.stringify({ seed, model, south: s.south, rim: s.rim, side: s.side, noise5: s.noise5, rule5: s.rule5, stairs: [s.stairs, s.stairs1, s.stairs2], jogs: s.jogs, tile: s.tileDist, drawn: s.drawnDist, smooth: out.smoothRef, ms: out.ms }));
