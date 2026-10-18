---
ticket: T-20261016-207
status: done
branch: PacoCotera/miniaturebeasts:genome-batch-185-187
head: 35fb6bf4
ci: not run (the checks below were run locally)
---
## Verdict: PASS
The merge is sound: the three reviewed changes are all present, nothing was lost or added in the merge, and every suite is green. One rule change (3) is confirmed as consistent with cross; the rule itself is the game designer's to own. No fixes. This review was asked for in a message from the lead; I wrote and claimed T-20261016-207 for it.

## Run (a worktree of 35fb6bf4, off station-gate 09a00dd0)
- Workbench `node --test tests/*.test.mjs`: 30 tests, 30 pass, 0 fail.
- `node framework/build-frames.mjs --check`: `ok`, frames_exit=0.
- Station 446 pass, ui 81 pass, face 34 pass, genome-stamp 9 pass, all 0 fail.
- Guard `--base origin/station-gate`: `public guard ok`, guard_exit=0.
- No conflict markers anywhere in prototypes/workbench.

## (1) The cross.mjs resolution: correct
- `cross()` keeps its signature and calls `drawLoci(frame, a, b, k, opts)`; the `rng` default moved into `drawLoci`, which `cross` reaches through `opts`. The returned record is as on station-gate (`origin.kind` "cross", parents, parentIds, kinship, spread, penalty, strength).
- `shedPod(frame, x, opts)` reuses `drawLoci(frame, a, a, SELF_KINSHIP, ...)` with `SELF_KINSHIP = 1 / 8`, records `parents: [d, d]` and `parentIds: [id, id]` (when the parent has an id), redraws up to `SHED_TRIES = 24` while the child equals its parent or does not build, and returns null after that.
- `cross(m, m)` is still refused (`refuse` untouched); the test asserts it.
- `relatedness`'s `known` treats "shed" like "cross" (T-187), so a shed pod whose parent cannot be found reports `pedigreeKnown: false`.
- All three branches' tests are in the merged file: the shed pod's draw (line 456), the shed pod's version rule (502), the shed pod's pedigree (512), the cross viability test (441), `currentLooks` (409) and the S03 claws tests (397, 421).
- The frames: a structural comparison of all 16 frames against station-gate shows only the three viability fields in each (`viability.rule` text, `crossed` and `crossedBuilt` added). Pools, loci, chapters, type specimens and frame versions are unchanged.

## (2) The caught regression: confirmed fixed
station-gate's `cross()` returns `frameVersion: frameVersionOf(frame)`; the shed-pod branch had it as `FRAME_VERSION`. In the merged file `cross()` (line 145) and `shedPod` (line 199) both use `frameVersionOf(frame)`, and no `FRAME_VERSION` remains in cross.mjs (a search of the framework finds it only in species.mjs, where `frameVersionOf` is defined as the frame's own version or `FRAME_VERSION`, now 4). So a cross child and a shed pod of a frame at a later version carry that version.

## (3) The rule change: shedPod no longer refuses a parent on an older frame version
Confirmed as consistent with cross, and as working; the rule is a game call.
- **What it does now:** the check "a parent on an older frame version is refused; move it first" is gone from `shedPod` (the other refusals stay: a parent of another species, and a locked pair that differs from the frame). A parent born on an older version sheds a pod born on the frame's current version, exactly as `cross()` does for a parent on an older version (cross never refused it).
- **Measured** (a seeded probe over all 16 species, 12 parents each, every parent re-stamped one version older): 192 of 192 shed a valid pod, 0 refused, 0 null; every pod is born on the current version (`frameVersion` equal to `frameVersionOf(frame)`); the same 192 parents cross with another older-version parent without error. A Loika whose Markings are the legacy "off" copies (frame version 3) sheds a valid v4 pod that carries the legacy copy, as a cross would.
- **What follows:** a shed pod can carry a legacy copy (a plain Loika line, an old Tuikis foot) from an old parent; the field guide counts it as a seen look outside `currentLooks`, as T-204 intends.
- **Latent, not a fail:** `drawLoci` reads `a.loci[l.id]` for every locus of the frame. Today the version changes only widen or narrow a pool (no locus added), so an older genome has every locus. A future frame version that adds a locus would make cross and shedPod fail on an old parent alike (a TypeError, not a refusal); that is the moment to add a "move the genome up" step. Worth a note for whoever adds the first such version.
- **For the game designer:** I confirm the behaviour matches cross; whether an old-version mibi should shed at all, and whether a legacy copy should pass to the pod, is their rule to own, not a review call.

## Fix tickets
None.
