# S01 Sitting habit keys: shake and calm (adult, juvenile)

Under the Station art director's studio brief, 2026-10-23 22:00 (Sitting screen art). The programme lead's go, 2026-10-23 22:06, under decisions.md 2026-10-23 21:54 and the standing rule of 2026-10-17 16:18. Job 1 hard stop 39 MXN; both jobs together 66 MXN. Nothing here is signed.

Started 2026-10-23 22:08 (America/Mexico_City). Spend ledger `log/spend.json` re-read before the first request: no unpushed rows, 0 MXN booked for Pacific day 2026-10-23.

## Composed inputs (sha256, written before each request runs)

Built by `guides/compose-sit.py` at 0 MXN. The stage's canvas transform (crested anchor's alpha box, scale, offset in the cell) is in `guides/compose-sit.json`; every key on every sheet is placed with it, and the cut inverts it.

| Request | Input | sha256 |
| --- | --- | --- |
| K1a `sit-S01-adult-keys-crested-a` | `guides/compose-sit-adult-crested.png` | `3bba33279b462e6093e331c16506e78dbab15f42567f83174af7bc7a717214c4` |
| K1b `sit-S01-adult-keys-crested-b` (the adult retry, check 6: wrong facing) | `guides/compose-sit-adult-crested.png`, the same file | `3bba33279b462e6093e331c16506e78dbab15f42567f83174af7bc7a717214c4` |
| K2a `sit-S01-adult-keys-bare-a` | `guides/compose-sit-adult-bare-in.png`: the crested anchor in cell 1, the four mirrored, droplet-fixed K1b takes in cells 2, 3, 5, 6 | `90995042e83688ceeed55f501a04da3a3d5fdac58a6396531b2e7090e7dedd37` |
| K2b `sit-S01-adult-keys-bare-b` (the adult retry, checks 4 and 8) | the same two files | as K2a |
| K2a, second reference | `guides/compose-sit-adult-bare-anchor-ref.png`: the signed bare anchor (7e52ae98…) at 304 × 312 flattened on #FF00FF | `3dd6e52e4a573ec3f64e61e64e0bd835b94ec75f64a5857666b3a6b1b0e4997d` |
| K3a `sit-S01-adult-keys-patches-a` | `guides/compose-sit-adult-patches-in.png`: cell 1 the bare anchor + its round-2 patches (wq f1285a67), cells 2, 3, 5 the bare K2b takes (cell 6 empty: calm t2 dropped) | `8c1f3e9b7d45d7edb9843292014d0c96b5613b909c4c53d437479fccb21a08cd` |
| K4a `sit-S01-adult-keys-stripes-a` | `guides/compose-sit-adult-stripes-in.png`: cell 1 the bare anchor + its stripes, the same takes | `b395716de1cb3e2fd7a7bc36aa226c4e8d7a3e89cc8376c32dc991adf05938ac` |
| K1j `sit-S01-juvenile-keys-crested-a` | `guides/compose-sit-juvenile-crested.png`: the juvenile crested anchor (0644341d…) in cell 1, cells 2–6 empty | `7402764cdce42b50584ad5b33aaa61203231345815006c949f4d5e5e662f034e` |
| K2j `sit-S01-juvenile-keys-bare-a` | `guides/compose-sit-juvenile-bare-in.png`: the juvenile crested anchor in cell 1, shake t1 in cell 2, calm t1 in cell 3 (cells 4–6 empty) | `3154cfbd72ba93f878dd2a1eb92dc623da54ec8d4569c0832d453bbc0419803b` |
| K2j, second reference | `guides/compose-sit-juvenile-bare-anchor-ref.png`: the signed juvenile bare anchor (43b93d1f…) flattened on #FF00FF | `1542cf7bf70b9d1c495683741bc481edff5fa0bc445c5ae399d1d616d5207eec` |
| K3j `sit-S01-juvenile-keys-patches-a` | `guides/compose-sit-juvenile-patches-in.png`: cell 1 the juvenile bare anchor + its round-2 patches, cells 2 and 3 the bare K2j takes | `50412d1f171894be8013e05f622bbe1d93e505409a6d84ac9cfbd438426546bf` |
| K4j `sit-S01-juvenile-keys-stripes-a` | `guides/compose-sit-juvenile-stripes-in.png`: cell 1 the juvenile bare anchor + its stripes, the same takes | `f7d6ee6b807e7a2ceb2acf838f9886f892d6fbcaec191550165ef827d8b02ff5` |

