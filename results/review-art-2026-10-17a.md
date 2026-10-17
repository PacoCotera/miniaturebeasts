---
ticket: T-20261016-108
status: done
branch: this repository:work-queue
head: (see the result commit)
ci: not run (review only)
---
## Verdict

| Art | Verdict | Owner's proof | Fix |
| --- | --- | --- | --- |
| The dock link light (T-105) | **PASS** | `arrival-in-place-1x.png` (masters-pods 79004572 `art/station-masters/pods/dock/proof/`; copy in `results/T-20261016-105/`) | none |
| The Create drums at 80 × 96 (T-96) | **PASS for the drums; the screen is not shown yet** | none yet: `create-shape-S01-1x.png` once T-110 lands | T-20261016-110 (the bench re-cut to T-95's rects) |
| The wood badge (T-105) | **No art pass possible; goes to the fallback** | none | T-20261016-111 (UI/UX rules spec §6) |

**What was judged:** each piece at 1× against its ticket and against `design/art-direction.md` and `design/style-guide/README.md`; purpose comes first.

## 1. The dock link light (T-105): PASS

- **The clip holds.** Clipped to the open bay's floor trapezoid, with a 6 px inset and a 4 px soft edge. At 3× (`link-light-on-open-bay-ends-3x.png`, `arrival-in-place-ends-3x.png`) no light lands on the side walls at either end, and the vertical edge I found in round 3 is gone.
- **At 1×** it reads as warm light lying on the bay's floor along the crates' feet, strongest at the left where the link comes in.
- **In `arrival-in-place-1x.png`** the moment reads whole: "The Companion is home", the crates in, the light on the floor, and the home band with its marks and faces.
- **Not the art's:** the band's words ("one mended, free") are stand-ins in `mist` and are faint at 1×. Their colour is UI/UX's, if the lead wants them stronger.

**Show the owner:** `arrival-in-place-1x.png`.

## 2. The Create drums (T-96): the drums PASS; the screen waits on T-110

**The drums at 80 × 96 now read as drums you turn,** at 1× in `create-shape-S01-1x.png` and at 2× in `drums-80x96-before-after-2x.png`:
- each is a tall reel in a slot, its round showing above and below the window with a seam where the faces turn away;
- the focused drum carries its ▲▼ turn marks;
- the row reads as a bank of tumblers, not a row of thumbnail tiles.

This answers round 2's failure (the purpose "you change the creature by turning those"; owner: "a creation environment where you tweak genes").

**Why the screen can't go to the owner yet** (not a drum fault). T-95 moved the bank and its neighbours, but those masters were not re-cut (T-96 reported this and rightly did not choose). In the owner's proof:
- the chapter words ("Coat", "Face", "Movement", "Stamina") straddle the old tray's top edge;
- the dish floats 8 px above its old cut-out.

The proof would show a layout fault the art doesn't have. T-20261016-110 re-cuts the bench, gene line, bank arrows and slip to T-95's rects, and re-proofs.

**Note, optional:** the neighbour-face bands show mostly dark ground, because the 64 × 64 close-ups are navy at their top and bottom rows. The reel still reads by its round and seams. A recut with content nearer the edges would carry more, and is offered in T-110 as the AD's call.

**Once T-110 lands, show the owner:** `create-shape-S01-1x.png`.

## 3. The wood badge (T-105): no art pass; the fallback applies

- **What the AD tried:** six windows across every wood source, at 4× and 1× (`t105-whole-tree-candidates-4x-and-1x.png`). No whole tree reads at 32:
  - the backdrop's trees merge into a canopy and read as muddy columns;
  - the canopy paintings have no trunk.
- **This is the outcome my round-3 ruling allowed for.** No further cut. The spec's §6 fallback is the UI designer's to rule: T-20261016-111.
- **My input to it:** of the options, (a) the word "wood" under that one well, or (c) the single-crown crop (a round leafy top, no trunk), add the least text, in line with the owner's "little text". The crown risks reading as a bush beside the meadow badge, and UI/UX judges that at 1×.

## Proof (commands run and their result lines)
- `results/T-20261016-105/*.png` and `results/T-20261016-96/*.png`, read at 1×, and the 2× and 3× sheets read as provided.
- The chapter words' position against the tray and the dish's offset were checked in `create-shape-S01-1x.png` (y 400–420 against the tray's edge) and confirmed by T-96's own report.
