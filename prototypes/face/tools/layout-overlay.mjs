// The layout check's overlays (tools/layout-check.mjs): one finding drawn on its golden at 1x, for the owner's review. Drawn on RGBA bytes (ui/png.mjs) with the baked 12 px glyph table, no
// browser drawing surface: the golden dimmed (55 %, 5 bits a channel, so the marks read and the file stays small), the container dashed, the offending boxes stroked 2 px, the overlap filled, L6's empty
// rectangle hatched, the gap as a dimension line with its number (both opposite lines when the finding has them: a margin and its opposite, the two slacks of a centred block), L7's centroid and the
// container's centre as crosses, the boxes the balance weighed tinted, the guides of a near-miss (both lines), a box under 24 px magnified 4 times beside it, and a label plate ("L3a 12 → 16") with
// the alignment the rule assumed and what the area counted beneath it.
//   overlay(golden, finding) -> a PNG (Buffer); golden: the golden's PNG, or dimmed(png) once for every finding on it; finding: a grouped finding of layout-check.mjs (rule, part, measured, required,
//   other, container, boxes, dim?, dim2?, guides?, assumed?, counted?, centroid?, centre?, pair?, opposite?)
import { decodePNG, encodePNG } from "../../ui/png.mjs";
import FONT from "../../ui/fonts/inter/glyphs/inter-medium-12.json" with { type: "json" };

const C = { container: [0, 229, 255], component: [255, 43, 214], other: [255, 160, 0], overlap: [255, 40, 40], empty: [255, 230, 0], prop: [60, 220, 90], weighed: [90, 170, 255], dim: [255, 230, 0], centroid: [255, 40, 40], centre: [0, 229, 255], plate: [16, 16, 20], ink: [255, 255, 255] };
const SMALL = 24, ZOOM = 4;   // a box under SMALL px on its larger side is magnified ZOOM times beside it
const GLYPH = new Map();
function glyph(code) { let g = GLYPH.get(code); if (!g) { const e = FONT.glyphs[code] ?? FONT.glyphs[63]; g = { adv: e[0], x: e[1], y: e[2], w: e[3], h: e[4], bits: Buffer.from(e[5], "base64") }; GLYPH.set(code, g); } return g; }
const steps = (s) => { const cps = [...s].map((c) => c.codePointAt(0)); return cps.map((c, i) => (glyph(c).adv + (i + 1 < cps.length ? FONT.kern[c]?.[cps[i + 1]] ?? 0 : 0) + 8) >> 4); };
export const textWidth = (s) => steps(s).reduce((a, b) => a + b, 0);

