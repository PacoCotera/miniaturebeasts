// rupar-banks-7-1: banks that lie in the home region (slot 2,2: cells 32-47 by 40-59) of each seed, so a walk can reach one.
//   node bank-home.mjs <seed from> <seed to>
import { realm7 } from '../src/gen7/region.mjs';
import { levelsOf, partBank, bankScan, CW, CH } from '../src/gen7/levels.mjs';
const [a, b] = process.argv.slice(2).map(Number);
for (let seed = a; seed <= b; seed++) {
  const R = realm7(seed), L = levelsOf(R.realm), out = [];
  for (const p of bankScan(L)) { if (p.big || p.n < 200) continue; const k = partBank(L, p); if (!k) continue; const X = Math.floor(k.x0 / CW), Y = Math.floor(k.lip / CH); if (X >= 32 && X < 48 && Y >= 40 && Y < 60) out.push(`${k.x0},${k.lip} cell ${X},${Y} part ${p.n}`); }
  console.log(`seed ${seed}: ${out.join(' | ') || '-'}`);
}
