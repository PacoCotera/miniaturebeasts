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
import { realm7, portOffset, edgeOfStep, route, NC } from './region.mjs';
import { levelsOf, tileLevel, raised as raisedTile, findWayup, tileFields, WTW, WTH } from './levels.mjs';
import { createDecor } from './decor.mjs';
import { RULES } from './rules.mjs';
import { recipeAt, SAND_AT } from './ground.mjs';
import { holdOf } from './hold.mjs';
import { landmarksOf } from './landmarks.mjs';

export const TV = { DEEP: 1, WATER: 2, SAND: 3, MUD: 4, PATH: 5, GRASS: 6, EARTH: 7, CLIFF: 8, THICKET: 9, SCRUB: 10, LITTER: 11, DRY: 12, TURF: 13, SCREE: 14 };
// the pairs the set draws (art/places/terrain.json values): a terrain meets another only as one of these (the set's `lowers`); every 2 x 2 block of logic tiles holds at most three terrains (terrain layers),
// and every two of them are such a pair
const PAIRS = new Set(['2|6', '2|3', '3|6', '5|6', '2|4', '6|8', '6|9', '6|10', '3|9', '3|10', '1|2', '6|11', '3|11', '6|12', '9|12', '10|12', '6|13', '9|13', '10|13', '6|14', '3|14', '9|14', '10|14', '2|14', '11|12', '11|13', '11|14', '10|11', '12|13', '12|14', '13|14']);   // sand-raised ('3|8') is in the set but the generator never uses it: a raised region that meets both grass and sand is drawn two ways, which the bake refuses
// who gives way to grass when a 2 x 2 block breaks the table: the lesser first; raised land is never cut (round 4), the others yield to it
const KEEP = { 8: 10, 2: 9, 9: 7, 5: 6, 11: 5, 3: 4, 14: 4, 10: 3, 12: 2, 13: 2, 6: 0 };
export const pairOk = (a, b) => PAIRS.has(a < b ? a + '|' + b : b + '|' + a);
// the terrains of one 2 x 2 block (an iterable of values, repeats allowed): at most three distinct, every two a legal pair
export function blockOk(values) {
  const v = [...new Set(values)];
  if (v.length > 3) return false;
  for (let i = 0; i < v.length; i++) for (let j = i + 1; j < v.length; j++) if (!pairOk(v[i], v[j])) return false;
  return true;
}

const LITTER_NONE = 1.5;               // a litterAt at or above this lays no leaf litter
const CLOSE = 4;                      // the map's end: the last 4 tiles close the land; raised land keeps three more tiles of grass from them (levels.mjs RAISE_OFF)
const WIN_X = 7, WIN_Y = 9, HX = (WIN_X - 1) / 2, HY = (WIN_Y - 1) / 2;   // the window the passes run on, in cells: the cell and two cells each side (three above and below, where a chain of conversions runs farthest), so what an edge of the window does stays clear of the cell
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const WATER_CLOSE = new Set(['marsh', 'meres', 'tarns']);   // these biomes close the map with water, the others with a thicket mass

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
const closeWater = (S, gx, gy) => WATER_CLOSE.has(S.re.slotBiome[((clamp(Math.floor(gy / CH), 0, RH - 1) / MH) | 0) * ATLAS + ((clamp(Math.floor(gx / CW), 0, RW - 1) / MW) | 0)]);

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
    if (Math.min(gx, gy, WTW - 1 - gx, WTH - 1 - gy) < CLOSE) {   // the map's end: the land closes itself over the last four tiles (Rule 4.4)
      rock[k] = 0; push[k] = 0; if (closeWater(S, gx, gy)) { wet[k] = 2; forest[k] = 0; } else { forest[k] = 2; wet[k] = 0; }
    }
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

