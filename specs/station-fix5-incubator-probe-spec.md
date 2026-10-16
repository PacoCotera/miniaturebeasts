# Fix 5, the Incubator and the Probe: no dead fields (UI/UX layout spec)

Fresh UI/UX designer, for the Station lead. Written 2026-10-15 from 04:16 (America/Mexico_City). Layout, rules and states only. The art is the art director's (§9 asks for it), the words are the copywriter's (§7), the build is the builder's, and the architecture stays as it is on main. The Station lead commits this file.

**Read at.**
- Public main `97cf45ec` (#197 merged). The Incubator: `prototypes/ui/specs/station/incubator.json`, `incubator.props.json`, `prototypes/station/src/views/incubator-props.mjs`, `prototypes/face/src/screens/incubator.c`, the 18 goldens `prototypes/face/golden/incubator/incubator-*.png` and the captures `prototypes/station/img/page-incubator*.png`. The Probe: there is no `probe.json`; the Probe section's screen is `bench` (`frame.json` navigation place `probe`), so `prototypes/ui/specs/station/bench.json`, `bench.props.json`, `views/bench-props.mjs`, `screens/bench.c`, the four goldens `prototypes/face/golden/bench/bench*.png` and `prototypes/station/img/page-bench*.png`. All goldens looked at whole at 1×.
- The stage masters `room-bench-stage-incubator` and `room-bench-stage-probe` (`prototypes/ui/assets/masters/pods/`), measured pixel by pixel.
- `station-global-specs` `cec1315e`: "Every state composed" rules 1–5 and fix 4's Incubator label (804, 256) and code (776, 381).
- `masters-pods` `3880faec`: the stamp-case look (`art/station-masters/pods/stamp-case/README.md`; on the Incubator the label has no case).

**Authority** (precedence: (recorded decision) and the code on main win over every design document):
- The creative director's ranked list, (audit record) (final 5b32e68): fix 5 ("Each device interior gets a lit subject and no empty plain … Every screen keeps one key light, top left"); fix 2 (one device-material kit, naming "Probe (Mend, Upgrade)"); fix 10 (every placed picture on its ground). Verdicts: Incubator "Fail (near): the housing and bean are good"; Probe bench "Fail (near): the housing and Probe are good. Mend and Upgrade are dark panels". the global fix plan fix 5 names "Incubator, Probe (the UI/UX global review F1, F5)", 0.
- The round-3 audits: (audit record) (Incubator N: "Upper wall (70–950 × 60–200) bare. Good: the machine carries the space (hoses, a vent, a label)"; P: "Empty label plate (448–576 × 496–528) after the hatch. Reads as missing text"; S4 "Incubator: bare upper wall"; Probe B: "Mend and Upgrade panels (584–968 × 104–496). Flat navy dashboard"; N: "Plate glyphs small") and the design audit (Incubator: "the plaque emptied"; Probe: "dashboard panels on the painted bench").
- My predecessor's inputs, (audit record) F1 (Incubator: "x 64–344 holds only a gauge … in the empty state the dome is the only object"; Probe: "the band y 392–552 holds only the plates … the slot panel holds a 136×136 picture and three small rows"). §13 says which of its fixes I take and which I do not.
- The rules in force: the painted language (decided); "Every state composed", `design/style-guide/station-layouts.md` rules 1–5 on `station-global-specs`; the freeze; fix 4 (the Incubator's label at 804, 256, unlit, "no fill, light, glow, beam, frame or pane of its own"); fix 6 (the leaf arc stays, the empty leaf A1 in sageD at 1.43:1 on the wall).

## 0. What is dead on main today (measured)

Method: each golden against its stage master. A pixel counts as filled if the golden differs from the stage (a placed picture or text) or if the stage itself paints an object there (deviation from a 41 px median of the wall); both masks dilated 4 px. "Bare" is the rest of the case's wall or floor. The largest bare rectangle is the histogram maximum (a throwaway script; the numbers below are its output).

**The case interiors.** The Incubator's wall runs x 70–952, y 64–548 on screen. The Probe's floor runs x 66–955, y 76–538.

**The stages' own objects.** The Incubator stage paints everything below y 405 and nothing above it:
- left hose 74–358 × 405–535, left gauge 93–165 × 467–533;
- right hose 666–949 × 419–539, gauges 760–846 and 863–933 × 451–530.

The Probe stage paints:
- gauge 97–174 × 441–526;
- screwdriver 199–398 × 498–526;
- wrench 433–571 × 491–522.

### The Incubator

| State (golden) | Dead field | Why |
| --- | --- | --- |
| `incubator-empty` | 68 % of the wall is bare. The whole upper wall 77–936 × 68–198 (859×130). Beside the chamber, 76–356 × 198–411 (280×213) and 668–947 × 198–414 (279×216) | The spec: "the left of the stage stays empty and dark, so the chamber reads alone" (design/style-guide/station-layouts.md, Incubator §3). The stage paints nothing above y 405 |
| `incubator-growing`, `-growing-late`, `-ready`, `-grownow-*` | 60 % bare. Left of the arc 76–290 × 84–411 (214×327). Right, above the label, 733–947 × 84–292 (214×208) | The arc and the chamber are centred, and nothing else lives on the upper wall. Fix 4 moves the label to 804, 256, which leaves 733–952 × 84–240 bare |
| `incubator-hatch-*` (11) | 58 % bare, the same two side fields. The plaque plate 448, 496, 128×32 is blank from 0 to the hand-off | `regions.plaque.text.hatch ""` and `incubator-props.mjs:57`. A painted plate with no word is "a bare label plate" (rule 2) |

### The Probe

| State (golden) | Dead field | Why |
| --- | --- | --- |
| `bench`, `-armed`, `-tier2`, `-away` | Mend 584, 104, 384×128: 94 % one flat fill (43, 48, 56). Its content runs x 601–798; from 798 to the lamp at 940 nothing (142×128) | The module is sized for the column, not for its content: the word, the switch, the dock mark and up to four 16 px icons end at module x 240 |
| same | Upgrade 584, 248, 384×248: 74 % flat. An empty column 874–940 (66 px) and a band y 449–492 | The adds end at module x 296; the lamp sits at 356 |
| same | Both modules run onto the housing's right wall, 955–968. The tray starts 10 px onto the left wall, at 56 | The group 56–968 was centred on 512 without the floor's measure (66–955) |
| `bench-away` | Bare floor 175–580 × 396–487 (405×91) under the empty cradle | The plates are not drawn while away (right), and nothing else holds their place |
| `bench`, `-armed` | Bare floor 408–540 × 396–489 right of the plates. The three 32×32 plates stand on bare floor inside a 208×80 ring box | The plates have no ground of their own (fix 10) |

The navy fill itself is fix 2's (one device-material kit). What this spec owns is the field inside it: a module twice the size of what it holds.

## 1. Purpose (unchanged)

- **The Incubator:** the bridge between the research and the Vivarium. The bud lies warm in its chamber until ✓ Open hatches it. **Reads first:** the bud's glow (empty: the chamber's standby light).
- **The Probe bench:** keep the Probe ready for the next expedition. **Reads first:** the Probe, then its plates.

What changes is what stands around the subject. On the Incubator, the machine that keeps the bud warm fills the wall. On the Probe, each part sits on its own ground, and each module is the size of what it holds.

## 2. Elements: what changes

| Element | Main today | This spec |
| --- | --- | --- |
| **Incubator:** the wall | A flat painted wall above y 405, with hoses and gauges only at the foot | The same stage master, recut by the art director (IA1). The chamber's own service machinery is painted in four zones that are clear in every state. The leaf band, the chamber with its base and the label's place stay clear (I1) |
| **Incubator:** the plaque in the hatch | Blank 0 → hand-off | Keeps its word: "ready" to 1000, then the hatch word (I3) |
| **Probe:** the group | Cradle 56, column 584–968, centred on 512 but over both walls | Cradle 96, column 616–928: centred on 512, inside the floor (P1) |
| **Probe:** Mend and Upgrade | 384 wide | 312 wide, the lamp at (284, 12); the contents unchanged (P2) |
| **Probe:** the plates | Three or four 32×32 sprites on bare floor | Seated in a fitted foam strip, one strip a tier, in both states. Away, it shows its empty slots, as the empty cradle does (P3, PA1) |

## 3. The rules

### The Incubator

**I1. The wall is the machine's.** The stage master `room-bench-stage-incubator` stays the bench at (0, 40, 1024, 522), under the same id, recut 1:1 (IA1). Its new painting lies only in the **paint zones**:

| Zone | Rect (x, y, w, h) | Clear of |
| --- | --- | --- |
| L, left wall | 80, 88, 160, 312 | the leaf band by 8; the left hose's top (405) by 5 |
| R, right wall above the label | 784, 88, 160, 144 | the leaf band by 8; the label (256) by 24 |
| LM, left of the chamber, under the arc | 248, 320, 96, 80 | the chamber (360) by 16; the arc's lowest leaf (302) by 18 |
| RM, right of the chamber, under the arc | 680, 320, 80, 88 | the chamber (664) by 16; the label zone by 8; the right hose (419) by 11 |

It never paints in the **keep-clear zones**. Each of these stays the wall as it is today:
- **The leaf band:** 248, 80, 528, 240. It holds the 39-slot tables of both arcs (boxes 267–757 × 90–302), the hatch ribbon (312, 104, 400, 40) and the juvenile's head.
- **The chamber and its base:** 344, 200, 336, 352.
- **The label's place:** 768, 240, 184, 176. Fix 4's label (804, 256, 120×120) and code (776, 381, 176×25) sit here.

Everything the stage paints today below y 405 (the hoses, the gauges, the floor lip) stays pixel for pixel. So fix 4's raised label (256) stays where it is, and the stage does not clear the band that would return it to 400.

**I2. Every state names its main object, and only two clearances may show bare wall.**
- In every state, outside the leaf band and the label's place, no bare rectangle of wall of 160×160 or more remains (the bud's 128×160 box, rounded up).
- Inside a paint zone the art director composes freely. The zone need not be filled edge to edge, but no bare rectangle of 96×96 or more is left inside it.
- In the empty state the leaf band and the label's place show bare wall: the band as the chamber's headroom (528×120 above it), the label's place as one patch of 184×176. These are the only bare fields this spec accepts (Q2).

