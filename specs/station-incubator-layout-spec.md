# The Incubator on one grid: measured margins (UI/UX layout spec)

UI/UX, ticket T-20261015-03. Written 2026-10-15 22:25 (America/Mexico_City). It covers layout, numbers and rules only. The art is the art director's (§3 asks for a recut by hand), and the build is the builder's (§8).

**Contract (read first).**
- Precedence: (recorded decision) and the docs and code on main win over every design document, this one included.
- The visible-change freeze and the whole-screen gate stand. This spec changes nothing on its own. It lands through a builder item on station-gate, and the goldens are taken once, last.
- "Every state composed" (station-layouts.md rules 1–5) applies to every state.
- The judge is `specs/gate-recalibration.md` (f4126b0), check 5: even outer margins, objects on a grid, and the gaps to the bezel and between modules measured.
- The owner's words ((recorded decision) 2026-10-15 20:29): "grow screen has issues with margins"; "grow screen is okish ... looks flat". The flat look is closed by T-20261015-01 (art). This spec closes the margins.
- No paid call. The one art ask (§3, IA2) is 0 hand work.
- Supersedes fix 5 I1's paint zones (`specs/station-fix5-incubator-probe-spec.md`), and I4's "nothing else moves" for the base, the plaque, the stamp and the code. I2 and I3 stand.

**Read at.**
- Public `station-gate` 93bff40f:
  - `prototypes/ui/specs/station/incubator.json` and `frame.json` (`regions.stampSlot`, `regions.rail.well`);
  - `incubator.c`, `incubator.test.mjs`, `specs.test.mjs`;
  - the wireframes 04, 05, 05b, 05c and 05d;
  - the capture `prototypes/station/img/fix14/incubator-growing.png` (1024×600).
- Public `masters-pods` f365361b, which contains T-01's e59d57f6:
  - `room-bench-stage-incubator` (the re-rendered machinery), `base-336x96`, `dome-front-304x272`;
  - the proof `stage-incubator/rework/proof/mock-incubator-growing-1x.png`.
  - T-01 changed no size, so every rect below uses the sizes on station-gate.
- Method:
  - Ink is measured as pixels that differ from the brown wall: sage or sand, luminance > 70 or > 115, and at least 3 px per row or column.
  - Slices are measured by alpha ≥ 128.
  - Every number below is a pixel on screen.

## 0. What I measured

**The bezel.**
- On the stage, the wall's dark seam lies at column 70 on the left and column 953 on the right, so the wall runs x 71–952 (882 px, centred on 511.5).
- The bottom seam starts at row 548, and the wall's last row is 547.
- At the top, the rail's well (`frame.json regions.rail.well`, y 40, h 48) hangs to y 88. With six tabs it spans x 88–936.
- So the measures are:
  - **left = ink x − 71;**
  - **right = 953 − (ink right + 1);**
  - **bottom = 548 − (ink bottom + 1);**
  - **top = ink y − 88** (from the well).

**The modules on the capture** (the machinery is painted into the stage; T-01 kept every position):

| Module | Ink (x, y, to x, y) | Source |
| --- | --- | --- |
| Left column: risers, vent, unit, junction box | 98–226 × 92–391. Risers 98–140; vent 154–224 × 112–174; unit 152–226 × 216–303; junction box 160–206 × 341–375 | stage, zone L |
| LM valve | 250–324 × 337–389 | stage, zone LM |
| Chamber (dome-front) | 360–663 × 202–471 | `dome-front-304x272` at 360, 200 |
| Base block; foot light | 347–675 × 479–545 (slice rows 23–89); 548–549 (slice rows 92–93) | `base-336x96` at 344, 456 |
| Plaque plate | 448, 496, 128 × 32 | base |
| RM pump | 693–747 × 333–396 | stage, zone RM |
| R group (duct, vent hood, unit) | 796–934 × 98–207 | stage, zone R |
| Stamp label | 804–923 × 256–375 | code |
| Code rule | 776–952 at y 405 | code |
| Left gauge | 93–160 × 468–526 | stage |
| Right gauges | 774–841 and 864–930 × 467–526 | stage |
| Hoses | left 71–349, right 677–948, × 419–526 | stage (fixtures into the wall) |
| Leaves (both arcs, 40) | boxes 267–757 × 90–302 | code |
| Rail | 96, 40, 832 × 40; well to y 88 | frame |

### Margins, before → after

