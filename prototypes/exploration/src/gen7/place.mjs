// Generator 7, layer 2: the place (a cell of 24 x 28 tiles). Pure: no page state, DOM, storage, clock or Math.random.
// Terrain per tile for the bake's dual grid, nothing else (props and decor are G3). Every value is a function of the realm seed and a WORLD tile position, never of a cell number
// or of the order cells were made in, so a cell and its neighbour are windows onto one land:
//   - the shapes (ground, wood, sand, water) come from the world's own fields sampled at every tile (the same functions the region samples at cell centres), plus a light linear
//     pull from the region's cell labels. No smoothstep between cell centres, so no boundary falls on a cell edge (scheme Rule 1.10);
//   - the levels come from the elevation field on 8 x 8 world blocks offset by 3 tiles, read across the whole realm at once (so a cliff is a contour line of the land, runs
//     straight, and never falls on a cell edge: 24 and 28 are never 3 more than a multiple of 8). The cell's level is a summary of this land: the blocks round the cell's centre
//     take the cell's level, the others are clamped between the levels of the four cell centres round them, then every level region is kept at 2 x 2 blocks or more (Rule 5.2);
//   - ways up sit on existing straight south faces of that block land, nearest the stair's port; nothing is carved (Rule 5.5);
//   - the passes of Rule 1.4 run on a window of 5 x 7 cells round the cell, and the cell's tiles plus a one-tile apron are cut out of it;
// Rule 1.8: every terrain boundary is drawn only by the dual grid's corner pieces; nothing here composites or overlays.
import { hash, L, EDGE, MW, MH } from '../world.mjs';
import { ATLAS } from '../regions.mjs';
import { RW, RH, CW, CH, LV, noiseField, fieldsAt } from './world.mjs';
import { realm7, portOffset, edgeOfStep, route, NC } from './region.mjs';

export const TV = { DEEP: 1, WATER: 2, SAND: 3, MUD: 4, PATH: 5, GRASS: 6, EARTH: 7, CLIFF: 8, THICKET: 9, SCRUB: 10 };
// the pairs the set draws (art/places/terrain.json values): every 2 x 2 block of logic tiles holds at most two terrains, and they are one of these
const PAIRS = new Set(['2|6', '2|3', '3|6', '5|6', '2|4', '6|7', '3|7', '6|8', '6|9', '6|10', '3|9', '3|10', '1|2']);   // sand-raised ('3|8') is in the set but the generator never uses it: a raised region that meets both grass and sand is drawn two ways, which the bake refuses
// who gives way to grass when a 2 x 2 block breaks the table: the lesser first; raised land is never cut (round 4), the others yield to it
const KEEP = { 8: 10, 2: 9, 9: 7, 5: 6, 7: 5, 3: 4, 10: 3, 6: 0 };
export const pairOk = (a, b) => PAIRS.has(a < b ? a + '|' + b : b + '|' + a);

export const LB = 8, LO = 3;          // level blocks: 8 tiles, offset 3
const CLOSE = 4, RAISE_OFF = 7;       // the map's end: the last 4 tiles close the land; raised land keeps three more tiles of grass from them (a one-tile strip would be widened into the closing band)
const WTW = RW * CW, WTH = RH * CH;   // the realm in tiles
const WIN_X = 5, WIN_Y = 7, HX = (WIN_X - 1) / 2, HY = (WIN_Y - 1) / 2;   // the window the passes run on, in cells: the cell and two cells each side (three above and below, where a chain of conversions runs farthest), so what an edge of the window does stays clear of the cell
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const WATER_CLOSE = new Set(['marsh', 'meres', 'tarns']);   // these biomes close the map with water, the others with a thicket mass

