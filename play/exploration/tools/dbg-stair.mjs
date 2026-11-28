// land-b3c: one stair's site and the raster round it (# raised, . low, ~ water, X raised on water)
//   node dbg-stair.mjs <seed> <cellX> <cellY>
import { realm7 } from '../src/gen7/region.mjs';
import { levelsOf, findWayup, tileLevel, wetCell, CW, CH } from '../src/gen7/levels.mjs';
const [seed, X, Y] = process.argv.slice(2).map(Number), L = levelsOf(realm7(seed).realm), st = L.stairs.get(X * 1000 + Y);
const wu = findWayup(L, X, Y, st.port); console.log(JSON.stringify({ st, wu }));
for (let y = st.lip - 9; y <= st.lip + 6; y++) { let s = String(y).padStart(5) + ' ';
  for (let x = st.x0 - 4; x < st.x0 + 10; x++) { const cx = Math.floor(x / CW), cy = Math.floor(y / CH), w = wetCell(L, cx, cy)[(y - cy * CH) * CW + x - cx * CW]; s += (x >= st.x0 && x < st.x0 + 6 && y === st.lip ? (w ? 'x' : tileLevel(L, x, y) ? 'L' : 'l') : w ? (tileLevel(L, x, y) ? 'X' : '~') : tileLevel(L, x, y) ? '#' : '.'); }
  console.log(s); }
