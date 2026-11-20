// Generator 7, the terrain levels at tile scale. Pure: no page state, DOM, storage, clock or Math.random.
// The land rule (spec land-shape-spec-1): the cliff is the contour of one whole-number noise field, never a bin, a pull or a ruler.
//   q = macro + detail * D + coast   (macro: the realm's height minus its raising height read at tile scale; detail: warped gradient noise at 4 to 32 tiles; coast: the ramp to the border)
// Terrace levels: a tile's level is the number of the rule's thresholds (land-rule.json `levels`, one entry now: [0]) that its q reaches. Every pass runs per boundary between level k and k+1,
// on the raster "level above k", never on "raised vs low", so more heights are data (a longer list), not a rewrite. Level 0 is the low ground; `raised` means level 1 or more.
// Then the passes P1 to P6: threshold; opening and closing by a rounded element; small hills and hollows; no diagonal pinch; no lone one-tile face; foot room under every lip.
// The same function serves the region (which chooses each stair where this land has a way-up site) and the place (which puts the way up there).
import { hash2, subSeed } from '../../../core/base/noise.mjs';
import { div, shr, quot } from '../../../core/base/whole.mjs';
import RULE from './land-rule.json' with { type: 'json' };
import { RW, RH, CW, CH, fieldsAt, heightAt, noiseField } from './world.mjs';
import { L as LAND, MW, MH } from '../world.mjs';

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
export const forgetLevels = realm => { LEVELS.delete(realm); };   // the realm's tile caches dropped (a test builds the same places cold again)
export function levelsOf(realm) {
  let L = LEVELS.get(realm); if (L && L.gen === GEN && L.stairsList === realm.stairs) return L;
  const e0q = new Int32Array(RW * RH); for (let i = 0; i < RW * RH; i++) e0q[i] = Math.round(realm.e0[i] * 65536);   // the realm's raising height, rounded once to Q16
  L = { realm, seed: realm.seed, gen: GEN, stairsList: realm.stairs, rule: RULE_NOW, e0q, q: new Map(), wet: new Map(), cells: new Map(), wayups: new Map(), pk: new Map(), stairs: new Map() };
  for (const s of realm.stairs || []) L.stairs.set(s.X * 1000 + s.Y, { ...s });   // the realm's stairs: each gets its held-straight site before the passes
  LEVELS.set(realm, L); return L;
}
// the realm's stairs (region.mjs attachStairs, plain data on the realm): [{ X, Y, port }] on the edge between the cell (X, Y) and the one south of it; the realm never reads this file
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
// one tile's q (the same number qCell holds for it), without making the cell: the realm's edge probe reads a few strips of tiles
// (the octave seeds of the noise are made once per realm, not per tile: fbm of core/base/noise.mjs with the seeds given, the same sum)
// grad2 of the core, written flat (no closure, no 2 ** bits): the same arithmetic, so the same numbers
const GX = [1, -1, 0, 0, 1, -1, 1, -1], GY = [0, 0, 1, -1, 1, 1, -1, -1], F16 = 65536;
// the lattice gradients (hash2 & 7) of an octave are kept in a grid per realm, filled as read: a tile's neighbours read the same lattice points
const LAT_PAD = 48 * 256;   // the position is moved by at most the warp and the wobble (about 32 tiles); beyond the grid the hash is read
function gradIdx(d, s, ix, iy) {
  let g = d.grid;
  if (g === null) { const sh = 8 + s; d.x0 = (-LAT_PAD >> sh) - 1; d.y0 = d.x0; d.w = ((WTW * 256 + LAT_PAD) >> sh) + 3 - d.x0; d.h = ((WTH * 256 + LAT_PAD) >> sh) + 3 - d.y0; g = d.grid = new Int8Array(d.w * d.h).fill(-1); }
  const x = ix - d.x0, y = iy - d.y0;
  if (x < 0 || y < 0 || x >= d.w || y >= d.h) return hash2(ix, iy, d.seed) & 7;
  const k = y * d.w + x; let v = g[k]; if (v < 0) { v = hash2(ix, iy, d.seed) & 7; g[k] = v; } return v;
}
function grad2q(px, py, s, d) {
  const sh = 8 + s, mask = (1 << sh) - 1, ix = px >> sh, iy = py >> sh, fx = (px & mask) << (16 - sh), fy = (py & mask) << (16 - sh);
  let g = gradIdx(d, s, ix, iy); const n00 = GX[g] * fx + GY[g] * fy;
  g = gradIdx(d, s, ix + 1, iy); const n10 = GX[g] * (fx - F16) + GY[g] * fy;
  g = gradIdx(d, s, ix, iy + 1); const n01 = GX[g] * fx + GY[g] * (fy - F16);
  g = gradIdx(d, s, ix + 1, iy + 1); const n11 = GX[g] * (fx - F16) + GY[g] * (fy - F16);
  const u = fadeQ(fx), v = fadeQ(fy);
  const a = n00 + Math.floor((n10 - n00) * u / F16), b = n01 + Math.floor((n11 - n01) * u / F16);
  return a + Math.floor((b - a) * v / F16);
}
function fadeQ(t) {
  const t2 = Math.floor(t * t / F16), t3 = Math.floor(t2 * t / F16);
  return Math.floor(t3 * (Math.floor(t * (6 * t - 15 * F16) / F16) + 10 * F16) / F16);
}
function fbmQ(px, py, s0, seeds) {
  const oc = seeds.length; let sum = 0, wsum = 0;
  for (let o = 0; o < oc; o++) { const w = 1 << (oc - 1 - o); sum += w * grad2q(px, py, s0 - o, seeds[o]); wsum += w; }
  return quot(sum, wsum) | 0;
}
const octSeeds = (seed, n) => { const a = []; for (let o = 0; o < n; o++) a.push({ seed: subSeed(seed, 'oct', o), grid: null, x0: 0, y0: 0, w: 0, h: 0 }); return a; };
function qMacro(L, gx, gy) {   // q without its detail term (the fbm), leaving the position the detail is read at in _wx, _wy
  const reach = L.rule.warpReach, wob = L.rule.wobbleReach, ws = L.rule.wobbleSpacing, st = L.rule.wobbleStretch, e0q = L.e0q, W2 = 2 * CW, H2 = 2 * CH;
  const sd = L.qSeeds || (L.qSeeds = (() => {
    const sD = subSeed(L.seed, 'land'), sW = subSeed(L.seed, 'land-wobble'), wo = L.rule.wobbleOctaves;
    return { wpx: octSeeds(subSeed(sD, 'warpx'), 2), wpy: octSeeds(subSeed(sD, 'warpy'), 2), wbx: octSeeds(subSeed(sW, 'x'), wo), wby: octSeeds(subSeed(sW, 'y'), wo), det: octSeeds(subSeed(sD, 'detail'), 4), h: heightAt(L.seed) };
  })());
  const px = 256 * gx + 128, py = 256 * gy + 128;
  // the position the land is read at: moved by the coarse warp (32 and 16 tile noise, up to `reach` tiles) and the fine wobble (8 and 4 tile noise, up to `wob` tiles), in Q8 tiles.
  // The macro height and its raising height are read there too, so the contour itself bends and wobbles by that many tiles, however steep the land is.
  const wx = ((fbmQ(px, py, 5, sd.wpx) * reach) >> 8) + shr(fbmQ(px, st * py, ws, sd.wbx) * wob, 8), wy = ((fbmQ(px, py, 5, sd.wpy) * reach) >> 8) + shr(fbmQ(st * px, py, ws, sd.wby) * wob, 8);
  const un = 2 * gx + 1 - CW + shr(wx, 7), vn = 2 * gy + 1 - CH + shr(wy, 7), X0 = Math.floor(un / W2), Y0 = Math.floor(vn / H2), a = un - X0 * W2, b = vn - Y0 * H2;
  const e = div(e0q[cellIdx(X0, Y0)] * (W2 - a) * (H2 - b) + e0q[cellIdx(X0 + 1, Y0)] * a * (H2 - b) + e0q[cellIdx(X0, Y0 + 1)] * (W2 - a) * b + e0q[cellIdx(X0 + 1, Y0 + 1)] * a * b, W2 * H2);
  const h = sd.h((un + CW) / W2 - 0.5, (vn + CH) / H2 - 0.5), macro = Math.round(h * 65536) - e;
  _wx = px + wx; _wy = py + wy; _sd = sd;
  return macro + coastQ16(L.seed, gx, gy);
}
let _wx = 0, _wy = 0, _sd = null;
export function qTile(L, gx, gy) {
  const m = qMacro(L, gx, gy);
  return m + shr(fbmQ(_wx, _wy, 5, _sd.det) * L.rule.detail, 16);
}
// whether q (the tile's) reaches the threshold th: the same answer as qTile(L, gx, gy) >= th. The detail term is a fbm (a weighted mean of gradient noise, each under 2 in Q16: dot of a
// (+-1, +-1) gradient with an offset under 1 on each axis), so it lies within +-2D: where the macro and the coast are further than that from th the detail is not read.
export function qAtLeast(L, gx, gy, th) {
  const d = qMacro(L, gx, gy) - th, B = 2 * L.rule.detail + 1;
  if (d > B) return true; if (d < -B) return false;
  return d + shr(fbmQ(_wx, _wy, 5, _sd.det) * L.rule.detail, 16) >= 0;
}
export function wetTile(L, gx, gy) {   // one tile's wet flag (the same as wetCell's), without making the cell
  if (inlandOf(gx, gy) < WET_REACH) return 0;
  const S = seedCtx(L.seed), wc = wetCells(L); if (!S.nW) S.nW = noiseField(L.seed, 't-wet', 1 / 12, 'FBm', 2);
  const u = (gx + 0.5) / CW - 0.5, v = (gy + 0.5) / CH - 0.5, X0 = Math.floor(u), Y0 = Math.floor(v), a = u - X0, b = v - Y0;
  const w = wc[cellIdx(X0, Y0)] * (1 - a) * (1 - b) + wc[cellIdx(X0 + 1, Y0)] * a * (1 - b) + wc[cellIdx(X0, Y0 + 1)] * (1 - a) * b + wc[cellIdx(X0 + 1, Y0 + 1)] * a * b;
  if (w + WET_NOISE * 1.5 <= WET_AT) return 0;   // the noise (about -1 to 1) cannot lift it over the threshold: no need to read it
  return w + WET_NOISE * S.nW(gx, gy) > WET_AT ? 1 : 0;
}
export function qCell(L, X, Y) {
  const key = (X + 8) * 1000 + (Y + 8), hit = L.q.get(key); if (hit) return hit;
  const q = new Int32Array(N);
  for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CW; tx++) q[ty * CW + tx] = qTile(L, X * CW + tx, Y * CH + ty);
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
// the element: a w x h rectangle (map-levels-build-1: 4 x 4, so a terrace's square corner stays), anchored at its top-left. The bit-packed passes take it as two rectangles (here the same one twice): an erosion is the
// intersection of the two rectangles' erosions and a dilation the union of their dilations, each rectangle done one axis at a time (the raster's rim is read as itself, replicated).
const ELEMS = new Map();
function elemOf(m) {
  const [w, h] = Array.isArray(m) ? m : [m, m], key = w + 'x' + h; let E = ELEMS.get(key); if (E) return E;
  E = [[0, 0, w, h], [0, 0, w, h]];   // x0, y0, w, h of each rectangle
  ELEMS.set(key, E); return E;
}
// (land-time-1) open and close on bit-packed rows: 32 tiles to a word. A tile x of a row is bit P + x of its words, the P bits before it and the bits after it (to the end of the last word) hold the row's first and
// last tile (the raster's rim read as itself, replicated); the rows above and below are the first and last row repeated PV times. A window of n tiles along a row is the AND (erosion) or OR (dilation) of the row shifted
// by 0 .. n - 1, along a column of the same rows 0 .. n - 1 apart; the element's two rectangles are done apart and met by AND (erosion) or OR (dilation). The result is the tile-by-tile run-length passes' result, tile for tile.
const bitAt = (b, row, j) => (b[row + (j >> 5)] >>> (j & 31)) & 1;
function packBits(r, W, H, P, WW, want) {   // want: the value a tile must have to set its bit (1 raised, or for the held masks 1 / 2)
  const b = new Int32Array(H * WW);
  for (let y = 0; y < H; y++) { const row = y * WW, src = y * W; for (let x = 0; x < W; x++) if (r[src + x] === want) { const j = P + x; b[row + (j >> 5)] |= 1 << (j & 31); } }
  return b;
}
function unpackBits(b, W, H, P, WW) {
  const r = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) { const row = y * WW, dst = y * W; for (let x = 0; x < W; x++) { const j = P + x; r[dst + x] = (b[row + (j >> 5)] >>> (j & 31)) & 1; } }
  return r;
}
function repad(b, W, H, P, WW) {   // the bits before and after each row are its first and last tile again
  const lowMask = P >= 32 ? -1 : (1 << P) - 1, e = P + W, ew = e >> 5, eb = e & 31;
  for (let y = 0; y < H; y++) {
    const row = y * WW, l = bitAt(b, row, P), rr = bitAt(b, row, e - 1);
    b[row] = l ? b[row] | lowMask : b[row] & ~lowMask;
    const hi = -1 << eb;   // from bit e of word ew to the end of the row
    b[row + ew] = rr ? b[row + ew] | hi : b[row + ew] & ~hi;
    for (let i = ew + 1; i < WW; i++) b[row + i] = rr ? -1 : 0;
  }
}
function stageBits(b, W, H, E, P, PV, WW, all, flip) {   // one erosion (all) or dilation of the element, from rows whose pads are made; the result's pads are not
  const T = [], rows = H + 2 * PV, out = new Int32Array(H * WW);
  for (const [x0, y0, w, h] of E) {
    // along the rows (the rows' repeats above and below are made after, from the result)
    const V = new Int32Array(rows * WW);
    for (let y = 0; y < H; y++) {
      const src = y * WW, dst = (y + PV) * WW;
      for (let i = 0; i < WW; i++) {
        let acc = all ? -1 : 0;
        for (let k = 0; k < w; k++) {
          const s = x0 + k; let v;
          if (!flip) v = s === 0 ? b[src + i] : (b[src + i] >>> s) | (i + 1 < WW ? b[src + i + 1] << (32 - s) : 0);
          else v = s === 0 ? b[src + i] : (b[src + i] << s) | (i > 0 ? b[src + i - 1] >>> (32 - s) : 0);
          if (all) acc &= v; else acc |= v;
        }
        V[dst + i] = acc;
      }
    }
    for (let k = 0; k < PV; k++) for (let i = 0; i < WW; i++) { V[k * WW + i] = V[PV * WW + i]; V[(PV + H + k) * WW + i] = V[(PV + H - 1) * WW + i]; }
    // along the columns: rows y + y0 .. y + y0 + h - 1 (the other way round when flipped)
    const O = new Int32Array(H * WW);
    for (let y = 0; y < H; y++) {
      const dst = y * WW;
      for (let i = 0; i < WW; i++) {
        let acc = all ? -1 : 0;
        for (let k = 0; k < h; k++) { const yy = flip ? y + PV - y0 - k : y + PV + y0 + k, v = V[yy * WW + i]; if (all) acc &= v; else acc |= v; }
        O[dst + i] = acc;
      }
    }
    T.push(O);
  }
  for (let i = 0; i < out.length; i++) out[i] = all ? T[0][i] & T[1][i] : T[0][i] | T[1][i];
  return out;
}
// the opening then the closing of a raster, relocked after each (the closing is the opening of the raster turned over, turned back)
function openClose(r, W, H, E, lk) {
  const P = Math.max(...E.map(e => e[0] + e[2])), PV = Math.max(...E.map(e => e[1] + e[3]));
  if (P > 31 || E.length !== 2) throw new Error('openClose: element too wide');
  const WW = (W + 2 * P + 31) >> 5, one = lk ? packBits(lk, W, H, P, WW, 1) : null, zero = lk ? packBits(lk, W, H, P, WW, 2) : null;
  let b = packBits(r, W, H, P, WW, 1);
  const open = a => { repad(a, W, H, P, WW); const e = stageBits(a, W, H, E, P, PV, WW, true, false); repad(e, W, H, P, WW); return stageBits(e, W, H, E, P, PV, WW, false, true); };
  const relockBits = a => { if (lk) for (let i = 0; i < a.length; i++) a[i] = (a[i] | one[i]) & ~zero[i]; return a; };
  b = relockBits(open(b));
  for (let i = 0; i < b.length; i++) b[i] = ~b[i];
  b = open(b);
  for (let i = 0; i < b.length; i++) b[i] = ~b[i];
  return unpackBits(relockBits(b), W, H, P, WW);
}
const same = (a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; };
const hasLip = (r, W, H, x, y) => { const xx = x < 0 ? 0 : x >= W ? W - 1 : x, ya = y < 0 ? 0 : y >= H ? H - 1 : y, yb = y + 1 < 0 ? 0 : y + 1 >= H ? H - 1 : y + 1; return r[ya * W + xx] === 1 && r[yb * W + xx] === 0; };   // the raster's rim read as itself, no call per tile

