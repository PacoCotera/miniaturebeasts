---
ticket: T-20261016-65
status: done
branch: PacoCotera/miniaturebeasts:batch/B-20261016-3
head: cf6bc257207fd5d99ddb0e0cd933e168b77a3ab2
ci: not run (review only)
---
## Verdicts
| Build | Verdict |
|---|---|
| T-34 Probe bench | **PASS** |
| T-36 Pods (place badge, back-to-the-place caption, recut stages) | **PASS**, with one finding (the wood badge) |
| T-37 Mibi up close (no shut doors, bond and growth panels) | **PASS** |
| T-42 Create gene bench | **FAIL** (one fix ticket, T-20261016-71) |

Judged on the whole 1x goldens at the head above (golden/bench, golden/pods, golden/habitat, golden/create), against specs/station-probe-purpose.md, station-pods-purpose.md, station-habitat-card-purpose.md, station-create-bench-spec.md, and design/art-direction.md and design/style-guide/README.md. Purpose first, then style.

## T-34 Probe: PASS
- **Purpose:** the screen says what it is for. The Probe stands upright in its cradle (first read); under the word "Shield" are the plates at 48 px (second read) with the reason beneath: "each plate takes one strike / no plates: the trip ends". The Mend and Upgrade modules are as before, and the Upgrade's two dials carry "reach" and "deep".
- **Objects with no job:** the gauge, wrench, screwdriver and cable are gone (bench.png, bench-away.png, bench-tier2.png). No object remains that serves nothing.
- **Away state:** the cradle is empty and the slots are empty; "Shield" and the reason stay, as the spec says.
- **Style:** sage and sand matte housing, the same material as the Pods and Incubator rooms; one key light from the top left; no new motif.
- No fix needed.

## T-36 Pods: PASS, one finding
- **Purpose:** a badge on each well tells the pods apart by where each was found. In pods-collection.png the four Loika wells carry four different places: wood, rock, meadow, pond; the fifth place (rock) is shared by two wells. The overview caption "back to the pond" sits over the leaf plate and says what the plate does. The hose, gauge and vent are gone from the stages (overview, chapter page).
- **Badge size and place:** 32 px, right of the ring, above the name plate, not a focus target.
- **Finding for the art director (not a fail):** at 1x the **wood** badge (a dark mass of round blobs) does not read as wood; it reads as a cluster of pebbles or leaf litter. Pond, rock and meadow read clearly. The spec's section 6 says if one cannot read, the UI designer rules the fallback (the place's word under the ring). I am not specifying it.
- **Style:** the stages are recut in the room's own grain and match the Pods room.

## T-37 Mibi up close: PASS
- **No shut doors:** none of the Portrait module, the Cross module, the guide mark or a shut line appears in habitat-card, -rest or -young-night.
- **Purpose:** the bond panel (heart and "bonded" with skill notches and "skill"; or "not bonded yet" and "no skill yet") and the growth panel ("grows with care, out with you", "grows up in two turns", "grown") say what the old heart and notches could not.
- **Style:** the two panels use the same module plate as Companion and Wild; the type is the 16 px face; no new motif.
- No fix needed.

## T-42 Create: FAIL
Fix ticket: **T-20261016-71** (builder).
1. **The screen is still wireframe outlines on a flat fill.** In every captured state (create-shape, create-shape-slid, create-shape-many-changes, create-grow) the bench is a flat grey-violet ground with 1 px outline boxes for the well, dish, gene line, drums and slip. That is not the Station's style (matte sage field gear, painted layer, design/style-guide/README.md) and it is not the bench of the spec's sections 2 and 7. The art exists on masters-pods (42 masters, results/T-20261016-41.md) but is not placed.
2. **The drums say nothing.** Each drum is an empty box. A drum with no close-up does not show what it holds, so the player cannot tell what turning it does. In create-shape the only content is the founder and the text; the purpose, "change the creature by turning the drums" (spec section 0), is not served.
3. **The founder does not change** when a drum turns (the builder's own note: per-look layers are not built). The spec states: until they exist the screen does not pass.
4. Open items the build reported that are not builder work, named so they are not lost: the slip line "none: read a chapter first" measures over 176 px and needs a copy decision; the turn mark and the changed notch overlap at (32,0) and (34,0) and need a UI ruling; the 39 owed S03 close-ups and the founder layers for other traits and species are art work (T-20261016-69 revises the drum art).

## Not judged
Motion and the bench's behaviour beyond the captured states; the journeys; the build's tests. The builder's numbers (tests pass, guard exit 0) are theirs.
