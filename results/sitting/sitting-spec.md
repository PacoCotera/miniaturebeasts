# The Sitting screen: spec changes and props (UI/UX and architect, 2026-10-23)

From the UI/UX designer's amended Sitting design (21:11) and the architect's build spec (21:20). Build tickets cite these sections.

## 1. `sitting.json` changes (exact, against ae0afe65)

### Changed

- **`status`**: "The layout spec for the sitting on the LVGL face: every drawn region names its word or composition, the states pose, place, confirm, begin and portrait, the focus as data, the events, the bottom line and the strings".
- **`notes.window`**: "the same bezel, glass, mibi and name tag as Habitat, so the screen change keeps the mibi where it stood. On the pose step the glass and the resident are Habitat's own, in the hour's light. From the place step on, the window previews the portrait: the place's backdrop in its own day light, and the resident drawn ungraded with it (art director, 2026-10-23 19:26 §3)".
- **`notes.where`**: append "; and, in state portrait, opened from wherever `regions.portrait.offeredFrom` lists".
- **`states`**: `["pose", "place", "confirm", "begin", "portrait"]`.
- **`stateRule`**: append "portrait: the finished portrait in the gilt frame, at rest, view only (GD-3); nothing to choose and nothing spent; entered only from `regions.portrait.offeredFrom` and only while the picture is held".
- **`regions.glass.pictures`**:
  ```json
  {"pose": "the same vivarium-near-{light}-544x408 as Habitat (habitat.json regions.glass), the hour's light",
   "place": "sitting-backdrop-{place}-544x408 of the focused place card, day light, never graded by the hour",
   "confirm": "sitting-backdrop-{place}-544x408 of the chosen place, day light, seen through the gilt's opening",
   "begin": "as confirm",
   "portrait": "as confirm, hidden under regions.portrait"}
  ```
- **`regions.glass.load`**: "the place backdrops load on entering the place step and are dropped on leaving the screen; the pose step's glass is Habitat's, already loaded".
- **`regions.glass.note`**: "no words but the name tag; the light rule is notes.window".
- **`regions.resident`** (replaced whole):
  ```json
  {"rect": [144, 68, 304, 312], "component": "specimen", "focal": true, "axis": 296, "feet": 380, "clip": "glass",
   "place": "x = 296 − dx − ⌊W/2⌋, y = 380 − dy − H + 1, from props regions.resident.figure (habitat.json, 16.15 placement)",
   "picture": "the same picture as the focused card (pose) or the chosen pose card (place, confirm, begin): this mibi in that habit's held key at the Habitat factor (stand-sizes views.habitat), in the 304 × 312 place, feet on 380",
   "form": {"sleep-curled": "the layered curl, its last solid row on 380, no shadow",
            "a habit with no signed key": "the stand (the 16.15 placement), as its card shows; listed as a placeholder (masters.placeholders)",
            "S02, S03": "the species stand-in in every pose; never a nap master scaled up"},
   "light": {"pose": "the hour's, as Habitat", "place": "ungraded (day light)", "confirm": "ungraded", "begin": "ungraded"},
   "change": "the change of form or light rides the step's cut, or the backdrop's dither on the place step (timing: the animator, AN-1)",
   "lift": 0, "target": null, "inStates": ["pose", "place", "confirm", "begin"],
   "never": "a painting (decision 10-11 14:17 (4)); the portrait is not shown before it is painted"}
  ```
  `rect` is the 304 × 312 box at axis 296 with feet 380 (top 68 = 380 − 312).
- **`regions.nameTag`**: set `rect` to `[184, 404, 224, 32]` and `lineTop` to `406`. Add `"build": "kit_nameTag"`, `"rule": "auto"` and `"slot": "state portrait: the tag's slot only, nothing drawn"`. Keep `"target": null`.
- **`regions.gilt.inStates`**: `["confirm", "begin", "portrait"]`.
- **`regions.gilt.props.lit`**: `"focus.armed === \"room\" (confirm only; never lit in portrait: the art director's ruling, 19:26 §5)"`.
- **`regions.deck`**: `{"rect": [592, 48, 416, 424], "plate": "plate-device-416x424", "sprite": "1:1, as namer.c build_panel", "note": "the right column in every state"}`. This drops `component`, `inset` and the drawn panel.
- **`regions.heading`**: add `"portrait": {"rect": [608, 64, 248, 32], "px": [20, 16], "rule": "20 px, or 16 when 20 does not fit 248", "text": "strings.heading.portrait (copywriter, CW-2)"}`.
- **`regions.cards`** (replaced whole):
  ```json
  {"rect": [608, 112, 376, 248], "build": "kit_tiles", "layout": ["listPitch"], "inStates": ["pose", "place"],
   "forms": {"grid": {"upTo": 6, "first": [608, 112, 120, 120], "pitch": [128, 128], "grid": [3, 2]}},
   "refuses": "more than 6 items (-1)", "targets": "card.<i>",
   "well": "plate-well-120x120",
   "props": {"items": [{"picture": "<96 picture id>"}]},
   "card": {"picture": {"at": [12, 12], "size": [96, 96]},
            "pose": "this mibi in that habit's held key, whole art fitted, 96 × 96, day light (never graded by the hour), transparent on the well's own ground; derived by the station's reducer, no master",
            "place": "place-{place}-96x96, full bleed in the same 96"},
   "order": "the frame's: poses as sitting.mjs offer gives them (already in the species frame's habit order); places, the pod's place first, then the order walked to"}
  ```
