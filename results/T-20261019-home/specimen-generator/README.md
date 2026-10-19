# The specimen generator (v3), for Home H4

The Library specimen generator, copied unchanged except for comments, for Home's Library module (build spec section 4.2). The runtime it is ported to is ruled in `../specimen-runtime.md`: a pure-JS port to `prototypes/station/src/specimen.mjs` on the `paint2d.mjs` canvas subset, with a Playwright oracle against this file.

## Files

- `specimen3.js`: the generator, an ES module drawing on a 2D canvas context (`model`, `layout`, `drawForm`, `finish`, `glint`, `pictogram`, `lookColours`).
- `frames/species-S01.json`: its input for the Loika (frame version 4).
- `states/{early,mid,late,new}.json`: the four discovery states the art director signed the tone on.

## The signed Home harness (section 4.2)

- 344 × 362, supersampled 2×.
- scale 1.0, centre (W/2 + 5, H/2 + 4).
- `finish` with grain 4 and vignette 0.45.
- No edge gradient: the window's inner shade replaces it.
- Every state keeps 12 px clear of each window edge.
- The output is the RGB picture as-is (not snapped to the palette), plus the bead centres; the four breathing levels are made the same way.
