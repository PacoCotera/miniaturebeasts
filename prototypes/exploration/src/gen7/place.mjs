// Generator 7, layer 2: the place (a cell of 24 x 28 tiles). Pure: no page state, DOM, storage, clock or Math.random.
// Terrain per tile for the bake's dual grid; props and decor (G3) are decor.mjs, read here as the IR's lists. Every value is a function of the realm seed and a WORLD tile position, never of a cell number
// or of the order cells were made in, so a cell and its neighbour are windows onto one land:
//   - the shapes (ground, wood, sand, water) come from the world's own fields sampled at every tile (the same functions the region samples at cell centres), plus a light linear
//     pull from the region's cell labels. No smoothstep between cell centres, so no boundary falls on a cell edge (scheme Rule 1.10);
//   - the levels come from the elevation field read at every tile and thresholded (levels.mjs: no blocks, a cliff is the field's own contour line; it wanders and rounds, and
//     never runs along a cell edge). The cell's level is a summary of this land (Rule 5.2). One raised level, 0 or 1;
//   - ways up sit on existing straight south faces of that land, nearest the stair's port, where the region chose the stair for that face; nothing is carved (Rule 5.5);
//   - the passes of Rule 1.4 run on a window of 5 x 7 cells round the cell, and the cell's tiles plus a one-tile apron are cut out of it;
// Rule 1.8: every terrain boundary is drawn only by the dual grid's corner pieces; nothing here composites or overlays.
import { hash, L, EDGE, MW, MH, sideKind, softGround, bankEdges } from '../world.mjs';
import { ATLAS } from '../regions.mjs';
import { RW, RH, CW, CH, noiseField, fieldsAt } from './world.mjs';
import { realm7, portOffset, portAt, edgeOfStep, route, NC } from './region.mjs';
import { levelsOf, forgetLevels, regionBanks, madeRegionBanks, presetRegionBanks, loweredAt, levelCell, RAISE_OFF, tileLevel, raised as raisedTile, findWayup, pocketWayups, bankWayups, tileFields, inlandOf, WTW, WTH, BORDER_X, BORDER_Y } from './levels.mjs';
import { createDecor } from './decor.mjs';
import { streamPieces, drawStream, bridgeList, layBridge, fallsSite, edgeId } from './streams.mjs';
import { RULES } from './rules.mjs';
import SET from '../../../../art/places/sets/ninja-test/set.json' with { type: 'json' };
import TERRAINS from '../../../../art/places/terrain.json' with { type: 'json' };
import { recipeAt, SAND_AT } from './ground.mjs';
import { holdOf } from './hold.mjs';
import { touchesRaised, partAt, PART, FACE_ROWS } from '../../../places/src/bake/relief.mjs';
import { landmarksOf, forgetLandmarks } from './landmarks.mjs';
import { maskFn } from './places.mjs';

export const TV = { DEEP: 1, WATER: 2, SAND: 3, MUD: 4, PATH: 5, GRASS: 6, EARTH: 7, CLIFF: 8, THICKET: 9, SCRUB: 10, LITTER: 11, DRY: 12, TURF: 13, SCREE: 14, PATHTOP: 19, FORD: 20, BRIDGE: 21 };   // FORD and BRIDGE: walkable ground over a stream and over a river (streams.mjs; drawn as the path until painted). PATHTOP: the path on a raised top (a value of `top`, never of the terrain: the tile stays cliff; drawn as the path)
// the pairs the set draws (art/places/terrain.json values): a terrain meets another only as one of these (the set's `lowers`); every 2 x 2 block of logic tiles holds at most three terrains (terrain layers),
// and every two of them are such a pair
// The table is the set's own: art/places/sets/ninja-test/set.json `groundPairs` (ids, through art/places/terrain.json's values), the one source; tools/gen7-layers.mjs refuses a pair the layers' `lowers` cannot draw and the
// page's layers.json is made from the same file. (Sand-raised is not in the table: a raised region that meets both grass and sand is drawn two ways, which the bake refuses.)
const FAMILY = new Set([6, 11, 12, 13]);   // the grass family the heart's patch lies on: grass, litter, dry grass, turf
const VALUE_OF =Object.fromEntries(TERRAINS.terrains.map(t => [t.id, t.value]));
const PAIRS = new Set(SET.groundPairs.map(([a, b]) => (VALUE_OF[a] < VALUE_OF[b] ? VALUE_OF[a] + '|' + VALUE_OF[b] : VALUE_OF[b] + '|' + VALUE_OF[a])));
// the low grounds the cliff's face meets with no grass between: the cliff's pairs in the table besides grass (the biome grounds). Terrain the cliff has no edge over (water, mud, scrub, thicket, sand)
// keeps one tile of grass between it and the rim, made on its side
const CLIFF_LOWERS = new Set(SET.groundPairs.filter(p => p.includes('cliff')).map(p => VALUE_OF[p[0] === 'cliff' ? p[1] : p[0]]).filter(v => v !== TV.GRASS));
// who gives way to grass when a 2 x 2 block breaks the table: the lesser first; raised land is never cut (round 4), the others yield to it
const KEEP = { 8: 10, 2: 9, 9: 7, 5: 6, 15: 6, 11: 5, 3: 4, 14: 4, 10: 3, 12: 2, 13: 2, 6: 0, 20: 8, 21: 11 };
export const pairOk = (a, b) => PAIRS.has(a < b ? a + '|' + b : b + '|' + a);
// The land rule's two shapes of a tile in no 2 x 2 block of its own (Rule 1.9 as the land of the land round is; land-rules-2), in a grid `t` of row length W (k has its four neighbours):
// a diagonal step (its own terrain beside it in its row and in its column: a contour's staircase, which the corner pieces draw as a diagonal), and the one-tile grass buffer
// (Rule 1.3, "where two terrains that may not meet come near each other, grass goes between them": grass joined to grass on a side, with two terrains among its eight neighbours that are no pair of
// each other, such as raised land and a stream's water, or a ford and scree: the narrowest bank there is)
export function lonePlainAt(t, W, k) {
  const v = t[k], l = t[k - 1] === v, r = t[k + 1] === v, u = t[k - W] === v, d = t[k + W] === v;
  if ((l || r) && (u || d)) return true;
  if (v !== TV.GRASS || !(l || r || u || d)) return false;
  const around = new Set([t[k - W - 1], t[k - W], t[k - W + 1], t[k - 1], t[k + 1], t[k + W - 1], t[k + W], t[k + W + 1]]); around.delete(v);
  const a = [...around]; for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if (!pairOk(a[i], a[j])) return true;
  return false;
}
// the terrains of one 2 x 2 block (an iterable of values, repeats allowed): at most three distinct, every two a legal pair
export function blockOk(values) {
  const v = [...new Set(values)];
  if (v.length > 3) return false;
  for (let i = 0; i < v.length; i++) for (let j = i + 1; j < v.length; j++) if (!pairOk(v[i], v[j])) return false;
  return true;
}

const LITTER_NONE = 1.5;               // a litterAt at or above this lays no leaf litter
// The coast: the realm's border ring of cells is wide water, and the first tiles inside it are a shore laid whole in windowOf, from the border line (levels.mjs inlandOf) inwards:
// deep water 1-2 tiles, water to a waterline 4-6 tiles in, beach 2-3 tiles, then a strip of grass 4 tiles; no thicket, scrub, litter or raised land in the band (raised land begins at RAISE_OFF)
export const COAST_REACH = 14;
const WIN_X = 7, WIN_Y = 9, HX = (WIN_X - 1) / 2, HY = (WIN_Y - 1) / 2;   // the window the passes run on, in cells: the cell and two cells each side (three above and below, where a chain of conversions runs farthest), so what an edge of the window does stays clear of the cell
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// ---- per seed: cell values, the level blocks, stairs and trails ----
const CTX = new Map();
function ctxOf(seed) {
  let S = CTX.get(seed); if (S) return S;
  const R = realm7(seed), re = R.realm, N = RW * RH;
  S = { seed, R, re, at: fieldsAt(seed), forestC: new Float32Array(N), wetC: new Float32Array(N), rockC: new Float32Array(N), lvC: new Int8Array(N), landC: new Uint8Array(N), fordC: new Uint8Array(N), chunks: new Map(), secC: new Map(), cells: new Map(), stairs: null, trails: null };
  for (const G of R.regions) {
    const [ax, ay] = G.slot;
    for (let c = 0; c < NC; c++) {
      const w = (ay * MH + ((c / MW) | 0)) * RW + ax * MW + (c % MW), land = G.land[c], F = re.F[w], M = re.M[w], K = re.K[w];
      S.landC[w] = land; S.lvC[w] = G.level[c]; S.fordC[w] = G.ford[c] ? 1 : 0;
      // the cell values the place reads (the region's label keeps the picture and the map in step)
      S.forestC[w] = land === L.WOOD ? Math.max(F, 0.86) : land === L.MEADOW ? Math.min(F * 0.75, 0.46) : land === L.ROCK ? 0.32 : land === L.POND ? 0.42 : 0;
      S.wetC[w] = land === L.WATER ? (G.ford[c] ? 0.8 : 1.05) : land === L.POND ? 0.88 : 0.12 + 0.12 * M;
      S.rockC[w] = land === L.ROCK ? 1.05 : Math.min(K, 0.4) * 0.6;
    }
  }
  S.nF = noiseField(seed, 't-forest', 1 / 10, 'FBm', 2); S.nW = noiseField(seed, 't-wet', 1 / 12, 'FBm', 2); S.nR = noiseField(seed, 't-rock', 1 / 9, 'FBm', 2);
  S.nS = noiseField(seed, 't-scrub', 1 / 5, 'FBm', 1); S.nP = noiseField(seed, 'trail-wobble', 1 / 6, 'FBm', 2); S.nE = noiseField(seed, 't-floor', 1 / 8, 'FBm', 2); S.nD = noiseField(seed, 't-dry', 1 / 9, 'FBm', 2); S.nC = noiseField(seed, 't-chan', 1 / 14, 'FBm', 1); S.nM = noiseField(seed, 't-chan-gap', 1 / 11, 'FBm', 2); S.nG = noiseField(seed, 'ground-mix', RULES.tone.noise.scale, 'FBm', RULES.tone.noise.octaves);
  if (CTX.size > 3) CTX.clear();
  CTX.set(seed, S); return S;
}
export const contextOf = ctxOf;   // the per-seed context (the checks' tools read the realm's streams through it)
// every place, field and decor cache of a seed forgotten (the realm itself stays): the scheduler's test builds the same places cold in another order
export function forgetPlaces(seed) {
  const S = CTX.get(seed); if (S) forgetLevels(S.re);
  CTX.delete(seed); DEC.delete(seed); SITES.delete(seed); forgetLandmarks(seed);
  for (const k of [...CELLS.keys()]) if (k.startsWith(seed + ':')) CELLS.delete(k);
}
const cellIdx = (X, Y) => clamp(Y, 0, RH - 1) * RW + clamp(X, 0, RW - 1);

// the tile fields of one cell (24 x 28 values each), from the world's fields at tile scale
function chunk(S, X, Y) {
  const key = (X + 8) * 1000 + (Y + 8), hit = S.chunks.get(key); if (hit) return hit;
  const n = CW * CH, forest = new Float32Array(n), rock = new Float32Array(n), wet = new Float32Array(n), scrub = new Float32Array(n), push = new Float32Array(n), f = tileFields(S.seed, X, Y), land = S.landC[cellIdx(X, Y)];   // the fields of each tile, sampled once for the levels and for this
  for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CW; tx++) {
    const k = ty * CW + tx; tileField(S, land, X, Y, tx, ty, f.wild[k], f.rock[k]);
    forest[k] = TF[0]; rock[k] = TF[1]; wet[k] = TF[2]; scrub[k] = TF[3]; push[k] = TF[4];
  }
  const out = { forest, rock, wet, scrub, push };
  if (S.chunks.size > 600) S.chunks.clear();
  S.chunks.set(key, out); return out;
}
// the fields of one tile (forest, rock, wet, scrub, push into TF), from the tile's own wildness and rockiness: chunk() lays them for every tile of a cell, the sector (secCount) for the few it samples
const TF = new Float64Array(5);
function tileField(S, land, X, Y, tx, ty, wild, rockiness) {
  const gx = X * CW + tx, gy = Y * CH + ty;
  const u = (gx + 0.5) / CW - 0.5, v = (gy + 0.5) / CH - 0.5, X0 = Math.floor(u), Y0 = Math.floor(v), a = u - X0, b = v - Y0;
  const i00 = cellIdx(X0, Y0), i10 = cellIdx(X0 + 1, Y0), i01 = cellIdx(X0, Y0 + 1), i11 = cellIdx(X0 + 1, Y0 + 1);
  const bil = (A) => A[i00] * (1 - a) * (1 - b) + A[i10] * a * (1 - b) + A[i01] * (1 - a) * b + A[i11] * a * b;
  const fr = Math.fround;   // each field is the single-precision value chunk() has always stored
  let forest = fr(0.55 * wild + 0.45 * bil(S.forestC) + 0.12 * S.nF(gx, gy)), rock = fr(0.3 * rockiness + 0.7 * bil(S.rockC) + 0.12 * S.nR(gx, gy)), wet = fr(bil(S.wetC) + 0.22 * S.nW(gx, gy)), push = 0;
  const scrub = fr(S.nS(gx, gy));
  // the map's land kind shows at the cell's middle whatever its neighbours are: a rock cell is stony and a wood cell has its floor there (a bump that falls to nothing before the cell's edge, so no seam)
  const bump = Math.max(0, 1 - Math.hypot((tx - (CW - 1) / 2) / 9, (ty - (CH - 1) / 2) / 10));
  if (land === L.ROCK) rock = fr(rock + 0.5 * bump); else if (land === L.WOOD) push = fr(0.5 * bump);
  if (inlandOf(gx, gy) < COAST_REACH) { rock = 0; push = 0; forest = 0; wet = 0; }   // the coast band is laid whole in windowOf: the fields give it plain ground
  TF[0] = forest; TF[1] = rock; TF[2] = wet; TF[3] = scrub; TF[4] = push;
}

// ---- the terrain levels: tile scale, from the elevation field (levels.mjs) ----
// a world tile's level (0 at the map's end: the closing band and a tile beyond it keep to the low ground)
export const levelAt = (seed, gx, gy) => tileLevel(levelsOf(ctxOf(seed).re), gx, gy);
export const raisedAt = (seed, gx, gy) => raisedTile(levelsOf(ctxOf(seed).re), gx, gy);
export const loweredTileAt = (seed, gx, gy) => loweredAt(levelsOf(ctxOf(seed).re), gx, gy);   // land-reach-2: the tools count the lowered parts by their ground

// ---- ways up: on the straight south-facing face the region chose the stair for (levels.mjs `findWayup`, the one face test), nearest the stair's port ----
// Every stair is on an edge between a cell A (north, the higher) and the cell south of it, and the region only chose it where a face exists: no way up is ever carved. The east,
// west and north ways up have no piece yet (art slots `wayup-east-west` and `wayup-north`); the region never chooses such a stair.
function stairsOf(S) {
  if (S.stairs) return S.stairs;
  const out = [], L = levelsOf(S.re);
  for (const G of S.R.regions) {
    const [ax, ay] = G.slot;
    for (const cr of G.cross) {
      const X = ax * MW + (cr.c % MW), Y = ay * MH + ((cr.c / MW) | 0), south = cr.side === 's', e = 2 * cr.c + (south ? 1 : 0);
      const A = [X, Y], B = south ? [X, Y + 1] : [X + 1, Y], lvA = S.lvC[cellIdx(A[0], A[1])], lvB = S.lvC[cellIdx(B[0], B[1])], port = portOffset(S.seed, ax, ay, e);
      const st = { A, B, south, upperIsA: lvA > lvB, port, kind: south ? (lvA > lvB ? 'south' : 'north') : 'east-west' };
      // the way up is found on first read (the stair's own land window, levels.mjs findWayup): a place reads only the stairs near its window, so the first place no longer waits for every stair of the realm
      let wu = null, have = st.kind !== 'south';
      Object.defineProperty(st, 'wayup', { enumerable: true, get() { if (!have) { wu = findWayup(L, X, Y, port); have = true; } return wu; } });
      out.push(st);
    }
  }
  return (S.stairs = out);
}
export const stairsInfo = seed => stairsOf(ctxOf(seed));
// the feet of the trail's ways up the places made so far, by 'x,y' of the way up: 'trail' (the trail's path reaches it), 'spur' (a spur joins it), else why neither does (the tools list them)
export const footSpurs = seed => ctxOf(seed).spurs || new Map();

// ---- trails: the realm's one network (roads.mjs), drawn through each cell's ports with a 2 x 2 brush ----
// Each list of world cells is a stretch of trail; a cell's drawing joins every neighbour any list takes it to (a bend between two ports, a fork between more).
function trailsOf(S) {
  if (S.trails) return S.trails;
  const by = new Map(), list = [], roads = S.R.realm.roads;
  for (const cells0 of roads ? roads.lists : []) {
    const cells = cells0.map(c => [c % RW, (c / RW) | 0]), t = { cells }; list.push(t);
    cells.forEach((p, k) => { const key = p[0] * 1000 + p[1]; if (!by.has(key)) by.set(key, []); by.get(key).push({ t, k }); });
  }
  const bp = new Map(), bk = new Set(), bb = new Map();   // bridge banks: the far bank's edge takes the near bank's port offset
  for (const b of roads ? roads.bridges : []) {
    const xy = c => [c % RW, (c / RW) | 0], e0 = [xy(b.ends[0]), xy(b.cells[0])], e1 = [xy(b.cells[b.cells.length - 1]), xy(b.ends[1])];
    const horiz = e0[0][1] === e0[1][1];
    bk.add(edgeKey(e0[0], e0[1])); bk.add(edgeKey(e1[0], e1[1]));
    const br = { banks: [[e0[0], e0[1]], [e1[1], e1[0]]] }; bb.set(edgeKey(e0[0], e0[1]), br); bb.set(edgeKey(e1[0], e1[1]), br);   // [bank, the span cell beside it]
    bp.set(edgeKey(e1[0], e1[1]), horiz ? portAt(S.seed, Math.min(e0[0][0], e0[1][0]), e0[0][1], false) : portAt(S.seed, e0[0][0], Math.min(e0[0][1], e0[1][1]), true));
  }
  return (S.trails = { by, list, bp, bk, bb });
}
// the port of the edge between two cells p and q (world cells, 4-neighbours): the two tiles it crosses by, `slide` tiles along the edge from the hashed offset, on the side of p and on the side of q
function portTiles(S, p, q, slide = 0) {
  const off = portOff(S, p, q) + slide;
  if (p[1] === q[1]) { const east = q[0] > p[0], left = Math.min(p[0], q[0]), bx = (left + 1) * CW, y = p[1] * CH + off; return east ? [[bx - 1, y], [bx, y]] : [[bx, y], [bx - 1, y]]; }
  const down = q[1] > p[1], top = Math.min(p[1], q[1]), by = (top + 1) * CH, x = p[0] * CW + off; return down ? [[x, by - 1], [x, by]] : [[x, by], [x, by - 1]];
}
// the offset of the port along the edge between p and q: the hashed one, except at a bridge, whose two banks share the first bank's, so the trail meets the span at the same row (column) on both
const edgeKey = (p, q) => { const a = p[1] * RW + p[0], b = q[1] * RW + q[0]; return Math.min(a, b) * 100000 + Math.max(a, b); };
function portOff(S, p, q) {
  const bp = trailsOf(S).bp.get(edgeKey(p, q)); if (bp !== undefined) return bp;
  return p[1] === q[1] ? portAt(S.seed, Math.min(p[0], q[0]), p[1], false) : portAt(S.seed, p[0], Math.min(p[1], q[1]), true);
}

// The three edges of the shore band at a world tile, in tiles from the border line: where deep water ends, where water ends (the waterline) and where the beach ends. Each is a function of the
// tile's place ALONG the coast (the band's depth never enters), read in blocks of EDGE_RUN rows from slow noise (a third of the frequency the fields use), so an edge is a line that holds each
// value for whole blocks and steps one tile (the beach end, with the waterline, two) between blocks: no tooth, notch or bay, and a strip of beach two tiles wide keeps a 2 x 2 block of sand in every
// row pair, so the ground passes keep the edge as made. A tile near a corner of the realm reads the side it is nearest to.
const EDGE_RUN = 3, EDGE_SLOW = 2;
function coastEdges(S, gx, gy) {
  const dW = gx - BORDER_X, dE = WTW - 1 - BORDER_X - gx, dN = gy - BORDER_Y, dS = WTH - 1 - BORDER_Y - gy, m = Math.min(dW, dE, dN, dS);
  const side = m === dW ? 0 : m === dE ? 1 : m === dN ? 2 : 3, s = side < 2 ? gy : gx, blk = Math.floor(s / EDGE_RUN);
  const cache = S.coastEdgeAt || (S.coastEdgeAt = [new Map(), new Map(), new Map(), new Map()]), hit = cache[side].get(blk); if (hit) return hit;
  const u = (blk * EDGE_RUN + EDGE_RUN / 2) / EDGE_SLOW;
  const wl = 4 + Math.floor(3 * clamp(0.5 + 0.5 * S.nC(u, 311 * side + 17), 0, 0.999)), deep = S.nM(u, 211 * side + 5) > 0 ? 2 : 1, beach = S.nD(u, 97 * side + 3) > 0 ? 3 : 2, out = [deep, wl, wl + beach];
  cache[side].set(blk, out); return out;
}

