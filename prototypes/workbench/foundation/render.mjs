// The renderer: sphere tracing of the creature's field in an orthographic camera, the house light as a deferred pass on the hit (warm key, cool shade,
// a warm terminator, occlusion scaled to H, a rim, a broad vinyl lobe, a soft cast shadow and a contact shadow on the floor), the painted layer from
// paint.mjs, and adaptive supersampling on the edges. Plain JavaScript, no node: imports. The light's numbers are the house file's.
import { gradient, march, sstep, clamp, norm3, dot3 } from "./sdf.mjs";
import { makePaint, INK } from "./paint.mjs";

export const SIZES = { 304: [304, 312], 96: [96, 88], 48: [48, 48] };
export const SS = { 304: 3, 96: 4, 48: 4 };
export function cameraBasis({ yaw, pitch }) {
  const y = (yaw * Math.PI) / 180, p = (pitch * Math.PI) / 180;
  const right = [Math.sin(y), Math.cos(y), 0], tv = [Math.cos(y), -Math.sin(y), 0];
  return { right, up: [-tv[0] * Math.sin(p), -tv[1] * Math.sin(p), Math.cos(p)], toward: [tv[0] * Math.cos(p), tv[1] * Math.cos(p), Math.sin(p)] };
}
const sphereOf = (b) => { const c = [0, 1, 2].map((i) => (b.lo[i] + b.hi[i]) / 2); return { c, R: Math.hypot(b.hi[0] - b.lo[0], b.hi[1] - b.lo[1], b.hi[2] - b.lo[2]) / 2 }; };

// a coarse orthographic pass: the screen extents of what the field hits, and its area (world units squared)
export function coarse(scene, camera, { n = 160, core = false } = {}) {
  const B = cameraBasis(camera), { c, R } = sphereOf(scene.bounds), d = core && scene.parts.core ? scene.parts.core : scene.d, cell = (2 * R) / n, eps = 0.004;
  let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity, hits = 0;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const a = -R + (i + 0.5) * cell, b = -R + (j + 0.5) * cell;
    const ox = c[0] + B.right[0] * a + B.up[0] * b + B.toward[0] * R, oy = c[1] + B.right[1] * a + B.up[1] * b + B.toward[1] * R, oz = c[2] + B.right[2] * a + B.up[2] * b + B.toward[2] * R;
    if (march(d, ox, oy, oz, -B.toward[0], -B.toward[1], -B.toward[2], 0, 2 * R, eps, 70) >= 0) { hits++; if (a < a0) a0 = a; if (a > a1) a1 = a; if (b < b0) b0 = b; if (b > b1) b1 = b; }
  }
  const sc = { a0: a0 - cell / 2, a1: a1 + cell / 2, b0: b0 - cell / 2, b1: b1 + cell / 2 };
  return { ...sc, area: hits * cell * cell, hits, cell, c, R, basis: B };
}

// the framing of the adult cut rule: the stand's height in px at 304 (ref.height), feet on the row, the box centred
export function framing(scene, camera, sizeKey, ref, ex) {
  const [W, H] = SIZES[sizeKey], hgt = ex.b1 - ex.b0, wid = ex.a1 - ex.a0, s304 = ref.height / hgt;
  let scale, feet;
  if (sizeKey === 304) { scale = s304; feet = 305; } else if (sizeKey === 96) { scale = s304 * 0.276; feet = 85; } else { scale = Math.min(44 / hgt, 44 / wid); feet = 44; }
  return { W, H, scale, cx: (ex.a0 + ex.a1) / 2, bottom: ex.b0, feet };
}

const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const normTint = (t) => { const m = 0.2126 * t[0] + 0.7152 * t[1] + 0.0722 * t[2]; return [t[0] / m, t[1] / m, t[2] / m]; };

