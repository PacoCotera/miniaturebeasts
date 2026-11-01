// Materials and marks (design 1): the surface a pixel shows, read from the attributes every vertex carries. The field carries shape only.
// Fur, hair and skin are per-pixel materials; marks are a pigment layer painted in a fixed order. Everything is hashed from position,
// so the same input gives the same bytes. Plain JavaScript, no node: imports.
import { noise3, hash1 } from "./field.mjs";

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const nrm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
// the fade of any detail narrower than 1.5 px (design 1.2): 0 under 1.5 px, 1 from 3 px
export const Phi = (wPx) => clamp01((wPx - 1.5) / 1.5);
// what shows at each size (design 1.2): strands at 304, locks at 304 and 96, nothing at 48
export const SHOWS = { 304: { strand: true, lock: true, tuft: true }, 96: { strand: false, lock: true, tuft: true }, 48: { strand: false, lock: false, tuft: false } };

// A stretched value noise: q = p / w + f (f . p)(1 / L - 1 / w): w across the flow f, L along it
const stretched = (p, f, w, L, salt) => {
  const fp = dot(f, p), k = fp * (1 / L - 1 / w);
  return noise3(p[0] / w + f[0] * k, p[1] / w + f[1] * k, p[2] / w + f[2] * k, salt);
};

