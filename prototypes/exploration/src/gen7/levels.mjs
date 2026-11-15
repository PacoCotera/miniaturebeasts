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
import { RW, RH, CW, CH, fieldsAt, noiseField } from './world.mjs';
import { L as LAND } from '../world.mjs';

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
  L = { realm, seed: realm.seed, gen: GEN, rule: RULE_NOW, e0q, q: new Map(), wet: new Map(), cells: new Map(), wayups: new Map(), pk: new Map(), stairs: new Map() };
  for (const s of realm.stairs || []) L.stairs.set(s.X * 1000 + s.Y, { ...s });   // the realm's stairs: each gets its held-straight site before the passes
  LEVELS.set(realm, L); return L;
}
// the realm's stairs (region.mjs attachStairs): [{ X, Y, port }] on the edge between the cell (X, Y) and the one south of it
export const setStairs = (realm, list) => { realm.stairs = list; LEVELS.delete(realm); };
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

// ---- water held low (world-topdown-spec-1 3.2) ----
// The wet field place.mjs lays its water from (the realm's cell wetness, bilinear, plus its noise), read here without the place: a tile whose wet value is over WET_AT is water, and the field is
// held under the threshold on it and one tile round it before the passes, so raised land never meets water. The coast band (COAST_REACH tiles from the border) is laid whole elsewhere.
const WET_AT = 0.72, WET_NOISE = 0.22, WET_REACH = 14;
function wetCells(L) {
  if (L.wetC) return L.wetC;
  const { land, ford, M } = L.realm, w = new Float32Array(RW * RH);
  for (let c = 0; c < RW * RH; c++) w[c] = land[c] === LAND.WATER ? (ford[c] ? 0.8 : 1.05) : land[c] === LAND.POND ? 0.88 : 0.12 + 0.12 * M[c];
  return (L.wetC = w);
}
export function wetCell(L, X, Y) {   // one cell's 24 x 28 wet flags (1 = water)
  const key = (X + 8) * 1000 + (Y + 8); let hit = L.wet.get(key); if (hit) return hit;
  const S = seedCtx(L.seed), wc = wetCells(L), out = new Uint8Array(N); if (!S.nW) S.nW = noiseField(L.seed, 't-wet', 1 / 12, 'FBm', 2);
  for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CW; tx++) {
    const gx = X * CW + tx, gy = Y * CH + ty; if (inlandOf(gx, gy) < WET_REACH) continue;
    const u = (gx + 0.5) / CW - 0.5, v = (gy + 0.5) / CH - 0.5, X0 = Math.floor(u), Y0 = Math.floor(v), a = u - X0, b = v - Y0;
    const w = wc[cellIdx(X0, Y0)] * (1 - a) * (1 - b) + wc[cellIdx(X0 + 1, Y0)] * a * (1 - b) + wc[cellIdx(X0, Y0 + 1)] * (1 - a) * b + wc[cellIdx(X0 + 1, Y0 + 1)] * a * b;
    if (w + WET_NOISE * S.nW(gx, gy) > WET_AT) out[ty * CW + tx] = 1;
  }
  if (L.wet.size > 4000) L.wet.clear();
  L.wet.set(key, out); return out;
}

