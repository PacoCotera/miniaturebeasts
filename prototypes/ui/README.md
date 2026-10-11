# Tier 2 test harness

Tools for judging whole-body blends (the tier 2 method, `boards/mibi-motion/tier2-method.md`). They read masters and the animator's landmarks JSON from paths and write to `--out`; nothing is placed in the Station and nothing is drawn. The warp only moves existing pixels (backward mapping, nearest sample, no blending); a source outside the picture is transparent.

**One file per species, stage and blend: the landmarks JSON.** Every per-picture fact (the zero rows, the fixed and moving landmarks, the head polygon, the belly line, the measured profile, the pairs and their bands, the breathing holds) is read from it. A command-line flag only overrides a value for a trial; the CSV then says `override` and the run gives no verdict, so a verdict is reproducible from the committed file alone. The JSON's shape is exercised by the synthetic copy in `tests/tier2-harness.test.mjs`.

## `tools/warp-field.mjs`: landmarks to fields

```
node prototypes/ui/tools/warp-field.mjs --landmarks lm.json --stand stand.png --size 104x112 --out dir [--picture name]
```

- Landmarks are placed once at 304x312 and scaled to other sizes by the size ratio, rounded, unless the file gives a picture at that size (the nap at 96x88).
- Thin-plate spline through the constraints, rounded half away from zero to whole px: every `fixed` landmark at d = 0; fixed points at d = 0 every 8 px along the top edge of `fieldZeroRows`; each moving landmark fitted at its **destination** p + d with value d. The head adds no constraint.
- The domain D is the stand's ink (alpha > 0) dilated by the size's bound (Chebyshev: 12 / 6 / 4 / 3 px); the field is written 0 outside D, so a sample can never reach ink from beyond the bound. Without `--stand` there is no domain and the whole picture is checked.
- After the fit: below the belly line (`bellyLine`, linear between vertices, flat beyond them) a column takes the displacement of the line at that x; the zero rows win.
- The head is `headMaskPolygon` rasterised once (even-odd, pixel centres) to a 1-bit mask PNG, `mibi-<stage>-<species>-stand-map-head-WxH.png`, whose SHA-256 goes in the CSV. A signed mask replaces it through `headMask: { path, sha256 }`. No mask: the run is marked `head unmasked` and gives no verdict.
- Refused, with the pixel or window named: |d| over 4 / 6 / 12 / 3 px at 104x112 / 144x152 / 304x312 / 96x88 (every pixel outside the head mask); gradient on the stored integer map over 4 px windows, both ends in the check domain: stretch (dx along x, dy along y) over 0.25 px per px, shear (dy along x, dx along y) over 0.5; a size with no bound; a non-zero field on the zero rows. The check domain is the pixels that are ink in the source or in the warped output, each dilated by 1 px, minus the head zone (the head mask dilated by 6 px).
- Maps: PNG 8-bit RGB (colour type 2), no alpha, no colour chunks (the reader refuses `gAMA`, `sRGB`, `iCCP`, `cHRM`); R = dx + 128, G = dy + 128, B = 0; the displacement of the content at t = 1; one map per end, `-min-` (down) and `-max-` (up).
- Overrides (the CSV says `override`): `--head-mask png`, `--shadow-rows y0-y1`, `--belly-y N`, `--amplitude k`, `--no-check`.

## `tools/tier2-test.mjs`: the matrix and its measures

```
node prototypes/ui/tools/tier2-test.mjs --out dir [] \
  --set s04-304x312 --stand <path|ref@sha:path> --landmarks lm.json [--picture name] [--painted-down p --painted-up p] [--field-down f.png --field-up g.png] [--pair-ids a,b]
  [--set ... one per size]
```

Overrides, each marking the run `override` (no verdict): `--head-mask png --shadow-rows y0-y1 --belly-y N --amplitude k --no-check --band y0-y1 --holds b0,b1,b2,b1back --phase-ms N --seconds N`.

A source is a file, or `<ref>@<sha>:<path>`, read read-only with `git show` (masters-pods is a branch of this repository: `git fetch origin masters-pods` first). Each source's SHA-256 goes in the CSV; the JSON's `sha256` must match or the run stops.

The warp with the head layer: the head (composite inside the mask) is split off; the whole composite is warped as the body with t in 1/16 steps and `r` rounding half away from zero; a sample that lands inside the head takes the first non-head pixel below it in its column, else the nearest above, else it is transparent (a clamp miss, counted); the head is then drawn unwarped over the body.

Writes per set: the 1x PNGs (painted down, warped down, stand, warped up, painted up), the field maps and the head mask, a contact sheet per set and one for all, `measures.csv`, and `vivarium-pair-<size>-<down|middle>-<middle|up>.apng` for the three pairings: two Hiljans side by side, 10 s at 1x on #D6CEBE, breathing b0 b1 b2 b1 with the animator's holds and copy B offset (`breathPair`). b1 and b2 are baked from each warped stand (the field reused by id; a step is never warped on its own).

Opaque means alpha > 110.

| # | Measure | Pass |
| --- | --- | --- |
| M1 | the whole render run twice | same bytes (PNGs, maps, APNGs; the CSV holds a clock reading) |
| M2 | colours (alpha > 0) of a warped output that are not in the stand | 0 |
| M3 | opaque 8-connected components; transparent 4-connected regions that never reach the border (holes); opaque pixels with no opaque 8-neighbour (orphans). On the final picture with the head drawn; also the body layer alone, and the change against the stand | 1, 0, 0 |
| M4 | outline pixels (opaque, with a 4-neighbour transparent or outside) whose count of outline 4-neighbours is not 2 | ≤ stand's + 5 % |
| M5 | silhouette IoU against the painted end; mean abs difference of the topline profile (highest opaque row per column, columns where both have one) | 304x312: ≥ 0.95, ≤ 2 px; 104x112: ≥ 0.93, ≤ 1 px |
| M5a | the warped stand's top edge at the animator's measured columns (x ≤ head edge − 6, at 304x312) against stand top + the measured end displacement (`toplineProfile`); a check, never an input | per column ≤ 1.5 px, mean ≤ 1 px |
| M6 | at 104x112, pairwise mean profile difference of the three bins (warped; painted when both ends are given) | ≥ 2 px |
| M7 | median warp time of one picture on this machine | ≤ 5 ms at 104x112 (confirm on the CI runner) |
| M8 | stand ↔ baked b1 and b2, always, with the band derived (in each column the rows above the belly line), and each cycle pair in the JSON (`band`: `belly-down` with the tail box, rows, or a mask picture; `a`, `b` paths with SHA-256): changed pixels outside the band, without and with the warp (the same field and head mask by id) | with ≤ without |

Also printed: clamp misses (should be 0), and the leg compression, the largest |d| on the belly line over the leg columns.

The breath bake is the animator's `breathBake`: row copies per column, no resampling. yb(x) is the belly line; rows at and below it are fixed. b1: out(y) = in(y + 1) for y < yb − 1, row yb − 1 keeps itself. b2 adds a second lift for the rows above ym = round((ytop + yb) / 2), ytop the column's first ink row, ym at most yb − 8. Rows shifted in from above the figure are transparent.

`tools/samples/` holds the dry run on the signed S04 stand at 304x312, 104x112 and 96x88 with the animator's provisional topline landmarks (the landmarks file itself is not in this repository). It is not a verdict.
