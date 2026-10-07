// Ring decoder: image -> genome, with the check verified. Plain JS (no Node
// APIs) so the browser scan page runs the same code.
//
// Pipeline: luminance -> adaptive threshold -> ring-shaped components -> rim
// ellipse -> sub-pixel rim edge + timing-circle points -> homography (handles
// perspective) -> timing ticks give the slot count and phase (Fourier) and the
// notch gives slot 1 -> each ring is read long/short against its own base
// (lighting- and ink-independent), with a 3-tap ISI Viterbi for blur -> header
// -> species frame -> both tracks -> CRC.
import { LAYOUT, slotAngle } from "./geometry.mjs";
import { slotLayout, bitsToGenome, parseHeader, NOTCH_SLOTS, HEADER_BITS, MIN_SLOTS } from "./codec.mjs";
import { frameFor } from "./frames.mjs";

const TAU = 2 * Math.PI;

// ---------- image helpers ----------
export function toLuma(img) {
  const { width: w, height: h, data } = img;
  const L = new Float32Array(w * h);
  for (let i = 0, j = 0; i < L.length; i++, j += 4) L[i] = (0.299 * data[j] + 0.587 * data[j + 1] + 0.114 * data[j + 2]) / 255;
  return { w, h, L };
}

function boxDown(g, f) {
  if (f <= 1) return g;
  const w = Math.floor(g.w / f), h = Math.floor(g.h / f), L = new Float32Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let yy = 0; yy < f; yy++) for (let xx = 0; xx < f; xx++) s += g.L[(y * f + yy) * g.w + x * f + xx];
      L[y * w + x] = s / (f * f);
    }
  return { w, h, L, f };
}

function sampler(g) {
  const { w, h, L } = g;
  return (x, y) => {
    if (x < 0) x = 0; else if (x > w - 1.001) x = w - 1.001;
    if (y < 0) y = 0; else if (y > h - 1.001) y = h - 1.001;
    const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0, i = y0 * w + x0;
    return (L[i] * (1 - fx) + L[i + 1] * fx) * (1 - fy) + (L[i + w] * (1 - fx) + L[i + w + 1] * fx) * fy;
  };
}

// ---------- small linear algebra ----------
function solve(A, b) {
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    if (Math.abs(M[c][c]) < 1e-14) return null;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((r, i) => r[n] / r[i]);
}

const inv3 = (m) => {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  return [A / det, -(b * i - c * h) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, -(a * f - c * d) / det, C / det, -(a * h - b * g) / det, (a * e - b * d) / det];
};
const apply = (H, x, y) => {
  const z = H[6] * x + H[7] * y + H[8];
  return [(H[0] * x + H[1] * y + H[2]) / z, (H[3] * x + H[4] * y + H[5]) / z];
};

// Conic fit A x² + B xy + C y² + D x + E y = 1 around the points' mean -> ellipse.
function fitEllipse(pts) {
  if (pts.length < 6) return null;
  let mx = 0, my = 0;
  for (const [x, y] of pts) { mx += x; my += y; }
  mx /= pts.length; my /= pts.length;
  let s = 0;
  for (const [x, y] of pts) s += Math.hypot(x - mx, y - my);
  s /= pts.length;
  const N = Array.from({ length: 5 }, () => new Array(5).fill(0)), v = new Array(5).fill(0);
  for (const [px, py] of pts) {
    const x = (px - mx) / s, y = (py - my) / s, r = [x * x, x * y, y * y, x, y];
    for (let i = 0; i < 5; i++) { v[i] += r[i]; for (let j = 0; j < 5; j++) N[i][j] += r[i] * r[j]; }
  }
  const q = solve(N, v);
  if (!q) return null;
  const [A, B, C, D, E] = q;
  const c = solve([[2 * A, B], [B, 2 * C]], [-D, -E]);
  if (!c) return null;
  const [x0, y0] = c;
  const k = 1 - (A * x0 * x0 + B * x0 * y0 + C * y0 * y0 + D * x0 + E * y0); // A x'² + B x'y' + C y'² = k
  const a = A / k, b = B / 2 / k, d = C / k;
  const tr = a + d, det = a * d - b * b;
  if (det <= 0 || tr <= 0) return null;
  const disc = Math.sqrt(Math.max(0, (tr * tr) / 4 - det));
  const l1 = tr / 2 - disc, l2 = tr / 2 + disc; // l1 <= l2 -> axis1 is the major
  const ang = Math.abs(b) > 1e-12 ? Math.atan2(l1 - a, b) : a <= d ? 0 : Math.PI / 2;
  const ax1 = (1 / Math.sqrt(l1)) * s, ax2 = (1 / Math.sqrt(l2)) * s;
  const cx = mx + x0 * s, cy = my + y0 * s;
  // unit circle -> ellipse, orientation preserving
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const H = [ca * ax1, -sa * ax2, cx, sa * ax1, ca * ax2, cy, 0, 0, 1];
  return { cx, cy, ax1, ax2, ang, H };
}

