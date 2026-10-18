# T-20261016-211: the art director's gate

**Verdict: not yet.** The rework is `tickets/ready/T-20261016-212.md`, on the same branch.

## What stands
- The three lying Probe ids are out of the masters index and nothing places them. Their originals stay in masters-pods (`art/station-masters/pods/bench/`), so deleting the placed copies is fine.
- The Probe rule's wording.
- The two items the builder left open: the slices status in masters-pods, and Home's old cradle (`home-cradle-full/empty-96x72`). The cradle needs its own ticket once UI/UX sets the slot.

## What changes, and why
The build followed the ticket's first text, which I amended at 5c2cd7ce after the builder had claimed it. Since then UI/UX checked the sizes against the layouts. I agree with all four of their corrections:

1. **The Vivarium full screen and Idle: 54/40, not 92/68.** Home's window is a 1:1 crop of the same painting, and the expand scales nothing. At 92 the mibis grow when the window opens, which is the "big again" fault itself. One world, one scale, one sprite set.
2. **A decision panel: 54/40 in both windows,** not 64 close against 36 wide. A small Release beside a large Keep makes Release the distant, lesser option, the farewell reading the owner rejected. The windows still differ by place and company: open sky and water with Pip's kind, against the burrow with its household. **This narrows the creative director's framing call (89452124):** the framing changes the setting, not Pip's size. **The creative director confirmed it:** the two futures differ by setting and framing, never by warmth, loss or size. When the pair is redrawn, the CD checks it with the words covered. If the settings alone don't read as two futures, the fix is a stronger contrast between the settings, not a size difference.
3. **Cargo: no mibis.** The bay holds crates, pods, materials and finds.
4. **The benches and the dock arrival keep bench scale, explicitly,** so builders don't shrink them. Their final size waits on the owner's answer, through the lead. The dock arrival's conflict with "who came home stand big" is the lead's to settle.

Two faults in the build itself:
- **Three copies of the table** (the style guide, the station layouts and a code comment, with the art direction page summarising it). Copies drift. The table now lives on the art direction page only, as the lead asked, and the others point to it.
- **"the owner's measure"** in public text. The public text is now free of internal references.

## For UI/UX
- Home's away frame goes to 64 × 64 so it holds the 54 px figure. Yours to set in the Home spec.
- The Habitat's resident region shrinks to fit 150/110 with the feet near y 380. Yours to set too.