**I3. The plaque always holds a word.**
- From 0 to 999 of the hatch, the plaque keeps `strings.plaque.ready` ("ready").
- At 1000, when the bud goes and the juvenile stands, it cuts to `strings.plaque.hatch`. That is a new one-word string, ≤ 112 px at 16 px, no digits; the copywriter owes it (§7).
- Until the copywriter's word lands, `strings.plaque.hatch` reads "ready", so no frame shows a blank plate.
- The colour stays `colours.plaque.ready` (`ink`), as `incubator.c:87` already maps the hatch.

**I4. Nothing else moves.** The chamber, the bud, the nest, the base, the leaf arc (fix 6), the rail, the label and the code (fix 4), the ribbon (fix 9) and the juvenile keep their rects, pictures, events and timings.

### The Probe

**P1. The group sits on the floor, centred.** The cradle (480) + a 40 gap + the column (312) = 832, from x 96 to 928, centred on 512. Margins are 30 to the left wall (66) and 27 to the right (955).
- Cradle: (96, 104, 480, 288), axis **336** (was 296).
- Column: x 616, w 312.
- The cradle's top and the column's top stay at y 104. The column still ends at 496.

**P2. Each module is the size of what it holds.** Module w 384 → **312**. The lamp moves to (w − 28, 12) = (284, 12). Every other `at` is unchanged:
- **Mend.** Word (16, 12); switch (16, 56) 80×40; dock (112, 64); meaning plates from (152, 68), pitch 24, up to four, ending at 240. Height stays 128.
- **Upgrade.** Word (16, 12); socket (16, 48) 160×160; part (32, 64) (armed (32, 56)); pods (200, 64); plates (200, 112); reach (200, 160) and deep (256, 160), ending at 296 = w − 16. Height stays 248.

