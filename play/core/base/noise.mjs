// Whole-number gradient noise of the core (version 1). Every value is a whole number; every product stays under 2^53.
// Same seed and tile = same value on every device. A position is in Q8 tiles (the centre of tile (gx, gy) is 256 gx + 128, 256 gy + 128);
// a field value is Q16 (65536 is 1.0). No inexact maths call, no float field.
//   hash2(x, y, seed)          32-bit lattice hash (u32)
//   subSeed(seed, name, k)     a seed per realm seed, layer name and octave
//   grad2(px, py, s, seed)     gradient noise on a lattice of spacing 2^s tiles, about -65536 .. 65536
//   fbm(px, py, s0, oct, seed) fractal sum, spacing 2^s0 halving per octave, weights oct-1 .. 0 powers of two
//   warp(px, py, seed)         the position moved by up to 6 tiles, in Q8: { x, y }
//   detail(gx, gy, seed)       the land's detail at a tile: 4 octaves (32, 16, 8, 4 tiles) at the warped position
import { shr, quot } from "./whole.mjs";

const N1 = 0xd2a80a3f, N2 = 0xa884f197, N3 = 0x6c736f4b, N4 = 0xb79f3abb, N5 = 0x1b56c4f5;

export function hash1(pos, seed) {
  let m = Math.imul(pos | 0, N1) >>> 0;
  m = (m + (seed >>> 0)) >>> 0;
  m = (m ^ (m >>> 9)) >>> 0;
  m = (m + N2) >>> 0;
  m = (m ^ (m >>> 11)) >>> 0;
  m = Math.imul(m, N3) >>> 0;
  m = (m ^ (m >>> 13)) >>> 0;
  m = (m + N4) >>> 0;
  m = (m ^ (m >>> 15)) >>> 0;
  m = Math.imul(m, N5) >>> 0;
  m = (m ^ (m >>> 17)) >>> 0;
  return m;
}

export const hash2 = (x, y, seed) => hash1((x | 0) + Math.imul(198491317, y | 0), seed);

export function subSeed(seed, name, k = 0) {
  let h = hash1(k, seed >>> 0);
  for (let i = 0; i < name.length; i++) h = hash1(name.charCodeAt(i), h);
  return h;
}

const ONE = 65536;
const GX = new Int32Array([1, -1, 0, 0, 1, -1, 1, -1]), GY = new Int32Array([0, 0, 1, -1, 1, 1, -1, -1]);
const KY = 198491317;   // hash2's row multiplier

// quintic fade 6t^5 - 15t^4 + 10t^3 on t in Q16, result Q16
export function fade(t) {
  const t2 = shr(t * t, 16), t3 = shr(t2 * t, 16);
  return shr(t3 * (shr(t * (6 * t - 15 * ONE), 16) + 10 * ONE), 16);
}

// the gradient number (0..7) of lattice corner pos: hash1's last word, & 7 (the same as hash1(pos, seed) & 7, the steps written out)
function gnum(pos, seed) {
  let m = Math.imul(pos, N1) >>> 0;
  m = (m + seed) >>> 0;
  m = (m ^ (m >>> 9)) >>> 0;
  m = (m + N2) >>> 0;
  m = (m ^ (m >>> 11)) >>> 0;
  m = Math.imul(m, N3) >>> 0;
  m = (m ^ (m >>> 13)) >>> 0;
  m = (m + N4) >>> 0;
  m = (m ^ (m >>> 15)) >>> 0;
  m = Math.imul(m, N5) >>> 0;
  return (m ^ (m >>> 17)) & 7;
}

// fade of every multiple of 8 in 0..65535 (every fraction of a lattice of 32 tiles or finer is one), made on first use; other fractions call fade
let FADE8 = null;
function fadeTable() { const t = new Int32Array(8192); for (let i = 0; i < 8192; i++) t[i] = fade(i << 3); return (FADE8 = t); }

