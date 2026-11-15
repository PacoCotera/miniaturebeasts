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
import { levelsOf, tileLevel, raised as raisedTile, findWayup, pocketWayups, tileFields, inlandOf, WTW, WTH, BORDER_X, BORDER_Y } from './levels.mjs';
import { createDecor } from './decor.mjs';
import { RULES } from './rules.mjs';
import SET from '../../../../art/places/sets/ninja-test/set.json' with { type: 'json' };
import TERRAINS from '../../../../art/places/terrain.json' with { type: 'json' };
import { recipeAt, SAND_AT } from './ground.mjs';
import { holdOf } from './hold.mjs';
import { touchesRaised } from '../../../places/src/bake/relief.mjs';
import { landmarksOf } from './landmarks.mjs';

export const TV = { DEEP: 1, WATER: 2, SAND: 3, MUD: 4, PATH: 5, GRASS: 6, EARTH: 7, CLIFF: 8, THICKET: 9, SCRUB: 10, LITTER: 11, DRY: 12, TURF: 13, SCREE: 14, PATHTOP: 15 };   // PATHTOP: the path on a raised top (a value of `top`, never of the terrain: the tile stays cliff; drawn as the path)
// the pairs the set draws (art/places/terrain.json values): a terrain meets another only as one of these (the set's `lowers`); every 2 x 2 block of logic tiles holds at most three terrains (terrain layers),
// and every two of them are such a pair
// The table is the set's own: art/places/sets/ninja-test/set.json `groundPairs` (ids, through art/places/terrain.json's values), the one source; tools/gen7-layers.mjs refuses a pair the layers' `lowers` cannot draw and the
// page's layers.json is made from the same file. (Sand-raised is not in the table: a raised region that meets both grass and sand is drawn two ways, which the bake refuses.)
const VALUE_OF = Object.fromEntries(TERRAINS.terrains.map(t => [t.id, t.value]));
const PAIRS = new Set(SET.groundPairs.map(([a, b]) => (VALUE_OF[a] < VALUE_OF[b] ? VALUE_OF[a] + '|' + VALUE_OF[b] : VALUE_OF[b] + '|' + VALUE_OF[a])));
// the low grounds the cliff's face meets with no grass between: the cliff's pairs in the table besides grass (the biome grounds). Terrain the cliff has no edge over (water, mud, scrub, thicket, sand)
// keeps one tile of grass between it and the rim, made on its side
const CLIFF_LOWERS = new Set(SET.groundPairs.filter(p => p.includes('cliff')).map(p => VALUE_OF[p[0] === 'cliff' ? p[1] : p[0]]).filter(v => v !== TV.GRASS));
// who gives way to grass when a 2 x 2 block breaks the table: the lesser first; raised land is never cut (round 4), the others yield to it
const KEEP = { 8: 10, 2: 9, 9: 7, 5: 6, 15: 6, 11: 5, 3: 4, 14: 4, 10: 3, 12: 2, 13: 2, 6: 0 };
export const pairOk = (a, b) => PAIRS.has(a < b ? a + '|' + b : b + '|' + a);
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
  S = { seed, R, re, at: fieldsAt(seed), forestC: new Float32Array(N), wetC: new Float32Array(N), rockC: new Float32Array(N), lvC: new Int8Array(N), landC: new Uint8Array(N), chunks: new Map(), cells: new Map(), stairs: null, trails: null };
  for (const G of R.regions) {
    const [ax, ay] = G.slot;
    for (let c = 0; c < NC; c++) {
      const w = (ay * MH + ((c / MW) | 0)) * RW + ax * MW + (c % MW), land = G.land[c], F = re.F[w], M = re.M[w], K = re.K[w];
      S.landC[w] = land; S.lvC[w] = G.level[c];
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
const cellIdx = (X, Y) => clamp(Y, 0, RH - 1) * RW + clamp(X, 0, RW - 1);

// the tile fields of one cell (24 x 28 values each), from the world's fields at tile scale
function chunk(S, X, Y) {
  const key = (X + 8) * 1000 + (Y + 8), hit = S.chunks.get(key); if (hit) return hit;
  const n = CW * CH, forest = new Float32Array(n), rock = new Float32Array(n), wet = new Float32Array(n), scrub = new Float32Array(n), push = new Float32Array(n), f = tileFields(S.seed, X, Y), land = S.landC[cellIdx(X, Y)];   // the fields of each tile, sampled once for the levels and for this
  const bil = (A, i00, i10, i01, i11, a, b) => A[i00] * (1 - a) * (1 - b) + A[i10] * a * (1 - b) + A[i01] * (1 - a) * b + A[i11] * a * b;
  for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CW; tx++) {
    const gx = X * CW + tx, gy = Y * CH + ty, k = ty * CW + tx;
    const u = (gx + 0.5) / CW - 0.5, v = (gy + 0.5) / CH - 0.5, X0 = Math.floor(u), Y0 = Math.floor(v), a = u - X0, b = v - Y0;
    const i00 = cellIdx(X0, Y0), i10 = cellIdx(X0 + 1, Y0), i01 = cellIdx(X0, Y0 + 1), i11 = cellIdx(X0 + 1, Y0 + 1);
    forest[k] = 0.55 * f.wild[k] + 0.45 * bil(S.forestC, i00, i10, i01, i11, a, b) + 0.12 * S.nF(gx, gy);
    rock[k] = 0.3 * f.rock[k] + 0.7 * bil(S.rockC, i00, i10, i01, i11, a, b) + 0.12 * S.nR(gx, gy);
    wet[k] = bil(S.wetC, i00, i10, i01, i11, a, b) + 0.22 * S.nW(gx, gy);
    scrub[k] = S.nS(gx, gy);
    // the map's land kind shows at the cell's middle whatever its neighbours are: a rock cell is stony and a wood cell has its floor there (a bump that falls to nothing before the cell's edge, so no seam)
    const bump = Math.max(0, 1 - Math.hypot((tx - (CW - 1) / 2) / 9, (ty - (CH - 1) / 2) / 10));
    if (land === L.ROCK) rock[k] += 0.5 * bump; else if (land === L.WOOD) push[k] = 0.5 * bump;
    if (inlandOf(gx, gy) < COAST_REACH) { rock[k] = 0; push[k] = 0; forest[k] = 0; wet[k] = 0; }   // the coast band is laid whole in windowOf: the fields give it plain ground
  }
  const out = { forest, rock, wet, scrub, push };
  if (S.chunks.size > 600) S.chunks.clear();
  S.chunks.set(key, out); return out;
}

// ---- the terrain levels: tile scale, from the elevation field (levels.mjs) ----
// a world tile's level (0 at the map's end: the closing band and a tile beyond it keep to the low ground)
export const levelAt = (seed, gx, gy) => tileLevel(levelsOf(ctxOf(seed).re), gx, gy);
export const raisedAt = (seed, gx, gy) => raisedTile(levelsOf(ctxOf(seed).re), gx, gy);

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
      const st = { A, B, south, upperIsA: lvA > lvB, port, wayup: null, kind: south ? (lvA > lvB ? 'south' : 'north') : 'east-west' };
      if (st.kind === 'south') st.wayup = findWayup(L, X, Y, port);
      out.push(st);
    }
  }
  return (S.stairs = out);
}
export const stairsInfo = seed => stairsOf(ctxOf(seed));

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
function minFeature(a, W, H, skip = () => false, never = () => false, passes = 8, toGrass = false) {
  const cnt = new Int16Array(16), at = (src, x, y) => src[clamp(y, 0, H - 1) * W + clamp(x, 0, W - 1)];
  for (let p = 0; p < passes; p++) {
    const src = a.slice(); let changed = 0;
    for (const gp of toGrass ? [false, true] : [false]) {   // stray tiles of other terrains first, bits of grass only when none is left (so a strip of grass is never widened into what is about to go)
    if (gp && changed) break;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const v = src[y * W + x]; if (skip(v)) continue;
      if (toGrass && (v === TV.GRASS) !== gp) continue;
      let ok = false;
      for (let oy = -1; oy <= 0 && !ok; oy++) for (let ox = -1; ox <= 0 && !ok; ox++) if (at(src, x + ox, y + oy) === v && at(src, x + ox + 1, y + oy) === v && at(src, x + ox, y + oy + 1) === v && at(src, x + ox + 1, y + oy + 1) === v) ok = true;
      if (ok) continue;
      if (toGrass && v === TV.GRASS) {   // a bit of grass with no 2 x 2 block: it joins the terrain round it when that is legal and gives it a 2 x 2 block; else it gets a 2 x 2 block of grass of its own
        let held = false;   // a tile an earlier one of this pass has just given a 2 x 2 block (src is the pass's start) stays grass: reading src alone made the two undo each other every pass, and an even count of passes left both lone
        for (let oy = -1; oy <= 0 && !held; oy++) for (let ox = -1; ox <= 0 && !held; ox++) if (at(a, x + ox, y + oy) === v && at(a, x + ox + 1, y + oy) === v && at(a, x + ox, y + oy + 1) === v && at(a, x + ox + 1, y + oy + 1) === v) held = true;
        if (held) continue;
        cnt.fill(0); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const u = at(a, x + dx, y + dy); if (u !== v && !never(u)) cnt[u]++; }
        let best = -1, bc = 0; for (let u = 1; u < 16; u++) if (cnt[u] > bc) { best = u; bc = cnt[u]; }
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
          let bad = 0, foreign = 0; for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const u = a[(ys + dy) * W + xs + dx]; if (u !== TV.GRASS) { foreign++; if (never(u) || u === TV.PATH) bad++; } }   // a trail's path is never given up to a grass bit's 2 x 2 block (it cut trails at the places' edges)
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
function openGates(S, t, W, H, gx0, gy0, X, Y) {
  const at = (gx, gy, a = t) => { const x = gx - gx0, y = gy - gy0; return x < 0 || y < 0 || x >= W || y >= H ? -1 : a[y * W + x]; };
  const walkAt = (gx, gy, a = t) => { const v = at(gx, gy, a); return v === TV.GRASS || v === TV.SAND || v === TV.PATH || v >= TV.LITTER || v === TV.SCRUB || (v === TV.CLIFF && at(gx - 1, gy, a) === TV.CLIFF && at(gx + 1, gy, a) === TV.CLIFF && at(gx, gy - 1, a) === TV.CLIFF && at(gx, gy + 1, a) === TV.CLIFF); };
  const gate = new Uint8Array(W * H);
  const put = (gx, gy, ground = TV.GRASS) => { const x = gx - gx0, y = gy - gy0; if (x < 0 || y < 0 || x >= W || y >= H) return false; const v = t[y * W + x]; if (v === TV.CLIFF || v === TV.DEEP || inlandOf(gx, gy) < COAST_REACH) return false; t[y * W + x] = ground; gate[y * W + x] = 1; return true; };
  const fordCell = (cx, cy, nx, ny) => { const g = (X, Y) => { const R = cellRegion(X, Y); return !!(R && R.ford[(Y % MH) * MW + (X % MW)]); }; return g(cx, cy) || g(nx, ny); };   // one of the two cells is a ford
  const tr = trailsOf(S), trailEdge =(cx, cy, nx, ny) => (tr.by.get(cx * 1000 + cy) || []).some(({ t: T, k }) => [T.cells[k - 1], T.cells[k + 1]].some(o => o && o[0] === nx && o[1] === ny));   // the realm's trails cross this edge
  const cellRegion = (cx, cy) => (cx < 0 || cy < 0 || cx >= RW || cy >= RH ? null : S.R.regions[Math.floor(cy / MH) * ATLAS + Math.floor(cx / MW)]);
  for (let j = HY - 1; j <= HY + 1; j++) for (let i = HX - 1; i <= HX + 1; i++) {
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

function windowOf(S, X, Y) {
  const W = WIN_X * CW, H = WIN_Y * CH, gx0 = (X - HX) * CW, gy0 = (Y - HY) * CH, N = W * H, seed = S.seed;
  const t = new Uint8Array(N).fill(TV.GRASS), forest = new Float32Array(N), rock = new Float32Array(N), wet = new Float32Array(N), scrub = new Float32Array(N), push = new Float32Array(N);
  for (let j = 0; j < WIN_Y; j++) for (let i = 0; i < WIN_X; i++) {
    const c = chunk(S, X - HX + i, Y - HY + j);
    for (let ty = 0; ty < CH; ty++) { const o = (j * CH + ty) * W + i * CW, k = ty * CW; for (let tx = 0; tx < CW; tx++) { forest[o + tx] = c.forest[k + tx]; rock[o + tx] = c.rock[k + tx]; wet[o + tx] = c.wet[k + tx]; scrub[o + tx] = c.scrub[k + tx]; push[o + tx] = c.push[k + tx]; } }
  }
  // ground from the fields by the biome's recipe (ground.mjs, blended over the borders between biomes): sand, then the wood floor, then scrub, then thicket, then water (the thicket's rim breaks into scrub clumps)
  const slotAt = (a, b) => S.re.slotBiome[clamp(b, 0, ATLAS - 1) * ATLAS + clamp(a, 0, ATLAS - 1)], shoreOf = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const gx = gx0 + (i % W), gy = gy0 + ((i / W) | 0), r = recipeAt(slotAt, ATLAS, MW * CW, MH * CH, gx, gy);
    if (rock[i] + r.rockAdd > SAND_AT) t[i] = TV.SCREE;
    else if (r.litterAt < LITTER_NONE && forest[i] + 0.35 * S.nE(gx, gy) + push[i] > r.litterAt) t[i] = TV.LITTER;
    else if (r.dry > 0 || r.turf > 0) { const u = 0.5 + 0.5 * S.nD(gx, gy); if (u < r.dry) t[i] = TV.DRY; else if (1 - u < r.turf) t[i] = TV.TURF; }
    if (forest[i] > r.scrubAt && forest[i] <= r.thicketAt && scrub[i] > r.scrubNoise && t[i] !== TV.DRY && t[i] !== TV.TURF) t[i] = TV.SCRUB;   // a scrub patch is darker than dry grass and turf and would read as a hole on them: none lies on them (art director 2026-11-10)
    if (forest[i] > r.thicketAt) t[i] = TV.THICKET;
    if (wet[i] > r.waterAt || (r.chan > 0.005 && Math.abs(S.nC(gx, gy)) < r.chan && S.nM(gx, gy) > r.mask)) t[i] = TV.WATER;
    shoreOf[i] = r.shore;
  }
  dropPools(t, W, H);
  smoothBays(t, W, H, TV.WATER); smoothBays(t, W, H, TV.THICKET);   // the art director, b and c: no bay, strip or block under 3 tiles wide, so shores and thickets do not read as walls
  // a sand shore round every body of water in the Lakes and the Highpools, 1 to 3 tiles wide by noise (rule 4: one shore kind all round, so a beach is never partway along a shore)
  { const dist = new Int8Array(N).fill(99), q = [];
    for (let i = 0; i < N; i++) if (t[i] === TV.WATER) { dist[i] = 0; q.push(i); }
    for (let h = 0; h < q.length; h++) { const i = q[h], x = i % W, y = (i / W) | 0; if (dist[i] >= 3) continue;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X2 = x + dx, Y2 = y + dy; if (X2 < 0 || Y2 < 0 || X2 >= W || Y2 >= H) continue; const j = Y2 * W + X2; if (dist[j] > dist[i] + 1) { dist[j] = dist[i] + 1; q.push(j); } } }
    for (let i = 0; i < N; i++) { if (t[i] === TV.SCREE && dist[i] <= 2) { t[i] = TV.SAND; continue; }   // scree meets water only as sand: the rock field's own shore, as the sand it was before had
      if (!shoreOf[i] || dist[i] === 0 || dist[i] > 3) continue;
      const wide = Math.max(1, Math.min(3, Math.round(shoreOf[i] * (0.45 + 0.55 * (0.5 + 0.5 * S.nS(gx0 + (i % W), gy0 + ((i / W) | 0)))))));
      if (dist[i] <= wide && (t[i] === TV.GRASS || t[i] === TV.LITTER || t[i] === TV.DRY || t[i] === TV.TURF || t[i] === TV.SCREE)) t[i] = TV.SAND; } }
  majority(t, W, H, 2); minFeature(t, W, H);
  for (let i = 0; i < N; i++) {   // the coast band (see COAST_REACH): a function of the world tile alone, so a place and its neighbour lay the same shore; its edges are the smoothed lines of coastEdges
    const gx = gx0 + (i % W), gy = gy0 + ((i / W) | 0), d = inlandOf(gx, gy); if (d >= COAST_REACH) continue;
    const [deepEnd, wl, sandEnd] = coastEdges(S, gx, gy);
    t[i] = d < deepEnd ? TV.DEEP : d < wl ? TV.WATER : d < sandEnd ? TV.SAND : d < sandEnd + 4 ? TV.GRASS : t[i];
  }
  const recipe = t.slice();   // the biome's ground at every tile, low or not: what a raised tile's top takes (topsOf)
  // raised land from the levels: every tile on a level above the lowest; water lies only on the low ground
  const raised = new Uint8Array(N);
  const LVL = levelsOf(S.re);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (raisedTile(LVL, gx0 + x, gy0 + y)) { raised[y * W + x] = 1; t[y * W + x] = TV.CLIFF; }
  // the cliff's outline is the blocks' outline and nothing else bites into it: terrain the cliff has no pair with keeps one tile of grass between it and the rim, made on its side
  { const isRaised = (x, y) => x >= 0 && y >= 0 && x < W && y < H && raised[y * W + x] === 1;   // relief.mjs's touchesRaised: the 3 x 3 round a tile holds raised land
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (!raised[i] && t[i] !== TV.GRASS && !CLIFF_LOWERS.has(t[i]) && touchesRaised(isRaised, x, y)) t[i] = TV.GRASS; } }   // sand too: a sand-grass edge reaching the rim would be a three-terrain corner, and the legal pass would eat the sand along the whole rim
  const isCliff = v => v === TV.CLIFF;
  minFeature(t, W, H, isCliff, isCliff);
  // ways up (Rule 1.5): the stairs' faces were found on the block land; nothing is carved. Kept when they touch the window
  const wayups = [];
  for (const st of stairsOf(S)) {
    const wu = st.wayup; if (!wu) continue;
    if (wu.x - 1 < gx0 || wu.x + 3 > gx0 + W || wu.y - 3 < gy0 || wu.y + 3 > gy0 + H) continue;
    wayups.push({ x: wu.x, y: wu.y, w: wu.w, h: wu.h });
  }
  for (let j = 0; j < WIN_Y; j++) for (let i = 0; i < WIN_X; i++) for (const wu of pocketWayups(LVL, X - HX + i, Y - HY + j)) {   // the land rule's stairs for closed parts (levels.mjs)
    if (wu.x - 1 < gx0 || wu.x + 3 > gx0 + W || wu.y - 3 < gy0 || wu.y + 3 > gy0 + H || wayups.some(a => a.x === wu.x && a.y === wu.y)) continue;
    wayups.push({ x: wu.x, y: wu.y, w: wu.w, h: wu.h });
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
  const paint = (x, y, clear) => { if (curTop && x >= 0 && y >= 0 && x < W && y < H && topFree[y * W + x]) { laidTop(x, y); return; } const R0 = 1; /* a lane of grass 1 tile each side: path meets grass only; a wider lane wiped the ground in the middle of trail cells */ for (let dy = -R0; dy <= 1 + R0; dy++) for (let dx = -R0; dx <= 1 + R0; dx++) { const X2 = x + dx, Y2 = y + dy; if (X2 < 0 || Y2 < 0 || X2 >= W || Y2 >= H) continue; const k = Y2 * W + X2, v = t[k], brush = dx >= 0 && dx <= 1 && dy >= 0 && dy <= 1; if (brush && v === TV.WATER && fordAt(gx0 + X2, gy0 + Y2)) t[k] = TV.GRASS; else if (brush && v !== TV.WATER && (clear || v !== TV.THICKET) && v !== TV.CLIFF) t[k] = TV.PATH; else if (!brush && (v === TV.SAND || v === TV.SCRUB || v >= TV.LITTER || (clear && v === TV.THICKET))) t[k] = TV.GRASS; } };
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
    const routeTo = (a, b) => {
      const from = ly(a) * CW + lx(a), to = ly(b) * CW + lx(b);
      for (const tier of [-1, 0, 1, 2, 3]) {   // -1: open ground 2 tiles off cliff and water (a trail keeps 0 or 2+ tiles from them, never 1); 0: open ground; 1: may clear thicket; 2: a narrow neck (a shore pinch): only the 2 x 2 brush must be dry and clear of raised land; 3: the last resort, water crossed at a high cost (the brush is never laid on water)
        const clear = tier > 0, bl = tier === 3 ? bkC : tier === 2 ? bkB : clear ? bkT : tier === -1 ? bk2 : bk;
        const cost = (c, n) => { const w = wAt(n % CW, (n / CW) | 0); return bl[w] && n !== to ? null : 1 + 0.7 * (0.5 + 0.5 * S.nP(gx0 + w % W, gy0 + ((w / W) | 0))) + (ground[w] === TV.SAND ? 0.5 : 0) + 3 * rough[w] + (clear && bk[w] ? 4 : 0) + (tier === 3 && bkB[w] ? 12 : 0); };
        const r = route(CW, CH, from, to, cost);
        if (r) { for (const c of r) paint(ox + (c % CW), oy + ((c / CW) | 0), clear); return true; }
      }
      return false;
    };
    for (const wu of stems) paint(wu.x - gx0, wu.y + 1 - gy0, true);   // the stem from the way up's cut to its foot
    for (const a of anchors) { if (topAnch.has(a)) laidTop(a[0] - gx0, a[1] - gy0); else paint(ox + lx(a), oy + ly(a), true); }   // the way up's top is laid where it is; the port's own 2 x 2 of path is always laid, so a neighbour that cannot route past a pinch still meets the trail at the shared tile
    if (junction) for (const a of anchors) routeTo(a, junction);
    else if (!routeTo(anchors[0], anchors[1])) { const j = nearOpen(hub); for (const a of anchors) routeTo(a, j); }
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
  // the set's pairs are all opaque (Rule 1.2-1.3): every 2 x 2 block holds at most two terrains and they must be a pair; the lesser gives way to grass. The 2 x 2 rule alternates
  // with the legal pass (Rule 1.9), and no one-row gully stays under a raised edge. The gates (openGates) are cut once the land has settled, and it settles again round them.
  const wuTile = new Set(); for (const a of wayups) for (let y = a.y; y < a.y + a.h; y++) for (let x = a.x; x < a.x + a.w; x++) { const wx = x - gx0, wy = y - gy0; if (wx >= 0 && wy >= 0 && wx < W && wy < H) wuTile.add(wy * W + wx); }
  const settle = gate => { for (let round = 0; round < 60; round++) {
    let changed = 0;
    { const before = t.slice(); minFeature(t, W, H, isCliff, isCliff, 4, true); for (let k = 0; k < N; k++) if (t[k] !== before[k]) changed++; }
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
        const drop = vals.filter(v => v !== TV.GRASS).sort((p, q) => KEEP[p] - KEEP[q])[0];
        for (const k of idx) if (t[k] === drop) { t[k] = TV.GRASS; n++; }
      }
      changed += n;
    }
    for (let y = 0; y + 2 < H; y++) for (let x = 0; x < W; x++) if (t[y * W + x] === TV.CLIFF && t[(y + 1) * W + x] !== TV.CLIFF && t[(y + 2) * W + x] === TV.CLIFF) { t[(y + 1) * W + x] = TV.CLIFF; changed++; }
    if (!changed) changed += fillPockets(t, W, H, gx0, gy0, islands(S), gate);
    if (!changed) break;
  } };
  // a trail keeps 0 or 2+ tiles from a cliff, a lip or water, never 1 (the one-tile strip of grass is no 2 x 2 block): where it could not (a narrow place), the path fades out: the path beside a lone grass tile
  // is given up to grass, and the path left in no 2 x 2 block of its own with it, until none is left to give up; the walk stays (grass walks)
  const atEdge = j => { const gx = gx0 + (j % W), gy = gy0 + ((j / W) | 0), mx = gx % CW, my = gy % CH; return (mx === CW - 1 && t[j + 1] === TV.PATH) || (mx === 0 && t[j - 1] === TV.PATH) || (my === CH - 1 && t[j + W] === TV.PATH) || (my === 0 && t[j - W] === TV.PATH); };   // the path tiles either side of a place edge that the trail crosses by: they stay (the pinch rule: it fades inside the place, never at the edge)
  const fade = gate => { for (let round = 0; round < (globalThis.F4NOFADE ? 0 : 8); round++) {
    const lone = []; for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) { if (t[y * W + x] !== TV.GRASS) continue;
      let ok = false; for (let oy = -1; oy <= 0 && !ok; oy++) for (let ox = -1; ox <= 0 && !ok; ox++) { const a = x + ox, b = y + oy; if (t[b * W + a] === TV.GRASS && t[b * W + a + 1] === TV.GRASS && t[(b + 1) * W + a] === TV.GRASS && t[(b + 1) * W + a + 1] === TV.GRASS) ok = true; }
      if (!ok) lone.push(y * W + x); }
    let n = 0; for (const k of lone) if ((t[k - 1] === TV.PATH && t[k + 1] === TV.PATH) || (t[k - W] === TV.PATH && t[k + W] === TV.PATH)) { t[k] = TV.PATH; n++; }   // a one-tile strip between two paths (a gate beside its trail) joins them
    for (const k of lone) if (t[k] === TV.GRASS) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const j = k + dy * W + dx; if (t[j] === TV.PATH && !(gate && gate[j]) && !atEdge(j)) { t[j] = TV.GRASS; n++; } }
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { if (t[y * W + x] !== TV.PATH) continue; let ok = false;
      for (let oy = -1; oy <= 0 && !ok; oy++) for (let ox = -1; ox <= 0 && !ok; ox++) { const a = x + ox, b = y + oy; if (t[b * W + a] === TV.PATH && t[b * W + a + 1] === TV.PATH && t[(b + 1) * W + a] === TV.PATH && t[(b + 1) * W + a + 1] === TV.PATH) ok = true; }
      if (!ok && !atEdge(y * W + x)) { t[y * W + x] = TV.GRASS; n++; } }
    if (!n) break; settle(gate); } };
  settle(null); fade(null);
  const gate = openGates(S, t, W, H, gx0, gy0, X, Y);
  if (gate.some(v => v)) { settle(gate); fade(gate); }
  return { t, W, H, gx0, gy0, wayups, top: topsOf(t, recipe, W, H, pathTop) };
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
  const wayups = win.wayups.filter(a => a.x + 3 > x0 && a.x - 1 < x0 + w && a.y + 2 > y0 && a.y < y0 + h).map(a => ({ x: a.x, y: a.y, w: a.w, h: a.h }));   // in world tiles
  // the land the cliff rules read: raised or not for the cell, its apron and LAND_M tiles more each side, from the same window, so a run's end, its steps and the faces of the rows above are found on the land, not on the baked cell
  const lw = w + 2 * LAND_M, lh = h + 2 * LAND_M, raised = new Uint8Array(lw * lh);
  for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) raised[y * lw + x] = win.t[(oy - LAND_M + y) * win.W + ox - LAND_M + x] === TV.CLIFF ? 1 : 0;
  const out = { x0, y0, w, h, terrain, top, wayups, land: { m: LAND_M, w: lw, h: lh, raised } };
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
  return { T, G: worldGround(seed), biome, W: WTW, H: WTH, wayups: stairsOf(S).filter(st => st.wayup).map(st => st.wayup), slots };
}
const SITES = new Map();   // Hollow Tree sites made off the page (src/realm-worker.mjs), by seed
export const presetHollowSites = (seed, sites) => { if (SITES.size > 3) SITES.clear(); SITES.set(seed, sites); };
export const decorOf = seed => { let d = DEC.get(seed); if (!d) { if (DEC.size > 3) DEC.clear(); d = createDecor(seed, landOf(seed), undefined, SITES.get(seed) || null); DEC.set(seed, d); } return d; };
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
function irOf(seed, id, x0, y0, w, h, terrain, wayups, cell = null, top = null, v, land = null) {   // v: the realm's kind version, for what the cell's creatures are
  const d = decorIR(seed, x0, y0, w, h);
  // what the cell holds (G4a, hold.mjs): only for a whole cell with its apron; a window of cells (the goldens' picture) holds nothing
  const hold = cell ? holdOf({ seed, v, X: cell[0], Y: cell[1], x0, y0, w, h, terrain, props: d.props, reedbanks: d.reedbanks, wayups, D: decorOf(seed), landmarks: landmarksOf(seed, decorOf(seed).hollowSites()), bareOf: (X, Y) => bareTiles(seed, X, Y) }) : null;
  const props = d.props.concat(d.reedProps).sort((a, b) => a.sortY - b.sortY || a.x - b.x || (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0));   // the reeds are not read by the hold: only the land's props are
  // `top`: the ground under each raised tile, only when some raised tile holds a ground other than grass (all grass draws as a place with none)
  return { origin: { x: x0, y: y0 }, seed, id, w, h, type: 'meadow', names: hold ? hold.names : [], tileset: 'ninja-test', mirror: false, mood: '', terrain, ...(top && top.some(v => v) ? { top } : {}), ...(land ? { land } : {}), props, decals: d.decals, canopy: [], hearts: [], clues: [],
    finds: hold ? hold.finds : [], landmarks: hold ? hold.landmarks : [], openings: hold ? hold.openings : [], spawns: hold ? hold.spawns : [], wayups, reedbanks: d.reedbanks, tone: toneField(seed, x0, y0, w, h),
    inner: hold ? hold.inner : null, ground: hold ? hold.ground || null : null, signs: hold ? hold.signs : [], traces: hold ? hold.traces : [], strikes: hold ? hold.strikes : [] };
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
  return irOf(seed, `g7-${X}-${Y}`, c.x0, c.y0, c.w, c.h, c.terrain, c.wayups.map(a => ({ x: a.x - c.x0, y: a.y - c.y0, w: a.w, h: a.h })), [X, Y], c.top, v, c.land);
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
export { CW, CH, RW, RH };
