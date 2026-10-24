# P0 gate (architect, 2026-10-24 00:29 Mexico City), c0baa42a

T-20261023-288, branch build/pose-request, one commit c0baa42a on ae0afe65. The ticket lines are in arch-sitting-screen.md §3 P0. This gate is also the review: I read the whole diff (34 files, +563 −45) against the code it changes.

## Verdict: PASS, merge

There are no fix lines. Every P0 ticket line holds, and my own runs confirm the builder's figures. The three open points are ruled below; I accept all three as built. The notes at the end are non-blocking.

## What I ran

All of it was in a detached scratch worktree, `arch-p0/wt`, with a private FACE_BUILD_DIR, TMPDIR and STATION_CHECKS. All of it is removed now (see Cleanup).

**At c0baa42a:**
- `build.sh all` (EMSDK /root/emsdk):
  - layout 775 cases, 0 differ;
  - face_test 15226 checks, 0 failed;
  - native hash 47e09df8, the same as at the K6 gate.
- `goldens.mjs --check`: all 10 sets match, exit 0.
- `node --test`:
  - station 605/605 (it now includes pose-request.test.mjs);
  - ui 80/80;
  - face 598/598.
- Station journey: "journey ok", no FAIL, no "differs from the golden" line. Then checks.mjs ("layer checks ok") and layer-check ("layer check ok").
- Face guard ok. Public guard against origin/station-gate ok.

**At ae0afe65:** the Station journey, checks.mjs and layer-check, in the same worktree with the same face build. Face C does not change in P0, so the build is the same.

**Comparisons between the two sides:**
- checks.mjs output is byte-identical whole, before stripping anything. The placeholder count does not move, because no journey shot registers a new picture.
- layer-check output is byte-identical.
- Type log: 44 shots, 0 differ.
- Snapshots: 44, 0 differ except the new `owed` field, which is empty in all 44.
- Region rects differ in 2 shots, pods-identifying and page-hatch, and I counted that as a timing effect, not a defect. I ran the journey 5 times (base ×2, P0 ×3):
  - pods-identifying's specimen rule falls at y 294/293/291/293/293 and page-meet's resident at 73 or 72, varying within each side.
  - page-hatch's juvenile sits at y 269 in both base runs and 272 in all three P0 runs. Both are shots taken mid-animation, on the journey's real clock.
  - The same pictures pass `goldens --check`, which runs on the virtual clock, including the incubator hatch and Pods states. layer-check is identical too.
  - My reading of page-hatch's steady 3 px is that P0 decodes 18 more stand PNGs at load (`setStandLayers`), which moves the real-time phase of the hold. That is not proven.
  - Regions are not a P0 proof line.

**Stands regenerated from the inputs:**
- `make-stand-layers.py` was run with masters-pods `floor/S01` (/home/user/mp) and a layers folder: wq `T-20261016-200/layers` with `T-20261016-203/patches-r2` laid over it.
- The output is byte-identical to c0baa42a: 40 files, and index.json unchanged.
- With the T-200 patches alone, the four patches files differ. So the anchor and the curl both use the round-2 patches, as uiux-k5q C2 asks.
- Against ae0afe65: the 22 existing files and their `files` entries are identical. The adult and juvenile top-level entries (traits, pose, figure, sizes, curl) are deep-equal. Only `poses`, `habits` and 18 curl files are added.

**Planted owed request:** in habitat-props, the resident's mibiReq was given `{ pose: "anchor", owed: "habit key probe" }`. `goldens --check habitat` then fails with 29 failures, every one "shows an owed habit key (<id>)", and with the ids unchanged. This is the builder's figure. I reverted the probe.

**Merges:**
- `git merge-tree --write-tree c0baa42a 56074d2d` (station-gate with K5.1): clean, tree 1f188404.
- `c0baa42a` against `origin/build/kit-rules` 4543f230 (K7 with its fix round): clean.
- All three together (P0, K5.1, K7): clean, tree c1f44446. I checked that tree out and ran:
  - `build.sh all`: layout 732 cases, 0 differ; face_test 15137 checks, 0 failed; native 47e09df8;
  - `make-metrics-vectors --check`: "metrics vectors current: 12234 cases". metrics.json is touched by both P0 and K5.1, and the merged file is still what the tool generates;
  - the face guard with the K7 rules: ok;
  - `node --test`: station 605, ui 78, face 604, 0 failures;
  - `goldens --check`: all 10 sets match.

I did not re-capture node records or props records. P0 changes no face C. The goldens hashes and the byte-identical checks and type logs cover the drawn output. The test "the anchor, given or not, is today's request exactly" covers the requests, alongside the builder's 13186 props records with 0 differ. I took the builder's record figures as they are.

