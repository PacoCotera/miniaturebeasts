# Fix 5, Cargo: no dead fields (UI/UX layout spec)

**Amended 2026-10-15 08:05 (America/Mexico_City), UI/UX, gate batch 1** (X35 blocker b; `specs/station-gate-batch1-plan.md`, accepted by the programme lead at 08:00): the report sits in the housing. See "Amendment, gate batch 1: the report in the housing" at the end. It supersedes R6's construction, §4's report bullet and AR5's look. R6's rects, heights and rows stand.

Fresh UI/UX designer, for the Station lead. Written 2026-10-15 from 02:09 (America/Mexico_City). Layout, rules and states only. The art is the art director's (§9 asks for it), the build is the builder's, and the architecture stays as it is on main. The Station lead commits this file.

**Read at.** Public main `ccab10c1`, the `masters-pods` branch `de07769d`, and `station-global-specs` `28613a87`. I looked at all 18 Cargo goldens on main at 1×, plus the signed bay at 1× (`art/station-masters/pods/concepts/cargo-bay/cargo-bay-1x-check.png`).

**Authority** (precedence: (recorded decision) and the code on main win over every design document):
- the creative director's ranked list, (audit record) (final 5b32e68): fix 5 ("Cargo's bay: the crates on a painted bay floor; the report inside the device, not a dark modal"), fix 2 (one device-material kit; "Cargo (bay floor, report)"), fix 9 ("the checker dim on Cargo goes", UI/UX) and fix 10 (crate fringes, haul items grounded). Its Cargo verdict is "Fail (the weakest): near-black field; the report is a dark modal".
- the audits, (audit record) (Cargo B: the bay is a black void; the teal banner; the report dim; N: the report panel overruns the bay frame and is a navy card; the pod tray is hairline boxes; the crates have a dark fringe and one crate is pinned left with 700 px of black) and `report-design.md` (Cargo B: a black void; a black frame 0 and a dithered grey veil at the end; the report is a text table).
- my predecessor's inputs, (audit record) F5 (the bare field and the teal banner; crates centred as a group; the ribbon sized to its words) and F1, and `specs/station-global-fix-plan.md` fix 5 ("0; the bay floor is in the approved ≤ 11.7").
- the rules in force:
  - the painted language (decided);
  - "Every state composed", `design/style-guide/station-layouts.md` rules 1–5 on `station-global-specs` 28613a87;
  - the freeze (nothing visible merges until Cargo passes its gate);
  - the ribbon ruling (bark fill, gold edge, bone words; X4 plan; the gold edge confirmed by UI/UX at 00:21 on 10-12);
  - the stamp-case look (fix 4 part B, masters-pods 001bcd51).

## 0. What is dead on main today (measured)

| State (golden) | Dead field | Why |
| --- | --- | --- |
| `cargo-bay-one`, `-bay` | The bay 16,48 992×320 is one flat fill (29,35,43); one crate sits at 64,120, with about 700 px of black beside it | The bay is the `panel` component. The signed bay painting exists but has not been placed |
| `cargo-bay-empty` | The whole 992×320 bay is black | "An empty place shows the floor"; there is no floor |
| `cargo-bay-away` | A lavender 976×304 plate | A flat-box stand-in (`ph cargo-bay-shut-976x304`) on a golden: rule 3 |
| `cargo-bay-waiting` | A black bay with a 24×24 mark at 968,328 | The pods waiting in the bay are not shown |
| `cargo-opening-0`, `-90` | Frame 0 is a black stage; at 90 ms, a checker | The stage dither of `void` (intents/cargo.mjs:60, :63) |
| `cargo-opening-200` … `-1650` | The closer and the containers stand on a flat dark stage, and the containers stand on nothing | The bay is not drawn in the opening; there is no ground |
| `cargo-opening-end` | A 50 % checker veil over the report | The end dither (intents/cargo.mjs:72), captured mid-clear |
| `cargo-report*` | A navy card 232,72 560×≤320 with a drop shadow over a black bay, overrunning the bay's bottom (368) to 392 | A flat app panel (`colours.report`), sized by `maxHeight` 320 |
| every state | The rack: a flat panel with six 1 px hairline well outlines | A hollow stand-in (`ph cargo-well-96x128`, hollow) and a bare panel: rules 2 and 3 |
| opening | "First crate home": 3 words in a 608 px teal bar | A fixed width; the colour is fix 9's (first wave) |

## 1. Purpose (unchanged)

The player sees how much came home, opens it with one press, watches each crate's pods go to the rack, and reads in one plate what came home. **Reads first:** the crates in the bay. What changes is the frame around them: every state is now a composition of the device's own painted parts. The bay is the signed painting, its door, the crate on its floor, the plate on its door and the rack's insert. Nothing is a flat field.

## 2. Elements: what changes

| Element | Main today | This spec |
| --- | --- | --- |
| The bay | `panel` component, flat `ground` inside; away, a lavender PH plate | The signed bay `cargo-bay-992x320` (AD, masters-pods e3a50bdf), 1:1 at 16,48, in **every** state. Its door, `cargo-bay-shut-976x304`, goes 1:1 at 24,56 when the bay holds nothing, and in the report |
| The crates in the bay | Places fixed at x 64, 384, 704, filled from the left | Centred as a group on 512, on a 320 pitch, by count (R3); each stands on the floor with a contact shadow |
| Pods waiting for a well | A 24×24 mark at 968,328 | The pods themselves on the bay's floor, at most three, each with the signed `pod-collection-shadow` (R4). The mark leaves Cargo; it stays on Home's module |
| One crate opening | On a flat stage, feet at 385 | On the bay's floor, brought forward: the closer at 296,72, feet 337, with a contact shadow. The containers stand on the same floor, feet 336, with contact shadows (R5) |
| The ribbon | 208,56 608×40, fixed width | Same y. The width fits the words (R9). The colour is fix 9's, already ruled (bark, gold, bone) |
| Transitions inside Cargo | Stage dither of `void`: a black frame 0 and a checker veil | Cuts (R8). No dim, no veil, no dither between Cargo's own steps |
| The report | A navy card with a drop shadow over the void, up to 320 tall, overrunning the bay | A plate set into the shut bay door, the stamp case's construction, up to 288 tall, centred in the door (R6) |
| The rack | A `panel` plus six hollow 96×128 outlines | One painted insert, `cargo-rack-992x168`, at 16,384: the sage housing strip with six fitted wells (R7) |

