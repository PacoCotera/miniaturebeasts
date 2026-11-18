// rupar-banks-7-1: every raised part of the field, by the bank rule's verdict (big, small, stair, window, nosite, bank), for one seed.
//   node bank-scan.mjs <seed> [out.json]
import { writeFileSync } from 'node:fs';
import { realm7 } from '../src/gen7/region.mjs';
import { levelsOf, partBank, bankScan } from '../src/gen7/levels.mjs';

const seed = +process.argv[2], out = process.argv[3], t0 = Date.now();
const R = realm7(seed), L = levelsOf(R.realm);
const parts = bankScan(L), tally = {}, banks = [];
for (const p of parts) { const b = partBank(L, p), w = b ? 'bank' : p.why; tally[w] = (tally[w] || 0) + 1; if (b) banks.push({ x0: b.x0, lip: b.lip, n: p.n, box: [p.x0, p.y0, p.x1, p.y1] }); }
const big = parts.filter(p => p.n >= 200);
console.log(JSON.stringify({ seed, parts: parts.length, ms: Date.now() - t0, tally, banks: banks.length }));
for (const b of banks) console.log(`bank site ${b.x0},${b.lip} part ${b.n} tiles box ${b.box.join(',')}`);
for (const p of big.filter(p => !p.big && p.why !== 'stair' && p.why !== 'small').slice(0, 60)) console.log(`${p.why || 'bank'} ${p.n} box ${p.x0},${p.y0}-${p.x1},${p.y1}`);
if (out) writeFileSync(out, JSON.stringify({ seed, tally, banks }));
