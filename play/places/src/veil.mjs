// The edge veil (art desk, mibi-art 39a625d1f, places/veil/): a cool blue-grey veil over the coast's deep water and along the region sides that face unopened land, 3 tiles deep, dense at the place's edge.
// Pieces are baked pictures; nothing is drawn by code but their placement. The straight run is the signed strip (240 rows, tiling along the edge line; its left VEIL_BAND columns show),
// laid by rows with no blending. Corners and band ends are single signed pictures. Everything stands still.
// A veil never lies inside a walkable place: the page gives only the sides that are blocked (a range side) or water (the coast).
export const VEIL_T = 48, VEIL_BAND = 144, VEIL_PERIOD = 240;
export const VEIL_KINDS = ['strip', 'end', 'outer', 'inner'];
export const veilFileName = (kind, night) => (kind === 'strip' ? 'edge-veil' : `edge-veil-${kind}`) + (night ? '-night' : '-day');

// a side's two ends: the corner at each, and the side across it
const ENDS = { W: [['NW', 'N'], ['SW', 'S']], E: [['NE', 'N'], ['SE', 'S']], N: [['NW', 'W'], ['NE', 'E']], S: [['SW', 'W'], ['SE', 'E']] };
const CORNERS = { NW: ['N', 'W'], NE: ['N', 'E'], SW: ['S', 'W'], SE: ['S', 'E']};

// sides: { N, E, S, W } true where the side is veiled; diag: { NW, NE, SW, SE } true where the land past that corner is veiled too, false where it is not, null where it is not known (the band runs on).
// w, h: the place in tiles. Returns { runs: [{ side, a0, a1 }] (px along the side), pieces: [{ kind: 'outer' | 'inner' | 'end', corner, side?, far? }] }.
export function veilPlan(w, h, sides, diag = {}) {
  const runs = [], pieces = [], corners = new Set();
  for (const side of 'NESW') {
    if (!sides[side]) continue;
    const L = (side === 'W' || side === 'E' ? h : w) * VEIL_T;
    let a0 = 0, a1 = L;
    ENDS[side].forEach(([corner, across], k) => {
      let cut = 0;
      if (sides[across]) { cut = VEIL_BAND; if (!corners.has(corner)) { corners.add(corner); pieces.push({ kind: 'outer', corner }); } }
      else if (diag[corner] === false) { cut = 2 * VEIL_BAND; pieces.push({ kind: 'end', corner, side, far: k === 1 }); }
      if (k === 0) a0 = cut; else a1 = L - cut;
    });
    if (a1 > a0) runs.push({ side, a0, a1 });
  }
  for (const corner of Object.keys(CORNERS)) if (!CORNERS[corner].some((s) => sides[s]) && diag[corner] === true) pieces.push({ kind: 'inner', corner });
  return { runs, pieces };
}