// ---- the passes on a window ----
function majority(a, W, H, passes) {
  const cnt = new Int16Array(16);
  for (let p = 0; p < passes; p++) {
    const src = a.slice();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      cnt.fill(0);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; cnt[src[clamp(y + dy, 0, H - 1) * W + clamp(x + dx, 0, W - 1)]]++; }
      const own = src[y * W + x]; let best = own, bc = cnt[own];
      for (let v = 1; v < 16; v++) if (cnt[v] > bc) { best = v; bc = cnt[v]; }
      if (bc >= 5 && cnt[own] <= 2) a[y * W + x] = best;
    }
  }
}
// minimum feature size 2 x 2 (Rule 1.9): a tile that belongs to no 2 x 2 block of its own terrain takes the most common terrain among its four neighbours
function minFeature(a, W, H, skip = () => false, never = () => false, passes = 8, toGrass = false, lane = null, hold = null) {   // lane: where path may be (a grass bit never turns to path outside the trail's lanes); hold: tiles no pass changes (the water a stream drew, F6: a stream is never shaved or cut at a place edge)
  const cnt = new Int16Array(16), at = (src, x, y) => src[clamp(y, 0, H - 1) * W + clamp(x, 0, W - 1)];
  for (let p = 0; p < passes; p++) {
    const src = a.slice(); let changed = 0;
    for (const gp of toGrass ? [false, true] : [false]) {   // stray tiles of other terrains first, bits of grass only when none is left (so a strip of grass is never widened into what is about to go)
    if (gp && changed) break;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const v = src[y * W + x]; if (skip(v) || (hold && hold[y * W + x])) continue;
      if (toGrass && (v === TV.GRASS) !== gp) continue;
      let ok = false;
      for (let oy = -1; oy <= 0 && !ok; oy++) for (let ox = -1; ox <= 0 && !ok; ox++) if (at(src, x + ox, y + oy) === v && at(src, x + ox + 1, y + oy) === v && at(src, x + ox, y + oy + 1) === v && at(src, x + ox + 1, y + oy + 1) === v) ok = true;
      if (ok) continue;
      if (toGrass && v === TV.GRASS) {   // a bit of grass with no 2 x 2 block: it joins the terrain round it when that is legal and gives it a 2 x 2 block; else it gets a 2 x 2 block of grass of its own
        let held = false;   // a tile an earlier one of this pass has just given a 2 x 2 block (src is the pass's start) stays grass: reading src alone made the two undo each other every pass, and an even count of passes left both lone
        for (let oy = -1; oy <= 0 && !held; oy++) for (let ox = -1; ox <= 0 && !held; ox++) if (at(a, x + ox, y + oy) === v && at(a, x + ox + 1, y + oy) === v && at(a, x + ox, y + oy + 1) === v && at(a, x + ox + 1, y + oy + 1) === v) held = true;
        if (held) continue;
        cnt.fill(0); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const u = at(a, x + dx, y + dy); if (u !== v && !never(u)) cnt[u]++; }
        let best = -1, bc = 0; for (let u = 1; u < 16; u++) if (cnt[u] > bc && !(u === TV.PATH && lane && !lane[y * W + x])) { best = u; bc = cnt[u]; }
        if (best >= 0) {
          a[y * W + x] = best;
          let legal = true, own = false;
          for (let oy = -1; oy <= 0; oy++) for (let ox = -1; ox <= 0; ox++) {
            const xs = x + ox, ys = y + oy; if (xs < 0 || ys < 0 || xs + 1 >= W || ys + 1 >= H) continue;
            const b0 = a[ys * W + xs], b1 = a[ys * W + xs + 1], b2 = a[(ys + 1) * W + xs], b3 = a[(ys + 1) * W + xs + 1], set = new Set([b0, b1, b2, b3]);
            if (!blockOk(set)) legal = false;
            if (set.size === 1 && b0 === best) own = true;
          }
          if (legal && own) { changed++; continue; }
          a[y * W + x] = v;
        }
        let pick = null, pn = 9;
        for (let oy = -1; oy <= 0; oy++) for (let ox = -1; ox <= 0; ox++) {
          const xs = x + ox, ys = y + oy; if (xs < 0 || ys < 0 || xs + 1 >= W || ys + 1 >= H) continue;
          let bad = 0, foreign = 0; for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const u = a[(ys + dy) * W + xs + dx]; if (u !== TV.GRASS) { foreign++; if (never(u) || u === TV.PATH || (hold && hold[(ys + dy) * W + xs + dx])) bad++; } }   // a trail's path is never given up to a grass bit's 2 x 2 block (it cut trails at the places' edges)
          if (!bad && foreign < pn) { pn = foreign; pick = [xs, ys]; }
        }
        if (pick) for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const k = (pick[1] + dy) * W + pick[0] + dx; if (a[k] !== TV.GRASS) { a[k] = TV.GRASS; changed++; } }
        continue;
      }
      cnt.fill(0); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const u = at(src, x + dx, y + dy); if (u !== v && !never(u)) cnt[u]++; }
      let best = -1, bc = 0; for (let u = 1; u < 16; u++) if (cnt[u] > bc) { best = u; bc = cnt[u]; }
      if (toGrass && v !== TV.GRASS) best = TV.GRASS;   // in the alternation with the legal pass a stray tile of another terrain only ever turns to grass, so the two passes end
      if (best >= 0) { a[y * W + x] = best; changed++; }
    }
    }
    if (!changed) break;
  }
}
// pools smaller than 3 x 3 are dropped (the art director): a body of water with no 3 x 3 block of water in it becomes grass; a body that reaches the window's edge is kept
function dropPools(t, W, H) {
  const seen = new Uint8Array(W * H), q = new Int32Array(W * H);
  for (let s = 0; s < W * H; s++) {
    if (t[s] !== TV.WATER || seen[s]) continue;
    let n = 0, edge = false, big = false, x0 = W, x1 = 0, y0 = H, y1 = 0; q[n++] = s; seen[s] = 1;
    for (let h = 0; h < n; h++) {
      const c = q[h], x = c % W, y = (c / W) | 0;
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1) edge = true;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      if (!big && x + 2 < W && y + 2 < H) { big = true; for (let dy = 0; dy < 3 && big; dy++) for (let dx = 0; dx < 3; dx++) if (t[(y + dy) * W + x + dx] !== TV.WATER) { big = false; break; } }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const m = Y * W + X; if (t[m] === TV.WATER && !seen[m]) { seen[m] = 1; q[n++] = m; } }
    }
    if (!big && !edge && x1 - x0 < 12 && y1 - y0 < 12) for (let h = 0; h < n; h++) t[q[h]] = TV.GRASS;   // a small pool only: a body longer than 12 tiles is a stream, whole in any window that shows its end
  }
}

// Smooth the edge of one terrain v: an opening then a closing with a 3 x 3 square on its mask (the art director's rulings b and c). What is narrower than 3 tiles goes (a bay of it, a
// strip, a spur, a block): it becomes grass. A gap of grass narrower than 3 in it fills with v. Other terrains are not touched. The window's rim is read as itself.
function smoothBays(t, W, H, v) {
  const k = 3, N2 = W * H;
  const erode = (m, val) => { const T = new Uint8Array(N2), O = new Uint8Array(N2);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let r = 1; for (let d = 0; d < k; d++) if (m[y * W + Math.min(x + d, W - 1)] !== val) { r = 0; break; } T[y * W + x] = r; }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let r = 1; for (let d = 0; d < k; d++) if (!T[Math.min(y + d, H - 1) * W + x]) { r = 0; break; } O[y * W + x] = r; }
    return O; };
  const dilate = m => { const T = new Uint8Array(N2), O = new Uint8Array(N2);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let r = 0; for (let d = 0; d < k; d++) if (m[y * W + Math.max(x - d, 0)]) { r = 1; break; } T[y * W + x] = r; }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let r = 0; for (let d = 0; d < k; d++) if (T[Math.max(y - d, 0) * W + x]) { r = 1; break; } O[y * W + x] = r; }
    return O; };
  let mask = new Uint8Array(N2); for (let i = 0; i < N2; i++) mask[i] = t[i] === v ? 1 : 0;
  const opened = dilate(erode(mask, 1));                      // where a 3 x 3 square of v fits
  for (let i = 0; i < N2; i++) if (mask[i] && !opened[i]) { t[i] = TV.GRASS; mask[i] = 0; }
  const gapOpen = dilate(erode(mask, 0));                     // where a 3 x 3 square of not-v fits
  for (let i = 0; i < N2; i++) if (!mask[i] && !gapOpen[i] && t[i] === TV.GRASS) t[i] = v;
}
const islands = S => S.islandSet || (S.islandSet = new Set(S.R.regions.flatMap(G => { const o = []; for (let c = 0; c < NC; c++) if (G.island[c]) o.push((G.slot[0] * MW + (c % MW)) * 1000 + G.slot[1] * MH + ((c / MW) | 0)); return o; })));
// A bit of ground the walker cannot reach (a grass island the water noise left in a lake, a hollow ringed by thicket) is filled with what rings it. A body of ground that reaches the window's
// edge, holds raised land, is large, or is a region's swim island stays.
function fillPockets(t, W, H, gx0, gy0, island, gate) {
  const seen = new Uint8Array(W * H), q = new Int32Array(W * H), solid = v => v === TV.WATER || v === TV.THICKET;
  let changed = 0;
  for (let s = 0; s < W * H; s++) {
    if (seen[s] || solid(t[s])) continue;
    let n = 0, keep = false, x0 = W, x1 = 0, y0 = H, y1 = 0; q[n++] = s; seen[s] = 1;
    for (let h = 0; h < n; h++) {
      const c = q[h], x = c % W, y = (c / W) | 0;
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1 || t[c] === TV.CLIFF || (gate && gate[c])) keep = true;   // a cut gate keeps the ground it opens
      if (island.has(Math.floor((gx0 + x) / CW) * 1000 + Math.floor((gy0 + y) / CH))) keep = true;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X2 = x + dx, Y2 = y + dy; if (X2 < 0 || Y2 < 0 || X2 >= W || Y2 >= H) continue; const m = Y2 * W + X2; if (!solid(t[m]) && !seen[m]) { seen[m] = 1; q[n++] = m; } }
    }
    if (keep || n > 80 || x1 - x0 >= 20 || y1 - y0 >= 20) continue;
    let water = 0, thicket = 0;
    for (let h = 0; h < n; h++) { const c = q[h], x = c % W, y = (c / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const v = t[clamp(y + dy, 0, H - 1) * W + clamp(x + dx, 0, W - 1)]; if (v === TV.WATER) water++; else if (v === TV.THICKET) thicket++; } }
    const fill = water >= thicket ? TV.WATER : TV.THICKET;
    for (let h = 0; h < n; h++) t[q[h]] = fill;
    changed += n;
  }
  return changed;
}

// Views agree: where the map calls the edge between two land cells open or a stair (world.mjs sideKind), the land has a way across it. When the tiles of the edge hold no run of two that walk on both sides
// (a thicket mass, a lake), a gate 2 tiles wide is cut at the edge's port (the trail's tiles, region.mjs portOffset) and runs straight in on each side until it meets ground that walks, at most
// GATE_DEPTH tiles; what it crosses turns to grass (raised land and deep water are never cut). It is a function of the world edge and the tiles round it, so both cells cut the same gate.
const GATE_DEPTH = 14;
const PORT_HOLD = 3;   // F6 try 2: tiles in from a place edge where a stream's water is held through the passes
function openGates(S, t, W, H, gx0, gy0, X, Y, fordMask = null) {   // fordMask: the water a stream drew, which a gate crosses as ford ground (F6)
  const at = (gx, gy, a = t) => { const x = gx - gx0, y = gy - gy0; return x < 0 || y < 0 || x >= W || y >= H ? -1 : a[y * W + x]; };
  const walkAt = (gx, gy, a = t) => { const v = at(gx, gy, a); return v === TV.GRASS || v === TV.SAND || v === TV.PATH || v >= TV.LITTER || v === TV.SCRUB || (v === TV.CLIFF && at(gx - 1, gy, a) === TV.CLIFF && at(gx + 1, gy, a) === TV.CLIFF && at(gx, gy - 1, a) === TV.CLIFF && at(gx, gy + 1, a) === TV.CLIFF); };
  const gate = new Uint8Array(W * H);
  const put = (gx, gy, ground = TV.GRASS) => { const x = gx - gx0, y = gy - gy0; if (x < 0 || y < 0 || x >= W || y >= H) return false; const v = t[y * W + x]; if (v === TV.CLIFF || v === TV.DEEP || inlandOf(gx, gy) < COAST_REACH) return false; t[y * W + x] = fordMask && fordMask[y * W + x] && v === TV.WATER ? TV.FORD : ground; gate[y * W + x] = 1; return true; };
  const fordCell = (cx, cy, nx, ny) => { const g = (X, Y) => { const R = cellRegion(X, Y); return !!(R && R.ford[(Y % MH) * MW + (X % MW)]); }; return g(cx, cy) || g(nx, ny); };   // one of the two cells is a ford
  const tr = trailsOf(S), trailEdge =(cx, cy, nx, ny) => (tr.by.get(cx * 1000 + cy) || []).some(({ t: T, k }) => [T.cells[k - 1], T.cells[k + 1]].some(o => o && o[0] === nx && o[1] === ny));   // the realm's trails cross this edge
  const cellRegion = (cx, cy) => (cx < 0 || cy < 0 || cx >= RW || cy >= RH ? null : S.R.regions[Math.floor(cy / MH) * ATLAS + Math.floor(cx / MW)]);
  // every edge between two cells of the window is opened, not only the centre's: a gate runs up to GATE_DEPTH tiles into a cell, and the thicket gaps (cutThicketGaps) judge a part by the land one cell round the cells it touches,
  // so a neighbour's window, whose centre is one cell over, must lay the same gates as this one or the two pick different targets for the same deer path (seed 42, cell 12,40 against 13,40)
  for (let j = 0; j < WIN_Y - 1; j++) for (let i = 0; i < WIN_X - 1; i++) {
    const cx = X - HX + i, cy = Y - HY + j;
    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      const nx = cx + dx, ny = cy + dy, G = cellRegion(cx, cy);
      if (!G || G !== cellRegion(nx, ny)) continue;
      const a = (cy % MH) * MW + (cx % MW), b = (ny % MH) * MW + (nx % MW);
      G.soft = G.soft || softGround(G, S.seed); G.banks = G.banks || bankEdges(G, S.seed);
      const goes = k => k === 'open' || k === 'stair';   // a stair's border is crossed on the low ground like an open one
      if (!goes(sideKind(G, a, dx ? 'right' : 'down')) && !goes(sideKind(G, b, dx ? 'left' : 'up'))) continue;   // open from either cell's side (a ford is stepped into, not out of)
      const len = dx ? CH : CW, base = dx ? cy * CH : cx * CW, line = dx ? nx * CW : ny * CH;   // the edge runs along `len` tiles from `base`; the first tile across it is `line`
      const walkPair = k => dx ? walkAt(line - 1, base + k) && walkAt(line, base + k) : walkAt(base + k, line - 1) && walkAt(base + k, line);
      let run = 0, has = false; for (let k = 0; k < len && !has; k++) { run = walkPair(k) ? run + 1 : 0; has = run >= 2; }
      const off = portOffset(S.seed, G.slot[0], G.slot[1], edgeOfStep(a, b)), trailE = trailEdge(cx, cy, nx, ny);   // a trail crosses this edge: the gate is its path (2 wide) with a tile of grass each side, so the path meets grass only and reaches the walking ground
      if (trailE && fordCell(cx, cy, nx, ny) && has) has = walkPair(off) && walkPair(off + 1);   // a ford's trail meets the edge at its port: a run of walking rows elsewhere on the edge does not carry it
      if (has) continue;
      for (const side of [-1, 0]) for (let d = 0; d < GATE_DEPTH; d++) {   // side -1: back into the cell A; 0: on into the cell B
        const pos = side === -1 ? line - 1 - d : line + d, rows = [base + off, base + off + 1];
        if (rows.every(r => (dx ? walkAt(pos, r) : walkAt(r, pos)))) break;
        for (const r of rows) dx ? put(pos, r, trailE ? TV.PATH : TV.GRASS) : put(r, pos, trailE ? TV.PATH : TV.GRASS);
        if (trailE) for (const r of [base + off - 1, base + off + 2]) { if ((dx ? at(pos, r) : at(r, pos)) === TV.PATH) continue; dx ? put(pos, r) : put(r, pos); }
      }
    }
  }
  pondCauseways(S, t, W, H, gx0, gy0, X, Y, walkAt, put, cellRegion);
  return gate;
}

// The map walks a pond cell, but its water may leave a shore that the tile-level walk cannot reach (the one land link between two shores runs through the water). Only then is a causeway cut: the land of the window is
// labelled by what walks on to what, and for each pond cell with two or more open edges every shore on its open edges (a body of 30 tiles or more) that is not joined to the largest one gets ONE path, 2 tiles wide, along the
// shortest way across the water to a shore already joined. The pond's middle 8 x 8 (what the cell-kind test reads) is never cut, nor is anything `put` refuses.
function pondCauseways(S, t, W, H, gx0, gy0, X, Y, walkAt, put, cellRegion) {
  const idx = (gx, gy) => (gy - gy0) * W + (gx - gx0), inWin = (gx, gy) => gx >= gx0 && gy >= gy0 && gx < gx0 + W && gy < gy0 + H;
  let comp = null, size = null;
  const snap = t.slice(), walk = (x, y) => walkAt(x, y, snap);   // every pond cell reads the land as the gates left it, never as another pond cell's causeway changed it, so the order of the cells does not matter
  const label = (rx0, ry0, rx1, ry1) => {   // the land is labelled inside the pond cell and the ring of one cell round it only, so the cell and its neighbours' windows reach the same verdict
    comp = new Int32Array(W * H).fill(-1); size = [];
    const q = new Int32Array(W * H), inR = (x, y) => x >= rx0 && y >= ry0 && x < rx1 && y < ry1;
    for (let gy = ry0; gy < ry1; gy++) for (let gx = rx0; gx < rx1; gx++) {
      const s = idx(gx, gy);
      if (comp[s] >= 0 || !walk(gx, gy)) continue;
      const id = size.length; let n = 0; q[n++] = s; comp[s] = id;
      for (let h = 0; h < n; h++) { const c = q[h], x = gx0 + c % W, y = gy0 + ((c / W) | 0);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x2 = x + dx, y2 = y + dy; if (!inR(x2, y2)) continue; const m = idx(x2, y2); if (comp[m] < 0 && walk(x2, y2)) { comp[m] = id; q[n++] = m; } } }
      size.push(n);
    }
  };
  for (let j = HY - 1; j <= HY + 1; j++) for (let i = HX - 1; i <= HX + 1; i++) {
    const cx = X - HX + i, cy = Y - HY + j, G = cellRegion(cx, cy); if (!G) continue;
    const c = (cy % MH) * MW + (cx % MW); if (G.land[c] !== L.POND) continue;
    const sides = [];   // the cell's open edges: the neighbour's step
    for (const [dir, opp, ex, ey] of [['right', 'left', 1, 0], ['left', 'right', -1, 0], ['down', 'up', 0, 1], ['up', 'down', 0, -1]]) {
      const mx = cx + ex, my = cy + ey; if (cellRegion(mx, my) !== G) continue;
      const m = (my % MH) * MW + (mx % MW), goes = k => k === 'open' || k === 'stair';
      if (goes(sideKind(G, c, dir)) || goes(sideKind(G, m, opp))) sides.push([ex, ey]);
    }
    if (sides.length < 2) continue;
    const ox = cx * CW, oy = cy * CH; if (!inWin(ox, oy) || !inWin(ox + CW - 1, oy + CH - 1)) continue;
    label(ox - CW, oy - CH, ox + 2 * CW, oy + 2 * CH);
    const inCell = (x, y) => x >= ox && y >= oy && x < ox + CW && y < oy + CH;
    const middle = (x, y) => x >= ox + (CW >> 1) - 3 && x < ox + (CW >> 1) + 5 && y >= oy + (CH >> 1) - 3 && y < oy + (CH >> 1) + 5;
    const cuttable = (x, y) => { if (!inCell(x, y) || middle(x, y) || x < ox + 2 || y < oy + 2 || x >= ox + CW - 2 || y >= oy + CH - 2) return false;   // the two outer rings are never cut: they are what the neighbours' aprons read, and the neighbours' windows may not hold this cell's verdict
 const v = snap[idx(x, y)]; return v !== TV.CLIFF && v !== TV.DEEP && inlandOf(x, y) >= COAST_REACH; };
    const shores = new Map();   // component -> its tiles on the cell's open edges
    for (const [ex, ey] of sides) for (let y = oy; y < oy + CH; y++) for (let x = ox; x < ox + CW; x++) {
      if (ex && x !== (ex > 0 ? ox + CW - 1 : ox)) continue; if (ey && y !== (ey > 0 ? oy + CH - 1 : oy)) continue;
      const k = comp[idx(x, y)]; if (k < 0 || size[k] < 30) continue;
      if (!shores.has(k)) shores.set(k, []); shores.get(k).push(idx(x, y));
    }
    if (shores.size < 2) continue;
    const order = [...shores.keys()].sort((p, q) => size[q] - size[p] || p - q), joined = new Set([order[0]]);
    for (const k of order.slice(1)) {
      const prev = new Int32Array(W * H).fill(-2), queue = []; for (const s of shores.get(k)) { prev[s] = -1; queue.push(s); }
      let hit = -1;
      for (let h = 0; h < queue.length && hit < 0; h++) { const cc = queue[h], x = gx0 + cc % W, y = gy0 + ((cc / W) | 0);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x2 = x + dx, y2 = y + dy; if (!inCell(x2, y2)) continue; const m = idx(x2, y2); if (prev[m] !== -2) continue;
          if (comp[m] >= 0 && comp[m] !== k) { if (joined.has(comp[m])) { prev[m] = cc; hit = m; break; } continue; }
          if (comp[m] !== k && !cuttable(x2, y2)) continue;
          prev[m] = cc; queue.push(m); } }
      if (hit < 0) continue;
      for (let m = prev[hit]; m >= 0 && prev[m] !== -1; m = prev[m]) { const x = gx0 + m % W, y = gy0 + ((m / W) | 0); if (comp[m] >= 0) continue;
        put(x, y); if (cuttable(x + 1, y) && comp[idx(x + 1, y)] < 0) put(x + 1, y); else if (cuttable(x, y + 1) && comp[idx(x, y + 1)] < 0) put(x, y + 1); }
      joined.add(k);
    }
  }
}