// cliff-contour-1: a lean. A side wall that moves one column in toward the raised land going south leaves one south lip tile alone in its row (x, y): the wall above it runs down its outer side and the wall
// below runs down the next column in. The set draws it as the wall leaning over by one column (the pieces lean-e, lean-w), not as a face one column wide, so the land keeps it. i = y * W + x, clear of the rim
// (rows y - 1 .. y + 4, columns x - 1 .. x + 1 read). Raised on the east (the wall's outside is west): (x - 1, y - 1) and (x - 1, y) low, (x, y - 1) raised, (x + 1, y .. y + 4) raised (the next column's
// lip 4 or more rows lower: a wall, not a steep run's step of 1 to 3 rows), (x, y + 2) low; or mirrored.
let LEAN_ON = true;
export const setLeans = (on) => { LEAN_ON = !!on; GEN++; };
function leanAt(r, W, i) {
  if (i < W || i + 4 * W + 4 >= r.length || i < 4 || r[i] !== 1 || r[i + W] !== 0 || r[i - W] !== 1 || r[i + 2 * W]) return false;
  // and the land behind the lower wall at least 4 wide on its first two rows (no neck under the minimum feature: two leans facing each other leave none narrower)
  for (const d of [-1, 1]) if (!r[i + d] && !r[i + d - W] && r[i - d] && r[i - d + W] && r[i - d + 2 * W] && r[i - d + 3 * W] && r[i - d + 4 * W] && r[i - 2 * d + W] && r[i - 3 * d + W] && r[i - 4 * d + W] && r[i - 2 * d + 2 * W] && r[i - 3 * d + 2 * W] && r[i - 4 * d + 2 * W]) return true;
  return false;
}
export const leanAtRaster = leanAt;

// Low rows kept under a south lip:the faceRows rock rows (they block), the foot row L + faceRows + 1 and one walkable row more (a channel under a face is at least 2 walkable tiles)
const footRoom = fr => fr + 2;
// P4, P5, P6, repeated until nothing changes (at most 8 rounds)
let FP_OK = false;   // whether the last fixPatterns ended on a round with no edit (a fixed point of P4 - P6), not on the 8-round limit
function fixPatterns(r0, W, H, faceRows, from = null, lk = null) {
  const r = r0.slice(), fRoom = footRoom(faceRows);
  // (land-time-1) the first round looks at every tile, as before, and notes every edit; later rounds look only at the tiles an edit has changed the reads of since they were last looked at (a tile whose reads are
  // unchanged and that was left alone is left alone again), so each round is the round that looks at every tile. Each pass has a flag per tile and per row of the tiles that read an edited tile.
  // `from`: a raster known to be a fixed point of the three passes except at the held tiles `lk` (the last fixPatterns result, relocked): the tiles that read a tile of `r0` that differs from it, or a held tile, are the
  // first round's, and no other tile can be edited by it, so the first round too looks at those only.
  const D4 = new Uint8Array(W * H), D5 = new Uint8Array(W * H), D6 = new Uint8Array(W * H), F4 = new Uint8Array(H), F5 = new Uint8Array(H), F6 = new Uint8Array(H);
  // cliff-contour-1: P5 and P6 also read the lean test (x - 1 .. x + 1, y - 1 .. y + 4), so an edit marks the tiles that read it there too
  const mark = (ex, ey) => {   // P4 reads a tile's x..x+1, y..y+1; P5 x-1..x+1, y-1..y+4; P6 its column, y..y+fRoom, and x-1..x+1, y-1..y+4
    for (let y = Math.max(0, ey - 1); y <= ey; y++) { F4[y] = 1; for (let x = Math.max(0, ex - 1); x <= ex; x++) D4[y * W + x] = 1; }
    for (let y = Math.max(0, ey - 4); y <= ey + 1 && y < H; y++) { F5[y] = 1; for (let x = Math.max(0, ex - 1); x <= ex + 1 && x < W; x++) D5[y * W + x] = 1; }
    for (let y = Math.max(0, ey - fRoom); y <= ey + 1 && y < H; y++) { F6[y] = 1; for (let x = Math.max(0, ex - 1); x <= ex + 1 && x < W; x++) D6[y * W + x] = 1; }
  };
  const t4 = (x, y) => {
    const i = y * W + x, a = r[i], b = r[i + 1], c = r[i + W], d = r[i + W + 1];
    if (a === d && b === c && a !== b) { if (!a) { r[i] = 1; r[i + W + 1] = 1; mark(x, y); mark(x + 1, y + 1); } else { r[i + 1] = 1; r[i + W] = 1; mark(x + 1, y); mark(x, y + 1); } return 1; }
    return 0;
  };
  const t5 = (x, y) => {
    const i = y * W + x;
    if (r[i] !== 1 || r[i + W] !== 0) return 0;
    if ((r[i - 1] === 1 && r[i - 1 + W] === 0) || (r[i + 1] === 1 && r[i + 1 + W] === 0)) return 0;
    if ((r[i - 1 - W] === 1 && r[i - 1] === 0) || (r[i + 1 - W] === 1 && r[i + 1] === 0) || (r[i - 1 + W] === 1 && r[i - 1 + 2 * W] === 0) || (r[i + 1 + W] === 1 && r[i + 1 + 2 * W] === 0)) return 0;
    if (LEAN_ON && leanAt(r, W, i)) return 0;   // cliff-contour-1: a side wall's one-column jog is kept (the set draws it as the wall leaning over by a column), never filled down into a straight wall
    r[i + W] = 1; mark(x, y + 1); return 1;
  };
  const t6 = (x, y) => {
    const i = y * W + x;
    if (r[i] !== 1 || r[i + W] !== 0) return 0;
    if (LEAN_ON && x > 0 && x + 1 < W && y > 0 && leanAt(r, W, i)) return 0;   // cliff-contour-1: a lean has no face under it (the rows under its lip are the wall below's flank): no foot room
    for (let k = 2; k <= fRoom; k++) if (r[i + k * W]) { for (let j = 1; j < k; j++) { r[i + j * W] = 1; mark(x, y + j); } return 1; }
    return 0;
  };
  if (from) {
    for (let i = 0; i < r.length; i++) if (r[i] !== from[i] || (lk && lk[i])) mark(i % W, (i / W) | 0);
  }
  FP_OK = false;
  for (let round = 0; round < 8; round++) {
    let changed = 0;
    if (round === 0 && !from) {
      // P4: no diagonal pinch (2 x 2 cases 6 and 9): the two low tiles are raised
      for (let y = 0; y + 1 < H; y++) for (let x = 0; x + 1 < W; x++) {
        const i = y * W + x, a = r[i], b = r[i + 1], c = r[i + W], d = r[i + W + 1];
        if (a === d && b === c && a !== b) changed += t4(x, y);
      }
      // P5: a south lip tile alone in its row's run, with no lip tile diagonally beside it (no bend, no jog), gets the tile below it raised (every tile read is inside the raster here, so a lip is two plain reads)
      for (let y = 1; y + 2 < H; y++) for (let x = 1; x + 1 < W; x++) { const i = y * W + x; if (r[i] === 1 && r[i + W] === 0) changed += t5(x, y); }
      // P6: foot room (land-b3f-foot-1): under every south lip the first footRoom(faceRows) tiles down are low: the faceRows rock rows, then the walkable foot row and one more, so no channel under a face is under 2 walkable tiles; a raised tile within them fills the gap up to it
      for (let y = 0; y + fRoom < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (r[i] === 1 && r[i + W] === 0) changed += t6(x, y); }
    } else {
      for (let y = 0; y + 1 < H; y++) { if (!F4[y]) continue; F4[y] = 0; for (let x = 0; x + 1 < W; x++) { const i = y * W + x; if (D4[i]) { D4[i] = 0; changed += t4(x, y); } } }
      for (let y = 1; y + 2 < H; y++) { if (!F5[y]) continue; F5[y] = 0; for (let x = 1; x + 1 < W; x++) { const i = y * W + x; if (D5[i]) { D5[i] = 0; changed += t5(x, y); } } }
      for (let y = 0; y + fRoom < H; y++) { if (!F6[y]) continue; F6[y] = 0; for (let x = 0; x < W; x++) { const i = y * W + x; if (D6[i]) { D6[i] = 0; changed += t6(x, y); } } }
    }
    if (!changed) { FP_OK = true; break; }
  }
  return r;
}
// P3: a hill or hollow under 100 tiles that does not reach the window's rim takes the level of what rings it
const NB4X = [1, -1, 0, 0], NB4Y = [0, 0, 1, -1];
function dropSmall(R, W, H) {
  const seen = new Uint8Array(W * H), q = new Int32Array(W * H);
  for (let s = 0; s < W * H; s++) {
    if (seen[s]) continue;
    const v = R[s]; let n = 0, edge = false; q[n++] = s; seen[s] = 1;
    for (let k = 0; k < n; k++) {
      const c = q[k], x = c % W, y = (c / W) | 0;
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1) edge = true;
      for (let d = 0; d < 4; d++) { const a = x + NB4X[d], b = y + NB4Y[d]; if (a < 0 || b < 0 || a >= W || b >= H) continue; const m = b * W + a; if (!seen[m] && R[m] === v) { seen[m] = 1; q[n++] = m; } }
    }
    if (n < 100 && !edge) for (let k = 0; k < n; k++) R[q[k]] = 1 - v;
  }
}
// P1 to P6 on one boundary's raster
// `lk`: the held tiles (1 = raised, 2 = low) of the stair sites: every pass leaves them as they are
const relock = (r, lk) => { if (lk) for (let i = 0; i < r.length; i++) if (lk[i]) r[i] = lk[i] === 1 ? 1 : 0; return r; };
// The opening then the closing of a raster (relocked after each). A tile of the result depends on the raster within OC_REACH tiles (each of the four steps reaches m - 1 = 4 with the 5 x 5 element: 16 in all), so
// when a raster differs from the one `prev` whose result `co` is known only in a box (land-b3f-foot-1), only the tiles within OC_REACH of that box are made again, from a crop of the raster OC_REACH further round (where the
// crop's rim is not the raster's own, the replicated rim reaches only the tiles within OC_REACH of it, none of which is remade): the same raster as asking every tile, at the cost of the box.
const OC_REACH = 16;
function openCloseNear(r, prev, co, W, H, E, lk) {
  // (land-time-1) the changed tiles are grouped into boxes (one per 16 x 16 block of tiles, then boxes merged while one crop round the merged box is no larger than the two crops apart), and each box is made again
  // from its own crop: a few scattered edits cost a few small crops, not the crop of their bounding box. Every tile within OC_REACH of a changed tile is made again from the raster as it is, as before.
  const B = 16, bw = Math.ceil(W / B), boxes = new Map(), M = 2 * OC_REACH;
  for (let i = 0; i < r.length; i++) if (r[i] !== prev[i]) {
    const x = i % W, y = (i / W) | 0, k = ((y / B) | 0) * bw + ((x / B) | 0), b = boxes.get(k);
    if (!b) boxes.set(k, [x, y, x, y]); else { if (x < b[0]) b[0] = x; if (x > b[2]) b[2] = x; if (y < b[1]) b[1] = y; if (y > b[3]) b[3] = y; }
  }
  if (!boxes.size) return co;
  const area = b => (Math.min(W - 1, b[2] + M) - Math.max(0, b[0] - M) + 1) * (Math.min(H - 1, b[3] + M) - Math.max(0, b[1] - M) + 1);
  let bs = [...boxes.values()];
  for (let again = true; again && bs.length > 1;) {
    again = false;
    for (let a = 0; a < bs.length && !again; a++) for (let c = a + 1; c < bs.length; c++) {
      const u = [Math.min(bs[a][0], bs[c][0]), Math.min(bs[a][1], bs[c][1]), Math.max(bs[a][2], bs[c][2]), Math.max(bs[a][3], bs[c][3])];
      if (area(u) <= area(bs[a]) + area(bs[c])) { bs[a] = u; bs.splice(c, 1); again = true; break; }
    }
  }
  const out = co.slice();
  for (const [x0, y0, x1, y1] of bs) {
    const rx0 = Math.max(0, x0 - OC_REACH), rx1 = Math.min(W - 1, x1 + OC_REACH), ry0 = Math.max(0, y0 - OC_REACH), ry1 = Math.min(H - 1, y1 + OC_REACH);
    const cx0 = Math.max(0, x0 - M), cx1 = Math.min(W - 1, x1 + M), cy0 = Math.max(0, y0 - M), cy1 = Math.min(H - 1, y1 + M), cw = cx1 - cx0 + 1, ch = cy1 - cy0 + 1;
    const cr = new Uint8Array(cw * ch), cl = lk ? new Uint8Array(cw * ch) : null;
    for (let y = 0; y < ch; y++) { const s = (cy0 + y) * W + cx0; for (let x = 0; x < cw; x++) { cr[y * cw + x] = r[s + x]; if (lk) cl[y * cw + x] = lk[s + x]; } }
    const oc = openClose(cr, cw, ch, E, cl);
    for (let y = ry0; y <= ry1; y++) for (let x = rx0; x <= rx1; x++) out[y * W + x] = oc[(y - cy0) * cw + x - cx0];
  }
  return out;
}
let CLEAN_SINK = null;   // cliff-contour-1: the tools' sink for the cleanup's own steps (the first cleanup of a window only)
function cleanup(r0, W, H, rule, lk) {
  // (land-time-1) `known`: the raster the last fix made when that was a fixed point (see fixPatterns): the next fix of a raster that differs from it in a few tiles looks only at the tiles that read them
  const E = elemOf(rule.minFeature); let known = null;
  const fix = (r, from) => { const o = relock(fixPatterns(r, W, H, rule.faceRows, from, lk), lk); known = FP_OK ? o : null; return o; };
  let r = relock(r0.slice(), lk);
  let fixed = false, prev = null, co = null;
  const sink = CLEAN_SINK; CLEAN_SINK = null;
  for (let pass = 0; pass < 12; pass++) {
    co = prev ? openCloseNear(r, prev, co, W, H, E, lk) : openClose(r, W, H, E, lk);
    if (sink && pass === 0) sink.openclose1 = co.slice();
    const n = fix(co, known), done = same(n, r);
    if (sink && pass === 0) sink.patterns1 = n.slice();
    prev = r; r = n; if (done) { fixed = true; break; }
  }
  // end on the opening, then one closing: no raised land narrower than the feature, and nothing the closing leaves low is narrower either (the same step again on a raster the loop left unchanged is that raster: skipped)
  if (!fixed) r = fix(openClose(r, W, H, E, lk), null);
  if (sink) sink.loop = r.slice();
  const kn = known ? r.slice() : null;
  dropSmall(r, W, H); relock(r, lk);
  r = fix(r, kn);
  if (sink) sink.small = r.slice();
  // what the foot-room and lone-lip passes can leave: a one-tile sliver (a tile with no 2 x 2 block of its own level) is flipped to what rings it; then the patterns are fixed again
  // (a face ending square against a side is the terrace's own shape, drawn by the set's end cap)
  for (let round = 0; round < 8; round++) {
    let changed = 0; const flip = [];
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x, v = r[i];   // (land-time-1) the four 2 x 2 blocks holding the tile, read from the tile's 8 neighbours
      const n = r[i - W - 1] === v, u = r[i - W] === v, ur = r[i - W + 1] === v, l = r[i - 1] === v, rr = r[i + 1] === v, dl = r[i + W - 1] === v, d = r[i + W] === v, dr = r[i + W + 1] === v;
      if (!((n && u && l) || (u && ur && rr) || (l && dl && d) || (rr && d && dr))) flip.push(i);
    }
    const base = known ? r.slice() : null;
    for (const i of flip) { if (lk && lk[i]) continue; r[i] = 1 - r[i]; changed++; }
    if (!changed) break;
    r = fix(r, base);
  }
  return r;
}

