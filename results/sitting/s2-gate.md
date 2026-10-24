# Sitting S2 gate (architect, 2026-10-24 09:52 Mexico City), b2432b21

T-20261024-301, branch build/sitting-screen, at b2432b21. The 7 commits are:
- 03a97133 (F1 of the S1 gate);
- a6f1f683 (kit_resident's figure);
- d56c82b2 (the masters placed);
- 069114e3 (the screen, host and keys);
- the merge 4f9c69f0 of station-gate 47d77256;
- 665362cb (F1 of the P1 gate);
- b2432b21 (a test made pose-agnostic).

This gate is also the review. I read the whole diff against 47d77256 (37 files), including sitting.c, intents/sitting.mjs, the host's way in, the kit_resident change, the specs and the 13 shots in `ss/shots/`.

## Verdict: PASS, merge after three small fixes

The three fixes are F1 to F3 below. All three are golden-neutral, because the door is still shut, so a fixup checked by diff is enough. Each needs only the checks it names. Every other ticket line holds.

- **F1 (the name tag; ruling 2).** In `sitting.json regions.nameTag`:
  - replace the top-level `"pad": 12, "round": 8, "min": 80, "max": 224` with `"plate": {"min": 80, "max": 224, "pad": 12, "round": 8}`;
  - add `"under": 24` and `"overGap": 8`.

  These are Habitat's values and Habitat's shape, which the kit has read since K5.1 and K6. Then:
  - specs.test asserts `R.nameTag.plate` deep-equal to Habitat's, and `R.nameTag.under === hab.regions.nameTag.under`;
  - face sitting.test asserts the tag's plate box in the pose state for "Dot": width 80 (Dot's 20 px name plus 24, rounded up to 8, at least 80), centred on 296, top 404;
  - regenerate metrics.json if it changes.
- **F2 (the pose dither; ruling 3).** Add `sitting.json events.pose`:
  ```json
  {"kind": "dither", "target": "resident", "ms": 180, "hold": 0, "levels": 16, "do": "the pose step: the resident's change to or from the curl cross-dithers (Habitat's 16 levels over 180 ms; the animator, an-sitting.md); a stand-to-stand change is a cut; a press, or the ring moving on, cuts a change still running to its end form; reduced motion cuts"}
  ```
  intents/sitting.mjs reads it, and `POSE_DITHER` goes. Then the sitting host test reads the spec's values.
- **F3 (a comment).** In host.mjs `screenProps`, the comment "the founder the roll's dither starts from stays on the face until the event ends" was moved onto the new sitting line. Put it back on the `UI.create.prev` line, and leave the sitting line with its own comment only.

## What I ran

All of it was in a scratch worktree, `arch-s2/wt`, with private FACE_BUILD_DIRs (one per side), TMPDIR and STATION_CHECKS, each command under 10 minutes. All of it is removed now.

**At b2432b21:**
- `build.sh all`: layout 732 cases, 0 differ; face_test 14588 checks, 0 failed (14572 at base, so +16); native hash 47e09df8.
- `goldens --check`: all 10 sets match.
- `node --test`:
  - station and ui 711/711;
  - face 621/621 (in 459 s), which includes the new sitting.test.mjs (states, motion forms by pixels) and the guard test.
- Ratchet: sitting.c has **0** direct primitives and 0 `prim_node`, measured with `blank.mjs`. Habitat is still 8.
- Face guard ok; public guard ok.
- `make-metrics-vectors --check`: current, 11649 cases.
- `place-masters --check`: 1049 placed, 0 problems.
- The 7 placed masters (place-{meadow,pond,rock,wood,cave}-96x96, sitting-gilt-560x424, sitting-gilt-lit-560x424) are blob-identical to masters-pods 615f7c91's slices. Each is signed "art director, sitting verdict (a079009f)".
- Station journey ok; checks.mjs ok; layer-check ok.
- Play journey ok (406 s).

**At 47d77256** (face rebuilt): `build.sh all` with face_test 14572 checks, 0 failed, and native hash 47e09df8; then the journey, checks.mjs and layer-check.

