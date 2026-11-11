// Generator 7, the terrain levels at tile scale. Pure: no page state, DOM, storage, clock or Math.random.
// One raised level (0 or 1). A tile's level is the world's elevation field read AT TILE SCALE and thresholded, so a cliff is the field's own contour line: it wanders, bends and
// rounds like natural land (owner, 2026-11-09 14:57: no level blocks). What is added to the field, all of it smooth:
//   - tile-scale detail: FBm noise, domain-warped (FastNoiseLite), at world tile coordinates;
//   - a pull toward each cell's own level round its centre, and round the middle of an edge between two cells of one level (round Gaussian bumps, never squares), so the cell's
//     level is a summary of the land and an open edge stays open. Where the field already agrees with the cells the pull changes nothing.
// Then the passes: opening and closing by 4 x 4 (nothing narrower than four tiles stays, so a cliff never ends in a spike, a notch or a one-tile ridge), and a nudge so that no
// cliff run lies along a cell edge (the rows and columns on either side of a cell edge are read from one sample, so a contour cannot run along it).
// The same function serves the region (which chooses each stair where this land has a straight south-facing face) and the place (which puts the way up there).
import FastNoiseLite from 'fastnoise-lite';
import { hash } from '../world.mjs';
import { RW, RH, CW, CH, fieldsAt } from './world.mjs';

export { CW, CH };
export const WTW = RW * CW, WTH = RH * CH;                // the realm in tiles
export const RAISE_OFF = 12;                               // the coast: raised land begins at least twelve tiles in from the border line (the inner face of the realm's outer ring of cells, which is water)
export const BORDER_X = CW, BORDER_Y = CH;                 // the border ring is one cell deep: its width in tiles on the west and east, its height on the north and south
// the tiles from the border line to the tile (gx, gy): 0 on the first walkable tile, negative inside the border ring and beyond the realm
export const inlandOf = (gx, gy) => Math.min(gx - BORDER_X, WTW - 1 - BORDER_X - gx, gy - BORDER_Y, WTH - 1 - BORDER_Y - gy);
const SIGMA = 6, FLAT = 5, DETAIL = 0.02, MARGIN = 0.05, KILL = FLAT + 3.2 * SIGMA, MIN_FEATURE = 4;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const N = CW * CH;

// ---- the fields at tile scale, per seed, per cell ----
const SEEDS = new Map();
function seedCtx(seed) {
  let S = SEEDS.get(seed); if (S) return S;
  const warp = new FastNoiseLite(hash(seed, 'gen7', 'lv-warp') | 0);
  warp.SetNoiseType(FastNoiseLite.NoiseType.OpenSimplex2); warp.SetFrequency(1 / 22); warp.SetDomainWarpType(FastNoiseLite.DomainWarpType.OpenSimplex2); warp.SetDomainWarpAmp(7);
  const det = new FastNoiseLite(hash(seed, 'gen7', 'lv-detail') | 0);
  det.SetNoiseType(FastNoiseLite.NoiseType.OpenSimplex2); det.SetFrequency(1 / 9); det.SetFractalType(FastNoiseLite.FractalType.FBm); det.SetFractalOctaves(2); det.SetFractalGain(0.5);
  S = { seed, at: fieldsAt(seed), warp, det, cells: new Map() };
  if (SEEDS.size > 3) SEEDS.clear();
  SEEDS.set(seed, S); return S;
}
// the five-field sample of each tile of a cell (24 x 28), at the tile's centre in cell units (a cell's centre is its integer coordinate); `detail` is the warped FBm at the tile
export function tileFields(seed, X, Y) {
  const S = seedCtx(seed), key = (X + 8) * 1000 + (Y + 8), hit = S.cells.get(key); if (hit) return hit;
  const height = new Float32Array(N), wild = new Float32Array(N), rock = new Float32Array(N), detail = new Float32Array(N), c = { x: 0, y: 0 };
  for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CW; tx++) {
    const gx = X * CW + tx, gy = Y * CH + ty, k = ty * CW + tx, f = S.at((gx + 0.5) / CW - 0.5, (gy + 0.5) / CH - 0.5);
    height[k] = f.height; wild[k] = f.wildness; rock[k] = f.rockiness;
    c.x = gx; c.y = gy; S.warp.DomainWrap(c); detail[k] = S.det.GetNoise(c.x, c.y);
  }
  const out = { height, wild, rock, detail };
  if (S.cells.size > 3000) S.cells.clear();
  S.cells.set(key, out); return out;
}