// The veil over WATER on a side the plan does not veil (a lake or a river meeting a place edge that is not the coast or a range side): the same signed pictures along each run of water cells on the
// edge row, never over land. edge: { N: [bool x w], S: [bool x w], W: [bool x h], E: [bool x h] }, true where the edge tile is water (deep, shallow or a river; a ford or bridge is walkable, so not water).
// base: the veilPlan of the coast and range sides; sides: the sides it veiled. Returns a new plan: base plus, per water run, a strip and (where the run meets land at room to spare) an end piece
// at each such end, its taper on the shoreline and its dense end towards the strip. A run too short for two end pieces (under 4 bands) is a strip only, cut square on the shoreline.
// A run that reaches a corner runs on to the place edge; two water runs meeting at a corner share one outer corner piece. { runs: [{ side, a0, a1, endA?, endB? }], pieces: [...] }
export function waterVeilPlan(w, h, edge, sides, base) {
  const runs = base.runs.map((r) => ({ ...r })), pieces = base.pieces.map((p) => ({ ...p })), corners = new Set(pieces.filter((p) => p.kind === 'outer').map((p) => p.corner));
  const wet = (side) => !sides[side] && edge[side] && edge[side].some(Boolean);
  for (const side of 'NESW') {
    if (!wet(side)) continue;
    const e = edge[side], n = e.length;
    for (let i = 0; i < n;) {
      if (!e[i]) { i++; continue; }
      let j = i; while (j < n && e[j]) j++;
      const a0 = i * VEIL_T, a1 = j * VEIL_T, cut = [0, 0], open = [i > 0, j < n];
      ENDS[side].forEach(([corner, across], k) => {
        if (open[k]) return;
        if (sides[across]) cut[k] = VEIL_BAND;
        else if (wet(across)) { cut[k] = VEIL_BAND; if (!corners.has(corner)) { corners.add(corner); pieces.push({ kind: 'outer', corner }); } }
      });
      const room = a1 - a0 - cut[0] - cut[1] >= (open[0] ? 2 * VEIL_BAND : 0) + (open[1] ? 2 * VEIL_BAND : 0);
      const s0 = a0 + cut[0] + (room && open[0] ? 2 * VEIL_BAND : 0), s1 = a1 - cut[1] - (room && open[1] ? 2 * VEIL_BAND : 0);
      if (s1 > s0) runs.push({ side, a0: s0, a1: s1, ...(room && open[0] ? { endA: true } : {}), ...(room && open[1] ? { endB: true } : {}) });
      if (room && open[0]) pieces.push({ kind: 'end', side, far: false, at: a0 });
      if (room && open[1]) pieces.push({ kind: 'end', side, far: true, at: a1 });
      i = j;
    }
  }
  return { runs, pieces };
}

// base (X, Y) of a piece to place pixels, as a canvas matrix [a, b, c, d, e, f]. A corner piece: mirrored toward its corner. A side piece: u across from the edge (X + uOff), v along it (Y + vOff, or L - Y at the far end).
function sideMatrix(side, W, H, L, far, uOff, vOff = 0) {
  const at = (X, Y) => { const u = X + uOff, v = far ? L - Y : Y + vOff; return side === 'W' ? [u, v] : side === 'E' ? [W - u, v] : side === 'N' ? [v, u] : [v, H - u]; };
  const o = at(0, 0), x = at(1, 0), y = at(0, 1);
  return [x[0] - o[0], x[1] - o[1], y[0] - o[0], y[1] - o[1], o[0], o[1]];
}
const cornerMatrix = (corner, W, H) => [corner[1] === 'E' ? -1 : 1, 0, 0, corner[0] === 'S' ? -1 : 1, corner[1] === 'E' ? W : 0, corner[0] === 'S' ? H : 0];

// The map's veil: the same paint at 26 px a cell (78 px across, 130 along), still. sides: { N, E, S, W } veiled; the map is W x H px at (ox, oy) on g. West and east run the full height, north and south between them.
export function paintMapVeil(g, img, ox, oy, W, H, sides, band = 78, period = 130) {
  g.save(); g.imageSmoothingEnabled = false; g.beginPath(); g.rect(ox, oy, W, H); g.clip();
  for (const side of 'NESW') {
    if (!sides[side]) continue;
    if (side === 'N' || side === 'S') continue; // no signed map-scale corner pieces: the north and south bands would end square, so the map shows the west and east bands only
    const horiz = side === 'N' || side === 'S', L = horiz ? W : H, m = sideMatrix(side, W, H, L, false, 0);
    const a0 = horiz && sides.W ? band : 0, a1 = L - (horiz && sides.E ? band : 0);
    g.setTransform(m[0], m[1], m[2], m[3], m[4] + ox, m[5] + oy);
    for (let a = a0; a < a1;) { const r = a % period, len = Math.min(period - r, a1 - a); g.drawImage(img, 0, r, band, len, 0, a, band, len); a += len; }
  }
  g.restore();
}