// the noise of one octave from its four corner gradients (g00 g10 g01 g11) and the fractions fx, fy (Q16)
function mixGrad(g00, g10, g01, g11, fx, fy) {
  const fx1 = fx - ONE, fy1 = fy - ONE, T = FADE8 || fadeTable();
  const n00 = GX[g00] * fx + GY[g00] * fy, n10 = GX[g10] * fx1 + GY[g10] * fy, n01 = GX[g01] * fx + GY[g01] * fy1, n11 = GX[g11] * fx1 + GY[g11] * fy1;
  const u = (fx & 7) === 0 && fx >= 0 && fx < ONE ? T[fx >> 3] : fade(fx), v = (fy & 7) === 0 && fy >= 0 && fy < ONE ? T[fy >> 3] : fade(fy);
  const a = n00 + shr((n10 - n00) * u, 16), b = n01 + shr((n11 - n01) * u, 16);
  return a + shr((b - a) * v, 16);
}

export function grad2(px, py, s, seed) {
  const sh = 8 + s, mask = (1 << sh) - 1, ix = px >> sh, iy = py >> sh, sd = seed >>> 0;
  const fx = (px & mask) << (16 - sh), fy = (py & mask) << (16 - sh);
  const r0 = Math.imul(KY, iy), r1 = Math.imul(KY, iy + 1);
  return mixGrad(gnum((ix + r0) | 0, sd), gnum((ix + 1 + r0) | 0, sd), gnum((ix + r1) | 0, sd), gnum((ix + 1 + r1) | 0, sd), fx, fy);
}

// An octave record: the octave's seed and the last lattice cell it read with that cell's four corner gradients, so a run of neighbouring tiles
// (one cell is 2^s tiles wide) hashes each corner once. Records are per seed, made once (the octave seeds are subSeed(seed, "oct", o)).
const OCTS = new Map();
function octsOf(seed, n) {
  const key = seed >>> 0; let a = OCTS.get(key);
  if (!a) { a = []; if (OCTS.size > 512) OCTS.clear(); OCTS.set(key, a); }
  while (a.length < n) a.push({ seed: subSeed(key, "oct", a.length), ix: 0, iy: 0, s: -99, g00: 0, g10: 0, g01: 0, g11: 0 });
  return a;
}

export function fbm(px, py, s0, octaves, seed) {
  const recs = octsOf(seed, octaves);
  let sum = 0, wsum = 0;
  for (let o = 0; o < octaves; o++) {
    const w = 1 << (octaves - 1 - o), r = recs[o], s = s0 - o, sh = 8 + s, mask = (1 << sh) - 1, ix = px >> sh, iy = py >> sh;
    if (r.s !== s || r.ix !== ix || r.iy !== iy) {
      const r0 = Math.imul(KY, iy), r1 = Math.imul(KY, iy + 1), sd = r.seed;
      r.s = s; r.ix = ix; r.iy = iy;
      r.g00 = gnum((ix + r0) | 0, sd); r.g10 = gnum((ix + 1 + r0) | 0, sd); r.g01 = gnum((ix + r1) | 0, sd); r.g11 = gnum((ix + 1 + r1) | 0, sd);
    }
    sum += w * mixGrad(r.g00, r.g10, r.g01, r.g11, (px & mask) << (16 - sh), (py & mask) << (16 - sh));
    wsum += w;
  }
  return quot(sum, wsum) | 0;
}

const WARPS = new Map();   // seed -> [warpx seed, warpy seed]
export function warp(px, py, seed, reach = 6) {
  const key = seed >>> 0; let ws = WARPS.get(key);
  if (!ws) { ws = [subSeed(key, "warpx"), subSeed(key, "warpy")]; if (WARPS.size > 512) WARPS.clear(); WARPS.set(key, ws); }
  const wx = fbm(px, py, 5, 2, ws[0]), wy = fbm(px, py, 5, 2, ws[1]);
  return { x: (wx * reach) >> 8, y: (wy * reach) >> 8 };
}

export function detail(gx, gy, seed, reach = 6) {
  const px = 256 * gx + 128, py = 256 * gy + 128, w = warp(px, py, seed, reach);
  return fbm(px + w.x, py + w.y, 5, 4, subSeed(seed, "detail"));
}
