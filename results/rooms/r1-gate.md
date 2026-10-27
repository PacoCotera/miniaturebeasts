# R1 gate (architect, Tue 27 Oct 2026 13:52 Mexico City), d4ea903a

## Verdict

**Not yet. Merge once the fix lines below land.** The rules and the save are right. I sampled rooms, prices, the young return, shed kinship and adultTurns, and the 3 → 4 migration holds on every save I built. Nothing is lost and nothing collides.

CI's node list is not green, and it fails in more places than the lead's brief says:
- `face/tests/vivarium.test.mjs`: 9 failures
- `face/tests/habitat.test.mjs`: 1 failure
- `face/tests/idle.test.mjs`: 8 failures, not in the builder's record (0 at 0edcb8b8)
- `face/tests/metrics.test.mjs`: 1 failure, the vectors are stale
- `ui/tests/layout-cases.test.mjs`: 5 failures, owner cards pinned to the old golden hashes

The fix is one patch, `r1-gate-fix.patch`, in the same folder as this report. I proved it in a private worktree. It applies cleanly on d4ea903a, and with it every check below is green. The builder applies it, reruns checks 1–11 and the CI list, commits, and lists the golden differences in the PR.

## Fix lines

All paths are relative to the repository. The line numbers are at d4ea903a.

1. **`prototypes/face/tests/moving-scene.mjs`**
   - :38 and :52: `bays: 12` → `rooms: 1`. The old key is ignored now, so the household was cut to 8 without anyone seeing it.
   - :127: `openRules(spec, tickBudget = null)` sets `v.rules.tickBudget` when it is given.
   - :130–132: `rule2Run(screen, tickBudget = null)` with `adults: 8`.
2. **`prototypes/face/tests/vivarium.test.mjs`**
   - `scene()` :35: add `if (o.room != null) st.face.room = o.room;` after the seeding.
   - :65: becomes `"eight adults, a full room's eight tiles": { bays: 8, adults: 8 }`.
   - Test 11 (:82–88):
     - Cases `[bays, adults, room, thumbnails]`: `[8,5,0,5]`, `[8,8,0,8]`, `[16,12,0,8]`, `[16,12,1,4]`, `[8,1,0,1]`.
     - It asserts 8 items, `listPitch(R.tiles, 8, i)`, width 72, and the thumbnails of the shown room only.
     - This replaces the 152-wide check: that form can no longer be reached.
   - :129, :138, :344, :328, :335: `bays: 12, adults: 12` → `8, 8`.
   - :330: `k < 834` → `k < 1250`, and seeds `1 + k * 8 + i` (still at least 10,000 starts).
   - :337: seeds `90001 + k * 8 + i`.
   - :147 WALKS: every "twelve" becomes "eight" (`bays: 8, adults: 8`). "six and six" becomes `adults: 4, young: 4`. The crossing seeds become the first eight: `[64845, 5640, 43497, 5522, 42627, 49915, 953, 51488]`.
   - :184 `HOUSE = { adults: 4, juveniles: 3, s05: 1, sleepers: 3 }`, and the :186 title says "eight residents".
   - Test 42, rule 2 (:193–197):
     - It asserts `worstTick ≤ 148000` at the shipping budget.
     - Then `rule2Run("vivarium", 74000)` twice: `worstTick ≤ 74000`, `deferred > 0`, the same hash and the same deferred count.
     - Measured: 110,782 px with 0 deferred at 148,000, and 73,854 px with 470 deferred at 74,000. Four walkers in a group can no longer reach the old budget, so the check of the budget moves to a lowered one and is not dropped.
   - Test 43 (:203–207): `adults: 8`, `i < 8`, `length: 8`, groups `= 4`, and the title says "eight at 160 × 154".
   - Test 45 (:221): `assert.equal(sc.props.regions.residents.length, 8); for (let i = 0; i < 8; i++)`.
   - G10 (:271–272): `{ adults: 4, juveniles: 3, s05: 1 }`, `N = 8`, and the title says "eight awake".
3. **`prototypes/face/tests/idle.test.mjs`**
   - :24: `bays: 20` → `rooms: 1`.
   - :102 WALKS:
     - "eight adults" `{adults:8}`
     - "four adults and four juveniles" `{adults:4, young:4}`
     - "eight, three waiting" `{adults:8, waiting:3}`
     - "five adults, three asleep" `{adults:8, carry:[5,6,7]}`
     - "one adult and four juveniles, three asleep" `{adults:4, young:4, carry:[1,2,3]}`
     - "five, three waiting, three asleep" `{adults:8, waiting:3, carry:[5,6,7]}`
   - :141–143 rule 2 on Idle: the same two-budget form as in vivarium.test.mjs.
   - :173–178 asleep spots: `{ adults: 4, juveniles: 4 }`, `w = i < 4 ? 144 : 104`, and all three loops run to `8`.