// Thicket never closes a way (place-walk-1): after the ground has settled, a walkable part of a window that thicket alone cuts off from the land beyond it (no water or cliff in the way) gets a gap 2 tiles wide through the
// thinnest stretch of thicket, to the nearest other part that is not itself such a pocket. A part is judged only where every window that shows one of the cells it touches shows all of it with its gap's reach (its box and
// GAP_MAX + 3 tiles round it lie within one cell round each cell it touches across, two cells up and down: the window is 7 x 9 cells), as the land rule's pockets are, so a cell is the same from every neighbour's window. The gap runs through thicket tiles only (a cliff, water,
// deep water and the coast band are never cut) and is marked as a gate tile, which the settling passes keep. Returns the number of gaps cut.
const GAP_MAX = 10, GAP_SMALL = 1500, GAP_ANCHOR = 200, GAP_RUN = 4;
function cutThicketGaps(t, W, H, gx0, gy0, wayups, gate, S, mark) {
  const N = W * H, NB = [[1, 0], [-1, 0], [0, 1], [0, -1]], cause = new Uint8Array(N);   // cause: how a gap tile came to be (1 path, 2 side, 3 wide third, 4 mouth, 5 notch)
  const wu =new Uint8Array(N); for (const a of wayups) for (let y = a.y; y < a.y + a.h; y++) for (let x = a.x; x < a.x + a.w; x++) { const lx = x - gx0, ly = y - gy0; if (lx >= 0 && ly >= 0 && lx < W && ly < H) wu[ly * W + lx] = 1; }
  const pass = new Uint8Array(N);
  const L7 = { raised: (x, y) => x >= 0 && y >= 0 && x < W && y < H && t[y * W + x] === TV.CLIFF, low: (x, y) => !(x >= 0 && y >= 0 && x < W && y < H && t[y * W + x] === TV.CLIFF), way: (x, y) => x >= 0 && y >= 0 && x < W && y < H && wu[y * W + x] === 1, inside: () => true };
  // raised tiles counted over any box in one step (an integral image): relief.mjs's ring, face and flank of a tile need raised land within a column either side and FACE_ROWS + 1 rows above or 2 below, so a tile with
  // none there is none of them and partAt is not asked (the most of a meadow window)
  const ii = new Int32Array((W + 1) * (H + 1));
  for (let y = 0; y < H; y++) { let run = 0; for (let x = 0; x < W; x++) { run += t[y * W + x] === TV.CLIFF ? 1 : 0; ii[(y + 1) * (W + 1) + x + 1] = ii[y * (W + 1) + x + 1] + run; } }
  const UP = FACE_ROWS + 1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {   // the game's own walk (relief.mjs): water, deep water and thicket block, and so do a cliff's ring (lip), its face under it and its flank beside it; a way up walks
    const i = y * W + x, v = t[i]; if (v === TV.WATER || v === TV.THICKET || v === TV.DEEP) continue;
    const xa = x > 1 ? x - 1 : 0, xb = x + 2 < W ? x + 2 : W, ya = y > UP ? y - UP : 0, yb = y + 3 < H ? y + 3 : H;
    if (ii[yb * (W + 1) + xb] - ii[ya * (W + 1) + xb] - ii[yb * (W + 1) + xa] + ii[ya * (W + 1) + xa] === 0) { pass[i] = 1; continue; }
    const p = partAt(L7, x, y); if (p === PART.RING || p === PART.FACE || p === PART.FLANK) continue;
    pass[i] = 1;
  }
  const lab = new Int32Array(N).fill(-1), comps = [];
  for (let s = 0; s < N; s++) {
    if (!pass[s] || lab[s] >= 0) continue;
    const id = comps.length, q = [s]; lab[s] = id; let x0 = W, x1 = 0, y0 = H, y1 = 0;
    for (let h = 0; h < q.length; h++) { const c = q[h], x = c % W, y = (c / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (const [dx, dy] of NB) { const a = x + dx, b = y + dy; if (a < 0 || b < 0 || a >= W || b >= H) continue; const m = b * W + a; if (pass[m] && lab[m] < 0) { lab[m] = id; q.push(m); } } }
    comps.push({ id, tiles: q, n: q.length, x0, x1, y0, y1, edge: x0 === 0 || y0 === 0 || x1 === W - 1 || y1 === H - 1 });
  }
  const R = GAP_MAX + 3, cellsOk = c => {   // the part's box and its reach lie within one cell round each cell it touches
    const fx0 = gx0 + c.x0 - R, fx1 = gx0 + c.x1 + R, fy0 = gy0 + c.y0 - R, fy1 = gy0 + c.y1 + R;
    for (let cx = Math.floor(fx0 / CW); cx <= Math.floor(fx1 / CW); cx++) if (fx0 < (cx - 1) * CW || fx1 >= (cx + 2) * CW) return false;
    for (let cy = Math.floor(fy0 / CH); cy <= Math.floor(fy1 / CH); cy++) if (fy0 < (cy - 2) * CH || fy1 >= (cy + 3) * CH) return false;   // the window is two cells taller each side than wide: two cells either way
    return true; };
  const anchor = c => c.edge || c.n >= GAP_ANCHOR && !(c.n <= GAP_SMALL && cellsOk(c));   // a part that goes on beyond what the window shows, or that is not a small pocket
  const cuttable = i => t[i] === TV.THICKET && inlandOf(gx0 + (i % W), gy0 + ((i / W) | 0)) >= COAST_REACH;
  let cuts = 0;
  for (const c of comps.slice().sort((a, b) => a.n - b.n || a.y0 - b.y0 || a.x0 - b.x0)) {
    if (c.edge || c.n > GAP_SMALL || !cellsOk(c) || anchor(c)) continue;
    // thicket tiles beside the part, then outward through thicket, a step a ring; the first ring to touch a walkable tile of another part ends it
    const prev = new Map(), q = []; let hit = -1, hitFrom = -1;
    for (const s of c.tiles.slice().sort((a, b) => a - b)) for (const [dx, dy] of NB) { const x = (s % W) + dx, y = ((s / W) | 0) + dy; if (x < 0 || y < 0 || x >= W || y >= H) continue; const m = y * W + x; if (cuttable(m) && !prev.has(m)) { prev.set(m, -1); q.push(m); } }
    for (let h = 0, ring = 1; h < q.length && hit < 0 && ring <= GAP_MAX; ) {
      const end = q.length;
      for (; h < end && hit < 0; h++) { const m = q[h], x = m % W, y = (m / W) | 0;
        for (const [dx, dy] of NB) { const a = x + dx, b = y + dy; if (a < 0 || b < 0 || a >= W || b >= H) continue; const k = b * W + a;
          if (pass[k] && lab[k] !== c.id && comps[lab[k]] && (anchor(comps[lab[k]]) || comps[lab[k]].n > c.n || (comps[lab[k]].n === c.n && lab[k] > c.id))) { hit = m; hitFrom = k; break; }
          if (cuttable(k) && !prev.has(k)) { prev.set(k, m); q.push(k); } } }
      ring++;
    }
    if (hit < 0) continue;
    // a deer path (place-walk-2): the way through is the cheapest walk through thicket within the thinnest crossing's reach, each step costing 1 plus a noise of the world position (as the trail's wander), so it bends;
    // then it is carved 2 to 3 tiles wide by the noise, its two edges ragged, flared at both ends into a mouth
    const isTarget = k => pass[k] && lab[k] !== c.id && comps[lab[k]] && (anchor(comps[lab[k]]) || comps[lab[k]].n > c.n || (comps[lab[k]].n === c.n && lab[k] > c.id));
    const reach = new Map(), rq = []; for (const s of prev.keys()) if (prev.get(s) === -1) { reach.set(s, 0); rq.push(s); }
    for (let h = 0; h < rq.length; h++) { const m = rq[h], d = reach.get(m); if (d >= GAP_MAX) continue;
      for (const [dx, dy] of NB) { const a = (m % W) + dx, b = ((m / W) | 0) + dy; if (a < 0 || b < 0 || a >= W || b >= H) continue; const k = b * W + a; if (cuttable(k) && !reach.has(k)) { reach.set(k, d + 1); rq.push(k); } } }
    const cost = m => 1 + 2.4 * clamp(0.5 + 0.5 * S.nS(gx0 + (m % W), gy0 + ((m / W) | 0)), 0, 1);
    const best = new Map(), from = new Map(), heap = []; let goal = -1;
    const less = (p, q) => p[0] < q[0] || (p[0] === q[0] && p[1] < q[1]);
    const push = e => { heap.push(e); for (let i = heap.length - 1; i > 0; ) { const p = (i - 1) >> 1; if (!less(heap[i], heap[p])) break; [heap[i], heap[p]] = [heap[p], heap[i]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; for (let i = 0; ; ) { let a = 2 * i + 1; if (a >= heap.length) break; if (a + 1 < heap.length && less(heap[a + 1], heap[a])) a++; if (!less(heap[a], heap[i])) break; [heap[i], heap[a]] = [heap[a], heap[i]]; i = a; } } return top; };
    for (const s of reach.keys()) if (reach.get(s) === 0) { best.set(s, cost(s)); from.set(s, -1); push([cost(s), s]); }
    while (heap.length && goal < 0) {
      const [d, m] = pop(); if (d > best.get(m) + 1e-9) continue;
      const x = m % W, y = (m / W) | 0; let end = false; for (const [dx, dy] of NB) { const a = x + dx, b = y + dy; if (a >= 0 && b >= 0 && a < W && b < H && isTarget(b * W + a)) { end = true; break; } }
      if (end) { goal = m; break; }
      for (const [dx, dy] of NB) { const a = x + dx, b = y + dy; if (a < 0 || b < 0 || a >= W || b >= H) continue; const k = b * W + a; if (!reach.has(k)) continue; const nd = d + cost(k); if (!best.has(k) || nd < best.get(k) - 1e-9) { best.set(k, nd); from.set(k, m); push([nd, k]); } }
    }
    if (goal < 0) goal = hit;
    const path = []; for (let m = goal; m >= 0; m = from.has(m) ? from.get(m) : prev.get(m)) path.push(m);
    if (path.length > GAP_MAX + 6) { path.length = 0; for (let m = hit; m >= 0; m = prev.get(m)) path.push(m); }   // a wander never runs far past the thinnest crossing
    const carve = (k, why) => { if (k >= 0 && cuttable(k)) { t[k] = TV.GRASS; gate[k] = 1; mark[k] = 1; cause[k] = why; } };
    path.forEach((m, n) => {
      const x = m % W, y = (m / W) | 0, a = path[Math.max(0, n - 1)], b = path[Math.min(path.length - 1, n + 1)];
      const ddx = Math.abs((b % W) - (a % W)), ddy = Math.abs(((b / W) | 0) - ((a / W) | 0)), horiz = path.length > 1 ? ddx >= ddy : ((hit / W) | 0) === ((hitFrom / W) | 0);
      const sx = horiz ? 0 : 1, sy = horiz ? 1 : 0, wx = gx0 + x, wy = gy0 + y, f = clamp(0.5 + 0.5 * S.nE(wx, wy), 0, 1);
      const side = f > 0.5 ? 1 : -1, wide = S.nD(wx + 31, wy - 17) > 0.05, mouth = n < 2 || n >= path.length - 2;   // the extra tile lies on the side the noise picks; a third where it is wide; a flared mouth at each end
      carve(m, 1); carve((y + side * sy) * W + x + side * sx, 2);
      if (wide || mouth) carve((y - side * sy) * W + x - side * sx, mouth ? 4 : 3);
      if (mouth) { carve((y + sy) * W + x + sx + side * (horiz ? 1 : 0), 4); carve((y - sy) * W + x - sx - side * (horiz ? 1 : 0), 4); }
    });
    cuts++;
  }
  // no straight thicket edge longer than GAP_RUN along a gap (the shape bar): a run of gap tiles with thicket across them is broken by a notch cut into the thicket at its middle
  for (let pass = 0; pass < 6; pass++) {   // also on a call that cuts no new gap: the settling between rounds may have grown thicket against an earlier gap's edge
    const notch = [];
    for (const [ex, ey] of NB) { const ax = ey !== 0 ? 1 : 0, ay = ey !== 0 ? 0 : 1;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const edgeAt = (a, b) => a >= 0 && b >= 0 && a < W && b < H && mark[b * W + a] === 1 && a + ex >= 0 && b + ey >= 0 && a + ex < W && b + ey < H && t[(b + ey) * W + a + ex] === TV.THICKET;
        if (!edgeAt(x, y) || edgeAt(x - ax, y - ay)) continue;
        let n = 0; while (edgeAt(x + ax * n, y + ay * n)) n++;
        if (n > GAP_RUN) { const m = n >> 1; for (const o of [0, -1, 1]) { const k = m + o, i = (y + ay * k + ey) * W + x + ax * k + ex; if (cuttable(i)) { notch.push(i); break; } } } } }
    for (const i of notch) { t[i] = TV.GRASS; gate[i] = 1; mark[i] = 1; cause[i] = 5; }
    // every tile the carving left sits in a 2 x 2 block of grass (place-walk-3): a lone one is widened into the block that needs the fewest thicket tiles cut (the first of the four by position on a tie), or, where the thicket
    // does not allow one, given back to thicket. Decided from the tiles' own place in the window, in scan order, so two windows agree.
    let fixed = 0;
    const isG = (a, b) => a >= 0 && b >= 0 && a < W && b < H && t[b * W + a] === TV.GRASS, inBlock = (x, y) => { for (const [ox, oy] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) if (isG(x + ox, y + oy) && isG(x + ox + 1, y + oy) && isG(x + ox, y + oy + 1) && isG(x + ox + 1, y + oy + 1)) return true; return false; };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (mark[i] !== 1 || t[i] !== TV.GRASS || inBlock(x, y)) continue;
      loneCauses[['', 'path', 'flip', 'wide', 'mouth', 'notch'][cause[i]] || 'other']++;
      let bestCut = null;
      for (const [ox, oy] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) {
        const cut = []; let ok = true;
        for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const a = x + ox + dx, b = y + oy + dy; if (a < 0 || b < 0 || a >= W || b >= H) { ok = false; break; } const k = b * W + a; if (t[k] === TV.GRASS) continue; if (cuttable(k)) cut.push(k); else { ok = false; break; } }
        if (ok && (!bestCut || cut.length < bestCut.length)) bestCut = cut;
      }
      if (bestCut) for (const k of bestCut) { t[k] = TV.GRASS; gate[k] = 1; mark[k] = 1; cause[k] = cause[i]; }
      else { t[i] = TV.THICKET; mark[i] = 0; }
      fixed++;
    }
    if (!notch.length && !fixed) break;
  }
  return cuts;
}
export const loneCauses = { path: 0, flip: 0, wide: 0, mouth: 0, notch: 0, other: 0 };   // diagnostics for the tools: lone tiles the carving left, by cause, before they were widened

