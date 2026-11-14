// Signed distance primitives and operators for the genome foundation. Negative inside. Every function takes the point as (x, y, z) numbers, so
// nothing allocates in the inner loop. Frames are { c: [x, y, z], r: [rx, ry, rz] rows } = a centre and an orthonormal basis (rows: the frame's
// right, up, forward in the parent's coordinates); a point's local coordinates are the dot products with the rows.
// Plain JavaScript, no node: imports.
export const len3 = (x, y, z) => Math.sqrt(x * x + y * y + z * z);
export const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
export const mix = (a, b, t) => a + (b - a) * t;
export const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const norm3 = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
export const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// ---- 3 x 3 rotations (row-major arrays of 9) ------------------------------------------------------------------------------------
export const Rz = (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, s, c, 0, 0, 0, 1]; };
export const Ry = (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; };
export const Rx = (a) => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, -s, 0, s, c]; };
export const mul3 = (A, B) => { const o = new Array(9); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) o[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j]; return o; };
export const T3 = (A) => [A[0], A[3], A[6], A[1], A[4], A[7], A[2], A[5], A[8]];
export const apply3 = (A, v) => [A[0] * v[0] + A[1] * v[1] + A[2] * v[2], A[3] * v[0] + A[4] * v[1] + A[5] * v[2], A[6] * v[0] + A[7] * v[1] + A[8] * v[2]];
// a frame from a rotation: local = R^T (p - c); R's columns are the local axes in the parent
export const frameOf = (c, R) => ({ c, R, Rt: T3(R) });
export const toLocal = (f, x, y, z) => { const X = x - f.c[0], Y = y - f.c[1], Z = z - f.c[2], t = f.Rt; return [t[0] * X + t[1] * Y + t[2] * Z, t[3] * X + t[4] * Y + t[5] * Z, t[6] * X + t[7] * Y + t[8] * Z]; };
export const fromLocal = (f, v) => { const R = f.R; return [R[0] * v[0] + R[1] * v[1] + R[2] * v[2] + f.c[0], R[3] * v[0] + R[4] * v[1] + R[5] * v[2] + f.c[1], R[6] * v[0] + R[7] * v[1] + R[8] * v[2] + f.c[2]]; };
export const dirFromLocal = (f, v) => apply3(f.R, v);

// ---- primitives in local coordinates --------------------------------------------------------------------------------------------
// an ellipsoid: the first-order distance k0 (k0 - 1) / k1, exact on the surface and a lower bound near it
export function sdEllipsoid(x, y, z, rx, ry, rz) {
  const k0 = Math.sqrt((x / rx) ** 2 + (y / ry) ** 2 + (z / rz) ** 2);
  const k1 = Math.sqrt((x / (rx * rx)) ** 2 + (y / (ry * ry)) ** 2 + (z / (rz * rz)) ** 2);
  return k1 < 1e-12 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1;
}
// a superellipsoid |x/a|^n + |y/b|^n + |z/c|^n = 1: the implicit divided by its gradient's length. n = 2 is the ellipsoid. Accurate to first order at the surface.
export function sdSuper(x, y, z, a, b, c, n) {
  const u = Math.abs(x / a), v = Math.abs(y / b), w = Math.abs(z / c);
  const S = Math.pow(u, n) + Math.pow(v, n) + Math.pow(w, n);
  if (S < 1e-12) return -Math.min(a, b, c);
  const F = Math.pow(S, 1 / n) - 1, g = Math.pow(S, 1 / n - 1);
  const gx = (g * Math.pow(u, n - 1)) / a, gy = (g * Math.pow(v, n - 1)) / b, gz = (g * Math.pow(w, n - 1)) / c, gl = Math.sqrt(gx * gx + gy * gy + gz * gz);
  return F / Math.max(gl, 1e-9);
}
// a round cone from a (radius ra) to b (radius rb): the capsule with two radii
export function sdRoundCone(px, py, pz, ax, ay, az, bx, by, bz, r1, r2) {
  const bax = bx - ax, bay = by - ay, baz = bz - az, l2 = bax * bax + bay * bay + baz * baz, rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2;
  const pax = px - ax, pay = py - ay, paz = pz - az, y = pax * bax + pay * bay + paz * baz, z = y - l2;
  const qx = pax * l2 - bax * y, qy = pay * l2 - bay * y, qz = paz * l2 - baz * y, x2 = qx * qx + qy * qy + qz * qz, y2 = y * y * l2, z2 = z * z * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}
// a capsule (one radius), cheaper
export function sdCapsule(px, py, pz, ax, ay, az, bx, by, bz, r) {
  const pax = px - ax, pay = py - ay, paz = pz - az, bax = bx - ax, bay = by - ay, baz = bz - az;
  const h = clamp((pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz || 1), 0, 1);
  return Math.sqrt((pax - bax * h) ** 2 + (pay - bay * h) ** 2 + (paz - baz * h) ** 2) - r;
}

// ---- operators -----------------------------------------------------------------------------------------------------------------------
// the round union (hg_sdf fOpUnionRound): material is added only where both surfaces are within r of each other, which is the crease; the convex sides are not inflated
export function uRound(a, b, r) {
  const m = Math.min(a, b), A = Math.max(r - a, 0), B = Math.max(r - b, 0);
  return Math.max(r, m) - Math.sqrt(A * A + B * B);
}
// the polynomial smooth min, for small blends (toes, nose) where a little swelling is wanted
export function sMin(a, b, k) { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; }
// smooth subtraction of b from a (a minus b): the rim of the cut is rounded by k
export function sSub(a, b, k) { const h = Math.max(k - Math.abs(a + b), 0) / k; return Math.max(a, -b) + h * h * k * 0.25; }
// a lower bound for far-away parts: the distance to a bounding sphere, evaluated exactly only inside `margin`
export const bounded = (c, r, margin, f) => (x, y, z) => { const b = Math.sqrt((x - c[0]) ** 2 + (y - c[1]) ** 2 + (z - c[2]) ** 2) - r; return b > margin ? b : f(x, y, z); };

// ---- gradient and the ray ---------------------------------------------------------------------------------------------------------
// the normal by the tetrahedron technique: 4 evaluations
export function gradient(d, x, y, z, h) {
  const a = d(x + h, y - h, z - h), b = d(x - h, y - h, z + h), c = d(x - h, y + h, z - h), e = d(x + h, y + h, z + h);
  const nx = a - b - c + e, ny = -a - b + c + e, nz = -a + b - c + e, l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
  return [nx / l, ny / l, nz / l];
}
// sphere tracing along o + t dir from t0 to t1: returns t at the hit, or -1
export function march(d, ox, oy, oz, dx, dy, dz, t0, t1, eps, maxSteps = 90, relax = 0.9) {
  let t = t0;
  for (let i = 0; i < maxSteps; i++) {
    const v = d(ox + dx * t, oy + dy * t, oz + dz * t);
    if (v < eps) return t;
    t += v * relax; if (t > t1) return -1;
  }
  return -1;
}
