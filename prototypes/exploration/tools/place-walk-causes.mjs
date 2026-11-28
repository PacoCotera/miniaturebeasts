// place-walk-1: what the place test counts as unreached, by cause, and whether a neighbouring region reaches it.
//   node place-walk-causes.mjs <seed> <cacheDir> [--label x]
// Stitches the whole realm (cached in <cacheDir>), then: (A) the test's own count (per region, from the region's start, the region's edge read as a lip), (B) the same flood on the whole realm
// from every region's start (the true lip across region borders), and for each part left in B the cause of its wall: the thinnest stretch of thicket that cuts it from reached ground (tiles),
// or the cliff / water that walls it. Prints one JSON line per seed and a table.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { cellTerrain, TV, CW, CH, RW, RH } from '../src/gen7/place.mjs';
import { genRegion7 } from '../src/gen7/region.mjs';
import { MW, MH } from '../src/logic/world.mjs';

const NB4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const seed = +process.argv[2], dir = process.argv[3], SW = MW * CW, SH = MH * CH, WW = RW * CW, WH = RH * CH;
const file = `${dir}/stitch-${seed}.bin`, wfile = `${dir}/wayups-${seed}.json`;
let T, wayups;
if (existsSync(file)) { T = new Uint8Array(readFileSync(file)); wayups = JSON.parse(readFileSync(wfile, 'utf8')); } else {
  T = new Uint8Array(WW * WH); const seen = new Set(); wayups = [];
  for (let Y = 0; Y < RH; Y++) for (let X = 0; X < RW; X++) {
    const c = cellTerrain(seed, X, Y);
    for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) T[(Y * CH + y) * WW + X * CW + x] = c.terrain[(y + 1) * c.w + x + 1];
    for (const a of c.wayups) { const k = a.x + ',' + a.y; if (!seen.has(k)) { seen.add(k); wayups.push(a); } }
  }
  writeFileSync(file, T); writeFileSync(wfile, JSON.stringify(wayups));
}
const wu = new Uint8Array(WW * WH); for (const a of wayups) for (let y = a.y; y < a.y + a.h; y++) for (let x = a.x; x < a.x + a.w; x++) if (x >= 0 && y >= 0 && x < WW && y < WH) wu[y * WW + x] = 1;
const regions = [];
for (let ay = 0; ay < RH / MH; ay++) for (let ax = 0; ax < RW / MW; ax++) regions.push({ ax, ay, G: genRegion7(seed, ax, ay) });
const at = (x, y) => (x < 0 || y < 0 || x >= WW || y >= WH ? TV.THICKET : T[y * WW + x]);
const isLipWorld = (x, y) => at(x, y) === TV.CLIFF && NB4.some(([dx, dy]) => at(x + dx, y + dy) !== TV.CLIFF);
// the region's own view (the test): outside the region reads "not raised"
const regionOf = (x, y) => regions[Math.floor(y / SH) * (RW / MW) + Math.floor(x / SW)];
const isLipRegion = (x, y) => { const ax = Math.floor(x / SW), ay = Math.floor(y / SH); return at(x, y) === TV.CLIFF && NB4.some(([dx, dy]) => { const a = x + dx, b = y + dy; return Math.floor(a / SW) !== ax || Math.floor(b / SH) !== ay || a < 0 || b < 0 || a >= WW || b >= WH ? true : at(a, b) !== TV.CLIFF; }); };
const fordAt = (x, y) => regionOf(x, y).G.ford[(Math.floor((y % SH) / CH)) * MW + Math.floor((x % SW) / CW)];
const passWith = lip => (x, y) => { const v = at(x, y); return !((v === TV.WATER && !fordAt(x, y)) || v === TV.THICKET || v === TV.DEEP || (v === TV.CLIFF && lip(x, y) && !wu[y * WW + x])); };
const passR = passWith(isLipRegion), passW = passWith(isLipWorld);
const startOf = (R, pass) => { const sp = R.G.spawns[0], sx = R.ax * SW + (sp % MW) * CW + CW / 2, sy = R.ay * SH + ((sp / MW) | 0) * CH + CH / 2;
  for (let r = 0; r < 12; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === r && pass(sx + dx, sy + dy)) return [sx + dx, sy + dy]; return null; };
