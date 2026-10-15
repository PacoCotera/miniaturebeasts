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

## A6: the map pawn, 16 px (AD, 10-15, 0 MXN)

`c-map-pawn-16-{down,up,left,right}.png` are 16 × 17, the same box and anchor as `ICON.pawn` (blitted at cx − 8, cy − 10), so they drop in. `right` is `left` mirrored. Built by `pawn/make-map-pawn.py OUT` on the core 48, with alpha 0 or 255.

- **The figure.** It is the explorer of `playerArt` at map size:
  - the orange hood and suit, lit amber at the top left and shaded rust at the lower right;
  - a blush face in a cream opening, with ink eyes;
  - a soil belt, the amber lantern at the hip, and slate boots.
- **The silhouette.** A 2 px ink silhouette (a disk of radius 2) goes all round it. It is ink, not void, because void is the off-map colour.
- **Proof.** `pawn/proof/map-pawn-on-lands-{1,4}x.png` shows the four facings on the ten land swatches and on the cloud fill.
  - The ink ring carries the pawn on light ground: lawn, sand and cloud.
  - The orange carries it on dark ground: deep water, pine and night.

The 48 px tier-1 pawn waits for the animator's pawn. These four files are candidates until the AD signs them in the S4 map capture.

## A1: the cloud set (AD, 10-15, 0 MXN)

`cloud/make-cloud-set.py OUT` cuts 96 pieces into `cloud/pieces/`, at the three map scales (cs = 72, 48, 26). They are on the core 48, with alpha 0 or 255, nothing off-palette, and lavender only in cloud.
- The fill is the signed `c-cloud-fill-48`. Every piece uses the fill's own language:
  - dome heaps in four bands (stone, mist, fog, lavender) broken by the 4×4 Bayer;
  - a slate line where cloud meets land;
  - a stone crease where it sits on more cloud.
- LAP is cs // 9: 8 px at 72, 5 px at 48, 2 px at 26. No piece reaches further than that into seen land.
- **The pieces:**
  - `c-cloud-heap-{cs}-{1..8}`: free heaps, from 48×32 to 128×72 at 72 and 48, halved at 26. They are lit from the top left, with their own checkered cast shade to the lower right.
  - `c-cloud-rim-{cs}-{n,e,s,w}-{a,b}`: the band along an unknown cell's edge that faces seen land.
    - Two billows of three heaps each, one big and one small, sit over a low ridge. The script asserts that the ridge covers the whole edge line.
    - A joint heap is centred on each cell corner and is the same in every variant, so neighbouring rims meet as one heap.
    - The light is the island side blended with the top left. Slate on the island side, a stone crease on the cloud side.
  - `c-cloud-rim-{cs}-out-{ne,nw,se,sw}`: the outer corners. `c-cloud-rim-{cs}-in-{ne,nw,se,sw}`: the inner corners, where the diagonal is seen.
  - `c-cloud-lap-{cs}-{n,e,s,w}-{a,b}`: the lapping-edge pieces, two per facing. They make the island's edge uneven.
- **The placement rule** is signed with the pieces. `cloud/place-cloud.py` is the reference for `view.mjs`'s pure integer function: (seed, revealed set, scale) → the list of (piece, x, y) in draw order. Its docstring gives the rule:
  1. fill;
  2. rims;
  3. outer and inner corners;
  4. heaps, drawn after the rims;
  5. laps.
- **The hash.** Any fixed 32-bit integer hash will do; the reference uses FNV-1a over little-endian int32s.
- **The heap test.** A heap is placed only if none of its opaque pixels lies more than LAP inside seen land, by Chebyshev distance in pixels.
- **Check.** `check_lap` runs for seeds 1, 2, 7 and 35 at each scale; it is S3 test 3, and it passes.
- **Shade.** The DARK step at 2 or more cells from seen land and DARK2 at 4 or more, plus the beacon sweep, stay as spec C.5 has them, in code.
- **Proof:**
  - `cloud/proof/island-{72,48,26}-1x.png`: an island on lawn, with the fill, rims, corners, heaps and laps placed by the rule;
  - `island-26-2x.png`;
  - `pieces-1x.png`: every piece.
- **What I'd still watch** in the S3 capture:
  - The rim is calmer than the free heaps. It is flatter on purpose, so the edge reads as one bank, but the island's outline is still fairly even. The laps carry most of the unevenness.
  - At 72 the signed fill's 48 px repeat shows under the cloud.

All 96 are candidates until I sign them in the S3 map captures.
