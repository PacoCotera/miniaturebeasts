// The stand renderer (the shape design 4): an orthographic camera, a z-buffer with per-pixel interpolated normals,
// supersampling, a key light with wrap diffuse and a hemisphere ambient, field ambient occlusion, a rim, eyes with
// fixed inks, the glow halo, the house shadow and the adult cut framing. Plain JavaScript, no node: imports.
import { cameraBasis } from "./species-trial.mjs";
import { makeMaterial, paintMarks, fringePass } from "./material.mjs";

export const SIZES = { 304: [304, 312], 96: [96, 88], 48: [48, 48] };
export const SS = { 304: 3, 96: 3, 48: 4 };
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const SHADOW = [30, 26, 34], SHADOW_A = 110;

// ink codes of the eyes (for the checks)
export const INK = { none: 0, body: 1, rim: 2, iris: 3, pupil: 4, catch: 5, nose: 6, halo: 7, mouth: 8 };
const NINK = 9;

// the framing of the adult cut rule. ref = { height: the stand's height in px at 304 } from the stand image.
export function framing(scene, camera, sizeKey, ref) {
  const basis = cameraBasis(camera), m = scene.mesh, V = m.vertices;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < V.length; i += 3) {
    const x = V[i] * basis.right[0] + V[i + 1] * basis.right[1] + V[i + 2] * basis.right[2];
    const y = V[i] * basis.up[0] + V[i + 1] * basis.up[1] + V[i + 2] * basis.up[2];
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  const [W, H] = SIZES[sizeKey];
  const s304 = ref.height / (y1 - y0);
  let scale, feet;
  if (sizeKey === 304) { scale = s304; feet = 305; }
  else if (sizeKey === 96) { scale = s304 * 0.276; feet = 85; }
  else { scale = Math.min(44 / (y1 - y0), 44 / (x1 - x0)); feet = 44; }
  // the box centre on the image centre; the lowest point on the feet row (pixel row centre = row + 0.5)
  return { W, H, scale, cx: (x0 + x1) / 2, bottom: y0, feet, basis, extent: [x1 - x0, y1 - y0] };
}

// ---- per-vertex ambient occlusion from the field -------------------------------------------------------------
export function vertexAO(scene) {
  const m = scene.mesh, F = scene.field, V = m.vertices, Nn = m.normals, n = V.length / 3, ao = new Float32Array(n);
  const D = [0.05, 0.12, 0.25];
  for (let i = 0; i < n; i++) {
    let occ = 0;
    for (const d of D) {
      const f = F.F3(V[i * 3] + Nn[i * 3] * d, V[i * 3 + 1] + Nn[i * 3 + 1] * d, V[i * 3 + 2] + Nn[i * 3 + 2] * d); // inside positive
      const dist = -f; occ += Math.max(0, d - dist) / d;
    }
    ao[i] = Math.min(1, Math.max(0, 1 - occ / (D.length + 1.5)));
  }
  return ao;
}

