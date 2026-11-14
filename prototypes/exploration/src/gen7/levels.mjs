// Generator 7, the terrain levels at tile scale. Pure: no page state, DOM, storage, clock or Math.random.
// The land rule (spec land-shape-spec-1): the cliff is the contour of one whole-number noise field, never a bin, a pull or a ruler.
//   q = macro + detail * D + coast   (macro: the realm's height minus its raising height read at tile scale; detail: warped gradient noise at 4 to 32 tiles; coast: the ramp to the border)
// Terrace levels: a tile's level is the number of the rule's thresholds (land-rule.json `levels`, one entry now: [0]) that its q reaches. Every pass runs per boundary between level k and k+1,
// on the raster "level above k", never on "raised vs low", so more heights are data (a longer list), not a rewrite. Level 0 is the low ground; `raised` means level 1 or more.
// Then the passes P1 to P6: threshold; opening and closing by a rounded element; small hills and hollows; no diagonal pinch; no lone one-tile face; foot room under every lip.
// The same function serves the region (which chooses each stair where this land has a way-up site) and the place (which puts the way up there).
import { hash2, subSeed, fbm, warp } from '../../../core/base/noise.mjs';
import { div, shr } from '../../../core/base/whole.mjs';
import RULE from './land-rule.json' with { type: 'json' };
import { RW, RH, CW, CH, fieldsAt } from './world.mjs';

export { CW, CH };
export const WTW = RW * CW, WTH = RH * CH;                // the realm in tiles
export const RAISE_OFF = 12;                               // the coast: raised land begins at least twelve tiles in from the border line (the inner face of the realm's outer ring of cells, which is water)
export const BORDER_X = CW, BORDER_Y = CH;                 // the border ring is one cell deep: its width in tiles on the west and east, its height on the north and south
// the tiles from the border line to the tile (gx, gy): 0 on the first walkable tile, negative inside the border ring and beyond the realm
export const inlandOf = (gx, gy) => Math.min(gx - BORDER_X, WTW - 1 - BORDER_X - gx, gy - BORDER_Y, WTH - 1 - BORDER_Y - gy);
const N = CW * CH;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// ---- the rule's numbers (data) ----
// detail amplitude D (Q16 of the height), warp reach (tiles), minimum feature (4 or 5 tiles), face height (rows of the south face: 3, or 2), the thresholds of the levels (Q16 of q)
let RULE_NOW = { ...RULE };
export const landRule = () => RULE_NOW;
// a changed rule (the measure tool and the stills): every realm's levels are read again
export function setLandRule(over) { RULE_NOW = { ...RULE, ...over }; GEN++; }
let GEN = 0;

// ---- the fields at tile scale, per seed, per cell ----
const SEEDS = new Map();
function seedCtx(seed) {
  let S = SEEDS.get(seed); if (S) return S;
  S = { seed, at: fieldsAt(seed), cells: new Map() };
  if (SEEDS.size > 3) SEEDS.clear();
  SEEDS.set(seed, S); return S;
}
// the three-field sample of each tile of a cell (24 x 28), at the tile's centre in cell units (a cell's centre is its integer coordinate)
export function tileFields(seed, X, Y) {
  const S = seedCtx(seed), key = (X + 8) * 1000 + (Y + 8), hit = S.cells.get(key); if (hit) return hit;
  const height = new Float32Array(N), wild = new Float32Array(N), rock = new Float32Array(N);
  for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CW; tx++) {
    const gx = X * CW + tx, gy = Y * CH + ty, k = ty * CW + tx, f = S.at((gx + 0.5) / CW - 0.5, (gy + 0.5) / CH - 0.5);
    height[k] = f.height; wild[k] = f.wildness; rock[k] = f.rockiness;
  }
  const out = { height, wild, rock };
  if (S.cells.size > 3000) S.cells.clear();
  S.cells.set(key, out); return out;
}

// ---- the levels of one realm (a realm is the object buildRealm made) ----
const LEVELS = new WeakMap();
export function levelsOf(realm) {
  let L = LEVELS.get(realm); if (L && L.gen === GEN) return L;
  const e0q = new Int32Array(RW * RH); for (let i = 0; i < RW * RH; i++) e0q[i] = Math.round(realm.e0[i] * 65536);   // the realm's raising height, rounded once to Q16
  L = { realm, seed: realm.seed, gen: GEN, rule: RULE_NOW, e0q, q: new Map(), cells: new Map(), wayups: new Map() };
  LEVELS.set(realm, L); return L;
}
export const forgetLevels = realm => LEVELS.delete(realm);   // the realm's cells changed (the coast): its tile levels are read again
const cellIdx = (X, Y) => clamp(Y, 0, RH - 1) * RW + clamp(X, 0, RW - 1);
const inRealm = (X, Y) => X >= 0 && Y >= 0 && X < RW && Y < RH;

