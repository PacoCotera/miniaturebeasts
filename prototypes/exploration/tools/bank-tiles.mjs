// rupar-banks-speed-1: the tiles of the windows, new verdict beside the old (src/gen7/levels-old.mjs, a copy of the base's levels.mjs; never committed): the cells round every bank and a spread of 40 inland cells.
//   node bank-tiles.mjs <seed> ...   prints per seed: cells compared, cells that differ
import { realm7 } from '../src/gen7/region.mjs';
import * as N from '../src/gen7/levels.mjs';
import * as O from '../src/gen7/levels-old.mjs';
const dig = w => { let h = 2166136261; for (let i = 0; i < w.R.length; i++) { h ^= w.R[i]; h = Math.imul(h, 16777619) >>> 0; } for (const s of w.info.sites) { h ^= (s.x * 7 + s.y * 13 + (s.bank ? 1 : 0)) >>> 0; h = Math.imul(h, 16777619) >>> 0; } return h; };
for (const seed of process.argv.slice(2).map(Number)) {
  const R = realm7(seed).realm, Ln = N.levelsOf({ ...R }), Lo = O.levelsOf({ ...R });
  for (const [M, L] of [[N, Ln], [O, Lo]]) for (const s of L.stairs.values()) M.findWayup(L, s.X, s.Y, s.port);
  const banks = []; for (const p of N.bankScan(Ln)) { if (p.big || p.n < N.BANK_PART) continue; const b = N.partBank(Ln, p); if (b) banks.push(b); }
  const cells = new Map(), add = (X, Y) => { if (X >= 0 && Y >= 0 && X < 80 && Y < 100) cells.set(X * 1000 + Y, [X, Y]); };
  for (const b of banks) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) add(Math.floor(b.x0 / 24) + dx, Math.floor(b.lip / 28) + dy);
  for (let i = 0; i < 40; i++) add(14 + ((i * 7) % 52), 14 + ((i * 13) % 72));
  let diff = 0; const bad = [];
  for (const [X, Y] of cells.values()) { const a = dig(N.windowLevels(Ln, X, Y)), b = dig(O.windowLevels(Lo, X, Y)); if (a !== b) { diff++; bad.push(`${X},${Y}`); } }
  console.log(seed, 'banks', banks.length, 'cells compared', cells.size, 'differ', diff, bad.slice(0, 8).join(' '));
}
