// Silhouette overlap the way the census does it, and the feature checks of the trial. No node: imports.

// ---- masks and overlap ----------------------------------------------------------------------------------------
// A mask is { width, height, bits: Uint8Array }.
export const maskOfAlpha = (img, thr = 128) => { const bits = new Uint8Array(img.width * img.height); for (let i = 0; i < bits.length; i++) bits[i] = img.data[i * 4 + 3] >= thr ? 1 : 0; return { width: img.width, height: img.height, bits }; };
export const maskOfCoverage = (r, thr = 0.5) => { const bits = new Uint8Array(r.width * r.height); for (let i = 0; i < bits.length; i++) bits[i] = r.coverage[i] >= thr ? 1 : 0; return { width: r.width, height: r.height, bits }; };
export function boxOf(m) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let y = 0; y < m.height; y++) for (let x = 0; x < m.width; x++) if (m.bits[y * m.width + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 < 0 ? null : { x0, x1: x1 + 1, y0, y1: y1 + 1 };
}
// the mask's box fitted into n x n with a 4 % margin, area-filtered, thresholded at 0.5
export function fitMask(m, n, margin = 0.04) {
  const b = boxOf(m); if (!b) return new Uint8Array(n * n);
  const bw = b.x1 - b.x0, bh = b.y1 - b.y0, s = (n * (1 - 2 * margin)) / Math.max(bw, bh);
  const ox = n / 2 - (bw * s) / 2, oy = n / 2 - (bh * s) / 2, out = new Uint8Array(n * n), q = 6;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    let c = 0;
    for (let j = 0; j < q; j++) for (let i = 0; i < q; i++) {
      const sx = Math.floor(b.x0 + (x + (i + 0.5) / q - ox) / s), sy = Math.floor(b.y0 + (y + (j + 0.5) / q - oy) / s);
      if (sx >= 0 && sy >= 0 && sx < m.width && sy < m.height && m.bits[sy * m.width + sx]) c++;
    }
    out[y * n + x] = c / (q * q) >= 0.5 ? 1 : 0;
  }
  return out;
}
export function overlap(a, b, n) {
  const A = fitMask(a, n), B = fitMask(b, n); let i = 0, u = 0;
  for (let k = 0; k < A.length; k++) { if (A[k] && B[k]) i++; if (A[k] || B[k]) u++; }
  return u ? i / u : 0;
}
export const overlaps = (stand, render) => ({ o48: overlap(stand, render, 48), o96: overlap(stand, render, 96) });

// ---- geometry helpers -----------------------------------------------------------------------------------------
import { buildChains, spineGuards, GuardError, lowestZ } from "./spine.mjs";
import { makeField } from "./field.mjs";
import { INK } from "./render.mjs";

const RAD = Math.PI / 180;
const mean3 = (s) => (s.w + s.u + s.d) / 3;

// every guard of 2.7 for a form: the coil rules throw with the knot named; the others are listed
export function guardsOf(form) {
  const problems = [];
  let built;
  try { built = buildChains(form); } catch (e) { if (e instanceof GuardError) return { ok: false, problems: [e.message] }; throw e; }
  problems.push(...spineGuards(form, built));
  const field = makeField({ front: built.front, tail: built.tail, floor: built.floor }, built.branches, form);
  const headParts = new Set(form.regions ? [form.front.knots.find((k) => k.name === form.regions.head).part] : []);
  field.eyes.forEach((e, i) => {
    const a = field.at(e.hit, true);
    const inside = headParts.has(a.part) || a.patch > 0.5 || a.part === "face" || (!form.regions && !form.hair);
    if (!inside) problems.push(`eye ${i} is on ${a.part} outside the head and the face patch (patch ${a.patch.toFixed(2)})`);
    if (field.hair) {
      const w = field.hair.window, out = [e.c[0] + e.n[0] * e.r, e.c[1] + e.n[1] * e.r, e.c[2] + e.n[2] * e.r];
      const edge = windowEdgeZ(w, e.c[0], e.c[1]);
      const gap = edge - (e.c[2] + e.r);
      if (gap < 0.03) problems.push(`the fringe's edge is ${gap.toFixed(3)} U above eye ${i} (needs 0.03)`);
      const depth = -field.hair.dHairOnly(out[0], out[1], out[2], null);
      if (depth < 0.08) problems.push(`eye ${i} is ${depth.toFixed(3)} U behind the hair (needs 0.08)`);
    }
  });
  return { ok: problems.length === 0, problems, built, field };
}
// the height of the window's top edge (the fringe line) above (x, y)
export function windowEdgeZ(w, x, y) {
  const q = 1 - ((x - w.c[0]) / w.r[0]) ** 2 - ((y - w.c[1]) / w.r[1]) ** 2;
  return q <= 0 ? -Infinity : w.c[2] + w.r[2] * Math.sqrt(q);
}

