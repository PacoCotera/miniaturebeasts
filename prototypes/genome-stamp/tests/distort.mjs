// Image distortions for the robustness tests (carried over from the genome-ring prototype). Images are {width, height, data RGBA}.
import { spawnSync } from "node:child_process";

const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

export function blank(w, h, rgb = [246, 244, 238]) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) { data[i * 4] = rgb[0]; data[i * 4 + 1] = rgb[1]; data[i * 4 + 2] = rgb[2]; data[i * 4 + 3] = 255; }
  return { width: w, height: h, data };
}

// Camera homography: a code of half-width srcR (source px, centred at srcC) seen
// with the plane tilted by `tilt` degrees about an in-plane axis at `axis`
// degrees, rotated by `rot` degrees, at distance d = srcR / rOverD, scaled so
// the half-width is about outR px, centred at (cx, cy).
export function cameraH({ srcC, srcR, outR, cx, cy, tilt = 0, axis = 0, rot = 0, rOverD = 0.15 }) {
  const t = (tilt * Math.PI) / 180, ax = (axis * Math.PI) / 180, g = (rot * Math.PI) / 180;
  // rotation: in-plane rotation g, then tilt t about the axis direction ax
  const ux = Math.cos(ax), uy = Math.sin(ax), c = Math.cos(t), s = Math.sin(t);
  const Rt = [
    [c + ux * ux * (1 - c), ux * uy * (1 - c), uy * s],
    [uy * ux * (1 - c), c + uy * uy * (1 - c), -ux * s],
    [-uy * s, ux * s, c],
  ];
  const Rg = [[Math.cos(g), -Math.sin(g), 0], [Math.sin(g), Math.cos(g), 0], [0, 0, 1]];
  const R = Rt.map((row) => [0, 1, 2].map((j) => row.reduce((a, v, k) => a + v * Rg[k][j], 0)));
  const d = srcR / rOverD, f = (outR * d) / srcR;
  // plane (u - srcC, v - srcC, 0) -> camera R*X + (0,0,d) -> image f*x/z + c
  const H = [
    f * R[0][0] + cx * R[2][0], f * R[0][1] + cx * R[2][1], f * 0 + cx * d,
    f * R[1][0] + cy * R[2][0], f * R[1][1] + cy * R[2][1], cy * d,
    R[2][0], R[2][1], d,
  ];
  // compose with the translation u -> u - srcC
  const T = [1, 0, -srcC, 0, 1, -srcC, 0, 0, 1];
  return mul(H, T);
}

function mul(A, B) {
  const C = new Array(9).fill(0);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) C[i * 3 + j] += A[i * 3 + k] * B[k * 3 + j];
  return C;
}
function inv(m) {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g, det = a * A + b * B + c * C;
  return [A / det, -(b * i - c * h) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, -(a * f - c * d) / det, C / det, -(a * h - b * g) / det, (a * e - b * d) / det];
}

// Warp src into a new w x h image through H (src -> dst), ss x ss supersampling.
export function warp(src, H, w, h, { ss = 3, bg = [246, 244, 238] } = {}) {
  const Hi = inv(H);
  const out = blank(w, h, bg);
  const { width: sw, height: sh, data: sd } = src;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0;
      for (let j = 0; j < ss; j++)
        for (let i = 0; i < ss; i++) {
          const X = x + (i + 0.5) / ss - 0.5, Y = y + (j + 0.5) / ss - 0.5;
          const z = Hi[6] * X + Hi[7] * Y + Hi[8];
          const u = (Hi[0] * X + Hi[1] * Y + Hi[2]) / z, v = (Hi[3] * X + Hi[4] * Y + Hi[5]) / z;
          if (u < 0 || v < 0 || u > sw - 1 || v > sh - 1) { r += bg[0]; g += bg[1]; b += bg[2]; continue; }
          const u0 = Math.min(sw - 2, u | 0), v0 = Math.min(sh - 2, v | 0), fu = u - u0, fv = v - v0;
          const p = (v0 * sw + u0) * 4;
          for (let c = 0; c < 3; c++) {
            const val = (sd[p + c] * (1 - fu) + sd[p + 4 + c] * fu) * (1 - fv) + (sd[p + sw * 4 + c] * (1 - fu) + sd[p + sw * 4 + 4 + c] * fu) * fv;
            if (c === 0) r += val; else if (c === 1) g += val; else b += val;
          }
        }
      const o = (y * w + x) * 4, n = ss * ss;
      out.data[o] = r / n; out.data[o + 1] = g / n; out.data[o + 2] = b / n;
    }
  return out;
}

