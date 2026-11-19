// rupar-banks-speed-1: every bank of a seed, the new verdict beside the one it replaced (src/gen7/levels-old.mjs, a copy of the base's levels.mjs: put it there, never commit it).
//   node bank-equal.mjs <seed> ...   prints per seed: parts asked, banks new/old, differences
import { realm7 } from '../src/gen7/region.mjs';
import * as N from '../src/gen7/levels.mjs';
import * as O from '../src/gen7/levels-old.mjs';
for (const seed of process.argv.slice(2).map(Number)) {
  const R = realm7(seed).realm, out = {};
  for (const [name, M] of [['new', N], ['old', O]]) {
    const L = M.levelsOf({ ...R }); for (const s of L.stairs.values()) M.findWayup(L, s.X, s.Y, s.port);
    const t = Date.now(), banks = [];
    for (const p of M.bankScan(L)) { if (p.big || p.n < M.BANK_PART) continue; const b = M.partBank(L, p); if (b) banks.push(`${b.x0},${b.lip},${b.loose ? 1 : 0},${b.n}`); }
    out[name] = { banks: banks.sort(), ms: Date.now() - t, why: L.bkd.why };
  }
  const a = new Set(out.new.banks), b = new Set(out.old.banks);
  console.log(seed, 'banks new', a.size, 'old', b.size, 'only new', [...a].filter(x => !b.has(x)).join(' ') || '-', 'only old', [...b].filter(x => !a.has(x)).join(' ') || '-', 'ms', out.new.ms, out.old.ms, 'why new', JSON.stringify(out.new.why), 'old', JSON.stringify(out.old.why));
}
