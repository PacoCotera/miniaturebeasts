// The Dock glyph (the companion device), a UI component (ui-dock-glyph-component-3): a tall-screen Companion, 16 x 24, one key.
// The pixels are identical in all states; only the ink changes: away = mist (on the bar or panel), lit and docked = core.ink (on amber).
// Drawn as box-shadow squares at a whole-number scale (like lamp8.mjs): no image, no mask, no filter. Every pixel fully on or fully off.

export const GLYPH_W = 16, GLYPH_H = 24;                    // the box
// `#` is ink, `.` is a hole or transparent. The pixel lead's grid v3: 16 x 24, filling the box (screen 10 x 12).
export const GRID_24 = [
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
  "###..........###",
  "################",
  "################",
  "####..##########",
  "####..####....##",
  "##......##....##",
  "##......##....##",
  "####..####....##",
  "####..##########",
  ".##############.",
  "..############..",
];
// The fallback for the art director's pick: 16 x 22 (screen 10 x 10), placed at rows 1-22 of the box.
export const GRID_22 = [
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
  "################",
  "################",
  "####..##########",
  "####..####....##",
  "##......##....##",
  "##......##....##",
  "####..####....##",
  "####..##########",
  ".##############.",
  "..############..",
];
export const GRID_22_Y0 = 1;

// the one constant that picks the shipping grid: the 16 x 24 ships by default
export const SHIP = "24";                                   // "24" or "22"
export const GRID = SHIP === "22" ? GRID_22 : GRID_24;
export const GRID_Y0 = SHIP === "22" ? GRID_22_Y0 : 0;

export const TOKEN_HEX = { mist: "#8d8aa6", ink: "#1a1725", night: "#29253a" };   // the values of tokens.json (a test holds them to it)
export const STATE_TOKEN = { away: "mist", lit: "ink", docked: "ink" };

// the pixel map of a grid placed in the box: GLYPH_H rows of GLYPH_W characters, "." transparent, "o" ink; the same in every state
export function glyphMap(grid = GRID, y0 = GRID_Y0) {
  const blank = ".".repeat(GLYPH_W), rows = [];
  for (let y = 0; y < GLYPH_H; y++) {
    const g = grid[y - y0];
    rows.push(g ? g.replace(/#/g, "o") : blank);
  }
  return rows;
}

// the pixels to paint: [{ x, y, hex }]; `ink` overrides the state's token hex (the proof sheet shows night beside ink); `grid`/`y0` pick a variant
export function glyphPixels({ state = "away", ink, grid, y0 } = {}) {
  const hex = ink || TOKEN_HEX[STATE_TOKEN[state] || "mist"], out = [];
  glyphMap(grid || GRID, y0 === undefined ? (grid ? 0 : GRID_Y0) : y0).forEach((row, y) => { for (let x = 0; x < GLYPH_W; x++) if (row[x] === "o") out.push({ x, y, hex }); });
  return out;
}

// a CSS box-shadow list for the pixels at scale `px` CSS pixels per glyph pixel (a whole number)
export function glyphShadow(opts, px = 1) {
  const s = Math.max(1, Math.round(px));
  return glyphPixels(opts).map((p) => `${p.x * s}px ${p.y * s}px 0 0 ${p.hex}`).join(",");
}
