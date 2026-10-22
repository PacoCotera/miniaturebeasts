// A small Canvas 2D subset in pure JavaScript, for the specimen generator (specimen.mjs; build spec 4.2, the architect's runtime ruling). It has exactly the calls specimen3.js makes, and no more:
//   canvas      createCanvas(w, h) { width, height, getContext("2d") }; the surface is a Float32Array of premultiplied RGBA, 0 to 1
//   state       save, restore; fillStyle, strokeStyle (a "#rrggbb", "rgb()", "rgba()" string or a gradient), lineWidth, lineCap, globalAlpha, globalCompositeOperation ("source-over", "lighter"), filter
//   paths       beginPath, moveTo, lineTo, arc, closePath; fill (non-zero), stroke (round caps, bevel-round joins, setLineDash); fillRect
//   gradients   createLinearGradient, createRadialGradient (concentric: the generator's glow), addColorStop
//   images      drawImage(canvas, 0, 0, w, h) (the whole canvas, the same size or enlarged bilinearly), with a filter of blur(Npx), sepia(), saturate(), hue-rotate(Ndeg) in a chain
//   pixels      createImageData, getImageData, putImageData (8-bit, straight alpha)
// No transforms, no text, no clip, no shadow: the generator uses none, and a call outside the subset throws. Anti-aliasing is by fixed 4 x 4 supersampling with integer weights (a coverage is a whole count of 16);
// a blur is a separable Gaussian with integer weights (4096 scale). Everything is arithmetic on the surface, so the same bytes come out on x86 and aarch64 and under any Node.
const TAU = Math.PI * 2;
const FLATTEN = 0.02;   // the most a flattened arc may fall inside the true circle, in pixels
const SX = 4, SY = 4, SXY = SX * SY;   // the fixed 4 x 4 sub-samples of a pixel: 16 whole weights