// the golden dimmed to 55 %, 5 bits a channel: { width, height, data }
export function dimmed(png) { const g = decodePNG(png), data = new Uint8ClampedArray(g.data); for (let i = 0; i < data.length; i += 4) for (let k = 0; k < 3; k++) data[i + k] = Math.round(data[i + k] * 0.55) & 0xf8; return { width: g.width, height: g.height, data }; }
export function overlay(golden, f) {
  const g = Buffer.isBuffer(golden) ? dimmed(golden) : golden, W = g.width, H = g.height, px = new Uint8ClampedArray(g.data);
  const put = (x, y, c, a = 1) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const o = (y * W + x) * 4; for (let k = 0; k < 3; k++) px[o + k] = Math.round(px[o + k] + (c[k] - px[o + k]) * a); px[o + 3] = 255; };
  const hline = (x0, x1, y, c, dash = 0) => { for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) if (!dash || (x - x0) % (2 * dash) < dash) put(x, y, c); };
  const vline = (x, y0, y1, c, dash = 0) => { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) if (!dash || (y - y0) % (2 * dash) < dash) put(x, y, c); };
  const stroke = (r, c, w = 2, dash = 0) => { const [x, y, rw, rh] = r; for (let k = 0; k < w; k++) { hline(x - k, x + rw - 1 + k, y - k, c, dash); hline(x - k, x + rw - 1 + k, y + rh - 1 + k, c, dash); vline(x - k, y - k, y + rh - 1 + k, c, dash); vline(x + rw - 1 + k, y - k, y + rh - 1 + k, c, dash); } };
  const fill = (r, c, a) => { for (let y = r[1]; y < r[1] + r[3]; y++) for (let x = r[0]; x < r[0] + r[2]; x++) put(x, y, c, a); };
  const hatch = (r, c) => { for (let y = r[1]; y < r[1] + r[3]; y++) for (let x = r[0]; x < r[0] + r[2]; x++) if ((x + y) % 8 === 0) put(x, y, c); stroke(r, c, 1); };
  const cross = (x, y, c) => { x = Math.round(x); y = Math.round(y); for (let k = -6; k <= 6; k++) { put(x + k, y, c); put(x, y + k, c); put(x + k, y + 1, c); put(x + 1, y + k, c); } };
  const print = (s, x, base, c) => { const cps = [...s].map((ch) => ch.codePointAt(0)), st = steps(s); let pen = x;
    cps.forEach((code, i) => { const q = glyph(code), top = base - (q.y + q.h), left = pen + q.x; for (let j = 0; j < q.h; j++) for (let k = 0; k < q.w; k++) { const a = q.bits[j * q.w + k]; if (a) put(left + k, top + j, c, a / 255); } pen += st[i]; }); };
  const plate = (s, x, y, edge) => { const w = textWidth(s) + 12, h = 18; x = Math.max(0, Math.min(W - w, Math.round(x))); y = Math.max(0, Math.min(H - h, Math.round(y))); fill([x, y, w, h], C.plate, 0.92); stroke([x, y, w, h], edge, 1); print(s, x + 6, y + 13, C.ink); return [x, y, w, h]; };
  // the container, the boxes (the boxes a balance weighed tinted), the empty rectangle, the overlap
  if (f.container?.rect) stroke(f.container.rect, C.container, 1, 4);
  for (const b of f.boxes ?? []) { if (b.role === "empty") hatch(b.rect, C.empty); else if (b.role === "overlap") fill(b.rect, C.overlap, 0.6); else if (b.role === "weighed") { fill(b.rect, C.weighed, 0.28); stroke(b.rect, C.weighed, 1); } else stroke(b.rect, C[b.role] ?? C.other, 2); }
  // the guides of a near-miss: both lines, across the container
  const cr = f.container?.rect ?? [0, 0, W, H];
  for (const q of f.guides ?? []) { if (q.x != null) vline(Math.round(q.x), cr[1], cr[1] + cr[3] - 1, C.dim, 3); if (q.y != null) hline(cr[0], cr[0] + cr[2] - 1, Math.round(q.y), C.dim, 3); }
  // the gap: a dimension line with end ticks and its number; the opposite line (a margin's other side, the second slack) beside it
  const dimension = ([x0, y0, x1, y1], n) => {
    if (y0 === y1) { hline(x0, x1, y0, C.dim); vline(x0, y0 - 4, y0 + 4, C.dim); vline(x1, y0 - 4, y0 + 4, C.dim); if (n) plate(n, (x0 + x1) / 2 - textWidth(n) / 2 - 6, y0 + 6, C.dim); }
    else { vline(x0, y0, y1, C.dim); hline(x0 - 4, x0 + 4, y0, C.dim); hline(x0 - 4, x0 + 4, y1, C.dim); if (n) plate(n, x0 + 6, (y0 + y1) / 2 - 9, C.dim); } };
  if (f.dim) dimension(f.dim, f.pair ? String(f.pair[0]) : typeof f.measured === "number" ? String(f.measured) : "");
  if (f.dim2) dimension(f.dim2, f.pair ? String(f.pair[1]) : typeof f.opposite === "number" ? String(f.opposite) : "");
  if (f.centroid) cross(f.centroid[0], f.centroid[1], C.centroid);
  if (f.centre) cross(f.centre[0], f.centre[1], C.centre);
  // a box under SMALL px, magnified ZOOM times beside it (the dimmed golden around it, its outline on top)
  for (const b of (f.boxes ?? []).filter((q) => ["component", "other", "prop"].includes(q.role) && Math.max(q.rect[2], q.rect[3]) < SMALL).slice(0, 2)) {
    const [bx0, by0, bw, bh] = b.rect, pad = 4, sx = Math.max(0, bx0 - pad), sy = Math.max(0, by0 - pad), sw = Math.min(W, bx0 + bw + pad) - sx, sh = Math.min(H, by0 + bh + pad) - sy, iw = sw * ZOOM, ih = sh * ZOOM;
    let ix = bx0 + bw + 10; if (ix + iw > W) ix = Math.max(0, bx0 - 10 - iw); const iy = Math.max(0, Math.min(H - ih, by0 + Math.round(bh / 2) - Math.round(ih / 2)));
    for (let y = 0; y < ih; y++) for (let x = 0; x < iw; x++) { const o = ((sy + (y / ZOOM | 0)) * W + sx + (x / ZOOM | 0)) * 4; put(ix + x, iy + y, [g.data[o], g.data[o + 1], g.data[o + 2]]); }
    stroke([ix, iy, iw, ih], C.ink, 1); stroke([ix + (bx0 - sx) * ZOOM, iy + (by0 - sy) * ZOOM, bw * ZOOM, bh * ZOOM], C[b.role] ?? C.other, 1);
    plate(`x${ZOOM}`, ix, iy + ih + 2, C.ink); }
  // the label plate, above the first box (or the container's top left), the assumed alignment and what the area counted beneath it
  const anchor = f.boxes?.[0]?.rect ?? f.container?.rect ?? [8, 48, 0, 0], at = anchor[1] - 22 < 0 ? anchor[1] + (anchor[3] ?? 0) + 4 : anchor[1] - 22;
  const first = plate(label(f), anchor[0], at, C.component), notes = [f.assumed, f.counted ? `${f.rule === "L7" ? "Weighed" : "Counted"}: ${f.counted}` : null].filter(Boolean);
  let below = first[1] + first[3] + 2; for (const n of notes) { const r = plate(n, first[0], below, C.container); below = r[1] + r[3] + 2; }
  return encodePNG(W, H, px, 6);
}
// the plate's words: the rule and its part, the side or what, measured → required (a slack pair as a / b)
export function label(f) {
  const id = f.rule + (f.part ?? ""), m = typeof f.measured === "number" ? f.measured : JSON.stringify(f.measured);
  if (f.pair) return `${id} ${f.pair[0]} / ${f.pair[1]}`;
  if (f.rule === "L1" || f.rule === "L2") return `${id} ${String(f.other).split(" ")[0]} ${m} → ${f.required}`;
  return `${id} ${m} → ${f.required}`;
}
