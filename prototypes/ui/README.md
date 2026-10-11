# Tier 2 test harness

Tools for judging whole-body blends (the tier 2 method, `boards/mibi-motion/tier2-method.md`). They read masters and the animator's landmarks JSON from paths and write to `--out`; nothing is placed in the Station and nothing is drawn. The warp only moves existing pixels (backward mapping, nearest sample, no blending); a source outside the picture is transparent.

**One file per species, stage and blend: the landmarks JSON.** Every per-picture fact (the zero rows, the fixed and moving landmarks, the head polygon, the belly line, the measured profile, the pairs and their bands, the breathing holds) is read from it. A command-line flag only overrides a value for a trial; the CSV then says `override` and the run gives no verdict, so a verdict is reproducible from the committed file alone. The JSON's shape is exercised by the synthetic copy in `tests/tier2-harness.test.mjs`.

## `tools/warp-field.mjs`: landmarks to fields

```
node prototypes/ui/tools/warp-field.mjs --landmarks lm.json --stand stand.png --size 104x112 --out dir [--picture name]
```

- Every size is its own picture block placed by the animator (`stand-104x112`, `nap-96x88`). A size without a block is derived from the 304 block by the figure-bbox mapping, each axis on its own: p' = t0 + r((p − b0)·s), d' = r(d·s), with the full ink bbox (alpha > 110, every row, feet included; x1 and y1 exclusive) of the 304 stand and of the target stand; a block's `figureBox` wins if the shadow widens the box. It applies to landmarks, twins, the head polygon, the belly line and `fieldZeroRows`. A derived size needs `--base-stand` (the 304 stand). The CSV records whether a picture's points were placed or mapped, and sx, sy and the bboxes.
- Thin-plate spline through the constraints, rounded half away from zero to whole px: every `fixed` landmark at d = 0; fixed points at d = 0 every 8 px along the top edge of `fieldZeroRows`; each moving landmark fitted at its **destination** p + d with value d. The head adds no constraint.
- The domain D is the stand's ink (alpha > 0) dilated by the size's bound (Chebyshev: 12 / 6 / 4 / 3 px); the field is written 0 outside D, so a sample can never reach ink from beyond the bound. Without `--stand` there is no domain and the whole picture is checked.
- `rules.bellyFixed.value` (topline): d = 0 points every 8 px along the belly line (extended flat to the picture edges) join the constraints before the fit, so the legs do not stretch (leg strain 0 at every size).
- After the fit, the legs: below the belly line a column is stretched or compressed linearly down to the first zero row z0, so the feet never move: d(x, y) = db·(z0 − y)/(z0 − yb) for yb < y < z0, with db the fit's displacement at the line (0 for a `bellyFixed` blend, so the legs get 0); the whole field is then stored rounded, and the zero rows win. The leg rows' vertical stretch |db|/(z0 − yb) is checked per leg column against 0.25 and the field is refused (never clamped) beyond it, naming the column.
- The head is `headMaskPolygon` rasterised once (even-odd, pixel centres) to a 1-bit mask PNG, `mibi-<stage>-<species>-stand-map-head-WxH.png`, whose SHA-256 goes in the CSV. A signed mask replaces it through `headMask: { path, sha256 }`. No mask: the run is marked `head unmasked` and gives no verdict.
- Refused, with the pixel or window named, over the check domain (the pixels that are ink in the source or in the warped output, each dilated by 1 px, minus the head mask: a sample of sky stays sky whatever its d): |d| over 4 / 6 / 12 / 3 px at 104x112 / 144x152 / 304x312 / 96x88; gradient on the stored integer map over 4 px windows with both ends in the check domain minus the 6 px head zone: stretch (dx along x, dy along y) over 0.25 px per px, shear (dy along x, dx along y) over 0.5; a size with no bound; a non-zero field on the zero rows. Inside the head mask neither check runs (the head is drawn from its own layer).
- Maps: PNG 8-bit RGB (colour type 2), no alpha, no colour chunks (the reader refuses `gAMA`, `sRGB`, `iCCP`, `cHRM`); R = dx + 128, G = dy + 128, B = 0; the displacement of the content at t = 1; one map per end, `-min-` (down) and `-max-` (up).
- Overrides (the CSV says `override`): `--head-mask png`, `--shadow-rows y0-y1`, `--belly-y N`, `--amplitude k`, `--no-check`.

