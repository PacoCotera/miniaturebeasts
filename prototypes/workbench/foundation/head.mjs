// The head module (plan 2.3): the skull K as a superellipsoid, the face frame F on K's analytic surface, the muzzle M, the nose, the eye sockets and
// the mouth crease cut into them. Everything is in the head's own coordinates with H = 1 (x forward, y left, z up, the origin at K's centre);
// the scene scales and places it. The numbers come from the clamped face parameters and from the house file's rig block; none is written here.
import { sdSuper, sdEllipsoid, sdCapsule, uRound, sMin, sSub, bounded, gradient, norm3, cross3, dot3, sstep, clamp } from "./sdf.mjs";

// the point of an implicit surface along +x at (y, z): bisection from inside (f < 0) to outside
export function findFront(f, y, z, x0 = 0, x1 = 2.5) {
  let a = x0, b = x1;
  for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (f(m, y, z) < 0) a = m; else b = m; }
  return (a + b) / 2;
}
// a frame at c whose first axis is the normal n: (n, lat, up) with up as near the head's z as the normal allows
export function surfaceFrame(c, n) {
  const z = [0, 0, 1], up0 = [z[0] - dot3(z, n) * n[0], z[1] - dot3(z, n) * n[1], z[2] - dot3(z, n) * n[2]], up = norm3(up0), lat = cross3(up, n);
  return { c, n, up, lat };
}