function ellipseResidual(e, pts) {
  const Hi = inv3(e.H);
  return pts.map(([x, y]) => {
    const [u, v] = apply(Hi, x, y);
    return (Math.hypot(u, v) - 1) * Math.sqrt(e.ax1 * e.ax2);
  });
}

function robustEllipse(pts) {
  let e = fitEllipse(pts);
  for (let it = 0; it < 3 && e; it++) {
    const r = ellipseResidual(e, pts).map(Math.abs);
    const med = [...r].sort((a, b) => a - b)[r.length >> 1];
    const keep = pts.filter((_, i) => r[i] <= Math.max(1, 3 * med));
    if (keep.length === pts.length || keep.length < 12) break;
    pts = keep;
    e = fitEllipse(pts);
  }
  if (e) e.rms = Math.sqrt(ellipseResidual(e, pts).reduce((s, v) => s + v * v, 0) / pts.length);
  return e;
}

// ---------- candidate rings ----------
function findCandidates(g) {
  const { w, h, L } = g;
  const I = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) { row += L[y * w + x]; I[(y + 1) * (w + 1) + x + 1] = I[y * (w + 1) + x + 1] + row; }
  }
  const rad = Math.max(4, Math.round(Math.min(w, h) / 14));
  const dark = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - rad), y1 = Math.min(h, y + rad + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - rad), x1 = Math.min(w, x + rad + 1);
      const m = (I[y1 * (w + 1) + x1] - I[y0 * (w + 1) + x1] - I[y1 * (w + 1) + x0] + I[y0 * (w + 1) + x0]) / ((x1 - x0) * (y1 - y0));
      const v = L[y * w + x];
      dark[y * w + x] = v < m * 0.85 && v < m - 0.04 ? 1 : 0;
    }
  }
  const label = new Int32Array(w * h).fill(-1);
  const comps = [];
  const stack = [];
  for (let s = 0; s < w * h; s++) {
    if (!dark[s] || label[s] >= 0) continue;
    const id = comps.length;
    let n = 0, x0 = w, x1 = 0, y0 = h, y1 = 0;
    label[s] = id; stack.push(s);
    while (stack.length) {
      const p = stack.pop(), px = p % w, py = (p / w) | 0;
      n++; if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const qx = px + dx, qy = py + dy;
          if (qx < 0 || qy < 0 || qx >= w || qy >= h) continue;
          const q = qy * w + qx;
          if (dark[q] && label[q] < 0) { label[q] = id; stack.push(q); }
        }
    }
    comps.push({ id, n, x0, x1, y0, y1 });
  }
  const out = [];
  for (const c of comps) {
    const bw = c.x1 - c.x0 + 1, bh = c.y1 - c.y0 + 1;
    if (Math.min(bw, bh) < 20 || Math.max(bw, bh) / Math.min(bw, bh) > 2.2) continue;
    if (c.n > 0.6 * bw * bh) continue; // a ring is mostly hollow
    const cx = (c.x0 + c.x1) / 2, cy = (c.y0 + c.y1) / 2, R = Math.hypot(bw, bh) / 2 + 2;
    const pts = [];
    const rays = 128;
    for (let i = 0; i < rays; i++) {
      const a = (TAU * i) / rays, dx = Math.cos(a), dy = Math.sin(a);
      for (let r = R; r > 2; r -= 0.5) {
        const x = Math.round(cx + dx * r), y = Math.round(cy + dy * r);
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        if (label[y * w + x] === c.id) { pts.push([x + dx * 0.5, y + dy * 0.5]); break; }
      }
    }
    if (pts.length < rays * 0.8) continue;
    const e = robustEllipse(pts);
    if (!e || e.ax2 / e.ax1 < 0.45 || e.rms > 0.06 * e.ax1 + 0.8) continue;
    out.push({ e, size: e.ax1, n: c.n });
  }
  out.sort((a, b) => b.size - a.size);
  return out;
}

