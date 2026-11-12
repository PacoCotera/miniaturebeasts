// The edge veil (art desk, mibi-art 39a625d1f, places/veil/): a cool blue-grey veil over the coast's deep water and along the region sides that face unopened land, 3 tiles deep, dense at the place's edge.
// Pieces are baked pictures; nothing is drawn by code but their placement. The straight run is two seamless layers that drift past each other ALONG the edge line, 1 art px (3 px at 1x) a step
// at 3 steps a second, by swapping which rows show (no blending between frames, no particles). Corners and band ends are single signed pictures that stand still.
// A veil never lies inside a walkable place: the page gives only the sides that are blocked (a range side) or water (the coast).
export const VEIL_T = 48, VEIL_BAND = 144, VEIL_PERIOD = 240, VEIL_STEP_MS = 333, VEIL_STEP_PX = 3, VEIL_STEPS = VEIL_PERIOD / VEIL_STEP_PX;
export const VEIL_KINDS = ['strip', 'drift-a', 'drift-b', 'end', 'outer', 'inner'];
export const veilFileName = (kind, night) => (kind === 'strip' ? 'edge-veil' : `edge-veil-${kind}`) + (night ? '-night' : '-day');
export const veilStep = (clockMs) => (clockMs > 0 ? Math.floor(clockMs / VEIL_STEP_MS) % VEIL_STEPS : 0);

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

// base (X, Y) of a piece to place pixels, as a canvas matrix [a, b, c, d, e, f]. A corner piece: mirrored toward its corner. A side piece: u across from the edge (X + uOff), v along it (Y, or L - Y at the far end).
function sideMatrix(side, W, H, L, far, uOff) {
  const at = (X, Y) => { const u = X + uOff, v = far ? L - Y : Y; return side === 'W' ? [u, v] : side === 'E' ? [W - u, v] : side === 'N' ? [v, u] : [v, H - u]; };
  const o = at(0, 0), x = at(1, 0), y = at(0, 1);
  return [x[0] - o[0], x[1] - o[1], y[0] - o[0], y[1] - o[1], o[0], o[1]];
}
const cornerMatrix = (corner, W, H) => [corner[1] === 'E' ? -1 : 1, 0, 0, corner[0] === 'S' ? -1 : 1, corner[1] === 'E' ? W : 0, corner[0] === 'S' ? H : 0];

// The map's veil: the same paint at 26 px a cell (78 px across, 130 along), still. sides: { N, E, S, W } veiled; the map is W x H px at (ox, oy) on g. West and east run the full height, north and south between them.
export function paintMapVeil(g, img, ox, oy, W, H, sides, band = 78, period = 130) {
  g.save(); g.imageSmoothingEnabled = false; g.beginPath(); g.rect(ox, oy, W, H); g.clip();
  for (const side of 'NESW') {
    if (!sides[side]) continue;
    const horiz = side === 'N' || side === 'S', L = horiz ? W : H, m = sideMatrix(side, W, H, L, false, 0);
    const a0 = horiz && sides.W ? band : 0, a1 = L - (horiz && sides.E ? band : 0);
    g.setTransform(m[0], m[1], m[2], m[3], m[4] + ox, m[5] + oy);
    for (let a = a0; a < a1;) { const r = a % period, len = Math.min(period - r, a1 - a); g.drawImage(img, 0, r, band, len, 0, a, band, len); a += len; }
  }
  g.restore();
}

// Where a run of straight veil meets a painted corner or band end, the run's rows are laid so the cross-section there is the one of the strip that matches the piece's join edge best (the art desk laid
// its signs the same way: the strip slides along its edge to the row whose cross-section meets the piece). Read from the pictures themselves, once per kit: for every one of the 240 rows of the two
// drift layers stacked (step 0), the mean alpha difference to the piece's edge; the row with the least. { outerV, outerH, end }: the outer corner's bottom edge (a west or east run), its right edge (a north
// or south run), the band end's bottom edge; each null when a picture cannot be read (no run is shifted then).
function alphaOf(img) {
  try { const g = img.getContext('2d'); return { a: g.getImageData(0, 0, img.width, img.height).data, w: img.width, h: img.height }; } catch (e) { return null; }
}
export function veilJoins(kit) {
  if (kit.joins !== undefined) return kit.joins;
  const A = alphaOf(kit['drift-a']), B = alphaOf(kit['drift-b']), O = alphaOf(kit.outer), E = alphaOf(kit.end);
  let out = null;
  if (A && B && O && E && A.w === VEIL_BAND && A.h === VEIL_PERIOD && O.w === VEIL_BAND && O.h === VEIL_BAND && E.w === 2 * VEIL_BAND && E.h === 2 * VEIL_BAND) {
    const stack = (r, u) => { const i = (r * VEIL_BAND + u) * 4 + 3, a = A.a[i] / 255, b = B.a[i] / 255; return 1 - (1 - a) * (1 - b); };
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
function runShift(plan, joins, side, a0, a1) {
  if (!joins) return 0;
  const meets = (corner) => plan.pieces.find((p) => p.corner === corner && (p.kind === 'outer' || (p.kind === 'end' && p.side === side)));
  const row = (p) => (p.kind === 'end' ? joins.end : side === 'W' || side === 'E' ? joins.outerV : joins.outerH);
  const [first, last] = ENDS[side], s = meets(first[0]), f = meets(last[0]);
  if (s) return row(s) - a0;
  if (f) return row(f) - (a1 - 1);
  return 0;
}

// Paints the veil of `plan` at drift step `step` onto g (a 2D context of W x H place pixels). kit: { strip, 'drift-a', 'drift-b', end, outer, inner } canvases/images of one time of day.
export function paintVeil(g, kit, plan, W, H, step) {
  g.save(); g.imageSmoothingEnabled = false; g.beginPath(); g.rect(0, 0, W, H); g.clip();
  const put = (m, img, ...a) => { g.setTransform(...m); g.drawImage(img, ...a); };
  const sh = step * VEIL_STEP_PX, joins = veilJoins(kit);
  for (const { side, a0, a1 } of plan.runs) {
    const L = (side === 'W' || side === 'E' ? H : W), m = sideMatrix(side, W, H, L, false, 0), shift = runShift(plan, joins, side, a0, a1);
    for (const [img, dir] of [[kit['drift-a'], 1], [kit['drift-b'], -1]]) {
      for (let a = a0; a < a1;) {
        const r = ((((a + shift - dir * sh) % VEIL_PERIOD) + VEIL_PERIOD) % VEIL_PERIOD), len = Math.min(VEIL_PERIOD - r, a1 - a);
        put(m, img, 0, r, VEIL_BAND, len, 0, a, VEIL_BAND, len); a += len;
      }
    }
  }
  for (const p of plan.pieces) {
    if (p.kind === 'end') { const L = (p.side === 'W' || p.side === 'E' ? H : W); put(sideMatrix(p.side, W, H, L, p.far, -VEIL_BAND), kit.end, 0, 0, 2 * VEIL_BAND, 2 * VEIL_BAND); }
    else put(cornerMatrix(p.corner, W, H), kit[p.kind], 0, 0, VEIL_BAND, VEIL_BAND);
  }
  g.restore();
}
