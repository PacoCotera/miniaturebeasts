# Terrain, grass biome: the scripted pass

**A candidate, not signed.** These are the cliff, stair and bridge pieces for the grass biome. They are drawn by script on the [signed 48 colours](../../palette/README.md) and laid on the review place's ground and shore tiles. No generated material is in this pass; the painted material pass comes next.

![The test map, clear, at 1×](proof/testmap-clear-1x.png)

*The test map at 1× under the clear table. It shows three levels with one-level steps, two stairs, a cliff standing in the stream and a bridge over the stream. Candidate.*

## Pieces (`pieces/`, made by `tools/build-cliffs.py`)

- **Cliff lip quarters, 24×24.** There are four corners (nw, ne, se, sw) in five states: fill, edgeh, edgev, outer and inner. They are overlays on the plateau's grass.
  - The north edge is a lit rock lip.
  - The west side is a lit rock strip, and the east side a strip in shade.
  - The south edge is the turf overhang above the face.
  - Every edge's ragged turf line is the same 24 px pattern, so quarters and tiles join.
- **Faces, 48×48.** A face is drawn on the cell below a plateau's south edge.
  - Its rock is laid in courses that lean, each piece lit at its top and left and shaded at its foot and right. There is soil under the turf and occlusion toward the foot.
  - The name gives each side's state: `e` is an open end, `c` continues into the next face or against the plateau's side. So the faces are `ee`, `ec`, `ce` and `cc`, with `cc-v` as a variant of the middle.
  - The courses are 0 at both tile edges, so any face joins any other.
- **Shadows and foam.**
  - `foot-shadow` falls on the cell under a face.
  - `side-shadow-e` falls on the lower cell east of a plateau's east side; the light is at the top left.
  - `foot-foam-1` and `foot-foam-2` are the foam where a face stands in water, in two frames.
  - Shade pixels are kept as masks in `pieces/shade/`. The cell underneath goes one DARK step there.
- **Stairs.** `stairs` replaces a face; `stairs-top` is its landing on the plateau cell above.
- **Bridge.** The east–west deck is `bridge-ew-w`, `-m` and `-e`; the north–south deck is `bridge-ns-n`, `-m` and `-s`. Each is an overlay, with posts at the ends and its shadow cast on the water.

## The level model drawn here

- Each cell has a height of 0 to 2 and may be water, which is height 0.
- A cell whose north neighbour is one level higher is a face cell.
- Layer order: water < low ground < cliff top.
- The proof script reports three cases as breaking the rules:
  - a plateau cell touching water;
  - a face with water on its east or west side;
  - a step of two levels.

## Checks (`tools/terrain-map.py`, `proof/checks.json`)

| Check | Result | Pass |
| --- | --- | --- |
| The test map obeys the junction rules | no breaks | yes |
| Off-palette or semi-transparent pixels, all pieces and maps (`check.py`) | 0 | yes |
| Rim class across every join between two plateau cells, over all 256 neighbourhoods | 0 px | yes |
| Rim class across every face-to-face join | 0 px | yes |
| Luminance step across plain-grass joins, against the step inside the tiles | 0.34 | yes (≤ 1.25) |
| Repeat: autocorrelation at 48 px, minus the mean at nearby lags, on plain grass | 0.387 | **no** (≤ 0.10) |

The repeat fails on the review place's own grass tiles, not on these pieces. The review place's current tiles score 0.319, round 10's 0.319 and round 8's 0.377. Its water tile repeats visibly too (the dark patches in the stream).

`proof/` holds the test map at 1× and 3×, under the clear, rain and fog tables, and in four greys.
