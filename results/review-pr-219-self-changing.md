---
ticket: T-20261016-139
status: done
branch: PacoCotera/miniaturebeasts:genome-self-changing
head: 8c742dac30ff472489756e60fde172ff19df8d24
ci: not run (the tests below were run locally on the head)
---
## Verdict: PASS
PR 219 does what it says and matches specs/genome-screen-calls.md (T-137). No fixes for the genome engineer.

## Run on the branch head (worktree of 8c742dac)
- `node --test prototypes/workbench/tests/*.test.mjs`: 23 tests, 23 pass, 0 fail (the PR body says 23/23).
- `node framework/build-frames.mjs --check` (in prototypes/workbench): ends `ok`; every species shows `viable 200/200`.
- `node --test prototypes/station/tests/*.test.mjs`: 446 pass, 0 fail (the PR body says 446).
- `node --test prototypes/ui/tests/*.test.mjs`: 81 pass, 0 fail (the PR body says 81).
- `node --test prototypes/face/tests/*.test.mjs`: 34 pass, 0 fail (the PR body says 34).
- `node --test prototypes/genome-stamp/tests/bins.test.mjs`: 9 pass, 0 fail (the PR body says 9).
- `node .github/public-guard/guard.mjs --base origin/station-gate; echo exit=$?`: `public guard ok`, exit=0.
- Not run: CI on GitHub (the PR has no check run I looked at).

## The diff, read
- **The 16 frames change only by additions** (a structural JSON comparison of every species file against station-gate, not a line diff): 803 `loci[].changedBy` entries added, 16 `counts.selfChanging` added, 3 `chapters[].traits[].selfChanging` added. Nothing else was added, removed or changed anywhere in any frame. So genomes, pools, viability, the stamp snapshot and the frame version are unchanged, as the PR says. (The large line count in the PR, 1,613 additions, is the added keys across 16 files.)
- **The three loci match the calls:**
  - S03 `glow`: toward `bright`, places cave and wood, no storm.
  - S15 `light-feeding` (Basking): toward `high`, places meadow, pond and rock, no storm.
  - S16 `phase`: toward `solid`, no places, storm.
  - Each is one locus and in the species' pool (the build refuses a frame whose pool lacks the end; the test asserts it too). The calls name `appearance.emission-brightness`, `energy.light-feeding` and `physiology.phase`; the code keys them by trait id, one locus each.
- **The mark's rules** (`SELF_MARK` { stepOf 16, maxSteps 4, fadeAfter 3 }) match the calls: a step is 1/16 of the pool range, up to four, three trips as partner without the trigger take one back; the comment records that a trip the mibi rode on but did not lead counts for nothing and that only the partner changes and a child starts at none. The frames carry the rule; applying the mark in the Station and Companion is the follow-up the PR names.
- **`changedBy`** is species for a locked locus, self for the three traits, player for a shapeable look, breeding otherwise; the test also asserts that only a look is the player's and that a self-changing trait is never shapeable by the player, is a doing, and has one locus. The three traits were already not player-shapeable, so no `shapeable` value changed in any frame.
- **`counts.selfChanging`** equals the count of loci whose `changedBy` is self, in every frame (asserted).

## Observations (no change asked)
- Sealed self-changing trait (S15 Basking, in the sealed Stamina chapter; S16 Phase, in Charge): the calls say it moves from birth but shows no hint until the chapter is read. The frames only carry the rule; the hint rule belongs to the Station work that stores the mark. Nothing in this PR contradicts it.
- The three triggers are stored by place kind (`cave`, `wood`, `meadow`, `pond`, `rock`); the PR's test checks them against the Station's place ids as it lists them in the test (`meadow, pond, rock, wood, cave`), not against `state.mjs` itself. If a place id is ever renamed, that test would not notice. Low risk.
