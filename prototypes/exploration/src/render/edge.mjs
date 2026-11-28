// The edge shapers (render layer): where fog, veil and storm meet clear ground, drawn per pixel from the 4 × 4 Bayer matrix. Pure and integer: no page state, DOM, clock or storage.
// Moved as they were from view.mjs (the eighths, the storm step, the fog and storm bands) and from the page (the two fade tables, the eighth picker); no look change.
import { BAYER4, BAND_PX, stormBandDepth, fogDepth } from './view.mjs';

export const NB9 = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];   // N, NE, E, SE, S, SW, W, NW

// Fog and veil edges at 48 are drawn in eighths (12 px), opened by a disc (eighthGrid); the quarter look (24 px) is its fallback. The 8-neighbour mask `m8` holds the far-side state of a tile's neighbours, bit 0 N, 1 NE, 2 E,
// 3 SE, 4 S, 5 SW, 6 W, 7 NW (NB9's order). `quarterFar(own, m8)` gives the tile's four quarters as bits (nw 1, ne 2, sw 4, se 8): all four when the tile
// itself is far; otherwise a quarter is far when both sides meeting at its corner are far, unless all four orthogonal neighbours are far (a lone near tile
// stays whole). The clear look is never larger than the rule.
export function quarterFar(own, m8) {
  if (own) return 15;
  if ((m8 & 0x55) === 0x55) return 0;
  const n = m8 & 1, e = (m8 >> 2) & 1, s = (m8 >> 4) & 1, w = (m8 >> 6) & 1;
  return (n & w) | ((n & e) << 1) | ((s & w) << 2) | ((s & e) << 3); }

// Eighths (12 px cells, 4 × 4 to a tile; the grid is 4w × 4h). `far` is the tile far bits, w × h row-major (1 far; off the grid counts as near).
// The tile rule is opened by a disc of 2 tiles (R = 8 eighths, R² = 64), cut-only, so the outline rounds without ever showing more than the rule:
//   core  = a near eighth with no far eighth within 8 cells (an erosion: per row, the distance to the nearest far eighth, capped at 9);
//   open  = an eighth within 8 cells of a core eighth (the dilation, the same way);
//   far   = the tile's own far bit, or not open. A hidden tile's 16 eighths are always far.
// A near tile whose 16 eighths all came out far (a region narrower than about 4 tiles) takes its quarter look instead (quarterFar), so a lone near
// tile or a narrow lift never vanishes. Returns a Uint8Array(16·w·h), row-major, 1 far. About 0.55 M integer operations for a 28 × 32 place.
export function eighthGrid(far, w, h) {
  const EW = 4 * w, EH = 4 * h, E0 = (ex, ey) => far[(ey >> 2) * w + (ex >> 2)];
  const hf = new Uint8Array(EW * EH), hc = new Uint8Array(EW * EH), core = new Uint8Array(EW * EH), out = new Uint8Array(EW * EH);
  const rowDist = (isSrc, d) => { for (let y = 0; y < EH; y++) { let run = 9;
      for (let x = 0; x < EW; x++) { run = isSrc(x, y) ? 0 : run < 9 ? run + 1 : 9; d[y * EW + x] = run; }
      run = 9; for (let x = EW - 1; x >= 0; x--) { run = isSrc(x, y) ? 0 : run < 9 ? run + 1 : 9; if (run < d[y * EW + x]) d[y * EW + x] = run; } } };
  rowDist((x, y) => E0(x, y) === 1, hf);
  for (let y = 0; y < EH; y++) for (let x = 0; x < EW; x++) { let ok = E0(x, y) === 0;
    for (let dy = -8; dy <= 8 && ok; dy++) { const yy = y + dy; if (yy < 0 || yy >= EH) continue; const d = hf[yy * EW + x]; if (d * d + dy * dy <= 64) ok = false; }
    core[y * EW + x] = ok ? 1 : 0; }
  rowDist((x, y) => core[y * EW + x] === 1, hc);
  for (let y = 0; y < EH; y++) for (let x = 0; x < EW; x++) { let open = false;
    for (let dy = -8; dy <= 8 && !open; dy++) { const yy = y + dy; if (yy < 0 || yy >= EH) continue; const d = hc[yy * EW + x]; if (d * d + dy * dy <= 64) open = true; }
    out[y * EW + x] = E0(x, y) === 1 || !open ? 1 : 0; }
  for (let ty = 0; ty < h; ty++) for (let tx = 0; tx < w; tx++) {
    if (far[ty * w + tx]) continue; let any = 0;
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) if (out[(4 * ty + j) * EW + 4 * tx + i] === 0) any = 1;
    if (any) continue;
    let m8 = 0; for (let b = 0; b < 8; b++) { const x = tx + NB9[b][0], y = ty + NB9[b][1]; if (x >= 0 && y >= 0 && x < w && y < h && far[y * w + x]) m8 |= 1 << b; }
    const q = quarterFar(0, m8);
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) out[(4 * ty + j) * EW + 4 * tx + i] = (q >> ((j >> 1) * 2 + (i >> 1))) & 1; }
  return out; }