## `tools/tier2-test.mjs`: the matrix and its measures

**A signed cut key is used as it is.** `--stand body.png --stand-shadow shadow.png` (and `--painted-down` / `--painted-down-shadow`, `--painted-up` / `--painted-up-shadow`): the body has alpha 0 or 255, the painted shadow is its own file, never warped, drawn unwarped under the warped body. Each file's SHA-256 goes in the CSV and nothing is provisional. Without `--stand-shadow` the tool prepares a master itself, as follows.

**The warp's input is the cut key** (the art director's ruling): the body alpha binarised (255 or 0), the painted shadow split off into its own layer, which is not warped and stays on the ground under the warped feet. The rule is `cut-motion.py`'s final remap in masters-pods (alpha ≥ 200 is body, 60..199 is shadow kept at min(alpha, 110), the rest 0), applied to a finished master with the shadow taken from the rows at and below the first zero row; above them a partial alpha is the body's own fringe and is dropped. Every run prints it (`prep`) and is marked `provisional input prep` until the art director confirms the split for a master that is not a raw cut. M3's and every other reference is the prepared stand.

```
node prototypes/ui/tools/tier2-test.mjs --out dir [] \
  --set s04-304x312 --stand <path|ref@sha:path> --landmarks lm.json [--picture name] [--base-stand 304-stand] [--painted-down p --painted-up p] [--field-down f.png --field-up g.png] [--pair-ids a,b]
  [--set ... one per size]
```

Overrides, each marking the run `override` (no verdict): `--head-mask png --shadow-rows y0-y1 --belly-y N --amplitude k --no-check --band y0-y1 --holds b0,b1,b2,b1back --phase-ms N --seconds N`.

A source is a file, or `<ref>@<sha>:<path>`, read read-only with `git show` (masters-pods is a branch of this repository: `git fetch origin masters-pods` first). Each source's SHA-256 goes in the CSV; the JSON's `sha256` must match or the run stops.

The warp with the head layer: the head (composite inside the mask) is split off; the whole composite is warped as the body with t in 1/16 steps and `r` rounding half away from zero; a sample that lands inside the head takes the first non-head pixel below it in its column, else the nearest above, else it is transparent (a clamp miss, counted), except that a destination above the head's top in that column is transparent (sky the unwarped head would have covered); the head is then drawn unwarped over the body.

Writes per set: the 1x PNGs (painted down, warped down, stand, warped up, painted up), the field maps and the head mask, a contact sheet per set and one for all, `measures.csv`, and `vivarium-pair-<size>-<down|middle>-<middle|up>.apng` for the three pairings: two Hiljans side by side, 10 s at 1x on #D6CEBE, breathing b0 b1 b2 b1 with the animator's holds and copy B offset (`breathPair`). b1 and b2 are baked from each warped stand (the field reused by id; a step is never warped on its own).

A picture block named for the size with a suffix (`stand-104x112-exaggerated`, selected with `--picture`) is a placed variant: it renders one extra breathing pair, `vivarium-pair-<size>-exaggerated-down-up.apng`, and a block that says `M5a: "not applied..."` skips M5a (a field deliberately beyond the painted ends).

Opaque means alpha > 110.

