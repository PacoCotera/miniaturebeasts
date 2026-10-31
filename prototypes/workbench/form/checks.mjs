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
  const fm = field.faceM, eyes = field.eyes;
  if (fm && eyes.length === 2) {
    const [e0, e1] = eyes, gap = Math.abs(e0.x - e1.x) - e0.r - e1.r; // in face coordinates, where the spacing is declared
    if (gap < 0.5 * e0.r - 1e-9) problems.push(`the gap between the eyes is ${gap.toFixed(3)} U < 0.5 r_e (${(0.5 * e0.r).toFixed(3)})`);
    eyes.forEach((e, i) => {
      const a = field.at(e.hit, true), headFront = headParts.has(a.part), inPlate = (1 - fm.rho(e.x, e.y)) * Math.min(fm.R, fm.R * fm.aspect) >= 0.1 * e.r + 0.835 * e.r;
      if (!headFront && !inPlate) problems.push(`eye ${i} is not inside the plate by 0.1 r_e (edge ${((1 - fm.rho(e.x, e.y)) * Math.min(fm.R, fm.R * fm.aspect)).toFixed(3)} U from the eye's centre)`);
    });
  }
  problems.push(...cornerChecks(form, built, field));
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
  // face.ink, face.place, face.order, face.mouth, face.surface, marks, limbs and trans: the round 2 checks (round2Checks)
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
    // the outer radius (half-size + fur) never increases from the plume's root (the face knot) to the tip, in samples (the screen width part is dropped)
    const iFace = form.front.knots.findIndex((k) => k.name === "face"), outerInc = (() => { let w = 0; const q = B.front.samples.filter((s) => s.s >= B.front.cum[iFace] - 1e-9); for (let i = 1; i < q.length; i++) for (const c of ["w", "u", "d"]) w = Math.max(w, q[i][c] + q[i].fur - (q[i - 1][c] + q[i - 1].fur)); return w; })();
    out.push(C("wickle.a", "no bulb: the plume's outer radius (half-size + fur) never increases from its root to the tip", outerInc <= 1e-9, +outerInc.toExponential(2), "0"));
    // (b) halo
    const halo = (rr) => { let n = 0; for (let i = 0; i < rr.width * rr.height; i++) if (rr.halo[i] > 0.25 && rr.coverage[i] < 0.5) n++; return n; };
    const h304 = halo(r4), h96 = halo(r[96]);
    out.push(C("wickle.b", "a halo, not a solid: pixels of the glow beyond the silhouette", h304 >= 30 && h96 >= 4, { at304: h304, at96: h96 }, ">= 30 / >= 4", "the mesh is the same with the glow on or off (the glow is a render option)"));
    // (c) the face set into the drop
    const D = inDistance(cov, W, H);
    const eyeMargin = r4.meta.eyes.map((e) => D[Math.floor(e.at[1]) * W + Math.floor(e.at[0])] - e.r);
    const nTop = form.front.knots.findIndex((k) => k.name === "top"); const rootRow = proj(B.front.samples.find((s) => s.knot === nTop && Math.abs(s.s - B.front.cum[nTop]) < 1e-6))[1];
    // the convex hull of the silhouette below the plume's root; the deepest boundary pixel inside it
    const dropId = r4.maps.partNames.indexOf("drop"), pts = []; for (let y = Math.ceil(rootRow); y < H; y++) for (let x = 0; x < W; x++) if (cov[y * W + x] >= 0.5 && r4.maps.part[y * W + x] === dropId) pts.push([x + 0.5, y + 0.5]); // the hull of the drop part only: the arms and the feet may bump out
    const hull = convexHull(pts); let dmax = 0;
    for (const p of contour(cov, W, H)) { if (p[1] < rootRow) continue; const mm = mapsAt(r4, p); if (!mm || mm.part !== "drop") continue; dmax = Math.max(dmax, hullDepth(hull, p)); }
    out.push(C("wickle.c", "the face set into the drop: eyes inside the outline by 3 px, the drop (arms and feet excluded) convex below the plume", Math.min(...eyeMargin) >= 3 && dmax <= 2, { eyeMarginPx: eyeMargin.map((v) => +v.toFixed(1)), hullDepthPx: +dmax.toFixed(2) }, ">= 3 px; <= 2 px", "no head region in the form"));
  }

  if (key === "drapet") {
    const W = r4.width, H = r4.height, cov = r4.coverage;
    let top = -1; for (let y = 0; y < H && top < 0; y++) for (let x = 0; x < W; x++) if (cov[y * W + x] >= 0.5) { top = y; break; }
    let bot = top; for (let y = H - 1; y >= 0; y--) { let any = false; for (let x = 0; x < W; x++) if (cov[y * W + x] >= 0.5) { any = true; break; } if (any) { bot = y; break; } }
    const hgt = bot - top + 1, last = Math.floor(top + 0.85 * hgt); // the hem zone belongs to drapet.c
    const L = [], R = []; for (let y = top; y <= last; y++) { let l = -1, rr = -1; for (let x = 0; x < W; x++) if (cov[y * W + x] >= 0.5) { if (l < 0) l = x; rr = x + 1; } L.push(l); R.push(rr); }
    let back = 0; for (let i = 1; i < L.length; i++) { back = Math.max(back, L[i] - Math.min(...L.slice(0, i)), Math.max(...R.slice(0, i)) - R[i]); }
    // the slope change between rows 4 px apart, from 8 % of the height (a round top has an unbounded slope at its first rows)
    const s0 = Math.floor(0.08 * hgt); let jump = 0;
    const sl = (A, i) => (A[i + 4] - A[i]) / 4;
    for (let i = s0; i + 8 < L.length; i++) jump = Math.max(jump, Math.abs(sl(L, i + 4) - sl(L, i)), Math.abs(sl(R, i + 4) - sl(R, i)));
    out.push(C("drapet.a", "one dome: x(y) moves outward monotonically to 0.85 of the height, no step", back <= 1 && jump <= 0.6, { backwardPx: back, maxSlopeChange: +jump.toFixed(2) }, "<= 1 px (pixel noise); <= 0.6", `rows ${top}..${last}, slope test from row ${top + s0}`));
    // (b) the plate set back 0-0.03 U behind the hair around the opening, and both pupils >= 28 px at 304 (face.surface, design 8)
    const fs = faceSurface(scene.field, scene.field.faceM), pupilsD = scene.field.eyes.map((_, i) => eyeInk(r4, i, [INK.pupil]));
    out.push(C("drapet.b", "the face set inside: the plate 0-0.03 U behind the hair around the opening, both pupils >= 28 px at 304", fs.ok && pupilsD.every((n) => n >= 28), { setBackU: fs.setBack.map((v) => +v.toFixed(4)), pupilPx: pupilsD }, "0 .. 0.03 U; >= 28 px"));
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
    out.push(C("loika.b", "the snout is the head's own end: half-sizes fall from the stop to the nose, one part of the mesh", mono && snoutId < 0 && reach >= sigmaEnd - 0.12, { monotone: mono, separatePart: snoutId >= 0, headPartReachesSigma: +reach.toFixed(2), noseSigma: +sigmaEnd.toFixed(2) }, "monotone; no separate part; reaches the nose"));
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
    const hd = (q) => Math.atan2(q.T[2], q.T[0]) / RAD, thr = B.front.samples.reduce((a, q) => (Math.abs(q.s - B.front.cum[it]) < Math.abs(a.s - B.front.cum[it]) ? q : a)), fall = hd(thr) - hd(B.front.samples.at(-1));
    let monoFall = true; { let prev = Infinity; for (const q of B.front.samples.filter((x) => x.s >= B.front.cum[it])) { const h = hd(q); if (h > prev + 1e-6) monoFall = false; prev = h; } }
    out.push(C("rupar.a", "the neck leans forward: the heading at mid-neck 45-65 deg, falling monotonically from the throat to the nose by >= 50 deg", heading >= 45 && heading <= 65 && fall >= 50 && monoFall, { midNeckDeg: +heading.toFixed(1), fallDeg: +fall.toFixed(1), monotone: monoFall }, "45 .. 65; fall >= 50", `mid-neck at sigma ${mid.toFixed(2)}`));
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
    const hd = (q) => Math.atan2(q.T[2], q.T[0]) / RAD, thr = B.front.samples.reduce((a, q) => (Math.abs(q.s - B.front.cum[it]) < Math.abs(a.s - B.front.cum[it]) ? q : a)), fall = hd(thr) - hd(B.front.samples.at(-1));
    let monoFall = true; { let prev = Infinity; for (const q of B.front.samples.filter((x) => x.s >= B.front.cum[it])) { const h = hd(q); if (h > prev + 1e-6) monoFall = false; prev = h; } }
    out.push(C("rupar.a", "the neck leans forward: the heading at mid-neck 45-65 deg, falling monotonically from the throat to the nose by >= 50 deg", heading >= 45 && heading <= 65 && fall >= 50 && monoFall, { midNeckDeg: +heading.toFixed(1), fallDeg: +fall.toFixed(1), monotone: monoFall }, "45 .. 65; fall >= 50", `mid-neck at sigma ${mid.toFixed(2)}`));
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

// face.surface (design 8): the plate's surface along n_f against the ring just outside it, at 32 points. Where the surface is the coat or the
// skin the plate must not recess (>= -0.005 U); on a hair face it is set back by 0-0.03 U.
export function faceSurface(field, fm) {
  const C = fm.C, castWith = (fn, x, y) => {
    const dir = fm.dirXY(x, y); let t0 = 0, t1 = 0.02; while (fn(C[0] + dir[0] * t1, C[1] + dir[1] * t1, C[2] + dir[2] * t1) < 0 && t1 < 8) { t0 = t1; t1 += 0.02; }
    for (let i = 0; i < 40; i++) { const m = (t0 + t1) / 2; if (fn(C[0] + dir[0] * m, C[1] + dir[1] * m, C[2] + dir[2] * m) < 0) t0 = m; else t1 = m; }
    const t = (t0 + t1) / 2; return [C[0] + dir[0] * t, C[1] + dir[1] * t, C[2] + dir[2] * t];
  };
  // relief at (x, y): the final surface against the casting surface (the body without the face's relief and opening) along n_f; > 0 is proud
  const rel = (x, y) => { const a = castWith(field.dSurfaceFn, x, y), b = castWith(field.dCast, x, y); return (a[0] - b[0]) * fm.nf[0] + (a[1] - b[1]) * fm.nf[1] + (a[2] - b[2]) * fm.nf[2]; };
  const dy = (fm.spec.plateDy ?? 0) * fm.size, plate = [];
  for (let i = 0; i < 32; i++) { const q = 0.9 * Math.sqrt((i + 0.5) / 32), a = i * 2.399963; plate.push(rel(q * fm.R * fm.aspect * Math.cos(a), dy + q * fm.R * Math.sin(a))); }
  const minRel = Math.min(...plate), maxRel = Math.max(...plate), hairFace = !!field.hair;
  const ok = hairFace ? maxRel <= 0.005 && minRel >= -0.03 - 0.005 : minRel >= -0.005;
  return { ok, minRel, maxRel, rel: plate, setBack: hairFace ? [-maxRel, -minRel] : null };
}

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

// ====================================================================================================================
// Round 2 (design 8): face.ink, face.place, face.order, face.mouth, face.surface, limbs, trans, marks, drapet.e, loika.leaves, texture energy
// ====================================================================================================================
import { Lstar, MIN_EYE } from "./render.mjs";
import { SPECIES as _SPECIES } from "./species-trial.mjs";
const rgb = (r, x, y) => { const i = (y * r.width + x) * 4; return [r.data[i], r.data[i + 1], r.data[i + 2]]; };
const countInkIn = (r, code, box) => { let n = 0; for (let y = Math.max(0, box[1]); y <= Math.min(r.height - 1, box[3]); y++) for (let x = Math.max(0, box[0]); x <= Math.min(r.width - 1, box[2]); x++) if (r.ink[y * r.width + x] === code) n++; return n; };

// the trans metrics of a form (design 5): slope at the region joins and into a coil, slope jump over a coil start, bend turn, fur at the tips
export function transMetrics(form, B) {
  const out = { slope: 0, jump: 0, bend: 0, tipFur: 0 }, outer = (s, c) => s[c] + (s.fur ?? 0);
  for (const [id, chain] of [["front", form.front], ["tail", form.tail]].filter((x) => x[1])) {
    const ch = B[id], S = ch.samples, cum = ch.cum, n = cum.length, part = (j) => S.find((q) => q.knot === j)?.part;
    const wins = []; for (let j = 1; j < n - 1; j++) if (part(j) !== part(j + 1)) wins.push([cum[j - 1], cum[j + 1]]);
    if (chain.coil && chain.coil.N > 0) wins.push([cum[n - 2], cum[n - 1] + 0.15 * chain.coil.L]);
    for (const [lo, hi] of wins) for (const c of ["u", "w"]) for (let i = 1; i < S.length; i++) { if (S[i - 1].s < lo - 1e-9 || S[i].s > hi + 1e-9) continue; const ds = S[i].s - S[i - 1].s; if (ds > 1e-9) out.slope = Math.max(out.slope, Math.abs((outer(S[i], c) - outer(S[i - 1], c)) / ds)); }
    if (chain.coil && chain.coil.N > 0) {
      const s1 = cum[n - 1]; for (const c of ["w", "u", "d"]) { let prev = null; for (let i = 1; i < S.length; i++) { if (S[i].s < s1 - 0.25 || S[i - 1].s > s1 + 0.25) continue; const ds = S[i].s - S[i - 1].s; if (ds < 1e-9) continue; const v = (outer(S[i], c) - outer(S[i - 1], c)) / ds; if (prev !== null) out.jump = Math.max(out.jump, Math.abs(v - prev)); prev = v; } }
      const s0 = cum[n - 2] + 0.02; for (let i = 1; i < S.length; i++) { if (S[i - 1].s < s0 || Math.abs(S[i].kappa) < 2) continue; const ds = S[i].s - S[i - 1].s; if (ds > 1e-9) out.bend = Math.max(out.bend, (Math.abs(S[i].phi - S[i - 1].phi) / ds) * 0.05); }
    }
  }
  for (const ch of [B.front, B.tail, ...B.branches].filter(Boolean)) { const L = ch.samples.at(-1).s; for (const q of ch.samples) if (L > 0 && q.s >= 0.9 * L) out.tipFur = Math.max(out.tipFur, q.fur / Math.min(q.w, q.u, q.d)); }
  return out;
}

// the slope of the species' type, so a corner is held to 0.6 or to the type's own value (Loika's type is above 0.6 with the design numbers: reported as a gate not met)
const typeSlopes = new Map();
const typeSlopeOf = (form) => { const key = form.key ?? form.name; if (!typeSlopes.has(key)) { const t = _SPECIES[form.key]; typeSlopes.set(key, t ? transMetrics(t, buildChains(t)).slope : 0); } return typeSlopes.get(key); };
// The checks that read only the spine, the field and the face model: they hold on every corner too (design 8)
export function cornerChecks(form, built, field) {
  const problems = [], t = transMetrics(form, built), typeSlope = typeSlopeOf(form);
  if (t.slope > Math.max(0.6, typeSlope) + 1e-9) problems.push(`trans.slope ${t.slope.toFixed(3)} > 0.6`);
  if (t.jump > 0.05 + 1e-9) problems.push(`trans.c1 ${t.jump.toFixed(3)} > 0.05`);
  if (t.bend > 10 + 1e-9) problems.push(`trans.bend ${t.bend.toFixed(1)} > 10 deg per 0.05 U`);
  if (t.tipFur > 0.35 + 1e-9) problems.push(`trans.tip ${t.tipFur.toFixed(3)} > 0.35`);
  if (field?.faceM) { const s = faceSurface(field, field.faceM); if (!s.ok) problems.push(`face.surface: plate relief ${s.minRel.toFixed(4)} .. ${s.maxRel.toFixed(4)} U`); }
  return problems;
}

// ctx: { key, form, scene, r, ref, targets } -> the round 2 checks of one species
export function round2Checks(ctx) {
  const { key, form, scene, r, ref, targets } = ctx, out = [], r4 = r[304], field = scene.field, fm = field.faceM, B = scene.built, H = ref.height;
  const tgt = targets?.[key], eyes4 = r4.meta.eyes, feet = r4.meta.feet;
  // ---- face.ink at 304: pupil >= 28 px, rim ring >= 2 px wide where present, catch light >= 3 px, nose >= 6 px, mouth stroke >= 2 px and >= 10 px long ----
  const need = key === "rupar" ? 1 : 2, eye304 = eyes4.map((e, i) => { const box = [Math.floor(e.at[0] - e.r * 1.2 - 2), Math.floor(e.at[1] - e.r * 1.2 - 2), Math.ceil(e.at[0] + e.r * 1.2 + 2), Math.ceil(e.at[1] + e.r * 1.2 + 2)], rimN = countInkIn(r4, INK.rim, box), rr = e.r * 0.8; return { pupil: countInkIn(r4, INK.pupil, box), rimWidth: rimN / Math.max(1, 2 * Math.PI * rr * 0.9), catchPx: countInkIn(r4, INK.catch, box), rimPx: rimN }; });
  const noseN = (() => { let n = 0; for (let i = 0; i < r4.ink.length; i++) if (r4.ink[i] === INK.nose) n++; return n; })();
  const mouth304 = (() => { let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1, n = 0; for (let y = 0; y < r4.height; y++) for (let x = 0; x < r4.width; x++) if (r4.ink[y * r4.width + x] === INK.mouth) { n++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return { n, len: n ? Math.hypot(x1 - x0, y1 - y0) : 0, thick: n ? n / Math.max(1, Math.hypot(x1 - x0, y1 - y0)) : 0 }; })();
  const shown = eye304.filter((e) => e.pupil >= 28 && e.catchPx >= 3 && ((1 - (form.look.eyes.iris_r ?? 0.78)) < 0.15 || e.rimWidth >= 2));
  out.push(C("face.ink.304", "the face at 304: pupil >= 28 px, rim ring >= 2 px, catch light >= 3 px, nose >= 6 px", shown.length >= need && noseN >= (fm?.noses.length ? 6 : 0), { eyes: eye304.map((e) => ({ pupil: e.pupil, rimW: +e.rimWidth.toFixed(1), catchPx: e.catchPx })), nosePx: noseN }, `>= ${need} eye(s) with pupil >= 28, rim >= 2, catch >= 3; nose >= 6`));
  if (fm?.mouth) out.push(C("face.mouth", "the mouth ink at 304 is >= 10 px long with a stroke >= 2 px", mouth304.len >= 10 && mouth304.thick >= 2 - 0.5, { lengthPx: +mouth304.len.toFixed(1), strokePx: +mouth304.thick.toFixed(1), px: mouth304.n }, ">= 10 px; >= 2 px"));
  // ---- face.ink at 96 and 48: the table of design 3, from the feature pass ----
  for (const sk of [96, 48]) {
    const f = r[sk].features, eyes = f.eyes.filter((e) => e.visible), [mw, mh] = sk === 96 ? [3, 3] : key === "rupar" ? [1, 2] : [2, 2], rows = [], bad = [];
    for (const e of eyes) {
      const [x0, y0, x1, y1] = e.box, core = rgb(r[sk], x1, y1), ring = []; for (let x = x0 - 1; x <= x1 + 1; x++) ring.push([x, y0 - 1, "t"], [x, y1 + 1, "b"]); for (let y = y0; y <= y1; y++) ring.push([x0 - 1, y, "l"], [x1 + 1, y, "r"]);
      const light = ring.filter(([x, y]) => Lstar(rgb(r[sk], x, y)) >= Lstar(core) + 35), sides = new Set(light.map((q) => q[2])).size;
      const ok = e.core[0] >= mw && e.core[1] >= mh && Lstar(core) <= 30 && (sk === 96 ? light.length / ring.length >= 0.6 : sides >= 2) && (sk !== 96 || e.core[0] < 4 || e.core[1] < 4 || r[sk].ink[y0 * r[sk].width + x0] === INK.catch);
      rows.push({ core: e.core, coreL: +Lstar(core).toFixed(0), surround: sk === 96 ? +(light.length / ring.length).toFixed(2) : sides }); if (!ok) bad.push("eye");
    }
    if (eyes.length >= 2) { const [a, b] = eyes.map((e) => e.box).sort((p, q) => p[0] - q[0]), gap = b[0] - a[2] - 1; rows.push({ gap }); if (gap < (sk === 96 ? 2 : 1)) bad.push("gap"); }
    let nosePx = 0, mouthPx = 0; for (let i = 0; i < r[sk].ink.length; i++) { if (r[sk].ink[i] === INK.nose) nosePx++; if (r[sk].ink[i] === INK.mouth) mouthPx++; }
    if (sk === 96 && fm?.noses.length && f.nose.length && nosePx < 2) bad.push("nose"); if (sk === 48 && mouthPx > 0) bad.push("mouth at 48");
    if (sk === 96 && f.mouth && mouthPx < 3) bad.push("mouth");
    const platePx = (() => { let n = 0; for (let i = 0; i < r[sk].plate.length; i++) if (r[sk].plate[i] > 0 && r[sk].coverage[i] >= 0.5) n++; return n; })(), plateNeed = sk === 96 ? 30 : 8;
    if (platePx < plateNeed) bad.push(`plate ${platePx} px`);
    out.push(C(`face.ink.${sk}`, `the face at ${sk}: eye cores, light surround, catch light, gap, nose, mouth, plate (design 3)`, eyes.length >= need && bad.length === 0, { eyes: rows, nosePx, mouthPx, platePx, dropped: f.dropped, bad }, `>= ${need} eye(s) ${mw}x${mh}; surround ${sk === 96 ? ">= 60 %" : ">= 2 sides"}; plate >= ${plateNeed} px`));
  }
  // ---- face.order: eye line above nose above mouth, each >= 1 px apart, at each size ----
  { const bad = [], order = {}; for (const sk of [304, 96, 48]) {
      const rr = r[sk], eyesY = sk === 304 ? rr.meta.eyes.map((e) => e.at[1]) : rr.features.eyes.filter((e) => e.visible).map((e) => (e.box[1] + e.box[3] + 1) / 2);
      const ys = (code) => { const v = []; for (let y = 0; y < rr.height; y++) for (let x = 0; x < rr.width; x++) if (rr.ink[y * rr.width + x] === code) v.push(y + 0.5); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
      const ey = eyesY.length ? eyesY.reduce((a, b) => a + b, 0) / eyesY.length : null, ny = ys(INK.nose), my = ys(INK.mouth); order[sk] = { eye: ey && +ey.toFixed(1), nose: ny && +ny.toFixed(1), mouth: my && +my.toFixed(1) };
      if (ey !== null && ny !== null && ny < ey + 1) bad.push(`${sk}: nose above the eye line`); if (ny !== null && my !== null && my < ny + 1) bad.push(`${sk}: mouth above the nose`); if (ey !== null && ny === null && my !== null && my < ey + 1) bad.push(`${sk}: mouth above the eye line`);
    }
    out.push(C("face.order", "the eye line above the nose above the mouth, >= 1 px apart, at 304, 96 and 48", bad.length === 0, order, "0 violations", bad.join("; "))); }
  // ---- face.place: against the stand targets of design 7 (as fractions of the height H) ----
  if (tgt && eyes4.length) {
    const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]), vis = eyes4, ex = vis.length === 2 ? dist(vis[0].at, vis[1].at) / H : null, dia = (Math.max(...vis.map((e) => e.r)) * 2 * 0.835) / H;
    const eyeLine = vis.reduce((a, e) => a + (feet + 1 - e.at[1]), 0) / vis.length / H, eyeY = vis.reduce((a, e) => a + e.at[1], 0) / vis.length;
    const noseP = fm?.noses.length ? r4.meta.project(fm.noses[0].c) : null, mouthP = fm?.mouth ? r4.meta.project(fm.castXY(0, fm.mouth.at(0))) : null;
    const row = {}, bad = [], within = (v, t, tol = 0.15) => v !== null && Math.abs(v / t - 1) <= tol, off = (v, t) => Math.abs(v - t) <= Math.max(0.25 * t, 2 / H);
    if (tgt.eyeSep) { row.eyeSep = ex && +ex.toFixed(3); if (!within(ex, tgt.eyeSep)) bad.push("eyeSep"); }
    if (tgt.eyeD) { row.eyeD = +dia.toFixed(3); if (!within(dia, tgt.eyeD)) bad.push("eyeD"); }
    if (tgt.eyeLine) { row.eyeLine = +eyeLine.toFixed(3); if (!within(eyeLine, tgt.eyeLine)) bad.push("eyeLine"); }
    if (tgt.faceCentre) { const fc = (feet + 1 - r4.meta.project(fm.Pf)[1]) / H; row.faceCentre = +fc.toFixed(3); if (!within(fc, tgt.faceCentre)) bad.push("faceCentre"); }
    if (tgt.nose && noseP) { const v = (noseP[1] - eyeY) / H; row.nose = +v.toFixed(3); if (!off(v, tgt.nose)) bad.push("nose"); }
    if (tgt.mouth && mouthP) { const v = (mouthP[1] - eyeY) / H; row.mouth = +v.toFixed(3); if (!off(v, tgt.mouth)) bad.push("mouth"); }
    if (tgt.mouthW && fm?.mouth) { const a = r4.meta.project(fm.castXY(-fm.mouth.w, fm.mouth.at(-fm.mouth.w))), b = r4.meta.project(fm.castXY(fm.mouth.w, fm.mouth.at(fm.mouth.w))), v = dist(a, b) / H; row.mouthW = +v.toFixed(3); if (!within(v, tgt.mouthW, 0.25)) bad.push("mouthW"); }
    out.push(C("face.place", "the face against the stand's targets (fractions of the creature's height): eye separation, eye diameter, eye line, nose and mouth offsets", bad.length === 0, { measured: row, target: tgt, off: bad }, "+-15 % (offsets +-25 % or +-2 px)"));
  }
  // ---- limbs and joins (on the type; the corners are swept by cornerChecks and guardsOf) ----
  const solves = B.solves ?? [];
  out.push(C("limbs.floor", "every declared foot or seat lands on the floor", B.contacts.filter((c) => c.id !== "base").every((c) => Math.abs(c.z - B.floor) <= 0.005 + 1e-9), B.contacts.map((c) => ({ id: c.id, off: +(c.z - B.floor).toFixed(4) })), "<= 0.005 U (type), <= 0.03 U (corners)", solves.length ? `shin solve ${solves.map((s) => s.ratio.toFixed(2)).join("/")} x base (0.5-1.6)` : ""));
  const tm = transMetrics(form, B);
  out.push(C("trans", "the joins: outer slope <= 0.6, slope jump <= 0.05 over a coil start, bend <= 10 deg per 0.05 U, fur over the last 10 % <= 0.35 x the half-size", tm.slope <= 0.6 + 1e-9 && tm.jump <= 0.05 + 1e-9 && tm.bend <= 10 + 1e-9 && tm.tipFur <= 0.35 + 1e-9, { slope: +tm.slope.toFixed(3), c1Jump: +tm.jump.toFixed(3), bendDegPer005U: +tm.bend.toFixed(1), tipFur: +tm.tipFur.toFixed(3) }, "0.6 / 0.05 / 10 / 0.35"));
  const part = (name, rr) => countPart(rr, name);
  if (key === "wickle") {
    // each foot >= 80 px outside the drop at 304 and >= 5 at 96; each arm >= 100 px, one outline bump >= 3 px
    const feet4 = part("feet", r[304]), feet96 = part("feet", r[96]), arms = part("arms", r[304]);
    out.push(C("limbs.show.wickle", "Wickle: feet >= 80 px each at 304 (>= 5 at 96), arms >= 100 px each", feet4 / 2 >= 80 && feet96 / 2 >= 5 && arms / 2 >= 100, { feet304: feet4, feet96, arms304: arms }, ">= 160 / >= 10 / >= 200 (two each)"));
  }
  if (key === "curlop") { const toes = B.branches.filter((x) => x.toe).length, legs = part("legs", r[304]), palms = B.branches.filter((x) => x.branch.id === "arm").map((x) => x.samples.at(-1).p), mid = [(palms[0][0] + palms[1][0]) / 2, (palms[0][1] + palms[1][1]) / 2, (palms[0][2] + palms[1][2]) / 2 + field.shift];
    out.push(C("limbs.show.curlop", "Curlop: each foot with toes >= 150 px, palms within 0.08 U of y = 0, F > 0 between the palms", legs / 2 >= 150 && toes === 6 && palms.every((p) => Math.abs(p[1]) <= 0.08) && field.F(mid) > 0, { legPx: legs, toes, palmY: palms.map((p) => +p[1].toFixed(3)) }, ">= 300 (two feet); 6 toes; <= 0.08 U")); }
  if (key === "loika") { const nf = countNails(r4); out.push(C("limbs.show.loika", "Loika: >= 3 nail blobs on each visible front foot at 304", Object.keys(nf).length >= 1 && Object.values(nf).every((v) => v >= 3), nf, ">= 3 per front foot")); }
  if (key === "rupar") out.push(C("limbs.show.rupar", "Rupar: each ear >= 200 px at 304", part("ears", r[304]) / 2 >= 200, part("ears", r[304]), ">= 400 (two ears)"));
  if (key === "drapet") out.push(C("limbs.show.drapet", "Drapet: legs 0 px", [304, 96, 48].every((k) => part("legs", r[k]) === 0), [304, 96, 48].map((k) => part("legs", r[k])), "0"));
  if (key === "loika") { const leaves = B.branches.filter((x) => x.branch.part === "crest").map((x) => { const S = x.samples, len = S.at(-1).s, wid = 2 * Math.max(...S.map((q) => Math.max(q.w, q.u, q.d))); return +(wid / len).toFixed(2); }); out.push(C("loika.leaves", "each leaf's width / length >= 0.45", leaves.every((v) => v >= 0.45), leaves, ">= 0.45")); }
  if (key === "drapet") {
    // drapet.e: the stand's silhouette shape: width at .75 H over width at .5 H in 1.02 .. 1.12, and width at .1 H >= 0.95 x the stand's
    const rowW = (cov, W, y) => { let l = -1, rr2 = -1; for (let x = 0; x < W; x++) if (cov[y * W + x] >= 0.5) { if (l < 0) l = x; rr2 = x + 1; } return l < 0 ? 0 : rr2 - l; };
    const bx = boxOf(maskOfCoverage(r4)), h = bx.y1 - bx.y0, at = (f) => Math.round(bx.y0 + f * h), sb = ctx.stand ? boxOf(ctx.stand) : null, sh = sb ? sb.y1 - sb.y0 : 1, sAt = (f) => Math.round((sb?.y0 ?? 0) + f * sh);
    const ratio = rowW(r4.coverage, r4.width, at(0.25)) / rowW(r4.coverage, r4.width, at(0.5)), w10 = rowW(r4.coverage, r4.width, at(0.9)), sw10 = ctx.stand ? (() => { const m = ctx.stand; let l = -1, rr2 = -1; const y = sAt(0.9); for (let x = 0; x < m.width; x++) if (m.bits[y * m.width + x]) { if (l < 0) l = x; rr2 = x + 1; } return rr2 - l; })() : 0;
    out.push(C("drapet.e", "the fall: width at .75 H over width at .5 H in 1.02 .. 1.12, width at .1 H >= .95 x the stand's", ratio >= 1.02 && ratio <= 1.12 && w10 >= 0.95 * sw10, { ratio: +ratio.toFixed(3), widthAt0_1H: w10, standWidth: sw10 }, "1.02 .. 1.12; >= .95 x stand", "heights measured down from the top: .25 from the top is .75 H"));
  }
  // marks.contrast: each mark's pigment against its surround at 304; texture energy
  { const look = form.look, pig = look.pigments, base = pig[Object.values(look.slots)[0]], res = {}, marks = { plate: pig.patch, belly: form.face.belly ? pig.belly : null, spot: pig.spot, sock: pig.sock, hoof: pig.hoof, nail: pig.nail, ring: pig.ring, inner: pig.inner };
    let ok = true; for (const [n, c] of Object.entries(marks)) if (c) { const sur = n === "hoof" ? pig.sock : base, d = Math.abs(Lstar(c) - Lstar(sur)); res[n] = +d.toFixed(0); if (d < 12) ok = false; }
    out.push(C("marks.contrast", "each mark against its surround: dL* >= 12", ok, res, ">= 12")); }
  return out;
}
const countNails = (r4) => { // toes of the front feet with >= 4 visible px, per foot (the toes carry the nail share: a blob each)
  const names = r4.maps.groupNames, cnt = {}; for (let i = 0; i < r4.maps.group.length; i++) { const g = r4.maps.group[i]; if (g >= 0 && r4.coverage[i] >= 0.5 && /^fore[LR]t\d$/.test(names[g])) cnt[names[g]] = (cnt[names[g]] ?? 0) + 1; }
  const feet = {}; for (const [k, v] of Object.entries(cnt)) { const f = k.slice(0, 5); feet[f] = (feet[f] ?? 0) + (v >= 4 ? 1 : 0); } return feet;
};
// the mean |dL*| of neighbouring body pixels (reported, not gated)
export function textureEnergy(r) { let sum = 0, n = 0; const W = r.width; for (let y = 0; y < r.height; y++) for (let x = 0; x < W - 1; x++) { const i = y * W + x; if (r.coverage[i] < 0.99 || r.coverage[i + 1] < 0.99) continue; sum += Math.abs(Lstar(rgb(r, x, y)) - Lstar(rgb(r, x + 1, y))); n++; } return n ? +(sum / n).toFixed(3) : 0; }
