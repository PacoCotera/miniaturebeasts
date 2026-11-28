// Generator 7, F4: the realm's one trail network (roads-spec-1 steps 2-3 with world-topdown-spec-1 2.5, and mapgen-study-1 R8-R10, R14). Pure, whole numbers, no imports but the core's
// whole-number noise, so it runs in Node and on the small engine. It reads the realm's arrays and the realm's features (destinations, streams, bodies) and writes `realm.roads`.
//
// Layers: bridges (rare, straight, over 1-2 cells of deep water) -> hubs (3 a region, plus passes, through-ravines, bridges) -> one multi-source Dijkstra over the cost field (each cell learns
// its nearest hub; hubs whose catchments touch are candidate pairs; Kruskal keeps the tree; the worst detours become loops) -> branches to destinations -> holes filled with the land's own
// destinations (R14) -> spurs by the fork rule (no stretch over RUN_MAX places without a fork) -> R1: the land's own spots along the trail where a stretch of 8 places has nothing beside it.
// Level changes only at the region's own stairs (an upper cell with a south face the region seated a stair on); water only at fords and bridges.
import { fbm, subSeed } from '../../../core/base/noise.mjs';

export const P = {
  HUBS: 3,          // hubs a region
  HUB_GAP: 6,       // cells (Chebyshev) between two hubs of a region, at least
  HUB_IN: 2,        // a hub stands this many cells inside its region's border
  BASE: 10,         // the cost of a step onto open meadow, low ground
  LAND: [0, 300, 4, 14, 0, 99],   // by land kind: meadow, pond (a shore: its tiles are water and strip), rock, wood (thicket: a trail clears a lane), water (a ford, below), cliff
  FORD: 24,         // a step onto a ford (water is crossed only there)
  BRIDGE: 12,       // a step onto a bridge cell (cheaper than a ford, so the road takes a bridge it was offered)
  RAISED: 3,        // a step on raised land (roads prefer the low ground)
  RANGE_COST: 150,  // K3: + this on a step onto a range-belt cell away from a pass
  PASS_NEAR: 2,     // K3: cells (Chebyshev) round a pass where its range costs no more
  SLOPE_DIV: 6,    // + |height difference| / 6 (height x 1000), at most SLOPE_MAX
  SLOPE_MAX: 8,
  WANDER: 6,        // + 0 .. 6 from the whole-number noise, 4-cell lattice (the wander)
  STAIR: 40,        // a step up or down one of the region's stairs (the only way a road changes level)
  LOOPS: 75,        // loop edges a realm, at most
  LOOP_REGION: 4,   // loop edges whose middle lies in one region, at most (the steer says 2-3; 3 left seed 11 at 49 loops a realm)
  LOOP_RATIO: 10,   // a loop only where the tree's way round is 1.0x (in tenths) the direct pair or more: any non-tree pair (1.2x left four of 15 seeds under 50 loops, 1.1x one)
  LOOP_GAP: 3,      // cells between the middles of two loops, at least
  SHORE: 16,        // + this on the three rings of land inside the coast (no road runs round the realm's shore)
  SHORE_IN: 4,      // a hub stands this many cells in from the realm's rim, at least
  WATERSIDE: 70,    // R8: + this on a cell beside deep water (a trail steps back from the water except where it crosses)
  RUN_MAX: 12,      // places of trail without a fork, at most (spurs)
  SPUR: 4,          // places a spur is long, at most
  DEST_REACH: 6,    // a destination within this many places on its own level gets a branch to the trail
  BR_MAX_REALM: 10, // bridges a realm, at most
  BR_GAP: 8,        // cells between two bridges, at least
  BR_SPAN: 2,       // water cells a bridge crosses, at most
  BR_RATIO: 3,      // a bridge only where the way round is this many times the bridge's own road
  REACH: 6,         // R14: places' walk from a destination, at most
  REACH_FILL: 7,    // R14: a hole is filled while a walkable place is farther than this (6 would fill 171 holes a realm; 7 leaves 2% of places over 6 and none over 8)
  DEST_GAP: 3,      // cells (Chebyshev) between two destinations, at least
  TRAIL_RUN: 7,     // R1: places of trail with no destination within one place, at most (a longer stretch gets a spot at its middle)
};

// a small binary heap of (priority, id), ties by id: deterministic on every engine
function heap() {
  const pr = [], id = []; let n = 0;
  const less = (i, j) => pr[i] < pr[j] || (pr[i] === pr[j] && id[i] < id[j]);
  const sw = (i, j) => { const a = pr[i], b = id[i]; pr[i] = pr[j]; id[i] = id[j]; pr[j] = a; id[j] = b; };
  return {
    get size() { return n; },
    push(p, v) { pr[n] = p; id[n] = v; let i = n++; while (i > 0) { const q = (i - 1) >> 1; if (!less(i, q)) break; sw(i, q); i = q; } },
    pop() { const v = id[0], p = pr[0]; n--; if (n > 0) { pr[0] = pr[n]; id[0] = id[n]; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < n && less(l, m)) m = l; if (r < n && less(r, m)) m = r; if (m === i) break; sw(i, m); i = m; } } return [p, v]; },
  };
}
const h32 = (a, b, c) => { let m = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) >>> 0; m = Math.imul(m ^ (b | 0) ^ (m >>> 13), 0xc2b2ae35) >>> 0; m = Math.imul(m ^ (c | 0) ^ (m >>> 16), 0x27d4eb2f) >>> 0; return (m ^ (m >>> 15)) >>> 0; };

