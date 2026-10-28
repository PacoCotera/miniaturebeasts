# R5 gate (architect, Wed 28 Oct 2026 00:47 Mexico City), 27602499

## Verdict
Not ready to merge yet. Four fix lines remain (F1 to F4).
- F1 turns CI green. It keeps all 8 owner cards meaningful and weakens or deletes none.
- F2 is a departure from ticket item 7: Idle ignores the mibi being met.
- F3 and F4 are small.

Everything else I sampled matches the ticket, ux-rooms §1a–1e and arch-rooms §4/§7: the panes, the chips, the focus edges, the ring-on-chip switch and dither, addRoom's spend and Keep, the entry rule, and the room Home and Idle show.

## Fix lines

**F1. Layout: keep every owner card meaningful (CI red: 6 layout-cases tests and 2 unused exceptions).**

(a) `vivarium L3 window`. The owner's reason still applies, so I retarget the exception to the rooms pane and keep strip.
- Measured on the live logs: the finding is now `L3a opening window / rooms 8 → 16`, in 23 of 24 vivarium states. That is the same 8 px crowding against the pane in the same row. The places pane makes no L3 finding.
- `prototypes/ui/specs/station/frame.json:256`: `"other": "strip"` becomes `"other": ["strip", "rooms"]`.
  - strip stays because card vivarium-L3-1 is on the frozen vivarium-docked picture (961525c3), which still has the strip.
  - rooms clears the live finding. Without it, the owner would be asked again about a question already marked fine.
- Owner's reason (unchanged): "marked fine, with no note: the window against the strip, the same window the owner called a window to the environment (vivarium-L2-1)".
- `prototypes/ui/specs/layout.mjs:332`: `(x.other == null || x.other === f.other)` becomes `(x.other == null || [x.other].flat().includes(f.other))`.
- `prototypes/ui/tests/layout-cases.test.mjs:51`: `x.other === e.other` becomes `[e.other].flat().includes(x.other)`.
- `prototypes/ui/tests/layout-cases.test.mjs:54`: `f.other === e.other` becomes `[e.other].flat().includes(f.other)`.
- Note `other` may be a list in the `layout.exceptions` shape comment at `layout.mjs:15` and at `frame.json:231`.

