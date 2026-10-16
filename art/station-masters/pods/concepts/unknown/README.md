# The calm "unknown" (fix 1b of the Station global fix plan), 0 MXN

This replaces the frost checkerboard: Create's founder (`mistyArt`), and the whole-body ghost (`ghostArt`) on Create and the Incubator. The art director signs this treatment. The builder implements it in the founder's picture.

**The rule.** It is never brighter than the creature and never a pattern.

- **A. An unread doing draws nothing.** Doings are Movement, Stamina and any chapter that draws nothing on the body; which chapters draw where is the game designer's list. Today a whole-body chapter lays a 25 % Bayer of frostD over the whole animal. That goes.
- **B. An unread look** gets a soft veil on that look's region only:
  - colour **VEIL #6b7484** at **60 %**, blended into the picture's own colour (the painting shows through);
  - over the part's box grown 4 px, drawn as an ellipse and feathered 6 px, and clipped to the body's alpha;
  - a whole-body look (Coat, Shape) has no ellipse: the veil is the full body alpha, weight 0.6 × alpha, no feather beyond the alpha's own edge;
  - Coat unread: under the veil the picture is replaced by its own luma L (grey, no hue), so the unread coat's colour is never drawn: out = L × 0.4 + VEIL × 0.6. Shape unread keeps the picture's colour under the veil;
  - where veils overlap, the weight is the largest of them, never the sum;
  - Coat and Shape both unread: the Coat's grey luma (Coat wins a tie, since its colour is never drawn);
  - **never brighter** (art director, 10-15, from the first build): after the veil, any pixel whose relative luminance is above the picture's own at that pixel is scaled down, keeping its hue, to the picture's luminance. A dark coat is never lifted toward the veil's grey. On the build's S01 captures, 36 % of the veiled pixels came out brighter without this. L is Rec.709 luma on sRGB 0–255, not linearised; the scale is rgb × L_picture / L_out, and L_out = 0 is left as is;
  - the rest of the body is drawn as read.
- **C. Nothing read** draws one calm silhouette:
  - the body (its alpha) drawn in **GHOST #5f6878** alone, no hue kept, plus 12 % of its own light contrast so the form reads: per channel, out = GHOST + 0.12 × (L − L̄) (0.22 until 10-15; lowered because at 0.22 the build's S01 still showed its eyes and snout, which is the unread Face), where L = 0.2126 R + 0.7152 G + 0.0722 B on the sRGB 0–255 values (no linearising), L̄ is the mean L over the body alpha, clipped to 0–255; alpha unchanged;
  - a 2 px rim on the top left at **RIM #8f99a8 50 %**;
  - never brighter, as a whole and not per pixel (a per-pixel clamp would bring the detail back): if the silhouette's mean L over the body alpha is above the picture's, every ghost pixel, rim included, is scaled by L̄_picture / L̄_ghost;
  - no dither and no detail.
- The founder's roll keeps its 16-level Bayer cross-fade *between two pictures* while it plays. That is motion, not this rule.

**Proofs** (`unknown-proof.py`, on main's create-shape-busy golden, with the frostD inpainted to recover the base): `A-doings-unread`, `B-crown-unread` and `C-nothing-read`, each at 1× full screen and as a 3× founder crop.
- The rig keeps its own fine shading stipple. That is the rig, which fix 2's layered stand-in replaces, not this treatment.
- In C, a short strip under one foot is the proof's mask guess (the tray floor's lit edge). The build uses the picture's alpha and has no such strip.
