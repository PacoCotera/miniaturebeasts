# S04 topline keys for the tier 2 test (Oct 11)

The input to builder 3's warp matrix (tier2-method.md §4; PR #151). Three keys of the young S04 at 304×312, 104×112 and 96×88, each in two layers:
- `-body`: alpha is 0 or 255 only, with no soft fringe (the input prep ruled at 15:34);
- `-shadow`: the painted shadow on its own, shadow colour #1e1a22 at alpha 110. It is never warped.

| Key | From | |
| --- | --- | --- |
| `level` | `source/raw/mibi-juvenile-S04-a.jpg` (the signed stand-in's own raw) | the middle bin, the warp's source |
| `dipping` | `source/raw/trait-S04-topline-dipping-a.jpg` (Pro edit of that raw, a6e9872b) | painted end, topline down |
| `arched` | `source/raw/trait-S04-topline-arched-a.jpg` (Pro edit of that raw, a6e9872b) | painted end, topline up |

**Registration.** `cut-topline.py` keys each raw with the adult cut's method. It then places all three with **one transform per size**: the one that fits the level raw's body box onto the signed stand-in at that size (left edge and feet row matched). Scales and offsets are in `cut-topline.json`. The edits kept the head, legs and feet in place, so the three register with each other and with the signed stand.

**Measured** (`cut-topline.json`):
- Every body is one component with 0 magenta pixels.
- At 104×112 and 96×88 there are 0–21 enclosed px. That is the gap between the legs, the same as the signed stand-in's own 23 px at 104×112. It is not a defect.

**Signed** by the art director at 1× on #D6CEBE (`topline-keys-1x.png`) as the warp test's inputs. These keys are test material, not stand-ins for the face.
