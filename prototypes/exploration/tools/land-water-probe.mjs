// land-b3d-face3-1: how close does raised land come to water? node land-water-probe.mjs <seed>: the shortest tile gap between a south lip tile and a wet tile, over the cells beside water
import { realm7 } from '../src/gen7/region.mjs';
import { levelsOf, tileLevel, wetCell, CW, CH } from '../src/gen7/levels.mjs';
import { RW, RH } from '../src/gen7/world.mjs';
import { L as LAND } from '../src/logic/world.mjs';
const seed = +process.argv[2], L = levelsOf(realm7(seed).realm), re = L.realm; let best = 99, at = null, cells = 0, wetCells = 0;
const wet = (x, y) => { const cx = Math.floor(x / CW), cy = Math.floor(y / CH); return !!wetCell(L, cx, cy)[(y - cy * CH) * CW + x - cx * CW]; };
for (let Y = 3; Y < RH - 3; Y++) for (let X = 3; X < RW - 3; X++) { const c = Y * RW + X; if (re.land[c] === LAND.WATER) continue;
  if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => re.land[(Y + dy) * RW + X + dx] === LAND.WATER)) continue; cells++;
  for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CW; tx++) { const x = X * CW + tx, y = Y * CH + ty; if (!(tileLevel(L, x, y) > 0 && tileLevel(L, x, y + 1) === 0)) continue;
    for (let d = 1; d < best; d++) { let hit = false; for (let dy = -d; dy <= d && !hit; dy++) for (let dx = -d; dx <= d; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === d && wet(x + dx, y + dy)) { hit = true; break; } if (hit) { best = d; at = [x, y]; break; } } } }
console.log(JSON.stringify({ seed, cellsBesideWater: cells, nearestLipToWater: best, at }));
