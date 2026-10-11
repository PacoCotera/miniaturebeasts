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
- **`water/`** (made by `tools/build-water-quarters.py`): the accepted two-tone pond as pieces.
  - Quarters for water cells, in the lips' 47-blob scheme, two frames each, plus the body fill.
  - The bank is inset 18 px, with corners rounded to 26 and 18 px and a wavering edge. Inside it: foam, the wet line, the shallow band and the body.
- **`proof/`** (made by `tools/tileset-map.py`): test map 2, built from tiles only, beside b1 (`beside-b1-1x.png`).
  - From tiles: the lawn (one flat base, b1's own tufts and clovers as decals off the grid), the light layer, the plateau edges, the walls, the stairs, the bridge and the props.
  - **Test map 2, still short of b1.**
    - Holds: the walls, stairs, bridge, the seamless lawn on b1's lit tone, flat light patches, the level values, and plateau edges with a lit rim, blades over the edge and a stepped shadow.
    - The gap: shore and plateau outlines still follow the 48 px cell grid between rounded corners, where b1's wind freely.