- **`regions.chosen`** (replaced whole):
  ```json
  {"rect": [608, 112, 248, 120], "build": "kit_tiles", "layout": ["listPitch"], "inStates": ["confirm", "begin", "portrait"],
   "forms": {"pair": {"upTo": 2, "first": [608, 112, 120, 120], "pitch": [128, 0], "grid": [2, 1]}},
   "well": "plate-well-120x120", "card": "as regions.cards.card", "props": {"items": [{"picture": "<96 picture id>"}]},
   "note": "the pose's card, then the place's card, as chosen; not targets"}
  ```
- **`regions.strip`**: `{"rect": [16, 488, 992, 64], "plate": "plate-device-992x64", "sprite": "1:1, as Habitat"}`.
- **`regions.steps`** (replaced whole):
  ```json
  {"rect": [32, 496, 472, 48], "build": "kit_tiles", "layout": ["listPitch"],
   "forms": {"three": {"upTo": 3, "first": [32, 496, 152, 48], "pitch": [160, 0], "grid": [3, 1]}},
   "wells": {"current": "plate-well-152x48-shown", "done": "plate-well-152x48", "ahead": "plate-well-152x48"},
   "props": {"items": [{"state": "current | done | ahead", "word": "strings.steps", "picture": "<48 picture id> | null, only when done"}]},
   "word": {"at": [12, 24], "anchor": "left, centred on the row", "px": 16, "box": 76, "colour": {"current": "bone", "done": "bone", "ahead": "mist"}},
   "thumb": {"at": [96, 0], "size": [48, 48],
             "pose": "the chosen pose card's picture by the same rule at 48 × 48 (whole art fitted, day light), no ground of its own, as a bay tile",
             "place": "place-{place}-48x48",
             "portrait": {"frame": "sitting-frame-portrait-48x40", "at": [96, 4], "picture": {"at": [100, 8], "size": [40, 30]}, "inStates": ["portrait"]}},
   "words": "strings.steps"}
  ```
- **`drawOrder`**: `["stage", "bezel", "glass", "resident", "nameTag", "portrait", "gilt", "deck", "heading", "cards", "chosen", "stamp", "stamp.portrayed", "strip", "steps", "ring", "frame (top bar, bottom line)", "message plate"]`.
- **`events.backdrop.do`**: "the place step: the ring moved to another place card; the backdrop cross-dithers to that place's (lvgl-switch.md §2.7). Entering the place step dithers from Habitat's vivarium-near-{light} to the focused place's backdrop, the resident from the hour's light to ungraded; going back to the pose step dithers to vivarium-near-{light}, the resident to the hour's light. The light never flips direction (every backdrop keeps the top-left key)".
- **`events.step.do`**: append "; the resident's form follows the focused or chosen pose card on the same frame".
- **`events.begin.then`**: "Habitat: the plate (home.plate) and the Portrait module in its painting state".
- **`focus.pose.targets.card.shape`**: `{"rect": 6}`.
- **`focus.pose.targets.card.box`**: `"regions.cards.forms.grid, card i"`.
- **`focus.vectors`**: append these three:
  - `{"state": "pose", "from": "card.0", "key": "back", "screen": "habitat", "focus": "portrait"}`
  - `{"state": "portrait", "from": "room", "key": "confirm", "to": "room"}`
  - `{"state": "portrait", "from": "room", "key": "back", "screen": "habitat", "focus": "portrait"}`
