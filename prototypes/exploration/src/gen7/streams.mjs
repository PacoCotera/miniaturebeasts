// Generator 7, F6: streams, fords and bridges in the place (world-topdown-spec-1 2.6, 4 and 8; mapgen-study-1 R5, R12, R16). The realm's stream features (features.mjs) are lists of cells; here each cell's
// stretch is drawn like the trail: port to port through the cell's bend point, by the same A*, on the window's tiles. Pure: it reads the realm and writes into the window's arrays it is given.
//   flow classes   the width of a stream, 2, 3 or 4 tiles, by its flow's terciles over the realm's streams (R5); never narrower downstream, so the main stem of a joined pair is the wider
//   pieces         per world cell, each stretch of a stream: its port in and out (side and offset along the edge, the realm's own port), width at each, its bend point
//   drawStream     the route in the cell (open ground first, then nearer the walls, then a straight run), painted as water with a square brush that widens along the run; R16: the A* wanders
//   fords          a ford is 2-3 tiles of shallow, walkable ground across the stream: where the trail crosses it (paint in place.mjs), and one more in the middle of every stretch that runs through a place
//   bridges        the realm's bridges: the water tiles of the bank-to-bank rows (the bank's port row and the one below) become walkable bridge tiles, the water under it blocking elsewhere
import { hash } from '../logic/world.mjs';
import { RW, CW, CH } from './world.mjs';
import { portAt, route } from './region.mjs';

export const G = { DEEP: 1, WATER: 2, GRASS: 6, CLIFF: 8, THICKET: 9, FORD: 20, BRIDGE: 21 };
export const WANDER = 2.2, WANDER_SLOPE = 0.15;   // the A* wander of a stream on open ground (R16: drawn length over straight distance 1.1-1.4 on flat ground)

// the width classes: the flow terciles of the realm's streams (R5). The cache on the realm is plain data ({ t1, t2 }): the realm crosses to the places worker as it is (structured clone), so nothing
// on it may be a function; the width of a cell is flowWidth, a pure function of the realm and the terciles.
export function flowClasses(re) {
  if (re.flowClasses) return re.flowClasses;
  const acc = re.acc, a = [];
  for (const f of re.features || []) if (f.kind === 'stream') for (const c of f.cells) a.push(acc[c]);
  a.sort((p, q) => p - q);
  const t1 = a.length ? a[Math.floor(a.length / 3)] : 0, t2 = a.length ? a[Math.floor(2 * a.length / 3)] : 0;
  return (re.flowClasses = { t1, t2 });
}
export const flowWidth = (re, fc, c) => (re.acc[c] < fc.t1 ? 2 : re.acc[c] < fc.t2 ? 3 : 4);

// the port of the edge between two world cells as seen from `cur`: the side of cur it lies on and its offset along the edge (the realm's port, the same tile row or column from both places)
function portOf(seed, cur, o) {
  if (o[1] === cur[1]) { const left = Math.min(cur[0], o[0]); return { side: o[0] > cur[0] ? 'e' : 'w', off: portAt(seed, left, cur[1], false) }; }
  const top = Math.min(cur[1], o[1]); return { side: o[1] > cur[1] ? 's' : 'n', off: portAt(seed, cur[0], top, true) };
}
const bendOf = (seed, cx, cy) => { const h = hash(seed, 'gen7', 'sbend', cx, cy); return [12 + (h % 9) - 4, 14 + ((h >>> 8) % 9) - 4]; };   // the cell-local bend point (the sector's own)

// per seed: the pieces of every stream by world cell: { fid, in: {side, off} | null, out, wIn, wOut, bend: [x, y], mouth, fromRaised, source, drop }
export function streamPieces(S) {
  if (S.streamPieces) return S.streamPieces;
  const by = new Map(), re = S.re, fc = { of: c => flowWidth(re, flowClasses(re), c) }, seed = S.seed, xy = c => [c % RW, (c / RW) | 0];
  for (const f of re.features || []) {
    if (f.kind !== 'stream') continue;
    const seen = f.links.seen || 0, m = f.links.mouth, chain = f.cells.slice(Math.max(0, seen - 1)), hasMouth = m && m.c >= 0 && m.c !== f.cells[f.cells.length - 1];
    if (hasMouth) chain.push(m.c);
    for (let i = seen > 0 ? 1 : 0; i < chain.length; i++) {
      const c = chain[i], cur = xy(c), mouthCell = hasMouth && i === chain.length - 1;
      const wc = mouthCell ? fc.of(chain[i - 1]) : fc.of(c);
      const p = { fid: f.id, c, in: i > 0 ? portOf(seed, cur, xy(chain[i - 1])) : null, out: i + 1 < chain.length ? portOf(seed, cur, xy(chain[i + 1])) : null,
        wIn: i > 0 ? fc.of(chain[i - 1]) : wc, wOut: wc, bend: bendOf(seed, cur[0], cur[1]), mouth: mouthCell, fromRaised: i === 1 && seen > 0, source: i === 0, drop: f.links.drop };
      if (!by.has(c)) by.set(c, []); by.get(c).push(p);
    }
  }
  return (S.streamPieces = by);
}

