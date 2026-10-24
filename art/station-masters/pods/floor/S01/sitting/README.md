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
| K2a, second reference | `guides/compose-sit-adult-bare-anchor-ref.png`: the signed bare anchor (7e52ae98…) at 304 × 312 flattened on #FF00FF | `3dd6e52e4a573ec3f64e61e64e0bd835b94ec75f64a5857666b3a6b1b0e4997d` |

## Requests

| Request | Time (Mexico City) | Result | MXN (usageMetadata) | Job 1 total / 39 | Both jobs / 66 | Pacific day / 250 |
| --- | --- | --- | --- | --- | --- | --- |
| K1a `sit-S01-adult-keys-crested-a` (first send) | 2026-10-23 22:09 | **failed, exit check 1**: HTTP 402, "Your prepayment credits are depleted" (RESOURCE_EXHAUSTED); no picture | 0.00 (non-200, not billed) | 0.00 | 0.00 | 0.00 (10-23) |
| K1a `sit-S01-adult-keys-crested-a` (re-sent after the owner's top-up, lead 22:12) | 2026-10-23 22:16 | **failed, checks 6 and 7**: all four takes (cells 2, 3, 5, 6) face RIGHT; the adult faces LEFT (cell 1's face at x 115 of the cell, the takes' at 263-327 against body centres 218-226). Neither take of either pose passes, so the sheet fails. Also: the shake takes' droplets sit on the coat. Passed: check 3 (border median 9 from #FF00FF), cell 1 in place (mean RGB difference 4.3) | 4.17 | 4.17 | 4.17 | 4.17 (10-23) |
| K1b `sit-S01-adult-keys-crested-b` (the adult retry; adult total before it 4.17 ≤ 18.6) | 2026-10-23 22:17 | **failed, checks 6 and 7 again**: all four takes face RIGHT (by eye at 1×: every face, eye and snout on the cell's right side; cell 1 faces left). Neither take of either pose passes. Passed: check 3 (border 8 from #FF00FF), cell 1 in place (mean RGB difference 4.5). The droplets now sit mostly clear of the coat | 4.32 | 8.49 | 8.49 | 8.49 (10-23) |

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

## Job 1 stopped after K1b (request sent 22:17)

Both adult K1 sheets came back with every take mirrored: the head to the right, against the brief's "adult head to the LEFT" that the prompt carries as written. The one adult retry is spent, so no adult take of either pose survives K1, and nothing was cut. Under the brief ("If no adult take of a pose survives K2–K4, stop and report. I decide before the juvenile spends"), K2a to K4a and the juvenile K1j to K4j are not run. The art director decides. The studio does not mirror a take by itself: mirroring flips the top-left light, and the facing is the art director's call. Job 1 stands at 8.49 of 39 MXN.

The first send of K1a (22:09) was refused with HTTP 402 (prepaid credits depleted, 0 MXN). The owner topped them up and the lead resumed the brief at 22:12.
