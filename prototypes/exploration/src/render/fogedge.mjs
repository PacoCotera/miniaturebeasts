// The unexplored dark's soft, irregular edge (owner #178 / #141: "water is so blocky, very long straight shores"; the dark's cell edges were straight lines). The art desk's signed pieces
// (mibi-art 47ecb9334 the map set, 7f74dde9b the look-around's runs; art/props/fog-edge-*.png) are laid on the SEEN side of every boundary between a seen cell and an unexplored one:
//   run    a strip along a side, dark on its west side, 3 cells long (map: 26 x 78; look-around: 24 x 72), three variants a, b, c, laid back to back so the depth wanders;
//   outer  a cell corner where the dark wraps two sides (rounded), 26 x 26, dark at its north-west;
//   inner  a cell corner whose two sides are seen and only the diagonal is dark (a quarter bay), 26 x 26, dark at its north-west.
// Pure: plain data in, a list of placements out; the map's painting (src/render/landpaint.mjs) and the look-around (index.html) draw them. Nothing here is drawn art: every pixel is a signed piece's.

// files: { name: { width, height, data (RGBA) } } -> { map: { runs: [3 pieces], outer, inner }, peek: { runs: [3 pieces] } } or null when a file is missing.
// A piece is { w, h, m } with m a Uint8Array: 0 clear, 1 the ink colour, 2 the night colour (the only two colours the pieces hold).
const piece = f => { if (!f) return null; const m = new Uint8Array(f.width * f.height); for (let i = 0; i < m.length; i++) { const o = i * 4; if (f.data[o + 3] < 128) continue; m[i] = f.data[o] > 33 ? 2 : 1; } return { w: f.width, h: f.height, m }; };
export function fogEdgeRead(files) {
  const get = n => piece(files['fog-edge-' + n]), runs = s => ['a', 'b', 'c'].map(k => get(`run-${k}-${s}`)), out = { map: { runs: runs('map'), outer: get('outer-map'), inner: get('inner-map') }, peek: { runs: runs('peek') } };
  return [...out.map.runs, ...out.peek.runs, out.map.outer, out.map.inner].every(Boolean) ? out : null;
}
export const FOG_EDGE_FILES = ['run-a-map', 'run-b-map', 'run-c-map', 'outer-map', 'inner-map', 'run-a-peek', 'run-b-peek', 'run-c-peek'].map(n => 'fog-edge-' + n);

const ORIENT = new WeakMap();   // piece -> { key: oriented copy }
// A piece turned so its dark lies on a side: runs are drawn with the dark on the west, the corners with it at the north-west.
//   run:    W as drawn (w = depth, h = length); E mirrored; N and S turned (w = length, h = depth).
//   corner: NW as drawn; NE mirrored across x; SW across y; SE both.
function oriented(p, how) {
  let o = ORIENT.get(p); if (!o) { o = {}; ORIENT.set(p, o); }
  if (o[how]) return o[how];
  const { w, h, m } = p, turn = how === 'N' || how === 'S', W = turn ? h : w, H = turn ? w : h, r = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let sx, sy;
    if (how === 'W' || how === 'NW') { sx = x; sy = y; } else if (how === 'E' || how === 'NE') { sx = w - 1 - x; sy = y; } else if (how === 'SW') { sx = x; sy = h - 1 - y; } else if (how === 'SE') { sx = w - 1 - x; sy = h - 1 - y; }
    else if (how === 'N') { sx = y; sy = x; } else { sx = w - 1 - y; sy = x; }   // S
    r[y * W + x] = m[sy * w + sx];
  }
  return (o[how] = { w: W, h: H, m: r });
}
const H3 = (a, b, c) => { let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return (h ^ (h >>> 16)) >>> 0; };
const SIDE_N = { N: 0, E: 1, S: 2, W: 3 }, D = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };

