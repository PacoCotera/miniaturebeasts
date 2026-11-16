// rupar-banks-7-1: why a part has no bank site: its south-face runs and the first test each site candidate fails.
//   node bank-why.mjs <seed> <gx> <gy>   (a tile of the raised part)
import { realm7 } from '../src/gen7/region.mjs';
import { levelsOf, bankDebug as D, CW, CH } from '../src/gen7/levels.mjs';
const [seed, gx, gy] = process.argv.slice(2).map(Number);
const R = realm7(seed), L = levelsOf(R.realm), p = D.partAt(L, gx, gy);
if (!p) { console.log('low field there'); process.exit(); }
console.log(`part ${p.n} tiles box ${p.x0},${p.y0}-${p.x1},${p.y1} big ${p.big}`);
const runs = D.partRuns(L, p); console.log('runs', runs.slice(0, 12).map(r => `${r.x0},${r.y}x${r.n}`).join(' '));
// per candidate the rows that fail: raised above / low below / held / wet
for (const run of runs.slice(0, 6)) { const base = run.x0 + ((run.n - 2) >> 1) - 2;
  for (const ly of [run.y]) for (const x0 of [base, base - 1, base + 1]) {
    const bad = [];
    for (let c = x0; c < x0 + 6; c++) { const e = c === x0 + 2 || c === x0 + 3 ? 0 : 1; const up = []; for (let r = ly - 6; r <= ly - e; r++) if (!D.rfAt(L, c, r)) up.push(r - ly); const dn = []; for (let r = ly + 1 + e; r <= ly + 7; r++) if (D.rfAt(L, c, r)) dn.push(r - ly); if (up.length || dn.length) bad.push(`c${c - x0}:up${up.join('/')}dn${dn.join('/')}`); }
    console.log(`run ${run.x0},${run.y}x${run.n} cand x0 ${x0} ly ${ly}: ${D.bankSiteAt(L, x0, ly) ? 'OK' : 'fail'} raisable ${D.raisableSite(L, x0, ly)} ${bad.join(' ')}`); } }