export function gaussianBlur(img, sigma) {
  if (sigma <= 0) return img;
  const rad = Math.ceil(sigma * 3), k = [];
  let s = 0;
  for (let i = -rad; i <= rad; i++) { const v = Math.exp((-i * i) / (2 * sigma * sigma)); k.push(v); s += v; }
  const K = k.map((v) => v / s);
  const { width: w, height: h } = img;
  const tmp = new Float32Array(w * h * 3), out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      for (let c = 0; c < 3; c++) {
        let a = 0;
        for (let i = -rad; i <= rad; i++) a += K[i + rad] * img.data[(y * w + Math.min(w - 1, Math.max(0, x + i))) * 4 + c];
        tmp[(y * w + x) * 3 + c] = a;
      }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      for (let c = 0; c < 3; c++) {
        let a = 0;
        for (let i = -rad; i <= rad; i++) a += K[i + rad] * tmp[(Math.min(h - 1, Math.max(0, y + i)) * w + x) * 3 + c];
        out[(y * w + x) * 4 + c] = a;
      }
      out[(y * w + x) * 4 + 3] = 255;
    }
  return { width: w, height: h, data: out };
}

// Uneven lighting: brightness falls from 100% to `low` along a direction, times a vignette.
export function lighting(img, { low = 0.35, angle = 30, vignette = 0.25 } = {}) {
  const { width: w, height: h, data } = img;
  const out = new Uint8ClampedArray(data);
  const a = (angle * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
  const half = (Math.abs(ca) * w + Math.abs(sa) * h) / 2;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const t = (((x - w / 2) * ca + (y - h / 2) * sa) / half + 1) / 2; // 0..1
      const rr = Math.hypot((x - w / 2) / (w / 2), (y - h / 2) / (h / 2)) / Math.SQRT2;
      const k = (1 - (1 - low) * t) * (1 - vignette * rr * rr);
      const o = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) out[o + c] = clamp(data[o + c] * k);
    }
  return { width: w, height: h, data: out };
}

export function monochrome(img) {
  const out = new Uint8ClampedArray(img.data);
  for (let i = 0; i < out.length; i += 4) {
    const v = 0.299 * out[i] + 0.587 * out[i + 1] + 0.114 * out[i + 2];
    out[i] = out[i + 1] = out[i + 2] = v;
  }
  return { width: img.width, height: img.height, data: out };
}

export function noise(img, sigma, rand) {
  const out = new Uint8ClampedArray(img.data);
  for (let i = 0; i < out.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const u = rand() || 1e-9, v = rand();
      out[i + c] = clamp(out[i + c] + sigma * 255 * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v));
    }
  }
  return { width: img.width, height: img.height, data: out };
}

// JPEG round trip through ImageMagick (4:2:0 chroma, as phones and browsers do).
export function jpeg(img, quality = 60) {
  const { width: w, height: h, data } = img;
  const ppm = Buffer.alloc(w * h * 3);
  for (let i = 0; i < w * h; i++) { ppm[i * 3] = data[i * 4]; ppm[i * 3 + 1] = data[i * 4 + 1]; ppm[i * 3 + 2] = data[i * 4 + 2]; }
  const inp = Buffer.concat([Buffer.from(`P6\n${w} ${h}\n255\n`), ppm]);
  const j = spawnSync("convert", ["ppm:-", "-sampling-factor", "4:2:0", "-quality", String(quality), "jpg:-"], { input: inp, maxBuffer: 1 << 28 });
  if (j.status !== 0) throw new Error("convert failed: " + j.stderr);
  const back = spawnSync("convert", ["jpg:-", "-depth", "8", "ppm:-"], { input: j.stdout, maxBuffer: 1 << 28 });
  const buf = back.stdout;
  // parse P6 header
  let p = 0, fields = [];
  while (fields.length < 4) {
    while (buf[p] === 0x20 || buf[p] === 0x0a) p++;
    let s = "";
    while (buf[p] !== 0x20 && buf[p] !== 0x0a) s += String.fromCharCode(buf[p++]);
    fields.push(s);
  }
  p++;
  const out = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) { out[i * 4] = buf[p + i * 3]; out[i * 4 + 1] = buf[p + i * 3 + 1]; out[i * 4 + 2] = buf[p + i * 3 + 2]; out[i * 4 + 3] = 255; }
  return { width: w, height: h, data: out, bytes: j.stdout.length };
}

// Thermal print dot gain: blur the bilevel print a little and re-threshold
// slightly dark (burned dots spread).
export function dotGain(img, sigma = 0.35, threshold = 150) {
  const b = gaussianBlur(img, sigma);
  for (let i = 0; i < b.data.length; i += 4) { const v = b.data[i] < threshold ? 0 : 255; b.data[i] = b.data[i + 1] = b.data[i + 2] = v; }
  return b;
}
