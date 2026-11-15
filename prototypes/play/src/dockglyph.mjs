// The Dock glyph (the companion device), a UI component (ui-dock-glyph-component-2): the pixel lead's grid, one solid silhouette in every state.
// The pixels are identical in all states; only the ink changes: away = fog (on the bar or panel), lit and docked = core.ink (on amber).
// Drawn as box-shadow squares at a whole-number scale (like lamp8.mjs): no image, no mask, no filter. Every pixel fully on or fully off.

export const GLYPH_W = 16, GLYPH_H = 24;                    // the box
export const GRID_Y0 = 3;                                   // the grid's first row sits at y = 3 in the box (rows 3-20)
// `#` is ink, `.` is a hole or transparent: 16 wide, 18 tall (the pixel lead's grid v2)
export const GRID = [
  "..############..",
  ".##############.",
  "###..........###",
  "###..........###",
  "###..........###",
  "###..........###",
  "###..........###",
  "###..........###",
  "################",
  "################",
  "####..##########",
  "####..#####..###",
  "##......##....##",
  "##......##....##",
  "####..#####..###",
  "####..##########",
  ".##############.",
  "..############..",
];
export const TOKEN_HEX = { fog: "#c6c4d8", ink: "#1a1725", night: "#29253a" };   // the values of tokens.json (a test holds them to it)
export const STATE_TOKEN = { away: "fog", lit: "ink", docked: "ink" };

// the pixel map: GLYPH_H rows of GLYPH_W characters, "." transparent, "o" ink; the same in every state
export function glyphMap() {
  const blank = ".".repeat(GLYPH_W), rows = [];
  for (let y = 0; y < GLYPH_H; y++) {
    const g = GRID[y - GRID_Y0];
    rows.push(g ? g.replace(/#/g, "o") : blank);
  }
  return rows;
}

// the pixels to paint: [{ x, y, hex }]; `ink` overrides the state's token hex (the proof sheet shows night beside ink)
export function glyphPixels({ state = "away", ink } = {}) {
  const hex = ink || TOKEN_HEX[STATE_TOKEN[state] || "fog"], out = [];
  glyphMap().forEach((row, y) => { for (let x = 0; x < GLYPH_W; x++) if (row[x] === "o") out.push({ x, y, hex }); });
  return out;
}

// a CSS box-shadow list for the pixels at scale `px` CSS pixels per glyph pixel (a whole number)
export function glyphShadow(opts, px = 1) {
  const s = Math.max(1, Math.round(px));
  return glyphPixels(opts).map((p) => `${p.x * s}px ${p.y * s}px 0 0 ${p.hex}`).join(",");
}