// cleanup again after the pocket edits, but kept only within RECLEAN tiles of an edited tile: what a second cleanup does elsewhere (it is not a fixed point) would make a window that edited a pocket differ from one that did
// not, tile by tile far from the edit (the seam); round the edit every window that shows the pocket makes the same edit and so the same second cleanup
const RECLEAN = 16;
function recleanNear(r, snap, W, H, rule, lk) {
  const n = cleanup(r, W, H, rule, lk), D = RECLEAN, h = new Uint8Array(W * H), near = new Uint8Array(W * H), cnt = new Int32Array(Math.max(W, H) + 1);
  for (let y = 0; y < H; y++) { cnt[0] = 0; for (let x = 0; x < W; x++) cnt[x + 1] = cnt[x] + (r[y * W + x] !== snap[y * W + x] ? 1 : 0); for (let x = 0; x < W; x++) if (cnt[Math.min(W, x + D + 1)] - cnt[Math.max(0, x - D)] > 0) h[y * W + x] = 1; }
  for (let x = 0; x < W; x++) { cnt[0] = 0; for (let y = 0; y < H; y++) cnt[y + 1] = cnt[y] + h[y * W + x]; for (let y = 0; y < H; y++) if (cnt[Math.min(H, y + D + 1)] - cnt[Math.max(0, y - D)] > 0) near[y * W + x] = 1; }
  const out = r.slice(); for (let i = 0; i < W * H; i++) if (near[i]) out[i] = n[i];
  return out;
}

// ---- the local checks, for an edit: the same shapes land-measure counts (lone face, pinch, square corner, 1-tile sliver, foot room) at one tile ----
const DBGV = []; export const dbgV = DBGV;
function violAt(r, W, H, x, y, fr) {
  if (x >= 1 && y >= 2 && x < W - 1 && y + footRoom(fr) < H) {   // (land-time-1) clear of the raster's edge every tile read lies inside it: the same checks straight on the array, no closures
    const i = y * W + x, v = r[i]; let n = 0;
    const l = r[i - 1], rr = r[i + 1], u = r[i - W], d = r[i + W];
    if (!((r[i - W - 1] === v && u === v && l === v) || (u === v && r[i - W + 1] === v && rr === v) || (l === v && r[i + W - 1] === v && d === v) || (rr === v && d === v && r[i + W + 1] === v))) { n++; DBGV.push("sliver"); }
    { const c = v * 8 + rr * 4 + d * 2 + r[i + W + 1]; if (c === 6 || c === 9) { n++; DBGV.push("pinch"); } }
    if (v === 1 && d === 0) {
      const lipL = l === 1 && r[i - 1 + W] === 0, lipR = rr === 1 && r[i + 1 + W] === 0;
      if (!lipL && !lipR && !((r[i - W - 1] === 1 && l === 0) || (r[i - W + 1] === 1 && rr === 0) || (r[i + W - 1] === 1 && r[i + 2 * W - 1] === 0) || (r[i + W + 1] === 1 && r[i + 2 * W + 1] === 0)) && !(LEAN_ON && leanAt(r, W, i))) { n++; DBGV.push("lone"); }
      if (!(LEAN_ON && leanAt(r, W, i))) for (let k = 2; k <= footRoom(fr); k++) if (r[i + k * W]) { n++; DBGV.push("foot"); break; }
    }
    return n;
  }
  const R =(a, b) => (a < 0 || b < 0 || a >= W || b >= H ? 0 : r[b * W + a]), lip = (a, b) => R(a, b) === 1 && R(a, b + 1) === 0; let n = 0;
  const v = R(x, y); let ok = false;
  for (let oy = -1; oy <= 0 && !ok; oy++) for (let ox = -1; ox <= 0 && !ok; ox++) ok = R(x + ox, y + oy) === v && R(x + ox + 1, y + oy) === v && R(x + ox, y + oy + 1) === v && R(x + ox + 1, y + oy + 1) === v;
  if (!ok) { n++; DBGV.push("sliver"); }
  { const c = R(x, y) * 8 + R(x + 1, y) * 4 + R(x, y + 1) * 2 + R(x + 1, y + 1); if (c === 6 || c === 9) { n++; DBGV.push("pinch"); } }
  if (lip(x, y)) {
    if (!lip(x - 1, y) && !lip(x + 1, y) && !(lip(x - 1, y - 1) || lip(x + 1, y - 1) || lip(x - 1, y + 1) || lip(x + 1, y + 1))) { n++; DBGV.push("lone"); }
    for (let k = 2; k <= footRoom(fr); k++) if (R(x, y + k)) { n++; DBGV.push("foot"); break; }
  }
  return n;
}
const CAP = { south: 10, side: 10, rim: 14 };   // the run length flattenBumps treats as over (straight runs of one kind)
const violBox =(r, W, H, x0, y0, x1, y1, fr) => { let n = 0; for (let y = Math.max(1, y0 - footRoom(fr)); y <= Math.min(H - 2, y1 + 3); y++) for (let x = Math.max(1, x0 - 3); x <= Math.min(W - 2, x1 + 3); x++) n += violAt(r, W, H, x, y, fr); return n; };

// no one-wide gap between blocking tiles (land-b3e-seam-1): a tile that walks with a blocking tile on both sides (east and west, or north and south) is a gap a place border cannot cross (it needs two). The parts are
// relief.mjs's: a raised tile with a low one beside it is the ring, the low tile under a raised one the face, a low tile beside a raised one or in an end piece's rows the flank; the rest walks.
function blockedAt(r, W, H, x, y) {
  // clear of the raster's edge (the common case) straight on the array, no closure; at the edge the slower reading below, which counts what lies outside as low
  if (x >= 2 && y >= 5 && x < W - 2 && y < H - 4) {
    const i = y * W + x;
    if (r[i]) return !(r[i + 1] && r[i - 1] && r[i + W] && r[i - W]);
    if (r[i - W] || r[i - 2 * W] || r[i - 3 * W] || r[i - 1] || r[i + 1]) return true;
    for (let L = y + 2; L >= y - FACE3; L--) {
      const li = L * W + x; if (r[li]) continue;
      for (let d = -1; d <= 1; d += 2) {
        const xi = li + d; if (!r[xi] || r[xi + W]) continue;
        if (LEAN_ON && leanAt(r, W, xi)) continue;   // a lean has no end piece (relief.mjs endAt)
        let k = 0; while (k < 3 && !r[li - k * W]) k++;
        if (y >= (k >= 3 ? L - 2 : k === 2 ? L - 1 : L) && y <= L + FACE3) return true;
      }
    }
    return false;
  }
  return blockedEdge(r, W, H, x, y);
}
function blockedEdge(r, W, H, x, y) {
  const R = x < 2 || y < 3 || x >= W - 2 || y >= H - 3 ? (a, b) => (a < 0 || b < 0 || a >= W || b >= H ? 0 : r[b * W + a]) : (a, b) => r[b * W + a];   // clear of the raster's edge no tile asked for lies outside it
  if (R(x, y)) return !(R(x + 1, y) && R(x - 1, y) && R(x, y + 1) && R(x, y - 1));
  if (R(x, y - 1) || R(x, y - 2) || R(x, y - 3) || R(x - 1, y) || R(x + 1, y)) return true;   // the 3 rows under a south lip are rock
  for (let L = y + 2; L >= y - FACE3; L--) {   // an end piece's rows: the cell beside a south lip cell of row L, from L - 2 (3 or more low above it) down to L + 3
    if (R(x, L)) continue;
    for (const xl of [x - 1, x + 1]) {
      if (!R(xl, L) || R(xl, L + 1)) continue;
      if (LEAN_ON && xl >= 1 && xl < W - 1 && L >= 1 && leanAt(r, W, L * W + xl)) continue;
      let k = 0; while (k < 3 && !R(x, L - k)) k++;
      if (y >= (k >= 3 ? L - 2 : k === 2 ? L - 1 : L) && y <= L + FACE3) return true;
    }
  }
  return false;
}
const GB = new Uint8Array(256 * 256);
const gapsBox = (r, W, H, x0, y0, x1, y1) => {   // (land-time-1) each tile of the box and the ring round it is asked blockedAt once, not once for itself and once for each neighbour that asks
  const xa = Math.max(1, x0), xb = Math.min(W - 2, x1), ya = Math.max(1, y0), yb = Math.min(H - 2, y1);
  if (xb < xa || yb < ya) return 0;
  const bw = xb - xa + 3; let n = 0;
  for (let y = ya - 1; y <= yb + 1; y++) for (let x = xa - 1; x <= xb + 1; x++) GB[(y - ya + 1) * bw + x - xa + 1] = blockedAt(r, W, H, x, y) ? 1 : 0;
  for (let y = 1; y <= yb - ya + 1; y++) for (let x = 1; x <= xb - xa + 1; x++) { const k = y * bw + x; if (!GB[k] && ((GB[k - 1] && GB[k + 1]) || (GB[k - bw] && GB[k + bw]))) n++; }
  return n;
};
// each gap is closed by the first edit, in a fixed order, that leaves fewer gaps round it and no more failing shape checks: one tile flipped (the nearest first, raised first), or the low run beside it (a bay's tip) raised
function fixGaps(r, W, H, rule, lk, noRaise) {
  let fixed = 0;
  const wr = rule.window, xa = Math.max(5, (wr - 1) * CW - 6), xb = Math.min(W - 5, (wr + 2) * CW + 6), ya = Math.max(5, (wr - 1) * CH - 6), yb = Math.min(H - 5, (wr + 2) * CH + 6);   // the centre cell and the ring of cells round it: what a neighbour's window shows of this cell lies in the same band of its own
  // the blocking tiles of the band, found once (a tile with none raised near it, or all, is quickly told); after an edit only the tiles it can reach (blockedAt reads 2 columns and 5 rows round a tile) are asked again
  const P = new Int32Array((W + 1) * (H + 1)); for (let y = 0; y < H; y++) { let s = 0; for (let x = 0; x < W; x++) { s += r[y * W + x]; P[(y + 1) * (W + 1) + x + 1] = P[y * (W + 1) + x + 1] + s; } }
  const sum = (x0, y0, x1, y1) => P[(y1 + 1) * (W + 1) + x1 + 1] - P[y0 * (W + 1) + x1 + 1] - P[(y1 + 1) * (W + 1) + x0] + P[y0 * (W + 1) + x0];
  const bl = new Uint8Array(W * H); for (let y = ya - 3; y < yb + 3; y++) for (let x = xa - 3; x < xb + 3; x++) { const i = y * W + x; if (r[i] ? sum(x - 1, y - 1, x + 1, y + 1) === 9 : sum(x - 1, y - 3, x + 1, y + 2) === 0) continue; bl[i] = blockedAt(r, W, H, x, y) ? 1 : 0; }
  const again = set => { let x0 = W, x1 = -1, y0 = H, y1 = -1; for (const [a, c] of set) { if (a < x0) x0 = a; if (a > x1) x1 = a; if (c < y0) y0 = c; if (c > y1) y1 = c; }
    for (let y = Math.max(ya - 3, y0 - 6); y <= Math.min(yb + 2, y1 + 6); y++) for (let x = Math.max(xa - 3, x0 - 6); x <= Math.min(xb + 2, x1 + 6); x++) bl[y * W + x] = blockedAt(r, W, H, x, y) ? 1 : 0; };
  for (let round = 0; round < 16; round++) { let hit = false;
    for (let y = ya; y < yb && !hit; y++) for (let x = xa; x < xb && !hit; x++) {
      const gi = y * W + x; if (bl[gi] || !((bl[gi - 1] && bl[gi + 1]) || (bl[gi - W] && bl[gi + W]))) continue;
      const sets = [];
      for (let d = 1; d <= 3; d++) for (const raise of [1, 0]) for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === d && (r[(y + dy) * W + x + dx] === 1) !== !!raise) sets.push([[x + dx, y + dy]]);
      for (const dy of [-1, 0, 1]) { const yy = y + dy; let a = x, b = x; while (a > 1 && !r[yy * W + a - 1]) a--; while (b < W - 2 && !r[yy * W + b + 1]) b++; if (!r[yy * W + x] && b - a < 5) { const s = []; for (let t = a; t <= b; t++) s.push([t, yy]); sets.push(s); } }
      let g0 = -1, v0 = 0; const bx = [x - 6, y - 6, x + 6, y + 6];   // (land-time-1) the box's counts before an edit are the same for every set tried here (each is put back), so counted once
      for (const s of sets) {
        if (s.some(([a, c]) => a < 3 || c < 3 || a >= W - 3 || c >= H - 3 || (lk && lk[c * W + a]) || (!r[c * W + a] && noRaise[c * W + a]))) continue;
        DBGV.length = 0;
        if (g0 < 0) { g0 = gapsBox(r, W, H, ...bx); v0 = violBox(r, W, H, ...bx, rule.faceRows); }
        for (const [a, c] of s) r[c * W + a] ^= 1;
        if (gapsBox(r, W, H, ...bx) < g0 && violBox(r, W, H, ...bx, rule.faceRows) <= v0) { fixed++; hit = true; again(s); break; }
        for (const [a, c] of s) r[c * W + a] ^= 1;
      }
    }
    if (!hit) break;
  }
  return fixed;
}

