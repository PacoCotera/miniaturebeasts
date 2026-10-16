# The Incubator without the chapter tabs: ruling

UI/UX, ticket T-20261016-23, 2026-10-16 (America/Mexico_City). Base: station-gate 69ea1d23. Owner feedback (10:45): "tabs make no sense in the incubator" (`results/owner/2026-10-16-incubator-tabs.png`). The build ticket is T-20261016-29.

## 0. Where the tabs come from (measured on 69ea1d23)

- **The strip is the shared chapter rail.** Coat, Face, Movement and Stamina are the `chapterRail` word (`frame.json regions.rail`, rules `railCompaction` and `slantTabs`). It hangs from the top bar at y 40–80 in its well (y 40–88). The owner's crop shows it under the top bar. It is not a bottom strip, and no Incubator-only strip exists.
- **Screens that draw it:** Pods (overview, chapter page, Compare), Create, Cross and the Incubator (`incubator.json regions.rail`, in growing, ready and hatch). Create, Pods and Cross keep it. This ruling removes it from the Incubator only.
- **How the Incubator draws it:** `views/incubator-props.mjs:33–39` names `regions.rail` whenever a bud is shown. `screens/incubator.c:179` draws `word_rail` only if the props name it. `intents/incubator.mjs:43–49` (`incubatorTick`, called from `host.mjs:225`) plays `events.wipe` on a tab when a founder's chapter clears.
- **What it says there:** for a founder's bud, the chapters clear one by one across the wait. A cross bud's unknown chapters stay unread. The **stamp label** already shows the same thing: `regions.stamp.live`, "the bud's stamp, its chapters filling as they clear". It computes its known chapters on its own (`incubator-props.mjs:64`, `knownChapters`). So the clearing stays visible without the rail.

## 1. The ruling

**The Incubator draws no chapter rail in any state. The band under the top bar shows the bench, exactly as the empty state does today.** The Incubator is where a beast grows, not the editor: the chamber, the leaves, the plaque and the stamp say everything the room needs. Chapter names belong to Create and Pods, where the player chooses and reads.

| State | The band, x 0–1024 × y 40–88 | Rects (on the 8 px grid) |
| --- | --- | --- |
| empty | the bench stage `room-bench-stage-incubator` (0, 40, 1024, 522), its top bezel and wall (unchanged) | no region in the band |
| growing | the same as empty | no `rail` (was 96, 40, 832, 40) and no well (was 88, 40, 848, 48) |
| ready | the same as empty | the same |
| hatch | the same as empty. The ribbon (312, 104, 400, 40) stays where it is, from 1200 | the same |

- **What the clearing becomes.** The game rule is unchanged (`state.budChapterKnown`, ring order, a shut sealed chapter never clears, a cross bud keeps its unread chapters). Only its display changes: the stamp label (804, 232, 120, 120) is the one place it shows. When a chapter clears, the stamp redraws on the next refresh as a **cut**, in its own box: **14,400 px** (was the wipe, ≤ 47,680). No new animation is drawn.
- **growNow** at 400: the stamp redraws with every chapter the founder's bud now knows. The sentence about the tabs goes. The ceilings stay (153,600 / 162,432); with no tabs the frames can only shrink.
- **Nothing moves.** Every rect of `specs/station-incubator-layout-spec.md` §2 stays. The grid's top line stays **104 = 88 + 16**, measured from the band's floor (y 88), as it already is in the empty state. On the bench screens that keep the rail, 88 is the well's floor (`frame.json regions.rail.well`, y 40 + 48).
- **Brightness** (`specs/station-incubator-brightness-ruling.md`): the band lies in no paint zone and not in the chamber mask. The caps and the 0.08 condition stand as written.
- **Stamp plate** (`specs/station-stamp-plate-ruling.md`): untouched. The stamp keeps its rect and its plate.
- **Layout spec open point 1** ("the top leaf against the rail's well: 2 px") is **closed**: there is no well on the Incubator. The outer arc's centre slot (504, 90) sits 10 px under the leaf band's top (80) on the bench, as `derived["leaf arcs"]` intended.
- **The Incubator's purpose line** loses "which chapters are still surprises" as a named list. The stamp shows how much is still a surprise, not the chapter names. The concept ticket T-20261016-25 ("what the player does there") may ask for more. It should not bring back a rail: that is this ruling's point.

## 2. Spec edits (old → new), for the builder

