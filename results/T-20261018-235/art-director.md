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

## Re-gate 2 (build 3bdafbb7, stills 1f40bf62): pass

- **Moving residents** are at world size and in their own looks. S01 walks as its layered stand at 54/40, with its coats, patches, stripes and crest, so a walking resident is the same individual as when it stands. S05's atlases are reduced by the standing factor and sit at the same scale as their neighbours, in both the Vivarium and Idle at night. The Habitat's close atlas staying full size is right, since that view is a close-up.
- **A sleeping S01 drawn as its world-size curl in place, never standing:** agreed as a rule. **The sign-off on the curl itself is held** until a still shows an S01 asleep in place and focused; `idle-night-moving` shows only a standing S01.

T-235 passes on the art, except the S01 curl, which waits for that still.

## The S01 curl: it exists, so no painting is needed

The signed version 4 set already has the curl, lying down with its eyes closed, for adult and juvenile, with every layer the stands use:
- **Base keys:** masters-pods `art/station-masters/pods/floor/S01/keys/mibi-{adult,juvenile}-S01-base-curl-304x312.png`.
- **Crest overlays:** `floor/S01/overlays/mibi-{adult,juvenile}-S01-curl-crest-304x312.png`.
- **Fur mask, zone mask and stripes:** work-queue `results/T-20261016-200/layers/mibi-{adult,juvenile}-S01-curl-*-304x312.png`.
- **Patches:** the signed round 2 in `results/T-20261016-203/patches-r2/mibi-{adult,juvenile}-S01-curl-patches-304x312.png`.
- **Contact shadows:** `results/T-20261018-vivarium/shadows/S01-{adult,juvenile}-curl-304x48-shadow.png`.

It is 304 × 312 with the feet on the stands' line. The layered stands were cut from the anchor pose only, which is why the build found no curl among them.

**Ruling:** merge T-235 now, since the reduced standing picture is a stopgap. Then a small build ticket, not an art ticket: `tools/make-stand-layers.py` also cuts the curl pose from these files. A sleeping S01 draws its layered curl, reduced by the standing factor, with its curl shadow. The ruled behaviour is unchanged. The art director gates its still.
