// cliff-contour-1: the shape of a land's outline against the smooth noise contour it came from. Pure; used by land-contour.mjs (whole realms) and land-contour-stages.mjs (the passes one by one).
// The outline is traced as loops of unit tile edges, raised land on the right (clockwise in screen rows): E = a back rim edge (low to the north), S = an east-facing side, W = a south lip edge, N = a west-facing side.
// Each loop is a list of runs { d, n } (direction, tiles). The measures:
//   runs     straight runs by kind (south, rim, side): count of 5+, 6+, over 10, the longest; a run of 5+ is "from the noise" when the smooth contour stays within 0.5 tile of its edge all along it
//   stairs   right-angle staircases: 3+ steps in one direction (treads and risers of 1-2 tiles, alternating) whose corners the piece set draws square; s1 = all treads and risers 1
//   jogs     a side wall offset by one column between two vertical runs of 2+ rows, drawn square
//   dist     the distance from the outline to the smooth contour (marching squares on the tile centres): the tile outline (each unit edge's midpoint) and the drawn line (a corner the set draws as a
//            slope is cut through the midpoints of the edges either side of it), mean and worst, in tiles
// model: 'old' (the cliff set before this job: south 1:1 chains of 3+ and steep chains cut) or 'new' (cliff-contour-1's slope rule, see spec.md).
const DX = { E: 1, S: 0, W: -1, N: 0 }, DY = { E: 0, S: 1, W: 0, N: -1 };
const KIND = { E: 'rim', W: 'south', S: 'side', N: 'side' };
const H_ = (d) => d === 'E' || d === 'W';

// loops of the outline of raster R (1 raised), w x h; outside the raster is low
export function traceLoops(R, w, h) {
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : R[y * w + x]);
  // outgoing edges per vertex: key y * (w + 1) + x; up to 2 (a pinch)
  const out = new Map(), W1 = w + 1;
  const add = (x0, y0, d) => { const k = y0 * W1 + x0, e = out.get(k); if (e) e.push(d); else out.set(k, [d]); };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!R[y * w + x]) continue;
    if (!at(x, y - 1)) add(x, y, 'E');
    if (!at(x + 1, y)) add(x + 1, y, 'S');
    if (!at(x, y + 1)) add(x + 1, y + 1, 'W');
    if (!at(x - 1, y)) add(x, y + 1, 'N');
  }
  const RIGHT = { E: 'S', S: 'W', W: 'N', N: 'E' }, loops = [];
  for (const [k0, ds0] of out) {
    while (ds0.length) {
      let x = k0 % W1, y = (k0 / W1) | 0, d = ds0.pop(); const x0 = x, y0 = y, moves = [d];
      for (let guard = 0; guard < 1e7; guard++) {
        x += DX[d]; y += DY[d];
        const ds = out.get(y * W1 + x); if (!ds || !ds.length) break;
        // at a pinch take the right turn (keeps raised blobs apart)
        let i = ds.indexOf(RIGHT[d]); if (i < 0) i = ds.length - 1;
        d = ds.splice(i, 1)[0]; moves.push(d);
      }
      // rotated so the loop starts at a corner: the first move that differs from the one before it
      const m = moves.length; let s = 0; while (s < m && moves[s] === moves[(s - 1 + m) % m]) s++; if (s === m) s = 0;
      let sx = x0, sy = y0; for (let i = 0; i < s; i++) { sx += DX[moves[i]]; sy += DY[moves[i]]; }
      const runs = []; for (let i = 0; i < m; i++) { const d2 = moves[(s + i) % m], r = runs[runs.length - 1]; if (r && r.d === d2) r.n++; else runs.push({ d: d2, n: 1 }); }
      loops.push({ x: sx, y: sy, runs, closed: x === x0 && y === y0 });
    }
  }
  return loops;
}