// ---- passes on a binary raster ----
const at = (r, W, H, x, y) => r[clamp(y, 0, H - 1) * W + clamp(x, 0, W - 1)];
// the rounded element: an m x m square without its four corner tiles, anchored at its top-left. It is two rectangles (m wide and m - 2 tall, m - 2 wide and m tall), so an erosion is the
// intersection of the two rectangles' erosions and a dilation the union of their dilations, each rectangle done one axis at a time (the raster's rim is read as itself, replicated).
const ELEMS = new Map();
function elemOf(m) {
  let E = ELEMS.get(m); if (E) return E;
  E = [[0, 1, m, m - 2], [1, 0, m - 2, m]];   // x0, y0, w, h of each rectangle
  ELEMS.set(m, E); return E;
}
function rectPass(r, W, H, x0, y0, w, h, all, flip) {   // all: erosion (every tile of the rectangle is raised); else dilation (any is); flip: the rectangle seen from the other side (dilation)
  const T = new Uint8Array(W * H), O = new Uint8Array(W * H), s = flip ? -1 : 1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = all ? 1 : 0; for (let i = 0; i < w; i++) { const t = r[y * W + clamp(x + s * (x0 + i), 0, W - 1)]; if (all ? !t : t) { v = all ? 0 : 1; break; } } T[y * W + x] = v; }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = all ? 1 : 0; for (let j = 0; j < h; j++) { const t = T[clamp(y + s * (y0 + j), 0, H - 1) * W + x]; if (all ? !t : t) { v = all ? 0 : 1; break; } } O[y * W + x] = v; }
  return O;
}
function erode(r, W, H, E) { const a = rectPass(r, W, H, ...E[0], true, false), b = rectPass(r, W, H, ...E[1], true, false); for (let i = 0; i < a.length; i++) a[i] &= b[i]; return a; }
function dilate(r, W, H, E) { const a = rectPass(r, W, H, ...E[0], false, true), b = rectPass(r, W, H, ...E[1], false, true); for (let i = 0; i < a.length; i++) a[i] |= b[i]; return a; }
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
// `lk`: the held tiles (1 = raised, 2 = low) of the stair sites: every pass leaves them as they are
const relock = (r, lk) => { if (lk) for (let i = 0; i < r.length; i++) if (lk[i]) r[i] = lk[i] === 1 ? 1 : 0; return r; };
function cleanup(r0, W, H, rule, lk) {
  const E = elemOf(rule.minFeature), fix = r => relock(fixPatterns(r, W, H, rule.faceRows), lk); let r = relock(r0.slice(), lk);
  for (let pass = 0; pass < 12; pass++) {
    const n = fix(relock(close(relock(open(r, W, H, E), lk), W, H, E), lk)), done = same(n, r);
    r = n; if (done) break;
  }
  r = fix(relock(close(relock(open(r, W, H, E), lk), W, H, E), lk));   // end on the opening, then one closing: no raised land narrower than the feature, and nothing the closing leaves low is narrower either
  dropSmall(r, W, H); relock(r, lk);
  r = fix(r);
  // what the foot-room and lone-lip passes can leave: a one-tile sliver (a tile with no 2 x 2 block of its own level) is flipped to what rings it, and a face of 2+ tiles ending square against a side wall
  // 3 rows high loses its last lip tile (the end becomes a step); then the patterns are fixed again; at most 4 rounds
  for (let round = 0; round < 8; round++) {
    const lip = (x, y) => hasLip(r, W, H, x, y); let changed = 0; const flip = [];
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const v = r[y * W + x]; let ok = false;
      for (let oy = -1; oy <= 0 && !ok; oy++) for (let ox = -1; ox <= 0 && !ok; ox++) ok = r[(y + oy) * W + x + ox] === v && r[(y + oy) * W + x + ox + 1] === v && r[(y + oy + 1) * W + x + ox] === v && r[(y + oy + 1) * W + x + ox + 1] === v;
      if (!ok) flip.push(y * W + x);
    }
    for (let y = 3; y < H - 2; y++) for (let x = 1; x < W - 1; x++) if (lip(x, y)) for (const dx of [-1, 1]) {
      if (lip(x + dx, y) || !lip(x - dx, y)) continue;
      if (!r[y * W + x + dx] && !r[(y - 1) * W + x + dx] && !r[(y - 2) * W + x + dx]) flip.push(y * W + x);
    }
    for (const i of flip) { if (lk && lk[i]) continue; r[i] = 1 - r[i]; changed++; }
    if (!changed) break;
    r = fix(r);
  }
  return r;
}

// ---- the local checks, for an edit: the same shapes land-measure counts (lone face, pinch, square corner, 1-tile sliver, foot room) at one tile ----
const DBGV = []; export const dbgV = DBGV;
function violAt(r, W, H, x, y, fr) {
  const R = (a, b) => (a < 0 || b < 0 || a >= W || b >= H ? 0 : r[b * W + a]), lip = (a, b) => R(a, b) === 1 && R(a, b + 1) === 0; let n = 0;
  const v = R(x, y); let ok = false;
  for (let oy = -1; oy <= 0 && !ok; oy++) for (let ox = -1; ox <= 0 && !ok; ox++) ok = R(x + ox, y + oy) === v && R(x + ox + 1, y + oy) === v && R(x + ox, y + oy + 1) === v && R(x + ox + 1, y + oy + 1) === v;
  if (!ok) { n++; DBGV.push("sliver"); }
  { const c = R(x, y) * 8 + R(x + 1, y) * 4 + R(x, y + 1) * 2 + R(x + 1, y + 1); if (c === 6 || c === 9) { n++; DBGV.push("pinch"); } }
  if (lip(x, y)) {
    if (!lip(x - 1, y) && !lip(x + 1, y) && !(lip(x - 1, y - 1) || lip(x + 1, y - 1) || lip(x - 1, y + 1) || lip(x + 1, y + 1))) { n++; DBGV.push("lone"); }
    for (let k = 2; k <= fr + 1; k++) if (R(x, y + k)) { n++; DBGV.push("foot"); break; }
    for (const dx of [-1, 1]) if (!lip(x + dx, y) && lip(x - dx, y) && !R(x + dx, y) && !R(x + dx, y - 1) && !R(x + dx, y - 2)) { n++; DBGV.push("square"); }
  }
  return n;
}
const violBox = (r, W, H, x0, y0, x1, y1, fr) => { let n = 0; for (let y = Math.max(1, y0 - 3); y <= Math.min(H - 2, y1 + 3); y++) for (let x = Math.max(1, x0 - 3); x <= Math.min(W - 2, x1 + 3); x++) n += violAt(r, W, H, x, y, fr); return n; };