// ---- the levels of one realm (a realm is the object buildRealm made) ----
const LEVELS = new WeakMap();
export function levelsOf(realm) {
  let L = LEVELS.get(realm); if (L) return L;
  L = { realm, seed: realm.seed, q: new Map(), cells: new Map(), wayups: new Map(), pull: new Map() };
  LEVELS.set(realm, L); return L;
}
export const forgetLevels = realm => LEVELS.delete(realm);   // the realm's cells changed (the coast): its tile levels are read again
const cellIdx = (X, Y) => clamp(Y, 0, RH - 1) * RW + clamp(X, 0, RW - 1);
const inRealm = (X, Y) => X >= 0 && Y >= 0 && X < RW && Y < RH;

// The pull's anchors round a cell: the centre of each cell near it, and the middle of each edge between two of them that have one level. An anchor pulls only as much as the field
// needs: by the amount the field's own height at that spot falls short of the cell's level (with a small margin), so where the field already agrees nothing is added.
// the coast: the raised land fades out over the last RIM tiles to the border line (a straight cliff cut along the coast would be a long wall), so it tapers like any land
const RIM = 22, RIM_PULL = 0.35;
const rimBias = (px, py) => { const d = Math.min(px - BORDER_X, WTW - BORDER_X - px, py - BORDER_Y, WTH - BORDER_Y - py); return d >= RIM ? 0 : -RIM_PULL * Math.min(1, (RIM - d) / (RIM - RAISE_OFF)); };
function anchorStrength(L, key, u, v, e0, sign, px, py) {
  let s = L.pull.get(key); if (s !== undefined) return s;
  const S = seedCtx(L.seed), base = S.at(u, v).height - e0 + rimBias(px, py);
  s = Math.max(0, MARGIN - sign * base);
  L.pull.set(key, s); return s;
}
function anchorsAround(L, X, Y) {
  const realm = L.realm, out = [], lv = (x, y) => realm.level[cellIdx(x, y)], e0 = realm.e0;
  // each anchor sits up to 2.5 tiles off its spot (by a hash of the world position), so a line of cells the field disagrees with does not make a straight wall
  const add = (px, py, u, v, ee, sg, key, kind) => {
    const s = anchorStrength(L, key, u, v, ee, sg, px, py); if (!(s > 0)) return;
    const h = hash(L.seed, 'gen7', 'anchor', Math.round(px), Math.round(py), kind);
    out.push([px + ((h % 11) - 5) * 0.5, py + (((h >>> 8) % 11) - 5) * 0.5, sg * s]);
  };
  for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) {
    const x = X + i, y = Y + j; if (!inRealm(x, y)) continue;
    const sg = lv(x, y) ? 1 : -1;
    add(x * CW + CW / 2, y * CH + CH / 2, x, y, e0[cellIdx(x, y)], sg, 'c' + x + ',' + y, 0);
    if (i < 2 && inRealm(x + 1, y) && lv(x, y) === lv(x + 1, y)) add((x + 1) * CW, y * CH + CH / 2, x + 0.5, y, 0.5 * (e0[cellIdx(x, y)] + e0[cellIdx(x + 1, y)]), sg, 'e' + x + ',' + y, 1);
    if (j < 2 && inRealm(x, y + 1) && lv(x, y) === lv(x, y + 1)) add(x * CW + CW / 2, (y + 1) * CH, x, y + 0.5, 0.5 * (e0[cellIdx(x, y)] + e0[cellIdx(x, y + 1)]), sg, 's' + x + ',' + y, 2);
  }
  return out;
}
// q of the tiles of a cell: height above the cell's raising height, plus detail and the pull; a tile is raised where q >= 0
function qCell(L, X, Y) {
  const key = (X + 8) * 1000 + (Y + 8), hit = L.q.get(key); if (hit) return hit;
  const realm = L.realm, f = tileFields(L.seed, X, Y), q = new Float32Array(N), anchors = anchorsAround(L, X, Y), e0 = realm.e0, k2 = 1 / (2 * SIGMA * SIGMA), kill2 = KILL * KILL;
  for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CW; tx++) {
    const gx = X * CW + tx, gy = Y * CH + ty, k = ty * CW + tx, u = (gx + 0.5) / CW - 0.5, v = (gy + 0.5) / CH - 0.5, X0 = Math.floor(u), Y0 = Math.floor(v), a = u - X0, b = v - Y0;
    const e = e0[cellIdx(X0, Y0)] * (1 - a) * (1 - b) + e0[cellIdx(X0 + 1, Y0)] * a * (1 - b) + e0[cellIdx(X0, Y0 + 1)] * (1 - a) * b + e0[cellIdx(X0 + 1, Y0 + 1)] * a * b;
    const px = gx + 0.5, py = gy + 0.5;
    let s = f.height[k] - e + DETAIL * f.detail[k] + rimBias(px, py);
    for (const [ax, ay, sg] of anchors) {   // a round bump: full strength within FLAT tiles of the anchor, a Gaussian skirt beyond
      const dx = px - ax, dy = py - ay, d2 = dx * dx + dy * dy; if (d2 >= kill2) continue;
      if (d2 <= FLAT * FLAT) s += sg; else { const d = Math.sqrt(d2) - FLAT; s += sg * Math.exp(-d * d * k2); }
    }
    q[k] = s;
  }
  if (L.q.size > 3000) L.q.clear();
  L.q.set(key, q); return q;
}

