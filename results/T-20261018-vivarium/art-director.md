# The Vivarium build spec (T-20261018-vivarium): the art director's four signatures

## 1. Contact shadow (§3): signed, on its own canvas
- **The layer can't live on the stand's 304 × 312 canvas.** The canvas ends 7 rows below the feet line (row 305), which leaves no room for the shadow's lower half. So each shadow is its own picture, `shadows/S01-{adult,juvenile}-304x48-shadow.png`.
- **How it's drawn:** at art scale, op "under" (drawn before the base), with its row 24 on the stand's feet line. It is composed and reduced with the figure by the same factor, so its width always tracks the figure.
- **The look** (`make-shadow.py`):
  - an ellipse as wide as the body's foot extent, nudged 2 px right for the top-left light;
  - about 5 px tall at 54 (4 px at 40);
  - warm near-black (18, 12, 6) at 0.8 peak, with a soft falloff.
- **Proof:** `shadows/proof-adult-54-8x.png`.

## 2. The curl at world size (§5): signed
- The nap picture is reduced by the standing figure's factor for its stage: 54 ÷ the standing figure's height for adults, 40 ÷ it for juveniles. A sleeper is therefore the same animal at the same scale, about 34 × 31 for the adult.
- Its shadow is `shadows/S01-{adult,juvenile}-curl-304x48-shadow.png`, on the same rule.

## 3. Stripes against patches (§7): no small-size cut
- **What I see:** the T-203b layers are on station-gate (merged in #234). In `stripes-patches-54-1x-2x.png`, at 1× the stripes read as a row of separate bars and the patches as two rounded masses, which is the shape difference the rule asks for.
- **Why the measure is low:** a mean colour difference of 3.9 measures the paint area, which is nearly equal by design. It doesn't measure shape.
- **The cost of the fix:** a second "small" mark set would double the mark layers and fork the look by size.
- **Ruling:** the covered test decides, and it passes. If the owner or the game designer reads them as one at 1× on the device, the fix is in the shared layers (the stripes' gaps a little wider), not a size fork.

## 4. The ground profile (§4): signed for all four lights
- The dawn, dusk and night paintings share the day painting's layout. Their edge maps correlate with day at 0.86, 0.96 and 0.94, at zero offset; dawn's best fit is 2 px up, within a step's tolerance.
- So one profile serves all four (372 / 352 / 316 / 324 / 344 by the x bands), with Idle 80 px lower.
- Home's profile is signed separately when it is measured.
