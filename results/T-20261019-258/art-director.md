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
