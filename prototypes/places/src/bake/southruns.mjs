// The cliff's face and sides by "rim and face" (map-system-audit-1 cliff-spec.md, sections 3 and 4), placed from signed pieces only.
//   S1..S6   the south columns, 48 x 288, top at row L - 2 (L = the run's lip row: the southmost raised row of its columns); the column is (world x + hash(seed, world y of the lip)) mod 6
//   c0..c4   the corner strip cells (cliff-corner-{e,w}-0..4) on the run's last cells: c4 on the end cell, c3 beside it, then c2, c1, c0 where the run is long enough and no other corner has claimed them
//   E        the face end (cliff-corner-{e,w}-5) on the low cell beyond a run's end, top at L - 2, when that cell is low for 3 rows or more upward from row L
//   E2, E1   whole-cell crops of E (cliff-end2-{e,w}, 48 x 240, top at L - 1; cliff-end1-{e,w}, 48 x 192, top at L) for a step of 2 rows and of 1 row
//   b        the side cell (cliff-side-b-{e,w}, 48 x 48) on every low cell that has a raised cell beside it, unless an end piece covers it
// NAMED EMPTY SLOTS for the art desk (not drawn; the old rim sheets and way-up tiles stand until they are painted): U (way up, 96 x 288, two cells), N (back rim, three looks), NW, NE (outer back corners), iW, iE (inner back corners).
// The pieces are decals in draw order (spec 4.2): face lines north to south; in one line the side cells, then the columns, the corner cells, the end pieces; west to east.
// Every choice reads world tiles only: the land a place carries (ir.land, the cell and its apron and 6 tiles more each side, from the generator's own window), so two places that draw the same world cell place the same piece there.
// Pure over a level IR: no art, no drawing.
import { hash32 } from '../dualgrid.mjs';

export const SOUTH_COLUMNS = 6;     // the columns of S
export const SOUTH_ABOVE = 2;       // cells of a full column above the lip row (the moss and the raised ground it overhangs)
export const SOUTH_ROWS = 4;        // the face's height in rows from the lip row down (rock to 2.7 rows, foot to 3.2): the low rows it needs under the lip are 3
export const southKind = (k) => `cliff-south-${k + 1}`;
export const CORNER_HANDS = ['e', 'w'];   // the corner strip's cells 0..5 (48 x 288 each): the east hand as painted, the west hand its mirror
export const cornerKind = (hand, k) => `cliff-corner-${hand}-${k}`;
export const endKind = (rows, hand) => `cliff-end${rows}-${hand}`;   // E2 (rows 2) and E1 (rows 1): whole-cell crops of the signed end cell, 48 x 240 and 48 x 192
export const END_ROWS = [1, 2];
export const sideKind = (hand) => `cliff-side-b-${hand}`;

// The land of a place for the rules: raised(x, y), low(x, y), way(x, y) in the place's own tile coordinates, readable ctx.m tiles beyond it each side (ir.land), else the place's own terrain (a hand-set place) clamped at its edge.
function landOf(ir, cliffs) {
  const { w, h } = ir, L = ir.land, m = L ? L.m : 0, lw = L ? L.w : w;
  const inside = (x, y) => (L ? x >= -m && y >= -m && x < w + m && y < h + m : x >= 0 && y >= 0 && x < w && y < h);
  const raised = L ? (x, y) => L.raised[(y + m) * lw + x + m] === 1 : (x, y) => cliffs.isCliff(x, y);
  const way = (x, y) => x >= 0 && y >= 0 && x < w && y < h && cliffs.wayup.has(y * w + x);
  return { raised, low: (x, y) => !raised(x, y), way, inside, m };
}