// the outer contour of a coverage field at 0.5 (marching squares), resampled at 1 px
export function contour(cov, W, H, thr = 0.5) {
  const v = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : cov[y * W + x]);
  const segs = new Map(); // edge key -> [segments]
  const key = (t, x, y) => `${t}${x},${y}`;
  const pointOn = (t, x, y) => { // crossing on the edge from pixel (x, y) to the right (h) or below (v)
    const a = v(x, y), b = t === "h" ? v(x + 1, y) : v(x, y + 1), f = (thr - a) / (b - a);
    return t === "h" ? [x + 0.5 + f, y + 0.5] : [x + 0.5, y + 0.5 + f];
  };
  const list = [];
  for (let y = -1; y < H; y++) for (let x = -1; x < W; x++) {
    const a = v(x, y) >= thr, b = v(x + 1, y) >= thr, c = v(x + 1, y + 1) >= thr, d = v(x, y + 1) >= thr;
    const code = (a ? 1 : 0) | (b ? 2 : 0) | (c ? 4 : 0) | (d ? 8 : 0);
    if (code === 0 || code === 15) continue;
    const top = key("h", x, y), right = key("v", x + 1, y), bottom = key("h", x, y + 1), left = key("v", x, y);
    const add = (e1, e2) => list.push([e1, e2]);
    switch (code) {
      case 1: case 14: add(left, top); break; case 2: case 13: add(top, right); break; case 3: case 12: add(left, right); break;
      case 4: case 11: add(right, bottom); break; case 6: case 9: add(top, bottom); break; case 7: case 8: add(left, bottom); break;
      case 5: add(left, top); add(right, bottom); break; case 10: add(top, right); add(left, bottom); break;
    }
  }
  const adj = new Map();
  for (const [e1, e2] of list) { (adj.get(e1) ?? adj.set(e1, []).get(e1)).push(e2); (adj.get(e2) ?? adj.set(e2, []).get(e2)).push(e1); }
  const used = new Set(), loops = [];
  for (const start of adj.keys()) {
    if (used.has(start)) continue;
    const loop = [start]; used.add(start); let cur = start, guard = 0;
    while (guard++ < 1e6) { const nx = (adj.get(cur) ?? []).find((e) => !used.has(e)); if (!nx) break; loop.push(nx); used.add(nx); cur = nx; }
    loops.push(loop);
  }
  const pts = (loop) => loop.map((k) => { const t = k[0], [x, y] = k.slice(1).split(",").map(Number); return pointOn(t, x, y); });
  let best = null, bl = 0;
  for (const l of loops) { const p = pts(l); let len = 0; for (let i = 1; i < p.length; i++) len += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); if (len > bl) { bl = len; best = p; } }
  if (!best) return [];
  // resample at 1 px
  const out = [best[0]]; let acc = 0;
  for (let i = 1; i < best.length; i++) {
    let [x0, y0] = best[i - 1]; const [x1, y1] = best[i]; let seg = Math.hypot(x1 - x0, y1 - y0);
    while (acc + seg >= 1) { const t = (1 - acc) / seg; x0 += (x1 - x0) * t; y0 += (y1 - y0) * t; out.push([x0, y0]); seg = Math.hypot(x1 - x0, y1 - y0); acc = 0; }
    acc += seg;
  }
  return out;
}
// the turn at each point between the steps `back` px behind and `on` px ahead, in degrees
export function turnAt(pts, i, back = 3, on = 3) {
  const a = pts[(i - back + pts.length) % pts.length], b = pts[i], c = pts[(i + on) % pts.length];
  const v1 = [b[0] - a[0], b[1] - a[1]], v2 = [c[0] - b[0], c[1] - b[1]];
  const l1 = Math.hypot(...v1), l2 = Math.hypot(...v2); if (l1 < 1e-9 || l2 < 1e-9) return 0;
  return Math.acos(Math.max(-1, Math.min(1, (v1[0] * v2[0] + v1[1] * v2[1]) / (l1 * l2)))) / RAD;
}
// the maps of the render at a contour point: the covered pixel just inside it
export function mapsAt(r, pt) {
  const W = r.width, m = r.maps; let best = null, bd = Infinity;
  const x0 = Math.floor(pt[0]), y0 = Math.floor(pt[1]);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const x = x0 + dx, y = y0 + dy; if (x < 0 || y < 0 || x >= W || y >= r.height) continue;
    const i = y * W + x; if (r.coverage[i] < 0.5 || m.part[i] < 0) continue;
    const d = Math.hypot(x + 0.5 - pt[0], y + 0.5 - pt[1]); if (d < bd) { bd = d; best = i; }
  }
  if (best === null) return null;
  return { part: m.partNames[m.part[best]], group: m.groupNames[m.group[best]], angle: m.angle[best], sigma: m.sigma[best], i: best };
}
// the largest turn along a dorsal run of the contour. start: the index; step: +1 or -1; accept(maps) keeps the run going
export function dorsalTurn(r, pts, start, step, accept, maxLen = 2000) {
  let worst = 0, worstAt = start, n = 0;
  for (let k = 0, i = start; k < maxLen; k++, i = (i + step + pts.length) % pts.length) {
    const m = mapsAt(r, pts[i]);
    if (!m || !accept(m)) break;
    const t = turnAt(pts, i); n++;
    if (t > worst) { worst = t; worstAt = i; }
  }
  return { worst, worstAt, length: n };
}
// the contour index nearest a point (optionally among points that pass a test)
export function nearestIdx(pts, p, pred = null) { let b = -1, bd = Infinity; pts.forEach((q, i) => { if (pred && !pred(q, i)) return; const d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < bd) { bd = d; b = i; } }); return b; }