// the smooth contour: segments of the iso-line q = -0.5 (raised is q >= 0) on the tile centres, in a bucket grid of 1 tile
export function isoLine(q, w, h) {
  const B = new Map(), key = (x, y) => y * (w + 2) + x;
  const put = (s) => { const bx = Math.floor((s[0] + s[2]) / 2), by = Math.floor((s[1] + s[3]) / 2), k = key(bx, by); const a = B.get(k); if (a) a.push(s); else B.set(k, [s]); };
  const t = -0.5, Q = (x, y) => q[y * w + x];
  for (let y = 0; y + 1 < h; y++) for (let x = 0; x + 1 < w; x++) {
    const a = Q(x, y), b = Q(x + 1, y), c = Q(x + 1, y + 1), d = Q(x, y + 1);
    const ia = a > t, ib = b > t, ic = c > t, id = d > t; if (ia === ib && ib === ic && ic === id) continue;
    const cx = x + 0.5, cy = y + 0.5, P = [];
    const lerp = (v0, v1) => (t - v0) / (v1 - v0);
    if (ia !== ib) P.push([cx + lerp(a, b), cy]);
    if (ib !== ic) P.push([cx + 1, cy + lerp(b, c)]);
    if (ic !== id) P.push([cx + 1 - lerp(c, d), cy + 1]);
    if (id !== ia) P.push([cx, cy + 1 - lerp(d, a)]);
    if (P.length === 2) put([P[0][0], P[0][1], P[1][0], P[1][1]]);
    else if (P.length === 4) { put([P[0][0], P[0][1], P[1][0], P[1][1]]); put([P[2][0], P[2][1], P[3][0], P[3][1]]); }
  }
  return { B, key, w };
}
const segDist = (px, py, s) => { const vx = s[2] - s[0], vy = s[3] - s[1], L = vx * vx + vy * vy; let u = L ? ((px - s[0]) * vx + (py - s[1]) * vy) / L : 0; u = u < 0 ? 0 : u > 1 ? 1 : u; const dx = s[0] + u * vx - px, dy = s[1] + u * vy - py; return Math.sqrt(dx * dx + dy * dy); };
export const CAP = 3;
export function isoDist(iso, px, py) {
  let best = CAP; const bx = Math.floor(px), by = Math.floor(py);
  for (let r = 0; r <= CAP; r++) {
    if (r > best + 1) break;
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
      if (Math.max(Math.abs(i), Math.abs(j)) !== r) continue;
      const a = iso.B.get(iso.key(bx + i, by + j)); if (!a) continue;
      for (const s of a) { const d = segDist(px, py, s); if (d < best) best = d; }
    }
  }
  return best;
}

// which corners the set draws as a slope (cut) under a model. A corner i sits between runs[i] and runs[i + 1].
// A riser is a run between two runs perpendicular to it that turn the same way round it (a step), so the outline goes on in one general direction.
function cutCorners(runs, model) {
  const n = runs.length, cut = new Uint8Array(n), R = (i) => runs[((i % n) + n) % n];
  // a step: run i is a riser when runs i - 1 and i + 1 go the same way (both treads in one direction)
  const isStep = (i) => R(i - 1).d === R(i + 1).d && R(i).d !== R(i - 1).d;
  // south-facing staircases: treads W (south lips), risers N or S. old: chains of 3+ one-tile steps (treads 1, risers 1) and steep chains (treads 1, risers 1-3, 3+, average over 1.25)
  for (let i = 0; i < n; i++) {
    const r = R(i);
    if (!isStep(i)) continue;
    const tread = R(i - 1).d, horizontal = H_(tread);
    if (model === 'old') {
      if (tread !== 'W') continue;
      // the chain of steps through this riser with treads of 1 (the tread runs inside the chain), risers 1-3
      const ok = (k) => isStep(k) && R(k - 1).d === 'W' && R(k).d === r.d && R(k).n <= 3;
      let a = i, b = i; while (ok(a - 2) && R(a - 1).n === 1 && a - i > -n) a -= 2; while (ok(b + 2) && R(b + 1).n === 1 && b - i < n) b += 2;
      const steps = (b - a) / 2 + 1; let sum = 0; for (let k = a; k <= b; k += 2) sum += R(k).n;
      const diag = steps >= 3 && sum === steps, steep = steps >= 3 && 4 * sum >= 5 * steps;
      if (diag || steep) { cut[((i - 1) % n + n) % n] = 1; cut[i] = 1; }
    } else {
      // new: every riser of one tile between treads (south or rim), the corners either side cut; a side wall's one-column offset between two vertical runs (tread 1 between risers) cut;
      // the south steep chains as before
      if (horizontal && r.n === 1) { cut[((i - 1) % n + n) % n] = 1; cut[i] = 1; continue; }
      if (!horizontal && r.n === 1 && R(i - 1).n >= 2 && R(i + 1).n >= 2) { cut[((i - 1) % n + n) % n] = 1; cut[i] = 1; continue; }
      if (tread === 'W' && r.n <= 3) {
        const ok = (k) => isStep(k) && R(k - 1).d === 'W' && R(k).d === r.d && R(k).n <= 3;
        let a = i, b = i; while (ok(a - 2) && R(a - 1).n === 1 && a - i > -n) a -= 2; while (ok(b + 2) && R(b + 1).n === 1 && b - i < n) b += 2;
        const steps = (b - a) / 2 + 1; let sum = 0; for (let k = a; k <= b; k += 2) sum += R(k).n;
        if (steps >= 3 && 4 * sum >= 5 * steps) { cut[((i - 1) % n + n) % n] = 1; cut[i] = 1; }
      }
    }
  }
  return cut;
}

