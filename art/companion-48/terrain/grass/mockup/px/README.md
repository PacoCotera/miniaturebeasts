# The mockup redrawn on the extended palette

**For the owner's review. Not signed.**

![The cliffs: the 48 (left) and the pixel pass, cleaned (right), at 1×](beside-cliffs-1x.png)
![The pond: the 48 (left) and the pixel pass, cleaned (right), at 1×](beside-pond-1x.png)

*Each screen at 1×: on the left, the approved painting on the 48 colours; on the right, the hand pass on the 77 (`screen-*-hand-1x.png`). The 3× versions are `screen-*-hand-3x.png`. The earlier cleaned pass (`screen-*-clean-*`) is kept for the record.*

- **The pixel pass.** Retro Diffusion `rd_plus__topdown_map` redrew each screen in six overlapping 256 px tiles.
  - Each tile was made img2img from the painting at strength 0.45, with one seed, and the 77-colour proposal (`../../../../palette/extended/palette-ext-strip.png`) as its palette.
  - The tiles are in `../../sources/px/`, each with its sidecar.
- **Assembly** (`tools/px-assemble.py`):
  - each tile's tone is matched to the painting crop it came from;
  - each pixel comes from the tile it is most central in, with a 16 px cross-fade between tiles;
  - the result is snapped to the 77 and cleaned of stray pixels.
- **The hand clean** (`tools/px-keep.py`). Where the pass drifted from the approved painting, the painting on the 77 is put back, with a 6 px cross-fade. The drifts were:
  - the stairs turned into a stone block;
  - the reeds turned into stumps, and the island moved;
  - a stray post appeared;
  - a hard-edged shadow rectangle was drawn.
  Everywhere else the pass stays: the boulders' shading and borders, the cliff in the water, the planks.
- **Checks.** Both screens use only the 77 colours.

## The hand pass (`tools/terrain-hand-pass.py`), after the programme lead's review of the cleaned pass

- **Base.** The painting on the 77 is the base, with its roots, posts, lawn and shoreline as painted.
- **What the pixel pass keeps.** Only where it did better: rock where both are rock, and planks inside the bridge's box. Named boxes keep the painting whatever the pass did: the stairs, the posts and the foam at the cliff's foot.
- **Grass.** Tuft clusters on whole grass: three to six blades, each with a dark outline, a body a step under the ground and a lit tip two steps over it. They are seeded on a 13 px jittered grid.
- **Water.** A bank shadow two steps darker on the 1–3 px under every bank. Ripple highlights on open water: a 3–6 px dash two steps lighter, with one brighter pixel.
- **Shore.** A light wet line at the water, a mid sand band and a dark edge against the grass. Never on rock, wood or the bridge.
- **Checks.** Both screens use only the 77 colours: the cliffs 43, the pond 61.