// ---- the renderer ---------------------------------------------------------------------------------------------
export function renderForm(scene, camera, sizeKey, opts = {}) {
  const ref = opts.ref, fr = framing(scene, camera, sizeKey, ref);
  const { W, H, scale, basis } = fr, ss = SS[sizeKey], SW = W * ss, SH = H * ss, SC = scale * ss;
  const m = scene.mesh, A = m.attrs, V = m.vertices, Nn = m.normals, F = m.faces, form = scene.form, look = form.look;
  const ao = opts.ao ?? (scene.ao ??= vertexAO(scene));
  const rr = basis.right, uu = basis.up, tt = basis.toward;
  // screen x: W/2 + (x - cx) * scale; y: feet - (y - bottom) * scale, pixel centres at +0.5
  const nv = V.length / 3, sx = new Float32Array(nv), sy = new Float32Array(nv), sz = new Float32Array(nv);
  for (let i = 0; i < nv; i++) {
    const x = V[i * 3], y = V[i * 3 + 1], z = V[i * 3 + 2];
    sx[i] = SW / 2 + (x * rr[0] + y * rr[1] + z * rr[2] - fr.cx) * SC;
    sy[i] = (fr.feet + 1) * ss - ((x * uu[0] + y * uu[1] + z * uu[2]) - fr.bottom) * SC;
    sz[i] = x * tt[0] + y * tt[1] + z * tt[2];
  }
  const nT = F.length / 3, depth = new Float32Array(SW * SH).fill(-Infinity), tri = new Int32Array(SW * SH).fill(-1), B1 = new Float32Array(SW * SH), B2 = new Float32Array(SW * SH);
  for (let t = 0; t < nT; t++) {
    const a = F[t * 3], b = F[t * 3 + 1], c = F[t * 3 + 2];
    const ax = sx[a], ay = sy[a], bx = sx[b], by = sy[b], cx = sx[c], cy = sy[c];
    const area = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay);
    if (area === 0) continue;
    // cull back faces (outward normals toward the viewer): the screen y axis points down, so the sign flips
    const nx = Nn[a * 3] + Nn[b * 3] + Nn[c * 3], ny = Nn[a * 3 + 1] + Nn[b * 3 + 1] + Nn[c * 3 + 1], nz = Nn[a * 3 + 2] + Nn[b * 3 + 2] + Nn[c * 3 + 2];
    if (nx * tt[0] + ny * tt[1] + nz * tt[2] < -0.35 * Math.hypot(nx, ny, nz) * 0) { /* keep all, depth decides */ }
    const minx = Math.max(0, Math.floor(Math.min(ax, bx, cx))), maxx = Math.min(SW - 1, Math.ceil(Math.max(ax, bx, cx)));
    const miny = Math.max(0, Math.floor(Math.min(ay, by, cy))), maxy = Math.min(SH - 1, Math.ceil(Math.max(ay, by, cy)));
    const inv = 1 / area, za = sz[a], zb = sz[b], zc = sz[c];
    for (let y = miny; y <= maxy; y++) {
      const py = y + 0.5;
      for (let x = minx; x <= maxx; x++) {
        const px = x + 0.5;
        const w1 = ((px - ax) * (cy - ay) - (cx - ax) * (py - ay)) * inv, w2 = ((bx - ax) * (py - ay) - (px - ax) * (by - ay)) * inv;
        if (w1 < 0 || w2 < 0 || w1 + w2 > 1) continue;
        const z = za + (zb - za) * w1 + (zc - za) * w2, o = y * SW + x;
        if (z > depth[o]) { depth[o] = z; tri[o] = t; B1[o] = w1; B2[o] = w2; }
      }
    }
  }
  // lighting
  const Lk = (() => { const v = [-0.5 * rr[0] + 0.8 * uu[0] + 0.45 * tt[0], -0.5 * rr[1] + 0.8 * uu[1] + 0.45 * tt[1], -0.5 * rr[2] + 0.8 * uu[2] + 0.45 * tt[2]]; const l = Math.hypot(...v); return v.map((x) => x / l); })();
  const Hh = (() => { const v = [Lk[0] + tt[0], Lk[1] + tt[1], Lk[2] + tt[2]]; const l = Math.hypot(...v); return v.map((x) => x / l); })();
  const pig = look.pigments, slotOf = (partName) => look.slots?.[partName] ?? partName;
  const partSlotCol = A.partNames.map((p) => pig[slotOf(p)] ?? [180, 180, 180]);
  const partIsEye = A.partNames.map((p) => p === "eye");
  const eyes = scene.field.eyes, faceM = scene.field.faceM, ek = look.eyes, glowCol = pig.glow ?? null, marks = scene.field.marks ?? [];
  const acc = new Float32Array(W * H * 4), cov = new Float32Array(W * H), em = new Float32Array(W * H), ink = new Uint8Array(W * H * NINK), shadowCov = new Float32Array(W * H);
  const inkCount = new Int32Array(W * H * NINK);
  const bellyAcc = new Float32Array(W * H), flowS = new Float32Array(W * H * 2), plateCov = new Float32Array(W * H), partMap = new Int16Array(W * H).fill(-1), groupMap = new Int16Array(W * H).fill(-1), angleMap = new Float32Array(W * H), sigmaMap = new Float32Array(W * H);
  // the mouth's ink: the darker of the nose ink and the plate pigment x 0.45 (design 2.5)
  const lum = (c) => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2], plateC = (pig.patch ?? pig.belly ?? [128, 128, 128]).map((v) => v * 0.45), noseC = look.nose ?? [60, 50, 50];
  const mouthCol = lum(noseC) < lum(plateC) ? noseC : plateC;
  // the catch light sits between the key light and the eye's own axis, so both eyes carry one inside their cap
  const eyeH = eyes.map((e) => { const v = [Hh[0] * 0.45 + e.n[0] * 0.55, Hh[1] * 0.45 + e.n[1] * 0.55, Hh[2] * 0.45 + e.n[2] * 0.55], l = Math.hypot(...v); return v.map((x) => x / l); });
  const Mat = makeMaterial(form, sizeKey, scale, opts), groupNames = scene.field.groups.all.map((g) => g.id);
  const K1 = 1.04, k0 = form.look.material?.k0 ?? (Mat.kind === "skin" ? 0.58 : 0.66), rimStrength = 0.15, hairF = scene.field.hair, hairSpan = hairF ? [hairF.floorZ, hairF.hairParams.Htot] : null;
    for (let sy2 = 0; sy2 < SH; sy2++) for (let sx2 = 0; sx2 < SW; sx2++) {
    const o = sy2 * SW + sx2, t = tri[o]; if (t < 0) continue;
    const a = F[t * 3], b = F[t * 3 + 1], c = F[t * 3 + 2], w1 = B1[o], w2 = B2[o], w0 = 1 - w1 - w2;
    let nx = Nn[a * 3] * w0 + Nn[b * 3] * w1 + Nn[c * 3] * w2, ny = Nn[a * 3 + 1] * w0 + Nn[b * 3 + 1] * w1 + Nn[c * 3 + 1] * w2, nz = Nn[a * 3 + 2] * w0 + Nn[b * 3 + 2] * w1 + Nn[c * 3 + 2] * w2;
    const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
    const I = (arr) => arr[a] * w0 + arr[b] * w1 + arr[c] * w2;
    const px = V[a * 3] * w0 + V[b * 3] * w1 + V[c * 3] * w2, py = V[a * 3 + 1] * w0 + V[b * 3 + 1] * w1 + V[c * 3 + 1] * w2, pz = V[a * 3 + 2] * w0 + V[b * 3 + 2] * w1 + V[c * 3 + 2] * w2;
    const part = A.part[a];
    let col = partSlotCol[part], inkCode = INK.body, spec = 0, matte = 1;
    const pv = [px, py, pz];
    const Tv = [A.T[a * 3] * w0 + A.T[b * 3] * w1 + A.T[c * 3] * w2, A.T[a * 3 + 1] * w0 + A.T[b * 3 + 1] * w1 + A.T[c * 3 + 1] * w2, A.T[a * 3 + 2] * w0 + A.T[b * 3 + 2] * w1 + A.T[c * 3 + 2] * w2];
    const ctxM = { p: pv, n: [nx, ny, nz], T: Tv, sigma: I(A.sigma), group: groupNames[A.group[a]], h: Hh, part: A.partNames[part], angle: I(A.angle), lock: { t: I(A.lt), jit: I(A.lid), tip: I(A.ltip), tier: I(A.ltier) }, zrel: hairSpan ? (pz - hairSpan[0]) / hairSpan[1] : 0.5 };
    // the marks, painted in a fixed order over the slot's pigment (design 1.4)
    const mout = {};
    col = paintMarks(look, Mat, { ...ctxM, out: mout, part: A.partNames[part], u0: I(A.u0), angle: I(A.angle), belly: I(A.belly), patch: I(A.patch), fx: I(A.fx), fy: I(A.fy), eyes: faceM?.eyes, col }, col);
    if (mout.ring > 0.5 && !partIsEye[part]) inkCode = INK.rim; // the skin ring round an eye is the eye's rim ink
    const surf = Mat.surface(ctxM); nx = surf.n[0]; ny = surf.n[1]; nz = surf.n[2];
    // emission: ramped toward the glow pigment
    const emv = I(A.emission);
    if (glowCol && emv > 0.02) col = mix(col, glowCol, Math.min(1, emv * 1.1));
    // the eye: concentric inks about the eye's axis
    if (partIsEye[part] && A.eye[a] >= 0) {
      const e = eyes[A.eye[a]];
      const ux = (px - e.c[0]) / e.r, uy = (py - e.c[1]) / e.r, uz = (pz - e.c[2]) / e.r;
      const cth = ux * e.n[0] + uy * e.n[1] + uz * e.n[2], th = Math.acos(Math.max(-1, Math.min(1, cth)));
      // the eye plane: stretched along the face's up by 1/aspect (an almond is wider than tall), and a lid share of the top covered by body colour
      const ax = ux * e.rt[0] + uy * e.rt[1] + uz * e.rt[2], ay = ux * e.up[0] + uy * e.up[1] + uz * e.up[2], ll = Math.hypot(ax, ay) || 1;
      const stretch = Math.hypot(ax, ay / e.aspect) / ll, u = (th / Math.acos(e.cap)) * stretch;
      const big = ek.big;
      const pr = ek.pupil_r ?? (big ? 0.34 : 0.5), ir = ek.iris_r ?? (big ? 0.66 : 0.78);
      if (u > 1 || (e.lid > 0 && ay / (Math.sin(Math.acos(e.cap)) * e.aspect) > 1 - 2 * e.lid)) { /* body colour: the lid */ }
      else {
        if (u < pr) { col = ek.pupil; inkCode = INK.pupil; }
        else if (u < ir) { col = ek.iris; inkCode = INK.iris; }
        else { col = ek.rim; inkCode = INK.rim; }
        spec = 1; matte = ek.matte ?? 0.6;
      }
    } else {
      for (let mi = 0; mi < marks.length; mi++) {
        const mv = I(A.marks[mi]);
        if (mv < 1.0 && marks[mi].kind === "nose") { col = mix(col, look.nose ?? [60, 50, 50], sstep(1.0, 0.6, mv)); if (mv < 0.8) inkCode = INK.nose; }
      }
    }
    const mf = faceM?.mouth; // the mouth: an ink stroke in face coordinates, antialiased over one pixel
    if (mf && inkCode === INK.body && sizeKey !== 48) { const mv = I(A.mouth), pxU = 1 / scale, cov2 = sstep(mf.t / 2 + pxU / 2, mf.t / 2 - pxU / 2, mv); if (cov2 > 0) { col = mix(col, mouthCol, cov2); if (cov2 > 0.5) inkCode = INK.mouth; } }
    // light (round 3, design 5): each pigment has a tone ramp k0 .. k1 and shading moves only inside it: no hue leaves the pigment, nothing goes black or white outside the eyes
    const ndl = nx * Lk[0] + ny * Lk[1] + nz * Lk[2];
    const aov = I(ao), isEyePx = partIsEye[part] && A.eye[a] >= 0;
    let k;
    if (isEyePx) { // the eye keeps the round 2 light (its inks are fixed)
      const diff = Math.min(1, Math.max(0, (ndl + 0.6) / 1.6)), amb = 0.15 + 0.2 * (nz * 0.5 + 0.5), rim = rimStrength * Math.pow(1 - Math.max(0, nx * tt[0] + ny * tt[1] + nz * tt[2]), 3) * Math.max(0, ndl * 0.5 + 0.5);
      k = (diff * 0.85 * (0.4 + 0.6 * aov) + amb * aov + rim) * matte * surf.k + (emv > 0.02 ? 0.35 * emv : 0);
    } else {
      const k0p = look.ramp?.light !== undefined ? k0 + (look.ramp.light - k0) * (mout.light ?? 0) : k0; // round 4: the light marks have their own floor
      const dd = Math.min(1, Math.max(0, (ndl + 0.7) / 1.7)), ramp = k0p + (K1 - k0p) * dd, graze = Math.pow(1 - Math.max(0, nx * tt[0] + ny * tt[1] + nz * tt[2]), 3);
      k = ramp * (1 - 0.3 * (1 - aov)) * surf.k + (Mat.kind === "skin" ? 0 : 0.06 * graze) + (emv > 0.02 ? 0.35 * emv : 0); // AO softened; a light rim on fur, never a dark one
    }
    let r = col[0] * k, g = col[1] * k, bl = col[2] * k;
    if (surf.sheen > 0) { const lt = mix(col, [255, 255, 255], surf.sheenLight ?? 0.4); r += lt[0] * surf.sheen; g += lt[1] * surf.sheen; bl += lt[2] * surf.sheen; } // the anisotropic sheen, the pigment lightened 40 %
    if (surf.gloss > 0 && !partIsEye[part]) { const nh2 = Math.max(0, nx * Hh[0] + ny * Hh[1] + nz * Hh[2]), gl = surf.gloss * Math.pow(nh2, 24); r += (255 - r) * gl; g += (255 - g) * gl; bl += (255 - bl) * gl; } // a soft Blinn gloss
    if (spec) { const eH = partIsEye[part] && A.eye[a] >= 0 ? eyeH[A.eye[a]] : Hh, nh = nx * eH[0] + ny * eH[1] + nz * eH[2]; const s = sstep(0.975, 0.992, nh); r += (255 - r) * s; g += (255 - g) * s; bl += (255 - bl) * s; if (s > 0.5) inkCode = INK.catch; }
    const px2 = Math.floor(sx2 / ss), py2 = Math.floor(sy2 / ss), po = py2 * W + px2;
    if (sizeKey !== 48 && Mat.kind !== "skin") { const f2 = Mat.flow(Tv, ctxM.sigma, ctxM.group, [nx, ny, nz]); flowS[po * 2] = f2[0] * rr[0] + f2[1] * rr[1] + f2[2] * rr[2]; flowS[po * 2 + 1] = -(f2[0] * uu[0] + f2[1] * uu[1] + f2[2] * uu[2]); }
    plateCov[po] += I(A.patch) > 0.5 ? 1 : 0; bellyAcc[po] += I(A.belly);
    acc[po * 4] += Math.min(255, r); acc[po * 4 + 1] += Math.min(255, g); acc[po * 4 + 2] += Math.min(255, bl);
    acc[po * 4 + 3] += 1; cov[po] += 1; em[po] += emv;
    if (partMap[po] < 0) { partMap[po] = part; groupMap[po] = A.group[a]; angleMap[po] = I(A.angle); sigmaMap[po] = I(A.sigma); }
    inkCount[po * NINK + inkCode]++;
  }
  const n2 = ss * ss;
  for (let i = 0; i < W * H; i++) { em[i] /= Math.max(1, cov[i]); cov[i] /= n2; }
  // the halo: the emission mask blurred, laid beyond the outline
  let halo = null;
  if (glowCol && opts.glow !== false) {
    const sig = Math.max(0.5, 0.12 * scale), rad = Math.ceil(3 * sig), ker = []; let ks = 0;
    for (let i = -rad; i <= rad; i++) { const w = Math.exp(-(i * i) / (2 * sig * sig)); ker.push(w); ks += w; }
    const src = new Float32Array(W * H), tmp = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) src[i] = em[i] * cov[i];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let s = 0; for (let i = -rad; i <= rad; i++) { const xx = x + i; if (xx >= 0 && xx < W) s += src[y * W + xx] * ker[i + rad]; } tmp[y * W + x] = s / ks; }
    halo = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let s = 0; for (let i = -rad; i <= rad; i++) { const yy = y + i; if (yy >= 0 && yy < H) s += tmp[yy * W + x] * ker[i + rad]; } halo[y * W + x] = Math.min(1, s / ks * (opts.haloGain ?? 3.2)); }
  }
  // the house shadow: an ellipse under the contacts
  const contacts = scene.built.contacts, boxW = fr.extent[0] * scale;
  const shRx = 0.47 * boxW, shRy = Math.max(1.2, shRx * Math.sin((camera.pitch * Math.PI) / 180) * 0.6 + 0.5);
  const shCy = fr.feet + 0.5 - shRy * 0.35 + (sizeKey === 304 ? -0.5 : 0);
  const shCx = W / 2;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let c = 0; const q = 3;
    for (let j = 0; j < q; j++) for (let i = 0; i < q; i++) { const dx = (x + (i + 0.5) / q - shCx) / shRx, dy = (y + (j + 0.5) / q - shCy) / shRy; if (dx * dx + dy * dy <= 1) c++; }
    shadowCov[y * W + x] = c / (q * q);
  }
  // composite
  const data = new Uint8ClampedArray(W * H * 4), haloMask = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const cc = cov[i];
    let cr = 0, cg = 0, cb = 0;
    if (acc[i * 4 + 3] > 0) { cr = acc[i * 4] / acc[i * 4 + 3]; cg = acc[i * 4 + 1] / acc[i * 4 + 3]; cb = acc[i * 4 + 2] / acc[i * 4 + 3]; }
    if (sizeKey === 48) {
      if (cc >= 0.5) { data[i * 4] = cr; data[i * 4 + 1] = cg; data[i * 4 + 2] = cb; data[i * 4 + 3] = 255; }
      else if (halo && halo[i] * (1 - cc) >= 0.5) { data[i * 4] = glowCol[0]; data[i * 4 + 1] = glowCol[1]; data[i * 4 + 2] = glowCol[2]; data[i * 4 + 3] = 255; haloMask[i] = 1; }
      else if (shadowCov[i] >= 0.5) { data[i * 4] = SHADOW[0]; data[i * 4 + 1] = SHADOW[1]; data[i * 4 + 2] = SHADOW[2]; data[i * 4 + 3] = SHADOW_A; }
      continue;
    }
    // under-layers: shadow, then the halo
    const sa = (shadowCov[i] * SHADOW_A) / 255, ha = halo ? halo[i] * 0.85 : 0;
    // back to front: shadow, halo, creature (coverage cc)
    let aU = sa, rU = SHADOW[0], gU = SHADOW[1], bU = SHADOW[2];
    if (ha > 0) { const aN = ha + aU * (1 - ha); rU = (glowCol[0] * ha + rU * aU * (1 - ha)) / (aN || 1); gU = (glowCol[1] * ha + gU * aU * (1 - ha)) / (aN || 1); bU = (glowCol[2] * ha + bU * aU * (1 - ha)) / (aN || 1); aU = aN; haloMask[i] = ha * (1 - cc); }
    const aOut = cc + aU * (1 - cc);
    if (aOut > 0) {
      data[i * 4] = (cr * cc + rU * aU * (1 - cc)) / aOut; data[i * 4 + 1] = (cg * cc + gU * aU * (1 - cc)) / aOut; data[i * 4 + 2] = (cb * cc + bU * aU * (1 - cc)) / aOut; data[i * 4 + 3] = aOut * 255;
    }
  }
  if (sizeKey !== 48 && opts.material !== false && Mat.kind === "fur" && Mat.clump) fringePass({ data, cov, flowS, W, H, depthU: form.coat?.depth ?? (form.hair ? 0.1 : 0), scale, kind: Mat.kind, sigmaMap, angleMap, clump: Mat.clump, plumeClump: Mat.clumpPlume ?? Mat.clump, partMap, plumeId: A.partNames.indexOf("plume"), R: Mat.clumpR });
  // the ink of each pixel: the most frequent non-body code with at least half the covered samples
  const inkMap = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) { let best = 0, bc = 0; for (let k = 2; k < NINK; k++) if (inkCount[i * NINK + k] > bc) { bc = inkCount[i * NINK + k]; best = k; } inkMap[i] = bc * 2 >= n2 * 0 + Math.max(1, cov[i] * n2) ? best : INK.body; }
  const px = (p) => [W / 2 + (p[0] * rr[0] + p[1] * rr[1] + p[2] * rr[2] - fr.cx) * scale, (fr.feet + 1) - ((p[0] * uu[0] + p[1] * uu[1] + p[2] * uu[2]) - fr.bottom) * scale];
  const features = sizeKey === 304 ? null : featurePass({ skey: form.key, W, H, sizeKey, data, inkMap, cov, depth, SW, ss, project: px, tt, faceM, field: scene.field, look, scale, mouthCol });
  return {
    features, plate: plateCov, bellyMap: (() => { const b = new Float32Array(W * H); for (let i = 0; i < W * H; i++) b[i] = bellyAcc[i] / Math.max(1, cov[i] * n2); return b; })(), width: W, height: H, data, coverage: cov, ink: inkMap, halo: haloMask, shadow: shadowCov, size: sizeKey,
    maps: { part: partMap, group: groupMap, angle: angleMap, sigma: sigmaMap, partNames: A.partNames, groupNames: scene.field.groups.all.map((g) => g.id) },
    meta: { scale, feet: fr.feet, cx: fr.cx, bottom: fr.bottom, extent: fr.extent, eyes: eyes.map((e) => ({ at: px(e.c), r: e.r * scale, apex: px([e.c[0] + e.n[0] * e.r, e.c[1] + e.n[1] * e.r, e.c[2] + e.n[2] * e.r]), capR: e.r * Math.sin(Math.acos(e.cap)) * scale })), basis, project: px },
  };
}

