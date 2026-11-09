// Reedpool in the open style (walk content B9): 24 x 28, no edge ring, every side runs on into the next cell. Writes art/places/ldtk/places/Reedpool.ldtkl from the layout below
// (hand-placed rectangles and points; the shared writer and the art desk's meadow-decor density rule are in open-level-lib.mjs). Re-running gives the same file. LDtk opens the result.
//   node prototypes/places/tools/make-reedpool-open.mjs
import { ground, writeLevel, T } from './open-level-lib.mjs';

const HX = 15, HY = 11;   // the heart, on the island; the island stone stands on the north row of its clearing
const g = ground();
g.blob(13.5, 10, 4.8, 5.8, T.WATER);       // the pond in the north
g.ring(T.WATER, T.SAND);                   // the shore, a ring of sand about the water
g.blob(13.5, 6.8, 0.9, 1.0, T.DEEP);        // its deep middle, a pool north of the island with water all round it
g.rect(13, 9, 5, 5, T.SAND);               // the island, a sand bank in the pond
g.set([[10, 11], [11, 11], [12, 11]], T.SAND);   // the sand spit from the west shore out to the island
g.rect(2, 16, 3, 3, T.THICKET);            // a dense thicket in the west
g.rect(14, 10, 3, 3, T.EARTH);            // the heart's clearing (darker worn earth, not more sand), the heart at its middle
g.set([[4, 11], [5, 11], [6, 11]], T.EARTH);   // a trodden trail from the west to the shore, ending short of the sand

writeLevel({
  file: 'Reedpool', tag: 'reedpool-open', terrain: g.t,
  props: [
    ['boulder-grey', HX, HY - 1],
    // groves of 3-4 trees whose crowns touch, glades between, a few trees and stones on their own (never rows, rings or an even grid: the bake rule grove-lattice)
    ['tree-broad', 4, 7], ['tree-autumn', 6, 6], ['tree-broad', 5, 9], ['tree-autumn', 7, 8],     // the grove in the north-west
    ['tree-autumn', 4, 20], ['tree-broad', 6, 21], ['tree-autumn', 5, 23], ['tree-broad', 3, 22],  // the grove in the south-west
    ['tree-broad', 9, 22], ['tree-autumn', 10, 24], ['tree-broad', 8, 25],                          // the grove in the south
    ['tree-autumn', 18, 21], ['tree-broad', 20, 23], ['tree-autumn', 19, 24],                      // the grove in the south-east
    ['tree-autumn', 9, 4], ['tree-broad', 8, 18], ['tree-broad', 20, 19],                          // trees on their own
    ['boulder-brown', 14, 18], ['boulder-grey', 15, 19], ['boulder-brown', 3, 15]],                // a few stones
  heart: { x: HX, y: HY, fields: { kinds: ['moment', 'nest'], species: ['loika'], revealLine: 'A Loika shakes the pond off on the island stone.', reachBy: 'none' } },
  clue: { x: 4, y: 11, fields: { tell: 'prints', path: [{ cx: 4, cy: 11 }, { cx: 6, cy: 11 }, { cx: 8, cy: 11 }, { cx: 10, cy: 11 }, { cx: 12, cy: 11 }, { cx: 14, cy: 11 }] } },
  finds: [[5, 14, ["pod"], 1], [11, 17, ['fruit', 'dew'], 1], [20, 16, ['stone'], 1], [8, 14, ['pod', 'fruit'], 0.5], [14, 3, ['fruit', 'dew'], 0.5], [19, 6, ["stone", "material"], 0.5], [18, 18, ['dew'], 0.5], [13, 25, ['pod', 'material'], 0.5]],
  landmark: { x: HX, y: HY - 1, prop: 'boulder-grey', label: 'the island stone' },
  openings: [['N', 4, 0, 8, 1], ['S', 14, 27, 8, 1], ['W', 0, 8, 1, 10], ['E', 23, 13, 1, 9]],
  spawns: [[2, 12, 3, 3, []], [15, 17, 3, 2, []], [6, 13, 3, 2, ["loika"]]],
  extra: [{ id: "ReedBank", x: 11, y: 3, w: 6, h: 3 }, { id: "ReedBank", x: 18, y: 7, w: 2, h: 6 }],
  mood: 'Cool and glittering; a pond in the north with a sand spit out to the island stone, reeds along its banks and the meadow running on past every side.',
});
