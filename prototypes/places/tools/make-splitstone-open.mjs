// The Split Stone in the open style (walk content B9): 24 x 28, no edge ring, every side runs on into the next cell. Writes art/places/ldtk/places/SplitStone.ldtkl from the layout below
// (hand-placed rectangles and points; the shared writer and the art desk's meadow-decor density rule are in open-level-lib.mjs). Re-running gives the same file. LDtk opens the result.
//   node prototypes/places/tools/make-splitstone-open.mjs
import { ground, writeLevel, T } from './open-level-lib.mjs';

const HX = 10, HY = 14;   // the heart; the split stone stands on the north row of its clearing
const g = ground();
g.blob(10, 13.5, 6.5, 5, T.SAND); g.blob(15.5, 9, 5, 3.5, T.SAND); g.blob(8, 18.5, 5, 3, T.SAND); g.blob(16.5, 17, 4.5, 3.5, T.SAND);   // the sun-baked flats, lobes of sand that run into one another, grass all round them
g.rect(18, 22, 4, 4, T.THICKET); g.set([[18, 22], [21, 25]], T.GRASS);                            // a dense thicket in the south-east, its corners rounded
g.rect(13, 11, 2, 2, T.SCRUB);                                                                         // low scrub in the sand, a soft stretch north-east of the stone
g.rect(9, 13, 3, 3, T.EARTH);                                                                          // the heart's clearing (darker worn earth, not more sand), the heart at its middle
g.set([[10, 17], [10, 18], [10, 19]], T.EARTH);   // a trodden trail from the south across the sand, ending inside it (earth never meets the sand's edge)
g.set([[13, 14], [14, 14], [15, 14]], T.EARTH);              // a trodden trail from the east

writeLevel({
  file: 'SplitStone', tag: 'splitstone-open', terrain: g.t,
  props: [
    ['split-stone', HX, HY - 1],
    // boulder clumps of 3-4 that touch, glades between, a few stones on their own (never rows, rings or an even grid: the bake rule grove-lattice)
    ['boulder-grey', 3, 5], ['boulder-brown', 5, 4], ['boulder-grey', 4, 7],                                // the north-west, on the grass
    ['boulder-brown', 17, 3], ['boulder-grey', 19, 4], ['boulder-brown', 20, 6],                            // the north-east, on the grass
    ['boulder-grey', 18, 12], ['boulder-brown', 19, 14], ['boulder-grey', 17, 15],                          // the east, in the sand
    ['boulder-brown', 6, 17], ['boulder-grey', 8, 19], ['boulder-brown', 6, 20],                            // the south-west, in the sand
    ['boulder-grey', 13, 23], ['boulder-brown', 15, 24], ['boulder-grey', 12, 25],                          // the south, on the grass
    ['boulder-brown', 3, 13], ['boulder-grey', 14, 17], ['boulder-brown', 20, 20],                          // on their own
    ['tree-broad', 11, 4], ['tree-autumn', 13, 5]],                                                         // two trees on the grass in the north
  heart: { x: HX, y: HY, fields: { kinds: ['moment', 'stone'], species: ['tuikis'], revealLine: 'A Tuikis settles in the warm crack.', reachBy: 'none' } },
  clue: { x: 9, y: 23, fields: { tell: 'prints', path: [{ cx: 9, cy: 23 }, { cx: 10, cy: 20 }, { cx: 10, cy: 18 }, { cx: 10, cy: 16 }, { cx: 10, cy: 15 }] } },
  finds: [[13, 8, ['pod'], 1], [7, 11, ['fruit', 'dew'], 1], [16, 18, ['stone'], 1], [8, 16, ['pod', 'fruit'], 0.5], [16, 12, ['fruit', 'dew'], 0.5], [20, 17, ['stone', 'material'], 0.5], [8, 24, ['dew'], 0.5], [14, 20, ['pod', 'material'], 0.5]],
  landmark: { x: HX, y: HY - 1, prop: 'split-stone', label: 'the split stone' },
  openings: [['N', 8, 0, 10, 1], ['S', 5, 27, 10, 1], ['W', 0, 9, 1, 12], ['E', 23, 4, 1, 9]],
  spawns: [[2, 16, 3, 3, []], [14, 18, 4, 3, []], [11, 9, 3, 2, ['tuikis']]],
  mood: 'Sun-baked and still; a great split boulder with a warm crack on its worn clearing, stone clumps scattered over the sand and the grass running on past every side.',
});
