// Small pieces the screens are composed from (UI): a dashed outline, the Case's wood, brass and hollows, contact shadows. Each draws only from its arguments.
// The pixel core is still the page's: it hands in what these draw with once as `env` (R, panel, ditherFill and the palette C).
import { BAYER4 as BAYER } from "../render/view.mjs";

export function makePieces(env) {
  const { R, panel, ditherFill, C } = env;
  // A free place: a 1 px dashed outline, dash 2 and 2.
  function dashedRect(x, y, w, h, c) {
    for (let i = 0; i < w; i += 4) { R(x + i, y, Math.min(2, w - i), 1, c); R(x + i, y + h - 1, Math.min(2, w - i), 1, c); }
    for (let j = 0; j < h; j += 4) { R(x, y + j, 1, Math.min(2, h - j), c); R(x + w - 1, y + j, 1, Math.min(2, h - j), c); }
  }
  const caseBrass = (x, y, w, h) => { R(x, y, w, h, C.gold); R(x, y, w, 1, C.yellow); R(x, y, 1, h, C.yellow); R(x, y + h - 1, w, 1, C.rust); R(x + w - 1, y, 1, h, C.rust); };
  // One half of the case: its shadow on the page, a wooden rim lit from the top left, the lining.
  function caseHalf(x, y, w, h) {
    ditherFill(x + 4, y + h, w - 2, 4, 'clay', 8); ditherFill(x + w, y + 4, 4, h, 'clay', 8);
    panel(x, y, w, h, C.soil); panel(x + 2, y + 2, w - 4, h - 4, C.bark);
    R(x + 4, y + 2, w - 8, 1, C.clay); R(x + 2, y + 4, 1, h - 8, C.clay);
    R(x + 8, y + 8, w - 16, h - 16, C.soil); R(x + 10, y + 10, w - 18, h - 18, C.sand); ditherFill(x + 10, y + 10, w - 18, h - 18, 'paper', 3);
  }
  function caseHollow(x, y, w, h) { panel(x, y, w, h, C.clay); panel(x + 2, y + 2, w - 2, h - 2, C.bone); panel(x + 2, y + 2, w - 4, h - 4, C.paper); }
  function caseCradle(cx, cy, r) {
    for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) { const d = Math.hypot(xx + .5, yy + .5); if (d <= r) R(cx + xx, cy + yy, 1, 1, d > r - 3 ? (xx + yy < 0 ? C.clay : C.bone) : C.paper); }
  }
  function caseString(ax, ay, bx, by, col) { const d = Math.hypot(bx - ax, by - ay); for (let t = 0; t < d; t += 4) R(Math.round(ax + (bx - ax) * t / d), Math.round(ay + (by - ay) * t / d), 2, 2, col); }
  // A contact shadow: an ellipse set pixel by pixel through a 4 x 4 ordered pattern.
  function shadowAt(cx, cy, w, h) {
    for (let j = 0; j < h; j++) { const ry = (j + .5) / (h / 2) - 1, half = Math.round(w / 2 * Math.sqrt(Math.max(0, 1 - ry * ry)));
      for (let i = -half; i < half; i++) { const x = cx + i, y = cy + j; if (BAYER[(y & 3) * 4 + (x & 3)] < 7) R(x, y, 1, 1, C.sand); } }
  }
  // The large cut's contact shadow: whole pixels, an ellipse of rx x ry, the middle clay on every other pixel, the rim sand on every other pixel.
  // It is as wide as the cut's feet: rx is half her foot span (render/pictures.mjs) and ry is rx / 12, the accepted mock's 96 x 8 under a span of 192.
  function mockShadow(cx, cy, rx, ry) {
    for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) { const q = (x / rx) ** 2 + (y / ry) ** 2; if (q <= 1 && (q < .6 || ((x + y) & 1) === 0)) R(cx + x, cy + y, 1, 1, q < .35 && ((x + y) & 1) === 0 ? C.clay : C.sand); }
  }
  return { dashedRect, caseBrass, caseHalf, caseHollow, caseCradle, caseString, shadowAt, mockShadow };
}
