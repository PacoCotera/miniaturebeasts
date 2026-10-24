# Sitting place backdrops, near treatment (job 2)

Under the Station art director's studio brief, 2026-10-23 22:00. The programme lead's go 22:06, resumed 22:12 after the owner topped up the credits. Hard stop 27 MXN; both jobs together 66. Nothing here is signed. The signed 10-09 backdrops in `slices/` are untouched.

Model `gemini-3-pro-image`, 4:3, 1K, `"tries": 1`. Refs, in order: `slices/vivarium-near-day-544x408.png` (6f0c2e64…, the treatment) and the place's 96 card (the place). Prompt as the brief, `source/work/sitting-backdrop-*-near-*.json`. Each raw came back 1200 × 896. The cut (`guides/cut-bd.py`): centre-crop 1195 × 896, LANCZOS once to 544 × 408, nothing else. Measures: `guides/measure-bd.py` (near-day reproduces 15.8 / 144.5 / 48.9 / 2.0 and zone 0.26), all rows in `guides/measures.json`.

| Request | Time | MXN | detail ≥ 11 | sat 90–160 | spread ≥ 35 | key ≥ 1.3 | zone 0.12–0.35 | feet band ≥ 11 | tag std ≤ 20 / p99 ≤ 200 | Result | Job 2 / 27 | Both / 66 | Day / 250 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B1 meadow-near-a | 22:18 | 4.18 | 12.3 | 111.4 | 48.1 | 2.80 | 0.305 | 11.5 | 3.7 / 139 | **pass** | 4.18 | 12.67 | 12.67 |
| B2 pond-near-a | 22:19 | 4.14 | **5.4** | **88.7** | 47.3 | 1.38 | 0.335 | **4.1** | 7.3 / 153 | **fail** gate 10, check 12 | 8.31 | 16.80 | 16.80 |
| B3 rock-near-a | 22:19 | 4.07 | **8.9** | **79.2** | 50.1 | 3.68 | 0.267 | 12.4 | 8.8 / 135 | **fail** gate 10 | 12.39 | 20.87 | 20.87 |
| B4 wood-near-a | 22:20 | 4.00 | 14.5 | 115.1 | 53.1 | 2.27 | 0.257 | 16.4 | 19.8 / 148 | **pass** | 16.39 | 24.88 | 24.88 |
| B5 cave-near-a | 22:20 | 4.23 | 14.5 | **82.7** | 55.6 | 1.70 | 0.305 | 20.1 | **31.9** / 181 | **fail** gate 10, check 13 | 20.62 | 29.11 | 29.11 |
| B2 retry pond-near-b (worst gate miss first) | 22:21 | 3.89 | 11.4 | 100.5 | 48.3 | 2.06 | **0.412** | 12.0 | 19.1 / 163 | **fail** check 11 | 24.51 | 33.00 | 33.00 |

Times are America/Mexico_City, 2026-10-23; Pacific day 10-23. MXN are from usageMetadata (`log/spend.json`). Bold marks a miss.

**Stopped at the hard stop.** A second retry would need 24.51 + 4.80 = 29.31, over 27, so it was not sent. Rock and cave are not retried.

**What is in `slices/`** (`status: new`, `signed_in: null`): meadow and wood pass gates 10 to 13. Pond is the b take, the only one past gate 10; it fails check 11 on its bright haze in the figure zone. Pond-a stays only as its raw. Rock and cave miss gate 10 on saturation (rock also on detail), and cave misses check 13 on pebbles in the tag rows. All of them are the art director's call.

**Notes for the art director (studio, not checks):**
- Meadow: the ground under the feet line is a soft, flat strip from about y 340 down. The feet band passes at 11.5, just over 11.
- Wood: twigs cross the bottom of the figure zone at about y 285. The tag rows are at 19.8, just under 20.
- Check 14 (reads as its card): see `proof/cards-pair-1x.png`. All five are warmer and lighter than their 96 cards.
- Check 13 as written fails near-day itself (tag std 28.0), as the brief notes.

**Proofs** (`proof/`, built by `guides/proof-bd.py`; rows meadow, pond-a, pond-b, rock, wood, cave):
- `beside-near-1x.png`: near-day | the repaint with the adult anchor in Dot's look | the same with the figure zone (cyan), tag rows (yellow) and feet line y 324 (red). The anchor uses station-gate's built S01-adult-304x312 layers (base charcoal-and-ash + patches + stripes + crest) at the Habitat factor (figure 136 × 149), last solid row on y 324, axis x 272.
- `feet-x3.png`: x 160–384, y 270–372 of each, with the mibi, ×3.
- `cards-pair-1x.png`: each repaint beside its 96 card.

First written 2026-10-23 22:23.

## Art director's ruling 22:31: fixes at 0 MXN (2026-10-23 22:38)

- **Check 13's limit is now tag-row grey std ≤ 30** (it was 20). p99 ≤ 200 and the "holds an object" clause stand.
- **Meadow and wood:** sign as cut.
- **Pond (pond-b):** local burn with `guides/fix-bd.py`: linear light ×0.70 in x 150–394 × y 110–285, feathered σ 36. sha256 `3b59658f…b775`, matching the ruling's render. After the fix: detail 11.3, saturation 100.7, spread 45.6, key 2.10, zone 0.314, feet band 11.9, tag 19.0 / 162. It passes. Pond-a is retired; its raw stays.
- **Cave:** cropped 1050 × 788 at (75, 108), LANCZOS once, Color 1.15, with `guides/fix-bd.py`. sha256 `df1ea304…65c3`, matching the ruling's render. After the fix: detail 14.2, saturation 98.0, spread 53.1, key 1.40, zone 0.318, feet band 17.9, tag 27.7 / 172. It passes.
- **Rock:** retry B3b with the ruling's changed prompt (below, when run).
- The proofs are rebuilt with pond-a gone. Rows: meadow, pond, rock, wood, cave.

## B3b rock (2026-10-23 22:45)

| Request | Time | MXN | detail | sat | spread | key | zone | feet band | tag std / p99 | Result | Job 2 / 30 | Both / 80 | Day / 250 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B3b rock-near-b (the ruling's prompt) | 22:44 | 4.09 | 14.6 | 125.3 | 44.9 | **1.06** | **0.355** | **9.5** | 4.8 / 150 | **fail** gate 10 (key), checks 11 and 12 | 28.60 | 44.37 | 44.37 |

Detail and saturation now pass. The key fails: the light falls from the back right, so the top-left quadrant is not brighter than the bottom-right (1.06 against 1.3), and the light would flip. The view also looks down onto the ground, and below y 335 a soft strip pulls the feet band to 9.5. Under the ruling ("If B3b fails gate 10 again, stop and report. A B3c is my call"), job 2 stops at 28.60 of 30 MXN. A B3c would also not fit: 28.60 + 4.80 is over 30.

`slices/` holds rock-b (status new, failing); rock-a stays as its raw. The proofs are rebuilt.
