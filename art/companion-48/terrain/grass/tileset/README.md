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
  - The bank is inset 18 px, with corners rounded to 26 and 18 px and a wavering edge. Inside it: foam, the wet line, the shallow band and the body.
- **`props/`** (made by `tools/cut-props.py`): 15 props keyed from the props sheet, at b1's pixel size, on the meadow palette. The bridge is turned to run north to south and is two cells wide.
- **`proof/`** (made by `tools/tileset-map.py`): test map 3, built from tiles only, beside b1 (`beside-b1-1x.png`).
  - From tiles: the lawn (one flat base, b1's own tufts and clovers as decals off the grid), the light layer, the plateau edges, the walls, the stairs, the bridge and the props.
  - b1's own island is used as a macro piece, with its water keyed out.
  - **Test map 3, closer to b1 but not signed.**
    - Holds: the walls, stairs, the props sheet's bridge, bushes, ferns, boulders, reeds and flowers, b1's island, the seamless lawn and its light patches, and the plateau edges.
    - The gaps:
      - The layout is boxier than b1's. b1's walls step down in L-turns and show side cliffs. Those still need corner and side-face pieces.
      - The pond's shore turns on the cell grid, and its sand bank is thinner than b1's.
      - The lawn's decals read darker than b1's lighter flecks.