// ---- straight runs (land call 3): side walls at most 10 tiles, south faces 10, back rims 14; a longer run gets a one-tile jog, 6 to 10 tiles from its start (from the tile hash) ----
const CAP = { south: 10, side: 10, rim: 14 };
function capRuns(r, W, H, rule, lk, noRaise, seed, gx0, gy0, dbgInfo = {}) {
  const R = (a, b) => (a < 0 || b < 0 || a >= W || b >= H ? 0 : r[b * W + a]), fr = rule.faceRows, hs = subSeed(seed, 'jog');
  // each kind: the edge test, the axis the run goes along, and the two ways to move the edge by one tile ([x, y, value] relative to a run tile)
  const KINDS = [
    { k: 'south', alongX: true, is: (x, y) => R(x, y) === 1 && R(x, y + 1) === 0, moves: [[[0, 0, 0]], [[0, 1, 1]]] },
    { k: 'rim', alongX: true, is: (x, y) => R(x, y) === 1 && R(x, y - 1) === 0, moves: [[[0, -1, 1]], [[0, 0, 0]]] },
    { k: 'side', alongX: false, is: (x, y) => R(x, y) === 1 && R(x - 1, y) === 0, moves: [[[-1, 0, 1]], [[0, 0, 0]]] },
    { k: 'side', alongX: false, is: (x, y) => R(x, y) === 1 && R(x + 1, y) === 0, moves: [[[1, 0, 1]], [[0, 0, 0]]] },
  ];
  let jogs = 0, missed = 0; const info = dbgInfo;
  for (const K of KINDS) for (let guard = 0; guard < 40; guard++) {
    // the first run over its cap, in raster order, that lies clear of the window's rim
    let run = null;
    const lines = K.alongX ? H : W, len = K.alongX ? W : H;
    for (let l = 3; l < lines - 3 && !run; l++) { let n = 0, from = 0;
      for (let t = 0; t <= len; t++) { const on = t < len && (K.alongX ? K.is(t, l) : K.is(l, t));
        if (on) { if (!n) from = t; n++; } else { if (n > CAP[K.k] && from >= 3 && t < len - 3 && !(run && run.skip)) { const key = K.alongX ? `${from},${l}` : `${l},${from}`; if (!K.done || !K.done.has(key)) { run = { l, from, n }; break; } } n = 0; } } }
    if (!run) break;
    const h = hash2(gx0 + (K.alongX ? run.from : run.l), gy0 + (K.alongX ? run.l : run.from), hs), o0 = 6 + h % 5; let done = false;
    const cuts = [0, 1, 2, 3, 4].map(a => 6 + (o0 - 6 + a) % 5); for (let o = 5; o >= 3; o--) cuts.push(o); for (let o = 11; o <= run.n - 3; o++) cuts.push(o);
    for (const o of cuts) { if (done || o >= run.n) continue;
      for (const head of [false, true]) { if (done) break;
        for (const mv of K.moves) {
          const tiles = []; for (let t = head ? run.from : run.from + o; t < (head ? run.from + o : run.from + run.n); t++) for (const [dx, dy, v] of mv) tiles.push([(K.alongX ? t : run.l) + dx, (K.alongX ? run.l : t) + dy, v]);
          if (tiles.some(([x, y, v]) => x < 1 || y < 1 || x >= W - 1 || y >= H - 1 || (lk && lk[y * W + x]) || (v === 1 && noRaise[y * W + x]))) continue;
          const xs = tiles.map(p => p[0]), ys = tiles.map(p => p[1]), b = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], old = tiles.map(([x, y]) => r[y * W + x]);
          for (const [x, y, v] of tiles) r[y * W + x] = v;
          DBGV.length = 0; if (violBox(r, W, H, ...b, fr) === 0) { done = true; jogs++; break; }
          if (info.dbg) (info.why || (info.why = [])).push(`try ${K.k} o${o}${head ? 'h' : 't'} ${tiles.length}t: ${[...new Set(DBGV)].join(',')}`);
          tiles.forEach(([x, y], i) => { r[y * W + x] = old[i]; });
        } } }
    if (!done) { missed++; (info.why || (info.why = [])).push(`${K.k}${K.alongX ? 'x' : 'y'} line ${run.l} from ${run.from} n ${run.n}`); (K.done || (K.done = new Set())).add(K.alongX ? `${run.from},${run.l}` : `${run.l},${run.from}`); }
  }
  return { jogs, missed };
}