- **`keys.confirm`**: append "; portrait: nothing (no cap)".
- **`keys.pad`**: "pose and place: moves the ring among the cards; confirm and portrait: nothing".
- **`keys.back`**: append "; from portrait, Habitat with the ring on the Portrait module (habitat.json focus.entry.backFromPortrait)".
- **`colours.step`**: `{"word": "bone", "ahead": "mist"}`. The fills come from the wells.
- **`masters.list`**: `["sitting-backdrop-meadow-544x408", "sitting-backdrop-pond-544x408", "sitting-backdrop-rock-544x408", "sitting-backdrop-wood-544x408", "sitting-backdrop-cave-544x408", "sitting-gilt-560x424", "sitting-gilt-lit-560x424", "place-{place}-96x96", "place-{place}-48x48", "sitting-frame-portrait-48x40", "spread-gilt-corner-16x16", "plate-device-416x424", "plate-device-992x64", "plate-well-120x120", "plate-well-152x48", "plate-well-152x48-shown", "crate-sitting-48x40", "crate-sitting-256x176", "room-vivarium-stage-habitat 1024×522 (Habitat's)"]`. The five backdrops keep their ids; they are repainted by the art director, studio work, so no layout change follows.
- **`home.plate`**: `{"on": "Habitat, after events.begin", "lines": ["strings.beganPlate"], "px": 16, "pad": 16, "line": 20, "height": 36, "bottom": 550, "example": {"lines": 1, "widths": [193], "rect": [399, 514, 226, 36], "note": "Fig: the line plus 16 each side, rounded up to an even width to centre on x 512; it covers the strip, not the mibi or the Portrait module"}}`.
- **`home.slot`** becomes **`home.berth`** (16.14 B5): `{"rect": [912, 408, 32, 24], "after": "the next held frame when begin brought one forward from the queue, whatever its source (sitting.mjs beginSitting: .welcome or .owed not null; the same as st.sitting set after begin); else nothing. No count, no word"}`. This is the rekey of review note 6: the line no longer tells a welcome from a moment.
- **`buildChanges`** (replaced whole):
  ```json
  ["the build has no sitting screen: sitting.mjs holds its rules headless (offer, beginBlock, beginSitting); habitat.mjs offers no Portray",
   "sitting.c on the kit: kit_stage, kit_tiles (cards, chosen, steps), kit_nameTag, kit_stamp; deck and strip plates 1:1",
   "Habitat's Portrait module opens this screen with ✓ Portray {name} (state pose), and, portrayed with its picture held, with ✓ strings.lookPortrait (state portrait)",
   "pose cards and thumbs are derived per mibi and habit (mibiReq with a pose); the window's resident is the same picture at the Habitat factor",
   "the place step and after request the resident ungraded",
   "a portrayed mibi's stamp label carries spread-gilt-corner-16x16 (regions.stamp.portrayed; habitat.json regions.stamp.portrayed)",
   "Cargo's end jumps to state portrait when regions.portrait.offeredFrom lists cargo-end; the hold on sitting crates (cargo.json dockCrates.sitting.revealNote, home.json regions.bay) lifts"]
  ```

### Added

- **`regions.portrait`**:
  ```json
  {"rect": [32, 64, 528, 392], "inStates": ["portrait"], "layer": "painted",
   "picture": "props regions.portrait.picture: portrait:<d16>:528x392, 1:1 in the gilt's opening",
   "over": "the glass; under the gilt (at rest)",
   "offeredFrom": ["habitat-portrayed", "cargo-end"],
   "offeredRule": "habitat-portrayed: Habitat's Portrait module, portrayed and its picture held, ✓ strings.lookPortrait; cargo-end: Cargo's end after a run that opened this mibi's sitting crate, ✓ before Look at the pods",
   "until": "not entered: the state is offered only while the picture is held"}
  ```
- **`regions.stamp`**:
  ```json
  {"rect": [872, 64, 120, 120], "build": "kit_stamp", "plate": "plate-well-120x120", "inStates": ["portrait"],
   "as": "habitat.json regions.stamp: the same picture, size and look (stampCase); no postmark in the first build",
   "portrayed": {"slice": "spread-gilt-corner-16x16", "rect": [976, 64, 16, 16], "at": [104, 0], "sprite": "1:1, undimmed",
                 "when": "the mibi is portrayed (always, in this state)",
                 "rule": "in the label's top-right corner, never over the stamp's cells: its opaque pixels stay clear of the largest stamp (104 at 880, 72) by 1 px on the diagonal (measured on the master)"}}
  ```
