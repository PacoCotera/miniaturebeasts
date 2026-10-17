---
ticket: T-20261016-107
status: done
branch: PacoCotera/miniaturebeasts:batch/B-20261016-3 (T-64), batch/B-20261016-4 (T-50, T-103)
head: eea6b35c (T-64), b10c8c77 and later (T-50), 57342048 (T-103)
ci: not run (review only)
---
## Verdicts
| Build | Verdict |
|---|---|
| T-103 Grow this founder? panel fix | **PASS** |
| T-50 ceremony cuts and outcome lines | **PASS** (the cuts it built); cut 4 is T-90's, as the amendment says |
| T-64 arcFill word and the shadow derive | **NOT JUDGED at 1x**: no capture exists. Held, no fail, no fix ticket |

Judged at 1x on results/T-20261016-103/create-panel-grow-arrival.png and -fork.png against results/T-20261016-70/panel-grow-over-create-1x.png and specs/station-decision-panel-spec.md; and on golden/home/home-crates-arriving.png, golden/incubator/incubator-growing.png, golden/bench/bench.png and golden/pods/pods-overview-unidentified.png at batch/B-20261016-4 57342048. Purpose first, then style (design/art-direction.md, design/style-guide/README.md).

## T-103: PASS
The three failures of the last review are closed:
1. **Pictures.** Grow it shows the lit juvenile on its moss plinth with a contact shadow; Keep shaping shows the founder as it is; in the fork, the two grow cards show the juvenile and the third card the founder. Each stands on the plinth's centre line, as the T-70 rule says.
2. **It matches the passed art.** Sage-bordered housing, recessed dark tiles, plinths with a warm pool of light, cost figures on rubber chips, the destination mark (the Research pen) at the top right of the two cards that land in the Incubator, a flat veil with no dither lattice, the title centred at 28. The ring is the one frame ring around the focused card.
3. **The minute count is gone.** The cost rows read "2 / 4" (energy and the leaf); the bottom line reads "Grow it 2 4" while the panel is open; no hourglass figure appears anywhere on the screen.
- Words: the title is 4 words or fewer; the card names are 3 words or fewer ("Grow, keep reading"); each line is one line with no figure. The bottom line reads the focused card in both captures ("chapters stay a surprise", "watch it in the Incubator"), with "Back" for ←.
- Not a fail: the Grow it picture exists for species S01 only (T-70 cut one size); another species draws an empty slot, as the build says. That needs the same cut for the other species (art).

## T-50: PASS
Read from the captures and the result's strings; each line is as the spec's table says:
- Home, three crates: the action reads "Open the bay" (home-crates-arriving.png), where it read "Open Cargo".
- Incubator, growing: the context zone reads "ready in about 18 min" (incubator-growing.png), where it showed the bud's name. This is the one minute count owner ruling 3 allows.
- Probe bench: "Shield takes three strikes" in the subject zone, fully drawn, no ellipsis (bench.png; the old stage with the tools shows because batch 4 does not carry batch 3's builds, which is the merge's matter, not this build's).
- Pods, a sealed pod: the action "Identify" with the subject "the species shows" (pods-overview-unidentified.png).
- Cut 4 (✓ Skip), the leaf plate, the Create drum, Vivarium and Library rows are not built here and the amendment gives each to its own ticket (T-90, T-51, T-42, and when those actions exist). Not a fail of this ticket.
- Not judged: the press counts and the opening and the hatch playing on the same key (stills do not show it); the builder reports tests for both.

## T-64: not judged at 1x
- The result says no golden moved and the word is called only when the props carry `regions.ring`, which T-40 builds. The Incubator captures at the head still draw the old dotted leaf arc (incubator-growing.png), so there is no screen on which the new fill can be seen. The dirty-area numbers are printed "on the placeholder art" and the ready box is marked UNVERIFIED by the builder.
- So the word's look against its passed art cannot be judged until T-40 lands and the ring captures exist. I raise no fix ticket: the result gives no defect and the work is not wrong, only unseen. Review it again with the Incubator's ring captures.
- Not judged either: the angle table, the 24 vectors and the shadow derive (tests and code; not a 1x judgement). The builder's own note: the first derive from nothing took 102.6 ms against a 50 ms budget on the dev machine, asserted at 200 ms.

## Fix tickets
None.
