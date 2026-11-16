// place-walk-1: the seam check of gen7-place-props.mjs on its sampled cells (every cell with (7 X + 13 Y) % 211 === 0), listing the cells that differ: node place-walk-seam.mjs <seed> [modulus]
import { realm7 } from '../src/gen7/region.mjs';
import { levelsOf, windowLevels, landRule, CW, CH } from '../src/gen7/levels.mjs';
import { RW, RH } from '../src/gen7/place.mjs';
const seed = +process.argv[2], mod = +(process.argv[3] || 211), LV = levelsOf(realm7(seed).realm), o = landRule().window;
let cells = 0, bad = 0;
for (let Y = 0; Y < RH; Y++) for (let X = 0; X < RW; X++) {
  if ((X * 7 + Y * 13) % mod !== 0) continue; cells++;
  const own = windowLevels(LV, X, Y); let n = 0; const where = [];
  for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [-1, 0], [0, -1], [-1, -1], [1, -1], [-1, 1]]) {
    if (X + dx < 0 || Y + dy < 0 || X + dx >= RW || Y + dy >= RH) continue;
    const nb = windowLevels(LV, X + dx, Y + dy);
    for (let y = o * CH; y < (o + 1) * CH; y++) for (let x = o * CW; x < (o + 1) * CW; x++) { const nx = x - dx * CW, ny = y - dy * CH; if (nx >= 0 && ny >= 0 && nx < nb.W && ny < nb.H && own.R[y * own.W + x] !== nb.R[ny * nb.W + nx]) { n++; if (where.length < 3) where.push([X * CW + x - o * CW, Y * CH + y - o * CH, dx, dy]); } }
  }
  if (n) { bad += n; console.log(`cell ${X},${Y}: ${n} tiles differ, e.g. ${JSON.stringify(where)}`); }
}
console.log(`seed ${seed}: ${cells} cells, ${bad} tiles differ`);
