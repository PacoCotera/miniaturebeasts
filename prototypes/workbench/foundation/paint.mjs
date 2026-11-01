// The painted layer (plan 3.1): the eye as paint in a carved socket, the mouth ink, the nose, the cream field and the marks, all in the
// coordinates of the rig (the eye's own plane, the face frame, the mass), never in screen space except the catch light, which is the house's.
// A paint function takes the world point and returns an albedo and an ink code; the light is the renderer's.
import { toLocal, sstep, clamp, mix, dot3 } from "./sdf.mjs";

export const INK = { body: 0, ring: 1, iris: 2, pupil: 3, catch: 4, nose: 5, mouth: 6, lid: 7, cream: 8, leaf: 9 };
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const scl = (a, k) => [a[0] * k, a[1] * k, a[2] * k];

// per scene, per camera and size: the gaze offsets and the pixel footprints
export function makePaint(scene, look, view) {
  const { house, head, hf } = scene, rf = house.rig.face, ink = house.rig.ink, { scale, sizeKey, basis } = view;
  const eyes = head.eyes, tw = basis.toward, tl = hf.Rt;
  const towardLocal = [tl[0] * tw[0] + tl[1] * tw[1] + tl[2] * tw[2], tl[3] * tw[0] + tl[4] * tw[1] + tl[5] * tw[2], tl[6] * tw[0] + tl[7] * tw[1] + tl[8] * tw[2]];
  // the gaze: the pupil moves in the eye's plane toward the camera, along the screen vector (plan 2.2 step 6), 0 to 0.15 E
  const gaze = eyes.map((e) => {
    const tl_ = dot3(towardLocal, e.lat), tu = dot3(towardLocal, e.up), m = Math.hypot(tl_, tu);
    const k = Math.min(1, m / Math.sin((rf["gaze-full-at-deg"] * Math.PI) / 180)) * rf["gaze-offset-max"] * e.E;
    return m < 1e-9 ? [0, 0] : [(tl_ / m) * k, (tu / m) * k];
  });
  const rr = basis.right, uu = basis.up;
  const eyeW = eyes.map((e) => { const cw = [hf.R[0] * e.c[0] + hf.R[1] * e.c[1] + hf.R[2] * e.c[2] + hf.c[0], hf.R[3] * e.c[0] + hf.R[4] * e.c[1] + hf.R[5] * e.c[2] + hf.c[1], hf.R[6] * e.c[0] + hf.R[7] * e.c[1] + hf.R[8] * e.c[2] + hf.c[2]]; return { a: dot3(cw, rr) - view.org[0], b: dot3(cw, uu) - view.org[1] }; });
  const pxw = 1 / scale; // one pixel in world units
  const minPupil = (ink["pupil-min-px"][sizeKey] ?? 0) / 2 * pxw, minCatch = (ink["catch-min-px"][sizeKey] ?? 0) / 2 * pxw, minMouth = (ink["mouth-min-px"][sizeKey] ?? 0) * pxw, minNose = (ink["nose-min-px"][sizeKey] ?? 0) * pxw;
  const co = rf["catch-offset"], mouth = head.mouth;
  const mp = mouth.axis, mouthBound = { c: [mp[7][0], 0, mouth.z], r: mouth.w / 2 + 0.1 };

  function distMouth(x, y, z) { let d = 1e9; for (let i = 0; i < mp.length - 1; i++) { const a = mp[i], b = mp[i + 1], bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2], px = x - a[0], py = y - a[1], pz = z - a[2], h = clamp((px * bx + py * by + pz * bz) / (bx * bx + by * by + bz * bz), 0, 1); d = Math.min(d, Math.hypot(px - bx * h, py - by * h, pz - bz * h)); } return d; }

  // the eye at a local point: returns null when the point is off the eye, else { col, code } for the iris, the ring, the lid's edge or the catch light
  const creamHeadAt = (q, hy, zb, ch, nl) => sstep(zb + ch.soft, zb - ch.soft, q[2]) * Math.max(sstep(-0.1, 0.3, q[0] / (scene.head.K.a)), sstep(0.1, 0.5, -nl[2])) * (1 - sstep(ch.side[0], ch.side[1], Math.abs(hy) / (scene.W / 2)));
  function creamBodyAt(wp, nrm) {
    const cb = look.creamBody; if (!cb) return 0;
    const s = -nrm[2] * cb.down + nrm[0] * cb.front, xf = sstep(cb.x0, cb.x1, wp[0]) * (1 - sstep(cb.x2, cb.x3, wp[0]));
    return sstep(cb.t0, cb.t1, s) * xf * sstep(cb.z1, cb.z0, wp[2]) * (1 - sstep(cb.y0, cb.y1, Math.abs(wp[1]))) * (cb.n1 ? 1 - sstep(cb.n0, cb.n1, Math.abs(nrm[1])) : 1); // the bib's sides follow the chest's own curve (the lateral part of the normal)
  }
  function eyePaint(i, q, nrm, wp) {
    const e = eyes[i], X = q[0] - e.c[0], Y = q[1] - e.c[1], Z = q[2] - e.c[2], u = X * e.lat[0] + Y * e.lat[1] + Z * e.lat[2], v = X * e.up[0] + Y * e.up[1] + Z * e.up[2], w = X * e.n[0] + Y * e.n[1] + Z * e.n[2];
    if (w < -0.1 || w > 0.1) return null;
    const R = e.Riris, fwd = Math.max(0.3, dot3(nrm, towardLocal)), fw = (1.0 * pxw) / fwd; // the footprint of a pixel in the eye's plane
    const rho = Math.hypot(u, v / e.aspect) / R;
    const outer = e.Reye / R;
    if (rho > outer + fw / R) return null;
    const cover = sstep(outer + fw / R, outer - fw / R, rho); // soft outer edge of the ring (1 px)
    // the lid: skin covers the top of the iris AND of the ring, as a crescent whose edge is the iris's own arc shifted down by the lid's reach (not a straight cut)
    const lidA = e.lidOver > 1e-6 ? sstep(R - fw * 0.8, R + fw * 0.8, Math.hypot(u, (v + e.lidOver) / e.aspect)) * sstep(0.1 * R, 0.45 * R, v) : 0;
    // iris, in the plane: top darker, a lower crescent glow, a darker limbus
    const g = gaze[i], pu = u - g[0], pv = v - g[1], pr = Math.hypot(pu, pv / e.aspect), vn = v / R;
    let col = look.iris;
    col = mixc(col, look.irisTop, rf["iris-top-dark"] * sstep(-0.2, 0.9, vn));
    col = mixc(col, look.irisLow, 0.35 * sstep(0.9, 0.0, Math.hypot(pu, pv / e.aspect) / R * 1.6)); // a warm glow round the pupil
    col = mixc(col, look.irisLow, rf.crescent * sstep(0.3, 0.95, rho) * sstep(-0.1, 0.75, (u * 0.5 - v * 0.85) / R));
    col = mixc(col, scl(look.iris, 0.7), 0.8 * sstep(0.84, 0.99, rho));
    let code = INK.iris;
    const pupilR = Math.max(e.pupilR, minPupil), pa = sstep(pupilR + fw * 0.7, pupilR - fw * 0.7, pr);
    col = mixc(col, look.pupil, pa); if (pa > 0.5) code = INK.pupil;
    // the ring: flat, close to the cream field in value
    const ia = sstep(1 + fw / R * 0.7, 1 - fw / R * 0.7, rho);
    col = mixc(look.ring, col, ia); if (ia < 0.5) code = INK.ring;
    col = mixc(col, look.lid ?? look.body, lidA * 0.92); if (lidA > 0.5) code = INK.lid; // skin over the top of the ring as well as the iris
    // the catch light: in screen space, one offset for both eyes (plan 3.2), on the iris and never on the lid
    const sa = wp[0] * rr[0] + wp[1] * rr[1] + wp[2] * rr[2] - view.org[0] - eyeW[i].a, sb = wp[0] * uu[0] + wp[1] * uu[1] + wp[2] * uu[2] - view.org[1] - eyeW[i].b;
    const Rw = R, cr = Math.max(rf["catch-radius"] * Rw, minCatch), cy = Math.min(-co[1] * Rw, 0.98 * R - e.lidOver - cr - 0.04 * R), ca = Math.hypot(sa - co[0] * Rw, sb - cy); // the catch light sits below the lid's edge, never cut by it
    const catchA = sstep(cr + pxw * 0.6, cr - pxw * 0.6, ca) * ia;
    if (catchA > 0) { col = mixc(col, look.catchLight, catchA); if (catchA > 0.5) code = INK.catch; }
    col = scl(col, 1 - rf["brow-shadow"] * sstep(0.35, 1.0, v / e.Reye)); // the soft shadow under the brow, on the top of the eye
    return { col, cover, code, lid: lidA };
  }

  function material(wp, nrm, region) {
    // region: "head" | "body" | "crest" | "leg" | "toe" | "seg" | "skirt" | "ant"
    let albedo = look.body, code = INK.body, eye = false, gloss = 1, spec = 0;
    if (region === "crest") { // a leaf: its own colour, a lighter midrib down its centre, and a gloss (the master's leaves are glossy, each one separate)
      const q = toLocal(hf, wp[0], wp[1], wp[2]); let best = null, br = 1e9;
      for (const l of scene.extra.leaves) { const X = q[0] - l.c[0], Y = q[1] - l.c[1], Z = q[2] - l.c[2], f = l.f, u = (X * f.ax[0] + Y * f.ax[1] + Z * f.ax[2]) / (l.len / 2), v = X * f.aw[0] + Y * f.aw[1] + Z * f.aw[2], w = (X * f.an[0] + Y * f.an[1] + Z * f.an[2]) / (l.thick / 2), r = u * u + (v / (l.wid / 2)) ** 2 + w * w; if (r < br) { br = r; best = { u, v, l }; } }
      const rib = best ? sstep(rf["leaf-rib-width"], rf["leaf-rib-width"] * 0.3, Math.abs(best.v)) * sstep(-0.95, -0.55, best.u) * (1 - sstep(0.5, 0.95, best.u)) : 0;
      return { albedo: mixc(look.leaf, look.leafRib ?? look.cream, rib * rf["leaf-rib-strength"]), code: INK.leaf, spec: rf["leaf-gloss"], gloss: 1 };
    }
    if (region === "ant") return { albedo: mixc(look.body, look.cream, 0.15), code };
    if (region === "toe") return { albedo: look.toe, code: INK.cream };
    if (region === "toecrease") return { albedo: mixc(look.toe, look.body, 0.75), code: INK.cream };
    if (region === "leg") return { albedo: look.body, code };
    if (region === "skirt") return { albedo: look.skirt ?? look.body, code };
    if (region === "head") {
      const q = toLocal(hf, wp[0], wp[1], wp[2]), nl = [tl[0] * nrm[0] + tl[1] * nrm[1] + tl[2] * nrm[2], tl[3] * nrm[0] + tl[4] * nrm[1] + tl[5] * nrm[2], tl[6] * nrm[0] + tl[7] * nrm[1] + tl[8] * nrm[2]];
      const g = head.geometry, hy = q[1];
      // the cream field: its top edge IS the smile (the dark muzzle meets the cream jaw at the mouth line, `below` of 0.01 H), and behind each mouth corner it rises
      // up the cheek, `cheek-rise` per unit of lateral distance, to the eye's lower edge; soft (no fold, wedge or seam), one field shared with the body's
      if (look.creamHead) {
        const ch = look.creamHead, hw = mouth.w / 2, ay = Math.abs(hy), capZ = head.eyes[0].c[2] - head.eyes[0].Reye * ch["cheek-top"];
        let zb = mouth.zAt(Math.min(ay, hw)) - ch.below; if (ay > hw) zb = Math.min(zb + (ay - hw) * ch["cheek-rise"], Math.max(capZ, zb));
        albedo = mixc(albedo, look.cream, Math.max(creamHeadAt(q, hy, zb, ch, nl), creamBodyAt(wp, nrm)));
      }
      // the nose: its own ink (darker), set in the geometry of the nose ellipsoid
      if (head.nose.on) {
        const dn = scene.head.dNose(q[0], q[1], q[2]), na = sstep(0.012 + minNose * 0.5, -0.004, dn);
        if (na > 0) { albedo = mixc(albedo, look.nose, na * look.noseInk); gloss = 1 + (rf["nose-gloss"] - 1) * na; spec = rf["nose-highlight"] * na; if (na > 0.5) code = INK.nose; }
      }
      // the mouth: a dark line in the crease, at least the house's pixel width at the small sizes
      if (Math.hypot(q[0] - mouthBound.c[0], q[1], q[2] - mouthBound.c[2]) < mouthBound.r + 0.1) {
        const dm = distMouth(q[0], q[1], q[2]), wdt = Math.max(mouth.tube * look.mouthInk, minMouth / 2 + mouth.tube * 0.3), ma = sstep(wdt + pxw * 0.6, wdt - pxw * 0.6, dm);
        if (ma > 0) { albedo = mixc(albedo, look.mouth, ma); if (ma > 0.5) code = INK.mouth; }
      }
      let cov = 0;
      for (let i = 0; i < 2; i++) {
        const near = Math.hypot(q[0] - eyes[i].c[0], q[1] - eyes[i].c[1], q[2] - eyes[i].c[2]); if (near > eyes[i].Reye * 1.4 + 0.05) continue;
        const ep = eyePaint(i, q, nl, wp);
        if (ep) { albedo = mixc(albedo, ep.col, ep.cover); if (ep.cover > 0.5) { code = ep.code; eye = true; } if (ep.lid > 0 && ep.lid < 1 && ep.cover < 0.5) code = INK.lid; }
      }
      return { albedo, code, eye, gloss, spec };
    }
    // the body: the cream chest-and-belly field, a soft field in the mass's own coordinates
    albedo = mixc(albedo, look.cream, creamBodyAt(wp, nrm));
    if (look.spots && region === "seg") { /* marks: chunk 3 */ }
    return { albedo, code };
  }
  return { material, gaze, eyeW, towardLocal };
}
