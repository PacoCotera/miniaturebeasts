The edge veil: a cool blue-grey veil over the coast's deep water and along the region sides that face unopened land. Day and night copies of each piece, cut from the art desk's signed painting.
Source: mibi-art art/desk, art-jobs/2026-11-11-art-paint-coast-fog/out/ (commit 39a625d1f). Copied byte for byte; never edit here, re-sign at the desk. SHA256.txt records each file as placed.

Slots (base orientation: a west side, the dense edge at the left, rows run along the edge; the page flips and turns each piece for the other sides):
- edge-veil-{day,night}.png      144 x 240  the straight strip, 3 tiles across (the signed single layer; kept as the still reference)
- edge-veil-drift-{a,b}-{day,night}.png  144 x 240  two seamless layers that stack to the strip; they drift past each other along the edge line (a one way, b the other), 1 art px (3 px at 1x) a step at 3 steps a second
- edge-veil-end-{day,night}.png  288 x 288  the band's end: the sea half at the left (the left 144 px lie outside the place), the band at the right, full at the bottom, gone at the top
- edge-veil-outer-{day,night}.png 144 x 144 an outer corner (dense on the left and the top)
- edge-veil-inner-{day,night}.png 144 x 144 an inner corner (the veiled land lies up and left)
- map-edge-veil-{day,night}.png   78 x 130  the map's veil, 3 cells at 26 px a cell, static

PLACEHOLDERS: outer, inner and end were computed outlines (veil2.py, veil3.py); the art desk is repainting them (art-paint-veil-corners). Replace with the signed files when they exist; the file names and sizes stay.
