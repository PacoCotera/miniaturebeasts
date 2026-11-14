// Generator 7, layer 1: the region (16 x 20 cells at an atlas slot). Pure, like world.mjs.
// A region is a window onto the realm's one land (world.mjs: water, land, levels, fords, closed over the whole realm), so its cells already agree with
// its neighbours' along the shared border. This layer adds what only exists inside one region: stairs (today's spanning tree over the level zones),
// the swim island, the set pieces (gate, deep stone, swim gate, five starts, outposts, beacons), trails by A* with ports, and today's region checks.
// Every decision is a hash of the realm seed and a world position (and the region's attempt number), never of the order regions were opened in.
import FlatQueue from 'flatqueue';
import { hash, makeRng, MW, MH, L, EDGE, G2, WALK_MIN, BIOME_GROUND, cdist, cxy, cheb, passableIn, canStepIn, edgeIndex } from '../world.mjs';
import { ATLAS } from '../regions.mjs';
import { buildRealm, RW, RH, CW, CH, NB8, isSaddle, levelZones, closeLevels, fixSaddles } from './world.mjs';
import { levelsOf, findWayup, forgetLevels } from './levels.mjs';

export const NC = MW * MH;
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
export const edgeOfStep = (a, b) => { const d = b - a; return d === 1 ? 2 * a : d === -1 ? 2 * b : d === MW ? 2 * a + 1 : 2 * b + 1; };

