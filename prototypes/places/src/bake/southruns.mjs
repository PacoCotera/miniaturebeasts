// The south faces of the cliff as whole painted columns (the art director's seamless strip S, six whole 48 x 288 columns, signed pieces `cliff-south-1..6`).
// A straight south run is a row of cliff cells whose south neighbour is low and whose two cells to the north are cliff too (the moss rolls over the raised ground), with no way up in it. Each run starts at a column of S
// the world seed picks (a hash of the seed and the run's first cell) and takes the next column every cell, so a long run repeats S every six cells. The column is drawn as a decal, its top two cells above the lip row;
// its keyed moss overhangs the raised ground, which the ground pass has drawn already, and the lip's old face tiles under it are not drawn (openedges.mjs). Corners, sides, the back rim, the way up and a run's end caps stay the old tiles.
// Pure over a level IR: no art, no drawing.
import { hash32 } from '../dualgrid.mjs';

export const SOUTH_COLUMNS = 6;     // the columns of S
export const SOUTH_ABOVE = 2;       // cells of the column above the lip row (the moss and the raised ground it overhangs)
export const SOUTH_ROWS = 4;        // the face's height in rows, lip row included from the moss down: the low rows it needs under the lip are 3 (rock to 2.7 rows, foot to 3.2)
export const southKind = (k) => `cliff-south-${k + 1}`;
export const CORNER_HANDS = ['e', 'w'];   // the corner strip's cells 0..5 (48 x 288 each): the east hand as painted, the west hand its mirror
export const cornerKind = (hand, k) => `cliff-corner-${hand}-${k}`;
export const INNER_CELLS = [3, 4, 5];   // the inner-corner strip's cells 3..5 (48 x 288 each; cells 0..2 are the plain columns): the east hand as painted, the west hand its mirror
export const innerKind = (hand, k) => `cliff-inner-${hand}-${k}`;

// cliffs: openedges.cliffInfo's result ({ isCliff, wayup }). Returns [{ y, x0, x1, col0 }]: the lip row, the first and last cell, the column of S the run starts at.
export function southRuns(ir, cliffs) {
  const { w, h } = ir, runs = [];
  const raised = (x, y) => x >= 0 && y >= 0 && x < w && y < h && cliffs.isCliff(x, y) && !cliffs.wayup.has(y * w + x);
  const low = (x, y) => y < h && !cliffs.isCliff(x, y);
  const straight = (x, y) => raised(x, y) && low(x, y + 1) && raised(x, y - 1) && raised(x, y - 2);
  const hs = (salt, x, y) => (ir.origin ? hash32(`${ir.seed}/${salt}`, ir.origin.x + x, ir.origin.y + y) : hash32(`${ir.id}/${salt}`, x, y));
  // an outer corner at the run's end: the cell beyond the end is low, and so are the cells north and south of it (the side turns back up the plateau, no gully or pinch)
  const outer = (x, y) => x >= 0 && x < w && low(x, y) && y - 1 >= 0 && low(x, y - 1) && y + 1 < h && low(x, y + 1);
  // an inner corner at the run's end: the cell beyond the end is raised too and so is the cell south of it (a block stands in front, the face runs in behind it; no way up in either)
  const inner = (x, y) => raised(x, y) && raised(x, y + 1);
  for (let y = 2; y < h - 1; y++) {
    for (let x = 0; x < w;) {
      if (!straight(x, y)) { x++; continue; }
      let x1 = x; while (x1 + 1 < w && straight(x1 + 1, y)) x1++;
      runs.push({ y, x0: x, x1, col0: hs('south', x, y) % SOUTH_COLUMNS, west: outer(x - 1, y), east: outer(x1 + 1, y), innerWest: inner(x - 1, y), innerEast: inner(x1 + 1, y) });
      x = x1 + 1;
    }
  }
  return runs;
}

