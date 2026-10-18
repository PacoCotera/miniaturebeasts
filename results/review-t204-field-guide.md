---
ticket: T-20261016-208
status: done
branch: PacoCotera/miniaturebeasts:build/t-204-guide-current-looks
head: fa537ed7
ci: not run (the checks below were run locally)
---
## Verdict: PASS
The field guide now counts the current looks only, legacy looks show as found and never count, and the four new tests do what they say. No fixes. One question for the game designer on the meaning of the legacy list (below). This review was asked for in a message from the lead; I wrote and claimed T-20261016-208 for it.

## Run (a worktree of fa537ed7, off station-gate e765dc65)
- Station: 450 pass, 0 fail (the result says 450; it was 446).
- Workbench 30 pass, ui 81 pass, face 34 pass, all 0 fail.
- Guard `--base origin/station-gate`: `public guard ok`, guard_exit=0.
- Not run: `frames --check` (no frame changed; the diff is three files, two in prototypes/station/src and one test).

## The diff, read (44 insertions, 7 deletions in three files)
- `library.mjs`: `possibleLooks` is now `currentLooks(frame, trait)`. `fieldGuide` takes each trait's `possible` from it, so `unseen`, `more`, `complete` and `oneFromFull` follow the current looks. Each trait also carries `legacy`, the seen looks outside the current ones (empty for a shut chapter), and `found` still holds every seen look, legacy included.
- `state.mjs`: `guideComplete` uses `currentLooks` too, so it equals `fieldGuide(...).complete` (asserted for S01 and S03).
- Nothing else in the Station reads `traitLooks` or `possibleLooks` (a search of station/src finds only these two sites), and the wish picker's `wishPinBlock` already requires a look the guide holds.
- The four tests: (1) a Loika save with every current look seen is complete with 20 looks and plain is never listed as unseen; (2) the same save plus a seen plain is still complete, plain is in `found` and `legacy` and not in `possible`, and a wish can pin plain only once seen; (3) the Tuikis's three digging feet complete Claws, and a seen hoof is found and legacy with 0 unseen; (4) for every species except the Loika, `possibleLooks` equals `traitLooks`. The counts match T-205's table (S01 21 to 20; S03 and the rest unchanged).

## For the game designer: what "legacy" means here
As built, `legacy` is the seen looks that the current frame cannot show: **found, listed in `found`, never in `possible`, never unseen, never blocking completion**. Two consequences worth a yes or no:
1. **The species' progress seeds count a legacy look as found.** `library-props.mjs` computes progress from `g.found` over `g.found + g.unseen`, and `found` still includes a seen legacy look, so a seen plain Loika adds one to both sides. By my arithmetic for S01 (20 current looks, one legacy) and S03 (80, three legacy) it cannot change which of the four seeds a species shows today, but the sentence "never counted" is true of completion and unseen, not of the seeds. If the intent is that a legacy look is shown but never counted anywhere, the progress needs `found` less `legacy`; if it only must not count against completion, nothing changes.
2. **Nothing draws the legacy mark.** The list `legacy` exists in the model, but no screen or props builder reads it (a search of station/src and the library props finds no consumer), so a legacy look appears among the found plates like any other. If the owner expects it to read as "an old line's look", that needs a drawing ticket.

## Observations, no change asked
- A seen legacy look in a shut sealed chapter is hidden (`legacy` is empty when shut), as `found` is; consistent.
- `guideComplete` and `fieldGuide` now agree through the same source (`currentLooks`), so there is one place to change if the rule moves.
