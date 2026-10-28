# R4b-1 gate (architect, Wed 28 Oct 2026 07:08 Mexico City), 83f0d517

## Verdict
Not ready to merge yet. Four fix lines remain (F1 to F4), all small: three turn CI green, one keeps an owner card proven. The host, the face and the card rules conform to gd-r4b.md (all amendments), ux-r4b.md, cw-r4b.md, ux-r5-read.md and r4-gate.md §4. I simulated F1 to F4 in my worktree: every suite I ran then passes. F1 and F2 ride this branch: R5 merged with them red, and I confirmed both are red at 43e2292f.

## Fix lines

**F1. layout.test "the exceptions are the owner's" (red at 43e2292f too).**
- R5 added UI/UX's own layout exceptions (by "UI/UX", R5 Q6) and R4b adds one more. The guard reads every exception as the owner's.
- UI/UX owns each screen's layout spec, so a "by design" fine is UI/UX's to mark. The owner's six exceptions keep their full guard, and none may be dropped.
- `prototypes/ui/tests/layout.test.mjs:25`: replace the first `assert.ok(…exceptions…)` with:
  `{ const ex = frame.layout.exceptions, own = ex.filter((e) => e.by === "owner"); assert.ok(own.length >= 6 && own.every((e) => /^Owner, layout review 2026-10-26 \(/.test(e.reason) && e.date === "2026-10-26"), "the owner's exceptions, with the owner's words (none dropped)"); assert.ok(ex.every((e) => e.by === "owner" || (e.by === "UI/UX" && /^UI\/UX, /.test(e.reason) && /^2026-\d\d-\d\d$/.test(e.date) && e.date >= "2026-10-27")), "every other exception is UI/UX's (its layout spec), with its result named and dated"); }`
- Keep `assert.deepEqual(frame.layout.enforced, {})` after it.
- Simulated: 27/27.

**F2. home.test "the needs hold in the spec's order" (red at 43e2292f too).**
- R5 put `full` into home.json `strings.line.order` (43e2292f home.json:392), but the test still lists the old order.
- `prototypes/face/tests/home.test.mjs:258`: `["crates", "budReady", …` becomes `["crates", "full", "budReady", "portrait", "meet", "newPods", "glints", "waitingPods", "couldGrow"]`.
- Simulated: passes. The keys(b) assert above it already passes.

**F3. layer-check panel-add-room "the whole sets a word (panelTitle)/(cardText)", plus the unasked enter edit.**
- The panel's words belong to the overlay, which tests/panel.test.mjs checks. The rule "no word in the window but the name tag" is about the whole's own words.
- `prototypes/face/tools/vivarium-regions.mjs:56`: `x.layer === "type" && x.id !== "nameTag" && within(…)` becomes `x.layer === "type" && x.id !== "nameTag" && !/^(panel(Title|Header|Caption|Price)|cardText)$/.test(x.id) && within(…)`. These are the five type regions in panel.c.
- **Defect:** the builder's edit at `prototypes/face/tools/vivarium-states.mjs:42` put the comment in front of the code, so `if (f) S.UI.viv.f = fid(f);` is now inside the comment and never runs. The line becomes:
  `S.UI.viv.f = f ? fid(f) : null; S.UI.hab.id = null; S.UI.panel = null; S.goto("vivarium"); if (f) S.UI.viv.f = fid(f);   // a panel left open by the scene before is closed (goto from the whole to itself does not)`
- The panel clear itself is accepted: it stops a panel left open by one scene from leaking into the next.
- Simulated (LAYER_ONLY=vivarium): 29 states, 0 failures, panel-add-room 0 departures, every ring unchanged.

**F4. Do not skip the owner-card proof. Keep card vivarium-L8-1 on the picture it was marked on.**
- See Ruling 3 for why.
- Restore the frozen fixture under its own state:
  `git show 43e2292f:prototypes/ui/tests/layout-cases/vivarium/frozen/vivarium-docked.json > prototypes/ui/tests/layout-cases/vivarium/frozen/vivarium-docked-r4.json`
  Its hash is 4cf367cb.
- `prototypes/ui/tests/layout-cases.json:3` (`frozen`): add
  `"vivarium/vivarium-docked-r4": {"from": "961525c3", "hash": "4cf367cb", "why": "owner card vivarium-L8-1 was marked on this picture; R4b (the owner: travellers are not drawn) changed the live vivarium-docked, so the card stays on the picture it was marked on", "golden": "retired at R4b (T-20261027-323): git show 961525c3:prototypes/face/golden/vivarium/vivarium-docked.png"}`
