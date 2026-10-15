# Fix 7: residents take the per-light grade

A night Vivarium must not show day-lit residents (audit A10). Every resident picture
(`mibi-adult-*`, `mibi-juvenile-*`, all sizes) on Vivarium, Home, Idle and Habitat is
drawn as a **derived picture** of its signed master for the scene's light:

    rgb = srgb( lin(rgb_master) × GAIN[light] )   per channel, alpha unchanged

| light | R | G | B |
|---|---|---|---|
| dawn  | 0.86 | 0.90 | 1.00 |
| day   | 1.00 | 1.00 | 1.00 (identity: the master itself) |
| dusk  | 1.00 | 0.78 | 0.72 |
| night | 0.58 | 0.50 | 0.43 |

- Linear light: sRGB decode, multiply, encode; round to nearest. No gain exceeds 1.0, so
  a resident is never brighter than its master (matte, no glow).
- Values: the linear per-channel mean of each light's signed background against its day
  background (idle-vivarium, vivarium-near, home-glass), softened by a power of 0.7,
  averaged over the three screens, then capped at 1.0. The cap is an AD ruling: dawn's
  measured blue lift (1.29 to 1.55) would make residents glow.
- The light is the scene's (the background's) light. A picture is graded once, with
  this script or the same arithmetic at load, and cached; it is never drawn by code,
  tinted with a CSS filter, or overlaid with a translucent fill.
- Asset family: PAINTED, id `<master id>:<light>` (e.g. `mibi-adult-S01-144x152:night`).
  `:day` resolves to the master.
- Proof (1×, whole screen, master left and graded right): `proof/proof-{dawn,day,dusk,night}-1024x600.png`.
