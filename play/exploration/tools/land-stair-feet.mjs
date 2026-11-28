// land-reach-1: where each realm stair's way up leads, read on the window of the cell it stands in: the low land under its foot and the raised land over its top, as parts of the window's raster (4-connected,
// capped at 200 tiles); a part under 200 tiles is a pit (the foot) or a mesa (the top). Also how many sites the land's own contour gave (siteOf's natural site) and how many stairs have no way up.
//   node land-stair-feet.mjs <seed> [seed...]
import { realm7 } from '../src/gen7/region.mjs';
import { levelsOf, findWayup, windowLevels, CW, CH } from '../src/gen7/levels.mjs';
for (const seed of process.argv.slice(2).map(Number)) {
  const L = levelsOf(realm7(seed).realm), o = L.rule.window, fr = L.rule.faceRows; let n = 0, nat = 0, none = 0, footPit = 0, topPit = 0; const at = [];
  for (const st of L.stairs.values()) {
    n++; const w = findWayup(L, st.X, st.Y, st.port), s = L.stairs.get(st.X * 1000 + st.Y); if (s.nat) nat++;
    if (!w) { none++; continue; }
    const X = Math.floor(w.x / CW), Y = Math.floor(w.y / CH), Wn = windowLevels(L, X, Y), gx0 = (X - o) * CW, gy0 = (Y - o) * CH, R = Wn.R, W = Wn.W, H = Wn.H;
    const part = (x, y, v) => { const s0 = (y - gy0) * W + x - gx0; if ((R[s0] > 0 ? 1 : 0) !== v) return 0; const seen = new Set([s0]), q = [s0];
      for (let k = 0; k < q.length && q.length < 200; k++) { const i = q[k], a = i % W, b = (i / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = a + dx, yy = b + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) { q.length = 200; break; } const m = yy * W + xx; if (!seen.has(m) && (R[m] > 0 ? 1 : 0) === v) { seen.add(m); q.push(m); } } }
      return q.length; };
    const f = part(w.x, w.y + fr + 2, 0), t = part(w.x, w.y - 2, 1);
    if (f < 200) { footPit++; if (at.length < 12) at.push(`foot ${w.x},${w.y} ${f}${s.nat ? ' nat' : ''}`); }
    if (t < 200) { topPit++; if (at.length < 12) at.push(`top ${w.x},${w.y} ${t}${s.nat ? ' nat' : ''}`); }
  }
  console.log(JSON.stringify({ seed, stairs: n, naturalSites: nat, noWayUp: none, footPit, topPit, at }));
}