// A: per region
const seenA = new Uint8Array(WW * WH); let walkTot = 0, unA = 0;
for (const R of regions) {
  const x0 = R.ax * SW, y0 = R.ay * SH, st = startOf(R, (x, y) => passR(x, y)); if (!st) continue; const q = [st[1] * WW + st[0]]; seenA[q[0]] = 1;
  for (let k = 0; k < q.length; k++) for (const [dx, dy] of NB4) { const x = (q[k] % WW) + dx, y = ((q[k] / WW) | 0) + dy; if (x < x0 || y < y0 || x >= x0 + SW || y >= y0 + SH || seenA[y * WW + x] || !passR(x, y)) continue; seenA[y * WW + x] = 1; q.push(y * WW + x); }
}
for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) if (passR(x, y)) { walkTot++; if (!seenA[y * WW + x]) unA++; }
// B: whole realm, every region's start a source
const seenB = new Uint8Array(WW * WH), qB = [];
for (const R of regions) { const st = startOf(R, (x, y) => passW(x, y)); if (st && !seenB[st[1] * WW + st[0]]) { seenB[st[1] * WW + st[0]] = 1; qB.push(st[1] * WW + st[0]); } }
for (let k = 0; k < qB.length; k++) for (const [dx, dy] of NB4) { const x = (qB[k] % WW) + dx, y = ((qB[k] / WW) | 0) + dy; if (x < 0 || y < 0 || x >= WW || y >= WH || seenB[y * WW + x] || !passW(x, y)) continue; seenB[y * WW + x] = 1; qB.push(y * WW + x); }
let walkW = 0, unB = 0, unBoth = 0; for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) if (passW(x, y)) { walkW++; if (!seenB[y * WW + x]) { unB++; } }
for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) if (passR(x, y) && !seenA[y * WW + x] && passW(x, y) && !seenB[y * WW + x]) unBoth++;
// per region: the walkable tiles, the tiles the region's own flood leaves, how many of those the realm flood reaches (through a neighbour), and how many the region's tile-lip reading alone blocks at its border
const regTable = [];
for (const R of regions) { const x0 = R.ax * SW, y0 = R.ay * SH; let walk = 0, un = 0, viaNeighbour = 0, edgeLip = 0;
  for (let y = y0; y < y0 + SH; y++) for (let x = x0; x < x0 + SW; x++) { const pr = passR(x, y), pw = passW(x, y); if (pw && !pr) edgeLip++; if (!pr) continue; walk++; if (!seenA[y * WW + x]) { un++; if (seenB[y * WW + x]) viaNeighbour++; } }
  const st = startOf(R, passR); regTable.push({ region: R.ax + ',' + R.ay, walk, unreached: un, viaNeighbour, edgeLipTiles: edgeLip, startInRealmMain: st ? !!seenB[st[1] * WW + st[0]] : null }); }
// C: whole realm from the home region's start only (what a player who begins there can reach)
const seenC = new Uint8Array(WW * WH), qC = [], home = regions.find(R => R.ax === 2 && R.ay === 2), hs = startOf(home, passW);
if (hs) { seenC[hs[1] * WW + hs[0]] = 1; qC.push(hs[1] * WW + hs[0]); }
for (let k = 0; k < qC.length; k++) for (const [dx, dy] of NB4) { const x = (qC[k] % WW) + dx, y = ((qC[k] / WW) | 0) + dy; if (x < 0 || y < 0 || x >= WW || y >= WH || seenC[y * WW + x] || !passW(x, y)) continue; seenC[y * WW + x] = 1; qC.push(y * WW + x); }
let unC = 0; for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) if (passW(x, y) && !seenC[y * WW + x]) unC++;
// the trails and the set pieces on unreached ground (the test's pathUnreached and piecesUnreached), under each view
const need = (seen, pass) => { let path = 0, pieces = 0, pieceAll = 0;
  for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) if (T[y * WW + x] === TV.PATH && !seen[y * WW + x]) path++;
  for (const R of regions) { const G = R.G; for (const c of [...G.spawns, ...G.glow, G.gate, G.deep, G.swim, ...G.beacons.set, ...G.depots.set].filter(c => c >= 0)) { const x = R.ax * SW + (c % MW) * CW + (CW >> 1), y = R.ay * SH + ((c / MW) | 0) * CH + (CH >> 1); pieceAll++; if (pass(x, y) && !seen[y * WW + x]) pieces++; } }
  return { pathUnreached: path, piecesUnreached: pieces, pieces: pieceAll }; };