function windowOf(S, X, Y) {
  const W = WIN_X * CW, H = WIN_Y * CH, gx0 = (X - HX) * CW, gy0 = (Y - HY) * CH, N = W * H, seed = S.seed, stg = globalThis.F6_STAGE || null;   // F6_STAGE(label): the tools' stage clock (tools/slices-time.mjs)
  if (stg) stg('start');
  const t = new Uint8Array(N).fill(TV.GRASS), forest = new Float32Array(N), rock = new Float32Array(N), wet = new Float32Array(N), scrub = new Float32Array(N), push = new Float32Array(N);
  for (let j = 0; j < WIN_Y; j++) for (let i = 0; i < WIN_X; i++) {
    const c = chunk(S, X - HX + i, Y - HY + j);
    for (let ty = 0; ty < CH; ty++) { const o = (j * CH + ty) * W + i * CW, k = ty * CW; for (let tx = 0; tx < CW; tx++) { forest[o + tx] = c.forest[k + tx]; rock[o + tx] = c.rock[k + tx]; wet[o + tx] = c.wet[k + tx]; scrub[o + tx] = c.scrub[k + tx]; push[o + tx] = c.push[k + tx]; } }
  }
  if (stg) stg('fields');
  // ground from the fields by the biome's recipe (ground.mjs, blended over the borders between biomes): sand, then the wood floor, then scrub, then thicket, then water (the thicket's rim breaks into scrub clumps)
  const LVL0 = levelsOf(S.re);
  const slotAt = (a, b) => S.re.slotBiome[clamp(b, 0, ATLAS - 1) * ATLAS + clamp(a, 0, ATLAS - 1)], shoreOf = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const gx = gx0 + (i % W), gy = gy0 + ((i / W) | 0), r = recipeAt(slotAt, ATLAS, MW * CW, MH * CH, gx, gy);
    if (rock[i] + r.rockAdd > SAND_AT && !loweredAt(LVL0, gx, gy)) t[i] = TV.SCREE;   // land-reach-2: a part the land lowered takes its neighbours' recipe ground, not scree
    else if (r.litterAt < LITTER_NONE && forest[i] + 0.35 * S.nE(gx, gy) + push[i] > r.litterAt) t[i] = TV.LITTER;
    else if (r.dry > 0 || r.turf > 0) { const u = 0.5 + 0.5 * S.nD(gx, gy); if (u < r.dry) t[i] = TV.DRY; else if (1 - u < r.turf) t[i] = TV.TURF; }
    if (forest[i] > r.scrubAt && forest[i] <= r.thicketAt && scrub[i] > r.scrubNoise && t[i] !== TV.DRY && t[i] !== TV.TURF) t[i] = TV.SCRUB;   // a scrub patch is darker than dry grass and turf and would read as a hole on them: none lies on them (art director 2026-11-10)
    if (forest[i] > r.thicketAt) t[i] = TV.THICKET;
    if (wet[i] > r.waterAt || (r.chan > 0.005 && Math.abs(S.nC(gx, gy)) < r.chan && S.nM(gx, gy) > r.mask)) t[i] = TV.WATER;
    shoreOf[i] = r.shore;
  }
  if (stg) stg('ground');
  dropPools(t, W, H);
  smoothBays(t, W, H, TV.WATER); smoothBays(t, W, H, TV.THICKET);
  if (stg) stg('pools+bays');   // the art director, b and c: no bay, strip or block under 3 tiles wide, so shores and thickets do not read as walls
  // a sand shore round every body of water in the Lakes and the Highpools, 1 to 3 tiles wide by noise (rule 4: one shore kind all round, so a beach is never partway along a shore)
  { const dist = new Int8Array(N).fill(99), q = [];
    for (let i = 0; i < N; i++) if (t[i] === TV.WATER) { dist[i] = 0; q.push(i); }
    for (let h = 0; h < q.length; h++) { const i = q[h], x = i % W, y = (i / W) | 0; if (dist[i] >= 3) continue;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X2 = x + dx, Y2 = y + dy; if (X2 < 0 || Y2 < 0 || X2 >= W || Y2 >= H) continue; const j = Y2 * W + X2; if (dist[j] > dist[i] + 1) { dist[j] = dist[i] + 1; q.push(j); } } }
    for (let i = 0; i < N; i++) { if (t[i] === TV.SCREE && dist[i] <= 2) { t[i] = TV.SAND; continue; }   // scree meets water only as sand: the rock field's own shore, as the sand it was before had
      if (!shoreOf[i] || dist[i] === 0 || dist[i] > 3) continue;
      const wide = Math.max(1, Math.min(3, Math.round(shoreOf[i] * (0.45 + 0.55 * (0.5 + 0.5 * S.nS(gx0 + (i % W), gy0 + ((i / W) | 0)))))));
      if (dist[i] <= wide && (t[i] === TV.GRASS || t[i] === TV.LITTER || t[i] === TV.DRY || t[i] === TV.TURF || t[i] === TV.SCREE)) t[i] = TV.SAND; } }
  if (stg) stg('shore');
  majority(t, W, H, 2); minFeature(t, W, H);
  if (stg) stg('majority+minFeature');
  for (let i = 0; i < N; i++) {   // the coast band (see COAST_REACH): a function of the world tile alone, so a place and its neighbour lay the same shore; its edges are the smoothed lines of coastEdges
    const gx = gx0 + (i % W), gy = gy0 + ((i / W) | 0), d = inlandOf(gx, gy); if (d >= COAST_REACH) continue;
    const [deepEnd, wl, sandEnd] = coastEdges(S, gx, gy);
    t[i] = d < deepEnd ? TV.DEEP : d < wl ? TV.WATER : d < sandEnd ? TV.SAND : d < sandEnd + 4 ? TV.GRASS : t[i];
  }
  if (stg) stg('coast');
  // owner #141: a place beside wide water (a map cell of water that is no ford) meets it with a shore: the place's own edge band on that side, 1 or 2 tiles by the seeded noise (in runs of 3 along the edge), is sand,
  // where the ground is plain land (what walks stays what walks: sand walks as grass does). A function of the world tile alone, so every view lays the same land; a place with no wide-water neighbour is untouched.
  { const wideAt = (cx, cy) => cx >= 0 && cy >= 0 && cx < RW && cy < RH && S.landC[cy * RW + cx] === L.WATER && !S.fordC[cy * RW + cx];
    const PLAIN = new Set([TV.GRASS, TV.LITTER, TV.DRY, TV.TURF, TV.SCRUB, TV.SCREE]);
    for (let i = 0; i < N; i++) {
      if (!PLAIN.has(t[i])) continue;
      const gx = gx0 + (i % W), gy = gy0 + ((i / W) | 0), cx = Math.floor(gx / CW), cy = Math.floor(gy / CH), tx = gx - cx * CW, ty = gy - cy * CH;
      if (inlandOf(gx, gy) < COAST_REACH || S.landC[clamp(cy, 0, RH - 1) * RW + clamp(cx, 0, RW - 1)] === L.WATER) continue;   // the coast band is its own; a tile of a water cell is no land's shore
      const sides = [[tx, -1, 0, ty], [CW - 1 - tx, 1, 0, ty], [ty, 0, -1, tx], [CH - 1 - ty, 0, 1, tx]];   // [tiles from the edge, the neighbour's step, along]
      for (const [d, sx, sy, along] of sides) {
        if (d > 2 || !wideAt(cx + sx, cy + sy)) continue;
        const band = 2 + (S.nS(Math.floor(along / 3) * 3 + 0.5, (sx + 2 * sy + 5) * 37 + cx * 11 + cy * 7) > 0.2 ? 1 : 0);   // 2 tiles, or 3 where the noise rises (a strip under 2 wide is taken back by the ground passes)
        if (d < band) { t[i] = TV.SAND; break; }
      }
    }
  }
  if (stg) stg('wide-water shore');  const recipe = t.slice();   // the biome's ground at every tile, low or not: what a raised tile's top takes (topsOf)
  // raised land from the levels: every tile on a level above the lowest; water lies only on the low ground
  const raised = new Uint8Array(N);
  const LVL = levelsOf(S.re);
  for (let j = 0; j < WIN_Y; j++) for (let i = 0; i < WIN_X; i++) {   // each cell's levels read once (levels.mjs raised(), a tile at a time, asked the cell's map for every tile)
    const cx = X - HX + i, cy = Y - HY + j; if (cx < 0 || cy < 0 || cx >= RW || cy >= RH) continue;
    const lc = levelCell(LVL, cx, cy);
    for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CW; tx++) if (lc[ty * CW + tx] >= 1 && inlandOf(cx * CW + tx, cy * CH + ty) >= RAISE_OFF) { const k = (j * CH + ty) * W + i * CW + tx; raised[k] = 1; t[k] = TV.CLIFF; }
  }
  // the cliff's outline is the blocks' outline and nothing else bites into it: terrain the cliff has no pair with keeps one tile of grass between it and the rim, made on its side
  { const isRaised = (x, y) => x >= 0 && y >= 0 && x < W && y < H && raised[y * W + x] === 1;   // relief.mjs's touchesRaised: the 3 x 3 round a tile holds raised land
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (!raised[i] && t[i] !== TV.GRASS && !CLIFF_LOWERS.has(t[i]) && touchesRaised(isRaised, x, y)) t[i] = TV.GRASS; } }   // sand too: a sand-grass edge reaching the rim would be a three-terrain corner, and the legal pass would eat the sand along the whole rim
  if (stg) stg('raised');
  const isCliff = v => v === TV.CLIFF;
  minFeature(t, W, H, isCliff, isCliff);
  if (stg) stg('cliff minFeature');
  // ways up (Rule 1.5): the stairs' faces were found on the block land; nothing is carved. Kept when they touch the window
  const wayups = [];
  for (const st of stairsOf(S)) {
    if (Math.abs(st.A[0] - X) > HX + 1 || Math.abs(st.A[1] - Y) > HY + 1) continue;   // a way up stands in its stair's cell or the one south of it: a stair this far from the window has none in it (and is not looked for)
    const wu = st.wayup; if (!wu) continue;
    if (wu.x - 1 < gx0 || wu.x + 3 > gx0 + W || wu.y - 3 < gy0 || wu.y + 3 > gy0 + H) continue;
    wayups.push({ x: wu.x, y: wu.y, w: wu.w, h: wu.h });
  }
  for (let j = 0; j < WIN_Y; j++) for (let i = 0; i < WIN_X; i++) for (const wu of pocketWayups(LVL, X - HX + i, Y - HY + j)) {   // the land rule's stairs for closed parts (levels.mjs)
    if (wu.x - 1 < gx0 || wu.x + 3 > gx0 + W || wu.y - 3 < gy0 || wu.y + 3 > gy0 + H || wayups.some(a => a.x === wu.x && a.y === wu.y)) continue;
    wayups.push({ x: wu.x, y: wu.y, w: wu.w, h: wu.h });
  }
  // streams (F6, streams.mjs): each stretch of the realm's streams through the window's cells, port to port through the cell's bend point, 2-4 tiles of water by flow; then the realm's bridges over their rivers.
  // Raised land is never drawn over; the trail's brush that crosses a stream's water lays a ford (paint, below), and every stretch that runs through a place gets one more ford at its middle.
  const snap = label => { if (globalThis.F6_SNAP) globalThis.F6_SNAP.push({ label, X, Y, t: t.slice(), W, H, gx0, gy0 }); };   // the debug tools read the window at a stage
  const streamMask = new Uint8Array(N), portHold = new Uint8Array(N), streamRuns = [], fallsSlots = [];
  { const sp = streamPieces(S);
    for (let j = 0; j < WIN_Y; j++) for (let i = 0; i < WIN_X; i++) for (const p of sp.get(cellIdx(X - HX + i, Y - HY + j)) || []) {
      // the falls (R12): where the stream comes out of a south face, its water starts under the 2 face columns of the straight run nearest its port (the slot `falls`); no run: it starts at its port
      let foot = null, up = 0;
      if (p.fromRaised && p.drop === 'falls' && p.in && p.in.side === 'n') {
        const site = fallsSite(raised, W, H, i * CW, j * CH, i * CW + p.in.off + (p.wIn >> 1), wayups, gx0, gy0);
        if (site) { foot = [site.x - i * CW, site.lip + 2 - j * CH]; up = 8; fallsSlots.push({ x: gx0 + site.x, y: gy0 + site.lip, w: 2, h: 1, held: site.held, run: site.run }); }
      }
      // R13: a spring (a stream that rises on low ground, not out of a face or a ravine) rises in a hollow: the nearest tile within 7 of its bend with raised land on 3 of 4 sides within 2 tiles; none: it stays at its bend (counted)
      if (!foot && p.source && !p.in && !p.drop) {
        const ox = i * CW, oy = j * CH, hollow = (x, y) => { let n = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let r = 1; r <= 2; r++) { const X2 = ox + x + dx * r, Y2 = oy + y + dy * r; if (X2 >= 0 && Y2 >= 0 && X2 < W && Y2 < H && raised[Y2 * W + X2]) { n++; break; } } return n >= 3; };
        const [bx, by] = p.bend; let hit = null;
        if (!raised[(oy + by) * W + ox + bx] && hollow(bx, by)) hit = [bx, by];
        else for (let r = 1; r <= 7 && !hit; r++) for (let dy = -r; dy <= r && !hit; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; const x = bx + dx, y = by + dy; if (x < 3 || y < 3 || x > CW - 4 || y > CH - 4 || raised[(oy + y) * W + ox + x] || t[(oy + y) * W + ox + x] === TV.WATER) continue; if (hollow(x, y)) { hit = [x, y]; break; } }
        const st = globalThis.F6_STATS; if (st && !st.seen.has('spring' + p.c)) { st.seen.add('spring' + p.c); st.springs = (st.springs || 0) + 1; if (!hit) st.noHollow = (st.noHollow || 0) + 1; else if (hit[0] === bx && hit[1] === by) st.kept = (st.kept || 0) + 1; else st.moved = (st.moved || 0) + 1; }
        if (hit) foot = hit;
      }
      const tiles = drawStream(t, raised, streamMask, W, H, i * CW, j * CH, gx0, gy0, p, S.nP, foot, up); if (tiles) { streamRuns.push({ p, tiles }); const st0 = globalThis.F6_STATS; if (st0 && (tiles.rIn || tiles.rOut)) { const pc = p.c % RW, pr = (p.c / RW) | 0, set = st0.portRaised || (st0.portRaised = new Set()); if (tiles.rIn) set.add(edgeId(pc, pr, p.in.side)); if (tiles.rOut) set.add(edgeId(pc, pr, p.out.side)); } }
      const st = globalThis.F6_STATS;   // the checks' hook (tools/f6-checks.mjs): each stretch's drawn length over the straight distance between its ends, once
      if (st && tiles && tiles.length > 8 && p.in && p.out && !st.seen.has(p.c + p.fid)) { st.seen.add(p.c + p.fid); const a = tiles[0], b = tiles[tiles.length - 1], d = Math.abs(a % W - b % W) + Math.abs(((a / W) | 0) - ((b / W) | 0)), mid = tiles[tiles.length >> 1];
        const slope = tiles.slope;
        if (d > 0) st.routes.push({ len: tiles.length - 1, straight: d, slope }); }
    }
    // the banks: water meets only grass, sand, scree (the pairs), so what stands within a tile of a stream's water that is not one of them, and any thicket or scrub within two, is grass (else the passes bite the stream's rim)
    { const bank = new Uint8Array(N);
      for (let k = 0; k < N; k++) if (streamMask[k]) { const x0 = k % W, y0 = (k / W) | 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const X2 = x0 + dx, Y2 = y0 + dy; if (X2 < 0 || Y2 < 0 || X2 >= W || Y2 >= H) continue; const j = Y2 * W + X2, v = t[j];
        if (v === TV.CLIFF || v === TV.WATER || v === TV.DEEP || v === TV.GRASS || v === TV.PATH) continue;
        if (Math.max(Math.abs(dx), Math.abs(dy)) <= 1 ? v !== TV.SAND && v !== TV.SCREE : v === TV.THICKET || v === TV.SCRUB) bank[j] = 1; } }
      for (let k = 0; k < N; k++) if (bank[k]) t[k] = TV.GRASS;
      // a bit of grass on the rim with no 2 x 2 block of grass would make its own block by biting the water in the passes (minFeature): the rim is smoothed here instead, such a bit becomes water (twice over)
      for (let pass = 0; pass < 2; pass++) { const fill = [];
        for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) { const k = y * W + x; if (t[k] !== TV.GRASS || !(streamMask[k - 1] || streamMask[k + 1] || streamMask[k - W] || streamMask[k + W])) continue;
          let ok = false; for (let oy = -1; oy <= 0 && !ok; oy++) for (let ox = -1; ox <= 0 && !ok; ox++) { const b = k + oy * W + ox; if (t[b] === TV.GRASS && t[b + 1] === TV.GRASS && t[b + W] === TV.GRASS && t[b + W + 1] === TV.GRASS) ok = true; }
          if (!ok) fill.push(k); }
        for (const k of fill) { t[k] = TV.WATER; streamMask[k] = 1; } } }
    for (const br of bridgeList(S, (a, b) => portOff(S, a, b))) layBridge(t, W, H, gx0, gy0, br);
    // F6 try 2: the water of a stream within PORT_HOLD tiles of a place edge is held (its port rows): no pass shaves it, so a stream never stops at the seam
    for (let k = 0; k < N; k++) if (streamMask[k]) { const mx = (gx0 + (k % W)) % CW, my = (gy0 + ((k / W) | 0)) % CH; if (mx < PORT_HOLD || mx >= CW - PORT_HOLD || my < PORT_HOLD || my >= CH - PORT_HOLD) portHold[k] = 1; }
    snap('streams'); if (stg) stg('streams'); }
  // rupar-banks-7-1: the earth banks (levels.mjs bankWayups): their site is a straight south face that no one walks until a Rupar digs it, so they are not ways up here; the page blocks them and opens a dug one
  const banks = [];
  for (let j = 0; j < WIN_Y; j++) for (let i = 0; i < WIN_X; i++) for (const wu of bankWayups(LVL, X - HX + i, Y - HY + j)) {
    if (wu.x - 1 < gx0 || wu.x + 3 > gx0 + W || wu.y - 3 < gy0 || wu.y + 3 > gy0 + H || banks.some(a => a.x === wu.x && a.y === wu.y)) continue;
    banks.push({ x: wu.x, y: wu.y, w: wu.w, h: wu.h });
  }
  // trails: through each cell of the window, port to port (or to the cell's hub at a trail's end), by the same A* the region uses, painted with a 2 x 2 brush. Raised land takes no path (art slot).
  // a trail runs on ground you can walk: a route tile is open when the 4 x 4 tiles round its 2 x 2 brush hold no water, thicket or raised land; sand and scrub under it turn to grass and its brush to path,
  // so path never meets anything but grass
  // The cell's drawing (the trail's junction): every neighbour the realm's trails join this cell to is a port; two ports meet at a bend point 3-6 tiles off their straight line, one or three or more at the
  // cell's hub tile; each port is routed to the junction. A port slides along its edge (+1, -1, +2, ...) to the first pair of tiles that is open on both sides, so the trail crosses the edge where both
  // places can draw it. A trail clears thicket only where no way round it exists.
  const tr = trailsOf(S), ground = t.slice(), blocked = new Uint8Array(N), blockedT = new Uint8Array(N), blockedB = new Uint8Array(N), blockedC = new Uint8Array(N), blocked2 = new Uint8Array(N), rough = new Uint8Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let hard = x < 1 || y < 1 || x + 2 >= W || y + 2 >= H, hardT = hard, soft = 0; for (let dy = -1; dy <= 2; dy++) for (let dx = -1; dx <= 2; dx++) { const v = t[(y + dy) * W + x + dx]; if (v === TV.WATER || v === TV.CLIFF) { hard = true; hardT = true; } else if (v === TV.THICKET) hard = true; if (v !== TV.GRASS) soft = 1; } blocked[y * W + x] = hard ? 1 : 0; blockedT[y * W + x] = hardT ? 1 : 0; rough[y * W + x] = soft;
    let hardB = x < 1 || y < 1 || x + 2 >= W || y + 2 >= H; for (let dy = 0; dy <= 1; dy++) for (let dx = 0; dx <= 1; dx++) { const v = t[(y + dy) * W + x + dx]; if (v === TV.WATER || v === TV.DEEP || v === TV.CLIFF) hardB = true; } blockedB[y * W + x] = hardB ? 1 : 0;
    let hardC = x < 1 || y < 1 || x + 2 >= W || y + 2 >= H; for (let dy = 0; dy <= 1; dy++) for (let dx = 0; dx <= 1; dx++) if (t[(y + dy) * W + x + dx] === TV.CLIFF) hardC = true; blockedC[y * W + x] = hardC ? 1 : 0;
    let hard2 = hard; for (let dy = -2; dy <= 3 && !hard2; dy++) for (let dx = -2; dx <= 3; dx++) { const v = t[(y + dy) * W + x + dx]; if (v === TV.WATER || v === TV.DEEP || v === TV.CLIFF) { hard2 = true; break; } } blocked2[y * W + x] = hard2 ? 1 : 0; }
  // A trail runs over a raised top as over low land (the top is the same ground, one level paler): a brush whose 6 x 6 box (the 2 x 2 brush and 2 tiles round it) is all raised land lies 1 tile off the lip (the
  // lip is the raised tile beside low land). The path is laid in `pathTop` (the tile stays cliff; topsOf makes it the ground PATHTOP). Only a cell of the raised level routes or ports on it (`topOk`).
  const topFree = new Uint8Array(N), pathTop = new Uint8Array(N);
  { const P = W + 1, ps = new Int32Array(P * (H + 1));
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) ps[(y + 1) * P + x + 1] = raised[y * W + x] + ps[y * P + x + 1] + ps[(y + 1) * P + x] - ps[y * P + x];
    for (let y = 2; y + 3 < H; y++) for (let x = 2; x + 3 < W; x++) if (ps[(y + 4) * P + x + 4] - ps[(y - 2) * P + x + 4] - ps[(y + 4) * P + x - 2] + ps[(y - 2) * P + x - 2] === 36) topFree[y * W + x] = 1; }
  let topArrays = null;   // the blocked masks as a raised cell sees them: the free tops are open
  const topMasks = () => topArrays || (topArrays = [blocked, blockedT, blockedB, blockedC, blocked2].map(a => { const m = a.slice(); for (let i = 0; i < N; i++) if (topFree[i]) m[i] = 0; return m; }));
  const laidTop = (x, y) => { for (let dy = 0; dy <= 1; dy++) for (let dx = 0; dx <= 1; dx++) { const k = (y + dy) * W + x + dx; if (x + dx >= 0 && y + dy >= 0 && x + dx < W && y + dy < H && raised[k]) pathTop[k] = 1; } };
  const fordMemo = new Map(), fordAt = (gx, gy) => { const cx = (gx / CW) | 0, cy = (gy / CH) | 0, key = cx * 1000 + cy; let r = fordMemo.get(key); if (r === undefined) { const G = S.R.regions[((cy / MH) | 0) * ATLAS + ((cx / MW) | 0)], c = (cy % MH) * MW + (cx % MW); r = !!(G && G.ford[c]); fordMemo.set(key, r); } return r; };
  // a ford is walkable shallow ground: the brush laid on the water of a ford cell is grass (water meets grass), so the trail's two ends are joined across it
  let curTop = false;   // the cell being drawn is a raised cell: its trail may lie on a free top
  // the trail's lanes: every tile a brush has laid (each arm's 2 x 2 brush along its own line, the stems, the ports, the gates' path). The trail is their union and nothing else is path: the passes after the
  // drawing never make path outside a lane (f4 fix 8: a fork is its arms' lanes, never a blob the settle or the fade filled)
  const lane = new Uint8Array(N);
  const paint = (x, y, clear) => { if (curTop && x >= 0 && y >= 0 && x < W && y < H && topFree[y * W + x]) { laidTop(x, y); return; } const R0 = 1; /* a lane of grass 1 tile each side: path meets grass only; a wider lane wiped the ground in the middle of trail cells */ for (let dy = -R0; dy <= 1 + R0; dy++) for (let dx = -R0; dx <= 1 + R0; dx++) { const X2 = x + dx, Y2 = y + dy; if (X2 < 0 || Y2 < 0 || X2 >= W || Y2 >= H) continue; const k = Y2 * W + X2, v = t[k], brush = dx >= 0 && dx <= 1 && dy >= 0 && dy <= 1; if (brush) lane[k] = 1; if (brush && v === TV.WATER && streamMask[k]) t[k] = TV.FORD; else if (brush && v === TV.WATER && fordAt(gx0 + X2, gy0 + Y2)) t[k] = TV.GRASS; else if (brush && v !== TV.WATER && v !== TV.FORD && v !== TV.BRIDGE && (clear || v !== TV.THICKET) && v !== TV.CLIFF) t[k] = TV.PATH; else if (!brush && (v === TV.SAND || v === TV.SCRUB || (v >= TV.LITTER && v <= TV.SCREE) || (clear && v === TV.THICKET))) t[k] = TV.GRASS; } };   // a trail over a stream's water is a ford (F6); the ford and the bridge are never laid over
  const stairBy = new Map(); for (const st of stairsOf(S)) stairBy.set(st.A[0] * 1000 + st.A[1] + (st.south ? 's' : 'e'), st);
  const blockedAt = (gx, gy, topOk) => { const x = gx - gx0, y = gy - gy0; return x < 0 || y < 0 || x >= W || y >= H ? false : blockedT[y * W + x] === 1 && !(topOk && topFree[y * W + x]); };
  const blockedAt2 = (gx, gy, topOk) => { const x = gx - gx0, y = gy - gy0; return x < 0 || y < 0 || x >= W || y >= H ? false : blocked2[y * W + x] === 1 && !(topOk && topFree[y * W + x]); };   // 2 tiles off cliff and water (a trail keeps 0 or 2+, never 1)
  const walkOnlyAt = (gx, gy, topOk) => { const x = gx - gx0, y = gy - gy0; if (x < 0 || y < 0 || x >= W || y >= H) return false; if (topOk && topFree[y * W + x]) return false; const v = ground[y * W + x]; return v === TV.WATER || v === TV.DEEP || v === TV.CLIFF || v === TV.THICKET; };   // the ground as it was before any trail was laid, so the port is the same from every window
  // where the trail meets a way up's foot: the brush 2 rows below the lip (one row of grass between it and the lip), at the way up's column or up to 2 columns off it, on the first spot clear of water, thicket and raised land
  // (a pond or a cliff beside the foot would make the settle drop the path); the open spot first, then one that only clears with the thicket cut, then the brush's own tiles dry
  const FOOT = [[0, 2], [-1, 2], [1, 2], [0, 3], [-1, 3], [1, 3], [-2, 2], [2, 2], [-2, 3], [2, 3]];
  const footOf = wu => {
    { const gx = wu.x, gy = wu.y + 3, x = gx - gx0, y = gy - gy0;   // the path runs into the cut itself with no grass row between: a stem of brush from the row right under the cut down to this anchor (paintStem), the trail leaves it 2 rows under the face (two rows of grass, never one, beside the cliff)
      if (x >= 2 && y >= 3 && x + 4 < W && y + 4 < H && !blockedB[y * W + x]) { let dry = true; for (let dy = -2; dy <= 3 && dry; dy++) for (let dx = -1; dx <= wu.w; dx++) { const v = ground[(y + dy) * W + x + dx]; if (v === TV.WATER || v === TV.DEEP || v === TV.THICKET || (dy >= -2 && v === TV.CLIFF)) dry = false; } if (dry) return [gx, gy]; } }
    for (const bl of [blocked, blockedT, blockedB]) for (const [dx, dy] of FOOT) { const gx = wu.x + dx, gy = wu.y + dy, x = gx - gx0, y = gy - gy0; if (x >= 1 && y >= 1 && x + 2 < W && y + 2 < H && !bl[y * W + x]) return [gx, gy]; }
    return [wu.x, wu.y + 2];
  };
  for (let j = 0; j < WIN_Y; j++) for (let i = 0; i < WIN_X; i++) {
    const cx = X - HX + i, cy = Y - HY + j, hits = tr.by.get(cx * 1000 + cy); if (!hits) continue;
    const stems = [], cur = [cx, cy], nbs = new Map(), topAnch = new Set(), onTop = S.lvC[cellIdx(cx, cy)] > 0, [bk, bkT, bkB, bkC, bk2] = onTop ? topMasks() : [blocked, blockedT, blockedB, blockedC, blocked2];
    curTop = onTop;
    for (const { t: T, k } of hits) for (const o of [T.cells[k - 1], T.cells[k + 1]]) if (o) nbs.set(o[0] * 1000 + o[1], o);
    const hh = hash(seed, 'gen7', 'hub', cx, cy), hub = [cx * CW + 12 + (hh % 7) - 3, cy * CH + 14 + ((hh >>> 4) % 7) - 3];
    const anchor = o => {   // the tile where the trail meets the edge to `o`, on this cell's side; null where that side is raised land (no path there yet: art slot)
      const lc = S.lvC[cellIdx(cur[0], cur[1])], lo = S.lvC[cellIdx(o[0], o[1])], len = o[0] !== cur[0] ? CH : CW;
      if (lc === lo) {
        const base = portOff(S, cur, o), pt0 = portTiles(S, cur, o, 0);
        if (tr.bk.has(edgeKey(cur, o))) {   // a bridge's bank: the port stays where the span meets it, the same row on both banks (the span is deep water, so a slide would only drift); where the bank's shore lies in from the edge, the trail meets it at the first dry brush along the port's row
          // the row is shared by both banks: of the rows along the edge (nearest the hashed one first) the one where the larger of the two banks' depths to a dry brush with its lane is least (4 tiles or less: that one)
          const br = tr.bb.get(edgeKey(cur, o)), depthAt = (bank, span, s, bl) => {
            const [ix, iy] = span[0] < bank[0] ? [1, 0] : span[0] > bank[0] ? [-1, 0] : span[1] < bank[1] ? [0, 1] : [0, -1], t0 = portTiles(S, bank, span, s)[0];
            for (let d = 0; d < (ix ? CW : CH) - 4; d++) { const gx = t0[0] + ix * d, gy = t0[1] + iy * d, x = gx - gx0, y = gy - gy0; if (x < 1 || y < 1 || x + 2 >= W || y + 2 >= H) return null; if (!bl[y * W + x]) return { d, tile: [gx, gy] }; }
            return null; };
          let best = null, bestScore = 1e9;
          for (const bl of [blockedT, blockedB]) { for (let k = 0; k < 2 * len && bestScore > 4; k++) { const s = k === 0 ? 0 : (k & 1 ? (k + 1) >> 1 : -(k >> 1)); if (base + s < 2 || base + s > len - 4) continue;
              const ds = br.banks.map(([bank, span]) => depthAt(bank, span, s, bl)); if (ds.some(v => !v)) continue; const score = Math.max(ds[0].d, ds[1].d); if (score < bestScore) { bestScore = score; best = [s, bl]; } }
            if (best) break; }
          const mine = best && (br.banks[0][0][0] === cur[0] && br.banks[0][0][1] === cur[1] ? 0 : 1), r0 = best && depthAt(br.banks[mine][0], br.banks[mine][1], best[0], best[1]);
          return r0 ? r0.tile : pt0[0];
        }
        // slide along the whole edge (+1, -1, +2, ...) to the first pair of tiles open on both sides (the same test from either place); else to the first pair that only walks (no water, thicket or raised land)
        // (the walking test holds the brush's whole 2 x 2 on both sides: the pair of the port and the pair one tile along the edge)
        // the brush of a port reaches one tile into the south or east cell (it is laid from the north or west tile of the pair), so the tile beyond the pair counts too
        const across = cur[0] === o[0] ? 1 : 0, pairAt = s => { const [p, q] = portTiles(S, cur, o, s), far = p[across] > q[across] ? p : q; return [p, q, far.map((v, i) => (i === across ? v + 1 : v))]; };
        const tilesOf = (mode, s) => mode === 0 ? portTiles(S, cur, o, s) : mode === 1 ? [0, -1, 1, 2].flatMap(k => pairAt(s + k)) : mode === 2 ? [0, 1].flatMap(k => pairAt(s + k)) : portTiles(S, cur, o, s);
        const free = (mode, s) => !tilesOf(mode, s).some(p => (mode === -1 ? blockedAt2 : mode === 0 ? blockedAt : walkOnlyAt)(p[0], p[1], lc > 0));   // a raised cell's port may lie on a free top
        // modes: 0 open on both sides; 1 walks, with the brush's margin; 2 walks under the brush alone (a narrow neck); 3 one row walks (a pinch: the trail is one tile wide there and only there)
        for (let mode = -1; mode < 4; mode++) { if (free(mode, 0)) return pt0[0];
          for (let d = 1; d < len; d++) for (const s of [d, -d]) { if (mode < 3 && (base + s < 2 || base + s > len - 4)) continue; if (base + s < 0 || base + s > len - 1) continue; if (free(mode, s)) return portTiles(S, cur, o, s)[0]; } }
        return pt0[0];
      }
      if (lc > lo) {   // a stair, and this is its high side: the trail meets the way up's top, 3 rows above its lip (a raised top: the path is laid on it by topsOf)
        const stA = cur[0] === o[0] && cur[1] < o[1] ? stairBy.get(cur[0] * 1000 + cur[1] + 's') : null;
        if (!(stA && stA.wayup)) return null;
        const a = [stA.wayup.x, stA.wayup.y - 2]; topAnch.add(a); return a;
      }
      const vertical = cur[0] === o[0], A = vertical ? (cur[1] < o[1] ? cur : o) : (cur[0] < o[0] ? cur : o), st = stairBy.get(A[0] * 1000 + A[1] + (vertical ? 's' : 'e'));
      if (st && st.wayup) { const f = footOf(st.wayup); if (f[1] === st.wayup.y + 3) stems.push(st.wayup); return f; }
      return portTiles(S, cur, o, 0)[0];   // the trail meets the way up on the low side
    };
    const anchors = []; for (const o of [...nbs.values()].sort((p, q) => p[0] * 1000 + p[1] - q[0] * 1000 - q[1])) { const a = anchor(o); if (a) anchors.push(a); }
    if (!anchors.length) continue;
    const lx = a => clamp(a[0] - cx * CW, 0, CW - 1), ly = a => clamp(a[1] - cy * CH, 0, CH - 1), ox = (cx - (X - HX)) * CW, oy = (cy - (Y - HY)) * CH;
    const wAt = (x, y) => (oy + y) * W + ox + x;
    // the hub may stand in water or thicket: it moves to the nearest tile that is open (first ground a trail can use as it is, then ground it may clear thicket on)
    const nearOpen = p => { const px = lx(p), py = ly(p);
      for (const bl of [bk2, bk, bkT]) for (let r = 0; r <= 9; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; const x = px + dx, y = py + dy; if (x < 2 || y < 2 || x > CW - 4 || y > CH - 4) continue; if (!bl[wAt(x, y)]) return [cx * CW + x, cy * CH + y]; }
      return p; };
    let junction = anchors.length === 2 ? null : nearOpen(hub);
    if (anchors.length === 2) {   // a bend: 3-6 tiles off the straight line between the two ports, to the side the hash picks, on open ground
      const a = anchors[0], b = anchors[1], mx = (lx(a) + lx(b)) >> 1, my = (ly(a) + ly(b)) >> 1, horiz = Math.abs(lx(a) - lx(b)) >= Math.abs(ly(a) - ly(b)), h2 = hash(seed, 'gen7', 'bend', cx, cy);
      junction = null;
      for (const bm of [bk2, bk]) if (!junction) for (const sd of [h2 & 1 ? 1 : -1, h2 & 1 ? -1 : 1]) for (let d = 3 + ((h2 >>> 4) % 4), k = 0; k < 4 && !junction; k++, d = d > 3 ? d - 1 : d) { const bx = clamp(mx + (horiz ? 0 : sd * d), 3, CW - 4), by = clamp(my + (horiz ? sd * d : 0), 3, CH - 4); if (!bm[wAt(bx, by)]) junction = [cx * CW + bx, cy * CH + by]; }
    }
    // the lines laid in this cell (route tiles, cell-local): an arm after the first ends where it first comes within 3 tiles of one (two lines 3 apart leave a strip of grass one tile wide between
    // their lanes), joined by the brushes straight across to it, so two arms meet and never run side by side (side by side, two 2-wide lanes made a 4-wide blob at every fork)
    const laid = new Uint8Array(CW * CH), JOIN = 3;
    const nearLaid = c => { const x = c % CW, y = (c / CW) | 0; for (let r = 0; r <= JOIN; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; const X2 = x + dx, Y2 = y + dy; if (X2 >= 0 && Y2 >= 0 && X2 < CW && Y2 < CH && laid[Y2 * CW + X2]) return Y2 * CW + X2; } return -1; };
    const routeTo = (a, b, join = false) => {
      const from = ly(a) * CW + lx(a), to = ly(b) * CW + lx(b);
      for (const tier of [-1, 0, 1, 2, 3]) {   // -1: open ground 2 tiles off cliff and water (a trail keeps 0 or 2+ tiles from them, never 1); 0: open ground; 1: may clear thicket; 2: a narrow neck (a shore pinch): only the 2 x 2 brush must be dry and clear of raised land; 3: the last resort, water crossed at a high cost (the brush is never laid on water)
        const clear = tier > 0, bl = tier === 3 ? bkC : tier === 2 ? bkB : clear ? bkT : tier === -1 ? bk2 : bk;
        const cost = (c, n) => { const w = wAt(n % CW, (n / CW) | 0); return bl[w] && n !== to ? null : 1 + 0.7 * (0.5 + 0.5 * S.nP(gx0 + w % W, gy0 + ((w / W) | 0))) + (ground[w] === TV.SAND ? 0.5 : 0) + 3 * rough[w] + (clear && bk[w] ? 4 : 0) + (tier === 3 && bkB[w] ? 12 : 0); };
        let r = route(CW, CH, from, to, cost);
        if (r) {
          if (join) for (let i = 0; i < r.length; i++) { const m = nearLaid(r[i]); if (m < 0) continue;
            let x = r[i] % CW, y = (r[i] / CW) | 0; const mx = m % CW, my = (m / CW) | 0; r = r.slice(0, i + 1);
            while (Math.max(Math.abs(mx - x), Math.abs(my - y)) > 1) { x += Math.sign(mx - x); y += Math.sign(my - y); r.push(y * CW + x); }   // the brushes between: the two lanes overlap, never only touch at a corner
            break; }
          for (const c of r) { paint(ox + (c % CW), oy + ((c / CW) | 0), clear); laid[c] = 1; }
          return true;
        }
      }
      return false;
    };
    for (const wu of stems) paint(wu.x - gx0, wu.y + 1 - gy0, true);   // the stem from the way up's cut to its foot
    for (const a of anchors) { if (topAnch.has(a)) laidTop(a[0] - gx0, a[1] - gy0); else paint(ox + lx(a), oy + ly(a), true); }   // the way up's top is laid where it is; the port's own 2 x 2 of path is always laid, so a neighbour that cannot route past a pinch still meets the trail at the shared tile
    if (junction) anchors.forEach((a, i) => routeTo(a, junction, i > 0));
    else if (!routeTo(anchors[0], anchors[1])) { const j = nearOpen(hub); anchors.forEach((a, i) => routeTo(a, j, i > 0)); }
    // a way up's foot can lie in the higher cell's own rows (the lip is low in that cell): the trail runs from the cell's entry tile (the clamped anchor) up to the foot, over the window
    const routeBox = (ax, ay, bx, by) => {   // window tiles
      const x0 = clamp(Math.min(ax, bx) - 4, 1, W - 3), y0 = clamp(Math.min(ay, by) - 4, 1, H - 3), x1 = clamp(Math.max(ax, bx) + 5, 3, W - 1), y1 = clamp(Math.max(ay, by) + 5, 3, H - 1), bw = x1 - x0, bh = y1 - y0;
      const from = (ay - y0) * bw + ax - x0, to = (by - y0) * bw + bx - x0;
      for (const tier of [0, 1, 2]) {
        const clear = tier > 0, bl = tier === 2 ? bkB : clear ? bkT : bk;
        const cost = (c, n) => { const w = (y0 + ((n / bw) | 0)) * W + x0 + n % bw; return bl[w] && n !== to ? null : 1 + 0.7 * (0.5 + 0.5 * S.nP(gx0 + w % W, gy0 + ((w / W) | 0))) + 3 * rough[w] + (clear && bk[w] ? 4 : 0); };
        const r = route(bw, bh, from, to, cost);
        if (r) { for (const c of r) paint(x0 + c % bw, y0 + ((c / bw) | 0), clear); return true; }
      }
      return false;
    };
    for (const a of anchors) { const fx = a[0] - gx0, fy = a[1] - gy0; if (a[0] >= cx * CW && a[0] < cx * CW + CW && a[1] >= cy * CH && a[1] < cy * CH + CH) continue; if (fx < 1 || fy < 1 || fx >= W - 3 || fy >= H - 3) continue; paint(fx, fy, true); routeBox(fx, fy, ox + lx(a), oy + ly(a)); }
  }
  snap('trail'); if (stg) stg('trails+gates');
  // the set's pairs are all opaque (Rule 1.2-1.3): every 2 x 2 block holds at most two terrains and they must be a pair; the lesser gives way to grass. The 2 x 2 rule alternates
  // with the legal pass (Rule 1.9), and no one-row gully stays under a raised edge. The gates (openGates) are cut once the land has settled, and it settles again round them.
  const wuTile = new Set(); for (const a of wayups) for (let y = a.y; y < a.y + a.h; y++) for (let x = a.x; x < a.x + a.w; x++) { const wx = x - gx0, wy = y - gy0; if (wx >= 0 && wy >= 0 && wx < W && wy < H) wuTile.add(wy * W + wx); }
  const settle = gate => { for (let round = 0; round < 60; round++) {
    let changed = 0;
    { const before = t.slice(); minFeature(t, W, H, isCliff, isCliff, 4, true, lane, portHold); for (let k = 0; k < N; k++) if (t[k] !== before[k]) changed++; } if (globalThis.F6_SNAP && !globalThis.F6_ONCE) snap("min" + round);
    for (let sweep = 0, n = 1; n && sweep < 200; sweep++) {   // sweeps to a fixed point: a chain along a boundary is followed at once
      n = 0;
      for (let j = 0; j <= H; j++) for (let i = 0; i <= W; i++) {
        if (i > 0 && j > 0 && i < W && j < H) {   // the common case, a block inside the window that is one terrain or a legal pair, without allocating
          const k = j * W + i, v0 = t[k - W - 1], v1 = t[k - W], v2 = t[k - 1], v3 = t[k];
          if (v0 === v1 && v1 === v2 && v2 === v3) continue;
        }
        const idx = [];
        for (const [x, y] of [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]]) if (x >= 0 && y >= 0 && x < W && y < H) idx.push(y * W + x);
        const vals = [...new Set(idx.map(k => t[k]))];
        if (blockOk(vals) || (wuTile.size && idx.some(k => wuTile.has(k)) && blockOk(vals.map(v => (v === TV.PATH ? TV.GRASS : v))))) continue;   // the cut of a way up is drawn as path: the path may meet it (and the cliff beside it)
        const cand = vals.filter(v => v !== TV.GRASS).sort((p, q) => KEEP[p] - KEEP[q]);
        const free = cand.filter(v => idx.some(k => t[k] === v && !portHold[k])), drop = (free.length ? free : cand)[0];   // a stream's water is held: the other terrain gives way, unless every one of them is a stream's
        for (const k of idx) if (t[k] === drop && (!portHold[k] || !free.length)) { t[k] = TV.GRASS; n++; }
      }
      changed += n;
    }
    for (let y = 0; y + 2 < H; y++) for (let x = 0; x < W; x++) if (t[y * W + x] === TV.CLIFF && t[(y + 1) * W + x] !== TV.CLIFF && t[(y + 2) * W + x] === TV.CLIFF && !portHold[(y + 1) * W + x]) { t[(y + 1) * W + x] = TV.CLIFF; changed++; }
    if (!changed) changed += fillPockets(t, W, H, gx0, gy0, islands(S), gate);
    if (!changed) break;
  } };
  // a trail keeps 0 or 2+ tiles from a cliff, a lip or water, never 1 (the one-tile strip of grass is no 2 x 2 block): where it could not (a narrow place), the path fades out: the path beside a lone grass tile
  // is given up to grass, and the path left in no 2 x 2 block of its own with it, until none is left to give up; the walk stays (grass walks)
  const atEdge = j => { const gx = gx0 + (j % W), gy = gy0 + ((j / W) | 0), mx = gx % CW, my = gy % CH; return ((mx === CW - 1 || mx === 0) && t[j - 1] === TV.PATH && t[j + 1] === TV.PATH) || ((my === CH - 1 || my === 0) && t[j - W] === TV.PATH && t[j + W] === TV.PATH); };   // the path tiles either side of a place edge that the trail crosses by (path on both sides along the crossing line): they stay (the pinch rule: it fades inside the place, never at the edge); a trail running along the edge line keeps nothing
  const fade = gate => { for (let round = 0; round < (globalThis.F4NOFADE ? 0 : 24); round++) {
    const lone = []; for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) { if (t[y * W + x] !== TV.GRASS) continue;
      let ok = false; for (let oy = -1; oy <= 0 && !ok; oy++) for (let ox = -1; ox <= 0 && !ok; ox++) { const a = x + ox, b = y + oy; if (t[b * W + a] === TV.GRASS && t[b * W + a + 1] === TV.GRASS && t[(b + 1) * W + a] === TV.GRASS && t[(b + 1) * W + a + 1] === TV.GRASS) ok = true; }
      if (!ok) lone.push(y * W + x); }
    const joins = (k, pend) => { const p = i => i === k || t[i] === TV.PATH || pend.has(i); for (const [a, b] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) { const o = k + b * W + a; if (p(o) && p(o + 1) && p(o + W) && p(o + W + 1)) return true; } return false; };   // the strip's tile would sit in a 2 x 2 block of path (else the path pass would give it up again, and the two would never settle)
    const strip = lone.filter(k => (t[k - 1] === TV.PATH && t[k + 1] === TV.PATH) || (t[k - W] === TV.PATH && t[k + W] === TV.PATH)), stripSet = new Set(strip);   // a strip two tiles long (side by side) fills as a pair
    // a one-tile strip between two paths (a gate beside its trail, the notch where two lanes meet) joins them, inside a lane only; or beside a cell edge, where two places' own drawings meet (each cell
    // draws its arms alone, so two cells' lanes that leave a shared port the same way lie a tile apart across the edge: left as grass, the fade gave up both and broke the trail)
    const edgeSide = k => { const mx = (gx0 + (k % W)) % CW, my = (gy0 + ((k / W) | 0)) % CH; return mx <= 1 || mx >= CW - 2 || my <= 1 || my >= CH - 2; };
    let n = 0; for (const k of strip) if ((lane[k] || edgeSide(k)) && joins(k, stripSet)) { t[k] = TV.PATH; n++; }
    for (const k of lone) if (t[k] === TV.GRASS) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const j = k + dy * W + dx; if (t[j] === TV.PATH && !(gate && gate[j]) && !atEdge(j)) { t[j] = TV.GRASS; n++; } }
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { if (t[y * W + x] !== TV.PATH) continue; let ok = false;
      for (let oy = -1; oy <= 0 && !ok; oy++) for (let ox = -1; ox <= 0 && !ok; ox++) { const a = x + ox, b = y + oy; if (t[b * W + a] === TV.PATH && t[b * W + a + 1] === TV.PATH && t[(b + 1) * W + a] === TV.PATH && t[(b + 1) * W + a + 1] === TV.PATH) ok = true; }
      if (!ok && !atEdge(y * W + x)) { t[y * W + x] = TV.GRASS; n++; } }
    if (!n) break; settle(gate); } };
  // one pass before the fade: every path tile outside every lane goes back to grass at once (never one tile at a time, which the fade refilled)
  // then the corner where two lanes meet rounds by 1 tile: a tile with path on 3 or 4 sides joins the lane, once (never again in the fade, so a strip of grass between two lanes side by side is never zipped shut)
  const offLane = () => { for (let k = 0; k < N; k++) if (t[k] === TV.PATH && !lane[k]) t[k] = TV.GRASS;
    const round = []; for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const k = y * W + x; if (lane[k] || t[k] !== TV.GRASS) continue; let n = 0; for (const d of [1, -1, W, -W]) if (t[k + d] === TV.PATH) n++; if (n >= 3) round.push(k); }
    for (const k of round) lane[k] = 1; };
  settle(null); snap('settle1'); if (stg) stg('settle'); offLane(); fade(null); snap('fade1'); if (stg) stg('fade');
  const gate = openGates(S, t, W, H, gx0, gy0, X, Y, streamMask);
  for (let k = 0; k < N; k++) if (gate[k] && t[k] === TV.PATH) lane[k] = 1;   // a gate's path is a lane of its trail
  if (gate.some(v => v)) { settle(gate); offLane(); fade(gate); }
  const gaps = new Uint8Array(W * H);
  for (let round = 0; round < 3; round++) { if (!cutThicketGaps(t, W, H, gx0, gy0, wayups, gate, S, gaps)) break; settle(gate); }   // thicket never closes a way (place-walk-1); the gaps are deer paths (place-walk-2)
  // the way up's foot (f4 fix 8): where no path reaches the foot after the passes (a foot in a narrow pocket: the fade gave the stem up), a spur is drawn from the foot along walkable ground to the
  // nearest path tile of the foot's cell, 2 wide, by the lane rule (2+ tiles off cliff, lip and water, else 1, else the pinch); the passes run again, and a spur they do not keep is taken back and the foot
  // listed (footSpurs). Only feet in the window's middle 3 x 3 cells are drawn (what a spur changes stays in its cell), so every window that shows the foot's cell draws the same spur.
  curTop = false;
  const spurs = S.spurs || (S.spurs = new Map());
  for (const st of stairsOf(S)) {
    if (st.kind !== 'south' || Math.abs(st.A[0] - X) > 3 || st.A[1] < Y - 4 || st.A[1] > Y + 3) continue;   // the foot's cell or the stair's low cell must be in the middle 3 x 3 (below): a stair further off is never read
    const wu = st.wayup; if (!wu) continue;
    const fcx = Math.floor(wu.x / CW), fcy = Math.floor((wu.y + 2) / CH); if (Math.abs(fcx - X) > 1 || (Math.abs(fcy - Y) > 1 && Math.abs(st.B[1] - Y) > 1)) continue;   // the foot's cell or the stair's low cell (where a spur may run) is in the middle 3 x 3
    if (!(tr.by.get(st.A[0] * 1000 + st.A[1]) || []).some(({ t: T, k }) => [T.cells[k - 1], T.cells[k + 1]].some(o => o && o[0] === st.B[0] && o[1] === st.B[1]))) continue;   // a stair the trail takes
    const fx = wu.x - gx0, fy = wu.y - gy0, key = wu.x + ',' + wu.y;
    const joined = () => { for (let y = fy + 1; y <= fy + 3; y++) for (let x = fx - 1; x <= fx + wu.w; x++) if (t[y * W + x] === TV.PATH) return true; return false; };   // path within 3 rows under the lip, a column each side
    if (joined()) { if (!spurs.has(key)) spurs.set(key, 'trail'); continue; }
    // the nearest path tile of the foot's cell; a foot in the upper cell's low rows with no path there reads the stair's low cell too (the trail's own cell on that side)
    const nearest = (ox, oy, bw, bh) => { let to = -1, td = 1e9; for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) { if (t[(oy + y) * W + ox + x] !== TV.PATH) continue; const d = Math.abs(ox + x - fx) + Math.abs(oy + y - fy - 2); if (d < td) { td = d; to = y * bw + x; } } return to; };
    let ox = (fcx - (X - HX)) * CW, oy = (fcy - (Y - HY)) * CH, bw = CW, bh = CH, to = nearest(ox, oy, bw, bh);
    if (to < 0 && (st.B[0] !== fcx || st.B[1] !== fcy)) { ox = (Math.min(fcx, st.B[0]) - (X - HX)) * CW; oy = (Math.min(fcy, st.B[1]) - (Y - HY)) * CH; bw = (Math.abs(st.B[0] - fcx) + 1) * CW; bh = (Math.abs(st.B[1] - fcy) + 1) * CH; to = nearest(ox, oy, bw, bh); }
    if (to < 0) { spurs.set(key, 'no path in the cell'); continue; }
    // the spur holds only if the foot's path reaches the trail tile it aimed at, any break 2 tiles at most (the pinch rule)
    const reaches = (tx, ty) => { const seen = new Set(), q = []; for (let y = fy + 1; y <= fy + 3; y++) for (let x = fx - 1; x <= fx + wu.w; x++) if (t[y * W + x] === TV.PATH) { seen.add(y * W + x); q.push(y * W + x); }
      for (let h = 0; h < q.length; h++) { const x = q[h] % W, y = (q[h] / W) | 0; if (Math.abs(x - tx) <= 1 && Math.abs(y - ty) <= 1) return true;
        for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const X2 = x + dx, Y2 = y + dy; if (X2 < ox || Y2 < oy || X2 >= ox + bw || Y2 >= oy + bh) continue; const m = Y2 * W + X2; if (!seen.has(m) && t[m] === TV.PATH) { seen.add(m); q.push(m); } } }
      return false; };
    const hard = (x, y, r, th) => { for (let dy = -r; dy <= 1 + r; dy++) for (let dx = -r; dx <= 1 + r; dx++) { const X2 = ox + x + dx, Y2 = oy + y + dy; if (X2 < 0 || Y2 < 0 || X2 >= W || Y2 >= H) return true; const v = t[Y2 * W + X2]; if (v === TV.WATER || v === TV.DEEP || v === TV.CLIFF || (th && v === TV.THICKET)) return true; } return false; };
    const masks = [-1, 0, 2].map(tier => { const m = new Uint8Array(bw * bh); for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) m[y * bw + x] = (tier === -1 ? hard(x, y, 2, false) || hard(x, y, 1, true) : tier === 0 ? hard(x, y, 1, true) : hard(x, y, 0, true)) ? 1 : 0; return m; });
    let ok = false, tries = 0;
    for (const [dx, dy] of [[0, 1], [-1, 1], [1, 1], [0, 2], [-2, 2], [2, 2], [0, 3], [-2, 3], [2, 3]]) {
      const sx = fx + dx - ox, sy = fy + dy - oy; if (sx < 0 || sy < 0 || sx > bw - 2 || sy > bh - 2 || hard(sx, sy, 0, true)) continue;
      for (const m of masks) {
        const r = route(bw, bh, sy * bw + sx, to, (c, n) => (m[n] && n !== to ? null : 1)); if (!r) continue;
        const t0 = t.slice(), l0 = lane.slice(); tries++;
        for (const c of r) paint(ox + (c % bw), oy + ((c / bw) | 0), false);
        settle(gate); offLane(); fade(gate);
        if (joined() && reaches(ox + (to % bw), oy + ((to / bw) | 0))) { ok = true; break; }
        t.set(t0); lane.set(l0); break;   // the first tier that routes from this start is the spur from it
      }
      if (ok || tries >= 6) break;
    }
    spurs.set(key, ok ? 'spur' : tries ? 'the passes do not keep a spur' : 'no route');
  }
  // one more ford (F6): in the middle of every stretch of a stream that runs through a place, the stream's water across 2 or 3 tiles of its run becomes ford ground (the stream's whole width across), laid last, on the
  // settled land. What stands beside it that is no pair of the ford (sand, scree, thicket, scrub, litter, dry grass, turf) is grass, so both banks walk and no block is illegal. Only what a stream drew, never the water of a river.
  // land-rules-2 (the stream band's tidy; land-rules-fix-1 began it for the fords): streams and fords are laid after the passes, on the settled land, so their rims can leave a tile in no 2 x 2 block of its own (Rule 1.9):
  // a one-tile notch of water in a bank, a ford tile at a staircase end, a grass or scree spike. Within 2 tiles of a stream's water or a ford, each such tile that the land rule does not keep (lonePlainAt: a diagonal step,
  // or the one-tile grass buffer between two terrains that are no pair) takes the terrain of most of its four neighbours that gives it a 2 x 2 block of its own (or makes it one of those two shapes) and keeps every
  // block round it a pair of the set; where one tile cannot, it and a neighbour of its own terrain change together (a ford that stops a row short of the stream's far bank takes the two water tiles under it);
  // raised land, path, deep water and a bridge are never changed; in the held port rows of a stream (PORT_HOLD) water and ford may trade places, and a wet tile dries only where the wet tiles beside it stay
  // joined round it, so the stream still runs through the seam. Until none is left (6 passes at most)
  const tidyStreams = () => { const loneAt = k => { const v = t[k], x = k % W, y = (k / W) | 0; for (let oy = -1; oy <= 0; oy++) for (let ox = -1; ox <= 0; ox++) { const a = x + ox, b = y + oy; if (a < 0 || b < 0 || a + 1 >= W || b + 1 >= H) continue; const j = b * W + a; if (t[j] === v && t[j + 1] === v && t[j + W] === v && t[j + W + 1] === v) return false; } return true; };
    const blocksOk = k => { const x = k % W, y = (k / W) | 0; for (let oy = -1; oy <= 0; oy++) for (let ox = -1; ox <= 0; ox++) { const a = x + ox, b = y + oy; if (a < 0 || b < 0 || a + 1 >= W || b + 1 >= H) continue; const j = b * W + a; if (!blockOk([t[j], t[j + 1], t[j + W], t[j + W + 1]])) return false; } return true; };
    const FIXED = new Set([TV.CLIFF, TV.PATH, TV.DEEP, TV.BRIDGE]), band = new Uint8Array(N);
    for (let k = 0; k < N; k++) if (streamMask[k] || t[k] === TV.FORD) { const x0 = k % W, y0 = (k / W) | 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const X2 = x0 + dx, Y2 = y0 + dy; if (X2 >= 0 && Y2 >= 0 && X2 < W && Y2 < H) band[Y2 * W + X2] = 1; } }
    const wet = u => u === TV.WATER || u === TV.FORD, RING = [-W, -W + 1, 1, W + 1, W, W - 1, -1, -W - 1];
    const joined = k => { let runs = 0; for (let i = 0; i < 8; i++) { if (!wet(t[k + RING[i]]) || wet(t[k + RING[(i + 7) % 8]])) continue; let orth = false; for (let j = i; j < i + 8 && wet(t[k + RING[j % 8]]); j++) if (j % 2 === 0) orth = true; if (orth) runs++; }
      return runs <= 1 || RING.every(d => wet(t[k + d])); };   // the wet tiles beside k are one run round it (k drying cuts nothing)
    const inner = k => { const x = k % W, y = (k / W) | 0; return x >= 1 && y >= 1 && x < W - 1 && y < H - 1; };
    // a ford sits across running water (land-rules-3): the stream's water beside a ford (within 1 tile) is never dried, so the stream carries on up and down stream of the crossing
    // (only where the water lies in line with the ford: a ford tile on one side, more wet tiles straight on the other)
    const nearFord = new Uint8Array(N);
    for (let k = W + 1; k < N - W - 1; k++) if (t[k] === TV.WATER && streamMask[k]) for (const d of [1, -1, W, -W]) if (t[k + d] === TV.FORD && wet(t[k - d]) && wet(t[k - 2 * d]) && wet(t[k - d + (Math.abs(d) === 1 ? W : 1)]) && wet(t[k - d - (Math.abs(d) === 1 ? W : 1)])) nearFord[k] = 1;
    let guardOn = true;   // the guard holds for the first 6 passes; a tile still lone after them is tidied as before (3 more passes)
    const tryTidy = (ks, v, u) => { if (!ks.every(inner) || ks.some(k => portHold[k] && wet(v) && !wet(u) && !joined(k))) return false;
      if (guardOn && v === TV.WATER && !wet(u) && ks.some(k => nearFord[k] && t[k] === TV.WATER && streamMask[k])) return false;
      for (const k of ks) t[k] = u;
      if (ks.every(k => (!loneAt(k) || lonePlainAt(t, W, k)) && blocksOk(k))) return true;
      for (const k of ks) t[k] = v; return false; };
    for (let pass = 0; pass < 9; pass++) { let n = 0; guardOn = pass < 6;
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const k = y * W + x, v = t[k]; if (!band[k] || FIXED.has(v) || !loneAt(k) || lonePlainAt(t, W, k)) continue;
        const nb = [t[k - 1], t[k + 1], t[k - W], t[k + W]], count = new Map(); for (const u of nb) if (u !== v && !FIXED.has(u)) count.set(u, (count.get(u) || 0) + 1);
        const order = [...count].sort((p, q) => q[1] - p[1] || p[0] - q[0]).map(([u]) => u);
        if (order.some(u => tryTidy([k], v, u))) { n++; continue; }
        for (const j of [k - 1, k + 1, k - W, k + W]) if (t[j] === v && band[j] && order.some(u => tryTidy([k, j], v, u))) { n++; break; } }
      if (!n) { if (!guardOn) break; pass = 5; } } };
  for (const { p, tiles } of streamRuns) {
    if (!(p.in && p.out) || tiles.length < 6) continue;
    const m = tiles.length >> 1, fordTiles = [];
    const x0 = tiles[m] % W, y0 = (tiles[m] / W) | 0, a = Math.max(0, m - 3), b = Math.min(tiles.length - 1, m + 3), dx = (tiles[b] % W) - (tiles[a] % W), dy = ((tiles[b] / W) | 0) - ((tiles[a] / W) | 0), dn = Math.hypot(dx, dy) || 1;   // the run's direction at its middle
    const len = 2 + (hash(seed, 'gen7', 'ford', p.c) & 1);   // 2 or 3 tiles along the stream: the strip across it, of that thickness, through the run's middle
    for (let v = -7; v <= 7; v++) for (let u = -7; u <= 7; u++) { const X2 = x0 + u, Y2 = y0 + v; if (X2 < 0 || Y2 < 0 || X2 >= W || Y2 >= H) continue; const along = (u * dx + v * dy) / dn; if (along < -len / 2 || along >= len / 2) continue; const k = Y2 * W + X2;
      if (t[k] === TV.WATER && streamMask[k]) { t[k] = TV.FORD; fordTiles.push(k); } }
    for (const k of fordTiles) { const fx = k % W, fy = (k / W) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X2 = fx + dx, Y2 = fy + dy; if (X2 < 0 || Y2 < 0 || X2 >= W || Y2 >= H) continue; const j = Y2 * W + X2, v = t[j];
      if (v === TV.SAND || v === TV.SCREE || v === TV.THICKET || v === TV.SCRUB || v === TV.LITTER || v === TV.DRY || v === TV.TURF) t[j] = TV.GRASS; } }
  }
  // no place cut in two by a stream (F6 try 2): the low walkable tiles of the place's own area in two parts of 10+ tiles each, with a stream's water between them, get a ford where the split is narrowest: the shortest run
  // of the stream's water (4 tiles at most) from the smaller part to another part of 10+ tiles becomes ford ground, 2 tiles wide, the banks beside it as for the other fords. A split with no stream's water to cross (a cliff, a thicket,
  // a river, a pond) is counted as another cause and left (F6_STATS.splitWater / splitOther).
  { const WALKV = new Set([TV.SAND, TV.PATH, TV.GRASS, TV.EARTH, TV.SCRUB, TV.LITTER, TV.DRY, TV.TURF, TV.SCREE, TV.FORD, TV.BRIDGE]);
    const ox = HX * CW, oy = HY * CH, inCell = (x, y) => x >= ox + 2 && y >= oy + 2 && x < ox + CW - 2 && y < oy + CH - 2, own = (x, y) => x >= ox && y >= oy && x < ox + CW && y < oy + CH, st = globalThis.F6_STATS, key = 'split' + X + ',' + Y;
    const comps = () => { const lab = new Int32Array(N).fill(-1), sizes = [], DIRS = [1, -1, W, -W];
      for (let y = oy; y < oy + CH; y++) for (let x = ox; x < ox + CW; x++) { const s = y * W + x; if (lab[s] >= 0 || !WALKV.has(t[s])) continue; const id = sizes.length, q = [s]; lab[s] = id;
        for (let h = 0; h < q.length; h++) { const i = q[h], ix = i % W, iy = (i / W) | 0; for (const d of DIRS) { const j = i + d, jx = ix + (d === 1 ? 1 : d === -1 ? -1 : 0), jy = iy + (d === W ? 1 : d === -W ? -1 : 0); if (!own(jx, jy) || lab[j] >= 0 || !WALKV.has(t[j])) continue; lab[j] = id; q.push(j); } }
        sizes.push(q.length); }
      return { lab, sizes }; };
    const wetStream = k => t[k] === TV.WATER && streamMask[k];
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]], bad = new Set();
    for (let round = 0; round < 6; round++) {
      const { lab, sizes } = comps(); const big = sizes.map((n, id) => [n, id]).filter(([n, id]) => n >= 10 && !bad.has(id)).sort((a, b) => a[0] - b[0]);
      if (sizes.filter(n => n >= 10).length < 2 || !big.length) break;
      const [, from] = big[0];   // the smallest part of 10+ tiles: the one that is joined to the next
      const dist = new Map(), prev = new Map(), q = []; let hit = -1;
      for (let y = oy; y < oy + CH; y++) for (let x = ox; x < ox + CW; x++) { const s = y * W + x; if (lab[s] !== from) continue; for (const [dx, dy] of dirs) { const nx = x + dx, ny = y + dy; if (!inCell(nx, ny)) continue; const k = ny * W + nx; if (wetStream(k) && !dist.has(k)) { dist.set(k, 1); prev.set(k, -1); q.push(k); } } }
      for (let h = 0; h < q.length && hit < 0; h++) { const k = q[h], x = k % W, y = (k / W) | 0, d = dist.get(k);
        for (const [dx, dy] of dirs) { const nx = x + dx, ny = y + dy; if (!own(nx, ny)) continue; const j = ny * W + nx; if (lab[j] >= 0 && lab[j] !== from && sizes[lab[j]] >= 10) { hit = k; break; } }
        if (hit >= 0 || d >= 4) continue;
        for (const [dx, dy] of dirs) { const nx = x + dx, ny = y + dy; if (!inCell(nx, ny)) continue; const j = ny * W + nx; if (wetStream(j) && !dist.has(j)) { dist.set(j, d + 1); prev.set(j, k); q.push(j); } } }
      if (hit < 0) { bad.add(from); if (st) { const m = st.splits || (st.splits = new Map()), r = m.get(X + ',' + Y) || { w: 0, o: 0 }; r.o++; m.set(X + ',' + Y, r); } continue; }
      const path = []; for (let k = hit; k >= 0; k = prev.get(k)) path.push(k);
      const horiz = Math.abs((path[0] % W) - (path[path.length - 1] % W)) >= Math.abs(((path[0] / W) | 0) - ((path[path.length - 1] / W) | 0)) && path.length > 1, fordTiles = new Set(path);
      for (const k of path) { const x = k % W, y = (k / W) | 0; for (const s of [1, -1]) { const nx = horiz ? x : x + s, ny = horiz ? y + s : y; if (inCell(nx, ny) && wetStream(ny * W + nx)) { fordTiles.add(ny * W + nx); break; } } }
      for (const k of fordTiles) t[k] = TV.FORD;
      for (const k of fordTiles) { const fx = k % W, fy = (k / W) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X2 = fx + dx, Y2 = fy + dy; if (X2 < 0 || Y2 < 0 || X2 >= W || Y2 >= H) continue; const j = Y2 * W + X2, v = t[j];
        if (v === TV.SAND || v === TV.SCREE || v === TV.THICKET || v === TV.SCRUB || v === TV.LITTER || v === TV.DRY || v === TV.TURF) t[j] = TV.GRASS; } }
      if (st) { const m = st.splits || (st.splits = new Map()), r = m.get(X + ',' + Y) || { w: 0, o: 0 }; r.w++; m.set(X + ',' + Y, r); }
    } }
  tidyStreams();
  if (stg) stg('gaps+spurs');
  const topLayer = topsOf(t, recipe, W, H, pathTop); if (stg) stg('tops');
  return { t, W, H, gx0, gy0, wayups, gaps, falls: fallsSlots, banks, top: topLayer };
}

