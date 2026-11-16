// Generator 7, the realm's big shapes (world-f3a-realm-shape-1): water wears the height, rain comes with the wind, ranges are spines.
// Pure, whole realm, no clock or Math.random; the same file runs in Node and on the small engine. It reads the height and humidity fields of world.mjs and returns new arrays.
//   erodeHeight   a light stream-power pass (the published method of Braun and Willett 2013, written from its equation): every cell moves toward the cell its water runs to, more where more water gathers
//   windRain      moisture is picked up over water and dropped where the ground rises, wind from the west (the idea of a rainfall pass over a height map, in our own form)
//   spineRanges   the crest belts of the height are drawn out along their long axis, with spurs falling away from the spine
import FlatQueue from 'flatqueue';

const NB4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// Priority-Flood from the rim: the filled height Z, the receiver of each cell (lowest filled 4-neighbour, -1 on the rim and in flats) and the order cells leave the queue (outlets first)
export function drainage(h, W, H) {
  const N = W * H, Z = new Float64Array(N), done = new Uint8Array(N), order = new Int32Array(N), q = new FlatQueue(); let k = 0;
  for (let c = 0; c < N; c++) { const x = c % W, y = (c / W) | 0; if (x === 0 || y === 0 || x === W - 1 || y === H - 1) { Z[c] = h[c]; done[c] = 1; q.push(c, h[c]); } }
  while (q.length) { const c = q.pop(), x = c % W, y = (c / W) | 0; order[k++] = c;
    for (const [dx, dy] of NB4) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const m = Y * W + X; if (done[m]) continue; done[m] = 1; Z[m] = Math.max(h[m], Z[c] + 1e-6); q.push(m, Z[m]); } }
  const down = new Int32Array(N).fill(-1);
  for (let c = 0; c < N; c++) { const x = c % W, y = (c / W) | 0; if (x === 0 || y === 0 || x === W - 1 || y === H - 1) continue;
    let b = -1; for (const [dx, dy] of NB4) { const m = (y + dy) * W + x + dx; if (Z[m] < Z[c] && (b < 0 || Z[m] < Z[b])) b = m; } down[c] = b; }
  return { Z, down, order };
}
export function accumulate(order, down, wet) {
  const A = new Float64Array(order.length);
  for (let k = order.length - 1; k >= 0; k--) { const c = order[k]; A[c] += wet[c]; if (down[c] >= 0) A[down[c]] += A[c]; }
  return A;
}

// iters rounds of: flow on the current height, then each cell moves toward its receiver by f = K * sqrt(flow) (implicit, outlets first); the flow is read again every `every` rounds
export const ERODE = { ITERS: 20, K: 0.02, EVERY: 5 };
export function erodeHeight(E, wet, W, H, iters = ERODE.ITERS, K = ERODE.K, every = ERODE.EVERY) {
  const h = Float64Array.from(E); let Z, down, order, A;
  for (let it = 0; it < iters; it++) {
    if (it % every === 0) { ({ Z, down, order } = drainage(h, W, H)); A = accumulate(order, down, wet); }
    for (let k = 0; k < order.length; k++) { const c = order[k], r = down[c]; if (r < 0) continue;
      const f = K * Math.sqrt(A[c]), hr = Math.max(h[r], Z[r] - 1e-6);
      if (h[c] > hr) h[c] = (h[c] + f * hr) / (1 + f); }
  }
  // the pass smooths the slopes as well as cutting the valleys: the worn height is stretched about its mean to the spread of the height it came from, so the crests stand as high above the raising height as before
  let m0 = 0, m1 = 0; for (let c = 0; c < h.length; c++) { m0 += E[c]; m1 += h[c]; } m0 /= h.length; m1 /= h.length;
  let v0 = 0, v1 = 0; for (let c = 0; c < h.length; c++) { v0 += (E[c] - m0) * (E[c] - m0); v1 += (h[c] - m1) * (h[c] - m1); }
  const k = Math.sqrt(v0 / (v1 || 1)); for (let c = 0; c < h.length; c++) h[c] = m0 + (h[c] - m1) * k;
  return h;
}