// ---- per seed: cell values, the level blocks, stairs and trails ----
const CTX = new Map();
function ctxOf(seed) {
  let S = CTX.get(seed); if (S) return S;
  const R = realm7(seed), re = R.realm, N = RW * RH;
  S = { seed, R, re, at: fieldsAt(seed), forestC: new Float32Array(N), wetC: new Float32Array(N), rockC: new Float32Array(N), lvC: new Int8Array(N), landC: new Uint8Array(N), chunks: new Map(), cells: new Map(), blocks: null, stairs: null, trails: null };
  for (const G of R.regions) {
    const [ax, ay] = G.slot;
    for (let c = 0; c < NC; c++) {
      const w = (ay * MH + ((c / MW) | 0)) * RW + ax * MW + (c % MW), land = G.land[c], F = re.F[w], M = re.M[w], K = re.K[w];
      S.landC[w] = land; S.lvC[w] = G.level[c];
      // the cell values the place reads (the region's label keeps the picture and the map in step)
      S.forestC[w] = land === L.WOOD ? Math.max(F, 0.86) : land === L.MEADOW ? Math.min(F * 0.75, 0.46) : land === L.ROCK ? 0.32 : land === L.POND ? 0.42 : 0;
      S.wetC[w] = land === L.WATER ? (G.ford[c] ? 0.8 : 1.05) : land === L.POND ? 0.56 : 0.12 + 0.12 * M;
      S.rockC[w] = land === L.ROCK ? 0.9 : Math.min(K, 0.4) * 0.6;
    }
  }
  S.nF = noiseField(seed, 't-forest', 1 / 10, 'FBm', 2); S.nW = noiseField(seed, 't-wet', 1 / 12, 'FBm', 2); S.nR = noiseField(seed, 't-rock', 1 / 9, 'FBm', 2);
  S.nS = noiseField(seed, 't-scrub', 1 / 5, 'FBm', 1); S.nP = noiseField(seed, 'trail-wobble', 1 / 6, 'FBm', 2); S.nG = noiseField(seed, 'ground-mix', 1 / 5, 'FBm', 2);
  if (CTX.size > 3) CTX.clear();
  CTX.set(seed, S); return S;
}
const cellIdx = (X, Y) => clamp(Y, 0, RH - 1) * RW + clamp(X, 0, RW - 1);
const closeWater = (S, gx, gy) => WATER_CLOSE.has(S.re.slotBiome[((clamp(Math.floor(gy / CH), 0, RH - 1) / MH) | 0) * ATLAS + ((clamp(Math.floor(gx / CW), 0, RW - 1) / MW) | 0)]);

// the tile fields of one cell (24 x 28 values each), from the world's fields at tile scale
function chunk(S, X, Y) {
  const key = (X + 8) * 1000 + (Y + 8), hit = S.chunks.get(key); if (hit) return hit;
  const n = CW * CH, forest = new Float32Array(n), rock = new Float32Array(n), wet = new Float32Array(n), scrub = new Float32Array(n);
  const bil = (A, i00, i10, i01, i11, a, b) => A[i00] * (1 - a) * (1 - b) + A[i10] * a * (1 - b) + A[i01] * (1 - a) * b + A[i11] * a * b;
  for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CW; tx++) {
    const gx = X * CW + tx, gy = Y * CH + ty, k = ty * CW + tx;
    const u = (gx + 0.5) / CW - 0.5, v = (gy + 0.5) / CH - 0.5, X0 = Math.floor(u), Y0 = Math.floor(v), a = u - X0, b = v - Y0;
    const i00 = cellIdx(X0, Y0), i10 = cellIdx(X0 + 1, Y0), i01 = cellIdx(X0, Y0 + 1), i11 = cellIdx(X0 + 1, Y0 + 1), f = S.at(u, v);
    forest[k] = 0.55 * f.wildness + 0.45 * bil(S.forestC, i00, i10, i01, i11, a, b) + 0.12 * S.nF(gx, gy);
    rock[k] = 0.5 * f.rockiness + 0.5 * bil(S.rockC, i00, i10, i01, i11, a, b) + 0.12 * S.nR(gx, gy);
    wet[k] = bil(S.wetC, i00, i10, i01, i11, a, b) + 0.22 * S.nW(gx, gy);
    scrub[k] = S.nS(gx, gy);
    if (Math.min(gx, gy, WTW - 1 - gx, WTH - 1 - gy) < CLOSE) {   // the map's end: the land closes itself over the last four tiles (Rule 4.4)
      rock[k] = 0; if (closeWater(S, gx, gy)) { wet[k] = 2; forest[k] = 0; } else { forest[k] = 2; wet[k] = 0; }
    }
  }
  const out = { forest, rock, wet, scrub };
  if (S.chunks.size > 600) S.chunks.clear();
  S.chunks.set(key, out); return out;
}

