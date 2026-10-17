---
ticket: T-20261016-129
status: done
branch: PacoCotera/miniaturebeasts:masters-pods
head: d2228904 (T-120), 21058dc2 (T-124)
ci: not run (review only)
---
## Verdicts
| Proof | Verdict | For the owner |
|---|---|---|
| T-120 dock arrival apron: arrival-in-place-1x.png, arrival-end-1x.png | **PASS** | `results/T-20261016-120/arrival-in-place-1x.png` (with arrival-end-1x.png as the second frame) |
| T-124 Incubator ring recut: ring-closed-recut-1x.png | **PASS** | `results/T-20261016-124/ring-closed-recut-1x.png` |

Judged at 1x on the files in results/T-20261016-120/ and results/T-20261016-124/, against specs/station-dock-arrival-spec.md and specs/face-arc-and-shadow.md; purpose first, then style (design/art-direction.md, design/style-guide/README.md), the lab rule (specs/station-lab-sweep.md) and gate checks 1 to 10 (specs/gate-recalibration.md).

## T-120 dock arrival: PASS
**Purpose at a glance.** In arrival-in-place-1x.png (t 2.2 s) a stranger can say what is happening: two sealed crates stand on the bay floor, and the mibi who came home stands big on the apron in front of them (the Loika at 304 x 312, feet 528), with the one mended plate in the corner. The big creature, not a list, is what says "these came home". The second frame, arrival-end-1x.png, shows the question at the end: two cards on the strip, "Open the bay" and "Later", with the crates still in the bay.

**What the apron does.** It continues the bay's floor to the bottom: a calm sage ground with the bay's grain and a moulded front lip, no marks and no wells. The join at y 368 has no visible seam. The creature has a cast shadow on it (checked at 3x: a soft dark shadow under the feet and between the paws), so it is grounded (gate 4). The old proof (old-arrival-in-place-1x.png) put a 32 px home band of tiny faces on the floor line and six empty rack wells below; the new one replaces both with one big picture, which is the owner's ask.

**Gate checks on the proof:**
1. References: judged beside the passed Cargo bay (the crates and bay are unchanged) and the old proof; the owner's Cargo references (cases, handles, lit) are as before. yes.
2. Objects as used: the crates stand in the bay, the mibi on the floor. yes.
3. One rendered style: the apron, bay, crates and creature share one painted, top-left-lit style. yes.
4. Grounded: yes (above).
5. Margins: the apron runs from x 16 to x 1008 (the bay's 16 px margins), as the bay does. yes.
6. Purpose: yes (above).
7. Owner's words: "pop up an arrival screen... feel like magic" and the 13:26 "little text": the show is the picture. yes.
8. Words load: the ribbon "The Companion is home" is 4 words; "one mended, free" is 3 with its icons; the bottom line is outside the count. Nothing over 6 words in the arrival frame. yes. See the finding on the end frame below.
9. What it is in the world: the apron is the device's floor; the crates are crates. The ribbon is a brown plate with an amber edge (see finding).
10. Material matches behaviour: the apron is fixed and the show's movers are creatures (the dither-in) and a light. yes.

**One honest look at the transition frame.** The second mibi (S03) is shown a third of the way through its 16-level dither-in, as a teal, grainy, half-seen creature. That is the frame's own entry transition (0.3 s), not a state the player rests on, so I do not fail it; but a still of it reads as a ghost. If the owner is shown this frame alone, say it is mid-transition.

**Findings (not fails of this art):**
- **The end frame's first card holds 8 words** ("Open the bay" plus "two crates to the rack") against gate check 8's 6. The words are the stand-ins of specs/station-dock-arrival-spec.md section 2 (name at most 3 words, line at most 6 words), so the budget itself is over the new gate. UI/UX should cut the line (the bottom line already says "two sealed crates", and the small crate picture shows it), then the card is 3 words. Not an art fix.
- **The ribbon "The Companion is home" is a text plate whose words change between cases** ("Nothing came back this time"). Under check 10 a changing readout should read as a display, and this one reads as a label plate. It is the existing Cargo ribbon, not this ticket's art; flag for the lab sweep.
- Placement was not run (no place-masters on masters-pods); the build places `cargo-bay-apron-992x180` with the command the result gives. The proof's end frame drops the ribbon and corner groups at the strip; UI/UX should confirm that reading (the result raises it).

## T-124 Incubator ring recut: PASS
**Purpose:** at ready the ring closes, and the build redraws only what differs between the closed art and the fill. The proof shows the fill, the old closed ring and the recut at 1x, with each closed ring's differing pixels below in red.
- **The change is invisible except at the gap.** The recut is the fill everywhere except two short warmed end caps at the bottom (the red marks are two small bars, one at each end). The old closed ring differed all the way round (two long red arcs).
- **Numbers (from the proof):** 1,451 differing pixels (was 16,471), none by 64 or more; difference box on screen (342, 379, 340 x 41), 13,940 px to redraw at ready, against the ceiling of 153,600. That clears the three over-ceiling frames the build reported (growing to ready 270,362, growNow landing 389,779, growNow's key frame 332,968) once the recut is placed; the builder must place it and put the three assertions back.
- **Style:** the same material, light and grain; the warmed ends read as the light meeting the ring at ready, quietly. No new motif, no words, nothing paper (checks 8 to 10 do not bite).
- **A caution on how it reads:** at 1x the change between the fill and the closed ring is subtle (a warmer tint on the two end caps). That is what the spec asks ("never the 400 x 400 box"), but the owner should know the "ready" cue at the ring itself is small; the pod's light carries it.

## Fix tickets
None. Two follow-ups are named for the lead: a UI/UX edit of the arrival's first card (the 8 words), and a builder placement of both masters (the apron and the ring), which the lead's batch plan already owns.