// the distance of each pixel to the nearest uncovered pixel (chamfer 3-4)
export function inDistance(cov, W, H) {
  const D = new Float32Array(W * H).fill(1e9);
  for (let i = 0; i < W * H; i++) if (cov[i] < 0.5) D[i] = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (x) D[i] = Math.min(D[i], D[i - 1] + 1); if (y) D[i] = Math.min(D[i], D[i - W] + 1); if (x && y) D[i] = Math.min(D[i], D[i - W - 1] + 1.414); if (y && x < W - 1) D[i] = Math.min(D[i], D[i - W + 1] + 1.414); }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const i = y * W + x; if (x < W - 1) D[i] = Math.min(D[i], D[i + 1] + 1); if (y < H - 1) D[i] = Math.min(D[i], D[i + W] + 1); if (x < W - 1 && y < H - 1) D[i] = Math.min(D[i], D[i + W + 1] + 1.414); if (y < H - 1 && x) D[i] = Math.min(D[i], D[i + W - 1] + 1.414); }
  return D;
}
// the pixels of an ink near an eye on screen
export function eyeInk(r, eyeIdx, codes) {
  const e = r.meta.eyes, W = r.width; let n = 0;
  for (let y = 0; y < r.height; y++) for (let x = 0; x < W; x++) {
    const c = r.ink[y * W + x]; if (!codes.includes(c) || r.coverage[y * W + x] < 0.5) continue;
    let bi = 0, bd = Infinity; e.forEach((q, i) => { const d = Math.hypot(x + 0.5 - q.at[0], y + 0.5 - q.at[1]); if (d < bd) { bd = d; bi = i; } });
    if (bi === eyeIdx && bd < e[bi].r * 1.6 + 2) n++;
  }
  return n;
}
const countPart = (r, name) => { let n = 0; const id = r.maps.partNames.indexOf(name); if (id < 0) return 0; for (let i = 0; i < r.width * r.height; i++) if (r.maps.part[i] === id && r.coverage[i] >= 0.5) n++; return n; };
const countInk = (r, code) => { let n = 0; for (let i = 0; i < r.width * r.height; i++) if (r.ink[i] === code && r.coverage[i] >= 0.5) n++; return n; };

export const OVERLAP_TARGET = { wickle: 0.83, drapet: 0.89, curlop: 0.80, loika: 0.74, rupar: 0.62 };

const C = (id, label, pass, value, threshold, detail = "") => ({ id, label, pass: !!pass, value, threshold, detail });