// ---- the level blocks, over the whole realm ----
const BX0 = -2, BY0 = -2;
function blocksOf(S) {
  if (S.blocks) return S.blocks;
  const BW = Math.floor((WTW - 1 - LO) / LB) - BX0 + 3, BH = Math.floor((WTH - 1 - LO) / LB) - BY0 + 3, bg = new Int8Array(BW * BH), pin = new Uint8Array(BW * BH), re = S.re;
  const lvAt = (X, Y) => S.lvC[cellIdx(X, Y)];
  for (let j = 0; j < BH; j++) for (let i = 0; i < BW; i++) {
    const cx = (i + BX0) * LB + LO + LB / 2, cy = (j + BY0) * LB + LO + LB / 2, u = cx / CW - 0.5, v = cy / CH - 0.5, X0 = Math.floor(u), Y0 = Math.floor(v), a = u - X0, b = v - Y0;
    const i00 = cellIdx(X0, Y0), i10 = cellIdx(X0 + 1, Y0), i01 = cellIdx(X0, Y0 + 1), i11 = cellIdx(X0 + 1, Y0 + 1);
    const lo = Math.min(S.lvC[i00], S.lvC[i10], S.lvC[i01], S.lvC[i11]), hi = Math.max(S.lvC[i00], S.lvC[i10], S.lvC[i01], S.lvC[i11]);
    let raw = lo;
    if (hi > lo) {   // the contour of the pulled height (today's calibration per cell, bilinear at tile scale) decides, between the levels of the cells round it
      const e = S.at(u, v).height, e0 = re.e0[i00] * (1 - a) * (1 - b) + re.e0[i10] * a * (1 - b) + re.e0[i01] * (1 - a) * b + re.e0[i11] * a * b, e1 = re.e1[i00] * (1 - a) * (1 - b) + re.e1[i10] * a * (1 - b) + re.e1[i01] * (1 - a) * b + re.e1[i11] * a * b;
      const p = LV[0] + (e - e0) * (LV[1] - LV[0]) / (e1 - e0); raw = clamp(p < LV[0] ? 0 : p < LV[1] ? 1 : 2, lo, hi);
    }
    bg[j * BW + i] = raw;
  }
  for (let Y = 0; Y < RH; Y++) for (let X = 0; X < RW; X++) {   // the summary: the blocks under the cell's centre square take the cell's level and stay
    const cx = X * CW + CW / 2, cy = Y * CH + CH / 2, ia = Math.floor((cx - 4 - LO) / LB), ib = Math.floor((cx + 3 - LO) / LB), ja = Math.floor((cy - 4 - LO) / LB), jb = Math.floor((cy + 3 - LO) / LB);
    for (let j = ja; j <= jb; j++) for (let i = ia; i <= ib; i++) { bg[(j - BY0) * BW + i - BX0] = lvAt(X, Y); pin[(j - BY0) * BW + i - BX0] = 1; }
  }
  // an open edge stays open (Rule 5.2): two neighbouring cells of one level are joined by a corridor of that level across the edge, the blocks round its middle
  const pinSquare = (cx, cy, lv) => { for (let j = Math.floor((cy - 4 - LO) / LB); j <= Math.floor((cy + 3 - LO) / LB); j++) for (let i = Math.floor((cx - 4 - LO) / LB); i <= Math.floor((cx + 3 - LO) / LB); i++) { bg[(j - BY0) * BW + i - BX0] = lv; pin[(j - BY0) * BW + i - BX0] = 1; } };
  for (let Y = 0; Y < RH; Y++) for (let X = 0; X < RW; X++) {
    if (X + 1 < RW && lvAt(X, Y) === lvAt(X + 1, Y)) pinSquare((X + 1) * CW, Y * CH + CH / 2, lvAt(X, Y));
    if (Y + 1 < RH && lvAt(X, Y) === lvAt(X, Y + 1)) pinSquare(X * CW + CW / 2, (Y + 1) * CH, lvAt(X, Y));
  }
  // round 4: a level region is at least 2 x 2 blocks, so a cliff changes course at most once every 8 tiles; no square staircases, notches or spikes
  const at = (src, i, j) => src[clamp(j, 0, BH - 1) * BW + clamp(i, 0, BW - 1)];
  for (let pass = 0; pass < 16; pass++) {
    const src = bg.slice(); let changed = 0;
    for (let j = 0; j < BH; j++) for (let i = 0; i < BW; i++) {
      if (pin[j * BW + i]) continue;
      const v = src[j * BW + i];
      if ([[0, 0], [-1, 0], [0, -1], [-1, -1]].some(([a, b]) => at(src, i + a, j + b) === v && at(src, i + a + 1, j + b) === v && at(src, i + a, j + b + 1) === v && at(src, i + a + 1, j + b + 1) === v)) continue;
      const cnt = [0, 0, 0]; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const u = at(src, i + a, j + b); if (u !== v) cnt[u]++; }
      let best = -1, bc = 0; for (let u = 0; u < 3; u++) if (cnt[u] > bc) { best = u; bc = cnt[u]; }
      if (best >= 0) { bg[j * BW + i] = best; changed++; }
    }
    if (!changed) break;
  }
  return (S.blocks = { bg, BW, BH });
}
// a world tile's level (0 at the map's end: the closing band and a tile beyond it keep to the low ground)
export function levelAt(seed, gx, gy) {
  const S = ctxOf(seed), { bg, BW, BH } = blocksOf(S);
  return bg[clamp(Math.floor((gy - LO) / LB) - BY0, 0, BH - 1) * BW + clamp(Math.floor((gx - LO) / LB) - BX0, 0, BW - 1)];
}
export const raisedAt = (seed, gx, gy) => Math.min(gx, gy, WTW - 1 - gx, WTH - 1 - gy) >= RAISE_OFF && levelAt(seed, gx, gy) >= 1;