// ---------- geometry refinement ----------
function refineRim(S, H0, Rpx) {
  // sub-pixel outer edge of the rim along 180 rays (r = 1 by definition):
  // walk inward from outside the ring, past any clutter, to the first
  // light-to-dark crossing
  const pts = [];
  const step = 0.25 / Rpx;
  for (let i = 0; i < 180; i++) {
    const a = (TAU * i) / 180, ca = Math.sin(a), sa = -Math.cos(a);
    const prof = [];
    for (let r = 0.86; r <= 1.14; r += step) prof.push([r, S(...apply(H0, r * ca, r * sa))]);
    let black = 1, white = 0;
    for (const [r, v] of prof) {
      if (r < 1.04 && v < black) black = v;
      if (r > 0.97 && v > white) white = v;
    }
    if (white - black < 0.08) continue;
    const mid = (black + white) / 2;
    let j = prof.length - 1, seenWhite = false;
    for (; j > 0; j--) {
      if (prof[j][1] > mid) seenWhite = true;
      else if (seenWhite) break;
    }
    if (j <= 0) continue;
    const t = (mid - prof[j][1]) / (prof[j + 1][1] - prof[j][1] || 1);
    const r = prof[j][0] + t * step;
    pts.push(apply(H0, r * ca, r * sa));
  }
  return pts;
}

// Timing-circle points for the homography: the ink centroid across a radial
// window, compared with its expected value. Pass 1 uses a wide window (the
// first estimate may be off by a few percent); later passes a narrow one that
// holds the solid circle and only a sliver of the ticks.
const REF_WIDE = [0.553, 0.652], REF_NARROW = [0.548, 0.603];
function expectedRho([w0, w1]) {
  const part = ([a, b], k) => { const lo = Math.max(a, w0), hi = Math.min(b, w1); return hi > lo ? [(hi - lo) * k, ((hi - lo) * k * (lo + hi)) / 2] : [0, 0]; };
  const [m1, s1] = part(LAYOUT.ref, 1), [m2, s2] = part(LAYOUT.ticks, LAYOUT.tickDuty);
  return (s1 + s2) / (m1 + m2);
}

function refPoints(S, H, Rpx, REF_WIN) {
  const pts = [];
  const nr = Math.max(8, Math.round((REF_WIN[1] - REF_WIN[0]) * Rpx * 2));
  const rows = [];
  for (let i = 0; i < 180; i++) {
    let sw = 0, swr = 0;
    const a0 = (TAU * i) / 180;
    const prof = new Float64Array(nr + 1);
    for (let s = -3; s <= 3; s++) {
      const a = a0 + (s * TAU) / 180 / 7, ca = Math.sin(a), sa = -Math.cos(a);
      for (let j = 0; j <= nr; j++) {
        const r = REF_WIN[0] + ((REF_WIN[1] - REF_WIN[0]) * j) / nr;
        prof[j] += S(...apply(H, r * ca, r * sa)) / 7;
      }
    }
    let white = 0;
    for (const v of prof) white = Math.max(white, v);
    for (let j = 0; j <= nr; j++) {
      const r = REF_WIN[0] + ((REF_WIN[1] - REF_WIN[0]) * j) / nr;
      const ink = Math.max(0, white - prof[j]);
      sw += ink; swr += ink * r;
    }
    rows.push({ a: a0, sw, rho: sw > 0 ? swr / sw : 0 });
  }
  const med = [...rows.map((r) => r.sw)].sort((a, b) => a - b)[90];
  for (const r of rows) if (r.sw > 0.5 * med) pts.push({ a: r.a, rho: r.rho });
  return pts;
}

// Levenberg–Marquardt fit of the homography unit-plane -> image to rim points
// (radius 1) and timing-circle points (radius REF_RHO). Works in coordinates
// centred and scaled by the rim ellipse.
function fitHomography(e, rimPts, refImgPts, REF_RHO) {
  const s = Math.sqrt(e.ax1 * e.ax2), cx = e.cx, cy = e.cy;
  const N = (p) => [(p[0] - cx) / s, (p[1] - cy) / s];
  const obs = [...rimPts.map((p) => [...N(p), 1]), ...refImgPts.map((p) => [...N(p), REF_RHO])];
  const h0 = [e.H[0] / s, e.H[1] / s, 0, e.H[3] / s, e.H[4] / s, 0, 0, 0];
  const lam = 1e-3 * Math.sqrt(obs.length);
  const resid = (h) => {
    const Hi = inv3([...h, 1]);
    const r = obs.map(([x, y, rho]) => { const [u, v] = apply(Hi, x, y); return Math.hypot(u, v) - rho; });
    for (let k = 0; k < 8; k++) r.push(lam * (h[k] - h0[k]));
    return r;
  };
  let h = [...h0], r = resid(h), cost = r.reduce((a, v) => a + v * v, 0), mu = 1e-3;
  for (let it = 0; it < 40; it++) {
    const J = [];
    for (let k = 0; k < 8; k++) {
      const hk = [...h]; hk[k] += 1e-6;
      const rk = resid(hk);
      J.push(rk.map((v, i) => (v - r[i]) / 1e-6));
    }
    const A = Array.from({ length: 8 }, (_, i) => Array.from({ length: 8 }, (_, j) => J[i].reduce((a, v, n) => a + v * J[j][n], 0)));
    const g = J.map((col) => -col.reduce((a, v, n) => a + v * r[n], 0));
    let improved = false;
    for (let tries = 0; tries < 8; tries++) {
      const Ad = A.map((row, i) => row.map((v, j) => (i === j ? v * (1 + mu) + 1e-12 : v)));
      const d = solve(Ad, g);
      if (!d) { mu *= 10; continue; }
      const hn = h.map((v, k) => v + d[k]);
      const rn = resid(hn), cn = rn.reduce((a, v) => a + v * v, 0);
      if (cn < cost) { h = hn; r = rn; improved = cost - cn > 1e-12; cost = cn; mu = Math.max(1e-7, mu / 3); break; }
      mu *= 10;
    }
    if (!improved) break;
  }
  // back to image coordinates: p = c + s * (H q)
  const H = [h[0] * s + cx * h[6], h[1] * s + cx * h[7], h[2] * s + cx, h[3] * s + cy * h[6], h[4] * s + cy * h[7], h[5] * s + cy, h[6], h[7], 1];
  return { H, rms: Math.sqrt(cost / obs.length) };
}