4. **`prototypes/face/tests/habitat.test.mjs` :252–259 (F4)**
   - Cases `[bays, adults, shown, free]`: `[8,3,0,5]`, `[8,8,7,0]`, `[16,12,9,4]`.
   - It asserts 8 tiles, `plate-well-72x48`, exactly one shown tile, and the free count.
5. **`prototypes/station/src/views/habitat-props.mjs` :94:** `S.inRoom(st, shown.room ?? st.face?.room ?? 0)`.
   - The strip is the room of the mibi up close (spec §4: a mibi met shows its own room).
   - Without it, a hatch into another room while the shown room is full gives a strip with no shown tile. I wrote the ticket's "st.face.room" too loosely.
   - `prototypes/station/tests/habitat-props.test.mjs` :150: the `face.room = 1` check becomes two checks:
     - a mibi of the second room gets its room's four tiles, its own tile shown;
     - `face.room = 1` does not take the strip off a mibi of room 0.
6. **`prototypes/station/tests/state.test.mjs`, the migration test**
   - :727: read `bayBefore = new Map(st.mibis.map((m) => [m.id, m.bay]))` before migrating.
   - :730: `old = bayBefore.get(m.id)`. `migrate` writes in place, so the "bay order" assertion compared the rewritten bay with itself.
   - :735: add the gapped case: 12 v3 mibis, bays 2, 5 and 9 released, giving 2 rooms, 8/1/0/0, bay order kept, 12 mibis, `bays` 12.
7. **goalKey `noBay` → `full`**
   - `prototypes/station/src/state.mjs` :693.
   - `prototypes/ui/specs/station/frame.json` :82, the `strings.goal.step` key. The text "Free a bay in the Vivarium" stays until the copywriter rewords it in R6.
   - `prototypes/station/tests/economy-x10.test.mjs` :222 and :230.
8. **The spec notes**
   - `prototypes/ui/specs/station/vivarium.json` :154: `"count": "one tile a place (state.ROOM, 8): the mibis of the room shown (st.face.room) in slot order (state.inRoom), then the free places"`.
   - `prototypes/ui/specs/station/habitat.json` :315: the same, for "the room of the mibi up close".
