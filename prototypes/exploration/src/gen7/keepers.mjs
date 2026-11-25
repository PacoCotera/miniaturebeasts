// Generator 7: the keepers' places at the ends of the old road (paths-gen-build-1/2; design paths-design-1 section 4). Pure: a function of the realm seed and a cell. It reads the realm's roads, the
// piece pass's outposts and the region's land; it never reads a save (the Station bakes one place for every save and device).
//
// FOOTPRINTS: the one table. Every row cites the report that measured the piece and the signed piece. Tiles are the game's 16 px tiles; `box` is the piece's whole footprint (w x h tiles), `block` the
// rectangles of it that block the pawn ([x, y, w, h] from the box's top left, door row last), `yard` the walkable ground round it that the road meets and the scenery keeps off (tiles). A kind with no
// signed piece is a named empty slot: it has a yard and blocks nothing. Blocks go through the baked cell's block mask only (bake7 blockMask), never a step rule.
export const FOOTPRINTS = Object.freeze({
  outpost:  { box: [4, 3], block: [[0, 0, 4, 3]], yard: 1, piece: 'outpost-2', src: 'paths-pixel-4: hut about 54x44 px = about 4x3 tiles blocks; lamp post foot 1 tile blocks (inside the 4x3 box), ring walkable' },
  hut:      { box: [3, 2], block: [[0, 1, 2, 1]], yard: 1, piece: 'hut-1', src: 'paths-pixel-6: hut about 3x2 tiles, block its body (2x1 at the door row)' },
  house:    { box: [5, 3], block: [[0, 1, 4, 2]], yard: 1, piece: 'house-1', src: 'paths-pixel-6: house about 5x3 tiles, block the body (4x2); garden patch about 4x2 tiles, no block (paths-pixel-10 box 4x2 beside it)', garden: [4, 2] },
  'road-rest': { box: [3, 3], block: [], yard: 1, piece: null, src: 'no signed piece: a named empty slot (a ring of stones, nothing blocks)' },
  well:     { box: [1, 1], block: [], yard: 1, piece: null, src: 'no signed piece: a named empty slot (nothing blocks)' },
});
// pieces that the generator does not place: the old bridge stands in the trail's own ground (as built); the run's pieces are the run layer's.
export const OTHER_PIECES = Object.freeze({
  bridge: { piece: 'bridge-2', box: [6.5, 2.5], block: [], src: 'paths-pixel-10: opaque x14-118, y44-84 = 104x40 px, about 6.5x2.5 tiles incl. its shadow; no block (it is the crossing)' },
  run: { piece: 'run loop', tile: [16, 16], kinds: ['end', 'bend', 'T', 'cross', 'straight'], src: 'paths-pixel-9: end, bend, T, cross 16x16 from the signed straight (paths-pixel-7)' },
});

export const KEEPER_KINDS = Object.freeze(Object.keys(FOOTPRINTS));

// ---- which keepers' place stands in which place of a region (design 4.2; greybox counts: one lone house a region, a well at a fork with no outpost within 3 places and no other well within 5) ----
import { hash, MW, MH, L } from '../world.mjs';
import { ATLAS } from '../regions.mjs';
import { realm7 } from './region.mjs';
import { RW, RH } from './world.mjs';
import { roadGraph } from './roads.mjs';

export const WELL_FROM_OUTPOST = 3, WELL_APART = 5;
const MEMO = new Map();   // seed -> Map('X,Y' -> kind), the whole realm's, made once
const wcOf = (ax, ay, c) => (ay * MH + ((c / MW) | 0)) * RW + ax * MW + (c % MW);
const cd = (a, b) => Math.max(Math.abs((a % RW) - (b % RW)), Math.abs(((a / RW) | 0) - ((b / RW) | 0)));

