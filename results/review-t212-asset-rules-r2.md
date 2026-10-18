---
ticket: T-20261016-215
status: done
branch: PacoCotera/miniaturebeasts:rules/mibi-sizes-probe-upright
head: 89e0cc8e (on 42ec92ab, off station-gate 5cc0bbc4)
ci: not run (the checks below were run locally)
---
## Verdict: PASS
The branch is exactly what T-20261016-212 asks, the pasted text is verbatim, the public guard passes, and nothing else changed. This review was asked for in a message from the lead; I wrote and claimed T-20261016-215 for it.

## Run (a worktree of 89e0cc8e)
- **Guard:** `node .github/public-guard/guard.mjs --base origin/station-gate; echo exit=$?` printed `public guard ok`, guard_exit=0 (the same against 5cc0bbc4). The round-one head failed it with two hits on "the owner's measure"; that phrase is gone (`git grep` finds neither it nor any size row outside the art direction page).
- Station 452 pass, ui 81 pass, 0 fail; `place-masters --check`: 903 placed, 0 problems.
- The diff since 42ec92ab is four files, 25 insertions and 46 deletions.

## Against T-212's five steps
1. **`design/art-direction.md`:** the section `## Size and pose` is in place after `## Rules` (line 193, the section "Size and the Probe" is gone), and the page's sentence now reads "it holds the values and sizes; this page holds only the mibi size table below, because size is part of the look." The pasted text is **verbatim**: I extracted the blockquote from the ticket (the current ticket and its version at 78ad9320, which are identical to each other) and compared it with the built section, character for character: identical. It carries no ticket id, date, name or quote (searched the added lines).
2. **`design/style-guide/README.md`:** the two built sections are replaced by the single line "Mibi sizes per view and the upright Probe are rules of the look: see [Size and pose](../art-direction.md#size-and-pose)." under the kept heading `### Mibi height per view`, so the old anchor still works. The link target (`## Size and pose`, relative path `../art-direction.md`) exists.
3. **`design/style-guide/station-layouts.md`:** the built table and bullets are replaced by the same one line, under the kept heading `#### Mibi height per view`.
4. **`prototypes/ui/asset-policy.mjs`:** the comment is exactly the ticket's: "// Sizes and the Probe are rules, not families: see design/art-direction.md, Size and pose. The lying 480x288 Probe and tray ids are withdrawn and belong to no family." No numbers in code.
5. **Nothing else:** the index withdrawal and the deleted lying masters from the first commit stand; 0 mentions of "480x288" remain in `ui/assets/masters/index.json`.

## Proof line of the ticket
`git grep -n '92\*\*\|\*\*36\*\*\|\*\*72\*\*' design/` finds no size row outside the art direction page (the only hits are two headings and unrelated SVG numbers).

## For the art director and UI/UX
The numbers in the table are 54 / 40 (Home, the Vivarium, Idle, and both decision-panel windows), 150 / 110 (the Habitat and Sitting), the workbench and dock arrival "large" (set in each close-up's layout), Cargo none, tiles and the Companion unchanged. I checked the text against T-212 only; the sizes' wording is the art director's to confirm, as the ticket's gate says.

## Not in this ticket (carried from before)
Home's Probe module still places `home-cradle-full/empty-96x72` (the old net Probe); the art director's audit asks for 48 x 72 reductions of the upright masters (its own ticket). The slices status, in the studio's masters repository, still needs the withdrawal recorded.
