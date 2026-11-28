// Generator 7, layer 1: the region (16 x 20 cells at an atlas slot). Pure, like world.mjs.
// A region is a window onto the realm's one land (world.mjs: water, land, levels, fords, closed over the whole realm), so its cells already agree with
// its neighbours' along the shared border. This layer adds what only exists inside one region: stairs (today's spanning tree over the level zones),
// the swim island, the set pieces (gate, deep stone, swim gate, five starts, outposts, beacons), trails by A* with ports, and today's region checks.
// Every decision is a hash of the realm seed and a world position (and the region's attempt number), never of the order regions were opened in.
import FlatQueue from 'flatqueue';
import { hash, makeRng, MW, MH, L, EDGE, G2, WALK_MIN, BIOME_GROUND, cdist, cxy, cheb, passableIn, canStepIn, edgeIndex } from '../world.mjs';
import { ATLAS } from '../regions.mjs';
import { buildRealm, rawRealm, editE0, RW, RH, CW, CH, NB8, isSaddle, levelZones, closeLevels, fixSaddles } from './world.mjs';
import { realmFeatures } from './features.mjs';
import { realmRoads, roadGraph, ringDist } from './roads.mjs';
import { levelsOf, edgeRows, bankRows } from './levels.mjs';

export const NC = MW * MH;
// world.mjs hash() with its leading arguments folded once (the same bytes in the same order), then one number appended and finalised; and mulberry32's first draw
function hashHead(parts) { let h = 2166136261 >>> 0;
  for (const v of parts) { if (typeof v === 'string') { for (let j = 0; j < v.length; j++) { h ^= v.charCodeAt(j); h = Math.imul(h, 16777619); } }
    else { const n = Math.floor(v) | 0; for (let k = 0; k < 4; k++) { h ^= (n >>> (k * 8)) & 255; h = Math.imul(h, 16777619); } }
    h ^= 0x5bd1e995; h = Math.imul(h, 16777619); }
  return h; }
function hashTail(h, v) { const n = Math.floor(v) | 0;
  h ^= n & 255; h = Math.imul(h, 16777619); h ^= (n >>> 8) & 255; h = Math.imul(h, 16777619); h ^= (n >>> 16) & 255; h = Math.imul(h, 16777619); h ^= (n >>> 24) & 255; h = Math.imul(h, 16777619);
  h ^= 0x5bd1e995; h = Math.imul(h, 16777619);
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return h >>> 0; }
// canStepIn without its options (no object made per step): the same test for SIDES[k]
function stepK(G, a, k) {
  const s = SIDES[k], x = a % MW + s[1], y = ((a / MW) | 0) + s[2]; if (x < 0 || y < 0 || x >= MW || y >= MH) return false;
  const b = y * MW + x, e = k === 1 ? 2 * a : k === 3 ? 2 * (a - 1) : k === 2 ? 2 * a + 1 : 2 * (a - MW) + 1, kind = G.edge[e], l = G.land[b];
  if (!((l !== L.WATER || G.ford[b] === 1) && l !== L.CLIFF)) return false;
  return kind === EDGE.OPEN || kind === EDGE.RAMP;
}
function firstDraw(a) { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
export const STRANDED_MAX_PCT = 6;   // the most a region's dry land that no stair with a way up reaches (a pocket across a river that ends on a north-facing wall), in percent
const SIDES = [['up', 0, -1], ['right', 1, 0], ['down', 0, 1], ['left', -1, 0]];
const inRegion = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH;
const inner = c => { const x = c % MW, y = (c / MW) | 0; return x >= 1 && y >= 1 && x < MW - 1 && y < MH - 1; };   // pieces that change land stay off the border cells, so neighbours never see them

// ---- ports: where a trail or a stair crosses a cell edge ----
// An offset along the edge in tiles, 6 or more from either end, by a hash of the world edge; both cells read the same value. e is a region edge index (2c east, 2c + 1 south).
export function portOffset(seed, ax, ay, e) {
  const c = e >> 1, x = ax * MW + (c % MW), y = ay * MH + ((c / MW) | 0), south = e & 1, len = south ? CW : CH;   // a south edge runs along x (CW tiles), an east edge along y (CH tiles)
  return 6 + hash(seed, 'gen7', 'port', 2 * (y * RW + x) + south) % (len - 12);
}
// the same port by the world cell (X, Y) the edge starts at and its direction (south: the edge to the cell below; else the edge to the cell on the right): the realm's trails cross regions
export const portAt = (seed, X, Y, south) => 6 + hash(seed, 'gen7', 'port', 2 * (Y * RW + X) + (south ? 1 : 0)) % ((south ? CW : CH) - 12);
export const edgeOfStep = (a, b) => { const d = b - a; return d === 1 ? 2 * a : d === -1 ? 2 * b : d === MW ? 2 * a + 1 : 2 * b + 1; };

// ---- A* over a grid ----
// The realm's trails (roads.mjs) are laid over the whole realm; the place draws its stretch of them with this A*.
// One A* on flatqueue for every grid in generator 7 (the tiles of a place, place.mjs). step(c, n, dir) is the cost of moving from cell c to its
// 4-neighbour n (dir 'up' | 'right' | 'down' | 'left'), or null when the move is not allowed. Returns the cells from `from` to `to`, or null.
export function route(W, H, from, to, step, hw = 2) {
  const N = W * H, g = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), q = new FlatQueue(), tx = to % W, ty = (to / W) | 0;
  g[from] = 0; q.push(from, 0);
  while (q.length) {
    const c = q.pop(); if (c === to) break;
    const x = c % W, y = (c / W) | 0;
    for (const [dir, dx, dy] of SIDES) {
      const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
      const n = Y * W + X, k = step(c, n, dir); if (k === null) continue;
      const ng = g[c] + k;
      if (ng < g[n]) { g[n] = ng; prev[n] = c; q.push(n, ng + hw * Math.max(Math.abs(X - tx), Math.abs(Y - ty))); }
    }
  }
  if (prev[to] < 0 && from !== to) return null;
  const path = [to]; for (let c = to; c !== from;) { c = prev[c]; path.push(c); }
  return path.reverse();
}