// a name for the world edge a port lies on, the same from both places (the checks list a port by it)
export const edgeId = (cx, cy, side) => side === 'e' ? 'v' + (cx + 1) + ',' + cy : side === 'w' ? 'v' + cx + ',' + cy : side === 's' ? 'h' + cx + ',' + (cy + 1) : 'h' + cx + ',' + cy;
const brushA = w => (w - 1) >> 1, brushB = w => w >> 1;
// the cell-local tile where a port's brush is centred: its first row or column of the edge plus the brush's reach
const startTile = (pt, w) => { const a = brushA(w), o = pt.off + a; return pt.side === 'w' ? [0, o] : pt.side === 'e' ? [CW - 1, o] : pt.side === 'n' ? [o, 0] : [o, CH - 1]; };

// Draw one piece into the window: t (terrain, W x H), raised (1 on raised land), mask (1 on the water a stream drew), over the cell at window offset (ox, oy). `nP(gx, gy)` the trail's wobble field.
// Returns the route's window tile indices (for the ford), or null when nothing was drawn.
// falls: the foot's tile [x, y] cell-local (y may be negative: the lip lies in the cell above), where the water starts instead of at its port in the edge
export function drawStream(t, raised, mask, W, H, ox, oy, gx0, gy0, piece, nP, falls, up = 0) {
  const pts = [];   // the line's way points, in the route's grid: the cell's CW columns and its CH rows under `up` rows above it (a falls' foot may lie in the cell above)
  if (falls) pts.push(falls); else if (piece.in) pts.push(startTile(piece.in, piece.wIn));
  pts.push(piece.bend);
  if (piece.out) pts.push(startTile(piece.out, piece.wOut));
  if (pts.length < 2) return null;
  const GH = CH + up, g = pts.map(([x, y]) => [x, y + up]), wmax = Math.max(piece.wIn, piece.wOut), rn = (x, y) => ((oy - up + y) * W + ox + x);
  const near = (x, y, m) => { for (let dy = -m; dy <= m; dy++) for (let dx = -m; dx <= m; dx++) { const X = ox + x + dx, Y = oy - up + y + dy; if (X >= 0 && Y >= 0 && X < W && Y < H && raised[Y * W + X]) return true; } return false; };
  const wander = near(piece.bend[0], piece.bend[1] + up, 8) ? WANDER_SLOPE : WANDER;   // R16: on a slope (raised land within 8 tiles of the bend) the stream runs straighter
  let all = null;
  for (const margin of [(wmax >> 1) + 2, 1, 0]) {
    all = [];
    let ok = true;
    for (let s = 0; s + 1 < g.length && ok; s++) {
      const a = g[s], b = g[s + 1], from = a[1] * CW + a[0], to = b[1] * CW + b[0];
      const r = route(CW, GH, from, to, (c, n) => { const x = n % CW, y = (n / CW) | 0; if (n !== to && near(x, y, margin)) return null; const k = rn(x, y); return 1 + wander * (0.5 + 0.5 * nP(gx0 + ox + x, gy0 + oy - up + y)) + (t[k] === G.THICKET ? 2 : 0); });
      if (!r) ok = false; else all.push(...(s ? r.slice(1) : r));
    }
    if (ok) break;
    all = null;
  }
  if (!all) {   // a straight run between the way points (the ports must still meet across the edge)
    all = [];
    for (let s = 0; s + 1 < g.length; s++) { let [x, y] = g[s]; const [bx, by] = g[s + 1]; if (!s) all.push(y * CW + x); while (x !== bx || y !== by) { if (x !== bx && (y === by || Math.abs(bx - x) >= Math.abs(by - y))) x += Math.sign(bx - x); else y += Math.sign(by - y); all.push(y * CW + x); } }
  }
  const tiles = [], n = all.length;
  for (let i = 0; i < n; i++) {
    const x = all[i] % CW, y = (all[i] / CW) | 0, w = Math.round(piece.wIn + (piece.wOut - piece.wIn) * (n > 1 ? i / (n - 1) : 1)), a = brushA(w), b = brushB(w);
    // a mouth ends where the stream meets the water it joins
    if (piece.mouth && i > 0) { const k = rn(x, y); if ((t[k] === G.WATER || t[k] === G.DEEP) && !mask[k]) break; }
    for (let dy = -a; dy <= b; dy++) for (let dx = -a; dx <= b; dx++) {
      const X = ox + x + dx, Y = oy - up + y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
      const k = Y * W + X; if (raised[k] || t[k] === G.CLIFF || t[k] === G.DEEP) { if (raised[k] || t[k] === G.CLIFF) { if (i < 3 && piece.in && !falls) tiles.rIn = true; if (i >= n - 3 && piece.out) tiles.rOut = true; } continue; }
      t[k] = G.WATER; mask[k] = 1;
    }
    tiles.push(rn(x, y));
  }
  tiles.slope = wander === WANDER_SLOPE;
  return tiles;
}