// measures of one raster; q (Int32, the smooth field, held) optional; inside(x, y): the tiles counted (a run or corner counts when its first tile is inside)
export function measureLand(R, w, h, q, model, inside = () => true) {
  const loops = traceLoops(R, w, h), iso = q ? isoLine(q, w, h) : null;
  const st = { runs: { south: [], rim: [], side: [] }, noise5: { south: 0, rim: 0, side: 0 }, rule5: { south: 0, rim: 0, side: 0 }, stairs: 0, stairs1: 0, stairs2: 0, stairsAt: [], jogs: 0, jogsAt: [], longAt: [],
    tile: { n: 0, sum: 0, max: 0, far: 0 }, drawn: { n: 0, sum: 0, max: 0, far: 0 } };
  for (const lp of loops) {
    const { runs } = lp, n = runs.length; if (n < 4) continue;
    // the vertex at the start of each run
    const vx = new Int32Array(n + 1), vy = new Int32Array(n + 1); vx[0] = lp.x; vy[0] = lp.y;
    for (let i = 0; i < n; i++) { vx[i + 1] = vx[i] + DX[runs[i].d] * runs[i].n; vy[i + 1] = vy[i] + DY[runs[i].d] * runs[i].n; }
    const cut = cutCorners(runs, model), C = (i) => cut[((i % n) + n) % n], Rn = (i) => runs[((i % n) + n) % n];
    // straight runs (a run whose corners at both ends are cut is drawn as part of a slope: not a straight front)
    for (let i = 0; i < n; i++) {
      const r = runs[i], k = KIND[r.d], x0 = vx[i], y0 = vy[i];
      const tx = r.d === 'W' ? x0 - 1 : r.d === 'N' ? x0 - 1 : x0, ty = r.d === 'S' ? y0 : r.d === 'N' ? y0 - 1 : r.d === 'W' ? y0 - 1 : y0;
      if (!inside(tx, ty)) continue;
      st.runs[k].push(r.n);
      if (r.n >= 5) {
        let maxd = 0; if (iso) for (let t = 0; t < r.n; t++) { const px = x0 + DX[r.d] * (t + 0.5), py = y0 + DY[r.d] * (t + 0.5); maxd = Math.max(maxd, isoDist(iso, px, py)); }
        if (maxd <= 0.5) st.noise5[k]++; else st.rule5[k]++;
        if (r.n > 10 && st.longAt.length < 60) st.longAt.push([k, x0, y0, r.n]);
      }
    }
    // staircases drawn square: maximal alternations of two perpendicular directions with all runs 1-2, 3+ treads, a square corner in each step
    for (let i = 0; i < n; i++) {
      const a = Rn(i), b = Rn(i + 1);
      if (H_(a.d) === H_(b.d) || a.n > 2 || b.n > 2) continue;
      if (Rn(i - 1).d === a.d && Rn(i - 1).n <= 2 && Rn(i - 2).d === b.d && Rn(i - 2).n <= 2) continue;   // not the first
      let j = i; while (j + 2 - i < n && Rn(j + 2).d === a.d && Rn(j + 2).n <= 2 && Rn(j + 3).d === b.d && Rn(j + 3).n <= 2) j += 2;
      // steps whose corners are square (the set draws a right angle)
      let sq = 0, best = 0, all1 = true; for (let k = i; k <= j + 1; k++) { if (!C(k)) { sq++; best = Math.max(best, sq); } else sq = 0; if (Rn(k).n !== 1) all1 = false; }
      const steps = (j - i) / 2 + 1;
      if (steps >= 3 && best >= 4 && inside(vx[(i + 1) % n] - (vx[(i + 1) % n] === w ? 1 : 0), vy[(i + 1) % n] - (vy[(i + 1) % n] === h ? 1 : 0))) {
        st.stairs++; if (all1) st.stairs1++; else st.stairs2++;
        if (st.stairsAt.length < 60) st.stairsAt.push([vx[(i + 1) % n], vy[(i + 1) % n], steps, a.d + b.d]);
      }
    }
    // jogs: one-column offsets between vertical runs of 2+, square
    for (let i = 0; i < n; i++) {
      const r = Rn(i); if (!H_(r.d) || r.n !== 1) continue;
      const p = Rn(i - 1), s = Rn(i + 1); if (H_(p.d) || p.d !== s.d || p.n < 2 || s.n < 2) continue;
      if (C(i - 1) && C(i)) continue;
      if (!inside(vx[i] - 1, vy[i])) continue;
      st.jogs++; if (st.jogsAt.length < 60) st.jogsAt.push([vx[i], vy[i]]);
    }
    // distances
    if (iso) {
      const add = (o, px, py) => { const t = (px >= 0 && py >= 0 && inside(Math.min(w - 1, Math.floor(px)), Math.min(h - 1, Math.floor(py)))); if (!t) return; const d = isoDist(iso, px, py); o.n++; o.sum += d; if (d > o.max) o.max = d; if (d >= CAP) o.far++; };
      // points every quarter tile along the line; along each run, from its start (or, after a cut corner, half a tile in) to its end (or half a tile short of a cut corner); across a cut corner the straight
      // segment between the two half-tile points. The tile outline is the same with no corner cut.
      const line = (o, Cf) => { for (let i = 0; i < n; i++) {
        const r = runs[i], cs = Cf(i - 1), ce = Cf(i), a0 = cs ? 0.5 : 0, a1 = r.n - (ce ? 0.5 : 0);
        for (let t = a0; t < a1 - 1e-9; t += 0.25) add(o, vx[i] + DX[r.d] * (t + 0.125), vy[i] + DY[r.d] * (t + 0.125));
        if (ce) {   // the chamfer from half a tile before the corner to half a tile after it (a diagonal is a chain of these)
          const nx = Rn(i + 1).d, ex = vx[i + 1], ey = vy[i + 1], p0 = [ex - DX[r.d] * 0.5, ey - DY[r.d] * 0.5], p1 = [ex + DX[nx] * 0.5, ey + DY[nx] * 0.5];
          for (let t = 0.125; t < 1; t += 0.25) add(o, p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t);
        }
      } };
      line(st.tile, () => 0); line(st.drawn, C);
    }
  }
  return st;
}

