// The focus ring's pixels, decided by pixel-centre tests so they stay on whole pixels (no anti-aliased stroke):
// a rounded rectangle or an ellipse, `width` thick. Returns an alpha mask (0 or 255), w*h. Pure; the assets that
// carry the ring (a nine-slice for the rounded one, a sprite for the ellipse) build their picture from it.
export function ringMask(w, h, width, radius, shape = "round") {
  const m = new Uint8Array(w * h);
  const inRound = (px, py, x0, y0, x1, y1, r) => { if (px < x0 || py < y0 || px > x1 || py > y1) return false; const cx = px < x0 + r ? x0 + r : px > x1 - r ? x1 - r : px, cy = py < y0 + r ? y0 + r : py > y1 - r ? y1 - r : py; return (px - cx) ** 2 + (py - cy) ** 2 <= r * r; };
  const inEll = (px, py, x0, y0, x1, y1) => { const rx = (x1 - x0) / 2, ry = (y1 - y0) / 2; if (rx <= 0 || ry <= 0) return false; return ((px - (x0 + rx)) / rx) ** 2 + ((py - (y0 + ry)) / ry) ** 2 <= 1; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const px = x + 0.5, py = y + 0.5;
    const outer = shape === "ellipse" ? inEll(px, py, 0, 0, w, h) : inRound(px, py, 0, 0, w, h, radius);
    const inner = shape === "ellipse" ? inEll(px, py, width, width, w - width, h - width) : inRound(px, py, width, width, w - width, h - width, Math.max(0, radius - width));
    if (outer && !inner) m[y * w + x] = 255;
  }
  return m;
}