## 3. The rules (Cargo)

**R1, the bay is the painting.** The open bay `cargo-bay-992x320` is drawn 1:1 at (16, 48) in the bay, opening and report states. It is never a `panel`, a fill or a rule set drawn by the face. Inside the painting, the back wall runs from y 64 to about 238. The floor runs from about 240 to 352, with its lip to 356, and the rim is 8 px. These numbers are measured, and nothing is placed by them except the feet lines below.

**R2, the door follows what the bay holds.** The bay is **open** when it holds something: a walk crate (docked), a ready sitting crate, or a pod waiting for a well, docked or away. It is **shut** when it holds nothing, docked or away, and always in the report (the plate hangs on the door). In the opening it is open, and only the closer is on its floor.
- Shut: `cargo-bay-shut-976x304` is drawn 1:1 at (24, 56) over the open bay.
- Each change of the door is a cut on the frame that changes what the bay holds:
  - the Dock with crates;
  - a Lift that takes the walk crates;
  - the report closing (onto the door, or onto the open bay when pods wait);
  - the last waiting pod landing in a well.
- This replaces "away: the lid shut; docked: open". The away rule's one exception (a sitting crate opens the bay) becomes the general rule.
- An open bay with nothing in it is never drawn. That state would be "an empty field with a caption in it", which cd-global says the owner would reject.

**R3, the crates are centred as a group.** n = min(walk crates, 3) crates stand on the 320 pitch about x 512, at y 120, 256×176 each:

| n | Places |
| --- | --- |
| 1 | (384, 120) |
| 2 | (224, 120), (544, 120) |
| 3 | (64, 120), (384, 120), (704, 120) |

