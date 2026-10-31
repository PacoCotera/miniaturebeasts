// The face as its own model (design 2). Plain JavaScript, no node: imports.
// A face frame (n_f, u_f, b_f) at an anchor on the front chain; a face point (x, y), in U, is placed by casting from the spine point C along
// d + (x b_f + y u_f) / |P_f - C| to the coated surface, so wide-set eyes wrap round a head and every pitch phi_f works (cause 1 of design 0).
const RAD = Math.PI / 180;
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const nrm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const sc = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const hash = (i, salt) => { let h = (Math.imul(i, 374761393) + Math.imul(salt, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };

// The anchor's sigma: a number, or { at: knot name, d: offset } (it follows the knot when the form is tuned).
export function anchorSigma(spec, cumOf) { const s = spec.sigma; return (typeof s === "number" ? s : cumOf(s.at) + (s.d ?? 0)) + (spec.dy ?? 0); }

// env: { sample: the front chain's section at the anchor (shifted), dCast: (x, y, z) => distance of the coated body, outside positive }
export function makeFace(spec, env) {
  const { sample: C0, dCast } = env, size = spec.size ?? 1, phi = spec.phi * RAD, C = C0.p;
  const d = nrm(add(sc(C0.T, Math.cos(phi)), sc(C0.N, -Math.sin(phi))));
  const cast = (dir, O = C) => {
    let t0 = 0, t1 = 0.02; const f = (t) => dCast(O[0] + dir[0] * t, O[1] + dir[1] * t, O[2] + dir[2] * t);
    while (f(t1) < 0 && t1 < 8) { t0 = t1; t1 += 0.02; }
    for (let i = 0; i < 40; i++) { const m = (t0 + t1) / 2; if (f(m) < 0) t0 = m; else t1 = m; }
    const t = (t0 + t1) / 2; return [O[0] + dir[0] * t, O[1] + dir[1] * t, O[2] + dir[2] * t];
  };
  const grad = (p, h = 1e-3) => nrm([dCast(p[0] + h, p[1], p[2]) - dCast(p[0] - h, p[1], p[2]), dCast(p[0], p[1] + h, p[2]) - dCast(p[0], p[1] - h, p[2]), dCast(p[0], p[1], p[2] + h) - dCast(p[0], p[1], p[2] - h)]);
  const Pf = cast(d), nf = grad(Pf), dist = Math.hypot(...sub(Pf, C));
  let uf = add(sc(C0.T, Math.sin(phi)), sc(C0.N, Math.cos(phi))); uf = nrm(sub(uf, sc(nf, dot(uf, nf))));
  const bf = crs(nf, uf), dn = dot(d, nf), db = dot(d, bf), du = dot(d, uf);
  const dirXY = (x, y) => nrm(add(d, sc(add(sc(bf, x), sc(uf, y)), 1 / dist)));
  const castXY = (x, y) => cast(dirXY(x, y));
  // the inverse of the cast: the face coordinates (x, y) of a point, or null behind the face
  const coords = (p) => {
    const v = sub(p, C), vn = dot(v, nf); if (dn < 0.05 || vn <= 0.05 * Math.hypot(...v)) return null;
    const lam = vn / dn; return [dist * (dot(v, bf) / lam - db), dist * (dot(v, uf) / lam - du)];
  };
  // ---- the plate: an ellipse, half-height R_f, half-width R_f a_f (face-size scales it); relief h_f >= 0 only ----
  const R = spec.R * size, A = spec.aspect ?? 1, hf = spec.relief ?? 0;
  const pdy = (spec.plateDy ?? 0) * size, rho = (x, y) => Math.hypot(x / (R * A), (y - pdy) / R);
  const plate = (x, y, soft = 0.03) => smooth((1 - rho(x, y)) * Math.min(R, R * A) / soft + 0.5);
  // ---- eyes: spheres at (+-e_x, e_y) ----
  const E = spec.eyes ?? null, eyes = [];
  if (E) for (const side of [1, -1]) {
    const x = side * E.ex * size * (E.spacing ?? 1), y = E.ey * size, hit = castXY(x, y), n = grad(hit), r = E.r * (E.size ?? 1);
    const up = nrm(sub(uf, sc(n, dot(uf, n)))), rt = crs(n, up);
    eyes.push({ side, x, y, r, hit, n, up, rt, c: sub(hit, sc(n, 0.55 * r)), aspect: E.aspect ?? 1, lid: E.lid ?? 0 });
  }
  // ---- nose: a button, a pad or two nostrils (or none): a radius r_n at (0, y_n), relief 0.3 r_n ----
  const Nz = spec.nose && spec.nose.kind !== "none" ? spec.nose : null, noses = [];
  if (Nz) {
    const r = Nz.r * (Nz.size ?? 1), at = (x, y) => (Nz.tip ? tipCast(x) : castXY(x, y * size));
    const tipCast = (x) => { const T = env.tipDir, p = cast(T, env.tipFrom), side = nrm(crs(T, [0, 0, 1])); return x ? add(p, sc(side, x)) : p; };
    const gp = Nz.gap ?? 0.03, xs = Nz.kind === "nostrils" ? [-gp, gp] : [0];
    for (const x of xs) { const c = at(x, Nz.y); noses.push({ c, r, kind: Nz.kind, n: grad(c), xy: coords(c) ?? [x, Nz.y * size] }); }
  }
  // ---- mouth: an ink stroke in face coordinates, never a cut (smile, w, line, none) ----
  const M = spec.mouth && spec.mouth.kind !== "none" ? spec.mouth : null;
  const mouthW = M ? M.w * size * (M.wscale ?? 1) : 0, mouthS = M ? Math.min(0.5, Math.max(0, M.s + (M.sOff ?? 0))) : 0, mouthY = M ? M.y * size : 0, mouthT = M ? M.t : 0;
  const mouthY_at = (x) => { // the stroke centreline at the lateral offset x
    const u = Math.min(1, Math.abs(x) / mouthW);
    return M.kind === "w" ? mouthY - mouthS * mouthW * 4 * u * (1 - u) : mouthY + mouthS * mouthW * u * u;
  };
  // the distance (U, in the face plane) of (x, y) to the stroke's centreline
  const mouthDist = (x, y) => {
    if (!M) return Infinity;
    if (Math.abs(x) > mouthW) return Math.hypot(Math.abs(x) - mouthW, y - mouthY_at(mouthW));
    const e = 1e-3, sl = (mouthY_at(x + e) - mouthY_at(x - e)) / (2 * e);
    return Math.abs(y - mouthY_at(x)) / Math.sqrt(1 + sl * sl);
  };
  // ---- the muzzle relief of a face on a surface: a bump on the plate's lower half (m_l along n_f, m_w wide) ----
  const Z = spec.muzzle ?? null;
  // the relief added to the body: plate, nose and muzzle (all >= 0: a face never recesses)
  const relief = (p) => {
    const xy = coords(p); if (!xy) return 0; let h = 0;
    const q = rho(xy[0], xy[1]); if (q < 1) h += hf * (1 - q * q) ** 2;
    for (const nz of noses) { const e = Math.hypot(p[0] - nz.c[0], p[1] - nz.c[1], p[2] - nz.c[2]) / nz.r; if (e < 1) h += 0.3 * nz.r * (1 - e * e) ** 2; }
    if (Z) { const e = Math.hypot(xy[0] / Z.mw, (xy[1] + R * 0.5) / (Z.mw * 0.8)); if (e < 1) h += Z.ml * (1 - e * e) ** 2; }
    return h;
  };
  // ---- the hair opening (Drapet): sides omega, a fringe line from fringe-gap with a jag, a bottom at the plate's lower edge ----
  const O = spec.opening ?? null;
  let opening = null;
  if (O && E) {
    const topEye = E.ey * size + Math.max(...eyes.map((e) => e.r)), base = topEye + O.gap * Math.max(...eyes.map((e) => e.r)), bottom = -R, om = O.omega, nl = O.locks ?? 4, amp = O.amp ?? 0.025;
    const jag = (x) => { const t = (x / om + 1) / 2 * nl, i = Math.floor(t), f = t - i, a = hash(i, 5) - 0.5, b = hash(i + 1, 5) - 0.5; return amp * 2 * (a + (b - a) * smooth(f)); };
    const fringe = (x) => base + jag(x), taper = O.taper ?? 0.04;
    // 1 inside the opening, 0 outside, tapering over `taper` at its edges (lock tips, no smooth-max socket)
    const mask = (x, y) => smooth((om - Math.abs(x)) / taper) * smooth((fringe(x) - y) / taper) * smooth((y - bottom) / taper);
    opening = { omega: om, base, jag, fringe, bottom, mask, setback: O.setback ?? 0, gap: O.gap, taper };
  }
  return { C, d, Pf, nf, uf, bf, dist, size, spec, dirXY, castXY, coords, rho, plate, R, aspect: A, eyes, noses, mouth: M && { kind: M.kind, w: mouthW, s: mouthS, y: mouthY, t: mouthT, dist: mouthDist, at: mouthY_at }, relief, opening, relief0: hf };
}