What remains between the contents and the edges is the module's own margin (16), plus Mend's 56 px to the right of its meaning on the switch row. No flat run inside either module is 96 px or wider.

**P3. The plates stand in their strip.** One painted strip a tier (PA1), drawn in **both** states under the plates:
- **Tier 1:** `bench-plate-strip-t1-144x48` at (264, 432). Plates at x **272, 320, 368**, y 440.
- **Tier 2:** `bench-plate-strip-t2-192x48` at (240, 432). Plates at x **248, 296, 344, 392**, y 440.
- **The places:** pitch 48, the plate 32×32. Each strip is centred on the axis 336, with 8 px of strip on every side of its plates.
- **Docked:** the tier's plates, whole or gone, on their slots, as today.
- **Away:** the strip alone, its slots empty, so the plates read as out with the Probe, never missing. No plate is drawn, and the tier's count still shows in the strip's slots.
- **Install:** the strip cuts t1 → t2 at 300, on the same frame as the cradle and the places.
- **Clearance (measured):** the strips' bottom (480) is 18 px above the screwdriver (498) and 11 px above the wrench (491). Their left (240) is 66 px right of the gauge (174). Their top (432) is 40 px under the cradle (392).
- **The focus box** `regions.plates.rect` becomes (232, 424, 208, 64): the tier-2 strip plus 8 px, centred on 336, its centre y still 456. So ▶ from the plates still finds the slot first.

**P4. The panel's look is fix 2's.** This spec gives the modules' rects. Fix 2's device-material plate is cut at **312×128** and **312×248**. Until it lands, the modules keep `colours.module` (`panel`, `bevel`, `hairline`), and **the Probe cannot pass its gate**: a flat fill fails rule 3 wherever it sits (§6).

## 4. Art direction (for the art director's look, not the layout)

- **One key light, top left**, as the signed stages. Every new piece is lit from there, and each shadow falls down and slightly right.
- **The Incubator's machinery** serves the chamber: the lines and small units that keep the bud warm and moist, in the housing's matte materials (the sage `metal`, the sand `enamel`, the hose rubber), joined to the hoses already painted at the foot.
  - Never a lab: no glassware, no jar, no screen.
  - No text, no digits, no gold, no teal, no amber.
  - Nothing lit: no lamp, glow or bright dial face. The chamber's glow stays the one warm thing.
  - **Measured at the gate:** inside each zone, the 95th-percentile relative luminance is at or below that of the stage's existing gauge housings (not their faces), and the mean is at or below the chamber's back in the empty state.
  - **The leaf band and the label's place are untouched,** so the empty leaf's 1.43:1 (fix 6) and the label's luminance check (fix 4) hold as measured.