// a face of 2 or more that ends square against a side wall 3 or more rows high (what a held site can leave at a plateau's corner): the end becomes a bend, by moving the wall's edge beside it
// out by one tile for its whole straight length (or for 3 rows or more of it), or the end lip tile down; an edit is kept only when no shape check fails round it
function fixSquares(r, W, H, rule, lk, noRaise) {
  const R = (a, b) => (a < 0 || b < 0 || a >= W || b >= H ? 0 : r[b * W + a]), lip = (a, b) => R(a, b) === 1 && R(a, b + 1) === 0; let fixed = 0, left = 0;
  for (let round = 0; round < 6; round++) { let hit = false;
    for (let y = 3; y < H - 2 && !hit; y++) for (let x = 1; x < W - 1 && !hit; x++) if (lip(x, y)) for (const dx of [-1, 1]) {
      if (lip(x + dx, y) || !lip(x - dx, y) || R(x + dx, y) || R(x + dx, y - 1) || R(x + dx, y - 2)) continue;
      let n = 0; while (y - 1 - n > 1 && R(x, y - 1 - n) && !R(x + dx, y - 1 - n)) n++;   // the wall's straight length above the corner
      const tries = []; for (let m = n; m >= 1; m--) tries.push(Array.from({ length: m }, (_, j) => [x + dx, y - 1 - j, 1]));
      tries.push([[x, y, 0]]);
      for (const tiles of tries) {
        if (tiles.some(([a, b, v]) => a < 1 || b < 1 || a >= W - 1 || b >= H - 1 || (lk && lk[b * W + a]) || (v === 1 && noRaise[b * W + a]))) continue;
        const old = tiles.map(([a, b]) => r[b * W + a]); for (const [a, b, v] of tiles) r[b * W + a] = v;
        const xs = tiles.map(p => p[0]), ys = tiles.map(p => p[1]);
        if (violBox(r, W, H, Math.min(...xs, x), Math.min(...ys, y), Math.max(...xs, x), Math.max(...ys, y), rule.faceRows) === 0) { fixed++; hit = true; break; }
        tiles.forEach(([a, b], i) => { r[b * W + a] = old[i]; });
      }
      if (hit) break; left++;
    }
    if (!hit) break;
  }
  return { fixed, left };
}

// what the held sites, the jogs and the pockets leave at their edges (a sliver, a pinch, a lone face, a short foot): a tile is flipped (never a held one) when that leaves fewer failing checks round it; at most 8 rounds
function fixLeft(r, W, H, rule, lk, noRaise) {
  let fixed = 0;
  for (let round = 0; round < 8; round++) { let hit = 0;
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      if (violAt(r, W, H, x, y, rule.faceRows) === 0) continue;
      // the failing tile and its neighbours are the candidates: the first flip that lowers the count round it, in a fixed order
      let done = false;
      for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        const a = x + dx, b = y + dy, i = b * W + a; if (a < 1 || b < 1 || a >= W - 1 || b >= H - 1 || (lk && lk[i]) || (!r[i] && noRaise[i])) continue;
        DBGV.length = 0; const before = violBox(r, W, H, a, b, a, b, rule.faceRows); r[i] = 1 - r[i];
        if (violBox(r, W, H, a, b, a, b, rule.faceRows) < before) { done = true; hit++; fixed++; break; } r[i] = 1 - r[i];
      }
      void done;
    }
    if (!hit) break;
  }
  return fixed;
}