// land-reach-1 (cliff-rules 6, designer 2026-11-16: no bump or notch under 2 tiles): a strip of raised land (a bump) or low land (a notch) one tile thick and 1 to BUMP_MAX tiles long that stands out of a
// straight edge and comes back (the tile beyond it and the tiles before and after it along the edge are the other level, the tiles behind it its own) is cut (a bump) or filled (a notch), so the edge runs
// straight past it. Its two one-tile turns would draw as a lean and a lean back (a face one tile wide). An edit is kept when it makes no shape check fail that did not, leaves no straight run over its cap,
// and touches no held tile (and raises none the rule keeps low). Found in raster order (the world's order in every window). Returns the number of edits.
export const BUMP_MAX = 4, BUMP_READ = 8, BUMP_WHY = { done: 0, held: 0, viol: 0, cap: 0 };   // BUMP_WHY: the tools' count of what the pass did and why it left a strip
let BUMPS_ON = true;
export const setBumps = (on) => { BUMPS_ON = !!on; GEN++; };   // the tools: the land with the pass off (before / after counts)
// Every strip is judged on the land as the pass found it (a snapshot), never on another strip's edit, so no chain of edits carries a difference in from a window's ring (the seam); the edits are then made
// together, and one whose box fails more shape checks than the snapshot's did (two edits side by side) is undone.
// Every read a decision makes lies inside one cell (the cell's tiles are the same in every window that shows it at or next to its middle; a window's outer ring of cells may differ from the true land,
// even a few tiles from the cells it shares: the seam), so a strip whose reads would cross a cell edge is left.
function flattenBumps(rOut, W, H, rule, lk, noRaise, gx0, gy0) {
  if (!BUMPS_ON) return 0;
  const r = rOut.slice(), R = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? -1 : r[y * W + x]), acc = [], fr = footRoom(rule.faceRows); let n = 0;
  let cx0 = 0, cy0 = 0, cx1 = 0, cy1 = 0;   // the cell the current strip's reads must stay in (window tiles)
  const inCell = (x, y) => x >= cx0 && x <= cx1 && y >= cy0 && y <= cy1;
  // the shape checks an edit of the tiles T can change: violAt of every tile that reads one of them (1 column each side, footRoom rows above, 2 below); and what those checks read (2 columns, 2 rows above,
  // footRoom below): null when that leaves the cell
  const boxOf = T => { let a = 1e9, b = 1e9, c = -1, d = -1; for (const [i] of T) { const x = i % W, y = (i / W) | 0; if (x < a) a = x; if (x > c) c = x; if (y < b) b = y; if (y > d) d = y; }
    const box = [a - 1, b - fr, c + 1, d + 2]; return inCell(box[0] - 1, box[1] - 2) && inCell(box[2] + 1, box[3] + fr) ? box : null; };
  const count = (arr, box) => { let s = 0; for (let y = box[1]; y <= box[3]; y++) for (let x = box[0]; x <= box[2]; x++) s += violAt(arr, W, H, x, y, rule.faceRows); return s; };
  // the straight run of edge tiles through (x, y) that face (ox, oy) (raised, the tile that way low), along the edge; a run that reaches the cell's edge is taken as over its cap
  const runAt = (x, y, ox, oy) => { const ax = oy ? 1 : 0, ay = ox ? 1 : 0, is = (a, b) => R(a, b) === 1 && R(a + ox, b + oy) === 0; if (!is(x, y)) return 0;
    let k = 1, t = 1; for (; is(x + t * ax, y + t * ay); t++) { if (!inCell(x + t * ax + ox, y + t * ay + oy) || !inCell(x + (t + 1) * ax, y + (t + 1) * ay)) return 1e9; k++; }
    for (t = 1; is(x - t * ax, y - t * ay); t++) { if (!inCell(x - t * ax + ox, y - t * ay + oy) || !inCell(x - (t + 1) * ax, y - (t + 1) * ay)) return 1e9; k++; } return k; };
  const capOf = (ox, oy) => (ox ? CAP.side : oy > 0 ? CAP.south : CAP.rim);
  // only the window's middle cell and the ring of cells round it: the place keeps the middle cell, and the seam compares the cells next to it; a decision reads one cell, so these come out the same
  const wr = rule.window, ya = Math.max(2, (wr - 1) * CH), yb = Math.min(H - 2, (wr + 2) * CH), xa = Math.max(2, (wr - 1) * CW), xb = Math.min(W - 2, (wr + 2) * CW);
  for (let y = ya; y < yb; y++) for (let x = xa; x < xb; x++) {
    const i0 = y * W + x, v0 = r[i0]; if (r[i0 - 1] === v0 && r[i0 + 1] === v0 && r[i0 - W] === v0 && r[i0 + W] === v0) continue;   // no edge at this tile
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const v = v0, ax = oy ? 1 : 0, ay = ox ? 1 : 0; if (R(x + ox, y + oy) !== 1 - v || R(x - ax, y - ay) === v) continue;
    let k = 0; while (k <= BUMP_MAX && R(x + k * ax, y + k * ay) === v && R(x + k * ax + ox, y + k * ay + oy) === 1 - v) k++;
    if (k < 1 || k > BUMP_MAX || R(x + k * ax, y + k * ay) !== 1 - v) continue;
    let ok = true; for (let j = -1; j <= k && ok; j++) if (R(x + j * ax - ox, y + j * ay - oy) !== v) ok = false;
    if (!ok) continue;
    { const X = Math.floor((gx0 + x) / CW), Y = Math.floor((gy0 + y) / CH); cx0 = X * CW - gx0; cy0 = Y * CH - gy0; cx1 = cx0 + CW - 1; cy1 = cy0 + CH - 1; }
    if (!inCell(x - ax - Math.abs(ox), y - ay - Math.abs(oy)) || !inCell(x + k * ax + Math.abs(ox), y + k * ay + Math.abs(oy))) { BUMP_WHY.edge = (BUMP_WHY.edge || 0) + 1; continue; }
    // the edits tried, in order: the strip turned to the other level (a bump cut, a notch filled: the edge runs straight past it), else the strip carried on along the edge, forward then back, by 1 to
    // BUMP_MAX tiles of its own level (it then meets the next turn, a corner or another step, and its out-and-back becomes one step)
    const strip = []; for (let j = 0; j < k; j++) strip.push([(y + j * ay) * W + x + j * ax, 1 - v]);
    const tries = [strip];
    for (const dir of [1, -1]) for (let m = 1; m <= BUMP_MAX; m++) { const t = []; for (let j = 0; j < m; j++) { const jj = dir > 0 ? k + j : -1 - j; t.push([(y + jj * ay) * W + x + jj * ax, v]); } tries.push(t); }
    let done = false, why = null;
    for (const t of tries) {
      if (t.some(([i, to]) => i < 0 || i >= W * H || (lk && lk[i]) || (to === 1 && noRaise[i]) || r[i] === to)) { why = why || 'held'; continue; }
      const box = boxOf(t); if (!box) { why = why || 'edge'; continue; }
      DBGV.length = 0; const before = count(r, box);
      for (const [i, to] of t) r[i] = to;
      // the edge a cut or fill leaves: a bump cut leaves the tiles behind it facing out; a notch filled leaves the strip itself facing back (a carried strip makes no longer run than was there)
      const ex = v ? x - ox : x, ey = v ? y - oy : y, fx = v ? ox : -ox, fy = v ? oy : -oy;
      DBGV.length = 0;
      // a carried strip must end the out-and-back: past its new end the edge turns (a corner or a step), it does not come back to the line (that would only be a longer bump)
      let back = false; if (t !== strip) { const dir = t[0][0] === (y + k * ay) * W + x + k * ax ? 1 : -1; let j = dir > 0 ? k : -1;
        while (inCell(x + j * ax + ox, y + j * ay + oy) && inCell(x + j * ax - ox, y + j * ay - oy) && R(x + j * ax, y + j * ay) === v && R(x + j * ax + ox, y + j * ay + oy) === 1 - v) j += dir;
        back = !inCell(x + j * ax + ox, y + j * ay + oy) || !inCell(x + j * ax - ox, y + j * ay - oy) || (R(x + j * ax, y + j * ay) === 1 - v && R(x + j * ax - ox, y + j * ay - oy) === v); }
      const vb = count(r, box) > before, cp = back || (t === strip && runAt(ex, ey, fx, fy) > capOf(fx, fy));
      for (const [i, to] of t) r[i] = 1 - to;
      if (!vb && !cp) { done = true; acc.push({ t, box, before }); break; }
      if (!why || why === 'held') why = vb ? 'viol' : 'cap';
    }
    if (!done) BUMP_WHY[why || 'held']++;
  } }
  // the edits made together (in raster order; one whose tiles another has changed already is passed over), then each checked on the result
  const made = [];
  for (const e of acc) { if (e.t.some(([i]) => rOut[i] !== r[i])) { BUMP_WHY.clash = (BUMP_WHY.clash || 0) + 1; continue; } for (const [i, to] of e.t) rOut[i] = to; made.push(e); }
  for (const e of made) { DBGV.length = 0; if (count(rOut, e.box) > e.before) { for (const [i, to] of e.t) rOut[i] = 1 - to; BUMP_WHY.undone = (BUMP_WHY.undone || 0) + 1; } else { n++; BUMP_WHY.done++; } }
  return n;
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
      // none alone: two or three tiles flipped together within 2 tiles (a one-tile wall, a jog beside a held site): the set that leaves the fewest failing checks in the box round the tile, smallest and first in a fixed order
      // on a tie, kept only when it is fewer than before
      if (!done) {
        const cs = []; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const a = x + dx, b = y + dy; if (a >= 1 && b >= 1 && a < W - 1 && b < H - 1 && !(lk && lk[b * W + a]) && (r[b * W + a] || !noRaise[b * W + a])) cs.push(b * W + a); }
        const bx = [x - 3, y - 3, x + 3, y + 3]; DBGV.length = 0; const before = violBox(r, W, H, ...bx, rule.faceRows); let best = before, pick = null;
        const tryset = s => { for (const i of s) r[i] ^= 1; DBGV.length = 0; const v = violBox(r, W, H, ...bx, rule.faceRows); for (const i of s) r[i] ^= 1; if (v < best) { best = v; pick = s; } return v === 0; };
        // a lip with a raised tile too near below it (a short foot) first has the low tiles between raised, whatever their number (what the foot-room pass P6 does), when none is held or kept low
        // (or, where one of them may not be raised, the raised tile itself lowered)
        const fill = []; let near = -1; if (r[y * W + x] && !r[(y + 1) * W + x]) for (let k = 2; k <= footRoom(rule.faceRows); k++) if (r[(y + k) * W + x]) { for (let j = 1; j < k; j++) fill.push((y + j) * W + x); near = (y + k) * W + x; break; }
        search: {
          if (fill.length && fill.every(i => !(lk && lk[i]) && !noRaise[i]) && tryset(fill)) break search;
          if (near >= 0 && !(lk && lk[near]) && tryset([near])) break search;
          for (let p = 0; p < cs.length; p++) for (let q = p + 1; q < cs.length; q++) if (tryset([cs[p], cs[q]])) break search;
          for (let p = 0; p < cs.length; p++) for (let q = p + 1; q < cs.length; q++) for (let t = q + 1; t < cs.length; t++) if (tryset([cs[p], cs[q], cs[t]])) break search;
        }
        if (pick) { for (const i of pick) r[i] ^= 1; hit++; fixed++; }
      }
    }
    if (!hit) break;
  }
  return fixed;
}

// ---- the walk, on the raster: the game's own parts (relief.mjs) ----
// raised with a low tile beside it blocks (the lip, the side's rim); a low tile under a raised one (the face) or beside one (the flank, and the cell beyond a face's end) blocks; water that is not a ford blocks;
// a way up's tiles walk. Components are found 4-connected; a component that reaches the window's edge or the coast belongs to more land than the window sees.
// land-b3f-foot-1: the 3 rows under a south lip are rock (relief.mjs FACE_ROWS); a low tile is face when the first raised tile going up within them is not a way up's
const FACE3 = 3;   // the land rule's faceRows (land-rule.json, the piece table's too); a constant because the walk mirror below has no rule at hand
const rockUnder = (R, W, way, x, y) => { for (let d = 1; d <= FACE3; d++) { if (y - d < 0) return false; const i = (y - d) * W + x; if (R[i]) return !way[i] && (d === 1 || !way[i + W]); } return false; };
function walkParts(R, W, H, way, wblock) {
  const wk = new Uint8Array(W * H), r = (x, y) => R[(y < 0 ? 0 : y >= H ? H - 1 : y) * W + (x < 0 ? 0 : x >= W ? W - 1 : x)];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (way[i]) { wk[i] = 1; continue; }
    if (x > 0 && y > 0 && x < W - 1 && y < H - 1) {   // (land-time-1) clear of the raster's edge the neighbours are read straight
      if (R[i]) wk[i] = R[i + 1] && R[i - 1] && R[i + W] && R[i - W] ? 1 : 0;
      else wk[i] = R[i - 1] || R[i + 1] || wblock[i] || rockUnder(R, W, way, x, y) ? 0 : 1;
      continue;
    }
    if (R[i]) wk[i] = r(x + 1, y) && r(x - 1, y) && r(x, y + 1) && r(x, y - 1) ? 1 : 0;
    else wk[i] = wblock[i] || rockUnder(R, W, way, x, y) || r(x - 1, y) || r(x + 1, y) ? 0 : 1;
  }
  for (let y = 0; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (R[y * W + x] && !R[(y + 1) * W + x] && !(LEAN_ON && y >= 1 && leanAt(R, W, y * W + x)))   // the cell beyond a south run's end: rows L - 2 .. L + 3 are the end piece's (a lean has none)
    for (const dx of [-1, 1]) if (!R[y * W + x + dx]) for (let j = -2; j <= FACE3; j++) if (y + j >= 0 && y + j < H && !R[(y + j) * W + x + dx] && !way[(y + j) * W + x + dx]) wk[(y + j) * W + x + dx] = 0;
  return wk;
}
function components(wk, W, H, edge, way) {
  const lab = new Int32Array(W * H).fill(-1), comps = [], q = new Int32Array(W * H);
  for (let s = 0; s < W * H; s++) {
    if (!wk[s] || lab[s] >= 0) continue;
    const id = comps.length, c = { id, n: 0, open: false, way: false, up: 0, tiles: [] }; let h = 0, n = 0; q[n++] = s; lab[s] = id;
    while (h < n) { const i = q[h++], x = i % W; c.tiles.push(i); if (edge[i]) c.open = true; if (way[i]) c.way = true;   // (land-time-1) the four neighbours read straight, in the same order (east, west, south, north)
      if (x + 1 < W) { const m = i + 1; if (wk[m] && lab[m] < 0) { lab[m] = id; q[n++] = m; } }
      if (x > 0) { const m = i - 1; if (wk[m] && lab[m] < 0) { lab[m] = id; q[n++] = m; } }
      if (i + W < wk.length) { const m = i + W; if (wk[m] && lab[m] < 0) { lab[m] = id; q[n++] = m; } }
      if (i >= W) { const m = i - W; if (wk[m] && lab[m] < 0) { lab[m] = id; q[n++] = m; } } }
    c.n = c.tiles.length; comps.push(c);
  }
  return { lab, comps };
}
// the 4-connected blob of tiles equal to `v` that holds the component's tiles (ignoring held tiles); null when it reaches the window's rim or holds a blocked tile
// place-walk-1: `box` ([x0, y0, x1, y1] in window tiles) is where the blob may lie (the caller gives the component's box and 10 tiles round it, kept within the cells it touches and one round them). A blob that reaches past it
// is left, as one that reaches the rim was, so the answer does not depend on where the window's rim falls (a neighbour's window ended inside a plateau that this one saw to its end: the seam).
function blobOf(r, W, H, tiles, v, limit, bad, box) {
  const seen = new Set(tiles.filter(i => r[i] === v)), q = [...seen];
  for (let h = 0; h < q.length; h++) {
    if (q.length > limit) return null;
    const i = q[h], x = i % W, y = (i / W) | 0; if (bad && bad[i]) return null; if (x < 3 || y < 3 || x >= W - 3 || y >= H - 3) return null;
    if (box && (x < box[0] || y < box[1] || x > box[2] || y > box[3])) return null;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const m = (y + dy) * W + x + dx; if (!seen.has(m) && r[m] === v) { seen.add(m); q.push(m); } }
  }
  return q;
}

