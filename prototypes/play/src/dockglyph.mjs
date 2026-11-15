// The Dock glyph (the companion device), a UI component (ui-dock-glyph-component-4): a tall-screen Companion, 16 x 24, one key.
// The pixels are identical in all states; only the ink changes: away = mist (on the bar or panel), lit and docked = core.ink (on amber).
// Drawn as box-shadow squares at a whole-number scale (like lamp8.mjs): no image, no mask, no filter. Every pixel fully on or fully off.

export const GLYPH_W = 16, GLYPH_H = 24;                    // the box
// `#` is ink, `.` is a hole or transparent. The pixel lead's grid A (11-15): 16 x 24, filling the box (screen 10 x 11, a 3-px chin).
export const GRID = [
  "..############..",
  ".##############.",
  "###..........###",
  "###..........###",
  "###..........###",
  "###..........###",
  "###..........###",
  "###..........###",
  "###..........###",
  "###..........###",
  "###..........###",
  "###..........###",
  "###..........###",
  "################",
  "################",
  "####..##########",
  "####..####....##",
  "##......##....##",
  "##......##....##",
  "####..####....##",
  "####..##########",
  "################",
  ".##############.",
  "..############..",
];

export const TOKEN_HEX = { mist: "#8d8aa6", ink: "#1a1725", night: "#29253a" };   // the values of tokens.json (a test holds them to it)
export const STATE_TOKEN = { away: "mist", lit: "ink", docked: "ink" };

// the pixel map of the grid: GLYPH_H rows of GLYPH_W characters, "." transparent, "o" ink; the same in every state
export function glyphMap(grid = GRID) {
  return grid.map((g) => g.replace(/#/g, "o"));
}

// the pixels to paint: [{ x, y, hex }]; `ink` overrides the state's token hex (the proof sheet shows night beside ink)
export function glyphPixels({ state = "away", ink, grid } = {}) {
  const hex = ink || TOKEN_HEX[STATE_TOKEN[state] || "mist"], out = [];
  glyphMap(grid || GRID).forEach((row, y) => { for (let x = 0; x < GLYPH_W; x++) if (row[x] === "o") out.push({ x, y, hex }); });
  return out;
}

// a CSS box-shadow list for the pixels at scale `px` CSS pixels per glyph pixel (a whole number)
export function glyphShadow(opts, px = 1) {
  const s = Math.max(1, Math.round(px));
  return glyphPixels(opts).map((p) => `${p.x * s}px ${p.y * s}px 0 0 ${p.hex}`).join(",");
}
