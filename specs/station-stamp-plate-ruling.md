# The Incubator stamp plate under the slot's look: ruling

Creative director, ticket T-20261016-18. Written 2026-10-16 (America/Mexico_City). It rules the conflict in results/T-20261016-16.md. The plate must match the machinery (results/review-incubator.md, Fixes 1, "looks flat"). But under the stamp slot's look (K 0.20 × WARM), no master can compose above luminance 0.186, against the R machinery's p95 0.315. Read at batch/B-20261016-1 bc866c71: `frame.json regions.stampSlot`, `prototypes/station/src/stamplook.mjs`.

## 1. Ruled: (1) exempt the plate from the look; the look stays on the stamp glyph

**What changes.** On the Incubator the plate is no longer the label's dimmed fill. It is a painted part of the machinery: the master `stamp-plate-120x120`, placed 1:1 at (804, 232) with no K × WARM and no code-drawn hairline (the master paints its own edge). The stamp glyph still gets K 0.20 × WARM, exactly as now, and is drawn centred on the plate.

**Why.** The look was signed for a flat bone card: it keeps the label "unlit, in its shade" so it never becomes the brightest thing on screen. On the Incubator the plate is now a box of the machinery, and the machinery is already governed:
- by the zone caps (R p95 ≤ 0.34);
- by the brightness ruling, under which the chamber's lit glass stays at least 0.08 above every zone (`specs/station-incubator-brightness-ruling.md`).

Applying a second dimming to one box of that machinery is what makes it flat. The thing the look protects, the stamp in shade, keeps its look.

**Why not (2), a dark recessed plate.** It answers "looks flat" with a near-black square (variant A, mean 0.067). That keeps the defect the review failed and drops "the same light, material and edge".

**Why not (3), K about 0.30.** It changes a signed value that the stamp glyph shares, so the stamp brightens too. It still cannot reach the lit edges: the small box's p95 would need pre-look values above 1.0. It would also re-open the art director's sign-off for a partial result.

## 2. Scope: the Incubator only

- **Create** (K 0.20) and the **Habitat card** (K 0.20) keep today's label: the bone plate under K × WARM with the 1 px hairline. No review has failed them on the plate, and there the label sits on a ground, not in machinery.
- **Pods** (K 0.75, in its case) and the **Library** are unchanged.
- **The principle,** for a future screen: when the slot's plate is a painted part of a room's machinery, it is placed 1:1 under that room's rules and only the glyph takes the look. That needs its own ruling per screen. It does not apply automatically.

## 3. Conditions the build checks (Incubator, states growing, ready, hatch-1100)

1. **Plate tone.** Over the plate rect (804, 232, 120, 120) in the composed 1× capture, the p95 relative luminance is ≤ 0.34, the R zone cap. It is measured with the glyph drawn.
2. **The slot's brightness rule still holds** (`frame.json regions.stampSlot.brightness`). The label rect's mean and p95 are each below the same measures of the state's main object. The existing check is used unchanged.
3. **The chamber condition still holds.** The chamber value minus the highest zone p95 is ≥ 0.08 (brightness ruling §2). The plate is not one of the four zones, but its p95 must not exceed the chamber value minus 0.08 either.
4. **The glyph is unchanged.** Its pixels are identical to today's, with K 0.20 × WARM over the stamp's own pixels, centred, up to 104 × 104. Only the pixels under the glyph's transparent areas change, because those now show the painted plate instead of the dimmed bone.
5. **The code text and rule are unchanged:** (776, 357, 176, 25), baseline 373, rule y 381, x 792–936.

## 4. Spec text (for the build ticket to apply in `frame.json regions.stampSlot.look.values`)

After "K 0.20 on Create, the Incubator and the Habitat card,", add: "except the Incubator's plate, which is the painted master `stamp-plate-120x120` placed 1:1 with its own edge (no K × WARM, no hairline); the Incubator's stamp still takes K 0.20 × WARM (CD ruling, specs/station-stamp-plate-ruling.md)". The `status` stays signed. The art director's look values are not changed: the ruling moves the plate out from under the look, it does not re-value the look.