// ---- the coast: the raised land fades out over the last RIM tiles to the border line (a cliff cut along the coast would be a long wall) ----
// The ramp's distance wanders along the coast by up to RIM_WOBBLE tiles (a hash knot every RIM_KNOT tiles, per side, an integer smoothstep between), so no contour runs parallel to the shore.
const RIM = 22, RIM_WOBBLE = 7, RIM_KNOT = 18, RAMP = 23000;   // RAMP: the pull at RAISE_OFF, Q16 (0.35)
function rimWobbleQ8(seed, side, s) {   // Q8 tiles, -RIM_WOBBLE .. RIM_WOBBLE
  const i = Math.floor(s / RIM_KNOT), f = div((s - i * RIM_KNOT) * 65536, RIM_KNOT), sm = shr(f * f * (196608 - 2 * f), 32);
  const k = j => (hash2(j, side, seed) % 2049) - 1024;   // -1024 .. 1024
  return shr((k(i) * (65536 - sm) + k(i + 1) * sm) * RIM_WOBBLE * 256, 26);   // k / 1024 of the wobble, Q8
}
function coastQ16(seed, gx, gy) {
  const dW = gx - BORDER_X, dE = WTW - 1 - BORDER_X - gx, dN = gy - BORDER_Y, dS = WTH - 1 - BORDER_Y - gy, m = Math.min(dW, dE, dN, dS);
  if (m >= RIM + RIM_WOBBLE) return 0;
  const sd = subSeed(seed, 'rim-wobble');
  const w = m === dW ? rimWobbleQ8(sd, 0, gy) : m === dE ? rimWobbleQ8(sd, 1, gy) : m === dN ? rimWobbleQ8(sd, 2, gx) : rimWobbleQ8(sd, 3, gx);
  const d = m * 256 + w; if (d >= RIM * 256) return 0;
  return -div((RIM * 256 - Math.max(d, RAISE_OFF * 256)) * RAMP, (RIM - RAISE_OFF) * 256);
}

// q of the tiles of a cell (Q16): the realm's height above its raising height (bilinear in the cells' centres, whole-number weights over 2 CW and 2 CH), the warped detail, the coast
export function qCell(L, X, Y) {
  const key = (X + 8) * 1000 + (Y + 8), hit = L.q.get(key); if (hit) return hit;
  const S = seedCtx(L.seed), q = new Int32Array(N), D = L.rule.detail, reach = L.rule.warpReach, wob = L.rule.wobbleReach, ws = L.rule.wobbleSpacing, wo = L.rule.wobbleOctaves, st = L.rule.wobbleStretch, e0q = L.e0q, sD = subSeed(L.seed, 'land'), sW = subSeed(L.seed, 'land-wobble'), W2 = 2 * CW, H2 = 2 * CH;
  const sWx = subSeed(sW, 'x'), sWy = subSeed(sW, 'y'), sDet = subSeed(sD, 'detail');
  for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CW; tx++) {
    const gx = X * CW + tx, gy = Y * CH + ty, k = ty * CW + tx, px = 256 * gx + 128, py = 256 * gy + 128;
    // the position the land is read at: moved by the coarse warp (32 and 16 tile noise, up to `reach` tiles) and the fine wobble (8 and 4 tile noise, up to `wob` tiles), in Q8 tiles.
    // The macro height and its raising height are read there too, so the contour itself bends and wobbles by that many tiles, however steep the land is.
    const w = warp(px, py, sD, reach), wx = w.x + shr(fbm(px, st * py, ws, wo, sWx) * wob, 8), wy = w.y + shr(fbm(st * px, py, ws, wo, sWy) * wob, 8);
    const un = 2 * gx + 1 - CW + shr(wx, 7), vn = 2 * gy + 1 - CH + shr(wy, 7), X0 = Math.floor(un / W2), Y0 = Math.floor(vn / H2), a = un - X0 * W2, b = vn - Y0 * H2;
    const e = div(e0q[cellIdx(X0, Y0)] * (W2 - a) * (H2 - b) + e0q[cellIdx(X0 + 1, Y0)] * a * (H2 - b) + e0q[cellIdx(X0, Y0 + 1)] * (W2 - a) * b + e0q[cellIdx(X0 + 1, Y0 + 1)] * a * b, W2 * H2);
    const h = S.at((un + CW) / W2 - 0.5, (vn + CH) / H2 - 0.5).height, macro = Math.round(h * 65536) - e;
    q[k] = macro + shr(fbm(px + wx, py + wy, 5, 4, sDet) * D, 16) + coastQ16(L.seed, gx, gy);
  }
  if (L.q.size > 3000) L.q.clear();
  L.q.set(key, q); return q;
}