- `layout-cases.json:775`: in the L8-1 card, `"state": "vivarium/vivarium-docked"` becomes `"vivarium/vivarium-docked-r4"`.
- `layout-cases.json:780`: the card's `pending` goes back to `[]`.
- `prototypes/ui/tests/layout-cases.test.mjs:53`: delete the line `if (c.pending.some((p) => p.needs === "the owner")) continue;`.
- Cards 107, 109 and 110 and UI/UX's case 18 stay on the live, refreshed vivarium-docked, as the builder has them.
- Simulated: 123/123. The L8 resident#3 exception is proven both ways again.
- layout-check's `anchored` (R5 F1) counts the exception as in use, because the card is on a frozen state.

## Rulings
1. **Conformance (sampled): conforms.**
   - **The rank (`restersOf`, `shownOf`, `nightOf`, `freshOf`, home-props.mjs:105–133) is gd-r4b's to the letter.** I worked the 8-mibi case by hand from rules.rest:
     - 12:00: m5's nocturnal group is in its night and m8 is fresh until 20:00, so rest = m5, m1, m2 and shown = m3, m4, m6, m7, m8;
     - 21:00: m8 is no longer fresh and m5's group is in its day, so rest = m1, m2, m3 and shown = m4, m6, m7, m8, m5.
     - The test (home-props.test:305) asserts exactly this.
   - **The 5-shown cap holds.**
     - Pins stay inside max: the focused mibi, then meet, then the fresh newest first.
     - The test tries 8 rotations of focus and meet, and every one shows exactly 5.
     - livingOf caps at min(rules.show.max 5, home.json resident.max 5).
     - N and G10 count only the shown (`g_nres`; `mv_household` filters on `m->sh`).
   - **Curls: at most 2 a room.**
     - livingOf's `curled < curl.max` caps it, and the face only ever turns a curl into out.
     - Spots are `gok` stands off keep-outs, beside an occluder (±56, foot−4) or at the back edge (+8), seeded within reach 200.
     - **My probe:** 12 seeded runs with 2 curlers resting at once in Reeds, every frame checked. 0 frames under 48; the closest pair was 126.
   - **Travellers are never drawn.**
     - `homeMibis` leaves them out of `here` in every view, including Home's glass.
     - The bed takes resters only (`resting`/`empty`).
     - The send-off has no bed play.
   - **The rail matches ux-r4b.**
     - A carried tile is `out`, docked or away, keeps its thumbnail at +[4, 0, 48, 48], and shows the solid glyph docked and the outline away at +[52, 12, 16, 24].
     - Focus lands on the tile, and ✓ opens the `out` card.
   - **Every carried card action is held.**
     - Rename, Portrait, Cross and Wild have their targets dimmed and their intents call `heldPlate`.
     - Carried partners are marked away (`crossPartners`).
     - Proved by intents.test:289.
   - **Bring is live only while docked** (habitat-props door `enabled` and intents/habitat.mjs `door`).
   - **The walk-in:** `noteCarried` stamps roomSince, `ui.arrived` becomes props `enter: "edge"`, and the face enters only into a walk that is already running. With reduced motion it is a cut. Proved by rest.test 8/8.
   - **Accepted departures:**
     - The face hard-codes rooms.json `rest.edge` left/main rather than reading it. Only left exists until R4b-2 reads `rest`.
     - `UI.arrived` is never cleared. It is harmless, because the face reads `enter` only for a new walker. Optional tidy: intents/frame.mjs:29 duplicates game.mjs:49's union; make it one pure helper.
2. **The red checks:** see F1, F2 and F3. (1) and (2) are confirmed red at 43e2292f: the base layout.test:25 and home.test:258 are byte-identical to the branch's, and the base frame.json and home.json already hold the data that fails them. (3) reproduces on 83f0d517.
3. **The skip of the proof for an owner-pending card: not acceptable.**
   - The skip leaves the owner's L8 resident#3 exception in frame.json, still clearing findings, with no owner card proving it either way. That weakens the owner's mark.
   - The precedent is R5 F1(d), vivarium-twelve: a card stays on the picture it was marked on. F4 applies it.
   - The owner may still re-mark L8-1 on the refreshed picture later, as a new card.
4. **The kit proposal for the dither: rejected as a new kit component; parked to R4b-2.**
   - "The 50 % ordered dither toward the tile fill" is already the vocabulary's `v_dither_window(id, pic, 0, 0, NULL, 0, 0, 8, x, y, w, h)`: a dither-out at level 8 of 16 over the tile's own fill. No new component.
   - The line for R4b-2, in `prototypes/face/src/screens/home_builds.c`:
     - **whole, :125–126:**
       - add `int dim = out && *pic && wire_asset_slot(pic) >= 0 && !dith;`;
       - draw the thumb slot only when `!dim`;
       - add `else if (dim) { v_name(reg); snprintf(nm, sizeof nm, "tile.%d.dither", i); v_dither_window(nm, pic, 0, 0, NULL, 0, 0, 8, x + vx, y + vy, tw, th); }`;
     - **up-close strip, :66–67:** the same, keeping its fixed four-node order (:44) by emitting the dither node in the thumb's slot.
   - **Why park:** the owner's away indicator (the glyph) and who (the thumbnail) are already there. The dim costs a rebuild and about 8 more goldens on a disk at 1.6 GB. UI/UX's read decides whether the interim is acceptable (Q1).
