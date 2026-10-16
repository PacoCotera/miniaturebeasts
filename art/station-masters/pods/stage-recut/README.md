# Fix 5 Pods P-A1, P-A2: the stages without their grey plates, 0 MXN, by hand

`recut-stages.py` takes the right part of each stage from the signed base stage `room-bench-stage`. That is the same painting without the plates. The seam is feathered over 24 px, at x 418 on the chapter stage and x 578 on the overview.

The base's lower-right hose would run under the page, so it is painted out:
- **Mask:** grey or dark pixels and the brass tips inside the floor box (655–952 × 222–492), grown 4 px for the hose's shadow.
- **Fill:** the case floor's own grain from 320 px to the left, set to the surrounding floor's tone and feathered.
- **What remains:** the corner keeps a soft darker shade toward the wall.

On the overview the old painted stamp case goes with the plate. Fix 4 places `room-stamp-case-152x152` and `-front` at 788,384.

Proofs at 1×: `proof-chapter-1x.png` and `proof-overview-1x.png` (with the fix 4 case).

**Status:** new. Signed in the whole Pods captures.

## Gate batch 1: the chapter stage's heading band cleared (AD, 10-15, 0 MXN)

The heading row of the two-row chapter page (screen 360–952 × 88–136) ran over the painted hose, the gauge and the vent. `clear-heading-band.py` repaints the floor in x 340–960 from the floor's top edge to slice y 116, which removes the hose's top run, the gauge and the vent there.
- **Tone:** a harmonic fill from the band's four edges, so the fill meets the signed paint with no step.
- **Grain:** taken from 90 rows lower, mirrored within the floor.
- **The hose:** it now ends at x 330 in its own brass fitting, moved from the signed nozzle.

The overview stage keeps its gauge and vent.

Proofs at 1×, mocked into today's captures: `proof-band-six-traits-1x.png` and `proof-band-chapter-page-1x.png`.
