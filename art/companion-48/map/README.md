# The Companion map's pieces (X34 c), by hand on the core 48, 0 MXN

All pieces are made by `make-map-pieces.py`, alpha 0/255, no void, and checked against the core 48. Each is a candidate until the art director signs it at 1× in the builder's map capture.

- **The heading arrow:** one arrow shape for the storm's and the fog bank's direction, in two colourings.
  - Storm: `c-heading-storm-16-{n,ne,e,se,s,sw,w,nw}.png`, ice and sky with an ink outline.
  - Fog bank: `c-heading-fog-16-*`, fog and mist with a slate outline.
- **The rain sheet:** `c-rain-48-{a,b}-f{0,1}.png`, a tileable 48×48 streak tile.
  - Lean a, light: 1 px across per 3 down. Lean b, heavy: 1 per 2.
  - Frame 1 is frame 0 moved along its lean, so the loop is seamless.
  - Edge strip: `c-rain-edge-48x16.png`, the streaks thinning out over 16 rows.
- **The cloud bank's fill:** `c-cloud-fill-48.png`, tileable heaps lit from the top left over a lower layer. The bands are stone, mist, fog and a lavender crest; lavender is for the cloud only.
  - The heaps, rims and lapping edges, with their placement rule, come with the full cloud set (A1).

**Inset swatch indices (A3)**, explored then seen (one DARK step, as the places' fade):

| Land | Explored | Seen |
|---|---|---|
| lawn | leaf | forest |
| dark lawn | forest | pine |
| sand | sand | clay |
| water | sea | deep |
| rock | stone | slate |