- **`focus.portrait`**: `{"initial": "room", "roomKey": "room", "roomAt": [280, 224, 32, 32], "fallback": "none", "targets": {}, "graph": {"room": {"up": "none", "down": "none", "left": "none", "right": "none"}}, "room": "the ring on nothing; view only"}`.
- **`bottomLine.portrait`**: `{"action": null, "context": "strings.portraitContext (copywriter, CW-2)", "back": "{name}", "capX": "1008 − the name's width − 20"}`.
- **`masters.placeholders`**: `{"rule": "a derived pose card or thumb whose habit has no signed key shows the derived stand and is a placeholder (\"habit key owed\"), never a delivery; no golden may show one", "today": ["S01 shake-dry", "S01 calm", "every S02 and S03 habit"]}`.
- **`strings.heading.portrait`**: `"{name}'s portrait"`. This is the 19:09 mock's stand-in; the words are the copywriter's (CW-2).
- **`strings.portraitContext`**: `null`. It is a slot, CW-2.
- **`strings.lookPortrait`**: `null`. It is a slot, CW-1, and is used on Habitat.

### Removed

- `regions.glass.pictures.pose` value `"sitting-backdrop-plain-544x408"`. It is replaced as above.
- `regions.cards.places`, `regions.cards.card.chosen`, `regions.cards.card.pose` (`"pose-{species}-{habit}-96x96"`) and `regions.cards.component`.
- `regions.chosen.places` and `regions.chosen.component`.
- `regions.steps.places`, `regions.steps.tile` (the thumb at 256 and the hand-passed 48) and `regions.steps.states`.
- `regions.resident.asset` ("the mibi's standard painting …").
- `colours.card.chosen`, plus `colours.deck` and `colours.strip` (now plates).
- From `masters.list`: `sitting-backdrop-plain-544x408`; `pose-{species}-{habit}-96x96 …`; `pose-{species}-{habit}-48x48, hand-passed from the 96`.
- `strings.welcomePlate` (GD-2; game designer, 20:17 §2).
- From `home.plate.lines`: the second line `"strings.welcomePlate, only when begin gave a waiting welcome sitting (sitting.mjs beginSitting, checkWelcome)"`. With it go `home.plate.height` "36, or 56 with the welcome" and the two-line example. This answers review note 6.
- `home.slot` (it becomes `home.berth`, above).
- `home.bay`. It moves to the Cargo pass (16.13).
- The `buildChanges` line "sitting.mjs offer gives the poses in the order seen (habitsOf); the face orders them by the species frame's habits". It is stale at ae0afe65.

### Other specs (one line each)
- **`habitat.json`:**
  - `regions.stamp.portrayed` is added, the same object as sitting.json `regions.stamp.portrayed`, with `when` "m.portrait is set (portrayed)" and `inStates` `["rest", "meet", "out"]`;
  - `drawOrder` gains `stamp.portrayed` after `stamp`;
  - `bottomLine.portrait.portrayed` becomes `{"action": "strings.lookPortrait", "context": "strings.portrayed", "when": "props regions.portrait.picture is not \"\"; else action null"}`;
  - `focus.entry.backFromPortrait` is `"portrait"`.
- **`frame.json`:**
  - `navigation.screens.sitting.steps`: from the pose step, and from the portrait, ← goes to Habitat with the ring on Portrait;
  - `navigation.jumps` gains the Cargo end jump to `sitting`/`portrait`, as in the 19:09 pass §6, present only while `regions.portrait.offeredFrom` lists `cargo-end`.
- **`cargo.json`:**
  - `keys.confirm.end`: the portrait jump first, then "Look at the pods";
  - `dockCrates.sitting.revealNote` becomes "the reveal is the sitting's state portrait (sitting.json)".


## 2. Each state's layout

The rects are all as in the 19:09 pass §3. Below is only what shows.