// ---- the feature checks of the trial ----------------------------------------------------------------------------
// ctx: { key, form, scene, r: { 304, 96, 48 }, stand (mask at 304), art: { ... } }
export function featureChecks(ctx) {
  const { key, form, scene, r } = ctx, r4 = r[304], out = [];
  const B = scene.built, field = scene.field, S = field.shift;
  const Wd = (p) => [p[0], p[1], p[2] + S];
  const all = [];
  // all five: overlap, pupils
  const ov = overlaps(ctx.stand, maskOfCoverage(r4));
  all.push(C("overlap48", "silhouette overlap at 48 px", ov.o48 >= OVERLAP_TARGET[key], +ov.o48.toFixed(3), OVERLAP_TARGET[key], `at 96 px: ${ov.o96.toFixed(3)} (reported)`));
  const pupils = field.eyes.map((_, i) => eyeInk(r4, i, [INK.pupil]));
  const need = key === "rupar" ? 1 : 2, ok = pupils.filter((n) => n >= 6).length >= need;
  all.push(C("eyes304", "the stand's eyes show at 304 (pupil pixels per eye)", ok, pupils, `>= 6 on ${need} eye(s)`));
  // the owner note of 2026-10-30 19:21: the face on every species, readable at 96 and 48
  const ink = (rr, i) => eyeInk(rr, i, [INK.pupil, INK.iris, INK.rim, INK.catch]);
  const e96 = field.eyes.map((_, i) => ink(r[96], i)), e48 = field.eyes.map((_, i) => ink(r[48], i));
  const nose304 = countInk(r4, INK.nose), nose96 = countInk(r[96], INK.nose);
  const mk = field.marks.find((m) => m.kind === "nose");
  const mkOnSurface = mk ? Math.abs(field.F3(mk.c[0], mk.c[1], mk.c[2])) : Infinity;
  const needE = key === "rupar" ? 1 : 2;
  const faceOk = e96.filter((n) => n >= (key === "rupar" ? 2 : 4)).length >= needE && e48.filter((n) => n >= (key === "rupar" ? 1 : 2)).length >= needE && nose304 >= 6 && nose96 >= 1 && mkOnSurface < 0.02;
  all.push(C("face", "the face on every species: eyes and the nose readable at 96 and 48, anchored on the surface", faceOk, { eyeInk96: e96, eyeInk48: e48, nose304, nose96, noseOffSurface: +mkOnSurface.toFixed(4) }, `eye ink >= ${key === "rupar" ? "2 (96), 1 (48)" : "4 (96), 2 (48)"}; nose >= 6 (304), >= 1 (96)`));
  out.push(...all);

  if (key === "curlop") {
    const pts = contour(r4.coverage, r4.width, r4.height);
    const headIdx = nearestIdx(pts, [0, 0], null); // placeholder, replaced below
    let top = -1, ty = Infinity; pts.forEach((p, i) => { const m = mapsAt(r4, p); if (m && m.part === "head" && p[1] < ty) { ty = p[1]; top = i; } });
    const chestS = form.front.knots.find((k) => k.name === "chest").ds * 0 + form.front.knots[1].ds + form.front.knots[2].ds; // sigma of the chest knot
    const dorsal = (m) => m.group === "front" && Math.abs(m.angle) < 90 && m.sigma >= chestS - 0.05;
    let best = null;
    for (const step of [1, -1]) { const res = dorsalTurn(r4, pts, top, step, dorsal); if (!best || res.length > best.length) best = res; }
    out.push(C("curlop.a", "no lump: the dorsal outline from the top of the head to the shoulder", best && best.worst <= 35 && best.length > 20, best ? +best.worst.toFixed(1) : null, "<= 35 deg within 6 px", `${best?.length} contour px`));
    out.push(...chainFeature(key, form, B, field).filter((x) => x.id.startsWith("curlop")));
  }

  if (key === "wickle") {
    const nk = form.front.knots.findIndex((k) => k.name === "top");
    const pl = B.front.samples.filter((s) => s.knot >= nk && s.s >= B.front.cum[nk] - 1e-9);
    let inc = 0; for (let i = 1; i < pl.length; i++) inc = Math.max(inc, mean3(pl[i]) - mean3(pl[i - 1]), pl[i].w - pl[i - 1].w, pl[i].u - pl[i - 1].u, pl[i].d - pl[i - 1].d);
    // screen width across the centre line: twice the inscribed radius at the projected centre line (robust where the plume curls)
    const W = r4.width, H = r4.height, cov = r4.coverage, proj = (s) => r4.meta.project(Wd(s.p));
    const Dt = inDistance(cov, W, H), widths = [];
    for (let i = 0; i < pl.length; i += 2) { const c = proj(pl[i]), x = Math.floor(c[0]), y = Math.floor(c[1]); if (x < 0 || y < 0 || x >= W || y >= H) continue; widths.push(2 * Dt[y * W + x]); }
    let grow = 0, runMin = Infinity; for (const w of widths) { grow = Math.max(grow, w - runMin); runMin = Math.min(runMin, w); }
    out.push(C("wickle.a", "no bulb: the plume's half-size never increases, and its screen width never grows toward the tip", inc <= 1e-9 && grow <= 1, { halfSizeIncrease: +inc.toExponential(2), widthGrowPx: +grow.toFixed(2) }, "0 and <= 1 px"));
    // (b) halo
    const halo = (rr) => { let n = 0; for (let i = 0; i < rr.width * rr.height; i++) if (rr.halo[i] > 0.25 && rr.coverage[i] < 0.5) n++; return n; };
    const h304 = halo(r4), h96 = halo(r[96]);
    out.push(C("wickle.b", "a halo, not a solid: pixels of the glow beyond the silhouette", h304 >= 30 && h96 >= 4, { at304: h304, at96: h96 }, ">= 30 / >= 4", "the mesh is the same with the glow on or off (the glow is a render option)"));
    // (c) the face set into the drop
    const D = inDistance(cov, W, H);
    const eyeMargin = r4.meta.eyes.map((e) => D[Math.floor(e.at[1]) * W + Math.floor(e.at[0])] - e.r);
    const nTop = form.front.knots.findIndex((k) => k.name === "top"); const rootRow = proj(B.front.samples.find((s) => s.knot === nTop && Math.abs(s.s - B.front.cum[nTop]) < 1e-6))[1];
    // the convex hull of the silhouette below the plume's root; the deepest boundary pixel inside it
    const pts = []; for (let y = Math.ceil(rootRow); y < H; y++) for (let x = 0; x < W; x++) if (cov[y * W + x] >= 0.5) pts.push([x + 0.5, y + 0.5]);
    const hull = convexHull(pts); let dmax = 0;
    for (const p of contour(cov, W, H)) { if (p[1] < rootRow) continue; dmax = Math.max(dmax, hullDepth(hull, p)); }
    out.push(C("wickle.c", "the face set into the drop: eyes inside the outline, the drop convex below the plume", Math.min(...eyeMargin) >= 3 && dmax <= 2, { eyeMarginPx: eyeMargin.map((v) => +v.toFixed(1)), hullDepthPx: +dmax.toFixed(2) }, ">= 3 px; <= 2 px", "no head region in the form"));
  }

  if (key === "drapet") {
    const W = r4.width, H = r4.height, cov = r4.coverage;
    let top = -1; for (let y = 0; y < H && top < 0; y++) for (let x = 0; x < W; x++) if (cov[y * W + x] >= 0.5) { top = y; break; }
    let bot = top; for (let y = H - 1; y >= 0; y--) { let any = false; for (let x = 0; x < W; x++) if (cov[y * W + x] >= 0.5) { any = true; break; } if (any) { bot = y; break; } }
    const hgt = bot - top + 1, last = Math.floor(top + 0.9 * hgt);
    const L = [], R = []; for (let y = top; y <= last; y++) { let l = -1, rr = -1; for (let x = 0; x < W; x++) if (cov[y * W + x] >= 0.5) { if (l < 0) l = x; rr = x + 1; } L.push(l); R.push(rr); }
    let back = 0; for (let i = 1; i < L.length; i++) { back = Math.max(back, L[i] - Math.min(...L.slice(0, i)), Math.max(...R.slice(0, i)) - R[i]); }
    // the slope change between rows 4 px apart, from 8 % of the height (a round top has an unbounded slope at its first rows)
    const s0 = Math.floor(0.08 * hgt); let jump = 0;
    const sl = (A, i) => (A[i + 4] - A[i]) / 4;
    for (let i = s0; i + 8 < L.length; i++) jump = Math.max(jump, Math.abs(sl(L, i + 4) - sl(L, i)), Math.abs(sl(R, i + 4) - sl(R, i)));
    out.push(C("drapet.a", "one dome: x(y) moves outward monotonically to 0.9 of the height, no step", back <= 1 && jump <= 0.6, { backwardPx: back, maxSlopeChange: +jump.toFixed(2) }, "<= 1 px (pixel noise); <= 0.6", `rows ${top}..${last}, slope test from row ${top + s0}`));
    // (b) the face set inside
    const hr = field_hair(scene), win = hr.window;
    const eyesB = scene.field.eyes.map((e, i) => {
      const o = [e.c[0] + e.n[0] * e.r, e.c[1] + e.n[1] * e.r, e.c[2] + e.n[2] * e.r];
      return { behind: -hr.dHairOnly(o[0], o[1], o[2], null), fringeGap: windowEdgeZ(win, e.c[0], e.c[1]) - (e.c[2] + e.r), pupil: eyeInk(r4, i, [INK.pupil]) };
    });
    out.push(C("drapet.b", "the face set inside: eyes behind the hair, the fringe above the eyes, both eyes show", eyesB.every((e) => e.behind >= 0.08 && e.fringeGap >= 0.03 && e.pupil >= 6), eyesB.map((e) => ({ behindU: +e.behind.toFixed(3), fringeGapU: +e.fringeGap.toFixed(3), pupilPx: e.pupil })), ">= 0.08 U; >= 0.03 U; >= 6 px"));
    // (c) loose, uneven locks
    const bottoms = []; for (let x = 0; x < W; x++) { let b = -1; for (let y = H - 1; y >= 0; y--) if (cov[y * W + x] >= 0.5) { b = y; break; } if (b >= 0) bottoms.push([x, b]); }
    const feet = Math.max(...bottoms.map((p) => p[1]));
    // the variation of the bottom outline about its smooth trend (a moving mean over 60 px)
    let range = 0; const half = 30; const res = bottoms.map((p, i) => { let s = 0, n = 0; for (let k = Math.max(0, i - half); k <= Math.min(bottoms.length - 1, i + half); k++) { s += bottoms[k][1]; n++; } return p[1] - s / n; });
    range = Math.max(...res) - Math.min(...res);
    const TOL = 8, meets = bottoms.filter((p) => p[1] >= feet - TOL).length / bottoms.length;
    out.push(C("drapet.c", "loose, uneven locks: the bottom outline varies and meets the floor row", range >= 3 && meets >= 0.6, { variationPx: +range.toFixed(1), meetsFloorRow: +meets.toFixed(3) }, ">= 3 px; >= 60 %", `meets = within ${TOL} px of the floor row (the stand itself: 0.59 at 8 px)`));
    // (d) hidden legs
    const legPx = [304, 96, 48].map((k) => countPart(r[k], "legs"));
    out.push(C("drapet.d", "hidden legs: no leg pixel at any size", legPx.every((n) => n === 0), legPx, "0 at 304, 96, 48"));
  }

  if (key === "loika") {
    const pts = contour(r4.coverage, r4.width, r4.height);
    const rootW = Wd(B.branches.find((b) => b.branch.id === "leafM").rootPoint), rs = r4.meta.project(rootW);
    const front = (m) => m.group === "front" && Math.abs(m.angle) < 90;
    const sStart = nearestIdx(pts, rs, (q) => { const m = mapsAt(r4, q); return m && front(m); });
    let best = null;
    for (const step of [1, -1]) { const res = dorsalTurn(r4, pts, sStart, step, (m) => front(m) && m.sigma >= 0.35); if (!best || res.length > best.length) best = res; }
    out.push(C("loika.a", "head out of the body: the dorsal outline from the crest's root to the back", best.worst <= 35 && best.length > 20, +best.worst.toFixed(1), "<= 35 deg within 6 px", `${best.length} contour px (the chin crease is ventral)`));
    // (b) the snout is the head's own end
    const ks = form.front.knots, iStop = ks.findIndex((k) => k.name === "stop");
    let mono = true; for (let i = iStop + 1; i < ks.length; i++) if (mean3(ks[i]) > mean3(ks[i - 1]) + 1e-12) mono = false;
    const A = scene.mesh.attrs, names = A.partNames, headId = names.indexOf("head"), snoutId = names.findIndex((n) => /snout|muzzle|nose/.test(n));
    const sigmaEnd = B.front.cum[ks.length - 1]; let reach = 0; for (let i = 0; i < A.part.length; i++) if (A.part[i] === headId && A.group[i] === 0) reach = Math.max(reach, A.sigma[i]);
    out.push(C("loika.b", "the snout is the head's own end: half-sizes fall from the stop to the nose, one part of the mesh", mono && snoutId < 0 && reach >= sigmaEnd - 0.05, { monotone: mono, separatePart: snoutId >= 0, headPartReachesSigma: +reach.toFixed(2), noseSigma: +sigmaEnd.toFixed(2) }, "monotone; no separate part; reaches the nose"));
    // the owner note: the head against the signed art
    const art = ctx.art, H = r4.height, W = r4.width, cov = r4.coverage;
    const box = boxOf(maskOfCoverage(r4)), bw = box.x1 - box.x0, bh = box.y1 - box.y0;
    let hx0 = Infinity, hx1 = -Infinity, hy0 = Infinity, hy1 = -Infinity; const hid = r4.maps.partNames.indexOf("head");
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (cov[i] >= 0.5 && r4.maps.part[i] === hid) { hx0 = Math.min(hx0, x); hx1 = Math.max(hx1, x); hy0 = Math.min(hy0, y); hy1 = Math.max(hy1, y); } }
    const headH = (hy1 - hy0 + 1) / bh, headW = (hx1 - hx0 + 1) / bw;
    const e = r4.meta.eyes, sep = Math.hypot(e[0].at[0] - e[1].at[0], e[0].at[1] - e[1].at[1]) / bw, rimD = (2 * Math.max(e[0].r, e[1].r) * 1.0) / bh;
    const within = (v, [lo, hi]) => v >= lo && v <= hi;
    const ok = within(headH, art.headH) && within(headW, art.headW) && within(sep, art.eyeSep) && within(rimD, art.eyeD);
    out.push(C("loika.head", "the head against the signed art (owner note 19:21): head height and width, eye separation, eye diameter, as fractions of the creature's box", ok, { headH: +headH.toFixed(3), headW: +headW.toFixed(3), eyeSep: +sep.toFixed(3), eyeD: +rimD.toFixed(3) }, `headH ${art.headH}, headW ${art.headW}, eyeSep ${art.eyeSep}, eyeD ${art.eyeD}`, "the art's own values were measured on mibi-adult-S01-304x312.png (see report)"));
  }

  if (key === "rupar") {
    const ks = form.front.knots, ib = ks.findIndex((k) => k.name === "withers"), it = ks.findIndex((k) => k.name === "throat");
    const mid = (B.front.cum[ib] + B.front.cum[it]) / 2, sm = B.front.samples.reduce((a, s) => (Math.abs(s.s - mid) < Math.abs(a.s - mid) ? s : a));
    const heading = Math.atan2(sm.T[2], sm.T[0]) / RAD;
    out.push(C("rupar.a", "the neck rises: the spine's heading at mid-neck", heading >= 60, +heading.toFixed(1), ">= 60 deg", `mid-neck at sigma ${mid.toFixed(2)} (the neck is the spine from the withers to the throat)`));
    const pts = contour(r4.coverage, r4.width, r4.height);
    const sPoll = B.front.cum[ks.findIndex((k) => k.name === "poll")], sWith = B.front.cum[ib];
    const dors = (m) => m.group === "front" && Math.abs(m.angle) < 90 && m.sigma >= sWith - 0.02 && m.sigma <= sPoll + 0.1;
    let startIdx = -1, bd = Infinity; pts.forEach((p, i) => { const m = mapsAt(r4, p); if (m && dors(m) && Math.abs(m.sigma - sPoll) < bd) { bd = Math.abs(m.sigma - sPoll); startIdx = i; } });
    let best = null; if (startIdx >= 0) for (const step of [1, -1]) { const res = dorsalTurn(r4, pts, startIdx, step, dors); if (!best || res.length > best.length) best = res; }
    const iStop = ks.findIndex((k) => k.name === "stop"); let mono = true; for (let i = iStop + 1; i < ks.length; i++) if (mean3(ks[i]) > mean3(ks[i - 1]) + 1e-12) mono = false;
    out.push(C("rupar.b", "head and muzzle continue the neck: the dorsal outline from the withers to the poll, the muzzle's half-size", best && best.worst <= 35 && mono, { maxTurnDeg: best ? +best.worst.toFixed(1) : null, muzzleMonotone: mono, contourPx: best?.length }, "<= 35 deg within 6 px; monotone"));
  }
  return out;
}

