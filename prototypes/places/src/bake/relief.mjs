// relief(land): the one function that names every cell's part of the raised land (architecture-world-map.md 3.1; cliff-spec.md). Walking, the decor rules, the ground pairs and the bake all read it and nowhere else.
//   top    raised, no low cell beside it (4-neighbours)                                   walks
//   ring   raised, with a low cell beside it (the lip cells)                                blocks
//   face   the low cell under a south ring cell (row L + 1)                                 blocks
//   flank  a low cell with a raised cell to its east or west, and the end pieces' cells     blocks
//   foot   rows L + 2 and L + 3 under a south ring cell                                     walks (foot pieces only stand there)
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
  const way = (x, y) => x >= 0 && y >= 0 && x < w && y < h && cliffs.wayup.has(y * w + x);
  return { raised, low: (x, y) => !raised(x, y), way, inside, m };
}

// How many rows upward from row y a low column is low, to 3: the step of a run's end
const up = (A, x, y) => { let k = 0; while (k < 3 && A.low(x, y - k)) k++; return k; };

// The end piece a low cell belongs to, or null: the cell beyond the end of a south run, rows top .. L + `bottom` ({ L, hand, k, top }; k = rows low upward from row L, 1, 2, 3 = 3 or more).
// The rock rows (down to L + 1) block; the picture itself reaches the foot (down to L + FACE_ROWS), which no side cell may be drawn on.
export function endAt(A, x, y, bottom = 1) {
  if (!A.low(x, y)) return null;
  for (let L = y + 2; L >= y - bottom; L--) {
    if (!A.low(x, L)) continue;
    for (const [hand, xl] of [['e', x - 1], ['w', x + 1]]) {
      if (!A.raised(xl, L) || !A.low(xl, L + 1)) continue;   // the neighbour is no south lip cell of row L
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
  for (let d = 2; d <= FACE_ROWS; d++) if (A.raised(x, y - d) && !A.way(x, y - d) && A.low(x, y - d + 1) && !A.way(x, y - d + 1)) { let clear = true; for (let j = 1; j < d; j++) if (A.raised(x, y - j)) clear = false; if (clear) return PART.FOOT; }
  return PART.LOW;
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