// wind from the west: each cell takes the mean humidity of its three upwind cells; water adds moisture; air rising over high ground rains out what it cannot hold
export const WIND = { RAIN: 0.9, SHADOW: 0.25, CAP: 1.3, EVAP: 0.5, MIX: 0.5, GAIN: 1.35, WATER_ACC: 100, WATER_DEPTH: 0.2 };
export function windRain(E, water, W, H) {
  const hum = new Float64Array(W * H), rain = new Float64Array(W * H);
  for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) {
    const c = y * W + x; let s = 0, n = 0;
    if (x === 0) { s = 1; n = 1; } else for (let dy = -1; dy <= 1; dy++) { const Y = y + dy; if (Y >= 0 && Y < H) { s += hum[Y * W + x - 1]; n++; } }
    let h = s / n, r = WIND.RAIN * h * 0.2;
    if (water[c]) h = Math.min(1, h + WIND.EVAP * 0.2);
    const cap = WIND.CAP - E[c];
    if (h > cap) { const o = WIND.SHADOW * (h - cap); r += WIND.RAIN * o; h -= o; }
    hum[c] = h; rain[c] = r;
  }
  return rain;
}
// the wind's humidity grid: the sweep's rain, set to the mean and spread of the noise humidity it joins, so the mix changes where the water falls and not how much there is
export function windGrid(E, M0, W, H) {
  const N = W * H, { Z, down, order } = drainage(E, W, H), A = accumulate(order, down, Float64Array.from(M0, v => 0.4 + v)), water = new Uint8Array(N);
  for (let c = 0; c < N; c++) if (A[c] >= WIND.WATER_ACC || Z[c] - E[c] >= WIND.WATER_DEPTH) water[c] = 1;
  const rain = windRain(E, water, W, H);
  let mr = 0, mm = 0; for (let c = 0; c < N; c++) { mr += rain[c]; mm += M0[c]; } mr /= N; mm /= N;
  let sr = 0, sm = 0; for (let c = 0; c < N; c++) { sr += (rain[c] - mr) * (rain[c] - mr); sm += (M0[c] - mm) * (M0[c] - mm); } sr = Math.sqrt(sr / N) || 1; sm = Math.sqrt(sm / N);
  const g = new Float64Array(N); for (let c = 0; c < N; c++) g[c] = clamp(mm + (rain[c] - mr) * sm / sr, 0, 1);
  return g;
}
// the grid read at a world position (cell units; a cell's centre is its integer coordinate), bilinear
export function gridAt(g, W, H, X, Y) {
  const x = clamp(X, 0, W - 1), y = clamp(Y, 0, H - 1), x0 = Math.min(Math.floor(x), W - 2), y0 = Math.min(Math.floor(y), H - 2), fx = x - x0, fy = y - y0, c = y0 * W + x0;
  return (g[c] * (1 - fx) + g[c + 1] * fx) * (1 - fy) + (g[c + W] * (1 - fx) + g[c + W + 1] * fx) * fy;
}