// Projective map of the unit disc onto itself taking 0 to p (a Lorentz boost
// in homogeneous coordinates; it preserves x² + y² = w²).
function boost(px, py) {
  const b = Math.hypot(px, py);
  if (b < 1e-9) return [1, 0, 0, 0, 1, 0, 0, 0, 1];
  const nx = px / b, ny = py / b, g = 1 / Math.sqrt(1 - b * b);
  return [1 + (g - 1) * nx * nx, (g - 1) * nx * ny, g * b * nx, (g - 1) * nx * ny, 1 + (g - 1) * ny * ny, g * b * ny, g * b * nx, g * b * ny, g];
}
const mul3 = (A, B) => { const C = new Array(9).fill(0); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) C[i * 3 + j] += A[i * 3 + k] * B[k * 3 + j]; return C; };

function searchCentre(S, A) {
  const rc = (LAYOUT.ref[0] + LAYOUT.ref[1]) / 2, gin = (LAYOUT.inner.ext[1] + LAYOUT.ref[0]) / 2, gout = (LAYOUT.ticks[1] + LAYOUT.outer.base[0]) / 2;
  const na = 180, trig = Array.from({ length: na }, (_, i) => [Math.sin((TAU * i) / na), -Math.cos((TAU * i) / na)]);
  const score = (px, py) => {
    const H = mul3(A, boost(px, py));
    let s = 0;
    for (const [c, d] of trig) s += (S(...apply(H, gin * c, gin * d)) + S(...apply(H, gout * c, gout * d))) / 2 - S(...apply(H, rc * c, rc * d));
    return s / na;
  };
  let best = [0, 0], bs = score(0, 0);
  for (const [step, span] of [[0.04, 0.44], [0.01, 0.04], [0.0025, 0.01]]) {
    const [bx, by] = best;
    for (let y = -span; y <= span + 1e-9; y += step)
      for (let x = -span; x <= span + 1e-9; x += step) {
        const px = bx + x, py = by + y;
        if (Math.hypot(px, py) > 0.45) continue;
        const v = score(px, py);
        if (v > bs) { bs = v; best = [px, py]; }
      }
  }
  return mul3(A, boost(...best));
}

// ---------- reading ----------
function zoneSampler(S, H, Rpx) {
  // mean luminance over the inner part of a radial zone, across a small angle
  return (r0, r1, a, halfw) => {
    const nr = 3, na = 3;
    let s = 0;
    for (let i = 0; i < nr; i++) {
      const r = r0 + (r1 - r0) * (0.2 + (0.6 * i) / (nr - 1));
      for (let j = 0; j < na; j++) {
        const t = a + halfw * ((2 * j) / (na - 1) - 1);
        s += S(...apply(H, r * Math.sin(t), -r * Math.cos(t)));
      }
    }
    return s / (nr * na);
  };
}

function profile(S, H, r0, r1, n) {
  const p = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const a = (TAU * i) / n;
    let s = 0;
    for (let k = 0; k < 3; k++) {
      const r = r0 + ((r1 - r0) * (k + 0.5)) / 3;
      s += S(...apply(H, r * Math.sin(a), -r * Math.cos(a)));
    }
    p[i] = s / 3;
  }
  return p;
}