5. **The builder's other readings:**
   - **Bed resters cut on and off the bed.** Accepted for R4b-1. How it looks is Q2's.
   - **gap 48, read foot point to foot point.** Accepted for R4b-1. gd-r4b says "the curl's ink … at least gap from every other curl", which would be ≥ 144 between foot points. The rule is the game designer's (Q6).
   - **Resters are not focus targets; a focused tile pins its mibi shown.** Accepted: Amendment E, proved by vivarium-props.test:305.
   - **The two-line plate as two plates.** Accepted (the dock plates' way). How it looks is Q3's.
   - **roomSince is not stamped on a cross child.** Accepted. A real cross child hatches through the hatch (state.mjs:979, which writes roomSince). Only the dev seeds (`seedSiblings`) skip it, which gd-r4b says are "not fresh".
   - **Spec text edits.** Accepted (sampled; guard ok).
   - **UX case 18.** Its expects (a), (b) and (c) are face tests (vivarium.test:555). Accepted: they are structure, not layout findings. The L1 strip check is pending for UI/UX (Q4).
   - **L8-1:** see F4.
   - **The station journey and the headless loop bring Dot home before cross or sitting.** Accepted: that is what the held rule requires.
   - **idle-regions and vivarium-regions accept `r.rect[0] <= 0`** (a rester clipped at the window's left edge). Accepted: it is narrow, and only the left test is relaxed.
   - **ANIM_SENDOFF left unused.** Keep it. Removing it would renumber the later anim ids.
   - **The held name tag's dim.** Parked with the thumbnail dim (Q1).

## Questions for UI/UX
1. A carried tile shows its thumbnail undimmed until R4b-2. Is that acceptable at 1x for now? For the held name tag (Rename held): is it the same dither over the tag, or the tag's text in the dimmed role?
2. A rester bound for the bed vanishes where its trip ends and appears on the bed (a cut). Acceptable, or should it walk to the bed's left end and hop on? If it walks, the animator owns the hop.
3. The held plate's two lines show one after the other, as two plates of the dock's length. Is that cw-r4b's "two lines, not dot-joined"?
4. Case 18's L1 strip/bottom 10 is gone with the strip (R5). Re-mark it on the places pane (tile/bottom 8)?
5. Read the R4b goldens with carried tiles at 1x (vivarium-docked ×4 lights, -away, -mibi-out, -tile), and home-room-reeds and idle-meet-reeds (ux-r5-read item 1).
6. For the game designer (not UI/UX): is rules.show.curl.gap measured foot point to foot point (as built: ≥ 48 between curls, and the foot point ≥ 48 from the bed's rect), or ink to ink (≥ 144 between foot points)?

## Checked
- **Station host:** `node --test prototypes/station/tests/*.test.mjs`: 780/785. The 5 failures are ENOENT on golden PNGs that my sparse checkout leaves out (pictures-rgba stamp label and incubator). They are not R4b.
- **Face, on /home/user/r4b's dist at 83f0d517, read-only through a symlink; no build:**
  - vivarium.test 70/70;
  - rest.test 8/8;
  - idle.test 40/40;
  - home.test 59/60 (F2's).
- **UI:**
  - specs.test 36/36;
  - masters.test 13/13;
  - layout-cases.test 123/123;
  - layout.test 26/27 (F1's).
- **guard.mjs:** ok, with my simulated F1 to F4 in place, so the fix lines are guard-clean.
- **layer-check (LAYER_ONLY=vivarium, with Playwright):** the 2 panel-add-room failures. With F3: 0.
- **Goldens:** 38 modified, 3 added (home-room-reeds, idle-meet-reeds, vivarium-focus-crossed), 1 renamed (six-of-eight → five-of-eight), vivarium-sleeper deleted. prototypes/station/img is untouched.
- **Read:**
  - home-props.mjs `livingOf` and the rank;
  - home.c's rest machine (`wk_rest_plan`, `curl_spot`, `curl_clear`, `mv_rest_trip`, `wk_enter`/`mv_enter`, the census and the stirs);
  - vivarium-props, habitat-props and intents/habitat.mjs;
  - state.mjs `noteCarried`, `moveMibi` and the hatch.
- **Not run:** face-check, the goldens check, the journeys, and the other layer-check screens.

## Cleanup
- Removed my private sparse worktree (…/scratchpad/arch-r4b) together with its dist symlink and my simulated edits, and the probe script and its outputs. `git worktree list` no longer shows it.
- No build. No commits or pushes. /home/user/r4b is untouched, and its dist was only read.
- This file is not committed.
