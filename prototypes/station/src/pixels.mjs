// The pixel core, with no canvas and no renderer: the palette, the Bayer dither, the indexed pixel buffer (PB) and its helpers, the frame's constants. Kept when the JavaScript drawing layer was deleted
// (lvgl-switch.md §5.1); the face draws now. Nothing here touches a document, a canvas or the renderer.
import stationPalette from "../../ui/palettes/station.json" with { type: "json" };
export const SW = 1024, SH = 600, TOP_H = 40, LINE_H = 38, STAGE_Y = TOP_H, STAGE_H = SH - TOP_H - LINE_H;   // stage 1024×522

// The Station's palette as data (prototypes/ui/palettes/station.json): the 69 colours the page has drawn with,
// kept as they were until the UI designer and the art director settle the Station palette. The renderer and the
// palette check read the same file.
export const PALETTE = stationPalette.colours;
const DARK_OF = stationPalette.darker, LIGHT_OF = stationPalette.lighter;
export const C = {}; PALETTE.forEach(([n], i) => { C[n] = i; });
export const HEX = PALETTE.map((p) => p[1]);
export const RGB = HEX.map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
const DARK = PALETTE.map(([n]) => C[DARK_OF[n]]);
const LIGHT = PALETTE.map(([n]) => C[LIGHT_OF[n]]);
export const shade = (c, n) => { for (let i = 0; i < (n || 1); i++) c = DARK[c]; return c; };
export const lite = (c, n) => { for (let i = 0; i < (n || 1); i++) c = LIGHT[c]; return c; };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const bay = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];
// The nearest palette colour to an RGB triple (cached), for rendered images on their way into a buffer.
const NEAR = new Map();
export function nearest(r, g, b) {
  const k = (r << 16) | (g << 8) | b; let v = NEAR.get(k); if (v != null) return v;
  let best = 0, bd = Infinity;
  for (let i = 0; i < RGB.length; i++) { const p = RGB[i], d = (p[0] - r) ** 2 + (p[1] - g) ** 2 + (p[2] - b) ** 2 * 0.8; if (d < bd) { bd = d; best = i; } }
  NEAR.set(k, best); return best;
}
export const nearestHex = (h) => nearest(parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16));

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const clock = { now: 0 };
const RM = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
export const motion = () => !RM.matches;