// ---- the walk, on the raster: the game's own parts (relief.mjs) ----
// raised with a low tile beside it blocks (the lip, the side's rim); a low tile under a raised one (the face) or beside one (the flank, and the cell beyond a face's end) blocks; water that is not a ford blocks;
// a way up's tiles walk. Components are found 4-connected; a component that reaches the window's edge or the coast belongs to more land than the window sees.
function walkParts(R, W, H, way, wblock) {
  const wk = new Uint8Array(W * H), r = (x, y) => R[(y < 0 ? 0 : y >= H ? H - 1 : y) * W + (x < 0 ? 0 : x >= W ? W - 1 : x)];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (way[i]) { wk[i] = 1; continue; }
    if (R[i]) wk[i] = r(x + 1, y) && r(x - 1, y) && r(x, y + 1) && r(x, y - 1) ? 1 : 0;
    else wk[i] = wblock[i] || (y > 0 && R[i - W] && !way[i - W]) || r(x - 1, y) || r(x + 1, y) ? 0 : 1;
  }
  for (let y = 0; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (R[y * W + x] && !R[(y + 1) * W + x])   // the cell beyond a south run's end: rows L - 2 .. L + 1 are the end piece's
    for (const dx of [-1, 1]) if (!R[y * W + x + dx]) for (let j = -2; j <= 1; j++) if (y + j >= 0 && y + j < H && !R[(y + j) * W + x + dx] && !way[(y + j) * W + x + dx]) wk[(y + j) * W + x + dx] = 0;
  return wk;
}
function components(wk, W, H, edge, way) {
  const lab = new Int32Array(W * H).fill(-1), comps = [], q = new Int32Array(W * H);
  for (let s = 0; s < W * H; s++) {
    if (!wk[s] || lab[s] >= 0) continue;
    const id = comps.length, c = { id, n: 0, open: false, way: false, up: 0, tiles: [] }; let h = 0, n = 0; q[n++] = s; lab[s] = id;
    while (h < n) { const i = q[h++], x = i % W, y = (i / W) | 0; c.tiles.push(i); if (edge[i]) c.open = true; if (way[i]) c.way = true;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = x + dx, b = y + dy; if (a < 0 || b < 0 || a >= W || b >= H) continue; const m = b * W + a; if (wk[m] && lab[m] < 0) { lab[m] = id; q[n++] = m; } } }
    c.n = c.tiles.length; comps.push(c);
  }
  return { lab, comps };
}
// the 4-connected blob of tiles equal to `v` that holds the component's tiles (ignoring held tiles); null when it reaches the window's rim or holds a blocked tile
function blobOf(r, W, H, tiles, v, limit, bad) {
  const seen = new Set(tiles.filter(i => r[i] === v)), q = [...seen];
  for (let h = 0; h < q.length; h++) {
    if (q.length > limit) return null;
    const i = q[h], x = i % W, y = (i / W) | 0; if (bad && bad[i]) return null; if (x < 3 || y < 3 || x >= W - 3 || y >= H - 3) return null;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const m = (y + dy) * W + x + dx; if (!seen.has(m) && r[m] === v) { seen.add(m); q.push(m); } }
  }
  return q;
}