// ---- one region ----
// `pt` is a piece attempt: a rim region made again with its coast draws its pieces afresh when the first draw leaves it short of a start or a gate (the land and `tries` stay as they are)
export function regionAt(realm, ax, ay, pt = 0) {
  const seed = realm.seed, s = ay * ATLAS + ax, t = realm.tries[s], biome = realm.slotBiome[s], B = BIOME_GROUND[biome] || null;
  const s0 = pt ? hash(seed, 'gen7', 'piece', ax, ay, t, pt) : hash(seed, 'gen7', 'piece', ax, ay, t), RGn = tag => makeRng(hash(s0, tag));
  const wc = c => (ay * MH + ((c / MW) | 0)) * RW + ax * MW + (c % MW);   // a region cell's realm index
  const land = new Uint8Array(NC), ford = new Uint8Array(NC), island = new Uint8Array(NC), level = new Uint8Array(NC), wk = new Uint8Array(NC), edge = new Uint8Array(2 * NC);
  for (let c = 0; c < NC; c++) { const w = wc(c); land[c] = realm.land[w]; ford[c] = realm.ford[w]; level[c] = realm.level[w]; wk[c] = realm.wkind[w]; }
  const atXY = (x, y) => inRegion(x, y) ? y * MW + x : -1;
  const wet = c => land[c] === L.WATER;
  // water bodies (4-connected), and a ford top-up: each river holds at least two fords where it runs one cell wide between banks
  const wbody = new Int32Array(NC).fill(-1), bodies = [];
  for (let c = 0; c < NC; c++) { if (!wet(c) || wbody[c] >= 0) continue; const id = bodies.length, q = [c]; wbody[c] = id; const cells = [];
    while (q.length) { const u = q.pop(), x = u % MW, y = (u / MW) | 0; cells.push(u); for (const [, dx, dy] of SIDES) { const n = atXY(x + dx, y + dy); if (n >= 0 && wet(n) && wbody[n] < 0) { wbody[n] = id; q.push(n); } } }
    bodies.push(cells.sort((p, q2) => p - q2)); }
  const dry = (x, y) => { const n = atXY(x, y); return n >= 0 && !wet(n); };
  for (const cells of bodies) {
    if (!cells.some(c => wk[c] === 1)) continue;
    const have = cells.filter(c => ford[c]).length; if (have >= 2) continue;
    const cand = cells.filter(c => { const x = c % MW, y = (c / MW) | 0; return inner(c) && !ford[c] && ((dry(x - 1, y) && dry(x + 1, y)) || (dry(x, y - 1) && dry(x, y + 1))); })
      .sort((a, b) => hash(seed, 'gen7', 'fordk', wc(a), t) - hash(seed, 'gen7', 'fordk', wc(b), t) || a - b);
    for (let i = 0; i < cand.length && i < 2 - have; i++) ford[cand[i]] = 1;
  }
  // the swim island: a water cell inside open water with dry land two cells away across one water cell; it is the one cell raised in a lake or wide river
  { const sites = [];
    for (let c = 0; c < NC; c++) { if (!wet(c) || ford[c]) continue; const x = c % MW, y = (c / MW) | 0; if (x < 2 || y < 2 || x > MW - 3 || y > MH - 3) continue;
      if (!NB8.every(([dx, dy]) => wet(c + dy * MW + dx) && !ford[c + dy * MW + dx])) continue;
      let reach = false;   // a dry cell at distance 2 whose 4-neighbour water cell is within one of the island
      for (let dy = -2; dy <= 2 && !reach; dy++) for (let dx = -2; dx <= 2 && !reach; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== 2) continue; const n = atXY(x + dx, y + dy);
        if (n >= 0 && !wet(n) && SIDES.some(([, ox, oy]) => { const w = atXY(x + dx + ox, y + dy + oy); return w >= 0 && wet(w) && !ford[w] && Math.max(Math.abs(dx + ox), Math.abs(dy + oy)) <= 1; })) reach = true; }
      if (reach) sites.push(c); }
    if (sites.length) { const c = sites.sort((a, b) => hash(seed, 'gen7', 'isle', wc(a), t) - hash(seed, 'gen7', 'isle', wc(b), t) || a - b)[0]; land[c] = L.MEADOW; island[c] = 1; level[c] = 0; wk[c] = 0; } }
  const Gp = { land, ford, island, edge };
  // edges: a cliff where the levels differ (the land's own contour), then stairs by a spanning tree over the level zones (Kruskal on hashed keys)
  for (let c = 0; c < NC; c++) { const x = c % MW, y = (c / MW) | 0;
    if (x < MW - 1 && level[c] !== level[c + 1]) edge[2 * c] = EDGE.CLIFF;
    if (y < MH - 1 && level[c] !== level[c + MW]) edge[2 * c + 1] = EDGE.CLIFF; }
  // Stairs. A way up exists only in a south-facing face (the one painted piece), so a stair sits on an edge between a cell and the one south of it, the higher to the north. The realm reads no tile
  // land: every such edge may carry a stair, in the order of the hashed keys, and the place seats the way up where the realm put it (the held-straight site, levels.mjs, made before the land's passes).
  // The tree keeps today's rule (every level zone reachable); a region whose zones cannot all be joined fails its check and is drawn again.
  const pass = c => passableIn(Gp, c) && !island[c], Z = levelZones(pass, level, MW, MH), cand = [];
  // The one cell-scale test: a lake right under the lower cell leaves the site no dry columns (the tile water reaches into the cell above it), so no stair on an edge whose lower cell has open water (not a ford) right south of it.
  const seatOk = i => { const w = wc(i >> 1) + 2 * RW; return w >= RW * RH || realm.land[w] !== L.WATER || realm.ford[w] === 1; };
  const southUp = e => (e.i & 1) === 1 && level[e.a] > level[e.b];
  for (let i = 0; i < 2 * NC; i++) { if (edge[i] !== EDGE.CLIFF) continue; const a = i >> 1, b = i & 1 ? a + MW : a + 1;
    if (pass(a) && pass(b)) cand.push({ i, a, b, key: hash(seed, 'gen7', 'ramp', 2 * wc(a) + (i & 1)) }); }
  cand.sort((p, q) => p.key - q.key || p.i - q.i);
  const find = (up, z) => { while (up[z] !== z) z = up[z]; return z; }, roots = up => { let n = 0; for (let z = 0; z < up.length; z++) if (up[z] === z) n++; return n; };
  const upAll = Int32Array.from({ length: Z.n }, (_, z) => z);   // the zones as every cliff edge would join them
  for (const e of cand) { const ra = find(upAll, Z.id[e.a]), rb = find(upAll, Z.id[e.b]); if (ra !== rb) upAll[ra < rb ? rb : ra] = ra < rb ? ra : rb; }
  const up = Int32Array.from({ length: Z.n }, (_, z) => z);
  for (const e of cand) { if (!southUp(e)) continue; const ra = find(up, Z.id[e.a]), rb = find(up, Z.id[e.b]); if (ra === rb || !seatOk(e.i)) continue; up[ra < rb ? rb : ra] = ra < rb ? ra : rb; edge[e.i] = EDGE.RAMP; }
  const zonesJoined = roots(up) === roots(upAll);
  if (B && B.extraStairs) {   // a biome's own stairs besides the tree's, each clear of a stair beside it on the same wall
    let have = 0; for (let i = 0; i < 2 * NC; i++) if (edge[i] === EDGE.RAMP) have++;
    const along = i => [i - 2, i + 2];
    const extras = cand.filter(e => southUp(e) && edge[e.i] === EDGE.CLIFF && !wet(e.a) && !wet(e.b)).sort((p, q) => hash(s0, 'xramp', p.i) - hash(s0, 'xramp', q.i) || p.i - q.i);
    // the gate needs a face without a stair, inside the region's inner box (a rim region whose raised land was tapered has few): the extra stairs never take the last two
    const gateFace = e => { const x = e.b % MW, y = (e.b / MW) | 0; return x >= 2 && x <= MW - 3 && y >= 2 && y <= MH - 3; };
    let free = extras.filter(gateFace).length;
    for (let k = 0, want = ((have * B.extraStairs + 50) / 100) | 0, at = 0; k < want && at < extras.length; at++) {
      const e = extras[at]; if (!along(e.i).every(j => j < 0 || j >= 2 * NC || edge[j] !== EDGE.RAMP) || !seatOk(e.i)) continue;
      if (gateFace(e)) { if (free <= 2) continue; free--; }
      edge[e.i] = EDGE.RAMP; k++;
    }
  }
  const cross = []; for (let i = 0; i < 2 * NC; i++) if (edge[i] === EDGE.RAMP) cross.push({ c: i >> 1, side: (i & 1) ? 's' : 'e', kind: 'ramp' });
  // the largest 4-connected walkable set under canStepIn; ties keep the lowest start
  const comp = new Uint8Array(NC);
  { const seen = new Int32Array(NC).fill(-1), qu = new Int32Array(NC); let best = -1, bestN = 0;
    for (let c0 = 0; c0 < NC; c0++) { if (seen[c0] >= 0 || !passableIn(Gp, c0)) continue; let h = 0, n = 0; qu[n++] = c0; seen[c0] = c0;
      while (h < n) { const c = qu[h++], x = c % MW, y = (c / MW) | 0; for (let k = 0; k < 4; k++) { if (!stepK(Gp, c, k)) continue; const d = (y + SIDES[k][2]) * MW + x + SIDES[k][1]; if (seen[d] < 0) { seen[d] = c0; qu[n++] = d; } } }
      if (n > bestN) { bestN = n; best = c0; } }
    // a rim region whose raised land the coast tapered can be left with walkable parts that no stair joins (their walls face north, east or west): if the largest has no cliff base for the gate, the largest that has one is the walkable part
    const hasBase = new Set(); for (let c = MW; c < NC; c++) { const x = c % MW, y = (c / MW) | 0;
      if (seen[c] >= 0 && x >= 2 && x <= MW - 3 && y >= 2 && y <= MH - 3 && edge[2 * (c - MW) + 1] === EDGE.CLIFF && level[c - MW] === level[c] + 1 && !wet(c) && !wet(c - MW)) hasBase.add(seen[c]); }
    if (best >= 0 && !hasBase.has(best) && hasBase.size) { const size = new Map(); for (let c = 0; c < NC; c++) if (seen[c] >= 0) size.set(seen[c], (size.get(seen[c]) || 0) + 1);
      best = [...hasBase].sort((a, b) => size.get(b) - size.get(a) || a - b)[0]; }
    for (let c = 0; c < NC; c++) comp[c] = seen[c] === best && best >= 0 ? 1 : 0; }
  // set pieces, each on a stream of its own. The gate: a non-stair cliff base in the walkable part (its rock stays off the border cells).
  const RG = RGn('gate'), gc = [];
  for (let c = MW; c < NC; c++) { const x = c % MW, y = (c / MW) | 0;
    if (x >= 2 && x <= MW - 3 && y >= 2 && y <= MH - 3 && edge[2 * (c - MW) + 1] === EDGE.CLIFF && level[c - MW] === level[c] + 1 && comp[c] && !wet(c) && !wet(c - MW)) gc.push(c); }
  let gate = -1, mouth = -1, deep = -1, swim = -1, swimDir = null, spawns = [], glow = [], startSites = [];
  const bset = new Set(), dset = new Set();
  if (gc.length) {
    gate = gc[RG.int(gc.length)]; mouth = gate - MW; land[gate] = L.ROCK;
    { const gx = gate % MW, gy = (gate / MW) | 0;
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, 1]]) { const X = gx + dx, Y = gy + dy; if (!inRegion(X, Y)) continue; const c = Y * MW + X; if (!wet(c) && inner(c) && RG.int(100) < 60) land[c] = L.ROCK; } }
    const RD = RGn('deep'), rocks = [];
    for (let c = 0; c < NC; c++) if (comp[c] && c !== gate && land[c] === L.ROCK && cdist(c, gate) >= 5) rocks.push(c);
    if (!rocks.length) for (let c = 0; c < NC; c++) if (comp[c] && !wet(c) && inner(c) && cdist(c, gate) >= 5) rocks.push(c);
    if (rocks.length) { deep = rocks[RD.int(rocks.length)]; if (inner(deep)) land[deep] = L.ROCK; }
    // the swimmer gate: a walkable cell beside a water cell within one of the island
    const isl = []; for (let c = 0; c < NC; c++) if (island[c]) isl.push(cxy(c));
    if (isl.length) { const sc = [];
      for (let c = 0; c < NC; c++) { if (!comp[c] || wet(c) || c === gate || c === deep || island[c]) continue; const p = cxy(c);
        for (const [dn, dx, dy] of [['up', 0, -1], ['down', 0, 1], ['left', -1, 0], ['right', 1, 0]]) { const X = p.x + dx, Y = p.y + dy; if (!inRegion(X, Y)) continue; const w = Y * MW + X;
          if (!wet(w) || ford[w]) continue; const d = Math.min(...isl.map(i => cheb(i, { x: X, y: Y }))); if (d <= 1) sc.push({ c, dn, k: d * 100 + Math.min(...isl.map(i => Math.abs(i.x - p.x) + Math.abs(i.y - p.y))) * 10 + (dn === 'left' || dn === 'right' ? 0 : 1) }); } }
      sc.sort((a, b) => a.k - b.k || a.c - b.c); if (sc.length) { swim = sc[0].c; swimDir = sc[0].dn; } }
    // start glints: one near the gate, the rest spread out
    const RS = RGn('spawn');
    const ok = c => { if (!comp[c] || c === gate || c === deep || wet(c)) return false; const x = c % MW, y = (c / MW) | 0; let n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy; if (!inRegion(X, Y)) continue; const b = Y * MW + X, l = land[b];   // passableIn inline
        if ((l !== L.WATER || ford[b] === 1) && l !== L.CLIFF && level[b] === level[c]) n++; }
      if (n < 6) return false;
      // one stamped seen array and one queue for every cell (the same search, the same order), stopped once the reach is enough (only the count is read)
      const st = ++okStamp; let qn = 0; okQ[qn++] = c; okSeen[c] = st;   // the cells a 2-cell reach would give from here
      for (let h = 0; h < qn && qn < G2.START_REACH; h++) { const u = okQ[h], ux = u % MW, uy = (u / MW) | 0;
        for (let k = 0; k < 4; k++) { const sd = SIDES[k], X = ux + sd[1], Y = uy + sd[2]; if (!inRegion(X, Y)) continue; const d = Y * MW + X;
          if (okSeen[d] === st || !stepK(Gp, u, k) || island[d] || Math.max(Math.abs(X - x), Math.abs(Y - y)) > 2) continue; okSeen[d] = st; okQ[qn++] = d; } }
      return qn >= G2.START_REACH; };
    const okSeen = new Int32Array(NC), okQ = new Int32Array(NC); let okStamp = 0;
    let sc = []; for (let c = 0; c < NC; c++) if (ok(c)) sc.push(c);
    if (realm.coast) {   // starts keep clear of the coast: 3 cells from the border cells (2 where fewer than 5 are left); a region off the rim never loses one, so its draws are the same
      const gap = c => { const w = wc(c), x = w % RW, y = (w / RW) | 0; return Math.min(x, y, RW - 1 - x, RH - 1 - y); };
      const far = sc.filter(c => gap(c) >= 3); sc = far.length >= 5 ? far : sc.filter(c => gap(c) >= 2);
    }
    startSites = sc;   // the sites a start may take: the piece pass (piecesOf) orders them by the trail
    const near = sc.filter(c => cdist(c, gate) >= 2 && cdist(c, gate) <= 4);
    if (near.length) spawns.push(near[RS.int(near.length)]);
    const sh = sc.slice(); for (let i = sh.length - 1; i > 0; i--) { const j = RS.int(i + 1), v = sh[i]; sh[i] = sh[j]; sh[j] = v; }
    for (const c of sh) { if (spawns.length >= 5) break; if (spawns.every(p => cdist(p, c) >= 5)) spawns.push(c); }
    for (const sp of spawns) {   // the glow neighbour on the start's level (rock or wood, or a cell made rock)
      const p = cxy(sp), nb = [];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const x = p.x + dx, y = p.y + dy; if ((!dx && !dy) || !inRegion(x, y)) continue; const c = y * MW + x;
        if (comp[c] && passableIn(Gp, c) && !wet(c) && c !== gate && c !== deep && c !== swim && !island[c] && !spawns.includes(c) && level[c] === level[sp]) nb.push(c); }
      if (!nb.length) continue;
      let c = nb.find(n => land[n] === L.ROCK || land[n] === L.WOOD); if (c == null) { c = nb.find(inner); if (c == null) continue; land[c] = L.ROCK; }
      if (!glow.includes(c)) glow.push(c);
    }
    // beacons on rock and meadow, outposts spread out
    const hC = hashHead([s0, 'cairn']), hD = hashHead([s0, 'depot']);
    for (let c = 0; c < NC; c++) { if ((land[c] !== L.ROCK && land[c] !== L.MEADOW) || !comp[c]) continue; if (Math.floor(firstDraw(hashTail(hC, c)) * 100) >= (land[c] === L.ROCK ? 35 : 8)) continue;
      const p = cxy(c); let close = false; for (const b of bset) if (cheb(p, cxy(b)) <= 2) { close = true; break; } if (!close) bset.add(c); }
    const dc = []; for (let c = 0; c < NC; c++) if (comp[c] && !wet(c) && !island[c] && c !== gate && c !== deep && c !== swim && !bset.has(c)) dc.push({ c, k: hashTail(hD, c) });
    dc.sort((a, b) => a.k - b.k || a.c - b.c);
    for (const { c } of dc) { if (dset.size >= 6) break; const p = cxy(c); if ([...dset].every(d => cheb(p, cxy(d)) >= 5)) dset.add(c); }
  }
  const G = { seed, slot: [ax, ay], biome, gen: 7, attempt: t, land, ford, island, level, edge, cross, comp, gate, mouth, deep, swim, swimDir, spawns, glow, startSites, wk, wbody,
    beacons: { seed, set: bset }, depots: { seed, set: dset }, coast: Uint8Array.from({ length: NC }, (_, c) => (realm.coast ? realm.coast[wc(c)] : 0)) };   // coast: the cells of the realm's border ring (wide water, never walked)
  // the shared borders: per side, per cell along it, this region's cell, the neighbour region's cell and the edge between (read from the realm)
  G.border = {};
  for (const [side, dx, dy] of SIDES) {
    const horiz = side === 'up' || side === 'down', n = horiz ? MW : MH, nx = ax + dx, ny = ay + dy, out = [];
    for (let i = 0; i < n; i++) {
      const x = side === 'left' ? 0 : side === 'right' ? MW - 1 : i, y = side === 'up' ? 0 : side === 'down' ? MH - 1 : i, c = y * MW + x;
      let other = null, kind = 'mapend';
      if (nx >= 0 && ny >= 0 && nx < ATLAS && ny < ATLAS) { const w = wc(c) + dy * RW + dx; other = [realm.land[w], realm.level[w], realm.ford[w]]; kind = level[c] !== other[1] ? 'cliff' : 'open'; }
      out.push({ own: [land[c], level[c], ford[c]], other, kind });
    }
    G.border[side] = out;
  }
  // the cells of the level zones that no stair with a way up reaches (their only cliffs face north, east or west, and what rings them is water): a region may keep a few
  G.stranded = 0; { const size = new Map(), top = new Map();
    for (let z = 0; z < Z.n; z++) { const r = find(up, z); size.set(r, (size.get(r) || 0) + Z.cells[z].length); }
    for (const [r, n] of size) { const k = find(upAll, r), cur = top.get(k); if (cur === undefined || n > size.get(cur) || (n === size.get(cur) && r < cur)) top.set(k, r); }
    for (const [r, n] of size) if (top.get(find(upAll, r)) !== r) G.stranded += n; }
  G.zonesJoined = zonesJoined;
  G.fails = checkRegion(G, biome);
  return G;
}

