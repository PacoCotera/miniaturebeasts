# T-258 (Home H4, the Library window): art director

**The specimen: pass.** On the stills in `stills/`, from build c2debf73:
- The window matches the signed harness. On the late state the mean difference is 2.5 levels in 255, and the render is 0.7 brighter overall, which is the grain and the window's inner shade.
- The extent is x 21–323.5 and y 29–331.5, inside the 12 px test.
- The tone sits beside the Vivarium as signed.

The three questions in Home spec §15:

## 1. The glints: placement first, not an outline

- **Why they don't read:** `glint-star-12x12` is a soft cream-white four-point star, its arms mostly at 10–50% alpha. It was drawn to catch light on dark ground.
- Centred on a bead about its own size, it is white on a pale bead. It also covers the found look's own colour, which is what the bead is there to show.
- **Set:** draw the star **beside its bead, not on it.** Its centre goes 8 px from the bead's centre, along the ray, outward (away from the form's hub).
  - Beads are ray tips, so outward always lands on the dark ground.
  - In the dense lower-left cluster, outward also points away from the neighbours.
  - Clamp the star inside the window's 12 px margin.
- **No outline, and no new colour.** A dark edge on a light-catch reads as a sticker, which the style guide rules out. The master stays as it is.
- The fade, the cap of 8 and "until seen" are unchanged.

## 2. The breathing: breathe the form's light, not the window

- **What the brightest level does now:** the ×1.12 gain lifts the whole picture.
  - The ground, about 90% of the window, rises from 28 to 31 on every 2 s swap. On a dark field beside a still Vivarium, that reads as the window flickering.
  - The form rises from 137 to 153.
- **Set:**
  - Apply the gain to the light canvas only, before `finish`, so the bloom breathes with the form.
  - The amounts stay at ×1.00, 1.04, 1.08 and 1.12, cycling 1 2 3 4 3 2.
  - The ground, grain and vignette are the same pixels at every level. `finish` is seeded, so this holds.
- **For the test:** the ground's pixels (outside the form's light) are identical across the four levels.

## 3. The empty save: the starter's form, not a bare ground

- **Why not a bare ground:** with no form, the window is a dark textured panel beside a living Vivarium. That reads as a window that failed to load.
- **Set:** with nothing found anywhere, show the species of the player's starter (Loika) in its empty state.
  - The generator draws its core with every look as a dormant open ring.
  - That reads as a genome waiting to be found, which is what the Library promises, and it teaches the open ring before the first bead.
  - Caption: "Loika genome"; "{n} new" hidden.
- **No new art:** it is the same generator with an empty state, at the same scale and centre.
- The rule "never a species with nothing found" still picks the species whenever anything is found. This case only applies when nothing is.

## Round 2 (build 1d62807c): pass on breathing and the empty save; the glints need one rule

- **Breathing: pass.**
  - The gain is now on the light only. The form's mean goes from 137.5 to 145.1 at the brightest level.
  - The ground changes only in the bloom halo: at most 6 levels, 95% of it within 13 px of the form. Of the ground more than 20 px from the form, 0.1% changes.
  - That is the bloom breathing with the form, as asked. The open field holds still.
  - **Test:** my round-1 wording ("ground identical") is too strict once the bloom breathes. Use instead: the ground more than 20 px from any form pixel is identical across the four levels.
- **Empty save: pass.** The Loika's core with its dormant rings, captioned "Loika genome", with no "new". It reads as a genome waiting to be found.
- **Glints: one rule needed.**
  - Outward by 8 px works where beads are apart (the left glint reads at once).
  - In the dense lower-left cluster, one star lands between the pink and cyan beads, touching the cyan one. With "3 new", the star must name its bead, so touching another bead mislabels it.
  - **Set the nudge:** if the outward spot's star (radius 6) comes within 3 px of another bead or ray, turn the offset around its own bead in ±30° steps (+30, −30, +60, −60 … up to ±150) and take the first clear spot. If none is clear, keep the outward spot.
  - The offset stays at 8 px, and stars stay clamped to the 12 px margin.
- **Re-check:** `home-library-3-new.png` only. When its stars each sit clear of every bead but their own, this ticket passes.

## Round 3 (build 6e7dc0f2): the cluster's two stars still miss; the rule made exact

Measured on the retaken `home-library-3-new.png`, to about ±1 px (I don't have the bead centres):

| Star | Its bead | Nearest other thing | Clearance |
| --- | --- | --- | --- |
| lower right of the rose bead (not turned) | rose | the cyan bead, and the cyan ray | about 2 px to the bead; about 1 px to the ray |
| between the grey beads (turned) | grey-rose | the cyan bead | about 1–2 px |

The upper-left star is clean.

Because the second star didn't turn, the build's check must measure differently from the rule, probably from the star's bright core rather than its arm tips. The rule, exactly:

- **Clearance** is measured from the star's arm tips (radius 6 from its centre) to:
  - another bead's drawn edge, including its ring and halo (bead radius + 1);
  - the centreline of any ray except the bead's own.
- It must be ≥ 3 px.
- **The search:** distance 8 at angles 0, +30, −30, +60, −60, +90, −90, +120, −120, +150, −150 (0 = outward); then the same angles at distance 10, then at 12. Take the first clear spot.
- **The fallback:** if nothing clears, use the spot with the largest clearance. Never keep a spot just because it is outward.
- **The test:** print each glint's chosen spot and its clearance for the late state with 3 new. Every clearance must be ≥ 3, or the glint must be marked as the fallback.

Re-check: the same still, plus that printed list.
