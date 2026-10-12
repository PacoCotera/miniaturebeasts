# Idle full-screen seam (Oct 11, 0 MXN)

QA's diagnosis (internal 2f1da9f, boards/station-vivarium-polish-fullscreen.md). On all four Idle lights, the side fixtures (wall panels, feed line, mister pipe) started on a hard horizontal line at rows 114–118 under the out-of-focus canopy band. Pass 96's seam fix had blended only x 80–940. The programme lead's go (18:28) was for a local edit only.

**The edit** (`edges.py`):
- In the side bands (x < 104 and x ≥ 856, feathered into the canopy over 24 px), rows 0–119 carry the fixtures straight up from row 120, so they meet the protected rows without a step.
- Rising into the band, they soften the way the band itself is out of focus: blur grows from 0 at row 119 to σ 5 px at row 60 and above.
- The wall's grain from rows 120–135 is mirrored across the join and fades out over 16 rows.
- **Rows 120–567 are byte-identical** to main 489d08df, asserted per light, so the Vivarium's whole (rows 120–559) is unchanged.

**Measured:** the largest row-to-row step in the side bands, rows 112–128, is 2–3 levels in every light. Before, the right wall stepped 5–10 levels a row across the seam.

**1×:** `top-band-1x.png` (rows 0–199, four lights) and `edges-1x.png` (the side bands). The walls, hose and mister now run up to the top edge; no cut line shows. **Signed** by the art director; the new files are in `slices/`. Two earlier tries were refused at 1×: a mirror repeat, which stacked the pipe's collar and the vent, and a period repeat, which ghosted the plants as grain.

**Pass 2 (19:12, QA on #166, internal 10e0343).** At 8× the mister pipe's left edge was notched at rows ~105–118. The cause was the mirrored grain, which also mirrored the collar's edge. The grain is now clipped to ±6 levels, so only texture crosses the join, not edges. **The notch is gone. The largest row step in the side bands, rows 100–128, is still 2–3 levels. Rows 120–567 are still byte-identical.** The rope's braid softening into the blur at rows ~105–120 is the intended defocus. It reads at 1×, so it is kept. QA's faint step at rows 120→121 is in the protected painting, ±3 luminance, and I don't see it at 1×, so it is left. A tried alternative (a median source row plus a later blur onset) put a visible line at the join and was refused.