// ---- the levels of one cell ----
// The raster is the cell with a cell's width round it; what the passes do at the raster's rim stays in the ring, so the cell is the same from every neighbour's window.
// rupar-banks-speed-2: a window made with no banks (the verdict's) is kept; the same cell's window with banks is that very window when no bank site lands in it (banks are the only thing BANKS_SKIP changes), so it is returned whole
export function windowLevels(L, X, Y) {
  // rupar-banks-slice-2: the banks come from the region lists (banksIn), so the window is made once, with them; no bank verdict here unless a list is not made yet
  return windowLevelsMake(L, X, Y);
}
// the window of cell (X, Y) made with no banks, kept per cell
function noBankWindow(L, X, Y) {
  const B = bkOf(L), key = (X + 8) * 1000 + (Y + 8), hit = B.nbw && B.nbw.get(key); if (hit) return hit;
  const was = BANKS_SKIP; BANKS_SKIP = true; let w;
  try { w = windowLevelsMake(L, X, Y); } finally { BANKS_SKIP = was; }
  if (!B.nbw) B.nbw = new Map(); if (B.nbw.size > 12) B.nbw.clear(); B.nbw.set(key, w); return w;
}
function windowLevelsMake(L, X, Y) {
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
  // a water cell (not a ford) is water to its corners: the wet field falls under the threshold at the corners beside dry cells, so the whole cell is held low as well
  if (L.rule.holdWater !== 0) for (let j = 0; j <= 2 * WR; j++) for (let i = 0; i <= 2 * WR; i++) {
    const cx = X0w + i, cy = Y0w + j; if (!inRealm(cx, cy)) continue; const c = cy * RW + cx; if (L.realm.land[c] !== LAND.WATER || L.realm.ford[c]) continue;
    for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CW; tx++) { const k = (j * CH + ty) * W + i * CW + tx; held[k] = 1; if (q[k] >= 0) q[k] = -1; }
  }
  const gx0 = X0w * CW, gy0 = Y0w * CH, fr = L.rule.faceRows;
  // tiles the land rule may not raise: water held low, and the coast's twelve tiles
  const noRaise = new Uint8Array(W * H), wblock = new Uint8Array(W * H), edge = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x, gx = gx0 + x, gy = gy0 + y, inl = inlandOf(gx, gy);
    noRaise[i] = held[i] || inl < RAISE_OFF + 1 ? 1 : 0;
    wblock[i] = wr[i] && !(inRealm(Math.floor(gx / CW), Math.floor(gy / CH)) && L.realm.ford[cellIdx(Math.floor(gx / CW), Math.floor(gy / CH))]) ? 1 : 0;
    edge[i] = x < 2 || y < 2 || x >= W - 2 || y >= H - 2 || inl < 6 ? 1 : 0; }
  // map-levels-build-1: the window's first raster is the terraced field's own (rfCell: the smoothed field read per block row, water held low, parts under PART_MIN lowered), cell by cell, so every window
  // holds the same raster where it shows the same land (stationary); the window's own smoothing is gone
  // one raster per boundary (level above k), each cleaned on its own; a higher level lies inside the lower one
  const out = new Uint8Array(W * H); let below = null; const info = { sites: [], filled: [], pockets: [], pocketStairs: [], dbg: !!globalThis.B3C_DBG };
  for (let k = 0; k < th.length; k++) {
    const base = new Uint8Array(W * H);
    if (k === 0) { for (let j = 0; j <= 2 * WR; j++) for (let i = 0; i <= 2 * WR; i++) { const f = rfCell(L, X0w + i, Y0w + j);
      for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CW; tx++) base[(j * CH + ty) * W + i * CW + tx] = f[ty * CW + tx]; } }
    else for (let i = 0; i < W * H; i++) base[i] = q[i] >= th[k] && !held[i] && below[i] ? 1 : 0;
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
  const clearAt = (x0, lip) => { for (let y = lip - SITE_UP; y <= lip; y++) for (let x = x0 - 1; x < x0 + SITE_W + 1; x++) if (held(x, y)) return false;
    for (let y = lip + 1; y <= lip + footRoom(L.rule.faceRows); y++) for (let x = x0 + 1; x < x0 + SITE_W - 1; x++) if (wet(x, y)) return false; return true; };
  const clear = x0 => clearAt(x0, st.lip);
  // land-reach-1: first a site on the land's own contour, read on the smoothed field the threshold draws (the rule's `smooth`), anywhere along the edge from the cell west to the cell east, nearest the port:
  // the 4 middle columns raised from the lip row up SITE_UP + 2 rows and low from the row under the lip down past the foot and 3 walkable rows more, the outer two columns raised on the lip row and low under it
  // (a straight lip), and no water at the foot. A way up there joins the top it climbs from to the low land it meets (the old choice could cut a pit into raised land, or heap a mesa on low land: 48 of
  // seed 7's 188 ways up led into a pit or onto a mesa). From the field only, so every window finds the same site. None: the choice below.
  { const nat2 = natSite(L, st, wet, (x0, ly) => clearAt(x0, ly)); if (nat2) { st.x0 = nat2[0]; st.lip = nat2[1]; st.ok = true; st.nat = true; return st; } }
  const base = st.x0, lo = st.X * CW + 2, hi = st.X * CW + CW - SITE_W - 2;
  // first a place where the field itself is raised above the lip and low below it (the site cuts no pit into raised land and heaps no hill on low land), else any clear one
  const nat = x0 => { const lr = st.lip - st.Y * CH; let hi = 0, lo = 0; for (let c = x0 - st.X * CW; c < x0 - st.X * CW + SITE_W; c++) { if (qAt(c, lr - 2) >= 0) hi++; if (qAt(c, lr + 3) < 0) lo++; } return hi >= 3 && lo >= 3; };
  // room at the foot (f4 fix 7): under the foot rows, 3 rows of walkable low ground across the way up's 2 columns and 1 column each side, before any cliff, lip or water (a cliff or a pond 2 rows under the foot
  // makes the place's settle drop the stem, and the foot would stand in a pocket); a site without it is passed over for the next held straight on the face
  const room = x0 => { const lr = st.lip - st.Y * CH + L.rule.faceRows + 1;
    for (let r = lr + 1; r <= lr + 3; r++) for (let c = x0 - st.X * CW + 1; c <= x0 - st.X * CW + SITE_W - 2; c++) { if (qAt(c, r) >= 0) return false; const gx = st.X * CW + c, gy = st.Y * CH + r; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (wet(gx + dx, gy + dy)) return false; }
    return true; };
  for (const needRoom of [true, false]) for (const strict of [true, false]) for (let d = 0; d <= 11; d++) for (const s of d ? [1, -1] : [1]) { const x0 = base + s * d; if (x0 < lo || x0 > hi) continue; if ((!strict || nat(x0)) && clear(x0) && (!needRoom || room(x0))) { st.x0 = x0; st.ok = true; st.room = needRoom; return st; } }   // a site with room first; none: the old choice (a stair the realm planned keeps its way up: dropping it left whole regions unreached, 16-20 stairs a seed)
  return st;
}
// land-reach-1: the natural site of a stair on the edge (st.X, st.Y)-(st.X, st.Y + 1), or null: [x0, lip] in world tiles (see siteOf). The field is the terraced one (rfAt), the first raster windowLevels cuts.
export const NAT_FOOT = 3, NAT_PART = 200, NAT_DEEP = 20;   // NAT_DEEP: the lip row may lie this many rows into the lower cell (a basin whose tip starts low in it)   // walkable low rows under the foot row; the field part a way up must climb from and to (tiles, or the search box's rim)
function natSite(L, st, wet, clearAt) {
  const rad = L.rule.smooth | 0, foot = footRoom(L.rule.faceRows), up = SITE_UP + 2, down = foot + NAT_FOOT - 1;   // footRoom counts the foot row and one walkable row
  const xa = (st.X - 1) * CW + 2, xb = (st.X + 2) * CW - SITE_W - 2, ya = st.Y * CH + 10, yb = (st.Y + 1) * CH + NAT_DEEP;
  const M = 16, bx0 = xa - rad - M, by0 = ya - up - rad - M, bw = xb + SITE_W + rad + M - bx0, bh = yb + down + 1 + rad + M - by0;   // M: room for the part floods (wide)
  const S = new Int8Array(bw * bh).fill(-1);   // 1 raised, 0 low, -1 not read
  const up1 = (gx, gy) => { const x = gx - bx0, y = gy - by0, k = y * bw + x; if (S[k] >= 0) return S[k];
    return (S[k] = rfAt(L, gx, gy)); };   // map-levels-build-1: the terraced field's own raster
  const ok = (x0, ly, loose = false) => {
    // the way up's 2 columns: the contour on the lip row; the other 4: within a row of it (the held site makes the 6 straight), so the land above and below is 6 wide (over the minimum feature: the cleanup
    // keeps it). `loose` (map-levels-build-1, a terrace face of 4 or 5 tiles): the other 4 columns as the field has them, whatever that is; the lock makes the six straight.
    for (let c = x0; c < x0 + SITE_W; c++) { const way = c === x0 + 2 || c === x0 + 3, e = way ? 0 : 1; if (loose && !way) continue;
      for (let r = ly - up; r <= ly - e; r++) if (!up1(c, r)) return false; for (let r = ly + 1 + e; r <= ly + down; r++) if (up1(c, r)) return false; }
    for (let r = ly + 1; r <= ly + down; r++) for (let c = x0 - 1; c <= x0 + SITE_W; c++) if (wet(c, r)) return false;
    return clearAt(x0, ly) && wide(x0 + 2, ly + down, 0) && wide(x0 + 2, ly - up, 1);
  };
  // the low land under the foot and the raised land over the top go on (the field's part holds NAT_PART tiles or reaches the box's rim): a dip the cleanup fills, or a knoll it lowers, is no place to climb to
  function wide(x, y, v) { const seen = new Set([y * 4096 + x]), q = [[x, y]];
    for (let k = 0; k < q.length; k++) { if (q.length >= NAT_PART) return true; const [a, b] = q[k];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = a + dx, yy = b + dy; if (xx - rad < bx0 + rad || yy - rad < by0 + rad || xx + rad >= bx0 + bw - rad || yy + rad >= by0 + bh - rad) return true;
        const key = yy * 4096 + xx; if (!seen.has(key) && up1(xx, yy) === v) { seen.add(key); q.push([xx, yy]); } } }
    return false; }
  const base = st.X * CW + st.port - 2, xs = [];
  for (let d = 0; base + d <= xb || base - d >= xa; d++) for (const s of d ? [1, -1] : [1]) { const x0 = base + s * d; if (x0 >= xa && x0 <= xb) xs.push(x0); }
  const lips = []; for (let d = 0; d <= 22; d++) for (const s of d ? [1, -1] : [1]) { const y = st.Y * CH + CH - 1 + s * d; if (y >= ya && y <= yb) lips.push(y); }
  for (const loose of [false, true]) for (const x0 of xs) for (const ly of lips) if (ok(x0, ly, loose)) return [x0, ly];
  return null;
}
// a pocket stair's site is made only where every tile it holds raised may be raised (none is held low by water or the coast): else its lip would stand alone beside tiles the rule keeps low
const siteRaisable = (noRaise, W, lx, ly) => { for (let y = ly - SITE_UP; y <= ly; y++) for (let x = lx; x < lx + SITE_W; x++) if (noRaise[y * W + x]) return false; return true; };
// cliff-contour-2 (seam-safe pocket stairs, GD 11-16): a pocket stair changes the land round its site (its held rows and what the cleanup does near them), so it is cut only where every window the seam
// check compares on those cells (the windows centred on them and on their 4-neighbours) sees the whole pocket, with its 6-tile footprint, at least STAIR_RIM tiles in from that window's rim: then each of
// them finds the same shut pocket and cuts the same stair. Else the pocket is left (listed as deferred), as a pocket too large for its cells is. Two seed 13 cases under land-rule smooth broke this: a low pocket
// closing on one window's last raster row (open there) and a coast plateau reaching one window's rim ring; the other window cut a stair whose held rows reshaped tiles in the shared cell.
const FILL_UNDER = 200;   // land-reach-1 (designer 2026-11-16): a closed part under this many walkable tiles is filled to its neighbours' level; this many or more takes a way up
const STAIR_RIM = 2, STAIR_REACH = 4;   // the window's edge band (2 tiles); how far the cleanup carries a held tile's change
function stairSeenBy(gx0, gy0, W, foot, WR) {
  // edit: the window tiles the edit sets [ex0, ey0, ex1, ey1] (a stair: its site; a fill: the pocket and its ring), or null for the stair at (lx, ly)
  return (tiles, lx, ly, edit = null) => {
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1; for (const i of tiles) { const x = i % W, y = (i / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const [ex0, ey0, ex1, ey1] = edit || [lx, ly - SITE_UP, lx + SITE_W - 1, ly + foot];
    const fx0 = gx0 + Math.min(x0, ex0) - 6, fx1 = gx0 + Math.max(x1, ex1) + 6, fy0 = gy0 + Math.min(y0, ey0) - 6, fy1 = gy0 + Math.max(y1, ey1) + 6;
    const cx0 = Math.floor((gx0 + ex0 - STAIR_REACH) / CW), cx1 = Math.floor((gx0 + ex1 + STAIR_REACH) / CW), cy0 = Math.floor((gy0 + ey0 - STAIR_REACH) / CH), cy1 = Math.floor((gy0 + ey1 + STAIR_REACH) / CH);
    // the windows centred on cx0 - 1 .. cx1 + 1 (rows cy0 .. cy1) and on cy0 - 1 .. cy1 + 1 (columns cx0 .. cx1) span cells c - WR .. c + WR
    return fx0 >= (cx1 + 1 - WR) * CW + STAIR_RIM && fx1 <= (cx0 + WR) * CW - 1 - STAIR_RIM && fy0 >= (cy1 + 1 - WR) * CH + STAIR_RIM && fy1 <= (cy0 + WR) * CH - 1 - STAIR_RIM;
  };
}
// ---- rupar-banks-7-1: the Rupar's earth bank (cliff-rules 8; designer 2026-11-16) ----
// Raised land of BANK_PART tiles or more that has no way up gets one way-up site, undug: an earth bank that blocks until a Rupar digs it. The decision is the world's, never a window's: it is made on the land's
// own field (the smoothed q the threshold draws, water held low) by flooding each raised part whole (the same part from any tile of it), so every window that shows the site holds the same six columns straight
// and the seam is untouched. A part has a way up when a realm stair's site stands on it, or when a window could cut a pocket stair on one of its south faces (the pocket rule's own seen-whole geometry, applied
// to the part's box): those parts are left to the old rules. A part flooding past BANK_FLOOD tiles is the land's own (a plateau with its ways up).
export const BANK_PART = 200, BANK_FLOOD = 12000;
let BANKS_SKIP = false;   // a window made with no banks (the verdict on a part asks what the plain rules leave of it)
const BK_KEY = (gx, gy) => gy * 8192 + gx;
// rupar-banks-speed-2: the part labels of the tiles, a Map's get/set/clear/size over one array per cell (a flood reads and writes some tens of thousands of tiles; the cell last used is kept)
class TileLab {
  constructor() { this.cells = new Map(); this.size = 0; this.ck = -1; this.ca = null; }
  arr(x, y, make) { const k = ((y / CH) | 0) * 1000 + ((x / CW) | 0); if (k === this.ck) return this.ca; let a = this.cells.get(k); if (!a) { if (!make) return null; a = new Int32Array(N); this.cells.set(k, a); } this.ck = k; this.ca = a; return a; }
  get(k) { const x = k & 8191, y = k >> 13; if (y < 0) return undefined; const a = this.arr(x, y, false); if (!a) return undefined; const v = a[(y % CH) * CW + x % CW]; return v ? v - 1 : undefined; }
  set(k, id) { const x = k & 8191, y = k >> 13, a = this.arr(x, y, true), i = (y % CH) * CW + x % CW; if (!a[i]) this.size++; a[i] = id + 1; }
  clear() { this.cells.clear(); this.size = 0; this.ck = -1; this.ca = null; }
}
function bkOf(L) { return L.bkd || (L.bkd = { rf: new Map(), lab: new TileLab(), parts: [], banks: new Map(), land: new Map(), why: {} }); }
const landWet = (L, gx, gy) => { const X = Math.floor(gx / CW), Y = Math.floor(gy / CH); return L.rule.holdWater !== 0 && inlandOf(gx, gy) >= WET_REACH && wetCell(L, X, Y)[(gy - Y * CH) * CW + gx - X * CW] === 1; };
const heldTile = (L, gx, gy) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (landWet(L, gx + dx, gy + dy)) return true; return inlandOf(gx, gy) < RAISE_OFF + 1; };
// map-levels-build-1: the field's raised tiles of one cell (1 raised), windowLevels' own first raster, cell by cell: the terrace lattice. Columns of the world are cut into blocks of 4 to 7 tiles (super-blocks of
// SB tiles from a seed offset, each split by its hash into one of the compositions of SB into parts 4..7). Every row of a block takes one value (the block's mean of the smoothed field against the threshold), so every
// raised run in every row, and every south face, is whole blocks: 4 tiles or more. A pure function of the world column and the seed: every window reads the same blocks (stationary). A block row holding a tile held
// low (water and its ring) or the coast's band is low whole.
const SB = 20, BMIN = 4, BMAX = 7, COMPS = [];
(function comps(left, acc) { if (!left) { COMPS.push(acc); return; } for (let p = BMIN; p <= Math.min(BMAX, left); p++) if (left - p === 0 || left - p >= BMIN) comps(left - p, [...acc, p]); })(SB, []);
// map-levels-build-2: no straight run past JOG_RUN (12) tiles. Side walls: the block columns of a band of JOG_RUN rows are shifted 0, or 1-2 columns in every other band (a jog of 1-2 after at most 12 rows).
// South runs: block k of a super-block of n blocks reads the field SY rows higher (SY = 0 for the first, 1-2 for odd k, 0 for even k, but 1-2 for a last even k), so neighbouring blocks never share an edge row
// and a run of equal rows is one block (7 tiles) at most; across super-blocks the last block's shift is never 0 and the next super-block starts at 0.
export const JOG_RUN = 9;   // the band height; the land's cleanup joins a short bump to its band, so the longest run on the ten test seeds is 15 and 12 for all but a few
function blockOf0(seed, gx) {   // [first column, end column, row shift] of the block holding world column gx (the shift is the south jog)
  const o = hash2(7, 11, subSeed(seed, 'terrace-o')) % SB, j = Math.floor((gx + o) / SB), parts = COMPS[hash2(j, 3, subSeed(seed, 'terrace')) % COMPS.length], n = parts.length, js = subSeed(seed, 'jog-s');
  let x = j * SB - o;
  for (let k = 0; k < n; k++) {
    if (gx < x + parts[k] || k === n - 1) {
      const sy = k % 2 ? 4 : k === n - 1 && k ? 2 : 0;
      return [x, x + parts[k], sy];
    }
    x += parts[k];
  }
}
export const JOG_X = 3;
export function jogX(seed, gy) { const ro = hash2(5, 13, subSeed(seed, 'jog-r')) % JOG_RUN; return Math.floor((gy + ro) / JOG_RUN) % 2 ? JOG_X : 0; }   // the columns the field is read over in this row (a side wall jogs by this at every band edge)
export const blockOf = blockOf0;
// then a raised part of the terraced field under PART_MIN tiles (flooded whole over the world's raster, so the same from every window) is lowered: a hill too small to hold a way up is not made
export const PART_MIN = 200;
function rfCell(L, X, Y) {
  const B = bkOf(L), key = (X + 8) * 1000 + (Y + 8), hit = B.rf.get(key); if (hit) return hit;
  const r0 = rf0Cell(L, X, Y), out = r0.slice(), seen = new Uint8Array(N);
  const at0 = (gx, gy) => { if (gx < 0 || gy < 0 || gx >= WTW || gy >= WTH) return 0; const cx = (gx / CW) | 0, cy = (gy / CH) | 0; return rf0Cell(L, cx, cy)[(gy - cy * CH) * CW + gx - cx * CW]; };
  for (let i = 0; i < N; i++) {
    if (!r0[i] || seen[i]) continue;
    const gx = X * CW + (i % CW), gy = Y * CH + ((i / CW) | 0), set = new Set([gy * 8192 + gx]), q = [[gx, gy]];
    for (let h = 0; h < q.length && set.size < PART_MIN; h++) { const [a, b] = q[h];
      for (let d = 0; d < 4; d++) { const x = a + NB4X[d], y = b + NB4Y[d], k = y * 8192 + x; if (!set.has(k) && at0(x, y)) { set.add(k); q.push([x, y]); } } }
    const small = set.size < PART_MIN;
    for (const k of set) { const x = k & 8191, y = Math.floor(k / 8192); if (x >= X * CW && x < X * CW + CW && y >= Y * CH && y < Y * CH + CH) { const j = (y - Y * CH) * CW + x - X * CW; seen[j] = 1; if (small) out[j] = 0; } }
  }
  if (B.rf.size > 3000) B.rf.clear(); B.rf.set(key, out); return out;
}
function rf0Cell(L, X, Y) {
  const B = bkOf(L), key = (X + 8) * 1000 + (Y + 8); if (!B.rf0) B.rf0 = new Map(); const hit = B.rf0.get(key); if (hit) return hit;
  const out = new Uint8Array(N); if (B.rf0.size > 3000) B.rf0.clear(); B.rf0.set(key, out);
  if (!inRealm(X, Y)) return out;
  // margin: MX columns each side (7 for the block, 3 for the element, 1 for the held ring)
  const rad = L.rule.smooth | 0, R1 = rad + 5, MX = BMAX + R1 + 1 + JOG_X, w = CW + 2 * MX, h = CH + 2 * R1, gx0 = X * CW - MX, gy0 = Y * CH - R1, q = new Int32Array(w * h), wr = new Uint8Array(w * h), cw8 = new Uint8Array(w * h);
  for (let cy = Math.floor(gy0 / CH); cy <= Math.floor((gy0 + h - 1) / CH); cy++) for (let cx = Math.floor(gx0 / CW); cx <= Math.floor((gx0 + w - 1) / CW); cx++) {
    const qc = qCell(L, cx, cy), wc = L.rule.holdWater !== 0 ? wetCell(L, cx, cy) : null, water = inRealm(cx, cy) && L.realm.land[cy * RW + cx] === LAND.WATER && !L.realm.ford[cy * RW + cx];
    for (let ty = 0; ty < CH; ty++) { const y = cy * CH + ty - gy0; if (y < 0 || y >= h) continue;
      for (let tx = 0; tx < CW; tx++) { const x = cx * CW + tx - gx0; if (x < 0 || x >= w) continue; const i = y * w + x; q[i] = qc[ty * CW + tx]; if (wc) wr[i] = wc[ty * CW + tx]; if (water) cw8[i] = 1; } }
  }
  const held = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x; let v = cw8[i]; if (!v) for (let dy = -1; dy <= 1 && !v; dy++) for (let dx = -1; dx <= 1; dx++) if (wr[i + dy * w + dx]) { v = 1; break; } held[i] = v; }
  for (let i = 0; i < w * h; i++) if (held[i] && q[i] >= 0) q[i] = -1;
  const DY = [], HW = []; let cnt = 0; for (let dy = -rad; dy <= rad; dy++) { let hw = 0; if (rad) while ((hw + 1) * (hw + 1) + dy * dy <= rad * rad + rad) hw++; DY.push(dy); HW.push(hw); cnt += 2 * hw + 1; }
  const th = L.rule.levels[0] * cnt;
  const w1 = w + 1, P = new Int32Array(w1 * h); for (let y = 0; y < h; y++) { let a = 0; const o = y * w1; for (let x = 0; x < w; x++) { a += q[y * w + x]; P[o + x + 1] = a; } }
  const sAt = (x, y) => { let s = 0; for (let r = 0; r < DY.length; r++) { const o = (y + DY[r]) * w1 + x; s += P[o + HW[r] + 1] - P[o - HW[r]]; } return s; };
  for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CW;) {
    const jx = jogX(L.seed, Y * CH + ty), [c0, c1, sy] = blockOf(L.seed, X * CW + tx - jx), b0 = c0 + jx, b1 = c1 + jx, xa = b0 - gx0, xb = b1 - gx0, y = ty + R1 - sy; let s = 0, low = false;
    for (let x = xa; x < xb; x++) { if (held[y * w + x - jx] || inlandOf(gx0 + x - jx, Y * CH + ty - sy) < RAISE_OFF + 1) { low = true; break; } s += sAt(x - jx, y); }
    if (!low && s >= th * (xb - xa)) for (let x = Math.max(xa, MX); x < Math.min(xb, MX + CW); x++) out[ty * CW + x - MX] = 1;
    tx = b1 - X * CW;
  }
  return out;
}
function rfAt(L, gx, gy) {
  if (gx < 0 || gy < 0 || gx >= WTW || gy >= WTH) return 0;
  // rupar-banks-speed-2: the cell last read is kept (a flood stays in one cell for runs of tiles)
  const X = (gx / CW) | 0, Y = (gy / CH) | 0, B = L.bkd || bkOf(L), k = Y * 1000 + X;
  let a = B.lastA; if (!a || B.lastK !== k) { a = B.lastA = rfCell(L, X, Y); B.lastK = k; }
  return a[(gy - Y * CH) * CW + gx - X * CW];
}
// the raised part holding a tile of the field (4-connected), whole: tiles, box, size; `big` past BANK_FLOOD tiles (or meeting one); null where the field is low
function partAt(L, gx, gy) {
  const B = bkOf(L), k0 = BK_KEY(gx, gy), got = B.lab.get(k0); if (got !== undefined) return B.parts[got];
  if (!rfAt(L, gx, gy)) return null;
  const id = B.parts.length, tiles = [k0], p = { id, n: 0, big: false, x0: gx, y0: gy, x1: gx, y1: gy, tiles };
  B.parts.push(p); B.lab.set(k0, id);
  for (let h = 0; h < tiles.length; h++) {
    const k = tiles[h], x = k & 8191, y = k >> 13;
    if (x < p.x0) p.x0 = x; if (x > p.x1) p.x1 = x; if (y < p.y0) p.y0 = y; if (y > p.y1) p.y1 = y;
    if (tiles.length > BANK_FLOOD) { p.big = true; break; }
    for (let d = 0; d < 4; d++) { const a = x + NB4X[d], b = y + NB4Y[d]; if (!rfAt(L, a, b)) continue; const nk = BK_KEY(a, b), l = B.lab.get(nk);
      if (l === undefined) { B.lab.set(nk, id); tiles.push(nk); } else if (l !== id && B.parts[l].big) p.big = true; }
    if (p.big) break;
  }
  p.n = tiles.length; if (p.big) p.tiles = null;
  return p;
}
// the part's south faces: runs of lip tiles (the tile above in the part) by length, then row, then column (the order the window rule walks them in)
function partRuns(L, p) {
  const rows = new Map();
  for (const k of p.tiles) { const x = k & 8191, y = k >> 13; if (!rfAt(L, x, y + 1) && rfAt(L, x, y - 1)) { if (!rows.has(y)) rows.set(y, []); rows.get(y).push(x); } }
  const runs = [];
  for (const [y, xs] of rows) { xs.sort((a, b) => a - b); let from = xs[0], n = 1;
    for (let i = 1; i <= xs.length; i++) { if (i < xs.length && xs[i] === xs[i - 1] + 1) { n++; continue; } runs.push({ x0: from, n, y }); if (i < xs.length) { from = xs[i]; n = 1; } } }
  return runs.sort((a, b) => b.n - a.n || a.y - b.y || a.x0 - b.x0);
}
// would a window cut a pocket stair at the site (lx, ly)? The pocket rule's geometry (stairSeenBy) on the part's box, in world tiles
function seenByWindows(L, p, lx, ly) {
  const WR = L.rule.window, foot = footRoom(L.rule.faceRows), ex0 = lx, ey0 = ly - SITE_UP, ex1 = lx + SITE_W - 1, ey1 = ly + foot;
  const fx0 = Math.min(p.x0, ex0) - 6, fx1 = Math.max(p.x1, ex1) + 6, fy0 = Math.min(p.y0, ey0) - 6, fy1 = Math.max(p.y1, ey1) + 6;
  const cx0 = Math.floor((ex0 - STAIR_REACH) / CW), cx1 = Math.floor((ex1 + STAIR_REACH) / CW), cy0 = Math.floor((ey0 - STAIR_REACH) / CH), cy1 = Math.floor((ey1 + STAIR_REACH) / CH);
  return fx0 >= (cx1 + 1 - WR) * CW + STAIR_RIM && fx1 <= (cx0 + WR) * CW - 1 - STAIR_RIM && fy0 >= (cy1 + 1 - WR) * CH + STAIR_RIM && fy1 <= (cy0 + WR) * CH - 1 - STAIR_RIM;
}
function raisableSite(L, lx, ly) { for (let y = ly - SITE_UP; y <= ly; y++) for (let x = lx; x < lx + SITE_W; x++) if (heldTile(L, x, y)) return false; return true; }
function partHasStair(L, p) {
  const X0 = Math.floor(p.x0 / CW) - 1, X1 = Math.floor(p.x1 / CW) + 1, Y0 = Math.floor(p.y0 / CH) - 1, Y1 = Math.floor(p.y1 / CH) + 1, B = bkOf(L);
  for (const st of L.stairs.values()) {
    if (st.X < X0 || st.X > X1 || st.Y < Y0 || st.Y > Y1) continue;
    const s = siteOf(L, st); if (!s.ok) continue;
    for (let y = s.lip - SITE_UP; y <= s.lip; y++) for (let x = s.x0; x < s.x0 + SITE_W; x++) if (B.lab.get(BK_KEY(x, y)) === p.id) return true;
  }
  return false;
}
// the site: the way up's 2 columns on the contour on the lip row, the other 4 within a row of it, 6 wide raised above and low below (natSite's test, read on the part's own field), no water, off every stair site
function bankSiteAt(L, x0, ly, loose = false) {
  const foot = footRoom(L.rule.faceRows), up = SITE_UP + 2, down = foot + NAT_FOOT - 1;
  if (!loose) { for (let c = x0; c < x0 + SITE_W; c++) { const e = c === x0 + 2 || c === x0 + 3 ? 0 : 1;
    for (let r = ly - up; r <= ly - e; r++) if (!rfAt(L, c, r)) return false; for (let r = ly + 1 + e; r <= ly + down; r++) if (rfAt(L, c, r)) return false; } }
  else {   // as the stair rule's fallback site: the way up's two columns on the contour, half the six raised two rows above and low three rows below; the held rows make the rest straight
    for (let c = x0 + 2; c <= x0 + 3; c++) { for (let r = ly - 2; r <= ly; r++) if (!rfAt(L, c, r)) return false; for (let r = ly + 1; r <= ly + 4; r++) if (rfAt(L, c, r)) return false; }
    let hi = 0, lo = 0; for (let c = x0; c < x0 + SITE_W; c++) { if (rfAt(L, c, ly - 2)) hi++; if (!rfAt(L, c, ly + 3)) lo++; } if (hi < 3 || lo < 3) return false; }
  if (!raisableSite(L, x0, ly)) return false;
  for (let r = ly + 1; r <= ly + foot; r++) for (let c = x0 + 1; c < x0 + SITE_W - 1; c++) if (landWet(L, c, r)) return false;
  for (let r = ly + 1; r <= ly + down; r++) for (let c = x0 - 1; c <= x0 + SITE_W; c++) if (landWet(L, c, r)) return false;
  // the low land under the foot goes on: the field's low part from the foot holds NAT_PART tiles
  { const seen = new Set([BK_KEY(x0 + 2, ly + down)]), q = [[x0 + 2, ly + down]]; let wide = false;
    for (let k = 0; k < q.length && !wide; k++) { if (q.length >= NAT_PART) { wide = true; break; } const [a, b] = q[k];
      for (let d = 0; d < 4; d++) { const xx = a + NB4X[d], yy = b + NB4Y[d], key = BK_KEY(xx, yy); if (xx < 0 || yy < 0 || xx >= WTW || yy >= WTH) { wide = true; break; } if (!seen.has(key) && !rfAt(L, xx, yy)) { seen.add(key); q.push([xx, yy]); } } }
    if (!wide) return false; }
  for (const st of L.stairs.values()) { if (Math.abs(st.X - Math.floor(x0 / CW)) > 2 || Math.abs(st.Y - Math.floor(ly / CH)) > 2) continue; const s = siteOf(L, st);
    if (Math.abs(s.x0 - x0) < SITE_W + 2 && s.lip - SITE_UP - 2 < ly + foot + 2 && ly - SITE_UP - 2 < s.lip + foot + 2) return false; }
  return true;
}
// one cell of the land the windows make with no banks (the centre of its own window): its raised flags and the way-up sites that window holds
function landNB(L, X, Y) {
  const B = bkOf(L), key = (X + 8) * 1000 + (Y + 8), hit = B.land.get(key); if (hit) return hit;
  const out = { r: new Uint8Array(N), sites: [] };
  if (inRealm(X, Y)) { const w = noBankWindow(L, X, Y), o = L.rule.window; for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CW; tx++) out.r[ty * CW + tx] = w.R[(o * CH + ty) * w.W + o * CW + tx] ? 1 : 0; out.sites = w.info.sites; }
  if (B.land.size > 600) B.land.clear(); B.land.set(key, out); return out;
}
// the raised land (no banks) connected through a field part, the biggest piece of 230 raised tiles or more that no way-up site stands on: { n, x0, y0, x1, y1 } or null
function landComp(L, p) {
  const raisedNB = (x, y) => { if (x < 0 || y < 0 || x >= WTW || y >= WTH) return 0; const X = Math.floor(x / CW), Y = Math.floor(y / CH); return landNB(L, X, Y).r[(y - Y * CH) * CW + x - X * CW]; };
  const lab = new Map(), comps = [];
  for (const k of p.tiles) { const sx = k & 8191, sy = k >> 13; if (sx % 3 || sy % 3 || !raisedNB(sx, sy) || lab.has(k)) continue;
    const c = { id: comps.length, n: 0, big: false, x0: sx, y0: sy, x1: sx, y1: sy }, q = [k]; lab.set(k, c.id);
    for (let h = 0; h < q.length && !c.big; h++) { const x = q[h] & 8191, y = q[h] >> 13; c.n++; if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x; if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y;
      if (q.length > BANK_FLOOD) { c.big = true; break; }
      for (let d = 0; d < 4; d++) { const a = x + NB4X[d], b = y + NB4Y[d], nk = BK_KEY(a, b); if (!lab.has(nk) && raisedNB(a, b)) { lab.set(nk, c.id); q.push(nk); } } }
    comps.push(c); }
  let best = null;
  for (const c of comps) { if (c.big || c.n < FILL_UNDER + 30) continue;
    let way = false;
    for (let Y = Math.floor(c.y0 / CH) - 1; Y <= Math.floor(c.y1 / CH) + 1 && !way; Y++) for (let X = Math.floor(c.x0 / CW) - 1; X <= Math.floor(c.x1 / CW) + 1 && !way; X++)
      for (const s of landNB(L, X, Y).sites) if (lab.get(BK_KEY(s.x, s.y)) === c.id || lab.get(BK_KEY(s.x + 1, s.y)) === c.id) { way = true; break; }
    if (!way && (!best || c.n > best.n)) best = c; }
  return best;
}
// the closed parts of the window of cell (X, Y) made with no banks (info.pkr), kept per cell: a verdict asks the same window again for its neighbours
function noBankPockets(L, X, Y) {
  const B = bkOf(L), key = (X + 8) * 1000 + (Y + 8), hit = B.pkr && B.pkr.get(key); if (hit) return hit;
  const out = noBankWindow(L, X, Y).info.pkr || [];
  if (!B.pkr) B.pkr = new Map(); if (B.pkr.size > 400) B.pkr.clear(); B.pkr.set(key, out); return out;
}
// the part's bank site { x0, lip } in world tiles, or null (the reason in L.bkd.why)
export function partBank(L, p, hx, hy) {
  const B = bkOf(L); if (p.bank !== undefined) return p.bank;
  const why = r => { B.why[r] = (B.why[r] || 0) + 1; p.why = r; p.bank = null; return null; };
  if (p.big) return why('big'); if (p.n < BANK_PART) return why('small');
  if (partHasStair(L, p)) return why('stair');
  // does the land leave it without a way up? The windows over the part's cells, made without banks, each either cut a stair on it, fill it or lower it, or leave a closed raised part of FILL_UNDER walkable
  // tiles or more (a closed part is closed in every window: none of its tiles touches a window's rim). The biggest such part there is the one that needs the bank; the site lies on it.
  const cxa = Math.floor(p.x0 / CW), cxb = Math.floor(p.x1 / CW), cya = Math.floor(p.y0 / CH), cyb = Math.floor(p.y1 / CH);
  if ((cxb - cxa + 1) * (cyb - cya + 1) > 30) return why('big');
  let comp = null;
  // a part no window can see whole (its box over the seen-whole envelope: stairSeenBy's own geometry) is judged on the land the windows made (banks off): the raised land connected through it, and whether a way up stands on it
  const env = p.x1 - p.x0 > (2 * L.rule.window - 1) * CW - 2 * STAIR_RIM - 13 || p.y1 - p.y0 > (2 * L.rule.window - 1) * CH - 2 * STAIR_RIM - 13;
  if (env) comp = landComp(L, p);
  else { const was = BANKS_SKIP; BANKS_SKIP = true;
    // rupar-banks-speed-1: a closed part shows whole in every window that holds it, so the one window that holds the part's box with a cell's margin each side tells what the windows over its cells tell (a part
    // whose box has no such window is asked of every window over its cells, as before)
    // rupar-banks-speed-2: any window that holds the box so tells the same, so the window being made (hx, hy) is the one asked when it holds it (its banks-off result is then the window's own result: windowLevels)
    const WRc = L.rule.window, M = CW, holds = (cx, cy) => (cx - WRc) * CW + M <= p.x0 && p.x1 <= (cx + WRc + 1) * CW - 1 - M && (cy - WRc) * CH + M <= p.y0 && p.y1 <= (cy + WRc + 1) * CH - 1 - M;
    // else a window already made with no banks that holds it, else the one centred on the box
    let ccx = (cxa + cxb) >> 1, ccy = (cya + cyb) >> 1, mine = hx !== undefined && holds(hx, hy);
    if (!mine && B.nbw) for (const k of B.nbw.keys()) { const cx = Math.floor(k / 1000) - 8, cy = (k % 1000) - 8; if (holds(cx, cy)) { ccx = cx; ccy = cy; mine = true; break; } }
    else if (mine) { ccx = hx; ccy = hy; }
    const one = mine || holds(ccx, ccy);
    try { for (let cy = one ? ccy : cya; cy <= (one ? ccy : cyb); cy++) for (let cx = one ? ccx : cxa; cx <= (one ? ccx : cxb); cx++) for (const k of noBankPockets(L, cx, cy))
      if (k.raised && k.n >= FILL_UNDER && k.x0 <= p.x1 + 6 && k.x1 >= p.x0 - 6 && k.y0 <= p.y1 + 6 && k.y1 >= p.y0 - 6 && (!comp || k.n > comp.n || (k.n === comp.n && (k.y0 < comp.y0 || (k.y0 === comp.y0 && k.x0 < comp.x0))))) comp = k; }
    finally { BANKS_SKIP = was; } }
  if (!comp) return why('window');
  const inComp = (x0, ly) => x0 >= comp.x0 - 1 && x0 + SITE_W - 1 <= comp.x1 + 1 && ly - SITE_UP >= comp.y0 - 1 && ly <= comp.y1 + 1;
  const hit = siteOn(L, p, inComp);
  if (!hit) return why('nosite');
  p.bank = { x0: hit.x0, lip: hit.ly, part: p.id, n: comp.n, loose: hit.loose }; return p.bank;
}
// the first site on the part's south faces that the test `ok(x0, lip)` lets through: { x0, ly, loose } or null
function siteOn(L, p, ok) {
  const runs = partRuns(L, p);
  for (const loose of [false, true]) for (const run of runs) { if (!loose && run.n < 4) continue;   // the land's own contour first; else a site the held rows straighten (the stair rule's second choice)
    const base = run.x0 + ((run.n - 2) >> 1) - 2;
    for (const ly of [run.y, run.y + 1, run.y - 1]) for (let d = 0; d <= 12; d++) for (const s of d ? [1, -1] : [1]) { const x0 = base + s * d;
      if (ok(x0, ly) && bankSiteAt(L, x0, ly, loose)) return { x0, ly, loose }; } }
  return null;
}
export const bankDebug = { partAt, partRuns, bankSiteAt, rfAt, raisableSite, wetTile: landWet };   // the tools read the rule's own pieces
// every raised part of the realm's field (the tools: one flood each, from a 4 x 4 lattice of tiles)
export function bankScan(L) {
  const seen = new Set(), out = [];
  for (let gy = 0; gy < WTH; gy += 4) for (let gx = 0; gx < WTW; gx += 4) { if (!rfAt(L, gx, gy)) continue; const p = partAt(L, gx, gy); if (p && !seen.has(p.id)) { seen.add(p.id); out.push(p); } }
  return out;
}
// the banks whose sites lie in the window of cell (X, Y): every raised part touching the window's cells is found from a tile on a 4 x 4 lattice (a site's rows always hold one), flooded whole, and asked
// rupar-banks-slice-2: the banks are made once a region (MW x MH cells), not by each window. A bank belongs to the region its site's corner (x0, lip) lies in; the region's list is every raised part found
// from a 4 x 4 lattice over the region's tiles and BANK_MARGIN round them, each asked its one verdict (partBank), the banks kept whose corner is in the region. A window reads the lists of the (at most four)
// regions it touches and keeps the banks whose site can land in it; landPipeline then takes the ones whose site lies whole in the window, as before. No window makes a verdict unless the list is not made yet.
const BANK_MARGIN = 16, REG_W = MW * CW, REG_H = MH * CH;
export function regionBanks(L, ra, rb) {
  const B = bkOf(L), key = ra * 100 + rb; if (!B.reg) B.reg = new Map(); const hit = B.reg.get(key); if (hit) return hit;
  const rx0 = ra * REG_W, ry0 = rb * REG_H, rx1 = rx0 + REG_W, ry1 = ry0 + REG_H, out = [], seen = new Set();
  for (let gy = Math.max(0, Math.ceil((ry0 - BANK_MARGIN) / 4) * 4); gy < Math.min(WTH, ry1 + BANK_MARGIN); gy += 4) {
    if (B.lab.size > 500000) { B.lab.clear(); B.parts.length = 0; }   // a part is found again (its verdict is the same) after the label table is cleared
    for (let gx = Math.max(0, Math.ceil((rx0 - BANK_MARGIN) / 4) * 4); gx < Math.min(WTW, rx1 + BANK_MARGIN); gx += 4) {
      if (!rfAt(L, gx, gy)) continue; const p = partAt(L, gx, gy); if (!p || p.big || p.n < BANK_PART || seen.has(p.id)) continue; seen.add(p.id);
      const b = partBank(L, p); if (b && b.x0 >= rx0 && b.x0 < rx1 && b.lip >= ry0 && b.lip < ry1) out.push(b); } }
  out.sort((a, b) => a.lip - b.lip || a.x0 - b.x0);
  B.reg.set(key, out); return out;
}
// the regions' lists made so far (the worker sends them to the page) and a list made elsewhere, taken as it is
export const madeRegionBanks = L => { const B = bkOf(L), out = []; if (B.reg) for (const [k, banks] of B.reg) out.push({ ra: Math.floor(k / 100), rb: k % 100, banks: banks.map(b => ({ ...b })) }); return out; };
export const presetRegionBanks = (L, lists) => { const B = bkOf(L); if (!B.reg) B.reg = new Map(); for (const r of lists || []) { const k = r.ra * 100 + r.rb; if (!B.reg.has(k)) B.reg.set(k, r.banks.map(b => ({ ...b }))); } };
// map-levels-build-1: one way up per raised piece per place. A piece is a 4-connected part of the terraced field (rfCell) inside one place; a piece that holds no realm stair's way gets a site on its own south
// face (6 columns lipped on one row, the rows above raised, the foot rows low and dry), the way's two columns inside the place; the site is held straight like a stair's, so the face need not be straight in the
// field. Where the piece reaches the place's south edge and the part goes on across it, a site within STRADDLE rows below the edge comes first (as realm stairs already straddle), so the piece north of the edge is
// served. Read from the field only: the same in every window.
const STRADDLE = 6;
function pieceWays(L, X, Y) {
  const B = bkOf(L); if (!B.pw) B.pw = new Map(); const key = (X + 8) * 1000 + (Y + 8), hit = B.pw.get(key); if (hit) return hit;
  const out = []; if (B.pw.size > 4000) B.pw.clear(); B.pw.set(key, out); if (!inRealm(X, Y)) return out;
  const rf = rfCell(L, X, Y), x0c = X * CW, y0c = Y * CH, lab = new Int32Array(N).fill(-1), comps = [];
  for (let i = 0; i < N; i++) { if (!rf[i] || lab[i] >= 0) continue; const id = comps.length, q = [i]; lab[i] = id;
    for (let h = 0; h < q.length; h++) { const j = q[h], x = j % CW, y = (j / CW) | 0; for (let d = 0; d < 4; d++) { const a = x + NB4X[d], b = y + NB4Y[d]; if (a < 0 || b < 0 || a >= CW || b >= CH) continue; const m = b * CW + a; if (rf[m] && lab[m] < 0) { lab[m] = id; q.push(m); } } }
    comps.push(q); }
  const has = new Uint8Array(comps.length);
  const foot = footRoom(L.rule.faceRows), stairBoxes = [];   // stairBoxes: the held rows of the realm stairs near (x0, x1, y0, y1 in world tiles): a piece's site keeps off them
  for (const st of L.stairs.values()) { if (st.X < X - 2 || st.X > X + 2 || st.Y < Y - 2 || st.Y > Y + 1) continue; const s = siteOf(L, st);
    stairBoxes.push([s.x0, s.x0 + SITE_W - 1, s.lip - SITE_UP, s.lip + foot]);
    for (const dx of [2, 3]) { const x = s.x0 + dx - x0c, y = s.lip - y0c; if (x < 0 || x >= CW) continue;
      if (y >= 0 && y < CH) { if (lab[y * CW + x] >= 0) has[lab[y * CW + x]] = 1; }
      else if (y >= CH && y <= CH + STRADDLE) {   // a way just below the place's south edge, tied to the piece by raised tiles from its last row: serves it
        const id = lab[(CH - 1) * CW + x]; let tied = id >= 0; for (let yy = CH; yy <= y && tied; yy++) tied = rfAt(L, x0c + x, y0c + yy) === 1; if (tied) has[id] = 1; } } }
  const clear = (gx, ly) => { for (const [a, b, c, d] of stairBoxes) if (gx <= b && gx + SITE_W - 1 >= a && ly + foot >= c && ly - SITE_UP <= d) return false; return true; };
  // a site's test, in tiers: 0 the six columns as the field has them (lip row raised over SITE_UP rows, the foot rows low); 1 the way's two columns as the field has them and the four others within a row of it (as a
  // stair's natural site); 2 the way's two columns as the field has them, the four others whatever the field says (the lock makes the six straight: the face the field draws is 4 or 5 tiles wide)
  const ok = (gx, ly, tier) => { if (!clear(gx, ly)) return false; for (let x = gx; x < gx + SITE_W; x++) { const way = x === gx + 2 || x === gx + 3, e = tier === 0 || way ? 0 : 1;
      if (tier < 2 || way) { for (let y = ly - SITE_UP; y <= ly - e; y++) if (!rfAt(L, x, y)) return false; for (let y = ly + 1 + e; y <= ly + foot; y++) if (rfAt(L, x, y)) return false; }
      for (let y = ly + 1; y <= ly + foot; y++) if (landWet(L, x, y)) return false; }
    return raisableSite(L, gx, ly); };
  for (let id = 0; id < comps.length; id++) {
    if (has[id] || comps[id].length < 12) continue;
    let pick = null;
    for (let tier = 0; tier < 3 && !pick; tier++) {
      // the part goes on across the south edge: a site just below it, the way's columns tied to the piece by raised tiles from its last row down to the lip
      for (let ly = CH; ly <= CH + STRADDLE && !pick; ly++) for (let d = 0; d <= CW && !pick; d++) for (const sg of d ? [1, -1] : [1]) { const tx = (CW >> 1) - 3 + sg * d;
        if (tx + 2 < 0 || tx + 3 >= CW || lab[(CH - 1) * CW + tx + 2] !== id || lab[(CH - 1) * CW + tx + 3] !== id) continue;
        let tied = true; for (let y = CH; y <= ly && tied; y++) tied = rfAt(L, x0c + tx + 2, y0c + y) === 1 && rfAt(L, x0c + tx + 3, y0c + y) === 1;
        if (tied && ok(x0c + tx, y0c + ly, tier)) { pick = { x0: x0c + tx, lip: y0c + ly }; break; } }
      for (let y = CH - 1; y >= 0 && !pick; y--) for (let d = 0; d <= CW && !pick; d++) for (const sg of d ? [1, -1] : [1]) { const tx = (CW >> 1) - 3 + sg * d;
        if (tx + 2 < 0 || tx + 3 >= CW || lab[y * CW + tx + 2] !== id || lab[y * CW + tx + 3] !== id) continue; if (ok(x0c + tx, y0c + y, tier)) { pick = { x0: x0c + tx, lip: y0c + y }; break; } }
    }
    if (pick) out.push(pick);
  }
  return out;
}
export function banksIn(L, X, Y) {
  const B = bkOf(L), key = (X + 8) * 1000 + (Y + 8), hit = B.banks.get(key); if (hit) return hit;
  const WR = L.rule.window, out = [], gx0 = (X - WR) * CW, gx1 = (X + WR + 1) * CW, gy0 = (Y - WR) * CH, gy1 = (Y + WR + 1) * CH;
  for (let rb = Math.max(0, Math.floor(gy0 / REG_H)); rb <= Math.floor((gy1 - 1) / REG_H) && rb < RH / MH; rb++) for (let ra = Math.max(0, Math.floor(gx0 / REG_W)); ra <= Math.floor((gx1 - 1) / REG_W) && ra < RW / MW; ra++)
    for (const b of regionBanks(L, ra, rb)) if (b.x0 >= gx0 && b.x0 < gx1 && b.lip >= gy0 && b.lip < gy1) out.push(b);
  if (B.banks.size > 4000) B.banks.clear();
  B.banks.set(key, out); return out;
}
function landPipeline(L, X, Y, base, noRaise, wblock, edge, W, H, gx0, gy0, info) {
  const WR = L.rule.window, fr = L.rule.faceRows, foot = footRoom(fr), extra = [], stairSeen = stairSeenBy(gx0, gy0, W, foot, WR);
  const sites = [];   // { lx, ly (window tiles), real }
  for (const st of L.stairs.values()) {
    if (st.X < X - WR - 2 || st.X > X + WR + 2 || st.Y < Y - WR - 1 || st.Y > Y + WR) continue;   // land-reach-1: a site may lie in the cell east or west of its stair's (siteOf)
    const s = siteOf(L, st), lx = s.x0 - gx0, ly = s.lip - gy0;
    if (lx >= 1 && lx + SITE_W < W && ly - SITE_UP >= 1 && ly + foot < H - 1) sites.push({ lx, ly, real: true });
  }
  for (let cy = Y - WR; cy <= Y + WR; cy++) for (let cx = X - WR; cx <= X + WR; cx++) for (const b of pieceWays(L, cx, cy)) {   // a piece's way up on its own south face
    const lx = b.x0 - gx0, ly = b.lip - gy0;
    if (lx >= 1 && lx + SITE_W < W && ly - SITE_UP >= 1 && ly + foot < H - 1) sites.push({ lx, ly, real: true, piece: true });
  }
  if (L.rule.banks !== 0 && !BANKS_SKIP) for (const b of banksIn(L, X, Y)) {   // rupar-banks-7-1: a held-straight site that stays blocked (no way[]), the part's one bank
    const lx = b.x0 - gx0, ly = b.lip - gy0;
    if (lx >= 1 && lx + SITE_W < W && ly - SITE_UP >= 1 && ly + foot < H - 1) sites.push({ lx, ly, real: true, bank: true });
  }
  let r = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const lk = new Uint8Array(W * H), all = sites.concat(extra);
    for (const s of all) for (let x = s.lx; x < s.lx + SITE_W; x++) for (let y = s.ly - SITE_UP; y <= s.ly; y++) if (!noRaise[y * W + x]) lk[y * W + x] = 1;
    for (const s of all) for (let x = s.lx; x < s.lx + SITE_W; x++) for (let y = s.ly + 1; y <= s.ly + foot; y++) lk[y * W + x] = 2;   // the low rows win where two sites meet
    const way = new Uint8Array(W * H); for (const s of all) { if (s.bank) continue; way[s.ly * W + s.lx + 2] = 1; way[s.ly * W + s.lx + 3] = 1; }   // a bank is no way: it blocks until dug
    if (globalThis.LAND_STAGES) info.stages = { threshold: relock(base.slice(), lk) };   // cliff-contour-1: the tools read the raster after each stage (where the straightness comes from)
    CLEAN_SINK = info.stages || null;
    r = cleanup(base, W, H, L.rule, lk);
    CLEAN_SINK = null;
    if (info.stages) info.stages.cleanup = r.slice();
    const seedJ = L.seed;
    if (info.dbg) info.pre = r.slice();
    const shape = () => { if (info.stages) info.stages.pockets = r.slice(); info.gapsFixed = fixGaps(r, W, H, L.rule, lk, noRaise); if (info.stages) info.stages.gaps = r.slice(); info.leftFixed = fixLeft(r, W, H, L.rule, lk, noRaise); info.bumps = flattenBumps(r, W, H, L.rule, lk, noRaise, gx0, gy0); };
    // pockets: walkable parts the window closes in, that no way up reaches
    let again = false;
    for (let round = 0; round < 3; round++) {
      const snap = r.slice();
      const { comps } = components(walkParts(r, W, H, way, wblock), W, H, edge, way), shut = comps.filter(c => !c.open && !c.way);
      info.pockets = shut.map(c => c.n); info.pk = shut.map(c => { let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1; for (const i of c.tiles) { const x = i % W, y = (i / W) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return `${c.n}${r[c.tiles[0]] ? 'R' : 'L'}[${x0 + gx0},${y0 + gy0}-${x1 + gx0},${y1 + gy0}]`; });
      info.pkr = shut.map(c => { let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1; for (const i of c.tiles) { const x = i % W, y = (i / W) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return { n: c.n, raised: r[c.tiles[0]] === 1, x0: x0 + gx0, y0: y0 + gy0, x1: x1 + gx0, y1: y1 + gy0 }; });
      if (!shut.length) break;
      let changed = false;
      for (const c of shut) {
        const isRaised = r[c.tiles[0]] === 1;
        // a pocket is handled only where every window that shows one of the cells it touches shows all of it: its footprint (its box and 6 tiles round) lies within one cell round each cell it touches; a larger
        // one is left (listed), since a neighbour's window could not tell it from land that goes on, and a cell must be the same from every window (the seam)
        // land-reach-1: a part that does not fit is no longer left at once: a stair may still be cut where every window the seam compares on the stair's cells sees the whole part (stairSeen, below)
        let fits = true;
        { let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1; for (const i of c.tiles) { const x = i % W, y = (i / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
          const fx0 = gx0 + x0 - 6, fx1 = gx0 + x1 + 6, fy0 = gy0 + y0 - 6, fy1 = gy0 + y1 + 6;
          for (let cx = Math.floor(fx0 / CW); cx <= Math.floor(fx1 / CW) && fits; cx++) if (fx0 < (cx - 1) * CW || fx1 >= (cx + 2) * CW) fits = false;
          for (let cy = Math.floor(fy0 / CH); cy <= Math.floor(fy1 / CH) && fits; cy++) if (fy0 < (cy - 1) * CH || fy1 >= (cy + 2) * CH) fits = false; }
        if (!isRaised) {   // low land with no cliff near it is a lake's islet: the realm's own, not a pocket the land made
          let near = false; for (const i of c.tiles) { const x = i % W, y = (i / W) | 0; for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2; dx++) { const a = x + dx, b = y + dy; if (a >= 0 && b >= 0 && a < W && b < H && r[b * W + a]) { near = true; break; } } if (near) break; }
          if (!near) { (info.islets || (info.islets = [])).push(c.n); continue; }
        }
        if (fits && isRaised && c.n < 6) {   // place-walk-1: a one-tile top where two plateaus meet at a corner (every neighbour of it is a lip, so no one can step on it, and a stair needs 6): it and the raised tiles beside it become low, held low,
          // so the two plateaus part with a channel between them (the channel is low land beside both, never a pit)
          const low = new Set(c.tiles); for (const i of c.tiles) { const x = i % W, y = (i / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const m = (y + dy) * W + x + dx; if (r[m]) low.add(m); } }
          const T = [...low]; let ok = T.every(i => { const x = i % W, y = (i / W) | 0; return !lk[i] && x >= 3 && y >= 3 && x < W - 3 && y < H - 3; });
          if (ok) for (const i of T) { let touchesLow = false; const x = i % W, y = (i / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const m = (y + dy) * W + x + dx; if (!r[m] && !low.has(m)) touchesLow = true; } if (!touchesLow && !c.tiles.includes(i)) { ok = false; break; } }
          // (land-b3f-foot-1) a neck is made only where it leaves no shape check failing that did not fail before (a held low neck cannot be raised again: a lip over it with a raised tile within the foot room below would stay short); else the part is handled as a mesa below
          if (ok) {
            let nx0 = W, ny0 = H, nx1 = -1, ny1 = -1; for (const i of T) { const x = i % W, y = (i / W) | 0; if (x < nx0) nx0 = x; if (x > nx1) nx1 = x; if (y < ny0) ny0 = y; if (y > ny1) ny1 = y; }
            DBGV.length = 0; const before = violBox(r, W, H, nx0, ny0, nx1, ny1, L.rule.faceRows);
            for (const i of T) r[i] = 0;
            DBGV.length = 0; if (violBox(r, W, H, nx0, ny0, nx1, ny1, L.rule.faceRows) > before) { for (const i of T) r[i] = 1; ok = false; }
            else { for (const i of T) lk[i] = 2; (info.necks || (info.necks = [])).push(c.n); changed = true; continue; }
          }
        }
        if (fits && c.n < 60) {   // a pit is filled, a mesa lowered
          let blob = null;
          if (isRaised) { let bx0 = 1e9, by0 = 1e9, bx1 = -1, by1 = -1; for (const i of c.tiles) { const x = i % W, y = (i / W) | 0; if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; }
            // the blob may lie within 10 tiles of the component, and that box must lie within the cells it touches and one round them, clear of every such window's rim (4 tiles): then every window that shows one
            // of those cells shows the box whole and the answer is the same from each
            const box = [bx0 - 10, by0 - 10, bx1 + 10, by1 + 10], lo = [(Math.floor((gx0 + bx0) / CW) - 1) * CW - gx0 + 4, (Math.floor((gy0 + by0) / CH) - 1) * CH - gy0 + 4], hi = [(Math.floor((gx0 + bx1) / CW) + 2) * CW - 1 - gx0 - 4, (Math.floor((gy0 + by1) / CH) + 2) * CH - 1 - gy0 - 4];
            if (box[0] >= lo[0] && box[1] >= lo[1] && box[2] <= hi[0] && box[3] <= hi[1]) blob = blobOf(r, W, H, c.tiles, 1, 400, null, box); }
          else { const s = new Set(c.tiles); for (const i of c.tiles) { const x = i % W, y = (i / W) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const m = (y + dy) * W + x + dx; if (m >= 0 && m < W * H && !r[m]) s.add(m); } }
            blob = [...s]; if (blob.some(i => noRaise[i] || wblock[i] || edge[i])) { if (info.dbg) (info.why || (info.why = [])).push(`pit ${c.n}: nr ${blob.filter(i => noRaise[i]).length} wb ${blob.filter(i => wblock[i]).length} ed ${blob.filter(i => edge[i]).length}`); blob = null; } }
          if (blob && blob.every(i => !lk[i])) { for (const i of blob) r[i] = isRaised ? 0 : 1; info.filled.push(c.n); changed = true; continue; }
        }
        // land-reach-1 (designer 2026-11-16): a closed part under FILL_UNDER walkable tiles is filled to its neighbours' level (a low pocket raised, raised land lowered), where every window the seam compares on the
        // cells the fill sets sees it whole (cliff-contour-2's test for its 60-160 low pockets); a larger one, or one that cannot be filled, takes a stair
        if (fits && c.n >= 60 && c.n < FILL_UNDER) {
          let blob = null;
          if (isRaised) { let bx0 = 1e9, by0 = 1e9, bx1 = -1, by1 = -1; for (const i of c.tiles) { const x = i % W, y = (i / W) | 0; if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; }
            const box = [bx0 - 10, by0 - 10, bx1 + 10, by1 + 10], lo = [(Math.floor((gx0 + bx0) / CW) - 1) * CW - gx0 + 4, (Math.floor((gy0 + by0) / CH) - 1) * CH - gy0 + 4], hi = [(Math.floor((gx0 + bx1) / CW) + 2) * CW - 1 - gx0 - 4, (Math.floor((gy0 + by1) / CH) + 2) * CH - 1 - gy0 - 4];
            if (box[0] >= lo[0] && box[1] >= lo[1] && box[2] <= hi[0] && box[3] <= hi[1]) blob = blobOf(r, W, H, c.tiles, 1, 1200, null, box);
            if (blob && blob.some(i => edge[i])) blob = null; }
          else { const s = new Set(c.tiles); for (const i of c.tiles) { const x = i % W, y = (i / W) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const m = (y + dy) * W + x + dx; if (m >= 0 && m < W * H && !r[m]) s.add(m); } }
            blob = [...s]; if (blob.some(i => noRaise[i] || wblock[i] || edge[i])) blob = null; }
          if (blob) { let bx0 = W, by0 = H, bx1 = -1, by1 = -1; for (const i of blob) { const x = i % W, y = (i / W) | 0; if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; }
            if (blob.every(i => !lk[i]) && stairSeen(c.tiles, 0, 0, [bx0, by0, bx1, by1])) { for (const i of blob) r[i] = isRaised ? 0 : 1; info.filled.push(c.n); changed = true; continue; } }
          if (info.dbg) (info.why || (info.why = [])).push(`pocket ${c.n}: not filled`);
        }
        // a stair on one of its south faces, held straight (the second pass over the window carries it): the longest first; land-reach-1: the next longest when a face's site is not seen whole by every window
        // the seam compares there, or meets another site
        const cset = new Set(c.tiles), runs = [];
        for (let y = 4; y < H - foot - 2; y++) { let n = 0, from = 0;
          for (let x = 1; x <= W - 1; x++) { const on = x < W - 1 && r[y * W + x] === 1 && r[(y + 1) * W + x] === 0 && cset.has((isRaised ? y - 1 : y + fr + 1) * W + x);
            if (on) { if (!n) from = x; n++; } else { if (n) runs.push({ x0: from, n, y }); n = 0; } } }
        runs.sort((a, b) => b.n - a.n || a.y - b.y || a.x0 - b.x0);
        let placed = false;
        if (attempt < 2 && (c.n >= 6 || !isRaised)) for (const best of runs) {
          const xm = best.x0 + ((best.n - 2) >> 1);
          if (info.dbg) (info.why || (info.why = [])).push(`pocket ${c.n}: run ${best.x0 + gx0},${best.y + gy0} n${best.n} attempt ${attempt} raisable ${siteRaisable(noRaise, W, xm - 2, best.y)} seen ${stairSeen(c.tiles, xm - 2, best.y)}`);
          if (xm - 2 >= 1 && xm + 4 < W && siteRaisable(noRaise, W, xm - 2, best.y) && stairSeen(c.tiles, xm - 2, best.y) && ![...sites, ...extra].some(s => Math.abs(s.lx - (xm - 2)) < SITE_W + 2 && s.ly - SITE_UP - 2 < best.y + foot + 2 && best.y - SITE_UP - 2 < s.ly + foot + 2)) { extra.push({ lx: xm - 2, ly: best.y, real: false }); info.pocketStairs.push({ x: gx0 + xm, y: gy0 + best.y, n: c.n, raised: isRaised ? 1 : 0 }); again = true; placed = true; break; }
        }
        if (!placed && !fits) (info.deferred || (info.deferred = [])).push(c.n);
      }
      if (again) break;
      if (!changed) break;
      r = recleanNear(r, snap, W, H, L.rule, lk);
    }
    if (!again) { shape(); break; }
  }
  info.sites = sites.concat(extra).map(s => ({ x: gx0 + s.lx + 2, y: gy0 + s.ly, real: s.real, ...(s.bank ? { bank: true } : {}) }));
  return r;
}
// a cell's tile levels, 24 x 28 values (0 outside the realm)
export function levelCell(L, X, Y) {
  const key = (X + 8) * 1000 + (Y + 8), hit = L.cells.get(key); if (hit) return hit;
  const out = new Uint8Array(N);
  if (inRealm(X, Y)) { const w = windowLevels(L, X, Y), o = L.rule.window; for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CW; tx++) out[ty * CW + tx] = w.R[(o * CH + ty) * w.W + o * CW + tx];
    L.pk.set(key, w.info.sites.filter(s => !s.real && s.x >= X * CW - 2 && s.x < (X + 1) * CW + 2 && s.y >= Y * CH - 3 && s.y < (Y + 1) * CH + 3));
    (L.bkw || (L.bkw = new Map())).set(key, w.info.sites.filter(s => s.bank && s.x >= X * CW - 2 && s.x < (X + 1) * CW + 2 && s.y >= Y * CH - 3 && s.y < (Y + 1) * CH + 3)); }
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
// land-reach-2: a tile the field puts on a level above the lowest that the passes left low (a mesa the fill lowered, a bump cut). Read from the world tile alone (its q and its final level), so every window agrees.
export function loweredAt(L, gx, gy) {
  if (gx < 0 || gy < 0 || gx >= WTW || gy >= WTH || inlandOf(gx, gy) < RAISE_OFF) return false;
  const X = Math.floor(gx / CW), Y = Math.floor(gy / CH), k = (gy - Y * CH) * CW + gx - X * CW;
  if (levelCell(L, X, Y)[k] !== 0) return false;
  return qCell(L, X, Y)[k] >= L.rule.levels[0];
}
// raised land: level 1 or more, and at least RAISE_OFF tiles from the border line
export const raised =(L, gx, gy) => inlandOf(gx, gy) >= RAISE_OFF && tileLevel(L, gx, gy) >= 1;