**Comparisons between the two sides:**
- layer-check: byte-identical.
- checks.mjs: identical once the placeholder count is stripped.
- Type log: 44 shots, 0 differ.
- Snapshots: 44, 0 differ.
- Regions differ only in pods-identifying, the known real-clock timing shot.

**Not run by me:** the node-record capture (I take the builder's 182 states, 0 differ) and the props records. The only existing props builder the diff touches is none: sitting-props changes only its test.

**Commits:** all Paco Cotera <paco@cotera.org>, with no trailers.

**Merge.**
- station-gate has moved to b9275cf8 (Library 3).
- `git merge-tree --write-tree b2432b21 b9275cf8` is clean: tree 21775a45.
- Both sides touch metrics.json. On the merged tree:
  - metrics `--check`: current, 11724 cases;
  - face guard: ok;
  - station and ui `node --test`: 734/734.
- Library 3 touches no face source, so the face figures above hold.

## Review

**sitting.c.**
- It is a binding table:
  - kit_stage;
  - word_livingWindow, with the glass dither only between pictures of the glass's own size (the K-S line);
  - kit_resident, placed by its figure on the spec's axis and feet;
  - kit_nameTag;
  - v_slot for the portrait, gilt, deck, strip, wells, thumbs and frame;
  - kit_tiles for the cards, the chosen pair and the steps;
  - kit_stamp with the corner;
  - v_line_at;
  - word_focusRing on the focused card, from the same kit_tiles boxes as the focus table.
- Its keys go through `screens_key_graph`.
- No spec accessor, no `prim_node`, no direct primitive.

**kit_resident's figure.** With a figure and the picture sent, the box is the picture's own size at (axis − dx − ⌊W/2⌋, feet − dy − H + 1). NULL keeps Habitat byte-identical (the goldens match), and face_test covers the anchor and the curl.

**The host and intents.**
- `enterSitting` refuses the visit when `sittingBuild` returns null.
- `screenProps` falls back to Habitat when there is no visit.
- A room key and `goScreen` drop `UI.sit`, and `DROPS_ON_ROOM_KEY` gains sitting.
- Confirm arms only with both choices made and no `beginBlock`.
- Begin holds `events.begin`, then calls `beginSitting` and goes to Habitat with the plate and the ring on Portrait. Reduced motion does all of that on the key's frame.
- Both resident-change forms are built, and the spec's `events.backdrop.resident` is "dither", per the animator.
- Habitat's ✓ on Portrait opens the pose step, or the portrait, only behind `doorOpen("sitting")`, which is still shut.

**The shots.**
- The layout reads as specified: the pose cards with the ring lifted, the curl on its feet, the confirm pair, the lit gilt, the portrait with the stamp's corner, and the steps' thumbs including the 48 × 40 frame.
- Two things show:
  - the name tag as a sliver (F1);
  - the glass flat green on the place and confirm steps, because the backdrops are not placed (S3).
- For the art director, not blocking: the curl in the window shows a dark ground shadow under it. P1's index gives the curl no "under" layer for any view, so the shadow is painted in the signed curl key. UI/UX C2 asked for "no shadow on Habitat". The art director should say whether the key's own shadow stays; that is art, not code.

**Not blocking:** intents/sitting.mjs keeps a local `fill`, as bench, habitat, namer and panel already do. One later sweep should move all five intents to `views/words.mjs fill`. The kit rule 5 names props builders; intents are not props builders, so this is no fix line here.

## Rulings

**(1) No asset-policy family for the Sitting's new pictures. The line goes in S3's first commit, and the art director confirms the families before S3 merges.**
- In the real page `picture()` throws on an id outside every family. Only a Sitting scene asks for these ids, and its door is shut, so no golden, journey or player can reach them in S2.
- I measured the masters against the 68-colour palette:
  - both gilts are palette-exact: 30464 px, 0 off-palette, no partial alpha;
  - the place cards are painted: every pixel off-palette;
  - the backdrops are painted repaints.
- **S3 line:** `ui/asset-policy.mjs: ART gains /^sitting-gilt(-lit)?-560x424(:\d+x\d+)?$/ (palette-exact, as the layer check proves on the confirm and portrait states); PAINTED gains /^place-(meadow|pond|rock|wood|cave)-(96x96|48x48)(:\d+x\d+)?$/ and /^sitting-backdrop-(meadow|pond|rock|wood|cave)-544x408(:\d+x\d+)?$/; a layers.test case per family; the comment names the art director's confirmation.`
- **Yes, the art director confirms**, as for the Library families and T-255. The file's own rule is "a new family is the art director's to place". The proposed split, gilt as art, is the stricter layer, and the layer check would catch a wrong call. The art director only has to say yes in one line.

**(2) The name tag is the 2 px sliver: a builder fix now (F1), not a UI/UX design question.**
- The values are unchanged. Only the key shape is wrong: sitting.json kept the pre-K5.1 flat keys, while the kit reads `regions.nameTag.plate.*` and `under`/`overGap`, as habitat.json has them.
- Conforming a spec block to the kit's contract with the same numbers is the architect's call. UI/UX is told in one line ("sitting.json nameTag now has Habitat's plate shape; no value changed").

**(3) The 180 ms pose dither: move it into sitting.json (F2).** A motion number is the animator's, and it lives in the screen spec beside `events.backdrop` and `events.begin`, as Habitat's `events.swap` does. A constant in intents would let the spec and the build disagree unnoticed.

**(4) The smaller points:**
- **kit_resident's node names** (`resident.pic`, `resident.dither`, `resident.out`): accepted. They are the kit's fixed names since K-S and the same as Habitat's. ARCH-2's list now reads that way; no change.
- **Begin's `gilt.dither`:** accepted. It is the lit gilt dithering out (events.begin steps[0]) with the gilt's slot kept before it. ARCH-2's node list gains `gilt.dither`.
- **`UI.sit.prev.cut`:** accepted. It is the host's memory for the "cut" form of `events.backdrop.resident`. Both forms stay built, as the ticket asked, even though the spec now says "dither".
- **No `portraitOut` for a Lift mid-ceremony:** a gap, and it lands in **S3**, because it changes the confirm state's line on screen. **S3 line:** `sitting-props: in state confirm, when beginBlock(st, mb, pose, place, sv) is "sits when you dock", the line is { ok: null, subject: habitat.json strings.portraitOut, back: strings.steps.place } and the gilt does not light; ✓ does nothing (as now); a sitting-props test and a host test (a Lift between place and confirm keeps both choices; the Dock restores ✓ Portray).`
- **`regions.glass.load` not built:** it lands in **S3**, with the backdrops. **S3 line:** `sitting-props: on the place step the requests hold the backdrop of every place card (offer's places, ≤ 5), not only the focused one, so a ring move never waits on a load; the host drops them with the screen; layer-check records the pictures figure on sitting-place-five, and if it is over the face's picture budget the spec's load line goes back to UI/UX.`
- **← behind the shut door goes notBuilt's way:** correct while the door is shut. With `BUILT` gaining sitting in S3, ← follows `keys.back`. **S3 line:** `the sitting journey (journey-sitting.json) walks ← from every step: place→pose, confirm→place, pose→Habitat (ring on Portrait), portrait→Habitat (ring on Portrait).`

## S3 carries (in addition to its own lines)

- The asset-policy families, with the art director's one-line confirmation (ruling 1).
- `portraitOut` on the confirm state during a Lift (ruling 4).
- `regions.glass.load`: every place backdrop requested on the place step (ruling 4).
- The journey's ← walk (ruling 4).
- From the P1 gate: the art director's 0 MXN rebuild of the juvenile window proof at 0.5822, before `sitting-pose-juvenile` is taken.
- For the art director (not code): whether the curl key's painted ground shadow stays.

## Cleanup

- The scratch worktree is removed and pruned, and `arch-s2/` is deleted (both build directories, TMPDIR, records, logs, and the merged-tree checkout).
- /home/user/miniaturebeasts is unchanged. The only extra is one dangling `commit-tree` commit from the merge check, which nothing references.
- No /tmp/bake-* exists. Free space on / is 13 GB.
