# T-20261016-16: the Incubator's stamp plate (AD, 10-16, by hand in code)

`stamp-plate-120x120`, 120 × 120, placed 1:1 at (804, 232) (`frame.json regions.stampSlot`, Incubator). Under the CD ruling (`specs/station-stamp-plate-ruling.md` on work-queue), the plate is a box of the R machinery. It is exempt from the slot's look: no K × WARM, and no code hairline, because it paints its own edge. The stamp glyph alone keeps K 0.20 × WARM, drawn centred on it at up to 104 × 104.

**How:** `paint-stamp-plate.py STAGE OUT`, the same build as the R vent hood above it (`../stage-incubator/paint-machinery.py`: a height field, lambert from the top left, matte).
- An 8 px raised frame with a 2.5 px rounded outer bevel. Its top and left catch the hood's lit rim (204, 211, 181); its bottom and right meet the wall in a 1 px contact shade.
- Four sand bolts at the frame's corners.
- A recess at 8..112 for the glyph, its top and left walls in shade, its floor the same sage a little duller.
- Albedos measured on the hood in incubator-growing at bc866c71: face (117, 130, 113), bolts (98, 91, 73).
- The stage's own shade at the rect (the R group's, at the top) is carried onto the plate, and the wall's grain is added.
- The corners outside a 1.5 px radius are the stage's wall pixel for pixel, so alpha is 255 everywhere.

**Kept as is:** the code text, which stays under the plate at (776, 357, 176, 25), baseline 373, rule y 381 from x 792 to 936.

**Not in the 120 rect:** a cast shade on the wall down-right, like the hood's. It would fall outside the plate's rect, on the stage. Only the 1 px contact shade is painted.

**Proofs at 1× (`proof/`):** `incubator-growing-1x.png`, `-ready-1x.png` and `-hatch-1100-1x.png` (the bc866c71 captures, the plate 1:1, the glyph lifted from the capture as drawn today with its look), made by `proof.py`. `before-after-growing-3x.png` is a 3× crop, before and after.

| State | Plate rect p95 | Mean |
|---|---|---|
| growing | 0.233 | 0.158 |
| ready | 0.233 | 0.157 |
| hatch-1100 | 0.233 | 0.157 |

All under the R cap 0.34 and the chamber condition 0.574 − 0.08 = 0.494. Relative luminance, linear light, measured with the glyph drawn.