// slot count and rotation from the timing ticks + the notch. The dash ring's
// always-drawn bases sit on the same slot grid at a larger radius, so both
// rings vote (high-passed, energy-normalised Fourier sums).
function highpass(p) {
  const n = p.length, w = Math.max(4, Math.round(n / 28)), out = new Float64Array(n);
  let s = 0;
  for (let k = -w; k <= w; k++) s += p[(k + n) % n];
  for (let i = 0; i < n; i++) {
    out[i] = s / (2 * w + 1) - p[i]; // ink above the local mean
    s += p[(i + w + 1) % n] - p[(i - w + n) % n];
  }
  let e = 0;
  for (const v of out) e += v * v;
  const k = 1 / Math.sqrt(e || 1);
  for (let i = 0; i < n; i++) out[i] *= k;
  return out;
}

function findSlots(S, H, n) {
  const T = highpass(profile(S, H, LAYOUT.ticks[0] + 0.005, LAYOUT.ticks[1] - 0.005, n));
  const Dz = highpass(profile(S, H, LAYOUT.dash.base[0] + 0.008, LAYOUT.dash.base[1] - 0.008, n));
  const cosT = new Float64Array(n), sinT = new Float64Array(n);
  for (let i = 0; i < n; i++) { cosT[i] = Math.cos((TAU * i) / n); sinT[i] = Math.sin((TAU * i) / n); }
  let best = { m: 0, p: -1, phase: 0 };
  for (let m = MIN_SLOTS; m <= Math.min(400, n / 6); m++) {
    let re = 0, im = 0;
    for (let i = 0, idx = 0; i < n; i++, idx = (idx + m) % n) { const v = T[i] + Dz[i]; re += v * cosT[idx]; im -= v * sinT[idx]; }
    const p = re * re + im * im;
    if (p > best.p) best = { m, p, phase: Math.atan2(im, re) };
  }
  const Sl = best.m, pitch = TAU / Sl;
  // tick centres at angle a where Sl*a = -phase (mod 2π)
  const tick0 = ((((-best.phase / Sl) % pitch) + pitch) % pitch);
  // notch: the stretch with no timing circle and no dashes. Ink is measured
  // as contrast against the white gaps beside it and the rim's black at the
  // same angle, so a glare spot (bright, low contrast) is not taken for it.
  const P = (r0, r1) => profile(S, H, r0, r1, n);
  const Rf = P(LAYOUT.ref[0] + 0.004, LAYOUT.ref[1] - 0.004);
  const Db = P(LAYOUT.dash.base[0] + 0.01, LAYOUT.dash.base[1] - 0.01);
  const g1 = P(LAYOUT.inner.ext[1] + 0.004, LAYOUT.ref[0] - 0.004);
  const g2 = P(LAYOUT.dash.base[1] + 0.004, LAYOUT.rim[0] - 0.004);
  const Bk = P(LAYOUT.rim[0] + 0.01, LAYOUT.rim[1] - 0.01);
  const sc = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const w = Math.max(g1[i], g2[i]), den = Math.max(0.04, w - Bk[i]);
    sc[i] = Math.max(0, (w - Rf[i]) / den) + Math.max(0, (w - Db[i]) / den);
  }
  const win = Math.max(1, Math.round(n / Sl));
  let bi = 0, bv = 1e9;
  for (let i = 0; i < n; i++) {
    let v = 0;
    for (let k = -win; k <= win; k++) v += sc[(i + k + n) % n];
    if (v < bv) { bv = v; bi = i; }
  }
  const sorted = Float64Array.from(sc).sort();
  const ringLevel = sorted[Math.floor(n * 0.6)], gapLevel = bv / (2 * win + 1), mid = (ringLevel + gapLevel) / 2;
  const lim = Math.round((2.5 * n) / Sl);
  let l = 0, r = 0;
  while (l < lim && sc[(bi - l - 1 + n) % n] < mid) l++;
  while (r < lim && sc[(bi + r + 1) % n] < mid) r++;
  const notchA = (TAU * (bi + (r - l) / 2)) / n;
  // snap the notch centre to the tick grid
  const j = Math.round((notchA - tick0) / pitch);
  const rot = tick0 + j * pitch;
  return { Sl, rot, pitch, n };
}