// ---- colours ----
const NAMED = {};
function parseColour(s) {
  let m;
  if ((m = /^#([0-9a-f]{6})$/i.exec(s))) { const n = parseInt(m[1], 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, 1]; }
  if ((m = /^rgba?\(\s*([-\d.eE+]+)\s*,\s*([-\d.eE+]+)\s*,\s*([-\d.eE+]+)\s*(?:,\s*([-\d.eE+]+)\s*)?\)$/.exec(s))) { const c = (v) => Math.max(0, Math.min(255, +v)) / 255; return [c(m[1]), c(m[2]), c(m[3]), m[4] === undefined ? 1 : Math.max(0, Math.min(1, +m[4]))]; }
  if (NAMED[s]) return NAMED[s];
  throw new Error(`paint2d: colour "${s}" is outside the subset`);
}
const premul = ([r, g, b, a]) => [r * a, g * a, b * a, a];

class Gradient {
  constructor(kind, a) { this.kind = kind; this.a = a; this.stops = []; }
  addColorStop(off, colour) { this.stops.push([off, parseColour(colour)]); this.stops.sort((p, q) => p[0] - q[0]); }
  // the premultiplied colour at parameter t
  at(t) {
    const S = this.stops; if (!S.length) return [0, 0, 0, 0];
    if (t <= S[0][0]) return premul(S[0][1]);
    if (t >= S[S.length - 1][0]) return premul(S[S.length - 1][1]);
    for (let i = 1; i < S.length; i++) if (t <= S[i][0]) { const [o0, c0] = S[i - 1], [o1, c1] = S[i], u = o1 === o0 ? 1 : (t - o0) / (o1 - o0); return premul([c0[0] + (c1[0] - c0[0]) * u, c0[1] + (c1[1] - c0[1]) * u, c0[2] + (c1[2] - c0[2]) * u, c0[3] + (c1[3] - c0[3]) * u]); }
    return premul(S[S.length - 1][1]);
  }
  param(x, y) {
    const a = this.a;
    if (this.kind === "linear") { const dx = a[2] - a[0], dy = a[3] - a[1], l2 = dx * dx + dy * dy; return l2 ? ((x - a[0]) * dx + (y - a[1]) * dy) / l2 : 0; }
    const d = Math.hypot(x - a[0], y - a[1]); return (d - a[2]) / (a[5] - a[2]);   // concentric radial
  }
}

// ---- the rasteriser: 4 x 4 coverage of a set of polygons ----
let MASK = new Uint8Array(1 << 16);
let XS = new Float64Array(1 << 12), DS = new Int8Array(1 << 12);   // crossings, flat, bucketed by sub-scanline
// polys: array of flat [x0, y0, x1, y1, ...] polygons (implicitly closed). Returns { x0, y0, w, h, mask } covering the polys' bbox inside the canvas (counts 0 to 16), or null.
function coverage(polys, W, H, evenOdd = false) {
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
  for (const p of polys) for (let i = 0; i < p.length; i += 2) { const x = p[i], y = p[i + 1]; if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
  if (!(minx <= maxx)) return null;
  const x0 = Math.max(0, Math.floor(minx)), y0 = Math.max(0, Math.floor(miny)), x1 = Math.min(W, Math.ceil(maxx)), y1 = Math.min(H, Math.ceil(maxy));
  if (x1 <= x0 || y1 <= y0) return null;
  const bw = x1 - x0, bh = y1 - y0, nSub = bh * SY;
  if (MASK.length < bw * bh) MASK = new Uint8Array(bw * bh * 2); MASK.fill(0, 0, bw * bh);
  const count = new Int32Array(nSub + 1);
  const subLo = (y) => Math.ceil(y * SY - 0.5);   // first sub-scanline whose centre is at or past y
  const eachEdge = (fn) => {
    for (const p of polys) { const n = p.length; if (n < 6) continue; for (let i = 0, j = n - 2; i < n; j = i, i += 2) { const ax = p[j], ay = p[j + 1], bx = p[i], by = p[i + 1]; if (ay === by) continue; fn(ax, ay, bx, by); } }
  };
  const baseSub = y0 * SY;
  eachEdge((ax, ay, bx, by) => { const lo = Math.max(subLo(Math.min(ay, by)), baseSub), hi = Math.min(subLo(Math.max(ay, by)), baseSub + nSub); for (let j = lo; j < hi; j++) count[j - baseSub + 1]++; });
  for (let j = 0; j < nSub; j++) count[j + 1] += count[j];
  const total = count[nSub]; if (!total) return { x0, y0, w: bw, h: bh, mask: MASK };
  if (XS.length < total) { XS = new Float64Array(total * 2); DS = new Int8Array(total * 2); }
  const fill = count.slice(0, nSub);
  eachEdge((ax, ay, bx, by) => {
    const dir = by > ay ? 1 : -1, sx = by > ay ? ax : bx, sy = by > ay ? ay : by, ey = by > ay ? by : ay, ex = by > ay ? bx : ax, slope = (ex - sx) / (ey - sy);
    const lo = Math.max(subLo(sy), baseSub), hi = Math.min(subLo(ey), baseSub + nSub);
    for (let j = lo; j < hi; j++) { const k = fill[j - baseSub]++; XS[k] = sx + ((j + 0.5) / SY - sy) * slope; DS[k] = dir; }
  });
  const sx0 = x0 * SX, sx1 = x1 * SX;
  for (let j = 0; j < nSub; j++) {
    const a = count[j], b = count[j + 1]; if (b - a < 2) continue;
    for (let i = a + 1; i < b; i++) { const x = XS[i], d = DS[i]; let k = i - 1; while (k >= a && XS[k] > x) { XS[k + 1] = XS[k]; DS[k + 1] = DS[k]; k--; } XS[k + 1] = x; DS[k + 1] = d; }
    const row = (((j / SY) | 0)) * bw; let wind = 0;
    for (let i = a; i < b - 1; i++) {
      wind = evenOdd ? wind ^ 1 : wind + DS[i];
      if (!wind) continue;
      let sa = Math.ceil(XS[i] * SX - 0.5), sb = Math.ceil(XS[i + 1] * SX - 0.5); if (sa < sx0) sa = sx0; if (sb > sx1) sb = sx1; if (sb <= sa) continue;
      let s = sa;
      while (s < sb && s % SX) { MASK[row + ((s / SX) | 0) - x0]++; s++; }
      while (s + SX <= sb) { MASK[row + ((s / SX) | 0) - x0] += SX; s += SX; }
      while (s < sb) { MASK[row + ((s / SX) | 0) - x0]++; s++; }
    }
  }
  return { x0, y0, w: bw, h: bh, mask: MASK };
}

// ---- stroking: a stroke is the union (non-zero, all polygons the same way round) of a quad for each segment, a wedge at each join and a half disc at each open end ----
const area2 = (p) => { let s = 0; for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) s += p[j] * p[i + 1] - p[i] * p[j + 1]; return s; };
const upright = (p) => { if (area2(p) < 0) { const q = []; for (let i = p.length - 2; i >= 0; i -= 2) q.push(p[i], p[i + 1]); return q; } return p; };
function disc(cx, cy, r, from, sweep) {   // a fan (centre plus arc) from angle `from` through `sweep`
  const n = Math.max(2, Math.ceil(Math.abs(sweep) / (Math.PI / 8))), p = [cx, cy];
  for (let i = 0; i <= n; i++) { const a = from + sweep * i / n; p.push(cx + r * Math.cos(a), cy + r * Math.sin(a)); }
  return p;
}
function strokePolys(subs, hw, round) {
  const out = [];
  for (const sub of subs) {
    const P = []; for (let i = 0; i < sub.pts.length; i += 2) { const n = P.length; if (n && Math.hypot(sub.pts[i] - P[n - 2], sub.pts[i + 1] - P[n - 1]) < 1e-9) continue; P.push(sub.pts[i], sub.pts[i + 1]); }
    const n = P.length / 2;
    if (n === 1) { if (round) out.push(upright(disc(P[0], P[1], hw, 0, TAU))); continue; }
    if (n < 2) continue;
    const segs = n - 1 + (sub.closed && n > 2 ? 1 : 0), dirs = [];
    for (let i = 0; i < segs; i++) {
      const ax = P[2 * i], ay = P[2 * i + 1], k = (i + 1) % n, bx = P[2 * k], by = P[2 * k + 1], dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l, nx = -uy * hw, ny = ux * hw;
      dirs.push([ux, uy]);
      out.push(upright([ax + nx, ay + ny, bx + nx, by + ny, bx - nx, by - ny, ax - nx, ay - ny]));
    }
    const join = (vx, vy, d0, d1) => {   // the wedge on the outside of the turn from direction d0 to d1
      const cr = d0[0] * d1[1] - d0[1] * d1[0], dt = d0[0] * d1[0] + d0[1] * d1[1]; if (Math.abs(cr) < 1e-12 && dt > 0) return;
      const side = cr > 0 ? -1 : 1, a0 = Math.atan2(d0[0] * side, -d0[1] * side), ang = Math.atan2(cr, dt);   // the normal on the outer side of d0, and the turn angle
      out.push(upright(disc(vx, vy, hw, a0, ang)));
    };
    for (let i = 1; i < segs; i++) join(P[2 * i], P[2 * i + 1], dirs[i - 1], dirs[i]);
    if (sub.closed && n > 2) join(P[0], P[1], dirs[segs - 1], dirs[0]);
    else if (round) {
      const d0 = dirs[0], d1 = dirs[segs - 1];
      out.push(upright(disc(P[0], P[1], hw, Math.atan2(d0[1], d0[0]) + Math.PI / 2, Math.PI)));
      out.push(upright(disc(P[2 * (n - 1)], P[2 * (n - 1) + 1], hw, Math.atan2(d1[1], d1[0]) - Math.PI / 2, Math.PI)));
    }
  }
  return out;
}
function dashed(subs, pattern) {
  const pat = pattern.length % 2 ? pattern.concat(pattern) : pattern, period = pat.reduce((a, b) => a + b, 0), out = [];
  if (!(period > 0)) return subs;
  for (const sub of subs) {
    let k = 0, left = pat[0], on = true, cur = null; const P = sub.pts;
    const take = (x, y) => { if (on) { if (!cur) cur = { pts: [], closed: false }; cur.pts.push(x, y); } };
    take(P[0], P[1]);
    const nseg = P.length / 2 - 1 + (sub.closed ? 1 : 0);
    for (let i = 0; i < nseg; i++) {
      let ax = P[2 * i], ay = P[2 * i + 1]; const j = (i + 1) % (P.length / 2), bx = P[2 * j], by = P[2 * j + 1]; let rem = Math.hypot(bx - ax, by - ay); if (!rem) continue; const ux = (bx - ax) / rem, uy = (by - ay) / rem;
      while (rem > left) {
        ax += ux * left; ay += uy * left; rem -= left; take(ax, ay);
        if (on && cur) { out.push(cur); cur = null; }
        on = !on; k = (k + 1) % pat.length; left = pat[k]; if (on) take(ax, ay);
        if (left === 0) { left = 1e-9; }
      }
      left -= rem; take(bx, by);
    }
    if (cur) out.push(cur);
  }
  return out;
}

// ---- filters on a premultiplied surface ----
function gaussWeights(sigma) {
  const r = Math.max(1, Math.ceil(sigma * 3)), w = new Int32Array(r + 1); let sum = 0;
  for (let k = 0; k <= r; k++) { w[k] = Math.round(4096 * Math.exp(-(k * k) / (2 * sigma * sigma))); sum += k ? 2 * w[k] : w[k]; }
  return { r, w, sum };
}
// A wide blur is made on a reduced copy (the picture is smooth at that scale): the surface is averaged down by f in blocks, blurred at sigma / f and enlarged bilinearly; the reduction's own spread is taken off sigma, so the result
// is the same Gaussian within a fraction of a level. a sigma under 2.5 is blurred as it is.
function blur(src, W, H, sigma, nch = 4) {
  if (!(sigma > 0)) return src;
  const f = sigma < 2.5 ? 1 : sigma < 10 ? 2 : 4;
  if (f === 1) return blurFull(src, W, H, sigma, nch);
  const W2 = Math.ceil(W / f), H2 = Math.ceil(H / f), small = new Float32Array(W2 * H2 * 4), sh = f === 2 ? 1 : 2, k = 1 / (f * f);
  for (let y = 0; y < H; y++) { const row = y * W * 4, orow = (y >> sh) * W2 * 4; for (let x = 0; x < W; x++) { const i = row + x * 4, o = orow + (x >> sh) * 4; for (let c = 0; c < nch; c++) small[o + c] += src[i + c]; } }
  for (let i = 0; i < small.length; i++) small[i] *= k;
  const extra = (f * f - 1) / 12 + f * f / 6, b = blurFull(small, W2, H2, Math.sqrt(Math.max(1, sigma * sigma - extra)) / f, nch), out = new Float32Array(W * H * 4);
  const X0 = new Int32Array(W), X1 = new Int32Array(W), TX = new Float32Array(W);   // the enlargement's columns, once
  for (let x = 0; x < W; x++) { const fx = Math.max(0, Math.min(W2 - 1, (x + 0.5) / f - 0.5)), x0 = Math.floor(fx); X0[x] = x0 * 4; X1[x] = Math.min(W2 - 1, x0 + 1) * 4; TX[x] = fx - x0; }
  for (let y = 0; y < H; y++) {
    const fy = Math.max(0, Math.min(H2 - 1, (y + 0.5) / f - 0.5)), y0 = Math.floor(fy), r0 = y0 * W2 * 4, r1 = Math.min(H2 - 1, y0 + 1) * W2 * 4, ty = fy - y0, uy = 1 - ty;
    for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 4, a = r0 + X0[x], bq = r0 + X1[x], c2 = r1 + X0[x], d = r1 + X1[x], tx = TX[x];
      for (let c = 0; c < nch; c++) out[o + c] = (b[a + c] + (b[bq + c] - b[a + c]) * tx) * uy + (b[c2 + c] + (b[d + c] - b[c2 + c]) * tx) * ty;
    }
  }
  return out;
}
function blurFull(src, W, H, sigma, nch = 4) {   // outside the surface is clear; nch 3 leaves the alpha plane out (the result's alpha is 0)
  const { r, w, sum } = gaussWeights(sigma), inv = 1 / sum, out = new Float32Array(W * H * 4);
  let bx0 = W, bx1 = -1, by0 = H, by1 = -1;
  for (let y = 0; y < H; y++) { const o = y * W * 4; for (let x = 0; x < W; x++) { const i = o + x * 4; if (src[i] || src[i + 1] || src[i + 2] || (nch > 3 && src[i + 3])) { if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; } } }
  if (bx1 < 0) return out;
  const cx0 = Math.max(0, bx0 - r), cx1 = Math.min(W - 1, bx1 + r), cy0 = Math.max(0, by0 - r), cy1 = Math.min(H - 1, by1 + r);
  const sw = bx1 - bx0 + 1, ow = cx1 - cx0 + 1, rows = by1 - by0 + 1, padW = ow + 2 * r;
  const pad = new Float32Array(padW), acc = new Float32Array(ow), tmp = new Float32Array(rows * ow);
  for (let c = 0; c < nch; c++) {
    for (let y = by0; y <= by1; y++) {   // horizontal: the row padded with clear, the taps summed outward from the middle
      pad.fill(0); for (let x = 0; x < sw; x++) pad[bx0 - cx0 + r + x] = src[(y * W + bx0 + x) * 4 + c];
      const a0 = w[0]; for (let x = 0; x < ow; x++) acc[x] = a0 * pad[x + r];
      for (let k = 1; k <= r; k++) { const wk = w[k]; for (let x = 0; x < ow; x++) acc[x] += wk * (pad[x + r - k] + pad[x + r + k]); }
      const o = (y - by0) * ow; for (let x = 0; x < ow; x++) tmp[o + x] = acc[x] * inv;
    }
    for (let y = cy0; y <= cy1; y++) {   // vertical: the rows around it
      const a0 = w[0], yr = y - by0; if (yr >= 0 && yr < rows) for (let x = 0; x < ow; x++) acc[x] = a0 * tmp[yr * ow + x]; else acc.fill(0);
      for (let k = 1; k <= r; k++) {
        const wk = w[k], ya = yr - k, yb = yr + k, A = ya >= 0 && ya < rows, B = yb >= 0 && yb < rows;
        if (A && B) for (let x = 0; x < ow; x++) acc[x] += wk * (tmp[ya * ow + x] + tmp[yb * ow + x]);
        else if (A) for (let x = 0; x < ow; x++) acc[x] += wk * tmp[ya * ow + x];
        else if (B) for (let x = 0; x < ow; x++) acc[x] += wk * tmp[yb * ow + x];
      }
      for (let x = 0; x < ow; x++) out[(y * W + cx0 + x) * 4 + c] = acc[x] * inv;
    }
  }
  return out;
}
function colourMatrix(src, M) {   // a linear matrix on the colour channels (the filter functions have no offset, so premultiplied values transform alike); clamped to the alpha
  const out = new Float32Array(src.length);
  for (let i = 0; i < src.length; i += 4) {
    const r = src[i], g = src[i + 1], b = src[i + 2], a = src[i + 3];
    out[i] = Math.min(a, Math.max(0, M[0] * r + M[1] * g + M[2] * b)); out[i + 1] = Math.min(a, Math.max(0, M[3] * r + M[4] * g + M[5] * b)); out[i + 2] = Math.min(a, Math.max(0, M[6] * r + M[7] * g + M[8] * b)); out[i + 3] = a;
  }
  return out;
}
// the Filter Effects matrices
const SEPIA = (a) => { const t = 1 - Math.min(1, a); return [0.393 + 0.607 * t, 0.769 - 0.769 * t, 0.189 - 0.189 * t, 0.349 - 0.349 * t, 0.686 + 0.314 * t, 0.168 - 0.168 * t, 0.272 - 0.272 * t, 0.534 - 0.534 * t, 0.131 + 0.869 * t]; };
const SATURATE = (s) => [0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s, 0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s, 0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s];
const HUE = (deg) => { const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return [0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928, 0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.140, 0.072 - c * 0.072 - s * 0.283, 0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072]; };
function applyFilter(src, W, H, filter, nch = 4) {
  if (!filter || filter === "none") return src;
  let cur = src; const re = /([a-z-]+)\(\s*([-\d.eE+]+)\s*(px|deg)?\s*\)/g; let m, any = false;
  while ((m = re.exec(filter))) {
    any = true; const v = +m[2];
    if (m[1] === "blur") cur = blur(cur, W, H, v, nch);
    else if (m[1] === "sepia") cur = colourMatrix(cur, SEPIA(v));
    else if (m[1] === "saturate") cur = colourMatrix(cur, SATURATE(v));
    else if (m[1] === "hue-rotate") cur = colourMatrix(cur, HUE(v));
    else throw new Error(`paint2d: filter ${m[1]}() is outside the subset`);
  }
  if (!any) throw new Error(`paint2d: filter "${filter}" is outside the subset`);
  return cur;
}

// ---- the surface and its context ----
class Canvas {
  constructor(w, h) { this.width = w; this.height = h; this.data = new Float32Array(w * h * 4); this._ctx = null; this.opaque = false; }   // opaque: every pixel's alpha is 1 (a full opaque fill; nothing drawn after lowers it)
  getContext(kind) { if (kind !== "2d") throw new Error("paint2d: only the 2d context"); return (this._ctx ??= new Ctx(this)); }
}
export const createCanvas = (w, h) => new Canvas(w, h);

const STATE = ["fillStyle", "strokeStyle", "lineWidth", "lineCap", "globalAlpha", "globalCompositeOperation", "filter"];
class Ctx {
  constructor(c) { this.canvas = c; this.fillStyle = "#000000"; this.strokeStyle = "#000000"; this.lineWidth = 1; this.lineCap = "butt"; this.globalAlpha = 1; this.globalCompositeOperation = "source-over"; this.filter = "none"; this._dash = []; this._stack = []; this._subs = []; this._cur = null; }
  save() { const s = { dash: this._dash }; for (const k of STATE) s[k] = this[k]; this._stack.push(s); }
  restore() { const s = this._stack.pop(); if (!s) return; for (const k of STATE) this[k] = s[k]; this._dash = s.dash; }
  setLineDash(a) { this._dash = a.slice(); }
  createLinearGradient(x0, y0, x1, y1) { return new Gradient("linear", [x0, y0, x1, y1]); }
  createRadialGradient(x0, y0, r0, x1, y1, r1) { if (x0 !== x1 || y0 !== y1) throw new Error("paint2d: only a concentric radial gradient"); return new Gradient("radial", [x0, y0, r0, x1, y1, r1]); }
  // paths
  beginPath() { this._subs = []; this._cur = null; }
  moveTo(x, y) { this._cur = { pts: [x, y], closed: false }; this._subs.push(this._cur); }
  lineTo(x, y) { if (!this._cur) return this.moveTo(x, y); this._cur.pts.push(x, y); }
  closePath() { if (!this._cur) return; this._cur.closed = true; const [x, y] = this._cur.pts; this._cur = { pts: [x, y], closed: false }; this._subs.push(this._cur); }
  arc(x, y, r, a0, a1, ccw = false) {
    let sweep = a1 - a0;
    if (!ccw) { if (sweep >= TAU) sweep = TAU; else if (sweep < 0) sweep = ((sweep % TAU) + TAU) % TAU; } else { if (sweep <= -TAU) sweep = -TAU; else if (sweep > 0) sweep = -(((-sweep) % TAU + TAU) % TAU); }
    const n = Math.max(6, Math.ceil(Math.abs(sweep) / (2 * Math.acos(Math.max(0, 1 - FLATTEN / Math.max(r, 0.05))))));
    this[this._cur ? "lineTo" : "moveTo"](x + r * Math.cos(a0), y + r * Math.sin(a0));
    for (let i = 1; i <= n; i++) { const a = a0 + sweep * i / n; this._cur.pts.push(x + r * Math.cos(a), y + r * Math.sin(a)); }
  }
  // painting
  _paint(style) {
    if (style instanceof Gradient) return (x, y) => style.at(style.param(x, y));
    const c = premul(parseColour(style)); return () => c;
  }
  _composite(cov, paint) {
    if (!cov) return;
    const { x0, y0, w, h, mask } = cov, W = this.canvas.width, D = this.canvas.data, lighter = this.globalCompositeOperation === "lighter", GA = this.globalAlpha;
    if (!lighter && this.globalCompositeOperation !== "source-over") throw new Error(`paint2d: composite "${this.globalCompositeOperation}" is outside the subset`);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = mask[y * w + x]; if (!n) continue;
        const c = paint(x0 + x + 0.5, y0 + y + 0.5), k = (n / SXY) * GA, i = ((y0 + y) * W + x0 + x) * 4;
        const sr = c[0] * k, sg = c[1] * k, sb = c[2] * k, sa = c[3] * k;
        if (lighter) { D[i] = Math.min(1, D[i] + sr); D[i + 1] = Math.min(1, D[i + 1] + sg); D[i + 2] = Math.min(1, D[i + 2] + sb); D[i + 3] = Math.min(1, D[i + 3] + sa); }
        else { const t = 1 - sa; D[i] = sr + D[i] * t; D[i + 1] = sg + D[i + 1] * t; D[i + 2] = sb + D[i + 2] * t; D[i + 3] = sa + D[i + 3] * t; }
      }
    }
  }
  fill() { const polys = this._subs.filter((s) => s.pts.length >= 6).map((s) => s.pts); this._composite(coverage(polys, this.canvas.width, this.canvas.height), this._paint(this.fillStyle)); }
  stroke() {
    let subs = this._subs.filter((s) => s.pts.length >= 4);   // a lone moveTo draws nothing
    if (this._dash.length) subs = dashed(subs, this._dash);
    const polys = strokePolys(subs, this.lineWidth / 2, this.lineCap === "round");
    this._composite(coverage(polys, this.canvas.width, this.canvas.height), this._paint(this.strokeStyle));
  }
  fillRect(x, y, w, h) {
    const C = this.canvas, solid = typeof this.fillStyle === "string" && this.globalAlpha === 1 && parseColour(this.fillStyle)[3] === 1;
    if (solid && x <= 0 && y <= 0 && x + w >= C.width && y + h >= C.height) C.opaque = true;
    this._composite(coverage([[x, y, x + w, y, x + w, y + h, x, y + h]], this.canvas.width, this.canvas.height), this._paint(this.fillStyle)); }
  drawImage(img, dx, dy, dw, dh) {
    if (!(img instanceof Canvas)) throw new Error("paint2d: drawImage takes a canvas");
    if (dx !== 0 || dy !== 0 || dw !== this.canvas.width || dh !== this.canvas.height) throw new Error("paint2d: drawImage covers the whole canvas");
    const W = dw, H = dh, sw = img.width, sh = img.height;
    let src = img.data;
    if (sw !== W || sh !== H) {   // enlarged, bilinear, the edges held
      if (sw > W || sh > H) throw new Error("paint2d: drawImage does not reduce");
      src = new Float32Array(W * H * 4);
      for (let y = 0; y < H; y++) {
        const fy = Math.max(0, Math.min(sh - 1, (y + 0.5) * sh / H - 0.5)), y0 = Math.floor(fy), y1 = Math.min(sh - 1, y0 + 1), ty = fy - y0;
        for (let x = 0; x < W; x++) {
          const fx = Math.max(0, Math.min(sw - 1, (x + 0.5) * sw / W - 0.5)), x0 = Math.floor(fx), x1 = Math.min(sw - 1, x0 + 1), tx = fx - x0, o = (y * W + x) * 4;
          for (let c = 0; c < 4; c++) { const a = img.data[(y0 * sw + x0) * 4 + c], b = img.data[(y0 * sw + x1) * 4 + c], cc = img.data[(y1 * sw + x0) * 4 + c], d = img.data[(y1 * sw + x1) * 4 + c]; src[o + c] = (a + (b - a) * tx) * (1 - ty) + (cc + (d - cc) * tx) * ty; }
        }
      }
    }
    const D = this.canvas.data, GA = this.globalAlpha, lighter = this.globalCompositeOperation === "lighter";
    const alphaFree = lighter && this.canvas.opaque && !/sepia|saturate|hue-rotate/.test(this.filter);   // added to an opaque surface, a blur's alpha is never read: its plane is left out
    src = applyFilter(src, W, H, this.filter, alphaFree ? 3 : 4);
    if (!lighter && this.globalCompositeOperation !== "source-over") throw new Error(`paint2d: composite "${this.globalCompositeOperation}" is outside the subset`);
    for (let i = 0; i < D.length; i += 4) {
      const sr = src[i] * GA, sg = src[i + 1] * GA, sb = src[i + 2] * GA, sa = src[i + 3] * GA;
      if (lighter) { D[i] = Math.min(1, D[i] + sr); D[i + 1] = Math.min(1, D[i + 1] + sg); D[i + 2] = Math.min(1, D[i + 2] + sb); D[i + 3] = Math.min(1, D[i + 3] + sa); }
      else { const t = 1 - sa; D[i] = sr + D[i] * t; D[i + 1] = sg + D[i + 1] * t; D[i + 2] = sb + D[i + 2] * t; D[i + 3] = sa + D[i + 3] * t; }
    }
  }
  // pixels (8-bit, straight alpha)
  createImageData(w, h) { return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }; }
  getImageData(x, y, w, h) {
    if (x !== 0 || y !== 0 || w !== this.canvas.width || h !== this.canvas.height) throw new Error("paint2d: getImageData covers the whole canvas");
    const D = this.canvas.data, out = new Uint8ClampedArray(D.length);
    for (let i = 0; i < D.length; i += 4) { const a = D[i + 3]; if (a > 0) { out[i] = Math.round(D[i] / a * 255); out[i + 1] = Math.round(D[i + 1] / a * 255); out[i + 2] = Math.round(D[i + 2] / a * 255); } out[i + 3] = Math.round(a * 255); }
    return { width: w, height: h, data: out };
  }
  putImageData(img, x, y) {
    if (x !== 0 || y !== 0 || img.width !== this.canvas.width || img.height !== this.canvas.height) throw new Error("paint2d: putImageData covers the whole canvas");
    const D = this.canvas.data, s = img.data;
    for (let i = 0; i < D.length; i += 4) { const a = s[i + 3] / 255; D[i] = s[i] / 255 * a; D[i + 1] = s[i + 1] / 255 * a; D[i + 2] = s[i + 2] / 255 * a; D[i + 3] = a; }
  }
}

// The Canvas 2D calls the subset provides, for the build test that checks specimen.mjs uses nothing else.
export const CALLS = ["createCanvas", "getContext", "save", "restore", "setLineDash", "createLinearGradient", "createRadialGradient", "addColorStop", "beginPath", "moveTo", "lineTo", "arc", "closePath", "fill", "stroke", "fillRect", "drawImage", "createImageData", "getImageData", "putImageData"];