// o: { dark(i, j) -> true where the cell is unexplored (only those cells are asked: the cells of the range), I0, I1, J0, J1 (the range of cells, inclusive; a cell outside it is not a seen cell and gives no edge),
//      csx, csy (a cell's size in px), runs (the three run pieces), outer, inner }
// Returns [{ x, y, w, h, cw, ch, m }]: m is the oriented piece (w x h), cw x ch of it is laid, its top-left at (x, y) in the pixels where cell (0, 0) has its top-left corner.
export function fogEdges(o) {
  const { dark, I0, I1, J0, J1, csx, csy, runs, outer, inner } = o, Z = outer.w, out = [];
  const inR = (i, j) => i >= I0 && i <= I1 && j >= J0 && j <= J1;
  const seen = (i, j) => inR(i, j) && !dark(i, j);
  const exp = (i, j, s) => seen(i, j) && inR(i + D[s][0], j + D[s][1]) && dark(i + D[s][0], j + D[s][1]);
  // corners: the dark wraps two sides (outer), or only the diagonal is dark (inner)
  for (let j = J0; j <= J1; j++) for (let i = I0; i <= I1; i++) {
    if (!seen(i, j)) continue;
    for (const [a, b, how] of [['N', 'W', 'NW'], ['N', 'E', 'NE'], ['S', 'W', 'SW'], ['S', 'E', 'SE']]) {
      const x = how.endsWith('W') ? i * csx : (i + 1) * csx - Z, y = how.startsWith('N') ? j * csy : (j + 1) * csy - Z;
      if (exp(i, j, a) && exp(i, j, b)) { const p = oriented(outer, how); out.push({ x, y, w: p.w, h: p.h, cw: p.w, ch: p.h, m: p.m, how }); }
      else if (!exp(i, j, a) && !exp(i, j, b)) { const di = D[b][0], dj = D[a][1]; if (inR(i + di, j + dj) && dark(i + di, j + dj)) { const p = oriented(inner, how); out.push({ x, y, w: p.w, h: p.h, cw: p.w, ch: p.h, m: p.m, how: 'in' }); } }
    }
  }
  // runs: along each stretch of cells with the same side facing the dark, back to back from the stretch's start, the first and last Z px left to the corners where the dark wraps on
  const lay = (s, horizontal, fixed, a, b) => {   // fixed: the row (N, S) or column (W, E); a..b: the stretch's cells along it
    const cs = horizontal ? csx : csy, endA = horizontal ? 'W' : 'N', endB = horizontal ? 'E' : 'S';
    const ci = horizontal ? (k => [k, fixed]) : (k => [fixed, k]);
    const zA = exp(...ci(a), endA) ? Z : 0, zB = exp(...ci(b), endB) ? Z : 0, start = a * cs + zA, length = (b - a + 1) * cs - zA - zB;
    for (let pos = 0, r = 0; pos < length; r++) {
      const base = runs[H3(SIDE_N[s] + 1, a * 64 + fixed, r) % runs.length], p = oriented(base, s), len = horizontal ? p.w : p.h, take = Math.min(len, length - pos);
      if (horizontal) out.push({ x: start + pos, y: s === 'N' ? fixed * csy : (fixed + 1) * csy - p.h, w: p.w, h: p.h, cw: take, ch: p.h, m: p.m, how: s });
      else out.push({ x: s === 'W' ? fixed * csx : (fixed + 1) * csx - p.w, y: start + pos, w: p.w, h: p.h, cw: p.w, ch: take, m: p.m, how: s });
      pos += take;
    }
  };
  for (const s of ['N', 'S']) for (let j = J0; j <= J1; j++) for (let i = I0; i <= I1; i++) { if (!exp(i, j, s) || exp(i - 1, j, s)) continue; let b = i; while (exp(b + 1, j, s)) b++; lay(s, true, j, i, b); }
  for (const s of ['W', 'E']) for (let i = I0; i <= I1; i++) for (let j = J0; j <= J1; j++) { if (!exp(i, j, s) || exp(i, j - 1, s)) continue; let b = j; while (exp(i, b + 1, s)) b++; lay(s, false, i, j, b); }
  return out;
}