// Where a run of straight veil meets a painted corner or band end, the run's rows are laid so the cross-section there is the one of the strip that matches the piece's join edge best (the art desk laid
// its signs the same way: the strip slides along its edge to the row whose cross-section meets the piece). Read from the pictures themselves, once per kit: for every one of the 240 rows of the
// strip, the mean alpha difference to the piece's edge; the row with the least. { outerV, outerH, end }: the outer corner's bottom edge (a west or east run), its right edge (a north
// or south run), the band end's bottom edge; each null when a picture cannot be read (no run is shifted then).
function alphaOf(img) {
  try { const g = img.getContext('2d'); return { a: g.getImageData(0, 0, img.width, img.height).data, w: img.width, h: img.height }; } catch (e) { return null; }
}
export function veilJoins(kit) {
  if (kit.joins !== undefined) return kit.joins;
  const S = alphaOf(kit.strip), O = alphaOf(kit.outer), E = alphaOf(kit.end);
  let out = null;
  if (S && O && E && S.w >= VEIL_BAND && S.h === VEIL_PERIOD && O.w === VEIL_BAND && O.h === VEIL_BAND && E.w === 2 * VEIL_BAND && E.h === 2 * VEIL_BAND) {
    const stack = (r, u) => S.a[(r * S.w + u) * 4 + 3] / 255;
    const best = (edge) => { let br = 0, bd = Infinity; for (let r = 0; r < VEIL_PERIOD; r++) { let d = 0; for (let u = 0; u < VEIL_BAND; u++) d += Math.abs(edge(u) - stack(r, u)); if (d < bd) { bd = d; br = r; } } return br; };
    out = {
      outerV: best((u) => O.a[((VEIL_BAND - 1) * VEIL_BAND + u) * 4 + 3] / 255),
      outerH: best((u) => O.a[(u * VEIL_BAND + VEIL_BAND - 1) * 4 + 3] / 255),
      end: best((u) => E.a[((2 * VEIL_BAND - 1) * 2 * VEIL_BAND + VEIL_BAND + u) * 4 + 3] / 255),
    };
  }
  kit.joins = out; return out;
}

// The shift of a run's rows (the row shown at place px `a` is a + shift, before the drift): anchored at the end that meets a piece, the start first.
function runShift(plan, joins, side, a0, a1, run = {}) {
  if (!joins) return 0;
  if (run.endA) return joins.end - a0;       // a water run after an end piece on the shoreline
  if (run.endB) return joins.end - (a1 - 1);
  const meets = (corner) => plan.pieces.find((p) => p.corner === corner && (p.kind === 'outer' || (p.kind === 'end' && p.side === side)));
  const row = (p) => (p.kind === 'end' ? joins.end : side === 'W' || side === 'E' ? joins.outerV : joins.outerH);
  const [first, last] = ENDS[side], s = meets(first[0]), f = meets(last[0]);
  if (s) return row(s) - a0;
  if (f) return row(f) - (a1 - 1);
  return 0;
}

// Paints the veil of `plan` onto g (a 2D context of W x H place pixels). kit: { strip, end, outer, inner } canvases/images of one time of day.
export function paintVeil(g, kit, plan, W, H) {
  g.save(); g.imageSmoothingEnabled = false; g.beginPath(); g.rect(0, 0, W, H); g.clip();
  const put = (m, img, ...a) => { g.setTransform(...m); g.drawImage(img, ...a); };
  const joins = veilJoins(kit);
  for (const run of plan.runs) {
    const { side, a0, a1 } = run, L = (side === 'W' || side === 'E' ? H : W), m = sideMatrix(side, W, H, L, false, 0), shift = runShift(plan, joins, side, a0, a1, run);
    for (let a = a0; a < a1;) {
      const r = (((a + shift) % VEIL_PERIOD) + VEIL_PERIOD) % VEIL_PERIOD, len = Math.min(VEIL_PERIOD - r, a1 - a);
      put(m, kit.strip, 0, r, VEIL_BAND, len, 0, a, VEIL_BAND, len); a += len;
    }
  }
  for (const p of plan.pieces) {
    if (p.kind === 'end') { const L = p.at !== undefined && p.far ? p.at : (p.side === 'W' || p.side === 'E' ? H : W); put(sideMatrix(p.side, W, H, L, p.far, -VEIL_BAND, p.far ? 0 : p.at || 0), kit.end, 0, 0, 2 * VEIL_BAND, 2 * VEIL_BAND); }
    else put(cornerMatrix(p.corner, W, H), kit[p.kind], 0, 0, VEIL_BAND, VEIL_BAND);
  }
  g.restore();
}
