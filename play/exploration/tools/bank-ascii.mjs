// rupar-banks-7-1: the land round a bank site as text (# raised, . low, B the bank's two way-up columns), banks on.
//   node bank-ascii.mjs <seed> <gx> <gy> [halfwidth] [halfheight]
import { realm7 } from '../src/gen7/region.mjs';
import { levelsOf, tileLevel, bankWayups, CW, CH } from '../src/gen7/levels.mjs';
const [seed, gx, gy, hw = 18, hh = 14] = process.argv.slice(2).map(Number), X = Math.floor(gx / CW), Y = Math.floor(gy / CH);
const L = levelsOf(realm7(seed).realm), banks = [];
for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) for (const b of bankWayups(L, X + dx, Y + dy)) if (!banks.some(a => a.x === b.x && a.y === b.y)) banks.push(b);
console.log('banks', JSON.stringify(banks));
for (let y = gy - hh; y <= gy + hh; y++) { let s = String(y).padStart(5) + ' '; for (let x = gx - hw; x <= gx + hw; x++) s += banks.some(b => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + 4) ? 'B' : tileLevel(L, x, y) ? '#' : '.'; console.log(s); }