// ---- the levels of one cell ----
// The raster is the cell with a cell's width round it; what the passes do at the raster's rim stays in the ring, so the cell is the same from every neighbour's window.
export function windowLevels(L, X, Y) {
  const WR = L.rule.window, W = (2 * WR + 1) * CW, H = (2 * WR + 1) * CH, q = new Int32Array(W * H), th = L.rule.levels, X0w = X - WR, Y0w = Y - WR;
  for (let j = 0; j <= 2 * WR; j++) for (let i = 0; i <= 2 * WR; i++) {
    const c = qCell(L, X - WR + i, Y - WR + j);
    for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CW; tx++) q[(j * CH + ty) * W + i * CW + tx] = c[ty * CW + tx];
  }
  // water held low: the field is forced under the threshold on the place's water tiles and one tile round them (the wet flags of the window and a tile beyond its rim)
  const wr = new Uint8Array(W * H), held = new Uint8Array(W * H);   // wr: the water tiles; held: the tiles the field was forced low on
  if (L.rule.holdWater !== 0) {
    for (let j = 0; j <= 2 * WR; j++) for (let i = 0; i <= 2 * WR; i++) {
      const c = wetCell(L, X0w + i, Y0w + j);
      for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CW; tx++) wr[(j * CH + ty) * W + i * CW + tx] = c[ty * CW + tx];
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let w = 0; for (let dy = -1; dy <= 1 && !w; dy++) { const yy = y + dy; if (yy < 0 || yy >= H) continue; for (let dx = -1; dx <= 1; dx++) { const xx = x + dx; if (xx >= 0 && xx < W && wr[yy * W + xx]) { w = 1; break; } } }
      if (w) { held[y * W + x] = 1; if (q[y * W + x] >= 0) q[y * W + x] = -1; }
    } }
  const gx0 = X0w * CW, gy0 = Y0w * CH, fr = L.rule.faceRows;
  // tiles the land rule may not raise: water held low, and the coast's twelve tiles
  const noRaise = new Uint8Array(W * H), wblock = new Uint8Array(W * H), edge = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x, gx = gx0 + x, gy = gy0 + y, inl = inlandOf(gx, gy);
    noRaise[i] = held[i] || inl < RAISE_OFF + 1 ? 1 : 0;
    wblock[i] = wr[i] && !(inRealm(Math.floor(gx / CW), Math.floor(gy / CH)) && L.realm.ford[cellIdx(Math.floor(gx / CW), Math.floor(gy / CH))]) ? 1 : 0;
    edge[i] = x < 2 || y < 2 || x >= W - 2 || y >= H - 2 || inl < 6 ? 1 : 0; }
  // one raster per boundary (level above k), each cleaned on its own; a higher level lies inside the lower one
  const out = new Uint8Array(W * H); let below = null; const info = { sites: [], filled: [], pockets: [], jogs: 0, jogsMissed: 0, pocketStairs: [], dbg: !!globalThis.B3C_DBG };
  for (let k = 0; k < th.length; k++) {
    const base = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) base[i] = q[i] >= th[k] && (!below || below[i]) ? 1 : 0;
    let r = base;
    if (k === 0) r = landPipeline(L, X, Y, base, noRaise, wblock, edge, W, H, gx0, gy0, info);
    else r = cleanup(base, W, H, L.rule, null);
    if (below) for (let i = 0; i < W * H; i++) r[i] &= below[i];
    for (let i = 0; i < W * H; i++) out[i] += r[i];
    below = r;
  }
  return { R: out, W, H, info };
}
// the stair sites in a window: the realm's (each by the cell edge it stands on) in window tiles, with the held-straight rows; `extra` are the pocket stairs found by an earlier pass over this window
const SITE_W = 6, SITE_UP = 4;   // a site: 6 columns; the lip row and 4 rows above held raised, the foot rows below held low; the way up takes the middle 2 columns
function siteOf(L, st) {   // the site's first column and lip row, in world tiles, from the field: the lip row is where the field first falls under the threshold below the upper cell's middle, kept 10 rows into the cell and at most 6 below its edge
  if (st.lip !== undefined) return st;
  const a = qCell(L, st.X, st.Y), b = qCell(L, st.X, st.Y + 1), tx = st.port, qAt = (x, y) => (y < CH ? a : b)[(y < CH ? y : y - CH) * CW + x];
  // the lip row: where the field falls under the threshold going south on both middle columns, nearest the cell edge (10 rows into the upper cell to 6 below its edge); else below the upper cell's middle as before
  let lip = -1;
  for (let d = 0; d <= 12 && lip < 0; d++) for (const s of d ? [1, -1] : [1]) { const y = CH - 1 + s * d; if (y < 10 || y > CH + 5) continue; if (qAt(tx, y) >= 0 && qAt(tx + 1, y) >= 0 && (qAt(tx, y + 1) < 0 || qAt(tx + 1, y + 1) < 0)) { lip = y; break; } }
  if (lip < 0) { let y = CH >> 1; for (; y < 2 * CH; y++) if (qAt(tx, y) < 0 || qAt(tx + 1, y) < 0) break; lip = y - 1; }
  st.lip = st.Y * CH + Math.max(10, Math.min(CH + 6, lip)); st.x0 = st.X * CW + tx - 2;
  // the site keeps off water: the raised rows hold no tile that water holds low (water and the tile round it), and the foot no water; it moves along the face, nearest the port first, to the first place that does
  const wet = (x, y) => { const cx = Math.floor(x / CW), cy = Math.floor(y / CH); return !!wetCell(L, cx, cy)[(y - cy * CH) * CW + x - cx * CW]; };
  const held = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (wet(x + dx, y + dy)) return true; return inlandOf(x, y) < RAISE_OFF + 1; };
  const clear = x0 => { for (let y = st.lip - SITE_UP; y <= st.lip; y++) for (let x = x0 - 1; x < x0 + SITE_W + 1; x++) if (held(x, y)) return false;
    for (let y = st.lip + 1; y <= st.lip + L.rule.faceRows + 1; y++) for (let x = x0 + 1; x < x0 + SITE_W - 1; x++) if (wet(x, y)) return false; return true; };
  const base = st.x0, lo = st.X * CW + 2, hi = st.X * CW + CW - SITE_W - 2;
  // first a place where the field itself is raised above the lip and low below it (the site cuts no pit into raised land and heaps no hill on low land), else any clear one
  const nat = x0 => { const lr = st.lip - st.Y * CH; let hi = 0, lo = 0; for (let c = x0 - st.X * CW; c < x0 - st.X * CW + SITE_W; c++) { if (qAt(c, lr - 2) >= 0) hi++; if (qAt(c, lr + 3) < 0) lo++; } return hi >= 3 && lo >= 3; };
  for (const strict of [true, false]) for (let d = 0; d <= 11; d++) for (const s of d ? [1, -1] : [1]) { const x0 = base + s * d; if (x0 < lo || x0 > hi) continue; if ((!strict || nat(x0)) && clear(x0)) { st.x0 = x0; st.ok = true; return st; } }
  return st;
}
// can a stair stand on the edge south of the cell (X, Y) at this port? (the site finds 6 columns clear of water; read from the field and the wet flags, so the region may ask before any pass runs)
export const siteClear = (L, X, Y, port) => !!siteOf(L, { X, Y, port }).ok;
function landPipeline(L, X, Y, base, noRaise, wblock, edge, W, H, gx0, gy0, info) {
  const WR = L.rule.window, fr = L.rule.faceRows, foot = fr + 1, extra = [];
  const sites = [];   // { lx, ly (window tiles), real }
  for (const st of L.stairs.values()) {
    if (st.X < X - WR - 1 || st.X > X + WR + 1 || st.Y < Y - WR - 1 || st.Y > Y + WR) continue;
    const s = siteOf(L, st), lx = s.x0 - gx0, ly = s.lip - gy0;
    if (lx >= 1 && lx + SITE_W < W && ly - SITE_UP >= 1 && ly + foot < H - 1) sites.push({ lx, ly, real: true });
  }
  let r = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const lk = new Uint8Array(W * H), all = sites.concat(extra);
    for (const s of all) { for (let x = s.lx; x < s.lx + SITE_W; x++) { for (let y = s.ly - SITE_UP; y <= s.ly; y++) if (!noRaise[y * W + x]) lk[y * W + x] = 1; for (let y = s.ly + 1; y <= s.ly + foot; y++) lk[y * W + x] = 2; } }
    const way = new Uint8Array(W * H); for (const s of all) { way[s.ly * W + s.lx + 2] = 1; way[s.ly * W + s.lx + 3] = 1; }
    r = cleanup(base, W, H, L.rule, lk);
    const seedJ = L.seed;
    if (info.dbg) info.pre = r.slice();
    const shape = () => { const a = capRuns(r, W, H, L.rule, lk, noRaise, seedJ, gx0, gy0, info), s = fixSquares(r, W, H, L.rule, lk, noRaise), b = capRuns(r, W, H, L.rule, lk, noRaise, seedJ, gx0, gy0, info); info.jogs = a.jogs + b.jogs; info.jogsMissed = b.missed; info.squaresFixed = s.fixed; info.squaresLeft = s.left; info.leftFixed = fixLeft(r, W, H, L.rule, lk, noRaise); };
    // pockets: walkable parts the window closes in, that no way up reaches
    let again = false;
    for (let round = 0; round < 3; round++) {
      const { comps } = components(walkParts(r, W, H, way, wblock), W, H, edge, way), shut = comps.filter(c => !c.open && !c.way);
      info.pockets = shut.map(c => c.n); info.pk = shut.map(c => { let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1; for (const i of c.tiles) { const x = i % W, y = (i / W) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return `${c.n}${r[c.tiles[0]] ? 'R' : 'L'}[${x0 + gx0},${y0 + gy0}-${x1 + gx0},${y1 + gy0}]`; }); if (!shut.length) break;
      let changed = false;
      for (const c of shut) {
        const isRaised = r[c.tiles[0]] === 1;
        // a pocket is handled only where every window that shows one of the cells it touches shows all of it: its footprint (its box and 6 tiles round) lies within one cell round each cell it touches; a larger
        // one is left (listed), since a neighbour's window could not tell it from land that goes on, and a cell must be the same from every window (the seam)
        { let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1; for (const i of c.tiles) { const x = i % W, y = (i / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
          const fx0 = gx0 + x0 - 6, fx1 = gx0 + x1 + 6, fy0 = gy0 + y0 - 6, fy1 = gy0 + y1 + 6; let fits = true;
          for (let cx = Math.floor(fx0 / CW); cx <= Math.floor(fx1 / CW) && fits; cx++) if (fx0 < (cx - 1) * CW || fx1 >= (cx + 2) * CW) fits = false;
          for (let cy = Math.floor(fy0 / CH); cy <= Math.floor(fy1 / CH) && fits; cy++) if (fy0 < (cy - 1) * CH || fy1 >= (cy + 2) * CH) fits = false;
          if (!fits) { (info.deferred || (info.deferred = [])).push(c.n); continue; } }
        if (!isRaised) {   // low land with no cliff near it is a lake's islet: the realm's own, not a pocket the land made
          let near = false; for (const i of c.tiles) { const x = i % W, y = (i / W) | 0; for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2; dx++) { const a = x + dx, b = y + dy; if (a >= 0 && b >= 0 && a < W && b < H && r[b * W + a]) { near = true; break; } } if (near) break; }
          if (!near) { (info.islets || (info.islets = [])).push(c.n); continue; }
        }
        if (c.n < 60) {   // a pit is filled, a mesa lowered
          let blob = null;
          if (isRaised) blob = blobOf(r, W, H, c.tiles, 1, 400, null);
          else { const s = new Set(c.tiles); for (const i of c.tiles) { const x = i % W, y = (i / W) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const m = (y + dy) * W + x + dx; if (m >= 0 && m < W * H && !r[m]) s.add(m); } }
            blob = [...s]; if (blob.some(i => noRaise[i] || wblock[i] || edge[i])) { if (info.dbg) (info.why || (info.why = [])).push(`pit ${c.n}: nr ${blob.filter(i => noRaise[i]).length} wb ${blob.filter(i => wblock[i]).length} ed ${blob.filter(i => edge[i]).length}`); blob = null; } }
          if (blob && blob.every(i => !lk[i])) { for (const i of blob) r[i] = isRaised ? 0 : 1; info.filled.push(c.n); changed = true; continue; }
        }
        // a stair on its longest south face, held straight (the second pass over the window carries it)
        let best = null; const cset = new Set(c.tiles);
        for (let y = 4; y < H - foot - 2; y++) { let n = 0, from = 0;
          for (let x = 1; x <= W - 1; x++) { const on = x < W - 1 && r[y * W + x] === 1 && r[(y + 1) * W + x] === 0 && cset.has((isRaised ? y - 1 : y + 2) * W + x);
            if (on) { if (!n) from = x; n++; } else { if (n && (!best || n > best.n)) best = { x0: from, n, y }; n = 0; } } }
        if (best && attempt < 2 && (c.n >= 6 || !isRaised)) { const xm = best.x0 + ((best.n - 2) >> 1); if (xm - 2 >= 1 && xm + 4 < W) { extra.push({ lx: xm - 2, ly: best.y, real: false }); info.pocketStairs.push({ x: gx0 + xm, y: gy0 + best.y, n: c.n, raised: isRaised ? 1 : 0 }); again = true; } }
      }
      if (again) break;
      if (!changed) break;
      r = cleanup(r, W, H, L.rule, lk);
    }
    if (!again) { shape(); break; }
  }
  info.sites = sites.concat(extra).map(s => ({ x: gx0 + s.lx + 2, y: gy0 + s.ly, real: s.real }));
  return r;
}
// a cell's tile levels, 24 x 28 values (0 outside the realm)
export function levelCell(L, X, Y) {
  const key = (X + 8) * 1000 + (Y + 8), hit = L.cells.get(key); if (hit) return hit;
  const out = new Uint8Array(N);
  if (inRealm(X, Y)) { const w = windowLevels(L, X, Y), o = L.rule.window; for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CW; tx++) out[ty * CW + tx] = w.R[(o * CH + ty) * w.W + o * CW + tx];
    L.pk.set(key, w.info.sites.filter(s => !s.real && s.x >= X * CW - 2 && s.x < (X + 1) * CW + 2 && s.y >= Y * CH - 3 && s.y < (Y + 1) * CH + 3)); }
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

