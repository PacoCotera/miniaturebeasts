# The meadow tileset (in progress)

**Not for the owner yet.** This is the tileset cut toward the approved scene `../mockup/b1/`, by the plan in internal `boards/art/terrain-tileset-plan.md`.

- **`sources/`**: the Gemini source sheets and their job files.
  - `meadow-src-walls-a1`: walls, caps and corners.
  - `-a2`: mostly a copy of a1, because a1 was given as an input. Its one long run is used.
  - `-a3`: five long wall runs.
- **`walls/`** (made by `tools/cut-walls.py`).
  - 49 pieces: faces 1, 2 and 3 cells wide and two cells tall (one level, at b1's own scale), plus rounded caps.
  - Each piece's edges are cross-faded over 16 px to one join strip, so any piece joins any other. Seam step 0.31–0.36.
  - The pieces use only the meadow palette.
- **`proof/`** (made by `tools/tileset-map.py`): test map 1, built from tiles only, beside b1 (`beside-b1-1x.png`).
  - From tiles: the lawn (one flat base, b1's own tufts and clovers as decals off the grid), the light layer, the plateau edges, the walls, the stairs, the bridge and the props.
  - The pond is a placeholder until the water pieces are approved.
  - **A first pass.** The walls, stairs, bridge and seamless lawn hold. The plateau edges are still cell-aligned boxes with thin outlines, where b1 has thick overhanging grass rims on curves. The lawn base is darker and flatter than b1's, and the props carry boxes of b1's grass.