function refineAngles(S, H, Sl, rot, dir, Rpx) {
  const pitch = TAU / Sl;
  const off = new Float64Array(Sl);
  const ok = new Uint8Array(Sl);
  const r0 = LAYOUT.ticks[0] + 0.006, r1 = LAYOUT.ticks[1] - 0.006;
  const na = 15;
  for (let k = NOTCH_SLOTS; k < Sl; k++) {
    const a = rot + dir * (k - 1) * pitch;
    const vals = [];
    for (let j = 0; j < na; j++) {
      const da = pitch * (-0.5 + j / (na - 1));
      let s = 0;
      for (let q = 0; q < 2; q++) { const r = r0 + ((r1 - r0) * (q + 0.5)) / 2; s += S(...apply(H, r * Math.sin(a + da), -r * Math.cos(a + da))); }
      vals.push([da, s / 2]);
    }
    const white = Math.max(...vals.map((v) => v[1]));
    let sw = 0, swa = 0;
    for (const [da, v] of vals) { const ink = Math.max(0, white - v); sw += ink * ink; swa += ink * ink * da; }
    if (sw > 1e-6) { off[k] = swa / sw; ok[k] = 1; }
  }
  // robust smoothing: median of 5 neighbours, clamp to a third of a pitch
  const sm = new Float64Array(Sl);
  for (let k = 0; k < Sl; k++) {
    const v = [];
    for (let d = -2; d <= 2; d++) { const q = (k + d + Sl) % Sl; if (ok[q]) v.push(off[q]); }
    v.sort((a, b) => a - b);
    sm[k] = v.length ? Math.max(-pitch / 3, Math.min(pitch / 3, v[v.length >> 1])) : 0;
  }
  return Array.from({ length: Sl }, (_, k) => rot + dir * ((k - 1) * pitch + dir * sm[k]));
}

// Viterbi over a slot sequence with a 3-tap model n_k = a x_k + c (x_{k-1}+x_{k+1}) + d.
// known[k] = 0/1 fixes a slot; obs[k] = null for slots without an observation.
function viterbi(obs, known, a, c, d) {
  const n = obs.length;
  const allowed = (k, v) => k < 0 || k >= n ? v === 0 : known[k] === null || known[k] === v;
  // state at step k: (x_{k-1}, x_k); cost of obs k is added when x_{k+1} is chosen
  let cost = new Map(), back = [];
  for (const p of [0, 1]) for (const q of [0, 1]) if (allowed(-1, p) && allowed(0, q)) cost.set(`${p}${q}`, 0);
  for (let k = 0; k < n; k++) {
    const next = new Map(), bk = new Map();
    for (const [st, cst] of cost) {
      const p = +st[0], q = +st[1];
      for (const r of [0, 1]) {
        if (!allowed(k + 1, r)) continue;
        let add = 0;
        if (obs[k] !== null) { const e = obs[k] - (a * q + c * (p + r) + d); add = e * e; }
        const key = `${q}${r}`, v = cst + add;
        if (!next.has(key) || v < next.get(key)) { next.set(key, v); bk.set(key, st); }
      }
    }
    back.push(bk);
    cost = next;
  }
  let st = [...cost.entries()].sort((x, y) => x[1] - y[1])[0][0];
  const x = new Array(n);
  for (let k = n - 1; k >= 0; k--) { x[k] = +st[0]; st = back[k].get(st); }
  return x;
}

function readZone(zs, angles, pitch, zone, present, known) {
  // present[k]: slot carries a mark (base drawn); known[k]: fixed value or null
  const n = angles.length;
  const hw = pitch * 0.12;
  const t = new Array(n).fill(null);
  const lo = Math.min(zone.base[0], zone.ext[0]), hi = Math.max(zone.base[1], zone.ext[1]);
  for (let k = 0; k < n; k++) {
    if (!present[k]) continue;
    const a = angles[k];
    const e = zs(zone.ext[0], zone.ext[1], a, hw);
    const b = zs(zone.base[0], zone.base[1], a, hw);
    const ws = [];
    for (const d of [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5])
      for (const [r0, r1] of [zone.ext, zone.base, [hi, hi + 0.02], [lo - 0.02, lo]]) ws.push(zs(r0, r1, a + d * pitch, 0));
    ws.sort((x, y) => y - x);
    const w = (ws[0] + ws[1] + ws[2]) / 3;
    const den = Math.max(0.03, w - b);
    t[k] = Math.max(-0.5, Math.min(1.5, (w - e) / den));
  }
  // initial decisions, then fit the ISI model and run Viterbi, twice
  let x = t.map((v, k) => (known[k] !== null ? known[k] : v === null ? 0 : v > 0.5 ? 1 : 0));
  let model = { a: 1, c: 0, d: 0 };
  for (let it = 0; it < 3; it++) {
    const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], v = [0, 0, 0];
    for (let k = 0; k < n; k++) {
      if (t[k] === null) continue;
      const row = [x[k], (x[k - 1] ?? 0) + (x[k + 1] ?? 0), 1];
      for (let i = 0; i < 3; i++) { v[i] += row[i] * t[k]; for (let j = 0; j < 3; j++) A[i][j] += row[i] * row[j]; }
    }
    for (let i = 0; i < 3; i++) A[i][i] += 1e-6;
    const s = solve(A, v);
    if (!s || s[0] < 0.15) break;
    model = { a: s[0], c: Math.max(0, Math.min(s[0] * 0.6, s[1])), d: s[2] };
    x = viterbi(t, known, model.a, model.c, model.d);
  }
  // per-bit margin: distance of the observation from the decision boundary
  const margin = t.map((v, k) => {
    if (v === null || known[k] !== null) return Infinity;
    const ctx = model.c * ((x[k - 1] ?? 0) + (x[k + 1] ?? 0)) + model.d;
    return Math.abs(v - (ctx + model.a / 2)) / Math.max(0.05, model.a);
  });
  return { x, t, model, margin };
}

