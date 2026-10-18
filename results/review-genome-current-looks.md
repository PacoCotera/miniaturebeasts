---
ticket: T-20261016-206
status: done
branch: PacoCotera/miniaturebeasts:genome-current-looks
head: 4960e73a
ci: not run (the checks below were run locally)
---
## Verdict: PASS
`currentLooks` in `describe.mjs` (T-20261016-205) does what the result says and is safe for T-204 to use. No fixes. This review was asked for in a message from the lead; I wrote and claimed T-20261016-206 for it, as I did for T-189.

## Run (a worktree of 4960e73a, off station-gate 09a00dd0)
- `node --test tests/*.test.mjs` in prototypes/workbench: 26 tests, 26 pass, 0 fail (the result says 26).
- `node --test prototypes/station/tests/*.test.mjs`: 446 pass, 0 fail (the result says 446).
- `node --test prototypes/genome-stamp/tests/*.test.mjs`: 9 pass, 0 fail.
- `node .github/public-guard/guard.mjs --base origin/station-gate; echo exit=$?`: `public guard ok`, guard_exit=0.
- Not run: face and ui (the diff is two files in prototypes/workbench and nothing in them is read by face or ui).

## The diff, read
- 11 lines in `framework/describe.mjs` and one test (12 lines) in `tests/framework.test.mjs`. No frame, pool, genome, save or stamp changes.
- `currentLooks(frame, trait)` takes the trait's loci rows, enumerates every unordered pair of each locus row's `alleles` (the pool, never the row's `legacy` allowance), asks `lookOf` for the look each combination shows, and returns `traitLooks`'s looks that appear, in `traitLooks`'s order. If a trait names a locus the frame lacks, it falls back to `traitLooks`.
- `legacy` is declared on only two rows in all 16 frames: S01 `appearance.marking-switch` (["off"]) and S03 `anatomy.contact-terminal-form` (["hoof","webbed","root"]). So only the Loika's Markings (21 to 20 looks, without "plain") and the Tuikis's Claws (the three digging forms) can differ, as the result's table says; every other trait equals `traitLooks`, which the new test asserts across all 16 frames.

## My own check beyond the test
I read the look of every trait for 300 or so genomes per species in all 16 species (150 pool samples and up to 150 crosses of members, seeded), 67,200 reads, and checked each against `currentLooks`: **0 reads outside it.** So no look a current pod can show is missing from the set T-204 will count, including looks reached by crossing (which land between pool alleles). The enumeration over all 16 frames' traits takes under a second in total.

## Observations, no change asked
- `currentLooks` reaches looks only from pairs of pool alleles. A future blend trait with more bins than its pool pairs can reach (for example a five-word size with only two extreme alleles) could be shown by a cross at an intermediate step yet be missing from the set. No trait in today's 16 frames does this (the check above and the test both agree), but T-204's field guide would then undercount it silently. Worth one line in the frames check when such a trait is added.
- The Loika's "plain" exclusion rests on the pool's marking-switch holding only "on". That is the frames' fact today; if the pool is widened, the set follows it with no change here.