const needA = need(seenA, passR), needB = need(seenB, passW), needC = need(seenC, passW);
// causes of the parts left in B
const lab = new Int32Array(WW * WH).fill(-1), parts = [];
for (let s = 0; s < WW * WH; s++) { if (lab[s] >= 0 || seenB[s] || !passW(s % WW, (s / WW) | 0)) continue;
  const id = parts.length, P = { n: 0, up: 0, x0: 1e9, y0: 1e9, x1: -1, y1: -1, water: 0, thicket: 0, lip: 0, edge: 0, tiles: [] }, q = [s]; lab[s] = id;
  for (let k = 0; k < q.length; k++) { const x = q[k] % WW, y = (q[k] / WW) | 0; P.n++; if (at(x, y) === TV.CLIFF) P.up++; P.tiles.push(q[k]); P.x0 = Math.min(P.x0, x); P.x1 = Math.max(P.x1, x); P.y0 = Math.min(P.y0, y); P.y1 = Math.max(P.y1, y);
    for (const [dx, dy] of NB4) { const a = x + dx, b = y + dy; if (a < 0 || b < 0 || a >= WW || b >= WH) { P.edge++; continue; } const m = b * WW + a;
      if (passW(a, b)) { if (lab[m] < 0) { lab[m] = id; q.push(m); } } else { const v = at(a, b); if (v === TV.WATER || v === TV.DEEP) P.water++; else if (v === TV.THICKET) P.thicket++; else P.lip++; } } }
  parts.push(P); }
parts.sort((a, b) => b.n - a.n);
// the thinnest way out: 0-1 BFS from the part through blocking tiles (thicket cost 1, a lip or water tile cost 1000, deep water, the map's end never) to a reached tile; the cost is "tiles of thicket" when under 1000
function gapOf(P) {
  const dist = new Map(), dq = []; for (const m of P.tiles) { dist.set(m, 0); dq.push(m); }
  const pq = [[0, ...P.tiles]]; void pq;
  // Dijkstra with small integer costs through buckets
  const buckets = [[]]; for (const m of P.tiles) buckets[0].push(m);
  for (let d = 0; d < 1200; d++) { const b = buckets[d]; if (!b) continue;
    for (let i = 0; i < b.length; i++) { const m = b[i]; if (dist.get(m) !== d) continue; const x = m % WW, y = (m / WW) | 0;
      for (const [dx, dy] of NB4) { const a = x + dx, c = y + dy; if (a < 0 || c < 0 || a >= WW || c >= WH) continue; const n = c * WW + a;
        if (seenB[n]) { return { cost: d, hit: [a, c] }; }
        const v = at(a, c); let w; if (passW(a, c)) w = 0; else if (v === TV.THICKET) w = 1; else if (v === TV.DEEP) continue; else w = 1000;
        const nd = d + w; if (nd >= 1200) continue; if (!dist.has(n) || dist.get(n) > nd) { dist.set(n, nd); (buckets[nd] || (buckets[nd] = [])).push(n); } } } }
  return null; }
const rows = [];
for (const P of parts) { const g = P.n >= 1 ? gapOf(P) : null, cause = !g ? 'none' : g.cost < 1000 ? 'thicket' : g.cost < 2000 ? 'cliff-or-water 1' : 'cliff-or-water 2+';
  rows.push({ n: P.n, raised: P.up * 2 > P.n, cells: [Math.floor(P.x0 / CW), Math.floor(P.y0 / CH), Math.floor(P.x1 / CW), Math.floor(P.y1 / CH)], walls: { water: P.water, thicket: P.thicket, cliff: P.lip }, cause, gap: g ? g.cost : null }); }
const by = {}; for (const r of rows) { const k = r.cause; (by[k] ||= { parts: 0, tiles: 0 }); by[k].parts++; by[k].tiles += r.n; }
console.log(JSON.stringify({ seed, walkableRegionView: walkTot, unreachedTest: unA, pctTest: +(100 * unA / walkTot).toFixed(2), walkableRealm: walkW, unreachedRealm: unB, pctRealm: +(100 * unB / walkW).toFixed(2), unreachedBoth: unBoth, partsRealm: parts.length, byCause: by, unreachedFromHome: unC, pctFromHome: +(100 * unC / walkW).toFixed(2), needTest: needA, needRealm: needB, needHome: needC }));
{ const t = regTable.reduce((a, r) => ({ un: a.un + r.unreached, via: a.via + r.viaNeighbour, lip: a.lip + r.edgeLipTiles }), { un: 0, via: 0, lip: 0 }); console.log(`  test view: ${t.un} unreached, of them ${t.via} reached by the realm flood (through a neighbouring region); ${t.lip} tiles the region view blocks as a lip on its border`); }
for (const r of regTable.filter(r => r.unreached > 0.05 * r.walk)) console.log(`  region ${r.region}: walk ${r.walk}, unreached ${r.unreached}, via neighbour ${r.viaNeighbour}, start in realm main ${r.startInRealmMain}`);
for (const r of rows.filter(r => r.cause === "thicket" || r.n >= 300).slice(0, 40)) console.log(`  ${r.n} tiles ${r.raised ? 'raised' : 'low'} cells ${r.cells} walls w${r.walls.water} t${r.walls.thicket} c${r.walls.cliff} -> ${r.cause} gap ${r.gap}`);
