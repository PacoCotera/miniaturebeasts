// The relit picture (T-20261016-222; build-spec §1, architect-rulings 3): a figure (a pod, the opened pod, a juvenile) lit to the capsule's roof lamp, the port of the art director's composite-juvenile.py:
//   1. light from above: gain 1.10 - 0.38 t^1.4 down the figure, times a warm (1.08, 0.99, 0.84);
//   2. a warm rim (255, 222, 170) at 0.55 on the top edges (pixels whose upper neighbours, 1 to 3 px up, are clear), blurred 1 px;
//   3. a contact shadow on the moss (two blurred ellipses under the foot, (18, 12, 6));
//   4. the feet sunk into the moss: the scene's own lit grass blades (the interior master's pixels, brighter than their 9 px box blur) come back in front over the feet's lowest rows, in the same shadow.
// It is made once in the logic process (Lanczos 3 for the size, never on the face) and is one picture with its shadow and moss alpha, placed 1:1 on the painted layer. Bump RECIPE whenever any of this changes (the cache id is
// relit:{species}:{digest}:{light}:{w}x{h}:v{recipe}). Pure on RGBA arrays (straight alpha, Uint8ClampedArray).
import { resample } from "./layered-stand.mjs";
export const RECIPE = 1;
const WARM = [1.08, 0.99, 0.84], RIM = [255, 222, 170];