// the drawn line as segments [x0, y0, x1, y1, long] in tiles (long: part of a straight run of 6 or more), for the overviews
export function drawnSegments(R, w, h, model) {
  const segs = [];
  for (const lp of traceLoops(R, w, h)) {
    const { runs } = lp, n = runs.length; if (n < 4) continue;
    const vx = [lp.x], vy = [lp.y]; for (let i = 0; i < n; i++) { vx.push(vx[i] + DX[runs[i].d] * runs[i].n); vy.push(vy[i] + DY[runs[i].d] * runs[i].n); }
    const cut = cutCorners(runs, model), C = (i) => cut[((i % n) + n) % n], Rn = (i) => runs[((i % n) + n) % n];
    for (let i = 0; i < n; i++) {
      const r = runs[i], a0 = C(i - 1) ? 0.5 : 0, a1 = r.n - (C(i) ? 0.5 : 0), long = r.n >= 6;
      if (a1 > a0) segs.push([vx[i] + DX[r.d] * a0, vy[i] + DY[r.d] * a0, vx[i] + DX[r.d] * a1, vy[i] + DY[r.d] * a1, long]);
      if (C(i)) { const nx = Rn(i + 1).d; segs.push([vx[i + 1] - DX[r.d] * 0.5, vy[i + 1] - DY[r.d] * 0.5, vx[i + 1] + DX[nx] * 0.5, vy[i + 1] + DY[nx] * 0.5, false]); }
    }
  }
  return segs;
}

// a summary row of a measure
export function summary(st) {
  const f = (a) => ({ n: a.length, ge5: a.filter((v) => v >= 5).length, ge6: a.filter((v) => v >= 6).length, over10: a.filter((v) => v > 10).length, max: Math.max(0, ...a), mean: +(a.reduce((s, v) => s + v, 0) / Math.max(1, a.length)).toFixed(2) });
  return { south: f(st.runs.south), rim: f(st.runs.rim), side: f(st.runs.side), noise5: st.noise5, rule5: st.rule5, stairs: st.stairs, stairs1: st.stairs1, stairs2: st.stairs2, jogs: st.jogs,
    tileDist: { mean: +(st.tile.sum / Math.max(1, st.tile.n)).toFixed(3), max: +st.tile.max.toFixed(2), far: st.tile.far, n: st.tile.n },
    drawnDist: { mean: +(st.drawn.sum / Math.max(1, st.drawn.n)).toFixed(3), max: +st.drawn.max.toFixed(2), far: st.drawn.far, n: st.drawn.n } };
}
