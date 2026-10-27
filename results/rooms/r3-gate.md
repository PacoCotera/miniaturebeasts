# R3 gate (architect, Tue 27 Oct 2026 17:55 Mexico City), 4b211d61

## Verdict

**Not yet. Merge once the four fix lines below land.** The placement, `rooms.json`, its guards, the face's room module, back pieces, keep-outs and the bed only in Roots all conform to arch-rooms.md §1–§3 and §6. Three things are wrong:

- The occluder tie is off by one row.
- The two mist pieces are not drawn.
- The owner's card vivarium-L5-6 was closed by a 2 px art drift, not by a fix.

Hash coverage needs one guard line. After the fixes, the builder re-runs `goldens.mjs --check` on each screen and lists any further changes.

**The art director signs at 1x, per room and light:**
- the 90 changed and 4 new R3 goldens (`vivarium-room-reeds`, `-boulders`, `-ferns`, `idle-room-boulders-night`);
- the retakes from fix 2 (every Idle and whole golden showing Roots' `roots-mist-2`, and `vivarium-room-ferns` for `ferns-mist-4`);
- `incubator-hatch-skip`, which changed because its dither shows the near view.

## Fix lines

1. **The occluder tie, off by one row** (`prototypes/face/src/screens/home.c:547` and `:548`).
   - **Measured:** walkers sort by the figure box's bottom edge, `box[1] + box[3]`, which is the feet row + 1 (home.c:398, :422; the ring reads feet = bottom − 1 at :579). An occluder's `foot` is its last ink row.
   - **The fault:** on a true tie (feet = foot) the occluder sorts *behind* the walker. With the probe walker's feet at window row 328 and the occluder's foot at 328, the piece drew first. Spec §3 puts the occluder in front on a tie.
   - **The fix:** in both key expressions, use `oc[…].foot + 1` for kind 3.
   - **The test** (`prototypes/face/tests/vivarium.test.mjs:382`): use `const feet = me[0][5] + me[0][7] - 1`, so the tie at :386 is a real tie. Keep the three expectations as they are.
2. **The two mists, drawn with their opacity** (this ticket, not a follow-up). The ticket's step 7 asks for them, and the art director should sign each golden once.
   - **`prim/prim.h`:** add `void prim_sprite_opa(int opa);`. It sets the opacity of the next FN_SPRITE node only (0–255), then resets to 255, the way `prim_text_role` holds for the next text node only.
   - **`prim/prim.c`:**
     - `node_t` gains `int opa`, 255 when a node is made.
     - In `prim_node`, for FN_SPRITE, take the pending value and reset it. When the node is fresh or `n->opa` differs, call `lv_obj_set_style_image_opa(o, (lv_opa_t)opa, 0)` and store it.
     - The test build gains `prim_node_opa(id)` beside `prim_node_box`. The node log format does not change.
   - **`home.c:534`:** drop `(p->kind == RP_OCCLUDER || p->opa >= 255) &&` from `piece_drawn`.
   - **`home.c:568`:** call `prim_sprite_opa(bk[k].opa);` before each back piece's `v_slot`.
   - **Tests:**
     - vivarium.test.mjs:391 asserts that `p.roots-mist-2` is drawn with opacity 153.
     - :415's `want` drops `|| !p.opa`.
   - **Cost:** two small blended sprites (80×18 and 150×24), inside package.md §1.4.
3. **Restore owner card vivarium-L5-6** (`prototypes/ui/tests/layout-cases.json:742`, `layout-cases.test.mjs:37–41`).
   - **Measured on the fixture logs:**
     - before R3, the bed's ink centre (y) was 444 against the name tag's 438 (6 px, fires);
     - after R3, the new Roots bed's ink box is [806, 424, 164, 44], so its centre is 446 against 438 (8 px).
   - **Why it is not fixed:** the bed's node box is unchanged at [792, 416, 192, 56]. At 1x the bed and Bean's tag still sit almost on one line. The art moved 2 px past nearCentres [1, 6]; the fault in kind remains.
   - **The card:** remove `"fixed"`, and move the L5b bed / nameTag entry from `clear` to `pending`, with the why "the owner's fault in kind, 8 px after the Roots bed, outside nearCentres [1, 6]; the owner re-marks the retaken vivarium-away at 1x".
   - **The test:** :37 accepts `c.expect.length || c.fixed || c.pending.length`. :38 goes back to `["vivarium-L11-1"]`, "exactly one fault is fixed (by Q1)". :41 keeps the card out of its list, as the build has it.
   - **Owed to UI/UX:** whether the L5 near-miss window should reach 8 px (the thresholds are UI/UX's).
4. **The hash guard line** (`prototypes/ui/tools/place-masters.mjs`).
   - **Today:**
     - The manifest's only hashes are of `signed-idle-<room>-day.png` (:71–72), a file that is never placed. The placed base is `seated-idle-<room>-<light>.png`.
     - The index `sha256` plus `--check` guards each placed copy in CI.
     - The source is tied to the copy only by `source.commit`.
   - **The fix:**
     - (a) Each rooms index entry also gets `from: "<pods-relative path>@<commit>"` (:115), so any placed file can be re-verified against masters-pods.
     - (b) `placeRooms` honours an optional manifest `hashes: { "<pods-relative path>": "<sha256>" }` and refuses any copied file listed there with another hash (in `add`, :62).
     - Keep :71–72; they pin the signed scene.
   - **Owed to the art director:** filling `hashes` for every seated, near and piece file.

## Rulings

1. **Conformance.** The build is merge-ready against the ticket apart from fix lines 1 and 2.
   - **Window offsets.** room.c derives them from spec values: the whole is (0, −80), Home is (−40, −116), Idle is (0, 0).
   - **Draw order.** The back pieces come before every sorted item. The occluders are kind 3 in the one sort, with stable nodes `p.<id>`.
   - **Keep-outs.** A piece's keep-out is tested on the ground point (F.x, feet). A null-picture occluder keeps its keep-out and gets no node.
   - **The bed.** Its keep-out, `regions.bed` and `lightIds`' bed apply in Roots only.
   - **The face's re-checks.** `room_load` re-checks guards 1–3 and 6 through `screens_vet_spec`.
   - **`rooms.json`.** Guards 1–7 pass with 0 problems on 1,162 index entries. The art director's rules print as `note` lines only.
2. **The owner's L4-22 re-key:** accepted. It is the same pair: the group box [305, 375, 151, 68] against the mibi at [378, 415, 49, 55], which now sits inside the merged box [378, 314, 147, 117]. The overlap grew from 28 to 56 rows because R3's keep-outs moved one walker (id 252484282, y 321 → 282). The owner's mark is general ("mibis can overlap if one is behind the other"), so it still covers the pair.
3. **The other owner-card edits:** accepted.
   - The retaken layout-case fixtures all match their goldens (ui tests 246/246).
   - The props schemas gain `regions.room`, and `bed` becomes optional ("given only when the room has a bed").
4. **The day-light signature fallback:** accepted. The manifest has no `lights.day.signed`, so day reads the room's `signed` (the day scene) and `near_day.signed`. The other lights' texts say "idle and near".
   - The pieces and seated bases carry their light's scene text. The art director's 1x signature on the R3 goldens is what signs them in place.
5. **`ferns-mist-1` and `ferns-mist-3`:** the art director's. The tool's handling is accepted: both are left out and named.
   - `ferns-mist-1`: the file is 104×26 against the manifest's 96×24. Either re-cut it to 96×24 or correct the rect.
   - `ferns-mist-3`: there is no file in `pieces/ferns/`. Cut it, or drop it from the manifest.
6. **20 MB of masters in the public repo:** acceptable under the existing practice. Placed masters live in the repo with their index (pods are 22.4 MB already); masters grow from 32.0 MB to 52.2 MB. The licence covers separately distributed artwork.
   - **Departure from spec §6:** `station/src/masters.mjs:10–25` fetches (no-store) and decodes *every* index entry at boot. Every boot of the sandbox page now downloads all 16 room lights (about 20 MB more), not only the shown room's.
   - **Follow-up, mine to spec, not blocking R3:** fetch `rooms/` entries when `lightIds` first names them. Land it before the next phone test play (owner 2026-10-26: phone layouts first).
7. **The setup failure:** the container restart broke the first test-page journey run, not R3. That log was killed at about 17:30 (exit 137), at journey.mjs:243 → :42, "Target page, context or browser has been closed". The rerun on the same build passed.

## Checked

- **Read:**
  - the ticket and spec §1–§3, §6 and §7;
  - the diff 5056b4ae..4b211d61: room.c/h, home.c, screens.c, place-masters.mjs, room-props.mjs, host.mjs, main.mjs, the props schemas, layout-cases and the vivarium tests;
  - the rooms manifest and pieces at masters-pods 66d1bad5.
- **Built:** `build.sh all` once (wasm and native; face_test 20,895 checks, 0 failed; layout 732 cases, 0 differ).
- **The checks not run before:**
  - `smoke.mjs` on a site assembled as site.yml does it: all six pages ok;
  - the test-page journey: ok (9 m 38 s).
- **Re-run as samples:**
  - `place-masters --check`: 0 problems, with the art director's notes;
  - `place-masters --rooms --dry` against masters-pods 66d1bad5: 108 pictures; it names `reeds-sedge-1` and `boulders-stone-1` (no picture), `ferns-mist-1` (size) and `ferns-mist-3` (missing);
  - ui tests: 246/246;
  - vivarium face tests: 60/60;
  - `goldens.mjs --check vivarium`: match.
- **Probes:**
  - an occluder-foot sweep of ±3 rows on the R3 order test (fix 1);
  - the L4 and L5 findings recomputed with the exceptions removed, on the fixture logs before and after (fix 3, ruling 2);
  - `incubator-hatch-skip`, before and after, at 1x.
- **Not checked:**
  - `?dev → Room shown` in a browser on every screen (the four-rooms face test covers the whole);
  - the art itself (the art director's).

## Cleanup

- My private detached worktree of origin/build/rooms-r3, its build folder, the assembled site and every log, image and probe are removed. The worktree list is pruned, and the server stopped with the container restart.
- Nothing was committed or pushed, and no other worktree was touched.
- The one file left, uncommitted, is this report.
