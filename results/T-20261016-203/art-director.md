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

## The patches, round 2: signed (masters-pods 14fe2c4a, `concepts/loika-v4-patches-r2/`)

**Pass, cut with the head left off. No retry is needed.** The cut layers are in `patches-r2/`, and they replace the eleven `*-patches-304x312.png` in `T-20261016-200/layers/`.

- **The paint:** the adult and juvenile patches are now big, rounded and soft, on the back and haunch, with no crescents.
- **Its fault:** some keys put patches on the head. Every juvenile has one on the crown, and the adult crouch, curl and stand have them on the crown or round the eye.
  - The patch layer is cut as the difference from the bare base key, so a patch on the head is removed by cutting the head out of the layer. That leaves the base's own head, as painted.
  - `heads-off.py` does this with one soft ellipse per key over the head. It also removes the adult air key's narrow upright rump patch, which was a near-crescent.
  - So the retry isn't needed.
- **The extra patches** (the crouch's four, a third oval of about 40 px on some keys) are kept. They are large rounded masses, so they still say "patches", and more of them reads as more patchy, not as stripes.
- **The checks:**
  - outside the coat, 0 pixels on every layer;
  - registration by the same placement inverse as T-200 (`cut-patches-r2.py`, reusing `cut-layers.py`);
  - at 3×, `contact-r2-cut.png` shows every key with its head ellipse.
- **Separation:** `stripes-vs-patches-r2-54-40-3x.png` shows, left to right, stripes then patches for the adult anchor and stand at 54 and the juvenile anchor and stand at 40. At 1× the adults separate at once: a row of bars against pale masses. The juveniles separate at 40, more softly, since the cap is small.

To recut: `python3 -I cut-patches-r2.py KEYS SHEETS OUT ../../T-20261016-200/cut-layers.py`, then `python3 -I heads-off.py OUT`, with the base keys in `OUT/../keys`.

## The build with patches round 2 (build/t-203b-colour-ramps @ 4017aeb3): pass

`charcoal-stripes-vs-patches-54-{1x,4x}-r2.png`: at 54 on charcoal, the build now reads as my test did. The stripes are a row of parallel bars behind the shoulder; the patches are two pale rounded masses, on the back and the haunch, with no crescent. They read apart at 1×. `vivarium-four-real-pods-54-r2.png` keeps the four coats distinct. Cleared to merge on the art.
