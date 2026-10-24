# Sitting S1 gate (architect, 2026-10-24 03:17 Mexico City), 09d588f5

T-20261024-297, branch build/sitting-props, one commit 09d588f5 on 8476056c (P0). This gate is also the review: I read the whole diff (13 files, +978 −195) against the ticket's lines, results/sitting/sitting-spec.md §1 and ARCH-2, and the code the diff changes.

## Verdict: PASS, merge, after one text fix

Every ticket line holds. The fix is spec text only (F1 below). It is golden-neutral and needs no new run beyond the two checks it names, so the builder may push it as a fixup on the branch, and I will check the diff without a new gate. If the lead prefers to merge 09d588f5 as it is, F1 goes into S2's first commit instead.

**F1:** `sitting.json home.berth.after` becomes:
> "the next held frame when begin brought one forward from the queue, whatever its source (the state after begin: st.sitting held; sitting.mjs beginSitting returns next: true); else nothing. No count, no word"

Then regenerate metrics.json with `make-metrics-vectors.mjs` if it changes, and check with `--check` and `node --test prototypes/ui/tests/specs.test.mjs`.

## What I ran

All of it was in a scratch worktree, `arch-s1/wt`, with a private FACE_BUILD_DIR, TMPDIR and STATION_CHECKS, and each command under 10 minutes. All of it is removed now.

