// The cliff's face and sides by "rim and face" (map-system-audit-1 cliff-spec.md, sections 3 and 4; architecture-world-map.md), placed from signed pieces only. The pieces, their sizes, anchors and foot lines are the rows of
// art/places/pieces.json (relief.mjs reads it); the cell parts (what blocks, what is a flank or an end) are relief.mjs's one function.
//   S1..S6   the south columns, top at row L - 2 (L = the run's lip row: the southmost raised row of its columns); the column is (world x + hash(seed, world y of the lip)) mod 6
//   c0..c4   the corner strip cells (cliff-corner-{e,w}-0..4) on the run's last cells: c4 on the end cell, c3 beside it, then c2, c1, c0 where the run is long enough and no other corner has claimed them
//   E        the face end (cliff-corner-{e,w}-5) on the low cell beyond a run's end, top at L - 2, when that cell is low for 3 rows or more upward from row L
//   E2, E1   whole-cell crops of E (cliff-end2-{e,w}, cliff-end1-{e,w}) for a step of 2 rows and of 1 row
//   b        the side cell (cliff-side-b-{e,w}) on every low cell that has a raised cell beside it, unless an end piece covers it (a stand-in until the flank head and band are painted)
// NAMED EMPTY SLOTS for the art desk (rows of the table with state "empty": nothing is drawn, the old rim sheet and way-up tiles stand until they are painted): the lip cases, the flank head and band, the foot overlay, the way up.
// The pieces are decals in draw order (architecture 3.3): relief pieces north to south by FOOT LINE (the lip row, or a side run's southmost row, plus the face's rows); ties: sides, then columns, corner cells, end pieces; west to east.
// Every choice reads world tiles only: the land a place carries (ir.land, the cell and its apron and 6 tiles more each side, from the generator's own window), so two places that draw the same world cell place the same piece there.
// Pure over a level IR: no art, no drawing.
import { COLUMNS, PIECES, footLineOf, landOf, pieceOf, sideHands, sideRunEnd, southRuns, tallOf, topOf } from './relief.mjs';

export const southKind = (k) => `cliff-south-${k + 1}`;
export const CORNER_HANDS = ['e', 'w'];   // the corner strip's cells 0..5 (48 x 288 each): the east hand as painted, the west hand its mirror
export const cornerKind = (hand, k) => `cliff-corner-${hand}-${k}`;
export const endKind = (rows, hand) => `cliff-end${rows}-${hand}`;   // E2 (rows 2) and E1 (rows 1): whole-cell crops of the signed end cell
export const END_ROWS = [1, 2];
export const sideKind = (hand) => `cliff-side-b-${hand}`;
export const FILL_KIND = 'cliff-fill';   // the signed raised fill (fill-cliff.png) as one whole 48 x 48 cell

// The face pieces of the runs, as [{ kind, x, y, line, cls }] in game px (cls: 1 column, 2 corner cell, 3 end piece; line: the foot line). cell: 48.
function facePieces(A, runs, cell = PIECES.cell) {
  const out = [];
  for (const r of runs) {
    const n = r.x1 - r.x0 + 1, both = r.west && r.east, rooms = n >= (both ? 4 : 2), kinds = new Map(), claimed = new Set();
    for (let x = r.x0; x <= r.x1; x++) kinds.set(x, [southKind((((r.col0 + x - r.x0) % COLUMNS) + COLUMNS) % COLUMNS), 1]);
    const put = (x, kind) => { if (!claimed.has(x) && x >= r.x0 && x <= r.x1) { claimed.add(x); kinds.set(x, [kind, 2]); } };
    if (r.east && rooms) for (const [p, x] of [[4, r.x1], [3, r.x1 - 1]]) put(x, cornerKind('e', p));
    if (r.west && rooms) for (const [p, x] of [[4, r.x0], [3, r.x0 + 1]]) put(x, cornerKind('w', p));
    if (r.east && rooms) for (const p of [2, 1, 0]) put(r.x1 - 4 + p, cornerKind('e', p));
    if (r.west && rooms) for (const p of [2, 1, 0]) put(r.x0 + 4 - p, cornerKind('w', p));
    for (const [x, [kind, cls]] of kinds) if (!A.way(x, r.y)) out.push({ kind, x: x * cell, y: (r.y + topOf(kind)) * cell, line: footLineOf(kind, r.y), cls });
    // the end pieces, on the low cell beyond each end, by how many rows it is low upward from row L
    for (const [hand, end, xb, k] of [['e', r.east, r.x1 + 1, r.ke], ['w', r.west, r.x0 - 1, r.kw]]) {
      if (!end) continue;
      const kind = k >= 3 ? cornerKind(hand, 5) : endKind(k, hand);
      out.push({ kind, x: xb * cell, y: (r.y + topOf(kind)) * cell, line: footLineOf(kind, r.y), cls: 3 });
    }
  }
  return out;
}

