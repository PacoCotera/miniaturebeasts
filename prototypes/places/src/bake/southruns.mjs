// The cliff by "rim and face" (cliff-slice-1): the cliff layer's dual-grid over sheet draws the rim all round the raised top (over-cliff.png: P1), and only the south face is placed
// as pieces. The pieces, their sizes, anchors and foot lines are the rows of art/places/pieces.json (relief.mjs reads it); the cell parts (what blocks) are relief.mjs's one function; the rule maps
// (art/places/rules/, run by cliffrules.mjs) still find the lip cells; WHICH piece goes WHERE is cliffrules.mjs's:
//   face     under every south lip cell L, rows L + 1 .. L + 3: one of three plain columns (cliff-face-1..3), by world position
//   caps     the west cap on the first cell of a south run, the east cap on its last (cliff-cap-w, cliff-cap-e)
//   shadow   the one-row shade at row L + 4 under every face cell, tapered under the caps (cliff-shadow, -w, -e), drawn before the face of its line
//   sides    nothing: a side run is the rim alone (R2); the flank pieces, the foot overlays, the end pieces and the back fill shapes are retired
// The pieces are decals in draw order (architecture 3.3): north to south by FOOT LINE (the lip row plus the face's rows); ties: the shade, then faces, then the way up; west to east.
// Every choice reads world tiles only: the land a place carries (ir.land, the cell and its apron and 6 tiles more each side, from the generator's own window), so two places that draw the same world cell place the same piece there.
import { landOf, pieceOf, PIECES } from './relief.mjs';
import { cliffDecals as decalsOf } from './cliffrules.mjs';

export const FACE_COLUMNS = 3;   // P2: three plain face columns (48 x 144 each: crest row, mid row, dark base row), the lip's cell picks one by world position
export const faceKind = (k) => `cliff-face-${k + 1}`;
export const CAP_HANDS = ['w', 'e'];   // P3: the face's end caps, one per hand (48 x 144): the west cap on a south run's first cell, the east cap on its last
export const capKind = (hand) => `cliff-cap-${hand}`;
export const SHADOW_KINDS = ['cliff-shadow', 'cliff-shadow-w', 'cliff-shadow-e'];   // P4: the one-row dithered cast shade under the face's base (48 x 6, a taper at each end), drawn before the face of its line
export const WAYUP_U_KIND = 'cliff-way-up-u';   // the way up U: one 213 x 348 piece (alpha), anchored 93 px left and 126 px above the lip row cell of its area, drawn after the columns of its line
export const BANK_DUG_KIND = 'wayup-dug';   // the earth bank a Rupar has dug (ir.banks): one 96 x 192 piece (alpha), anchored on the bank's lip row and west column; the bake draws an undug bank with no decal, the page adds this one when the bank is dug (exploration/src/render/bank-decals.mjs)

// Every cliff decal of a level in draw order: [{ kind, x, y }] in game px, keeping only those that reach the place's picture. The one entry both bakes use.
export const cliffDecals = (ir, cliffs, cell = PIECES.cell) => decalsOf(ir, landOf(ir, cliffs), cell);

// The rows of the table that are still named empty slots for the art desk: [{ id, family, kinds }]
export const emptySlots = () => PIECES.pieces.filter((p) => p.state === 'empty').map(({ id, family, kinds }) => ({ id, family, kinds }));
export { pieceOf };
