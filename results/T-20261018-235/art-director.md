# T-20261018-235 Vivarium polish (build/t-235-vivarium-polish @ 1be7ffed): the art director's gate

**Pass**, with one point to check.

- **Size:** adults at 54 and juveniles at 40 in the Vivarium and Idle, one world at one scale. Home's window shows the same small animals.
- **Contact shadows:** they read as a soft warm shadow under each resident's feet, and the residents now sit on the moss.
- **The shadow over the ring's middle: accepted.** The ring is a footprint, so the feet's own shadow lying on it is physically right, and the ring's ends still read past it.
- **The ring and tag** follow the figure: the ring is about the feet's width, and the tag sits just above the head.
- **Walking:** every resident stands on the moss floor, including the back ridge in the twelve-resident still. Nobody floats above the slope.
- **Sleepers:** curled at world size by the standing figure's factor, with their own shadow. They read as the same animal asleep.
- **Moving residents measured once per atlas, over the grounded frames:** right. The figure doesn't breathe in size from frame to frame.

**To check:** in `vivarium-back-slope-twelve.png`, the focus ring sits on open moss, about 10 px below and left of the nearest resident's feet, with no figure on it. If the focused resident is hidden behind another, focus should bring it in front (draw order by focus, or a nudge). If the ring was offset from its owner, that is a bug. Either way, a ring with no animal on it reads as a mark on the floor.

## Re-gate (build 9598f73a, stills ea50c511)

- **The ring: pass.** In `vivarium-back-slope-twelve`, Dot's feet stand in the ring's upper half with its shadow inside, so the ring reads as Dot's.
- **Moving residents: not yet.** In `vivarium-moving` and `idle-night-moving`, the residents drawn from the moving atlases are about twice world size: adults about 105 px tall, juveniles about 60, against the table's 54/40. They read as the "big again" the owner rejected. They are also plain charcoal, with none of their own looks (patches, stripes, coats).
  - **Fix:** each moving atlas is reduced offline by its stage's standing-figure factor (54 or 40 ÷ the standing figure's height), the same factor as the stand. The figure is measured once per atlas over the grounded frames, as ruled.
  - **The looks:** they follow the layered stand, so a moving resident is the same individual as when it stands. If the atlases can't carry layers yet, moving residents keep the layered stand, translated along the path, until they can. The same animal at the same size matters more than the walk cycle.