function decodeAt(S, H, Rpx, dir) {
  const n = Rpx > 200 ? 4096 : 2048;
  const { Sl, rot } = findSlots(S, H, n);
  if (Sl < MIN_SLOTS) return { ok: false, stage: "timing", error: "no read: timing marks not found" };
  const pitch = TAU / Sl;
  const angles = refineAngles(S, H, Sl, rot, dir, Rpx);
  const zs = zoneSampler(S, H, Rpx);
  // header dashes: every non-notch slot
  const present = angles.map((_, k) => k >= NOTCH_SLOTS);
  const known = angles.map((_, k) => (k < NOTCH_SLOTS ? 0 : null));
  const dash = readZone(zs, angles, pitch, LAYOUT.dash, present, known);
  // Soft vote per header bit over its copies, then try the most likely
  // headers in turn (the voted one, then flips of up to 3 weakest bits). Only
  // a header whose CRC-16 verifies with the payload is ever returned.
  const soft = [];
  for (let j = 0; j < HEADER_BITS; j++) {
    let s = 0;
    for (let k = NOTCH_SLOTS + j; k < Sl; k += HEADER_BITS) s += (dash.x[k] ? 1 : -1) * Math.min(3, dash.margin[k]);
    soft.push(s);
  }
  const voted = soft.map((v) => (v > 0 ? 1 : 0));
  const weak = soft.map((v, j) => [Math.abs(v), j]).sort((x, y) => x[0] - y[0]).filter(([m]) => m < 1.5).slice(0, 3).map(([, j]) => j);
  const cands = [];
  for (let m = 0; m < 1 << weak.length; m++) {
    const hb = voted.slice();
    let cost = 0;
    weak.forEach((j, q) => { if ((m >> q) & 1) { hb[j] ^= 1; cost += Math.abs(soft[j]); } });
    cands.push({ hb, cost });
  }
  cands.sort((x, y) => x.cost - y.cost);
  const trackCache = new Map();
  let stage = "header", detail = null;
  for (const { hb } of cands) {
    const h = parseHeader(hb);
    const frame = frameFor(h.species, h.version);
    if (!frame) { detail ??= `header unverified (species ${h.species} v${h.version} unknown)`; continue; }
    const plan = slotLayout(frame);
    if (plan.S !== Sl) { detail ??= `slot count ${Sl} != ${plan.S}`; continue; }
    stage = "check";
    const key = `${h.species}.${h.version}.${h.mask}`;
    if (!trackCache.has(key)) {
      const readCh = (ci) => (h.mask >> ci) & 1;
      const pres = plan.slots.map((sl) => sl.type === "spoke" && !!readCh(sl.chapter));
      const kn = plan.slots.map((sl) => (sl.type === "spoke" && readCh(sl.chapter) ? null : 0));
      const tracks = [LAYOUT.inner, LAYOUT.outer].map((zone) => readZone(zs, angles, pitch, zone, pres, kn));
      const pick = (arr) => {
        const out = new Array(frame.spokesPerTrack).fill(null);
        plan.slots.forEach((sl, k) => { if (sl.type === "spoke" && readCh(sl.chapter)) out[sl.spoke] = arr[k]; });
        return out;
      };
      trackCache.set(key, { tracks, bits: tracks.map((tr) => pick(tr.x)), margins: tracks.map((tr) => pick(tr.margin)) });
    }
    const { tracks, bits, margins: bitMargins } = trackCache.get(key);
    const res = bitsToGenome(hb, bits[0], bits[1]);
    if (!res.ok) { detail ??= res.error; continue; }
    const margins = [...tracks.flatMap((tr) => tr.margin), ...dash.margin].filter(Number.isFinite);
    return {
      ...res, Sl, dir,
      minMargin: margins.length ? Math.min(...margins) : 0,
      headerFlips: hb.reduce((c, b, j) => c + (b !== voted[j] ? 1 : 0), 0),
      isi: tracks.map((tr) => tr.model),
      bits: { header: hb, inner: bits[0], outer: bits[1], margins: bitMargins },
    };
  }
  // no verified read: report the stage only (never an unverified species)
  const first = trackCache.values().next().value;
  return {
    ok: false, stage, Sl, dir, detail,
    error: stage === "header" ? "no read: header not verified" : "no read: check failed",
    ...(first ? { bits: { header: voted, inner: first.bits[0], outer: first.bits[1], margins: first.margins } } : {}),
  };
}

