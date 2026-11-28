// land-reach-1: the walkable land the place test leaves unreached, by cause.
//   node land-reach.mjs <seed> <cacheDir> [--fresh] [--parts out.json]
// Stitches the whole realm (cached in <cacheDir> as stitch-<seed>.bin and wayups-<seed>.json; --fresh rebuilds), then floods it the way the place test does (gen7-place-props.mjs, the whole-realm reach:
// from the start of every region, water that is not a ford, thicket, deep water and a cliff's lip block, a way up walks). Each part left is given the cheapest kind of wall between it and reached land:
//   thicket   - reached land is got to through walkable tiles and thicket only (a thicket closes it in)
//   raised    - a raised part reached by crossing a cliff's lip (raised land with no way up)
//   low       - a low part reached by crossing a cliff's lip (a low pocket walled by cliff)
//   water     - only by crossing water (land cut off by water: an island, or a shore walled by a lake or river)
//   other     - none of these (walled by the map's end)
// Prints one JSON line and a table by cause and size.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { cellTerrain, TV, CW, CH, RW, RH } from '../src/gen7/place.mjs';
import { genRegion7 } from '../src/gen7/region.mjs';
import { MW, MH } from '../src/logic/world.mjs';

const NB4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const seed = +process.argv[2], dir = process.argv[3], fresh = process.argv.includes('--fresh'), pi = process.argv.indexOf('--parts'), partsOut = pi > 0 ? process.argv[pi + 1] : null;
const SW = MW * CW, SH = MH * CH, WW = RW * CW, WH = RH * CH, N = WW * WH;
const file = `${dir}/stitch-${seed}.bin`, wfile = `${dir}/wayups-${seed}.json`, bfile = `${dir}/banks-${seed}.json`;
let T, wayups, banks = []; const t0 = Date.now();
if (!fresh && existsSync(file) && existsSync(bfile)) { T = new Uint8Array(readFileSync(file)); wayups = JSON.parse(readFileSync(wfile, 'utf8')); banks = JSON.parse(readFileSync(bfile, 'utf8')); } else {
  T = new Uint8Array(N); const seen = new Set(), seenB = new Set(); wayups = [];
  for (let Y = 0; Y < RH; Y++) for (let X = 0; X < RW; X++) {
    const c = cellTerrain(seed, X, Y);
    for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) T[(Y * CH + y) * WW + X * CW + x] = c.terrain[(y + 1) * c.w + x + 1];
    for (const a of c.wayups) { const k = a.x + ',' + a.y; if (!seen.has(k)) { seen.add(k); wayups.push(a); } }
    for (const a of c.banks || []) { const k = a.x + ',' + a.y; if (!seenB.has(k)) { seenB.add(k); banks.push(a); } }
  }
  writeFileSync(file, T); writeFileSync(wfile, JSON.stringify(wayups)); writeFileSync(bfile, JSON.stringify(banks));
}
const stitchMs = Date.now() - t0;
const dug = process.argv.includes('--dug');   // rupar-banks-7-1: with a Rupar every earth bank is dug open (a way up); without, it blocks as the lip it is
const wu = new Uint8Array(N); for (const a of dug ? wayups.concat(banks) : wayups) for (let y = a.y; y < a.y + a.h; y++) for (let x = a.x; x < a.x + a.w; x++) if (x >= 0 && y >= 0 && x < WW && y < WH) wu[y * WW + x] = 1;
const regions = []; for (let ay = 0; ay < RH / MH; ay++) for (let ax = 0; ax < RW / MW; ax++) regions.push({ ax, ay, G: genRegion7(seed, ax, ay) });
const regionOf = (x, y) => regions[Math.floor(y / SH) * (RW / MW) + Math.floor(x / SW)];
const at = (x, y) => (x < 0 || y < 0 || x >= WW || y >= WH ? TV.THICKET : T[y * WW + x]);
const isLip = (x, y) => at(x, y) === TV.CLIFF && NB4.some(([dx, dy]) => at(x + dx, y + dy) !== TV.CLIFF);
const fordAt = (x, y) => regionOf(x, y).G.ford[Math.floor((y % SH) / CH) * MW + Math.floor((x % SW) / CW)];
// the tile classes: 0 walks, 1 thicket, 2 lip (not a way up), 3 water (not a ford), 4 deep
const K = new Uint8Array(N);
for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) { const v = T[y * WW + x];
  K[y * WW + x] = v === TV.DEEP ? 4 : v === TV.WATER && !fordAt(x, y) ? 3 : v === TV.THICKET ? 1 : v === TV.CLIFF && isLip(x, y) && !wu[y * WW + x] ? 2 : 0; }
