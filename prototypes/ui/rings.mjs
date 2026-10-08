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

// A slanted rail tab's two ends and its focus ring, as alpha masks decided by pixel-centre tests (whole pixels, no anti-aliasing).
// The ends are `slant` wide and `h` tall: the left one holds the columns from the tab's own left edge to the body, the right one the
// columns from the body to the tab's right edge. `part` is "fill" (the inside) or "rim" (the 1 px hairline along the slant and,
// on the first and last row, along the top and bottom edge). shift(r) is how far the side has moved right at row r.
export function tabEndMask(side, part, slant, h, shift) {
  const m = new Uint8Array(slant * h);
  for (let r = 0; r < h; r++) for (let c = 0; c < slant; c++) {
    const s = shift(r), edge = r === 0 || r === h - 1;
    let on;
    if (side === "left") on = part === "rim" ? c === s || (edge && c >= s) : c > s && !edge;
    else on = part === "rim" ? c === s || (edge && c <= s) : c < s && !edge;
    if (on) m[r * slant + c] = 255;
  }
  return m;
}
// The tab's focus ring (box w + 2 * outside + slant wide, `H` tall, from y `top`): the two slanted lines 4 px outside the tab, the sides leaning
// with the tab down to its bottom edge (y `slantTo`, 80) and dropping straight to the bottom run (y `bottom`, 84); a top run, square against the top bar; the bottom
// corners rounded; `width` thick all round.
export function tabRingMask(w, spec) {
  const { slant, outside, top, bottom, radiusBottom, slantTo } = spec.tab, width = spec.width, tabTop = spec.tabTop ?? 40, tabH = slantTo - tabTop;
  const W = w + 2 * outside + slant, H = bottom - top, m = new Uint8Array(W * H), lean = (y) => (slant * Math.min(Math.max(y - tabTop, 0), tabH)) / tabH;
  const left = (y) => lean(y), right = (y) => W - slant + lean(y), r = radiusBottom;
  const inside = (px, y, inset, rr) => {
    if (y < top + inset || y > bottom - inset) return false;
    let l = left(y) + inset, rt = right(y) - inset;
    const yc = bottom - inset - rr;
    if (rr > 0 && y > yc) { const cl = left(yc) + inset + rr, cr = right(yc) - inset - rr; if (px < cl) return (px - cl) ** 2 + (y - yc) ** 2 <= rr * rr; if (px > cr) return (px - cr) ** 2 + (y - yc) ** 2 <= rr * rr; }
    return px >= l && px <= rt;
  };
  for (let r0 = 0; r0 < H; r0++) for (let c = 0; c < W; c++) {
    const px = c + 0.5, y = top + r0 + 0.5;
    if (inside(px, y, 0, r) && !inside(px, y, width, Math.max(0, r - width))) m[r0 * W + c] = 255;
  }
  return { mask: m, w: W, h: H };
}
