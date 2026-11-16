// debug: node land-foot-dbg.mjs <seed> <X> <Y> <gx> <gy>: the window raster round a tile and what fixFoot did
import { realm7 } from '../src/gen7/region.mjs';
import { levelsOf, windowLevels, CW, CH } from '../src/gen7/levels.mjs';
const [seed, X, Y, gx, gy] = process.argv.slice(2).map(Number), L = levelsOf(realm7(seed).realm), w = windowLevels(L, X, Y), o = L.rule.window, x0 = (X - o) * CW, y0 = (Y - o) * CH;
console.log(JSON.stringify({ footFixed: w.info.footFixed, leftFixed: w.info.leftFixed, sites: w.info.sites.length, squaresLeft: w.info.squaresLeft }));
for (let y = gy - 8; y <= gy + 10; y++) { let s = ''; for (let x = gx - 9; x <= gx + 9; x++) s += w.R[(y - y0) * w.W + x - x0] > 0 ? '#' : '.'; console.log(String(y).padStart(5), s); }