// ---- the realm's edge probe (before any pass): reads the height field and the wet field on the strip of tiles each side of an edge, never a place ----
// The rows (columns, for a north-south edge) along the edge between the cells A and B (B east or south of A) where the `deep` tiles each side are all dry and on one level (raised or low by the field's own
// threshold, the passes not run). `need` rows are enough: the count stops there (the rows are read from the middle outwards). The roads ask this of the edges a trail or a bridge bank uses.
export function edgeRows(L, ax, ay, bx, by, need, deep = 2, want = 0) {
  const east = bx > ax, n = east ? CH : CW, th = L.rule.levels[0]; let rows = 0;
  const lvl = (gx, gy) => (inlandOf(gx, gy) >= RAISE_OFF && qAtLeast(L, gx, gy, th) ? 1 : 0);
  for (let s = 0; s < n && rows < need; s++) {   // every second row is read and stands for the pair (the field moves slowly along an edge)
    const t = (s & 1 ? -1 : 1) * ((s + 1) >> 1) * 2 + (n >> 1), ok = t >= 0 && t < n; if (!ok) continue;
    let good = true;
    for (let i = 0; i < deep && good; i++) for (const side of [0, 1]) {
      const gx = east ? (side ? bx * CW + i : bx * CW - 1 - i) : ax * CW + t, gy = east ? ay * CH + t : (side ? by * CH + i : by * CH - 1 - i);
      if (landWet(L, gx, gy)) { good = false; break; }
      const v = lvl(gx, gy);
      if (v !== want) { good = false; break; }
    }
    if (good) rows += 2;
  }
  return rows;
}
// a bridge's two banks: the rows where the `deep` tiles of the bank's edge by the water are dry and low on both banks, the same row on each (a bridge runs straight across)
export function bankRows(L, ax, ay, bx, by, need, deep = 2) {
  const east = bx !== ax, n = east ? CH : CW, th = L.rule.levels[0]; let rows = 0;
  const lo = (gx, gy) => !(inlandOf(gx, gy) >= RAISE_OFF && qAtLeast(L, gx, gy, th)) && !landWet(L, gx, gy);
  const [lx, ly, hx, hy] = (east ? bx < ax : by < ay) ? [bx, by, ax, ay] : [ax, ay, bx, by];   // the western (northern) bank, the eastern (southern) one
  for (let t = 0; t < n && rows < need; t++) {
    let good = true;
    for (let i = 0; i < deep && good; i++) {
      const g1x = east ? (lx + 1) * CW - 1 - i : lx * CW + t, g1y = east ? ly * CH + t : (ly + 1) * CH - 1 - i, g2x = east ? hx * CW + i : hx * CW + t, g2y = east ? hy * CH + t : hy * CH + i;
      if (!lo(g1x, g1y) || !lo(g2x, g2y)) good = false;
    }
    if (good) rows++;
  }
  return rows;
}

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
  const R = (a, b) => (inlandOf(a, b) >= RAISE_OFF && tileLevel(L, a, b) > k), foot = footRoom(L.rule.faceRows), lip = (a, b) => R(a, b) && !R(a, b + 1);
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
// the earth banks of the window of cell (X, Y) that stand after the passes (a straight site, as a way up), in world tiles: { x, y, w: 2, h: 1 } like a way up; the page draws them undug and blocks them
export function bankWayups(L, X, Y) {
  levelCell(L, X, Y); const out = [];
  for (const s of (L.bkw && L.bkw.get((X + 8) * 1000 + (Y + 8))) || []) { const w = checkSite(L, s.x, s.y); if (w) out.push(w); }
  return out;
}
// the held sites of the realm's stairs that did not survive the passes, and the window information of a cell (the tools read it)
export const windowInfo = (L, X, Y) => windowLevels(L, X, Y).info;