- The places are fixed by n on the Dock frame. Crates sliding in never re-centre.
- Order: walk crates left to right in the order they open. Sitting crates go after them, at the group's right end, and stay out of the build until their reveal is designed (unchanged).
- More than three (developer only): the first three show, as now.
- The feet line is y 282 (the sealed crate's last ink row is +162). That is the back of the floor, where the art director signed it.
- Each crate's contact shadow `crate-shadow-256x24` sits at (place.x, 270, 256, 24), centred on the feet line (offGrid). It shows from the frame its crate has landed. A crate still sliding casts none.
- The sitting crate's fill lamp moves with its place: (place.x + 122, 304), unchanged in form.

**R4, waiting pods stand on the floor.** While pods wait for a free well and the bay is not in the opening or the report, the first three of `st.waiting`, oldest first, stand on the floor:
- Size: the collection class, 88×112, the same picture as the rack (`pod:{species}:{i|s}:88x112`). Feet on y 280, box y 168, 104 apart about x 512:
  - one: axis 512;
  - two: 460, 564;
  - three: 408, 512, 616.
- Box: (axis − 44, 168, 88, 112).
- Shadow: the signed `pod-collection-shadow` (104×14) at (axis − 52, 273, 104, 14), by Pods' rule (feet − v_half(14)).
- The context line counts every waiting pod, as now. `regions.waiting` and its mark leave Cargo.

**R5, the crate brought forward stands on the floor.** Every opening step happens on the open bay:
- **Bay:** no bay crates and no waiting pods are drawn.
- **Closer:** `crate` (296, 72, 432, 272). Its feet are on y 337, the sealed slice's last ink row being +265, on the front of the floor.
- **Closer's shadow:** `crate-shadow-432x24` at (296, 325, 432, 24), centred on the feet (offGrid), in every step.
- **Pods in the crate:** y 152 → 104, at the same x (364/416/468/520/572). They stay 32 px under the closer's top, as now.
- **Containers:** feet 384 → 336, so `stores` (184, 272, 600, 64), with energy (184, 272), data (240, 272) and essence (736, 272), each 48×64. Data stays 8 px clear of the closer.
- **Containers' shadows:** each container shown casts `cargo-store-shadow-48x14` at (place.x, 329, 48, 14), centred on 336 (offGrid). It is shown and hidden with its container.
- **Travel:** (176, 104, 672, 440) → (176, 72, 672, 472). It still holds the closer, the containers and the six wells (to y 544). The path, the ease and the timings do not change.

**R6, the report is a plate on the bay's door.** The card leaves the void. It becomes `cargo-report-plate-560x{h}`, a dim plate moulded into the sage door (§9 AR5), drawn 1:1. Its rows are set on it as today.
- **Height:** h = 104 + 24 × (crates + Probe row) + (world ? 32 + 24 × lines : 0) + (goal ? 8 + 24 × (1 + meanwhile) : 0), never more than **288**. When it would pass 288, the world lines drop from the last until it fits, as now.
  - The world block's gap above goes 16 → 8, the same rhythm as Gathered and the goal.
  - h is always a multiple of 8, from 128 (one crate) to 288.
- **Place:** x 232, w 560, centred on 512. y = 64 + 8 × floor((288 − h) / 16), so the plate is centred on the door's middle (y 208): h 288 → 64; h 232 → 88; h 160 → 128; h 128 → 144. Its bottom is never below 352, 8 px inside the door, and it never crosses the bay frame or comes near the rack.
- **Inside the plate:** the rows keep their measures relative to the plate's top-left:
  - heading at +16, 32 tall;
  - rows from +56 on a 24 pitch;
  - lead column +16 to +144;
  - content from +152;
  - reach from +328;
  - Gathered and the goal 8 px under the row above.
- **Retired:** the drop shadow (`shadow` [2, 3]), the face-drawn fill, edge and top rule. The plate's rim and shade are painted.
- **Text colours unchanged** (heading, line and figure in `bone`, lead in `mist`, the 4×4 bullet in `bevel`). They are now measured on the plate (§4).
- **The fullest goldened report** (`cargo-report`: three crates, Probe, two world lines, goal) comes to 312 under the new rule, so it keeps one world line, at h 288. This is expected: X10 already rules the drop from the last.

**R7, the rack is one painted insert.** The rack region becomes (16, 384, 992, 168), the full stage width under the bay with a 16 px seam:
- **Picture:** `cargo-rack-992x168` (§9 AR4) is drawn 1:1. It is the device's sage strip with six fitted wells painted in.
- **Wells:** they keep their rects (184 + 112 i, 408, 96, 128) and the pod at well + (4, 8). The travel, the order and the hand-off do not change.
- **Retired:** the face draws no panel, no top rule and no well sprite. An empty well is the painting's own empty well, an object, not an outline.

**R8, cuts inside Cargo; no dim.** Cargo's own steps are cuts:
- the bay to the first crate (at 0);
- one crate to the next (at k × 3000);
- the last crate to the report (at crates × 3000).

No stage dither, no veil and no dim are drawn behind the report: the door is behind it, lit as painted. The event lengths and holds do not change (`byCrates` 3180/3200 …). The report stands still for the event's last 180 ms and the hold's 200, so a key pressed during the last crate cannot close it before it is seen. The screen change into and out of Cargo keeps the frame's own transition: not this spec.

**R9, the ribbon fits its words.** The ribbon region keeps y 56, h 40, 20 px medium and pad 16.
- **Width:** w = the words' width + 2 × 16, rounded up to 8, at least 160. x = 512 − w / 2: centred, 4 px off the grid at most, as the layouts allow on an axis.
- **Example:** the longest, "Developer crate home" (212 px), gives 248 → x 388. Shorter words take at least 160 (x 432).
- **Words** never exceed 6. With no words (before 500 ms) the ribbon draws nothing.
- **Clearance:** it shows only from 500 ms, when the closer is `open`, whose ink starts at +52 (y 124). The ribbon's bottom (96) is 28 px above that ink and 8 px above the pods' boxes (104). It does not overlap the sealed or opening slices, because it is not drawn while they show.
- **Colours:** `colours.ribbon` is fix 9's first-wave edit (bark, gold, bone), not this spec's.

## 4. Art direction (for the art director's look, not the layout)

- **One key light, top left**, as the signed bay. Every new piece (rack insert, report plate, shadows) is lit from there, and each shadow falls down and slightly right.
- **One material family:** the bay's sage housing, matte and handled. The report plate is built like the stamp case: a dim well moulded into the sage door, a lit top-left rim, a shaded lower-right and dark rubber corners. Its floor is dark enough for type, with no glass front, sheen, glow or text of its own.
- **Gold belongs to the ribbon** (and the signed sitting crate's brass). The report plate and the rack carry no gold, no teal, no white and no amber ("nothing on Cargo's stage is amber" stays).
- **Measured at the gate (1×), on the plate floor behind each row box:** `bone` at least 7:1 and `mist` at least 4.5:1. The plate is the report's main object and may be the brightest thing in that state. The door behind it must not be brighter than the plate's rim.
- **What the stage ground may show:** only the seams, all 16 px or less: x 0–16 and 1008–1024; y 40–48, 368–384 and 552–562. No field.

## 5. Composition: the regions (`cargo.json`, new values)

| Region | Rect | Draw order | Notes |
| --- | --- | --- | --- |
| `bay` | 16, 48, 992, 320 | 1 | `slices.open` `cargo-bay-992x320`; in bay, opening and report |
| `bay.door` | 24, 56, 976, 304 | 2 | `slices.shut` `cargo-bay-shut-976x304`; by R2 |
| `crates` | by count (R3), group inside 64, 120, 896, 176 | 3 | Each place's shadow under it (270, h 24), then the crate; clipped to the inside 24, 56, 976, 304 while sliding |
| `waitingPods` | by count (R4), inside 352, 168, 320, 120 | 3 | Shadows, then pods; bay state only |
| `crate` (closer) | 296, 72, 432, 272 | 3 | Shadow 296, 325, 432, 24 under it; opening only |
| `stores` | 184, 272, 600, 64 | 4 | Shadows 48×14 at y 329 under each; opening only, from 800 ms |
| `rack` | 16, 384, 992, 168 | 5 | `cargo-rack-992x168`; wells and pods as now |
| `travel` | 176, 72, 672, 472 | 6 | Opening only |
| `report` | 232, y(h), 560, h ≤ 288 | 6 | Report only, over the door |
| `ribbon` | (512 − w/2), 56, w, 40, w ≤ 608 | 7 | Opening only, from 500 ms |

## 6. States: every state composed (rules 1–5, checked per state)

Each row names the main object and its rect, lists what else is drawn (every one a picture or words that hold content), and lists what is drawn with no size. "Ready" is when the state can go to its gate.

| State | Main object, rect | Also drawn | No size | Ready when |
| --- | --- | --- | --- | --- |
| **Bay, crates (1–3), docked**; "three crates wait" is n = 3 | `crates`, the group: n1 (384,120,256,176); n2 (224,120,576,176); n3 (64,120,896,176) | Open bay, crate shadows, rack insert and its pods | Door, waiting pods, report, ribbon | AR1, AR2, AR4 |
| **Crates arriving** (the Dock while Cargo shows; `events.crateIn`, 500 ms each, 250 apart) | `crates` as above, sliding in from 64 above, clipped to the inside | Open bay (opened as a cut on the Dock frame), each shadow from its landing frame, rack | Door | AR1, AR2, AR4 |
| **More than three crates** (developer only) | The first three, as n3 | As n3 | Others not drawn | as above |
| **Bay empty**, docked or away (holds nothing) | `bay.door`, the shut door (24,56,976,304): an object by rule 2 | Open bay under it, rack | Crates, waiting pods | AR1, AR4 |
| **Pods wait for a well**, docked or away | `waitingPods`: n1 (468,168,88,112); n2 (416,168,192,112); n3 (364,168,296,112) | Open bay, pod shadows, rack (full) | Door, crates | AR1, AR4 |
| **Opening, crate k, 0–199 ms** (sealed) | `crate` closer (296,72,432,272), sealed | Open bay, closer shadow, rack | Ribbon (no words yet), stores, travel | AR1, AR2, AR4 |
| **Opening, 200–499** (lid lifting) | The closer, `opening` slice | As above, pods in the crate from the open step | Ribbon | as above |
| **Opening, 500–3000** (open, the ribbon, containers from 800, pods travelling from 1200, the turn at 1650) | The closer, `open` | Ribbon (fitted), containers with shadows, pods in the crate and travelling, rack landing them | — | + AR3 |
| **Later crates** (k ≥ 1: a cut at k × 3000 to the next closer, sealed) | The closer, sealed | As crate 0 | — | as above |
| **Report** (a cut at crates × 3000) | `report` plate (232, y(h), 560, h) | Door (always shut here), rack with the new pods | Crates, waiting pods, ribbon, stores, veil | AR1, AR4, AR5 |
| **Report closes** | Per R2: the door (nothing held), or the waiting pods on the open bay | — | — | as above |
| **Only sitting crates opened** (not built yet: sitting crates stay out) | Per R2 | — | — | not designed (unchanged) |

**The gate's check** (rule 1, how the gate checks it): on every Cargo golden at 1×, the reviewer finds the main object above drawn at its rect, and finds every other drawn rectangle mapped to a row above. Three things fail the screen wherever they are: a flat fill, an outline, or the stage ground showing beyond the seams in §4.

## 7. Interactions, focus and the bottom line

- **Focus:** none changes. Cargo has no targets and the ring is on nothing. The report plate, the door, the crates and the waiting pods are not targets. Every key does what `cargo.json keys` and `focus` say today, the report's "any key closes it" included.
- **The bottom line.** All strings are the signed ones already in `cargo.json`; no new string.
  1. **Crates arriving:** the context counts the crates **drawn**. A crate counts from the frame its slide starts (i × 250 ms after the Dock), so the words never count a crate the player cannot see. On main's crates-arriving golden (375 ms, two shown) that is "two sealed crates", then "three sealed crates" at 500 ms. With reduced motion every crate is in on the Dock frame. This closes the owed UI/UX timing rule ("three crates wait" with two shown, cd-global fix 13) for Cargo's own line. Home's notice is Home's.
  2. **Pods waiting while away:** the context reads the waiting line ("two pods wait for a well", "a pod waits for a well") before the away line, because the bay is open and shows them (R2). The order is crates, waiting, away, empty.
  3. **Empty, docked:** "the bay is empty", now over the shut door. Copywriter owed: confirm the signed line reads right over a shut door. No new string is needed unless the copywriter supplies one.
  4. **Unchanged:** ✓ Open the bay only when a crate is ready; the opening shows no ✓ and no ←; the report keeps ✓ See the new pod(s) / Done and ← Cargo.
- **Events:**
  - `opening.crate.0` changes from "the dither (16 levels) … 180 ms" to "a cut at 0 to this crate's closer, sealed, on the open bay" (ms 0).
  - `opening.end` changes from "the dither back to the bay, empty, with the report card over it" to "a cut to the report: the door shut, the plate on it; the report stands still to the event's end (180) and the hold (200)".
  - Lengths and holds do not change.
  - `crateIn`: unchanged, except that the door opens as a cut on the Dock frame (R2) and each shadow appears on its crate's landing frame.

## 8. Builder-facing edit list (file, key, old → new)

The builder starts from a branch off main once the first wave (fix 9, `colours.ribbon`) and the harness fix are in. Both touch `cargo.json` and the goldens, so this takes the goldens last. No PR during the freeze.

**`prototypes/ui/specs/station/cargo.json`**

| Key | Old | New |
| --- | --- | --- |
| `regions.bay` (:14) | `component "panel"`, `inStates ["bay","report"]`, `states { shut: away…, open: docked… }` | `"build": "bay"`, `inStates ["bay","opening","report"]`, `"slices": { "open": "cargo-bay-992x320", "shut": "cargo-bay-shut-976x304" }`, `"door": [24,56,976,304]`, `"rule": "R2: open when it holds a walk crate, a ready sitting crate or a waiting pod, and in the opening; shut when it holds nothing, and in the report; each change a cut"` (rect and inside unchanged) |
| `regions.crates.places` | the fixed three | `"byCount": { "1": [[384,120,256,176]], "2": [[224,120,256,176],[544,120,256,176]], "3": [[64,120,256,176],[384,120,256,176],[704,120,256,176]] }`; `order` → "walk crates left to right in the order they open, sitting after them; places fixed by n on the Dock frame"; add `"shadow": { "slice": "crate-shadow-256x24", "at": [0,150], "size": [256,24], "feetY": 282, "offGrid": "centred on the feet", "when": "from the frame its crate has landed" }`; `sitting.lamp.rule` → "(place.x + 122, 304) of its place by count" |
| `regions.waiting` (:24) | the 24×24 mark at 968,328 | **removed**, and replaced by `"waitingPods": { "rect": [352,168,320,120], "build": "crates", "part": "waiting", "inStates": ["bay"], "max": 3, "pod": { "class": "collection", "size": [88,112] }, "feetY": 280, "axes": { "1": [512], "2": [460,564], "3": [408,512,616] }, "box": "(axis − 44, 168, 88, 112)", "shadow": { "slice": "pod-collection-shadow", "size": [104,14], "place": "(axis − 52, 273, 104, 14), Pods' rule", "offGrid": "centred on the feet" }, "order": "st.waiting, oldest first; the context counts all" }` (the rect is on the 8 px grid and holds the three pods and their shadows: x 356 to 668, y 168 to 287) |
| `regions.rack` (:25) | `rect [176,400,672,144]`, `component "panel"` | `rect [16,384,992,168]`, `"build": "rack"`, `"slice": "cargo-rack-992x168"`; `wells` and `pod` unchanged; `rule` adds "the wells are the insert's painting; the face draws no panel, rule or well" |
| `regions.ribbon` (:31) | `rect [208,56,608,40]` fixed | `rect [208,56,608,40]` as the bound; add `"fit": { "w": "words + 2 × pad, rounded up to 8, at least 160", "x": "512 − w / 2", "maxWords": 6, "empty": "draws nothing" }` |
| `regions.crate.rect` (:32) | `[296,120,432,272]` | `[296,72,432,272]`; add `"feetY": 337`, `"shadow": { "slice": "crate-shadow-432x24", "rect": [296,325,432,24], "offGrid": "centred on the feet", "steps": "every step of the opening" }`; `pods.y` 152 → 104 and every `pods.places` y 152 → 104 |
| `regions.stores` (:37) | `rect [184,320,600,64]`, `feetY 384`, places y 320 | `rect [184,272,600,64]`, `feetY 336`, places y 272; add `"shadow": { "slice": "cargo-store-shadow-48x14", "at": [0,57], "size": [48,14], "offGrid": "centred on 336", "when": "with its container" }`; `at`: "…until the crate's end" (no "dither") |
| `regions.travel` (:38) | `[176,104,672,440]` | `[176,72,672,472]` |
| `regions.report.rect`, `maxHeight` | `[232,72,560,312]`, 320 | `[232,64,560,288]`, 288; add `"y": "64 + 8 × floor((288 − h) / 16)"`, `"slice": "cargo-report-plate-560x{h}"`, `"heights": "128 to 288 by 8"` |
| `regions.report.shadow` | `[2,3]` | removed |
| `regions.report.world.gapAbove` (:46) | 16 | 8 |
| `regions.report.height` | "104 + … (world lines ? 40 + 24 × lines …) …, never past maxHeight 320" | "104 + 24 × (crates + probe row) + (world lines ? 32 + 24 × lines : 0) + (goal ? 8 + 24 × (1 + meanwhile) : 0), never past maxHeight 288" |
| `regions.report.full` | `heading 88, crates [128,152,176], gathered 208, probe 232, world 272, lines [296,320,344], bottom 384` | at h 288, y 64: `heading 80, crates [120,144,168], gathered 200, probe 224, world 256, lines [280], goal 312, bottom 352` |
| `events.opening.crate.0` (:61) | `{ at 0, ms 180, do "the dither …" }` | `{ "at": 0, "ms": 0, "do": "a cut to this crate's closer, sealed, on the open bay (R8): no dither, no veil" }` |
| `events.opening.end` (:68) | `ms 180, do "the dither back …"` | `ms 180, do "a cut to the report at crates × 3000: the door shut, the plate on it; the report stands still for the last 180 ms and the hold's 200"` |
| `notes.motion` | "…the report shows at the end" | unchanged, and add: "Cargo's own steps are cuts with or without motion (R8)" |
| `line.bay` (:87) | order crates, empty, away, waiting (as the view applies it) | add `"order": ["crates", "waiting", "away", "empty"]`; `crates.subject` adds "while crates slide in, the count of crates drawn (a crate counts from its slide's start)" |
| `colours.bay`, `colours.rack` (:96, :98) | panel, bevel, hairline … | removed (painted) |
| `colours.report` (:100) | fill, edge, top, shadow, heading, lead, line, figure, bullet | keep `heading, lead, line, figure, bullet`; remove `fill, edge, top, shadow`; add `"contrast": { "bone": 7, "mist": 4.5, "note": "measured on the plate floor behind each row box, at 1×" }` |
| `placeholders` (:115) | `bay "992×320 panel; …"`, `ribbon "608×40"` | `bay` → "the signed masters (e3a50bdf)"; add `rack` `cargo-rack-992x168`, `report` `cargo-report-plate-560x128…288`, `crate-shadow-256x24`, `crate-shadow-432x24`, `cargo-store-shadow-48x14`: each draws nothing until signed (rule 4) |
| `status` | — | append "fix 5 (specs/station-fix5-cargo-spec.md): the bay painted in every state, the door by contents, the plate on the door, the rack insert, cuts" |

**`prototypes/ui/specs/station/cargo.props.json`**
- `regions.bay`: `{state, lid}` → `{ "state": open|shut, "open": "<id>", "door": "<id or ''>" }`.
- `regions.crates`: add `"shadow": "<id>"`.
- `regions.waiting` (string) → `regions.waitingPods`: `{ "pods": [ids], "shadow": "<id>" }`.
- `regions.rack`: add `"insert": "<id>"`; the well items drop `well`.
- `$defs.crate`: add `"shadow"` and `"storeShadow"`.
- `regions.report`: add `"plate": "<id>"`.

**`prototypes/station/src/views/cargo-props.mjs`**
- :32 `wellPic` (hollow ph) → removed. Request `cargo-rack-992x168` as `rack.insert`.
- :39 `waiting` → `waitingPods`: `st.waiting.slice(0, 3).map(podPic)` and `pod-collection-shadow`, only when state is `bay`.
- :41–44 `regions.bay`: state by R2 (`bay`: open iff crates shown > 0 or `st.waiting.length`; `opening`: open; `report`: shut). Request `cargo-bay-992x320` always, and `cargo-bay-shut-976x304` when shut. No `ph`.
- :46 the crates: add the shadow id.
- :51 opening crates: add `shadow: crate-shadow-432x24` and `storeShadow: cargo-store-shadow-48x14`.
- :61–66 the line: order crates, waiting, away, empty. The crates' subject counts the crates drawn while `crateIn` plays: the host stages `ui.cargo.shown` at i × 250 ms. Name it as the builder likes; it is host state, not a rect.
- `reportOf` / `trimWorld` (:74–89): h by the new formula; `plate: cargo-report-plate-560x${h}`. The face's h and the view's h must agree (test).

**`prototypes/station/src/intents/cargo.mjs`**
- :60, :63, :72: remove the three `h.play({ kind: "dither", target: "stage" … })`. The state changes at those times stay.
- :14–15 `stepsOf`: `dither` reads `crate.0.ms` (now 0). Keep the field or rename it `cut`.
- The Dock handler while Cargo shows (`events.crateIn`) stages the drawn-crate count every 250 ms; with reduced motion, all at once.

**`prototypes/face/src/screens/cargo.c`**
- `build_bay` (:71–77): `v_sprite("bay", open, 16,48,992,320)`, then `door` at `regions.bay.door` when the props name one. Remove `word_panel`, `bay.top`, `bay.inside`.
- `cargo_words` (:223–237): in `opening`, call `build_bay()` first.
- `build_crates` (:78–91): places from `regions.crates.byCount.<n>`, and a shadow slot per place shown from its landing (`e >= each`), at (place.x, 270).
- New `build_waitingPods` replaces `build_waiting` (:92–95).
- `build_rack` (:52–68): `v_sprite("rack", insert, 16,384,992,168)`. Remove the panel, the top rule and the `rack.well.%d` sprites; the pods are as now.
- `build_opening` (:99–135):
  - closer shadow before `crate`;
  - store shadows before each container (same show rule);
  - the ribbon rect computed by `regions.ribbon.fit` from `v_measure(words, 20)` before `word_ribbon`.
- `build_reportCard` (:142–221):
  - draw `regions.report.plate` at (232, 64 + 8 × ((288 − h) / 16), 560, h);
  - remove the `report.shadow` rect, `word_panel` and `report.top`;
  - `y0` = that y.

**`prototypes/station/src/art.mjs`**
- :28 `cargo-bay-992x320` PH entry: removed when AR1 lands.
- :29 `cargo-well-96x128`: removed.
- Add PH rows (status `placeholder`, draw nothing) for `cargo-rack-992x168`, `cargo-report-plate-560x{128…288}`, `crate-shadow-256x24`, `crate-shadow-432x24` and `cargo-store-shadow-48x14`, until each is signed.
- Place the masters 1:1 with `place-masters.mjs --only --ids` as they land.

**Tools and tests**
- `prototypes/face/tools/cargo-regions.mjs`:
  - the bay as art at its rect in every state;
  - the door at `bay.door`;
  - crates, shadows and waiting pods inside the inside;
  - the report at (232, y(h), 560, h ≤ 288) with no shadow;
  - the ribbon inside its bound, centred on 512, w on the fit rule;
  - "the bay is not drawn in the opening" → "the bay is drawn in every state";
  - no `waiting` id; `stores.*` and their shadows at their places.
- `prototypes/face/tools/cargo-states.mjs`: drop `opening-90` from `STEPS` (it existed only to catch the dither half-cleared). The comment for `opening-0` becomes "the first frame: the closer, sealed, on the open bay".
- `prototypes/ui/tests/specs.test.mjs`, the Cargo block (:613–649), new invariants:
  - places by count centred on 512;
  - waiting pods inside the bay's inside;
  - rack.y − bay bottom = 16;
  - crate bottom ≤ bay inside bottom (360) and the closer's feet 337 on the floor;
  - the ribbon's bottom 8 px above the crate's pods (104);
  - the stores' feet = 336 and 8 px clear of the crate;
  - travel holds the crate and the wells;
  - the report at its fullest: 288 at y 64, bottom 352 ≤ 360;
  - y(h) on the 8 grid for every h in 128…288;
  - `byCrates` unchanged.
- `prototypes/station/tests/cargo-props.test.mjs` (:77–91): the bay state by contents (docked-empty shut, waiting-away open), no `lid` and no `waiting` mark, `waitingPods`, the line order and the drawn-crate count.
- `prototypes/face/tests/cargo.test.mjs` (:53, :71): sizes by kind (no `waiting` 24×24), scenes as now.

**Wireframes and docs** (docs are part of done)
- `design/style-guide/station-layouts/17-cargo-bay.svg/.png`, `17a-cargo-opening`, `17b-cargo-report`, `17c-cargo-shut`: redraw the boxes from §5 (17c: the door; 17b: the plate on the door). 17d is unchanged.
- `design/style-guide/station-layouts.md`, Cargo:
  - §3 Placement item 4: "the report plate on the bay's door";
  - §4 Art direction: the bay painted, the door by contents, the plate, the insert, no ribbon colour words;
  - §5: the tables from §5 and §6 here, the timeline rows 0 and 3000 as cuts, and the report's height rule (288, gap 8);
  - §6: the line order and the drawn-crate count;
  - "Placeholders in Cargo" and the masters table rows (bay, rack, plate, shadows).
- `design/proposals/lvgl-switch.md`:
  - :371 and :374: `regions.waiting` → `regions.waitingPods`;
  - :285: the dirty-area exemption names "Cargo's crate and end dithers". Those become one-frame cuts, which is the architect's line to word (§12).

## 9. Art requests to the art director (0, hand cuts; no paid call)

Every piece is lit from the top left. The art director signs each at 1× in a whole-screen Cargo capture, never as a lone slice. The studio cuts the mechanical ones from the art director's notes, under the 23:56 hand-cut rule; a cut rejected twice returns to the art director.

| # | Piece | Size and placement | What and light | Source | Who | Time |
| --- | --- | --- | --- | --- | --- | --- |
| AR1 | `cargo-bay-992x320`, `cargo-bay-shut-976x304` (**signed**, e3a50bdf) | 1:1 at (16,48) and (24,56) | Already signed. Move them from `concepts/cargo-bay/` into `slices/` with manifest rows, so `place-masters.mjs --only --ids` can place them. Re-judge at 1× with the crates centred (R3) | as signed | AD | 15 min |
| AR2 | `crate-shadow-256x24`, `crate-shadow-432x24`, plus the dark matte fringe removed from `crate-sealed-256x176`, `crate-sitting-256x176` and `crate-{sealed,opening,open}-432x272` (fix 10; same ids, same sizes) | Shadows at (place.x, 270) and (296, 325), centred on feet 282 and 337 | The house contact shadow (#1e1a22 at 110, soft edge, Bayer edge band), as wide as the crate's base ink (the 256 crate's ink spans x 8–248; the closer's 7–419), falling slightly right and down. It is a separate slice because the bay crates slide in: a baked shadow would float | the AD's queued crate-shadow recut (station.md 10-11 20:44) | studio from the AD's notes | 1 h |
| AR3 | `cargo-store-shadow-48x14` (one slice, used three times) | (place.x, 329) under energy, data and essence; centred on feet 336 | The same house shadow; the containers' ink is 33–43 px wide | the signed `pod-*-shadow` method | studio from notes | 15 min |
| AR4 | `cargo-rack-992x168` | 1:1 at (16, 384) | The device's sage strip under the bay, the bay rim's material and edge, with six fitted foam wells at (168 + 112 i, 24, 96, 128) in the slice (the screen's wells at 184 + 112 i, 408). The wells' floors are dark enough that a grey sealed pod (`pod-collection-sealed`) reads on them. No labels, lamps, text or gold | the open crate's fitted foam (`crate-open-432x272`) and the bay's rim | AD (a judgement cut) | 1 h 30 |
| AR5 | `cargo-report-plate-560x{h}`, h = 128 to 288 by 8 (21 slices) | 1:1 at (232, 64 + 8 × floor((288 − h)/16)), on the door | The stamp case's construction at 560 wide: a dim well moulded into the sage door, a lit top-left rim, a shaded lower-right, dark rubber corners, no glass, no sheen, no text. The floor is dark enough for `bone` ≥ 7:1 and `mist` ≥ 4.5:1 | the shut door and `room-stamp-case-152x152` (001bcd51) | AD paints and cuts the 560×288 master (1 h). The studio derives the 20 shorter heights by removing a feathered horizontal band from the middle, as `tools/baycut.py` did for the bay (45 min). The AD signs the set on a 1× sheet and at the golden heights (288, 160 and `cargo-report-waiting`'s) in captures | 1 h 45 |

If AR4 or AR5 cannot be made by hand and pass at 1×, the art director says so. Any paid pass then needs an explicit go: it is not in this spec and not in its 0.

## 10. Goldens and journeys that change

- **Goldens, `prototypes/face/golden/cargo/`.** All of these change and are retaken once, last:
  - `cargo-bay`, `cargo-bay-one`, `cargo-bay-three`, `cargo-bay-empty` (now the door), `cargo-bay-away` (the signed door, not the lavender plate) and `cargo-bay-waiting` (two pods on the floor; the rack full);
  - `cargo-crates-arriving`;
  - `cargo-opening-0` (the sealed closer on the bay, not black), `-200`, `-500` (the ribbon fitted), `-800`, `-1200`, `-1650` and `-end` (the report on the door, no veil);
  - `cargo-report` (h 288, one world line), `cargo-report-small` (h 160 at y 128) and `cargo-report-waiting` (no mark; the door shut).
- **Retired:** `cargo-opening-90`.
- **No Home golden changes.** `home/home-cargo-empty.png` is Home's.
- **Journeys:**
  - `prototypes/face/golden/journey-home.json`'s Cargo steps (subjects "two sealed crates", "the bay is opening", "what came home", and the report rows: two crates, Probe, one world line, h 232 + goal ≤ 288) are expected **unchanged**. A move is a departure for the builder to report.
  - `prototypes/station/tools/journey.mjs`: :143 (`bay.state === "open"` with two crates) holds. No assertion reads `bay.lid` or `regions.waiting`.
  - The play-page journey has no Cargo frame shot.
- **The dirty-area check** (`tests/dirty.mjs`): the three Cargo cuts become one-frame stage repaints in place of the 180 ms dithers.

## 11. Explicitly NOT in this spec

- The ribbon's colour (fix 9, first wave, already ruled and built on its branch); the Incubator's, Pods' and the meet's ribbons.
- Home's Cargo module (its bay, crates and empty state). It is Home's spec and gate; see Q1.
- The report's content: rows, words, the "summary in pictures" ask, the goal sentence (fixes 12 and 13), "with the top-up" and the dev words (fix 8), and the legibility of `icon-pod-16` at 1× (fix 11).
- The pods' colours in the rack ("identical grey sacks"): the rack pod and species shells, Pods' art.
- The sitting crate's reveal (not designed; sitting crates stay out of the bay).
- The screen-change transition into and out of Cargo (the frame's), the top bar and the bottom line art.
- The crates' look ("a bit too rustic", owner 10-09): the AD's, signed.
- The Companion's Cargo screen (the Companion lead).
- Any paid art call.

## 12. ETA

- **AD part.** About 3 h 15 min of the art director's hands-on time (AR1 15 min, AR4 1 h 30, AR5 master and notes 1 h 30), plus 30 min signing in the builder's whole-screen captures. The studio's cuts (AR2 1 h, AR3 15 min, AR5 heights 45 min) run in parallel from the AD's notes.
- **If the AD starts at the relay (about 03:00 Mexico City, Thu 10-15):** the art is ready about **06:30**, the studio's cuts about 05:30, and the AD's 1× sign in the builder's captures follows the build.
- **Builder.** About 6 h for §8, all doable before the art lands, since unsigned pieces draw nothing. With a builder free at 03:00, Cargo's whole 1× capture for the gate is possible about **09:30**, after the harness fix and the first wave are in (the gate's order puts Cargo after Habitat and Probe).
- **Architect.** One line in lvgl-switch.md :285 (the dirty-area exemption: the Cargo dithers become one-frame cuts). It is a wording confirmation, not a design change, and does not block the build.

## 13. Open questions (each with a recommendation)

1. **Docked with nothing in the bay: shut the door (R2), or show the open bay empty?** **Recommend: shut.** The open empty bay is a 976×304 painted shelf with a caption, the "empty field" the owner would reject, and the shut door is a signed object (rule 2). It changes how Home's Cargo module should read when empty: ui-ux-global F4 already proposed `home-bay-shut-176x72` there. The Station lead tells Home's spec owner to adopt the same rule at Home's gate, so the module and the screen agree.
2. **The report plate as 21 exact heights, or a few snapped heights with the rows top-aligned?** **Recommend: 21 exact heights, cut by script from one signed 560×288 master.** Snapped heights leave up to 56 px of blank plate under a short report: a small dead field inside the fix for dead fields. The derived heights are mechanical, and the bay was cut the same way.
3. **The rack insert (AR4) is new art: must Cargo wait for it?** **Recommend: yes, it is required for the gate.** Today's six hairline outlines fail rules 2 and 3, and drawing nothing would float the pods. The AD tries the hand cut first, from the open crate's foam and the bay's rim. Only after a failed 1× attempt does the Station lead ask the programme lead for a paid pass.

Signed: UI/UX, 02:12 (America/Mexico_City), Thu 2026-10-15

---

## Amendment, gate batch 1: the report in the housing (UI/UX, 2026-10-15 08:05; its own builder item on station-gate)

**On screen (47343c43).**
- `cargo-report` and `cargo-report-waiting` show the plate at (232, 64, 560, 288); `cargo-report-small` shows it at (232, 128, 560, 160); `cargo-opening-end` shows the same plate. All are the signed `cargo-report-plate-560x{h}`, placed exactly to R6.
- The plate's construction:
  - a 4–8 px sage rim lit on its top and left outer faces;
  - dark rubber corners (42, 42, 45);
  - a cool floor (28, 32, 37).
- The door's slats run unbroken to the rim on both sides (screen 24–232 and 792–1000).
- At 1× it reads as a framed board hung on the shutter, which is the "dark modal" the creative director failed. The concept board sets every module **into** the housing (a recess with one bevel lit from the top left, and a cream label plate).

**Cause.** The spec, not the build. R6 and §4 asked for the stamp case's raised construction on the slatted door.

**GB-R6 (replaces R6's first paragraph, "It becomes `cargo-report-plate-560x{h}` … Its rows are set on it as today.").**
- **The door.** In the report state the door is `cargo-bay-shut-report-976x304`, drawn 1:1 at (24, 56) in place of `cargo-bay-shut-976x304`. It is the signed shut door with its middle as a plain moulded sage housing panel at screen x 224–800 (slice x 200–776), full door height. The slats end at a moulded frame on each side of it.
- **The plate.** `cargo-report-plate-560x{h}`: the same ids, sizes and place (x 232, y = 64 + 8 × floor((288 − h) / 16), h 128–288 by 8). It is now a **well set into that panel**, in the fix 2 kit's construction:
  - a 1 px hairline;
  - a 5 px sage bezel in the door's sage, lit from the top left;
  - the inner shade on the top and left walls;
  - a lit 1 px lip bottom and right.
  - There is no raised rim, no rubber corner and no drop shadow.
  - Its floor keeps today's tone (28, 32, 37), so `bone` ≥ 7:1 and `mist` ≥ 4.5:1 still hold. The kit's warm floor would put `mist` at 4.0.
- **The heading on a cream label plate.**
  - The plate is `label-plate-cream-216x32` at plate + (12, 12, 216, 32).
  - "Home from the field" (the only heading string; about 191 px at 20 px medium) sits on it at plate + 24, centred on the label's 32, in `ink`.
  - The rows from + 56 are unchanged, with the label's bottom (+44) 12 px above them.
- **Unchanged:** every rect, height, row, string, colour but the heading's, the events, the cuts (R8), the focus and the bottom line.

**Edits (file, key, old → new).**

| File | Key / place | Old → new |
| --- | --- | --- |
| `prototypes/ui/specs/station/cargo.json` | `regions.bay.slices` | `{ open, shut }` → add `"report": "cargo-bay-shut-report-976x304"`; `regions.bay.rule` appends "in the report the door is slices.report (GB-R6)" |
| same | `regions.report` | add `"label": { "slice": "label-plate-cream-216x32", "at": [12, 12], "size": [216, 32], "text": "heading", "textAt": "+12 inside the label, centred on its height" }`; `heading.at` [16, 16] → [24, 12] (the words' box, on the label) |
| same | `colours.report.heading` | "bone" → "ink" |
| same | `placeholders` | add `cargo-bay-shut-report-976x304` and `label-plate-cream-216x32`: draw nothing until signed (rule 4) |
| `prototypes/station/src/views/cargo-props.mjs` | :41–44 `regions.bay` | in the `report` state, `door` = `cargo-bay-shut-report-976x304` (else as now) |
| same | `reportOf` | add `label: "label-plate-cream-216x32"` |
| `prototypes/face/src/screens/cargo.c` | `build_reportCard` | after the plate and before the heading: `v_sprite("report.label", label, x + 12, y0 + 12, 216, 32)` on the painted layer; the heading at x + 24 in `colours.report.heading` |
| `prototypes/face/tools/cargo-regions.mjs` | the report | the label inside the plate at + (12, 12); the door in the report is `slices.report` |
| tests | `cargo-props.test.mjs`, `cargo.test.mjs`, `specs.test.mjs` | the report state requests the report door and the label; the label lies ≥ 6 px inside the plate (fix 2 F3) and ends ≥ 12 px above the first row; `colours.report.heading` is `ink` |
| `design/style-guide/station-layouts.md`, Cargo §4 | "the plate" | "the plate set into the door's plain sage panel, the kit's construction; its heading on a cream label plate (GB-R6)" |
| `specs/station-fix2-spec.md` §11 | "**Cargo's bay, rack and report** (signed fix 5 AR1, AR4, AR5)" | "**Cargo's bay and rack** (AR1, AR4); the report plate is recut in this kit's construction (fix 5 Cargo GB-R6)" (the Station lead applies it, or UI/UX with the next fix 2 edit) |

**§4, art direction, the report bullet.** "The report plate is built like the stamp case: a dim well moulded into the sage door, a lit top-left rim, a shaded lower-right and dark rubber corners. Its floor is dark enough for type, with no glass front, sheen, glow or text of its own." → "The report plate is the fix 2 kit's plate set into the door's plain sage panel: one bevel lit from the top left, the shade inside its top and left walls, a lit lip bottom and right, no rubber corners, no raised rim. Its floor is today's, dark enough for type, with no glass front, sheen or glow. Its heading is on one cream label plate, as the board's modules."

**Art (AD; 0, by hand and script; signed at 1× in the whole `cargo-report`, `-small` and `-waiting` captures, beside board frames 1 and 3).**

| # | Id | Size and place | What | Time |
| --- | --- | --- | --- | --- |
| AR5r | `cargo-report-plate-560x{h}`, h 128–288 by 8 (21; same ids) | 1:1 at (232, y(h)) | The master 560×288 in the kit's construction (`make-device-plate.py` with the door's sage and today's floor tone). The 20 shorter heights by the bay-cut script | 45 min |
| AR6 | `cargo-bay-shut-report-976x304` | 1:1 at (24, 56), report only | The signed shut door, by hand: a plain moulded sage panel at slice x 200–776, full height; the slats end at a moulded frame each side; lit top left; no text, no gold | 1 h |
| AR7 | `label-plate-cream-216x32` | plate + (12, 12) | The board's cream label plate: matte cream, a 1 px darker edge, lit top left, no gold, no text | 15 min |

Signing: about 30 min. **Total about 2 h 30.**

**Goldens (station-gate, its own retake, Cargo only):** `cargo-report`, `cargo-report-small`, `cargo-report-waiting` and `cargo-opening-end`, which is **4**, plus `cargo.json`'s hashes. No other Cargo golden moves; the rack, bay and opening are untouched. Journeys: the Cargo report rows in `journey-home.json` are unchanged, because no rect or string moves.

**ETA.**
- UI/UX: done (08:05).
- AD: about 2 h 30; from about 08:45, ready about 11:15.
- Builder: about 45 min on station-gate. It can be built before the art: an unsigned slice draws nothing (rule 4).
- **Retake:** Cargo alone, about **12:00**. It does not wait for fix 2.

Signed (amendment): UI/UX, 08:05 (America/Mexico_City), Thu 2026-10-15

## Addendum (2026-10-15 21:20, UI/UX): the larger haul
R5 "Containers" and "Containers' shadows" are superseded by `specs/station-cargo-haul-spec.md`: 72 × 96 containers, energy (216, 240) left of the closer, data (736, 240) and essence (816, 240) right of it, feet on 336, `cargo-store-shadow-72x21` with its core on 336; the 800 ms ceiling 12,288 → 24,576.