// ---- trails: the region's A* routes, drawn through their ports with a 2 x 2 brush ----
function trailsOf(S) {
  if (S.trails) return S.trails;
  const by = new Map(), list = [];
  for (const G of S.R.regions) {
    const [ax, ay] = G.slot;
    for (const tr of G.trails) {
      const cells = tr.cells.map(c => [ax * MW + (c % MW), ay * MH + ((c / MW) | 0), c]), t = { ax, ay, cells }; list.push(t);
      cells.forEach((p, k) => { const key = p[0] * 1000 + p[1]; if (!by.has(key)) by.set(key, []); by.get(key).push({ t, k }); });
    }
  }
  return (S.trails = { by, list });
}
// the port of the edge between two cells of a trail, on the side of `from` and on the side of `to`: tiles in world coordinates
function portTiles(S, t, p, q) {
  const e = edgeOfStep(p[2], q[2]), off = portOffset(S.seed, t.ax, t.ay, e);
  if (p[1] === q[1]) { const east = q[0] > p[0], bx = (east ? q[0] : p[0]) * CW, y = p[1] * CH + off; return east ? [[bx - 1, y], [bx, y]] : [[bx, y], [bx - 1, y]]; }
  const down = q[1] > p[1], by = (down ? q[1] : p[1]) * CH, x = p[0] * CW + off; return down ? [[x, by - 1], [x, by]] : [[x, by], [x, by - 1]];
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
          let bad = 0, foreign = 0; for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const u = a[(ys + dy) * W + xs + dx]; if (u !== TV.GRASS) { foreign++; if (never(u)) bad++; } }
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
  const at = (gx, gy) => { const x = gx - gx0, y = gy - gy0; return x < 0 || y < 0 || x >= W || y >= H ? -1 : t[y * W + x]; };
  const walkAt = (gx, gy) => { const v = at(gx, gy); return v === TV.GRASS || v === TV.SAND || v === TV.PATH || v >= TV.LITTER || v === TV.SCRUB || (v === TV.CLIFF && at(gx - 1, gy) === TV.CLIFF && at(gx + 1, gy) === TV.CLIFF && at(gx, gy - 1) === TV.CLIFF && at(gx, gy + 1) === TV.CLIFF); };
  const gate = new Uint8Array(W * H);
  const put = (gx, gy) => { const x = gx - gx0, y = gy - gy0; if (x < 0 || y < 0 || x >= W || y >= H) return false; const v = t[y * W + x]; if (v === TV.CLIFF || v === TV.DEEP) return false; t[y * W + x] = TV.GRASS; gate[y * W + x] = 1; return true; };
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
      if (has) continue;
      const off = portOffset(S.seed, G.slot[0], G.slot[1], edgeOfStep(a, b));
      for (const side of [-1, 0]) for (let d = 0; d < GATE_DEPTH; d++) {   // side -1: back into the cell A; 0: on into the cell B
        const pos = side === -1 ? line - 1 - d : line + d, rows = [base + off, base + off + 1];
        if (rows.every(r => (dx ? walkAt(pos, r) : walkAt(r, pos)))) break;
        for (const r of rows) dx ? put(pos, r) : put(r, pos);
      }
    }
  }
  return gate;
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
    if (forest[i] > r.scrubAt && forest[i] <= r.thicketAt && scrub[i] > r.scrubNoise) t[i] = TV.SCRUB;
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
  // raised land from the levels: every tile on a level above the lowest; water lies only on the low ground
  const raised = new Uint8Array(N);
  const LVL = levelsOf(S.re);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (raisedTile(LVL, gx0 + x, gy0 + y)) { raised[y * W + x] = 1; t[y * W + x] = TV.CLIFF; }
  // the cliff's outline is the blocks' outline and nothing else bites into it: terrain the cliff has no pair with keeps one tile of grass between it and the rim, made on its side
  { const near = new Uint8Array(N);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (raised[y * W + x]) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X2 = x + dx, Y2 = y + dy; if (X2 >= 0 && Y2 >= 0 && X2 < W && Y2 < H) near[Y2 * W + X2] = 1; }
    for (let i = 0; i < N; i++) if (near[i] && !raised[i] && t[i] !== TV.GRASS) t[i] = TV.GRASS; }   // sand too: a sand-grass edge reaching the rim would be a three-terrain corner, and the legal pass would eat the sand along the whole rim
  const isCliff = v => v === TV.CLIFF;
  minFeature(t, W, H, isCliff, isCliff);
  // ways up (Rule 1.5): the stairs' faces were found on the block land; nothing is carved. Kept when they touch the window
  const wayups = [];
  for (const st of stairsOf(S)) {
    const wu = st.wayup; if (!wu) continue;
    if (wu.x - 1 < gx0 || wu.x + 3 > gx0 + W || wu.y - 3 < gy0 || wu.y + 3 > gy0 + H) continue;
    wayups.push({ x: wu.x, y: wu.y, w: wu.w, h: wu.h });
  }
  // trails: through each cell of the window, port to port (or to the cell's hub at a trail's end), by the same A* the region uses, painted with a 2 x 2 brush. Raised land takes no path (art slot).
  // a trail runs on ground you can walk: a route tile is open when the 4 x 4 tiles round its 2 x 2 brush hold no water, thicket or raised land; sand and scrub under it turn to grass and its brush to path,
  // so path never meets anything but grass
  const tr = trailsOf(S), ground = t.slice(), blocked = new Uint8Array(N), rough = new Uint8Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let hard = x < 1 || y < 1 || x + 2 >= W || y + 2 >= H, soft = 0; for (let dy = -1; dy <= 2 && !hard; dy++) for (let dx = -1; dx <= 2; dx++) { const v = t[(y + dy) * W + x + dx]; if (v === TV.WATER || v === TV.THICKET || v === TV.CLIFF) { hard = true; break; } if (v !== TV.GRASS) soft = 1; } blocked[y * W + x] = hard ? 1 : 0; rough[y * W + x] = soft; }
  const paint = (x, y) => { for (let dy = -1; dy <= 2; dy++) for (let dx = -1; dx <= 2; dx++) { const X2 = x + dx, Y2 = y + dy; if (X2 < 0 || Y2 < 0 || X2 >= W || Y2 >= H) continue; const k = Y2 * W + X2, v = t[k], brush = dx >= 0 && dx <= 1 && dy >= 0 && dy <= 1; if (brush && v !== TV.WATER && v !== TV.THICKET && v !== TV.CLIFF) t[k] = TV.PATH; else if (!brush && (v === TV.SAND || v === TV.SCRUB || v >= TV.LITTER)) t[k] = TV.GRASS; } };
  const stairBy = new Map(); for (const st of stairsOf(S)) stairBy.set(st.A[0] * 1000 + st.A[1] + (st.south ? 's' : 'e'), st);
  for (let j = 0; j < WIN_Y; j++) for (let i = 0; i < WIN_X; i++) {
    const cx = X - HX + i, cy = Y - HY + j, hits = tr.by.get(cx * 1000 + cy); if (!hits) continue;
    for (const { t: T, k } of hits) {
      const cur = T.cells[k], prev = T.cells[k - 1], next = T.cells[k + 1];
      const hh = hash(seed, 'gen7', 'hub', cx, cy), hub = [cx * CW + 12 + (hh % 7) - 3, cy * CH + 14 + ((hh >>> 4) % 7) - 3];
      const anchor = (o, toward) => {   // the tile where the trail meets the edge to `o`, on this cell's side; null where that side is raised land (no path there yet: art slot)
        if (!o) return hub;
        const a = toward ? cur : o, b = toward ? o : cur, pt = portTiles(S, T, a, b), mine = toward ? pt[0] : pt[1];
        const lc = S.lvC[cellIdx(cur[0], cur[1])], lo = S.lvC[cellIdx(o[0], o[1])];
        if (lc === lo) return mine;
        if (lc > lo) return null;   // a stair, and this is its high side
        const vertical = a[0] === b[0], A = vertical ? (a[1] < b[1] ? a : b) : (a[0] < b[0] ? a : b), st = stairBy.get(A[0] * 1000 + A[1] + (vertical ? 's' : 'e'));
        return st && st.wayup ? [st.wayup.x, st.wayup.y + 2] : mine;   // the trail meets the way up on the low side
      };
      const a0 = anchor(prev, false), a1 = anchor(next, true); if (!a0 || !a1) continue;
      const lx = a => clamp(a[0] - cx * CW, 0, CW - 1), ly = a => clamp(a[1] - cy * CH, 0, CH - 1), ox = (cx - (X - HX)) * CW, oy = (cy - (Y - HY)) * CH;
      const cost = (c, n) => { const x = ox + (n % CW), y = oy + ((n / CW) | 0), w = y * W + x; return blocked[w] && n !== to ? null : 1 + 0.7 * (0.5 + 0.5 * S.nP(gx0 + x, gy0 + y)) + (ground[w] === TV.SAND ? 0.5 : 0) + 3 * rough[w]; };
      const from = ly(a0) * CW + lx(a0), to = ly(a1) * CW + lx(a1);
      const r = route(CW, CH, from, to, (c, n) => cost(c, n)); if (!r) continue;
      for (const c of r) paint(ox + (c % CW), oy + ((c / CW) | 0));
    }
  }
  // the set's pairs are all opaque (Rule 1.2-1.3): every 2 x 2 block holds at most two terrains and they must be a pair; the lesser gives way to grass. The 2 x 2 rule alternates
  // with the legal pass (Rule 1.9), and no one-row gully stays under a raised edge. The gates (openGates) are cut once the land has settled, and it settles again round them.
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
        if (blockOk(vals)) continue;
        const drop = vals.filter(v => v !== TV.GRASS).sort((p, q) => KEEP[p] - KEEP[q])[0];
        for (const k of idx) if (t[k] === drop) { t[k] = TV.GRASS; n++; }
      }
      changed += n;
    }
    for (let y = 0; y + 2 < H; y++) for (let x = 0; x < W; x++) if (t[y * W + x] === TV.CLIFF && t[(y + 1) * W + x] !== TV.CLIFF && t[(y + 2) * W + x] === TV.CLIFF) { t[(y + 1) * W + x] = TV.CLIFF; changed++; }
    if (!changed) changed += fillPockets(t, W, H, gx0, gy0, islands(S), gate);
    if (!changed) break;
  } };
  settle(null);
  const gate = openGates(S, t, W, H, gx0, gy0, X, Y);
  if (gate.some(v => v)) settle(gate);
  return { t, W, H, gx0, gy0, wayups };
}