| Edge | Before (ink → gap) | After (ink → gap) |
| --- | --- | --- |
| Left: the column | risers 98 → **27** | 88 → **17** |
| Left: the gauge | 93 → **22** | 88 → **17** |
| Right: the column | R group 934 → **18** | 935 → **17** |
| Right: the gauge | 930 → **22** | 935 → **17** |
| Right: the code rule | 952 → **0** (it runs into the seam) | 935 → **17** |
| Right: the label | 923 → 29 | 923 → 29 (inside the column, centred on 864; not an outer edge) |
| Bottom: the gauges | 526 → **21** | 529 → **18** |
| Bottom: the base block | 545 → **2** | 529 → **18** |
| Bottom: the foot light | 549 → **on the seam** | 533 → 14 (the light line under the block, measured as the Probe's contact shadow) |
| Top, from the well (88): the columns | risers 92 → **4**; R group 98 → **10** | 104 → **16**, both |
| Top: the outer arc's top leaf | 90 → **2** | 90 → **2** (not closed here: §9.1) |
| Hoses | into the wall at 71 and 948 | unchanged: fixtures that enter the housing, exempt |

Left and right are equal at 17. The bottom is 18. All three lie inside 16–24.

### Gaps between modules, before → after (ink to ink)

| Pair | Before | After |
| --- | --- | --- |
| Left column → the leaves (unit 226 → box 267) | 40 | 50 (216 → 267) |
| Left column → LM | 23 | 36 (216 → 253) |
| LM → chamber | 35 | **32** (327 → 360) |
| Chamber → RM | 29 | **32** (663 → 696) |
| RM → the code's column | 28 (747 → rule 776) | 41 (750 → rule 792) |
| The leaves → R group | 38 | 39 (757 → 797) |
| R group → label | 48 | **18** (213 → 232) |
| Label → code | 5 | 5 (the shared slot's rule) |
| Code rule → right gauges | 61 | 88 (381 → 470; the right hose passes between) |
| Chamber foot → base block | **7 of bare wall** (472–478: the chamber floats) | **−9**: the base's lip covers the chamber's foot. It is seated |
| Gauge → gauge (right) | 22 | 17 |

## 1. The grid

One 8 px grid. Every region and zone rect is on it. The two exceptions are the ones already declared: the stamp label's x 804 (the shared slot, `frame.json regions.stampSlot`) and the code's line box (25 tall).

**Three columns, mirrored about x 512, with one 16 px gutter between every pair of neighbouring rects:**

| Band | Left | | Centre | | Right |
| --- | --- | --- | --- | --- | --- |
| Wall, y 104–400 | **L** 88–232 | 16 | leaf band 248–776 (unchanged) | 16 | **R** 792–936 (to y 216), then the label place 792–936 (232–384) |
| Under the arc, y 336–400 | L | 16 | **LM** 248–328 · 16 · chamber's keep-clear 344–680 · 16 · **RM** 696–776 | 16 | label place |
| Floor, y 464–530 | **GL** 88–160 | | the base 344–680 | | **GR** 784–936 |

- **Mirror checks:** 88 + 936 = 1024; 232 + 792 = 1024; 248 + 776 = 1024; LM's 328 + RM's 696 = 1024.
- **The lines:**
  - **The top line, y 104:** the tops of L and R, 16 under the rail's well.
  - **The row line, y 336:** the tops of LM and RM, 16 under the leaf band (320).
  - **The bottom line, y 530** (the first wall row under the ink): the base's block (rect y 440 + slice row 89 + 1), the left gauge and both right gauges. Bottom margin 548 − 530 = **18**.
  - **The outer lines x 88 and x 936:** the ink of L, GL, R, GR and the code rule. Margins **17 | 17**.
- **The pitch:** 16 between neighbouring zones, and 32 between the chamber's ink and the ink of LM and RM. No other spacing is introduced.

**Why the base moves up 16, and nothing above it moves.**
- Its block ended 2 px from the bezel, and it is the only standing object that broke the bottom margin.
- At y 440 its block runs 463–529:
  - the bottom margin is 18;
  - its lip overlaps the chamber's foot (471) by 9 px, so the 7 px of bare wall that floated the chamber is gone (gate check 4).
- The chamber, the arcs, the bud, the nest and the juvenile stay. The leaf arcs are derived from the bud's centre (512, 344), and the rail clearance allows no lift.
- 440 is the only grid value that works:
  - 448 leaves a 10 px margin;
  - 432 leaves 26.

## 2. Rects (old → new), the states, the goldens

| Region (`incubator.json`) | Old (x, y, w, h) | New | States | Goldens that move |
| --- | --- | --- | --- | --- |
| `base` | 344, 456, 336, 96 | **344, 440, 336, 96** | all | all 18 |
| `base.plate` | 448, 496, 128, 32 | **448, 480, 128, 32** | all | all 18 |
| `base.footLight` | 352, 548, 320, 2 | **352, 532, 320, 2** | all | all 18 |
| `base.lamp` | 652, 506, 12, 12 | **652, 490, 12, 12** (its offset in the base unchanged, 308, 50) | ready, hatch (painting waiting) | `-ready`, the hatch set |
| `plaque` | 448, 496, 128, 32; `lineTop` 502 | **448, 480, 128, 32; `lineTop` 486** | all | all 18 |
| `stamp` | 804, 256, 120, 120 | **804, 232, 120, 120** | growing, ready, hatch | all but `-empty` |
| `code` | 776, 381, 176, 25; `lineTop` 381; `baseline` 397; `rule.y` 405; `rule.x` [776, 952] | **776, 357, 176, 25; `lineTop` 357; `baseline` 373; `rule.y` 381; `rule.x` [792, 936]** | growing, ready, hatch | all but `-empty` |
| `bench.paint.L` | 80, 88, 160, 312 | **88, 104, 144, 296** | all (stage) | all 18 |
| `bench.paint.R` | 784, 88, 160, 144 | **792, 104, 144, 112** | all (stage) | all 18 |
| `bench.paint.LM` | 248, 320, 96, 80 | **248, 336, 80, 64** | all (stage) | all 18 |
| `bench.paint.RM` | 680, 320, 80, 88 | **696, 336, 80, 64** | all (stage) | all 18 |
| `bench.floor` (new) | — | **GL 88, 464, 72, 66; GR 784, 464, 152, 66; line 530** | all (stage) | all 18 |
| `bench.keepClear.leafBand` | 248, 80, 528, 240 | unchanged | — | — |
| `bench.keepClear.chamber` | 344, 200, 336, 352 | **344, 200, 336, 336** | — | — |
| `bench.keepClear.label` | 768, 240, 184, 176 | **792, 232, 144, 152** | empty: the one bare place (Q2) | `-empty` |

- **Unchanged:** `rail`, `leaves` and both slot tables, `dome`, `nest`, `bud` and `bud.shape`, `nestFront`, `domeFront`, `ribbon` and `juvenile` (360, 160, 304, 312, feet 472). Also unchanged: `composed`, `focus`, `keys`, `events` (timings and steps), `drawOrder` and every string.
- **The juvenile's feet** (472) now stand 9 px under the base block's top edge (463), on its lip, with its 24 px shadow band 448–472 across that edge. The AD judges this at `-hatch-1100` (§9.2).
- **The code** keeps the shared slot's form: 5 px under the label, baseline + 16, rule + 8, box 776 + 176, centred on 864. Only its rule is shortened to the column, 792–936, so that it no longer runs into the seam.
- **The goldens:**
  - All 18 in `prototypes/face/golden/incubator/` and the hashes in `incubator.json`. That is `incubator-empty`, `-growing`, `-growing-late`, `-ready`, `-grownow-200`, `-grownow-420`, `-hatch-100`, `-300`, `-650`, `-850`, `-1100`, `-1500`, `-2000`, and `-hatch-moving-1090`, `-2500`, `-2720`, `-5440`, `-5840`.
  - The captures `page-incubator`, `page-incubator-empty` and `fix14/incubator-growing`.
  - No other screen draws these regions or the Incubator stage, so no other golden moves. `journey-incubator.json` (keys, focus, lines, counts) is expected unchanged; a move there is a departure to report.

## 3. The stage recut (IA2, the art director, 0, by hand, about 1 h)

`room-bench-stage-incubator` is recut under the same id, 1024×522 at (0, 40). Each painted object is moved whole, with its cast shadow. The wall it leaves is repainted with the wall's own grain. Nothing is repainted in style: the T-01 rendering is kept.

| Object | Ink now | Ink after | Move |
| --- | --- | --- | --- |
| Left column (risers, vent, unit, junction box) | 98–226 × 92–391 | **88–216 × 104–399** | (−10, +12). Shorten the risers by 4 rows between their two lower clamps, so the foot ends at 399 |
| LM valve | 250–324 × 337–389 | **253–327 × 336–388** | (+3, −1) |
| RM pump | 693–747 × 333–396 | **696–750 × 336–399** | (+3, +3) |
| R group | 796–934 × 98–207 | **797–935 × 104–213** | (+1, +6) |
| Left gauge | 93–160 × 468–526 | **88–155 × 471–529** | (−5, +3) |
| Right gauge 1 | 774–841 × 467–526 | **784–851 × 470–529** | (+10, +3) |
| Right gauge 2 | 864–930 × 467–526 | **869–935 × 470–529** | (+5, +3) |
| Left hose | wall end 71, 420–440; base end at the coupling, about y 505–525 | wall end kept; the base end 16 px higher, on the base's left side at about 489–509 | Re-route the last bend only; ≥ 8 px from the gauge's and LM's ink |
| Right hose | wall end 948, 419–440; base end about 505–525 | wall end kept; base end about 489–509 on the base's right side | Re-route the last bend only; ≥ 8 px above GR's ink (470) |

- **Rules:**
  - lit from the top left, with shadows down and right;
  - nothing lit, no text, no gold, teal or amber;
  - no new object;
  - the leaf band, the chamber's keep-clear, the label place and the zones' outsides are kept pixel for pixel, except where an object left or arrived.
- **The luminance cap of IA1 stands:** in each zone p95 ≤ 0.162 and the mean ≤ 0.287.
- **The AD signs IA2** in the builder's whole 1× captures `incubator-empty`, `-growing`, `-ready` and `-hatch-1100`, beside the concept board (18c17261), with the gate's check 5 measured by the numbers in §0.
- **Until IA2 lands,** the old stage draws its objects at the old places. Build and test with it, and take the goldens only after `place-masters --only --ids room-bench-stage-incubator`.

## 4. Dirty area

`incubator.json` has no `events.redraw` block. The ceilings live in the event texts, in `derived["glass lift"]`, in `notes.motion` and in `incubator.test.mjs`. Each is checked against this layout. The numbers below are computed, not measured: the face was not built here.

| Frame | Ceiling (unchanged) | On station-gate | This layout |
| --- | --- | --- | --- |
| Hatch t = 0 | 55,808 | measured | Unchanged: no moving object changes size |
| Cracks 600, 800 | 20,480 | measured | Unchanged |
| Hatch 1000: juvenile + plaque cut | 98,944 (94,848 + 4,096) | 97,188 | Unchanged. The juvenile (160–472) and the plaque (480–512) stay apart. Their bounding box, 304 × 352 = 107,008, is more than the sum, so the two are not joined (it was 304 × 368 before) |
| Ribbon 1200 | 16,000 | measured | Unchanged |
| Steps 1400, 1800; hatch frames 16 and 40 ms | 96,064 / max(96,064, 98,944) | measured | Unchanged |
| growNow, motion on, ready at 400 | 153,600 | measured | Unchanged. Stamp and code are not joined: 176 × 150 = 26,400 against 14,400 + 4,400 |
| growNow cut, motion off | 162,432, 0 overflows | measured | Unchanged. The area count is the same; no box gains a neighbour |
| Wipe | 47,680 | measured | Unchanged: the stamp is 120 × 120 at a new place, and it is apart from the rail |
| Moving hatch | 153,600 | measured | Unchanged |

No ceiling rises. The builder prints the measured numbers. If one passes its ceiling, stop and report.

## 5. Spec edits (old → new)

**`prototypes/ui/specs/station/incubator.json`**

| Key | Old | New |
| --- | --- | --- |
| `regions.bench.paint` | `{ L: [80,88,160,312], R: [784,88,160,144], LM: [248,320,96,80], RM: [680,320,80,88] }` | `{ "L": [88,104,144,296], "R": [792,104,144,112], "LM": [248,336,80,64], "RM": [696,336,80,64] }` |
| `regions.bench.floor` (add) | — | `{ "GL": [88,464,72,66], "GR": [784,464,152,66], "line": 530, "note": "the gauges, moved whole (IA2); their ink and the base's block end on the line y 530, 18 above the bezel's seam (548)" }` |
| `regions.bench.keepClear` | `chamber [344,200,336,352]`, `label [768,240,184,176]` | `chamber [344,200,336,336]`, `label [792,232,144,152]`; leafBand unchanged |
| `regions.bench.recut` | "fix 5 IA1 …" | append "; IA2 (specs/station-incubator-layout-spec.md): every object moved whole onto the grid, the hoses' base ends 16 px higher" |
| `regions.bench.kept` | "everything below y 405 pixel for pixel (hoses, gauges, the floor lip)" | "the floor lip and the hoses' wall ends pixel for pixel; the gauges moved whole to GL and GR; the hoses' last bends re-routed to the base's couplings (IA2)" |
| `regions.bench.grid` (add) | — | `{ "pitch": 8, "gutter": 16, "columns": [[88,232],[248,776],[792,936]], "top": 104, "row": 336, "bottom": 530, "wall": [71,953], "seam": 548, "margins": { "left": 17, "right": 17, "bottom": 18, "top": 16 }, "note": "specs/station-incubator-layout-spec.md: three columns mirrored on 512, one 16 px gutter, margins measured from the bezel's seams (left = x − 71, right = 953 − right edge, bottom = 548 − bottom edge) and from the rail's well (88)" }` |
| `regions.base.rect` | `[344,456,336,96]` | `[344,440,336,96]` |
| `regions.base.plate` | `[448,496,128,32]` | `[448,480,128,32]` |
| `regions.base.footLight.rect` | `[352,548,320,2]` | `[352,532,320,2]` |
| `regions.base.lamp.rect` | `[652,506,12,12]` | `[652,490,12,12]` |
| `regions.base.note` | "… its foot at y 472 …" | "… the chamber stands in it, its foot (471) behind the base's lip (block 463–529, slice rows 23–89) …" (rest unchanged) |
| `regions.plaque.rect`, `lineTop` | `[448,496,128,32]`, 502 | `[448,480,128,32]`, 486 |
| `regions.stamp.rect` | `[804,256,120,120]` | `[804,232,120,120]` |
| `regions.stamp.slot` | "… raised 144 (label y 256, not 400) …" | "frame.json regions.stampSlot, raised 168 (label y 232, not 400), the top of the right column's label place under R (216 + 16)" |
| `regions.stamp.was` | "840, 296 …" | prepend "804, 256 (fix 4); " |
| `regions.code.rect`, `lineTop`, `baseline`, `rule` | `[776,381,176,25]`, 381, 397, `{ y 405, x [776,952] }` | `[776,357,176,25]`, 357, 373, `{ "y": 381, "h": 1, "x": [792,936] }` |
| `regions.code.offGrid` | "the line box 381 to 405 …" | "the line box 357 to 381 keeps 8 px from the baseline (373) to the rule (381), as Create's code does; the rule is the right column's width, 792 to 936 (17 from the bezel), not the box's" |
| `regions.code.slot` | "… 9 px above the cable at x 932 (y 414)" | "frame.json regions.stampSlot code, moved with the label: 5 px under it, 8 px from baseline to rule" |
| `derived.code` | — | append " Grid (specs/station-incubator-layout-spec.md): at 776, 357, its rule 792 to 936" |
| `status` | — | append "Margins and grid (specs/station-incubator-layout-spec.md): three columns on one 8 px grid mirrored on 512, margins 17 / 17 / 18, one bottom line y 530; the base at 440 seats the chamber" |

**`prototypes/ui/specs/station/frame.json`**, `regions.stampSlot.screens.incubator`:
- Old: "label (804, 256, 120, 120), code (776, 381, 176, 25), baseline 397, rule 405: the slot raised 144 clear of the stage's cable and gauges".
- New: "label (804, 232, 120, 120), code (776, 357, 176, 25), baseline 373, rule 381 from x 792 to 936: the slot raised 168, the right column's label place under the R machinery".

No other key changes.

**Code.**
- `incubator.c` reads every rect, `lineTop`, `rule.x` and `rule.y` from the spec. Its defaults (502, 405, 426) are fallbacks only.
- `incubator-props.mjs` and `incubator-regions.mjs` read the spec.
- No code change is expected. If a number is hard-coded, stop and report it.

## 6. Tests to change

**`prototypes/ui/tests/specs.test.mjs`**
- :264, `R.base.rect[1] + R.base.rect[3] <= 552`, becomes `assert.deepEqual(R.base.rect, [344, 440, 336, 96])`, plus `R.base.rect[1] + 90 === R.bench.floor.line` ("the base's block, slice rows 23–89, on the bottom line").
- :267 holds as is (code 776, 176; 5, 16, 8; label x 804 on the shared slot).
- :886:
  - `B.paint` → `{ L: [88,104,144,296], R: [792,104,144,112], LM: [248,336,80,64], RM: [696,336,80,64] }`;
  - `B.keepClear` → `{ leafBand: [248,80,528,240], chamber: [344,200,336,336], label: [792,232,144,152] }`.
  - The loop at :888–893 holds: every zone is on the wall and apart from every keep-clear and every leaf (the nearest leaf is 34 px away), with L, LM and RM ending at 400 ≤ 405 and RM ≤ 419.
- New block, after :897, "the Incubator on one grid (specs/station-incubator-layout-spec.md)":
  - `const G = B.grid, P = B.paint, F = B.floor, K = B.keepClear;` `G.margins` deep-equals `{ left: 17, right: 17, bottom: 18, top: 16 }`.
  - Outer margins:
    - `P.L[0] - 71 === 17`, `F.GL[0] - 71 === 17`;
    - `953 - (P.R[0] + P.R[2]) === 17`, `953 - (F.GR[0] + F.GR[2]) === 17`, `953 - R.code.rule.x[1] === 17`;
    - `548 - F.line === 18`;
    - each between 16 and 24, left === right.
  - Top: `P.L[1] === P.R[1] === frame.regions.rail.well.y + frame.regions.rail.well.h + 16` (104).
  - Mirror on 512:
    - `P.L[0] + P.R[0] + P.R[2] === 1024`;
    - `P.L[0] + P.L[2] + P.R[0] === 1024`;
    - `P.LM[0] + P.LM[2] + P.RM[0] === 1024`;
    - `P.LM[1] === P.RM[1] === 336`.
  - One gutter of 16:
    - `K.leafBand[0] - (P.L[0] + P.L[2])`, `P.R[0] - (K.leafBand[0] + K.leafBand[2])`;
    - `P.LM[0] - (P.L[0] + P.L[2])`, `K.chamber[0] - (P.LM[0] + P.LM[2])`, `P.RM[0] - (K.chamber[0] + K.chamber[2])`, `K.label[0] - (P.RM[0] + P.RM[2])`;
    - `K.label[1] - (P.R[1] + P.R[3])`, `P.LM[1] - (K.leafBand[1] + K.leafBand[3])`;
    - each === 16.
  - Every zone, floor rect and keep-clear has x, y and w on the 8 grid. The floor rects' h is 66, ending on the line: `F.GL[1] + F.GL[3] === F.line`, likewise GR.
  - The code's rule centred on the label: `(R.code.rule.x[0] + R.code.rule.x[1]) / 2 === R.stamp.rect[0] + 60`.
  - The stamp and the code inside `K.label`.
  - Seated: `R.base.rect[1] + 23 <= R.dome.rect[1] + R.dome.rect[3] - 1` (463 ≤ 471).
  - `inside(R.base.rect, K.chamber)`.
- `boxesOf` (:255–259) holds with the patched SVGs (§7). I checked every changed rect against the patched files.

**`prototypes/face/tests/incubator.test.mjs`**
- No number changes. :83 sets the stamp plate to y 380, which is still a departure from 232. :84 injects a foot-light region, and it bites at any rect.
- :173–178 and :180–196: the ceilings are unchanged; the builder re-prints the measured numbers.
- :241–249 (the juvenile's feet 472, the stand-in's 424) are unchanged, since the juvenile does not move.

**`prototypes/station/tests/incubator-props.test.mjs`**: no change. The props carry no rects.

## 7. Wireframes (SVG only) and docs

The patch below applies to 04, 05, 05b and 05c at station-gate 93bff40f (`git apply --check` clean). 05d (the navigation) has no geometry and does not change. The patch does three things:
- It moves the base, the plaque, the foot light, the lamp, the label, the code and its rule.
- It redraws the four zones.
- It adds GL and GR, the top line 104, the outer lines 88 and 936 with their 17s, and the bottom line 530 with its 18.

The builder re-renders each PNG with the house tool.

```diff
diff --git a/design/style-guide/station-layouts/04-incubator-growing.svg b/design/style-guide/station-layouts/04-incubator-growing.svg
index bf8ecae..80a06cc 100644
--- a/design/style-guide/station-layouts/04-incubator-growing.svg
+++ b/design/style-guide/station-layouts/04-incubator-growing.svg
@@ -21,14 +21,14 @@
 <rect x="658.5" y="43.5" width="23" height="23" fill="#fff" stroke="#bbb" stroke-width="1"/>
 <text x="690" y="60" font-size="11" fill="#8d8aa6">Stamina</text>
 <rect x="719.5" y="71.5" width="5" height="5" fill="#fff" stroke="#8d8aa6" stroke-width="1"/>
-<rect x="804.5" y="256.5" width="119" height="119" fill="#e6eef8" stroke="#2b6cb0" stroke-width="1.5"/>
-<text x="808" y="270" font-size="10" fill="#222">STAMP label 120</text>
-<text x="808" y="281" font-size="9" fill="#777">804,256 120×120</text>
-<text x="808" y="294" font-size="9" fill="#777">140 from the window</text>
-<rect x="776.5" y="381.5" width="175" height="24" fill="none" stroke="#999" stroke-width="1" stroke-dasharray="2 2"/>
-<line x1="776" y1="405.5" x2="952" y2="405.5" stroke="#3c4b57" stroke-width="1"/>
-<text x="864" y="397" font-size="13" fill="#222" text-anchor="middle">K7Q 4MX P2D</text>
-<text x="864" y="416" font-size="9" fill="#777" text-anchor="middle">code 776,381 176×25</text>
+<rect x="804.5" y="232.5" width="119" height="119" fill="#e6eef8" stroke="#2b6cb0" stroke-width="1.5"/>
+<text x="808" y="246" font-size="10" fill="#222">STAMP label 120</text>
+<text x="808" y="257" font-size="9" fill="#777">804,232 120×120</text>
+<text x="808" y="270" font-size="9" fill="#777">140 from the window</text>
+<rect x="776.5" y="357.5" width="175" height="24" fill="none" stroke="#999" stroke-width="1" stroke-dasharray="2 2"/>
+<line x1="792" y1="381.5" x2="936" y2="381.5" stroke="#3c4b57" stroke-width="1"/>
+<text x="864" y="373" font-size="13" fill="#222" text-anchor="middle">K7Q 4MX P2D</text>
+<text x="864" y="392" font-size="9" fill="#777" text-anchor="middle">code 776,357 176×25 · rule 792–936</text>
 <rect x="256.5" y="88.5" width="511" height="215" fill="none" stroke="#9cc08f" stroke-width="1" stroke-dasharray="4 3"/>
 <text x="260" y="100" font-size="9" fill="#5d7a5f">leaves 256,88 512×216</text>
 <path d="M 302 301 C 296 296, 297 286, 302 282.5 C 307 286, 308 296, 302 301 Z" transform="rotate(40 302 292)" fill="#84ae78" stroke="#5d7a5f" stroke-width="1"/>
@@ -60,11 +60,11 @@
 <text x="368" y="452" font-size="9" fill="#777">chamber window 360,200 304×272 · ink inside the arch, top 202, r152 on 512,354 · placeholder</text>
 <rect x="408.5" y="400.5" width="207" height="47" fill="#f6ecd8" stroke="#bf9157" stroke-width="1"/>
 <text x="412" y="444" font-size="9" fill="#7d5435">nest 408,400 208×48</text>
-<rect x="344.5" y="456.5" width="335" height="95" fill="#e4e8ea" stroke="#444" stroke-width="1"/>
-<text x="352" y="472" font-size="9" fill="#555">base 344,456 336×96 · placeholder</text>
-<rect x="448.5" y="496.5" width="127" height="31" fill="#2a2e38" stroke="#3c4b57" stroke-width="1"/>
-<rect x="352.5" y="547.5" width="319" height="2" fill="#eaeff6" stroke="#8ca0ab" stroke-width="1"/>
-<text x="672" y="544" font-size="9" fill="#555" text-anchor="end">foot light, on</text>
+<rect x="344.5" y="440.5" width="335" height="95" fill="#e4e8ea" stroke="#444" stroke-width="1"/>
+<text x="352" y="456" font-size="9" fill="#555">base 344,440 336×96 · block 463–529 · placeholder</text>
+<rect x="448.5" y="480.5" width="127" height="31" fill="#2a2e38" stroke="#3c4b57" stroke-width="1"/>
+<rect x="352.5" y="531.5" width="319" height="2" fill="#eaeff6" stroke="#8ca0ab" stroke-width="1"/>
+<text x="672" y="528" font-size="9" fill="#555" text-anchor="end">foot light, on</text>
 <rect x="448.5" y="264.5" width="127" height="159" fill="#ffe2c4" stroke="#c45f12" stroke-width="2"/>
 <text x="452" y="280" font-size="10" fill="#222">BUD 128×160</text>
 <text x="452" y="291" font-size="9" fill="#777">448,264 128×160</text>
@@ -74,7 +74,7 @@
 <line x1="616" y1="440" x2="668" y2="420" stroke="#7d5435" stroke-width="1"/>
 <text x="672" y="418" font-size="9" fill="#7d5435">nestFront 408,400 208×48:</text>
 <text x="672" y="429" font-size="9" fill="#7d5435">rim fibres, over the bud</text>
-<text x="512" y="517" font-size="13" fill="#c6c4d8" text-anchor="middle">growing</text>
+<text x="512" y="501" font-size="13" fill="#c6c4d8" text-anchor="middle">growing</text>
 <text x="24" y="96" font-size="10" fill="#2b6cb0">Leaves (the word leaves, rule</text>
 <text x="24" y="109" font-size="10" fill="#2b6cb0">leafArc): one a minute; inner</text>
 <text x="24" y="122" font-size="10" fill="#2b6cb0">arc r216 first (to 20), then</text>
@@ -125,12 +125,24 @@
 <text x="951" y="586" font-size="11" fill="#fff" text-anchor="middle">←</text>
 <text x="1006" y="587" font-size="14" fill="#6b6880" text-anchor="end">Home</text>
 <defs><pattern id="pz" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#ffffff" fill-opacity="0"/><path d="M0 0H0V6" stroke="#5d7a5f" stroke-width="1" stroke-opacity="0.55"/></pattern></defs>
-<rect x="80.5" y="88.5" width="159" height="311" fill="url(#pz)" stroke="#5d7a5f" stroke-width="1" stroke-dasharray="4 3"/>
-<text x="84" y="99" font-size="8" fill="#3f5a41" font-family="DejaVu Sans Mono, ui-monospace, monospace">L paint zone 80,88 160×312</text>
-<rect x="784.5" y="88.5" width="159" height="143" fill="url(#pz)" stroke="#5d7a5f" stroke-width="1" stroke-dasharray="4 3"/>
-<text x="788" y="99" font-size="8" fill="#3f5a41" font-family="DejaVu Sans Mono, ui-monospace, monospace">R paint zone 784,88 160×144</text>
-<rect x="248.5" y="320.5" width="95" height="79" fill="url(#pz)" stroke="#5d7a5f" stroke-width="1" stroke-dasharray="4 3"/>
-<text x="252" y="331" font-size="8" fill="#3f5a41" font-family="DejaVu Sans Mono, ui-monospace, monospace">LM paint zone 248,320 96×80</text>
-<rect x="680.5" y="320.5" width="79" height="87" fill="url(#pz)" stroke="#5d7a5f" stroke-width="1" stroke-dasharray="4 3"/>
-<text x="684" y="331" font-size="8" fill="#3f5a41" font-family="DejaVu Sans Mono, ui-monospace, monospace">RM paint zone 680,320 80×88</text>
+<rect x="88.5" y="104.5" width="143" height="295" fill="url(#pz)" stroke="#5d7a5f" stroke-width="1" stroke-dasharray="4 3"/>
+<text x="92" y="115" font-size="8" fill="#3f5a41" font-family="DejaVu Sans Mono, ui-monospace, monospace">L zone 88,104 144×296</text>
+<rect x="792.5" y="104.5" width="143" height="111" fill="url(#pz)" stroke="#5d7a5f" stroke-width="1" stroke-dasharray="4 3"/>
+<text x="796" y="115" font-size="8" fill="#3f5a41" font-family="DejaVu Sans Mono, ui-monospace, monospace">R zone 792,104 144×112</text>
+<rect x="248.5" y="336.5" width="79" height="63" fill="url(#pz)" stroke="#5d7a5f" stroke-width="1" stroke-dasharray="4 3"/>
+<text x="252" y="347" font-size="8" fill="#3f5a41" font-family="DejaVu Sans Mono, ui-monospace, monospace">LM 248,336 80×64</text>
+<rect x="696.5" y="336.5" width="79" height="63" fill="url(#pz)" stroke="#5d7a5f" stroke-width="1" stroke-dasharray="4 3"/>
+<text x="700" y="347" font-size="8" fill="#3f5a41" font-family="DejaVu Sans Mono, ui-monospace, monospace">RM 696,336 80×64</text>
+<rect x="88.5" y="464.5" width="71" height="65" fill="url(#pz)" stroke="#5d7a5f" stroke-width="1" stroke-dasharray="4 3"/>
+<text x="92" y="475" font-size="8" fill="#3f5a41" font-family="DejaVu Sans Mono, ui-monospace, monospace">GL 88,464 72×66</text>
+<rect x="784.5" y="464.5" width="151" height="65" fill="url(#pz)" stroke="#5d7a5f" stroke-width="1" stroke-dasharray="4 3"/>
+<text x="788" y="475" font-size="8" fill="#3f5a41" font-family="DejaVu Sans Mono, ui-monospace, monospace">GR 784,464 152×66</text>
+<line x1="88" y1="530.5" x2="936" y2="530.5" stroke="#c45f12" stroke-width="1" stroke-dasharray="6 3"/>
+<text x="936" y="542" font-size="8" fill="#c45f12" text-anchor="end" font-family="DejaVu Sans Mono, ui-monospace, monospace">bottom line 530: base block, gauges · bezel 548: 18</text>
+<line x1="88" y1="103.5" x2="936" y2="103.5" stroke="#c45f12" stroke-width="1" stroke-dasharray="2 4"/>
+<text x="80" y="98" font-size="8" fill="#c45f12" text-anchor="end" font-family="DejaVu Sans Mono, ui-monospace, monospace">104</text>
+<line x1="88.5" y1="104" x2="88.5" y2="530" stroke="#c45f12" stroke-width="1" stroke-dasharray="2 4"/>
+<line x1="935.5" y1="104" x2="935.5" y2="530" stroke="#c45f12" stroke-width="1" stroke-dasharray="2 4"/>
+<text x="86" y="300" font-size="8" fill="#c45f12" text-anchor="end" font-family="DejaVu Sans Mono, ui-monospace, monospace">17</text>
+<text x="940" y="300" font-size="8" fill="#c45f12" font-family="DejaVu Sans Mono, ui-monospace, monospace">17</text>
 </svg>
diff --git a/design/style-guide/station-layouts/05-incubator-ready.svg b/design/style-guide/station-layouts/05-incubator-ready.svg
index bfe0af5..bc5ae07 100644
--- a/design/style-guide/station-layouts/05-incubator-ready.svg
+++ b/design/style-guide/station-layouts/05-incubator-ready.svg
@@ -21,14 +21,14 @@
 <rect x="658.5" y="43.5" width="23" height="23" fill="#fff" stroke="#888" stroke-width="1"/>
 <text x="690" y="60" font-size="11" fill="#222">Stamina</text>
 <rect x="719.5" y="71.5" width="5" height="5" fill="#555" stroke="#444" stroke-width="1"/>
-<rect x="804.5" y="256.5" width="119" height="119" fill="#e6eef8" stroke="#2b6cb0" stroke-width="1.5"/>
-<text x="808" y="270" font-size="10" fill="#222">STAMP label 120</text>
-<text x="808" y="281" font-size="9" fill="#777">804,256 120×120</text>
-<text x="808" y="294" font-size="9" fill="#777">140 from the window</text>
-<rect x="776.5" y="381.5" width="175" height="24" fill="none" stroke="#999" stroke-width="1" stroke-dasharray="2 2"/>
-<line x1="776" y1="405.5" x2="952" y2="405.5" stroke="#3c4b57" stroke-width="1"/>
-<text x="864" y="397" font-size="13" fill="#222" text-anchor="middle">K7Q 4MX P2D</text>
-<text x="864" y="416" font-size="9" fill="#777" text-anchor="middle">code 776,381 176×25</text>
+<rect x="804.5" y="232.5" width="119" height="119" fill="#e6eef8" stroke="#2b6cb0" stroke-width="1.5"/>
+<text x="808" y="246" font-size="10" fill="#222">STAMP label 120</text>
+<text x="808" y="257" font-size="9" fill="#777">804,232 120×120</text>
+<text x="808" y="270" font-size="9" fill="#777">140 from the window</text>
+<rect x="776.5" y="357.5" width="175" height="24" fill="none" stroke="#999" stroke-width="1" stroke-dasharray="2 2"/>
+<line x1="792" y1="381.5" x2="936" y2="381.5" stroke="#3c4b57" stroke-width="1"/>
+<text x="864" y="373" font-size="13" fill="#222" text-anchor="middle">K7Q 4MX P2D</text>
+<text x="864" y="392" font-size="9" fill="#777" text-anchor="middle">code 776,357 176×25 · rule 792–936</text>
 <rect x="256.5" y="88.5" width="511" height="215" fill="none" stroke="#9cc08f" stroke-width="1" stroke-dasharray="4 3"/>
 <path d="M 302 301 C 296 296, 297 286, 302 282.5 C 307 286, 308 296, 302 301 Z" transform="rotate(40 302 292)" fill="#84ae78" stroke="#5d7a5f" stroke-width="1"/>
 <path d="M 312 272 C 306 267, 307 257, 312 253.5 C 317 257, 318 267, 312 272 Z" transform="rotate(40 312 263)" fill="#84ae78" stroke="#5d7a5f" stroke-width="1"/>
@@ -58,11 +58,11 @@
 <text x="368" y="452" font-size="9" fill="#777">chamber window 360,200 304×272 · ink inside the arch, top 202, r152 on 512,354 · placeholder · glowing</text>
 <rect x="408.5" y="400.5" width="207" height="47" fill="#f6ecd8" stroke="#bf9157" stroke-width="1"/>
 <text x="412" y="444" font-size="9" fill="#7d5435">nest 408,400 208×48</text>
-<rect x="344.5" y="456.5" width="335" height="95" fill="#e4e8ea" stroke="#444" stroke-width="1"/>
-<text x="352" y="472" font-size="9" fill="#555">base 344,456 336×96 · placeholder</text>
-<rect x="448.5" y="496.5" width="127" height="31" fill="#2a2e38" stroke="#3c4b57" stroke-width="1"/>
-<rect x="352.5" y="547.5" width="319" height="2" fill="#eaeff6" stroke="#8ca0ab" stroke-width="1"/>
-<text x="672" y="544" font-size="9" fill="#555" text-anchor="end">foot light, on</text>
+<rect x="344.5" y="440.5" width="335" height="95" fill="#e4e8ea" stroke="#444" stroke-width="1"/>
+<text x="352" y="456" font-size="9" fill="#555">base 344,440 336×96 · block 463–529 · placeholder</text>
+<rect x="448.5" y="480.5" width="127" height="31" fill="#2a2e38" stroke="#3c4b57" stroke-width="1"/>
+<rect x="352.5" y="531.5" width="319" height="2" fill="#eaeff6" stroke="#8ca0ab" stroke-width="1"/>
+<text x="672" y="528" font-size="9" fill="#555" text-anchor="end">foot light, on</text>
 <rect x="448.5" y="264.5" width="127" height="159" fill="#fff0d6" stroke="#c45f12" stroke-width="2"/>
 <text x="452" y="280" font-size="10" fill="#222">BUD ready</text>
 <rect x="456.5" y="288.5" width="111" height="111" fill="none" stroke="#7d5435" stroke-width="1" stroke-dasharray="3 2"/>
@@ -74,9 +74,9 @@
 <line x1="616" y1="440" x2="668" y2="420" stroke="#7d5435" stroke-width="1"/>
 <text x="672" y="418" font-size="9" fill="#7d5435">nestFront 408,400 208×48:</text>
 <text x="672" y="429" font-size="9" fill="#7d5435">rim fibres, over the bud</text>
-<text x="512" y="517" font-size="13" fill="#f1ebdf" text-anchor="middle">ready</text>
-<rect x="652.5" y="506.5" width="11" height="11" fill="#5bb9f3" stroke="#0c0a12" stroke-width="1"/>
-<text x="668" y="532" font-size="9" fill="#1e5196" text-anchor="end">waiting lamp 652,506</text>
+<text x="512" y="501" font-size="13" fill="#f1ebdf" text-anchor="middle">ready</text>
+<rect x="652.5" y="490.5" width="11" height="11" fill="#5bb9f3" stroke="#0c0a12" stroke-width="1"/>
+<text x="668" y="516" font-size="9" fill="#1e5196" text-anchor="end">waiting lamp 652,490</text>
 <text x="24" y="96" font-size="10" fill="#2b6cb0">Ready reads across a table:</text>
 <text x="24" y="109" font-size="10" fill="#2b6cb0">the full leaves, the glowing</text>
 <text x="24" y="122" font-size="10" fill="#2b6cb0">chamber, the plaque, ✓ Open.</text>
@@ -122,12 +122,24 @@
 <text x="951" y="586" font-size="11" fill="#fff" text-anchor="middle">←</text>
 <text x="1006" y="587" font-size="14" fill="#6b6880" text-anchor="end">Home</text>
 <defs><pattern id="pz" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#ffffff" fill-opacity="0"/><path d="M0 0H0V6" stroke="#5d7a5f" stroke-width="1" stroke-opacity="0.55"/></pattern></defs>
-<rect x="80.5" y="88.5" width="159" height="311" fill="url(#pz)" stroke="#5d7a5f" stroke-width="1" stroke-dasharray="4 3"/>
-<text x="84" y="99" font-size="8" fill="#3f5a41" font-family="DejaVu Sans Mono, ui-monospace, monospace">L paint zone 80,88 160×312</text>
-<rect x="784.5" y="88.5" width="159" height="143" fill="url(#pz)" stroke="#5d7a5f" stroke-width="1" stroke-dasharray="4 3"/>
-<text x="788" y="99" font-size="8" fill="#3f5a41" font-family="DejaVu Sans Mono, ui-monospace, monospace">R paint zone 784,88 160×144</text>
-<rect x="248.5" y="320.5" width="95" height="79" fill="url(#pz)" stroke="#5d7a5f" stroke-width="1" stroke-dasharray="4 3"/>
-<text x="252" y="331" font-size="8" fill="#3f5a41" font-family="DejaVu Sans Mono, ui-monospace, monospace">LM paint zone 248,320 96×80</text>
-<rect x="680.5" y="320.5" width="79" height="87" fill="url(#pz)" stroke="#5d7a5f" stroke-width="1" stroke-dasharray="4 3"/>
-<text x="684" y="331" font-size="8" fill="#3f5a41" font-family="DejaVu Sans Mono, ui-monospace, monospace">RM paint zone 680,320 80×88</text>
+<rect x="88.5" y="104.5" width="143" height="295" fill="url(#pz)" stroke="#5d7a5f" stroke-width="1" stroke-dasharray="4 3"/>
+<text x="92" y="115" font-size="8" fill="#3f5a41" font-family="DejaVu Sans Mono, ui-monospace, monospace">L zone 88,104 144×296</text>
+<rect x="792.5" y="104.5" width="143" height="111" fill="url(#pz)" stroke="#5d7a5f" stroke-width="1" stroke-dasharray="4 3"/>
+<text x="796" y="115" font-size="8" fill="#3f5a41" font-family="DejaVu Sans Mono, ui-monospace, monospace">R zone 792,104 144×112</text>
+<rect x="248.5" y="336.5" width="79" height="63" fill="url(#pz)" stroke="#5d7a5f" stroke-width="1" stroke-dasharray="4 3"/>
+<text x="252" y="347" font-size="8" fill="#3f5a41" font-family="DejaVu Sans Mono, ui-monospace, monospace">LM 248,336 80×64</text>
+<rect x="696.5" y="336.5" width="79" height="63" fill="url(#pz)" stroke="#5d7a5f" stroke-width="1" stroke-dasharray="4 3"/>
+<text x="700" y="347" font-size="8" fill="#3f5a41" font-family="DejaVu Sans Mono, ui-monospace, monospace">RM 696,336 80×64</text>
+<rect x="88.5" y="464.5" width="71" height="65" fill="url(#pz)" stroke="#5d7a5f" stroke-width="1" stroke-dasharray="4 3"/>
+<text x="92" y="475" font-size="8" fill="#3f5a41" font-family="DejaVu Sans Mono, ui-monospace, monospace">GL 88,464 72×66</text>
+<rect x="784.5" y="464.5" width="151" height="65" fill="url(#pz)" stroke="#5d7a5f" stroke-width="1" stroke-dasharray="4 3"/>
+<text x="788" y="475" font-size="8" fill="#3f5a41" font-family="DejaVu Sans Mono, ui-monospace, monospace">GR 784,464 152×66</text>
+<line x1="88" y1="530.5" x2="936" y2="530.5" stroke="#c45f12" stroke-width="1" stroke-dasharray="6 3"/>
+<text x="936" y="542" font-size="8" fill="#c45f12" text-anchor="end" font-family="DejaVu Sans Mono, ui-monospace, monospace">bottom line 530: base block, gauges · bezel 548: 18</text>
+<line x1="88" y1="103.5" x2="936" y2="103.5" stroke="#c45f12" stroke-width="1" stroke-dasharray="2 4"/>
+<text x="80" y="98" font-size="8" fill="#c45f12" text-anchor="end" font-family="DejaVu Sans Mono, ui-monospace, monospace">104</text>
+<line x1="88.5" y1="104" x2="88.5" y2="530" stroke="#c45f12" stroke-width="1" stroke-dasharray="2 4"/>
+<line x1="935.5" y1="104" x2="935.5" y2="530" stroke="#c45f12" stroke-width="1" stroke-dasharray="2 4"/>
+<text x="86" y="300" font-size="8" fill="#c45f12" text-anchor="end" font-family="DejaVu Sans Mono, ui-monospace, monospace">17</text>
+<text x="940" y="300" font-size="8" fill="#c45f12" font-family="DejaVu Sans Mono, ui-monospace, monospace">17</text>
 </svg>
diff --git a/design/style-guide/station-layouts/05b-incubator-hatch.svg b/design/style-guide/station-layouts/05b-incubator-hatch.svg
index b7a7763..28b48fa 100644
--- a/design/style-guide/station-layouts/05b-incubator-hatch.svg
+++ b/design/style-guide/station-layouts/05b-incubator-hatch.svg
@@ -21,25 +21,25 @@
 <rect x="658.5" y="43.5" width="23" height="23" fill="#fff" stroke="#888" stroke-width="1"/>
 <text x="690" y="60" font-size="11" fill="#222">Stamina</text>
 <rect x="719.5" y="71.5" width="5" height="5" fill="#555" stroke="#444" stroke-width="1"/>
-<rect x="804.5" y="256.5" width="119" height="119" fill="#e6eef8" stroke="#2b6cb0" stroke-width="1.5"/>
-<text x="808" y="270" font-size="10" fill="#222">STAMP label 120</text>
-<text x="808" y="281" font-size="9" fill="#777">804,256 120×120</text>
-<text x="808" y="294" font-size="9" fill="#777">140 from the window</text>
-<rect x="776.5" y="381.5" width="175" height="24" fill="none" stroke="#999" stroke-width="1" stroke-dasharray="2 2"/>
-<line x1="776" y1="405.5" x2="952" y2="405.5" stroke="#3c4b57" stroke-width="1"/>
-<text x="864" y="397" font-size="13" fill="#222" text-anchor="middle">K7Q 4MX P2D</text>
-<text x="864" y="416" font-size="9" fill="#777" text-anchor="middle">code 776,381 176×25</text>
+<rect x="804.5" y="232.5" width="119" height="119" fill="#e6eef8" stroke="#2b6cb0" stroke-width="1.5"/>
+<text x="808" y="246" font-size="10" fill="#222">STAMP label 120</text>
+<text x="808" y="257" font-size="9" fill="#777">804,232 120×120</text>
+<text x="808" y="270" font-size="9" fill="#777">140 from the window</text>
+<rect x="776.5" y="357.5" width="175" height="24" fill="none" stroke="#999" stroke-width="1" stroke-dasharray="2 2"/>
+<line x1="792" y1="381.5" x2="936" y2="381.5" stroke="#3c4b57" stroke-width="1"/>
+<text x="864" y="373" font-size="13" fill="#222" text-anchor="middle">K7Q 4MX P2D</text>
+<text x="864" y="392" font-size="9" fill="#777" text-anchor="middle">code 776,357 176×25 · rule 792–936</text>
 <line x1="668" y1="300" x2="668" y2="96" stroke="#2b6cb0" stroke-width="1.5" marker-end="url(#ah)"/>
 <text x="674" y="200" font-size="9" fill="#2b6cb0">window swings up on its hinge,</text>
 <text x="674" y="211" font-size="9" fill="#2b6cb0">3 slices in 0–600 ms (placeholder:</text>
 <text x="674" y="222" font-size="9" fill="#2b6cb0">lifts 384 px), clipped at y 88</text>
 <rect x="408.5" y="400.5" width="207" height="47" fill="#f6ecd8" stroke="#bf9157" stroke-width="1"/>
 <text x="412" y="444" font-size="9" fill="#7d5435">nest 408,400 208×48</text>
-<rect x="344.5" y="456.5" width="335" height="95" fill="#e4e8ea" stroke="#444" stroke-width="1"/>
-<text x="352" y="472" font-size="9" fill="#555">base 344,456 336×96 · placeholder</text>
-<rect x="448.5" y="496.5" width="127" height="31" fill="#2a2e38" stroke="#3c4b57" stroke-width="1"/>
-<rect x="352.5" y="547.5" width="319" height="2" fill="#eaeff6" stroke="#8ca0ab" stroke-width="1"/>
-<text x="672" y="544" font-size="9" fill="#555" text-anchor="end">foot light, on</text>
+<rect x="344.5" y="440.5" width="335" height="95" fill="#e4e8ea" stroke="#444" stroke-width="1"/>
+<text x="352" y="456" font-size="9" fill="#555">base 344,440 336×96 · block 463–529 · placeholder</text>
+<rect x="448.5" y="480.5" width="127" height="31" fill="#2a2e38" stroke="#3c4b57" stroke-width="1"/>
+<rect x="352.5" y="531.5" width="319" height="2" fill="#eaeff6" stroke="#8ca0ab" stroke-width="1"/>
+<text x="672" y="528" font-size="9" fill="#555" text-anchor="end">foot light, on</text>
 <path d="M 408.5 432 C 450 444, 574 444, 615.5 432 L 615.5 447.5 L 408.5 447.5 Z" fill="#e9d2a6" stroke="#bf9157" stroke-width="1"/>
 <rect x="408.5" y="400.5" width="207" height="47" fill="none" stroke="#7d5435" stroke-width="1" stroke-dasharray="1 2"/>
 <line x1="616" y1="440" x2="668" y2="420" stroke="#7d5435" stroke-width="1"/>
@@ -53,7 +53,7 @@
 <rect x="312.5" y="104.5" width="399" height="39" fill="#0f4c50" stroke="#45d8be" stroke-width="1"/>
 <text x="512" y="130" font-size="16" fill="#f1ebdf" text-anchor="middle">Fig, a young Loika</text>
 <text x="716" y="116" font-size="9" fill="#777">ribbon 312,104 400×40</text>
-<rect x="652.5" y="506.5" width="11" height="11" fill="#5bb9f3" stroke="#0c0a12" stroke-width="1"/>
+<rect x="652.5" y="490.5" width="11" height="11" fill="#5bb9f3" stroke="#0c0a12" stroke-width="1"/>
 <text x="24" y="96" font-size="10" fill="#2b6cb0">✓ Open (held 2780 ms,</text>
 <text x="24" y="109" font-size="10" fill="#2b6cb0">a held state):</text>
 <text x="24" y="122" font-size="10" fill="#2b6cb0">0 the leaves go (plaque keeps "ready");</text>
@@ -98,13 +98,25 @@
 <text x="951" y="586" font-size="11" fill="#fff" text-anchor="middle">←</text>
 <text x="1006" y="587" font-size="14" fill="#6b6880" text-anchor="end">Home</text>
 <defs><pattern id="pz" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#ffffff" fill-opacity="0"/><path d="M0 0H0V6" stroke="#5d7a5f" stroke-width="1" stroke-opacity="0.55"/></pattern></defs>
-<rect x="80.5" y="88.5" width="159" height="311" fill="url(#pz)" stroke="#5d7a5f" stroke-width="1" stroke-dasharray="4 3"/>
-<text x="84" y="99" font-size="8" fill="#3f5a41" font-family="DejaVu Sans Mono, ui-monospace, monospace">L paint zone 80,88 160×312</text>
-<rect x="784.5" y="88.5" width="159" height="143" fill="url(#pz)" stroke="#5d7a5f" stroke-width="1" stroke-dasharray="4 3"/>
-<text x="788" y="99" font-size="8" fill="#3f5a41" font-family="DejaVu Sans Mono, ui-monospace, monospace">R paint zone 784,88 160×144</text>
-<rect x="248.5" y="320.5" width="95" height="79" fill="url(#pz)" stroke="#5d7a5f" stroke-width="1" stroke-dasharray="4 3"/>
-<text x="252" y="331" font-size="8" fill="#3f5a41" font-family="DejaVu Sans Mono, ui-monospace, monospace">LM paint zone 248,320 96×80</text>
-<rect x="680.5" y="320.5" width="79" height="87" fill="url(#pz)" stroke="#5d7a5f" stroke-width="1" stroke-dasharray="4 3"/>
-<text x="684" y="331" font-size="8" fill="#3f5a41" font-family="DejaVu Sans Mono, ui-monospace, monospace">RM paint zone 680,320 80×88</text>
-<text x="512" y="517" font-size="13" fill="#c6c4d8" text-anchor="middle">ready</text><text x="512" y="545" font-size="8" fill="#555" text-anchor="middle" font-family="DejaVu Sans Mono, ui-monospace, monospace">plaque: "ready" to 1000, then "hatched"</text>
+<rect x="88.5" y="104.5" width="143" height="295" fill="url(#pz)" stroke="#5d7a5f" stroke-width="1" stroke-dasharray="4 3"/>
+<text x="92" y="115" font-size="8" fill="#3f5a41" font-family="DejaVu Sans Mono, ui-monospace, monospace">L zone 88,104 144×296</text>
+<rect x="792.5" y="104.5" width="143" height="111" fill="url(#pz)" stroke="#5d7a5f" stroke-width="1" stroke-dasharray="4 3"/>
+<text x="796" y="115" font-size="8" fill="#3f5a41" font-family="DejaVu Sans Mono, ui-monospace, monospace">R zone 792,104 144×112</text>
+<rect x="248.5" y="336.5" width="79" height="63" fill="url(#pz)" stroke="#5d7a5f" stroke-width="1" stroke-dasharray="4 3"/>
+<text x="252" y="347" font-size="8" fill="#3f5a41" font-family="DejaVu Sans Mono, ui-monospace, monospace">LM 248,336 80×64</text>
+<rect x="696.5" y="336.5" width="79" height="63" fill="url(#pz)" stroke="#5d7a5f" stroke-width="1" stroke-dasharray="4 3"/>
+<text x="700" y="347" font-size="8" fill="#3f5a41" font-family="DejaVu Sans Mono, ui-monospace, monospace">RM 696,336 80×64</text>
+<text x="512" y="501" font-size="13" fill="#c6c4d8" text-anchor="middle">ready</text><text x="512" y="529" font-size="8" fill="#555" text-anchor="middle" font-family="DejaVu Sans Mono, ui-monospace, monospace">plaque: "ready" to 1000, then "hatched"</text>
+<rect x="88.5" y="464.5" width="71" height="65" fill="url(#pz)" stroke="#5d7a5f" stroke-width="1" stroke-dasharray="4 3"/>
+<text x="92" y="475" font-size="8" fill="#3f5a41" font-family="DejaVu Sans Mono, ui-monospace, monospace">GL 88,464 72×66</text>
+<rect x="784.5" y="464.5" width="151" height="65" fill="url(#pz)" stroke="#5d7a5f" stroke-width="1" stroke-dasharray="4 3"/>
+<text x="788" y="475" font-size="8" fill="#3f5a41" font-family="DejaVu Sans Mono, ui-monospace, monospace">GR 784,464 152×66</text>
+<line x1="88" y1="530.5" x2="936" y2="530.5" stroke="#c45f12" stroke-width="1" stroke-dasharray="6 3"/>
+<text x="936" y="542" font-size="8" fill="#c45f12" text-anchor="end" font-family="DejaVu Sans Mono, ui-monospace, monospace">bottom line 530: base block, gauges · bezel 548: 18</text>
+<line x1="88" y1="103.5" x2="936" y2="103.5" stroke="#c45f12" stroke-width="1" stroke-dasharray="2 4"/>
+<text x="80" y="98" font-size="8" fill="#c45f12" text-anchor="end" font-family="DejaVu Sans Mono, ui-monospace, monospace">104</text>
+<line x1="88.5" y1="104" x2="88.5" y2="530" stroke="#c45f12" stroke-width="1" stroke-dasharray="2 4"/>
+<line x1="935.5" y1="104" x2="935.5" y2="530" stroke="#c45f12" stroke-width="1" stroke-dasharray="2 4"/>
+<text x="86" y="300" font-size="8" fill="#c45f12" text-anchor="end" font-family="DejaVu Sans Mono, ui-monospace, monospace">17</text>
+<text x="940" y="300" font-size="8" fill="#c45f12" font-family="DejaVu Sans Mono, ui-monospace, monospace">17</text>
 </svg>
diff --git a/design/style-guide/station-layouts/05c-incubator-empty.svg b/design/style-guide/station-layouts/05c-incubator-empty.svg
index fb757b5..e27046c 100644
--- a/design/style-guide/station-layouts/05c-incubator-empty.svg
+++ b/design/style-guide/station-layouts/05c-incubator-empty.svg
@@ -11,17 +11,17 @@
 <rect x="408.5" y="400.5" width="207" height="47" fill="#f2dfb8" stroke="#bf9157" stroke-width="1.5"/>
 <text x="412" y="444" font-size="9" fill="#7d5435">nest 408,400 208×48</text>
 <ellipse cx="512" cy="416" rx="60" ry="9" fill="#e6c98c" stroke="#bf9157" stroke-width="1"/>
-<rect x="344.5" y="456.5" width="335" height="95" fill="#e4e8ea" stroke="#444" stroke-width="1"/>
-<text x="352" y="472" font-size="9" fill="#555">base 344,456 336×96 · placeholder</text>
-<rect x="448.5" y="496.5" width="127" height="31" fill="#2a2e38" stroke="#3c4b57" stroke-width="1"/>
-<rect x="352.5" y="547.5" width="319" height="2" fill="#eaeff6" stroke="#8ca0ab" stroke-width="1"/>
-<text x="672" y="544" font-size="9" fill="#555" text-anchor="end">foot light, on</text>
+<rect x="344.5" y="440.5" width="335" height="95" fill="#e4e8ea" stroke="#444" stroke-width="1"/>
+<text x="352" y="456" font-size="9" fill="#555">base 344,440 336×96 · block 463–529 · placeholder</text>
+<rect x="448.5" y="480.5" width="127" height="31" fill="#2a2e38" stroke="#3c4b57" stroke-width="1"/>
+<rect x="352.5" y="531.5" width="319" height="2" fill="#eaeff6" stroke="#8ca0ab" stroke-width="1"/>
+<text x="672" y="528" font-size="9" fill="#555" text-anchor="end">foot light, on</text>
 <path d="M 408.5 432 C 450 444, 574 444, 615.5 432 L 615.5 447.5 L 408.5 447.5 Z" fill="#e9d2a6" stroke="#bf9157" stroke-width="1"/>
 <rect x="408.5" y="400.5" width="207" height="47" fill="none" stroke="#7d5435" stroke-width="1" stroke-dasharray="1 2"/>
 <line x1="616" y1="440" x2="668" y2="420" stroke="#7d5435" stroke-width="1"/>
 <text x="672" y="418" font-size="9" fill="#7d5435">nestFront 408,400 208×48:</text>
 <text x="672" y="429" font-size="9" fill="#7d5435">rim fibres, over the bud</text>
-<text x="512" y="517" font-size="13" fill="#c6c4d8" text-anchor="middle">empty</text>
+<text x="512" y="501" font-size="13" fill="#c6c4d8" text-anchor="middle">empty</text>
 <text x="512" y="386" font-size="9" fill="#7d5435" text-anchor="middle">standby light: a soft warm pool, half the growing glow</text>
 <text x="24" y="96" font-size="10" fill="#2b6cb0">Empty (an invitation:</text>
 <text x="24" y="109" font-size="10" fill="#2b6cb0">it invites incubating).</text>
@@ -69,12 +69,24 @@
 <text x="951" y="586" font-size="11" fill="#fff" text-anchor="middle">←</text>
 <text x="1006" y="587" font-size="14" fill="#6b6880" text-anchor="end">Home</text>
 <defs><pattern id="pz" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#ffffff" fill-opacity="0"/><path d="M0 0H0V6" stroke="#5d7a5f" stroke-width="1" stroke-opacity="0.55"/></pattern></defs>
-<rect x="80.5" y="88.5" width="159" height="311" fill="url(#pz)" stroke="#5d7a5f" stroke-width="1" stroke-dasharray="4 3"/>
-<text x="84" y="99" font-size="8" fill="#3f5a41" font-family="DejaVu Sans Mono, ui-monospace, monospace">L paint zone 80,88 160×312</text>
-<rect x="784.5" y="88.5" width="159" height="143" fill="url(#pz)" stroke="#5d7a5f" stroke-width="1" stroke-dasharray="4 3"/>
-<text x="788" y="99" font-size="8" fill="#3f5a41" font-family="DejaVu Sans Mono, ui-monospace, monospace">R paint zone 784,88 160×144</text>
-<rect x="248.5" y="320.5" width="95" height="79" fill="url(#pz)" stroke="#5d7a5f" stroke-width="1" stroke-dasharray="4 3"/>
-<text x="252" y="331" font-size="8" fill="#3f5a41" font-family="DejaVu Sans Mono, ui-monospace, monospace">LM paint zone 248,320 96×80</text>
-<rect x="680.5" y="320.5" width="79" height="87" fill="url(#pz)" stroke="#5d7a5f" stroke-width="1" stroke-dasharray="4 3"/>
-<text x="684" y="331" font-size="8" fill="#3f5a41" font-family="DejaVu Sans Mono, ui-monospace, monospace">RM paint zone 680,320 80×88</text>
+<rect x="88.5" y="104.5" width="143" height="295" fill="url(#pz)" stroke="#5d7a5f" stroke-width="1" stroke-dasharray="4 3"/>
+<text x="92" y="115" font-size="8" fill="#3f5a41" font-family="DejaVu Sans Mono, ui-monospace, monospace">L zone 88,104 144×296</text>
+<rect x="792.5" y="104.5" width="143" height="111" fill="url(#pz)" stroke="#5d7a5f" stroke-width="1" stroke-dasharray="4 3"/>
+<text x="796" y="115" font-size="8" fill="#3f5a41" font-family="DejaVu Sans Mono, ui-monospace, monospace">R zone 792,104 144×112</text>
+<rect x="248.5" y="336.5" width="79" height="63" fill="url(#pz)" stroke="#5d7a5f" stroke-width="1" stroke-dasharray="4 3"/>
+<text x="252" y="347" font-size="8" fill="#3f5a41" font-family="DejaVu Sans Mono, ui-monospace, monospace">LM 248,336 80×64</text>
+<rect x="696.5" y="336.5" width="79" height="63" fill="url(#pz)" stroke="#5d7a5f" stroke-width="1" stroke-dasharray="4 3"/>
+<text x="700" y="347" font-size="8" fill="#3f5a41" font-family="DejaVu Sans Mono, ui-monospace, monospace">RM 696,336 80×64</text>
+<rect x="88.5" y="464.5" width="71" height="65" fill="url(#pz)" stroke="#5d7a5f" stroke-width="1" stroke-dasharray="4 3"/>
+<text x="92" y="475" font-size="8" fill="#3f5a41" font-family="DejaVu Sans Mono, ui-monospace, monospace">GL 88,464 72×66</text>
+<rect x="784.5" y="464.5" width="151" height="65" fill="url(#pz)" stroke="#5d7a5f" stroke-width="1" stroke-dasharray="4 3"/>
+<text x="788" y="475" font-size="8" fill="#3f5a41" font-family="DejaVu Sans Mono, ui-monospace, monospace">GR 784,464 152×66</text>
+<line x1="88" y1="530.5" x2="936" y2="530.5" stroke="#c45f12" stroke-width="1" stroke-dasharray="6 3"/>
+<text x="936" y="542" font-size="8" fill="#c45f12" text-anchor="end" font-family="DejaVu Sans Mono, ui-monospace, monospace">bottom line 530: base block, gauges · bezel 548: 18</text>
+<line x1="88" y1="103.5" x2="936" y2="103.5" stroke="#c45f12" stroke-width="1" stroke-dasharray="2 4"/>
+<text x="80" y="98" font-size="8" fill="#c45f12" text-anchor="end" font-family="DejaVu Sans Mono, ui-monospace, monospace">104</text>
+<line x1="88.5" y1="104" x2="88.5" y2="530" stroke="#c45f12" stroke-width="1" stroke-dasharray="2 4"/>
+<line x1="935.5" y1="104" x2="935.5" y2="530" stroke="#c45f12" stroke-width="1" stroke-dasharray="2 4"/>
+<text x="86" y="300" font-size="8" fill="#c45f12" text-anchor="end" font-family="DejaVu Sans Mono, ui-monospace, monospace">17</text>
+<text x="940" y="300" font-size="8" fill="#c45f12" font-family="DejaVu Sans Mono, ui-monospace, monospace">17</text>
 </svg>
```

**`design/style-guide/station-layouts.md`, Incubator** (public, station-gate 93bff40f):
- :283, the stamp-slot table row: "(804, 256, 120, 120) | (776, 381, 176, 25), baseline 397, rule y 405, x 776 to 952 | raised 144 …" → "(804, 232, 120, 120) | (776, 357, 176, 25), baseline 373, rule y 381, x 792 to 936 | raised 168, the right column's label place".
- :1383 (the room paragraph). Append: "The wall holds three columns on one 8 px grid, mirrored on x 512 (88–232, 248–776, 792–936), one 16 px gutter between neighbours, margins 17 left and right and 18 at the bottom, every standing object on the line y 530."
- :1387 (§4 Room). The four zones become "L (88, 104, 144, 296), R (792, 104, 144, 112), LM (248, 336, 80, 64), RM (696, 336, 80, 64); the gauges in GL (88, 464, 72, 66) and GR (784, 464, 152, 66), their ink to y 529".
- :1422–1426 and :1442–1445: base 344, 440 (the chamber stands in it, behind its lip; the foot light 352, 532; the plate 448, 480); plaque 448, 480, line box 486 to 506; lamp 652, 490; stamp 804, 232; code 776, 357, baseline 373, rule y 381 from x 792 to 936.
- :1508 (Placeholders, Stage): "recut, fix 5 IA1" → "recut, fix 5 IA1; IA2 (onto the grid)".

**Internal docs.** `specs/station-fix5-incubator-probe-spec.md` gets one addendum line: I1's zones and I4's base, plaque, stamp and code are superseded by this spec.

## 8. Builder instructions (self-contained)

**Contract.**
- Build on your own branch off `station-gate`.
- Commits by Paco Cotera <paco@cotera.org>, no trailers, no model or session names. Push only your own branch, never force. Run `node .github/public-guard/guard.mjs --base station-gate` before every push.
- No paid calls. `place-masters` only with `--only --ids`, never `--status`.
- Precedence: (recorded decision) and main win. If a number here disagrees with the code, stop and report; do not choose.
- Report in a few lines: the head, CI, the goldens that moved, and the dirty-area numbers printed.

**Steps.**
1. **Masters.**
   - Place T-01's art from `masters-pods` (e59d57f6 or later): `node prototypes/ui/tools/place-masters.mjs --from art/station-masters/pods --only --ids room-bench-stage-incubator,dome-front-304x272,base-336x96,leaf-full-16x20,leaf-empty-16x20`.
   - Place IA2 under the same id when the AD signs it (§3). Until then, build and test with the stage you have.
2. **`prototypes/ui/specs/station/incubator.json`.**
   - `base` `[344,440,336,96]`; `base.plate` `[448,480,128,32]`; `base.footLight.rect` `[352,532,320,2]`; `base.lamp.rect` `[652,490,12,12]`.
   - `plaque` `[448,480,128,32]`, `lineTop` 486.
   - `stamp` `[804,232,120,120]`.
   - `code` `[776,357,176,25]`, `lineTop` 357, `baseline` 373, `rule { y: 381, h: 1, x: [792,936] }`.
   - `bench.paint` `{ L: [88,104,144,296], R: [792,104,144,112], LM: [248,336,80,64], RM: [696,336,80,64] }`.
   - `bench.floor` `{ GL: [88,464,72,66], GR: [784,464,152,66], line: 530 }`.
   - `bench.keepClear` `{ leafBand: [248,80,528,240], chamber: [344,200,336,336], label: [792,232,144,152] }`.
   - `bench.grid` as in §5. The notes and the status as in §5.
   - Nothing else moves: rail, leaves, dome, nest, bud, shape, nestFront, domeFront, ribbon, juvenile.
3. **`prototypes/ui/specs/station/frame.json`.** `regions.stampSlot.screens.incubator`: "label (804, 232, 120, 120), code (776, 357, 176, 25), baseline 373, rule 381 from x 792 to 936: the slot raised 168, the right column's label place under the R machinery".
4. **Code.** None is expected: `incubator.c` reads the spec. If a number is hard-coded, stop and report it.
5. **Tests** (`prototypes/ui/tests/specs.test.mjs`):
   - :264 → the base at `[344,440,336,96]`, its block on `bench.floor.line`.
   - :886 → the new `paint` and `keepClear`.
   - Add the grid block from §6: margins 17 / 17 / 18 / 16, the mirror on 512, the 16 px gutters, the rects on the 8 grid, the rule centred on the label, the base seated (463 ≤ 471).
   - `incubator.test.mjs`: no number changes; keep every ceiling.
6. **Wireframes and docs.**
   - Apply the SVG patch (§7 of specs/station-incubator-layout-spec.md, embedded) to 04, 05, 05b and 05c in `design/style-guide/station-layouts/`. Re-render the four PNGs.
   - Edit `station-layouts.md` at :283, :1383, :1387, :1422–1426, :1442–1445 and :1508 as in §7.
7. **Goldens, last, after IA2 is placed.**
   - Retake all 18 Incubator goldens and their hashes, plus the captures `page-incubator`, `page-incubator-empty` and `fix14/incubator-growing`.
   - No other golden may move.
   - Print the hatch beats (t = 0, 600, 800, 1000, 1200, the steps), the growNow worst and cut, and the wipe. All must stay at or under 55,808 / 20,480 / 98,944 / 16,000 / 96,064 / 153,600 / 162,432 / 47,680. Expect 97,188 at 1000, as today.

## 9. Open points

1. **The top leaf against the rail's well: 2 px. Not closed here.**
   - The outer arc's centre slot (504, 90) sits 2 px under the well (y 88, fix 2 F11). The arc's 10 px was set against the rail's 80, before the well existed.
   - The leaf arc is the architect's closed rule (`leafArc`), so I do not change it.
   - The options for the architect:
     - (a) The outer radius 244 → 240 gives the top at 94 (6 px). Check the inner/outer box overlap at 24 radial: it fails near ±40° if both arcs use the same slot.
     - (b) The well's depth 48 → 40 on the Incubator only (the AD's well slice, fix 2 F11).
   - Recommend (b) if the AD's well reads at 40. It touches no game number.
2. **The juvenile's feet.**
   - They stay at 472 (the motion spec's 472 and 424 stay), so they now stand on the base's lip, 9 px under its top edge (463).
   - The AD judges `incubator-hatch-1100` at 1×.
   - The fallback, if it reads as sunk: the juvenile at (360, 152), feet 464, and the stand-in's 424 → 416. That needs the animator (motion spec §2.7a). It is not taken now.
3. **The widest code.** "WWW WWW WWW" (152 px) centred on 864 inks 788–940, which leaves 13 px at the right. Real codes run about 100 px (the capture's "ME3 7Z9 BFB": about 102), which leaves 17 px or more. Accepted as the text's bound; the rule and the label hold 17.
4. **Not in scope, noted by T-01:** the stamp label is still the code-drawn flat plate (`plate-well-120x120`, as ruled for Habitat). It moves to 804, 232 here unchanged. Owner: AD or a build ticket.
5. **Not verified here:**
   - The dirty-area numbers are computed. The face could not be built in this environment (no emsdk); the builder prints them.
   - The re-routed hoses are the AD's. Their ≥ 8 px clearances are checked at IA2's capture.
   - Everything else was measured on station-gate 93bff40f and masters-pods f365361b.

Signed: UI/UX, 22:25 (America/Mexico_City), Thu 2026-10-15
