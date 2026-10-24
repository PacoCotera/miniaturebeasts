# Library kit masters

The studio's pass for the art director's Library kit brief (2026-10-23 23:28). First written 2026-10-23 23:42 and updated 2026-10-23 23:51 (America/Mexico_City) after the art director's sign-off of 23:46. 0 MXN: no paid request was made, and the contingency G1 did not run.

Station-gate files are read from c4be3673. Scripts in `guides/` as run, in the brief's order: `cut-marks.py` (M2, M3), `draw-ring.py` (M6), `draw-star.py` (M5), `draw-seed.py` (M4), `sitting-16x12.py` (M7), `make-ground.py` (M1), then `make-proofs.py` and `make-records.py`. Every number below is in `guides/measures.json`.

**Count.** The brief's heading says eight masters and 39 files; its own table gives seven ids and 37 files (M1 1, M2 16, M3 16, M4 to M7 1 each). This pass makes the 37 the table names.

## Exits as measured

| Master | Files | Exit | Measured | Pass |
| --- | --- | --- | --- | --- |
| M1 `library-ground-1024x522` | 1 | mean per channel 33, 27, 26 ±1 | 33.836, 27.836, 26.836 (offset +0.836) | yes |
| | | centre 64 × 64 +3 ±1 | +2.672 | yes |
| | | corners 32 × 32 −1 ±1 | tl -0.721, tr -0.704, bl -0.533, br -1.312 | yes |
| | | σ(R − 33 − round V) 1.9–2.1 | 2.039 | yes |
| | | every pixel ±8; clamped ≤ 0.05 % | max 8; 0.0011 % (|V + N| before clamp at most 9.16) | yes |
| | | R−33 = G−27 = B−26 everywhere | yes | yes |
| | | raw σ (AD run: tooth 1.63, fibre 1.02) | tooth 1.633, fibre 1.03 | — |
| | | no tile, band or repeat at 1x | proof/ground-1x.png; the sheet rect pasted back differs by 0 px (proof/ground-sheet-seam-1x.png) | for the AD |
| M2, M3 `species-mark-SNN-10`, `-15` | 32 | two values (fog 255, clear 0,0,0,0); ink = k² × #; reduced by k = the glyph; IoU 1.000 | all 32: as required (ink per file in measures.json) | 32 of 32 |
| M4 `library-seed-24x24` (redrawn) | 1 | three colours, opaque; closed 1 px edge, 4-connected; IoU ≥ 0.90; tilt upper left to lower right | #1a1514, #342c29, #635e59, RGB; edge 56 px, one 4-connected loop, every edge pixel two edge 4-neighbours; IoU 0.963; axis 38.5° from vertical toward +x (rule 38.1°) | yes |
| M5 `wish-mark-12` | 1 | 1-bit clear, yellow and gold only; ink in x 1–10, y 1–9; 0 ink over the open ring at (+10, −6); IoU ≥ 0.85 | 46 ink (28 gold, 18 yellow), x [1, 10], y [1, 9]; 0 px over the ring; IoU 1.000 | yes |
| M6 `look-disc-open-16` | 1 | 28 px, two values, IoU 1.000 | 28 px, columns and rows [2, 12], 2 values, IoU 1.000 | yes |
| M7 `library-sitting-16x12` | 1 | opaque; bark, sand, clay, enamel, ground only; window ≥ 8 × 5; nine at 20 px leave 4 px | RGB; bark, clay, enamel, ground, sand; window 8 × 5; gap 4 px (proof/sitting-1x.png) | yes |

## IoU table (one method: the master at its own size, alpha > 128, no fit, rescale or island removal; reference rasterized at pixel centres in the same box)

| Master | Reference | IoU |
| --- | --- | --- |
| species-mark-SNN-10, -15 (32) | the glyph raster at k | 1.000 each |
| library-seed-24x24 | the rule's raster at w 5.5, h 10.5 (160 px) | 0.963 (opaque master: the seed is every pixel that is not libWell) |
| wish-mark-12 | the rule's raster (46 px) | 1.000 |
| look-disc-open-16 | the rule | 1.000 |

## By hand

