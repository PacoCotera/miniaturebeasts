The stone family: tall (the heart's stone) and two field-stone bodies, small (a) and small b, in plain, charged-1/2, warm-1/2, warm-still and spent, each at 16 px wide (the map and look-view master) and 48 px (the walk's 1x: the same 48 x 72 and 48 x 48 canvases). Small b is `stone-small-b-<state>@<res>`; a field stone takes one of the two bodies by its own hash and keeps it in every state.
Painted by the art desk (fal Nano Banana Pro edits, the rest by palette maps), signed by the art director, copied byte for byte from mibi-art branch art/art-fix-map-pieces, art-jobs/2026-11-11-art-fix-map-pieces/out/:
- plain: small and small b from a2 (a2 `stone-small-b` is small b plain); tall from a2b (a2's tall remapped onto small's grey).
- charged-1/2: small and tall from a2b (a stone never changes body when struck: the signed plain body with blue-white cracks, one step darker and cooler); small b from a3.
- warm-1/2/still: a3b for small, small b and tall (the plain body with only its lit top pale ochre; tall re-done by a3c over the upper third of the lit face); no cracks, no orange.
- spent: a3, the plain picture of each body (a collected field stone stays as it was).
The anchor is the foot, the last opaque row, centred on the tile (tall: row 22 of the 16 px master, row 68 of the 48 px; small: row 14 and row 44). The small bodies are 11 px tall or less (walk-over).
There is no ring on a warm stone and no painted bolt on a charged one (the one bolt is the take mark in the UI). The old charged stones (pick C) and the old plain, warm and spent family are replaced.
The colours are not all on the core palette: the page keeps each file as a picture and adds its colours to the screen's allowed set. SHA256.json records each file as placed; tests/stone-art.test.mjs checks them.
The look view's three stone marks (look-heart-stone, look-take-charge-*, look-take-warm-*) are in art/look/, from the earlier family (the desk has not re-issued them).