// The dither of one eighth: `m9e` is the far state of the eighth (bit 8) and its 8 neighbouring eighths (bits 0–7, NB9's order); the result is one byte for
// each of its 12 × 12 pixels (row-major, 0 near, 1 far). A pixel samples a 5 × 5 grid (±6 px, 3 px apart); each sample lies on the eighth or one of its
// neighbours, and the pixel is far when 32·c > (2·BAYER + 1)·25 (c the samples on far eighths). 12 is a multiple of 4: the Bayer phase is the same in
// every eighth. The table of the 512 masks is built on first use.
let EIGHTH_TABLE = null;
export function coverE(m9e) {
  if (!EIGHTH_TABLE) EIGHTH_TABLE = new Array(512).fill(null);
  let f = EIGHTH_TABLE[m9e]; if (f) return f;
  f = new Uint8Array(12 * 12);
  const far = (dx, dy) => { if (dx === 0 && dy === 0) return (m9e >> 8) & 1; for (let b = 0; b < 8; b++) if (NB9[b][0] === dx && NB9[b][1] === dy) return (m9e >> b) & 1; return 0; };
  for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) { let c = 0;
    for (let oy = -6; oy <= 6; oy += 3) for (let ox = -6; ox <= 6; ox += 3) c += far(Math.floor((x + ox + 12) / 12) - 1, Math.floor((y + oy + 12) / 12) - 1);
    f[y * 12 + x] = 32 * c > (2 * BAYER4[(y & 3) * 4 + (x & 3)] + 1) * 25 ? 1 : 0; }
  EIGHTH_TABLE[m9e] = f; return f; }

// The 6 px step beside the approaching storm's band at 48: `d` is the pixel's distance from the lit tile's side next to the band (0–47); the pixel takes
// the storm table when d < 6 and BAYER·7 < (6 − d)·16.
export function stormStep(d, x, y) { return d < 6 && BAYER4[(y & 3) * 4 + (x & 3)] * 7 < (6 - d) * 16; }

// The storm's soft edge hit (#149): the band's depth (view.mjs stormBandDepth) against the house 4 x 4 Bayer matrix, per WORLD pixel.
export function stormBandHit(ds, py, px, darkW, seed) {
  const d = stormBandDepth(ds, py, darkW, seed);
  return d >= BAND_PX || (d > 0 && BAYER4[(py & 3) * 4 + (px & 3)] * BAND_PX < d * 16); }

// The fog sight's soft edge (#153): the fog table comes in over FOG_BAND_PX (2.5 tiles at 48) past the start radius, by the same per-world-pixel Bayer step as the storm band (25/50/75 percent fog).
export const FOG_BAND_PX = 120;
export function fogBandHit(px, py, e) {
  const d = fogDepth(px, py, e);
  return d >= FOG_BAND_PX || (d > 0 && BAYER4[(py & 3) * 4 + (px & 3)] * FOG_BAND_PX < d * 16); }

// The survey veil across the band: a pixel that stays clear keeps the veil only where a second 4 x 4 Bayer test (the same matrix, shifted 2 px) at the same share also says veil,
// so the veil thins out with the clear ground and is gone where the fog takes over (no tile step, no new table).
export function fogVeilKeep(px, py, e) {
  const d = fogDepth(px, py, e);
  return d <= 0 || (d < FOG_BAND_PX && BAYER4[((py + 2) & 3) * 4 + ((px + 2) & 3)] * FOG_BAND_PX >= d * 16); }

// Light edges are autotiled like shores: a tile that borders a darker light level gets a pre-dithered variant (this level fading into the next one), chosen from the 4 sides and 4 corners where the neighbour is darker.
// Every builder works on the tile's own size, n = pb.w (32 today), and caches by (mask, n); the fade stays 16 px wide.
export const FADE_W = 16;
const EDGE_FADE = new Map();
export function edgeFade(mask, n) { // per pixel: how far (0..1) toward the darker level, strongest at the borders
  const fk = mask + '|' + n; let f = EDGE_FADE.get(fk); if (f) return f; f = new Float32Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { let t = 0;
    const sides = [[1, y + .5], [2, n - x - .5], [4, n - y - .5], [8, x + .5]];
    for (const [bit, d] of sides) if (mask & bit) t = Math.max(t, 1 - d / FADE_W);
    const corners = [[16, x + .5, y + .5], [32, n - x - .5, y + .5], [64, n - x - .5, n - y - .5], [128, x + .5, n - y - .5]];
    for (const [bit, dx, dy] of corners) if (mask & bit) t = Math.max(t, 1 - Math.hypot(dx, dy) / FADE_W);
    f[y * n + x] = t; }
  EDGE_FADE.set(fk, f); return f;
}
// The fog bank's edge: a seen tile beside fogged ones fades into the fog table over the whole tile (n px). Cached per side mask and size.
const FOG_FADE = new Map();
export function fogFade(mask, n) { const fk = mask + '|' + n; let f = FOG_FADE.get(fk); if (f) return f; f = new Float32Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { let t = 0;
    for (const [bit, d] of [[1, y + .5], [2, n - x - .5], [4, n - y - .5], [8, x + .5]]) if (mask & bit) t = Math.max(t, 1 - d / n);
    for (const [bit, dx, dy] of [[16, x + .5, y + .5], [32, n - x - .5, y + .5], [64, n - x - .5, n - y - .5], [128, x + .5, n - y - .5]]) if (mask & bit) t = Math.max(t, 1 - Math.hypot(dx, dy) / n);
    f[y * n + x] = t * .9; }
  FOG_FADE.set(fk, f); return f; }

// The far-side picker of a tile's 16 eighths: ms are their masks (row-major), the result is (x, y) in the tile's 48 px -> 1 far.
export const pickE = ms => { const cv = ms.map(coverE); return (x, y) => cv[((y / 12) | 0) * 4 + ((x / 12) | 0)][(y % 12) * 12 + x % 12]; };