// Public entry. Returns {ok, rings: [...successful decodes], tried, error}.
// options.all: decode every ring found (else stop at the first success).
export function decode(img, options = {}) {
  const t0 = Date.now();
  const g = img.L ? img : toLuma(img);
  const f = Math.max(1, Math.ceil(Math.max(g.w, g.h) / 520));
  const gw = boxDown(g, f);
  const cands = findCandidates(gw).slice(0, options.maxCandidates ?? (options.all ? 16 : 6));
  const rings = [], tried = [];
  for (const c of cands) {
    const e0 = c.e;
    // skip inner components of a ring already decoded
    const cc = [e0.cx * f, e0.cy * f];
    if (rings.some((q) => Math.hypot(q.center[0] - cc[0], q.center[1] - cc[1]) < q.radius * 0.5)) continue;
    const Rpx = e0.ax1 * f;
    // sample from a lightly downscaled copy when the ring is large (denoises)
    const f2 = Math.max(1, Math.floor(Rpx / 140));
    const gs = f2 > 1 ? boxDown(g, f2) : g;
    const S = sampler(gs);
    const toS = (H) => { // image coords -> sampling-grid coords
      const k = 1 / f2, o = 0.5 / f2 - 0.5;
      return [H[0] * k + H[6] * o, H[1] * k + H[7] * o, H[2] * k + H[8] * o, H[3] * k + H[6] * o, H[4] * k + H[7] * o, H[5] * k + H[8] * o, H[6], H[7], H[8]];
    };
    // initial ellipse in full-res coords (pixel i of the work image is centred at i*f + (f-1)/2)
    const sc = (x) => x * f + (f - 1) / 2;
    let H = [e0.H[0] * f, e0.H[1] * f, sc(e0.H[2]), e0.H[3] * f, e0.H[4] * f, sc(e0.H[5]), 0, 0, 1];
    let e = null;
    for (let it = 0; it < 2; it++) {
      const Sfull = sampler(g);
      const rim = refineRim(Sfull, H, Rpx);
      if (rim.length < 60) break;
      e = robustEllipse(rim);
      if (!e) break;
      H = e.H;
    }
    if (!e) { tried.push({ error: "no rim" }); continue; }
    const rimPts = refineRim(sampler(g), e.H, Rpx);
    // Under tilt the circle's centre does not project to the ellipse's centre.
    // Every homography that maps the unit circle onto the rim ellipse is the
    // ellipse's affine map times a "boost" that moves the centre to some p
    // inside the disc; search p for the one that lands the timing circle on ink.
    let Hh = searchCentre(sampler(g), e.H);
    // iterate the fit until the centre stops moving: strong tilt seen from
    // close up (rim radius / distance about 0.25) needs several passes
    let wide = 0;
    for (let it = 0; it < 14; it++) {
      const win = wide < 99 ? REF_WIDE : REF_NARROW;
      const ref = refPoints(sampler(g), Hh, Rpx, win).map(({ a, rho }) => apply(Hh, rho * Math.sin(a), -rho * Math.cos(a)));
      if (ref.length < 40) break;
      const before = apply(Hh, 0, 0);
      Hh = fitHomography(e, rimPts, ref, expectedRho(win)).H;
      const after = apply(Hh, 0, 0), moved = Math.hypot(after[0] - before[0], after[1] - before[1]);
      if (wide === 99) { if (moved < 0.02 * Math.max(1, Rpx / 100)) break; }
      else if (moved < 0.05 * Math.max(1, Rpx / 100) || ++wide >= 10) wide = 99;
    }
    const Hs = toS(Hh);
    let r = decodeAt(S, Hs, Rpx / f2, 1);
    if (!r.ok && options.mirror !== false) {
      const m = decodeAt(S, Hs, Rpx / f2, -1);
      if (m.ok) r = m;
    }
    const center = apply(Hh, 0, 0);
    const info = { ...r, center, radius: Rpx, H: Hh };
    if (r.ok) {
      if (!rings.some((q) => Math.hypot(q.center[0] - center[0], q.center[1] - center[1]) < q.radius * 0.5)) rings.push(info);
      if (!options.all) break;
    } else tried.push(info);
  }
  return {
    ok: rings.length > 0, rings, tried, candidates: cands.length, ms: Date.now() - t0,
    error: rings.length ? null : tried[0]?.error ?? "no ring found",
  };
}