**`prototypes/ui/specs/station/incubator.json`**

| Key | Old | New |
| --- | --- | --- |
| `regions.rail` | the region (96, 40, 832, 40, `chapterRail`, tabs, pips, clearing) | **deleted** |
| `drawOrder` | `"bench", "rail", "leaves", …` | `"bench", "leaves", …` |
| `rules.used` | `["railCompaction", "slantTabs", "leafArc"]` | `["leafArc"]` |
| `events.wipe` | the event | **deleted** |
| `events.growNow.do` | "… then, at 400, on a founder's bud, every tab still unread turns read (a cut), except a sealed chapter that is still shut, and the stamp redraws; a cross bud keeps its unread chapters; … (leaves, tabs, stamp, line) …" | "… then, at 400, on a founder's bud, the stamp redraws with every chapter it now knows (a cut), except a sealed chapter that is still shut; a cross bud keeps its unread chapters; … (leaves, stamp, line) …" (the rest unchanged) |
| `notes.motion` | "… growNow fills every leaf at once and the tabs turn read; … the wipe is a cut. … growNow's cut lands every leaf, the tabs and the ready state …" | "… growNow fills every leaf at once and the stamp redraws; … growNow's cut lands every leaf, the stamp and the ready state …" (the wipe sentence goes) |
| `regions.stamp.live` | "the bud's stamp, its chapters filling as they clear" | "the bud's stamp, its chapters filling as they clear: a cut on the next refresh in its own box (14,400 px); the one place the Incubator shows the chapters (no rail, specs/station-incubator-tabs-ruling.md)" |
| `note` | "… the rail above clears its surprises; the stamp and its code stand at the right." | "… the stamp and its code stand at the right, the stamp clearing its surprises. No chapter rail: the chapters are Create's and Pods' (specs/station-incubator-tabs-ruling.md)." |
| `regions.bench.grid.note` | "… and from the rail's well (88)" | "… and from the band's floor (88; no rail on the Incubator)" |
| `derived["leaf arcs"]` | "… keeps the outer arc's top leaf 10 px under the rail …" | "… keeps the outer arc's top leaf 10 px under the leaf band's top (80) …" (the rest unchanged) |
| `status` | — | append "No chapter rail (specs/station-incubator-tabs-ruling.md, owner 2026-10-16): the band under the top bar is the bench in every state; the chapters clear on the stamp" |

**`prototypes/ui/specs/station/incubator.props.json`**: delete `properties.regions.properties.rail` and `$defs.tab`, if nothing else uses it. If `rail` is in a `required` list, remove it there too.

**`prototypes/ui/specs/station/frame.json`**: `regions.rail.pip.draw`: "none on Pods, the Incubator and Compare (fix 11, GB1 …)" → "none on Pods and Compare (fix 11, GB1 …)" (the rest unchanged).

## 3. Code (the builder's)

- `prototypes/station/src/views/incubator-props.mjs`: delete the rail block (:33–39, from the comment "the rail: a tab a chapter" to the end of `regions.rail = …`). Keep `knownChapters` (the stamp uses it).
- `prototypes/station/src/intents/incubator.mjs`: `incubatorTick` plays no wipe. Delete the function and its import and call in `host.mjs` (:22, :225), unless something else needs `inc.seen`; if so, keep only that and report it.
- `prototypes/face/src/screens/incubator.c`: delete :179 (`word_rail`). In the header comment (:2, :4), drop "rail" and the `wipe` event.

## 4. Wireframes (SVG patch)