export function bboxOf(rgba, w, h, min = 1) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (rgba[(y * w + x) * 4 + 3] >= min) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 < 0 ? null : [x0, y0, x1 - x0 + 1, y1 - y0 + 1];
}
function crop(src, w, b) { const [x0, y0, bw, bh] = b, out = new Uint8ClampedArray(bw * bh * 4); for (let y = 0; y < bh; y++) out.set(src.subarray(((y0 + y) * w + x0) * 4, ((y0 + y) * w + x0 + bw) * 4), y * bw * 4); return out; }
// a separable gaussian of a single-channel Float32Array
export function blur(a, w, h, sigma) {
  if (sigma <= 0) return a;
  const r = Math.max(1, Math.ceil(sigma * 3)), k = new Float32Array(2 * r + 1); let s = 0; for (let i = -r; i <= r; i++) { k[i + r] = Math.exp(-(i * i) / (2 * sigma * sigma)); s += k[i + r]; } for (let i = 0; i < k.length; i++) k[i] /= s;
  const t = new Float32Array(w * h), o = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = 0; for (let i = -r; i <= r; i++) { const xx = Math.min(w - 1, Math.max(0, x + i)); v += a[y * w + xx] * k[i + r]; } t[y * w + x] = v; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = 0; for (let i = -r; i <= r; i++) { const yy = Math.min(h - 1, Math.max(0, y + i)); v += t[yy * w + x] * k[i + r]; } o[y * w + x] = v; }
  return o;
}
function boxBlur(a, w, h, r) {   // a mean over (2r + 1)^2, the edge clamped
  const t = new Float32Array(w * h), o = new Float32Array(w * h), n = 2 * r + 1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = 0; for (let i = -r; i <= r; i++) v += a[y * w + Math.min(w - 1, Math.max(0, x + i))]; t[y * w + x] = v / n; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = 0; for (let i = -r; i <= r; i++) v += t[Math.min(h - 1, Math.max(0, y + i)) * w + x]; o[y * w + x] = v / n; }
  return o;
}
const over = (dst, o, sr, sg, sb, sa) => {   // straight-alpha over, one pixel at offset o (sa 0..1)
  const da = dst[o + 3] / 255, oa = sa + da * (1 - sa); if (oa <= 0) return;
  dst[o] = (sr * sa + dst[o] * da * (1 - sa)) / oa; dst[o + 1] = (sg * sa + dst[o + 1] * da * (1 - sa)) / oa; dst[o + 2] = (sb * sa + dst[o + 2] * da * (1 - sa)) / oa; dst[o + 3] = Math.round(oa * 255);
};
// parts: [{ rgba, w, h, over?: [rgba...] }]: the first is the primary (the foot is its alpha box's bottom, its axis the box's centre), a later one stands against the primary's left side on the same foot line (`side: "left"`).
// scale: the figure's reduction or enlargement of the source (1: as it is). area: [W, H] and anchor: [ax, ay] the foot's point in it. bg: the scene under the picture ({ rgba, w, h, x, y }: its top left in area coordinates), for the moss blades, or null.
export function relit({ parts, scale = 1, figH = 0, area: [W, H], anchor: [ax, ay], bg = null }) {
  // 1. the figure, unscaled, in one picture
  const prim = parts[0], pb = bboxOf(prim.rgba, prim.w, prim.h), px = pb[0], py = pb[1];
  let minX = px, maxX = px + pb[2], minY = py;
  const placed = [{ ...prim, x: 0, y: 0 }];
  for (const q of parts.slice(1)) { const qb = bboxOf(q.rgba, q.w, q.h); const x = px - (qb[0] + qb[2]), y = py + pb[3] - (qb[1] + qb[3]); placed.push({ ...q, x, y }); minX = Math.min(minX, qb[0] + x); minY = Math.min(minY, qb[1] + y); }
  const uw = maxX - minX, uh = py + pb[3] - minY, un = new Uint8ClampedArray(uw * uh * 4);
  for (const p of placed) {
    const src = p.over?.length ? new Uint8ClampedArray(p.rgba) : p.rgba;
    for (const ov of p.over ?? []) for (let i = 0; i < src.length; i += 4) { const a = ov[i + 3] / 255; if (a) over(src, i, ov[i], ov[i + 1], ov[i + 2], a); }
    for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
      const i = (y * p.w + x) * 4, a = src[i + 3]; if (!a) continue; const X = x + p.x - minX, Y = y + p.y - minY; if (X < 0 || Y < 0 || X >= uw || Y >= uh) continue;
      over(un, (Y * uw + X) * 4, src[i], src[i + 1], src[i + 2], a / 255);
    }
  }
  if (figH) scale = figH / pb[3];   // the primary's own height is the figure's: a juvenile cut at 146 tall stays, one cut larger comes down
  const cxSrc = px + pb[2] / 2 - minX, fw = Math.max(1, Math.round(uw * scale)), fh = Math.max(1, Math.round(uh * scale));
  const fig = resample(un, uw, uh, fw, fh), cxFig = cxSrc * scale;
  // 2. the light: from above, warm; a warm rim on the top edges
  const al = new Float32Array(fw * fh); for (let i = 0; i < al.length; i++) al[i] = fig[i * 4 + 3] / 255;
  const lit = new Float32Array(fig.length);
  for (let y = 0; y < fh; y++) { const t = fh > 1 ? y / (fh - 1) : 0, gain = 1.10 - 0.38 * Math.pow(t, 1.4); for (let x = 0; x < fw; x++) { const i = (y * fw + x) * 4; for (let c = 0; c < 3; c++) lit[i + c] = fig[i + c] * gain * WARM[c]; } }
  const rimRaw = new Float32Array(fw * fh);
  for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) { let up = 0; for (let d = 1; d <= 3; d++) { const a = y - d >= 0 ? al[(y - d) * fw + x] : 0; if (a < 0.2) up = 1; } rimRaw[y * fw + x] = al[y * fw + x] > 0.5 ? up : 0; }
  const rim = blur(rimRaw, fw, fh, 1.0);
  for (let i = 0; i < al.length; i++) for (let c = 0; c < 3; c++) lit[i * 4 + c] = lit[i * 4 + c] * (1 - 0.55 * rim[i]) + RIM[c] * 0.55 * rim[i];
  // 3. the area: shadow, then the figure
  const out = new Uint8ClampedArray(W * H * 4), x0 = Math.round(ax - cxFig), y0 = ay - fh, s = Math.max(0.15, fh / 166), cx = ax, foot = ay;
  const sh = new Float32Array(W * H), ell = (l, t, r, b, v) => { const mx = (l + r) / 2, my = (t + b) / 2, rx = (r - l) / 2, ry = (b - t) / 2; for (let y = Math.max(0, Math.floor(t)); y < Math.min(H, Math.ceil(b)); y++) for (let x = Math.max(0, Math.floor(l)); x < Math.min(W, Math.ceil(r)); x++) if (((x + 0.5 - mx) / rx) ** 2 + ((y + 0.5 - my) / ry) ** 2 <= 1) sh[y * W + x] = v; };
  const hw = fw / 2 + 4 * s;   // the shadow's half width: the figure's own (the art director's 76 for a 166 tall juvenile)
  ell(cx - hw - 2 * s, foot - 12 * s, cx + hw - 2 * s, foot + 9 * s, 185); ell(cx - 0.66 * hw, foot - 8 * s, cx + 0.61 * hw, foot + 4 * s, 230);
  const shb = blur(sh, W, H, Math.max(0.6, 7 * s));
  for (let i = 0; i < shb.length; i++) { const a = Math.min(255, shb[i]) / 255; if (a > 0.004) over(out, i * 4, 18, 12, 6, a); }
  for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) { const X = x + x0, Y = y + y0, i = (y * fw + x) * 4; if (X < 0 || Y < 0 || X >= W || Y >= H || fig[i + 3] === 0) continue; over(out, (Y * W + X) * 4, lit[i], lit[i + 1], lit[i + 2], fig[i + 3] / 255); }
  // 4. the feet sunk into the moss: the scene's brighter strands, in front, over the feet's lowest rows, in the same shadow
  if (bg) {
    const r0 = foot - Math.max(1, Math.round(10 * s)), r1 = foot + Math.max(1, Math.round(3 * s)), bh = r1 - r0, bw = fw;
    const L = new Float32Array(bw * bh), O = new Float32Array(bw * bh * 3), ok = new Uint8Array(bw * bh);
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) { const X = x + x0, Y = y + r0, bx = X - bg.x, by = Y - bg.y; if (bx < 0 || by < 0 || bx >= bg.w || by >= bg.h) continue; const i = (by * bg.w + bx) * 4; ok[y * bw + x] = 1; for (let c = 0; c < 3; c++) O[(y * bw + x) * 3 + c] = bg.rgba[i + c]; L[y * bw + x] = bg.rgba[i] * 0.3 + bg.rgba[i + 1] * 0.59 + bg.rgba[i + 2] * 0.11; }
    const local = boxBlur(L, bw, bh, Math.max(1, Math.round(4 * s)));
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
      const k = y * bw + x; if (!ok[k]) continue; const X = x + x0, Y = y + r0; if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
      const fy = Y - y0, fa = fy >= 0 && fy < fh ? al[fy * fw + x] : 0; if (fa <= 0.3) continue;
      const blade = Math.min(1, Math.max(0, (L[k] - local[k] - 4) / 18)), fade = Math.min(1, Math.max(0, (y - 2 * s) / (6 * s))), m = blade * fade; if (m <= 0) continue;
      const sk = 1 - (Math.min(255, shb[Y * W + X]) / 255) * 0.93, o = (Y * W + X) * 4;
      over(out, o, O[k * 3] * sk, O[k * 3 + 1] * sk, O[k * 3 + 2] * sk, m);
    }
  }
  return out;
}
