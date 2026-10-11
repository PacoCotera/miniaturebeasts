# Terrain, grass biome: the first slice

**A candidate, not signed.** These are the cliff, stair and bridge pieces for the grass biome, and a new grass ground. Everything is on the [signed 48 colours](../../palette/README.md).
- **Paid materials:** the rock, the planks and the water come from one Gemini painting and Retro Diffusion tiles (see Materials).
- **Scripted:** the edges, the joins and the shapes.
- **The review place's:** the sand. The shore is cut again from the new grass.

![The test map, clear, at 1×](proof/testmap-clear-1x.png)

*The test map at 1× under the clear table. It shows three levels with one-level steps, two stairs, a cliff standing in the stream and a bridge over the stream. Candidate.*

## The ground (`ground/`, `decals/`, `shore/`, made by `tools/build-meadow-decals.py` and `tools/build-shore.py`)

The review place's grass tiles keep their tuft patches 12 px clear of the edges, so at 1× the patches line up on the 48 px grid. Here the ground is split in two:

- **Bodies.** `body1` to `body4` are grass with single-pixel specks and short blades, and nothing for the eye to find again 48 px later.
- **Decals.** The tuft patches, tall grass and flowers are cut from the review place's own tiles. A seeded rule places them on a 23 px jittered grid, which shares no period with the tiles, as the ripples are placed on water.
  - They go only where their whole footprint lies on plain ground.
  - The page can place them the same way.
- **Shore.** The shore set is cut again from `body1`.

## Materials (`materials/`, made by `tools/terrain-materials.py` from `sources/`)

Every input is project-owned: our own meadow still and our own test map. No third-party image was used.

| Source | Made by | Used for |
| --- | --- | --- |
| `sources/terrain-grass-cliffs-a1.jpg` | Gemini Pro, 1K: our test map repainted in the meadow still's style | water bodies `water1`–`water3`, and the crops fed to Retro Diffusion |
| `sources/t-rock-rd.png`, `t-rock2-rd.png` | Retro Diffusion `rd_tile__single_tile`, 48 px, img2img from two rock crops of the painting, with `palette.png` as the palette | the faces: `face-rock`, `face-rock2` |
| `sources/t-planks-rd.png` | the same, from the painting's bridge | the bridge decks |
| `sources/t-waterA-rd.png`, `t-waterB-rd.png` | the same, from the painting's stream | **not used**: both came back as one flat colour |

How the sources are made usable:
- **Rock:** made to repeat left to right by cross-fading each tile with itself rolled by half a tile. The second rock's 10 px edge bands fade into the first rock's edges, so the two join in any order.
- **Planks:** made to repeat both ways.
- **Water:** three painting crops, area-averaged to 48 px and made to repeat both ways. They are calm, so their life comes from the review place's ripple sprites and short dark streaks, placed by a seeded rule on a 31 px grid that shares no period with the tiles, as the meadow decals are.

Each source's sidecar `.json` holds its prompt, input hash and cost.

## Pieces (`pieces/`, made by `tools/build-cliffs.py`)

- **Cliff lip quarters, 24×24.** There are four corners (nw, ne, se, sw) in five states: fill, edgeh, edgev, outer and inner. They are overlays on the plateau's grass.
  - The north edge is a lit rock lip, five rows deep.
  - Inside every ledge the grass is one DARK step darker, fading over 8 px. This makes a ledge read as a rise, not as an outline.
  - The west side is a lit rock strip, and the east side a strip in shade.
  - The south edge is the turf overhang above the face.
  - Every edge's ragged turf line is the same 24 px pattern, so quarters and tiles join.
- **Faces, 48×48.** A face is drawn on the cell below a plateau's south edge.
  - With `materials/`, the rock is `face-rock`, and `face-rock2` on the variant, with occlusion toward the foot.
  - Without `materials/`, the script lays its own rock: courses that lean, each piece lit at its top and left and shaded at its foot and right.
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
| Luminance step across every face-to-face join, against the step inside | 0.96 | yes (≤ 1.25) |
| Luminance step across plain-grass joins, against the step inside the tiles | 1.13 | yes (≤ 1.25) |
| Repeat: autocorrelation at 48 px, minus the mean at nearby lags, on plain grass | 0.016 | yes (≤ 0.10) |

**The repeat check, before and after.** On the review place's grass tiles the repeat scores 0.387 (the current tiles 0.319, round 10's 0.319, round 8's 0.377). Bodies with decals score 0.016.

**Still open:**
- A long cliff wall alternates the two rocks, so a faint two-tile rhythm shows at 2×.
- The plateaus' north, east and west sides are 6 px rock strips. The painting casts a broad shadow there that this pass does not have.
- The stairs are scripted.

`proof/` holds the test map at 1× and 3×, under the clear, rain and fog tables, and in four greys.
