// Stamp decoder: image -> genome, verified only. Plain JS, no Node APIs, so the
// scan page runs the same code.
//
// Pipeline: luminance -> adaptive threshold -> components -> convex hull ->
// quadrilateral -> the solid frame's outer edge, fitted line by line (handles
// perspective) -> grid size from the perforation's period -> per-cell sampling,
// normalised by the known black frame and white perforation gaps -> the species
// border gives species and orientation (the glyph corner breaks ties) ->
// Reed–Solomon -> header -> frame -> CRC-16 over header, mask and payload.
import { SIZES, layout, ringCells, borderPattern, parseMessage, fromBits, toBits } from "./codec.mjs";
import { rsDecode } from "./rs.mjs";
import { FRAMES_LIST } from "./frames.mjs";

export function toLuma(img) {
  const { width: w, height: h, data } = img, L = new Float32Array(w * h);
  for (let i = 0, j = 0; i < L.length; i++, j += 4) L[i] = (0.299 * data[j] + 0.587 * data[j + 1] + 0.114 * data[j + 2]) / 255;
  return { w, h, L };
}
function boxDown(g, f) {
  if (f <= 1) return g;
  const w = Math.floor(g.w / f), h = Math.floor(g.h / f), L = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0;
    for (let yy = 0; yy < f; yy++) for (let xx = 0; xx < f; xx++) s += g.L[(y * f + yy) * g.w + x * f + xx];
    L[y * w + x] = s / (f * f);
  }
  return { w, h, L };
}
function sampler({ w, h, L }) {
  return (x, y) => {
    if (x < 0) x = 0; else if (x > w - 1.001) x = w - 1.001;
    if (y < 0) y = 0; else if (y > h - 1.001) y = h - 1.001;
    const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0, i = y0 * w + x0;
    return (L[i] * (1 - fx) + L[i + 1] * fx) * (1 - fy) + (L[i + w] * (1 - fx) + L[i + w + 1] * fx) * fy;
  };
}
const apply = (H, x, y) => { const z = H[6] * x + H[7] * y + H[8]; return [(H[0] * x + H[1] * y + H[2]) / z, (H[3] * x + H[4] * y + H[5]) / z]; };

function solve(A, b) {
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    if (Math.abs(M[c][c]) < 1e-12) return null;
    for (let r = 0; r < n; r++) { if (r === c) continue; const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  return M.map((r, i) => r[n] / r[i]);
}
// homography from the unit square corners (0,0),(1,0),(1,1),(0,1) to quad q
function squareToQuad(q) {
  const src = [[0, 0], [1, 0], [1, 1], [0, 1]], A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i], [X, Y] = q[i];
    A.push([x, y, 1, 0, 0, 0, -X * x, -X * y]); b.push(X);
    A.push([0, 0, 0, x, y, 1, -Y * x, -Y * y]); b.push(Y);
  }
  const h = solve(A, b);
  return h ? [...h, 1] : null;
}

// ---------- candidates ----------
function components(g) {
  const { w, h, L } = g;
  const I = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) { let row = 0; for (let x = 0; x < w; x++) { row += L[y * w + x]; I[(y + 1) * (w + 1) + x + 1] = I[y * (w + 1) + x + 1] + row; } }
  const rad = Math.max(4, Math.round(Math.min(w, h) / 12));
  const dark = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - rad), y1 = Math.min(h, y + rad + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - rad), x1 = Math.min(w, x + rad + 1);
      const m = (I[y1 * (w + 1) + x1] - I[y0 * (w + 1) + x1] - I[y1 * (w + 1) + x0] + I[y0 * (w + 1) + x0]) / ((x1 - x0) * (y1 - y0));
      const v = L[y * w + x];
      dark[y * w + x] = v < m * 0.88 && v < m - 0.035 ? 1 : 0;
    }
  }
  const label = new Int32Array(w * h).fill(-1), comps = [], stack = [];
  for (let s = 0; s < w * h; s++) {
    if (!dark[s] || label[s] >= 0) continue;
    const id = comps.length, rows = new Map();
    let n = 0;
    label[s] = id; stack.push(s);
    while (stack.length) {
      const p = stack.pop(), px = p % w, py = (p / w) | 0;
      n++;
      const r = rows.get(py);
      if (!r) rows.set(py, [px, px]); else { if (px < r[0]) r[0] = px; if (px > r[1]) r[1] = px; }
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const qx = px + dx, qy = py + dy;
        if (qx < 0 || qy < 0 || qx >= w || qy >= h) continue;
        const q = qy * w + qx;
        if (dark[q] && label[q] < 0) { label[q] = id; stack.push(q); }
      }
    }
    if (n >= 60) comps.push({ id, n, rows });
  }
  return comps;
}