// ---- ranges as spines with spurs ----
// A range is a 4-connected group of cells RANGE_LIFT or more over the raising height (the same belts the features read). Each belt is drawn in to a spine (narrower for its area, LENGTHEN times longer) and gets spurs:
// a ridge term (the height lifted to a spine line that falls away from the crest) is laid with max(), so the noise's own crest stays and only the line it follows is lengthened.
export const SPINE = { LIFT: 0.32, MIN: 12, RATIO: 7, LENGTHEN: 2.8, FALL: 0.05, ACROSS: 0.25, HALF: 0.8, SPURS: 2, SPUR_LEN: 3.5 };
export function spineRanges(E, e0, avoid, W, H) {
  const N = W * H, out = Float64Array.from(E), seen = new Uint8Array(N);
  for (let s = 0; s < N; s++) {
    if (seen[s] || E[s] - e0[s] < SPINE.LIFT || avoid[s]) continue;
    const cells = [s]; seen[s] = 1;
    for (let i = 0; i < cells.length; i++) { const c = cells[i], x = c % W, y = (c / W) | 0;
      for (const [dx, dy] of NB4) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const m = Y * W + X; if (!seen[m] && E[m] - e0[m] >= SPINE.LIFT && !avoid[m]) { seen[m] = 1; cells.push(m); } } }
    if (cells.length < SPINE.MIN) continue;
    // centre and principal axis of the cells
    let mx = 0, my = 0, top = -1e9; for (const c of cells) { mx += c % W; my += (c / W) | 0; top = Math.max(top, E[c]); } mx /= cells.length; my /= cells.length;
    let sxx = 0, syy = 0, sxy = 0; for (const c of cells) { const dx = (c % W) - mx, dy = ((c / W) | 0) - my; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
    // the long axis of the cells: the eigenvector of the larger eigenvalue by the closed form, with only + - * / and sqrt (the engines' sin, cos and atan2 differ in the last digit)
    const dq = Math.sqrt(((sxx - syy) / 2) * ((sxx - syy) / 2) + sxy * sxy), l1 = (sxx + syy) / 2 + dq, vx = l1 - syy, vy = sxy, vn = Math.sqrt(vx * vx + vy * vy), ax = vn < 1e-9 ? 1 : vx / vn, ay = vn < 1e-9 ? 0 : vy / vn;
    let t0 = 0, t1 = 0; for (const c of cells) { const t = ((c % W) - mx) * ax + (((c / W) | 0) - my) * ay; t0 = Math.min(t0, t); t1 = Math.max(t1, t); }
    const half = Math.max((t1 - t0) / 2 * SPINE.LENGTHEN, 4), tc = (t0 + t1) / 2, cx = mx + ax * tc, cy = my + ay * tc, hw = Math.max(1.0, Math.sqrt(cells.length / SPINE.RATIO) / 2);   // the belt's half-width for its area at the wanted long-to-short ratio
    // a ridge line from (px, py) along (dx, dy) for len cells: the crest `peak` at the start falls to the lift floor (just over the range line) at the far end; across it the ground falls away steeply past SPINE.HALF
    const floor = e0[Math.round(cy) * W + Math.round(cx)] + SPINE.LIFT + 0.03;
    const lay = (px, py, dx, dy, len, peak, both) => {
      for (let t = both ? -len : 0; t <= len; t += 0.5) for (let o = -SPINE.HALF - 2; o <= SPINE.HALF + 2; o += 0.5) {
        const X = Math.round(px + dx * t - dy * o), Y = Math.round(py + dy * t + dx * o); if (X < 1 || Y < 1 || X >= W - 1 || Y >= H - 1) continue;
        const c = Y * W + X, v = floor + (peak - floor) * (1 - Math.abs(t) / len) - SPINE.ACROSS * Math.max(0, Math.abs(o) - SPINE.HALF); if (v > out[c]) out[c] = v; } };
    // the belt is drawn in: its cells further than hw from the spine line fall to just under the range line (they stay raised land, they are no longer crest)
    for (const c of cells) { const p = Math.abs(-((c % W) - cx) * ay + (((c / W) | 0) - cy) * ax); if (p > hw) { const v = floor - 0.15 - SPINE.FALL * (p - hw); if (v < out[c]) out[c] = v; } }
    lay(cx, cy, ax, ay, half, top, true);
    // spurs: short branches off the spine at a slant, falling away from the crest
    for (let k = 0; k < SPINE.SPURS; k++) {
      const f = (k + 0.5) / SPINE.SPURS * 2 - 1, side = k % 2 ? 1 : -1, bx = cx + ax * half * f * 0.5, by = cy + ay * half * f * 0.5;
      const ca = 0.5403023058681398, sa = side * 0.8414709848078965;   // a spur leaves the spine at one radian
      lay(bx, by, ax * ca - ay * sa, ax * sa + ay * ca, SPINE.SPUR_LEN, floor + (top - floor) * (1 - Math.abs(f)) * 0.8, false);
    }
  }
  return out;
}
