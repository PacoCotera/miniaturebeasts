// relief(land): the one function that names every cell's part of the raised land. Walking, the decor rules, the ground pairs and the bake all read it and nowhere else.
//   top    raised, no low cell beside it (4-neighbours)                                   walks
//   ring   raised, with a low cell beside it (the lip cells)                                blocks
//   face   the 3 low cells under a south ring cell (rows L + 1 .. L + 3: the rock)          blocks
//   flank  a low cell with a raised cell to its east or west, and the end pieces' cells     blocks (an end piece's rows L + 1 .. L + 3 too)
//   foot   the one row L + 4 under a south ring cell (the contact shade)                    walks (foot pieces only stand there)
//   way    a way up's cells                                                                 walks
//   low    the rest
// The land is a small accessor { raised(x, y), low(x, y), way(x, y), inside(x, y) } over world or place tiles; nothing here draws.
// The piece table (art/places/pieces.json, schema pieces.schema.json) holds every piece's footprint, extent, margin and foot line.
import PIECES from '../../../../art/places/pieces.json' with { type: 'json' };

export { PIECES };
export const PART = { LOW: 0, TOP: 1, RING: 2, FACE: 3, FLANK: 4, FOOT: 5, WAY: 6 };
export const BLOCKS = new Set([PART.RING, PART.FACE, PART.FLANK]);
export const FACE_ROWS = PIECES.faceRows;      // the face's height in rows, counted from the lip row: the foot line of a face is its lip row plus this
export const ROWS_ABOVE = PIECES.rowsAbove;    // rows of a full column above the lip row
export const COLUMNS = PIECES.columns;         // the south columns S1 .. S6
export const CELL = PIECES.cell;

const BY_KIND = new Map();
for (const row of PIECES.pieces) for (const k of row.kinds) BY_KIND.set(k, row);
export const pieceOf = (kind) => BY_KIND.get(kind) || null;
// the picture's height in cells of a kind (rows of its extent)
export const tallOf = (kind) => { const p = BY_KIND.get(kind); return p ? Math.ceil(p.extent[3] / CELL) : 1; };
// the row (in cells, relative to the lip row L) the top of a kind's picture sits on
export const topOf = (kind) => { const p = BY_KIND.get(kind); return p ? p.anchor[1] : 0; };
// the foot line of a piece whose reference row is `row` (the lip row of its run, or the southmost row of its side run): reference row plus the face's rows
export const footLineOf = (kind, row) => { const p = BY_KIND.get(kind); return p && p.footLine.from === 'ground' ? -1e9 : row + (p ? p.footLine.plus : FACE_ROWS); };

// The land of a level IR for the rules: raised(x, y), low(x, y), way(x, y) in the place's own tile coordinates, readable m tiles beyond it each side when the level carries its land (ir.land),
// else the place's own terrain (a hand-set place) clamped at its edge. `cliffs` is openedges.cliffInfo's { isCliff, wayup }.
export function landOf(ir, cliffs) {
  const { w, h } = ir, L = ir.land, m = L ? L.m : 0, lw = L ? L.w : w;
  const inside = (x, y) => (L ? x >= -m && y >= -m && x < w + m && y < h + m : x >= 0 && y >= 0 && x < w && y < h);
  const raised = L ? (x, y) => L.raised[(y + m) * lw + x + m] === 1 : (x, y) => cliffs.isCliff(x, y);
  // a way up's cells, also those above the place's first row (a stair whose lip row lies up to 4 rows above this place cuts the face rows inside it): read off the areas, never the set's y * w + x keys
  const wus = ir.wayups || [], way = (x, y) => { for (const a of wus) if (x >= a.x && x < a.x + a.w && y >= a.y && y < a.y + a.h) return true; return false; };
  return { raised, low: (x, y) => !raised(x, y), way, inside, m };
}

// How many rows upward from row y a low column is low, to 3: the step of a run's end
const up = (A, x, y) => { let k = 0; while (k < 3 && A.low(x, y - k)) k++; return k; };

// A lean (cliff-contour-1, the land keeps it: levels.mjs leanAt): a side wall moving one column in toward the raised land going south leaves one south lip cell (x, y) alone in its row, with the wall above
// running down its outer side and the next column in raised 4 or more rows further down (a wall, not a steep run's step). It has no face and no end: the cell under its lip is rock (FACE, it blocks), the cells
// beyond it are open ground, and the set draws the wall leaning over by one column. Returns the hand ('w': the wall's outside is west) or null.
export function leanAt(A, x, y) {
  if (!A.raised(x, y) || !A.low(x, y + 1) || !A.raised(x, y - 1) || !A.low(x, y + 2)) return null;
  for (const [h, d] of [['w', -1], ['e', 1]]) if (A.low(x + d, y) && A.low(x + d, y - 1) && A.raised(x - d, y) && A.raised(x - d, y + 1) && A.raised(x - d, y + 2) && A.raised(x - d, y + 3) && A.raised(x - d, y + 4)
    && [2, 3, 4].every((k) => A.raised(x - k * d, y + 1) && A.raised(x - k * d, y + 2))) return h;   // the land behind the lower wall 4 wide (no neck under the minimum feature)
  return null;
}

// The end piece a low cell belongs to, or null: the cell beyond the end of a south run, rows top .. L + `bottom` ({ L, hand, k, top }; k = rows low upward from row L, 1, 2, 3 = 3 or more).
// The rock rows (down to L + FACE_ROWS, the same 3 rows as the face under the lip) block; the foot row below is walkable.
export function endAt(A, x, y, bottom = FACE_ROWS) {
  if (!A.low(x, y)) return null;
  for (let L = y + 2; L >= y - bottom; L--) {
    if (!A.low(x, L)) continue;
    for (const [hand, xl] of [['e', x - 1], ['w', x + 1]]) {
      if (!A.raised(xl, L) || !A.low(xl, L + 1)) continue;   // the neighbour is no south lip cell of row L
      if (leanAt(A, xl, L)) continue;   // a lean has no end piece
      const k = up(A, x, L), top = k >= 3 ? L - 2 : k === 2 ? L - 1 : L;
      if (y >= top && y <= L + bottom) return { L, hand, k, top };
    }
  }
  return null;
}

