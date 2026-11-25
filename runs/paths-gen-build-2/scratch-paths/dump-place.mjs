// usage: node dump-place.mjs <seed> <lx> <ly> [outfile]  -> JSON of the home region's place (lx, ly): terrain (cell's own 24x28 tiles), keepers (if this tree has them), the keepers' kind
// the same file in main (before) and in the branch (after); stills.py draws them side by side.
import { cellTerrain, TV, CW, CH } from '../../src/gen7/place.mjs';
import { MW, MH } from '../../src/world.mjs';
import { CENTER } from '../../src/regions.mjs';
import fs from 'node:fs';
const [seed, lx, ly] = process.argv.slice(2, 5).map(Number), out = process.argv[5], [ax, ay] = CENTER, X = ax * MW + lx, Y = ay * MH + ly;
const c = cellTerrain(seed, X, Y), W = c.w, rows = [];
for (let y = 1; y <= CH; y++) { const r = []; for (let x = 1; x <= CW; x++) { const k = y * W + x; r.push(c.terrain[k] === TV.CLIFF && c.top[k] === TV.PATHTOP ? TV.PATH : c.terrain[k]); } rows.push(r); }
let kind = null, keepers = null;
try { const K = await import('../../src/gen7/keepers.mjs'), P = await import('../../src/gen7/places.mjs'); kind = K.keeperKindAt(seed, X, Y); const p = P.planOf(seed, X, Y); keepers = p && p.keepers ? p.keepers : null; } catch { /* a tree without keepers */ }
const j = JSON.stringify({ seed, lx, ly, X, Y, rows, kind, keepers });
if (out) fs.writeFileSync(out, j); else console.log(j);
