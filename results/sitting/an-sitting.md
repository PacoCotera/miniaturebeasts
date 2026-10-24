# Sitting AN-1 (animator, 2026-10-24 04:45 Mexico City)

Motion only. Read-only; from numbers and the signed spec, not watched live (no display); the 1x capture stays the sign-off. No credential read.

## Ticket lines

1. **Pose change (AN-1, part 1):** When the focused pose changes to or from `sleep-curled` on the pose step, the window's resident changes between the layered stand and the layered curl by Habitat's cross-dither: 16 levels over 180 ms, level = floor(16 x t / 180) (on a 40 ms frame 0, 3, 7, 10, 14, then 16 at 180), the incoming form on the level's Bayer mask and the outgoing form on its exact complement, so no pixel shows both; no crouch, no hold, no breath (as the curl slide rules it). Any other pose change (stand to stand, placeholder habits) is a cut on the focus move, since the picture is the same. A change still running when focus moves again is cut to its end form and the new one starts from it. Reduced motion: cut.

2. **`events.backdrop.resident` = `"dither"`** (change the default from `"cut"`): on entering the place step and on going back, the resident changes (hour's light to ungraded, and back) on the same 16 levels as the backdrop, one clock, level = floor(16 x t / 200), 200 ms (0, 3, 6, 9, 12, then 16 at 200 on a 40 ms frame); from-id kept alive for the event. Moving the ring between place cards dithers the backdrop alone (resident stays ungraded, nothing to change). Reduced motion: both cut.

## Why

- Pose: the stand and the curl differ in silhouette (about 37 % shorter); the signed rule (motion-spec 2.2 and 2.4) is that only that pair gets a dither and a cut between them reads as a pop. The window is the up-close size (304 x 312, Habitat's factor), so the 16-level 180 ms form applies, not the walking 4-level 320 ms. Same size, same rule as Habitat: the pose step is Habitat's own glass, so the two screens must not differ on this change.
- Resident on the backdrop dither: the silhouette is unchanged, but the light change is large at night (graded dark to ungraded day). A cut at the dither's end leaves a dark resident on a bright new backdrop for 200 ms and then pops; a cut at the start pops against the old glass. Only the shared 16 levels hide it. Both events already exist and run on one clock (arch Q4), the face takes a from-id and a level in both, and the cost is the one extra from-id held for 200 ms.
- The two clocks (180 and 200) never overlap: a pose change happens on the pose step, the light change on a step change.
