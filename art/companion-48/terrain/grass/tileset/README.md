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
  - Each piece's edges are cross-faded over 16 px to one join strip, so any piece joins any other. Seam step 0.31–0.36.
  - The pieces use only the meadow palette.
- **`water/`** (made by `tools/build-water-quarters.py`): the accepted two-tone pond as pieces.
  - Quarters for water cells, in the lips' 47-blob scheme, two frames each, plus the body fill.
  - Macro outer corners (2 × 2 cells, radius 60 or 42) round a pond's lobes, as b1's do. The shore swells 1 px per quarter, so mirrored quarters can't zigzag.
  - The bank is inset 18 px, with corners rounded to 26 and 18 px and a wavering edge. Inside it: a 2 px foam line (continuous, broken every 23 px), the wet line, the shallow band and the body.
- **`props/`** (made by `tools/cut-props.py`): 15 props keyed from the props sheet, at b1's pixel size, on the meadow palette. The bridge is turned to run north to south and is two cells wide.
- **`proof/`** (made by `tools/tileset-map.py`): test map 6, built from tiles only on b1's own layout, beside b1 at the same size (`beside-b1-1x.png`).
  - The layout is b1's, read off its materials and snapped to the cell grid.
    - b1's upper steps are about 60 px, where one level here is 96 px. Its plateaus' south rims therefore sit up to a cell from b1's.
  - The lawn is on b1's own seven-tone ramp: the band layer (b1's own bands) plus fleck tiles (b1's lawn less its bands, three 96 px variants).
    - On top: clustered tufts, clover and sparse flowers.
  - The turf hangs 6–26 px over each wall, in lumps and lobes. The faces carry moss and roots. A stacked face's top gives way to the face above, and the line between them is broken.
  - The pond is two lobes, with a pinch at the bridge. The bridge lands on b1's own trodden earth at both ends.
  - Foot pieces sit along every wall's bottom edge, with small boulders and ferns.
  - Props stand on contact shadows. b1's island is used as a macro piece.
  - The pond's lobes round on macro corners.
  - **Test map 6 is not signed.**
    - Holds at 1× beside b1: the pond, the lawn, the props, the wall feet and ends.
    - The gaps:
      - The pond's lobes are rounded rectangles, where b1's are free curves.
      - The stream runs straight, with no side cliffs. b1 has a rock column at its top left and a cliff along the stream; those wait on the side-face pieces.