| # | State | Window | Gilt | Deck | Steps | Focus · bottom line |
|---|---|---|---|---|---|---|
| 1 | **pose** | Habitat's `vivarium-near-{light}` in the hour's light. Resident: the focused card's picture at the Habitat factor (curl for `sleep-curled`; the stand for a habit with no signed key). Tag at 404 | — | heading; cards (≤ 6) on `plate-well-120x120`, each this mibi's habit key at 96, day light | 0 current (`-shown`), 1 and 2 ahead | card.i, ring rect 6, lift 2 · `thisPose` · habit phrase · ← {name} |
| 2 | **place** | The focused place's backdrop in its **day light**, by the 200 ms dither. Resident: the chosen pose's picture, **ungraded** | — | heading; place cards | 0 done (derived 48 thumb), 1 current, 2 ahead | as 1 · `thisPlace` · place word · ← Pose |
| 3 | **confirm** | the chosen place, day light; resident ungraded; tag | rest | heading; the chosen pair | 0 and 1 done, 2 current | room · `portray` · `once` · ← Place |
| 4 | **confirm, armed** | as 3 | lit | as 3 | as 3 | room armed · `portrayAgain` · `once` · ← Place |
| 5 | **begin** (480 ms held) | as 3 | the lit gilt dithers out (0–300 ms) | as 3 | as 3 | held · none |
| → | **Habitat, painting** | the screen dither at 300 ms; the ring on Portrait (painting); the plate is **`beganPlate` alone** at (399, 514, 226, 36). If begin brought the next sitting forward, Home's berth shows its held frame on Home's next draw: no word and no count, the same for a welcome or a moment | | | | |
| 6 | **portrait** | `portrait:<d16>:528x392` 1:1 at (32, 64, 528, 392); the resident and tag are slots | **rest** | heading at 248 (20 px, or 16); the chosen pair (derived pose 96, place 96); the **stamp** at (872, 64, 120, 120) with the **portrayed corner** at (976, 64, 16, 16); no postmark | all done; Portray's thumb is the 48 × 40 frame with the 40 × 30 | room, no targets · no action · `portraitContext` slot · ← {name} |

**Edge cases (unchanged except where marked):**
- One habit, or one place: one card.
- A Lift mid-ceremony: the choices are kept, and begin goes read-only with `portraitOut` until the Dock (GD-1, agreed).
- A room key drops the choices; nothing is spent.
- **New: a juvenile sits** (GD answer 1). Its cards and window are derived in the same way (the curl is 54 × 41 on the 96 card). No layout change.
- **New: a placeholder pose card** (S01 shake-dry and calm today) draws the derived stand. It is allowed on screen in a build and in no golden.


**ARCH-2: the object budget and the props names.**
- **The budget.** sitting.c's own nodes must be ≤ 64 in its largest state (pose with 6 cards; about 45 by count: stage 2, window and glass 5, resident 2, tag 3, deck 1, heading 1, cards 12, strip 1, steps 10, ring up to 4, plus the frame's own). The whole scene stays under the 400-object budget (prim.c MAX_OBJ note), measured with layer-check `objects` on every Sitting state. **Direct-primitive ratchet budget: 0** (face-ui-kit §5 rule 3).
- **The components.** kit_stage, word_livingWindow (with from/level), kit_resident, kit_nameTag, kit_tiles (cards, chosen, steps), kit_stamp (with corner), `v_slot` for the plates, gilt, portrait, wells and thumbs, `v_line` for the heading and step words, and word_focusRing.
- **The props** (`sitting.props.json`, the builder `views/sitting-props.mjs`):
  ```
  { props: { state: "pose"|"place"|"confirm"|"begin"|"portrait",
      regions: { stage: { room: [id] }, glass: { picture }, resident: { id, name, stage, picture, figure, pose },
        nameTag: { text }, portrait: { picture }, gilt: { picture }, deck: { plate }, heading: { text },
        cards: { items: [{ picture, well, pose|place }] }, chosen: { items: [{ picture, well }] },
        stamp: { size, N, cell, plate, asset, corner }, strip: { plate },
        steps: { items: [{ state, word, picture, well, frame }] } },
      focus: { cur, targets, armed } },
    line, requests }
  ```
  `gilt.picture` is `sitting-gilt-560x424`, `sitting-gilt-lit-560x424` or `""`. The window's from-ids are not props: the host passes them in the dither event, as `events.swap` does.
- **UI memory** (host): `UI.sit = { step, pose, place, focus, armed, from: "habitat"|"cargo", prev: { glass, resident } }`. A room key clears it (it joins `DROPS_ON_ROOM_KEY`).
- **Node ids:** `glass`, `glass.dither`, `resident`, `resident.dither`, `nameTag.*` (kit), `portrait`, `gilt`, `deck`, `heading`, `card.<i>.well`, `card.<i>.pic`, `chosen.<i>.well`, `chosen.<i>.pic`, `stamp.case|clip|stamp|front|corner` (kit), `strip`, `step.<i>.well`, `step.<i>.word`, `step.<i>.thumb`, `step.2.frame`.
- **The door:** `nav.mjs BUILT` gains `"sitting"` as entry 9. This is the last step, in S3, because it opens Habitat's door.

