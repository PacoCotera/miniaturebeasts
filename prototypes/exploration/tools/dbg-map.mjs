// land-b3c: print the raster of a world-tile box: # raised, . low, ~ water (wet flag), ford cell water ≈
//   node dbg-map.mjs <seed> <gx0> <gy0> <gx1> <gy1>
import { realm7 } from '../src/gen7/region.mjs';
import { levelsOf, tileLevel, wetCell, CW, CH } from '../src/gen7/levels.mjs';
const [seed, x0, y0, x1, y1, STEP = 1] = process.argv.slice(2).map(Number), L = levelsOf(realm7(seed).realm);
for (let y = y0; y <= y1; y += STEP) { let s = String(y).padStart(4) + ' ';
  for (let x = x0; x <= x1; x += STEP) { const X = Math.floor(x / CW), Y = Math.floor(y / CH), w = wetCell(L, X, Y)[(y - Y * CH) * CW + x - X * CW]; s += w ? (tileLevel(L, x, y) ? 'X' : '~') : tileLevel(L, x, y) ? '#' : '.'; }
  console.log(s); }