**At 09d588f5:**
- `build.sh all`: layout 732 cases, 0 differ; face_test 15185 checks, 0 failed; native hash 47e09df8.
- `node --test`:
  - station 617/617 (P0's 605, plus the new sitting-props tests and the changed sitting tests);
  - ui 78/78;
  - face 604/604.
- `make-metrics-vectors --check`: 12282 cases, current.
- Face guard (with the K7 rules) ok; public guard ok.
- `goldens --check`: all 10 sets match.
- Station journey ok; checks.mjs ok; layer-check ok.
- Play journey ok.

**At 8476056c:** the Station journey, checks.mjs and layer-check, with the same face build (S1 has no face C).

**Comparisons between the two sides:**
- checks.mjs output: byte-identical, whole.
- layer-check output: byte-identical.
- Type log: 44 shots, 0 differ.
- Snapshots: 44, 0 differ.
- Region rects differ only in pods-identifying and page-hatch. These are the two real-clock timing shots I documented at the P0 gate.

**Props records.** I did not re-run the builder's recorder. The diff changes no existing props builder:
- the only views file is the new sitting-props.mjs;
- pictures.mjs changes only the new 528 × 392 branch of the `portrait` kind;
- no props builder reads the return shapes sitting.mjs now gives.

So I accept the builder's figure of 19 files byte-identical. As I read "13184 of 13214", the other 30 records belong to the new tests.

**Merge.**
- `git merge-tree --write-tree 09d588f5 a9d087f9` (station-gate, now with the Library art and the 68-colour palette) is clean: tree 133b8c17. 8476056c is an ancestor of a9d087f9.
- The tree station-gate moved (8476056c → a9d087f9) shares none of the files S1 touches. sitting.json does not name the retired `home-sitting-32x24`.
- On the merged tree:
  - `node --test` station: 617/617;
  - ui together with the sitting, pose-request and pictures-rgba tests: 177/177;
  - metrics `--check`: current.

## Review: the diff line by line

- **sitting.mjs.**
  - Queued checkWelcome returns `{ ok: true, queued: true, position }`. beginSitting returns exactly `{ ok, crate, wait, next }`; a test asserts the key order.
  - headless.mjs:62 reads `ok && !queued`; the journey and play journey are unchanged. dev.mjs's message follows the new shape.
  - All the sitting tests are moved to the new shapes, with the queued position checked.
- **portrait-source.mjs.** Keeps a copy of the 528 × 392 opening for the last 2 digests, least recently used out first; a read refreshes it. `dropPortraitSources` clears both maps. A refused source keeps nothing (tested). pictures.mjs: `size [528, 392]` gives a derived entry from the kept opening, else an empty slot.
- **sitting.json.** I checked every Changed, Added and Removed item of spec §1 against the file: states, resident, nameTag, gilt, deck, strip, heading.portrait, cards, chosen, steps, portrait, stamp and its portrayed corner, glass.pictures, drawOrder, the three vectors, the focus card shape, focus.portrait, keys, masters (the list and placeholders), home.plate, home.berth, bottomLine.portrait, strings (welcomePlate gone; lookPortrait and portraitContext null) and buildChanges. Also `events.backdrop.resident: "cut"`. All are present.
- **sitting-props.mjs.**
  - Every mibi picture is mibiReq with `poseFor`'s object, never a bare name, as my P0 gate's S1 line requires. The test "with shake-dry, shake-dry's three requests carry owed" proves it.
  - Card 96 and thumb 48 use view default at day. The window is 304 × 312 at view habitat, in the hour's light on the pose step and at day after; the test confirms no light suffix at 23:30.
  - The glass comes from habitat.json's light table. Plates go through plateDevice; wells, slots and the stamp are built the same way as Habitat's; words go through `fill`.
  - The juvenile's figure is 103 × 79.
- **sitting.props.json** (the shape). Each state validates against it, no rectangle is named, and the budget test passes.

## Rulings on the builder's points

**(1) The rewritten specs.test.mjs sitting test and the fix-14 shape `card: { rect: 6 }`: acceptable.**
- The signed spec moved the resident (top 68 = 380 − 312) and its tag (404 = feet + 24) onto Habitat's 16.15 placement, which is not on the 8 px grid. It made the deck, strip and portrait plates 1:1 (no `component`), and gave the cards a 128 pitch (8 px apart) and the steps a 472 region. The old test asserted the 10-09 wireframes and failed under the spec it now has to check.
- The new test keeps everything that still holds:
  - bezel, glass, heading, strip and deck in both 14-* wireframes;
  - bezel and glass equal to Habitat's;
  - the resident on Habitat's axis in Habitat's 304 × 312 box, and the tag on the same centre;
  - every region names its word, composition or picture;
  - the grid rule for every other region;
  - the cards' forms, the steps filling their region, the portrait filling the gilt's opening;
  - the focus vectors, including the room in confirm and portrait.
- `{ rect: 6 }` is the spec's own `focus.pose.targets.card.shape`.
- **Follow-up for S2, not blocking:** assert the tag offset against Habitat's own key, `R.nameTag.rect[1] === R.resident.feet + hab.regions.nameTag.under` (habitat.json has `under: 24` since K6), not a literal 24.
- The 14-* wireframes in design/style-guide are now behind the spec. Redrawing them from sitting-wf-2 is UI/UX's; until then the test checks only the rects those wireframes still hold.

**(2) `home.berth.after`:** the replacement is F1 above. The spec §1 text predates Q7, so the builder copied it exactly as told. The berth reads the state, never begin's return.

**(3) The "Other specs" lines go to these tickets:**
- **habitat.json** (`regions.stamp.portrayed`, drawOrder `stamp.portrayed`, `bottomLine.portrait.portrayed`, `focus.entry.backFromPortrait`): **S3**. They change Habitat's output, together with the door.
- **frame.json `navigation.screens.sitting.steps`** (← from the pose step and from the portrait go to Habitat with the ring on Portrait): **S2**. The host and intents read it there, and it changes no golden while the door is shut.
- **frame.json `navigation.jumps`** (Cargo's end → sitting/portrait): **S4**.
- **cargo.json `keys.confirm.end` and `dockCrates.sitting.revealNote`; home.json's bay hold:** **S4**.

**(4) The props choices: all accepted.**
- **`resident.pose` and the cards' `pose` carry the habit id.** That is what the host's intent needs (`beginSitting(st, m, pose, place)` takes the habit, and `m.portrait.pose` stores it). The pose name is inside the picture id, and the face never needs it. The prop keeps the name `pose`, matching sitting.mjs.
- **The begin state sends the lit gilt and confirm's heading.** The face dithers the lit gilt out on `events.begin` (0–300 ms), and the deck holds still through the 480 ms hold.
- **Regions not drawn in a state carry empty forms** ("" / [] / zeros). One shape in every state; the face draws no node for "".
- **A step not yet done has picture null** (`steps.props` says "| null, only when done"). Its frame is "", except step 2 in state portrait (the 48 × 40 frame around the 40 × 30).
- **The 96 and 48 place pictures are slot requests** for `place-{g}-96x96` and `-48x48`, with no code stand-in. The 48s are placed on station-gate, and S2 places the 96s from masters-pods. The `place` kind's drawn stand-in would be a picture no golden should ever show.
- **sittingBuild returns null when state portrait is asked for without its opening.** That is "offered only while the picture is held". **Line for S2:** the host never enters state portrait on null. From Habitat, the Look action is not offered (S3); from Cargo's end, ✓ falls through to "Look at the pods" (S4).

## Non-blocking notes

1. **The place line builds "the " + PLACE_WORD in code.** `strings.places` describes these words but is not a table. When the copywriter makes it one (`strings.places: { meadow: "the meadow", … }`), sitting-props reads it.
2. **`portraitOffered` calls `portraitOpening`, which refreshes the digest's place in the least-recently-used order on a mere check.** This is harmless with 2 kept, and it means the portrait being looked at is the one kept.
3. **A confirm or portrait state reached with no chosen pose** would ask `poseFor(…, null)` and mark it "habit key null". The host never reaches it (beginBlock refuses a missing pose). S2's intents test should cover entering confirm only with both choices made.

## Cleanup

- The scratch worktree is removed and pruned, and `arch-s1/` is deleted (build, TMPDIR, records, logs, and the merged-tree checkout).
- /home/user/miniaturebeasts is unchanged and clean. The only extra is one dangling `commit-tree` commit for the merged-tree check, which nothing references.
- No /tmp/bake-* exists. Free space on / is 8.5 GB.
