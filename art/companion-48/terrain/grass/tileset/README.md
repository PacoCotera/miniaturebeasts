# The meadow tileset (in progress)

**Not for the owner yet.** This is the tileset cut toward the approved scene `../mockup/b1/`, by the plan in internal `boards/art/terrain-tileset-plan.md`.

- **`sources/`**: the Gemini source sheets and their job files.
  - `meadow-src-walls-a1`: walls, caps and corners.
  - `-a2`: mostly a copy of a1, because a1 was given as an input. Its one long run is used.
  - `-a3`: five long wall runs.
  - `meadow-src-props-p1`: the props (bushes, ferns, boulders, reeds, flowers, the plank bridge), on flat magenta. b1 was its only input.
- **`walls/`** (made by `tools/cut-walls.py`).
  - 49 pieces: faces 1, 2 and 3 cells wide and two cells tall (one level, at b1's own scale), plus caps.
    - Each cap's outer side is cut to a rounded, lumpy column with a dark outline.
  - 4 foot pieces (`tools/build-wall-feet.py`, run after `cut-walls.py`): grass clumps and pebbles that break a wall's bottom edge.
  - Side faces (`tools/build-side-faces.py`, run after `cut-walls.py`): a rock column down a plateau's west side (44 px, lit) or east side (28 px, shaded), its outer edge cut into 2–3 rounded boulders a cell.
    - One cell tall, three variants a side, plus rounded top and foot ends. Cut from the walls' own rock.
  - Each piece's edges are cross-faded over 16 px to one join strip, so any piece joins any other. Seam step 0.31–0.36.
  - The pieces use only the meadow palette.
- **`water/`** (made by `tools/build-water-quarters.py`): the accepted two-tone pond as pieces.
  - Quarters for water cells, in the lips' 47-blob scheme, two frames each, plus the body fill.
  - Macro outer corners (2 × 2 cells, radius 60 or 42) round a pond's lobes, as b1's do.
  - A beach piece (`beach-<side>`) carries a broad soft sand fan 40 px into the land, at the pond's lower-left. A stream bend piece (`bend-se`, 3 × 2 cells) turns a 2-wide stream one cell sideways as one S-curve.
  - Lobe pieces (2 cells along a straight shore, `lobe-<side>-<out|in>`) bulge the bank 10 px out or in on a half sine, so a pond's sides are curves. The shore swells 1 px per quarter, so mirrored quarters can't zigzag.
  - The bank is inset 18 px, with corners rounded to 26 and 18 px and a wavering edge. A 10 px sand beach; inside it a 2–3 px wet edge with foam flecks, the shallow band and the body.
- **`stairs/`** (made by `tools/cut-stairs.py`): the phase 1 stair pieces, under the spec's §6.1 names. They are cut from b1's own lower stair and its trodden earth.
  - `wide2x1-1`, `-2`: the south stair, 2 × 2 cells (one level). It is rebuilt from 7 of b1's 11 steps at b1's own pitch, between b1's stringers.
  - `landing-l/r`, `foot-l/r`: the earth at the stair's head and foot.
  - `top2x1`: the north stair top, cut into the rim. It shows four treads going down away from the camera, a step darker each.
  - `apron-top-l/r`: the earth inside a north stair top.
  - `side2x2-e`, `-w`: the side stairs. Each is the south stair turned so that its head meets the higher side.
- **`props/`** (made by `tools/cut-props.py`): 15 props keyed from the props sheet, at b1's pixel size, on the meadow palette.
  - The bridge is turned to run north to south and is two cells wide.
  - Its posts are redrawn upright in b1's 3/4 view: an oval cap, a round shaded front and a dark outline. The sheet drew them as side-view logs.
  - The posts' contact shadows are in `props/shade/`.
- **`proof/`** (made by `tools/tileset-map.py`): test map 12, built from tiles only on b1's own layout, beside b1 at the same size (`beside-b1-1x.png`).
  - The layout is b1's, read off its materials and snapped to the cell grid.
    - b1's upper steps are about 60 px, where one level here is 96 px. Its plateaus' south rims therefore sit up to a cell from b1's.
  - Depth: each level up is a step lighter on b1's lawn ramp (O3), the low basin a step under level 1. The ramp's pale top tone is never used; flecks past the top fold back down, so the high lawn keeps its saturation and texture.
  - The lawn is on b1's own seven-tone ramp: a band layer from a smooth field (broad, irregular, never cut by the tile grid) plus one fleck tile (b1's lawn less its bands), mirrored so it has no seams.
    - On top: clustered tufts, clover and sparse flowers.
  - The turf spills 10–40 px over each wall in lobes: the lawn itself carried over the edge, a lit lip and a ragged fringe of blades, in lumps and lobes. The faces carry moss and roots. A stacked face's top gives way to the face above, and the line between them is broken.
  - The pond is two lobes, with a pinch at the bridge. The bridge lands on b1's own trodden earth at both ends.
  - Foot pieces sit along every wall's bottom edge, with small boulders and ferns.
  - Props stand on contact shadows. b1's island is used as a macro piece.
  - The pond's lobes round on macro corners.
  - **Test map 12 is not signed.**
    - Holds at 1× beside b1: the pond, the lawn, the props, the wall feet and ends.
    - The gaps:
      - The pond's lobes are rounded rectangles, where b1's are free curves.
      - The side stairs are the south stair turned. They read as stairs but aren't yet drawn for their own view.

## The drop (`terrain/meadow/` on main, by PR)

`tools/build-meadow-drop.py OUT PROOF` writes the indexed drop from this tileset: six 8-bit indexed sheets, `meadow.json` (c2a-48px-spec §4.1, every piece `candidate` with its `offset`) and `meadow-palette.json`. All candidate.

- **Palette.** b1's meadow set: the core 48 at 0–47 unchanged, then the 48 meadow colours. Per decisions 2026-10-10 19:49 (8-bit, per-biome sets).
  - Each entry carries its DARK, LIGHT, DARK2, FOG and FADE. The core's are the page's own. The meadow greens step along the saturated lawn ramp; the other meadow colours step along their own material's ramp.
  - In the sheets, magenta's slot (44), used by no piece, is transparent through tRNS: every PLTE entry is in the table (spec §4.6).
- **Rebuilt on b1's look.** The older pieces under `grass/` were on the core 48.
  - Lawn: 6 tiles from b1's flecks at the middle level's tone, with tufts kept 8 px inside.
  - Lip: the 28 quarters, on the candidate geometry, by test map 12's edge rule.
  - Sand and deep: from the pond's bank and body.
  - Rock material: from the 1-wide faces.
  - Decals: greens moved onto the ramp.
- **Faces and caps** carry test map 12's turf spill over their top: 9–24 px lobes. Each piece's lobes fall to 10 px at its sides, so any face meets any other.
- **Props:** the magenta key's residue is gone (0 px of magenta, wine or plum).
- **Proof:** `proof/drop-place-*.png` (`tools/meadow-drop-proof.py`) is a place composed from the drop by the spec's §4.3 rules. Not composed there: the light layer and level tones (spec §12), and side columns.
