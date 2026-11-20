// map-levels-build-2: ascii of the final window raster:  node land-dump.mjs <seed> <window cell x> <window cell y> <nx> <ny> <x0> <y0> <w> <h>   (x0.. in tiles inside the stitched block)
import { realm7 } from '../src/gen7/region.mjs';
import { levelsOf, windowLevels, CW, CH } from '../src/gen7/levels.mjs';
const [seed, AX, AY, nx, ny, x0, y0, w0, h0] = process.argv.slice(2).map(Number);
const L = levelsOf(realm7(seed).realm), o = L.rule.window, w = nx * CW, h = ny * CH, R = new Uint8Array(w * h);
for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const win = windowLevels(L, AX + i, AY + j); for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CW; tx++) R[(j * CH + ty) * w + i * CW + tx] = win.R[(o * CH + ty) * win.W + o * CW + tx]; }
for (let y = y0; y < y0 + h0; y++) { let s = String(y).padStart(4) + ' '; for (let x = x0; x < x0 + w0; x++) s += R[y * w + x] ? '#' : '.'; console.log(s); }