(b) `vivarium L4 resident / resident#4`. I do not retarget this one.
- Measured: no live state has that pair any more, because twelve became eight. Retargeting to whichever pair happens to overlap today (for example resident/resident#2 in room-new, room-short and room-reeds) would be a different mark, and the next walk change would break it.
- Its card, vivarium-L4-22, is on the frozen walk-8000ms fixture. layout-cases.test (test 121) already proves the exception there both ways.
- Owner's reason (unchanged): "mibis can overlap if one is behind of the other, we have a 2d vivarium representing a 3d space…".
- `prototypes/face/tools/layout-check.mjs:101`: an exception counts as in use when an owner card on a frozen state clears it. Before `unused`, add:
  `corpus = J(path.join(root, "ui/tests/layout-cases.json")), anchored = (e) => corpus.cases.some((c) => (corpus.frozen ?? {})[c.state] && c.verdict === "fine" && c.state.startsWith(e.screen + "/") && c.clear.some((x) => x.rule === e.rule && x.node === e.node && (e.other == null || [e.other].flat().includes(x.other))))`
- Then: `unused = unusedExceptions(frame, R.results).filter((e) => !anchored(e))`.
- Print one line for each exception kept this way: `kept <screen> <rule> <node>: proven on the frozen fixture <state> (layout-cases.test)`.

(c) The 6 cards on vivarium-away and vivarium-empty-away: retake the fixtures. Do not freeze them.
- These are L1-10, L11-1, L5-6, L6-3, L7-11 and L7-9.
- Take the two fixtures from the 27602499 logs with `layout-check.mjs <logs> --refresh-cases`, run with the logs of every screen.
- `git status` must then show only `layout-cases/vivarium/vivarium-away.json` (hash 4747976c) and `vivarium-empty-away.json` (hash 311ec5b6).
- Why retake: the window, the bed and the painting the cards are about did not move. I measured each card on the new logs:
  - **L7-11** (fault, "slack 806 left, 54 right, 752 → 4"): found unchanged, `L7b window left/right 752 → 4`.
  - **L1-10** (fault, "carried by vivarium-L7-11"): carried by the same finding.
  - **L6-3** ("an empty 1024 x 380") and **L7-9** ("the filled area's centroid off the centre"), both fine: still cleared, because the window is a painted fill.
  - **L11-1** (fault, "fixed by Q1"): still clear; the bed's mark is not drawn.
  - **L5-6** stays pending ("the owner re-marks the retaken vivarium-away at 1x").
- With the two refreshed, layout-cases.test is 121/121.

(d) The frozen `vivarium-twelve`: keep it.
- Card vivarium-L3-15 ("unequal gutters in a row: 305, 43, 305 → 43") was marked on the twelve picture.
- vivarium-eight is a different picture (eight adults, one room), so renaming the fixture to eight would move the owner's mark.
- `prototypes/ui/tests/layout-cases.json:5`: add to the entry `"golden": "retired at R5 (T-20261027-318): vivarium-twelve became vivarium-eight; the card stays on the picture it was marked on, git show 961525c3:prototypes/face/golden/vivarium/vivarium-twelve.png"`.
- Delete the three orphan unfrozen copies, which nothing reads once a state is frozen (`fixtureOf`): `layout-cases/vivarium/vivarium-twelve.json` (480444c1), `vivarium-docked.json` and `vivarium-walk-8000ms.json`.
- No card and no case changes.

I simulated F1 (a) to (c) in my worktree:
- `layout-cases.test` passes 121/121.
- `layout-check` over the vivarium, idle, home and incubator logs reports "ok (report mode)" with 0 unused exceptions.
- Before F1, the same run failed on `vivarium L3 window` and `vivarium L4 resident`.

**F2. Idle shows the room of the mibi being met (ticket 7; ux 1e: "Idle follows the same rule").**
- Today Idle reads `st.face.room` only.
- `prototypes/station/src/host.mjs:274`: pass `meet: UI.meet` into `idleBuild({ … })`.
- `prototypes/station/src/views/idle-props.mjs:23`: `shownRoom(m.st)` becomes `shownRoom(m.st, m.meet ?? null)`.
- Add a test to `prototypes/station/tests/idle-props.test.mjs`. Set `st.face.room = 0` and meet a mibi housed in room 1. Idle's painting ids must be Reeds', and its residents room 1's.
- Host `lightIds` (`shownRoomNow`, `host.mjs:302`) already uses `UI.meet`. With this fix, the picture ids it drops match the ones Idle draws.

**F3. Drop the 44 play-page screenshots from the commit.**
- `prototypes/station/img/*.png` holds 44 files and 36.7 MB of new blobs. They are journey.mjs output of the combined play page, which the owner retired from testing (2026-10-26).
- R1 to R4 left them untouched, and they are not in the ticket's golden list.
- `git checkout 33c02322 -- prototypes/station/img`.
- They are not deterministic: page-home.png differed again after my own journey run.

**F4. Spec and comment text.**
- `prototypes/ui/specs/station/vivarium.json:20` (`notes.strip`): "(rooms and places; the rooms design, the rooms design)" becomes "(rooms and places; ux-rooms.md §1a)".
- `vivarium.json:31` (`rules.walk.note`): "(the rooms design; the game designer" goes back to "(arch-rooms.md §2; the game designer". The section pointer was lost in a word swap, and guard.mjs does not forbid it.
- `prototypes/station/src/host.mjs:138`: "set here and nowhere else" becomes "set here, at the way in (game.mjs goScreen) and by ?dev Room shown". Those are the other two writers, at `game.mjs:101` and `dev.mjs:25`.

## Rulings
1. **Conformance (sampled): conforms, except for F2.**
   - **Panes and chips match ux §1a exactly.** Measured in the face's logs of vivarium-room-new, -rooms-four and -room-empty:
     - rooms pane [16, 488, 312, 64];
     - chips [32 + 72i, 496, 64, 48], lifted 2 under the ring (494);
     - lamp at chip + [52, 4, 8, 8] = [156, 498];
     - places pane [344, 488, 664, 64];
     - place 0 at [360, 496] and place 7 at [920, 496, 72, 48];
     - thumb at place + [12, 0, 48, 48];
     - a free place is a drawn recess.
   - **Dimmed cap.** Short of Energy the cap is dimmed with "Needs more ⚡: go out" (viewed at 1x, vivarium-room-short).
   - **Focus edges.** The `focus.graph` and vectors match ux §1b. Face test 15 and journey's vivarium-pad prove them:
     - ◀ from the first place goes to room.shown;
     - ▶ goes chip to chip, then to the first place of the room shown, or none when the room is empty;
     - ▲ goes to the nearest resident ahead, else none;
     - ▼ goes to none.
   - **Ring-on-chip switch.**
     - `host.mjs showRoom` sets `st.face.room` and plays `events.swap`. That is a dither on `window`, 200 ms and 16 levels, the same kind as habitat's swap.
     - Each place carries `from` to dither from. With reduced motion it is a cut (face test 17; props tests 18 and 19).
     - room.new does not change the room shown.
   - **addRoom.** It spends 4, then 8, then 12. The ring goes to the new chip, and the plate says "The {Room} room is ready" (C8).
     - Keep, ← and the room key spend nothing (`frame.mjs:14` closes the panel).
     - A dimmed card says needMore and leaves the panel open (intents tests).
   - **Entry.** It follows ticket 6 (`game.mjs:101`, props tests 16 and 20).
   - **Home's full need.** It sits ahead of budReady. Its ring goes to room.new when `addRoomBlock` is null, else to the first resident of the room shown. The Incubator module reads "waits for room" (C11).
   - **Test world.** bays(n) is retired, vivarium-eight is in, and Idle's walk is eight.
2. **The dev `settings.rooms` override winning over `st.rooms`: accept.**
   - It is arch-rooms §4's own rule: `roomCount = clamp(settings.rooms ‖ st.rooms ‖ 1, 1, 4)`.
   - With the override set, `addRoom` still adds `st.rooms`, so the chip count does not grow. That is dev only.
   - Optional, not blocking: in `panel-props.mjs:74`, change `next = S.roomCount(st, settings)` to `next = st.rooms ?? 1`. The card's preview would then always be the room `addRoom` adds (`state.mjs:869–871`).
3. **The recess drawn with `kit_panel` (an edge on all four sides, the void shade top-left): accept architecturally.**
   - It uses one kit component, with no new drawing code. The look is UI/UX's to rule (Q2).
4. **The crumb, parked: accept for this merge.**
   - It is presentation only. No state or interface waits on it, and the room shown is already in the props (`regions.room.id`).
   - When UI/UX gives the numbers, it is a small follow-up: the top bar's title zone (frame.json `title.rect` [16, 8, 232, 24]), reading the props. It needs no new state.
5. **The addRoom card with no picture: accept.**
   - The ticket says "until the art director cuts it, the card has no picture". `rooms.json preview` is null, and the slot is wired to it (`panel-props.mjs` addRoomCards).
   - Where the empty stage sits is UI/UX's (Q4).

## Questions for UI/UX
- **Q1. The crumb's numbers.**
  - ux §1a gives the glyph at x 144 and the word from x 162. The builder measured the top bar's own separator at 145/159.
  - Which numbers apply, which glyph or master is the "⟋", and does it reuse the Library's crumb?
- **Q2. The recess look.**
  - ux §1a says "void shade top-left, hairline bottom-right". It is built as a hairline on all four sides with the void shade top-left (kit_panel).
  - Accept, or give the exact edges.
- **Q3. home-full-bud's line.**
  - It reads "Make room · The bud is ready", where mock-10 has "Make room" alone.
  - Should budReady drop from the line while `full` holds, since the bud is what waits for room? Or is the capitalised second notice right?
- **Q4. The addRoom card with no preview.**
  - panel-add-room shows the card's empty stage and pedestal. Is that the intended stand-in, or should the card show no stage until the preview is cut?
- **Q5. The entry rule against 1e.**
  - The case: see Dot up close in Roots, then on the whole move the ring to the Reeds chip, then go Home. Home shows Reeds (1e).
  - ✓ Open the Vivarium then lands on Roots, Dot's room (ticket 6, ux 1b "as today"), so the view jumps.
  - My recommendation: seeing a mibi up close sets `st.face.room` to its room, and the way in reads `st.face.room` only. Your call.
- **Q6. New layout findings on the panes**, in report mode, for your 1x read:
  - `L2 rooms/places focus ring / top 1 → 16`: the lifted ring is 1 px from the pane's top;
  - `L6`/`L7a rooms`: the empty 160 × 64 right of the chips with one room;
  - `L1 chip top/bottom 8 → 16`.

## Checked
Run in my own sparse worktree at 27602499, with the build outside the tree.
- **Build:** `build.sh` (wasm and native) passed: face_test 20,977 checks with 0 failed, and layout 739 cases with 0 differing.
- **Tests:**

  | Test | Result |
  |---|---|
  | `node --test prototypes/station/tests/intents.test.mjs` | 49/49 |
  | `home-props` | 25/25 |
  | `idle-props` | 7/7 |
  | `vivarium-props` | 21/21 |
  | `state` | 56/56 |
  | `prototypes/face/tests/vivarium.test.mjs` | 69/69 |
  | `prototypes/ui/tests/specs.test.mjs` | 36/36 |
  | `layout-cases.test` (as built) | 115/121; the 6 failures are the builder's (b) |
  | `layout-cases.test` (with F1 simulated) | 121/121 |

- **Goldens:** `goldens.mjs --check` passed for vivarium, idle, home and incubator ("goldens match").
- **Layout check:** as built, the unused `vivarium L3 window` and `vivarium L4 resident` fail. With F1, the 4-screen run is ok.
- **Guard and journey:**
  - `guard.mjs`: ok.
  - `journey.mjs`: "journey ok". The journey proves the chips' pad. "Done when" is proved in pieces by intents tests 2 and 3 (the full need leads to room.new, and adding Reeds costs 4).
- **Viewed at 1x:** vivarium-room-short and panel-add-room.
- **Not run:** face-check and layer-check, and the other screens' goldens (the builder reported them green).
- **Spend:** 0 MXN, no paid calls.

## Cleanup
- Removed my private sparse worktree (…/scratchpad/arch-r5), its build directory (arch-r5-build), the logs and layout outputs, and my scratch scripts. `git worktree list` no longer shows it.
- I made no commits or pushes, and did not touch /home/user/r5.
- This file is not committed.
