// The founder's shadow, the derive of specs/face-arc-and-shadow.md §2 (T-20261016-125): one flat warm dark, the smoothstep mask, the penumbra tightening with what is known (the far edge softer, the light is below), the core, at the light's opacity.
// A port of masters-pods 8c141b5c `incubator-b/shadow.py` `derive(alpha, q, step)` with the edge rule (each blur's sigma at least 0.7 px) and of `proof.py` `founder_alpha` (the fit). Pure integer-weight arithmetic, so the sandbox, the Pi and the
// reference give the same bytes: each Gaussian is separable with taps to the radius scipy takes (int(4 σ + 0.5)), the edge mirrored (scipy's "reflect": d c b a | a b c d), its weights computed once per σ with Math.exp, normalised and rounded to
// integers in 1/65536 summing to 65536 (the centre tap takes the remainder); the resample is Lanczos-3 in Pillow's convention (the kernel widened by 1/k when reducing), a horizontal pass then a vertical one, each stored as bytes.
export const SHADOW_PARAMS = { FIT_W: 124, LIFT: 10, MASK_LO: 0.47, MASK_HI: 0.62, SIG0: 4.6, SIG_Q: 4.0, READY_K: 1.0, TOP_K: 1.45, BOT_K: 0.7, CORE: 1.3, SIGMA_MIN: 0.7, SHADOW_RGB: [36, 22, 14] };
export const SHADOW_P = { cool: 25, warm: 45, glowing: 65, ready: 80 };
export const BOX = [160, 192];
const W = BOX[0], H = BOX[1], ONE = 65536;

// integer weights in 1/65536 that sum to 65536 (the centre tap takes the remainder)
function intWeights(f, radius) {
  const raw = []; let sum = 0; for (let i = -radius; i <= radius; i++) { const v = f(i); raw.push(v); sum += v; }
  const w = raw.map((v) => Math.round((v / sum) * ONE)), c = radius; w[c] = ONE - (w.reduce((a, b) => a + b, 0) - w[c]); return w;
}
const reflect = (i, n) => { while (i < 0 || i >= n) i = i < 0 ? -i - 1 : 2 * n - 1 - i; return i; };
// a separable Gaussian of a w × h float plane, scipy's gaussian_filter (truncate 4, mode reflect), integer weights
export function gaussian(plane, w, h, sigma) {
  const radius = Math.floor(4 * sigma + 0.5), wt = intWeights((i) => Math.exp((-0.5 * i * i) / (sigma * sigma)), radius), tmp = new Float64Array(w * h), out = new Float64Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0; for (let k = -radius; k <= radius; k++) s += wt[k + radius] * plane[y * w + reflect(x + k, w)]; tmp[y * w + x] = s / ONE; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0; for (let k = -radius; k <= radius; k++) s += wt[k + radius] * tmp[reflect(y + k, h) * w + x]; out[y * w + x] = s / ONE; }
  return out;
}
// round half to even (numpy's rint)
const rint = (v) => { const f = Math.floor(v), d = v - f; return d < 0.5 ? f : d > 0.5 ? f + 1 : f % 2 === 0 ? f : f + 1; };

// derive(alpha, q, step): alpha a 160 × 192 float plane 0..1, q the known fraction, step cool|warm|glowing|ready → 160 × 192 RGBA bytes, straight alpha
export function deriveShadow(alpha, q, step, p = SHADOW_PARAMS) {
  const P = SHADOW_P[step]; if (P == null) throw new Error(`shadow: unknown step ${step}`);
  const m = new Float64Array(W * H); for (let i = 0; i < m.length; i++) { const t = Math.min(1, Math.max(0, (alpha[i] - p.MASK_LO) / (p.MASK_HI - p.MASK_LO))); m[i] = t * t * (3 - 2 * t); }
  const sig = (p.SIG0 - p.SIG_Q * q) * (step === "ready" ? p.READY_K : 1), top = gaussian(m, W, H, Math.max(p.SIGMA_MIN, sig * p.TOP_K)), bot = gaussian(m, W, H, Math.max(p.SIGMA_MIN, sig * p.BOT_K));
  const out = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) { const t = y / (H - 1); for (let x = 0; x < W; x++) { const i = y * W + x, a = Math.min(1, (top[i] * (1 - t) + bot[i] * t) * p.CORE); out[i * 4] = p.SHADOW_RGB[0]; out[i * 4 + 1] = p.SHADOW_RGB[1]; out[i * 4 + 2] = p.SHADOW_RGB[2]; out[i * 4 + 3] = Math.floor((rint(a * 255) * P + 50) / 100); } }
  return out;
}

