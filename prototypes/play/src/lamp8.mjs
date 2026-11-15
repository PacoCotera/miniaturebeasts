// The cradle lamp, a UI component: an 8 × 8 pixel map in token colours (ui-lamp-component-1). One module, so the dock sheet and anything else that shows a lamp cannot drift apart.
// Hard edges only: the sheet draws each pixel as a box-shadow square at a whole-number scale; no image, no blur, no glow, no gradient, no filter.
// Shape: an 8 × 8 square with a corner cut of LAMP_CUT pixels (1 by default; 2 is the alternative the UI desk judged by eye on the phone).
// State is a token, never a filter: neutral grey = off (away), mint = on (docked), amber = the hand. The Station's dim warm light shows as mint, as before. Mint and amber have a one-pixel rim in a darker step of their own colour; off is a solid disc.
// The breath dims the whole lamp by opacity (the sheet does that); the swell above "seated" shows the one highlight pixel and nothing more.

export const LAMP_SIZE = 8;
export const LAMP_CUT = 2;                                  // 2 = a two-pixel step (UI desk 11-15: at 1x on the phone the one-pixel cut reads as a square); 1 = one pixel off each corner
export const HIGHLIGHT_AT = [2, 2];                         // the one highlight pixel, shown only in the swell
export const TOKEN_HEX = { bevel: "#565c63", glassQuiet: "#cdccc2", mint: "#adf6e0", aqua: "#45d8be", amber: "#ffa83f", gold: "#d89b14", cream: "#fff4a6", white: "#ffffff" };   // the values of tokens.json (a test holds them to it)
export const STATE_TOKEN = { off: "bevel", mint: "mint", warm: "mint", amber: "amber" };
// the rim: the outermost ring of the disc, one lamp pixel wide, one darker step of the lamp's own ramp; the off lamp has none (a solid disc)
export const RIM_TOKEN = { off: null, mint: "aqua", warm: "aqua", amber: "gold" };
// the highlight token depends on the lamp's colour: white on mint, cream on amber, a neutral light on off
export const HIGHLIGHT_TOKEN = { off: "glassQuiet", mint: "white", warm: "white", amber: "cream" };

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
  const body = TOKEN_HEX[STATE_TOKEN[state] || "bevel"], rim = RIM_TOKEN[state] ? TOKEN_HEX[RIM_TOKEN[state]] : body, hi = TOKEN_HEX[HIGHLIGHT_TOKEN[state] || "glassQuiet"], out = [];
  const rows = lampMap({ cutPx, highlight });
  const solid = (x, y) => x >= 0 && y >= 0 && x < LAMP_SIZE && y < LAMP_SIZE && rows[y][x] !== ".";
  const edge = (x, y) => !(solid(x - 1, y) && solid(x + 1, y) && solid(x, y - 1) && solid(x, y + 1));   // a pixel with an empty side is on the rim
  rows.forEach((row, y) => { for (let x = 0; x < LAMP_SIZE; x++) { const c = row[x]; if (c !== ".") out.push({ x, y, hex: c === "h" ? hi : edge(x, y) ? rim : body }); } });
  return out;
}

// a CSS box-shadow list for the pixels at scale `px` CSS pixels per lamp pixel (a whole number)
export function lampShadow(opts, px = 2) {
  const s = Math.max(1, Math.round(px));
  return lampPixels(opts).map((p) => `${p.x * s}px ${p.y * s}px 0 0 ${p.hex}`).join(",");
}