// ---- the ground under raised land (amendment L): a raised tile's top is the biome's recipe ground there ----
// `t` is the settled terrain (raised land is CLIFF), `recipe` the ground the recipe laid before the levels were cut. Returns a W x H array: on a raised tile its top ground (0 = grass), 0 elsewhere.
// Tops take flat grounds only; water, deep, mud, path and thicket stay on the low ground (a raised tile that would hold one is grass). The cliff sheets have an open top, so the top ground shows right up to the
// lip. Then every 2 x 2 block of the ground (a raised tile counted as its top) holds at most three terrains and every two are a pair the set draws (blockOk), the lesser top giving way to grass.
const TOPS = new Set([TV.GRASS, TV.LITTER, TV.DRY, TV.TURF, TV.SCREE, TV.SAND, TV.SCRUB]);
export function topsOf(t, recipe, W, H, pathTop = null) {
  const top = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (t[i] === TV.CLIFF && recipe[i] !== TV.GRASS && TOPS.has(recipe[i])) top[i] = recipe[i];
  }
  // a trail's path over a top (the ground PATHTOP, its own join set against the top's grass): the other tops within one tile of it give way to grass, so the path meets grass only
  if (pathTop) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (pathTop[y * W + x] && t[y * W + x] === TV.CLIFF)
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < W && Y < H && t[Y * W + X] === TV.CLIFF) top[Y * W + X] = 0; }
    for (let i = 0; i < W * H; i++) if (pathTop[i] && t[i] === TV.CLIFF) top[i] = TV.PATHTOP;
  }
  const e = k => (t[k] === TV.CLIFF ? top[k] || TV.GRASS : t[k]);
  for (let sweep = 0, n = 1; n && sweep < 50; sweep++) {
    n = 0;
    for (let j = 1; j < H; j++) for (let i = 1; i < W; i++) {
      const k = j * W + i, idx = [k - W - 1, k - W, k - 1, k], vals = [...new Set(idx.map(e))];
      if (vals.length === 1) continue;
      // a tile where the cliff layer is drawn (raised and low corners together) is at most four layers deep: three grounds, scrub counting the grass it lies over, and the cliff
      const mixed = idx.some(c => t[c] === TV.CLIFF) && idx.some(c => t[c] !== TV.CLIFF), deep = new Set(vals.includes(TV.SCRUB) ? [...vals, TV.GRASS] : vals).size;
      if (blockOk(vals) && !(mixed && deep > 3)) continue;
      const lift = idx.filter(c => t[c] === TV.CLIFF && top[c]).sort((a, b) => KEEP[top[a]] - KEEP[top[b]]);
      if (!lift.length) continue;
      const drop = top[lift[0]];
      for (const c of lift) if (top[c] === drop) { top[c] = 0; n++; }
    }
  }
  return top;
}

