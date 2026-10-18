# T-235 Vivarium polish: UI/UX rulings (build 1be7ffed; stills at work-queue 31c04907)

**PASS on UI/UX, with the answers below.**

What the stills show:
- In the twelve-resident still, every resident stands on the moss, including the ones on the back ridge, which stand on the ridge itself and not in the haze above it.
- The rings sit at the feet and are sized to the figure.
- The tag flips over a resident near the window's foot (Dot), and a sleeper's tag stands over its curl (Moss).
- The shadows ground the figures without darkening the moss round them.
- Idle and Home carry the figures at 54/40.

The art director's gate is asked separately.

## Open questions

1. **keepOut: 356.** The spec's rule is "recomputed from the measured curlH", and 353 was an estimate from about 31. The measured adult curl is 28, so the sleepers' tag top is 456 − 28 − 32 = 396, and keepOut's top is 396 − 40 = **356**.
   - The build derives it from the measured curl, never a typed number, so a new curl moves it.
2. **Moving residents get figure geometry, measured once per atlas.** For each moving set, the logic process measures, when it composes the atlas:
   - the union bbox of the ink (alpha ≥ 128) over the set's grounded frames (walk and idle, not a hop's airborne frames): its W, its H, and its x-centre;
   - the feet line, as the lowest ink row over those frames.
   
   These are cached with the atlas and sent as the resident's `figure`. The ring and tag then hold still while the figure animates, with no per-frame jitter. A hop draws from the same F, so its shadow stays on the ground.
3. **Every species' curl is reduced to world size.** A species without the 96 × 88 nap master still reduces whatever nap picture it has by its standing figure's factor, offline, by the same tool. A world view never shows the old-size curl.
   - If a species has no nap picture at all, its sleeper draws as its standing figure, with no curl. That is a stand-in, not the old size.
4. **The draw order is accepted as built:** the ring, then the picture with its baked shadow.
   - The ring is (W + 10) wide, so its outer 5 px at each end show past the shadow, which is as wide as the foot. The stills read correctly.
   - The spec's §3 order is amended to "ring, picture (with its shadow), dither, lamp".

## The builder's readings: all confirmed

| Reading | Ruling |
| --- | --- |
| The shadow only in home, vivarium and idle (not the Habitat or the tiles) | **Confirmed.** The tiles are pictures, not the world. The Habitat's shadow belongs to its own ticket (its 150/110 close-up will want it, at that view's reduction) |
| The stand canvas extended 17 rows, with the figure about 4 px above the picture's bottom | **Confirmed.** All geometry comes from F (the ink), so the picture's margin doesn't matter |
| The figure measured at alpha ≥ 128 | **Confirmed** (§0) |
| A curl's foot line is its last ink row | **Confirmed** |
| Ground draws rejected above the profile (8 tries, then the fallback to groundTop) | **Confirmed** (§4) |
| Home's event tag isn't built, because no event tag exists yet | **Confirmed.** Nothing to build until the event exists. The rule (§2) waits for it |

## The art director's gate: PASS, with one bug (the ring's offset)

The art director passes the art (`results/T-20261018-235/art-director.md`), accepting the shadow over the ring's middle, the reduced curls and one measure per atlas.

**The bug: Dot's ring sits about 7 px below its drawn feet** (`vivarium-back-slope-twelve`, zoomed). It also shows the 4 px focus lift on top of that, so the ring reads as a mark on open moss. Dot is in front and is not hidden, so this is an offset, not draw order.

- **The cause,** from the numbers: F is measured as the last ink row at alpha ≥ 128, after the shadow layer is composed. The shadow is warm near-black at 0.8 (alpha about 204), so its rows count as ink, and feetY lands on the shadow's foot, 4 to 6 px under the real feet.
- **Fix:** measure `figure` (§0) on the stand **without its `under` layers**, from the base and its `over` layers only, then compose the shadow. F then sits on the feet, and the ring (centred on F, the figure lifted 4) lies under the feet as in §1.
- The same holds for the curl's foot line and the moving atlases' measure.
- **Test:** for each composed stand, feetY equals the last ink row of the stand composed without its shadow.

## The fix round (bbdb1776): two rulings

**A correction first:** my diagnosis above was wrong. The figure was already measured without the shadow. The offset the art director saw is the 4 px focus lift, one soft pixel (alpha 133) under the solid feet, and the ring's own thickness. The ring's centre sits exactly on the last ink row.

1. **The ring reading: two small changes, so the lifted feet stand inside their ring.**
   - **The feet line is the last solid row** (alpha ≥ 200), not the last ink row at ≥ 128. A soft anti-aliased fringe isn't ground contact.
   - **The focus lift scales with the figure: 2 px at the world sizes** (54 and 40). It stays 4 at the 150/110 close-up and above. At 144 px the 4 px lift was about 3 % of the figure; at 54 it is 7 %, enough to lift the feet off the ring.
   - With both, the lifted feet sit at feetY − 2, inside the ring's upper half (feetY − 10 to feetY + 10 at W 57). The ring stays centred on the ground.
   - The art director checks the result on the next stills.
2. **Species without the 96 × 88 nap master: the standing fallback is accepted.** Those species (S04 onward) draw from the rig, the genome stand-in rendered at runtime, so there is no master to reduce offline. They sleep as their standing figure until their signed masters land, when they take the reduced curl like S01–S03.

**Checked and confirmed:** keepOut derived as [752, 356, 256, 116] (to the foot band at 472), and the moving residents' figure taken from the atlas union. Please push the new stills (vivarium-moving, idle-night-moving), so the art director can check the ring with the 2 px lift.

## The final ring (build 9598f73a; stills at work-queue ea50c511): UI/UX PASS

In `vivarium-back-slope-twelve`, Dot's feet now stand inside the upper half of its ring, with its shadow inside the ring. The ring reads as Dot's footprint, and the flipped tag sits over Dot. The art director's check of the same stills completes the gate.

## The art director's re-gate: the ring passes, the moving residents do not

**UI/UX agrees, and adopts the fix.** In `vivarium-moving` and `idle-night-moving`, the atlas residents are about twice world size (adults about 105 px, juveniles about 60). They also draw plain charcoal, without their own looks. A walking mibi must be the same animal at the same size as when it stands.

1. **Each moving atlas is reduced offline** by its stage's standing factor (54 / 40 over the figure's height in the master), measured once over the grounded frames. The figure geometry (§2 above) comes from the reduced atlas.
2. **The looks follow the layered stand.** A moving resident shows its own coat and marks, as its stand does.
3. **Until the atlases carry the layers,** a moving resident is drawn as its **layered stand translated along its path**, with no walk cycle. Size and identity come before the cycle. The atlas returns for that species once it carries the layers at world size.

**Test:** a moving resident's figure height equals the standing figure's (54 / 40, ±1 px), and its composed looks match its stand's.