// Indexed pixel buffer: -1 is transparent.
export class PB {
  constructor(w, h) { this.w = w; this.h = h; this.p = new Int16Array(w * h).fill(-1);  }
  set(x, y, c) { x = Math.floor(x); y = Math.floor(y); if (c >= 0 && x >= 0 && y >= 0 && x < this.w && y < this.h) this.p[y * this.w + x] = c; }
  // The buffer as RGBA bytes (w*h*4, straight alpha: a transparent cell is 0,0,0,0), from the palette: the picture the face takes, with no canvas.
  rgba() { const out = new Uint8ClampedArray(this.w * this.h * 4); for (let i = 0; i < this.p.length; i++) { const c = this.p[i]; if (c < 0) continue; const r = RGB[c]; out[i * 4] = r[0]; out[i * 4 + 1] = r[1]; out[i * 4 + 2] = r[2]; out[i * 4 + 3] = 255; } return out; }
  get(x, y) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? -1 : this.p[y * this.w + x]; }
  rect(x, y, w, h, c) { x = Math.round(x); y = Math.round(y); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); return this; }
  // Filled ellipse tested at pixel centres. o: { sh: [light, dark], rot, clip(x,y), chk, dith: [col, level] }
  ell(cx, cy, rx, ry, c, o) {
    o = o || {}; const ca = Math.cos(o.rot || 0), sa = Math.sin(o.rot || 0), R = Math.max(rx, ry) + 1;
    for (let y = Math.floor(cy - R); y <= Math.ceil(cy + R); y++) for (let x = Math.floor(cx - R); x <= Math.ceil(cx + R); x++) {
      const px = x + 0.5 - cx, py = y + 0.5 - cy, nx = (px * ca + py * sa) / rx, ny = (-px * sa + py * ca) / ry;
      if (nx * nx + ny * ny > 1) continue; if (o.clip && !o.clip(x, y)) continue; if (o.chk && (x + y) % 2) continue;
      let col = c;
      if (o.sh) { const ux = px / rx, uy = py / ry; if ((ux + 0.38) ** 2 + (uy + 0.45) ** 2 < 0.16) col = o.sh[0]; else if (ux * 0.45 + uy * 0.9 > 0.58) col = o.sh[1]; }
      if (o.dith && bay(x, y) < o.dith[1]) col = o.dith[0];
      this.set(x, y, col);
    }
    return this;
  }
  ring(cx, cy, rx, ry, c, th, rot, clip) {
    th = th || 1; const ca = Math.cos(rot || 0), sa = Math.sin(rot || 0), R = Math.max(rx, ry) + 1;
    for (let y = Math.floor(cy - R); y <= Math.ceil(cy + R); y++) for (let x = Math.floor(cx - R); x <= Math.ceil(cx + R); x++) {
      const px = x + 0.5 - cx, py = y + 0.5 - cy, nx = px * ca + py * sa, ny = -px * sa + py * ca;
      const d = Math.hypot(nx / rx, ny / ry); if (d > 1) continue; const din = Math.hypot(nx / Math.max(0.1, rx - th), ny / Math.max(0.1, ry - th)); if (din <= 1) continue;
      if (clip && !clip(x, y)) continue; this.set(x, y, c);
    }
    return this;
  }
  // An arc of a ring between two angles (radians, clockwise from 3 o'clock), th thick.
  arc(cx, cy, r, a0, a1, c, th) {
    th = th || 2; const R = r + 1;
    for (let y = Math.floor(cy - R); y <= Math.ceil(cy + R); y++) for (let x = Math.floor(cx - R); x <= Math.ceil(cx + R); x++) {
      const px = x + 0.5 - cx, py = y + 0.5 - cy, d = Math.hypot(px, py); if (d > r || d < r - th) continue;
      let a = Math.atan2(py, px); while (a < a0) a += 2 * Math.PI; if (a <= a1) this.set(x, y, c);
    }
    return this;
  }
  poly(pts, c) {
    let y0 = 1e9, y1 = -1e9; for (const [, y] of pts) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
      const yc = y + 0.5, xs = [];
      for (let i = 0; i < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]; if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax)); }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.ceil(xs[k] - 0.5); x <= Math.floor(xs[k + 1] - 0.5); x++) this.set(x, y, c);
    }
    return this;
  }
  line(x0, y0, x1, y1, c, th) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
    for (;;) { if (th) this.rect(x0 - (th >> 1), y0 - (th >> 1), th, th, c); else this.set(x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
    return this;
  }
  // Selective outline: transparent pixels touching the shape take a darker shade of what they touch.
  outline(fn) {
    const src = this.p.slice(), w = this.w, h = this.h;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (src[y * w + x] >= 0) continue; let n = -1;
      if (y + 1 < h && src[(y + 1) * w + x] >= 0) n = src[(y + 1) * w + x];
      else if (y > 0 && src[(y - 1) * w + x] >= 0) n = src[(y - 1) * w + x];
      else if (x > 0 && src[y * w + x - 1] >= 0) n = src[y * w + x - 1];
      else if (x + 1 < w && src[y * w + x + 1] >= 0) n = src[y * w + x + 1];
      if (n >= 0) this.p[y * w + x] = fn ? fn(n) : shade(n, 2);
    }
    return this;
  }
  // A rim of light up and left, a dithered core shadow down and right, read from the silhouette.
  rich(d) {
    d = Math.max(1, d | 0); const src = this.p.slice(), w = this.w, h = this.h, at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? -1 : src[y * w + x]);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = src[y * w + x]; if (c < 0) continue;
      if ((at(x - d, y - d) < 0 && at(x - 1, y - 1) >= 0) || (at(x - 1, y - d * 2) < 0 && d > 1 && bay(x, y) < 6)) this.p[y * w + x] = LIGHT[c];
      else if (at(x + d * 2, y + d * 2) < 0) this.p[y * w + x] = at(x + d, y + d) < 0 || bay(x, y) < 9 ? DARK[c] : c; }
    return this;
  }
  blit(o, ox, oy) { for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) { const c = o.p[y * o.w + x]; if (c >= 0) this.set(ox + x, oy + y, c); } return this; }
  map(fn) { for (let i = 0; i < this.p.length; i++) if (this.p[i] >= 0) this.p[i] = fn(this.p[i], i % this.w, (i / this.w) | 0); return this; }
  // The frost: a cool pale dither over the pixels fn(x, y) selects (what isn't known yet).
  frost(fn) { return this.map((c, x, y) => (!fn || fn(x, y) ? (bay(x, y) < 7 ? C.frost : bay(x, y) < 14 ? C.frostD : C.frostS) : c)); }
}
// An RGBA image (a placeholder render, a stamp raster) into a buffer: each pixel its nearest palette colour;
// pixels of the `transparent` colour (within `tol`) are left clear.
export function fromRGBA(img, { transparent = null, tol = 6 } = {}) {
  const pb = new PB(img.width, img.height), d = img.data;
  for (let i = 0; i < pb.p.length; i++) {
    const r = d[i * 4], g2 = d[i * 4 + 1], b = d[i * 4 + 2], a = d[i * 4 + 3];
    if (a < 128) continue;
    if (transparent && Math.abs(r - transparent[0]) <= tol && Math.abs(g2 - transparent[1]) <= tol && Math.abs(b - transparent[2]) <= tol) continue;
    pb.p[i] = nearest(r, g2, b);
  }
  return pb;
}
const ART = new Map();
export function art(key, build) { let pb = ART.get(key); if (!pb) { pb = build(); ART.set(key, pb); } return pb; }
export const artHas = (key) => ART.has(key);
export const artSize = () => ART.size;
export function flipPB(pb) { const o = new PB(pb.w, pb.h); for (let y = 0; y < pb.h; y++) for (let x = 0; x < pb.w; x++) o.p[y * pb.w + x] = pb.p[y * pb.w + pb.w - 1 - x]; return o; }
export function upPB(src, k) { const pb = new PB(src.w * k, src.h * k); for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) { const c = src.p[y * src.w + x]; if (c < 0) continue; pb.rect(x * k, y * k, k, k, c); } return pb; }
export function cropPB(src, x0, y0, w, h, bg) { const pb = new PB(w, h); if (bg != null) pb.rect(0, 0, w, h, bg); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = src.get(x0 + x, y0 + y); if (c >= 0) pb.p[y * w + x] = c; } return pb; }
// Nearest-neighbour scale of a buffer to w×h (close-ups, small residents).
export function scalePB(src, w, h) { const pb = new PB(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) pb.p[y * w + x] = src.get(Math.floor((x + 0.5) * src.w / w), Math.floor((y + 0.5) * src.h / h)); return pb; }
// A dithered ramp: t in [0, 1] across a list of colours, with the 4×4 Bayer pattern between steps.
export function ramp(cols, t, x, y) { const f = clamp(t, 0, 0.999) * (cols.length - 1), i = Math.floor(f); return C[cols[bay(x, y) < (f - i) * 16 ? i + 1 : i]]; }
