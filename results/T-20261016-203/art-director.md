# T-20261016-203 (build/t-203-colour-ramps @ f7e6a4b0): the art director's gate

**Colour: pass.** **Markings: not yet.** Stripes and patches don't read apart at 54 on charcoal, and the fix is in the patches layer, not the build.

## Colour
The four real pods (`vivarium-four-real-pods-54.png`) read as four coats at 54:
- charcoal;
- russet, a warm red-brown;
- charcoal and ash, as a two-tone back against flanks;
- ash, a cool blue-grey.

The ramps are the signed ones, run unchanged, and the belly, eyes and crest keep their colour. Four-grey still separates the three pigments.

## Stripes against patches at 54 (the game designer's ruling)
**They don't separate** (`charcoal-stripes-vs-patches-54-4x.png`). Both read as pale bars on the rear flank.

The cause is in the signed patch layer (T-20261016-200), not the build: the patch layer's main shape is a long crescent in the same place as the three stripe crescents. Its three small spots are 1 to 2 px at 54, so they vanish. At 0.23 scale, a crescent is a stripe.

**What the mark layers need**, tested in `marks-test-54-4x.png` (`make-marks-test.py`): left, stripes; middle, the signed patches; right, a test of the rule below.
- **Stripes stay as they are.** Three or more parallel bands with even gaps are the rhythm that says "stripes".
- **Patches become two large rounded shapes, set apart:**
  - one on the back or shoulder, behind the head and clear of the eye;
  - one on the haunch.
  - Each is at least about 45 px across at the master, which is about 10 px at 54.
  - No crescents, no bands, and no spots under about 25 px.
  - Their edges stay irregular and soft, as painted.
- **The test separates at once** at 1×: round masses against a row of bars. It is code-drawn and flat, a readability test only. It does not stand in for the painting.

**Making it:**
- The patch layers are repainted: M1 for the adult keys and M3 for the juveniles, on the T-200 spec with this shape rule.
- That is two studio requests, under the lead's cap and the owner's go.
- Stripes, ramps, zones and the build are unchanged, and the new layers drop in through `make-stand-layers.py`.
