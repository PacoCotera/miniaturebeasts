# Sitting P1 gate (architect, 2026-10-24 08:07 Mexico City), 03da045c

T-20261024-300, branch build/sitting-poses, one commit 03da045c on 113102c6. This gate is also the review: I read the whole diff (40 paths: make-stand-layers.py, stands/index.json, 36 new PNGs, pose-request.test.mjs and sitting-props.test.mjs).

## Verdict: PASS, merge, after one text fix

F1 is register text plus one test regex. It is golden-neutral, so a fixup the builder pushes, which I check by diff, is enough; no new gate is needed. If the lead would rather merge 03da045c as it is, F1 goes into S2's first commit.

**F1, in `prototypes/station/src/art.mjs` PLACEHOLDERS** (on the merged tree; Library 2 edited other lines of the same array, and merge-tree is clean):
- `stand-layers` `what`: replace "in the poses anchor and curl" with "in the poses anchor, curl, shake and calm". Replace "the signed version 4 bare base key of each pose (anchor, curl)" with "the signed version 4 bare base key of each pose (anchor, curl; shake and calm cut from the floor set's signed final ids, sha256-checked against floor/S01/manifest.json)".
- `habit-key-owed` `what`: "a pose card, thumb or window whose habit has no signed held key: the derived stand (every S02 and S03 habit, and an S01 habit outside stands.S01.habits)".
- `pose-request.test.mjs`, the register test: `assert.match(sl.what, /anchor, curl, shake and calm/)`. Also assert that habit-key-owed's text no longer names "shake-dry".

## What I ran

All of it was in a scratch worktree, `arch-p1/wt`, with a private FACE_BUILD_DIR, TMPDIR and STATION_CHECKS, each command under 10 minutes. The inputs went in their own folders: a `git archive` of masters-pods ac2b9b34 `floor/S01`, and a symlinked layers folder. All of it is removed now.

- **The cut, rerun from the inputs.** `make-stand-layers.py` with masters-pods ac2b9b34 floor/S01 and the T-200 layers with the T-203 patches-r2 laid over them. It printed "76 files, 16 stand-ins" and left `git status` clean, so the output is byte-identical to 03da045c.
- **The signed files, checked independently.** I recomputed the sha256 of all 28 final ids (2 stages × 2 poses × key, crested, crest overlay, fur and zone masks, patches, stripes) against floor/S01/manifest.json: 28 of 28 match.
- **The index gains keys only.**
  - All 40 existing `files` entries are identical to 113102c6.
  - The adult and juvenile top-level entries are deep-equal, and so are `poses.anchor` and `poses.curl`.
  - New: `poses.shake` and `poses.calm` in both stages, 36 files, and `habits = { "sleep-curled": "curl", "shake-dry": "shake", "calm": "calm" }`.
  - Nothing else in the index changed.
- **At 03da045c:**
  - `build.sh all`: layout 732 cases, 0 differ; face_test 15202 checks, 0 failed; native hash 47e09df8.
  - `goldens --check`: all 10 sets match.
  - `node --test`: station and ui 699/699; face 604/604 (run alone in 515 s).
  - Face guard ok; public guard ok.
  - `place-masters --check`: 1042 placed, 0 problems.
  - Station journey ok; checks.mjs ok; layer-check ok.
- **At 113102c6:** the journey, checks.mjs and layer-check. Face C is the same on both sides.
- **Comparisons between the two sides:**
  - layer-check: byte-identical.
  - checks.mjs: identical once the placeholder count is stripped.
  - Type log: 44 shots, 0 differ.
  - Snapshots: 44, 0 differ.
  - Regions differ only in pods-identifying, the known real-clock timing shot.
- **Not run by me:** node records and props records. P1 changes no face C and no props builder, only data. I take the builder's figures: node records 0 differ as sets; props records identical except sitting-props.
- **Merge.**
  - `git merge-tree --write-tree 03da045c 3a1be07a` (station-gate with K-S and Library 2): clean, tree 74670667.
  - On the merged tree, `node --test` station: 624/624, which includes pose-request and sitting-props on top of Library 2.
  - The only overlap with station-gate is art.mjs (Library 2 removed the spread placeholders), in other lines.

## Review

