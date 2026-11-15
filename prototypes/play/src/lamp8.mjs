// The cradle lamp, a UI component: an 8 × 8 pixel map in token colours (ui-lamp-component-1). One module, so the dock sheet and anything else that shows a lamp cannot drift apart.
// Hard edges only: the sheet draws each pixel as a box-shadow square at a whole-number scale; no image, no blur, no glow, no gradient, no filter.
// Shape: an 8 × 8 square with a corner cut of LAMP_CUT pixels (1 by default; 2 is the alternative the UI desk judged by eye on the phone).
// State is a token, never a filter: stone = off (away), mint = on (docked), amber = the hand. The Station's dim warm light shows as mint, as before.
// The breath dims the whole lamp by opacity (the sheet does that); the swell above "seated" shows the one highlight pixel (fog) and nothing more.

export const LAMP_SIZE = 8;
export const LAMP_CUT = 2;                                  // 2 = a two-pixel step (UI desk 11-15: at 1x on the phone the one-pixel cut reads as a square); 1 = one pixel off each corner
export const HIGHLIGHT_AT = [1, 1];                         // the one highlight pixel, shown only in the swell
export const TOKEN_HEX = { stone: "#5d5974", mint: "#adf6e0", amber: "#ffa83f", fog: "#c6c4d8", white: "#ffffff" };   // the values of tokens.json (a test holds them to it)
export const STATE_TOKEN = { off: "stone", mint: "mint", warm: "mint", amber: "amber" };
// the highlight token depends on the lamp's colour: white on mint (fog vanishes on mint), fog on stone and amber
export const HIGHLIGHT_TOKEN = { off: "fog", mint: "white", warm: "white", amber: "fog" };

// is (x, y) a cut corner pixel? A cut of n removes the pixels of each corner whose distance from the corner, x + y, is below n.
const cut = (x, y, n) => { const dx = Math.min(x, LAMP_SIZE - 1 - x), dy = Math.min(y, LAMP_SIZE - 1 - y); return dx + dy < n; };

// the pixel map: 8 rows of 8 characters, "." transparent, "o" the body, "h" the highlight
export function lampMap({ cutPx = LAMP_CUT, highlight = false } = {}) {
  const rows = [];
  for (let y = 0; y < LAMP_SIZE; y++) { let r = ""; for (let x = 0; x < LAMP_SIZE; x++) r += cut(x, y, cutPx) ? "." : highlight && x === HIGHLIGHT_AT[0] && y === HIGHLIGHT_AT[1] ? "h" : "o"; rows.push(r); }
  return rows;
}

// the pixels to paint: [{ x, y, hex }] for a state ("off", "mint", "warm", "amber") with or without the highlight
export function lampPixels({ state = "off", cutPx = LAMP_CUT, highlight = false } = {}) {
  const body = TOKEN_HEX[STATE_TOKEN[state] || "stone"], hi = TOKEN_HEX[HIGHLIGHT_TOKEN[state] || "fog"], out = [];
  lampMap({ cutPx, highlight }).forEach((row, y) => { for (let x = 0; x < LAMP_SIZE; x++) { const c = row[x]; if (c !== ".") out.push({ x, y, hex: c === "h" ? hi : body }); } });
  return out;
}

// a CSS box-shadow list for the pixels at scale `px` CSS pixels per lamp pixel (a whole number)
export function lampShadow(opts, px = 2) {
  const s = Math.max(1, Math.round(px));
  return lampPixels(opts).map((p) => `${p.x * s}px ${p.y * s}px 0 0 ${p.hex}`).join(",");
}
