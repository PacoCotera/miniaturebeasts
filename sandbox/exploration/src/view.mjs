// The Companion's place view (C2a): tile size, the centred camera, the visible range, tile and screen coordinates, the
// sprite anchor, and the two tests the edge cues use. Pure and integer only: no page state, DOM, clock, storage, randomness, float,
// rounding to nearest or square root. Inputs are integers (the caller rounds the tween); division is Math.floor on integers.
import { PW, PH } from './world.mjs';

export const TS = 48, TS_OLD = 32, SPR = 32;                       // the place tile; the cave and fallback tile; today's sprite box
export const ON_SCREEN = { x0: 17, y0: 49, x1: 433, y1: 547 };     // a 32 px creature centred in its cell shows whole
export const ON_SCREEN_48 = { x0: 25, y0: 57, x1: 425, y1: 539 };  // the box once the 48 px frames land (unused in C2a)
export function viewOf(ts, x, y, w, h) {                           // the page passes 0, VIEW_Y, SCR_W, VIEW_H (0, 32, 450, 532)
  return { ts, x, y, w, h, pw: PW * ts, ph: PH * ts };
}
export function sprOff(ts) { return { x: (ts - SPR) >> 1, y: ts - SPR }; }   // 48: (8, 16); 32: (0, 0)

// The camera: centred on the pawn's tween origin (top-left of its cell, place px), clamped to the place. Computed each frame,
// stored nowhere; the shake is added by the caller after the clamp.
export function camAt(v, px, py) {
  const x = px + (v.ts >> 1) - (v.w >> 1), y = py + (v.ts >> 1) - (v.h >> 1);
  return { x: x < 0 ? 0 : x > v.pw - v.w ? v.pw - v.w : x, y: y < 0 ? 0 : y > v.ph - v.h ? v.ph - v.h : y };
}

// The tiles in view, inclusive (off-place tiles are the caller's: void), and tile and screen coordinates. `cam` is the drawn camera.
export function visTiles(v, cam) { return { tx0: Math.floor(cam.x / v.ts), ty0: Math.floor(cam.y / v.ts),
  tx1: Math.floor((cam.x + v.w - 1) / v.ts), ty1: Math.floor((cam.y + v.h - 1) / v.ts) }; }
export function tileScr(v, cam, tx, ty) { return { x: v.x + tx * v.ts - cam.x, y: v.y + ty * v.ts - cam.y }; }
export function scrTile(v, cam, sx, sy) { return { tx: Math.floor((sx - v.x + cam.x) / v.ts), ty: Math.floor((sy - v.y + cam.y) / v.ts) }; }
export function sprOrigin(v, cam, px, py) { const o = sprOff(v.ts); return { x: v.x + px - cam.x + o.x, y: v.y + py - cam.y + o.y }; }   // px, py: a tile origin in place px (tweened)

// The cues' hooks: whether a cell's centre, camera applied, is inside box (inclusive); and where the ray from screen point A to B
// meets box (null if B is inside), with the side it leaves by.
export function tileOnScreen(v, cam, tx, ty, box) {
  const cx = v.x + tx * v.ts - cam.x + (v.ts >> 1), cy = v.y + ty * v.ts - cam.y + (v.ts >> 1);
  return cx >= box.x0 && cx <= box.x1 && cy >= box.y0 && cy <= box.y1; }
const divRound = (a, b) => a >= 0 ? Math.floor((2 * a + b) / (2 * b)) : -Math.floor((-2 * a + b) / (2 * b));   // b > 0, halves away from 0
export function edgePoint(box, ax, ay, bx, by) {
  if (bx >= box.x0 && bx <= box.x1 && by >= box.y0 && by <= box.y1) return null;
  const dx = bx - ax, dy = by - ay; let n = 1, d = 0, side = null;
  const take = (nn, dd, s) => { if (dd > 0 && (side === null || nn * d < n * dd)) { n = nn; d = dd; side = s; } };
  if (dx > 0) take(box.x1 - ax, dx, 'E'); if (dx < 0) take(ax - box.x0, -dx, 'W'); if (dy > 0) take(box.y1 - ay, dy, 'S'); if (dy < 0) take(ay - box.y0, -dy, 'N');
  return { x: ax + divRound(dx * n, d), y: ay + divRound(dy * n, d), side }; }

// The 48 px place's edge rules, carried as pure integer functions (the C port reads these, not the page).
export const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];   // the 4 × 4 ordered-dither matrix, row-major (equal to the page's BAYER)

const NB9 = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];   // N, NE, E, SE, S, SW, W, NW

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

// The band's dark columns at 48 for a gap still to close: n = 20·(3 − gap) in twentieths of a column (gap < 3, a multiple of 0.05);
// STORM_K[48] = 7/5 so columns = ceil(7n/100). 32 px keeps main's float rule in the page.
export function stormCols48(n) { return Math.floor((7 * n + 99) / 100); }