- **make-stand-layers.py.**
  - `POSES = ['anchor', 'curl', 'shake', 'calm']` and `HABITS` are as ruled.
  - `SIGNED = ('shake', 'calm')` reads the new poses' masks, patches and stripes from `floor/S01/layers` and the anchor's and curl's from LAYERS_DIR. That is the ticket's split, and it keeps the anchor and curl byte-identical.
  - The manifest check covers every signed input, including `crested/`, which is checked but not read, as a reference. It runs before anything is deleted or written, and exits on the first bad file.
  - The coat ramps still come from LAYERS_DIR/ramps.json for every pose: one set of ramps for every pose of a coat, which is right.
- **The tests.**
  - Every pose carries its own figure, five bases, and patches, stripes and crest in order, under file names `S01-<stage>-<pose>-304x312-`.
  - A new index-integrity test: every file the index names is on disk, with the recorded sha256 and PNG size.
  - The habits map. `poseFor` gives shake and calm with nothing owed in adult, juvenile and elder; S02 and S03 are still owed for every habit; an unmapped S01 habit ("watch") is owed.
  - The four poses' ids and pixels are pairwise distinct at 304, 96 and 48.
  - The new poses' figures at every size (below).
  - sitting-props now asserts that shake-dry draws the shake's own figure, and that its three requests carry `pose: "shake"` and no owed.
- **The figures** (W×H, with the crest, measured on the build):

  | | habitat 304×312 | card 96 | thumb 48 |
  |---|---|---|---|
  | adult shake | 147×141 | 87×83 | 43×41 |
  | adult calm | 135×137 | 81×81 | 40×40 |
  | juvenile shake | 100×118 | 53×63 | 27×31 |
  | juvenile calm | 109×106 | 58×56 | 29×28 |

  Every pose fits its picture, and the window poses stay inside the 304 × 312 place.

## Rulings

**(1) The stale art.mjs wording:** the replacement text is F1. P0's register test changes from `/anchor and curl/` to `/anchor, curl, shake and calm/`, and gains the check that habit-key-owed no longer names shake-dry.

**(2) "Rerun byte-identical" proven by a rerun, plus an index-integrity test: accepted.**
- The cut needs inputs outside the repository (masters-pods floor/S01, and the work-queue layers), so no node test in CI can run it.
- The rerun is the right proof. I repeated it and the output is byte-identical.
- The in-repo guard is the new test that every indexed file is on disk with its recorded sha256 and size.
- The tool itself now refuses unsigned inputs (the manifest check).

**(3) The props-record exception for sitting-props: accepted.**
- The ticket line "props records of the existing files byte-identical" means the files whose output P1 should not touch.
- sitting-props.mjs is the one builder whose output is meant to change: shake-dry now draws the signed shake with no owed mark. Its test pins the new output.
- The other 19 files are byte-identical (builder's figure).

**The juvenile window factor.**
- Measured: adult 0.5197, juvenile 0.5822 (150 and 110 px of figure over the anchor's 288 and 189 rows).
- The studio's 0.6332 (adult × 0.733 / 0.601) assumed the juvenile was scaled by its share of the adult's height. The build scales each stage by its own anchor figure to its own view height (stand-sizes `views.habitat`: 110 for the juvenile).
- So the studio's juvenile window proof draws the juvenile about 8.8 % too large (0.6332 / 0.5822).
- **Ruling:** yes, the art director rebuilds the juvenile window proof at 0.5822 (0 MXN, a rerender of the signed keys) before S3 takes `sitting-pose-juvenile`. Without it, the art director's 1x sign-off of that golden would judge a size the build never draws.
- It does not block P1 or S2. The 96 cards and 48 thumbs are whole art fitted and do not depend on the factor.
- The signed keys themselves stand: the factor changes only the window's scale, not the art.

## Cleanup

- The scratch worktree is removed and pruned, and `arch-p1/` is deleted (the build, TMPDIR, the masters-pods archive copy, the layers symlink folder, the records and the merged-tree checkout).
- /home/user/miniaturebeasts and /home/user/mp are unchanged. The only extra is one dangling `commit-tree` commit from the merged-tree check, which nothing references.
- No /tmp/bake-* exists. Free space on / is 8.0 GB.
