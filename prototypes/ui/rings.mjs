import { footprintHeight } from "./specs/derive.mjs";
// The focus ring's pixels (lvgl-switch.md §2.2), the oracle of the face's `ring` op (prototypes/face/src/prim/ring.c) and the generator of tests/vectors/rings.json. Integers only: a pixel (i, j)
// has the doubled centre X = 2i + 1, Y = 2j + 1, and every comparison is on integers (products stay far inside 2^53), so JavaScript, WebAssembly, x86-64 and aarch64 cannot round differently.
// A rounded rectangle or an ellipse `width` thick, returned as an alpha mask (0 or 255), w*h. Pure. Refuses (throws) what the op refuses.
const inR = (X, Y, x0, y0, x1, y1, r) => {
  const R = 2 * r; if (X < 2 * x0 || Y < 2 * y0 || X > 2 * x1 || Y > 2 * y1) return false;
  const cx = X < 2 * x0 + R ? 2 * x0 + R : X > 2 * x1 - R ? 2 * x1 - R : X, cy = Y < 2 * y0 + R ? 2 * y0 + R : Y > 2 * y1 - R ? 2 * y1 - R : Y;
  return (X - cx) ** 2 + (Y - cy) ** 2 <= R * R;
};
const inE = (X, Y, x0, y0, x1, y1) => {
  const A = x1 - x0, B = y1 - y0; if (A <= 0 || B <= 0) return false;
  const dx = X - (x0 + x1), dy = Y - (y0 + y1); return dx * dx * B * B + dy * dy * A * A <= A * A * B * B;
};
export function ringMask(w, h, width, radius, shape = "round") {
  const ints = [w, h, width, radius].every(Number.isInteger);
  if (!ints || (shape !== "round" && shape !== "ellipse") || w < 1 || h < 1 || width < 1 || radius < 0 || (shape === "ellipse" && radius !== 0)) throw new Error(`ring refused: ${shape} ${w}x${h} width ${width} radius ${radius}`);
  const m = new Uint8Array(w * h), ri = Math.max(0, radius - width);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const X = 2 * x + 1, Y = 2 * y + 1;
    const on = shape === "ellipse" ? inE(X, Y, 0, 0, w, h) && !inE(X, Y, width, width, w - width, h - width) : inR(X, Y, 0, 0, w, h, radius) && !inR(X, Y, width, width, w - width, h - width, ri);
    if (on) m[y * w + x] = 255;
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
// corners rounded; `width` thick all round. `spec.tabTop` is the rail's top edge. Integers only (the `tabRing` op's definition, §2.2).
export function tabRingMask(w, spec) {
  const { slant, outside, top, bottom, radiusBottom, slantTo } = spec.tab, width = spec.width, tabTop = spec.tabTop, T = slantTo - tabTop;
  const vals = [w, slant, outside, top, bottom, radiusBottom, slantTo, width, tabTop];
  if (!vals.every(Number.isInteger) || w < 1 || slant < 0 || outside < 0 || T <= 0 || bottom < slantTo || top >= bottom || width < 1 || radiusBottom < 0) throw new Error("tabRing refused");
  const W = w + 2 * outside + slant, H = bottom - top, m = new Uint8Array(W * H), clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi), r = radiusBottom;
  const inside = (X, Y, inset, rr) => {
    if (Y < 2 * (top + inset) || Y > 2 * (bottom - inset)) return false;
    const XS = X * T, C = clamp(Y - 2 * tabTop, 0, 2 * T), L = slant * C + 2 * T * inset, Rt = 2 * T * (W - slant) + slant * C - 2 * T * inset, yc = bottom - inset - rr;
    if (rr > 0 && Y > 2 * yc) {
      const c2 = 2 * slant * clamp(yc - tabTop, 0, T), CL = c2 + 2 * T * (inset + rr), CR = 2 * T * (W - slant) + c2 - 2 * T * (inset + rr), D = T * (Y - 2 * yc), lim = (2 * T * rr) ** 2;
      if (XS < CL) return (XS - CL) ** 2 + D * D <= lim;
      if (XS > CR) return (XS - CR) ** 2 + D * D <= lim;
    }
    return L <= XS && XS <= Rt;
  };
  for (let r0 = 0; r0 < H; r0++) for (let c = 0; c < W; c++) {
    const X = 2 * c + 1, Y = 2 * (top + r0) + 1;
    if (inside(X, Y, 0, r) && !inside(X, Y, width, Math.max(0, r - width))) m[r0 * W + c] = 255;
  }
  return { mask: m, w: W, h: H };
}

// The footprint ring's box: (w + 10) x (fh + 10) at (bx + x - 5, by + feetY - (fh + 10) / 2), b the drawn (unlifted) box; a mirrored cell's x is cellW - x - w. Every coordinate is an integer.
export function footprintRing(foot, drawn, mirrored = false, cellW = drawn[2], tokens = {}) {
  const [fx, feetY, w] = foot, x = mirrored ? cellW - fx - w : fx, fh = footprintHeight(w, tokens);
  return [drawn[0] + x - 5, drawn[1] + feetY - (fh + 10) / 2, w + 10, fh + 10];
}