// ---- the piece pass (F4): starts, outposts, beacons and glows, ordered by the realm's trails ----
// regionAt (the land pass) keeps the baseline draw of every piece (the checks read it, so a region always has its five starts, six outposts); once the realm's trails are laid (roads.mjs) every
// region draws its pieces again by the trail: start 0 stays by the gate, starts 1-4 on the trail first, then within 3 places of it on their level, then anywhere (a start off the trail gets a
// branch of 8 places or less); outposts at the ends of branches and spurs and at forks first, preferring a sheltered cove, a confluence, a fork on open low ground (mapgen-study R10); beacons
// twice as likely by the trail. A region that cannot make a full set from the trail keeps its baseline.
export function roadInput(out) {
  const { realm, regions } = out, NR = RW * RH, r3 = v => Math.round(v * 1000);
  const walk = new Uint8Array(NR), ford = new Uint8Array(NR), land = new Uint8Array(NR), level = new Uint8Array(NR), comp = new Uint8Array(NR), e = new Int16Array(NR), stair = new Uint8Array(NR), coast = new Uint8Array(NR);
  for (const G of regions) {
    const [ax, ay] = G.slot, wc = c => (ay * MH + ((c / MW) | 0)) * RW + ax * MW + (c % MW);
    for (const cr of G.cross) if (cr.side === 's' && G.level[cr.c] > G.level[cr.c + MW]) stair[wc(cr.c)] = 1;
    for (let c = 0; c < NC; c++) { const w = wc(c); land[w] = G.land[c]; ford[w] = G.ford[c]; level[w] = G.level[c]; comp[w] = G.comp[c]; e[w] = r3(realm.E[w]); coast[w] = G.coast[c];
      walk[w] = !G.coast[c] && !G.island[c] && (G.land[c] !== L.WATER || G.ford[c] === 1) ? 1 : 0; }
  }
  return { seed: realm.seed, RW, RH, MW, MH, walk, ford, land, level, comp, e, stair, coast };
}
export function piecesOf(out, I) {
  const { realm, regions } = out, roads = realm.roads, seed = realm.seed, NR = RW * RH, d0 = ringDist(roads.on, RW, RH);
  const endSet = new Set(roads.ends), forkSet = new Set(roads.forks), X = w => w % RW, Y = w => (w / RW) | 0;
  const wetW = w => I.land[w] === L.WATER && !I.ford[w], inR = (x, y) => x >= 0 && y >= 0 && x < RW && y < RH;
  // R10: a sheltered cove (a shore cell with water on one side only) and a confluence (a stream joining a stream, a river or a lake)
  const coveAt = new Uint8Array(NR); for (let w = 0; w < NR; w++) if (I.walk[w] && !I.ford[w]) { let n = 0; for (const [, dx, dy] of SIDES) { const x = X(w) + dx, y = Y(w) + dy; if (inR(x, y) && wetW(y * RW + x)) n++; } if (n === 1) coveAt[w] = 1; }
  const confAt = new Uint8Array(NR);
  for (const f of realm.features || []) if (f.kind === 'stream' && f.links.mouth && ['river', 'lake', 'stream'].includes(f.links.mouth.kind)) { const c = f.links.mouth.kind === 'stream' ? f.links.mouth.c : f.cells[f.cells.length - 1];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const x = X(c) + dx, y = Y(c) + dy; if (inR(x, y)) confAt[y * RW + x] = 1; } }
  const openLow = w => { if (I.level[w]) return false; let n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const m = w + dy * RW + dx; if (inR(X(w) + dx, Y(w) + dy) && I.walk[m] && !I.ford[m] && I.level[m] === I.level[w]) n++; } return n >= 6; };
  // dl: steps on one level from the trail (4 ways over walkable cells), and the step toward it: what a branch would take
  const dl = new Int16Array(NR).fill(999), toward = new Int32Array(NR).fill(-1), q0 = [];
  for (let w = 0; w < NR; w++) if (roads.on[w]) { dl[w] = 0; q0.push(w); }
  for (let h = 0; h < q0.length; h++) { const u = q0[h]; if (dl[u] >= 8) continue; for (const [, dx, dy] of SIDES) { const x = X(u) + dx, y = Y(u) + dy; if (!inR(x, y)) continue; const n = y * RW + x; if (!I.walk[n] || I.ford[n] || I.level[n] !== I.level[u] || dl[n] <= dl[u] + 1) continue; dl[n] = dl[u] + 1; toward[n] = u; q0.push(n); } }
  const cdw = (a, b) => Math.max(Math.abs(X(a) - X(b)), Math.abs(Y(a) - Y(b)));
  const extra = [];
  for (const G of regions) {
    const [ax, ay] = G.slot, wc = c => (ay * MH + ((c / MW) | 0)) * RW + ax * MW + (c % MW);
    if (!G.spawns.length || G.gate < 0) continue;
    // starts: 0 stays; 1-4 by the trail, five cells apart
    const sp = [G.spawns[0]], hSp = hashHead([seed, 'gen7', 'spawn-road', ax, ay]), sband = c => (dl[wc(c)] === 0 ? 0 : dl[wc(c)] <= 3 ? 1 : 2);
    const cand = G.startSites.filter(c => c !== sp[0]).map(c => ({ c, b: sband(c), k: hashTail(hSp, c) })).sort((a, b) => a.b - b.b || a.k - b.k || a.c - b.c).map(o => o.c);
    for (const c of cand) { if (sp.length >= 5) break; if (sp.every(p => cdist(p, c) >= 5)) sp.push(c); }
    if (sp.length < 5) for (const c of G.spawns) { if (sp.length >= 5) break; if (!sp.includes(c) && sp.every(p => cdist(p, c) >= 5)) sp.push(c); }
    if (sp.length === 5) {
      G.spawns = sp;
      for (const c of sp) { const w = wc(c); if (dl[w] > 0 && dl[w] <= 8) { const cells = []; for (let u = w; u >= 0; u = toward[u]) cells.push(u); extra.push(cells); } }   // a branch from the start to the trail
    }
    // glows: the neighbour of each start that is rock or wood (or a cell made rock)
    { const glow = [];
      for (const sp1 of G.spawns) { const p = cxy(sp1), nb = [];
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const x = p.x + dx, y = p.y + dy; if ((!dx && !dy) || !inRegion(x, y)) continue; const c = y * MW + x;
          if (G.comp[c] && passableIn(G, c) && G.land[c] !== L.WATER && c !== G.gate && c !== G.deep && c !== G.swim && !G.island[c] && !G.spawns.includes(c) && G.level[c] === G.level[sp1]) nb.push(c); }
        if (!nb.length) continue;
        let c = nb.find(n => G.land[n] === L.ROCK || G.land[n] === L.WOOD); if (c == null) { c = nb.find(inner); if (c == null) continue; G.land[c] = L.ROCK; }
        if (!glow.includes(c)) glow.push(c); }
      G.glow = glow; }
    // outposts: six, five apart
    const dc = []; for (let c = 0; c < NC; c++) if (G.comp[c] && G.land[c] !== L.WATER && !G.island[c] && c !== G.gate && c !== G.deep && c !== G.swim && !G.spawns.includes(c)) dc.push(c);
    const band = c => { const w = wc(c), camp = coveAt[w] || confAt[w];
      if ((endSet.has(w) || forkSet.has(w)) && camp) return 0; if (forkSet.has(w) && openLow(w)) return 1; if (endSet.has(w)) return 2;
      if (d0[w] <= 1 && camp) return 3; if (d0[w] === 0) return 4; if (d0[w] <= 1) return 5; return 6; };
    const hDp = hashHead([seed, 'gen7', 'depot-road', ax, ay]);
    const dcs = dc.map(c => ({ c, b: band(c), k: hashTail(hDp, c) })).sort((a, b) => a.b - b.b || a.k - b.k || a.c - b.c).map(o => o.c);
    const dset = new Set(); for (const c of dcs) { if (dset.size >= 6) break; if ([...dset].every(d => cdist(d, c) >= 5)) dset.add(c); }
    if (dset.size === 6) G.depots = { seed: G.seed, set: dset };
    // beacons: today's chance (rock 35, meadow 8 in 100) two and a half times as likely within a cell of the trail, a quarter as likely off it; none within 2 cells of another
    const bset = new Set(), hBc = hashHead([seed, 'gen7', 'cairn-road', ax, ay]);
    for (let c = 0; c < NC; c++) { if ((G.land[c] !== L.ROCK && G.land[c] !== L.MEADOW) || !G.comp[c] || G.depots.set.has(c)) continue; const pct = (G.land[c] === L.ROCK ? 35 : 8) * (d0[wc(c)] <= 1 ? 2.5 : 0.25);
      if (hashTail(hBc, c) % 100 >= pct) continue; if ([...bset].every(b => cdist(b, c) > 2)) bset.add(c); }
    G.beacons = { seed: G.seed, set: bset };
  }
  if (extra.length) { roads.lists.push(...extra); for (const _ of extra) roads.kinds.push('start'); const g = roadGraph(NR, RW, roads.lists); roads.on = g.on; roads.ends = []; roads.forks = []; for (const [v, a] of g.adj) { if (a.length === 1) roads.ends.push(v); else if (a.length >= 3) roads.forks.push(v); } roads.startBranches = extra.length; }
}