## The three rulings

**(1) `owed` reaches mibiReq through the trailing `pose`, which may be a pose name or `poseFor`'s `{ pose, owed }`. Accepted.**
- It keeps one signature, and it makes the pose and its owed mark travel as one value. sitting-props passes the same `poseFor` result to the card, the thumb and the window, so the three can never disagree on the pose or on being owed.
- A plain string never carries owed. This is documented at `poseName` and `mibiReq`, and both forms are tested.
- **Line for S1:** sitting-props passes `poseFor`'s object, never a bare pose name, for every pose card, thumb and window request. A test asserts that a keyless habit's three requests all carry `owed`.

**(2) make-stand-layers.py carries the "under" layers, the curl shadow and their files over from the index, and place-stand-shadows.mjs also writes the anchor pose's "under". Accepted.**
- Before this, a rerun of the cut deleted every PNG and wrote no shadow entries. That was a latent break of the world-size shadows, and the builder's change fixes it.
- Ownership stays single: place-stand-shadows is still the only tool that authors a shadow, and make-stand-layers only preserves one. Each tool's header now says so.
- Running the two tools in either order gives the same index; I verified the order make-stand-layers after place-stand-shadows by regeneration.
- The curl pose has no "under" in P0. Folding `curl.shadow` into `poses.curl` is the curl ticket's job (16.17), and place-stand-shadows writes it.

**(3) Curl files are named `S01-<stage>-curl-304x312-<part>`, the fit check uses the pose's own figure, and `lastOwed` is read on every sync. All accepted.**
- **The names.** The anchor's names do not change, so no id or file moves. A pose's name goes before the size, the same way for every pose. P1 adds `S01-<stage>-shake-…` and `S01-<stage>-calm-…`.
- **The fit check.** The factor comes from the stage's anchor figure (`figureBox`). The check that the drawn ink fits the picture must then use that pose's own ink box. The anchor's box would refuse a curl that fits, or pass a key that overflows. The measured figures agree with my numbers (with the crest): 130×95, 103×79, 77×56, 54×41, 39×28, and 81×88 for the anchor at 96.
- **`lastOwed`.** An owed request and an unowed one have the same id, so the props message can be byte-identical while `owed` differs. The value must be refreshed before syncProps's "same props" early return, and it is.

## The art director's key names

The habit keys are named after their art files: `shake` and `calm`. `stands.S01.habits` translates habit to pose; at P1 it gains `"shake-dry": "shake"` and `"calm": "calm"`.
- `poseFor` then returns pose `shake` for habit shake-dry.
- The owed text keeps the habit's name ("habit key shake-dry").
- The `#<pose>` in the id is `#shake`.

This amends arch-sitting-screen.md Q2, where I had written "shake-dry" as the pose. **Line for P1:** `POSES = ['anchor', 'curl', 'shake', 'calm']`, `HABITS = {'sleep-curled': 'curl', 'shake-dry': 'shake', 'calm': 'calm'}`, run from the signed keys (adult first, as the art director orders), with P0's id and figure tests extended to both. masters-pods b00a8b17 already holds the shake and calm layers. P1 runs only when the art director signs the keys.

## Non-blocking notes

1. **`habits` is a key beside the stage keys** in `stands.S01`. No reader iterates that object today (I grepped layered-stand.mjs, place-stand-shadows.mjs and the tests), but a future loop over `Object.keys(stands.S01)` would take `habits` for a stage. Whoever next touches the index schema should move it to `stands.S01` → `{ stages…, habits }` only by ruling. Until then, iterate the stages explicitly (`["adult", "juvenile"]`), as both tools already do.
2. **A string pose on a species with no layered stand** puts `pose: "curl"` on a request whose id carries no pose. The request draws the species stand-in, which is harmless, and line (1) for S1 means this path is never taken.
3. **The journey's region rects jitter in timed shots** (pods-identifying, page-meet, page-hatch). A future gate that uses "regions as sets" as a proof should leave those shots out or compare them on the virtual clock.

## Cleanup

- The scratch worktree is removed and pruned, and `arch-p0/` is deleted: build directory, TMPDIR, journey records, logs and the symlinked layers folder.
- The clone /home/user/miniaturebeasts is unchanged (build/ui-kit dfab4d0f, clean). The only extras are two dangling commits that merge-tree's three-way check made with `commit-tree`; nothing references them.
- The builder's worktree /home/user/pr was not touched.
- No /tmp/bake-* was created; none exist now. Free space on / is 9.3 GB.