export function buildHead(house, plan, kinds, fp) {
  const rf = house.rig.face, rp = house.rig[plan] ?? {}, H = 1, W = fp.WoverH, D = fp.DoverH, cheek = fp.cheek ?? 0;
  const kexp = house.kinds.head[kinds.head].exponent;
  const K = { a: D / 2, b: W / 2, c: 0.5, n: kexp };
  // the width at height z: the old widening toward the chin, plus a cheek at the eye line, a bump of `cheek-eye` in the width that holds the far eye inside the outline
  const cw = rf["cheek-widen"], zEye0 = 0.5 - fp.eyeDrop, ce = rp["cheek-eye"] ?? rf["cheek-eye"], cs = rf["cheek-eye-sigma"], latAt = (z) => 1 + cw * cheek * (-z) + ce * Math.exp(-(((z - zEye0) / cs) ** 2)), cfw = rp["cheek-forward"] ?? rf["cheek-forward"] ?? 0;
  // and the width grows toward the face: a head that is fuller at the cheek than at the back of the skull, so the far cheek stands outside the far eye at the face yaw (the master's)
  const dK = (x, y, z) => 0.92 * sdSuper(x, y / (latAt(z) * (1 + cfw * sstep(-0.3 * K.a, 0.9 * K.a, x))), z, K.a, K.b, K.c, K.n);
  const E = fp.eW * W, Riris = E / 2, ringW = fp.ring * E, Reye = Riris + ringW, lidOver = fp.lid * E;
  const zEye = 0.5 - fp.eyeDrop, yE = (fp.spacing * E) / 2;
  const aspect = house.kinds.eye[kinds.eye]?.aspect ?? 1;

  // ---- the muzzle M -------------------------------------------------------------------------------------------------------------
  const noseHalfH = 0.5 * fp.noseAspect * fp.noseW * W, noseCz = zEye - fp.noseDrop * E, mouthZ = noseCz - noseHalfH - fp.gap;
  const hasM = kinds.muzzle !== "none" && fp.projection !== undefined && fp.muzzleW !== undefined;
  let M = null;
  if (hasM) {
    // the forward projection saturates at `muzzle-projection-cap` (a snout, not a bill: AD fix round 2, must-fix 10) and what it gives up goes into width, so muzzle t 1 is a bigger round snout
    const cap = rf["muzzle-projection-cap"], proj = cap * Math.tanh(fp.projection / cap), ry = ((fp.muzzleW * W) / 2) * (1 + rf["muzzle-widen"] * ((fp.projection - proj) / cap)), rz = fp.muzzleH / 2, rx = 0.12 + 0.5 * proj, zc = noseCz - rf["muzzle-centre-drop"] - 0.12 * fp.muzzleH;
    const xs = findFront(dK, 0, zc);
    M = { c: [xs + proj - rx, 0, zc], r: [rx, ry, rz] };
  }
  const dM = M ? (x, y, z) => sdEllipsoid(x - M.c[0], y - M.c[1], z - M.c[2], M.r[0], M.r[1], M.r[2]) : null;
  const rM = rf["muzzle-union"];
  // the jaw: a chin mass under the mouth, its front a little behind the muzzle's round front, so the chin overhangs the chest and the cream can run over it
  let J = null;
  if (M && rf["jaw-rz"]) { const jr = [rf["jaw-rx"], M.r[1] * rf["jaw-width-of-muzzle"], rf["jaw-rz"]]; J = { c: [M.c[0] + M.r[0] + rf["jaw-forward"] - jr[0], 0, mouthZ - rf["jaw-drop"]], r: jr }; }
  const dJ = J ? (x, y, z) => sdEllipsoid(x - J.c[0], y - J.c[1], z - J.c[2], J.r[0], J.r[1], J.r[2]) : null;
  const dMJ = dM && dJ ? (x, y, z) => uRound(dM(x, y, z), dJ(x, y, z), rf["jaw-union"]) : dM;
  const dHead0 = dMJ ? (x, y, z) => uRound(dK(x, y, z), dMJ(x, y, z), rM) : dK;

  // ---- the nose: a soft dome on the face's midline, in the frame of the surface under it -----------------------------------------------
  // the frame is the head's forward axis tilted up (the nose is a mound on the top of the muzzle, lit from above), not the surface normal on the muzzle's lower front, which faces down
  const xsN = findFront(dHead0, 0, noseCz), tilt = (rf["nose-tilt-deg"] * Math.PI) / 180, nN = [Math.cos(tilt), 0, Math.sin(tilt)], nf = surfaceFrame([xsN, 0, noseCz], nN);
  const nry = (fp.noseW * W) / 2, nrz = nry * fp.noseAspect, nrx = nry * 0.85, relief = rf["nose-relief"];
  const nC = [xsN + nN[0] * (relief - 1) * nrx, nN[1] * (relief - 1) * nrx, noseCz + nN[2] * (relief - 1) * nrx];
  const dNose = (x, y, z) => { const X = x - nC[0], Y = y - nC[1], Z = z - nC[2]; return sdEllipsoid(X * nf.n[0] + Y * nf.n[1] + Z * nf.n[2], X * nf.lat[0] + Y * nf.lat[1] + Z * nf.lat[2], X * nf.up[0] + Y * nf.up[1] + Z * nf.up[2], nrx, nry, nrz); };
  const noseOn = kinds.nose !== "none";

  // ---- the eyes: frames on K's analytic surface, then sockets carved to a flat floor ---------------------------------------------------
  const eyes = [1, -1].map((side) => {
    const y = side * yE, x = findFront(dK, y, zEye), n = gradient(dK, x, y, zEye, 1e-3), fr = surfaceFrame([x, y, zEye], n);
    return { side, ...fr, E, Riris, Reye, ringW, lidOver, pupilR: fp.pupil * Riris, aspect, Rsock: Reye * (1 + rf["socket-margin"]) };
  });
  const depth = rf["socket-depth"], kS = rf["socket-soften"];
  const carve = (e) => (x, y, z) => { const X = x - e.c[0], Y = y - e.c[1], Z = z - e.c[2], ql = X * e.lat[0] + Y * e.lat[1] + Z * e.lat[2], qu = X * e.up[0] + Y * e.up[1] + Z * e.up[2], qn = X * e.n[0] + Y * e.n[1] + Z * e.n[2]; return Math.max(Math.hypot(ql, qu / aspect) - e.Rsock, -(qn + depth)); };
  const carves = eyes.map(carve);

  // ---- the mouth: a thin tube along the curve under the nose, cut into the surface -----------------------------------------------------------
  const mw = fp.mouthW * E, rt = rf["mouth-tube"], mo = rf["mouth-offset"], mouthPts = [];
  const NS = 14, cf = rf["mouth-curl-from"], curl = rf["mouth-curl"];
  // the mouth's height at a lateral position y: the upturn (a parabola) and, over the last share of each side, a curl that adds `curl` to the slope at the end: the dimple
  const mouthZAt = (y) => { const ss = Math.min(1, Math.abs(y) / (mw / 2)); return mouthZ + fp.upturn * (mw / 2) * ss * ss + (curl * (mw / 2) * Math.max(0, ss - cf) ** 2) / (2 * (1 - cf)); };
  for (let i = 0; i <= NS; i++) {
    const s = (i / NS) * 2 - 1, y = (s * mw) / 2, z = mouthZAt(y);
    const xs = findFront(noseOn ? (x, yy, zz) => sMin(dHead0(x, yy, zz), dNose(x, yy, zz), rf["nose-soften"]) : dHead0, y, z);
    mouthPts.push([xs, y, z]);
  }
  const mouthC = [mouthPts[NS / 2][0], 0, mouthZ], mouthBR = mw / 2 + 2 * rt;
  const dGroove = (x, y, z) => { let d = 1e9; for (let i = 0; i < NS; i++) { const a = mouthPts[i], b = mouthPts[i + 1]; d = Math.min(d, sdCapsule(x, y, z, a[0] - mo * rt, a[1], a[2], b[0] - mo * rt, b[1], b[2], rt)); } return d; };
  const kG = rf["mouth-soften"], kN = rf["nose-soften"];

  const eyeBound = eyes.map((e) => ({ c: e.c, r: e.Rsock + 0.05 }));
  const faceBox = { c: [Math.max(xsN, 0.2), 0, (zEye + mouthZ) / 2], r: 0.5 * W + 0.1 };
  const dHead = (x, y, z) => {
    let d = dK(x, y, z);
    if (d > 0.4) return d;
    if (dMJ) d = uRound(d, dMJ(x, y, z), rM);
    if (noseOn) d = sMin(d, dNose(x, y, z), kN);
    for (let i = 0; i < 2; i++) { const b = eyeBound[i], bd = Math.sqrt((x - b.c[0]) ** 2 + (y - b.c[1]) ** 2 + (z - b.c[2]) ** 2) - b.r; if (bd < 0.05) d = sSub(d, carves[i](x, y, z), kS); }
    if (Math.sqrt((x - mouthC[0]) ** 2 + (y - mouthC[1]) ** 2 + (z - mouthC[2]) ** 2) < mouthBR + 0.16) d = sSub(d, dGroove(x, y, z), kG);
    return d;
  };
  // the head without its carvings: where the eye and mouth frames sit
  return { H, W, D, K, dK, dM, M, J, dNose, nose: { c: nC, frame: nf, r: [nrx, nry, nrz], on: noseOn }, eyes, mouth: { zAt: mouthZAt, pts: mouthPts, axis: mouthPts.map((p) => [p[0] - mo * rt, p[1], p[2]]), z: mouthZ, w: mw, upturn: fp.upturn, tube: rt }, d: dHead, d0: dHead0, geometry: { E, zEye, noseCz, mouthZ, noseHalfH, ringW, Reye, Riris, lidOver, yE },
    // the measures the rig gives (in H units): the vertical stack, the nose, the eyes
    measures: { H, W, D, E, eyeDrop: fp.eyeDrop, spacing: fp.spacing, pupil: fp.pupil, lid: fp.lid, ring: fp.ring, noseW: fp.noseW * W, noseDrop: fp.noseDrop * E, mouthW: fp.mouthW * E, mouthDrop: zEye - mouthZ, gap: fp.gap, upturn: fp.upturn, projection: fp.projection ?? 0 } };
}