| # | Measure | Pass |
| --- | --- | --- |
| M1 | the whole render run twice | same bytes (PNGs, maps, APNGs; the CSV holds a clock reading) |
| M2 | colours (alpha > 0) of a warped output that are not in the stand | 0 |
| M3 | components (opaque 8-connected), enclosed holes (transparent 4-connected regions that never reach the border), orphans (no opaque 8-neighbour), on the final picture with the head drawn and on the body layer alone. **alpha > 110 gates**; **alpha > 0 informs**, with the box of every region that is new against the unwarped picture (matched one to one to the nearest region within max \|d\| + 1 px), listed in the CSV and outlined in red on a copy of the 1x PNG (`<size>-warped-<end>-new-regions.png`) for the art director | alpha > 110: each of the three counts ≤ the unwarped picture's (the stand, or the unwarped b-step); the strict counts (1, 0, 0) are printed for information only |
| M4 | outline pixels (opaque, with a 4-neighbour transparent or outside) whose count of outline 4-neighbours is not 2 | ≤ stand's + 5 % |
| M5 | silhouette IoU against the painted end; mean abs difference of the topline profile (highest opaque row per column, columns where both have one) | 304x312: ≥ 0.95, ≤ 2 px; 104x112: ≥ 0.93, ≤ 1 px |
| M5a | the warped stand's top edge at the animator's measured columns (x ≤ head edge − 6) against stand top + the measured end displacement (`toplineProfile`); a check, never an input. At another size the profile is mapped (x by the bbox mapping, dy × sy; needs `--base-stand`). The one tolerance is the landmarks' `rules.M5aTolerance`, by size (no fallback) | per column ≤ max and mean ≤ mean of that rule: 304x312 1.5 / 1.0, 104x112 and 144x152 1.1 / 0.5 (1.5 x sy with that floor), a figure scale below 0.30 (the nap) 1.5 / 0.6 |
| M6 | at 104x112, pairwise mean profile difference of the three bins (warped; painted when both ends are given), over the columns the blend's field moves only (any column where either end's profile differs from the stand's); a pre-check on the outer bins (down–up gates; down–stand and stand–up are printed for information; the told-apart judgement decides in any case) | down–up ≥ 2 px |
| M7 | median warp time of one picture on this machine | ≤ 5 ms at 104x112 (confirm on the CI runner) |
| M8 | stand ↔ baked b1 and b2, always, with the band derived (in each column the rows above the belly line), and each cycle pair in the JSON (`band`: `belly-down` with the tail box, rows, or a mask picture; `a`, `b` paths with SHA-256): changed pixels outside the band, without and with the warp (the same field and head mask by id) | with ≤ without. A cycled pair is signed only on the locked cut: the pair (or its `bellyFrom` block) carries `locked: true` once the cut applies the head and torso locks; otherwise its counts are kept and the verdict reads `unlocked: no verdict`. A locked pair also runs the absolute §0 test (unwarped: only legs and tail change, 0 changed pixels outside the band) |

Also printed: clamp misses (should be 0), and the leg strain, the largest |db|/(z0 − yb) over the leg columns (0 when `bellyFixed`). A breath bake on a belly-moving warp uses the warped belly line yb′ = yb + r(db).

The breath bake is the animator's `breathBake`: row copies per column, no resampling. yb(x) is the belly line; rows at and below it are fixed. b1: out(y) = in(y + 1) for y < yb − 1, row yb − 1 keeps itself. b2 adds a second lift for the rows above ym = round((ytop + yb) / 2), ytop the column's first ink row, ym at most yb − 8. Rows shifted in from above the figure are transparent.

`tools/samples/phaseA/` holds the S05 cycle M8 (unlocked keys: counts kept, no verdict) and the S01 hop check (stand, crouch and air, both ends) as CSVs and contact sheets.

`tools/samples/matrix/` holds the dry run on the signed S04 stand at 304x312, 104x112 and 96x88 with the animator's provisional topline landmarks (the landmarks file itself is not in this repository): the 1x PNGs (stand, warped down, warped up), the field maps, the head masks, the contact sheets, the breathing pairs as APNGs and `measures.csv`. The inputs are the signed cut keys in masters-pods (level, dipping, arched; body and shadow at each size); every file's SHA-256 is in the CSV. It is not a verdict: the landmarks are the animator's provisional ones.