// The south runs: maximal rows of raised cells with low ground under them (a way up's cells are in the run and take no column here). Returns [{ y, x0, x1, west, east, kw, ke, hidW, hidE, col0 }]:
// the lip row, the first and last cell; west / east: the cell beyond that end is low (an end piece, corner cells); kw / ke: how many rows that cell is low upward from row L (1, 2, 3 = 3 or more);
// col0: the column of S under x0 (by world x, so every place that draws the cell draws that column). A run that reaches the edge of the land has no end there.
export function southRuns(ir, cliffs) {
  const { w, h } = ir, A = landOf(ir, cliffs), m = A.m, runs = [];
  const x0w = ir.origin ? ir.origin.x : 0, y0w = ir.origin ? ir.origin.y : 0;
  const hs = (wy) => (ir.origin ? hash32(`${ir.seed}/south`, 0, wy) : hash32(`${ir.id}/south`, 0, wy));
  const lip = (x, y) => A.raised(x, y) && A.low(x, y + 1);
  const up = (x, y) => { let k = 0; while (k < 3 && A.low(x, y - k)) k++; return k; };
  for (let y = -SOUTH_ABOVE - SOUTH_ROWS; y <= h + 1; y++) {
    if (!A.inside(0, y) || !A.inside(0, y + 1)) continue;
    for (let x = -m; x < w + m;) {
      if (!lip(x, y)) { x++; continue; }
      let x1 = x; while (x1 + 1 < w + m && lip(x1 + 1, y)) x1++;
      const cutW = x === -m, cutE = x1 === w + m - 1, ew = !cutW && A.low(x - 1, y), ee = !cutE && A.low(x1 + 1, y);
      if (x1 >= -1 && x <= w) runs.push({ y, x0: x, x1, west: ew, east: ee, kw: ew ? up(x - 1, y) : 0, ke: ee ? up(x1 + 1, y) : 0, cutW, cutE, col0: (hs(y0w + y) + x0w + x) % SOUTH_COLUMNS });
      x = x1 + 1;
    }
  }
  return runs;
}

// The face pieces of the runs, as [{ kind, x, y, line, cls }] in game px (cls: 1 column, 2 corner cell, 3 end piece; line: the lip row). cell: 48.
function facePieces(ir, cliffs, runs, cell = 48) {
  const A = landOf(ir, cliffs), out = [];
  for (const r of runs) {
    const n = r.x1 - r.x0 + 1, both = r.west && r.east, rooms = n >= (both ? 4 : 2), kinds = new Map(), claimed = new Set();
    for (let x = r.x0; x <= r.x1; x++) kinds.set(x, [southKind((((r.col0 + x - r.x0) % SOUTH_COLUMNS) + SOUTH_COLUMNS) % SOUTH_COLUMNS), 1]);
    const put = (x, kind) => { if (!claimed.has(x) && x >= r.x0 && x <= r.x1) { claimed.add(x); kinds.set(x, [kind, 2]); } };
    if (r.east && rooms) for (const [p, x] of [[4, r.x1], [3, r.x1 - 1]]) put(x, cornerKind('e', p));
    if (r.west && rooms) for (const [p, x] of [[4, r.x0], [3, r.x0 + 1]]) put(x, cornerKind('w', p));
    if (r.east && rooms) for (const p of [2, 1, 0]) put(r.x1 - 4 + p, cornerKind('e', p));
    if (r.west && rooms) for (const p of [2, 1, 0]) put(r.x0 + 4 - p, cornerKind('w', p));
    for (const [x, [kind, cls]] of kinds) if (!A.way(x, r.y)) out.push({ kind, x: x * cell, y: (r.y - SOUTH_ABOVE) * cell, line: r.y, cls });
    // the end pieces, on the low cell beyond each end, by how many rows it is low upward from row L
    for (const [hand, end, xb, k] of [['e', r.east, r.x1 + 1, r.ke], ['w', r.west, r.x0 - 1, r.kw]]) {
      if (!end) continue;
      const top = k >= 3 ? r.y - 2 : k === 2 ? r.y - 1 : r.y;
      out.push({ kind: k >= 3 ? cornerKind(hand, 5) : endKind(k, hand), x: xb * cell, y: top * cell, line: r.y, cls: 3, cover: [xb, top, r.y + 3] });
    }
  }
  return out;
}

// The side cells: every low cell with a raised cell beside it that no end piece covers (hand 'e' when the raised cell is to its west, 'w' when to its east). Returns [{ hand, x, y }] over the place's cells and its apron's ring.
function sideCells(ir, cliffs, pieces) {
  const { w, h } = ir, A = landOf(ir, cliffs), covered = new Set(), out = [];
  for (const p of pieces) if (p.cover) for (let y = p.cover[1]; y <= p.cover[2]; y++) covered.add(p.cover[0] + ',' + y);
  for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) {
    if (!A.inside(x, y) || A.raised(x, y) || covered.has(x + ',' + y)) continue;
    if (A.raised(x - 1, y)) out.push({ hand: 'e', x, y });
    if (A.raised(x + 1, y)) out.push({ hand: 'w', x, y });
  }
  return out;
}

