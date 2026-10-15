# Fix 5 Pods P-A1, P-A2: the stages without their grey plates, 0 MXN, by hand

`recut-stages.py` takes the right part of each stage from the signed base stage `room-bench-stage`. That is the same painting without the plates. The seam is feathered over 24 px, at x 418 on the chapter stage and x 578 on the overview.

The base's lower-right hose would run under the page, so it is painted out:
- **Mask:** grey or dark pixels and the brass tips inside the floor box (655–952 × 222–492), grown 4 px for the hose's shadow.
- **Fill:** the case floor's own grain from 320 px to the left, set to the surrounding floor's tone and feathered.
- **What remains:** the corner keeps a soft darker shade toward the wall.

On the overview the old painted stamp case goes with the plate. Fix 4 places `room-stamp-case-152x152` and `-front` at 788,384.

Proofs at 1×: `proof-chapter-1x.png` and `proof-overview-1x.png` (with the fix 4 case).

**Status:** new. Signed in the whole Pods captures.