- **M4 (redrawn at w 5.5, h 10.5).** The rule gives 160 px, x 5–18 and y 4–19, as the art director's run. The edge is every seed pixel with any 8-neighbour outside: one closed 1 px loop, 4-connected, with no doubled corner. The tips: row 4 ends at x 9, and rows 9 and 10 end at x 15 and 16, with their 180° turns. So each tip ends in a corner on the long axis instead of a flat run. 6 pixels go back to libWell and none are added. The result is 154 px: 56 edge and 98 fill. No colour, alpha, seam, shadow or lip is added, and the seed is never mirrored. The first draw (w 4.2, h 8, from compose-all2-v3.js) was rejected: about two thirds of the render's size.
- **M5.** No pixel was changed from the rule. At 1x the rule's raster reads as five points: the top arm, two arms and two legs, with yellow in the body. The 2 px top arm cannot hold yellow without widening the point.
- **M7.** The GRID in `guides/sitting-16x12.py` is typed by hand, never made by a filter. The script writes and checks it. Bark is the outer line. Sand is the housing ring, the top rim and the window's left rim. Enamel is the top band (as the 48 × 40's row 2), the left band and the right inner band (both masters' column n − 3). Clay is the window's right rim and foot, and the housing shade at the right and the bottom. The window is ground, 8 × 5, dark.

## M1 recipe notes

- One LCG stream from seed 7, in the generator's own order: the fibre field's 256 × 131 values first, then the tooth (two draws per pixel, row by row).
- The fibre is upscaled to 1024 × 522 with PIL bilinear, then blurred with `scipy.ndimage.gaussian_filter` (σ 3 px, reflect).
- N is made zero-mean and scaled to σ 2.0.
- Nothing else is applied: no sharpening, no grading, no hand paint.

## Sources (sha256)

| Source | sha256 |
| --- | --- |
| station-gate c4be3673 prototypes/workbench/frames/species-S01.json | `2864cee6f21d1582dc334c157019ce5791d6c10c6ab6acaef4aea6afd49abb94` |
| station-gate c4be3673 prototypes/workbench/frames/species-S02.json | `1a06670bcc1c309ac5944a8b9d46ac2d0fd78f60d252f6093d2067496fa44f4e` |
| station-gate c4be3673 prototypes/workbench/frames/species-S03.json | `06c763b399fd818b0363d188bd1a3815912a1bdfb10bca46605317a93d481bd6` |
| station-gate c4be3673 prototypes/workbench/frames/species-S04.json | `65cb5f7ea69abca1db7dce6af1d7c416875ab701e68a73a24b5a50a8575f783d` |
| station-gate c4be3673 prototypes/workbench/frames/species-S05.json | `fff394a4b955e984de5e7ebfe1e17a68e09deac2f83c13f0281aacb554061443` |
| station-gate c4be3673 prototypes/workbench/frames/species-S06.json | `eae240e4d4a47b29871387121ebaaf52403f8a5a200334519a07e62c86b3868a` |
| station-gate c4be3673 prototypes/workbench/frames/species-S07.json | `ebd818d9c942c2e554413cc12e787bd8d370dda344730117bda25d75f07ea805` |
| station-gate c4be3673 prototypes/workbench/frames/species-S08.json | `0789557101c9f86a0e28df0966413c98ff95fd59b5860388ed339f1ad0503d13` |
| station-gate c4be3673 prototypes/workbench/frames/species-S09.json | `3832d5ab35ed4210397234730c672b9451c7c85939a80ef9ce7779dff57d36f7` |
| station-gate c4be3673 prototypes/workbench/frames/species-S10.json | `572e8d2f43ea8125dd6daeeb098780f2cd38a69fc955471fc5159ac450afcc71` |
| station-gate c4be3673 prototypes/workbench/frames/species-S11.json | `01ab6dc706482e4fc0b5ddfaf4797676f0fe066ccf134c3dabeb4df1b9bbd8ce` |
| station-gate c4be3673 prototypes/workbench/frames/species-S12.json | `2630e433df2550f60fb5941976c88cb3d0af2e433e4d05df974a82c518f53aaa` |
| station-gate c4be3673 prototypes/workbench/frames/species-S13.json | `0c5870f74731d937dd7bf45e5da446f7ec5214acf715c2eee0bf2051bc5b5c70` |
| station-gate c4be3673 prototypes/workbench/frames/species-S14.json | `f3816621c487aec02f3a8207d663fc32091ef5740f6037c1421d583007094065` |
| station-gate c4be3673 prototypes/workbench/frames/species-S15.json | `a06340efc6cc45d63b381557889fb9dd968fd8df36e4eb51ee33ecefb0b68fff` |
| station-gate c4be3673 prototypes/workbench/frames/species-S16.json | `8f35a24c8e90ceffbf1648ce4c9daec3232a6444dbd1d074f428a2854d864134` |
| public work-queue results/T-20261019-home/specimen-generator/specimen3.js | `382cf3516a0bb89ecdc3990d3b0d8f491a9e68f832423622a098115a01ff282d` |
| iwq results/T-20261017-library/art/compose-all2.js (seedMark, w 5.5, h 10.5; the approved v5's) | `66cce42e85ef015dcd0815989f35844972f15b1c276737385275e93fc7077bb1` |
| iwq results/T-20261017-library/art/compose-species.js (star5) | `89c89bea9b024835be4cf60d574d30c7a9974fd2f0eb49b3f5f54c8f3d7cda3b` |
| station-gate c4be3673 prototypes/ui/assets/masters/pods/home-sitting-32x24.png | `80ba90b17fa0df1a87d974cbbd88ca2d78b7911d48cafe88a6a915efca039298` |
| station-gate c4be3673 prototypes/ui/assets/masters/pods/sitting-frame-held-48x40.png (family, proof 6) | `e36f2be8826b38c096103ecfccd3ba61e92326bf34c1e571ae9041354b027857` |
| station-gate c4be3673 prototypes/ui/assets/masters/home/berth-portrait-18x24.png (proof 6) | `54f178659b890a311f4356d82f4baa59868fb0d0c7dfaf7752b3cc09fdefcbe2` |
| iwq results/T-20261017-library/art/library-all-v5.png (proofs 1, 4) | `80b335dc19ec66ef5596a06b8f0acec8bc45fd5ecd0f46883f4fa03fb9bb4c3a` |
| station-gate c4be3673 prototypes/ui/palettes/station.json (colours) | see measures |

## Proofs (`proof/`)

1. `ground-1x.png`: M1 at (0, 40) of a 1024 × 600 frame, beside the render v5's open stage cropped to the same rect, with the measures table under both.
2. `ground-sheet-seam-1x.png`: the sheet rect [16, 40, 664, 522] cut from M1's own pixels and pasted back (0 px differ), and the same copy with the rect outlined.
3. `marks-1x.png` and `-x4`: the 16 species at 10 and 15 on libPanel, libQuiet and libGround, beside the recut `mark-species-SNN-24x24` (masters-pods `slices/`).
4. `seed-1x.png` and `-x4`: four unmet well stand-ins (152 × 152, radius 6, libWell fill, void bevel, libPanel lip at the foot) with the seed at (64, 64), beside the render's unmet cell (520, 56).
5. `wish-1x.png` and `-x4`: the shelf wish row stand-in on libPanel (screen x 780–869, y 74–219): dark, light and two-colour found discs and `look-disc-open-16` at (800, 94 + 24k), each with the star at (810, 88 + 24k).
6. `sitting-1x.png` and `-x4`: nine M7 at a 20 px pitch on libPanel, beside `sitting-frame-held-48x40` and `berth-portrait-held-18x24`. The held berth is derived in the proof by the AD's rule (ad-berth-curl 1a) and equals the AD's review proof pixel for pixel.
7. `ring-1x.png` and `-x4`: M6 on libPanel beside a 16 px found disc.

## Sign-off (art director, 2026-10-23 23:46, on b65117fb)

- **Signed** (`signed_in: "AD 2026-10-23 23:46, b65117fb"`, 36 files): `library-ground-1024x522`, the 32 `species-mark-SNN-10` and `-15`, `wish-mark-12`, `look-disc-open-16` and `library-sitting-16x12`. Their files are unchanged since b65117fb.
- **Rejected and redrawn:** `library-seed-24x24`. The brief took the geometry from compose-all2-v3.js (w 4.2, h 8), but the approved v5 was drawn by compose-all2.js (w 5.5, h 10.5). The seed is redrawn above and awaits the art director's signature.
- **The marks ruling:** the frame glyph is the mark. Sign-off item 2 no longer asks the 10 and 15 to read as the 24.
- **The 24s:** the placed `mark-species-SNN-24x24` drew the retired glyphs. `tools/marks.py` had read this branch's stale `prototypes/workbench/frames/` copy, and their pass-27 signature is withdrawn.
  - All sixteen are recut by `tools/marks24-recut.py` with marks.py's rule unchanged, reading station-gate c4be3673's frames with `git show`.
  - Each decodes to its frame glyph exactly, with IoU 1.000 (`pods/marks/marks24-recut-checks.json`). Their status is `new`, awaiting the art director.
  - `tools/marks.py` now reads its frames from station-gate the same way. It was not rerun whole, because it rewrites every row it saves without the status fields.
- **The retired glint's tools:** `tools/guidemarks.py` now writes `wish-mark-12-pass81` to `slices/retired/` and never `slices/wish-mark-12.png`. It keeps each row's status fields when it saves.
  - Rerun in place, it leaves every output byte-identical (the retired file stays 8d3eac85…), except `mark-guide-16.png`. That file already differs from what the script draws: an older drift, kept as committed.
  - `tools/status.py` names `wish-mark-12-pass81` (retired) and the recut 24s (new). Run on a copy, it writes those rows exactly as recorded.
  - `tools/status.py` is not rerun in place: it would rewrite 507 unrelated rows (it predates them).
- The manifest and status key of the pass-81 glint is now `wish-mark-12-pass81`.

## For the art director and the lead


- **The pass-81 glint** moved byte for byte to `pods/slices/retired/wish-mark-12-pass81.png` (sha256 8d3eac85…, unchanged), and its rows are `retired`. `wish-mark-24` is untouched.
- **The builders' work:** the sixteen recut 24s need re-placing on station-gate, and every golden that draws a 24 changes.
- **The stale frames copy:** this branch's `prototypes/workbench/frames/` copy is stale (schema 2, the retired glyphs). The lead or architect decides whether to refresh or delete it.
