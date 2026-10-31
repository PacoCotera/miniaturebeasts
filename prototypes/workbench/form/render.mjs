// The stand renderer (shape-model.md 4): an orthographic camera, a z-buffer with per-pixel interpolated normals,
// supersampling, a key light with wrap diffuse and a hemisphere ambient, field ambient occlusion, a rim, eyes with
// fixed inks, the glow halo, the house shadow and the adult cut framing. Plain JavaScript, no node: imports.
import { cameraBasis } from "./species-trial.mjs";

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
  const partMap = new Int16Array(W * H).fill(-1), groupMap = new Int16Array(W * H).fill(-1), angleMap = new Float32Array(W * H), sigmaMap = new Float32Array(W * H);
  // the mouth's ink: the darker of the nose ink and the plate pigment x 0.45 (design 2.5)
  const lum = (c) => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2], plateC = (pig.patch ?? pig.belly ?? [128, 128, 128]).map((v) => v * 0.45), noseC = look.nose ?? [60, 50, 50];
  const mouthCol = lum(noseC) < lum(plateC) ? noseC : plateC;
  const rimStrength = 0.15;
  const eyeCapCos = 0.55;
  for (let sy2 = 0; sy2 < SH; sy2++) for (let sx2 = 0; sx2 < SW; sx2++) {
    const o = sy2 * SW + sx2, t = tri[o]; if (t < 0) continue;
    const a = F[t * 3], b = F[t * 3 + 1], c = F[t * 3 + 2], w1 = B1[o], w2 = B2[o], w0 = 1 - w1 - w2;
    let nx = Nn[a * 3] * w0 + Nn[b * 3] * w1 + Nn[c * 3] * w2, ny = Nn[a * 3 + 1] * w0 + Nn[b * 3 + 1] * w1 + Nn[c * 3 + 1] * w2, nz = Nn[a * 3 + 2] * w0 + Nn[b * 3 + 2] * w1 + Nn[c * 3 + 2] * w2;
    const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
    const I = (arr) => arr[a] * w0 + arr[b] * w1 + arr[c] * w2;
    const px = V[a * 3] * w0 + V[b * 3] * w1 + V[c * 3] * w2, py = V[a * 3 + 1] * w0 + V[b * 3 + 1] * w1 + V[c * 3 + 1] * w2, pz = V[a * 3 + 2] * w0 + V[b * 3 + 2] * w1 + V[c * 3 + 2] * w2;
    const part = A.part[a];
    let col = partSlotCol[part], inkCode = INK.body, spec = 0, matte = 1;
    const fieldV = Math.max(I(A.patch), I(A.belly));
    if (fieldV > 0) col = mix(col, pig.patch ?? pig.belly ?? col, sstep(0.2, 0.8, fieldV));
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
      const stretch = Math.hypot(ax, ay / e.aspect) / ll, u = (th / Math.acos(eyeCapCos)) * stretch;
      const big = ek.big;
      const pr = ek.pupil_r ?? (big ? 0.34 : 0.5), ir = ek.iris_r ?? (big ? 0.66 : 0.78);
      if (u > 1 || (e.lid > 0 && ay / (Math.sin(Math.acos(eyeCapCos)) * e.aspect) > 1 - 2 * e.lid)) { /* body colour: the lid */ }
      else {
        if (u < pr) { col = ek.pupil; inkCode = INK.pupil; }
        else if (u < ir) { col = ek.iris; inkCode = INK.iris; }
        else { col = ek.rim; inkCode = INK.rim; }
        spec = 1; matte = 0.6;
      }
    } else {
      for (let mi = 0; mi < marks.length; mi++) {
        const mv = I(A.marks[mi]);
        if (mv < 1.0 && marks[mi].kind === "nose") { col = mix(col, look.nose ?? [60, 50, 50], sstep(1.0, 0.6, mv)); if (mv < 0.8) inkCode = INK.nose; }
      }
    }
    const mf = faceM?.mouth; // the mouth: an ink stroke in face coordinates, antialiased over one pixel
    if (mf && inkCode === INK.body) { const mv = I(A.mouth), pxU = 1 / scale, cov2 = sstep(mf.t / 2 + pxU / 2, mf.t / 2 - pxU / 2, mv); if (cov2 > 0) { col = mix(col, mouthCol, cov2); if (cov2 > 0.5) inkCode = INK.mouth; } }
    // light
    const ndl = nx * Lk[0] + ny * Lk[1] + nz * Lk[2];
    const diff = Math.min(1, Math.max(0, (ndl + 0.6) / 1.6));
    const amb = 0.15 + 0.2 * (nz * 0.5 + 0.5);
    const aov = I(ao);
    const rim = rimStrength * Math.pow(1 - Math.max(0, nx * tt[0] + ny * tt[1] + nz * tt[2]), 3) * Math.max(0, ndl * 0.5 + 0.5);
    let k = (diff * 0.85 * (0.4 + 0.6 * aov) + amb * aov + rim) * matte + (emv > 0.02 ? 0.35 * emv : 0);
    let r = col[0] * k, g = col[1] * k, bl = col[2] * k;
    if (spec) { const nh = nx * Hh[0] + ny * Hh[1] + nz * Hh[2]; const s = sstep(0.975, 0.992, nh); r += (255 - r) * s; g += (255 - g) * s; bl += (255 - bl) * s; if (s > 0.5) inkCode = INK.catch; }
    const px2 = Math.floor(sx2 / ss), py2 = Math.floor(sy2 / ss), po = py2 * W + px2;
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
  // the ink of each pixel: the most frequent non-body code with at least half the covered samples
  const inkMap = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) { let best = 0, bc = 0; for (let k = 2; k < NINK; k++) if (inkCount[i * NINK + k] > bc) { bc = inkCount[i * NINK + k]; best = k; } inkMap[i] = bc * 2 >= n2 * 0 + Math.max(1, cov[i] * n2) ? best : INK.body; }
  const px = (p) => [W / 2 + (p[0] * rr[0] + p[1] * rr[1] + p[2] * rr[2] - fr.cx) * scale, (fr.feet + 1) - ((p[0] * uu[0] + p[1] * uu[1] + p[2] * uu[2]) - fr.bottom) * scale];
  return {
    width: W, height: H, data, coverage: cov, ink: inkMap, halo: haloMask, shadow: shadowCov, size: sizeKey,
    maps: { part: partMap, group: groupMap, angle: angleMap, sigma: sigmaMap, partNames: A.partNames, groupNames: scene.field.groups.all.map((g) => g.id) },
    meta: { scale, feet: fr.feet, cx: fr.cx, bottom: fr.bottom, extent: fr.extent, eyes: eyes.map((e) => ({ at: px(e.c), r: e.r * scale })), basis, project: px },
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
