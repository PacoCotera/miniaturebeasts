// The spine: knot chains to samples (shape-model.md 1.1, 1.2, 1.5, 1.6). Plain JavaScript, no node: imports.
// Units are U. Axes: x forward, y left, z up. A chain is a list of knots "ds k psi | w u d":
//   ds  the length from the previous knot, k the pitch curvature in degrees per U (+ toward N, dorsal),
//   psi the yaw curvature (+ toward B, left; on the tail chain, whose T points back, + is the right).
// Curvature is piecewise linear in sigma and integrated with a parallel-transport frame (T, N, B = N x T).

const RAD = Math.PI / 180;
export const STEP = { factor: 0.22, min: 0.004, max: 0.06 };

export class GuardError extends Error {
  constructor(guard, knot, message) { super(`${guard} @ ${knot}: ${message}`); this.guard = guard; this.knot = knot; }
}

// ---- notation -------------------------------------------------------------------------------------------------
const num = (s) => parseFloat(s.replace(/−/g, "-"));
// "ds k psi | w u d" as the design lists it: missing k and psi are 0, one size is a round section.
export function parseKnot(str, name = "", part = null) {
  const [a, b] = str.split("|").map((s) => s.trim());
  const L = a.split(/\s+/).filter(Boolean).map(num), S = b.split(/\s+/).filter(Boolean).map(num);
  const w = S[0], u = S.length > 1 ? S[1] : w, d = S.length > 2 ? S[2] : u;
  return { name, part: part ?? name, ds: L[0] ?? 0, k: L[1] ?? 0, psi: L[2] ?? 0, w, u, d };
}
export const K = (name, str, part) => parseKnot(str, name, part);

// ---- vectors --------------------------------------------------------------------------------------------------
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const nrm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const sc = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const V = { dot, crs, nrm, sc, add, sub };

// Rodrigues rotation of v about the unit axis by angle a.
function rot(v, axis, a) {
  const c = Math.cos(a), s = Math.sin(a), k = dot(axis, v) * (1 - c), x = crs(axis, v);
  return [v[0] * c + x[0] * s + axis[0] * k, v[1] * c + x[1] * s + axis[1] * k, v[2] * c + x[2] * s + axis[2] * k];
}

