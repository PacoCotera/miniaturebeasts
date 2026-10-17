---
ticket: T-20261016-184
status: done
branch: PacoCotera/miniaturebeasts:genome-shed-pod
head: 386a72af
ci: not run (the checks below were run locally)
---
## Verdict: FAIL (one small fix, T-20261016-187)
The five points of the ticket all hold. One gap in the surrounding code defeats the stated purpose of recording the true pedigree, and it needs a one-line fix and a test before the PR merges.

## Run on the branch head (a worktree of 386a72af)
- `node --test tests/*.test.mjs` in prototypes/workbench: 24 tests, 24 pass, 0 fail (the result says 24).
- `node framework/build-frames.mjs --check`: ends `ok`, exit 0 (no frame changed).
- Not re-run on this head: the station, face, ui and genome-stamp suites. The diff touches only two files in prototypes/workbench (`framework/cross.mjs`, `tests/framework.test.mjs`) and nothing in the station, face or ui code reads the genome's `origin.kind` (a search of prototypes/station found no use), so I did not repeat the builder's runs (446, 34, 81, 9, all pass). Say so if you want them run.
- Guard: not run on this branch; the diff adds no text outside those two files and the result reports `public guard ok`. (I ran it for other reviews from a worktree; here I did not.)

## The five points
1. **shedPod draws at kinship 1/8.** `SELF_KINSHIP = 1 / 8`; `shedPod` calls `drawLoci(frame, a, a, SELF_KINSHIP, ...)` with the parent as both sides. The origin records `kinship: 0.125`.
2. **The parents are recorded as [m, m].** `origin.parents = [d, d]` (the parent's digest twice) and `parentIds = [id, id]` when the parent has an id; `kind: "shed"`.
3. **It redraws on an equal-to-parent or non-building result.** Up to `SHED_TRIES = 24` draws from the same stream; a draw is skipped when `valuesKey` equals the parent's (compared by values, so an allele name and its number on the blend step count the same) or when `buildIndividual(...).validation.status` is not valid or it throws; after 24, `null`. The test runs 16 frames x 4 pods x 4 parents x 3 sheds.
4. **cross(m, m) is still refused.** `refuse()` is untouched (`x === y`, the same id, or the same bare genome throws "one mibi is not a pair"); the test asserts it.
5. **Nothing else changes.** `cross()` now calls a shared `drawLoci`; its destructuring moves `rng` into the helper, the formulas and the returned record are the same. The diff is 92 insertions and 3 deletions in the two files.

## The fail
`relatedness()`'s inner `known` returns true for any origin kind other than "cross" (`g.origin?.kind !== "cross"` at the line that starts `const known = (x) =>`), so a shed pod is always "pedigree known", even when its parent cannot be found. I ran it on S01 with the type specimen as the parent and a seeded `shedPod`:
- parent resolvable: `relatedness(pod, parent)` is kinship 0.5, identity 0.6, pedigreeKnown true (right);
- parent not resolvable (`lookup = () => null`): kinship 0, pedigreeKnown **true** (wrong; a cross child with the same lookup gives pedigreeKnown false, so the caller falls back to identity).
This matters because the result keeps the true line "so any later cross with its relatives is penalised from the recorded line": the penalty comes from kinship, and a shed pod whose parent record is gone (a returned mibi may well be) reads as an unrelated founder, with no warning to the caller. Wrong: pedigreeKnown true when the parent is missing; expected false, as for a cross.
**Fix:** treat origin kind "shed" like "cross" in `known`, and add one test (resolvable: known and kinship at least 0.5; unresolvable: pedigreeKnown false). Ticket T-20261016-187.

## Observations, no change asked
- The pod's own self-kinship is at least 0.75 (a self cross, F = 1/2), which is right for the pedigree; `kinship()` handles the doubled parent entry correctly (measured 0.5 against the parent).
- The side finding of the result (crosses of two valid pods that do not build in S08, S09, S13, S16, about 5 to 7 percent) is outside this ticket and is reported to the lead; I did not reproduce it.
