# The meadow tileset (in progress)

**Not for the owner yet.** This is the tileset cut toward the approved scene `../mockup/b1/`, by the plan in internal `boards/art/terrain-tileset-plan.md`.

- **`sources/`**: the Gemini source sheets and their job files.
  - `meadow-src-walls-a1`: walls, caps and corners.
  - `-a2`: mostly a copy of a1, because a1 was given as an input. Its one long run is used.
  - `-a3`: five long wall runs.
  - `meadow-src-props-p1`: the props (bushes, ferns, boulders, reeds, flowers, the plank bridge), on flat magenta. b1 was its only input.
- **`walls/`** (made by `tools/cut-walls.py`).
  - 49 pieces: faces 1, 2 and 3 cells wide and two cells tall (one level, at b1's own scale), plus rounded caps.
  - Each piece's edges are cross-faded over 16 px to one join strip, so any piece joins any other. Seam step 0.31–0.36.
  - The pieces use only the meadow palette.
- **`water/`** (made by `tools/build-water-quarters.py`): the accepted two-tone pond as pieces.
  - Quarters for water cells, in the lips' 47-blob scheme, two frames each, plus the body fill.
  - Macro outer corners (2 × 2 cells, radius 60) round a pond's lobes, as b1's do.
  - The bank is inset 18 px, with corners rounded to 26 and 18 px and a wavering edge. Inside it: a 2 px foam line (continuous, broken every 23 px), the wet line, the shallow band and the body.
- **`props/`** (made by `tools/cut-props.py`): 15 props keyed from the props sheet, at b1's pixel size, on the meadow palette. The bridge is turned to run north to south and is two cells wide.
- **`proof/`** (made by `tools/tileset-map.py`): test map 4, built from tiles only on b1's own layout, beside b1 at the same size (`beside-b1-1x.png`).
  - The layout is b1's, read off its materials and snapped to the cell grid.
    - b1's upper steps are about 60 px, where one level here is 96 px. Its plateaus' south rims therefore sit up to a cell from b1's.
  - The light layer is b1's own bands, on b1's own lawn ramp.
  - Tufts are clustered, with sparse clover.
  - The rim hangs 6–12 px over each wall.
  - Props stand on contact shadows. b1's island is used as a macro piece.
  - **Test map 4 is not signed.**
    - Holds: the pond, the lawn's bands, the props and the stairs' places.
    - The gaps:
      - The walls are flat slabs, with straight bottoms and square ends, where b1's end in boulders and foliage and turn as side columns.
      - The round plateau's face steps, where b1's curves.
      - The stream runs straight.
      - The lawn is thinner in flecks and flowers than b1's.