// a PNG-ready image (RGBA) from a render
export const toImage = (r) => ({ width: r.width, height: r.height, data: r.data });

// the silhouette only (coverage, 2 x 2 samples): the fast path of the tuning search and of the visibility report
export function silhouette(scene, camera, sizeKey, ref, { pad = 0, ss = 2 } = {}) {
  const fr = framing(scene, camera, sizeKey, ref), { H, scale, basis } = fr, W = fr.W + 2 * pad;
  const SW = W * ss, SH = H * ss, SC = scale * ss, m = scene.mesh, V = m.vertices, F = m.faces, rr = basis.right, uu = basis.up;
  const nv = V.length / 3, sx = new Float32Array(nv), sy = new Float32Array(nv);
  for (let i = 0; i < nv; i++) {
    const x = V[i * 3], y = V[i * 3 + 1], z = V[i * 3 + 2];
    sx[i] = SW / 2 + (x * rr[0] + y * rr[1] + z * rr[2] - fr.cx) * SC;
    sy[i] = (fr.feet + 1) * ss - ((x * uu[0] + y * uu[1] + z * uu[2]) - fr.bottom) * SC;
  }
  const bits = new Uint8Array(SW * SH);
  for (let t = 0; t < F.length; t += 3) {
    const a = F[t], b = F[t + 1], c = F[t + 2], ax = sx[a], ay = sy[a], bx = sx[b], by = sy[b], cx = sx[c], cy = sy[c];
    const area = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay); if (area === 0) continue;
    const minx = Math.max(0, Math.floor(Math.min(ax, bx, cx))), maxx = Math.min(SW - 1, Math.ceil(Math.max(ax, bx, cx)));
    const miny = Math.max(0, Math.floor(Math.min(ay, by, cy))), maxy = Math.min(SH - 1, Math.ceil(Math.max(ay, by, cy))), inv = 1 / area;
    for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) {
      const px = x + 0.5, py = y + 0.5, w1 = ((px - ax) * (cy - ay) - (cx - ax) * (py - ay)) * inv, w2 = ((bx - ax) * (py - ay) - (px - ax) * (by - ay)) * inv;
      if (w1 >= 0 && w2 >= 0 && w1 + w2 <= 1) bits[y * SW + x] = 1;
    }
  }
  const cov = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let s = 0; for (let j = 0; j < ss; j++) for (let i = 0; i < ss; i++) s += bits[(y * ss + j) * SW + x * ss + i]; cov[y * W + x] = s / (ss * ss); }
  return { width: W, height: H, coverage: cov, framing: fr };
}