`specs/station-incubator-tabs-wireframes.patch` (checked with `git apply --check` on 69ea1d23's three files):
- in `04-incubator-growing.svg`, `05-incubator-ready.svg` and `05b-incubator-hatch.svg`, it deletes the rail (lines 6–23: the dashed 96, 40, 832, 40 box and the four tabs with emblems, words and pips);
- it adds "no rail" to each title;
- it rewrites 04's note "A founder's tabs clear in ring order …" as "No rail: the band under the top bar is the bench, as in empty. A founder's chapters clear on the stamp as the wait passes."

`05c-incubator-empty.svg` and `05d-incubator-nav.svg` draw no rail and do not change. Re-render the three PNGs.

**`design/style-guide/station-layouts.md`** (lines at 69ea1d23):
- :291 heading "The chapter rail (Pods, Create, Incubator)" → "(Pods, Create)".
- :308 "(Pods' overview and chapter page, Create, Incubator)" → "(Pods' overview and chapter page, Create)".
- :309 "What Create and Incubator inherit" → "What Create inherits", with "On both" → "On Create".
- :330: delete the row "Cleared while growing (Incubator)".
- :520 "as on Create and Incubator" → "as on Create".
- :2537 "as on Pods, Create and the Incubator" → "as on Pods and Create".
- Incubator section:
  - :1349 "which chapters are still surprises" → "how much of the bud is still a surprise (on the stamp)".
  - :1357: delete the row "The rail with tabs clearing".
  - :1359 "filling with the rail" → "its chapters filling as they clear".
  - :1366: delete the bullet "read, cleared or misty on the tabs".
  - :1380: delete item "4. The rail: which surprises remain" and renumber.
  - :1387 "(the rail, the stamp, the code)" → "(the stamp, the code)".
  - :1413 "The rail is centred across the top." → "No rail: the band under the top bar is the bench."
  - :1417 and :1435: delete the Rail rows.
  - :1449 draw order: drop "rail,".
  - :1451 "every leaf lies 10 px or more under the rail" → "under the leaf band's top (80)".
  - :1456 "A founder's tabs clear across the wait" → "A founder's chapters clear on the stamp across the wait" (the rest unchanged).

## 5. Tests

- **`prototypes/ui/tests/specs.test.mjs`**
  - :254 title "the leaf arcs clear the rail and the glass" → "the leaf arcs clear the band and the glass".
  - :257: drop "rail" from the region list.
  - :262: replace the rail-rect assert with `assert.equal(R.rail, undefined, "no chapter rail on the Incubator")`, `assert.ok(!inc.drawOrder.includes("rail"))`, `assert.equal(inc.events.wipe, undefined)` and `assert.deepEqual(inc.rules.used, ["leafArc"])`.
  - The leaf-slot bound "8 px or more under the rail" keeps its number, measured against y 80 (the leaf band's top): rename the message.
  - :883: the regex → `/none on Pods and Compare/`.
  - The top-line assert (`P.L[1] === frame.regions.rail.well.y + frame.regions.rail.well.h + 16`) stands. The frame's well still exists for the screens with a rail.
- **`prototypes/face/tools/incubator-regions.mjs`**
  - :37: replace `must(regions.some((r) => r.id === "rail.tab"), "the rail is drawn")` with a check for every state: no `rail.tab` and no `rail.well` region, "the Incubator draws no chapter rail (T-20261016-23)".
  - :13–17 (the well and tab checks) then check nothing. Delete them or leave them; report which.
- **`prototypes/face/tests/incubator.test.mjs`**
  - :181 title: "the leaves, the tabs and the ready state" → "the leaves, the stamp and the ready state". The ceiling stays 162,432.
  - Add one test: in growing, ready and hatch-1100, no pixel of y 40–88 differs from the empty golden's band. Only the top bar and the bench are there, so it must pass. If it does not, report the first differing row.
- **`prototypes/station/tests/incubator-props.test.mjs`**
  - :1 header: drop "the rail's tabs".
  - Add an assert: in every state, `props.regions.rail` is undefined, and the stamp's `read` still lists the known chapters (a founder's bud mid-wait: the cleared ones).
- **Dirty area:** print the stamp's redraw on a chapter clear (expect 14,400 and assert ≤ 14,400). Every other ceiling stays: 55,808 / 20,480 / 98,944 / 16,000 / 96,064 / 153,600 / 162,432. The wipe's 47,680 is retired with the event.

## 6. Goldens to retake

- **Retake 17 goldens and their hashes in `prototypes/face/golden/incubator/incubator.json`:** `incubator-growing`, `-growing-late`, `-grownow-200`, `-grownow-420`, `-ready`, `-hatch-100`, `-300`, `-650`, `-850`, `-1100`, `-1500`, `-2000`, and `-hatch-moving-1090`, `-2500`, `-2720`, `-5440`, `-5840`.
- **Unchanged:** `incubator-empty`. If it moves, report it.
- **Captures:** `prototypes/station/img/page-incubator.png` and `fix14/incubator-growing.png`. `page-incubator-empty.png` does not change.
- **`journey-incubator.json`:** no rail keys today, so it is expected unchanged. A move is a departure to report.
- **No other screen's golden may move.** Pods, Create and Cross keep the rail.