- **The plate strip** is the empty cradle's foam (`bench-cradle-empty-480x288`, which the art audit keeps): a fitted dark foam strip with plate-shaped recesses, its contact shadow baked (it never moves). A whole plate reads on it; a gone plate's outline reads on the recess. No label, number or lamp.
- **The Probe** stays the brightest object on the bench (bench.json `notes.light`).

## 5. Composition: the regions (new values)

### `incubator.json`

| Region | Rect | Draw order | Notes |
| --- | --- | --- | --- |
| `bench` | 0, 40, 1024, 522 | 1 | `room-bench-stage-incubator`, recut (IA1); its paint zones and keep-clear zones as I1 |
| `plaque` | 448, 496, 128, 32 | as now | Hatch: "ready" to 1000, then `strings.plaque.hatch` (I3) |
| every other region | unchanged | unchanged | — |

### `bench.json`

| Region | Rect | Draw order | Notes |
| --- | --- | --- | --- |
| `bench` | 0, 40, 1024, 522 | 1 | Unchanged (`room-bench-stage-probe`) |
| `cradle` | **96**, 104, 480, 288 | 2 | Axis **336**; pictures unchanged |
| `strip` (new) | 240, 432, 192, 48 (bound) | 3 | By tier: t1 (264, 432, 144, 48), t2 (240, 432, 192, 48); both states (P3) |
| `plates` | **232, 424, 208, 64** | 4 | Places t1 272/320/368, t2 248/296/344/392, y 440; docked only; the focus box |
| `switch` | **616**, 104, **312**, 128 | 5 | Lamp (284, 12) |
| `slot` | **616**, 248, **312**, 248 | 6 | Lamp (284, 12) |
| Rings (4 px out, 2 px lift) | plates 228, 418, 216, 72; switch 612, 98, 320, 136; slot 612, 242, 320, 256 | ring | — |

## 6. States: every state composed (rules 1–5, checked per state)

Each row names the main object and its rect. "No size" lists what is not drawn.