## Requests

| Request | Time (Mexico City) | Result | MXN (usageMetadata) | Job 1 total / 39 | Both jobs / 66 | Pacific day / 250 |
| --- | --- | --- | --- | --- | --- | --- |
| K1a `sit-S01-adult-keys-crested-a` (first send) | 2026-10-23 22:09 | **failed, exit check 1**: HTTP 402, "Your prepayment credits are depleted" (RESOURCE_EXHAUSTED); no picture | 0.00 (non-200, not billed) | 0.00 | 0.00 | 0.00 (10-23) |
| K1a `sit-S01-adult-keys-crested-a` (re-sent after the owner's top-up, lead 22:12) | 2026-10-23 22:16 | **failed, checks 6 and 7**: all four takes (cells 2, 3, 5, 6) face RIGHT; the adult faces LEFT (cell 1's face at x 115 of the cell, the takes' at 263-327 against body centres 218-226). Neither take of either pose passes, so the sheet fails. Also: the shake takes' droplets sit on the coat. Passed: check 3 (border median 9 from #FF00FF), cell 1 in place (mean RGB difference 4.3) | 4.17 | 4.17 | 4.17 | 4.17 (10-23) |
| K1b `sit-S01-adult-keys-crested-b` (the adult retry; adult total before it 4.17 ≤ 18.6) | 2026-10-23 22:17 | **failed, checks 6 and 7 again**: all four takes face RIGHT (by eye at 1×: every face, eye and snout on the cell's right side; cell 1 faces left). Neither take of either pose passes. Passed: check 3 (border 8 from #FF00FF), cell 1 in place (mean RGB difference 4.5). The droplets now sit mostly clear of the coat | 4.32 | 8.49 | 8.49 | 8.49 (10-23) |
| K2a `sit-S01-adult-keys-bare-a` | 2026-10-23 22:39 | **failed, check 4**: cell 4 holds a second bare anchor (85,022 non-magenta px). Corrected after K2b: my first check 8 numbers were a cut fault (the twin's whole-pixel moves applied twice, and droplets above the bare head falling outside the body's box). Measured right, K2a passes 8 as K2b does (below) | 3.62 | 12.11 | 36.62 | 36.62 (10-23) |
| K2b `sit-S01-adult-keys-bare-b` (the adult retry; adult total before it 12.11 ≤ 26) | 2026-10-23 22:41 | **failed, check 4 again**: cell 4 holds a second bare anchor (84,871 px). Check 8 otherwise: 0 leaf px on every key, round heads by eye; mean RGB against the crested twin 3.2–3.5; outline p95 3.61 px on every take (max 4.0–5.4), against a 2.0 px floor for the input cut through the same key-out; droplets 6 of 6 and 8 of 8 within 0.3 px on the sheet, except one small droplet of shake t1 (cell x 59, y 291) shrunk under 20 px; cell 1's head against the signed bare anchor p95 2.83 px; facing kept | 3.67 | 15.77 | 40.28 | 40.28 (10-23) |
| K3a `sit-S01-adult-keys-patches-a` | 2026-10-23 22:51 | **pass.** Check 3: border 10. Check 5 (cell 1 against its input through the same key-out): p95 2.24, max 5.0, centroid −0.39 / −0.16, mean 2.95. Check 9: three masses of ≥ 150 px on every take, like the anchor (shake t1 3095 / 1325 / 848; shake t2 2804 / 1259 / 730; calm t1 2365 / 725 / 514), no crescents or specks by eye, alpha 0 outside the fur mask, 0 px repainted outside the coat. Check 4: cell 4 empty. Cell 6 (empty in the input) came back with a patched copy of calm t1 inside x 33–385 × y 99–374 of the cell, 0 px in the seam bands: cut away and noted under the Round 2 rule | 3.75 | 19.52 | 48.12 | 48.12 (10-23) |
| K4a `sit-S01-adult-keys-stripes-a` | 2026-10-23 22:53 | **pass.** Check 3: border 10. Check 5: p95 2.24, max 5.0, centroid −0.54 / −0.16, mean 3.26. Check 9: stripes on every take, 0 stripe px inside the head ellipses (no face or rings), alpha 0 outside the fur mask, repainted outside the coat 0.07 % at most. Cells 4 and 6 empty | 3.68 | 23.20 | 51.79 | 51.79 (10-23) |
| K1j `sit-S01-juvenile-keys-crested-a` | 2026-10-23 22:57 | **pass, with two takes dropped.** Every take faces right, as the juvenile anchor; no mirror. Check 5 (cell 1 against its input through the same key-out): p95 1.0, max 3.16, centroid [0.38, 0.13], mean 2.52. IoU against anchor / curl: shake t1 0.76 / 0.56, calm t1 0.73 / 0.63; pair 0.64. **Dropped:** shake t2 (check 7, a forepaw off the ground) and calm t2 (check 7, feet 6 canvas px, about 10 sheet px, off cell 1's line, over 8). Whole-pixel moves (x, y): shake t1 [7, 0], calm t1 [7, 4]. Shake t1 keeps 4 of its 6 droplets; the other 2 are under 9 px at 304 × 312 (the brief's droplet rule). Notes for you: the calm takes sit up on folded hind legs at 0.98 of the anchor's height, not sunk low as the new sentence asked. That reads as weak, not broken: they are seated, not standing, and they read apart (IoU 0.73) | 4.12 | 27.31 | 55.91 | 55.91 (10-23) |
| K2j `sit-S01-juvenile-keys-bare-a` | 2026-10-23 22:58 | **pass.** Check 3: border 11. Cells 4–6 empty, 0 px in the seam bands. Check 8: crest gone (leaf px 0 on cell 1, and 4 and 8 stray px on the takes' cap edges, no leaf by eye); round heads at 1× (`proof/k2j-crested-bare-1x.png`); cell 1's head against the signed bare anchor p95 2.0, max 2.0. Outline against the crested twin: shake t1 p95 2.0 / max 3.16 / mean 2.96; calm t1 2.0 / 2.24 / 2.58; centroid move under the crest at most 1.0 px. Droplets: the 4 sheet droplets within 0.2 px, plus specks where the leaves were | 3.81 | 31.12 | 59.72 | 59.72 (10-23) |
| K3j `sit-S01-juvenile-keys-patches-a` | 2026-10-23 23:00 | **failed, check 9 (repainted, not marked).** Outside the bare key's fur mask dilated 3 px, the returned takes differ from the base (sum \|ΔRGB\| > 60) on 2.46 % (shake t1) and 1.70 % (calm t1) of the figure, against the 0.5 % limit; mean difference 14.9 and 12.1. Cell 1, by contrast, is at 0.02 % (mean 6.5), and the adult K3a takes at 0.00 %. Where: the cream body's shading strokes on the haunch and legs came back softer (`guides/layers.json`; the layer itself is alpha 0 outside the coat). Passed: check 3 (border 12), check 5 (p95 1.41, max 2.0, centroid 0.40 / 0.08, mean 2.44), cells 4–6 empty, one cream mass per take (1471; 1307 + a 145 px fleck), heads-off applied (HEADS shake t1 (190, 150, 55, 48), calm t1 (195, 160, 55, 48)) | 3.89 | 35.01 | 63.61 | 63.61 (10-23) |
| K4j `sit-S01-juvenile-keys-stripes-a` | 2026-10-23 23:11 | **pass.** Check 3: border 12. Check 5: p95 1.41, max 2.0, centroid 0.37 / 0.12, mean 2.44. Cells 4–6 empty. Check 9: stripes on the cap behind the head, 0 stripe px inside the head ellipses, alpha 0 outside the fur mask, and the returned sheet differs outside the coat on 0 px (sum \|ΔRGB\| > 60) | 3.74 | 38.75 | 71.73 | 71.73 (10-23) |

## Art director's ruling 22:31: K1b mirrored (0 MXN, 2026-10-23 22:37)

K1b is the adult sheet; K1a is rejected (its raw stays). The lead gave the go at 22:33 with new stops: job 1 ceiling 39, hard stop 50 (a request runs only if job total + 4.80 ≤ 50); job 2 ceiling 28.6, hard stop 30; both jobs 80.

**The K1 cut** (`guides/cut-sit.py k1 adult source/raw/sit-S01-adult-keys-crested-b.jpg 2,3,5,6`, all numbers in `guides/register.json` "adult-k1"):
- Cells 2, 3, 5 and 6 are mirrored left to right in their cells before the key-out. Every take then goes through the stage's one canvas transform (`guides/compose-sit.json`), inverted.
- Droplets: the 2 on the fur of each shake take are painted out from the fur around them before the cut (the ruling's test, as `dropclear.py`). So are the glint-sized specks on the fur. Clear of the coat, shake t1 keeps 6 and shake t2 keeps 8.
- Magenta: the edge band is despilled, each droplet's pink rim is choked, and the strong magenta in the pockets at the crest's roots is repainted from neighbours.
- Painted shadows go to `guides/discard-shadow-adult-*.png`.
- Results: `crested/mibi-adult-S01-{shake,calm}-t{1,2}-304x312.png`.

**Check 5, cell 1:**
- Against its input put through the same key-out: outline p95 2.24 px, max 3.16, mean RGB 2.98. The centroid moved [-0.82, -0.59] px (x, y).
- For reference, the input's own round trip against the anchor is p95 2.0, mean 0.6.
- The p95 is 0.24 px over the 2 px line. The figure did not move (under 1 px). Its edge came back about 1 px softer, so it keys about 1 px thinner. **Note for the art director;** the ruling already took K1b.

**Light test (standing mirror rule) and check 7** (`guides/measure-k1.py`, `guides/k1-measures-adult.json`). The anchor's coat highlight offset is -0.217; its top-left ÷ top-right and top-left ÷ bottom-right ratios are 1.18 / 1.27. The light test is "offset has the anchor's sign and is within 0.06 of it; droplets lit up and toward the key".

| Take (mirrored) | Coat highlight dx | TL/TR / TL/BR | Droplet highlights | Light test | IoU anchor / curl at 48 | Height of anchor | Whole-pixel move x, y | Droplets |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| shake-t1 | -0.180 | 1.14 / 1.32 | 8 droplets, dx -0.065, dy -0.170 | holds | 0.74 / 0.65 | 0.95 | +4, +1 | 6 kept, 2 on the fur painted out |
| shake-t2 | -0.162 | 1.13 / 1.2 | 10 droplets, dx -0.070, dy -0.206 | holds | 0.78 / 0.60 | 0.96 | +0, +1 | 8 kept, 2 on the fur painted out |
| calm-t1 | -0.195 | 1.17 / 1.23 | — | holds | 0.80 / 0.72 | 0.93 | +2, +7 | 0 kept |
| calm-t2 | -0.174 | 1.13 / 1.22 | — | holds | 0.87 / 0.70 | 0.95 | +4, +2 | 0 kept |

Shake × calm pairs: shake-t1xcalm-t1 0.76, shake-t1xcalm-t2 0.75, shake-t2xcalm-t1 0.74, shake-t2xcalm-t2 0.74, all ≤ 0.85.

**Notes for the art director:**
1. **Calm t2 fails reads-apart under the brief's method** (cut key, alpha > 128, droplets out, fitted into 48 bottom-centred): IoU against the anchor is 0.87, over 0.80. Calm t1 is 0.7995, on the line. The method reproduces the brief's reference values: crested stand 0.98, adult air 0.77, adult curl 0.67, juvenile curl 0.57. The ruling's `iou.py` reads 0.77 and 0.74. Its magenta test, `|R-B| < 45 & G < 80 & R > 80`, also takes in some dark charcoal coat, which thins its silhouettes. I followed the ruling and let all four takes ride, at no extra cost. Under the brief, calm t2 would be dropped; that is your call at sign-off.
2. **Calm t1's feet moved 7 px down to row 303,** over the 6 px allowance. It is recorded here as a note to you.
3. A few tiny pale glints are left on the shake coats, too small for the droplet test. They are a hand note if wanted.

## Art director's ruling Round 2 (22:48), 0 MXN work (2026-10-23 22:51)

The lead's go: job 1 ceiling 40 MXN, hard stop 43; job 2 (B3c only) ceiling 32.7, hard stop 34; both jobs 77. There are no automatic retries: a wrong facing or a figure in cell 4 is a 0 MXN fix, and any other failure stops the job for the art director.

- **K2b is the sheet of record.** Its cell 4 figure lies inside x 28–392 × y 81–394 of the cell, with 0 px in the seam bands. It is cut away and noted.
- **Check 4 now reads:** a figure in cell 4, or in a cell left empty in the input, is cut away and noted. It fails the sheet only if it comes within 12 px of a seam or changes a used cell.
- **Checks 5 and 8, the outline:** measured outside the crest zone dilated 10 px, against the twin or the input put through the same key-out. Pass when p95 ≤ 4.0 px, max ≤ 6 px, centroid move ≤ 1 px, and mean RGB difference ≤ 8 inside the figure. Sign-off 3's "p95 ≤ 1 px" becomes this, plus "no visible step at 1×".
- **Leaf test** (`cut-sit.py` green(), from K2j on): g > r + 6, g > b + 25, g > 80. The juvenile's teal cap is not counted as leaf.
- **One IoU method, the brief's:** the cut 304 × 312 key, alpha > 128, the largest island (droplets out), fitted into 48 and bottom-centred (`guides/measure-k1.py`). The ruling's round-1 `iou.py` is withdrawn.
- **Calm t1 is the calm take** (IoU 0.799 against the anchor). Its 7 px feet move is accepted.
- **Calm t2 is dropped.** It is removed from `keys/`, `crested/` and the discard shadows (the raw keeps it); cell 6 is empty in the K3a and K4a inputs.
- **Shake t1's small droplet** (K2b cell x 59, y 291) is restored in the bare key from the crested twin's droplet at the twin's place: 23 px, `guides/restore-drop.py`.
- **Prompts:** K3a and K4a carry the facing line and the cell-4 line after their first paragraph (`guides/jobs-sit.py`).

## Adult layers and 1× proofs (0 MXN, 2026-10-23 22:56)

**Layers** (`guides/layers-sit.py`, numbers in `guides/layers.json`). This runs the work-queue code unchanged: cut-layers.py's fur_mask, zone_mask and mark_layer, and heads-off.py's rule.
- **Crest overlays:** base + overlay equals the base outside mask and band, 0 differing px on every take.
- **Fur masks:** 0 droplet px in every mask.
- **Zone masks:** cut-layers.py's v4 rule, the top 48 % of each coat column. Not hand-cut; a note to you.
- **HEADS ellipses (cx, cy, rx, ry):** shake t1 (80, 160, 72, 68); shake t2 (95, 140, 75, 72); calm t1 (88, 150, 80, 70).
- **Patches and stripes:** alpha 0 outside the fur mask on every layer.

**24-look dry run** (`proof-looks.py`, with recolour() and ramp_paint() copied unchanged from station-gate a9e24215):
- Outside the fur mask the recolour changes 2,676–3,074 px (single coats) and 318–416 px (two-tones) per take, up to 35 levels. Outside the mask dilated 3 px it changes 0.
- That is the station code's 0.7 px soft edge. The signed anchor does the same (2,897 / 553 px), and belly, eyes, crest and droplets lie further in.
- The exit as written (0 outside the mask) is not met by the station's own code on any key. A note to you.

**Edge:** 0 magenta-cast px on the 2 px edge and 0 px of alpha 1–59 on every take. By eye at 1× over black, #1d232b and near-night: no fringe (`edge-1x.png`).

**Base + crest against the crested twin:** 766–1,291 px differ at alpha > 128. This is the K2 sheet's ~1 px softer edge, within R2.3's outline limit.

**Juvenile gate:** the adult reads-apart and cards proofs are pushed. Shake t1, shake t2 and calm t1 pass checks 6–9. So the juvenile runs.

**Proofs** in `proof/adult/`: `takes-1x.png`, `reads-apart-48-1x.png`, `layers-1x.png`, `cards-1x.png`, `cards-x3.png`, `looks-1x.png`, `window-1x.png`, `edge-1x.png`.
- The window proof is at the Habitat factor 0.5192, feet on y 380, axis x 272, over near-day and the five near backdrops.
- Every new file is in `floor/S01/manifest.json` (signed_in null, status new) and `status.json`.

## Art director's ruling Round 3 (23:07): adult signed, renamed (2026-10-23 23:11)

**Signed:** adult shake t1 → `shake`, calm t1 → `calm`, signed_in "AD 2026-10-23 23:07, 74031d07". The final ids:
- `keys/mibi-adult-S01-base-{shake,calm}-304x312`
- `crested/mibi-adult-S01-{shake,calm}-304x312`
- `overlays/mibi-adult-S01-{shake,calm}-crest-304x312`
- `layers/mibi-adult-S01-{shake,calm}-{fur-mask,zone-mask,patches,stripes}-304x312`

`manifest.json` and `status.json` carry the signature. Shake t2 is removed from `keys/`, `crested/`, `overlays/` and `layers/` (its raws stay). `guides/rename-signed.py` and `guides/rename.json` record the moves.

**Shake t1's glints** are painted out from the neighbouring fur: 70 px at [[182, 129], [174, 160], [191, 162]] (x, y). The same edit is applied to the base and the crested file. `proof/adult/edge-1x.png` is rebuilt: 0 magenta-cast px, 0 px of alpha 1–59.

**Recolour exit, amended (R3.1):** 0 changed px outside the fur mask dilated 3 px. Every take passes, and so does the signed anchor.

**Window, rebuilt (R3.4):** `proof/adult/window-1x.png` now has two rows per key, Dot's look (charcoal and ash, stripes and patches, leaf crest) and the worst coat (charcoal, bare, no marks). It is at the Habitat factor 0.5192, feet on y 380, over near-day and the five signed backdrops. The other adult proofs are rebuilt on the final ids.

**K3j accepted at 0 MXN (R3.2), under amended check 9, bullet 3.** That bullet is now measured on the cut layer over the base key: alpha 0 outside the fur mask, and base + layer differs from the base only inside the coat. Both juvenile layers pass (0 px outside the mask). The returned sheet's outside-coat difference (the 30 / 60 / 90 / 120 table above) stays as a note. Juvenile shake t1 carries one patch mass, against the anchor's two: a sign-off note. The K4j input was built on the K2j bare keys (sha above).

**Juvenile calm (R3.3):** accepted as it is; the final call is at the juvenile sign-off.

## Juvenile layers and 1× proofs (0 MXN, 2026-10-23 23:13)

The juvenile takes are shake t1 and calm t1, for your sign-off; they keep their t1 ids until you sign. Every file is in `manifest.json` and `status.json` (status new, signed_in null).

- **Overlays:** base + overlay equals the base outside mask and band, 0 differing px.
- **Cap pixels in the overlays (R3.7):** 433 and 502 px in the overlays are cap-coloured (teal, not leaf). They are the 4 px root band plus the leaves' soft edge, by the overlays.py rule. The signed juvenile anchor overlay has 379 such px, and the curl 351. On a recoloured coat they show as a thin teal ring at the crest's root, as on the anchor. A note for you.
- **Fur masks:** 0 droplet px.
- **HEADS ellipses:** shake t1 (190, 150, 55, 48); calm t1 (195, 160, 55, 48).
- **Recolour exit (amended):** 0 px outside the fur mask dilated 3 px, on every take and coat. The adult takes and both anchors are also 0.
- **Edge:** 0 magenta-cast px and 0 px of alpha 1–59.
- **Reads apart:**
  - IoU against the anchor and the curl: shake t1 0.76 / 0.555; calm t1 0.733 / 0.631.
  - Pair: 0.635.
- **Window:** two rows per key (Dot's look and the worst coat), at factor 0.6332. That is the adult factor × 0.733 / 0.601, an assumption for P1 to confirm. Feet on y 380, over near-day and the five signed backdrops.

**Proofs** in `proof/juvenile/`: `takes-1x.png`, `reads-apart-48-1x.png`, `layers-1x.png`, `cards-1x.png`, `cards-x3.png`, `looks-1x.png` (walk size 104 × 112), `window-1x.png`, `edge-1x.png`.

Job 1 closes at 38.75 of 43 MXN. Both jobs: 71.73 of 77.

## Art director's ruling Round 4 (23:15): juvenile signed, renamed; both jobs closed (2026-10-23 23:17)

**Signed:** juvenile shake t1 → `shake`, calm t1 → `calm`, signed_in "AD 2026-10-23 23:15, 763a2fad". Renamed with `git mv`, byte for byte: all 14 files (7 per pose) keep their sha256, and manifest.json checks each one. `from` still names the raw sheet, cell and script.

**Final ids, both stages** (`<stage>` adult or juvenile), in `floor/S01/`:
- `keys/mibi-<stage>-S01-base-{shake,calm}-304x312.png`
- `crested/mibi-<stage>-S01-{shake,calm}-304x312.png`
- `overlays/mibi-<stage>-S01-{shake,calm}-crest-304x312.png`
- `layers/mibi-<stage>-S01-{shake,calm}-{fur-mask,zone-mask,patches,stripes}-304x312.png`

The adult keys were signed "AD 2026-10-23 23:07, 74031d07"; the juvenile "AD 2026-10-23 23:15, 763a2fad".

**Amended checks in force:**
- **Check 4:** a figure in cell 4, or in a cell left empty in the input, is cut away and noted. It fails only within 12 px of a seam or if it changes a used cell.
- **Checks 5 and 8:** outline outside the crest zone dilated 10 px, against the twin or the input through the same key-out. Pass when p95 ≤ 4.0 px, max ≤ 6 px, centroid move ≤ 1 px, and mean RGB ≤ 8.
- **Check 7:** one IoU method. The cut key, alpha > 128, the largest island, fitted into 48 and bottom-centred.
- **Check 9, bullet 3:** measured on the cut layer over the base key. Alpha is 0 outside the fur mask, and base + layer differs from the base only inside the coat. The returned sheet's outside-coat difference is a note.
- **Recolour exit:** 0 changed px outside the fur mask dilated 3 px.
- **Check 13 (backdrops):** tag-row grey std ≤ 30.

**MXN (usageMetadata, Pacific day 10-23):**

| Job | Requests (MXN) | Total |
| --- | --- | --- |
| Keys | K1a 0.00 (402), K1a 4.17, K1b 4.32, K2a 3.62, K2b 3.67, K3a 3.75, K4a 3.68, K1j 4.12, K2j 3.81, K3j 3.89, K4j 3.74 | **38.75 of 43, closed** |
| Backdrops | meadow 4.18, pond-a 4.14, rock-a 4.07, wood 4.00, cave 4.23, pond-b 3.89, rock-b 4.09, rock-c 4.38 | **32.98 of 34, closed** |
| Both | | **71.73 of 77**; Pacific day 71.73 of 250 |

**Juvenile window factor, settled (2026-10-24 08:10).** The P1 build measures 0.5822, each stage scaled by its own anchor figure; the adult is 0.5197. The earlier proof assumed 0.6332, which drew the juvenile about 8.8 % too large. `proof/juvenile/window-1x.png` is rebuilt at 0.5822 (0 MXN, `proof-sit.py juvenile <WQL> 0.5822`), in the same two-row form (Dot's look and the worst coat) over near-day and the five signed backdrops. The other juvenile proofs are unchanged.

## (superseded by Round 3) Job 1 stopped at K3j (2026-10-23 23:02)

K3j fails check 9, a failure that is neither a facing nor a cell-4 figure. Under the lead's go (no automatic retries; any other failure stops the job for the art director), K4j is not run and no K3j retry is made. Job 1 stands at 35.01 of 43 MXN.

The juvenile patches layers are cut for you to judge: `layers/mibi-juvenile-S01-{shake,calm}-t1-patches-304x312.png`, shown on the bare keys in `proof/k3j-patches-1x.png`. The repaint lies outside the coat and is not carried by the layer, so the layer may be usable; that is your call. The juvenile stripes (K4j: job and input built, not run) and the juvenile 1× proofs are left.

The share of the figure differing outside the coat, at four thresholds of sum |ΔRGB| (30 / 60 / 90 / 120):

| Key | 30 | 60 | 90 | 120 |
| --- | --- | --- | --- | --- |
| juvenile shake t1 | 6.97 % | 2.46 % | 0.98 % | 0.19 % |
| juvenile calm t1 | 4.01 % | 1.70 % | 0.65 % | 0.21 % |
| juvenile cell 1 | 0.34 % | 0.02 % | 0 | 0 |
| adult shake t1 (K3a) | 0.08 % | 0 | 0 | 0 |
| adult calm t1 (K3a) | 0.14 % | 0 | 0 | 0 |

## (superseded by Round 2) Job 1 stopped again after K2b (2026-10-23 22:44)

Both K2 sheets put a copy of the second reference, the bare anchor, into cell 4, which the brief keeps empty (check 4, a sheet failure). The one adult retry (K2b) is spent, so no adult take passes K2, and K3a, K4a and the juvenile do not run. Under the brief: "If no adult take of a pose survives K2–K4, stop and report. I decide before the juvenile spends."

Apart from cell 4, K2b reads well at 1×: `proof/k2b-crested-bare-1x.png` (crested over bare, anchor and the four takes). The bare keys are cut to `keys/mibi-adult-S01-base-{shake,calm}-t{1,2}-304x312.png` (status new), so you can judge them. The K2 prompt as briefed doesn't say that cell 4 stays empty. If K2 is re-run, or K3 and K4 run on the same pattern, a cell-4 line would likely be needed; that is your call.

**Two more notes for you:**
- **Check 8's 2 px outline:** every take sits at p95 3.61 px. The input cut through the same key-out sits at 2.0, so the line can't be met by this key-out on a returned JPEG; the edge comes back about 1 px softer each round. The mean RGB difference of 3.2–3.5 shows no repaint.
- **Job 1 stands at 15.77 of 50 MXN.**

## (superseded by the 22:31 ruling) Job 1 stopped after K1b (request sent 22:17)

Both adult K1 sheets came back with every take mirrored: the head to the right, against the brief's "adult head to the LEFT" that the prompt carries as written. The one adult retry is spent, so no adult take of either pose survives K1, and nothing was cut. Under the brief ("If no adult take of a pose survives K2–K4, stop and report. I decide before the juvenile spends"), K2a to K4a and the juvenile K1j to K4j are not run. The art director decides. The studio does not mirror a take by itself: mirroring flips the top-left light, and the facing is the art director's call. Job 1 stands at 8.49 of 39 MXN.

The first send of K1a (22:09) was refused with HTTP 402 (prepaid credits depleted, 0 MXN). The owner topped them up and the lead resumed the brief at 22:12.