// The material of a form. kinds: "fur" (strand frame from the crown and gravity), "hair" (fur with g = 1), "skin" (wrap, gloss, pores).
export function makeMaterial(form, sizeKey, scale, opts = {}) {
  const M = form.look?.material ?? { kind: "skin" }, on = opts.material !== false, show = SHOWS[sizeKey] ?? SHOWS[48];
  const kind = M.kind ?? "skin", strand = M.strand ?? [0.03, 0.25], lock = M.lock ?? [0.12, 0.4], g = kind === "hair" ? 1 : M.gravity ?? 0.4;
  // the amplitude of each noise at this size: 0 where the size does not show it, else the fade of its width in pixels
  const ampStrand = on && kind !== "skin" && show.strand ? (kind === "hair" ? 0.1 : 0.14) * Phi(strand[0] * scale) : 0, ampLock = on && kind === "fur" && show.lock ? 0.1 * Phi(lock[0] * scale) : 0; // hair: the locks are geometry, the strands run at contrast .10
  const pores = on && kind === "skin" && sizeKey === 304 ? 0.04 * Phi(0.02 * scale) : 0;
  // the clump tufts (fur): hashed cells of the (sigma, angle x R) atlas, size M.clump U (the plume of Wickle M.clumpPlume); shown by the fade of their width in px at 304 and 96, off at 48
  const ampTuft = on && kind === "fur" && M.clump && show.tuft ? Phi(M.clump * scale) : 0, clumpR = M.clumpR ?? 0.5;
  const strandAmp = () => ampStrand, lockAmp = () => ampLock;
  // the flow at a point: the tangent away from the crown (down the body toward a tip), mixed with world-down by the gravity share, in the tangent plane
  function flow(T, sigma, group, n) {
    const sgn = group === "front" ? Math.sign(sigma - (M.crown ?? -1e9)) || 1 : 1;
    let f = [T[0] * sgn * (1 - g), T[1] * sgn * (1 - g), T[2] * sgn * (1 - g) - g];
    f = [f[0] - n[0] * dot(f, n), f[1] - n[1] * dot(f, n), f[2] - n[2] * dot(f, n)];
    return nrm(f);
  }
  // the shaded albedo and normal bend of a pixel. ctx: { p, n, T, sigma, group, pigment, h (half vector) }
  function surface(ctx) {
    if (!on || kind === "skin" || ctx.part === "face") { // the face pod of a hair creature is skin: no strands, no sheen
      if (pores > 0) { const q = noise3(ctx.p[0] / 0.02, ctx.p[1] / 0.02, ctx.p[2] / 0.02, 9); return { k: 1 + pores * q, n: ctx.n, sheen: 0, gloss: M.gloss ?? 0.25 }; }
      return { k: 1, n: ctx.n, sheen: 0, gloss: kind === "skin" ? M.gloss ?? 0.25 : 0 };
    }
    const f = flow(ctx.T, ctx.sigma, ctx.group, ctx.n);
    let k = 1, n = ctx.n;
    const lk = kind === "hair" ? ctx.lock : null, sizeKey304or96 = show.lock;
    if (lk && sizeKey304or96) { // round 3 (design 3): a value jitter of +-8 % per lock, the V-groove shaded -25 % over 1-2 px, the lock tips lighter
      const gw = smooth((Math.abs(lk.t) - 0.78) / 0.22); k *= 1 + 0.08 * (2 * lk.jit - 1); k *= 1 - 0.25 * gw; k *= 1 + 0.1 * smooth(lk.tip) * (sizeKey304or96 ? 1 : 0);
    }
    if (ampStrand > 0) {
      const ns = stretched(ctx.p, f, strand[0], strand[1], 5); k += ampStrand * ns;
      // the normal bent by 0.25 x the strand noise's gradient across f, faded the same way
      const b = nrm([ctx.n[1] * f[2] - ctx.n[2] * f[1], ctx.n[2] * f[0] - ctx.n[0] * f[2], ctx.n[0] * f[1] - ctx.n[1] * f[0]]), e = strand[0] * 0.5;
      const ns2 = stretched([ctx.p[0] + b[0] * e, ctx.p[1] + b[1] * e, ctx.p[2] + b[2] * e], f, strand[0], strand[1], 5);
      n = nrm([n[0] + b[0] * 0.25 * (ns2 - ns) * (ampStrand / 0.14), n[1] + b[1] * 0.25 * (ns2 - ns) * (ampStrand / 0.14), n[2] + b[2] * 0.25 * (ns2 - ns) * (ampStrand / 0.14)]);
    }
    if (ampLock > 0) k += ampLock * stretched(ctx.p, f, lock[0], lock[1], 7);
    if (ampTuft > 0 && ctx.angle !== undefined) { // over each clump: the normal tilts +12 degrees toward the flow on its upper half, the last 20 % is -10 % value, the last 25 % +8 L*, the edges jagged
      const cs = ctx.part === "plume" && M.clumpPlume ? M.clumpPlume : M.clump, a = ctx.sigma / cs, bq = ((ctx.angle * Math.PI) / 180 * clumpR) / cs, i = Math.floor(a), j = Math.floor(bq), fu = a - i, fv = bq - j;
      const sgn = Math.sign(dot(f, ctx.T)) || 1, h0 = hash1(i * 7919 + j * 104729, 31), w0 = sgn > 0 ? fu : 1 - fu, w = Math.min(1, Math.max(0, w0 + 0.12 * Math.sin(fv * 6.2832 * (1 + h0) + h0 * 9)));
      const tilt = smooth(1 - w / 0.5) * 0.21 * ampTuft; n = nrm([n[0] + f[0] * tilt, n[1] + f[1] * tilt, n[2] + f[2] * tilt]);
      k *= 1 - 0.1 * ampTuft * smooth((w - 0.8) / 0.1); k *= 1 + 0.13 * ampTuft * smooth((w - 0.75) / 0.1);
    }
    // the anisotropic sheen along f: sheen (1 - (f . h)^2)^20, in two bands for hair
    // hair: one soft sheen band on the upper third (exponent 8), the pigment lightened 35 %; fur keeps its anisotropic sheen
    const fh = ctx.h ? dot(f, ctx.h) : 0, zr = ctx.zrel ?? 0.5, band = kind === "hair" ? Math.exp(-(((zr - 0.72) / 0.14) ** 2)) : 1;
    return { k, n, sheen: (M.sheen ?? 0.2) * Math.pow(Math.max(0, 1 - fh * fh), kind === "hair" ? 8 : 20) * band, gloss: 0, sheenLight: kind === "hair" ? 0.35 : 0.4 };
  }
  return { kind, M, surface, strandAmp, lockAmp, ampStrand, ampLock, ampTuft, pores, strand, lock, flow, clump: ampTuft > 0 ? M.clump : null, clumpPlume: M.clumpPlume, clumpR };
}

// ---- marks (design 1.4): a mask in [0, 1] with a pigment slot, painted in a fixed order -------------------------------------------
// body > belly > patches, stripes, spots > socks and tips > face plate > eye surround. Every edge is soft over 0.03 U; on fur the edge is jagged by the lock noise (+-0.03 U).
export const EDGE = 0.03, JAG = 0.03;
export const jagged = (p, dpx) => dpx + JAG * noise3(p[0] * 8, p[1] * 8, p[2] * 8, 11); // a distance in U, perturbed along the edge
export const softEdge = (d, soft = EDGE) => smooth(0.5 - d / soft); // d < 0 inside