const flood = (seen, q, maxK) => { for (let k = 0; k < q.length; k++) { const i = q[k], x = i % WW; for (const m of [x + 1 < WW ? i + 1 : -1, x > 0 ? i - 1 : -1, i + WW < N ? i + WW : -1, i >= WW ? i - WW : -1]) if (m >= 0 && !seen[m] && K[m] <= maxK) { seen[m] = 1; q.push(m); } } };
// the test's flood: from every region's start
const seen = new Uint8Array(N), q = [], starts = [];
for (const R of regions) { const sp = R.G.spawns[0], sx = R.ax * SW + (sp % MW) * CW + CW / 2, sy = R.ay * SH + ((sp / MW) | 0) * CH + CH / 2; let s = -1;
  for (let d = 0; d < 12 && s < 0; d++) for (let dy = -d; dy <= d && s < 0; dy++) for (let dx = -d; dx <= d; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === d && K[(sy + dy) * WW + sx + dx] === 0) { s = (sy + dy) * WW + sx + dx; break; }
  if (s >= 0) { starts.push(s); if (!seen[s]) { seen[s] = 1; q.push(s); } } }
flood(seen, q, 0);
let walk = 0, un = 0; for (let i = 0; i < N; i++) if (K[i] === 0) { walk++; if (!seen[i]) un++; }
// the cheapest wall: reached land spread over walkable and thicket (1), then over lips too (2), then over water (3)
const spread = maxK => { const s = seen.slice(), qq = []; for (let i = 0; i < N; i++) if (s[i]) qq.push(i); flood(s, qq, maxK); return s; };
const S1 = spread(1), S2 = spread(2), S3 = spread(3);
// the parts
const lab = new Int32Array(N).fill(-1), parts = [];
for (let s = 0; s < N; s++) { if (lab[s] >= 0 || seen[s] || K[s] !== 0) continue;
  const P = { n: 0, up: 0, x0: 1e9, y0: 1e9, x1: -1, y1: -1, w: { water: 0, thicket: 0, lip: 0, deep: 0 } }, qq = [s]; lab[s] = parts.length;
  for (let k = 0; k < qq.length; k++) { const i = qq[k], x = i % WW, y = (i / WW) | 0; P.n++; if (T[i] === TV.CLIFF) P.up++; if (x < P.x0) P.x0 = x; if (x > P.x1) P.x1 = x; if (y < P.y0) P.y0 = y; if (y > P.y1) P.y1 = y;
    for (const [dx, dy] of NB4) { const a = x + dx, b = y + dy; if (a < 0 || b < 0 || a >= WW || b >= WH) continue; const m = b * WW + a;
      if (K[m] === 0) { if (lab[m] < 0) { lab[m] = lab[s]; qq.push(m); } } else if (K[m] === 1) P.w.thicket++; else if (K[m] === 2) P.w.lip++; else if (K[m] === 3) P.w.water++; else P.w.deep++; } }
  P.raised = P.up * 2 > P.n; P.cause = S1[s] ? 'thicket' : S2[s] ? (P.raised ? 'raised' : 'low') : S3[s] ? 'water' : 'other'; P.at = [P.x0, P.y0, P.x1, P.y1]; P.cell = [Math.floor(P.x0 / CW), Math.floor(P.y0 / CH), Math.floor(P.x1 / CW), Math.floor(P.y1 / CH)];
  parts.push(P); }
