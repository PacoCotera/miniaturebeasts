// The cliff's face and sides by "rim and face" (map-system-audit-1 cliff-spec.md, sections 3 and 4; architecture-world-map.md), placed from signed pieces only. The pieces, their sizes, anchors and foot lines are the rows of
// art/places/pieces.json (relief.mjs reads it); the cell parts (what blocks, what is a flank or an end) are relief.mjs's one function; WHICH piece goes WHERE is the rule maps' (art/places/rules/, run by cliffrules.mjs):
//   S1..S6   the south columns, top at row L - 2 (L = the run's lip row: the southmost raised row of its columns); the column is (world x + hash(seed, world y of the lip)) mod 6
//   c0..c4   the corner strip cells (cliff-corner-{e,w}-0..4) on the run's last cells: c4 on the end cell, c3 beside it, then c2, c1, c0 where the run is long enough and no other corner has claimed them
//   E        the face end (cliff-corner-{e,w}-5) on the low cell beyond a run's end, top at L - 2, when that cell is low for 3 rows or more upward from row L
//   E2, E1   whole-cell crops of E (cliff-end2-{e,w}, cliff-end1-{e,w}) for a step of 2 rows and of 1 row
//   b        the side wall (cliff-flank-{head,band,tail}-{e,w}) on every low cell that has a raised cell beside it, unless an end piece covers it: head on the north cell of the run, tail on the south cell, band between
// NAMED EMPTY SLOTS for the art desk (rows of the table with state "empty": nothing is drawn, the old rim sheet and way-up tiles stand until they are painted): the lip cases, the foot overlay, the way up.
// The pieces are decals in draw order (architecture 3.3): relief pieces north to south by FOOT LINE (the lip row, or a side run's southmost row, plus the face's rows); ties: sides, then columns, corner cells, end pieces; west to east.
// Every choice reads world tiles only: the land a place carries (ir.land, the cell and its apron and 6 tiles more each side, from the generator's own window), so two places that draw the same world cell place the same piece there.
import { landOf, pieceOf, PIECES } from './relief.mjs';
import { cliffDecals as decalsOf } from './cliffrules.mjs';

export const southKind = (k) => `cliff-south-${k + 1}`;
export const CORNER_HANDS = ['e', 'w'];   // the corner strip's cells 0..5 (48 x 288 each): the east hand as painted, the west hand its mirror
export const cornerKind = (hand, k) => `cliff-corner-${hand}-${k}`;
export const endKind = (rows, hand) => `cliff-end${rows}-${hand}`;   // E2 (rows 2) and E1 (rows 1): whole-cell crops of the signed end cell
export const END_ROWS = [1, 2];
export const FLANK_PARTS = ['head', 'band', 'tail'];   // a side wall: its north cell (head), the repeating middle cell (band) and its south cell (tail); each 96 px wide: its own cell and 48 px of the raised cell beside it (its overlap); the west hand is the flip of the east
export const flankKind = (part, hand) => `cliff-flank-${part}-${hand}`;
export const FOOT_KINDS = [1, 2, 3, 4, 5, 6].map((k) => `cliff-foot-${k}`).concat(['cliff-foot-w', 'cliff-foot-e']);   // the foot overlay: one per column phase, and one under each hand's end piece; each 72 x 192 (the cell and 12 px of its paint each side), drawn from the lip row under the face
export const WAYUP_U_KIND = 'cliff-way-up-u';   // the way up U: one 213 x 330 piece (alpha), anchored 93 px left and 126 px above the lip row cell of its area, drawn after the columns of its line
export const FILL_KIND = 'cliff-fill';   // the signed raised fill (fill-cliff.png) as one whole 48 x 48 cell

// Every cliff decal of a level in draw order: [{ kind, x, y }] in game px, keeping only those that reach the place's picture. The one entry both bakes use.
export const cliffDecals = (ir, cliffs, cell = PIECES.cell) => decalsOf(ir, landOf(ir, cliffs), cell);

// The rows of the table that are still named empty slots for the art desk: [{ id, family, kinds }]
export const emptySlots = () => PIECES.pieces.filter((p) => p.state === 'empty').map(({ id, family, kinds }) => ({ id, family, kinds }));
export { pieceOf };