// ---- a cell with its apron ----
// The terrain of cell (X, Y) and one tile round it: (24 + 2) x (28 + 2) values, the first at world tile (24 X - 1, 28 Y - 1). A border dual tile reads the true neighbour terrain.
const CELLS = new Map();
export function cellTerrain(seed, X, Y) {
  const key = seed + ':' + X + ',' + Y, hit = CELLS.get(key); if (hit) return hit;
  const S = ctxOf(seed), win = windowOf(S, X, Y), w = CW + 2, h = CH + 2, terrain = new Uint8Array(w * h), ox = HX * CW - 1, oy = HY * CH - 1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) terrain[y * w + x] = win.t[(oy + y) * win.W + ox + x];
  const x0 = X * CW - 1, y0 = Y * CH - 1;
  const wayups = win.wayups.filter(a => a.x + 3 > x0 && a.x - 1 < x0 + w && a.y + 2 > y0 && a.y < y0 + h).map(a => ({ x: a.x, y: a.y, w: a.w, h: a.h }));   // in world tiles
  const out = { x0, y0, w, h, terrain, wayups };
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
  const S = ctxOf(seed), n = S.nG, T = worldTiles(seed), out = new Uint8Array(w * h), memo = S.toneMemo || (S.toneMemo = new Map()), K = (x, y) => y * 8192 + x;
  // a tile that may carry tone: grass (or the raised top) with the whole 5 x 5 block round it that same ground, so a full cell is clear of every edge (path, water, sand, cliff, thicket, scrub); on the raised
  // top the three cells two rows below are in that block, so every dual tile the tone touches is the plain top, never a face or a way up
  const clear = (gx, gy, v) => { for (let dy = -TONE_CLEAR; dy <= TONE_CLEAR; dy++) for (let dx = -TONE_CLEAR; dx <= TONE_CLEAR; dx++) if (T(gx + dx, gy + dy) !== v) return false; return true; };
  // a patch is the 8-connected blob of tiles the noise puts above the threshold; it is kept whole or dropped whole: one tile that is not clear drops the patch (never clipped, which went boxy beside paths and ponds)
  const patchOk = (gx, gy) => {
    const k = K(gx, gy), hit = memo.get(k); if (hit !== undefined) return hit;
    const v = T(gx, gy), seen = new Set([k]), q = [[gx, gy]];
    let ok = (v === TV.GRASS || v === TV.CLIFF);
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
export function worldTiles(seed) {
  const cc = new Map();
  let lx = -1, ly = -1, lt = null;
  return (gx, gy) => {
    if (gx < 0 || gy < 0 || gx >= WTW || gy >= WTH) return TV.THICKET;
    const X = (gx / CW) | 0, Y = (gy / CH) | 0;
    if (X !== lx || Y !== ly) { const k = Y * RW + X; let t = cc.get(k); if (!t) { if (cc.size > 400) cc.clear(); t = cellTerrain(seed, X, Y).terrain; cc.set(k, t); } lt = t; lx = X; ly = Y; }
    return lt[(gy - Y * CH + 1) * (CW + 2) + gx - X * CW + 1];
  };
}
function landOf(seed) {
  const S = ctxOf(seed), T = worldTiles(seed);
  const biome = (gx, gy) => S.re.slotBiome[((clamp((gy / CH) | 0, 0, RH - 1) / MH) | 0) * ATLAS + ((clamp((gx / CW) | 0, 0, RW - 1) / MW) | 0)];
  const slots = []; for (let ay = 0; ay < ATLAS; ay++) for (let ax = 0; ax < ATLAS; ax++) slots.push({ ax, ay, biome: S.re.slotBiome[ay * ATLAS + ax], x0: ax * MW * CW, y0: ay * MH * CH, x1: (ax + 1) * MW * CW - 1, y1: (ay + 1) * MH * CH - 1 });
  return { T, biome, W: WTW, H: WTH, wayups: stairsOf(S).filter(st => st.wayup).map(st => st.wayup), slots };
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
function irOf(seed, id, x0, y0, w, h, terrain, wayups, cell = null) {
  const d = decorIR(seed, x0, y0, w, h);
  // what the cell holds (G4a, hold.mjs): only for a whole cell with its apron; a window of cells (the goldens' picture) holds nothing
  const hold = cell ? holdOf({ seed, X: cell[0], Y: cell[1], x0, y0, w, h, terrain, props: d.props, reedbanks: d.reedbanks, wayups, D: decorOf(seed), landmarks: landmarksOf(seed, decorOf(seed).hollowSites()), bareOf: (X, Y) => bareTiles(seed, X, Y) }) : null;
  const props = d.props.concat(d.reedProps).sort((a, b) => a.sortY - b.sortY || a.x - b.x || (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0));   // the reeds are not read by the hold: only the land's props are
  return { origin: { x: x0, y: y0 }, seed, id, w, h, type: 'meadow', names: hold ? hold.names : [], tileset: 'ninja-test', mirror: false, mood: '', terrain, props, decals: d.decals, canopy: [], hearts: [], clues: [],
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
export function cellIR(seed, X, Y) {
  const c = cellTerrain(seed, X, Y);
  return irOf(seed, `g7-${X}-${Y}`, c.x0, c.y0, c.w, c.h, c.terrain, c.wayups.map(a => ({ x: a.x - c.x0, y: a.y - c.y0, w: a.w, h: a.h })), [X, Y]);
}
// A block of nx x ny cells as one picture (for the goldens): each cell's own tiles, side by side, with no apron. Equal to baking each cell with its apron.
export function windowIR(seed, X0, Y0, nx, ny) {
  const w = nx * CW, h = ny * CH, terrain = new Uint8Array(w * h), x0 = X0 * CW, y0 = Y0 * CH, seen = new Set(), wayups = [];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const c = cellTerrain(seed, X0 + i, Y0 + j);
    for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) terrain[(j * CH + y) * w + i * CW + x] = c.terrain[(y + 1) * c.w + x + 1];
    for (const a of c.wayups) { const k = a.x + ',' + a.y; if (!seen.has(k)) { seen.add(k); wayups.push({ x: a.x - x0, y: a.y - y0, w: a.w, h: a.h }); } }
  }
  return irOf(seed, `g7-window-${X0}-${Y0}`, x0, y0, w, h, terrain, wayups.filter(a => a.x - 1 >= 0 && a.x + a.w + 1 <= w && a.y >= 0 && a.y + 2 <= h));
}
export { CW, CH, RW, RH };