// the checks that read the spine and the field alone (the search of the tuning uses them too)
export function chainFeature(key, form, B, field) {
  const out = [], S = field.shift, Wd = (p) => [p[0], p[1], p[2] + S];
  if (key === "curlop") {
    // (b) the S
    const seq = [];
    const tail = B.tail.samples, tailStart = form.tail.knots.findIndex((k) => k.name === "tail1") + 1; // the seat segment runs to the knot after it
    for (let i = tail.length - 1; i >= 0; i--) if (tail[i].s <= B.tail.cum[tailStart] + 1e-9 && Math.abs(tail[i].kappa) >= 5) seq.push(tail[i].kappa);
    for (const s of B.front.samples) if (Math.abs(s.kappa) >= 5) seq.push(s.kappa);
    let changes = 0; for (let i = 1; i < seq.length; i++) if (Math.sign(seq[i]) !== Math.sign(seq[i - 1])) changes++;
    out.push(C("curlop.b", "the S: trunk curvature changes sign from the seat to the face cap", changes >= 2, changes, ">= 2 (|k| >= 5 deg/U)", "from the tail's seat segment (to the knot after the seat) to the face cap"));
    // (c) cylinder
    const trunk = B.front.samples.filter((s) => s.sigma <= B.front.cum[form.front.knots.findIndex((k) => k.name === "head")] + 1e-9).map(mean3);
    const ratio = Math.max(...trunk) / Math.min(...trunk);
    out.push(C("curlop.c", "a cylinder, not an egg: max/min of the mean half-size from the pelvis to the head knot", ratio <= 1.2, +ratio.toFixed(3), "<= 1.2"));
    // (d) the tail
    const t0 = B.tail.samples[0], pel = mean3(t0), seatS = B.tail.samples.find((s) => Math.abs(s.s - B.tail.cum[1]) < 1e-6), at1 = B.tail.samples.reduce((a, s) => (Math.abs(s.s - 1) < Math.abs(a.s - 1) ? s : a));
    const tip = B.tail.samples.at(-1);
    let run = 0; for (let i = 1; i < tail.length; i++) if (tail[i].s >= B.tail.cum[1]) { const z = lowestZ(tail[i]) - B.floor; if (z <= 0.03) run += tail[i].s - tail[i - 1].s; }
    const dd = { seat: mean3(seatS) / pel, at1U: mean3(at1) / pel, tip: mean3(tip) / pel, floorRun: run };
    out.push(C("curlop.d", "the tail: seat >= 0.8 of the root, <= 0.65 by 1.0 U, tip <= 0.15, run on the floor >= 1.0 U", dd.seat >= 0.8 && dd.at1U <= 0.65 && dd.tip <= 0.15 && dd.floorRun >= 1.0, Object.fromEntries(Object.entries(dd).map(([k, v]) => [k, +v.toFixed(3)])), "0.8 / 0.65 / 0.15 / 1.0 U"));
    // (e) two hands
    const palms = B.branches.filter((b) => b.branch.id === "arm").map((b) => b.samples.at(-1).p);
    const mid = Wd([(palms[0][0] + palms[1][0]) / 2, (palms[0][1] + palms[1][1]) / 2, (palms[0][2] + palms[1][2]) / 2]);
    const Fm = field.F3(mid[0], mid[1], mid[2]);
    out.push(C("curlop.e", "two hands: F between the palms", Fm > 0, +Fm.toFixed(4), "> 0", `palms ${(Math.hypot(palms[0][0] - palms[1][0], palms[0][1] - palms[1][1], palms[0][2] - palms[1][2])).toFixed(3)} U apart`));
  }
  if (key === "wickle") {
    const nk = form.front.knots.findIndex((k) => k.name === "top");
    const pl = B.front.samples.filter((s) => s.knot >= nk && s.s >= B.front.cum[nk] - 1e-9);
    let inc = 0; for (let i = 1; i < pl.length; i++) inc = Math.max(inc, mean3(pl[i]) - mean3(pl[i - 1]), pl[i].w - pl[i - 1].w, pl[i].u - pl[i - 1].u, pl[i].d - pl[i - 1].d);
    out.push(C("wickle.halfsize", "the plume's half-size never increases from the drop's top knot to the tip", inc <= 1e-9, +inc.toExponential(2), "0"));
  }
  if (key === "rupar") {
    const ks = form.front.knots, ib = ks.findIndex((k) => k.name === "withers"), it = ks.findIndex((k) => k.name === "throat");
    const mid = (B.front.cum[ib] + B.front.cum[it]) / 2, sm = B.front.samples.reduce((a, s) => (Math.abs(s.s - mid) < Math.abs(a.s - mid) ? s : a));
    const heading = Math.atan2(sm.T[2], sm.T[0]) / RAD;
    out.push(C("rupar.a", "the neck rises: the spine's heading at mid-neck", heading >= 60, +heading.toFixed(1), ">= 60 deg", `mid-neck at sigma ${mid.toFixed(2)} (the neck is the spine from the withers to the throat)`));
    const iStop = ks.findIndex((k) => k.name === "stop"); let mono = true; for (let i = iStop + 1; i < ks.length; i++) if (mean3(ks[i]) > mean3(ks[i - 1]) + 1e-12) mono = false;
    out.push(C("rupar.muzzle", "the muzzle's half-size never increases from the stop to the nose", mono, mono, "monotone"));
  }
  if (key === "loika") {
    const ks = form.front.knots, iStop = ks.findIndex((k) => k.name === "stop");
    let mono = true; for (let i = iStop + 1; i < ks.length; i++) if (mean3(ks[i]) > mean3(ks[i - 1]) + 1e-12) mono = false;
    out.push(C("loika.mono", "half-sizes never increase from the stop to the nose", mono, mono, "monotone"));
  }
  return out;
}

const field_hair = (scene) => scene.field.hair;

// convex hull (monotone chain) and the depth of a point inside it (distance to the nearest hull edge, 0 outside)
export function convexHull(pts) {
  const P = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); if (P.length < 3) return P;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = []; for (const p of P) { while (lo.length >= 2 && cr(lo.at(-2), lo.at(-1), p) <= 0) lo.pop(); lo.push(p); }
  const up = []; for (const p of P.slice().reverse()) { while (up.length >= 2 && cr(up.at(-2), up.at(-1), p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
export function hullDepth(h, p) {
  let d = Infinity;
  for (let i = 0; i < h.length; i++) {
    const a = h[i], b = h[(i + 1) % h.length], ex = b[0] - a[0], ey = b[1] - a[1], l2 = ex * ex + ey * ey || 1;
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * ex + (p[1] - a[1]) * ey) / l2)); d = Math.min(d, Math.hypot(p[0] - a[0] - ex * t, p[1] - a[1] - ey * t));
  }
  // inside the hull? (all cross products have the hull's orientation)
  let inside = true; for (let i = 0; i < h.length; i++) { const a = h[i], b = h[(i + 1) % h.length]; if ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) < 0) { inside = false; break; } }
  return inside ? d : 0;
}