// today's g2Check, on the region's cells, plus the walkable-cells floor
function checkRegion(G, biome) {
  const lv = G.level, land = G.land, comp = G.comp, bad = [];
  for (let c = 0; c < NC; c++) { const x = c % MW, y = (c / MW) | 0;
    for (const [dx, dy] of NB8) { const X = x + dx, Y = y + dy; if (!inRegion(X, Y)) continue; const n = Y * MW + X;
      if (Math.abs(lv[c] - lv[n]) > 1) bad.push('step'); if (land[c] === L.WATER && !G.coast[c] && lv[n] !== 0) bad.push('ring'); }   // the coast's water has no raised land within twelve tiles of it (levels.mjs RAISE_OFF)
    if (land[c] === L.WATER && lv[c] !== 0) bad.push('ring');
    if (x < MW - 1 && y < MH - 1 && isSaddle(lv, c, MW)) bad.push('saddle'); }
  for (let Y = 0; Y <= MH; Y++) for (let X = 0; X <= MW; X++) { let ranks = 0;
    for (let dy = -1; dy <= 0; dy++) for (let dx = -1; dx <= 0; dx++) { const x = X + dx, y = Y + dy; if (!inRegion(x, y)) continue; const c = y * MW + x; ranks |= 1 << (land[c] === L.WATER && !G.coast[c] ? 0 : 1 + lv[c]); }   // the coast's water ranks as the low ground it stands on
    if (((ranks & 1) + ((ranks >> 1) & 1) + ((ranks >> 2) & 1) + ((ranks >> 3) & 1)) > 2) bad.push('corner'); }
  if (!(G.gate >= 0)) bad.push('gate');
  if (G.spawns.length !== 5 || !(G.gate >= 0 && cdist(G.spawns[0], G.gate) >= 2 && cdist(G.spawns[0], G.gate) <= 4)) bad.push('spawns');
  const inComp = c => c >= 0 && comp[c] === 1;
  if (!inComp(G.deep) || !G.spawns.every(inComp) || !G.glow.every(inComp) || (G.swim >= 0 && !inComp(G.swim)) || ![...G.beacons.set].every(inComp) || G.depots.set.size !== 6 || ![...G.depots.set].every(inComp)) bad.push('comp');
  let dryN = 0, dryComp = 0, walk = 0; const per = [0, 0];
  for (let c = 0; c < NC; c++) { walk += comp[c]; if (land[c] !== L.WATER && !G.island[c]) { dryN++; if (comp[c]) dryComp++; per[lv[c]]++; } }
  // the coast took the border ring (G.coast): those cells count as the land they were, so a region on the rim is held to the same bar as one off it (they are water now, on every map and in the walk)
  { let lost = 0; for (let c = 0; c < NC; c++) lost += G.coast[c]; dryN += lost; dryComp += lost; walk += lost; per[0] += lost; G.lost = lost; }
  if (dryComp * 100 < G2.MIN_COMP_PCT * dryN) bad.push('compShare');
  if (walk < WALK_MIN) bad.push('walk');
  if (per.some(n => n * 100 < G2.MIN_SHARE_PCT * dryN)) bad.push('share');
  if (G.cross.length < 1) bad.push('ramps');
  if (G.stranded * 100 > STRANDED_MAX_PCT * dryN) bad.push('ways');   // too much land that no stair with a way up reaches: the region is drawn again
  return [...new Set(bad)];
}