// The part of one cell. A land that carries a `memo` Map (a world-sized land, asked cell by cell) remembers the answers.
export function partAt(A, x, y) {
  if (!A.memo) return partCompute(A, x, y);
  const k = (y + 32768) * 65536 + x + 32768, hit = A.memo.get(k); if (hit !== undefined) return hit;
  if (A.memo.size > 600000) A.memo.clear();
  const p = partCompute(A, x, y); A.memo.set(k, p); return p;
}
// way cells first, then the raised land, then the low cells by what stands beside and above them
function partCompute(A, x, y) {
  if (A.way(x, y)) return PART.WAY;
  if (A.raised(x, y)) return A.low(x + 1, y) || A.low(x - 1, y) || A.low(x, y + 1) || A.low(x, y - 1) ? PART.RING : PART.TOP;
  if (A.raised(x, y - 1) && !A.way(x, y - 1)) return PART.FACE;
  if (endAt(A, x, y) || A.raised(x - 1, y) || A.raised(x + 1, y)) return PART.FLANK;
  // rows L + 2 .. L + FACE_ROWS under a south lip are rock too (face, blocks); the one row L + FACE_ROWS + 1 is the foot (walks). The first raised cell going up decides; a way up's cut stays low.
  for (let d = 2; d <= FACE_ROWS + 1; d++) if (A.raised(x, y - d)) { if (A.way(x, y - d) || A.way(x, y - d + 1)) break; if (!A.low(x, y - d + 1)) break; return d <= FACE_ROWS ? PART.FACE : PART.FOOT; }
  return PART.LOW;
}

// The runs of 1-column steps (designer 2026-11-15, cliff-rules.md section 6): the land names each one so the piece table picks right.
//   A south lip cell (x, y) with the next column over (east, or west) raised on row y and its own lip d rows lower (d = 1 .. 3) is a step; consecutive steps in one direction make a run of n steps (n + 1 columns).
//   diagonal  3+ steps, every one d = 1 (the 45 degree line)
//   steep     3+ steps that average more than 1.25 rows a column (4 * sum >= 5 * n): steeper than 45 degrees, so one side wall running down at an angle, never a slab to a step
//   steps     any other chain of 1 or more steps (1-2 steps use the corners; a long gentle mix keeps the diagonal and the front faces)
// runAt(A, x, y) for a south lip cell: { kind, hand ('r' = going down to the east, 'l' = to the west), i (this column's place in the run, 0 .. n), n, ds (the steps' drops) } or null when no step touches the column.
const lipAt = (A, x, y) => A.raised(x, y) && A.low(x, y + 1);
const dropBy = (A, x, y, dx) => {   // the rows the lip of the next column over (dx = 1 east, -1 west) lies below this one, 1 .. 3, or 0
  if (!lipAt(A, x, y) || A.way(x, y) || !A.raised(x + dx, y)) return 0;
  let r = y; while (r < y + 4 && A.raised(x + dx, r + 1)) r++;
  const d = r - y;
  return d >= 1 && d <= 3 && A.low(x + dx, r + 1) && !A.way(x + dx, r) ? d : 0;
};
export function runAt(A, x, y) {
  if (!lipAt(A, x, y)) return null;
  for (const [hand, dx] of [['r', 1], ['l', -1]]) {
    const back = (cx, cy) => { for (let d = 1; d <= 3; d++) if (dropBy(A, cx - dx, cy - d, dx) === d) return d; return 0; };
    let sx = x, sy = y, ds = [], d;
    while ((d = back(sx, sy)) && ds.length < 64) { ds.unshift(d); sx -= dx; sy -= d; }
    const i = ds.length; let cx = x, cy = y;
    while ((d = dropBy(A, cx, cy, dx)) && ds.length < 64) { ds.push(d); cx += dx; cy += d; }
    if (!ds.length) continue;
    const n = ds.length, sum = ds.reduce((s, v) => s + v, 0);
    return { kind: n >= 3 && ds.every((v) => v === 1) ? 'diagonal' : n >= 3 && 4 * sum >= 5 * n ? 'steep' : 'steps', hand, i, n, ds };
  }
  return null;
}

// The parts of a rectangle of the land: Uint8Array of w x h (cells x0 .. x0 + w - 1, y0 .. y0 + h - 1)
export function partsOf(A, x0, y0, w, h) {
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out[y * w + x] = partAt(A, x0 + x, y0 + y);
  return out;
}

// The extent test for everything that stands: no cell under its extent (cells left, right, up, down of its foot) may be a ring, face, flank or way-up cell. `family` names a row of the table's propExtents; a family not listed has its own cell only.
export function extentClear(A, x, y, family) {
  const E = PIECES.propExtents[family] || { left: 0, right: 0, up: 0, down: 0 };
  for (let dy = -E.up; dy <= E.down; dy++) for (let dx = -E.left; dx <= E.right; dx++) {
    const p = partAt(A, x + dx, y + dy);
    if (BLOCKS.has(p) || p === PART.WAY) return false;
  }
  return true;
}

// Does any cell of the 3 x 3 round (x, y) hold raised land: the tile the cliff's outline may touch (the generator keeps terrain the cliff has no ground pair with one tile off it)
export const touchesRaised = (raised, x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (raised(x + dx, y + dy)) return true; return false; };

