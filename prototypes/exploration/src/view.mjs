// The Companion's place view (C2a): tile size, the centred camera, the visible range, tile and screen coordinates, the
// sprite anchor, and the two tests the edge cues use. Pure and integer only: no page state, DOM, clock, storage, randomness, float,
// rounding to nearest or square root. Inputs are integers (the caller rounds the tween); division is Math.floor on integers.
import { PW, PH } from './world.mjs';

export const TS = 48, TS_OLD = 32, SPR = 32;                       // the place tile; the cave and fallback tile; today's sprite box
export const ON_SCREEN = { x0: 17, y0: 49, x1: 433, y1: 547 };     // a 32 px creature centred in its cell shows whole
export const ON_SCREEN_48 = { x0: 25, y0: 57, x1: 425, y1: 539 };  // the box once the 48 px frames land (unused in C2a)
export function viewOf(ts, x, y, w, h, tw = PW, th = PH) {         // the page passes 0, VIEW_Y, SCR_W, VIEW_H (0, 32, 450, 532) and the place's own width and height in tiles
  return { ts, x, y, w, h, pw: tw * ts, ph: th * ts };
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
// The edge shapers that draw with it (the eighths, the storm step and the fog and storm band hits) live in render/edge.mjs.

// The storm's soft edge in the place view (#149). The storm side keeps its reach `darkW` px from the screen side it comes from; its leading edge is a band
// BAND_PX (3 tiles) wide. Per WORLD pixel (px, py are the place's pixel coordinates, never snapped per tile, so nothing crawls with the camera) the pixel's own
// depth inside the band (0 at the day side, BAND_PX at the storm side) is compared with the house 4 x 4 Bayer matrix: the storm share falls evenly 100 > 75 > 50 > 25 > 0
// with no step lines. The edge is not a straight line: it moves per pixel row by a smooth seeded noise of 1 to 2 tiles (two octaves, periods 5 and 2 tiles), a function of
// the row and the seed only (stable between frames).
export const BAND_PX = 144;
const lat = (i, seed) => { let h = (Math.imul(i + 7919, 0x9E3779B1) ^ Math.imul(seed | 0, 0x85EBCA6B)) >>> 0; h = Math.imul(h ^ (h >>> 15), 0x2C1B3C6D) >>> 0; h = (h ^ (h >>> 12)) >>> 0; return (h & 0xffff) / 32767.5 - 1; };
const vnoise = (y, period, seed) => { const t = y / period, i = Math.floor(t), f = t - i, u = f * f * (3 - 2 * f); return lat(i, seed) * (1 - u) + lat(i + 1, seed) * u; };
// the edge's offset in px for a pixel row (within +-96: 1 to 2 tiles)
export function stormWobble(py, seed) { return Math.round(vnoise(py, 240, seed) * 72 + vnoise(py, 96, seed ^ 0x5bd1e995) * 24); }
// px the pixel stands inside the leading edge: <= 0 day, >= BAND_PX full storm. ds: the pixel's distance in px from the screen side the storm comes from.
export function stormBandDepth(ds, py, darkW, seed) { return darkW + stormWobble(py, seed) - ds; }

// The fog sight's soft edge (#153). Fog sight stays the round rule (sightR, per tile); only the DRAWING of its edge changes: the fog table comes in over FOG_BAND_PX
// (2.5 tiles at 48) past a start radius at the sight radius (every in-sight tile centre stays clear), by the same per-world-pixel 4 x 4 Bayer step as the storm band (25/50/75 percent fog).
// The start radius wobbles with the angle round the hero, 0 to 1 tile, by a seeded sum of three sines (periodic, so there is no seam), a function of angle and seed only.
export function fogWobble(theta, seed) {
  const ph = (k) => (lat(k, seed) + 1) * Math.PI;
  return Math.max(0, Math.round(48 * (0.5 + 0.3 * Math.sin(2 * theta + ph(1)) + 0.2 * Math.sin(3 * theta + ph(2)) + 0.15 * Math.sin(5 * theta + ph(3))) / 1.15));
}
// depth in px past the start radius; fog = 1 when the pixel takes the fog table. e = { cx, cy, r, seed } in the drawn size's place pixels (48 here).
export function fogDepth(px, py, e) { const dx = px - e.cx, dy = py - e.cy; return Math.hypot(dx, dy) - e.r - fogWobble(Math.atan2(dy, dx), e.seed); }

// The fog's drifting puffs (#154): a seeded irregular blob, 2 to 4 tiles wide and 1 to 2 tall (at 48), no straight sides, dense at the centre and thinning to nothing at the rim
// by the same 4 x 4 Bayer as the fog band, on SCREEN pixels: the dots stay where they are while the puff's outline drifts over them. Colour: the fog table's lightest tone (bone, never white).
export const PUFF_TONE = 'bone';
export function puffSize(seed) { const w = 96 + 48 * (Math.abs(lat(1, seed)) * 2.99 | 0); return { w, h: Math.min(96, w / 2 + (lat(2, seed) > 0 ? 24 : 0)) }; }
// Dot share 0..12 (sixteenths) at a pixel (x, y) relative to the puff's origin; 0 outside the blob.
export function puffShare(seed, x, y) {
  const { w, h } = puffSize(seed), ph = (k) => (lat(k + 10, seed) + 1) * Math.PI, dx = x + .5 - w / 2, dy = y + .5 - h / 2, th = Math.atan2(dy / h, dx / w);
  const r = 0.82 + 0.09 * Math.sin(2 * th + ph(1)) + 0.07 * Math.sin(3 * th + ph(2)) + 0.06 * Math.sin(5 * th + ph(3)) + 0.04 * Math.sin(7 * th + ph(4)),
    d = Math.hypot(dx / (w / 2), dy / (h / 2)) / r;
  return d >= 1 ? 0 : Math.min(12, Math.ceil(13 * (1 - d))); }
// Is the screen pixel (sx, sy) a dot of the puff whose origin is (ox, oy)?
export function puffHit(seed, ox, oy, sx, sy) { const s = puffShare(seed, sx - ox, sy - oy); return s > 0 && BAYER4[(sy & 3) * 4 + (sx & 3)] < s; }

// The band's dark columns at 48 for a gap still to close: n = 20·(3 − gap) in twentieths of a column (gap < 3, a multiple of 0.05);
// STORM_K[48] = 7/5 so columns = ceil(7n/100). 32 px keeps main's float rule in the page.
export function stormCols48(n) { return Math.floor((7 * n + 99) / 100); }
