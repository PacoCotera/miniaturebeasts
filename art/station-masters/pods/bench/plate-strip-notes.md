# PA1: the Probe's plate strips, AD cut notes for the studio (10-15 04:37)

Pieces:
- `bench-plate-strip-t1-144x48`: three recesses, placed 1:1 at (264, 432).
- `bench-plate-strip-t2-192x48`: four recesses, placed 1:1 at (240, 432).

This is a hand cut from the signed pictures; nothing is painted new and there is no paid call. Write the cut as `bench/make-plate-strips.py SLICES_DIR` so it re-runs.

## Sources (masters-pods 5f04d417, `bench/slices/`)
- Foam: `bench-cradle-empty-480x288.png`. Crop rect (100, 110, 192, 48) is the flat inside of the cradle's cut-out: Rec.709 luma mean 55.2, std 0.4. Use x 100–243 of that crop for t1 and all of it for t2. Do not tile, mirror or stretch.
- Recess shape: the alpha of `bench-plate-gone-32x32.png`, thresholded at 128. It is the same silhouette as the whole plate (95% equal), so both plates fit it.

## Construction
All multiplies are in linear light, per channel, then rounded ties-to-even.

1. **Body:** rows 0–44, full width, alpha 255, corner radius 3 px (the corner pixels outside the radius are alpha 0).
2. **Strip edge, light from the top left:**
   - row 0 and column 0 of the body ×1.30 (lit);
   - the body's last row (44) and last column ×0.60.
3. **Recesses:** at (8 + 48 i, 8), 32×32; i = 0–2 for t1, 0–3 for t2. Inside the mask:
   - floor ×0.60;
   - the 2 px band on the top and left walls ×0.35 (the mask minus itself shifted down-right by 1 and by 2 px, in shadow);
   - the 1 px band on the bottom and right walls ×1.35 (the mask minus itself shifted up-left by 1, catching light).
4. **Contact shadow, baked:**
   - rows 45–47, from x 3 to the last column: ground #1d232b at alpha 45%, 30% and 15% (row 45 to row 47);
   - nothing on the left or top.
5. **Nothing else:** no label, number, lamp, highlight spot or texture added. Matte.

## Checks the studio runs before handing in
- Slice sizes are exact. Alpha is only 0 and 255, except shadow rows 45–47.
- Recess positions are exact: the first opaque recess pixel matches the gone mask's own bbox, offset by (8 + 48 i, 8).
- Readability on each recess at 1×, from a composite of each plate state into recess i = 0:
  - `bench-plate-whole-32x32` (L p50 185) must read as a whole white plate;
  - `bench-plate-gone-32x32` (its lit rim, L p95 119) must read as an outline.
  - Report the measured contrast of each against the recess floor.
- A 1× proof on the Probe bench background at the spec positions: `bench/plate-strips-proof-1x.png`, t1 and t2, each with one whole plate and one gone plate placed.

The AD signs each piece at 1× in the builder's whole-screen capture, beside the concept board 18c17261.
