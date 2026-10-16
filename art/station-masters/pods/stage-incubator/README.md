# Fix 5 IA1: the Incubator stage, the chamber's machinery (AD, 10-15)

`room-bench-stage-incubator` is recut under the same id. It is still 1024×522 at (0, 40).

**Made by:** `paint-machinery.py SRC OUT`.
- New painting lies only in the spec's four paint zones (boards/station-fix5-incubator-probe-spec.md I1, screen rects):
  - L (80, 88, 160, 312)
  - R (784, 88, 160, 144)
  - LM (248, 320, 96, 80)
  - RM (680, 320, 80, 88)
- Every pixel outside them is the signed stage (d09acb12) unchanged: 0 changed, measured. That covers the leaf band, the chamber and base, the label's place, and everything below y 405.

**What is painted:**
- L: two risers with sand clamps, a slatted vent, a service unit on a branch with a ribbed panel, and a junction box.
- R: a duct from the right wall feeding a slatted vent hood and a small enamel unit.
- LM: a valve unit with a sand handwheel.
- RM: a small pump on the line down to the right hose.

**How it is painted:**
- Materials: matte sage metal (#58634f flat), sand enamel (#706a58) and hose rubber, the stage's own. Nothing is lit; there is no text, gold, teal, amber or glass.
- Each piece is a height field (bevelled boxes, true cylinders, flanges, grooves, bolts). It is shaded lambert from the top left at 4× and area-reduced to 1×, so the edges are soft.
- Each piece gets the wall's own grain and a light falloff across its face, and casts a soft shadow down and right with contact occlusion on the wall.

**Gate, measured** (relative luminance; cap p95 ≤ 0.162, the darker right gauge housing; mean ≤ the empty chamber's back, 0.287):

| Zone | p95 | Mean |
|---|---|---|
| L | 0.138 | 0.099 |
| R | 0.146 | 0.073 |
| LM | 0.141 | 0.100 |
| RM | 0.136 | 0.066 |

**Proof:** `proof-empty-1x.png`, the empty state at 1×: the stage with the dome back, standby inside and front. The AD signs in the builder's whole-screen captures of every Incubator state, beside the concept board 18c17261.
