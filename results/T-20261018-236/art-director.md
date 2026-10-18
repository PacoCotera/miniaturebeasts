# T-20261018-236 release readiness: the Pods goldens with the v4 Loika (build/t-236-release-ready)

**Not yet: one blocking fix.** Everything else passes.

## Passes
- **The v4 pod** (`pods-overview-*`, and the focused one at work-queue 5c68e4fc): the renderer's Loika in its v4 colours (slate shell, russet cap, ribs and dots), on the bench with its tag. It leads the screen in place, size and focus.
- **The stamp and UI/UX's rule change (§1): agreed, and the stamp stays as it is.** The mean comparison penalised a dark pigment, not prominence. The label's p95 stays under the pod's, the cells hold 4.14 against the 4.11 floor, and the label sits small and dim in its case in the corner. Dimming the stamp further would cost legibility, which is the harder floor.
- The chapter pages' structure, the rail, the hatch and the kin states.

## Blocking: the Coat chapter's two look tiles are empty
- **What's wrong:** `pods-chapter-page.png` ("Coat is read") and `pods-compare.png` show Colour and Markings as two blank dark boxes, 131 × about 160 at (383, 231) and (527, 231). Coat now has two traits, but no picture was given to either. A read chapter that shows nothing breaks pictures over text, and it reads as missing art on the release build.
- **The fix, with no new masters:** each tile is composed from the layered stand already in the build, so it is true to the pod's looks:
  - **Colour:** the stand in that coat (its pigments and two-tone, plain), cropped to head and shoulders and reduced to fill the tile;
  - **Markings:** the stand in plain charcoal with that marking layer (patches, stripes, or both; for plain, the bare flank), cropped to the flank behind the shoulder, where the marks sit;
  - **A two-copy trait** (the compare and both-copies states) shows each copy's tile.
- **States:** unread keeps today's unread treatment; sealed keeps its slats; only read draws the picture.

## Flagged, not blocking the art
- **The bottom line reads "nothing spent until Grow".** The owner renamed the press Incubate. This is a words fix for UI/UX and the game designer.
- **`pods-panel-return.png`** is still the older Return panel, with "gone for good" in the warm colour. The owner's ruling on Return (an equal outcome, never a loss) and the approved Release panel replace it. It predates v4, but it should not ship as is.
- **`pods-collection.png`:** the identified Loika pods in the rack still show the generic sealed shell (cream with a band), while the overview shows the v4 Loika. If "sealed until identified" means these are not identified yet, the "Loika" label under them contradicts that. If they are identified, they should show the species' pod. The game designer and UI/UX decide which.
