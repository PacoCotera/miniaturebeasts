# Ageing gate (architect, Tue 27 Oct 2026 20:58 Mexico City), cc2dca67

## Verdict

**Merge after two fix lines (F1, F2).** Both are small and both are in developer tools. The rules, the save, the Library record and the Companion pages conform to ux-age.md (second amendment, 19:40) and to the ticket.

- **Merge onto the new base:** build/ageing merges cleanly onto origin/station-gate 0f046e4e. `git merge-tree` gives tree bc619f3c with no conflicts.
  - build/ageing does **not** touch `prototypes/ui/tests/layout-cases.json`. It changes only the fixture `prototypes/ui/tests/layout-cases/library/library-l3-close-moss.json` (hash a6eef3f3 → c6164630). R4's top-level `"frozen"` key sits in the corpus file, so nothing overlaps.
  - The one file both branches change, `prototypes/face/tests/vectors/metrics.json`, merges automatically.
  - No resolution is needed.
- **Base layout-cases (rule 4):** at 961525c3 the base was red, 108/121, because of 13 vivarium cases. At 0f046e4e it is green, 121/121. R4's F1 fixed it, so it needs no line of its own.

## Fix lines

- **F1. The "Adult to elder" select in the dev panel.** Today `settings.elderTurns` exists but nothing can set it, and an elder takes 18 expeditions to test by hand.
  - **Where:** prototypes/station/src/dev.mjs:39 (the Timers group), right after the "Juvenile to adult" row.
  - **Add:** `h("div", { class: "dev-row" }, "Adult to elder ", select("elderTurns", [16, 4, 0], (v) => (v === 0 ? "now" : v + " world turns"))),`
  - **Values:** the game designer's 16 / 4 / 0 (gd-age-rooms.md:72). It goes in Timers, beside adultTurns, because that is where adultTurns already lives.
  - **Test:** one assertion in the dev-panel test (or age.test.mjs) that the option list is [16, 4, 0] with default 16.
  - The Companion keeps 16 as a constant, which the lead accepted. With the select set off its default, the Station and the Companion disagree on the stage, exactly as they already do for adultTurns. That is a dev-world fact, not a fault.
- **F2. Developer seeds get `since` at creation.** Today a dev-seeded mibi has no `since` until the next load. normalize then back-fills it with `sinceFloor: true`, so the Library wrongly reads "or longer" for a mibi made today.
  - **Where:** in `seedAdults` (prototypes/station/src/state.mjs:998) and `seedSiblings` (:1110), on the `const m = { ... born: st.turn - JUVENILE_TURNS, ...` literal, add `...(Date.now() >= GOOD_CLOCK ? { since: Date.now() } : {}),` after `born`.
  - **Test:** one assertion in age.test.mjs: a seeded mibi has an integer `since` and no `sinceFloor`.

## Rulings

1. **Merge-ready on the sample, apart from F1 and F2.**
   - **Stage boundaries:** adult at 17 and elder at 18 on both devices. An elder from grownTurn + 16 works on both devices. The Station honours adultTurns and elderTurns.
   - **The save:** `since` is written only in hatchBud (from openBud and instantGrow). An unset clock (before GOOD_CLOCK, 2026-01-01) writes nothing. normalize back-fills once with `sinceFloor`. A JSON round trip of the schema-4 save keeps both fields. mergeCare never touches them. The Companion copies them at the dock, at index.html:944.
   - **The Library record:** turns old at every living stage, the stage row at 222, Yours at 250 and 270, the stamp at 302 / [840, 330], and rectFits 402. A bud or a released mibi draws no stage or Yours row. Compare draws neither row and keeps the stamp at l3.compare.stamp (412 / [840, 440]). The goldens show Reed with "25 turns old · Elder for 7 turns · Yours 13 days, since 4 Oct".
   - **The Companion:** status on one line at 396, the age line at 424, Yours at 446, the dots at 478/480. Rows show "{n} turns" right-aligned to 410 at y + 41. The Partner card shows "{stage}, {n} turns" at 418 / y + 6, plus " · slow, keen" for an elder.
   - **"young" on both devices:** on the Companion, STAGE_WORD is used on all 4 chips. On the Station, home.json `stages.juvenile` is "young". The Station's hatch log line still says "juvenile" (state.mjs:947, :954), but that log shows only in the dev panel (dev.mjs:130), so it is not player-facing.
   - **No age on the genome card:** no habitat file changed, and the habitat goldens are unchanged. The card still reads "your {Species}, {stage}" until the card split and the mibi lens land. That belongs to R7 (T-20261027-320), not this ticket.
   - **Architecture:** conforms.
     - age-words.mjs is pure and has one text. The Companion carries the same functions character for character, and a parity test proves it.
     - The clock is read at the edge: host.mjs familyBody passes `now`, which is noon of the dev Station date or else Date.now().
     - The compare stamp's position is data in library.json `l3.compare.stamp`, not a coordinate in code.
     - The Companion's ELDER_TURNS is a constant (lead accepted; the Station is the only device with dev settings).
