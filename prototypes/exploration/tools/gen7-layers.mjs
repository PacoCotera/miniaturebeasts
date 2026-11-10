// Writes art/gen7/pairs.json: the dual grid's pair descriptors of the tile set generator 7 bakes with (places/src/setload.mjs dualPairs), which read the set's pictures and so run in Node only.
// The page bakes a cell in the browser (src/bake7.mjs) from this file and the tile set's .mbtiles. Run when the set changes:  node tools/gen7-pairs.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { bakeCtx } from './gen7-render.mjs';

const SET = 'ninja-test', ctx = bakeCtx();
const out = { set: SET, pairs: ctx.pairsOf.get(SET) };
mkdirSync(new URL('../art/gen7/', import.meta.url), { recursive: true });
writeFileSync(new URL('../art/gen7/pairs.json', import.meta.url), JSON.stringify(out) + '\n');
console.log('pairs', out.pairs.length);
