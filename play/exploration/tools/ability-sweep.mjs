// Sweep of the partner abilities' ground (L2c): how many worlds hold soft ground (wades, scree) and earth banks that open something.
// node tools/ability-sweep.mjs [seeds per biome per generator, default 100]
// Per biome and generator 2 to 4 (generators 2 and 3 have the mixed ground only): the share of worlds with at least one soft feature (target 8 in 10 over generators 2 to 4),
// and the share with a bank that opens a pocket (2 or more cells outside G.comp) or a shortcut of 6 steps or more (target 7 in 10 for mixed, downs, woods, thickets, tallwood).
import { genWorld, ALL_BIOMES, softGround, bankEdges, canStepIn, SOFT, MW, MH, DIRS, edgeIndex } from '../src/world.mjs';

const N = +process.argv[2] || 100, NC = MW * MH, D4 = Object.keys(DIRS);
const stepCell = (c, dir) => { const x = c % MW + DIRS[dir][0], y = ((c / MW) | 0) + DIRS[dir][1]; return x < 0 || y < 0 || x >= MW || y >= MH ? -1 : y * MW + x; };
function flood(G, src, opts) {
  const dist = new Int16Array(NC).fill(-1), q = [src]; dist[src] = 0;
  for (let h = 0; h < q.length; h++) { const c = q[h];
    for (const dir of D4) { const d = stepCell(c, dir); if (d < 0 || dist[d] >= 0 || G.island[d] || !canStepIn(G, c, dir, opts)) continue; dist[d] = dist[c] + 1; q.push(d); } }
  return dist;
}
// does the world have a bank that opens a pocket or a shortcut? (banks one at a time: each bank edge alone, crossed in the open graph)
function bankOpens(G, banks) {
  for (let i = 0; i < 2 * NC; i++) {
    if (!banks[i]) continue;
    const a = i >> 1, b = i & 1 ? a + MW : a + 1, da = flood(G, a);
    if (da[b] >= 0) { if (da[b] >= SOFT.SHORTCUT_MIN) return true; continue; }
    if (!!G.comp[a] === !!G.comp[b]) continue;
    const f = G.comp[a] ? flood(G, b) : da; let n = 0; for (let c = 0; c < NC; c++) if (f[c] >= 0 && !G.comp[c]) n++;
    if (n >= SOFT.POCKET_MIN) return true;
  }
  return false;
}
const rows = [];
for (const biome of ALL_BIOMES) for (const gen of [2, 3, 4]) {
  if (gen < 4 && biome !== 'mixed') continue;
  let worlds = 0, soft = 0, bank = 0, wades = 0, scree = 0;
  for (let s = 1; s <= N; s++) {
    let G; try { G = genWorld(s * 7919 + 13, gen, biome); } catch (e) { continue; }
    worlds++;
    const sg = softGround(G, s * 7919 + 13), nw = sg.wade.reduce((a, b) => a + b, 0), ns = sg.scree.reduce((a, b) => a + b, 0);
    wades += nw; scree += ns; if (nw + ns) soft++;
    if (bankOpens(G, bankEdges(G, s * 7919 + 13))) bank++;
  }
  rows.push({ biome, gen, worlds, soft: Math.round(100 * soft / worlds), bank: Math.round(100 * bank / worlds), wades: +(wades / worlds).toFixed(2), scree: +(scree / worlds).toFixed(2) });
}
console.log('biome      gen  worlds  soft%  bank-opens%  wades/world  scree/world');
for (const r of rows) console.log(r.biome.padEnd(10), String(r.gen).padEnd(4), String(r.worlds).padEnd(7), String(r.soft).padEnd(6), String(r.bank).padEnd(12), String(r.wades).padEnd(12), r.scree);
const all = rows.reduce((a, r) => ({ w: a.w + r.worlds, s: a.s + r.worlds * r.soft / 100 }), { w: 0, s: 0 });
console.log('SHORTCUT_MIN', SOFT.SHORTCUT_MIN, '· soft share over all rows', Math.round(100 * all.s / all.w) + '%');