export function renderCreature(scene, camera, sizeKey, { ref, look, extents = null, ss = null, floor = true } = {}) {
  const L0 = performance.now(), house = scene.house, lt = house.light, B = cameraBasis(camera), rr = B.right, uu = B.up, tt = B.toward;
  const ex = extents ?? coarse(scene, camera, { n: 220 }), fr = framing(scene, camera, sizeKey, ref, ex), { W, H, scale } = fr, SSn = ss ?? SS[sizeKey];
  const { c: cb, R } = sphereOf(scene.bounds), d = scene.d, eps = 0.0016 / Math.max(1, scale / 300 * 0 + 1);
  const paint = makePaint(scene, look, { scale, sizeKey, basis: B, org: [dot3(cb, rr), dot3(cb, uu)] });
  // the light: from the upper left, up by the elevation, a little toward the camera
  const az = (lt.key["azimuth-deg"] * Math.PI) / 180, el = (lt.key["elevation-deg"] * Math.PI) / 180;
  const Ls = [Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(el) * lt.key["toward-camera"] + Math.cos(el) * 0.4], Ll = Math.hypot(...Ls);
  const Lw = norm3([(rr[0] * Ls[0] + uu[0] * Ls[1] + tt[0] * Ls[2]) / Ll, (rr[1] * Ls[0] + uu[1] * Ls[1] + tt[1] * Ls[2]) / Ll, (rr[2] * Ls[0] + uu[2] * Ls[1] + tt[2] * Ls[2]) / Ll]);
  const Hv = norm3([Lw[0] + tt[0], Lw[1] + tt[1], Lw[2] + tt[2]]);
  const keyN = normTint(lt.key.color), shadeN = normTint(lt.shade.tint), term = lt.terminator, occ = lt.occlusion, rim = lt.rim, vin = lt.vinyl;
  const dir = [-tt[0], -tt[1], -tt[2]];
  const ray = (a, b) => [cb[0] + rr[0] * a + uu[0] * b + tt[0] * R, cb[1] + rr[1] * a + uu[1] * b + tt[1] * R, cb[2] + rr[2] * a + uu[2] * b + tt[2] * R];
  const toAB = (fx, fy) => [fr.cx + (fx - W / 2) / scale, fr.bottom + (fr.feet + 1 - fy) / scale];

  const aoOf = (px, py, pz, n) => {
    let o = 0, ws = 0;
    for (let i = 0; i < occ["radii-H"].length; i++) { const r = occ["radii-H"][i], qx = px + n[0] * r, qy = py + n[1] * r, qz = pz + n[2] * r, dd = Math.min(d(qx, qy, qz), qz); o += (1 - i * 0.18) * clamp((r - dd) / r, 0, 1); ws += 1 - i * 0.18; }
    return 1 - occ.strength * (o / ws);
  };
  // one sample: the ray at screen (fx, fy) in px. Returns [r, g, b, a (0..1), ink, tHit]
  const sample = (fx, fy) => {
    const [a, b] = toAB(fx, fy), o = ray(a, b), t = march(d, o[0], o[1], o[2], dir[0], dir[1], dir[2], 0, 2 * R, eps, 90);
    if (t >= 0) {
      let px = o[0] + dir[0] * t, py = o[1] + dir[1] * t, pz = o[2] + dir[2] * t;
      const n = gradient(d, px, py, pz, 0.0025), region = scene.regionOf(px, py, pz);
      let m = paint.material([px, py, pz], n, region);
      if (region === "head" || region === "body" || region === "seg") { const wh = scene.headWeight(px, py, pz); if (wh > 0.001 && wh < 0.999) { const m2 = paint.material([px, py, pz], n, region === "head" ? (scene.plan === "D" ? "seg" : "body") : "head"), wa = region === "head" ? wh : 1 - wh; m = { ...m, albedo: [m.albedo[0] * wa + m2.albedo[0] * (1 - wa), m.albedo[1] * wa + m2.albedo[1] * (1 - wa), m.albedo[2] * wa + m2.albedo[2] * (1 - wa)] }; } }
      let al = m.albedo;
      const ndl = dot3(n, Lw), tl = sstep(-0.22, 0.5, ndl), ao = aoOf(px, py, pz, n);
      const lit = [al[0] * keyN[0], al[1] * keyN[1], al[2] * keyN[2]], shade = [al[0] * lt.shade.ratio * shadeN[0], al[1] * lt.shade.ratio * shadeN[1], al[2] * lt.shade.ratio * shadeN[2]];
      let c = mixc(shade, lit, tl);
      const tb = Math.exp(-(((ndl - 0.06) / term.width) ** 2)) * term.strength;
      c = [c[0] + al[0] * term.tint[0] * tb * 0.8, c[1] + al[1] * term.tint[1] * tb * 0.8, c[2] + al[2] * term.tint[2] * tb * 0.8];
      c = [c[0] * ao, c[1] * ao, c[2] * ao];
      const nv = Math.max(0, dot3(n, tt)), rm = Math.pow(1 - nv, rim.power) * rim.strength * (0.35 + 0.65 * sstep(-0.3, 0.4, -ndl + 0.3)) * ao;
      c = [c[0] + rim.tint[0] * 255 * rm * 0.35, c[1] + rim.tint[1] * 255 * rm * 0.35, c[2] + rim.tint[2] * 255 * rm * 0.35];
      if (!m.eye) { const nh = Math.max(0, dot3(n, Hv)), gl = m.gloss ?? 1, sp = vin.strength * gl * Math.pow(nh, gl > 1.5 ? 40 : 14) * tl * (region === "head" || region === "crest" ? 1 : 0.8); c = [c[0] + 255 * sp, c[1] + 255 * sp * 0.97, c[2] + 255 * sp * 0.92]; }
      return [clamp(c[0], 0, 255), clamp(c[1], 0, 255), clamp(c[2], 0, 255), 1, m.code, t];
    }
    // the floor: the soft cast shadow toward the lower right, and a tight contact shadow under what touches it
    if (floor && dir[2] < -1e-6) {
      const tf = -o[2] / dir[2]; if (tf > 0 && tf < 2 * R) {
        const fxw = o[0] + dir[0] * tf, fyw = o[1] + dir[1] * tf;
        if (Math.hypot(fxw - cb[0], fyw - cb[1]) < R * 1.1) {
          // the house cast shadow: soft, toward the lower right, strongest at the foot and fading with the length of the light ray (no slab running off the tile)
          let res = 1, tt2 = 0.03, hitT = lt.floor.reach;
          for (let i = 0; i < 48; i++) { const h = d(fxw + Lw[0] * tt2, fyw + Lw[1] * tt2, Lw[2] * tt2); if (h < 0.002) { res = 0; hitT = tt2; break; } res = Math.min(res, (6 * h) / tt2); tt2 += clamp(h, 0.012, 0.18); if (tt2 > lt.floor.reach) break; }
          const cast = (1 - clamp(res, 0, 1)) * (1 - sstep(0.35 * lt.floor.reach, lt.floor.reach, hitT));
          let co = 0; for (const r of [0.025, 0.07, 0.16]) co += clamp((r - d(fxw, fyw, r)) / r, 0, 1); co /= 3;
          const al = Math.max(cast * lt.floor.alpha, co * lt.floor["contact-alpha"]) / 255;
          if (al > 0.012) return [lt.floor.color[0], lt.floor.color[1], lt.floor.color[2], al, INK.body, -1];
        }
      }
    }
    return [0, 0, 0, 0, INK.body, -1];
  };

  // pass A: one sample per pixel; pass B: the edges (a different hit state or a depth jump next door) are supersampled
  const N = W * H, A = new Array(N), tA = new Float32Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const s = sample(x + 0.5, y + 0.5); A[y * W + x] = s; tA[y * W + x] = s[5]; }
  const data = new Uint8ClampedArray(N * 4), inkMap = new Uint8Array(N), covMap = new Float32Array(N), depthJump = 0.05;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = y * W + x, t0 = tA[o]; let edge = false;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const t1 = tA[Y * W + X]; if ((t0 >= 0) !== (t1 >= 0) || (t0 >= 0 && Math.abs(t0 - t1) > depthJump)) { edge = true; break; } }
    // catch lights, pupils and mouth ink at 96 and 48 are small: supersample wherever the ink is not the body's
    if (!edge && sizeKey !== 304 && A[o][4] !== INK.body) edge = true;
    let r = 0, g = 0, b = 0, a = 0, cov = 0; const codes = {};
    if (edge) {
      for (let j = 0; j < SSn; j++) for (let i = 0; i < SSn; i++) { const s = sample(x + (i + 0.5) / SSn, y + (j + 0.5) / SSn); r += s[0] * s[3]; g += s[1] * s[3]; b += s[2] * s[3]; a += s[3]; if (s[5] >= 0) { cov++; codes[s[4]] = (codes[s[4]] ?? 0) + 1; } }
      const n2 = SSn * SSn; r /= n2; g /= n2; b /= n2; a /= n2; cov /= n2;
    } else { const s = A[o]; r = s[0] * s[3]; g = s[1] * s[3]; b = s[2] * s[3]; a = s[3]; cov = s[5] >= 0 ? 1 : 0; codes[s[4]] = 1; }
    if (a > 0) { data[o * 4] = r / a; data[o * 4 + 1] = g / a; data[o * 4 + 2] = b / a; data[o * 4 + 3] = a * 255; }
    covMap[o] = cov; let best = INK.body, bc = 0; for (const [k, v] of Object.entries(codes)) if (+k !== INK.body && v > bc) { bc = v; best = +k; } const tot = edge ? SSn * SSn : 1; inkMap[o] = bc >= tot * 0.3 ? best : INK.body; // a thin ink (the mouth, a catch light) counts from a third of the pixel
  }
  const proj = (p) => [W / 2 + (dot3([p[0] - cb[0], p[1] - cb[1], p[2] - cb[2]], rr) - fr.cx) * scale, fr.feet + 1 - (dot3([p[0] - cb[0], p[1] - cb[1], p[2] - cb[2]], uu) - fr.bottom) * scale];
  const eyesPx = scene.head.eyes.map((e, i) => { const cw = scene.hf.R, c = e.c, wp = [cw[0] * c[0] + cw[1] * c[1] + cw[2] * c[2] + scene.hf.c[0], cw[3] * c[0] + cw[4] * c[1] + cw[5] * c[2] + scene.hf.c[1], cw[6] * c[0] + cw[7] * c[1] + cw[8] * c[2] + scene.hf.c[2]]; return { at: proj(wp), r: e.Riris * scale, gaze: paint.gaze[i] }; });
  return { width: W, height: H, data, coverage: covMap, ink: inkMap, size: sizeKey, meta: { scale, framing: fr, extents: ex, eyes: eyesPx, project: proj, light: Lw, basis: B, ms: performance.now() - L0 }, paint };
}