// the spots of a species: a fixed Poisson list of n_max points in an (sigma, angle) region; spot i shows at radius r clamp(density n_max - i, 0, 1)
export function spotList(spec) {
  const pts = [], [s0, s1] = spec.sigma, [a0, a1] = spec.angle; let tries = 0;
  const minD = spec.minDist ?? 0.1;
  while (pts.length < spec.nMax && tries++ < 4000) {
    const s = s0 + (s1 - s0) * hash1(tries, spec.seed ?? 3), a = a0 + (a1 - a0) * hash1(tries, (spec.seed ?? 3) + 101);
    if (pts.every((q) => Math.hypot(q[0] - s, (q[1] - a) * Math.PI / 180 * (spec.rho ?? 0.3)) >= minD)) pts.push([s, a]);
  }
  return pts;
}
// the strength of the spot mask at (sigma, |angle|): the nearest spot's soft disc, rank-ordered so density grows one spot at a time
export function spotMask(spec, list, sigma, angle, density) {
  let m = 0; const a = Math.abs(angle);
  for (let i = 0; i < list.length; i++) {
    const rs = spec.r * clamp01(density * spec.nMax - i); if (rs <= 0) continue;
    const d = Math.hypot(list[i][0] - sigma, (list[i][1] - a) * Math.PI / 180 * (spec.rho ?? 0.3)) - rs;
    m = Math.max(m, softEdge(d));
  }
  return m;
}
// a mark narrower than 1 px at a size fades out between 1.5 and 0.75 px
export const fadeNarrow = (widthPx) => clamp01((widthPx - 0.75) / 0.75);

// The marks of a pixel, in the fixed order of design 1.4: belly, then the form's own list (spots, socks, tips, nails, inner ears), then the face plate, then the eye surround.
// ctx: { p, part, group, sigma, angle, u0 (the share along a branch), belly, patch, fx, fy (face coordinates), eyes }
const spotCache = new WeakMap();
export function paintMarks(look, Mat, ctx, col) {
  const pig = look.pigments, jag = Mat.kind !== "skin" && Mat.ampLock > 0 ? 0.2 * noise3(ctx.p[0] * 9, ctx.p[1] * 9, ctx.p[2] * 9, 13) : 0;
  const edge = (m) => smooth((m - 0.5 - jag) / 0.5 + 0.5); // a jagged soft threshold: fluffy, not cut
  let light = 0; // round 4: the strength of the light marks (belly, plate, eye ring, nails), for the ramp's own floor
  if (ctx.belly > 0) { const e = edge(ctx.belly); col = mix(col, pig.belly ?? pig.patch ?? col, e); light = Math.max(light, e); }
  for (const mk of look.marks ?? []) {
    if (mk.kind === "spots" && (mk.parts ?? ["body"]).includes(ctx.part)) {
      let list = spotCache.get(mk); if (!list) { list = spotList(mk); spotCache.set(mk, list); }
      const m = spotMask(mk, list, ctx.sigma, ctx.angle, mk.density ?? 0.7); if (m > 0) col = mix(col, pig[mk.pigment ?? "spot"], m);
    }
    if (mk.kind === "socks" && mk.parts.includes(ctx.part) && ctx.u0 >= 1 - mk.share) col = mix(col, pig[mk.pigment ?? "sock"], smooth((ctx.u0 - (1 - mk.share)) / 0.05));
    if (mk.kind === "tips" && mk.parts.includes(ctx.part) && ctx.u0 >= 1 - mk.share) col = mix(col, pig[mk.pigment ?? "hoof"], smooth((ctx.u0 - (1 - mk.share)) / 0.02));
    if (mk.kind === "nails" && /t\d+$/.test(ctx.group) && ctx.u0 >= 1 - mk.share) { const nm = smooth((ctx.u0 - (1 - mk.share)) / 0.08); col = mix(col, pig[mk.pigment ?? "nail"], nm); light = Math.max(light, nm); }
    if (mk.kind === "inner" && ctx.part === mk.part && Math.abs(ctx.angle) < 75) col = mix(col, pig[mk.pigment ?? "inner"], smooth((75 - Math.abs(ctx.angle)) / 25));
  }
  if (ctx.patch > 0) { const e = edge(ctx.patch); col = mix(col, pig.patch ?? pig.belly ?? col, e); light = Math.max(light, e); }
  if (look.eyering && ctx.eyes) { // the eye surround: a light ring round each eye on the skin, from under the eye to outer x r_e, by distance from the eye's hit point (round 3: 3D, so a lateral eye's ring is round)
    let m = 0; for (const e of ctx.eyes) { const d = Math.hypot(ctx.p[0] - e.hit[0], ctx.p[1] - e.hit[1], ctx.p[2] - e.hit[2]) / e.r; m = Math.max(m, smooth((look.eyering.outer - d) / (look.eyering.soft ?? 0.25)) * smooth((d - (look.eyering.inner ?? 0.5)) / 0.15)); } // round 4: inner and soft are the ring's own
    if (m > 0) col = mix(col, pig.ring ?? pig.patch, m);
    if (ctx.out) ctx.out.ring = m;
    light = Math.max(light, m);
  }
  if (ctx.out) ctx.out.light = light;
  return col;
}