parts.sort((a, b) => b.n - a.n);
const SIZES = [[0, 6], [6, 60], [60, 200], [200, 1000], [1000, 1e9]], sz = n => SIZES.findIndex(([a, b]) => n >= a && n < b), sname = ([a, b]) => b >= 1e9 ? `${a}+` : `${a}-${b - 1}`;
const table = {}; for (const P of parts) { const t = (table[P.cause] ||= { parts: 0, tiles: 0, bySize: SIZES.map(() => [0, 0]) }); t.parts++; t.tiles += P.n; t.bySize[sz(P.n)][0]++; t.bySize[sz(P.n)][1] += P.n; }
// islands: a water part whose walls are all water or deep (no lip, no thicket): the map shows open water round it
const islands = parts.filter(P => P.cause === 'water' && !P.w.lip && !P.w.thicket);
console.log(JSON.stringify({ seed, walkable: walk, unreached: un, pct: +(100 * un / walk).toFixed(2), parts: parts.length, islands: islands.length, islandTiles: islands.reduce((a, P) => a + P.n, 0), byCause: Object.fromEntries(Object.entries(table).map(([k, t]) => [k, { parts: t.parts, tiles: t.tiles }])), wayups: wayups.length, stitchMs }));
console.log('cause    | ' + SIZES.map(sname).map(s => s.padStart(14)).join(' | ') + ' | total');
for (const [k, t] of Object.entries(table)) console.log(k.padEnd(8) + ' | ' + t.bySize.map(([p, n]) => `${p} / ${n}`.padStart(14)).join(' | ') + ` | ${t.parts} / ${t.tiles}`);
for (const P of parts.slice(0, 25)) console.log(`  ${P.n} ${P.raised ? 'R' : 'L'} ${P.cause} tiles ${P.at} cells ${P.cell} walls lip ${P.w.lip} water ${P.w.water} thicket ${P.w.thicket} deep ${P.w.deep}`);
// bumps and notches (cliff-rules 6): a strip of raised (a bump) or low (a notch) land one tile thick and 1 to 3 tiles long that stands out of a straight edge and comes back: the tile beyond it, and the tiles before and
// after it along the edge, are the other level; the tiles behind it (the strip and its two ends) its own. By the way it faces (a bump out of a side wall faces east or west) and its length.
const RZ = new Uint8Array(N); for (let i = 0; i < N; i++) RZ[i] = T[i] === TV.CLIFF ? 1 : 0;
const bumps = { bump: [0, 0, 0, 0], notch: [0, 0, 0, 0], side: 0, row: 0, at: [] };
{ const r = (x, y) => (x < 0 || y < 0 || x >= WW || y >= WH ? -1 : RZ[y * WW + x]);
  for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {   // outward
    const ax = oy !== 0 ? 1 : 0, ay = ox !== 0 ? 1 : 0;   // along the edge
    for (let y = 1; y < WH - 1; y++) for (let x = 1; x < WW - 1; x++) {
      const v = RZ[y * WW + x]; if (r(x - ax, y - ay) === v) continue;   // the strip's first tile: the tile before it is the other level
      let k = 0; while (k < 5 && r(x + k * ax, y + k * ay) === v && r(x + k * ax + ox, y + k * ay + oy) === 1 - v) k++;
      if (k < 1 || k > 4 || r(x + k * ax, y + k * ay) !== 1 - v) continue;
      let ok = true; for (let j = -1; j <= k && ok; j++) if (r(x + j * ax - ox, y + j * ay - oy) !== v) ok = false;
      if (!ok) continue;
      bumps[v ? 'bump' : 'notch'][k - 1]++; if (ox) bumps.side++; else bumps.row++; if (bumps.at.length < 12) bumps.at.push(`${v ? 'B' : 'N'}${k}${ox ? 'side' : 'row'}@${x},${y}`); (bumps.all ||= []).push([v, k, x, y, ox, oy]);
    } } }
console.log('bumps (raised, length 1/2/3/4):', bumps.bump.join('/'), ' notches (low):', bumps.notch.join('/'), ' on side walls', bumps.side, 'on rows', bumps.row, ' e.g.', bumps.at.join(' '));
// ways up whose foot or top is a pit: the walkable part under the way up (from the tile below it, the way up's own tiles left out) or over it, when under 200 tiles; and whether that part is reached
{ const way = new Uint8Array(N); for (const a of wayups) for (let y = a.y; y < a.y + a.h; y++) for (let x = a.x; x < a.x + a.w; x++) way[y * WW + x] = 1;
  const partSize = (s, cap) => { if (K[s] !== 0 || way[s]) return 0; const sn = new Set([s]), qq = [s]; for (let k = 0; k < qq.length && qq.length <= cap; k++) { const i = qq[k], x = i % WW; for (const m of [x + 1 < WW ? i + 1 : -1, x > 0 ? i - 1 : -1, i + WW < N ? i + WW : -1, i >= WW ? i - WW : -1]) if (m >= 0 && !sn.has(m) && K[m] === 0 && !way[m]) { sn.add(m); qq.push(m); } } return qq.length; };
  let footPit = 0, topPit = 0; const pits = [];
  for (const a of wayups) { const f = partSize((a.y + 1) * WW + a.x, 200), t = partSize((a.y - 1) * WW + a.x, 200);
    if (f < 200) { footPit++; if (pits.length < 20) pits.push(`foot ${a.x},${a.y} ${f}`); } if (t < 200) { topPit++; if (pits.length < 20) pits.push(`top ${a.x},${a.y} ${t}`); } }
  console.log(`ways up ${wayups.length}: foot in a pit (under 200 tiles) ${footPit}, top on a pit ${topPit}; ${pits.join('; ')}`); }
{ const bi = process.argv.indexOf('--bumps'); if (bi > 0) writeFileSync(process.argv[bi + 1], JSON.stringify(bumps.all || [])); }
{ const mi = process.argv.indexOf('--mask'); if (mi > 0) { const M = new Uint8Array(N); for (let i = 0; i < N; i++) if (K[i] === 0 && !seen[i]) M[i] = 1; writeFileSync(process.argv[mi + 1], M); } }
if (partsOut) writeFileSync(partsOut, JSON.stringify({ seed, walk, un, parts: parts.map(P => ({ n: P.n, raised: P.raised, cause: P.cause, at: P.at, w: P.w })) }));
