// map-levels-build-2: the longest straight south / side / rim run over several seeds and windows of 4 x 3 cells, from the places' own windows (as land-runs.mjs)
//   node land-runs-many.mjs [--seeds 1,2,3] [--cells 4x3] [--at 36,44]   prints per seed the longest of each kind and the count over the caps (south 12, side 12, rim 16)
import { realm7 } from '../src/gen7/region.mjs';
import { levelsOf, windowLevels, CW, CH } from '../src/gen7/levels.mjs';
const args = process.argv.slice(2), opt = (n, d) => { const i = args.indexOf('--' + n); return i < 0 ? d : args[i + 1]; };
const SEEDS = String(opt('seeds', '1,2,3,4,5,6,7,38,13,42')).split(',').map(Number), [nx, ny] = String(opt('cells', '8x6')).split('x').map(Number), [AX, AY] = String(opt('at', '36,44')).split(',').map(Number);
const CAP = { south: 12, side: 12, rim: 16 };
for (const seed of SEEDS) {
  const L = levelsOf(realm7(seed).realm), o = L.rule.window, w = nx * CW, h = ny * CH, R = new Uint8Array(w * h);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const win = windowLevels(L, AX + i, AY + j); for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CW; tx++) R[(j * CH + ty) * w + i * CW + tx] = win.R[(o * CH + ty) * win.W + o * CW + tx] > 0 ? 1 : 0; }
  const g = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : R[y * w + x]);
  const kinds = [['south', true, (x, y) => g(x, y) && !g(x, y + 1)], ['rim', true, (x, y) => g(x, y) && !g(x, y - 1)], ['side', false, (x, y) => g(x, y) && !g(x - 1, y)], ['side', false, (x, y) => g(x, y) && !g(x + 1, y)]];
  const best = { south: 0, side: 0, rim: 0 }, over = { south: 0, side: 0, rim: 0 }; let raised = 0; for (let i = 0; i < w * h; i++) raised += R[i];
  for (const [k, alongX, is] of kinds) for (let l = 1; l < (alongX ? h : w) - 1; l++) { let n = 0;
    for (let t = 0; t <= (alongX ? w : h); t++) { const on = t < (alongX ? w : h) && (alongX ? is(t, l) : is(l, t)); if (on) n++; else { if (n > best[k]) best[k] = n; if (n > CAP[k]) { over[k]++; if (args.includes('--where')) console.log(`  ${k} line ${l} from ${t - n} to ${t - 1}  (world ${alongX ? AX * CW + t - n : AX * CW + l},${alongX ? AY * CH + l : AY * CH + t - n})`); } n = 0; } } }
  console.log(`seed ${seed} raised ${(raised / (w * h)).toFixed(3)} longest south ${best.south} side ${best.side} rim ${best.rim}; over cap ${over.south}/${over.side}/${over.rim}`);
}
