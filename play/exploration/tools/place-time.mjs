// One place, cold, in Node: the whole cellIR of a cell no one has opened (the realm is made first and not counted; the first call also builds the seed's place context), then three more cold cells.
//   node place-time.mjs [seed]
import { realm7 } from '../src/gen7/region.mjs';
import { cellIR } from '../src/gen7/place.mjs';
const seed = +(process.argv[2] || 7), now = () => Number(process.hrtime.bigint() / 1000n) / 1000;
realm7(seed);
const cells = [[40, 40], [44, 50], [30, 60], [50, 30]], out = [];
for (const [X, Y] of cells) { const t = now(); cellIR(seed, X, Y); out.push(+(now() - t).toFixed(0)); }
console.log(JSON.stringify({ seed, node: process.version, coldPlaceMs: out, note: 'first includes the place context' }));
