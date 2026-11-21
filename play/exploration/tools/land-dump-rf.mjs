// map-levels-build-2: ascii of the raw terrace field (rfAt):  node land-dump-rf.mjs <seed> <world x0> <world y0> <w> <h>
import { realm7 } from '../src/gen7/region.mjs';
import { levelsOf, bankDebug } from '../src/gen7/levels.mjs';
const [seed, x0, y0, w0, h0] = process.argv.slice(2).map(Number);
const L = levelsOf(realm7(seed).realm);
for (let y = y0; y < y0 + h0; y++) { let s = String(y).padStart(5) + ' '; for (let x = x0; x < x0 + w0; x++) s += bankDebug.rfAt(L, x, y) ? '#' : '.'; console.log(s); }