// ---- the feature pass at 96 and 48 (design 3): hard-pixel glyphs at the projected anchors, after shading ------------------------
// Each feature is drawn at the larger of its projected size and the minimum; only where its anchor is visible (depth within 0.02 U) and
// n.view >= 0.15; the eye line stays above the nose above the mouth, each >= 1 px from the next and >= 1 px inside the outline. When
// they would collide the mouth is dropped, then the nose, never an eye. Same bytes every run: no randomness.
const aspectOf = (ry, rx) => (rx > 0 ? ry / rx : 1), lightRim = (c) => (Lstar(c) < 70 ? [240, 236, 224] : c);
const Lstar = (c) => { const f = (v) => { v /= 255; v = v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); return v; }, y = 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); return y > 0.008856 ? 116 * Math.cbrt(y) - 16 : 903.3 * y; };
export { Lstar };
export const MIN_EYE = { 96: [3, 3], 48: [2, 2] };
function featurePass({ skey, W, H, sizeKey, data, inkMap, cov, depth, SW, ss, project, tt, faceM, field, look, scale, mouthCol }) {
  const out = { eyes: [], nose: [], mouth: null, dropped: [] };
  if (!faceM) return out;
  const ek = look.eyes, pig = look.pigments, put = (x, y, c, code) => { if (x < 0 || y < 0 || x >= W || y >= H) return false; const i = y * W + x; data[i * 4] = c[0]; data[i * 4 + 1] = c[1]; data[i * 4 + 2] = c[2]; data[i * 4 + 3] = 255; inkMap[i] = code; return true; };
  const inside = (x, y) => x >= 1 && y >= 1 && x < W - 1 && y < H - 1 && cov[y * W + x] >= 0.5 && cov[y * W + x - 1] >= 0.5 && cov[y * W + x + 1] >= 0.5 && cov[(y - 1) * W + x] >= 0.5 && cov[(y + 1) * W + x] >= 0.5; // >= 1 px inside the outline
  const seen = (p, n) => { // the anchor passes the depth test and n.view >= 0.15
    const q = project(p), z = p[0] * tt[0] + p[1] * tt[1] + p[2] * tt[2]; if (n[0] * tt[0] + n[1] * tt[1] + n[2] * tt[2] < 0.15) return null;
    const sx = Math.floor(q[0] * ss), sy = Math.floor(q[1] * ss); let ok = false;
    for (let dy = -1; dy <= 1 && !ok; dy++) for (let dx = -1; dx <= 1 && !ok; dx++) { const x = sx + dx, y = sy + dy; if (x >= 0 && y >= 0 && x < SW && y < depth.length / SW && depth[y * SW + x] <= z + 1e-9 + 0.02 && depth[y * SW + x] >= z - 0.02 - 0.3 * 0) ok = true; }
    return ok ? q : null;
  };
  // ---- the eye glyph (round 3, design 6): antialiased discs at the eye's sub-pixel centre, 4 x 4 samples per pixel, the core in the species' own hue ----
  const rgbAt = (x, y) => { const i = (y * W + x) * 4; return [data[i], data[i + 1], data[i + 2]]; };
  const mixc = (c1, c2, t) => [c1[0] + (c2[0] - c1[0]) * t, c1[1] + (c2[1] - c1[1]) * t, c1[2] + (c2[2] - c1[2]) * t];
  const darkTo = (c, lim) => { let s = 1; let col = c; while (Lstar(col) > lim && s > 0.05) { s *= 0.92; col = [c[0] * s, c[1] * s, c[2] * s]; } return col; }; // darker, the hue kept
  const ellCov = (x, y, cx, cy, rx, ry) => { let n = 0; for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const dx = (x + (i + 0.5) / 4 - cx) / rx, dy = (y + (j + 0.5) / 4 - cy) / ry; if (dx * dx + dy * dy <= 1) n++; } return n / 16; };
  const blend = (x, y, col, a, code) => { if (a <= 0 || x < 0 || y < 0 || x >= W || y >= H) return; const i = y * W + x, p = data.subarray(i * 4, i * 4 + 3); for (let c = 0; c < 3; c++) p[c] = p[c] * (1 - a) + col[c] * a; data[i * 4 + 3] = 255; if (a >= 0.5 && code) inkMap[i] = code; };
  // the mesh's own eye (sphere, iris, pupil) is under the glyph: fill it in from the pixels round it, so the glyph is drawn over the face, not over a second eye
  { const mask = new Uint8Array(W * H); let any = false;
    for (const e of faceM.eyes) { const q = project(e.c), rr = Math.ceil(1.2 * e.r * scale + 2); for (let y = Math.floor(q[1] - rr); y <= Math.ceil(q[1] + rr); y++) for (let x = Math.floor(q[0] - rr); x <= Math.ceil(q[0] + rr); x++) { if (x < 0 || y < 0 || x >= W || y >= H) continue; const code = inkMap[y * W + x]; if (code === INK.rim || code === INK.iris || code === INK.pupil || code === INK.catch) { mask[y * W + x] = 1; any = true; } } }
    for (let it = 0; it < 6 && any; it++) { any = false; const fills = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (!mask[y * W + x]) continue; let s = [0, 0, 0], n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H || mask[Y * W + X] || cov[Y * W + X] < 0.5) continue; const o = (Y * W + X) * 4; s[0] += data[o]; s[1] += data[o + 1]; s[2] += data[o + 2]; n++; } if (n) fills.push([x, y, s.map((v) => v / n)]); else any = true; } for (const [x, y, c] of fills) { const o = (y * W + x) * 4; data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; mask[y * W + x] = 0; inkMap[y * W + x] = INK.body; } } }
  const recs = [];
  for (const e of faceM.eyes) {
    const tip = [e.hit[0] + e.n[0] * e.protrude * e.r, e.hit[1] + e.n[1] * e.protrude * e.r, e.hit[2] + e.n[2] * e.protrude * e.r], q = seen(tip, e.n);
    if (!q) { out.eyes.push({ visible: false }); continue; }
    const irisR = ek.iris_r ?? (ek.big ? 0.66 : 0.78), pupilR = ek.pupil_r ?? 0.5, capR = Math.sin(Math.acos(e.cap)), aspect = (faceM.spec.eyes.aspect ?? 1) < 0.8 ? 0.75 : 1;
    const Dmin = sizeKey === 96 ? 3.2 : 2.2, D = Math.max(Dmin, 2 * e.r * capR * irisR * scale);
    // round 4 (C4), look.eyes.foreshorten: the glyph's width follows how squarely the eye faces the viewer, clamped to .45 .. 1 (a far eye on the side of the head is a narrow ellipse, not a disc)
    const fs = ek.foreshorten ? Math.min(1, Math.max(0.45, e.n[0] * tt[0] + e.n[1] * tt[1] + e.n[2] * tt[2])) : 1;
    recs.push({ e, cx: q[0], cy: q[1], D, DX: D * fs, DY: D * aspect, irisR, pupilR });
  }
  // the gap rule: >= 2 px clear between the discs at 96 and >= 1 px at 48 (the only reason an eye moves by more than 0.5 px)
  if (recs.length === 2) { const [a, b] = recs[0].cx < recs[1].cx ? [recs[0], recs[1]] : [recs[1], recs[0]], need = sizeKey === 96 ? 2 : 1, gap = b.cx - b.DX / 2 - (a.cx + a.DX / 2); if (gap < need) { const d = (need - gap) / 2; a.cx -= d; b.cx += d; } }
  const boxes = [], species = faceM.spec.eyes.spread !== undefined && faceM.spec.eyes.ex === undefined ? "angular" : "frontal";
  for (const g of recs) {
    let { cx, cy } = g; const { D, DX, DY, irisR, pupilR } = g, rx = DX / 2, ry = DY / 2, hasPupil = D >= (sizeKey === 96 ? 5 : 3.5), coreLim = sizeKey === 96 ? 30 : 25;
    const irisC = ek.iris, pupilC = darkTo(ek.pupil, coreLim);
    const coreC = hasPupil ? mixc(irisC, ek.pupil, 0.35) : darkTo(mixc(irisC, ek.pupil, 0.5), coreLim);
    const ringW = species === "angular" ? (sizeKey === 96 ? 1 : 0.6) : (skey === "loika" ? (sizeKey === 96 ? 1.6 : 0.9) : sizeKey === 96 ? 1 : 0), pad = Math.ceil(Math.max(rx, ry) + ringW + 2);
    // the eye's box for the checks: the integer square of the core (side floor(D)), so a disc spills a little over its corners and the corner pixels are blends
    // the disc is centred on its box (a move of at most .5 px), so the four corner pixels of the box are always partly covered: blends
    const sw = Math.max(2, Math.round(1 + 0.707 * DX)), sh = Math.max(2, Math.round(1 + 0.707 * DY)); let x0 = Math.round(cx - sw / 2), x1 = x0 + sw - 1, y0 = Math.round(cy - sh / 2), y1 = y0 + sh - 1;
    g.cx = cx = x0 + sw / 2; g.cy = cy = y0 + sh / 2;
    // round 4 (C4): every pixel the disc touches must lie in the mesh (coverage >= .5); if not, the centre moves up to 1 px inward along the outline's normal (the coverage gradient over the disc),
    // and the pixels still outside are not drawn (the ring, the disc, the pupil and the catch light alike)
    const fore = !!ek.foreshorten, covAt = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : cov[y * W + x]), okPx = (x, y) => !fore || covAt(x, y) >= 0.5;
    if (fore) {
      const outside = (ccx, ccy) => { let n = 0; for (let y = Math.floor(ccy - ry) - 1; y <= Math.ceil(ccy + ry) + 1; y++) for (let x = Math.floor(ccx - rx) - 1; x <= Math.ceil(ccx + rx) + 1; x++) if (ellCov(x, y, ccx, ccy, rx, ry) > 0 && covAt(x, y) < 0.5) n++; return n; };
      if (outside(cx, cy) > 0) {
        let gx = 0, gy = 0; for (let y = Math.floor(cy - ry) - 1; y <= Math.ceil(cy + ry) + 1; y++) for (let x = Math.floor(cx - rx) - 1; x <= Math.ceil(cx + rx) + 1; x++) if (ellCov(x, y, cx, cy, rx, ry) > 0) { gx += covAt(x + 1, y) - covAt(x - 1, y); gy += covAt(x, y + 1) - covAt(x, y - 1); }
        const gl = Math.hypot(gx, gy); if (gl > 1e-9) { gx /= gl; gy /= gl; let bt = 0, bn = outside(cx, cy); for (let t = 0.25; t <= 1 + 1e-9; t += 0.25) { const n = outside(cx + gx * t, cy + gy * t); if (n < bn) { bn = n; bt = t; } if (n === 0) break; } cx += gx * bt; cy += gy * bt; g.cx = cx; g.cy = cy; g.moved = bt; x0 = Math.round(cx - sw / 2); x1 = x0 + sw - 1; y0 = Math.round(cy - sh / 2); y1 = y0 + sh - 1; }
      }
    }
    // the surround: the pixels within 1 px of the disc; the ring is drawn only where they are not already light (>= core + 35 L*), always for Rupar's own ring (design 6)
    let sumL = 0, nL = 0; for (let y = y0 - 2; y <= y1 + 2; y++) for (let x = x0 - 2; x <= x1 + 2; x++) { const c0 = ellCov(x, y, cx, cy, rx + 1, ry + 1), c1 = ellCov(x, y, cx, cy, rx, ry); if (c0 > 0.2 && c1 < 0.5 && x >= 0 && y >= 0 && x < W && y < H) { sumL += Lstar(rgbAt(x, y)); nL++; } }
    const surroundL = nL ? sumL / nL : 50, coreL = Lstar(hasPupil ? pupilC : coreC), light = surroundL >= coreL + 35;
    const drawRing = ringW > 0 && (species === "angular" || !light);
    let ringOnLight = 0;
    for (let y = y0 - pad; y <= y1 + pad; y++) for (let x = x0 - pad; x <= x1 + pad; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H || !okPx(x, y)) continue;
      const cOut = ellCov(x, y, cx, cy, rx + ringW, ry + ringW * aspectOf(ry, rx)), cIn = ellCov(x, y, cx, cy, rx, ry);
      if (drawRing) { const ra = Math.max(0, cOut - cIn); if (ra > 0) { const under = Lstar(rgbAt(x, y)); if (under >= coreL + 35 && species !== "angular") { /* the plate is already light here: no ring pixel */ } else blend(x, y, lightRim(ek.rim), ra, INK.rim); } }
      if (cIn > 0) { blend(x, y, coreC, cIn, INK.pupil); if (hasPupil) { const pr = Math.max(1, pupilR / irisR * D) / 2, cp = fore ? ellCov(x, y, cx, cy, Math.max(0.5, pupilR / irisR * DX / 2), Math.max(0.5, pupilR / irisR * DY / 2)) : ellCov(x, y, cx, cy, pr, pr * (ry / rx)); if (cp > 0) blend(x, y, pupilC, cp * cIn, INK.pupil); } }
    }
    // the catch light: 1 px at the centre + (-.22 D, -.22 D), toward the key light, the same side on both eyes; full at D >= 4, 50 % at 3 <= D < 4 (96); 48: 1 px at 60 % when D >= 3
    let catchA = 0; if (sizeKey === 96) catchA = D >= 4 ? 1 : D >= 3 ? 0.5 : 0; else catchA = D >= 3 ? 0.6 : 0;
    if (catchA > 0) { const px = Math.floor(cx - 0.22 * D), py = Math.floor(cy - 0.22 * D); if (okPx(px, py)) blend(px, py, mixc([255, 255, 255], irisC, 0.2), catchA, catchA >= 0.5 ? INK.catch : 0); g.catchAt = [px, py]; }
    boxes.push({ x0, y0, x1, y1, cw: x1 - x0 + 1, ch: y1 - y0 + 1, e: g.e });
    out.eyes.push({ visible: true, core: [x1 - x0 + 1, y1 - y0 + 1], box: [x0, y0, x1, y1], center: [cx, cy], D, hasPupil, coreCol: (hasPupil ? pupilC : coreC).map((v) => Math.round(v)), irisCol: irisC, ring: drawRing, ringW, ringOnLight, catchA, catchAt: g.catchAt ?? null, surroundL, sides: {} });
  }
  const eyeBoxes = boxes.map((b) => [b.x0 - 1, b.y0 - 1, b.x1 + 1, b.y1 + 1]), eyeBottom = boxes.length ? Math.max(...boxes.map((b) => b.y1 + 1)) : -1, eyeLine = boxes.length ? boxes.reduce((a, b) => a + (b.y0 + b.y1) / 2, 0) / boxes.length : null;
  const hits = (r, list) => list.some((q) => !(r[2] < q[0] || r[0] > q[2] || r[3] < q[1] || r[1] > q[3]));
  // the nose: 96 a 2 x 1 block; 48 one pixel, only if the plate is >= 6 px tall and clear of the eyes
  let noseBox = null;
  if (faceM.noses.length) {
    const plateH = 2 * faceM.R * scale, nz = faceM.noses, qs = nz.map((n) => seen(n.c, n.n)).filter(Boolean);
    if (!qs.length) out.dropped.push("nose: not visible");
    else if (sizeKey === 48 && plateH < 6) out.dropped.push("nose: the plate is under 6 px");
    else {
      const cx = qs.reduce((a, q) => a + q[0], 0) / qs.length, cy = qs.reduce((a, q) => a + q[1], 0) / qs.length, w = sizeKey === 96 ? 2 : 1;
      const x0 = Math.floor(cx - w / 2 + 0.5), y0 = Math.floor(cy), r = [x0, y0, x0 + w - 1, y0], gapBox = [r[0] - 1, r[1] - 1, r[2] + 1, r[3] + 1];
      if (hits(gapBox, eyeBoxes.map((b) => [b[0] + 1, b[1] + 1, b[2] - 1, b[3] - 1])) || (eyeLine !== null && y0 <= eyeBottom)) out.dropped.push("nose: collides with the eyes or sits above the eye line");
      else if (!inside(x0, y0) || !inside(x0 + w - 1, y0)) out.dropped.push("nose: outside the outline");
      else { for (let x = x0; x < x0 + w; x++) put(x, y0, look.nose ?? [60, 50, 50], INK.nose); noseBox = r; out.nose.push({ box: r }); }
    }
  }
  // the mouth (96 only; at 48 it is dropped): a 1 px stroke of at least 3 px
  if (faceM.mouth) {
    if (sizeKey === 48) out.dropped.push("mouth: dropped at 48");
    else {
      const m = faceM.mouth, pts = []; for (let i = 0; i <= 16; i++) { const x = (i / 16 * 2 - 1) * m.w, p = faceM.castXY(x, m.at(x)), n = faceM.nf, q = seen(p, n); if (q) pts.push(q); }
      let len = 0; for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      const px = []; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2)); for (let k = 0; k <= n; k++) { const x = Math.floor(a[0] + (b[0] - a[0]) * k / n), y = Math.floor(a[1] + (b[1] - a[1]) * k / n); if (!px.some((q) => q[0] === x && q[1] === y)) px.push([x, y]); } }
      const rect = px.length ? [Math.min(...px.map((q) => q[0])), Math.min(...px.map((q) => q[1])), Math.max(...px.map((q) => q[0])), Math.max(...px.map((q) => q[1]))] : null;
      if (len < 3 || px.length < 3) out.dropped.push("mouth: under 3 px");
      else if (hits([rect[0] - 1, rect[1] - 1, rect[2] + 1, rect[3] + 1], eyeBoxes.map((b) => [b[0] + 1, b[1] + 1, b[2] - 1, b[3] - 1])) || (noseBox && hits([rect[0] - 1, rect[1] - 1, rect[2] + 1, rect[3] + 1], [noseBox])) || (noseBox && rect[1] <= noseBox[3]) || (eyeLine !== null && rect[1] <= eyeBottom)) out.dropped.push("mouth: collides with the eyes or the nose");
      else if (!px.every(([x, y]) => inside(x, y))) out.dropped.push("mouth: outside the outline");
      else { for (const [x, y] of px) put(x, y, mouthCol, INK.mouth); out.mouth = { box: rect, px: px.length }; }
    }
  }
  return out;
}