2. **The builder's wordings: accepted as placeholders.**
   - "an elder from this turn" (the Companion's age line at 0) follows A1/A3's "from this turn".
   - "yours since today or before" (the Companion, an older save on its first day) follows A5's "since today" / "or before".
   - The copywriter owns both and may replace them. This is a flag, not a block.
3. **The dev panel select: a fix line here (F1).** The structure of the developer-tools mode is the architect's. **The design docs saying 6:** a docs follow-up through boards/docs.md, not a line on this build.
   - The docs are design/play-manual.md:283 and design/world-and-exploration.md:284. Both should read "after 16 more world turns".
   - Who owns it: the docs lead routes it, and the game designer owns the rule's words.
4. **Base layout-cases.**
   - **Measured at 961525c3:** 108/121, the same 13 failures at cc2dca67. Every failure is the fixture-hash assertion, not a finding. Five vivarium fixtures were not their goldens':

     | Fixture | Its hash | The golden's |
     | --- | --- | --- |
     | docked | 4cf367cb | 4ab51dc1 |
     | twelve | bb53921f | fc0d88a5 |
     | walk-8000ms | c6628872 | 43043b3c |
     | away | bfc7c916 | e4fd1124 |
     | empty-away | 4de1a9cf | 4c3e61a5 |

   - **Why:** R3 (961525c3) committed the vivarium goldens from a later draw than the fixture logs it committed beside them.
   - **Fixed in 0f046e4e:** docked, twelve and walk-8000ms are frozen under `layout-cases.json` `"frozen"` (their hashes are the 961525c3 fixtures' own), and away and empty-away were taken again. Result: 121/121.
   - R4's builder saw 3 on its own branch because those were the three it froze.
   - No separate line is needed.

## Checked

All on a private sparse detached worktree, with the face built from source (emsdk 4.0.23, wasm and native; face_test 20959 checks, 0 failed).

- **At cc2dca67:**
  - station 750/750;
  - exploration 321/322, 1 skipped;
  - public guard self-test ok, and `--base 961525c3` ok.
- **At the merge onto 0f046e4e** (tree bc619f3c, written into the worktree with read-tree, not committed):
  - ui 248/248 (layout-cases 121/121);
  - station 750/750;
  - exploration 321 pass, 0 fail, 1 skipped;
  - face 656/656;
  - test 7/7;
  - caddy 8/8;
  - workbench framework, genome-stamp bins and play footer 42/42;
  - face guard ok;
  - `goldens.mjs --check library vivarium`: both "goldens match". This confirms the 12 changed Library goldens and the frozen and retaken vivarium goldens together.
- **layout-cases.test.mjs alone:** 961525c3 108/121; 0f046e4e 121/121; cc2dca67 108/121.
- **Changed goldens:** only the 12 library-l3 PNGs (close ×6, compare-dot-moss, compare-on-held, pan-step 1–3, zoom-in) and library.json. compare-none is unchanged because its focused mibi is released.
- **Read at 1x:** close-fits, close-moss and compare-on-held (panel crops).
- **Read in the code:** the cc2dca67 diff of state.mjs, age-words.mjs, host.mjs, library-props.mjs, library_family.c, library.json, exploration/index.html, age.test.mjs and care.test.mjs.
- **Merge check:** `git merge-tree --write-tree origin/station-gate cc2dca67`.

## Cleanup

- The worktree arch-age, its face build directory and its logs and crops in the scratchpad are removed, and the worktree is pruned.
- Nothing was committed or pushed. /home/user/age and /home/user/r4 were not touched.
- This file is written and not committed.