// The road as a graph of cells: edges between consecutive cells of the lists, deduplicated.
export function roadGraph(NR, RW, lists) {
  const on = new Uint8Array(NR), E = new Set();
  for (const cells of lists) for (let i = 0; i < cells.length; i++) { on[cells[i]] = 1; if (i) { const a = Math.min(cells[i - 1], cells[i]), b = Math.max(cells[i - 1], cells[i]); E.add(a * 16384 + b); } }
  const adj = new Map(); for (const k of E) { const a = Math.floor(k / 16384), b = k % 16384; if (!adj.has(a)) adj.set(a, []); if (!adj.has(b)) adj.set(b, []); adj.get(a).push(b); adj.get(b).push(a); }
  return { on, E, adj };
}

// I: seed, RW, RH, MW, MH, walk (a trail may stand here: dry land off the coast and the swim island, or a ford), ford, land, level, comp (the region's walkable part), e (height x 1000), stair (the upper cell of
//    each stair the regions seated), coast, wkind; dest (the features' destinations), streams (cells in order, mouth), bodies (water bodies).
// Returns { hubs, paths, tree, loops, lists, bridges, dest, on, ends, spurStuck, stats }.
export function realmRoads(I) {
  const { seed, RW, RH, MW, MH, walk, ford, land, level, comp, e, stair, coast } = I, NR = RW * RH, A = RW / MW, B = RH / MH;
  const X = c => c % RW, Y = c => (c / RW) | 0, cheb = (a, b) => Math.max(Math.abs(X(a) - X(b)), Math.abs(Y(a) - Y(b)));
  const ns = subSeed(seed >>> 0, 'road'), rim = c => Math.min(X(c), Y(c), RW - 1 - X(c), RH - 1 - Y(c));
  const nb4 = c => { const x = X(c), o = []; if (c >= RW) o.push(c - RW); if (x < RW - 1) o.push(c + 1); if (c < NR - RW) o.push(c + RW); if (x > 0) o.push(c - 1); return o; };
  const deepWater = c => land[c] === 4 && !ford[c];
  const wander = new Uint8Array(NR);
  for (let c = 0; c < NR; c++) { const v = fbm(256 * X(c) + 128, 256 * Y(c) + 128, 2, 2, ns); wander[c] = Math.max(0, Math.min(P.WANDER, ((v + 65536) * (P.WANDER + 1)) >> 17)); }
  const side = new Uint8Array(NR);   // R8: a cell beside deep water
  for (let c = 0; c < NR; c++) if (walk[c] && nb4(c).some(deepWater)) side[c] = 1;
  const stats = {}, T0 = Date.now(), tick = n => { stats['t_' + n] = Date.now() - T0; };   // the milliseconds at the end of each stage (the checks report them)

  // K3: a step onto a range-belt cell costs RANGE_COST more, except within PASS_NEAR cells of a pass: the trail meets each range at its passes
  const belt = new Uint8Array(NR);
  if (I.rangeOf) { for (let c = 0; c < NR; c++) if (I.rangeOf[c] >= 0) belt[c] = 1;
    for (const d of I.dest || []) if (d.kind === 'pass') for (let dy = -P.PASS_NEAR; dy <= P.PASS_NEAR; dy++) for (let dx = -P.PASS_NEAR; dx <= P.PASS_NEAR; dx++) { const x = X(d.c) + dx, y = Y(d.c) + dy; if (x >= 0 && x < RW && y >= 0 && y < RH) belt[y * RW + x] = 0; } }

  tick('wander');
  // ---- bridges: a straight span of 1..BR_SPAN cells of deep water (a river or a lake's narrows), both ends dry walkable on one level, where the way round is BR_RATIO x the bridge's road or more ----
  const bridgeAxis = new Uint8Array(NR);   // 1 east-west, 2 north-south, on a bridge's water cells
  const bridges = [];
  { const cand = [];
    const dry = c => c >= 0 && c < NR && walk[c] && !ford[c] && !deepWater(c) && comp[c] && rim(c) >= P.SHORE_IN;
    for (let c = 0; c < NR; c++) { if (!dry(c)) continue;
      for (const [d, ax] of [[1, 1], [RW, 2]]) { if (ax === 1 && X(c) === RW - 1) continue;
        const cells = []; let k = c + d;
        while (cells.length < P.BR_SPAN && k < NR && !(ax === 1 && X(k) === 0) && deepWater(k) && !coast[k]) { cells.push(k); k += d; }
        if (!cells.length || k >= NR || (ax === 1 && X(k) === 0) || !dry(k) || level[c] !== level[k] || level[c] !== 0) continue;
        // only a span of exactly the water between the banks (the loop above stops at a dry cell or at BR_SPAN; a longer water run is no bridge)
        cand.push({ a: c, b: k, cells, ax, len: cells.length + 2 }); } }
    // the way round on foot (one level, fords, no bridge) within BR_RATIO x the bridge's own road: no bridge
    const detour = (a, b, lim) => { const dist = new Map([[a, 0]]), q = [a]; for (let h = 0; h < q.length; h++) { const u = q[h], k = dist.get(u); if (u === b) return k; if (k >= lim) continue;
      for (const n of nb4(u)) if (!dist.has(n) && walk[n] && level[n] === level[u] && !(deepWater(n))) { dist.set(n, k + 1); q.push(n); } } return -1; };
    const LIM = 60, ok = [];
    for (const k of cand) { const r = detour(k.a, k.b, LIM); const around = r < 0 ? 9999 : r; if (around >= P.BR_RATIO * k.len) { k.around = around; k.hash = h32(seed, k.a, 31); ok.push(k); } }
    ok.sort((p, q) => p.len - q.len || q.around - p.around || p.hash - q.hash || p.a - q.a);
    const slotUsed = new Set();
    for (const k of ok) { if (bridges.length >= P.BR_MAX_REALM) break;
      const s = Math.floor(Y(k.a) / MH) * A + Math.floor(X(k.a) / MW); if (slotUsed.has(s)) continue;
      if (bridges.some(b => cheb(b.mid, k.cells[0]) < P.BR_GAP)) continue;
      if (I.bankOk && !I.bankOk(k.a, k.b)) { stats.bridgesMoved = (stats.bridgesMoved || 0) + 1; continue; }   // both banks need 7+ dry low rows that meet (the probe of the height field): else the next candidate along the water
      slotUsed.add(s); bridges.push({ id: 'bridge-' + bridges.length, cells: k.cells, ends: [k.a, k.b], axis: k.ax, mid: k.cells[0], around: k.around, body: -1 }); }
    for (const b of bridges) for (const c of b.cells) bridgeAxis[c] = b.axis; }
  stats.bridges = bridges.length;
  const walkB = c => walk[c] || bridgeAxis[c] > 0;   // a cell a trail may stand on, a bridge's water included

  // the cost of a step from c to n (4-neighbours), or -1
  const step = (c, n) => {
    if (!walkB(n) || !walkB(c) || (blocked.size && blocked.has(edgeKey(c, n)))) return -1;
    const d = n - c, ax = d === 1 || d === -1 ? 1 : 2;
    if (bridgeAxis[n] && bridgeAxis[n] !== ax) return -1;   // a bridge is entered and left straight
    if (bridgeAxis[c] && bridgeAxis[c] !== ax) return -1;
    let k = P.BASE + (bridgeAxis[n] ? P.BRIDGE : ford[n] ? P.FORD : P.LAND[land[n]]) + (level[n] ? P.RAISED : 0) + (rim(n) <= 5 ? P.SHORE : 0) + Math.min(P.SLOPE_MAX, (Math.abs(e[n] - e[c]) / P.SLOPE_DIV) | 0) + wander[n] + (belt[n] ? P.RANGE_COST : 0) + (side[n] && !ford[n] && !bridgeAxis[n] ? P.WATERSIDE : 0);
    if (level[n] !== level[c]) {
      if (n === c + RW && level[c] > level[n] && stair[c]) k += P.STAIR;
      else if (n === c - RW && level[n] > level[c] && stair[n]) k += P.STAIR;
      else return -1;
    }
    return k;
  };

  tick('bridges');
  // ---- hubs: per region, the open low meadow cells of its main part, three of them apart; the realm's junction destinations and the bridges are hubs too ----
  const hubs = [];
  for (let ay = 0; ay < B; ay++) for (let ax = 0; ax < A; ax++) {
    const cand = [];
    for (let y = P.HUB_IN; y < MH - P.HUB_IN; y++) for (let x = P.HUB_IN; x < MW - P.HUB_IN; x++) {
      const c = (ay * MH + y) * RW + ax * MW + x;
      if (!walk[c] || ford[c] || !comp[c] || rim(c) < P.SHORE_IN) continue;
      let open = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const m = c + dy * RW + dx; if ((dx || dy) && walk[m] && !ford[m] && level[m] === level[c]) open++; }
      if (open < 6) continue;
      cand.push({ c, sc: 4 * open + (land[c] === 0 ? 6 : 0) + (level[c] ? 0 : 6) + (side[c] ? 0 : 4) + (h32(seed, c, 7) & 7) });
    }
    cand.sort((p, q) => q.sc - p.sc || p.c - q.c);
    const took = [];
    for (const k of cand) { if (took.length >= P.HUBS) break; if (took.every(t => cheb(t, k.c) >= P.HUB_GAP)) took.push(k.c); }
    for (const c of took) hubs.push({ c, slot: [ax, ay] });
  }
  for (const c of I.extraHubs || []) { if (!walk[c] || ford[c] || rim(c) < P.SHORE_IN) continue; if (hubs.every(h => cheb(h.c, c) >= 3)) hubs.push({ c, slot: [(X(c) / MW) | 0, (Y(c) / MH) | 0], dest: true }); }
  for (const b of bridges) for (const c of b.ends) if (!hubs.some(h => h.c === c)) hubs.push({ c, slot: [(X(c) / MW) | 0, (Y(c) / MH) | 0], dest: true, bridge: b.id });

  tick('hubs');
  // ---- one Dijkstra from every hub; the pairs; Kruskal; loops; trace ----
  const netw = () => {
  const dist = new Int32Array(NR).fill(0x3fffffff), owner = new Int32Array(NR).fill(-1), prev = new Int32Array(NR).fill(-1), q = heap();
  hubs.forEach((h, i) => { dist[h.c] = 0; owner[h.c] = i; q.push(0, h.c); });
  while (q.size) {
    const [d, c] = q.pop(); if (d > dist[c]) continue;
    for (const n of nb4(c)) { const k = step(c, n); if (k < 0) continue; const nd = d + k; if (nd < dist[n]) { dist[n] = nd; owner[n] = owner[c]; prev[n] = c; q.push(nd, n); } }
  }
  const pair = new Map();
  for (let c = 0; c < NR; c++) { if (owner[c] < 0) continue; for (const n of [c + 1, c + RW]) {
    if ((n === c + 1 && X(c) === RW - 1) || n >= NR || owner[n] < 0 || owner[n] === owner[c]) continue;
    const k1 = step(c, n), k2 = step(n, c); if (k1 < 0 && k2 < 0) continue;
    const w = dist[c] + dist[n] + Math.max(k1, k2), a = Math.min(owner[c], owner[n]), b = Math.max(owner[c], owner[n]), key = a * 4096 + b, cur = pair.get(key);
    if (!cur || w < cur.w || (w === cur.w && c < cur.x)) pair.set(key, { a, b, w, x: c, y: n });
  } }
  const pairs = [...pair.values()].sort((p, q2) => p.w - q2.w || p.a - q2.a || p.b - q2.b);
  const up = hubs.map((_, i) => i), find = i => { while (up[i] !== i) { up[i] = up[up[i]]; i = up[i]; } return i; };
  const tree = [], rest = [];
  for (const p of pairs) { const ra = find(p.a), rb = find(p.b); if (ra === rb) { rest.push(p); continue; } up[ra] = rb; tree.push(p); }
  const adj = hubs.map(() => []); for (const p of tree) { adj[p.a].push([p.b, p.w]); adj[p.b].push([p.a, p.w]); }
  const treeDist = (s, t) => { const D = new Map([[s, 0]]), st = [s]; while (st.length) { const u = st.pop(); if (u === t) return D.get(u); for (const [v, w] of adj[u]) if (!D.has(v)) { D.set(v, D.get(u) + w); st.push(v); } } return -1; };
  const mid = p => p.x;
  const loopCand = rest.map(p => ({ p, td: treeDist(p.a, p.b) })).filter(o => o.td > 0 && o.td * 10 >= P.LOOP_RATIO * o.p.w).sort((u, v) => v.td * u.p.w === u.td * v.p.w ? u.p.w - v.p.w : v.td * u.p.w - u.td * v.p.w);
  const loops = [], perSlot = new Map(), slotOf = c => Math.floor(Y(c) / MH) * A + Math.floor(X(c) / MW);
  for (const o of loopCand) { if (loops.length >= P.LOOPS) break; const m = mid(o.p), s = slotOf(m); if ((perSlot.get(s) || 0) >= P.LOOP_REGION) continue;
    if (loops.every(l => cheb(mid(l), m) >= P.LOOP_GAP)) { loops.push(o.p); perSlot.set(s, (perSlot.get(s) || 0) + 1); } }
  const paths = [];
  for (const p of [...tree, ...loops]) {
    const left = []; for (let c = p.x; c >= 0; c = prev[c]) left.push(c);
    const right = []; for (let c = p.y; c >= 0; c = prev[c]) right.push(c);
    paths.push({ a: p.a, b: p.b, loop: loops.includes(p), cells: left.reverse().concat(right) });
  }
  return { tree, loops, paths };
  };
  // the realm's edge probe (I.edgeOk, levels.mjs: the land's height field before any pass): a trail crosses a cell edge only where the places can meet (4+ shared low dry rows); a crossing that fails is
  // closed and the network made again, so the probe reads only the edges a trail uses (and, below, a branch or a spur would)
  const blocked = new Set(), edgeKey = (a, b) => Math.min(a, b) * 16384 + Math.max(a, b), probed = new Map();
  const crossOk = (a, b) => { if (!I.edgeOk || ford[a] || ford[b] || bridgeAxis[a] || bridgeAxis[b] || level[a] !== level[b] || land[a] === 4 || land[b] === 4) return true;
    const k = edgeKey(a, b); let v = probed.get(k); if (v === undefined) { v = I.edgeOk(Math.min(a, b), Math.max(a, b)); probed.set(k, v); } return v; };
  const okPath = cells => { for (let i = 1; i < cells.length; i++) if (!crossOk(cells[i - 1], cells[i])) return false; return true; };   // a branch or a spur is searched without the probe and read after: one that crosses a closed edge is not made
  let net = netw(); stats.edgeRounds = 0;
  for (let round = 0; round < 40; round++) {
    let bad = 0; for (const p of net.paths) for (let i = 1; i < p.cells.length; i++) if (!crossOk(p.cells[i - 1], p.cells[i])) { const k = edgeKey(p.cells[i - 1], p.cells[i]); if (!blocked.has(k)) { blocked.add(k); bad++; } }
    if (!bad) break; net = netw(); stats.edgeRounds++;
  }
  const { tree, loops, paths } = net; stats.edgesBlocked = blocked.size; stats.probedNet = probed.size;
  const lists = paths.map(p => p.cells), kinds = paths.map(p => (p.loop ? 'loop' : 'tree'));   // kinds: what each list is (tree, loop, bridge, dest, spur)
  for (const b of bridges) { lists.push([b.ends[0], ...b.cells, b.ends[1]]); kinds.push('bridge'); }   // the span itself, whole
  const onArr = new Uint8Array(NR), mark = cells => { for (const c of cells) onArr[c] = 1; };   // the cells on the trail so far, kept as lists are added
  for (const l of lists) mark(l);
  const onNow = () => onArr;

  tick('network');
  // ---- destinations: the realm's, the lakes' far shores, the bridges ----
  const dest = (I.dest || []).map(d => ({ ...d }));
  const far = [];
  { const d0 = ringDist(onNow(), RW, RH);
    for (const b of I.bodies || []) { if (b.kind !== 'lake') continue; const wetSet = new Set(b.cells), shoreSet = new Set();
      for (const w of b.cells) for (const n of nb4(w)) if (walk[n] && !ford[n] && !wetSet.has(n)) shoreSet.add(n);
      const shore = [...shoreSet];
      if (shore.length < 4) continue; shore.sort((a, b2) => d0[a] - d0[b2] || a - b2); const entry = shore[0];
      const dd = new Int16Array(NR).fill(-1), qq = [entry]; dd[entry] = 0; for (let h = 0; h < qq.length; h++) { const u = qq[h]; for (const n of nb4(u)) if (dd[n] < 0 && walk[n] && !wetSet.has(n)) { dd[n] = dd[u] + 1; qq.push(n); } }
      const best = shore.filter(c => dd[c] >= 0).sort((a, b2) => dd[b2] - dd[a] || a - b2)[0];
      if (best !== undefined && dd[best] >= 4) far.push({ kind: 'far shore', c: best, feature: 'lake-' + b.id, index: 0, heart: 'landmark ground (Reedpool)' }); } }
  const addDest = d => { if (dest.every(k => cheb(k.c, d.c) >= P.DEST_GAP)) { dest.push(d); return true; } return false; };
  for (const f of far) addDest(f);
  for (const b of bridges) dest.push({ kind: 'bridge', c: b.mid, feature: b.id, index: 0, heart: 'the land\'s own' });

  tick('dest');
  // ---- branches: a destination within DEST_REACH places on its own level is joined to the nearest trail cell ----
  const branchTo = (s, onR, reach) => { const pv = new Map([[s, -1]]), qq = [[s, 0]];
    for (let h = 0; h < qq.length; h++) { const [u, k] = qq[h]; if (onR[u]) { const cells = []; for (let v = u; v >= 0; v = pv.get(v)) cells.push(v); return cells; } if (k >= reach) continue;
      for (const n of nb4(u)) { if (pv.has(n) || !walk[n] || land[n] === 1 || level[n] !== level[u]) continue; pv.set(n, u); qq.push([n, k + 1]); } } return null; };
  const branchEnds = new Set(); let destBranches = 0;
  const joinDest = d => { if (d.kind === 'pass' || d.kind === 'ravine' || d.kind === 'bridge') return; const onR = onNow(); if (onR[d.c] || !walk[d.c]) return;
    const b = branchTo(d.c, onR, P.DEST_REACH); if (b && b.length > 1 && okPath(b)) { lists.push(b.reverse()); kinds.push('dest'); mark(b); destBranches++; d.branch = true; } };
  for (const d of dest) joinDest(d);

  tick('branches');
  // ---- R14: every walkable place within REACH places' walk of a destination; a hole gets the land's own best spot as a destination ----
  const stairUp = new Uint8Array(NR); for (let c = 0; c < NR; c++) if (stair[c] && level[c] && c + RW < NR && !level[c + RW]) stairUp[c] = 1;
  const can = (u, n) => walk[n] && !deepWater(n) && (level[n] === level[u] || (n === u + RW && stairUp[u]) || (n === u - RW && stairUp[n]));
  // places' walk from the nearest destination, kept as destinations are added: a new one only relaxes the cells it is nearer to
  const reachD = new Int16Array(NR).fill(-1);
  const reachAdd = ss => { const qq = []; for (const c of ss) if (walk[c] || bridgeAxis[c]) { if (reachD[c] !== 0) { reachD[c] = 0; qq.push(c); } }
    for (let h = 0; h < qq.length; h++) { const u = qq[h], x = X(u), nd = reachD[u] + 1;
      for (let k = 0; k < 4; k++) { const n = k === 0 ? u - RW : k === 1 ? u + 1 : k === 2 ? u + RW : u - 1; if (n < 0 || n >= NR || (k === 1 && x === RW - 1) || (k === 3 && x === 0)) continue; if ((reachD[n] < 0 || nd < reachD[n]) && can(u, n)) { reachD[n] = nd; qq.push(n); } } } };
  const reachFrom = () => reachD;
  const places = []; for (let c = 0; c < NR; c++) if (walk[c] && !ford[c] && comp[c]) places.push(c);
  const streamCells = new Map(); for (const st of I.streams || []) st.cells.forEach((c, i) => streamCells.set(c, { st, i }));
  const bend = c => { const s = streamCells.get(c); if (!s || s.i === 0 || s.i >= s.st.cells.length - 1) return false; const a = s.st.cells[s.i - 1], n = s.st.cells[s.i + 1]; return X(a) !== X(n) && Y(a) !== Y(n); };
  const spot = c => {   // the land's own best spot, and the heart it asks for (existing heart kinds only)
    let sc = 0, heart = 'herd ground';
    if (land[c] === 0 && nb4(c).some(n => land[n] === 1)) { sc = 50; }       // a pond edge (the meadow beside the pond cell, whose own tiles are mostly water): herd ground
    else if (bend(c)) { sc = 40; }                                          // a bend of a stream: herd ground
    else if (c + RW < NR && level[c] && !level[c + RW] && walk[c + RW]) { sc = 38; heart = 'overhang'; }   // under a south face
    else { let lower = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const m = c + dy * RW + dx; if (m >= 0 && m < NR && e[m] > e[c]) lower++; }
      if (lower >= 7) { sc = 36; heart = 'sleepers\' bed'; }                // a hollow
      else if (land[c] === 3 && level[c]) { sc = 30; heart = 'sleepers\' bed'; }   // a lone tree on a rise
      else if (land[c] === 0) sc = 10; }
    if (side[c]) sc += 3; return { sc, heart }; };
  let filled = 0; reachAdd(dest.map(k => k.c)); const reach = reachD;
  const isDest = new Uint8Array(NR), near3 = new Uint8Array(NR);   // a destination here / one within 2 cells (DEST_GAP 3)
  const markDest = c => { isDest[c] = 1; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const x = X(c) + dx, y = Y(c) + dy; if (x >= 0 && y >= 0 && x < RW && y < RH) near3[y * RW + x] = 1; } };
  for (const k of dest) markDest(k.c);
  for (let round = 0; round < 400; round++) {
    let f = -1, fd = -1; for (const c of places) { const d = reach[c] < 0 ? 9999 : reach[c]; if (d > fd || (d === fd && f >= 0 && c < f)) { fd = d; f = c; } }
    if (fd <= P.REACH_FILL) break;
    // the best spot within 2 of the farthest place that stands on its own part: the candidate must be a place that reaches f (or f itself), not too near another destination
    let best = null;
    for (const gap of [P.DEST_GAP, 1]) {   // three cells from another destination; where the hole is ringed by them (water or a cliff between), one cell
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const x = X(f) + dx, y = Y(f) + dy; if (x < 0 || y < 0 || x >= RW || y >= RH) continue; const c = y * RW + x;
        if (!walk[c] || ford[c] || land[c] === 1 || !comp[c] || level[c] !== level[f] || rim(c) < P.SHORE_IN || (gap === 1 ? isDest[c] : near3[c])) continue;
        const s = spot(c), key = s.sc * 100000 - (Math.abs(dx) + Math.abs(dy)) * 1000 - (h32(seed, c, 19) & 255); if (!best || key > best.key) best = { c, key, heart: s.heart, kind: s.sc >= 50 ? 'pond edge' : s.sc >= 40 ? 'stream bend' : s.sc >= 38 ? 'cliff foot' : s.sc >= 36 ? 'hollow' : s.sc >= 30 ? 'tree on a rise' : 'open ground' }; }
      if (best) break; }
    if (!best && !isDest[f]) best = { c: f, heart: 'herd ground', kind: 'open ground' };   // the hole itself, where nothing round it fits (the coast's edge)
    if (!best) { reach[f] = 0; continue; }
    const d = { kind: 'reach', c: best.c, feature: 'land', index: 0, heart: best.heart, spot: best.kind }; dest.push(d); markDest(d.c); filled++; joinDest(d); reachAdd([d.c]);
  }
  stats.holesFilled = filled; stats.edgesProbed = probed.size;

  tick('reach');
  // ---- the fork rule: walking any stretch with no fork, a spur leaves it at the last cell within RUN_MAX - 1 steps where one fits ----
  const stepOk = (v, n, loose) => { if (level[n] === level[v]) return true; if (!loose) return false; return (n === v + RW && level[v] > level[n] && stair[v]) || (n === v - RW && level[n] > level[v] && stair[n]); };
  const spurAt = (u, onR) => { let best = null;
    for (const [minLen, loose] of [[2, false], [1, false], [1, true]]) { const pv = new Map([[u, -1]]), qq = [[u, 0]];
      for (let h = 0; h < qq.length; h++) { const [v, k] = qq[h]; if (k >= P.SPUR) continue;
        for (const n of nb4(v)) { if (pv.has(n) || !walk[n] || land[n] === 1 || (ford[n] && !loose) || (side[n] && !loose) || !stepOk(v, n, loose) || onR[n]) continue; if (!loose && nb4(n).some(m => m !== v && onR[m])) continue; pv.set(n, v); qq.push([n, k + 1]); } }
      const [end, k] = qq[qq.length - 1]; if (k >= minLen) { const cells = []; for (let v = end; v >= 0; v = pv.get(v)) cells.push(v); if (okPath(cells)) { best = cells.reverse(); break; } } }
    return best; };
  let spurs = 0; const stuckRuns = [];
  for (let pass = 0; pass < 6; pass++) {
    const g = roadGraph(NR, RW, lists), deg = v => g.adj.get(v).length, seen = new Set(), ek = (a, b) => Math.min(a, b) * 16384 + Math.max(a, b), runs = [];
    for (const v of g.adj.keys()) { if (deg(v) === 2) continue; for (const w of g.adj.get(v)) { if (seen.has(ek(v, w))) continue; const run = [v, w]; let a = v, b = w; seen.add(ek(a, b));
      while (deg(b) === 2) { const nx = g.adj.get(b).find(x => x !== a); if (seen.has(ek(b, nx))) break; seen.add(ek(b, nx)); a = b; b = nx; run.push(b); } runs.push(run); } }
    let added = 0; stuckRuns.length = 0;
    for (const run of runs) {
      if (run.length <= P.RUN_MAX) continue;
      let start = 0;
      while (run.length - start > P.RUN_MAX) {
        let got = null, at = -1;
        for (let i = Math.min(run.length - 2, start + P.RUN_MAX - 1); i > start; i--) { const s = spurAt(run[i], g.on); if (s) { got = s; at = i; break; } }
        if (!got) { stuckRuns.push({ from: run[start], to: run[Math.min(run.length - 1, start + P.RUN_MAX)], len: run.length - start, why: stuckWhy(run, start) }); break; }
        lists.push(got); kinds.push('spur'); for (const c of got) g.on[c] = 1; branchEnds.add(got[got.length - 1]); added++; start = at;
      }
    }
    spurs += added; if (!added) break;
  }
  function stuckWhy(run, start) {   // why no spur fits along a stretch: the land beside it
    let water = 0, cliff = 0, wood = 0;
    for (let i = start; i < Math.min(run.length, start + P.RUN_MAX + 1); i++) for (const n of nb4(run[i])) { if (!walk[n] && land[n] === 4) water++; else if (level[n] !== level[run[i]]) cliff++; else if (land[n] === 3) wood++; }
    return water >= cliff ? (water ? 'water' : 'narrow land') : 'cliff'; }
  tick('spurs');
  // ---- R1 (map-making-research-1): something beside the trail. Walking the trail, no stretch of TRAIL_RUN + 1 places goes by with no destination within one place of the path. A stretch that does gets
  // one of the land's own spots at its middle, on the trail or one cell beside it (a short branch joins it): the spot the land gives a reason for first (a pond edge, a stream bend, a cove shore, a
  // hollow, the foot of a cliff), the open ground only where it gives none. ----
  { const cov = new Uint8Array(NR);   // a destination here or within one cell (Chebyshev): "beside the trail"
    const covAdd = c => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const x = X(c) + dx, y = Y(c) + dy; if (x >= 0 && y >= 0 && x < RW && y < RH) cov[y * RW + x] = 1; } };
    for (const k of dest) covAdd(k.c);
    const bodyAt = new Map(); for (const b of I.bodies || []) for (const w of b.cells) bodyAt.set(w, b);
    const faceOf = new Map(); for (const e of I.escarpments || []) for (const f of e.faces) faceOf.set(f, e.id);   // a south face's cell -> its escarpment
    // spot(c), and the cove shore (a shore cell with water on one side only, R10's cove). What the land ties a spot to is a feature: a pond or cove shore is a 'shore', a bend of a stream a 'stream bend'
    // (kind and the feature they belong to, as the spring and the ford have); a hollow, a lone tree, a cliff's foot and open ground tie it to no named feature: 'reach', the land's own.
    const tspot = c => {
      const s = spot(c), b = s.sc - (side[c] ? 3 : 0);
      if (b >= 50) return { ...s, spot: 'pond edge', kind: 'shore', feature: 'marsh' };
      if (b >= 40) return { ...s, spot: 'stream bend', kind: 'stream bend', feature: 'stream-' + streamCells.get(c).st.id };
      let w = 0, wb = null; for (const n of nb4(c)) if (deepWater(n)) { w++; wb = bodyAt.get(n); }
      if (w === 1 && !ford[c]) return { sc: 45, heart: 'herd ground', spot: 'cove shore', kind: 'shore', feature: wb ? wb.kind + '-' + wb.id : 'sea' };
      const esc = b >= 38 && b < 40 ? faceOf.get(c) : undefined;   // the cell under a south face of a named escarpment: its cliff foot
      if (esc) return { ...s, spot: 'cliff foot', kind: 'cliff foot', feature: esc };
      return { ...s, spot: b >= 38 ? 'cliff foot' : b >= 36 ? 'hollow' : b >= 30 ? 'tree on a rise' : 'open ground', kind: 'reach', feature: 'land' }; };
    let added = 0, tied = 0, stuck = 0; const skip = new Set();
    for (let round = 0; round < 800; round++) {
      const g = roadGraph(NR, RW, lists), U = []; for (const c of g.adj.keys()) if (!cov[c] && !skip.has(c)) U.push(c); U.sort((p, q) => p - q);
      const seenU = new Uint8Array(NR), farthest = (s, inU) => { const pv = new Map([[s, -1]]), qq = [s]; for (let h = 0; h < qq.length; h++) for (const n of g.adj.get(qq[h])) if (!pv.has(n) && inU(n)) { pv.set(n, qq[h]); qq.push(n); } return { end: qq[qq.length - 1], pv, qq }; };
      const inU = c => !cov[c] && !skip.has(c);
      let path = null;
      for (const s of U) { if (seenU[s]) continue;
        const a = farthest(s, inU); for (const c of a.qq) seenU[c] = 1;
        if (a.qq.length <= P.TRAIL_RUN) continue;   // a component of 7 places or fewer has no longer stretch
        const b = farthest(a.end, inU), p = []; for (let v = b.end; v !== -1; v = b.pv.get(v)) p.push(v);
        if (p.length > P.TRAIL_RUN) { path = p; break; } }
      if (!path) break;
      const L = path.length; let best = null;
      // the middle third of the stretch; a spot the land ties to no feature is not taken until the whole stretch has been looked over for one that it does (the best by the land's reason, then nearest the middle), then then one cell from another destination, then nearer the coast's edge
      for (const [lo, hi, gap, inMin, wk] of [[(L / 3) | 0, Math.ceil(2 * L / 3), P.DEST_GAP, P.SHORE_IN], [(L / 6) | 0, Math.ceil(5 * L / 6), P.DEST_GAP, P.SHORE_IN], [1, L - 2, P.DEST_GAP, P.SHORE_IN], [1, L - 2, 1, P.SHORE_IN], [0, L - 1, 1, P.SHORE_IN], [0, L - 1, 1, 2], [0, L - 1, 1, 1]].map((w, k) => [...w, k])) {
        for (let i = Math.max(0, lo); i <= Math.min(L - 1, hi); i++) { const p = path[i];
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const x = X(p) + dx, y = Y(p) + dy; if (x < 0 || y < 0 || x >= RW || y >= RH) continue; const c = y * RW + x;
            if (!walk[c] || ford[c] || land[c] === 1 || !comp[c] || level[c] !== level[p] || rim(c) < inMin || deepWater(c) || (gap === 1 ? isDest[c] : near3[c])) continue;
            let br = null; if (!g.on[c]) { br = branchTo(c, g.on, 2); if (!br || br.length < 2 || !okPath(br)) continue; }
            const s = tspot(c), key = s.sc * 100000 - Math.abs(i - (L >> 1)) * 1000 - (br ? 300 : 0) - (h32(seed, c, 23) & 255);
            if (!best || key > best.key) best = { c, key, s, br }; } }
        if (best && (best.s.kind !== 'reach' || wk >= 2)) break; }
      if (!best) { for (const c of path) skip.add(c); stuck++; continue; }
      const d = { kind: best.s.kind, c: best.c, feature: best.s.feature, index: 0, heart: best.s.heart, spot: best.s.spot, along: true };
      dest.push(d); markDest(d.c); covAdd(d.c); reachAdd([d.c]); added++; if (best.s.kind !== 'reach') tied++;
      if (best.br) { const b = best.br.slice().reverse(); lists.push(b); kinds.push('dest'); mark(b); d.branch = true; destBranches++; }
    }
    stats.trailSpots = added; stats.trailSpotsTied = tied; stats.trailGapsStuck = stuck; }
  tick('trailspots');
  // branch ends: the ends of destination branches too (a post yard stands at a branch's end)
  const g1 = roadGraph(NR, RW, lists), onF = g1.on, deg1 = v => g1.adj.get(v).length;
  const ends = []; for (const v of g1.adj.keys()) if (deg1(v) === 1) ends.push(v);
  const forks = []; for (const v of g1.adj.keys()) if (deg1(v) >= 3) forks.push(v);
  stats.hubs = hubs.length; stats.loops = loops.length; stats.spurs = spurs; stats.stuck = stuckRuns.length; stats.destBranches = destBranches;
  return { hubs, tree, paths, loops, lists, kinds, bridges, dest, far, on: onF, ends, forks, branchEnds: [...branchEnds], stuck: stuckRuns, stats };
}

// distance in cells (Chebyshev rings) from every cell to the nearest trail cell
export function ringDist(on, RW, RH) {
  const NR = RW * RH, d = new Int16Array(NR).fill(999), q = [];
  for (let c = 0; c < NR; c++) if (on[c]) { d[c] = 0; q.push(c); }
  for (let h = 0; h < q.length; h++) { const c = q[h], x = c % RW, y = (c / RW) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= RW || Y >= RH) continue; const n = Y * RW + X; if (d[n] > d[c] + 1) { d[n] = d[c] + 1; q.push(n); } } }
  return d;
}
