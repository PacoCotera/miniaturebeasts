// The place camera (place design A4.2). Pure and integer only: no float results, no clock of its own (the caller passes milliseconds),
// no square root of a float. Pixels are place pixels at 48 px.
//
// The view is centred on the explorer, plus
//   look-ahead: 1.5 tiles (72 px) toward the facing direction, eased over 200 ms;
//   pull to the tell: while the heart is not found and the nearest clue point or the heart is within 6 tiles, a bias of up to 2 tiles (96 px)
//   toward it, scaled by closeness;
// then clamped to the place so its edge band frames the screen and no void shows.

export const TILE = 48;
export const LOOK_PX = 72;
export const LOOK_MS = 200;
export const PULL_TILES = 6;
export const PULL_MAX = 96;

const isqrt = (n) => { if (n < 2) return n; let x = Math.floor(Math.sqrt(n)); while (x * x > n) x--; while ((x + 1) * (x + 1) <= n) x++; return x; };
const div = (a, b) => Math.trunc(a / b);   // integer division toward zero (b > 0)

// ---- look-ahead ----
// The look-ahead is a small state: where it was when the facing last changed, where it is heading, and when that started.
export function newLook() { return { fx: 0, fy: 0, tx: 0, ty: 0, at: 0, dx: 0, dy: 0 }; }

// The offset (integer px) at `nowMs`: from the starting offset toward the target along 2p - p^2 (an ease-out), p = elapsed / 200 ms.
export function lookOffset(l, nowMs) {
  const t = Math.max(0, Math.min(LOOK_MS, nowMs - l.at));
  const e = t * (2 * LOOK_MS - t), den = LOOK_MS * LOOK_MS;      // e / den = 2p - p^2, 0..1
  return { x: l.fx + div((l.tx - l.fx) * e, den), y: l.fy + div((l.ty - l.fy) * e, den) };
}

// Face (dx, dy) in -1..1 at `nowMs`: when the facing changes the easing restarts from where the offset is now. Returns the offset.
export function lookTo(l, dx, dy, nowMs) {
  if (dx !== l.dx || dy !== l.dy) {
    const cur = lookOffset(l, nowMs);
    l.fx = cur.x; l.fy = cur.y; l.tx = dx * LOOK_PX; l.ty = dy * LOOK_PX; l.at = nowMs; l.dx = dx; l.dy = dy;
  }
  return lookOffset(l, nowMs);
}

// ---- pull to the tell ----
// pawn: { x, y } centre in px. targets: [{ x, y }] centres in px (the clue points and the heart). found: the heart is found. Returns { x, y } px.
export function tellPull(pawn, targets, found) {
  if (found || !targets.length) return { x: 0, y: 0 };
  let best = null, bd = Infinity;
  for (const t of targets) { const d2 = (t.x - pawn.x) ** 2 + (t.y - pawn.y) ** 2; if (d2 < bd) { bd = d2; best = t; } }
  const reach = PULL_TILES * TILE, d = isqrt(bd);
  if (d === 0 || d >= reach) return { x: 0, y: 0 };
  const m = Math.min(d, div(PULL_MAX * (reach - d), reach));   // never past the target itself
  return { x: div((best.x - pawn.x) * m, d), y: div((best.y - pawn.y) * m, d) };
}

// ---- the camera ----
// view: { w, h } (450 x 532); place: { pw, ph } in px (864 x 1056); pawn: centre px; look, pull: offsets. Returns the top-left of the view, clamped.
export function cameraFor(view, place, pawn, look = { x: 0, y: 0 }, pull = { x: 0, y: 0 }) {
  const x = pawn.x + look.x + pull.x - (view.w >> 1), y = pawn.y + look.y + pull.y - (view.h >> 1);
  const mx = Math.max(0, place.pw - view.w), my = Math.max(0, place.ph - view.h);
  return { x: x < 0 ? 0 : x > mx ? mx : x, y: y < 0 ? 0 : y > my ? my : y };
}