// The side cells: every low cell with a raised cell beside it that no end piece covers (hand 'e' when the raised cell is to its west, 'w' when to its east), over the place's cells and its apron's ring: [{ hand, x, y }].
function sideCells(A, ir) {
  const out = [];
  for (let y = -1; y <= ir.h; y++) for (let x = -1; x <= ir.w; x++) {
    if (!A.inside(x, y)) continue;
    for (const hand of sideHands(A, x, y)) out.push({ hand, x, y });
  }
  return out;
}

// Spec 3.3: the raised fill laid per raised cell, as whole cells at world positions, so it ends on the cell line. The raised cell beside every side cell, when its cell above is raised too (a cell with the back rim above it
// keeps the dual tile's fill there: the rim sheet's tiles cover its top half). A side tile (case 5, 10) goes empty when every raised cell it touches is in this list. Returns Map of [{ x, y }] in cells, drawn before every other decal.
export function sideFillCells(ir, cliffs) {
  const A = landOf(ir, cliffs), out = new Map();
  for (const s of sideCells(A, ir)) {
    const x = s.hand === 'e' ? s.x - 1 : s.x + 1;
    if (A.raised(x, s.y)) out.set(x + ',' + s.y, { x, y: s.y });
  }
  return out;
}

// Every cliff decal of a level in draw order: [{ kind, x, y }] in game px, keeping only those that reach the place's picture. The one entry both bakes use.
export function cliffDecals(ir, cliffs, cell = PIECES.cell) {
  const A = landOf(ir, cliffs), runs = southRuns(ir, A), items = [];
  for (const f of sideFillCells(ir, cliffs).values()) items.push({ kind: FILL_KIND, x: f.x * cell, y: f.y * cell, line: footLineOf(FILL_KIND, 0), cls: 0 });
  for (const s of sideCells(A, ir)) items.push({ kind: sideKind(s.hand), x: s.x * cell, y: s.y * cell, line: footLineOf(sideKind(s.hand), sideRunEnd(A, s.x, s.y, s.hand)), cls: 0 });
  for (const p of facePieces(A, runs, cell)) items.push(p);
  items.sort((a, b) => a.line - b.line || a.cls - b.cls || a.x - b.x || a.y - b.y);
  const W = ir.w * cell, H = ir.h * cell;
  return items.filter((d) => d.x + cell > 0 && d.x < W && d.y + tallOf(d.kind) * cell > 0 && d.y < H).map(({ kind, x, y }) => ({ kind, x, y }));
}

// The rows of the table that are still named empty slots for the art desk: [{ id, family, kinds }]
export const emptySlots = () => PIECES.pieces.filter((p) => p.state === 'empty').map(({ id, family, kinds }) => ({ id, family, kinds }));
export { pieceOf };

// The dual-grid tile cases the old rim sheet still draws (back rim and its corners: 3, 1, 2, 7, 11); every other cliff edge case is drawn by the pieces above (spec 3.2). Bits: NW 8, NE 4, SW 2, SE 1.
export const RIM_CASES = new Set([1, 2, 3, 7, 11]);
