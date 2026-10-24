# S01 Sitting habit keys: shake and calm (adult, juvenile)

Under the Station art director's studio brief, 2026-10-23 22:00 (Sitting screen art). The programme lead's go, 2026-10-23 22:06, under decisions.md 2026-10-23 21:54 and the standing rule of 2026-10-17 16:18. Job 1 hard stop 39 MXN; both jobs together 66 MXN. Nothing here is signed.

Started 2026-10-23 22:08 (America/Mexico_City). Spend ledger `log/spend.json` re-read before the first request: no unpushed rows, 0 MXN booked for Pacific day 2026-10-23.

## Composed inputs (sha256, written before each request runs)

Built by `guides/compose-sit.py` at 0 MXN. The stage's canvas transform (crested anchor's alpha box, scale, offset in the cell) is in `guides/compose-sit.json`; every key on every sheet is placed with it, and the cut inverts it.

| Request | Input | sha256 |
| --- | --- | --- |
| K1a `sit-S01-adult-keys-crested-a` | `guides/compose-sit-adult-crested.png` | `3bba33279b462e6093e331c16506e78dbab15f42567f83174af7bc7a717214c4` |
| K1b `sit-S01-adult-keys-crested-b` (the adult retry, check 6: wrong facing) | `guides/compose-sit-adult-crested.png`, the same file | `3bba33279b462e6093e331c16506e78dbab15f42567f83174af7bc7a717214c4` |

## Requests

| Request | Time (Mexico City) | Result | MXN (usageMetadata) | Job 1 total / 39 | Both jobs / 66 | Pacific day / 250 |
| --- | --- | --- | --- | --- | --- | --- |
| K1a `sit-S01-adult-keys-crested-a` (first send) | 2026-10-23 22:09 | **failed, exit check 1**: HTTP 402, "Your prepayment credits are depleted" (RESOURCE_EXHAUSTED); no picture | 0.00 (non-200, not billed) | 0.00 | 0.00 | 0.00 (10-23) |
| K1a `sit-S01-adult-keys-crested-a` (re-sent after the owner's top-up, lead 22:12) | 2026-10-23 22:16 | **failed, checks 6 and 7**: all four takes (cells 2, 3, 5, 6) face RIGHT; the adult faces LEFT (cell 1's face at x 115 of the cell, the takes' at 263-327 against body centres 218-226). Neither take of either pose passes, so the sheet fails. Also: the shake takes' droplets sit on the coat. Passed: check 3 (border median 9 from #FF00FF), cell 1 in place (mean RGB difference 4.3) | 4.17 | 4.17 | 4.17 | 4.17 (10-23) |
| K1b `sit-S01-adult-keys-crested-b` (the adult retry; adult total before it 4.17 ≤ 18.6) | 2026-10-23 22:17 | **failed, checks 6 and 7 again**: all four takes face RIGHT (by eye at 1×: every face, eye and snout on the cell's right side; cell 1 faces left). Neither take of either pose passes. Passed: check 3 (border 8 from #FF00FF), cell 1 in place (mean RGB difference 4.5). The droplets now sit mostly clear of the coat | 4.32 | 8.49 | 8.49 | 8.49 (10-23) |

## Job 1 stopped (2026-10-23 22:19)

Both adult K1 sheets came back with every take mirrored: the head to the right, against the brief's "adult head to the LEFT" that the prompt carries as written. The one adult retry is spent, so no adult take of either pose survives K1, and nothing was cut. Under the brief ("If no adult take of a pose survives K2–K4, stop and report. I decide before the juvenile spends"), K2a to K4a and the juvenile K1j to K4j are not run. The art director decides. The studio does not mirror a take by itself: mirroring flips the top-left light, and the facing is the art director's call. Job 1 stands at 8.49 of 39 MXN.

The first send of K1a (22:09) was refused with HTTP 402 (prepaid credits depleted, 0 MXN). The owner topped them up and the lead resumed the brief at 22:12.
