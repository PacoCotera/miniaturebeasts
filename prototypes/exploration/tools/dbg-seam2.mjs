// land-b3c: the cells of the place test's seam sample ((X * 7 + Y * 13) % 211 === 0) whose tiles differ between their own window and a neighbour's; prints the tiles
//   node dbg-seam2.mjs <seed>
import { realm7 } from '../src/gen7/region.mjs';
import { levelsOf, windowLevels, landRule, CW, CH } from '../src/gen7/levels.mjs';
import { RW, RH } from '../src/gen7/world.mjs';
globalThis.B3C_DBG = 1;
const seed = +process.argv[2], L = levelsOf(realm7(seed).realm), o = landRule().window;
for (let Y = 0; Y < RH; Y++) for (let X = 0; X < RW; X++) {
  if ((X * 7 + Y * 13) % 211 !== 0) continue;
  const own = windowLevels(L, X, Y), out = [];
  for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [-1, 0], [0, -1], [-1, -1], [1, -1], [-1, 1]]) {
    if (X + dx < 0 || Y + dy < 0 || X + dx >= RW || Y + dy >= RH) continue;
    const nb = windowLevels(L, X + dx, Y + dy);
    for (let y = o * CH; y < (o + 1) * CH; y++) for (let x = o * CW; x < (o + 1) * CW; x++) { const nx = x - dx * CW, ny = y - dy * CH; if (nx >= 0 && ny >= 0 && nx < nb.W && ny < nb.H && own.R[y * own.W + x] !== nb.R[ny * nb.W + nx]) out.push(`vs ${X + dx},${Y + dy} tile ${X * CW + x - o * CW},${Y * CH + y - o * CH}`); }
  }
  if (out.length) console.log(`cell ${X},${Y}: ${out.join('; ')}`);
}
console.log('done');