export function keeperKinds(seed) {
  let hit = MEMO.get(seed); if (hit) return hit;
  const R = realm7(seed), re = R.realm, g = roadGraph(RW * RH, RW, re.roads.lists), out = new Map(), key = w => (w % RW) + ',' + ((w / RW) | 0);
  const ends = new Set(re.roads.ends), forks = re.roads.forks;
  for (let ay = 0; ay < ATLAS; ay++) for (let ax = 0; ax < ATLAS; ax++) {
    const G = R.regions[ay * ATLAS + ax]; if (!G || !G.depots) continue;
    const mine = w => { const X = w % RW, Y = (w / RW) | 0; return Math.floor(X / MW) === ax && Math.floor(Y / MH) === ay; };
    const cOf = w => (((w / RW) | 0) % MH) * MW + (w % RW) % MW;
    const dry = w => { const c = cOf(w); return G.land[c] !== L.WATER && !G.island[c]; };   // a ford or a bridge's cell holds no place of its own (planOf is null): its end is the crossing
    const set = (w, k) => { if (!out.has(key(w))) out.set(key(w), k); };
    // outposts: the piece pass's six, where a trail passes (none stand off the trail)
    const outposts = [...G.depots.set].map(c => wcOf(ax, ay, c)).filter(w => g.adj.has(w) && dry(w)).sort((a, b) => a - b);
    for (const w of outposts) set(w, 'outpost');
    // the ends of this region
    const E = [...ends].filter(mine).filter(dry).sort((a, b) => a - b).filter(w => !out.has(key(w)));
    // the lone house: the end farthest by road from the gate (a walk over the road from the road cell nearest the gate)
    const gateW = G.gate >= 0 ? wcOf(ax, ay, G.gate) : -1, roadCells = [...g.adj.keys()].filter(mine).sort((a, b) => a - b);
    if (gateW >= 0 && roadCells.length && E.length) {
      const from = roadCells.reduce((b, w) => (cd(w, gateW) < cd(b, gateW) ? w : b), roadCells[0]), dist = new Map([[from, 0]]), q = [from];
      for (let i = 0; i < q.length; i++) for (const n of g.adj.get(q[i]) || []) if (!dist.has(n)) { dist.set(n, dist.get(q[i]) + 1); q.push(n); }
      const far = E.filter(w => dist.has(w)).sort((a, b) => dist.get(b) - dist.get(a) || a - b)[0];
      if (far != null) set(far, 'house');
    }
    const starts = new Set(G.spawns.map(c => wcOf(ax, ay, c)));
    for (const w of E) {
      if (out.has(key(w))) continue;
      const c = cOf(w), under = [[0, -1], [-1, 0], [1, 0], [0, 1]].some(([dx, dy]) => { const x = (c % MW) + dx, y = ((c / MW) | 0) + dy; return x >= 0 && y >= 0 && x < MW && y < MH && G.level[y * MW + x] > G.level[c]; });   // a cliff's foot: higher land beside
      if (starts.has(w)) set(w, 'road-rest'); else if (under || G.land[c] === L.WOOD) set(w, 'hut'); else set(w, 'road-rest');
    }
    // wells: a fork with no outpost within 3 places and no other well within 5 (taken in a seeded order)
    const wells = [], F = forks.filter(mine).filter(dry).filter(w => !out.has(key(w))).map(w => ({ w, k: hash(seed, 'gen7', 'well', w) })).sort((a, b) => a.k - b.k || a.w - b.w);
    for (const { w } of F) if (outposts.every(o => cd(o, w) > WELL_FROM_OUTPOST) && wells.every(o => cd(o, w) > WELL_APART)) { wells.push(w); set(w, 'well'); }
  }
  if (MEMO.size > 3) MEMO.clear(); MEMO.set(seed, out); return out;
}
export const isRoadEnd = (seed, X, Y) => realm7(seed).realm.roads.ends.includes(Y * RW + X);
export const keeperKindAt =(seed, X, Y) => keeperKinds(seed).get(X + ',' + Y) || null;

