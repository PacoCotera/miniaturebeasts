// The Companion's place view (plans: C2a §3): tile size, the centred camera, the visible range, tile and screen coordinates, the
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
