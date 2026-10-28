# R2 gate (architect, Tue 27 Oct 2026 18:08 Mexico City), ce22f7f5

## Verdict
Merge. origin/build/rooms-r2 (c3949a92, cd8d524c, 1ee4c4c0, ce22f7f5 on station-gate 5056b4ae) conforms to T-20261027-315 and arch-rooms.md §4 ("The shed pod on the Companion"). No fix lines.

## Fix lines
None.

## Rulings
1. **Merge-ready: yes.**
   - shedsDue (prototypes/exploration/index.html:441) is the ticket's filter word for word. shedKnown (:436-439) checks S.pods, S.hold.pods, every S.bay crate's pods and S.exp.cargo.pods by `shed` id. At startExpedition S.hold has not yet moved into the cargo (:1234), so a held pod is seen.
   - podSite (:413) is the old firstPods `ok` moved out unchanged. firstPods now calls it (:417), so the two pod sites cannot drift apart. shedCell (:429-434) takes the tier reach sorted by index, keeps the cells that pass podSite, and picks the nearest by Chebyshev with a strict `<`, so ties go to the lower index. It prefers ground `g` and falls back to the nearest fit cell. It returns null when no cell fits, and the expedition is then skipped (:1226). A null `g` (a founder) goes straight to the fallback.
   - The placement (:1225-1227) comes after firstPods, places one record an expedition, and pushes the exact §4 record.
   - The carry: `shedOf` (:440) carries `shed`, `of` and `genome` at take (:1686), at the swapped-out pod (:1687), at drop (:2181) and at the crate seal (:2220). A hold kept by a full bay holds the cargo object itself (:2218), so nothing is lost there. On the Station, openCrates (state.mjs:375-387, from R1) keeps `q.genome` when checkGenome passes. In the same call that accepts the crate it marks the record `found`. So no turn exists in which the crate has left the Companion's bay (index.html:905) while the record still reads `due`. A duplicate cannot come from that window.
   - The bond line (:4928) shows `tendBond` when `!m.bonded && tends + 1 >= BOND_TENDS`. That is exactly the press on which tend() (:745) then bondCheck() (:752) sets `bonded`. The care test proves the line and the bond come on the same press.
2. **Glint timing: accepted as built.** fxGlint plus the log in ensureLive (:1382) fire when the pod is given its x and y. That happens the first time the player enters that place in the expedition. ensureLive is called only from enterPatch, enterCave and leavePatch (:1424, :1440, :1448), so the glint always plays in the place on screen. This is the ticket's "when it is revealed". A glint at expedition start would play in a place the player is not looking at. The ring outlives the 200 ms entry dither (ring life 1000 ms, :4966; dither, :4959).
3. **A shed-pod scenario in a journey: not needed in R2.** The ticket's Proof names unit cases only, and R2.1-R2.4 plus the state test cover them. The end-to-end walk (return, dock, expeditions, glint, crate, open) belongs in R6, where the Station's find words (C18) land. I recommend the R6 ticket add it to the existing journey.mjs. That needs no new suite, so the owner's approval is not needed.
   - Non-blocking: R2.4 never fills the hold, so the swap branch (:1687) is checked by reading the code, not by a test. It can be added in R6 with the journey.

## Checked
- I read the full diff 5056b4ae..ce22f7f5: 4 files, +117/-10, no stray build output.
- I ran the ticket's checks 1-5 on ce22f7f5 in a sparse detached worktree (node --test):

  | Check | Tests | Result |
  |---|---|---|
  | first-pods | 28 | all pass |
  | trips | 13 | all pass |
  | care | 94 | 93 pass, 1 skipped (as built), 0 fail |
  | world | 97 | all pass |
  | station state | 56 | all pass |

- Not run: check 6, journey.mjs, which needs Playwright and the full face. No number looked wrong, so I did not rebuild it, as the lean gate allows. The builder reports the CI node groups green with 0 goldens changed.
- Outside my remit: the placeholder words "of {of}'s line" and "A pod of {name}'s line" (C18) are the content writer's to word in R6.

## Cleanup
- The private worktree /tmp/claude-0/-home-user/48cdf533-58b9-58f2-b00a-c4744c6746fe/scratchpad/arch-r2 is removed and the worktree list is pruned.
- Nothing was committed, pushed or edited. /home/user/r2 was not touched.
- This report is not committed.
