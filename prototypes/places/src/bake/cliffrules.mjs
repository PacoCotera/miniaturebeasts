// The cliff's face pieces of a level (cliff-slice-1). The rim is not placed here: it is the cliff layer's dual-grid over sheet (over-cliff.png, art/gen7/layers.json), drawn by the
// dual grid like any ground. What is placed is the south face and its shade, from relief.mjs's land (its raised cells and way-up cells):
//   face     one of three plain columns (cliff-face-1..3, 48 x 144) under every south lip cell L, top at row L + 1; the column is (world x + hash(seed, world y of the lip)) mod 3
//   caps     the west cap (cliff-cap-w) on the first cell of a south run, the east cap (cliff-cap-e) on its last; a way-up's gap is no run end
//   shadow   the one-row dithered shade (cliff-shadow, -w, -e: 48 x 6) at row L + 4 under the face, tapered under the caps, drawn before the face of its line
//   sides    nothing (R2): a side run is the rim alone; the flanks, the foot overlays, the end pieces and the leaf cushions are retired
//   way up   the signed U where a WayUp area carries `u`, after the faces of its line, as before
// Pure over a level IR: no art, no drawing. Every pick reads world tiles only (the land window of relief.mjs), so two places that draw the same world cell place the same piece there.
import { hash32 } from '../dualgrid.mjs';
import { PIECES, footLineOf, tallOf, topOf } from './relief.mjs';

const CELL = PIECES.cell;
const WAYUP_U = 'cliff-way-up-u';   // the way up U's decal (southruns.mjs WAYUP_U_KIND)
const FACES = 3;
// draw-order class of a piece, for ties on the foot line: the shade -1, the face 0, the way up 4
const SHADE = -1;

// Every cliff piece of a level as [{ kind, x, y, line, cls }] (game px; line: the foot line), in no order; cached by the level.
const CACHE = new WeakMap();
export function cliffPieces(ir, A) {
  const hit = CACHE.get(ir); if (hit) return hit;
  const out = [], { w, h } = ir, m = A.m, seed = ir.origin ? ir.seed : ir.id;
  const hs = (wy) => (ir.origin ? hash32(`${seed}/south`, 0, wy) : hash32(`${ir.id}/south`, 0, wy));
  const x0w = ir.origin ? ir.origin.x : 0, y0w = ir.origin ? ir.origin.y : 0;
  // a south lip cell: raised, with a low cell below it, and no way-up cell (the way up cuts the face)
  const lip = (x, y) => A.raised(x, y) && !A.raised(x, y + 1) && !A.way(x, y);
  for (let y = -m; y < h + m; y++) {
    const hh = hs(y0w + y);
    for (let x = -m; x < w + m; x++) {
      if (!lip(x, y)) continue;
      // a run end: no lip cell beside it in the row (a way-up cell beside it is no end: the face goes on past the cut)
      const beside = (dx) => lip(x + dx, y) || A.way(x + dx, y) || A.way(x + dx, y + 1);
      const start = !beside(-1), end = !beside(1);
      const face = start ? 'cliff-cap-w' : end ? 'cliff-cap-e' : `cliff-face-${(((hh + x0w + x) % FACES) + FACES) % FACES + 1}`;
      const line = footLineOf(face, y);
      out.push({ kind: face, x: x * CELL, y: (y + topOf(face)) * CELL, line, cls: 0 });
      out.push({ kind: start ? 'cliff-shadow-w' : end ? 'cliff-shadow-e' : 'cliff-shadow', x: x * CELL, y: (y + 4) * CELL, line, cls: SHADE });
    }
  }
  // the way up U (a WayUp area with `u`): one canvas piece at the area's lip row, drawn at the foot line of its lip row plus 3 after every piece of that line
  for (const a of ir.wayups || []) if (a.u) out.push({ kind: WAYUP_U, x: a.x * CELL, y: a.y * CELL, line: footLineOf(WAYUP_U, a.y), cls: 4 });
  const res = { items: out }; CACHE.set(ir, res); return res;
}

// Every cliff decal of a level in draw order: [{ kind, x, y }] in game px, keeping only those that reach the place's picture (the bake's one entry)
export function cliffDecals(ir, A, cell = CELL) {
  const items = cliffPieces(ir, A).items.slice().sort((a, b) => a.line - b.line || a.cls - b.cls || a.x - b.x || a.y - b.y), W = ir.w * cell, H = ir.h * cell;
  return items.filter((d) => d.x + cell > 0 && d.x < W && d.y + tallOf(d.kind) * cell > 0 && d.y < H).map(({ kind, x, y }) => ({ kind, x, y }));
}