// ---- trails: A* over the cell graph ----
// Past explorers' roads join outposts, beacons and fords. Level ground is preferred; levels are crossed only at stairs; water only at fords.
// One A* on flatqueue for every grid in generator 7: the cell graph here, and the tiles of a place (place.mjs). step(c, n, dir) is the cost of moving from cell c to its
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
function astar(G, from, to) {
  const cost = c => (G.ford[c] ? 4 : G.land[c] === L.POND ? 3 : G.land[c] === L.WOOD ? 3 : G.land[c] === L.ROCK ? 3 : 2);
  return route(MW, MH, from, to, (c, n, dir) => (!canStepIn(G, c, dir) || G.island[n] ? null : cost(n) + (G.edge[edgeIndex(c, dir)] === EDGE.RAMP ? 6 : 0)));
}
function trailsOf(G) {
  const nodes = [...G.depots.set, ...G.beacons.set].filter(c => G.comp[c]);
  const fordSeen = new Set();   // one ford a water body: the lowest cell of each
  for (let c = 0; c < NC; c++) if (G.ford[c] && G.comp[c] && !fordSeen.has(G.wbody[c])) { fordSeen.add(G.wbody[c]); nodes.push(c); }
  if (nodes.length < 2) return [];
  const used = [0], out = [], rest = nodes.slice(1);   // Prim's tree over the nodes by cell distance, then A* for each branch
  while (rest.length) {
    let best = null;
    for (const u of used) for (let j = 0; j < rest.length; j++) { const d = cheb(cxy(nodes[u]), cxy(rest[j])) * 16 + (hash(G.seed, 'gen7', 'trail', nodes[u], rest[j]) & 15); if (!best || d < best.d) best = { d, u, j }; }
    const to = rest.splice(best.j, 1)[0], from = nodes[used[best.u]]; used.push(nodes.indexOf(to));
    const path = astar(G, from, to); if (path) out.push({ a: from, b: to, cells: path });
  }
  return out;
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
  // Stairs. A way up exists only in a south-facing face (the one painted piece), so a stair sits on an edge between a cell and the one south of it, the higher to the north, and only
  // where the place layer finds a straight face of the way up's width on that edge (levels.mjs, the one face test). The tree keeps today's rule (every level zone reachable) and picks
  // another edge, in the order of the hashed keys, where an edge has no face; a region whose zones cannot all be joined that way fails its check and is drawn again.
  const pass = c => passableIn(Gp, c) && !island[c], Z = levelZones(pass, level, MW, MH), cand = [], LVL = levelsOf(realm);
  const faceOk = i => { const c = i >> 1; return !!findWayup(LVL, ax * MW + (c % MW), ay * MH + ((c / MW) | 0), portOffset(seed, ax, ay, i)); };
  const southUp = e => (e.i & 1) === 1 && level[e.a] > level[e.b];
  for (let i = 0; i < 2 * NC; i++) { if (edge[i] !== EDGE.CLIFF) continue; const a = i >> 1, b = i & 1 ? a + MW : a + 1;
    if (pass(a) && pass(b)) cand.push({ i, a, b, key: hash(seed, 'gen7', 'ramp', 2 * wc(a) + (i & 1)) }); }
  cand.sort((p, q) => p.key - q.key || p.i - q.i);
  const find = (up, z) => { while (up[z] !== z) z = up[z]; return z; }, roots = up => { let n = 0; for (let z = 0; z < up.length; z++) if (up[z] === z) n++; return n; };
  const upAll = Int32Array.from({ length: Z.n }, (_, z) => z);   // the zones as every cliff edge would join them
  for (const e of cand) { const ra = find(upAll, Z.id[e.a]), rb = find(upAll, Z.id[e.b]); if (ra !== rb) upAll[ra < rb ? rb : ra] = ra < rb ? ra : rb; }
  const up = Int32Array.from({ length: Z.n }, (_, z) => z);
  for (const e of cand) { if (!southUp(e)) continue; const ra = find(up, Z.id[e.a]), rb = find(up, Z.id[e.b]); if (ra === rb || !faceOk(e.i)) continue; up[ra < rb ? rb : ra] = ra < rb ? ra : rb; edge[e.i] = EDGE.RAMP; }
  const zonesJoined = roots(up) === roots(upAll);
  if (B && B.extraStairs) {   // a biome's own stairs besides the tree's, each clear of a stair beside it on the same wall
    let have = 0; for (let i = 0; i < 2 * NC; i++) if (edge[i] === EDGE.RAMP) have++;
    const along = i => [i - 2, i + 2];
    const extras = cand.filter(e => southUp(e) && edge[e.i] === EDGE.CLIFF && !wet(e.a) && !wet(e.b)).sort((p, q) => hash(s0, 'xramp', p.i) - hash(s0, 'xramp', q.i) || p.i - q.i);
    for (let k = 0, want = ((have * B.extraStairs + 50) / 100) | 0, at = 0; k < want && at < extras.length; at++) {
      const e = extras[at]; if (!along(e.i).every(j => j < 0 || j >= 2 * NC || edge[j] !== EDGE.RAMP) || !faceOk(e.i)) continue;
      edge[e.i] = EDGE.RAMP; k++;
    }
  }
  const cross = []; for (let i = 0; i < 2 * NC; i++) if (edge[i] === EDGE.RAMP) cross.push({ c: i >> 1, side: (i & 1) ? 's' : 'e', kind: 'ramp' });
  // the largest 4-connected walkable set under canStepIn; ties keep the lowest start
  const comp = new Uint8Array(NC);
  { const seen = new Int32Array(NC).fill(-1), qu = new Int32Array(NC); let best = -1, bestN = 0;
    for (let c0 = 0; c0 < NC; c0++) { if (seen[c0] >= 0 || !passableIn(Gp, c0)) continue; let h = 0, n = 0; qu[n++] = c0; seen[c0] = c0;
      while (h < n) { const c = qu[h++], x = c % MW, y = (c / MW) | 0; for (const [dir, dx, dy] of SIDES) { if (!canStepIn(Gp, c, dir)) continue; const d = (y + dy) * MW + x + dx; if (seen[d] < 0) { seen[d] = c0; qu[n++] = d; } } }
      if (n > bestN) { bestN = n; best = c0; } }
    for (let c = 0; c < NC; c++) comp[c] = seen[c] === best && best >= 0 ? 1 : 0; }
  // set pieces, each on a stream of its own. The gate: a non-stair cliff base in the walkable part (its rock stays off the border cells).
  const RG = RGn('gate'), gc = [];
  for (let c = MW; c < NC; c++) { const x = c % MW, y = (c / MW) | 0;
    if (x >= 2 && x <= MW - 3 && y >= 2 && y <= MH - 3 && edge[2 * (c - MW) + 1] === EDGE.CLIFF && level[c - MW] === level[c] + 1 && comp[c] && !wet(c) && !wet(c - MW)) gc.push(c); }
  let gate = -1, mouth = -1, deep = -1, swim = -1, swimDir = null, spawns = [], glow = [];
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
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy; if (inRegion(X, Y) && passableIn(Gp, Y * MW + X) && level[Y * MW + X] === level[c]) n++; }
      if (n < 6) return false;
      const seen = new Uint8Array(NC), qu = [c]; seen[c] = 1;   // the cells a 2-cell reach would give from here
      for (let h = 0; h < qu.length; h++) { const u = qu[h], ux = u % MW, uy = (u / MW) | 0; for (const [dir, dx, dy] of SIDES) { const X = ux + dx, Y = uy + dy; if (!inRegion(X, Y)) continue; const d = Y * MW + X;
        if (seen[d] || !canStepIn(Gp, u, dir) || island[d] || Math.max(Math.abs(X - x), Math.abs(Y - ((c / MW) | 0))) > 2) continue; seen[d] = 1; qu.push(d); } }
      return qu.length >= G2.START_REACH; };
    let sc = []; for (let c = 0; c < NC; c++) if (ok(c)) sc.push(c);
    if (realm.coast) {   // starts keep clear of the coast: 3 cells from the border cells (2 where fewer than 5 are left); a region off the rim never loses one, so its draws are the same
      const gap = c => { const w = wc(c), x = w % RW, y = (w / RW) | 0; return Math.min(x, y, RW - 1 - x, RH - 1 - y); };
      const far = sc.filter(c => gap(c) >= 3); sc = far.length >= 5 ? far : sc.filter(c => gap(c) >= 2);
    }
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
    for (let c = 0; c < NC; c++) { if ((land[c] !== L.ROCK && land[c] !== L.MEADOW) || !comp[c]) continue; const cr = makeRng(hash(s0, 'cairn', c)); if (cr.int(100) >= (land[c] === L.ROCK ? 35 : 8)) continue;
      const p = cxy(c); let close = false; for (const b of bset) if (cheb(p, cxy(b)) <= 2) { close = true; break; } if (!close) bset.add(c); }
    const dc = []; for (let c = 0; c < NC; c++) if (comp[c] && !wet(c) && !island[c] && c !== gate && c !== deep && c !== swim && !bset.has(c)) dc.push({ c, k: hash(s0, 'depot', c) });
    dc.sort((a, b) => a.k - b.k || a.c - b.c);
    for (const { c } of dc) { if (dset.size >= 6) break; const p = cxy(c); if ([...dset].every(d => cheb(p, cxy(d)) >= 5)) dset.add(c); }
  }
  const G = { seed, slot: [ax, ay], biome, gen: 7, attempt: t, land, ford, island, level, edge, cross, comp, gate, mouth, deep, swim, swimDir, spawns, glow, wk, wbody,
    beacons: { seed, set: bset }, depots: { seed, set: dset }, coast: Uint8Array.from({ length: NC }, (_, c) => (realm.coast ? realm.coast[wc(c)] : 0)) };   // coast: the cells of the realm's border ring (wide water, never walked)
  // trails with ports; a stair's port is its way up
  G.trails = trailsOf(G);
  const ports = new Map();
  for (const c of cross) { const e = 2 * c.c + (c.side === 's' ? 1 : 0); ports.set(e, 'stair'); }
  for (const tr of G.trails) for (let i = 1; i < tr.cells.length; i++) { const e = edgeOfStep(tr.cells[i - 1], tr.cells[i]); if (!ports.has(e)) ports.set(e, 'trail'); }
  G.ports = [...ports].sort((a, b) => a[0] - b[0]).map(([e, kind]) => ({ e, off: portOffset(seed, ax, ay, e), kind }));
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
export const TAPER = 3, TAPER_LIFT = 0.08, TAPER_KNOT = 1;
function taperCoast(realm) {
  const { seed, level } = realm, knot = (side, i) => (hash(seed, 'gen7', 'taper', side, i) % 1024) / 1024;
  for (let y = 1; y < RH - 1; y++) for (let x = 1; x < RW - 1; x++) {
    const c = y * RW + x; if (!level[c]) continue;
    const kx = Math.min(x, RW - 1 - x), ky = Math.min(y, RH - 1 - y), k = Math.min(kx, ky); if (k > TAPER) continue;
    const alongX = ky < kx, s = alongX ? x : y, side = alongX ? (y < RH / 2 ? 0 : 1) : (x < RW / 2 ? 2 : 3), i = Math.floor(s / TAPER_KNOT), f = (s % TAPER_KNOT) / TAPER_KNOT;
    const v = knot(side, i) * (1 - f) + knot(side, i + 1) * f;
    if (k <= 1 + Math.floor(v * TAPER * 0.999)) { level[c] = 0; realm.e0[c] = Math.max(realm.e0[c], realm.E[c] + TAPER_LIFT); }   // the height that raises the cell is lifted over its own, so the land at tile scale (levels.mjs) stays low in it too and the contour of the plateau beyond wanders with the land
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
  realm.coast = coast;
  forgetLevels(realm);
  for (let ay = 0; ay < ATLAS; ay++) for (let ax = 0; ax < ATLAS; ax++) if (ax === 0 || ay === 0 || ax === ATLAS - 1 || ay === ATLAS - 1) {
    let G = regionAt(realm, ax, ay);
    for (let pt = 1; pt < 12 && G.fails.length; pt++) { const H = regionAt(realm, ax, ay, pt); if (H.fails.length < G.fails.length) G = H; }
    G.fails = G.fails.filter(f => !LAND_SHAPE.includes(f));   // the region passed these before the coast took its ring; what the ring cuts off is not drawn again (that would move the neighbours)
    out.regions[ay * ATLAS + ax] = G;
  }
}
export const ROUNDS = 64;   // was 24: with stairs only where a south-facing face exists, two marsh regions of seeds 1-200 (62 and 173) needed more draws
const cache = new Map();
// The realm made elsewhere (a Web Worker, or the page's store) is put in the cache, so the page never makes it on its own thread. REALM_REV names this generator's output: it changes with any
// change that moves a realm (a stored realm of another revision is never used).
export const REALM_REV = 4;   // 4: the coast cliff is drawn in bins (levels.mjs coastBins); 2: the coast (the border ring is water), the shore band, and the overview raster of every region; 3: the raised land tapers away from the ring by cells, and the shore band is smoothed with the ground
export const hasRealm7 = seed => cache.has(seed);
export function setRealm7(seed, R) { if (cache.size > 6) cache.clear(); cache.set(seed, R); }
export function realm7(seed) {
  if (cache.has(seed)) return cache.get(seed);
  const tries = new Uint8Array(ATLAS * ATLAS); let out = null;
  for (let round = 0; round < ROUNDS; round++) {
    const realm = buildRealm(seed, tries), regions = [];
    for (let ay = 0; ay < ATLAS; ay++) for (let ax = 0; ax < ATLAS; ax++) regions.push(regionAt(realm, ax, ay));
    out = { seed, realm, regions, rounds: round + 1 };
    const bad = regions.filter(r => r.fails.length); if (!bad.length) break;
    for (const r of bad) tries[r.slot[1] * ATLAS + r.slot[0]]++;
  }
  coastOf(out);
  if (cache.size > 6) cache.clear();
  cache.set(seed, out); return out;
}
// The region of a slot, by the realm seed and its position (the same whenever and in whatever order it is opened).
export const genRegion7 = (seed, ax, ay) => realm7(seed).regions[ay * ATLAS + ax];
