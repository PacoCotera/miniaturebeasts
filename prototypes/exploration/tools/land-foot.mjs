// land-b3d-face3-1: foot room (a raised tile within faceRows + 1 rows under a south lip) in the cells' own tiles, read across cell borders:
//   node land-foot.mjs <seed> <X0> <Y0> <X1> <Y1>   -> the number of lips short of room and where
import { realm7 } from '../src/gen7/region.mjs';
import { levelsOf, tileLevel, landRule, CW, CH } from '../src/gen7/levels.mjs';
const [seed, X0, Y0, X1, Y1] = process.argv.slice(2).map(Number), L = levelsOf(realm7(seed).realm), fr = landRule().faceRows, R = (x, y) => tileLevel(L, x, y) > 0 ? 1 : 0; let n = 0; const at = [];
for (let y = Y0 * CH; y < (Y1 + 1) * CH; y++) for (let x = X0 * CW; x < (X1 + 1) * CW; x++) {
  if (!(R(x, y) && !R(x, y + 1))) continue;
  for (let k = 2; k <= fr + 1; k++) if (R(x, y + k)) { n++; at.push(`${x},${y},k${k}`); break; }
}
console.log(JSON.stringify({ seed, short: n, at }));
