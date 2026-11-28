// decor-mix-2: finds by kind per cell, one seed, the same hashed cells as gen7-places-check.mjs, cellIR taken from any checkout:
// node decor-mix-find.mjs <treeRoot> <cells> <seed>        (treeRoot: this checkout for "now", a place-decor-fix-1 checkout for "before")
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { realm7 } from '../src/gen7/region.mjs';
import { hash, L, MW, MH } from '../src/logic/world.mjs';
import { ATLAS } from '../src/logic/regions.mjs';

const [root, per, seedArg] = process.argv.slice(2), seed = +seedArg, N = +per;
const { cellIR } = await import(pathToFileURL(path.join(path.resolve(root), 'prototypes/exploration/src/gen7/place.mjs')).href);
const R = realm7(seed), cells = [];
for (let Y = 0; Y < MH * ATLAS; Y++) for (let X = 0; X < MW * ATLAS; X++) { const G = R.regions[Math.floor(Y / MH) * ATLAS + Math.floor(X / MW)], c = (Y % MH) * MW + (X % MW); if (G.land[c] !== L.WATER && !G.island[c]) cells.push([X, Y]); }
const pick = cells.map(c => ({ c, k: hash(seed, 'places-check', c[0], c[1]) })).sort((a, b) => a.k - b.k).slice(0, N).map(o => o.c);
const kinds = {};
for (const [X, Y] of pick) for (const f of cellIR(seed, X, Y).finds) kinds[f.kinds[0]] = (kinds[f.kinds[0]] || 0) + 1;
console.log(JSON.stringify({ seed, root: path.basename(path.resolve(root)), cells: pick.length, kinds }));
