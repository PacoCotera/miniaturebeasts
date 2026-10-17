---
ticket: T-20261016-189
status: done
branch: PacoCotera/miniaturebeasts:genome-cross-viability, genome-shed-pod
head: 1b9296f4 (T-185), 970537ae (T-187)
ci: not run (the checks below were run locally)
---
## Verdicts
| Ticket | Branch @ head | Verdict |
|---|---|---|
| T-185 every cross of two valid members builds | genome-cross-viability @ 1b9296f4 | **PASS** |
| T-187 shed pod relatedness | genome-shed-pod @ 970537ae | **PASS** |
| T-184 the shed pod (my earlier FAIL) | genome-shed-pod | **closed: PASS at 970537ae** (the one fail, relatedness, is fixed by T-187) |

This review was asked for in a message from the lead; no review ticket existed, so I wrote and claimed T-20261016-189.

## T-185 cross viability: PASS
**Run (a worktree of 1b9296f4, from station-gate):**
- `node --test tests/*.test.mjs` in prototypes/workbench: 24 tests, 24 pass, 0 fail.
- `node framework/build-frames.mjs --check`: `ok`, exit 0, every frame viable 200/200.
- `node .github/public-guard/guard.mjs --base origin/station-gate`: `public guard ok`, guard_exit=0.
- Not re-run: station, face, ui and genome-stamp (446, 34, 81, 9 in the result). The diff touches only prototypes/workbench (`framework/rig.mjs`, `framework/species.mjs`, `tests/framework.test.mjs` and the 16 frames), and nothing outside the workbench reads the rig.

**The diff, read:**
- **Frames:** a structural comparison of all 16 frame files against station-gate shows exactly three changes, in every frame: `viability.rule` (the words), and `viability.crossed` and `viability.crossedBuilt` (added). Seeds, pools, loci, chapters, type specimens, the frame version and the stamp snapshot are unchanged, as the result says.
- **The fix is in the rig:** `connect` now takes the direct join for a narrow join only when the two regions share a point inside both (`meets`, the same witness test the attachment uses); otherwise they take the connector, as a thin waist does. A broad join and a clear touch are unchanged.
- **The check:** the frame builder now also crosses 24 valid members and builds each child; the frame is rejected unless every child builds (`crossedBuilt === crossed`).
- **The test:** every frame's crossed children build and, in S08, S09, S13 and S16, every waist value from 0.30 to 0.75 builds.

**Independent check of "no living mibi's body changes":** I built the same 201 genomes in each of the 16 species (the type specimen, 120 pool samples and up to 80 crosses of 20 members, seeded) with station-gate's framework and with this branch's, and compared a hash of every body's scene: **3,216 bodies, 0 valid bodies changed, 18 that did not build before now build (S08 4, S09 1, S13 8, S16 5), 0 newly broken.** That agrees with the result's own measurement (1,616 bodies, 0 changed, 24 now build). It is a sample, not proof for every genome, but the change only triggers on a narrow join whose regions meet with no shared point, which is the failing case.

**Observations, no change asked:** `crossed >= 150` is asserted per frame, so a frame that stops sampling enough crosses fails the test. The check draws its crosses at kinship 0, the widest spread; shed pods draw at 1/8, which stays inside the same rig, so the fix covers them too.

## T-187 shed pod relatedness: PASS
**Run (a worktree of 970537ae):**
- `node --test tests/*.test.mjs` in prototypes/workbench: 25 tests, 25 pass, 0 fail.
- `node framework/build-frames.mjs --check`: `ok`.
- Guard `--base origin/station-gate`: `public guard ok`, exit 0.
- The diff since 386a72af is 11 insertions and 1 deletion in two files.

**It answers my finding:** `relatedness`'s `known` now treats origin kind "shed" like "cross" (its recorded parents must resolve; for a record, `parents` objects or the same logic as a cross). The new test, on S01's type specimen as the parent with a seeded shed pod, asserts: parent resolvable gives `pedigreeKnown` true and kinship at least 0.5; `lookup = () => null` gives `pedigreeKnown` false. The result reports it fails with the fix reverted. That is the case I measured (kinship 0 with pedigreeKnown true before).

**The broken intermediate commit 894bb198, confirmed:** `node --check` on its `cross.mjs` fails with a syntax error at the `export function cross` line (the inline comment swallowed the end of `known`). The head 970537ae moves the comment to its own line and is good. The branch history carries the broken commit; since nothing is squashed or rewritten here, anyone merging the whole branch should be aware that 894bb198 alone does not run.

## The two branches together
`git merge-tree` of genome-shed-pod and genome-cross-viability reports one conflict, in `prototypes/workbench/tests/framework.test.mjs` (both add a test at the end of the file); `cross.mjs`, `rig.mjs`, `species.mjs` and the frames merge without conflict. As the lead expected, the resolution is to keep both tests. I did not run the tests on the merge.

## Fix tickets
None.
