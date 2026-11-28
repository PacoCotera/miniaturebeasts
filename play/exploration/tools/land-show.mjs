// land-b3d-face3-1: the raised/low raster round a world tile: node land-show.mjs <seed> <gx> <gy> [r]   ('#' raised, '.' low, 'X' the tile, '|' cell borders marked by a column/row of digits)
import { realm7 } from '../src/gen7/region.mjs';
import { levelsOf, tileLevel, CW, CH } from '../src/gen7/levels.mjs';
const [seed, gx, gy, rr] = process.argv.slice(2), R = +(rr || 8), L = levelsOf(realm7(+seed).realm);
for (let y = +gy - R; y <= +gy + R; y++) { let s = ''; for (let x = +gx - R; x <= +gx + R; x++) s += x === +gx && y === +gy ? 'X' : tileLevel(L, x, y) > 0 ? '#' : '.'; console.log(String(y).padStart(5) + (y % CH === 0 ? '-' : ' ') + s); }
console.log('cell x of first column', Math.floor((+gx - R) / CW), 'col starts', (+gx - R) % CW);