// The columns as decals, in draw order (lip row north to south, then west to east): [{ kind, x, y }] in game px.
// A run that ends in an outer corner takes the art director's corner strip at that end (cells 0..5 of it, the east hand as painted, the west hand its mirror): the strip's cells 3 and 4 are the last two cells of the run,
// its cell 5 is the side, drawn over the low cell beyond the end, and its cells 0..2 replace the three columns before them. The west hand runs the strip the other way round: cell 5 at x0 - 1, 4 at x0, 3 at x0 + 1, 2..0 at x0 + 2..x0 + 4.
// The corner cells are claimed first; the three before them only where no other corner has claimed the cell. A run too short for its corner's cells (under 2 cells, or under 4 with a corner at each end) takes the plain columns.
export function southDecals(runs, cell = 48) {
  const out = [];
  for (const r of runs) {
    const n = r.x1 - r.x0 + 1, both = r.west && r.east, east = r.east && n >= (both ? 4 : 2), west = r.west && n >= (both ? 4 : 2), kinds = new Map();
    for (let x = r.x0; x <= r.x1; x++) kinds.set(x, southKind((r.col0 + x - r.x0) % SOUTH_COLUMNS));
    const claimed = new Set(), put = (x, kind) => { if (!claimed.has(x)) { claimed.add(x); kinds.set(x, kind); } };
    if (east) for (const [p, x] of [[3, r.x1 - 1], [4, r.x1], [5, r.x1 + 1]]) put(x, cornerKind('e', p));
    if (west) for (const [p, x] of [[3, r.x0 + 1], [4, r.x0], [5, r.x0 - 1]]) put(x, cornerKind('w', p));
    if (east) for (const p of [2, 1, 0]) { const x = r.x1 - 4 + p; if (x >= r.x0) put(x, cornerKind('e', p)); }
    if (west) for (const p of [2, 1, 0]) { const x = r.x0 + 4 - p; if (x <= r.x1) put(x, cornerKind('w', p)); }
    // an inner corner (the face runs in behind a block in front) takes the inner strip's cells 3, 4 at the run's last two cells and 5 on the cell beyond; the plain columns stay for cells 0..2. Runs under 2 cells (under 4 with a corner at each end) take plain columns.
    const ib = (r.innerEast && r.innerWest) ? 4 : 2, ie = r.innerEast && n >= ib, iw = r.innerWest && n >= ib;
    if (ie) for (const [p, x] of [[3, r.x1 - 1], [4, r.x1], [5, r.x1 + 1]]) put(x, innerKind('e', p));
    if (iw) for (const [p, x] of [[3, r.x0 + 1], [4, r.x0], [5, r.x0 - 1]]) put(x, innerKind('w', p));
    for (const x of [...kinds.keys()].sort((a, b) => a - b)) out.push({ kind: kinds.get(x), x: x * cell, y: (r.y - SOUTH_ABOVE) * cell });
  }
  return out;
}

// The dual tiles of a run's interior that the old face drew: the face tile on the lip row (the tile whose two south corners are lip cells of the run, corner 15) and the foot tile under it (the tile one row down, both north corners in the run, south corners low).
export function southTiles(runs, w1) {
  const face = new Set(), foot = new Set();
  for (const r of runs) for (let i = r.x0 + 1; i <= r.x1; i++) { face.add(r.y * w1 + i); foot.add((r.y + 1) * w1 + i); }
  return { face, foot };
}

// The runs whose low ground under the lip is shorter than the face's rows: [{ y, x0, x1, low }] with `low` the fewest low rows under any cell of the run (the face needs SOUTH_ROWS - 1).
export function shortRuns(ir, cliffs, runs) {
  const out = [];
  for (const r of runs) {
    let low = Infinity;
    for (let x = r.x0; x <= r.x1; x++) { let n = 0; while (r.y + 1 + n < ir.h && !cliffs.isCliff(x, r.y + 1 + n)) n++; low = Math.min(low, n); }
    if (low < SOUTH_ROWS - 1) out.push({ ...r, low });
  }
  return out;
}