// ---- monotone cubic apertures ---------------------------------------------------------------------------------
// Fritsch-Carlson: no overshoot, so no lumps between knots.
// endSlope (optional): the slope the curve must leave the last knot with (a coil's -a0/l0, design 5.1), clipped to 3 x the secant and
// to zero where it would turn the last segment back (so the curve stays monotone and C1 into the coil).
export function monotone(xs, ys, endSlope = null) {
  const n = xs.length, m = new Array(n).fill(0), dx = [], dy = [], sl = [];
  for (let i = 0; i < n - 1; i++) { dx.push(xs[i + 1] - xs[i]); dy.push(ys[i + 1] - ys[i]); sl.push(dx[i] > 0 ? dy[i] / dx[i] : 0); }
  if (n === 1) return () => ys[0];
  m[0] = sl[0]; m[n - 1] = sl[n - 2];
  if (endSlope !== null && n > 1) { const sec = sl[n - 2]; m[n - 1] = endSlope * sec <= 0 ? 0 : Math.sign(sec) * Math.min(Math.abs(endSlope), 3 * Math.abs(sec)); }
  for (let i = 1; i < n - 1; i++) m[i] = sl[i - 1] * sl[i] <= 0 ? 0 : (sl[i - 1] + sl[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (sl[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / sl[i], b = m[i + 1] / sl[i], h = a * a + b * b;
    if (h > 9) { const t = 3 / Math.sqrt(h); m[i] = t * a * sl[i]; m[i + 1] = t * b * sl[i]; }
  }
  return (x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0; while (i < n - 2 && x > xs[i + 1]) i++;
    const h = dx[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}

// ---- coils (1.5) ----------------------------------------------------------------------------------------------
// Growth by rotation: a logarithmic spiral swept with the aperture. W the expansion per turn, N the turns, L the length.
// rho0 = b * l0 is the radius of curvature at the start; the half-size shrinks with the length left to the pole, so a/rho is constant.
export function coilParams(coil, last) {
  const { N, W, L } = coil, plane = (coil.plane ?? 0) * RAD;
  const b = Math.log(W) / (2 * Math.PI), l0 = L / (1 - Math.pow(W, -N));
  // The half-size in the plane of the coil (toward N turned about T by the plane angle).
  const a0 = Math.hypot(last.w * Math.sin(plane), last.u * Math.cos(plane));
  const rho0 = b * l0;
  return { N, W, L, b, l0, rho0, a0, ratio: a0 / rho0, plane: coil.plane ?? 0 };
}
export function checkCoil(coil, last, where) {
  if (!coil || !(coil.N > 0)) return null;
  const c = coilParams(coil, last);
  if (c.ratio >= 0.9) throw new GuardError("coil", where, `a/rho = ${c.ratio.toFixed(3)} >= 0.9: the inner side fills the eye of the coil`);
  if (c.N > 1 && c.ratio > (c.W - 1) / (c.W + 1)) throw new GuardError("whorls", where, `a/rho = ${c.ratio.toFixed(3)} > (W-1)/(W+1) = ${((c.W - 1) / (c.W + 1)).toFixed(3)}: the whorls merge`);
  return c;
}
const easeOut = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3));
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
export const COIL_EASE = 0.12, COIL_TIP = 0.08, COIL_TIP_FACTOR = 0.25;

// ---- one chain ------------------------------------------------------------------------------------------------
// frame0: { p, T, N } (B = N x T). sign: +1 for sigma going out along the chain, -1 for the tail (sigma negative).
// Returns { samples, length, knotIndex }, every sample { p, T, N, B, w, u, d, sigma, s, part, emission, knot }.
export function integrateChain({ knots, coil = null, frame0, id = "chain", sigmaSign = 1, yawSign = 1, partOfCoil = null, emitFrom = null, sizes0 = null }) {
  const nk = knots.length, cum = [0];
  for (let i = 1; i < nk; i++) cum.push(cum[i - 1] + knots[i].ds);
  const total = cum[nk - 1];
  // C1 into a coil (design 5.1): each aperture leaves the last knot with the slope of the coil's own aperture, -half-size / l0
  const cp0 = coil && coil.N > 0 ? coilParams(coil, knots[nk - 1]) : null, es = (c) => (cp0 ? -knots[nk - 1][c] / cp0.l0 : null);
  const fw = monotone(cum, knots.map((k) => k.w), es("w")), fu = monotone(cum, knots.map((k) => k.u), es("u")), fd = monotone(cum, knots.map((k) => k.d), es("d"));
  const kap = (s) => { // piecewise linear curvature (rad/U) and yaw
    if (nk === 1) return [0, 0];
    let i = 0; while (i < nk - 2 && s > cum[i + 1]) i++;
    const h = cum[i + 1] - cum[i], t = h > 0 ? Math.min(1, Math.max(0, (s - cum[i]) / h)) : 0;
    return [(knots[i].k + (knots[i + 1].k - knots[i].k) * t) * RAD, (knots[i].psi + (knots[i + 1].psi - knots[i].psi) * t) * RAD * yawSign];
  };
  const bendDir = (kp, ky) => (Math.hypot(kp, ky) < 1e-9 ? 0 : (Math.atan((kp < 0 ? -ky : ky) / Math.abs(kp || 1e-12)) / RAD)); // (-90, 90] of the vector, sign folded
  let p = frame0.p.slice(), T = nrm(frame0.T), N = nrm(sub(frame0.N, sc(T, dot(frame0.N, T)))), B = crs(N, T);
  const samples = [];
  let curK = 0;
  let curPhi = 0; // the direction of the bending vector in (N, B), degrees, as a signed magnitude in (-90, 90] (design 5.3)
  const push = (s, w, u, d, part, knot, emission = 0) => samples.push({ p: p.slice(), T: T.slice(), N: N.slice(), B: B.slice(), w, u, d, s, sigma: sigmaSign * s, part, emission, knot, kappa: curK, phi: curPhi });
  const knotAt = (s) => { let i = 0; while (i < nk - 1 && s > cum[i + 1] + 1e-12) i++; return i; };
  // the region of a segment is the region of its end knot (the first knot's own sample is its own)
  const partAt = (s, i) => (s <= 1e-12 ? knots[0].part : knots[Math.min(nk - 1, i + 1)].part);
  push(0, fw(0), fu(0), fd(0), knots[0].part, 0);
  // advance the frame by a step h of the straight chain (curvature at the midpoint)
  const advance = (h, kp, ky) => {
    const a = kp * h * 0.5, b = ky * h * 0.5;
    const turn = (aa, bb) => {
      if (aa) { const T2 = add(sc(T, Math.cos(aa)), sc(N, Math.sin(aa))), N2 = add(sc(N, Math.cos(aa)), sc(T, -Math.sin(aa))); T = T2; N = N2; }
      if (bb) { const T2 = add(sc(T, Math.cos(bb)), sc(B, Math.sin(bb))), B2 = add(sc(B, Math.cos(bb)), sc(T, -Math.sin(bb))); T = T2; B = B2; }
    };
    turn(a, b); p = add(p, sc(T, h)); turn(a, b);
    T = nrm(T); N = nrm(sub(N, sc(T, dot(N, T)))); B = crs(N, T);
  };
  let s = 0;
  for (let i = 0; i < nk - 1; i++) {
    const ds = knots[i + 1].ds;
    if (ds <= 0) continue;
    const m0 = Math.min(knots[i].w, knots[i].u, knots[i].d), m1 = Math.min(knots[i + 1].w, knots[i + 1].u, knots[i + 1].d);
    const h = Math.min(STEP.max, Math.max(STEP.min, STEP.factor * Math.min(m0, m1)));
    const n = Math.max(1, Math.ceil(ds / h - 1e-9)), hh = ds / n;
    for (let j = 0; j < n; j++) {
      const smid = s + hh * 0.5, [kp, ky] = kap(smid);
      advance(hh, kp, ky); s += hh; curK = kp / RAD; curPhi = bendDir(kp, ky);
      const sn = j === n - 1 ? cum[i + 1] : s;
      push(sn, fw(sn), fu(sn), fd(sn), partAt(sn, i), i + 1);
    }
    s = cum[i + 1];
  }
  const last = knots[nk - 1];
  let coilInfo = null;
  if (coil && coil.N > 0) {
    const where = last.name || id;
    const c = checkCoil(coil, last, where);
    coilInfo = c;
    const { L, b, l0, N: turns } = c, plane = c.plane * RAD;
    // The bending vector (pitch, yaw) of the last knot, as a signed magnitude along a direction in (-90, 90] degrees: the coil's bending axis
    // turns from that direction to the coil plane over the coil's ease (design 5.3), at most 10 degrees per 0.05 U, and the curvature
    // magnitude is continuous (it passes through zero where the last knot bends away from the coil).
    const kLast = (knots[nk - 1].k ?? 0) * RAD, yLast = (knots[nk - 1].psi ?? 0) * RAD * yawSign;
    let m0 = Math.hypot(kLast, yLast), phi0 = Math.atan2(yLast, kLast);
    if (kLast < 0 || (kLast === 0 && yLast < 0)) { m0 = -m0; phi0 = Math.atan2(-yLast, -kLast); }
    const phiC = -plane; if (m0 === 0) phi0 = phiC;
    let dphi = phiC - phi0; dphi -= 2 * Math.PI * Math.round(dphi / (2 * Math.PI));
    const axisAt = (x) => { const u = Math.min(1, x / (COIL_EASE * L)), ph = phi0 + dphi * u, Nc = add(sc(N, Math.cos(ph)), sc(B, Math.sin(ph))); return nrm(crs(T, Nc)); };
    const phiAt = (x) => (phi0 + dphi * Math.min(1, x / (COIL_EASE * L))) / RAD;
    const kprev = m0;
    // the curvature of the spiral, eased in over the first 12 %; the factor cf makes the total turn exactly 360 N
    const ease = (x) => easeOut(x / COIL_EASE);
    const kspiral = (x) => 1 / (b * (l0 - x));
    const M = 4000; let A = 0, Bv = 0;
    for (let i = 0; i < M; i++) { const x = (i + 0.5) / M * L, e = ease(x / L); A += kprev * (1 - e) * (L / M); Bv += kspiral(x) * e * (L / M); }
    const cf = (2 * Math.PI * turns - A) / Bv;
    const kc = (x) => { const e = ease(x / L); return kprev * (1 - e) + cf * kspiral(x) * e; };
    const aper = (x) => ((l0 - x) / l0) * (x > (1 - COIL_TIP) * L ? 1 - (1 - COIL_TIP_FACTOR) * smooth((x - (1 - COIL_TIP) * L) / (COIL_TIP * L)) : 1);
    const cpart = coil.part ?? partOfCoil ?? last.part;
    const emitAt = (x) => (coil.emit ? smooth((x / L - coil.emit.from) / (1 - coil.emit.from)) : 0);
    // frame rotation about the coil axis; the pitch/yaw machinery of the straight chain is not used here
    let x = 0, tilt = 0;
    const l_w = last.w, l_u = last.u, l_d = last.d;
    const stepAt = (x) => { const f = aper(x); return Math.min(STEP.max, Math.max(STEP.min, STEP.factor * f * Math.min(l_w, l_u, l_d))); };
    const heli = coil.pitch ?? 0; // Raup's translation along the axis, per turn (horns)
    const step = (hh, kk, axis) => {
      const a = kk * hh * 0.5, rotAll = (aa) => { T = rot(T, axis, aa); N = rot(N, axis, aa); B = rot(B, axis, aa); };
      rotAll(a); p = add(p, sc(T, hh)); if (heli) p = add(p, sc(axis, heli * (kk * hh) / (2 * Math.PI))); rotAll(a);
    };
    while (x < L - 1e-12) {
      const hh = Math.min(stepAt(x), L - x), kk = kc(x + hh * 0.5);
      step(hh, kk, axisAt(x + hh * 0.5)); x += hh; tilt += kk * hh; curK = kk / RAD; curPhi = phiAt(x - hh * 0.5);
      const f = aper(x);
      push(s + x, l_w * f, l_u * f, l_d * f, cpart, nk, emitAt(x));
    }
    coilInfo.turn = tilt / RAD; coilInfo.cf = cf;
    s += L;
  }
  return { samples, length: s, cum, coil: coilInfo };
}

// ---- the whole body -------------------------------------------------------------------------------------------
// form: { phi0, front: { knots, coil? }, tail?: { knots, coil? }, branches: [...], nape, ... } (species-trial.mjs).
// All in the body frame: the pelvis at the origin, the floor not yet found. buildChains puts the floor at z = 0.
export function headingFrame(phi0) {
  const a = phi0 * RAD;
  return { T: [Math.cos(a), 0, Math.sin(a)], N: [-Math.sin(a), 0, Math.cos(a)] };
}
export const interpChain = (chain, s) => { // position, frame and sizes at arc length s (linear between samples)
  const S = chain.samples; let lo = 0, hi = S.length - 1;
  if (s <= S[0].s) return S[0];
  if (s >= S[hi].s) return S[hi];
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (S[mid].s <= s) lo = mid; else hi = mid; }
  const a = S[lo], b = S[hi], t = (s - a.s) / (b.s - a.s), L = (x, y) => x + (y - x) * t;
  const v = (x, y) => [L(x[0], y[0]), L(x[1], y[1]), L(x[2], y[2])];
  return { p: v(a.p, b.p), T: nrm(v(a.T, b.T)), N: nrm(v(a.N, b.N)), B: nrm(v(a.B, b.B)), w: L(a.w, b.w), u: L(a.u, b.u), d: L(a.d, b.d), s, sigma: L(a.sigma, b.sigma) };
};
// The section point at an angle around the section (0 dorsal, 90 left, 180 ventral) scaled by out.
export function sectionPoint(sample, angleDeg, out) {
  const a = angleDeg * RAD, c = Math.cos(a), sn = Math.sin(a), nr = c >= 0 ? sample.u : sample.d;
  return add(sample.p, add(sc(sample.N, out * nr * c), sc(sample.B, out * sample.w * sn)));
}
// the lowest point of an egg-ellipsoid sample
export function lowestZ(sample) {
  const f = sample.fur ?? 0, rT = Math.min(sample.w, sample.u, sample.d) + f;
  const ax = [[sample.T, rT], [sample.B, sample.w + f], [sample.N, (sample.N[2] >= 0 ? sample.d : sample.u) + f]]; // the side of N that points down
  let e = 0; for (const [v, r] of ax) e += (v[2] * r) ** 2;
  return sample.p[2] - Math.sqrt(e);
}

// Fur by per-sample inflation (design 5.4): f_i = min(f0, 0.35 x the sample's smallest half-size), added to each sample's radii.
export const FUR_CAP = 0.35;
export function applyFur(chain, f0) {
  for (const sm of chain.samples) sm.fur = f0 > 0 ? Math.min(f0, FUR_CAP * Math.min(sm.w, sm.u, sm.d)) : 0;
  return chain;
}
export function buildChains(form) {
  const { T, N } = headingFrame(form.phi0 ?? 90);
  const origin = [0, 0, 0];
  const front = integrateChain({ id: "front", knots: form.front.knots, coil: form.front.coil, frame0: { p: origin, T, N }, sigmaSign: 1, emitFrom: null });
  front.id = "front";
  let tail = null;
  if (form.tail) {
    // the tail starts at the pelvis with -T (N stays dorsal), so the spine is C1 through it
    const pel = form.front.knots[0];
    const knots = [{ ...pel, name: "pelvis", part: form.tail.rootPart ?? "tail", ds: 0, k: 0, psi: 0 }, ...form.tail.knots];
    tail = integrateChain({ id: "tail", knots, coil: form.tail.coil, frame0: { p: origin, T: sc(T, -1), N }, sigmaSign: -1, yawSign: 1 });
    tail.id = "tail";
  }
  const f0 = form.coat?.depth ?? 0;
  applyFur(front, f0); if (tail) applyFur(tail, f0);
  const parents = { front, tail };
  const branches = [];
  for (const br of form.branches ?? []) {
    const parent = parents[br.parent ?? "front"];
    const sides = br.pair ? [["L", 1], ["R", -1]] : [["", 1]];
    for (const [tag, side] of sides) {
      const root = interpChain(parent, br.root.s ?? br.root.sigma);
      const angle = side === 1 ? br.root.angle : -br.root.angle;
      const rp = sectionPoint(root, angle, br.root.out);
      const dir = nrm([br.dir[0], br.dir[1] * side, br.dir[2]]);
      let N0;
      if (br.normal === "forward") N0 = [1, 0, 0];
      else if (br.normal && br.normal.length === 3) N0 = [br.normal[0], br.normal[1] * side, br.normal[2]];
      else N0 = [0, 0, 1];
      if (Math.abs(dot(N0, dir)) > 0.95) N0 = [1, 0, 0];
      const first = br.knots[0];
      const knots = br.knots.map((k, i) => ({ ...k, part: br.part, name: k.name || `${br.id}${i}` }));
      const ch = integrateChain({ id: br.id + tag, knots, coil: br.coil, frame0: { p: rp, T: dir, N: N0 }, sigmaSign: 1, yawSign: side, partOfCoil: br.part });
      ch.id = br.id + tag; ch.branch = br; ch.side = side; ch.rootSample = root; ch.rootPoint = rp;
      applyFur(ch, f0);
      branches.push(ch);
      if (br.fingers) { // a hand is a palm knot with short finger spines (1.6)
        const lastS = ch.samples.at(-1), f = br.fingers;
        for (let j = 0; j < f.count; j++) {
          const a = (j - (f.count - 1) / 2) * f.fan * RAD * side;
          const dir2 = nrm(add(sc(lastS.T, Math.cos(a)), sc(lastS.B, Math.sin(a))));
          const kn = [{ name: "", part: br.part, ds: 0, k: 0, psi: 0, w: f.r, u: f.r, d: f.r }, { name: "", part: br.part, ds: f.length, k: 0, psi: 0, w: f.r * 0.6, u: f.r * 0.6, d: f.r * 0.6 }];
          const fc = integrateChain({ id: `${br.id}${tag}f${j}`, knots: kn, frame0: { p: lastS.p, T: dir2, N: lastS.N }, sigmaSign: 1 });
          fc.id = `${br.id}${tag}f${j}`; fc.branch = { id: fc.id, part: br.part, blend: 0.03 }; fc.side = side; fc.finger = true;
          applyFur(fc, f0);
          branches.push(fc);
        }
      }
    }
  }
  // the floor: the lowest declared contact goes to z = 0 (nothing is repaired; the guard reports the rest)
  const contacts = [];
  const lowest = (chain, pred) => { let z = Infinity, at = null; for (const sm of chain.samples) if (pred(sm)) { const l = lowestZ(sm); if (l < z) { z = l; at = sm; } } return { z, at }; };
  for (const c of form.contacts ?? []) {
    if (c.kind === "branches") for (const ch of branches) if (ch.branch.id === c.id) { const r = lowest(ch, (sm) => c.last ? sm.knot >= ch.samples.at(-1).knot : true); contacts.push({ id: ch.id, z: r.z }); }
    if (c.kind === "tail" && tail) { const r = lowest(tail, (sm) => sm.s <= tail.cum[c.upToKnot ?? 1] + 1e-9 && sm.s >= tail.cum[(c.upToKnot ?? 1) - 1] - 1e-9); contacts.push({ id: "seat", z: r.z }); }
    if (c.kind === "base") contacts.push({ id: "base", z: form.base });
  }
  if (form.base !== undefined && form.base !== null && !(form.contacts ?? []).some((c) => c.kind === "base")) contacts.push({ id: "base", z: form.base });
  const floor = contacts.length ? Math.min(...contacts.map((c) => c.z)) : Math.min(front.samples.reduce((m, s) => Math.min(m, lowestZ(s)), Infinity));
  return { front, tail, branches, contacts, floor, parents, phi0: form.phi0 };
}

// ---- guards ---------------------------------------------------------------------------------------------------
// The coil guards throw inside integrateChain with the knot named. These are the other spine-level guards.
export const mean3 = (k) => (k.w + k.u + k.d) / 3;
export function neckPinch(form) {
  const r = form.regions; if (!r) return null;
  const ks = form.front.knots, by = (n) => ks.find((k) => k.name === n);
  const neck = by(r.neck), chest = by(r.chest), head = by(r.head);
  return mean3(neck) / Math.min(mean3(chest), mean3(head));
}
export function spineGuards(form, built) {
  const problems = [];
  const p = neckPinch(form);
  if (p !== null && p < 0.45) problems.push(`neck pinch ${p.toFixed(3)} < 0.45`);
  for (const ch of built.branches) {
    if (ch.finger) continue;
    const root = ch.rootSample, rr = Math.max(ch.samples[0].w, ch.samples[0].u, ch.samples[0].d);
    // the root point must lie inside the parent by >= 0.3 of the branch's root radius: its depth below the parent's section edge
    const rel = sub(ch.rootPoint, root.p), a = dot(rel, root.N), bb = dot(rel, root.B), nr = a >= 0 ? root.u : root.d;
    const k0 = Math.hypot(a / nr, bb / root.w); // 1 on the section edge
    const depth = (1 - k0) * Math.min(nr, root.w);
    if (depth < 0.3 * rr - 1e-9) problems.push(`${ch.id}: root depth ${depth.toFixed(3)} < 0.3 x ${rr.toFixed(3)}`);
  }
  for (const c of built.contacts) {
    const off = c.z - built.floor;
    if (off > 0.03 + 1e-9) problems.push(`contact ${c.id} is ${off.toFixed(3)} U above the floor`);
  }
  return problems;
}