// ---- passes on a binary raster ----
// erosion by a k x k square, separable: a tile stays when the square whose top-left tile it is lies wholly inside; the raster's rim is read as itself (replicated)
function erode(R, W, H, k) {
  const T = new Uint8Array(W * H), O = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = 1; for (let d = 0; d < k; d++) if (!R[y * W + Math.min(x + d, W - 1)]) { v = 0; break; } T[y * W + x] = v; }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = 1; for (let d = 0; d < k; d++) if (!T[Math.min(y + d, H - 1) * W + x]) { v = 0; break; } O[y * W + x] = v; }
  return O;
}
// dilation by the same square: every tile the squares of the kept top-left tiles cover
function dilate(R, W, H, k) {
  const T = new Uint8Array(W * H), O = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = 0; for (let d = 0; d < k; d++) if (R[y * W + Math.max(x - d, 0)]) { v = 1; break; } T[y * W + x] = v; }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = 0; for (let d = 0; d < k; d++) if (T[Math.max(y - d, 0) * W + x]) { v = 1; break; } O[y * W + x] = v; }
  return O;
}
// opening leaves everything a k x k square fits in; closing is the opening of what is low
function open(R, W, H, k) { return dilate(erode(R, W, H, k), W, H, k); }
function close(R, W, H, k) { const inv = R.map(v => 1 - v); return open(inv, W, H, k).map(v => 1 - v); }