// ---- a cell with its apron ----
// The terrain of cell (X, Y) and one tile round it: (24 + 2) x (28 + 2) values, the first at world tile (24 X - 1, 28 Y - 1). A border dual tile reads the true neighbour terrain.
const CELLS = new Map();
export const LAND_M = 6;   // tiles of raised/low land a place carries beyond its own window for the cliff rules (spec 4.1 rule 6)
export function cellTerrain(seed, X, Y) {
  const key = seed + ':' + X + ',' + Y, hit = CELLS.get(key); if (hit) return hit;
  const S = ctxOf(seed), win = windowOf(S, X, Y), w = CW + 2, h = CH + 2, terrain = new Uint8Array(w * h), top = new Uint8Array(w * h), ox = HX * CW - 1, oy = HY * CH - 1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { terrain[y * w + x] = win.t[(oy + y) * win.W + ox + x]; top[y * w + x] = win.top[(oy + y) * win.W + ox + x]; }
  const x0 = X * CW - 1, y0 = Y * CH - 1;
  const wayups = win.wayups.filter(a => a.x + 3 > x0 && a.x - 1 < x0 + w && a.y + 5 > y0 && a.y < y0 + h).map(a => ({ x: a.x, y: a.y, w: a.w, h: a.h }));   // in world tiles
  // the land the cliff rules read: raised or not for the cell, its apron and LAND_M tiles more each side, from the same window, so a run's end, its steps and the faces of the rows above are found on the land, not on the baked cell
  const lw = w + 2 * LAND_M, lh = h + 2 * LAND_M, raised = new Uint8Array(lw * lh);
  for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) raised[y * lw + x] = win.t[(oy - LAND_M + y) * win.W + ox - LAND_M + x] === TV.CLIFF ? 1 : 0;
  const falls = win.falls.filter(f => f.x + f.w > X * CW && f.x < X * CW + CW && f.y >= Y * CH - 1 && f.y < Y * CH + CH + 1);   // the falls' two face columns (world tiles) that lie in this cell: the empty slot `falls` ([art])
  const banks = win.banks.filter(a => a.x + 3 > x0 && a.x - 1 < x0 + w && a.y + 5 > y0 && a.y < y0 + h).map(a => ({ x: a.x, y: a.y, w: a.w, h: a.h }));   // in world tiles (the page's, never the bake's)
  const out = { x0, y0, w, h, terrain, top, wayups, falls, banks, land: { m: LAND_M, w: lw, h: lh, raised } };
  if (CELLS.size > 4000) CELLS.clear();
  CELLS.set(key, out); return out;
}