// ---- the realm: attempts until every region passes ----
// A region that fails is re-drawn with the next attempt number; the attempt only moves that slot's own parameters and its piece draws, and the blend carries the
// change into the neighbours' border cells by position, so the borders still agree. Rounds repeat until every region passes (or ROUNDS is spent).
// ---- the coast: the realm's border ring is wide water ----
// The outermost ring of the realm's cells (one cell deep: 356 of 8,000) is water nobody crosses; the ring inside it is low ground. It is laid AFTER every region has passed its checks, so no region is
// drawn again, `tries` stay as the checks left them and the nine inner regions (and every seam between regions) are as they were. Only the sixteen regions on the rim are made again, from the realm with its
// coast: the same hashes, so the land away from the rim is the same.
const LAND_SHAPE = ['walk', 'ways', 'compShare', 'share'];
// The raised land never ends in a straight cut along the shore: a plateau cell in the first TAPER cells inside the ring is lowered to the low ground, so the drop to the shore happens inland and
// follows the shapes of cells. How many cells (1 to TAPER) varies along each side by value noise of the seed, three cells to a knot, so the plateau's edge wanders in broad steps and a strip
// of raised land never stands alone between lowered cells. A cell's rank only ever falls, and the cells further in keep theirs, so no saddle is made by the taper itself (fixSaddles is the guard).
export const TAPER = 3, TAPER_KNOT = 1;
function taperCoast(realm) {
  const { seed, level } = realm, knot = (side, i) => (hash(seed, 'gen7', 'taper', side, i) % 1024) / 1024;
  for (let y = 1; y < RH - 1; y++) for (let x = 1; x < RW - 1; x++) {
    const c = y * RW + x; if (!level[c]) continue;
    const kx = Math.min(x, RW - 1 - x), ky = Math.min(y, RH - 1 - y), k = Math.min(kx, ky); if (k > TAPER) continue;
    const alongX = ky < kx, s = alongX ? x : y, side = alongX ? (y < RH / 2 ? 0 : 1) : (x < RW / 2 ? 2 : 3), i = Math.floor(s / TAPER_KNOT), f = (s % TAPER_KNOT) / TAPER_KNOT;
    const v = knot(side, i) * (1 - f) + knot(side, i + 1) * f;
    if (k <= 1 + Math.floor(v * TAPER * 0.999)) level[c] = 0;   // its raising height is lifted over its own by the e0 pass (coastOf), so the land at tile scale (levels.mjs) stays low in it too
  }
  closeLevels(level, RW, RH); fixSaddles(level, RW, RH);
}
function coastOf(out) {
  const { realm } = out, coast = new Uint8Array(RW * RH);
  for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) {
    const c = y * RW + x;
    if (x === 0 || y === 0 || x === RW - 1 || y === RH - 1) { coast[c] = 1; realm.land[c] = L.WATER; realm.wkind[c] = 2; realm.ford[c] = 0; realm.level[c] = 0; }
  }
  taperCoast(realm);
  editE0(realm);
  realm.coast = coast;
  for (let ay = 0; ay < ATLAS; ay++) for (let ax = 0; ax < ATLAS; ax++) if (ax === 0 || ay === 0 || ax === ATLAS - 1 || ay === ATLAS - 1) {
    let G = regionAt(realm, ax, ay);
    for (let pt = 1; pt < 12 && G.fails.length; pt++) { const H = regionAt(realm, ax, ay, pt); if (H.fails.length < G.fails.length) G = H; }
    G.fails = G.fails.filter(f => !LAND_SHAPE.includes(f));   // the region passed these before the coast took its ring; what the ring cuts off is not drawn again (that would move the neighbours)
    out.regions[ay * ATLAS + ax] = G;
  }
}
// The arrays the realm's features read (features.mjs): the realm's cells, with the regions' final land, level, fords and stairs, whole numbers (heights in thousandths).
export function featureInput(out) {
  const { realm, regions } = out, NR = RW * RH, raw = rawRealm(realm.seed), r3 = v => Math.round(v * 1000);
  const level = new Uint8Array(NR), ford = new Uint8Array(NR), land = new Uint8Array(NR), stair = new Uint8Array(NR), slot = new Uint8Array(NR), walk = new Uint8Array(NR), comp = new Uint8Array(NR);
  for (const G of regions) {
    const [ax, ay] = G.slot, wc = c => (ay * MH + ((c / MW) | 0)) * RW + ax * MW + (c % MW);
    for (let c = 0; c < NC; c++) { const w = wc(c); level[w] = G.level[c]; ford[w] = G.ford[c]; land[w] = G.land[c]; slot[w] = ay * ATLAS + ax; comp[w] = G.comp[c];
      walk[w] = !G.coast[c] && !G.island[c] && (G.land[c] !== L.WATER || G.ford[c] === 1) ? 1 : 0; }   // walk and comp as roadInput has them: W4 puts a spring only where a trail may stand
    for (const cr of G.cross) if (cr.side === 's' && G.level[cr.c] > G.level[cr.c + MW]) stair[wc(cr.c)] = 1;
  }
  return { RW, RH, level, land, ford, stair, slot, walk, comp, coast: realm.coast, wkind: realm.wkind, E: Int32Array.from(realm.E, r3), e0: Int32Array.from(realm.e0, r3),
    acc: Int32Array.from(raw.acc, v => Math.round(v)), down: raw.down, cuts: realm.cuts };
}
// The realm's named features (features.mjs). They only read the realm: its land, levels and every other output are as they were.
export function addFeatures(out) {
  const F = realmFeatures(featureInput(out));
  out.realm.features = F.list; out.realm.destinations = F.dest; out.realm.featureStats = F.stats;
  return F;
}
// The realm's one trail network (roads.mjs), laid on the realm once the features are known; then every region draws its pieces by it (piecesOf). Bridges and the destinations the trails add (far
// shores, bridges, the land's own spots in holes) join the realm's features and destinations.
export function addRoads(out, F) {
  const t0 = Date.now(), I = roadInput(out), realm = out.realm;
  const extraHubs = F.dest.filter(d => d.kind === 'pass' || d.kind === 'ravine').map(d => d.c);
  // the edge probe: the land's height field (levels.mjs, before any pass), read only on the edges a trail or a bridge bank uses; the realm still reads no tile land (S1)
  const LV = levelsOf(realm), cx = c => c % RW, cy = c => (c / RW) | 0;
  const pond = c => realm.land[c] === L.POND, edgeOk = (a, b) => { const need = pond(a) || pond(b) ? 10 : 6; return edgeRows(LV, cx(a), cy(a), cx(b), cy(b), need, 2, I.level[a] ? 1 : 0) >= need; };   // a pond place lays more water than the field shows: twice the rows
  const bankOk = (a, b) => bankRows(LV, cx(a), cy(a), cx(b), cy(b), 7) >= 7;
  const R = realmRoads({ ...I, ...(globalThis.F4NOPROBE ? {} : { edgeOk, bankOk }), extraHubs, dest: F.dest, bodies: F.bodies, streams: F.streams, escarpments: F.escarpments, rangeOf: F.rid });
  const bodyOf = new Map(); for (const b of F.bodies) for (const c of b.cells) bodyOf.set(c, b);
  for (const b of R.bridges) { const w = bodyOf.get(b.cells[0]); b.river = w ? w.kind + '-' + w.id : null; realm.features.push({ id: b.id, kind: 'bridge', cells: b.cells, links: { ends: b.ends, axis: b.axis === 1 ? 'x' : 'y', river: b.river, around: b.around } }); }
  realm.destinations = R.dest;
  realm.roads = { lists: R.lists, kinds: R.kinds, on: R.on, ends: R.ends, forks: R.forks, hubs: R.hubs.map(h => h.c), loops: R.loops.length, bridges: R.bridges, stuck: R.stuck, stats: R.stats };
  const t1 = Date.now(); piecesOf(out, I);
  realm.roads.stats.msRoads = t1 - t0; realm.roads.stats.msPieces = Date.now() - t1;   // the time of the network and of the piece pass (reported by the checks)
  return I;
}
export const ROUNDS = 64;   // was 24: with stairs only where a south-facing face exists, two marsh regions of seeds 1-200 (62 and 173) needed more draws
const cache = new Map();
// The realm made elsewhere (a Web Worker, or the page's store) is put in the cache, so the page never makes it on its own thread. REALM_REV names this generator's output: it changes with any
// change that moves a realm (a stored realm of another revision is never used).
export const REALM_REV = 12;   // 12: land levels (map-levels-build-1): the raise line at the 70% quantile and the terrace lattice of 4-7 column blocks, so the land of every seed changes; older saves start fresh with the landChanged line; 11: the land round (realm-landmarks-tune-2, rupar-banks-slice-2, bank-wire-1, PR 364) changed what a seed makes while the number stayed 10; raised so older saves start fresh with the landChanged line (lock-playtest-world-4); 10: something beside the trail and water at the cliff foot (map-making-research-1 R1 and W4, realm-roam-r1w4-1): the land's own spots along the trail where a stretch passes 8 places with nothing beside it, and a spring at the foot of a long escarpment with no water; the land's levels, heights, water and features are as 9 (a trail's own lane may turn one ground cell beside it); 9: the land freeze (lock-playtest-world, owner 2026-11-10 20:20): the land is what main held on 2026-11-17 (signed grounds, raised ground, closed edges, the Loika in every land), the generator's output unchanged; this number and REALM_BIOME_V (regions.mjs) are what a save and src/data/playtest-seeds.mjs record, and the land a save names is the land it keeps; 8:the realm crosses a cell edge only where the land's height field leaves shared low dry rows (the edge probe), and a bridge needs dry banks that meet; 7: the realm's one trail network (roads.mjs; the region's own trails are gone) and the piece pass; 6: stairs at cell scale (the realm reads no tile land; the place seats the way up) with the land rule's held sites; 5: the land rule (levels.mjs: whole-number noise field, rounded passes, no bins); 4: the coast cliff is drawn in bins (levels.mjs coastBins); 2: the coast (the border ring is water), the shore band, and the overview raster of every region; 3: the raised land tapers away from the ring by cells, and the shore band is smoothed with the ground
export const hasRealm7 = seed => cache.has(seed);
// the realm's stairs for the place (levels.mjs seats each way up): every south stair, by the cell it stands on and its port, read from the regions that stayed. Plain data: the realm reads no tile land
export function attachStairs(R) {
  const list = [];
  for (const G of R.regions) { const [ax, ay] = G.slot;
    for (const cr of G.cross) if (cr.side === 's') list.push({ X: ax * MW + (cr.c % MW), Y: ay * MH + ((cr.c / MW) | 0), port: portOffset(R.seed, ax, ay, 2 * cr.c + 1) }); }
  R.realm.stairs = list;
}
export function setRealm7(seed, R) { if (cache.size > 6) cache.clear(); if (!R.realm.stairs) attachStairs(R); cache.set(seed, R); }
// onStep(done, of): the real stages of the making, for the first-load wait's pips (the region passes, then the coast; a repeated round keeps the count at its last region): REALM_STEPS in all (the Hollow Tree sites make the last)
export const REALM_STEPS = ATLAS * ATLAS + 2;
export function realm7(seed, onStep) {
  if (cache.has(seed)) return cache.get(seed);
  const tries = new Uint8Array(ATLAS * ATLAS); let out = null;
  for (let round = 0; round < ROUNDS; round++) {
    const realm = buildRealm(seed, tries), regions = [];
    // a region whose cells and their one-cell ring are as last round, with the same attempt, is the same region: it is kept, not made again
    const same = (s, ax, ay) => { if (!out || out.realm.tries[s] !== tries[s]) return false; const a = out.realm;
      for (let y = Math.max(0, ay * MH - 1); y < Math.min(RH, ay * MH + MH + 1); y++) for (let x = Math.max(0, ax * MW - 1); x < Math.min(RW, ax * MW + MW + 1); x++) { const c = y * RW + x;
        if (a.land[c] !== realm.land[c] || a.level[c] !== realm.level[c] || a.ford[c] !== realm.ford[c] || a.wkind[c] !== realm.wkind[c]) return false; }
      return true; };
    for (let ay = 0; ay < ATLAS; ay++) for (let ax = 0; ax < ATLAS; ax++) { const s = ay * ATLAS + ax; regions.push(same(s, ax, ay) ? out.regions[s] : regionAt(realm, ax, ay)); if (onStep) onStep(regions.length, REALM_STEPS); }
    out = { seed, realm, regions, rounds: round + 1 };
    const bad = regions.filter(r => r.fails.length); if (!bad.length) break;
    for (const r of bad) tries[r.slot[1] * ATLAS + r.slot[0]]++;
  }
  coastOf(out); if (onStep) onStep(REALM_STEPS - 1, REALM_STEPS);
  attachStairs(out);
  addRoads(out, addFeatures(out));
  if (cache.size > 6) cache.clear();
  cache.set(seed, out); return out;
}
// The region of a slot, by the realm seed and its position (the same whenever and in whatever order it is opened).
export const genRegion7 = (seed, ax, ay) => realm7(seed).regions[ay * ATLAS + ax];
