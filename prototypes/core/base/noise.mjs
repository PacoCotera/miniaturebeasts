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
const GX = [1, -1, 0, 0, 1, -1, 1, -1], GY = [0, 0, 1, -1, 1, 1, -1, -1];

// quintic fade 6t^5 - 15t^4 + 10t^3 on t in Q16, result Q16
export function fade(t) {
  const t2 = shr(t * t, 16), t3 = shr(t2 * t, 16);
  return shr(t3 * (shr(t * (6 * t - 15 * ONE), 16) + 10 * ONE), 16);
}

export function grad2(px, py, s, seed) {
  const sh = 8 + s, mask = (1 << sh) - 1, ix = px >> sh, iy = py >> sh;
  const fx = (px & mask) << (16 - sh), fy = (py & mask) << (16 - sh);
  const dot = (i, j, dx, dy) => { const g = hash2(ix + i, iy + j, seed) & 7; return GX[g] * dx + GY[g] * dy; };
  const n00 = dot(0, 0, fx, fy), n10 = dot(1, 0, fx - ONE, fy), n01 = dot(0, 1, fx, fy - ONE), n11 = dot(1, 1, fx - ONE, fy - ONE);
  const u = fade(fx), v = fade(fy);
  const a = n00 + shr((n10 - n00) * u, 16), b = n01 + shr((n11 - n01) * u, 16);
  return a + shr((b - a) * v, 16);
}

export function fbm(px, py, s0, octaves, seed) {
  let sum = 0, wsum = 0;
  for (let o = 0; o < octaves; o++) {
    const w = 1 << (octaves - 1 - o);
    sum += w * grad2(px, py, s0 - o, subSeed(seed, "oct", o));
    wsum += w;
  }
  return quot(sum, wsum) | 0;
}

export function warp(px, py, seed, reach = 6) {
  const wx = fbm(px, py, 5, 2, subSeed(seed, "warpx")), wy = fbm(px, py, 5, 2, subSeed(seed, "warpy"));
  return { x: (wx * reach) >> 8, y: (wy * reach) >> 8 };
}

export function detail(gx, gy, seed, reach = 6) {
  const px = 256 * gx + 128, py = 256 * gy + 128, w = warp(px, py, seed, reach);
  return fbm(px + w.x, py + w.y, 5, 4, subSeed(seed, "detail"));
}
