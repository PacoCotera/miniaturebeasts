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

## Stopped at 22:09, resumed 22:16 (was: 2026-10-23 22:09)

The API account's prepaid credits are depleted, so no request can return. The work stopped after K1a and was not retried: a retry would fail the same way, and billing is outside the studio. Nothing else ran: K2a to K4a, the juvenile K1j to K4j and the backdrops B1 to B5 are not made. Resuming needs the credits topped up (owner, through the lead). After that, the next request is K1a again, as `sit-S01-adult-keys-crested-a` (the 402 was not a model result, so it is the same request, not a letter-b retry; the lead's call).