// ---- ways up: on an existing straight south face of the block land, nearest the stair's port ----
// A stair edge between a cell A (north) and a cell B (south) whose upper cell is A has a south-facing face between them. East and west stairs, and stairs whose upper cell is B
// (a north-facing face), have no piece yet: they are the art slots `wayup-east-west` and `wayup-north`, and the stair gets no way up.
function stairsOf(S) {
  if (S.stairs) return S.stairs;
  const out = [];
  for (const G of S.R.regions) {
    const [ax, ay] = G.slot;
    for (const cr of G.cross) {
      const X = ax * MW + (cr.c % MW), Y = ay * MH + ((cr.c / MW) | 0), south = cr.side === 's', e = 2 * cr.c + (south ? 1 : 0);
      const A = [X, Y], B = south ? [X, Y + 1] : [X + 1, Y], lvA = S.lvC[cellIdx(A[0], A[1])], lvB = S.lvC[cellIdx(B[0], B[1])];
      const st = { A, B, south, upperIsA: lvA > lvB, port: portOffset(S.seed, ax, ay, e), wayup: null, kind: south ? (lvA > lvB ? 'south' : 'north') : 'east-west' };
      if (st.kind === 'south') st.wayup = findWayup(S, st);
      out.push(st);
    }
  }
  return (S.stairs = out);
}
function findWayup(S, st) {
  const R = (x, y) => raisedAt(S.seed, x, y), px = st.A[0] * CW + st.port, py = (st.A[1] + 1) * CH;
  const face = (x, y) => R(x, y) && !R(x, y + 1) && !R(x, y + 2) && !R(x, y + 3) && R(x, y - 1) && R(x, y - 2);
  let best = null, bd = 61;
  for (let y = st.A[1] * CH + 10; y <= (st.A[1] + 1) * CH + 6; y++) for (let x = st.A[0] * CW + 2; x <= st.A[0] * CW + CW - 5; x++) {
    if (![-1, 0, 1, 2].every(dx => face(x + dx, y))) continue;
    const d = Math.abs(x - px) + Math.abs(y - py); if (d < bd) { bd = d; best = { x, y, w: 2, h: 1 }; }
  }
  return best;
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
  const cnt = new Int16Array(12);
  for (let p = 0; p < passes; p++) {
    const src = a.slice();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      cnt.fill(0);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; cnt[src[clamp(y + dy, 0, H - 1) * W + clamp(x + dx, 0, W - 1)]]++; }
      const own = src[y * W + x]; let best = own, bc = cnt[own];
      for (let v = 1; v < 12; v++) if (cnt[v] > bc) { best = v; bc = cnt[v]; }
      if (bc >= 5 && cnt[own] <= 2) a[y * W + x] = best;
    }
  }
}
// minimum feature size 2 x 2 (Rule 1.9): a tile that belongs to no 2 x 2 block of its own terrain takes the most common terrain among its four neighbours
function minFeature(a, W, H, skip = () => false, never = () => false, passes = 8, toGrass = false) {
  const cnt = new Int16Array(12), at = (src, x, y) => src[clamp(y, 0, H - 1) * W + clamp(x, 0, W - 1)];
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
        let best = -1, bc = 0; for (let u = 1; u < 12; u++) if (cnt[u] > bc) { best = u; bc = cnt[u]; }
        if (best >= 0) {
          a[y * W + x] = best;
          let legal = true, own = false;
          for (let oy = -1; oy <= 0; oy++) for (let ox = -1; ox <= 0; ox++) {
            const xs = x + ox, ys = y + oy; if (xs < 0 || ys < 0 || xs + 1 >= W || ys + 1 >= H) continue;
            const b0 = a[ys * W + xs], b1 = a[ys * W + xs + 1], b2 = a[(ys + 1) * W + xs], b3 = a[(ys + 1) * W + xs + 1], set = new Set([b0, b1, b2, b3]);
            if (set.size > 2 || (set.size === 2 && !pairOk(...set))) legal = false;
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
      let best = -1, bc = 0; for (let u = 1; u < 12; u++) if (cnt[u] > bc) { best = u; bc = cnt[u]; }
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

const islands = S => S.islandSet || (S.islandSet = new Set(S.R.regions.flatMap(G => { const o = []; for (let c = 0; c < NC; c++) if (G.island[c]) o.push((G.slot[0] * MW + (c % MW)) * 1000 + G.slot[1] * MH + ((c / MW) | 0)); return o; })));
// A bit of ground the walker cannot reach (a grass island the water noise left in a lake, a hollow ringed by thicket) is filled with what rings it. A body of ground that reaches the window's
// edge, holds raised land, is large, or is a region's swim island stays.
function fillPockets(t, W, H, gx0, gy0, island) {
  const seen = new Uint8Array(W * H), q = new Int32Array(W * H), solid = v => v === TV.WATER || v === TV.THICKET;
  let changed = 0;
  for (let s = 0; s < W * H; s++) {
    if (seen[s] || solid(t[s])) continue;
    let n = 0, keep = false, x0 = W, x1 = 0, y0 = H, y1 = 0; q[n++] = s; seen[s] = 1;
    for (let h = 0; h < n; h++) {
      const c = q[h], x = c % W, y = (c / W) | 0;
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1 || t[c] === TV.CLIFF) keep = true;
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

function windowOf(S, X, Y) {
  const W = WIN_X * CW, H = WIN_Y * CH, gx0 = (X - HX) * CW, gy0 = (Y - HY) * CH, N = W * H, seed = S.seed;
  const t = new Uint8Array(N).fill(TV.GRASS), forest = new Float32Array(N), rock = new Float32Array(N), wet = new Float32Array(N), scrub = new Float32Array(N);
  for (let j = 0; j < WIN_Y; j++) for (let i = 0; i < WIN_X; i++) {
    const c = chunk(S, X - HX + i, Y - HY + j);
    for (let ty = 0; ty < CH; ty++) { const o = (j * CH + ty) * W + i * CW, k = ty * CW; for (let tx = 0; tx < CW; tx++) { forest[o + tx] = c.forest[k + tx]; rock[o + tx] = c.rock[k + tx]; wet[o + tx] = c.wet[k + tx]; scrub[o + tx] = c.scrub[k + tx]; } }
  }
  // ground from the fields: sand, then scrub, then thicket, then water (the thicket's rim breaks into scrub clumps)
  for (let i = 0; i < N; i++) {
    if (rock[i] > 0.62) t[i] = TV.SAND;
    if (forest[i] > 0.68 && forest[i] <= 0.8 && scrub[i] > 0.15) t[i] = TV.SCRUB;
    if (forest[i] > 0.8) t[i] = TV.THICKET;
    if (wet[i] > 0.7) t[i] = TV.WATER;
  }
  dropPools(t, W, H);
  majority(t, W, H, 2); minFeature(t, W, H);
  // raised land from the levels: every tile on a level above the lowest; water lies only on the low ground
  const raised = new Uint8Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (raisedAt(seed, gx0 + x, gy0 + y)) { raised[y * W + x] = 1; t[y * W + x] = TV.CLIFF; }
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
  const paint = (x, y) => { for (let dy = -1; dy <= 2; dy++) for (let dx = -1; dx <= 2; dx++) { const X2 = x + dx, Y2 = y + dy; if (X2 < 0 || Y2 < 0 || X2 >= W || Y2 >= H) continue; const k = Y2 * W + X2, v = t[k], brush = dx >= 0 && dx <= 1 && dy >= 0 && dy <= 1; if (brush && v !== TV.WATER && v !== TV.THICKET && v !== TV.CLIFF) t[k] = TV.PATH; else if (!brush && (v === TV.SAND || v === TV.SCRUB || v === TV.EARTH)) t[k] = TV.GRASS; } };
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
  // with the legal pass (Rule 1.9), and no one-row gully stays under a raised edge
  for (let round = 0; round < 60; round++) {
    let changed = 0;
    { const before = t.slice(); minFeature(t, W, H, isCliff, isCliff, 4, true); for (let k = 0; k < N; k++) if (t[k] !== before[k]) changed++; }
    for (let sweep = 0, n = 1; n && sweep < 200; sweep++) {   // sweeps to a fixed point: a chain along a boundary is followed at once
      n = 0;
      for (let j = 0; j <= H; j++) for (let i = 0; i <= W; i++) {
        if (i > 0 && j > 0 && i < W && j < H) {   // the common case, a block inside the window that is one terrain or a legal pair, without allocating
          const k = j * W + i, v0 = t[k - W - 1], v1 = t[k - W], v2 = t[k - 1], v3 = t[k];
          if (v0 === v1 && v1 === v2 && v2 === v3) continue;
        }
        let a = -1, b = -1, three = false; const idx = [];
        for (const [x, y] of [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]]) if (x >= 0 && y >= 0 && x < W && y < H) { const k = y * W + x; idx.push(k); const v = t[k]; if (a < 0 || v === a) a = v; else if (b < 0 || v === b) b = v; else three = true; }
        if (b < 0 || (!three && pairOk(a, b))) continue;
        const vals = three ? [...new Set(idx.map(k => t[k]))] : [a, b], drop = vals.filter(v => v !== TV.GRASS).sort((p, q) => KEEP[p] - KEEP[q])[0];
        for (const k of idx) if (t[k] === drop) { t[k] = TV.GRASS; n++; }
      }
      changed += n;
    }
    for (let y = 0; y + 2 < H; y++) for (let x = 0; x < W; x++) if (t[y * W + x] === TV.CLIFF && t[(y + 1) * W + x] !== TV.CLIFF && t[(y + 2) * W + x] === TV.CLIFF) { t[(y + 1) * W + x] = TV.CLIFF; changed++; }
    if (!changed) changed += fillPockets(t, W, H, gx0, gy0, islands(S));
    if (!changed) break;
  }
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

// ground patches (Rule 1.6): the choice of the set's plain or one of its two swirl ground tiles for a full tile, by a noise field at world position
// (about 3 to 8 tiles a patch), never a per-tile repeat. Returns 0, 1 or 2 per dual tile of an area whose first dual tile is at world (x0, y0).
export function groundMix(seed, x0, y0, w1, h1) {
  const n = ctxOf(seed).nG, out = new Uint8Array(w1 * h1);
  for (let j = 0; j < h1; j++) for (let i = 0; i < w1; i++) { const v = n(x0 + i, y0 + j); out[j * w1 + i] = v < -0.18 ? 0 : v < 0.22 ? 1 : 2; }
  return out;
}

// the bake's IR for the tiles x0 .. x0 + w, y0 .. y0 + h of the world (window: whole cells, no apron needed on the picture's own border, which then clamps like any place's)
function irOf(seed, id, x0, y0, w, h, terrain, wayups) {
  return { origin: { x: x0, y: y0 }, seed, id, w, h, type: 'meadow', names: [], tileset: 'ninja-test', mirror: false, mood: '', terrain, props: [], decals: [], canopy: [], hearts: [], clues: [], finds: [], landmarks: [],
    openings: [], spawns: [], wayups, reedbanks: [], groundMix: groundMix(seed, x0, y0, w + 1, h + 1) };
}
// One cell for the bake: terrain with its one-tile apron.
export function cellIR(seed, X, Y) {
  const c = cellTerrain(seed, X, Y);
  return irOf(seed, `g7-${X}-${Y}`, c.x0, c.y0, c.w, c.h, c.terrain, c.wayups.map(a => ({ x: a.x - c.x0, y: a.y - c.y0, w: a.w, h: a.h })));
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