// ---- fix 14: the focus ring as the face composes it (lvgl-switch.md §2.2): three bands (key, core, key) outside the object, each band's outer shape the previous band's inner shape ----
// `T` is frame.json focus.ring. `drawn` is the object's rect as the screen drew it (lifted where it lifts); `o`: { ground: "default" | "paper", foot: [x, feetY, w] and mirrored for a footprint, light: the footprint's light weight, tabTop }.
// Returns { x, y, w, h, kind, ops, nine? }: the ring's box and its bands as ops { band: "key" | "core", shape: "round" | "ellipse" | "tab", x, y, w, h, width, radius, ... } in the ring's own pixels. Pure, integers only.
export function focusRingOps(shape, drawn, T, o = {}) {
  const b = T.bands.map((k) => k.w), reach = T.reach, ground = o.ground ?? "default", hasKey = T.colours[ground].key != null, ins = [0, b[0], b[0] + b[1]], band = (k) => (k === 1 ? "core" : "key");
  const ellipse = (x, y, w, h, insets = ins, widths = b) => ({ x, y, w, h, kind: "composed", ops: [0, 1, 2].filter((k) => k === 1 || hasKey).map((k) => ({ band: band(k), shape: "ellipse", x: insets[k], y: insets[k], w: w - 2 * insets[k], h: h - 2 * insets[k], width: widths[k], radius: 0 })) });
  if (shape === "oval") return ellipse(drawn[0] - reach, drawn[1] - reach, drawn[2] + 2 * reach, drawn[3] + 2 * reach);
  if (shape === "footprint") {
    const [fx, feetY, w] = o.foot, x = o.mirrored ? drawn[2] - fx - w : fx, fh = footprintHeight(w, T.shapes.footprint), W = w + 10, H = fh + 10;
    return o.light ? ellipse(drawn[0] + x - 5, drawn[1] + feetY - H / 2, W, H, T.shapes.footprint.light.insets, T.shapes.footprint.light.widths) : ellipse(drawn[0] + x - 5, drawn[1] + feetY - H / 2, W, H);
  }
  if (shape === "tab") {
    const t = T.shapes.tab, tabTop = o.tabTop ?? 40, body = drawn[2], W = body + 2 * t.outside[0] + t.slant, H = t.bottom[0] - t.top[0];
    return { x: drawn[0] - t.outside[0], y: t.top[0], w: W, h: H, kind: "composed", ops: [0, 1, 2].filter((k) => k === 1 || hasKey).map((k) => ({ band: band(k), shape: "tab", x: t.outside[0] - t.outside[k], y: t.top[k] - t.top[0], body, width: b[k], slant: t.slant, outside: t.outside[k], top: t.top[k], slantTo: t.slantTo, bottom: t.bottom[k], radius: t.radius[k], tabTop })) };
  }
  if (shape.circle !== undefined) {
    const c = shape.circle, rho = c === "box" ? (drawn[2] >> 1) + reach : c.r + reach, ox = c === "box" ? drawn[0] + (drawn[2] >> 1) : drawn[0] + c.centre[0], oy = c === "box" ? drawn[1] + (drawn[3] >> 1) : drawn[1] + c.centre[1];
    return ellipse(ox - rho, oy - rho, 2 * rho, 2 * rho);
  }
  const r = shape.rect, chip = shape.chip ?? 0, R = r + reach, S = 2 * R + 4, x = drawn[0] - chip - reach, y = drawn[1] - reach, w = drawn[2] + 2 * chip + 2 * reach, h = drawn[3] + 2 * reach;
  if (w < 2 * R || h < 2 * R) throw new Error(`focus ring refused: a ring box ${w}x${h} under 2R (${2 * R}) on an axis`);
  return { x, y, w, h, kind: "nine", R, S, ops: [0, 1, 2].filter((k) => k === 1 || hasKey).map((k) => ({ band: band(k), shape: "round", x: ins[k], y: ins[k], w: S - 2 * ins[k], h: S - 2 * ins[k], width: b[k], radius: R - ins[k] })) };
}
// A ring's pixels: an array w*h of 0 (none), 1 (key) or 2 (core), the bands drawn in order. A nine-slice is its S x S source expanded (corners 1:1, the middle tiled).
export function ringRaster(ring) {
  const paint = (px, W, H, op) => {
    let m, ox = op.x, oy = op.y, mw = op.w, mh = op.h;
    if (op.shape === "tab") { const t = tabRingMask(op.body, { tab: { slant: op.slant, outside: op.outside, top: op.top, slantTo: op.slantTo, bottom: op.bottom, radiusBottom: op.radius }, width: op.width, tabTop: op.tabTop }); m = t.mask; mw = t.w; mh = t.h; }
    else m = ringMask(op.w, op.h, op.width, op.radius, op.shape);
    for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) if (m[y * mw + x] && ox + x < W && oy + y < H) px[(oy + y) * W + ox + x] = op.band === "core" ? 2 : 1;
  };
  if (ring.kind === "nine") {
    const { S, R, w, h } = ring, src = new Uint8Array(S * S); for (const op of ring.ops) paint(src, S, S, op);
    const px = new Uint8Array(w * h), mid = S - 2 * R;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const sx = x < R ? x : x >= w - R ? S - (w - x) : R + ((x - R) % mid), sy = y < R ? y : y >= h - R ? S - (h - y) : R + ((y - R) % mid); px[y * w + x] = src[sy * S + sx]; }
    return px;
  }
  const px = new Uint8Array(ring.w * ring.h); for (const op of ring.ops) paint(px, ring.w, ring.h, op); return px;
}
