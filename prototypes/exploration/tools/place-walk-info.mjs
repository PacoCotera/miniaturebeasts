// place-walk-1: what the land pipeline did in one cell's window: node place-walk-info.mjs <seed> X,Y
import { realm7 } from '../src/gen7/region.mjs';
import { levelsOf, windowLevels } from '../src/gen7/levels.mjs';
const seed = +process.argv[2], [X, Y] = process.argv[3].split(',').map(Number), L = levelsOf(realm7(seed).realm), w = windowLevels(L, X, Y);
console.log(JSON.stringify({ necks: w.info.necks, deferred: w.info.deferred, pockets: w.info.pockets, pk: w.info.pk, filled: w.info.filled, pocketStairs: w.info.pocketStairs, islets: w.info.islets }));
