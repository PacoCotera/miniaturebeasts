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

// Fog and veil edges at 48 are drawn in quarters (24 px). The 8-neighbour mask `m8` holds the far-side state of a tile's neighbours, bit 0 N, 1 NE, 2 E,
// 3 SE, 4 S, 5 SW, 6 W, 7 NW (NB9's order). `quarterFar(own, m8)` gives the tile's four quarters as bits (nw 1, ne 2, sw 4, se 8): all four when the tile
// itself is far; otherwise a quarter is far when both sides meeting at its corner are far, unless all four orthogonal neighbours are far (a lone near tile
// stays whole). The clear look is never larger than the rule.
export function quarterFar(own, m8) {
  if (own) return 15;
  if ((m8 & 0x55) === 0x55) return 0;
  const n = m8 & 1, e = (m8 >> 2) & 1, s = (m8 >> 4) & 1, w = (m8 >> 6) & 1;
  return (n & w) | ((n & e) << 1) | ((s & w) << 2) | ((s & e) << 3); }

// The dither of one quarter: `m9q` is the far state of the quarter (bit 8) and its 8 neighbouring quarters (bits 0–7, NB9's order); the result is one byte
// for each of its 24 × 24 pixels (row-major, 0 near, 1 far). A pixel samples a 5 × 5 grid (±12 px, 6 px apart); each sample lies on the quarter or one of
// its neighbours, and the pixel is far when 32·c > (2·BAYER + 1)·25 (c the samples on far quarters). 24 is a multiple of 4: the Bayer phase is the same in
// every quarter. The table of the 512 masks is built on first use.
let QUARTER_TABLE = null;
export function coverQ(m9q) {
  if (!QUARTER_TABLE) QUARTER_TABLE = new Array(512).fill(null);
  let f = QUARTER_TABLE[m9q]; if (f) return f;
  f = new Uint8Array(24 * 24);
  const far = (dx, dy) => { if (dx === 0 && dy === 0) return (m9q >> 8) & 1; for (let b = 0; b < 8; b++) if (NB9[b][0] === dx && NB9[b][1] === dy) return (m9q >> b) & 1; return 0; };
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) { let c = 0;
    for (let oy = -12; oy <= 12; oy += 6) for (let ox = -12; ox <= 12; ox += 6) c += far(Math.floor((x + ox + 24) / 24) - 1, Math.floor((y + oy + 24) / 24) - 1);
    f[y * 24 + x] = 32 * c > (2 * BAYER4[(y & 3) * 4 + (x & 3)] + 1) * 25 ? 1 : 0; }
  QUARTER_TABLE[m9q] = f; return f; }

// The 6 px step beside the approaching storm's band at 48: `d` is the pixel's distance from the lit tile's side next to the band (0–47); the pixel takes
// the storm table when d < 6 and BAYER·7 < (6 − d)·16.
export function stormStep(d, x, y) { return d < 6 && BAYER4[(y & 3) * 4 + (x & 3)] * 7 < (6 - d) * 16; }

// The band's dark columns at 48 for a gap still to close: n = 20·(3 − gap) in twentieths of a column (gap < 3, a multiple of 0.05);
// STORM_K[48] = 7/5 so columns = ceil(7n/100). 32 px keeps main's float rule in the page.
export function stormCols48(n) { return Math.floor((7 * n + 99) / 100); }