| Screen, state | Main object, rect | Also drawn (all content) | No size | Ready when |
| --- | --- | --- | --- | --- |
| Incubator, **empty** | `dome`, the chamber (360, 200, 304, 272), standby | nest, base, plaque "empty", the machinery (IA1) | rail, leaves, bud, label, code, ribbon, juvenile, lamp | IA1 |
| Incubator, **growing** (and `wipe`, and `growNow` to 399) | `bud` (448, 264, 128, 160) | chamber, nest, leaf arc (fix 6), rail, plaque, label and code (fix 4), machinery | ribbon, juvenile; the lamp | IA1, fix 4, fix 6 A1 |
| Incubator, **ready** (and `growNow`'s end) | `bud` (448, 264, 128, 160), with its shape | as growing, all leaves full; the lamp while the painting waits | ribbon, juvenile | as above |
| Incubator, **hatch** 0–999 | `bud` (448, 264, 128, 160): still, then crack 1 and crack 2 | chamber, rail, label, code, plaque "ready", machinery | leaves | as above |
| Incubator, **hatch** 1000 → hand-off (and the moving set's steps) | `juvenile` (360, 160, 304, 312) | chamber, plaque (the hatch word), ribbon from 1200 (fix 9), lamp, machinery | leaves, bud | + the copywriter's word (interim "ready") |
| Probe, **docked**: worn, whole, armed, tier 2 (and the `mend`, `switch` and `install` ends) | `cradle`, the Probe (96, 104, 480, 288) | strip and plates, Mend and Upgrade with their contents, the ring | — | PA1, fix 2's plates |
| Probe, **away** | `cradle`, empty (96, 104, 480, 288) | strip (empty slots), Mend, Upgrade (dim), the ring on the switch | plates | PA1, fix 2's plates |

**The gate's check** (rule 1, and I2 for these two screens). On every Incubator and Probe golden at 1×, the reviewer:
- finds the main object above drawn at its rect;
- maps every other drawn rectangle to a row above;
- finds no bare rectangle of wall or floor of 160×160 or more, except the Incubator's two named clearances in the empty state.

A flat fill or an outline that holds no content fails the screen wherever it sits. That includes the navy modules until fix 2 lands.

## 7. Interactions, focus and the bottom line

- **The Incubator: no change.** No targets, no ring, the same keys, holds and events. One event text changes: `events.hatch.steps[0]` "the leaves and the plaque's word go (a cut)" becomes "the leaves go (a cut); the plaque keeps its word". `steps[4]` (1000) adds "the plaque cuts to `strings.plaque.hatch`".
- **The Probe: the same graph, targets, vectors, holds and events.** The rects move (§5). ▶ from the plates still lands on the slot: the plates' centre y 456 is nearer the slot (372) than the switch (168).
- **Copywriter owed (one string):** `incubator.json strings.plaque.hatch`, one word for the plate under a hatched mibi, ≤ 112 px at Inter 16, no digits. Until it is supplied, it is "ready". The bottom line strings are unchanged, and the Probe needs no copy.

## 8. Builder-facing edit list (file, key, old → new)

Build on `station-global-specs` (fix 4's label and code), or after it merges. No PR during the freeze. Goldens are taken once, last, after IA1 and PA1 are placed.

**`prototypes/ui/specs/station/incubator.json`**

| Key | Old | New |
| --- | --- | --- |
| `regions.bench` (:49) | `{ rect, component, part, slice }` | Add `"recut": "fix 5 IA1 (specs/station-fix5-incubator-probe-spec.md): the chamber's machinery painted in the paint zones only"`. Add `"paint": { "L": [80,88,160,312], "R": [784,88,160,144], "LM": [248,320,96,80], "RM": [680,320,80,88] }`. Add `"keepClear": { "leafBand": [248,80,528,240], "chamber": [344,200,336,352], "label": [768,240,184,176] }`. Add `"kept": "everything below y 405 pixel for pixel (hoses, gauges, the floor lip)"` |
| `regions.plaque.text.hatch` (:81) | `""` | `"strings.plaque.ready to 1000, then strings.plaque.hatch (fix 5 I3): never blank"` |
| `events.hatch.steps.0.do` (:97) | "the leaves and the plaque's word go (a cut)" | "the leaves go (a cut); the plaque keeps its word (fix 5 I3)" |
| `events.hatch.steps.4.do` (:101) | "the bud goes; the juvenile stands …" | Append "; the plaque cuts to strings.plaque.hatch" |
| `strings.plaque` (:176) | `{ empty, growing, ready }` | Add `"hatch": "ready"` and `"hatchNote": "copywriter owed: one word for the hatched plate, ≤ 112 px at 16 px; 'ready' until it lands (fix 5 I3)"` |
| `derived.empty` (:18) | "The empty Incubator invites incubating: …" | Append " The chamber stands among the machinery that serves it (fix 5 IA1), never alone on a bare wall" |
| `composed` (new, rule 1) | — | `{ "empty": { "main": "dome", "rect": [360,200,304,272] }, "growing": { "main": "bud", "rect": [448,264,128,160] }, "ready": { "main": "bud", "rect": [448,264,128,160] }, "hatch": { "main": "bud", "rect": [448,264,128,160], "from1000": { "main": "juvenile", "rect": [360,160,304,312] } }, "bareAllowed": { "empty": ["keepClear.leafBand", "keepClear.label"] } }` |
| `status` (:6) | — | Append "fix 5 (specs/station-fix5-incubator-probe-spec.md): the wall painted as the chamber's machinery; the plaque never blank" |

**`prototypes/station/src/views/incubator-props.mjs`**
- :57: `regions.plaque = state === "hatch" ? "" : spec.strings.plaque[state]` becomes the hatch word by time. The props carry both, and the face picks at 1000: `regions.plaque = spec.strings.plaque[state === "hatch" ? "ready" : state]` and `regions.plaqueAfter = state === "hatch" ? spec.strings.plaque.hatch : ""`.
- `incubator.props.json` `regions` gains `"plaqueAfter": { "type": "string" }`.

**`prototypes/face/src/screens/incubator.c`**
- `build_base` (:85–87): in the hatch, the word is `regions.plaqueAfter` when `t >= events.hatch.steps.4.at` and `plaqueAfter` is non-empty, else `regions.plaque`. It is one text node: a cut changes its text, never adds a node (§2.2).

**`prototypes/ui/specs/station/bench.json`**

| Key | Old | New |
| --- | --- | --- |
| `notes.group` (:16) | "… one group centred on x 512 (56 to 968)" | "… one group centred on x 512, 96 to 928, inside the floor (x 66–955): the cradle 480, a 40 gap, the column 312 (fix 5 P1)" |
| `notes.plates` (:17) | "… one sprite a place" | Append "; the tier's strip under them in both states (fix 5 P3)" |
| `notes.away` (:20) | "… no plates are drawn" | Append "; the tier's strip shows its empty slots, as the empty cradle does" |
| `regions.cradle` (:34) | `rect [56,104,480,288]`, `axis 296` | `rect [96,104,480,288]`, `axis 336` |
| `regions.strip` (new) | — | `{ "rect": [240,432,192,48], "build": "shieldPlates", "part": "strip", "byTier": { "1": [264,432,144,48], "2": [240,432,192,48] }, "slices": { "1": "bench-plate-strip-t1-144x48", "2": "bench-plate-strip-t2-192x48" }, "rule": "the tier's strip in both states, under the plates; away its slots show empty; it cuts t1 → t2 at the install's 300 (fix 5 P3)" }` |
| `regions.plates.rect` (:39) | `[192,416,208,80]` | `[232,424,208,64]` |
| `regions.plates.places` (:41) | `"1": [[232,440],[280,440],[328,440]], "2": [[208,440],[256,440],[304,440],[352,440]]` | `"1": [[272,440],[320,440],[368,440]], "2": [[248,440],[296,440],[344,440],[392,440]]` |
| `regions.plates.note` (:45) | "… 24 px inside its top and bottom; nothing else is drawn" | "… 16 px inside its top and bottom, on the tier's strip (regions.strip)" |
| `regions.switch` (:48) | `rect [584,104,384,128]`, `lamp [356,12,12,12]` | `rect [616,104,312,128]`, `lamp [284,12,12,12]` |
| `regions.slot` (:54) | `rect [584,248,384,248]`, `lamp [356,12,12,12]` | `rect [616,248,312,248]`, `lamp [284,12,12,12]` |
| `drawOrder` (:67) | "bench, cradle, plates, …" | "bench, cradle, strip, plates, switch, slot, ring, …" |
| `events.install.steps.1.do` (:75) | "… the plates cut from the tier-1 places to the tier-2 places 208, 256, 304, all whole, and the plate at 352 appears gone …" | "… the strip cuts t1 → t2, the plates cut to the tier-2 places 248, 296, 344, all whole, and the plate at 392 appears gone …" |
| `events.install.steps.2.do` (:76) | "the plate at 352 seats" | "the plate at 392 seats" |
| `events.redraw.cut` (:82) | the install step at 300 ≤ 173,056 | Re-printed by the builder: at most + 9,216 px (the t2 strip's box); away → docked unchanged (the same strip) |
| `focus.lift` (:100) | rings plates [188,410,216,88], switch [580,98,392,136], slot [580,242,392,256] | plates [228,418,216,72], switch [612,98,320,136], slot [612,242,320,256] |
| `masters.list` (:144) | — | Add `"bench-plate-strip-t1-144x48"`, `"bench-plate-strip-t2-192x48"` |
| `composed` (new, rule 1) | — | `{ "docked": { "main": "cradle", "rect": [96,104,480,288] }, "away": { "main": "cradle", "rect": [96,104,480,288], "picture": "bench-cradle-empty-480x288" } }` |
| `status` (:8) | — | Append "fix 5 (specs/station-fix5-incubator-probe-spec.md): the group inside the floor, modules sized to their contents, the plates on their strip" |

**`prototypes/ui/specs/station/bench.props.json`**: `regions` gains `"strip": { "type": "object", "properties": { "picture": { "type": "string" } } }`, required in both states.

**`prototypes/station/src/views/bench-props.mjs`**
- :24–25: register both strip slices with `ph(…, [w,h])`.
- :38: `strip: { picture: R.strip.slices[tier] }` in both states. During the install, the face picks t1 before 300 (as for the cradle, :23).

**`prototypes/face/src/screens/bench.c`**
- New `build_strip` before `build_plates` (:166):
  - one node `plates.strip` in both states, at `regions.strip.byTier.<tier>`;
  - in the install, the t1 strip before 300 and the t2 strip from 300;
  - a picture not sent draws nothing (rule 4).
- `build_switch` and `build_slot` read the new rects and lamps from the spec; no code change is expected.

**`prototypes/station/src/art.mjs`**: PH rows (status `placeholder`, draw nothing) for the two strips until PA1 is signed; place them 1:1 with `place-masters.mjs --only --ids`. Place IA1 under its existing id.

**Tools and tests**
- `prototypes/ui/tests/specs.test.mjs`:
  - :455 (the group centred on 512) holds at (96 + 616 + 312) / 2 = 512;
  - :459, :463 and :471 hold with the new rects;
  - :751: its title's "axis 296" → 336.
- New invariants:
  - the group inside the floor: cradle x ≥ 66 + 16, column right ≤ 955 − 16;
  - each strip centred on the axis, inside `plates.rect`, holding its tier's places with 8 px a side;
  - the strips clear of the stage's tools: gauge (97, 441, 77, 85), screwdriver (199, 498, 199, 28), wrench (433, 491, 138, 31);
  - every module `at` + size ≤ w − 16;
  - Incubator: the paint zones inside the wall (70–952 × 64–548), each disjoint from every keep-clear zone and from every leaf box in both arcs' slot tables (`regions.leaves.leafArc`);
  - Incubator: `composed` names a region for every state;
  - Incubator: `strings.plaque.hatch` non-empty, one word, ≤ 112 px.
- `prototypes/face/tests/bench.test.mjs` :115–120: the hard-coded module x 584 → 616. Its probe points move with it: the lamp (946, 120) → (906, 120); the third meaning plate (792, 178) → (824, 178); the track (604, 178) → (636, 178).
- `prototypes/face/tools/bench-regions.mjs`: add the strip (by tier, both states); the plates inside the strip.
- `prototypes/face/tests/incubator.test.mjs`:
  - :134 title "no plaque word" → "the plaque keeps its word";
  - :136 `regions.plaque` "" → "ready";
  - :144 the plaque type node present at 1000 and 1100, with the hatch word.
- `prototypes/face/tools/incubator-regions.mjs` :37: the plaque's word is drawn in every state.
- `prototypes/station/tests/incubator-props.test.mjs`: the hatch's plaque "ready", `plaqueAfter` the hatch word. `bench-props.test.mjs`: the strip named in both states, by tier.

**Wireframes and docs** (docs are part of done)
- `design/style-guide/station-layouts/11-bench`, `11b-bench-armed`, `11c-bench-away` and `11d-bench-tier2` (.svg and .png): redraw the boxes from §5. `specs.test.mjs:448` reads 11, 11c and 11d box by box. `11e-bench-nav`: the boxes only.
- `05b-incubator-hatch`: the plaque's word. `04`, `05` and `05c`: add the four paint zones as hatched notes.
- `design/style-guide/station-layouts.md`, Incubator:
  - §3 "The left of the stage stays empty and dark, so the chamber reads alone." → "The chamber stands centred among the machinery that serves it, painted on the wall at both sides; the wall over the chamber stays clear for the leaves, and the label's place stays clear at the right (fix 5)";
  - §4 Room: add the paint zones and the luminance cap;
  - States, Hatch: "the plaque keeps its word";
  - the events table, hatch 0 and 1000;
  - Placeholders, Stage row: "signed (d09acb12); recut, fix 5 IA1".
- Same file, Probe bench:
  - §3 "on the axis x 296" → 336, "from 56 to 968" → "from 96 to 928, inside the floor";
  - §2 and §4 add the strip;
  - §5, both tables, the rings and the draw order from §5 here;
  - the masters table adds the two strips.

## 9. Art requests to the art director (0, by hand; no paid call)

Every piece is lit from the top left. The art director signs each at 1× in the builder's whole-screen capture, beside the concept board (18c17261), never as a lone slice.

| # | Piece | Size and placement | What and light | Source | Who | Time |
| --- | --- | --- | --- | --- | --- | --- |
| IA1 | `room-bench-stage-incubator`, recut under the same id | 1024×522 at (0, 40); new painting only in L (80, 88, 160, 312), R (784, 88, 160, 144), LM (248, 320, 96, 80), RM (680, 320, 80, 88) | The chamber's service machinery: lines, a vent, small units, joined to the hoses already at the foot. Matte sage, sand and hose rubber. Nothing lit, no text, gold, teal or amber, no glassware. p95 at or under the existing gauge housings; mean at or under the empty chamber's back. The keep-clear zones and everything below y 405 are kept pixel for pixel | The signed stage (d09acb12), its hoses and gauge housings; the Station concept board, frame 3 | AD (a judgement piece) | 1 h 30 |
| PA1 | `bench-plate-strip-t1-144x48`, `bench-plate-strip-t2-192x48` | 1:1 at (264, 432) and (240, 432). Recesses at (8 + 48 i, 8, 32, 32) in the slice, i = 0–2 and 0–3 | A fitted dark foam strip, the empty cradle's foam, with plate-shaped recesses (the plate's silhouette). Its contact shadow is baked (it never moves). A white whole plate and a gone plate's outline both read on a recess. No label, number or lamp | `bench-cradle-empty-480x288` (masters-pods 5f04d417), `bench-plate-gone-32x32` for the recess shape | Studio from the AD's notes (hand cut); AD signs | 45 min + 15 min AD notes |

- **Not requested here:** the modules' plate at 312×128 and 312×248 (fix 2's kit, P4); the Probe's halo (fix 10); the hatch crack and the ribbon (fix 9).
- If IA1 cannot pass at 1× by hand, the art director says so. Any paid pass needs an explicit go: it is not in this spec and not in its 0.

## 10. Goldens and journeys that change

- **`prototypes/face/golden/incubator/`.** All 18 change (the recut stage):
  - `incubator-empty`, `-growing`, `-growing-late`, `-ready`, `-grownow-200`, `-grownow-420`;
  - `-hatch-100`, `-300`, `-650` and `-850` (the plaque now reads "ready");
  - `-hatch-1100`, `-1500` and `-2000`, and `-hatch-moving-1090`, `-2500`, `-2720`, `-5440` and `-5840` (the hatch word, interim "ready");
  - `incubator.json`: the hashes.
- **`prototypes/face/golden/bench/`.** All 4 change (the rects, the strip): `bench`, `bench-armed`, `bench-away` (the empty strip) and `bench-tier2`, and `bench.json` hashes.
- **Captures** (`prototypes/station/img/`): `page-incubator`, `page-incubator-empty`, `page-bench`, `page-bench-armed`, `page-bench-away`, `page-bench-tier2`.
- **No Home golden changes.** Home's Incubator and Probe modules draw their own pictures, not these stages.
- **Journeys:** `journey-incubator.json` and `journey-bench.json` record keys, focus, lines and counts, no rects and no plaque. They are expected **unchanged**; a move is a departure for the builder to report.
- **Dirty-area check:** the install's cut at 300 grows by the t2 strip's box (≤ 9,216 px), re-printed (§8). Nothing else changes.

## 11. Explicitly NOT in this spec

- **Fix 6:** the leaf arc and the empty leaf A1 (kept as signed).
- **Fix 4:** the stamp label's look, place and code line (804, 256; 776, 381). This spec only keeps their place clear.
- **Fix 2:** the modules' material; the toggle's look ("a phone toggle on field gear").
- **Fix 9:** the hatch ribbon's colour and width (312, 104, 400, 40 stays its bound).
- **Fix 10:** the Probe's ragged halo.
- **Fix 11:** the 16 px icons in Mend and Upgrade, and the plates' legibility at 32.
- **Fix 12:** growing versus ready at a glance; labelled costs.
- **Fix 1:** the bud's look ("a plain orange egg") and the hatch crack, the AD's.
- **Fix 8:** "BUD" on the old label (gone with fix 4).
- The Companion's Probe screen.
- Any paid art call.

## 12. ETA

- **This spec:** done, now. §13 has four open questions; none blocks the build.
- **AD.** About 2 h of hands-on time: IA1 1 h 30, PA1's notes 15 min, signing in the builder's captures 15 min. The studio cuts PA1 (45 min) in parallel. If the AD starts at about **05:00** Mexico City (Thu 10-15), the art is ready by about **06:30**. The AD's own ETA is owed through the Station lead; I could not reach the AD from this session.
- **Builder.** About 5 h:
  - Incubator 1 h 30: spec, props, the plaque word, tests, docs;
  - Probe 3 h: rects, strip region, props, face, tests including bench.test.mjs's hard-coded x, wireframes 11–11d, docs;
  - goldens and captures last, 30 min.

  All of it is doable before the art lands, since unsigned pieces draw nothing. Builder 2 is idle (programme 04:20), so with a start at about 05:00 the code is done by about **10:00**, and the whole 1× captures follow IA1 and PA1's placement.
- **Gate order** (fix plan): the Incubator after Create and Home; the Probe after Habitat. The Probe also waits for fix 2's plates (P4).

## 13. Open questions (each with a recommendation)

1. **The empty Incubator: put the waiting pod in the left column, as F1 proposed (88, 232, 144×176)?** **Recommend: no.**
   - The pod is in Pods' rack, two steps from here (Choose a pod → Pods → Create → Grow it), so a pod on the Incubator's wall would say it is here.
   - It would fill the left only while a pod waits; an empty rack would bring the bare wall back.
   - The line already says "a new pod waits", with ✓ Choose a pod.
   - IA1's machinery fills the left in every state instead.
2. **The label's place in the empty state (768, 240, 184×176) stays bare wall: keep it clear, or paint a service panel the label sits on?** **Recommend: keep it clear.**
   - Fix 4 rules that the label has no fill, frame or pane of its own. A painted panel behind it would bring back the plate fix 4 removed, and would put the code's 4.5:1 on a new ground.
   - The patch is framed by R above, RM to its left and the hose below. It is 4 % of the wall, against 68 % bare today.
   - If the CD reads it as a field at the Incubator's gate, the fallback is that panel: AD, 168×176 at (776, 240), with the code's contrast measured on it.
3. **The hatch plaque: the new mibi's name, or one word?** **Recommend: one word, from the copywriter.**
   - Names run to 10 letters (`namer.json nameMax`), which at Inter 16 can pass the plate's 112 px.
   - The ribbon already carries the name.
   - Until the word lands, "ready" stays on the plate, so no frame is blank.
4. **The Probe's modules: resize now, before fix 2's kit, or wait?** **Recommend: now.** The rects are fix 5's; fix 2 then cuts its plate once at 312×128 and 312×248. Waiting would move the cradle and the column twice and retake the four goldens twice.

Signed: UI/UX, 04:34 (America/Mexico_City), Thu 2026-10-15

## Addendum (04:36, Station lead, from the creative director via the programme lead): Q2 closed
The empty Incubator's label place stays bare. "Bare" means painted wall, not a void. It passes only in the whole incubator-empty capture at 1x, with IA1's machinery on both sides, and only if the patch reads as wall the machine stands against. The empty state must still say what to do next (fix 12): "empty" on the plaque and the next step on the bottom line. The creative director checks both in that capture. Q1, Q3 and Q4 are as recommended.

## Addendum (04:37, copywriter): the hatch plaque word (I3)
strings.plaque.hatch = "hatched" (lowercase, no punctuation; about 60 px at Inter 16, plate limit 112 px; the builder confirms the width with the real measurer and adds it to the metrics vectors). Alternatives if the copywriter's lead prefers: "awake" (49 px) or "arrived". The copywriter did not check the Incubator copy files in this pass: the docs/copy lead confirms "hatched" against the neighbouring strings (empty / growing / ready) before the gate.

## Addendum (04:38): the hatch word is final: "hatched" (copywriter; the docs lead agrees). The builder measures its width at Inter 16 with the real measurer and adds the vector.

## Addendum (2026-10-15 21:20, UI/UX): P1 and P3 superseded
The owner rejected the bench with the Probe laid flat ((recorded decision) 10-15 20:29). P1 (the group centred on 512, the cradle 96, 104, 480 × 288) and P3 (the strip under the cradle on the axis 336) are superseded by `specs/station-probe-upright-spec.md`: the upright cradle at 40, 96, 288 × 432, the strip beside its foot on the axis 472, the column at 624, 96 and 624, 272. P2 and P4 stand.
