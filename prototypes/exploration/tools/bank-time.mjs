// rupar-banks-7-2: one place cold in Node, from one checkout (tree), so the same place can be timed with the banks (this tree) and without (the land-reach-2 tree).
//   node bank-time.mjs <tree> <seed> <X> <Y> [runs]      (each run is a fresh process: run it once per sample; this prints one sample)
// The realm is made first and not counted. Prints JSON: the place's cold cellIR ms, then a second cell next to it.
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const [tree, seedS, XS, YS] = process.argv.slice(2), ROOT = path.resolve(tree), imp = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);
const { realm7 } = await imp('prototypes/exploration/src/gen7/region.mjs'), { cellIR } = await imp('prototypes/exploration/src/gen7/place.mjs');
const now = () => Number(process.hrtime.bigint() / 1000n) / 1000, seed = +seedS, X = +XS, Y = +YS;
realm7(seed);
// a distant cell first builds the seed's place context (not the place's own time), then the place, then its neighbour
let t = now(); cellIR(seed, X - 9, Y - 9); const ctx = now() - t;
t = now(); const ir = cellIR(seed, X, Y); const first = now() - t;
t = now(); cellIR(seed, X, Y + 1); const second = now() - t;
console.log(JSON.stringify({ tree: path.basename(ROOT), seed, cell: [X, Y], node: process.version, contextCellMs: +ctx.toFixed(0), placeMs: +first.toFixed(0), neighbourMs: +second.toFixed(0), banks: ir && ir.banks ? ir.banks.length : null }));
