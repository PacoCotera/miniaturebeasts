# T-20261016-201 rework (build/t-201-drawn-looks @ dcd3df7b): the art director's gate

**Verdict: pass.** The juvenile condition is met by `vivarium-juveniles.png` (head unchanged, dcd3df7b).

## Passes
- **The masters:** the figures are the signed version 4 set, cut down from 304 × 312 and never up. The crest overlay, patches and stripes stack as in the masters gate, and the eye rings are flagged as stand-ins.
- **Size:** every adult is 54 px in the Vivarium full screen, from the one config (`stand-sizes.json`), which matches the art direction page's "Size and pose". The face strip's 48 px tiles show the four individuals.
- **Light and edges:** one top-left light on every figure, with no fringe at 3×.

## The condition (met)
- **A capture with juveniles.** The proof shows four adults only, so the layered juvenile is proven by tests but not seen. One more capture of the same state, with two of the four as juveniles (40 px, one with the crest and one bare), passes it.

## For the next Vivarium ticket, not this one
1. **Contact shadows.** At 54 px the base key's baked shadow is too faint to see, so the residents look pasted onto the moss. Each stand needs its signed contact shadow at the figure's width, under the feet, drawn before the sprite.
2. **The ring and name tag** still size from the old 144 px slot: Dot's ring is about three times its feet. UI/UX's figure-based ruling fixes it.
3. **Walk placement.** The resident at the upper right stands above the back slope with no ground under it. Walkers keep to the walkable ground, or a hop shows its shadow on the ground below.

## A finding for the game designer and the lead
At 54 px on charcoal, **stripes on a bare head and patches on a bare head barely read as two looks** (the second and fourth resident). They pass the masters gate at 144, and the 48 px tiles still separate them. The colour ramps (T-20261016-203) will add a second cue. If they still read alike in colour, the fix is in the mark layers' contrast, not the size.

**Met:** two juveniles at 40, one crested with stripes and one bare with patches, layered on the signed juvenile keys and lit like the adults. On the cap, stripes against patches are as tight at 40 as on the adults at 54 (the finding above), and the crested juvenile at the back stands off the ground (item 3).