// ---- passes on a binary raster ----
const at = (r, W, H, x, y) => r[clamp(y, 0, H - 1) * W + clamp(x, 0, W - 1)];
// the rounded element: an m x m square without its four corner tiles, anchored at its top-left
const ELEMS = new Map();
function elemOf(m) {
  let E = ELEMS.get(m); if (E) return E;
  E = []; for (let j = 0; j < m; j++) for (let i = 0; i < m; i++) if (!((i === 0 || i === m - 1) && (j === 0 || j === m - 1))) E.push([i, j]);
  ELEMS.set(m, E); return E;
}
function erode(r, W, H, E) { const o = new Uint8Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = 1; for (const [i, j] of E) if (!at(r, W, H, x + i, y + j)) { v = 0; break; } o[y * W + x] = v; } return o; }
function dilate(r, W, H, E) { const o = new Uint8Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = 0; for (const [i, j] of E) if (at(r, W, H, x - i, y - j)) { v = 1; break; } o[y * W + x] = v; } return o; }
const open = (r, W, H, E) => dilate(erode(r, W, H, E), W, H, E);
const close = (r, W, H, E) => open(r.map(v => 1 - v), W, H, E).map(v => 1 - v);
const same = (a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; };
const hasLip = (r, W, H, x, y) => at(r, W, H, x, y) === 1 && at(r, W, H, x, y + 1) === 0;

// P4, P5, P6, repeated until nothing changes (at most 8 rounds)
function fixPatterns(r0, W, H, faceRows) {
  const r = r0.slice();
  for (let round = 0; round < 8; round++) {
    let changed = 0;
    // P4: no diagonal pinch (2 x 2 cases 6 and 9): the two low tiles are raised
    for (let y = 0; y + 1 < H; y++) for (let x = 0; x + 1 < W; x++) {
      const a = r[y * W + x], b = r[y * W + x + 1], c = r[(y + 1) * W + x], d = r[(y + 1) * W + x + 1];
      if (a === d && b === c && a !== b) { if (!a) { r[y * W + x] = 1; r[(y + 1) * W + x + 1] = 1; } else { r[y * W + x + 1] = 1; r[(y + 1) * W + x] = 1; } changed++; }
    }
    // P5: a south lip tile alone in its row's run, with no lip tile diagonally beside it (no bend, no jog), gets the tile below it raised
    const lip = (x, y) => hasLip(r, W, H, x, y);
    for (let y = 1; y + 2 < H; y++) for (let x = 1; x + 1 < W; x++) {
      if (!lip(x, y) || lip(x - 1, y) || lip(x + 1, y)) continue;
      if (lip(x - 1, y - 1) || lip(x + 1, y - 1) || lip(x - 1, y + 1) || lip(x + 1, y + 1)) continue;
      r[(y + 1) * W + x] = 1; changed++;
    }
    // P6: foot room: under every south lip the first faceRows + 1 tiles down are low; a raised tile within them fills the gap up to it
    for (let y = 0; y + faceRows + 1 < H; y++) for (let x = 0; x < W; x++) {
      if (!lip(x, y)) continue;
      for (let k = 2; k <= faceRows + 1; k++) if (r[(y + k) * W + x]) { for (let j = 1; j < k; j++) r[(y + j) * W + x] = 1; changed++; break; }
    }
    if (!changed) break;
  }
  return r;
}
// P3: a hill or hollow under 100 tiles that does not reach the window's rim takes the level of what rings it
function dropSmall(R, W, H) {
  const seen = new Uint8Array(W * H), q = new Int32Array(W * H);
  for (let s = 0; s < W * H; s++) {
    if (seen[s]) continue;
    const v = R[s]; let n = 0, edge = false; q[n++] = s; seen[s] = 1;
    for (let k = 0; k < n; k++) {
      const c = q[k], x = c % W, y = (c / W) | 0;
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1) edge = true;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = x + dx, b = y + dy; if (a < 0 || b < 0 || a >= W || b >= H) continue; const m = b * W + a; if (!seen[m] && R[m] === v) { seen[m] = 1; q[n++] = m; } }
    }
    if (n < 100 && !edge) for (let k = 0; k < n; k++) R[q[k]] = 1 - v;
  }
}
// P1 to P6 on one boundary's raster
function cleanup(r0, W, H, rule) {
  const E = elemOf(rule.minFeature); let r = r0;
  for (let pass = 0; pass < 6; pass++) {
    const n = fixPatterns(close(open(r, W, H, E), W, H, E), W, H, rule.faceRows), done = same(n, r);
    r = n; if (done) break;
  }
  r = fixPatterns(open(r, W, H, E), W, H, rule.faceRows);
  dropSmall(r, W, H);
  return fixPatterns(r, W, H, rule.faceRows);
}