// The falls site of a stream that comes out of raised land through a south face (R12): the 2 face columns nearest the stream's port, in a straight run of the face (the lip on one row, raised land above it and low
// ground below) 4 or more tiles long, with 2 or more tiles of the run each side of the pair, and clear of every way up. The search reads the window's raised land from 8 rows above the cell to 12 rows into it.
// Returns { x, lip, run, held } (window tile of the pair's left column and of the lip's row; `held`: the run is shorter than 6 so the pair has no 2 tiles each side) or null when no straight run of 4 exists.
export function fallsSite(raised, W, H, ox, oy, portCol, wayups, gx0, gy0) {
  const isLip = (x, y) => x >= 0 && y >= 1 && x < W && y + 1 < H && raised[y * W + x] === 1 && raised[y * W + x - W] === 1 && raised[y * W + x + W] === 0;
  const nearWayup = (x, y) => wayups.some(a => x + 1 >= a.x - gx0 - 2 && x <= a.x - gx0 + a.w + 1 && Math.abs(y - (a.y - gy0)) <= 4);
  let best = null;
  for (let y = Math.max(1, oy - 8); y < Math.min(H - 2, oy + 12); y++) {
    for (let x = ox + 2; x < ox + CW - 2; x++) {
      if (!isLip(x, y) || isLip(x - 1, y)) continue;
      let x1 = x; while (x1 + 1 < ox + CW - 1 && isLip(x1 + 1, y)) x1++;
      const run = x1 - x + 1;   // tier 0: a run of 6+ with 2 tiles each side of the pair; tier 1: a run of 4-5 (the pair in its middle); tier 2: the nearest 2 face tiles (a run of 2-3), listed
      const tier = run >= 6 ? 0 : run >= 4 ? 1 : run >= 2 ? 2 : -1;
      if (tier >= 0) {
        const lo = tier ? x + ((run - 2) >> 1) : x + 2, hi = tier ? lo : x1 - 3;
        for (let px = lo; px <= hi; px++) { if (nearWayup(px, y)) continue; const d = Math.abs(px + 1 - portCol) + 0.2 * Math.abs(y - oy) + tier * 40; if (!best || d < best.d) best = { x: px, lip: y, run, held: tier > 0, tier, d }; }
      }
      x = x1;
    }
  }
  return best;
}

// the bridges of the realm: [{ cells, axis, ends }] with the bank port's row (axis x) or column (axis y) the trail meets the span at
export function bridgeList(S, portOffFn) {
  if (S.bridgeList) return S.bridgeList;
  const out = [], xy = c => [c % RW, (c / RW) | 0];
  for (const f of S.re.features || []) {
    if (f.kind !== 'bridge') continue;
    const e0 = xy(f.links.ends[0]), c0 = xy(f.cells[0]);
    out.push({ cells: f.cells.map(xy), axis: f.links.axis, off: portOffFn(e0, c0) });
  }
  return (S.bridgeList = out);
}

// lay one bridge on the window: from the span's middle tile along the bank row (and the row after it), every water or deep tile of the unbroken run becomes bridge, 2 wide, both ways to the dry ground
export function layBridge(t, W, H, gx0, gy0, br) {
  const horiz = br.axis === 'x', c0 = br.cells[0], cn = br.cells[br.cells.length - 1], n = [];
  const mid = horiz ? [((c0[0] + cn[0]) / 2 + 0.5) * CW | 0, c0[1] * CH + br.off] : [c0[0] * CW + br.off, ((c0[1] + cn[1]) / 2 + 0.5) * CH | 0];
  for (const row of [0, 1]) {
    const px = horiz ? mid[0] : mid[0] + row, py = horiz ? mid[1] + row : mid[1];
    const at = (d) => { const x = (horiz ? px + d : px) - gx0, y = (horiz ? py : py + d) - gy0; return x < 0 || y < 0 || x >= W || y >= H ? -1 : y * W + x; };
    const wet = k => k >= 0 && (t[k] === G.WATER || t[k] === G.DEEP);
    if (!wet(at(0))) continue;
    for (let d = 0; wet(at(d)); d++) n.push(at(d));
    for (let d = -1; wet(at(d)); d--) n.push(at(d));
  }
  for (const k of n) t[k] = G.BRIDGE;
  return n.length;
}