// grass tone (terrain layers, ground patches of Rule 1.6): the lipless tone layer over plain grass, in patches of a few tiles from a noise field at world position (about 3 to 8 tiles a patch), never a per-tile repeat. A tile carries tone only when
// the 3 x 3 tiles round it are all grass (or all raised top, with the cells two rows below raised too: terrain-layers-c), so every dual tile that touches a tone corner is wholly one ground: tone never meets a lip, a face or an edge.
// Returns 0/1 per tile of an area whose first tile is world (x0, y0).
// The numbers (the noise field and its threshold, the clear block, the largest patch) are art/places/map-rules.json `tone`.
export function toneField(seed, x0, y0, w, h) {
  const TONE_AT = RULES.tone.noise.threshold, TONE_CLEAR = RULES.tone.clear, TONE_PATCH_MAX = RULES.tone.patchMax;
  if (RULES.tone.enabled === false) return new Uint8Array(w * h);   // map-rules.json `tone.enabled`: false lays no patch (no sunlit patch is drawn)
  const RAISED_GRASS = 100 + TV.GRASS, T0 = worldTiles(seed), P0 = worldReader(seed, 'top', 0), T = (gx, gy) => { const v = T0(gx, gy); return v === TV.CLIFF ? 100 + (P0(gx, gy) || TV.GRASS) : v; };   // a raised tile is told by its top, so tone lies only on a grass top and never across a lip
  const S = ctxOf(seed), n = S.nG, out = new Uint8Array(w * h), memo = S.toneMemo || (S.toneMemo = new Map()), K = (x, y) => y * 8192 + x;
  // a tile that may carry tone: grass (or the raised top) with the whole 5 x 5 block round it that same ground, so a full cell is clear of every edge (path, water, sand, cliff, thicket, scrub); on the raised
  // top the three cells two rows below are in that block, so every dual tile the tone touches is the plain top, never a face or a way up
  const clear = (gx, gy, v) => { for (let dy = -TONE_CLEAR; dy <= TONE_CLEAR; dy++) for (let dx = -TONE_CLEAR; dx <= TONE_CLEAR; dx++) if (T(gx + dx, gy + dy) !== v) return false; return true; };
  // a patch is the 8-connected blob of tiles the noise puts above the threshold; it is kept whole or dropped whole: one tile that is not clear drops the patch (never clipped, which went boxy beside paths and ponds)
  const patchOk = (gx, gy) => {
    const k = K(gx, gy), hit = memo.get(k); if (hit !== undefined) return hit;
    const v = T(gx, gy), seen = new Set([k]), q = [[gx, gy]];
    let ok = (v === TV.GRASS || v === RAISED_GRASS);
    for (let i = 0; i < q.length && ok; i++) {
      const [px, py] = q[i];
      if (T(px, py) !== v || !clear(px, py, v) || q.length > TONE_PATCH_MAX) { ok = false; break; }
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const a = px + dx, b = py + dy, kk = K(a, b); if ((dx || dy) && !seen.has(kk) && n(a, b) > TONE_AT) { seen.add(kk); q.push([a, b]); } }
    }
    if (memo.size > 400000) memo.clear();
    for (const kk of seen) memo.set(kk, ok);   // every tile read is of this one patch, which stands or falls whole
    return ok;
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const gx = x0 + x, gy = y0 + y;
    if (n(gx, gy) > TONE_AT && patchOk(gx, gy)) out[y * w + x] = 1;
  }
  return out;
}

// ---- props and decor (G3, decor.mjs): a function of world tiles, so a cell and its neighbour draw the same props ----
// The land the decor reads: the terrain of any world tile (through the cells' own passes), the biome of the region slot it lies in, every way up, and the atlas slots.
const DEC = new Map();
// the terrain of any world tile (through the cells' own passes); beyond the world it is thicket
export function worldTiles(seed) { return worldReader(seed, 'terrain', TV.THICKET); }
// the ground of any world tile: the top of a raised tile (grass where it holds none), else the terrain itself
export function worldGround(seed) {
  const T = worldTiles(seed), P = worldReader(seed, 'top', 0);
  return (gx, gy) => { const v = T(gx, gy); return v === TV.CLIFF ? P(gx, gy) || TV.GRASS : v; };
}
function worldReader(seed, field, beyond) {
  const cc = new Map();
  let lx = -1, ly = -1, lt = null;
  return (gx, gy) => {
    if (gx < 0 || gy < 0 || gx >= WTW || gy >= WTH) return beyond;
    const X = (gx / CW) | 0, Y = (gy / CH) | 0;
    if (X !== lx || Y !== ly) { const k = Y * RW + X; let t = cc.get(k); if (!t) { if (cc.size > 400) cc.clear(); t = cellTerrain(seed, X, Y)[field]; cc.set(k, t); } lt = t; lx = X; ly = Y; }
    return lt[(gy - Y * CH + 1) * (CW + 2) + gx - X * CW + 1];
  };
}
function landOf(seed) {
  const S = ctxOf(seed), T = worldTiles(seed);
  const biome = (gx, gy) => S.re.slotBiome[((clamp((gy / CH) | 0, 0, RH - 1) / MH) | 0) * ATLAS + ((clamp((gx / CW) | 0, 0, RW - 1) / MW) | 0)];
  const slots = []; for (let ay = 0; ay < ATLAS; ay++) for (let ax = 0; ax < ATLAS; ax++) slots.push({ ax, ay, biome: S.re.slotBiome[ay * ATLAS + ax], x0: ax * MW * CW, y0: ay * MH * CH, x1: (ax + 1) * MW * CW - 1, y1: (ay + 1) * MH * CH - 1 });
  // The way ups are found on first read (findWayup is ~50 ms a stair, 7 s for the realm's 150: the first place waited on them all). wayupsNear(x, y) is the ones of the stairs that could reach the tile: a stair's site
  // lies from the cell west to the cell east of its cell, from its top row to the cell south of it (levels.mjs siteOf), and the decor's zone round a way up is under 8 tiles; so the stairs of the cells round the
  // tile's cell are asked, which is a superset of the ones that matter. The same tiles are answered as with the whole list.
  const stairs = stairsOf(S), by = new Map(), here = new Map();
  for (const st of stairs) { if (st.kind !== 'south') continue; const X = st.A[0], Y = st.A[1];
    for (let cy = Y - 1; cy <= Y + 2; cy++) for (let cx = X - 2; cx <= X + 2; cx++) { const k = cy * 1000 + cx; let l = by.get(k); if (!l) by.set(k, l = []); l.push(st); } }
  const wayupsNear = (gx, gy) => { const k = ((gy / CH) | 0) * 1000 + ((gx / CW) | 0); let r = here.get(k);
    if (!r) { r = []; for (const st of by.get(k) || []) { const w = st.wayup; if (w) r.push(w); } here.set(k, r); } return r; };
  let all = null;
  return { T, G: worldGround(seed), biome, mask: maskFn(seed), W: WTW, H: WTH, get wayups() { return all || (all = stairs.filter(st => st.wayup).map(st => st.wayup)); }, wayupsNear, slots };
}
const SITES = new Map();   // the Hollow Tree sites made so far, by seed: 'ax,ay' -> { x, y, slot } or null. The decor of the seed makes into it; a site made off the page (src/realm-worker.mjs) is merged in by presetHollowSites
const siteCacheOf = seed => { let m = SITES.get(seed); if (!m) { if (SITES.size > 3) SITES.clear(); m = new Map(); SITES.set(seed, m); } return m; };
// sites: what a decor's madeSites() sent: [{ slot, x, y }] or [{ slot, none: true }]; a slot already known is left as it is
export const presetHollowSites = (seed, sites) => { const m = siteCacheOf(seed); for (const s of sites || []) { const k = s.slot[0] + ',' + s.slot[1]; if (!m.has(k)) m.set(k, s.none ? null : { x: s.x, y: s.y, slot: [s.slot[0], s.slot[1]] }); } };
// rupar-banks-slice-2: the Rupar's earth banks of one region (ra, rb), made once (levels.mjs regionBanks); a background slice asks it, a place window reads the lists of the regions it touches
export const banksOfRegion = (seed, ra, rb) => regionBanks(levelsOf(ctxOf(seed).re), ra, rb);
export const madeBanks = seed => { const S = CTX.get(seed); return S ? madeRegionBanks(levelsOf(S.re)) : []; };   // the lists made so far, for the page (plain data); asking never makes the seed's context
export const presetBanks = (seed, lists) => presetRegionBanks(levelsOf(ctxOf(seed).re), lists);   // lists made elsewhere (the worker's), taken as they are
export const decorSites = seed => { const d = DEC.get(seed); return d ? d.madeSites() : []; };   // the Hollow Tree sites already made here: asking never makes the decor (its land is seconds of work) on a page that has none
export const decorOf = seed => { let d = DEC.get(seed); if (!d) { if (DEC.size > 3) DEC.clear(); d = createDecor(seed, landOf(seed), undefined, siteCacheOf(seed)); DEC.set(seed, d); } return d; };
export const biomeAtTile = (seed, gx, gy) => landOf(seed).biome(gx, gy);
// the decor of the tiles x0 .. x0 + w - 1, y0 .. y0 + h - 1 as IR lists (pixels at 48 a tile, relative to the IR's own corner). A prop is in the list when its foot is within two tiles sideways or
// three tiles below: its crown (up to three tiles above the foot, one or two either side) then hangs into the rectangle, and the neighbour draws it identically
function decorIR(seed, x0, y0, w, h) {
  const D = decorOf(seed), props = [], decals = [], at = (tx, ty, dx = 0, dy = 0) => ({ x: (tx - x0) * 48 + 24 + 3 * dx, y: (ty - y0) * 48 + 47 + 3 * dy });
  const placed = (kind, p) => ({ kind, x: p.x, y: p.y, sortY: p.y, cx: Math.floor(p.x / 48), cy: Math.floor(p.y / 48) });
  for (const p of D.propsIn(x0 - 2, y0, x0 + w + 1, y0 + h + 2)) props.push({ ...placed(p.kind, at(p.x, p.y)), tx: p.x, ty: p.y, fam: p.fam, cluster: p.cluster });
  for (const d of D.decalsIn(x0, y0, x0 + w - 1, y0 + h - 1)) decals.push({ ...placed(d.kind, d.mx === undefined ? at(d.x, d.y, d.dx, d.dy) : { x: (d.x - x0) * 48 + d.mx, y: (d.y - y0) * 48 + d.my }), tx: d.x, ty: d.y });   // a fleck sits by its own pixel offset
  const SS = RULES.reeds.stretch, reedbanks = D.reedsIn(x0, y0, x0 + w, y0 + h).map(r => ({ x: SS * r.bx - x0, y: SS * r.by - y0, w: 3, h: 3 }));
  // the reed beds: props with no footprint (they sort with the walkers and block nothing), at the reed's foot, 3 master pixels to a native one
  const reedProps = D.reedClumpsIn(x0, y0, x0 + w - 1, y0 + h - 1).map(c => { const x = (c.px - x0 * 16) * 3, y = (c.py - y0 * 16) * 3; return { ...placed(c.kind, { x, y }), tx: c.tx, ty: c.ty, fam: 'reeds', cluster: -3 }; });
  const byPos = (a, b) => a.sortY - b.sortY || a.x - b.x || (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0);
  return { props: props.sort(byPos), decals: decals.sort(byPos), reedbanks, reedProps };
}

