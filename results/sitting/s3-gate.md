# Sitting S3 gate (architect, 2026-10-24 12:00 Mexico City), ca2025cf

T-20261024-302, build/sitting-open ca2025cf on station-gate 40b75724. One gate for the code and the goldens.

## Verdict

**One fix round (F1, plus the text lines F2 to F7 in the same commit), then merge.** No new gate is needed if the round's proof holds.

- The code reads right against every ticket line except one: Habitat's ✓ Look at the portrait can show a cap that does nothing (F1).
- F2 to F7 change only text, or are golden-neutral. They go in the same commit because a round is open anyway.

## Fix lines

- **F1 (code), `station/src/views/habitat-props.mjs`.**
  - **The defect.** `look` has no away gate, but the habitat intent refuses `S.isAway`. A portrayed mibi that is out with the Companion while it is away, with its opening kept, gets an enabled Portrait target and "✓ Look at the portrait", and ✓ does nothing.
  - **The line.** `const look = pst === "portrayed" && portraitOffered(shown) && doorOpen("sitting") && !S.isAway(st, sv, shown) && !!sittingSpec?.strings?.lookPortrait;`. The last term means a caller that leaves out the fifth argument gets the target disabled and no cap. Today such a caller gets an enabled target with no cap.
  - **The test.** One habitat-props test: portrayed, opening held, the mibi away. The portrait target is disabled and the line is `{ ok: null, subject: strings.portrayed }`. The same holds with no sittingSpec.
- **F2, `ui/specs/station/sitting.json`.** `masters.placeholders.today` becomes `["every S02 and S03 habit", "an S01 habit outside stands.S01.habits"]`. Shake and calm have been signed since P1, and sitting-pose shows both with nothing owed, as the layer check proves.
- **F3, `station/tools/journey-pending/slot-9-sitting.mjs`.**
  - Remove the step `sitting-first-screen`. journey-sitting.json does that step now.
  - Keep `sitting-door-owed`, with milestone `"the sitting's door on a save (sitting.mjs openSittingDoor wired into the host; today dev.mjs only)"`, and rewrite the header comment to match.
  - The face's door opened in S3, but `st.doorAt` is still set only from dev, so X21 waits on that wiring, not on a slot.
- **F4, `ui/specs/station/habitat.json`.**
  - **`regions.portrait.enabled` ("until slot 9").** "(until slot 9 read-only, bottomLine.portrait.shut)" becomes "(read-only with bottomLine.portrait.shut only while nav.mjs BUILT lacks sitting; listed since S3)".
  - **`bottomLine.portrait.shut.when`.** "(until slot 9)" becomes "(unreached since S3: nav.mjs BUILT lists sitting)".
- **F5, the same file, two `when` texts made exact (ruling 3).**
  - **`bottomLine.portrait.portrayed.when`.** It becomes "portrayed, its 528×392 opening kept (sitting-props portraitOffered: portrait-source.mjs portraitOpening) and the mibi not away; else action null".
  - **`regions.stamp.portrayed.when`.** It becomes "m.portrait.state is delivered (portrayed)". The build already does this, and habitat-portrait-painting has no corner.
- **F6, `face/src/vocab/station/stamp.c` (ruling 4).**
  - **The header.** "the corner its own ("stamp.portrayed", painted)" becomes "the corner its own region ("stamp.portrayed"), on its picture's layer (spread-gilt-corner-16x16 is ART)".
  - **The code.** The corner's call becomes `v_region("stamp.portrayed", LAYER_ART)`.
  - Golden-neutral: a sprite takes its asset's layer (prim.c:372), and the corner is the region's only node.
- **F7, `face/tools/portrait-fixture.mjs` comment (ruling 1).** "the red outside the crop (x 4..524, y 1..391) must never show" becomes "must never show in the 40×30 picture; the Sitting's 1:1 portrait (sitting-portrait) shows the whole source, its red margin with it".

**The round's proof:**
- node --test with 0 failures;
- goldens --check habitat and sitting unchanged;
- layer-check with LAYER_ONLY=habitat,sitting ok;
- journeys ok, with the pending list showing only sitting-door-owed;
- face guard, ratchet and public guard green.

The round is one commit by Paco Cotera <paco@cotera.org>, with no trailers.

## Rulings

1. **The portrait fixture's red margin in sitting-portrait: accept it; do not change the fixture.**
   - The margin is the fixture's 4 px left and right strips and its 1 px top and bottom strips, outside the 520×390 crop.
   - It shows because the Sitting's portrait is the whole 528×392 source shown 1:1. Seeing it proves the gilt's opening hides nothing.
   - A real portrait has no margin.
   - Changing the fixture would retake habitat-portrait-pictured and weaken the 40×30 crop proof. Only the comment changes (F7).
2. **sitting-place-night equals sitting-place (bf533807): keep both.**
   - The two equal hashes are the proof of the light rule: the place step is day light and the resident is ungraded.
   - goldens --check pins the equality, so any grading of the place step by the hour fails it.
   - The night setting does take effect: the same mechanism draws habitat-docked-night, and sitting-host.test asserts the night pose glass and resident.
3. **✓ Look built on portraitOpening: the build is right, and habitat.json's "picture is not empty" was loose (F5).**
   - Habitat's 40×30 id is non-empty for any portrayed mibi with a digest, even when the 528×392 opening has been evicted (OPENINGS_KEPT 2) or lost on a reload.
   - The Sitting's state portrait is offered only while the opening is kept, and sittingBuild returns null without it. The ticket line names portraitOpening.
   - The optional fifth argument (sitting.json) is accepted, with F1's last term so that leaving it out disables the target.
