# R4 gate (architect, Tue 27 Oct 2026 20:26 Mexico City), 247abb94

## Verdict
Not ready to merge yet. Three fix lines remain (F1 to F3). The walk itself conforms: I found no walk fault. F1 turns CI green. F2 and F3 are small.

## Fix lines
**F1. Freeze the three moving-resident fixtures (CI red, 3 tests).** None of the failures is a fault in the walk. They are fixture positions that moved under the cards (Ruling 2).
- Make `prototypes/ui/tests/layout-cases/vivarium/frozen/` and put three files in it, byte for byte from `git show 961525c3:prototypes/ui/tests/layout-cases/vivarium/<f>.json`:
  - `vivarium-docked.json` (hash 4cf367cb)
  - `vivarium-twelve.json` (hash bb53921f)
  - `vivarium-walk-8000ms.json` (hash c6628872)
- `prototypes/ui/tests/layout-cases.json`: add a top-level key beside `cases`, and leave every case unchanged (each `why` and the owner's words are kept):
  `"frozen": {"vivarium/vivarium-docked": {"from": "961525c3", "hash": "4cf367cb", "why": "the owner's and UI/UX's marks were made on these residents' places; the walk on levels (R4) moved the starts"}, "vivarium/vivarium-twelve": {"from": "961525c3", "hash": "bb53921f", "why": "…same…"}, "vivarium/vivarium-walk-8000ms": {"from": "961525c3", "hash": "c6628872", "why": "…same…"}}`
- `prototypes/ui/tests/layout-cases.test.mjs`:
  - Add one helper, `fixtureOf(state)`. For a state in `frozen` it returns `layout-cases/<screen>/frozen/<slug>.json`. For any other state it returns today's path.
  - Use it at :19 and at :50.
  - At :22, a frozen state asserts `rec.hash === frozen[state].hash`. Every other state keeps the golden's hash check as it is.
- `prototypes/face/tools/layout-check.mjs:95–99` (`--refresh-cases`): skip the states named in `frozen`, and print that they were skipped.
- Measured with today's checker on the 961525c3 logs: all 7 cases on the three states pass (18, L10-1, L2-1, L3-1, L3-15, L4-22, L8-1).
  - L4-22's exception works both ways: the finding is made without its exception and not made with it.
  - On the live logs, 18 and L3-15 fail, and so do the L4-22 and L8-1 exceptions. L8-1 is a fourth failure: test 121 stops at L4-22, so it does not show yet.

**F2. Make the spec text say what the walk does.** File: `prototypes/ui/specs/station/vivarium.json`.
- `:78` `regions.resident.walk.start` becomes: "one draw r: the level (1 start in rules.walk.levelOneIn on a raised level while the raised cap allows), then room_point on it (⌈w/4⌉ inside each end), up to 8 draws, off keepOut; fallback main's leftmost point at its top".
- `:78` `waypoint` becomes: "one draw for the level (1 trip in levelOneIn changes level through a join, cap allowing), then room_point on the target level; rejected if max(|dx|,|dy|) < 32 or the path leaves the level or meets a keep-out; a change of level is the three legs of arch-rooms §2.2; after 8 rejections, idle again".
- `:30` `rules.travel.note`: after "one that has rested ≥ minRest ticks starts", add ", and never above the ceiling". This is what `home.c:397` does.

**F3. Ticket proof 2 for every room.** Proof 2 says "in every room". Today's tests prove it only for Roots.
- Add one case to `prototypes/face/tests/vivarium.test.mjs`, after :378.
  - Give `levelRun` (:355) a `room` argument, passed to `scene({ …, bays: 32, room, move: true })`.
  - Take ENDS (:363) from `ROOMS[room].joins[0]`.
  - For reeds, boulders and ferns, run the FAST spec for 300 s.
- Assert three things:
  - every point is on its level, on its join during leg 2, or (on legs 1 and 3) on the level with w = 0;
  - every change of level happens at that room's join ends;
  - there is at least 1 climb and 1 descent, and the raised count stays ≤ max(1, ⌊8/3⌋).
- I measured it with a probe (3 blocks of 300 s):

  | Room | Climbs / descents | Off-level points | Changes away from an end | Most raised |
  |---|---|---|---|---|
  | Reeds | 50 / 51 | 0 of 180,000 | 0 | 2 |
  | Boulders | 55 / 56 | 0 | 0 | 2 |
  | Ferns | 60 / 61 | 0 | 0 | 2 |

## Rulings
1. **The walk conforms to the ticket, the lead's addition and the game designer's answers.** Two departures, both accepted. I record both in arch-rooms.md §2.1 and §2.2.
   - **Levels and joins.** room.c's `room_on`, `room_point`, `room_point_in`, `room_route` and `room_join_hop` match §2. Each room's keep-outs are per level, and Home is main only (`room_levels` gives 1).
   - **Raised cap.** It is max(1, ⌊N/raisedDiv⌋), N the residents in the props (`home.c:94`). The census counts a walker from the moment it commits to a climb (`lv>0 || tlv>0`, `home.c:160`). §2.1 says the count starts with leg 2, so this is stricter. Accepted: two walkers cannot both climb past the cap on one tick.
   - **Travelling ceiling.** `rules.travel.max: 2` (the game designer's 2, not the ticket's 3). It applies to:
     - G10's start cap (`home.c:391`);
     - the floor (`:397`);
     - the stills (`:119`).

     The stills count toward the sets' total, and the sets count toward the stills'.
   - **Speeds.** They are data: `rules.walk.speed` is juvenile [2,1], adult [1,1], elder [1,2] in px per own ticks. The stills and the walking sets both read it (`:301`).
   - **Determinism.** The stills step in the order of their tick times (`stills_step`), and every draw comes from the walker's own LCG. Proved by test 56, and by test 57 for the sets.
   - **Placer.** `alpha_in_file` drops `opa` (place-masters.mjs, covered by a test). ferns-mist-1 is at its cut's rect, and the rooms are re-placed from b7bc7c9e.
2. **The 3 failing layout-cases tests: the fixtures moved; none is a new fault.** R4 changes every start by design. The level draw comes first and `room_point` replaces the band draw (ticket, Goldens: "the start points and walks move").
   - **The cards were made on places that are now gone.** I measured findings on the 961525c3 and 247abb94 logs with today's checker:
     - **vivarium-docked.** The UI/UX totem (L4 resident/resident#2 1, resident#2/resident#4 9) is gone, so case 18 fails.
     - **vivarium-twelve.** L3b resident#3/nameTag 305 → 43 is now resident#3/resident#5 420 → 41.
     - **walk-8000ms.** L4 resident/resident#4 56 is gone.
   - **The brief's two "reappearing" findings were never cleared.**
     - bed.sleepers/focus ring 10 is the same on both logs: the bed, its sleepers and the ring on a sleeper did not move.
     - resident#3/resident#5 12 is a new overlap of two walkers at different feet rows. The owner's L4-22 rules that kind of overlap fine.
   - **Why freezing, and not pinning seeds.** Pinning residents by seed ids in vivarium-states.mjs cannot rebuild the reviewed places under the new draw. It would also break again with the movement workstream (P1–P4) and the shown cap. A card is the owner's mark on one picture, so it needs that picture's places. F1 freezes them. No card changes, and none is weakened.
3. **Join ends on the level's x edge (Reeds bank, Ferns shelf: upper end x 720 = span start): accept. No change to the tool.**
   - The end is where the ramp meets the level. It lies on the span, so guard 3 holds.
   - The ⌈w/4⌉ inner margin governs where a walker stands: starts and targets are strict (`gok(…, 0)`). On legs 1 and 3 the walker only passes through the margin (`path_ok(…, relaxed)`). The keep-outs are still checked there.
   - The tool cannot move the end inward: it has no figure width, and an end moved inward would leave the ramp's rect.
   - Measured: in 300 s, Reeds had 170 points and Ferns 226 points inside the margin, all on legs 1 and 3, with fx never below 720. Boulders had 0.
4. **The shown cap of 5 and who rests: a follow-up ticket, R4b.** It was out of R4 ("Not in this ticket: the visible cap"). The lines:
   - **Why:** the game designer, gd-age-rooms.md Part 2 Q3: at most 5 shown per room on the whole and Idle, and "who rests"; the owner's "can't be too heavy visually".
   - **Rules data:** vivarium.json `rules.show`: `{"max": 5, "rest": ["elder", "adult", "juvenile"], "note": "…"}`. The order is stage, then `born` ascending, then id. The night rules come first. Always shown: the focused mibi, `ui.meet`, and a mibi hatched or moved in until it next rests.
   - **Host (pure):** add `shownOf(here, rest, ui, rules)` in `prototypes/station/src/views/home-props.mjs`, beside `restOf` (:88). `livingOf` (:109) marks each resident `shown: true|false` and keeps all of them housed in the room (≤ 8).
     - `glassOf` (:163–178) drops its own rank (newest life event first, `home.json regions.resident.max` 6) for `shownOf`. Home's count is min(5, what fits at 1x): UI/UX measures that.
     - `vivarium-props.mjs:21` and `idle-props.mjs:25` pass `shown` through unchanged.
   - **Face:**
     - A resident with `shown: false` finishes its current trip, a leg 2 included, and is never stopped mid-walk. It then goes to its room's rest place and stays there, curled. `shown: true` brings it back from that place.
     - N for the raised cap and for G10 counts only residents with `shown` ≠ false. That is `g_nres` in home.c, set at `ent_load`.
     - With no rest place it is hidden behind the room's occluder (out of sight, package §2.9).
     - Tests: shown ≤ 5 at every frame; the rest order; no resident hidden mid-trip; determinism.
   - **Art director owes:** for Reeds, Boulders and Ferns, a `rest` row per room in masters-pods' rooms manifest:
     - up to 3 sleep spots (housed 8 − shown 5), each with its level, its painting rect and its curl foot row, inside a level's span and off its keep-outs, at all four lights;
     - or the occluder each room hides a rester behind, if that room has no spot.

     The placer then carries the rows into `rooms.json`.
   - **Split:** R4b-1 is the host, the face, and Roots with the out-of-sight rule. It needs no art and can start now. R4b-2 is the rest places in rooms 2–4, after the art director's rows.
   - **Game designer owes:** whether resters in Roots share the bed (sleepers.max 3) with the carried set when docked, and which goes first when the bed is full.

**Questions for other owners (not mine to decide)**
- **UI/UX.** Are these live overlaps faults?
  - vivarium-twelve: a resident over the focused one's ring (18) and name tag (19);
  - walk-8000ms: a resident over the ring (18) and the tag (16).

  The walk has no rule against them. The owner's L4-22 covers walker overlap by depth.
- **Animator.** Walking sets now advance at `rules.walk.speed`, not stride·80/(2·beat_mean) (`home.c:301`). Do their cycle cells slide at 1 px a tick?

## Checked
- **Build:** `bash prototypes/face/build.sh` (wasm and native): face_test reported 20,907 checks with 0 failed, and layout 732 cases with 0 differing.
- **Tests:**
  - `node --test prototypes/face/tests/vivarium.test.mjs`: 64/64. Measured: 2,076 trips, 111 climbs and 113 descents, at most 2 raised (cap 2). At real speeds, travelling peaked at 2 (ceiling 2). The sets made 23 climbs and 23 descents.
  - `node --test prototypes/face/tests/home.test.mjs`: 60/60.
  - `prototypes/ui/tests/masters.test.mjs`: 13/13.
  - `prototypes/ui/tests/specs.test.mjs`: 36/36.
  - `prototypes/ui/tests/layout-cases.test.mjs`: 118/121. The 3 failures are the builder's three.
- **Goldens and guard:**
  - `goldens.mjs --check vivarium`: the goldens match.
  - `guard.mjs`: ok.
  - I viewed vivarium-level-roots and vivarium-ramp-ferns-4000ms at 1x: a walker on the terrace, and a juvenile mid-ramp to the shelf.
- **Probes (mine):**
  - Climbs in Reeds, Boulders and Ferns (F3).
  - Points inside the margin on join legs (Ruling 3).
  - Layout findings on the old and new logs.
  - F1 simulated with the 961525c3 logs.
- **Sampled, not run:** the idle and home goldens, face-check and layer-check. The builder reported them green.

## Cleanup
- Removed my private sparse worktree (…/scratchpad/arch-r4), its build directory (arch-r4-build) and my scratch scripts; `git worktree list` no longer shows it.
- I made no commits or pushes, and did not touch /home/user/r4 or /home/user/age.
- This file is not committed.