// the bake's IR for the tiles x0 .. x0 + w, y0 .. y0 + h of the world (window: whole cells, no apron needed on the picture's own border, which then clamps like any place's)
function irOf(seed, id, x0, y0, w, h, terrain, wayups, cell = null, top = null, v, land = null, falls = [], banks = null) {   // v: the realm's kind version, for what the cell's creatures are
  const d = decorIR(seed, x0, y0, w, h);
  // what the cell holds (G4a, hold.mjs): only for a whole cell with its apron; a window of cells (the goldens' picture) holds nothing
  const hold = cell ? holdOf({ seed, v, X: cell[0], Y: cell[1], x0, y0, w, h, terrain, props: d.props, reedbanks: d.reedbanks, wayups, D: decorOf(seed), terrainOf: (X2, Y2) => cellTerrain(seed, X2, Y2), landmarks: landmarksOf(seed, decorOf(seed), [[Math.floor(cell[0] / MW), Math.floor(cell[1] / MH)]]), bareOf: (X, Y) => bareTiles(seed, X, Y) }) : null;
  // what the place's set pieces add: their wall props (the land's boulders or stumps, the Split Stone), as props at their tiles
  const placed2 = (kind, p) => ({ kind, x: p.x, y: p.y, sortY: p.y, cx: Math.floor(p.x / 48), cy: Math.floor(p.y / 48) });
  const setProps = hold ? hold.setProps.map(p => ({ ...placed2(p.kind, { x: (p.x) * 48 + 24, y: (p.y) * 48 + 47 }), tx: x0 + p.x, ty: y0 + p.y, fam: p.fam, cluster: -5 })) : [];
  const props = d.props.concat(d.reedProps, setProps).sort((a, b) => a.sortY - b.sortY || a.x - b.x || (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0));   // the reeds are not read by the hold: only the land's props are
  // the heart's ground patch (places.mjs content.patches): a ground kind of its own on the stamp's footprint, on the grass-like low ground only (never a way, sand, water, thicket or raised land); the terrain array is the
  // cell's cached one, so the patch is made on a copy, and tone stays off the patch and the tile round it (tone lies only on plain grass)
  let tone = toneField(seed, x0, y0, w, h);
  if (hold && hold.patches && hold.patches.length) {
    terrain = terrain.slice(); tone = tone.slice(); if (top) top = top.slice();
    for (const { kind, tiles } of hold.patches) {
      // a patch on a raised top is the top's own ground kind (`bed-ground-top`: drawn as the raised grass until its sheet is signed), set in the top layer under the raised tile
      for (const [x, y] of tiles) { const i = y * w + x; if (/-top$/.test(kind)) { if (top && terrain[i] === TV.CLIFF && (!top[i] || FAMILY.has(top[i]))) top[i] = VALUE_OF[kind]; } else if (FAMILY.has(terrain[i])) terrain[i] = VALUE_OF[kind]; }
      for (const [x, y] of tiles) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (x + dx >= 0 && y + dy >= 0 && x + dx < w && y + dy < h) tone[(y + dy) * w + x + dx] = 0;
    }
  }
  // `top`: the ground under each raised tile, only when some raised tile holds a ground other than grass (all grass draws as a place with none)
  return { origin: { x: x0, y: y0 }, seed, id, w, h, type: 'meadow', names: hold ? hold.names : [], tileset: 'ninja-test', mirror: false, mood: '', terrain, ...(top && top.some(v => v) ? { top } : {}), ...(land ? { land } : {}), props, decals: d.decals, canopy: [], hearts: [], clues: [],
    finds: hold ? hold.finds : [], landmarks: hold ? hold.landmarks : [], openings: hold ? hold.openings : [], spawns: hold ? hold.spawns : [], wayups, reedbanks: d.reedbanks, tone,
    inner: hold ? hold.inner : null, ground: hold ? hold.ground || null : null, signs: hold ? hold.signs : [], traces: hold ? hold.traces : [], strikes: hold ? hold.strikes : [],
    pieces: hold ? hold.pieces : [], shelter: hold ? hold.shelter : [], stamps: hold ? hold.stamps : [], soft: hold ? hold.soft : null, falls, ...(banks && banks.length ? { banks } : {}) };   // falls: the empty slot `falls`, 2 face columns each ({ x, y, w: 2, h: 1 } world tiles of the lip row)
}
// the bare tiles (sand, scree, leaf litter, path, raised land) of a cell's own tiles: where strike marks lie (hostsStrike picks the cell with the most within one of a start)
function bareTiles(seed, X, Y) {
  const c = cellTerrain(seed, X, Y); let n = 0;
  for (let y = 1; y <= CH; y++) for (let x = 1; x <= CW; x++) { const t = c.terrain[y * c.w + x]; if (t === TV.SAND || t === TV.SCREE || t === TV.LITTER || t === TV.PATH || t === TV.CLIFF) n++; }
  return n;
}
// One cell for the bake: terrain with its one-tile apron.
export function cellIR(seed, X, Y, v) {
  const c = cellTerrain(seed, X, Y);
  return irOf(seed, `g7-${X}-${Y}`, c.x0, c.y0, c.w, c.h, c.terrain, c.wayups.map(a => ({ x: a.x - c.x0, y: a.y - c.y0, w: a.w, h: a.h })), [X, Y], c.top, v, c.land, c.falls.map(f => ({ x: f.x - c.x0, y: f.y - c.y0, w: f.w, h: f.h })), c.banks.map(a => ({ x: a.x - c.x0, y: a.y - c.y0, w: a.w, h: a.h })));
}
// A block of nx x ny cells as one picture (for the goldens): each cell's own tiles, side by side, with no apron. Equal to baking each cell with its apron.
export function windowIR(seed, X0, Y0, nx, ny) {
  const w = nx * CW, h = ny * CH, terrain = new Uint8Array(w * h), top = new Uint8Array(w * h), x0 = X0 * CW, y0 = Y0 * CH, seen = new Set(), wayups = [];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const c = cellTerrain(seed, X0 + i, Y0 + j);
    for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) { terrain[(j * CH + y) * w + i * CW + x] = c.terrain[(y + 1) * c.w + x + 1]; top[(j * CH + y) * w + i * CW + x] = c.top[(y + 1) * c.w + x + 1]; }
    for (const a of c.wayups) { const k = a.x + ',' + a.y; if (!seen.has(k)) { seen.add(k); wayups.push({ x: a.x - x0, y: a.y - y0, w: a.w, h: a.h }); } }
  }
  // the cliff rules' land: the world's tiles round the window (through the neighbouring cells' own passes)
  const T = worldTiles(seed), lw = w + 2 * LAND_M, lh = h + 2 * LAND_M, raised = new Uint8Array(lw * lh);
  for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) raised[y * lw + x] = T(x0 - LAND_M + x, y0 - LAND_M + y) === TV.CLIFF ? 1 : 0;
  return irOf(seed, `g7-window-${X0}-${Y0}`, x0, y0, w, h, terrain, wayups.filter(a => a.x - 1 >= 0 && a.x + a.w + 1 <= w && a.y >= 0 && a.y + 2 <= h), null, top, undefined, { m: LAND_M, w: lw, h: lh, raised });
}
// ---- the sector of a place (world-topdown-spec-1 2.4): what the reach view paints, made from the realm alone, before any place is built ----
// The place is 4 x 4 blocks of 6 x 7 tiles. A block holds a ground class (0 grass, 1 wood floor, 2 thicket or scrub, 3 rock, 4 sand, 5 water; +8 when the water is the deep sea) that is the majority of
// the place's own ground before its passes (the same fields and the biome's recipe as windowOf, read from chunk()), and a level bit: the sign of the height field at the block's centre tile against the
// realm's edited raising height e0 (a water block is low). `lines` are the realm's trail and streams at map scale (world tile coordinates, through the shared ports and each place's bend point), `marks`
// the bridges and fords, `dest` the realm's destinations in the place, `ramps` the stairs that start in it. `cellTerrain` is never called: no place is built.
// Result: { cls: Uint8Array(16), lv: Uint8Array(16), lines: [{ k: 'trail' | 'stream', pts: [x, y, x, y, ...] }], marks: [{ k: 'bridge' | 'ford', x, y, ax }], dest: [{ kind }], ramps: [{ dir: 's' | 'e', x, y, hiA }] }
const SEC_BX = 6, SEC_BY = 7, SEC_NX = CW / SEC_BX, SEC_NY = CH / SEC_BY;
const SEC_CLS = []; SEC_CLS[TV.WATER] = 5; SEC_CLS[TV.DEEP] = 5; SEC_CLS[TV.SAND] = 4; SEC_CLS[TV.THICKET] = 2; SEC_CLS[TV.SCRUB] = 2; SEC_CLS[TV.LITTER] = 1; SEC_CLS[TV.SCREE] = 3;
// the numbers, from the confusion matrix of the sector against the built place (450 places, seeds 1-15): per class the least tiles of a block's 42 that claim it (wood 19, thicket 36, rock 20, water 6 of its
// core); thicket also needs 24 tiles of true thicket (not scrub); water is claimed whole at 27 tiles; the trail lane is 5 tiles from the line
let SEC_MIN = [0, 19, 36, 20, 0, 6], SEC_LANE = 5, SEC_WT = 27, SEC_TH = 24, SEC_STEP = 2;
export const setSecForTune = (min, lane, wt, th, step) => { SEC_MIN = min; SEC_LANE = lane; SEC_WT = wt; SEC_TH = th; SEC_STEP = step; for (const S of CTX.values()) S.secC.clear(); };   // for tools/tune only; the numbers above are the game's
// Only every SEC_STEP-th tile in each direction is read (the tiles 1, 3, 5, ... of the cell): the sector is a picture of 6 x 7 blocks, so a sparse sample of the ground says as much, at a fraction of the noise.
// The counts are scaled back to the block's 42 tiles, so the numbers above mean the same at any step.
function secCount(S, X, Y) {   // per block, the count of its tiles' pre-pass ground by class (6 a block) and of deep-sea tiles
  const key = (X + 8) * 1000 + (Y + 8), got = S.secC.get(key); if (got) return got;
  const nb = SEC_NX * SEC_NY, raw = new Uint8Array(nb * 6), deepR = new Uint8Array(nb), thickR = new Uint8Array(nb), coreR = new Uint8Array(nb), nS = new Uint8Array(nb), land = S.landC[cellIdx(X, Y)];
  const o = SEC_STEP === 1 ? 0 : 1, LX = ((CW - o + SEC_STEP - 1) / SEC_STEP) | 0, LY = ((CH - o + SEC_STEP - 1) / SEC_STEP) | 0, wet = new Uint8Array(LX * LY), slotAt = (a, b) => S.re.slotBiome[clamp(b, 0, ATLAS - 1) * ATLAS + clamp(a, 0, ATLAS - 1)];
  for (let j = 0; j < LY; j++) for (let i = 0; i < LX; i++) {
    const tx = o + i * SEC_STEP, ty = o + j * SEC_STEP, gx = X * CW + tx, gy = Y * CH + ty, b = ((ty / SEC_BY) | 0) * SEC_NX + ((tx / SEC_BX) | 0), d = inlandOf(gx, gy);
    let t = TV.GRASS;
    if (d < COAST_REACH) { const [deepEnd, wl, sandEnd] = coastEdges(S, gx, gy); t = d < deepEnd ? TV.DEEP : d < wl ? TV.WATER : d < sandEnd ? TV.SAND : TV.GRASS; }
    else {
      const f = S.at((gx + 0.5) / CW - 0.5, (gy + 0.5) / CH - 0.5); tileField(S, land, X, Y, tx, ty, f.wildness, f.rockiness);
      const forest = TF[0], rock = TF[1], wetF = TF[2], scrub = TF[3], push = TF[4], r = recipeAt(slotAt, ATLAS, MW * CW, MH * CH, gx, gy);
      if (rock + r.rockAdd > SAND_AT) t = TV.SCREE;
      else if (r.litterAt < LITTER_NONE && forest + 0.35 * S.nE(gx, gy) + push > r.litterAt) t = TV.LITTER;
      else if (r.dry > 0 || r.turf > 0) { const u = 0.5 + 0.5 * S.nD(gx, gy); if (u < r.dry) t = TV.DRY; else if (1 - u < r.turf) t = TV.TURF; }
      if (forest > r.scrubAt && forest <= r.thicketAt && scrub > r.scrubNoise && t !== TV.DRY && t !== TV.TURF) t = TV.SCRUB;
      if (forest > r.thicketAt) t = TV.THICKET;
      if (wetF > r.waterAt || (r.chan > 0.005 && Math.abs(S.nC(gx, gy)) < r.chan && S.nM(gx, gy) > r.mask)) t = TV.WATER;
    }
    nS[b]++; raw[b * 6 + (SEC_CLS[t] || 0)]++; if (t === TV.DEEP) deepR[b]++; if (t === TV.THICKET) thickR[b]++; wet[j * LX + i] = SEC_CLS[t] === 5 ? 1 : 0;
  }
  // the water that stays: the passes shave a body's rim, so only a sample whose four neighbours are water too (the place's edge counts as water) is counted
  for (let j = 0; j < LY; j++) for (let i = 0; i < LX; i++) {
    const k = j * LX + i; if (!wet[k]) continue;
    if ((i === 0 || wet[k - 1]) && (i === LX - 1 || wet[k + 1]) && (j === 0 || wet[k - LX]) && (j === LY - 1 || wet[k + LX])) coreR[(((o + j * SEC_STEP) / SEC_BY) | 0) * SEC_NX + (((o + i * SEC_STEP) / SEC_BX) | 0)]++;
  }
  const sc = (a, bi) => Math.min(SEC_BX * SEC_BY, Math.round(a * SEC_BX * SEC_BY / nS[bi])), cnt = new Uint8Array(nb * 6), deep = new Uint8Array(nb), thick = new Uint8Array(nb), core = new Uint8Array(nb);
  for (let b = 0; b < nb; b++) { for (let i = 0; i < 6; i++) cnt[b * 6 + i] = sc(raw[b * 6 + i], b); deep[b] = sc(deepR[b], b); thick[b] = sc(thickR[b], b); core[b] = sc(coreR[b], b); }
  if (S.secC.size > 4000) S.secC.clear();
  const r = { cnt, deep, thick, core }; S.secC.set(key, r); return r;
}
// the class of every block: the majority of its tiles' pre-pass ground, claimed only when that class holds at least SEC_MIN[class] of the block's 42 tiles (the place's passes clear thinner
// wood, thicket and rock to grass); a block under its class's number shows grass
// The trail's lane (windowOf's paint: the path and 3 tiles of grass each side) clears sand, scrub, wood and rock to grass, so the tiles of a block that lie within SEC_LANE of a trail line
// count as grass; water is never cleared.
function secGround(S, X, Y, lines, lv) {
  const { cnt, deep, thick, core } = secCount(S, X, Y), cls = new Uint8Array(SEC_NX * SEC_NY), trails = lines.filter(l => l.k === 'trail'), eff = new Float32Array(6);
  for (let b = 0; b < cls.length; b++) {
    let cl = 0;
    if (trails.length) for (let ty = 0; ty < SEC_BY; ty++) for (let tx = 0; tx < SEC_BX; tx++) {
      const px = X * CW + (b % SEC_NX) * SEC_BX + tx + 0.5, py = Y * CH + ((b / SEC_NX) | 0) * SEC_BY + ty + 0.5;
      if (trails.some(l => segDist(px, py, l.pts) <= SEC_LANE)) cl++;
    }
    const keep = 1 - cl / (SEC_BX * SEC_BY); let rest = SEC_BX * SEC_BY;
    for (let i = 1; i < 6; i++) { eff[i] = (cnt[b * 6 + i] - (i === 2 && lv[b] ? thick[b] : 0)) * (i === 5 ? 1 : keep); rest -= eff[i]; }   // raised land holds no thicket on its top (topsOf)
    eff[5] = cnt[b * 6 + 5] >= SEC_WT ? SEC_BX * SEC_BY : core[b];   // water counts by its core (the passes shave a body's rim), or all of it when the block is nearly all water
    eff[0] = rest;
    let m = 0; for (let i = 1; i < 6; i++) if (eff[i] > eff[m]) m = i;
    if (m && eff[m] < SEC_MIN[m]) m = 0;
    if (m === 2 && thick[b] * keep < SEC_TH) m = 0;
    cls[b] = m | (m === 5 && deep[b] * 2 >= cnt[b * 6 + 5] ? 8 : 0);
  }
  return cls;
}
const segDist = (px, py, [x0, y0, x1, y1]) => { const dx = x1 - x0, dy = y1 - y0, u = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(px - x0 - u * dx, py - y0 - u * dy); };
const secPt = (seed, kind, cx, cy, ox, oy) => { const h = hash(seed, 'gen7', kind, cx, cy); return [cx * CW + 12 + (h % 9) - 4 + ox, cy * CH + 14 + ((h >>> 8) % 9) - 4 + oy]; };
// the point where the line between two neighbouring world cells crosses their edge (the realm's port: the tile row or column both places agree on)
function secPort(S, p, q) {
  if (p[1] === q[1]) { const left = Math.min(p[0], q[0]); return [(left + 1) * CW, p[1] * CH + portAt(S.seed, left, p[1], false) + 0.5]; }
  const top = Math.min(p[1], q[1]); return [p[0] * CW + portAt(S.seed, p[0], top, true) + 0.5, (top + 1) * CH];
}
// per seed: the streams' pieces by cell, each [port in, bend, port out] (a stream that comes out of raised land starts at its port in the face, not on the land above)
function secStreams(S) {
  if (S.secStreams) return S.secStreams;
  const by = new Map(), xy = c => [c % RW, (c / RW) | 0], put = (c, pts) => { const k = c; if (!by.has(k)) by.set(k, []); by.get(k).push(pts); };
  for (const f of S.re.features || []) {
    if (f.kind !== 'stream') continue;
    const seen = f.links.seen || 0, m = f.links.mouth, chain = f.cells.slice(Math.max(0, seen - 1)).concat(m && m.c >= 0 && m.c !== f.cells[f.cells.length - 1] ? [m.c] : []), first = seen > 0 ? 1 : 0;
    for (let i = first; i < chain.length; i++) {
      const c = chain[i], cur = xy(c), pts = [];
      if (i > 0) pts.push(...secPort(S, xy(chain[i - 1]), cur));
      pts.push(...secPt(S.seed, 'sbend', cur[0], cur[1], 0, 0));
      if (i + 1 < chain.length) pts.push(...secPort(S, cur, xy(chain[i + 1])));
      put(c, pts);
    }
  }
  return (S.secStreams = by);
}
function secMarks(S) {   // per seed: bridges, river fords and trail-over-stream fords by cell
  if (S.secMarks) return S.secMarks;
  const by = new Map(), put = (c, m) => { if (!by.has(c)) by.set(c, []); by.get(c).push(m); }, re = S.re;
  for (const f of re.features || []) if (f.kind === 'bridge') for (const c of f.cells) put(c, { k: 'bridge', ax: f.links.axis === 'x' ? 0 : 1 });
  for (let c = 0; c < re.ford.length; c++) if (re.ford[c] && re.land[c] === 4) put(c, { k: 'ford', ax: 0 });
  const on = re.roads && re.roads.on; if (on) for (const c of secStreams(S).keys()) if (on[c] && !(by.get(c) || []).length) put(c, { k: 'ford', ax: 0 });
  return (S.secMarks = by);
}
export function sectorOf(seed, X, Y) {
  const S = ctxOf(seed), re = S.re, lv = new Uint8Array(SEC_NX * SEC_NY), e0 = re.e0, c0 = Y * RW + X;
  const lines = [], marks = [], dest = [], ramps = [];
  // the trail: each neighbour the realm's trails join this place to is a port; two ports meet at a bend point 3-6 tiles off their straight line, one or three or more at the place's hub
  const tr = trailsOf(S), hits = tr.by.get(X * 1000 + Y);
  if (hits) {
    const nbs = new Map(); for (const { t, k } of hits) for (const o of [t.cells[k - 1], t.cells[k + 1]]) if (o) nbs.set(o[0] * 1000 + o[1], o);
    const anchors = [...nbs.values()].sort((p, q) => p[0] * 1000 + p[1] - q[0] * 1000 - q[1]).map(o => secPort(S, [X, Y], o));
    if (anchors.length) {
      let j;
      if (anchors.length === 2) {
        const [a, b] = anchors, mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, horiz = Math.abs(a[0] - b[0]) >= Math.abs(a[1] - b[1]), h2 = hash(seed, 'gen7', 'bend', X, Y), sd = h2 & 1 ? 1 : -1, d = 3 + ((h2 >>> 4) % 4);
        j = [clamp(mx + (horiz ? 0 : sd * d), X * CW + 3, X * CW + CW - 4), clamp(my + (horiz ? sd * d : 0), Y * CH + 3, Y * CH + CH - 4)];
      } else { const hh = hash(seed, 'gen7', 'hub', X, Y); j = [X * CW + 12 + (hh % 7) - 3, Y * CH + 14 + ((hh >>> 4) % 7) - 3]; }
      for (const a of anchors) lines.push({ k: 'trail', pts: [a[0], a[1], j[0], j[1]] });
    }
  }
  for (let by = 0; by < SEC_NY; by++) for (let bx = 0; bx < SEC_NX; bx++) {   // the level bit: the height at the block's centre tile against the edited raising height
    const tx = bx * SEC_BX + 3, ty = by * SEC_BY + 3, gx = X * CW + tx, gy = Y * CH + ty;
    const u = (gx + 0.5) / CW - 0.5, v = (gy + 0.5) / CH - 0.5, X0 = Math.floor(u), Y0 = Math.floor(v), a = u - X0, b = v - Y0;
    const e = e0[cellIdx(X0, Y0)] * (1 - a) * (1 - b) + e0[cellIdx(X0 + 1, Y0)] * a * (1 - b) + e0[cellIdx(X0, Y0 + 1)] * (1 - a) * b + e0[cellIdx(X0 + 1, Y0 + 1)] * a * b;
    const inl = inlandOf(gx, gy), coast = inl >= 22 ? 0 : -Math.floor((22 - Math.max(inl, 12)) * 23000 / 10);
    lv[by * SEC_NX + bx] = Math.round((Math.fround(S.at((gx + 0.5) / CW - 0.5, (gy + 0.5) / CH - 0.5).height) - e) * 65536) + coast >= 0 ? 1 : 0;   // the height as the place's own field holds it (single precision)
  }
  const cls = secGround(S, X, Y, lines, lv);
  for (let b = 0; b < cls.length; b++) if ((cls[b] & 7) === 5) lv[b] = 0;   // water is low
  for (const pts of secStreams(S).get(c0) || []) lines.push({ k: 'stream', pts });
  for (const m of secMarks(S).get(c0) || []) marks.push({ k: m.k, x: X * CW + 12, y: Y * CH + 14, ax: m.ax });
  for (const d of re.destinations || []) if (d.c === c0) dest.push({ kind: d.kind });
  for (const st of re.stairs || []) if (st.X === X && st.Y === Y) ramps.push({ dir: 's', x: X * CW + st.port + 0.5, y: (Y + 1) * CH, hiA: S.lvC[c0] > S.lvC[cellIdx(X, Y + 1)] });   // the stair's port (the place seats the way up beside it)
  return { cls, lv, lines, marks, dest, ramps };
}
// ---- the overview of a region: one byte a world tile, the one land every map view is shrunk from ----
// The region's 16 x 20 cells as (16 * 24) x (20 * 28) tiles, row by row: the low three bits are the ground class (OV below), bit 3 says the tile is raised land. It reads the settled world tiles
// (worldTiles / worldGround), the very land the walk draws, so a map pixel is the class of the tile under it and no map view needs the cell labels for land.
export const OV = { GRASS: 0, SAND: 1, WATER: 2, DEEP: 3, WOOD: 4, THICKET: 5, ROCK: 6, PATH: 7, RAISED: 8 };
const OV_OF = []; OV_OF[TV.SAND] = OV.SAND; OV_OF[TV.WATER] = OV.WATER; OV_OF[TV.DEEP] = OV.DEEP; OV_OF[TV.LITTER] = OV.WOOD; OV_OF[TV.THICKET] = OV.THICKET; OV_OF[TV.SCREE] = OV.ROCK; OV_OF[TV.PATH] = OV.PATH;   // a path on a raised top is not a class of the overview (the map shows the top as grass)
export const OVW = MW * CW, OVH = MH * CH;
const OVERVIEWS = new Map();
export function overviewOf(seed, ax, ay) {
  const key = seed + ':' + ax + ',' + ay, hit = OVERVIEWS.get(key); if (hit) return hit;
  const T = worldTiles(seed), Gd = worldGround(seed), out = new Uint8Array(OVW * OVH), x0 = ax * OVW, y0 = ay * OVH;
  for (let y = 0; y < OVH; y++) for (let x = 0; x < OVW; x++) {
    const gx = x0 + x, gy = y0 + y, raisedTile = T(gx, gy) === TV.CLIFF;
    out[y * OVW + x] = (OV_OF[Gd(gx, gy)] || OV.GRASS) | (raisedTile ? OV.RAISED : 0);
  }
  if (OVERVIEWS.size > 6) OVERVIEWS.clear();
  OVERVIEWS.set(key, out); return out;
}
// an overview made elsewhere (the realm worker, or the page's store) is put in the cache
export const presetOverview = (seed, ax, ay, bytes) => { if (OVERVIEWS.size > 6) OVERVIEWS.clear(); OVERVIEWS.set(seed + ':' + ax + ',' + ay, bytes); };
export const hasOverview = (seed, ax, ay) => OVERVIEWS.has(seed + ':' + ax + ',' + ay);
export const windowGaps = (seed, X, Y) => windowOf(ctxOf(seed), X, Y);   // the settled window with its gap tiles (`gaps`), for the gap measure (tools/place-walk-gaps.mjs)
export { CW, CH, RW, RH };
export { minFeature as __minFeature };
