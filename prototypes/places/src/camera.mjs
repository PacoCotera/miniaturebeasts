// The place camera (companion camera scheme, 2026-11-08): half-screen steps. Pure and integer only: no float results, no clock of its own
// (the caller passes milliseconds and whether motion is on). Pixels are place pixels at 48 px.
//
// On each axis the view rests only on fixed anchors spread evenly over the camera's travel, no more than half a view apart:
//   n = ceil(T / (V / 2)) + 1, a_k = round(k * T / (n - 1)), T = the place's size minus the view's.
// The view moves to the next rest, one at a time, only when fewer than MARGIN (1.5 tiles, 72 px) of ground would show beyond the explorer's tile.
// The slide takes SLIDE_MS (ease-out cubic, whole pixels) and never pauses input; a step during a slide aims again from where the view is.
// Reduced motion cuts. The end rests are the clamp, so the place's edge band always frames the screen. A place smaller than the view has one centred rest.

export const TILE = 48;
export const MARGIN = 72;
export const SLIDE_MS = 280;

// The rests along one axis. T: travel (place size - view size), V: view size.
export function camAnchors(T, V) {
  if (T <= 0) return [Math.trunc(T / 2)];
  const n = Math.ceil(T / (V / 2)) + 1, a = [];
  for (let k = 0; k < n; k++) a.push(Math.round(k * T / (n - 1)));
  return a;
}

// The rest index after the explorer's tile [lo, hi) (place px) is considered, from rest i. Moves one rest at a time, until stable.
export function camAxis(anchors, i, lo, hi, V, margin = MARGIN) {
  for (let k = 0; k < anchors.length; k++) {
    if (lo - anchors[i] < margin && i > 0) { i--; continue; }
    if (anchors[i] + V - hi < margin && i < anchors.length - 1) { i++; continue; }
    break;
  }
  return i;
}

const nearest = (a, c, V) => a.reduce((b, q, i) => Math.abs(q + (V >> 1) - c) < Math.abs(a[b] + (V >> 1) - c) ? i : b, 0);

export function newCam() { return { ix: -1, iy: -1, fx: 0, fy: 0, at: 0 }; }

// Where the slide is at nowMs: from (fx, fy) to the anchors, integer ease-out cubic over SLIDE_MS.
function slideAt(s, ax, ay, nowMs, motion) {
  const tx = ax[s.ix], ty = ay[s.iy];
  if (!motion) return { x: tx, y: ty };
  const el = Math.max(0, Math.min(SLIDE_MS, nowMs - s.at)), u = SLIDE_MS - el, den = SLIDE_MS ** 3, e = den - u * u * u;
  return { x: s.fx + Math.trunc((tx - s.fx) * e / den), y: s.fy + Math.trunc((ty - s.fy) * e / den) };
}

// state: newCam() kept by the caller (mutated); view { w, h }; place { pw, ph } px; tile { x, y } the explorer's tile in place cells;
// extra: an optional span to hold { x0, y0, x1, y1 } in place px (the heart at the reveal's spot). Returns the view's top-left { x, y } in place px.
export function stepCamera(state, view, place, tile, nowMs, motion, extra = null, margin = MARGIN, T = TILE) {
  const ax = camAnchors(place.pw - view.w, view.w), ay = camAnchors(place.ph - view.h, view.h);
  let x0 = tile.x * T, x1 = x0 + T, y0 = tile.y * T, y1 = y0 + T;
  if (extra) { x0 = Math.min(x0, extra.x0); x1 = Math.max(x1, extra.x1); y0 = Math.min(y0, extra.y0); y1 = Math.max(y1, extra.y1); }
  if (state.ix < 0 || state.ix >= ax.length || state.iy >= ay.length) {   // the first look in this place: the rest nearest the explorer, then the rule
    state.ix = camAxis(ax, nearest(ax, x0 + (T >> 1), view.w), x0, x1, view.w, margin);
    state.iy = camAxis(ay, nearest(ay, y0 + (T >> 1), view.h), y0, y1, view.h, margin);
    state.fx = ax[state.ix]; state.fy = ay[state.iy]; state.at = nowMs - SLIDE_MS;
  } else {
    const nx = camAxis(ax, state.ix, x0, x1, view.w, margin), ny = camAxis(ay, state.iy, y0, y1, view.h, margin);
    if (nx !== state.ix || ny !== state.iy) {
      const cur = slideAt(state, ax, ay, nowMs, motion);
      state.fx = cur.x; state.fy = cur.y; state.ix = nx; state.iy = ny; state.at = nowMs;
    }
  }
  return slideAt(state, ax, ay, nowMs, motion);
}

// The clamp of a centred camera (kept for callers that want the plain follow): view { w, h }, place { pw, ph }, pawn centre px.
export function cameraFor(view, place, pawn) {
  const x = pawn.x - (view.w >> 1), y = pawn.y - (view.h >> 1);
  const mx = Math.max(0, place.pw - view.w), my = Math.max(0, place.ph - view.h);
  return { x: x < 0 ? 0 : x > mx ? mx : x, y: y < 0 ? 0 : y > my ? my : y };
}