9. **Metrics:** run `node prototypes/face/tools/make-metrics-vectors.mjs` after 7 and 8, and commit `prototypes/face/tests/vectors/metrics.json`. The new strings are "The Vivarium is full", "Add a room", "Make room" and the room names.
10. **Layout cases (UI/UX's corpus).** Take the logs with `goldens.mjs --check --logs <dir> incubator` and `… vivarium`, then refresh three fixtures:
    - `ui/tests/layout-cases/incubator/incubator-hatch-skip.json`
    - `…/vivarium/vivarium-twelve.json`
    - `…/vivarium/vivarium-walk-8000ms.json`

    `layout-check.mjs --refresh-cases` needs the logs of all ten screens, so either take them all or copy only these three. Then re-key the two owner cards. UI/UX confirms this (see Rulings):
    - `ui/tests/layout-cases.json` :732: vivarium-L3-15 expects `resident#3` / nameTag. It is the same 305, 43, 305 finding, and only the index moved.
    - :739, and `frame.json` :257, the owner's exception vivarium-L4-22: `resident#7`/`resident#8` → `resident#4`/`resident#5`. That is the pair that overlaps in the retaken walk (28 px). The owner's reason, that mibis overlap in depth, does not change.
11. **The PR lists the golden differences.**
    - `vivarium-twelve`, `vivarium-walk-8000ms`, `vivarium-moving-8000ms`, `habitat-twelve`, `idle-walk-8000ms`: 12 housed become 2 rooms, and the room shown holds 8.
    - `home-window-six-of-eight`: "6 at home" → "8 at home". Before, the 6-place cap cut the 8 seeded; the window is pixel-identical.
    - `incubator-hatch-skip`: the habitat strip goes from the 152 form to the 72 form, the strip only.
    - `journey-vivarium.json`: the juvenile can now be returned.
    - `vivarium-empty` and `vivarium-empty-away` did not change, correctly: an empty whole draws no strip.

## Rulings

1. **Merge-ready against the ticket: yes, for the rules.**
   - Rooms of 8, up to 4, cost 4, 8 and 12 under a tuned economy, and refuse with `all` and `short`.
   - moveBlock gives `own`, `full`, `noRoom` and `released`.
   - Hatch fills the shown room first.
   - A young mibi returns for +2 Essence and frees its place at once.
   - `due` is max(born + adultTurns, releasedAt) + 2, checked at adultTurns 2 and 5.
   - The shed kinship is max(1/8, own): 0.125 for a founder and 0.25 for a child of full siblings.
   - `seededRng` makes the same release always shed the same pod.
   - The cross.mjs change is one option and nothing else. The genome engineer reviews it, as the ticket says.
2. **Migration 3 → 4: accepted; nothing is lost.** I built schema-3 saves with the base Station's own code and migrated them with the branch's:
   - 0, 6 and 12 housed, contiguous
   - 12 seeded with bays 2, 5 and 9 returned
   - 7 housed at bays 0, 3, 4, 7, 9, 10, 11
   - 8 housed with gaps up to bay 11
   - bays undefined, -1 and duplicated
   - 12 in reversed bay order

   In every case: the ids are kept, the places are unique, the bay order is kept, every place is in range, released mibis hold null, the second migration changes nothing, and the base Station reads the result coherently (unique bays inside `st.bays`).

   Gaps close up, as spec §5 prescribes (index ⌊i/8⌋). A mibi keeps its order but can change its index: with bays 2, 5 and 9 freed, bays 3–11 shift down and the nine fill 8/1. The ticket's words "m.bay kept" mean the field is kept and rewritten as room·8 + slot, not the old number. I correct my ticket's wording, and the test fix is 6.
3. **The CI face tests:** fix lines 1–4. They rewrite the checks to rooms of 8, and every check removed has its replacement. Idle and metrics are added to the brief's list.
4. **`incubator-hatch-skip`: accepted.** It changes for the same reason as the listed `vivarium-empty` (6 places → 8, the compact form). The incubator's world had 6 bays; the habitat goldens already used 8. I compared it to the old golden at 1×: only the strip at y 499–544 differs. It goes in the PR list, and UI/UX reads it at 1×.
5. **needKey "full" with no Home words: accepted until R5.** Home's line uses `homeNeeds`, which has no "full" key, so Home still says "the bud is ready". Only the Cargo notice goes blank, and only while the Vivarium is full and something waits. R5 adds `home.json strings.needs.full` and removes the `?.` guards at `cargo-props.mjs:36` and `home-props.mjs:66`.
6. **The rest:**
   - goalKey `noBay`: fixed in 7. The ticket's "no word bay names a place in state.mjs" covers keys.
   - The spec notes naming `state.bayCount`: fixed in 8.
   - Views filtering by room: accepted for the Vivarium, Home and Idle (`st.face.room`), and the habitat follows the mibi (5).
   - The `m.bay` sorts still left at `home-props.mjs:169,176` and `intents/habitat.mjs:72` are coherent while `bay` mirrors room·8 + slot. They must move to room/slot order before schema 5 removes `m.bay` (owed to R5/R6).
   - `roomPrice` reads `st.rooms` while `roomCount` prefers the developer `settings.rooms`. This is developer-only and accepted.
   - The ticket's check 8 is `bash prototypes/face/build.sh`: the script uses `BASH_SOURCE`, `[[ ]]` and pipefail. The ticket's wording was my error, and the ticket text is corrected; no code changes.
7. **Not mine to decide:** the layout-case owner cards in fix line 10. UI/UX owns the layout corpus, and the owner signed the vivarium-L4-22 exception. I recommend re-keying the exception to the pair that overlaps in the retaken golden, keeping the owner's reason, since only the residents' indexes moved. If UI/UX holds that a re-key needs the owner, the question goes to the owner with this recommendation.

## Checked

- Read the ticket, spec §4, §5 and §7, the whole diff 0edcb8b8..d4ea903a, the CI node list, the moving-scene and idle harnesses, and the layout-case test.
- Ticket checks on d4ea903a, each its own command:
  - 1–7 green: state 55, framework 27, home-props 23, habitat-props 17, incubator-props 6, create-props 13, intents 46.
  - 8 green with bash: wasm and native build, face_test 20,267/0.
  - 9: vivarium, habitat, idle, home, incubator and create goldens all match.
  - 10: journey ok.
  - 11: guard ok.
- CI list on d4ea903a:
  - station 46 files, exploration 10, caddy, genome-stamp bins, test, play footer and framework: all green.
  - face/tests: vivarium 9 failures, habitat 1, idle 8, metrics 1; idle is 40/0 at 0edcb8b8.
  - ui/tests: layout-cases 5 failures.
- With the patch:
  - every face/tests and ui/tests file green (vivarium 56, idle 40, habitat 34, metrics 4, layout-cases 121);
  - station 46 files green;
  - the build again green (face_test 20,303/0);
  - the vivarium, habitat, home and incubator goldens match;
  - journey ok.
- The migration probe in Ruling 2.
- Pixel diffs of `incubator-hatch-skip` and `home-window-six-of-eight` against the old goldens.
- Rule 2's tick: 110,782 px at 148,000 with 0 deferred, and 73,854 px at 74,000 with 470 deferred, deterministic on Vivarium and on Idle.
- Not checked:
  - the art in the 1× PNGs (UI/UX's);
  - whether the eight kept "crossing" seeds still cross (green; the builder confirms with a printed count, or picks eight that do).

## Cleanup

- I built and tested in a private detached worktree of origin/build/rooms-r1. It is removed and pruned, together with my scratch build, image and log folders.
- Nothing was committed or pushed, and no existing worktree was touched.
- Two files are left, both uncommitted: this report and `r1-gate-fix.patch` in the same folder.