4. **The corner's layer is ART.**
   - spread-gilt-corner-16x16 is in the ART family, and a picture shows on its asset's layer.
   - The node records show the corner as layer 1 (LAYER_ART) at 976,64 16×16.
   - The kit header's "painted" (from the K-S gate) was the region's label and is superseded. Header and code are fixed in F6.
5. **The stale entries: fixed in this round as F2, F3 and F4.**
   - All three are golden-neutral.
   - The X21 journey step stays pending on the openSittingDoor wiring. It is not an S3 line, and moments are still dev-only, as sittings-rule-gd.md records.

**Note.** The ticket line "habitat-props sends regions.card.stamp.corner and the ✓ lookPortrait action only while portraitOpening holds" applies "only while portraitOpening holds" to the action. The corner follows spec §1/§4: portrayed, picture or not. That is why habitat-portrait-portrayed has the corner and no cap. The build matches the spec.

## Checked

**The diff, file by file.**
- nav.mjs: BUILT entry 9.
- habitat.json, against sitting-spec §1:
  - stamp.portrayed is identical to sitting.json's object except `when`/`inStates`, as specified;
  - drawOrder, bottomLine.portrait.portrayed and backFromPortrait match.
- habitat-props: the corner and the look action.
- habitat.c: the corner passed to kit_stamp at the `at` offset.
- habitat.props.json takes `corner`.
- sitting-props:
  - portraitOut on confirm during a Lift, with no lit gilt and no arm;
  - the place step requests every place backdrop.
- main.mjs: sitHeld drops the backdrops on leaving the screen. The pictures re-load through `handleOf` on every sync.
- frameTable: test-only, and the scene's props are put back.
- layer-check sitting block, goldens.mjs set, sitting-states.mjs.
- The journey's sitting walk, which puts the world back.
- make-stand-layers.py: the curl's key and crested key are checked by file or by id.
- asset-policy:
  - the three families, with a test each;
  - the comment names the art director's confirmation.

**The art.**
- The five backdrops are byte-identical to masters-pods 65db5dae slices, and their sha256 equal the slices manifest.
- Only the 12 curl base pictures and their 12 index hashes change. Anchor, shake and calm are untouched.
- The art comes in the first two commits.
- All 7 commits are by Paco Cotera <paco@cotera.org>, with no trailers.

**The node records** (the builder's before and final tables, compared by me):
- **habitat-portrait-portrayed:** exactly one node added, the corner (layer art, 976,64 16×16). The rest of its +104/−103 is the region index shifting by one at the new stamp.portrayed region. The builder's reading is confirmed.
- **habitat-portrait-pictured:** the corner, the ✓ cap and the "Look at the portrait" text (+106/−103).
- **habitat-portrait:** the ✓ cap, the "Portray Dot" text and the context line moved (+5/−3, region shift only from the bottom line).
- **Order-only:** exactly 9 Pods and 14 Habitat states.
- **New:** the 12 sitting states.

**The builder's logs:**
- goldens: every set matches, and the 12 sitting hashes are listed;
- layer-check: objects 67–76, own 39–48, pictures ≤ 121 (place-five 112), owed none, off-palette 0;
- the face build and face_test: 14672 checks, 0 failed;
- journeys ok. The CPU-throttled line is the long-standing informational one;
- checks.mjs is identical before and after once the placeholder count is stripped.

**The 1x shots I looked at:** sitting-portrait, habitat-portrait-pictured, sitting-place-five, sitting-confirm-armed. They read as specified: the corner, the ✓ cap, five cards with the ring on card.4, the lit gilt and "Again: portray Dot".

**Tests I ran** in a private detached worktree of ca2025cf: node --test on habitat-props, sitting-props, sitting-host and pose-request: 60 pass, 0 fail.

**The merge.**
- origin/station-gate is still 40b75724, the branch's base, so the merge is a fast-forward.
- `git merge-tree --write-tree origin/station-gate origin/build/sitting-open` is clean. The tree is a7c67e9c, equal to ca2025cf's tree.

## For the art director at 1x (sign)

**The 12 new goldens** (prototypes/face/golden/sitting/):
- sitting-pose
- sitting-pose-curl
- sitting-pose-one
- sitting-pose-juvenile
- sitting-place
- sitting-place-night
- sitting-place-five
- sitting-confirm
- sitting-confirm-armed
- sitting-begin-150ms
- sitting-portrait
- sitting-portrait-long-name

**The 3 retaken goldens** (habitat/):
- habitat-portrait
- habitat-portrait-portrayed
- habitat-portrait-pictured

**Notes for the signature:**
- sitting-place-night is byte-identical to sitting-place, by the light rule.
- The red margin in sitting-portrait is the test card's, not art.
- The curl is the re-signed key with its painted shadow out (AD 08:27).
- sitting-pose-juvenile is judged against the 0.5822 juvenile window proof (the S2 carry).

The PNGs are in scratchpad/so/shots/.

## Cleanup

- The private worktree is removed and pruned, and arch-s3/ is deleted.
- /home/user/miniaturebeasts is unchanged except for one dangling merge-tree tree object.
- No /tmp/bake-* exists.