// Lanczos-3 weights of one output pixel, Pillow's convention: the kernel widened by the scale when reducing, the weights normalised
const lanczos = (x) => { if (x === 0) return 1; if (x <= -3 || x >= 3) return 0; const px = Math.PI * x; return (3 * Math.sin(px) * Math.sin(px / 3)) / (px * px); };
function taps(inN, outN) {
  const scale = inN / outN, fs = Math.max(1, scale), support = 3 * fs, out = [];
  for (let xx = 0; xx < outN; xx++) {
    const center = (xx + 0.5) * scale, x0 = Math.max(0, Math.floor(center - support + 0.5)), x1 = Math.min(inN, Math.floor(center + support + 0.5)), w = []; let sum = 0;
    for (let x = x0; x < x1; x++) { const v = lanczos((x - center + 0.5) / fs); w.push(v); sum += v; }
    out.push({ x0, w: w.map((v) => v / sum) });
  }
  return out;
}
const clip8 = (v) => Math.min(255, Math.max(0, Math.floor(v + 0.5)));
// the crop of a byte plane resampled to ow × oh: a horizontal pass, bytes, then a vertical pass, bytes (Pillow's two passes on an 8-bit image)
export function resample(plane, iw, ih, ow, oh) {
  const hx = taps(iw, ow), vy = taps(ih, oh), mid = new Uint8Array(ow * ih), out = new Uint8Array(ow * oh);
  if (ow === iw) mid.set(plane); else for (let y = 0; y < ih; y++) for (let x = 0; x < ow; x++) { const t = hx[x]; let s = 0; for (let k = 0; k < t.w.length; k++) s += t.w[k] * plane[y * iw + t.x0 + k]; mid[y * ow + x] = clip8(s); }
  if (oh === ih) out.set(mid); else for (let y = 0; y < oh; y++) for (let x = 0; x < ow; x++) { const t = vy[y]; let s = 0; for (let k = 0; k < t.w.length; k++) s += t.w[k] * mid[(t.x0 + k) * ow + x]; out[y * ow + x] = clip8(s); }
  return out;
}

// The founder's alpha fitted to the 160 × 192 box (proof.py founder_alpha): the box is the bounding box of alpha > 0.5 over the union of the layers (read or not), so a clearing never moves the body; the known layers' alpha (their per-pixel
// maximum) is cropped to it, scaled by k = min(FIT_W / width, 192 / height) to floor(w k) × floor(h k), centred, its feet LIFT px above the box's foot. `union` and `known` are byte alpha planes of w × h (the same plane for a flat picture).
export function fitAlpha(union, known, w, h, p = SHADOW_PARAMS) {
  let y0 = h, y1 = -1, x0 = w, x1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (union[y * w + x] > 127) { if (y < y0) y0 = y; if (y > y1) y1 = y; if (x < x0) x0 = x; if (x > x1) x1 = x; }   // alpha > 0.5 of 255: a byte of 128 or more
  const out = new Float64Array(W * H); if (y1 < 0) return out;
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1, k = Math.min(p.FIT_W / bw, H / bh), ow = Math.max(1, Math.floor(bw * k)), oh = Math.max(1, Math.floor(bh * k)), crop = new Uint8Array(bw * bh);
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) crop[y * bw + x] = known[(y0 + y) * w + x0 + x];
  const rs = resample(crop, bw, bh, ow, oh), ty = H - p.LIFT - oh, tx = Math.floor((W - ow) / 2);
  for (let y = 0; y < oh; y++) for (let x = 0; x < ow; x++) { const yy = ty + y, xx = tx + x; if (yy >= 0 && yy < H && xx >= 0 && xx < W) out[yy * W + xx] = rs[y * ow + x] / 255; }
  return out;
}
