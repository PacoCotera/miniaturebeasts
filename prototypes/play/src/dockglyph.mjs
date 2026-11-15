// The Dock glyph (the companion device), a UI component: a 16 × 24 pixel map in one token ink per state (ui-dock-glyph-component-1).
// Geometry only: rectangles, corner cuts and dots. No shading, gradient, highlight, bevel or material; no anti-aliasing; every pixel is fully on or fully off.
// One source for both looks, so they share their outer box pixel for pixel:
//   away            the outline of the body (1 px), the screen as a 1-px line rectangle, two 2 × 2 ink dots for the buttons; ink = fog
//   docked or lit   the body solid ink with the screen window and the two button dots cut out as holes; ink = core.ink
// Drawn as box-shadow squares at a whole-number scale (like lamp8.mjs): no image, no mask, no filter.

export const GLYPH_W = 16, GLYPH_H = 24;                    // the grid
export const BOX = { x0: 1, y0: 0, x1: 13, y1: 23 };        // the outer box (13 × 24), the solid mark's at alpha >= 128
export const GLYPH_CUT = 2;                                 // body corners: 2 = a two-pixel stair (drop the corner pixel and the one beside it on each side); 1 = the corner pixel only
export const SCREEN = { x0: 4, y0: 4, x1: 10, y1: 15 };     // the screen rectangle (7 × 12; a gap of 2 or more to the body line, the stair cuts and the buttons): the away line and the docked window are this same rectangle
export const BUTTONS = [{ x0: 4, y0: 18, x1: 5, y1: 19 }, { x0: 9, y0: 18, x1: 10, y1: 19 }];   // two 2 × 2 dots, 3 px apart, centred in the 13-px box
export const TOKEN_HEX = { fog: "#c6c4d8", ink: "#1a1725", night: "#29253a" };   // the values of tokens.json (a test holds them to it)
export const STATE_TOKEN = { away: "fog", lit: "ink", docked: "ink" };

const inBox = (x, y, r) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
// is (x, y) a cut corner pixel of the body? A cut of n removes the pixels of each corner whose distance from the corner, dx + dy, is below n.
const cutCorner = (x, y, n) => { const dx = Math.min(x - BOX.x0, BOX.x1 - x), dy = Math.min(y - BOX.y0, BOX.y1 - y); return dx + dy < n; };
const body = (x, y, n) => inBox(x, y, BOX) && !cutCorner(x, y, n);
const onScreenLine = (x, y) => inBox(x, y, SCREEN) && (x === SCREEN.x0 || x === SCREEN.x1 || y === SCREEN.y0 || y === SCREEN.y1);
const onButton = (x, y) => BUTTONS.some((b) => inBox(x, y, b));

// the pixel map: GLYPH_H rows of GLYPH_W characters, "." transparent, "o" ink; state "away", "lit" or "docked"
export function glyphMap({ state = "away", cutPx = GLYPH_CUT } = {}) {
  const away = state === "away", rows = [];
  const rim = (x, y) => !(body(x - 1, y, cutPx) && body(x + 1, y, cutPx) && body(x, y - 1, cutPx) && body(x, y + 1, cutPx));   // a body pixel with an empty side is on the line
  for (let y = 0; y < GLYPH_H; y++) {
    let r = "";
    for (let x = 0; x < GLYPH_W; x++) {
      let on;
      if (away) on = (body(x, y, cutPx) && rim(x, y)) || onScreenLine(x, y) || onButton(x, y);
      else on = body(x, y, cutPx) && !inBox(x, y, SCREEN) && !onButton(x, y);
      r += on ? "o" : ".";
    }
    rows.push(r);
  }
  return rows;
}

// the pixels to paint: [{ x, y, hex }]; `ink` overrides the state's token hex (the proof sheet shows night beside ink)
export function glyphPixels({ state = "away", cutPx = GLYPH_CUT, ink } = {}) {
  const hex = ink || TOKEN_HEX[STATE_TOKEN[state] || "fog"], out = [];
  glyphMap({ state, cutPx }).forEach((row, y) => { for (let x = 0; x < GLYPH_W; x++) if (row[x] === "o") out.push({ x, y, hex }); });
  return out;
}

// a CSS box-shadow list for the pixels at scale `px` CSS pixels per glyph pixel (a whole number)
export function glyphShadow(opts, px = 1) {
  const s = Math.max(1, Math.round(px));
  return glyphPixels(opts).map((p) => `${p.x * s}px ${p.y * s}px 0 0 ${p.hex}`).join(",");
}