// ---- seating one in a place (the plan's frame: tile (x, y) of the cell with its apron, the cell's own tiles 1 .. cw by 1 .. ch) ----
// The road already runs as built; the keepers' place is seated where the road's last tile (a place whose trail ends) or the fork's middle tile meets it, so the sand arrives at its yard and the place's middle is no
// longer where a road stops. The box lies on plain grass, off the spine and every set piece, and its door row faces the road when it can (the pieces are front-on, door down).
// a: { w, h, cw, ch, terrain, solid, spine, cliff, spots }, TVs: { PATH, FAMILY: Set }. Returns the place or null (nothing drawn to meet, or no room); `why` says which.
const EDGE_KEEP = 4;
export function seatKeeper(kind, a, TVs, atEnd) {
  const fp = FOOTPRINTS[kind], { w, h, cw, ch, terrain, solid, spine, cliff, spots } = a, I = (x, y) => y * w + x, [bw, bh] = fp.box;
  const inner = (x, y) => x >= 1 && y >= 1 && x <= cw && y <= ch, isPath = (x, y) => inner(x, y) && terrain[I(x, y)] === TVs.PATH;
  const pts = []; for (let y = 1; y <= ch; y++) for (let x = 1; x <= cw; x++) if (isPath(x, y)) pts.push([x, y]);
  if (!pts.length) return { why: 'no-path' };
  // distance over the trail from the frame's ports
  const dist = new Map(), q = [];
  for (const [x, y] of pts) if (x === 1 || y === 1 || x === cw || y === ch) { dist.set(y * w + x, 0); q.push([x, y]); }
  for (let i = 0; i < q.length; i++) { const [x, y] = q[i], d = dist.get(y * w + x); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy, k = Y * w + X; if (isPath(X, Y) && !dist.has(k)) { dist.set(k, d + 1); q.push([X, Y]); } } }
  let M;
  if (!atEnd) {   // at a fork the trail's middle: the path tile nearest the cell's centroid of path
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    M = pts.slice().sort((p, r) => Math.hypot(p[0] - cx, p[1] - cy) - Math.hypot(r[0] - cx, r[1] - cy) || p[1] - r[1] || p[0] - r[0])[0];
  } else {
    const far = pts.filter(p => dist.has(p[1] * w + p[0])).sort((p, r) => dist.get(r[1] * w + r[0]) - dist.get(p[1] * w + p[0]) || p[1] - r[1] || p[0] - r[0])[0];
    if (!far) return { why: 'no-port' }; M = far;
  }
  // the road's last tile and the tile it came from: where the signed run's END piece goes (pixel desk's note: the end piece where a road ends, its open side back along the road)
  const dM = dist.get(M[1] * w + M[0]), back = atEnd ? [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [M[0] + dx, M[1] + dy]).find(([x, y]) => dist.get(y * w + x) === dM - 1) : null;
  const end = atEnd ? { x: M[0], y: M[1], from: back || null } : null;
  const ok = (x, y) => x >= EDGE_KEEP && y >= EDGE_KEEP && x <= cw + 1 - EDGE_KEEP && y <= ch + 1 - EDGE_KEEP && TVs.FAMILY.has(terrain[I(x, y)]) && !solid[I(x, y)] && !cliff[I(x, y)];   // the spine (the shortest walks between the ways in) may pass under it: a block is one to three rows, the yard is walkable all round
  const nearSpot = (x, y) => spots.some(s => x >= s.x - 1 && x < s.x + s.w + 1 && y >= s.y - 1 && y < s.y + s.h + 1);
  const onSpot = (x, y) => spots.some(s => x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h);
  // mode 0: a clear yard of walkable ground all round and a tile off every set piece; mode 1: the box alone clear of the set pieces' tiles and their walls (the yard may lie against water or a cliff)
  const free = (x0, y0, mode) => { for (let y = y0; y < y0 + bh; y++) for (let x = x0; x < x0 + bw; x++) if (!ok(x, y) || (mode === 0 ? nearSpot(x, y) : onSpot(x, y))) return false;
    if (mode === 0) for (let y = y0 - 1; y <= y0 + bh; y++) for (let x = x0 - 1; x <= x0 + bw; x++) if (inner(x, y) && (solid[I(x, y)] || cliff[I(x, y)])) return false;
    return true; };
  const c = bw >> 1, cands = [];
  for (const s of [0, -1, 1, -2, 2]) cands.push([M[0] - c + s, M[1] - bh]);                  // above the road's end, the door row on the road
  for (const s of [0, -1, 1]) cands.push([M[0] + 1, M[1] - (bh >> 1) + s], [M[0] - bw, M[1] - (bh >> 1) + s]);   // beside it
  for (const s of [0, -1, 1]) cands.push([M[0] - c + s, M[1] + 1]);                             // below it
  const R = bw + bh, rest = []; for (let y0 = M[1] - bh - R; y0 <= M[1] + R; y0++) for (let x0 = M[0] - bw - R; x0 <= M[0] + R; x0++) rest.push([x0, y0]);
  const anchor = [M[0] - c, M[1] - bh]; rest.sort((p, r) => Math.hypot(p[0] - anchor[0], p[1] - anchor[1]) - Math.hypot(r[0] - anchor[0], r[1] - anchor[1]) || p[1] - r[1] || p[0] - r[0]);
  cands.push(...rest);                                                                            // anywhere else that touches the road, nearest the door spot first
  const near = atEnd ? pts.filter(([px, py]) => Math.max(Math.abs(px - M[0]), Math.abs(py - M[1])) <= 1) : pts;   // at an end, the road's last tiles (the brush is two wide): the box meets these, never another stretch; at a fork, the box meets the trail anywhere in the place
  for (const mode of [0, 1]) for (const [x0, y0] of cands) {
    if (!free(x0, y0, mode)) continue;
    const touches = near.some(([px, py]) => px >= x0 - 1 && px <= x0 + bw && py >= y0 - 1 && py <= y0 + bh);
    if (!touches) continue;
    return { kind, piece: fp.piece, x: x0, y: y0, w: bw, h: bh, block: fp.block.map(([x, y, bw2, bh2]) => [x0 + x, y0 + y, bw2, bh2]), yard: { x: x0 - fp.yard, y: y0 - fp.yard, w: bw + 2 * fp.yard, h: bh + 2 * fp.yard }, meet: M, end };
  }
  return { why: 'no-room', end };
}