// Every cliff decal of a level in draw order: [{ kind, x, y }] in game px, keeping only those that reach the place's picture. The one entry both bakes use.
export const FILL_KIND = 'cliff-fill';   // the signed raised fill (fill-cliff.png) as one whole 48 x 48 cell

// Spec 3.3: the raised fill laid per raised cell, as whole cells at world positions, so it ends on the cell line. The raised cell beside every side cell, when its cell above is raised too (a cell with the back rim above it
// keeps the dual tile's fill there: the rim sheet's tiles cover its top half). A side tile (case 5, 10) goes empty when every raised cell it touches is in this list. Returns [{ kind, x, y }] in game px, drawn before every other decal.
export function sideFillCells(ir, cliffs) {
  const A = landOf(ir, cliffs), out = new Map();
  for (const s of sideCells(ir, cliffs, facePieces(ir, cliffs, southRuns(ir, cliffs), 48))) {
    const x = s.hand === 'e' ? s.x - 1 : s.x + 1;
    if (A.raised(x, s.y)) out.set(x + ',' + s.y, { x, y: s.y });
  }
  return out;
}

export function cliffDecals(ir, cliffs, cell = 48) {
  const runs = southRuns(ir, cliffs), face = facePieces(ir, cliffs, runs, cell), sides = sideCells(ir, cliffs, face), items = [];
  for (const f of sideFillCells(ir, cliffs).values()) items.push({ kind: FILL_KIND, x: f.x * cell, y: f.y * cell, line: -1e9, cls: 0 });
  // a side cell belongs to the southmost row of its side run (same hand and column, consecutive rows)
  const key = (s) => s.hand + s.x, byCol = new Map();
  for (const s of sides) { const k = key(s); if (!byCol.has(k)) byCol.set(k, []); byCol.get(k).push(s); }
  for (const list of byCol.values()) {
    list.sort((p, q) => p.y - q.y);
    for (let i = 0, j = 0; i < list.length; i = j) { j = i + 1; while (j < list.length && list[j].y === list[j - 1].y + 1) j++; const line = list[j - 1].y; for (let k = i; k < j; k++) items.push({ kind: sideKind(list[k].hand), x: list[k].x * cell, y: list[k].y * cell, line, cls: 0 }); }
  }
  for (const p of face) items.push(p);
  items.sort((a, b) => a.line - b.line || a.cls - b.cls || a.x - b.x || a.y - b.y);
  const W = ir.w * cell, H = ir.h * cell, tall = (kind) => (/^cliff-(south|corner)/.test(kind) ? 6 : /^cliff-end2/.test(kind) ? 5 : /^cliff-end1/.test(kind) ? 4 : 1) * cell;
  return items.filter((d) => d.x + cell > 0 && d.x < W && d.y + tall(d.kind) > 0 && d.y < H).map(({ kind, x, y }) => ({ kind, x, y }));
}

// The cells the rules block under a south lip (spec 4.3): the cell under every south lip cell, row L + 1, except under a way up's cells. [index y * w + x] inside the place.
export function southFoot(ir, cliffs) {
  const { w, h } = ir, A = landOf(ir, cliffs), out = [];
  for (let y = A.m > 0 ? -1 : 0; y + 1 < h; y++) for (let x = 0; x < w; x++) if (A.raised(x, y) && !A.way(x, y) && A.low(x, y + 1) && !A.way(x, y + 1)) out.push((y + 1) * w + x);
  return out;
}

// The runs whose low ground under the lip is shorter than the face's rows: [{ y, x0, x1, low }] with `low` the fewest low rows under any cell of the run (the face needs SOUTH_ROWS - 1).
export function shortRuns(ir, cliffs, runs) {
  const A = landOf(ir, cliffs), out = [];
  for (const r of runs) {
    let low = Infinity;
    for (let x = r.x0; x <= r.x1; x++) { let n = 0; while (A.inside(x, r.y + 1 + n) && A.low(x, r.y + 1 + n)) n++; low = Math.min(low, n); }
    if (low < SOUTH_ROWS - 1) out.push({ ...r, low });
  }
  return out;
}

// The dual-grid tile cases the old rim sheet still draws (back rim and its corners: 3, 1, 2, 7, 11); every other cliff edge case is drawn by the pieces above (spec 3.2). Bits: NW 8, NE 4, SW 2, SE 1.
export const RIM_CASES = new Set([1, 2, 3, 7, 11]);
