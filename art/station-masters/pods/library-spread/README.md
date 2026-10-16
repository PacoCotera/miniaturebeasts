# T-20261015-05: the Library spread, art pass (AD, 10-15)

**What was wrong**, against Pods and Home:
1. The creatures were the code rig's pixel tokens, a third rendering.
2. The spread was the flat placeholder: a flat cream page on a flat brown board, with flat ruled frames.
3. The progress seeds were 8 px, the roundels 12 px (their shape about 8), and the corner and seal were flat placeholders.

**Masters.** 1 Pro call for the book; everything else by hand.

| Id | Size | |
|---|---|---|
| `library-stage-spread-1024x522` | same | The painted journal (`rw-lib-spread`) fitted by `fit-book.py`. The frames, mats and caption rules are by `make-spread.py`. |
| `spread-plate-{S01,S02,S03,S09}-80x96` | same | The painted adults, downsampled and tipped in. |
| `clan-roundel-C01..C16-16x16` | **new size**, was 12 × 12 | The clan's shape from the signed `mark-clan-*-24x24`, in its ink. |
| `spread-progress-{full,empty}-12x12` | **new size**, was 8 × 8 | A pressed seed, and its outline. |
| `spread-gilt-corner-16x16`, `spread-seal-16x16` | same | The seal is `guide-seal-32` downsampled. |

**Layout numbers the builder needs** for the new sizes (centres unchanged):
- roundel at `[x − 2, y − 20, 16, 16]` (was `[0, −18, 12, 12]`);
- seeds 12 × 12 at `[21, 35, 49, 63]`, y +150 (pitch 14; was 26/38/50/62 at y +152, pitch 12).

**No painted picture, not invented:**
- `spread-plate` for S04–S08 and S10–S16, and `spread-study-*` for all sixteen. The met study (Hiljan, S04) stays as captured.
- S12 has only a juvenile painting and a face crop, so it isn't plated here.

**Proof:** `proof/mock-library-spread-1x.png`, `proof/mock-library-spread-empty-1x.png` and `before-after-*`.