// ---- the way up: placed on the stair's held-straight site, never searched ----
// The stair on the edge between the cell A = (ax, ay) and the cell south of it, A being the higher, has its site made before the passes (landPipeline: 6 columns held, the lip row and 4 rows above raised, the foot
// rows low); the way up takes the middle 2, so a lip tile stands straight on each side. Returns { x, y, w, h } in world tiles, or null when the stair is not the realm's or the site did not survive (counted by the tools).
export function findWayup(L, ax, ay, port, k = 0) {
  const key = ax * 1000 + ay + (k ? k * 1e7 : 0), hit = L.wayups.get(key); if (hit !== undefined) return hit;
  const st = L.stairs.get(ax * 1000 + ay); let best = null;
  if (st) best = checkSite(L, siteOf(L, st).x0 + 2, st.lip, k);
  L.wayups.set(key, best); return best;
}
// a way up at the world tiles (x, y), 2 wide: two lip tiles, a lip tile each side, 3 raised rows above, faceRows + 1 low rows below
function checkSite(L, x, y, k = 0) {
  const R = (a, b) => (inlandOf(a, b) >= RAISE_OFF && tileLevel(L, a, b) > k), foot = L.rule.faceRows + 1, lip = (a, b) => R(a, b) && !R(a, b + 1);
  if (!lip(x, y) || !lip(x + 1, y) || !lip(x - 1, y) || !lip(x + 2, y)) return null;
  for (let j = 1; j <= 3; j++) if (!R(x, y - j) || !R(x + 1, y - j)) return null;
  for (let j = 1; j <= foot; j++) if (R(x, y + j) || R(x + 1, y + j)) return null;
  return { x, y, w: 2, h: 1 };
}
// the pocket stairs of the window of cell (X, Y): ways up the land rule made for a closed part (not the realm's own stairs), in world tiles
export function pocketWayups(L, X, Y) {
  levelCell(L, X, Y); const out = [];
  for (const s of L.pk.get((X + 8) * 1000 + (Y + 8)) || []) { const w = checkSite(L, s.x, s.y); if (w) out.push(w); }
  return out;
}
// the held sites of the realm's stairs that did not survive the passes, and the window information of a cell (the tools read it)
export const windowInfo = (L, X, Y) => windowLevels(L, X, Y).info;