// The outline tufts at 304 and 96 (round 3, design 5): every clump that crosses the outline emits one tapered tuft: length .6 - 1.0 x the fur depth, base .5 x the clump, pointing along
// the projected flow blended 50/50 with the outline normal, in the clump's light tip colour, alpha tapering. It writes only colour and alpha, never the mesh coverage the checks read.
export function fringePass({ data, cov, flowS, W, H, depthU, scale, kind, sigmaMap, angleMap, clump, plumeClump, partMap, plumeId, R }) {
  const len0 = depthU * scale; if (len0 < 1.2) return;
  const base = new Uint8ClampedArray(data), cv = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : cov[y * W + x]), done = new Set();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (cov[y * W + x] < 0.5 || cv(x - 1, y) >= 0.5 && cv(x + 1, y) >= 0.5 && cv(x, y - 1) >= 0.5 && cv(x, y + 1) >= 0.5) continue; // the outline's inner pixels
    const i = y * W + x, cs = partMap[i] === plumeId && plumeId >= 0 ? plumeClump : clump, key = `${partMap[i]}:${Math.floor(sigmaMap[i] / cs)}:${Math.floor((angleMap[i] * Math.PI / 180 * (R ?? 0.5)) / cs)}`;
    if (done.has(key)) continue; done.add(key);
    let gx = cv(x - 1, y) - cv(x + 1, y), gy = cv(x, y - 1) - cv(x, y + 1); const gl = Math.hypot(gx, gy); if (gl < 1e-6) continue; gx /= gl; gy /= gl;
    const fx = flowS[i * 2], fy = flowS[i * 2 + 1], fl = Math.hypot(fx, fy) || 1;
    let dx = 0.5 * gx + 0.5 * (fx / fl), dy = 0.5 * gy + 0.5 * (fy / fl); if (dx * gx + dy * gy < 0.2) { dx = gx; dy = gy; } // keep it outward
    const dl = Math.hypot(dx, dy); dx /= dl; dy /= dl;
    const L = len0 * (0.6 + 0.4 * hash1(i, 19)), wB = Math.max(1, 0.5 * cs * scale); if (L < 1.2) continue;
    const tip = [0, 1, 2].map((c) => Math.min(255, base[i * 4 + c] * 1.16 + 10)), px = -dy, py = dx; // the clump's light tip colour
    for (let t = 1; t <= L; t++) {
      const hw = 0.5 * wB * (1 - t / (L + 1)), a = 0.85 * (1 - t / (L + 1));
      for (let s = -Math.floor(hw); s <= Math.floor(hw); s++) {
        const X = Math.round(x + dx * t + px * s), Y = Math.round(y + dy * t + py * s); if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
        const o = (Y * W + X) * 4; if (cov[Y * W + X] >= 0.5) continue;
        const a0 = data[o + 3] / 255, aN = a + a0 * (1 - a);
        for (let c = 0; c < 3; c++) data[o + c] = (tip[c] * a + data[o + c] * a0 * (1 - a)) / (aN || 1);
        data[o + 3] = aN * 255;
      }
    }
  }
}