// ---- the levels of one cell ----
// The raster is the cell with a cell's width round it; what the passes do at the raster's rim stays in the ring, so the cell is the same from every neighbour's window.
function windowLevels(L, X, Y) {
  const W = 3 * CW, H = 3 * CH, q = new Float32Array(W * H);
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
    const c = qCell(L, X - 1 + i, Y - 1 + j);
    for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CW; tx++) q[(j * CH + ty) * W + i * CW + tx] = c[ty * CW + tx];
  }
  // The rows and columns on either side of a cell edge are read from one sample (their mean), and the passes below run on the raster with the second row of each such pair taken
  // out (and the second column), then it is put back by repeating the first. So the two sides of a cell edge are the same level at every tile: a contour can cross a cell edge but
  // never run along one. A feature of 4 tiles in the reduced raster is 4 or 5 in the window, so nothing is narrower than 4.
  for (let j = 1; j < 3; j++) { const y = j * CH; for (let x = 0; x < W; x++) { const m = 0.5 * (q[(y - 1) * W + x] + q[y * W + x]); q[(y - 1) * W + x] = m; q[y * W + x] = m; } }
  for (let i = 1; i < 3; i++) { const x = i * CW; for (let y = 0; y < H; y++) { const m = 0.5 * (q[y * W + x - 1] + q[y * W + x]); q[y * W + x - 1] = m; q[y * W + x] = m; } }
  const W2 = W - 2, H2 = H - 2, rr = y => y - (y >= CH ? 1 : 0) - (y >= 2 * CH ? 1 : 0), cc = x => x - (x >= CW ? 1 : 0) - (x >= 2 * CW ? 1 : 0);
  let cur = new Uint8Array(W2 * H2);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) cur[rr(y) * W2 + cc(x)] = q[y * W + x] >= 0 ? 1 : 0;
  for (let pass = 0; pass < 4; pass++) {   // nothing narrower than four tiles, raised or low; a few rounds, for the two operators can disturb each other
    const next = close(open(cur, W2, H2, MIN_FEATURE), W2, H2, MIN_FEATURE);
    let same = true; for (let k = 0; k < W2 * H2; k++) if (next[k] !== cur[k]) { same = false; break; }
    cur = next; if (same) break;
  }
  cur = open(cur, W2, H2, MIN_FEATURE);   // where the two never settle, a closing can leave a patch of raised land under 4 wide: end on the opening, so raised land never is
  const R = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) R[y * W + x] = cur[rr(y) * W2 + cc(x)];
  dropSmall(L, R, W, H, X - 1, Y - 1);
  return { R, W, H };
}
// A level region of under SMALL tiles that does not reach the raster's rim and holds no cell's centre of its own level (a hill, or a hollow, that the cells do not know of) joins what
// rings it: nothing on it could be reached by a stair, and a hill of a handful of tiles is no cliff worth drawing.
const SMALL = 100;
function dropSmall(L, R, W, H, cx0, cy0) {
  const seen = new Uint8Array(W * H), q = new Int32Array(W * H), lab = (x, y) => { const X = cx0 + Math.floor(x / CW), Y = cy0 + Math.floor(y / CH); return inRealm(X, Y) ? L.realm.level[Y * RW + X] : -1; };
  for (let s = 0; s < W * H; s++) {
    if (seen[s]) continue;
    const v = R[s]; let n = 0, edge = false, pinned = false; q[n++] = s; seen[s] = 1;
    for (let h = 0; h < n; h++) {
      const c = q[h], x = c % W, y = (c / W) | 0;
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1) edge = true;
      if (x % CW === CW / 2 && y % CH === CH / 2 && lab(x, y) === v) pinned = true;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = x + dx, b = y + dy; if (a < 0 || b < 0 || a >= W || b >= H) continue; const m = b * W + a; if (!seen[m] && R[m] === v) { seen[m] = 1; q[n++] = m; } }
    }
    if (n < SMALL && !edge && !pinned) for (let h = 0; h < n; h++) R[q[h]] = 1 - v;
  }
}
// a cell's tile levels, 24 x 28 values (0 outside the realm)
export function levelCell(L, X, Y) {
  const key = (X + 8) * 1000 + (Y + 8), hit = L.cells.get(key); if (hit) return hit;
  let out = new Uint8Array(N);
  if (inRealm(X, Y)) { const w = windowLevels(L, X, Y); for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CW; tx++) out[ty * CW + tx] = w.R[(CH + ty) * w.W + CW + tx]; }
  if (L.cells.size > 4000) L.cells.clear();
  L.cells.set(key, out); return out;
}

// a world tile's level (0 at and beyond the realm's rim)
export function tileLevel(L, gx, gy) {
  if (gx < 0 || gy < 0 || gx >= WTW || gy >= WTH) return 0;
  const X = Math.floor(gx / CW), Y = Math.floor(gy / CH);
  return levelCell(L, X, Y)[(gy - Y * CH) * CW + gx - X * CW];
}
// raised land: level 1, and at least RAISE_OFF tiles from the border line
export const raised = (L, gx, gy) => inlandOf(gx, gy) >= RAISE_OFF && tileLevel(L, gx, gy) >= 1;

// ---- the way up: on a straight south-facing face, nearest the stair's port ----
// The stair on the edge between the cell A = (ax, ay) and the cell south of it, A being the higher. A way up is 2 tiles wide with one tile each side; the face runs straight at
// its row, the raised land above is at least 3 tiles deep, and the 4 rows below stay open ground. Nothing is carved. Returns { x, y, w, h } in world tiles, or null.
// This is the one face test: the region chooses a stair only where it finds a face, and the place puts the way up on it.
export function findWayup(L, ax, ay, port) {
  const key = ax * 1000 + ay, hit = L.wayups.get(key); if (hit !== undefined) return hit;
  const R = (x, y) => raised(L, x, y), px = ax * CW + port, py = (ay + 1) * CH;
  const face = (x, y) => R(x, y) && !R(x, y + 1) && !R(x, y + 2) && !R(x, y + 3) && R(x, y - 1) && R(x, y - 2);
  let best = null, bd = 61;
  for (let y = ay * CH + 10; y <= (ay + 1) * CH + 6; y++) for (let x = ax * CW + 2; x <= ax * CW + CW - 5; x++) {
    if (![-1, 0, 1, 2].every(dx => face(x + dx, y))) continue;
    const d = Math.abs(x - px) + Math.abs(y - py); if (d < bd) { bd = d; best = { x, y, w: 2, h: 1 }; }
  }
  L.wayups.set(key, best); return best;
}