function hull(pts) {
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of pts) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
const polyArea = (P) => Math.abs(P.reduce((s, p, i) => { const q = P[(i + 1) % P.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;

function quadOf(H) {
  // four corners of a convex hull: farthest pair, then farthest from that diagonal on each side
  let a = 0, b = 0, best = -1;
  for (let i = 0; i < H.length; i++) for (let j = i + 1; j < H.length; j++) { const d = (H[i][0] - H[j][0]) ** 2 + (H[i][1] - H[j][1]) ** 2; if (d > best) { best = d; a = i; b = j; } }
  const A = H[a], B = H[b];
  const side = (p) => (B[0] - A[0]) * (p[1] - A[1]) - (B[1] - A[1]) * (p[0] - A[0]);
  let c = null, d = null, cs = 0, ds = 0;
  for (const p of H) { const s = side(p); if (s > cs) { cs = s; c = p; } if (s < ds) { ds = s; d = p; } }
  if (!c || !d) return null;
  // clockwise order in image coords (y down): A, D, B, C or A, C, B, D
  let q = [A, c, B, d];
  const cross = (q[1][0] - q[0][0]) * (q[2][1] - q[0][1]) - (q[1][1] - q[0][1]) * (q[2][0] - q[0][0]);
  if (cross < 0) q = [A, d, B, c];
  return q;
}

function candidates(g) {
  const out = [];
  for (const c of components(g)) {
    const pts = [];
    for (const [y, [x0, x1]] of c.rows) { pts.push([x0, y], [x1 + 1, y], [x0, y + 1], [x1 + 1, y + 1]); }
    if (pts.length < 40) continue;
    const H = hull(pts);
    const q = H.length >= 4 ? quadOf(H) : null;
    if (!q) continue;
    const qa = polyArea(q), ha = polyArea(H);
    const sides = q.map((p, i) => Math.hypot(q[(i + 1) % 4][0] - p[0], q[(i + 1) % 4][1] - p[1]));
    const minS = Math.min(...sides), maxS = Math.max(...sides);
    if (minS < 16 || maxS / minS > 3 || qa / ha < 0.8) continue;
    out.push({ q, size: Math.sqrt(qa) });
  }
  return out.sort((a, b) => b.size - a.size);
}

// ---------- the frame's outer edge, line by line ----------
function fitLine(pts) {
  let mx = 0, my = 0;
  for (const [x, y] of pts) { mx += x; my += y; }
  mx /= pts.length; my /= pts.length;
  let sxx = 0, sxy = 0, syy = 0;
  for (const [x, y] of pts) { sxx += (x - mx) ** 2; sxy += (x - mx) * (y - my); syy += (y - my) ** 2; }
  const ang = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  return { p: [mx, my], d: [Math.cos(ang), Math.sin(ang)] };
}
function intersect(l1, l2) {
  const [x1, y1] = l1.p, [dx1, dy1] = l1.d, [x2, y2] = l2.p, [dx2, dy2] = l2.d;
  const den = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((x2 - x1) * dy2 - (y2 - y1) * dx2) / den;
  return [x1 + t * dx1, y1 + t * dy1];
}

// In unit-square coordinates of H (the current estimate of the frame's outer
// square), find the outer edge of the solid frame along each side.
function refineFrame(S, H, sidePx) {
  const lines = [];
  const NP = 48;
  for (let side = 0; side < 4; side++) {
    // param t along the side, s = depth (negative = outside)
    const P = (t, s) => {
      const [u, v] = [[t, s], [1 - s, t], [1 - t, 1 - s], [s, 1 - t]][side];
      return apply(H, u, v);
    };
    const depths = [], step = 0.25 / sidePx;
    for (let s = -0.08; s <= 0.1; s += step) depths.push(s);
    const prof = [];
    for (let i = 0; i < NP; i++) {
      const t = 0.08 + (0.84 * (i + 0.5)) / NP;
      prof.push(depths.map((s) => S(...P(t, s))));
    }
    // the median profile: the frame line is dark at every t, the perforation only at half
    const med = depths.map((_, j) => { const col = prof.map((p) => p[j]).sort((a, b) => a - b); return col[col.length >> 1]; });
    const white = Math.max(...med.slice(0, Math.floor(med.length * 0.3)));
    const black = Math.min(...med);
    const mid = (white + black) / 2;
    // outermost depth where the median goes dark and stays dark for a while
    let jEdge = -1;
    for (let j = 1; j < med.length - 4; j++) if (med[j] < mid && med[j + 2] < mid && med[j + 4] < mid) { jEdge = j; break; }
    if (jEdge < 0) return null;
    const sEdge = depths[jEdge];
    const pts = [];
    prof.forEach((p, i) => {
      // nearest light->dark crossing to sEdge, within a small window
      const t = 0.08 + (0.84 * (i + 0.5)) / NP;
      let bestJ = -1, bestD = 1e9;
      for (let j = 1; j < p.length; j++) {
        if (p[j - 1] >= mid && p[j] < mid) { const d = Math.abs(depths[j] - sEdge); if (d < bestD) { bestD = d; bestJ = j; } }
      }
      if (bestJ < 0 || bestD > 0.02) return;
      const f = (p[bestJ - 1] - mid) / (p[bestJ - 1] - p[bestJ] || 1);
      pts.push(P(t, depths[bestJ - 1] + f * step));
    });
    if (pts.length < 10) return null;
    // robust: drop the worst quarter and refit
    let l = fitLine(pts);
    const dist = (q) => Math.abs((q[0] - l.p[0]) * l.d[1] - (q[1] - l.p[1]) * l.d[0]);
    const keep = pts.map((q) => [dist(q), q]).sort((a, b) => a[0] - b[0]).slice(0, Math.ceil(pts.length * 0.75)).map((x) => x[1]);
    l = fitLine(keep);
    lines.push(l);
  }
  const q = [intersect(lines[3], lines[0]), intersect(lines[0], lines[1]), intersect(lines[1], lines[2]), intersect(lines[2], lines[3])];
  if (q.some((p) => !p)) return null;
  return squareToQuad(q);
}

// grid size from the perforation: dots on even cells, gaps on odd, just outside the frame
function findN(S, H) {
  let best = null;
  for (const N of SIZES) {
    if (!layout(N, null)) continue; // too small to hold the header
    const k = N - 2;
    let dot = 0, gap = 0, nd = 0, ng = 0;
    for (let side = 0; side < 4; side++)
      for (let i = 1; i < N - 1; i++) {
        const t = (i + 0.5 - 1) / k, s = -0.5 / k;
        const [u, v] = [[t, s], [1 - s, t], [1 - t, 1 - s], [s, 1 - t]][side];
        const val = S(...apply(H, u, v));
        if (i % 2 === 0) { dot += val; nd++; } else { gap += val; ng++; }
      }
    const score = gap / ng - dot / nd;
    if (!best || score > best.score) best = { N, score };
  }
  return best;
}

// ---------- cells ----------
function readGrid(S, H, N) {
  // cell (r, c) centre -> unit coords of the frame square: u = (c + 0.5 - 1) / (N - 2)
  const k = N - 2, val = new Float64Array(N * N);
  const offs = [-0.22, 0, 0.22];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    let s = 0;
    for (const dy of offs) for (const dx of offs) s += S(...apply(H, (c + 0.5 + dx - 1) / k, (r + 0.5 + dy - 1) / k));
    val[r * N + c] = s / 9;
  }
  // white and black references round the edge: perforation gaps (white), frame (black)
  const ref = (pick) => { const out = []; for (const [r, c] of ringCells(N, pick === "w" ? 0 : 1)) if (pick === "b" || (r + c) % 2 === 1) out.push([r, c, val[r * N + c]]); return out; };
  const W = ref("w"), Bk = ref("b");
  const interp = (pts, r, c) => { // inverse-distance weighting, near points dominate
    let sw = 0, sv = 0;
    for (const [rr, cc, v] of pts) { const d = (rr - r) ** 2 + (cc - c) ** 2 + 0.5, w = 1 / (d * d); sw += w; sv += w * v; }
    return sv / sw;
  };
  // Each cell against its neighbourhood: the local white and dark envelopes
  // (second-lightest and second-darkest of the 5x5 cells around it), with the
  // contrast expected there from the black frame and white gaps at the edge.
  // A glare spot lifts everything towards white and shrinks the contrast by
  // (1 - local white) / (1 - edge white), so the expectation follows it.
  const bit = new Uint8Array(N * N), conf = new Float64Array(N * N), t = new Float64Array(N * N);
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const w = interp(W, r, c), b = interp(Bk, r, c), v = val[r * N + c];
    const nb = [];
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) { const rr = r + dr, cc = c + dc; if (rr >= 0 && cc >= 0 && rr < N && cc < N) nb.push(val[rr * N + cc]); }
    nb.sort((x, y) => x - y);
    const lo = nb[1], hi = Math.max(nb[nb.length - 2], v);
    const ref = Math.max(0.05, w - b);
    const expect = hi > w && w < 0.995 ? ref * Math.max(0.1, (1 - hi) / (1 - w)) : ref * Math.min(1.5, hi / Math.max(0.05, w));
    let thr;
    if (hi - lo > 0.45 * expect) thr = (hi + lo) / 2; // both kinds of cell nearby
    else thr = hi - 0.5 * expect; // a light (or dark) patch: judge against the expected contrast
    t[r * N + c] = (hi - v) / expect;
    bit[r * N + c] = v < thr ? 1 : 0;
    conf[r * N + c] = Math.abs(v - thr) / expect;
  }
  return { bit, conf, t };
}

const rot = (N, r, c, k) => { for (let i = 0; i < k; i++) [r, c] = [c, N - 1 - r]; return [r, c]; };

function tryOrientation(grid, N, k, mirror) {
  const at = (r, c) => { let [rr, cc] = rot(N, r, c, k); if (mirror) cc = N - 1 - cc; return grid.bit[rr * N + cc]; };
  const L = layout(N, null);
  if (!L) return { ok: false, stage: "timing" };
  const msg = L.msgCells.map(([r, c]) => at(r, c)), par = L.parityCells.map(([r, c]) => at(r, c));
  const bytes = [];
  for (let i = 0; i < msg.length; i += 8) bytes.push(fromBits(msg.slice(i, i + 8)));
  for (let i = 0; i < par.length; i += 8) bytes.push(fromBits(par.slice(i, i + 8)));
  const rs = rsDecode(bytes, L.p);
  if (!rs.ok) return { ok: false, stage: "reed-solomon" };
  const bits = rs.data.slice(0, L.m).flatMap((b) => toBits(b, 8));
  const res = parseMessage(bits, N);
  return { ...res, corrected: rs.corrected, codewordBytes: L.B };
}

function orientations(grid, N) {
  // the species border and glyph, matched against every frame in the registry,
  // at 4 rotations (and mirrored); Reed–Solomon and the CRC confirm the choice
  const ring = ringCells(N, 2);
  const scores = [];
  for (const mirror of [false, true])
    for (let k = 0; k < 4; k++) {
      let best = 0;
      for (const f of FRAMES_LIST) {
        // the border (identical for every member) and the glyph in its fixed corner
        const bp = borderPattern(f, N);
        const at = (r, c) => { let [rr, cc] = rot(N, r, c, k); if (mirror) cc = N - 1 - cc; return grid.bit[rr * N + cc]; };
        let agree = 0, total = ring.length + 25;
        ring.forEach(([r, c], i) => { if (at(r, c) === bp.bits[i]) agree++; });
        f.glyph.forEach((row, y) => [...row].forEach((ch, x) => { if (at(3 + y, 3 + x) === (ch === "#" ? 1 : 0)) agree++; }));
        best = Math.max(best, agree / total);
      }
      scores.push({ k, mirror, score: best });
    }
  return scores.sort((a, b) => b.score - a.score);
}

// Public entry: {ok, stamps:[verified reads], tried, candidates, ms, error}
export function decode(img, options = {}) {
  const t0 = Date.now();
  const g = img.L ? img : toLuma(img);
  const f = Math.max(1, Math.ceil(Math.max(g.w, g.h) / 640));
  const gw = boxDown(g, f);
  const cands = candidates(gw).slice(0, options.maxCandidates ?? (options.all ? 12 : 5));
  const stamps = [], tried = [];
  for (const cand of cands) {
    const q = cand.q.map(([x, y]) => [x * f + (f - 1) / 2 - 0.5, y * f + (f - 1) / 2 - 0.5]);
    const centre = q.reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4], [0, 0]);
    if (stamps.some((s) => Math.hypot(s.centre[0] - centre[0], s.centre[1] - centre[1]) < s.size * 0.4)) continue;
    const sidePx = cand.size * f;
    // sample from a lightly smoothed copy when the stamp is large
    const f2 = Math.max(1, Math.floor(sidePx / 400));
    const gs = f2 > 1 ? boxDown(g, f2) : g;
    const Sraw = sampler(gs);
    const S = f2 > 1 ? (x, y) => Sraw((x - (f2 - 1) / 2) / f2, (y - (f2 - 1) / 2) / f2) : Sraw;
    let H = squareToQuad(q);
    if (!H) continue;
    let ok = true;
    for (let it = 0; it < 3 && ok; it++) { const Hn = refineFrame(S, H, sidePx); if (Hn) H = Hn; else ok = it > 0; }
    if (!ok) { tried.push({ stage: "frame", centre, size: sidePx, quad: q }); continue; }
    const { N, score } = findN(S, H);
    const corners = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([u, v]) => apply(H, u, v));
    if (score < 0.03) { tried.push({ stage: "timing", centre, size: sidePx, quad: corners }); continue; }
    const grid = readGrid(S, H, N);
    let res = null;
    for (const o of orientations(grid, N)) {
      if (o.mirror && options.mirror === false) continue;
      const r = tryOrientation(grid, N, o.k, o.mirror);
      if (r.ok) { res = { ...r, k: o.k, mirror: o.mirror, borderMatch: o.score }; break; }
      res ??= { ...r, borderMatch: o.score };
    }
    const info = { N, centre, size: sidePx, quad: corners, H };
    if (res?.ok) {
      const { frame, ...rest } = res;
      stamps.push({ ...rest, ...info, cellMm: null, minConfidence: Math.min(...grid.conf) });
      if (!options.all) break;
    } else tried.push({ ...info, stage: res?.stage ?? "reed-solomon" });
  }
  const stage = tried[0]?.stage;
  return {
    ok: stamps.length > 0, stamps, tried, candidates: cands.length, ms: Date.now() - t0,
    error: stamps.length ? null : !cands.length ? "no read: no stamp found" : `no read: ${stage === "frame" ? "frame not found" : stage === "timing" ? "grid not found" : stage === "reed-solomon" ? "too many cells unreadable" : stage === "species" ? "species not in this reader" : "check failed"}`,
  };
}
