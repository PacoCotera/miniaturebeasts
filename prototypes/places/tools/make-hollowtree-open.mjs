// The Hollow Tree in the open style (walk content B7): 24 x 28, no edge ring, every side runs on into the next cell. Writes art/places/ldtk/places/HollowTree.ldtkl from the layout below
// (hand-placed rectangles and points; the shared writer and the art desk's meadow-decor density rule are in open-level-lib.mjs). Re-running gives the same file. LDtk opens the result.
//   node prototypes/places/tools/make-hollowtree-open.mjs
import { ground, writeLevel, T } from './open-level-lib.mjs';

const HX = 14, HY = 13;   // the heart; the hollow tree stands just north of it
const g = ground();
g.rect(13, 12, 3, 3, T.EARTH);                                   // the heart's clearing (radius 1.5), the heart at its middle, the great tree on its north row
g.rect(19, 14, 3, 5, T.THICKET); g.set([[19, 14], [21, 18]], T.GRASS); g.set([[18, 16]], T.THICKET);   // a dense thicket in the east, its edge uneven
g.rect(4, 18, 4, 2, T.SCRUB);                                    // low scrub, a soft stretch under the western trees
g.set([[16, 25], [16, 24], [16, 23], [15, 22], [15, 21], [15, 20], [15, 19], [15, 18], [15, 17]], T.PATH);   // the road from the south, ending short of the clearing
g.set([[3, 14], [4, 14], [5, 14], [6, 14], [7, 14], [8, 13], [9, 13], [10, 13], [11, 13]], T.PATH);   // a footpath from the west, ending short of the clearing

writeLevel({
  file: 'HollowTree', tag: 'hollow-open', terrain: g.t,
  props: [
    ['tree-hollow', HX, HY - 1],
    // groves of 3-5 trees whose crowns touch, glades between, a few trees standing alone (never rows, rings or an even grid: the bake rule grove-lattice)
    ['tree-broad', 4, 7], ['tree-autumn', 6, 6], ['tree-broad', 5, 9], ['tree-autumn', 7, 8], ['tree-broad', 8, 10],     // the grove in the north-west
    ['tree-broad', 17, 6], ['tree-autumn', 19, 5], ['tree-broad', 18, 8],                          // the grove in the north-east
    ['tree-autumn', 4, 22], ['tree-broad', 6, 23], ['tree-autumn', 5, 24], ['tree-broad', 3, 25],  // the grove in the south-west
    ['tree-broad', 10, 22], ['tree-autumn', 12, 23], ['tree-broad', 11, 25],                       // the grove in the south
    ['tree-autumn', 19, 21], ['tree-broad', 20, 23], ['tree-autumn', 18, 24],                      // the grove in the south-east
    ['tree-autumn', 11, 4], ['tree-broad', 8, 17], ['tree-broad', 20, 11],                         // lone trees
    ['bush-small', 11, 16], ['bush-small', 17, 14], ['bush-small', 8, 12]],
  heart: { x: HX, y: HY, fields: { kinds: ['moment', 'nest'], species: ['hiljan'], revealLine: 'A Hiljan watches a fruit roll among the roots.', reachBy: 'none' } },
  clue: { x: 8, y: 24, fields: { tell: 'prints', path: [{ cx: 8, cy: 24 }, { cx: 8, cy: 21 }, { cx: 10, cy: 19 }, { cx: 12, cy: 17 }, { cx: 13, cy: 15 }, { cx: 14, cy: 14 }] } },
  finds: [[17, 16, ['pod'], 1], [11, 8, ['fruit', 'dew'], 1], [16, 21, ['stone'], 1], [6, 13, ['pod', 'fruit'], 0.5], [15, 6, ['fruit', 'dew'], 0.5], [9, 25, ['stone', 'material'], 0.5], [21, 3, ['dew'], 0.5], [10, 11, ['pod', 'material'], 0.5]],
  landmark: { x: HX, y: HY - 1, prop: 'tree-hollow', label: 'the hollow tree' },
  openings: [['N', 6, 0, 12, 1], ['S', 8, 27, 14, 1], ['W', 0, 8, 1, 14], ['E', 23, 4, 1, 10]],
  spawns: [[2, 15, 4, 3, []], [17, 2, 4, 3, []], [9, 14, 3, 2, ['hiljan']]],
  mood: 'Dappled and hushed; groves of broad trees with the meadow running on between them past every side, a dense thicket in the east, and the great hollow tree on its worn clearing.',
});