// ---- the levels of one cell ----
// The raster is the cell with a cell's width round it; what the passes do at the raster's rim stays in the ring, so the cell is the same from every neighbour's window.
export function windowLevels(L, X, Y) {
  const WR = L.rule.window, W = (2 * WR + 1) * CW, H = (2 * WR + 1) * CH, q = new Int32Array(W * H), th = L.rule.levels;
  for (let j = 0; j <= 2 * WR; j++) for (let i = 0; i <= 2 * WR; i++) {
    const c = qCell(L, X - WR + i, Y - WR + j);
    for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CW; tx++) q[(j * CH + ty) * W + i * CW + tx] = c[ty * CW + tx];
  }
  // one raster per boundary (level above k), each cleaned on its own; a higher level lies inside the lower one
  const out = new Uint8Array(W * H); let below = null;
  for (let k = 0; k < th.length; k++) {
    let r = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) r[i] = q[i] >= th[k] && (!below || below[i]) ? 1 : 0;
    r = cleanup(r, W, H, L.rule);
    if (below) for (let i = 0; i < W * H; i++) r[i] &= below[i];
    for (let i = 0; i < W * H; i++) out[i] += r[i];
    below = r;
  }
  return { R: out, W, H };
}
// a cell's tile levels, 24 x 28 values (0 outside the realm)
export function levelCell(L, X, Y) {
  const key = (X + 8) * 1000 + (Y + 8), hit = L.cells.get(key); if (hit) return hit;
  const out = new Uint8Array(N);
  if (inRealm(X, Y)) { const w = windowLevels(L, X, Y), o = L.rule.window; for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CW; tx++) out[ty * CW + tx] = w.R[(o * CH + ty) * w.W + o * CW + tx]; }
  if (L.cells.size > 4000) L.cells.clear();
  L.cells.set(key, out); return out;
}
// the cell's level as the map and the region read it: the level of q at the cell's centre tile. One sample, no passes
export function cellSummary(L, X, Y) {
  if (!inRealm(X, Y)) return 0;
  const q = qCell(L, X, Y)[(CH >> 1) * CW + (CW >> 1)]; let n = 0;
  for (const t of L.rule.levels) if (q >= t) n++;
  return n;
}

// a world tile's level (0 at and beyond the realm's rim)
export function tileLevel(L, gx, gy) {
  if (gx < 0 || gy < 0 || gx >= WTW || gy >= WTH) return 0;
  const X = Math.floor(gx / CW), Y = Math.floor(gy / CH);
  return levelCell(L, X, Y)[(gy - Y * CH) * CW + gx - X * CW];
}
// raised land: level 1 or more, and at least RAISE_OFF tiles from the border line
export const raised = (L, gx, gy) => inlandOf(gx, gy) >= RAISE_OFF && tileLevel(L, gx, gy) >= 1;

// ---- the way up: on a site of the land's own contour, nearest the stair's port ----
// The stair on the edge between the cell A = (ax, ay) and the cell south of it, A being the higher. A way up is 2 tiles wide, and its site has: two south-lip tiles side by side on one row;
// 3 raised rows above both (the landing); faceRows + 1 low rows below both (the foot); and on each side a lip tile on the same row (a straight flank) or one row off (a bend).
// Nothing is carved. Returns { x, y, w, h } in world tiles, or null. `k` is the boundary (level k below, k + 1 above): 0 now.
// This is the one site test: the region chooses a stair only where it finds a site, and the place puts the way up there.
export function findWayup(L, ax, ay, port, k = 0) {
  const key = ax * 1000 + ay + (k ? k * 1e7 : 0), hit = L.wayups.get(key); if (hit !== undefined) return hit;
  const R = (x, y) => (inlandOf(x, y) >= RAISE_OFF && tileLevel(L, x, y) > k), foot = L.rule.faceRows + 1, px = ax * CW + port, py = (ay + 1) * CH;
  const lip = (x, y) => R(x, y) && !R(x, y + 1);
  const flank = (x, y) => lip(x, y) || lip(x, y - 1) || lip(x, y + 1);
  let best = null, bd = 61;
  for (let y = ay * CH + 10; y <= (ay + 1) * CH + 6; y++) for (let x = ax * CW + 2; x <= ax * CW + CW - 5; x++) {
    if (!lip(x, y) || !lip(x + 1, y)) continue;
    let ok = true;
    for (let j = 1; j <= 3 && ok; j++) ok = R(x, y - j) && R(x + 1, y - j);
    for (let j = 1; j <= foot && ok; j++) ok = !R(x, y + j) && !R(x + 1, y + j);
    if (!ok || !flank(x - 1, y) || !flank(x + 2, y)) continue;
    const d = Math.abs(x - px) + Math.abs(y - py); if (d < bd) { bd = d; best = { x, y, w: 2, h: 1 }; }
  }
  L.wayups.set(key, best); return best;
}
