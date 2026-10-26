# Layout check tuning from the owner's review (architect, 2026-10-26 12:42 Mexico City)

Base: station-gate 8da60fd9. `prototypes/ui/specs/layout.mjs` and `face/tools/layout-check.mjs` have not changed since the reviewed run (7881a762). All line numbers below are at 8da60fd9.
How I measured it: I ran the 8da60fd9 check over the logs the owner reviewed (`$S/lcb/logs`, 222 states). It gives back the same 111 cards, with every worst id and measure matching the review, 0 differences. I then patched a private copy of layout.mjs with the changes below, added the proposed spec data, and ran it over the same logs.
- The patch: `$S/lc2/tune-proto.diff`. It is a prototype. The builder writes the real code and its tests.
- The ledger scripts are in my scratchpad and were not committed.
- The fault and fine ledger in section 3 is from that run.

Remit:
- The rules and their mechanism are mine: keys, inference and thresholds.
- The data values (each screen's alignments, movers, anchors, clips, gutters and painted pictures) belong to UI/UX, with the AD for painted pictures and movers. Section 1b proposes them from the owner's notes, for UI/UX to sign.

## 0. The result in one view

On the reviewed logs:

| | Before | After |
| --- | ---: | ---: |
| Findings, all screens | 1953 | 1302 |
| Findings, the nine Station screens | 1392 | 863 |
| Review cards (Station) | 111 (98) | 107 (94) |
| Owner faults that fire under their own kind | 53 | 40, plus 9 carried by another finding of the same fault, plus 4 conflicts for the owner (section 3) |
| Owner "fine" that fire | 22 | 0, with no exceptions |
| "Not sure" that fire | 21 | 8, each with new wording (section 4) |
| Unmarked that fire | 2 | 0 |

Findings by rule, all screens, before → after:

| Rule | Before → after |
| --- | --- |
| L1 | 429 → 292 |
| L2 | 42 → 37 |
| L3 | 311 → 262 |
| L4 | 112 → 85 |
| L5 | 387 → 192 |
| L6 | 95 → 64 |
| L7 | 321 → 164 |
| L8 | 185 → 139 |
| L10 | 7 → 3 |
| L11 | 63 → 63 |
| L0 | 1 → 1 |

## 1. Rule by rule

The principle the owner taught has two parts:
- Each container has an alignment per axis. One-margin rules apply only on the side it is aligned to. Centring rules apply only to centred axes.
- Living scenes are depth, not grid.

| Rule | Ruling | Exact change (layout.mjs at 8da60fd9) | Cards it settles |
| --- | --- | --- | --- |
| L0 | Keep | None | — |
| L1 margin | Change | **:198–207**: each axis (x: left/right, y: top/bottom) takes its alignment from the declared `align`. If none is declared, it is inferred: `centre` when the block sits off the margin on both sides (measured with bleed boxes included, so a bleed window holds its side), else `fill`. Then: **fill** wants both sides at the margin ±1 (as today). **left/top, right/bottom** want the leading side at the margin ±1 and the trailing side at least the margin; trailing slack is no finding. **centre** wants both sides at least the margin, and only a tight side is reported here; equality is L7b's. Each finding carries `align`. Anchored components (below) are measured at their insets: `other: "<side> (anchored)"`. **:145**: `containers[].padding` may be per side `{left, top, right, bottom}`; `c.align = alignOf(decl.align)` for a pane, `layout.align` for the stage | create-L1-3, incubator-L1-8 (now L7b "a centred block"), habitat-L1-16 (strip align left), home-L1-64 (away anchored), pods-L1-6 (now L7b) |
| L2 edge | Change | **:194–197**: skip movers. Skip every side inside a container whose picture is in `layout.clips` (a window that clips by design). Bleed stays as today | vivarium-L2-1 (bleed window), incubator-L2-2 (panel.json clips panelHatched), home-L2-1 (away padding bottom 0: the figure stands on the frame's floor) |
| L3a crowding | Change | **:214**: on a bezel stage's x axis the column gutter (32) applies only between two modules (non-text, larger side ≥ `container` 48). Other neighbours take new `L3.bezelItems: 16`. A pair with a bleed member is skipped | bench-L3-3 (noise), vivarium-L3-1 (bleed window). home-L3-1 is settled by data: `home.json layout.gutter: 12`, the build spec's "12 before the Library" |
| L3b unequal gutters | Change | **:218**: compare like with like. A link counts only when both ends are of one key (a run) or both are modules. A caption against a picture, or a header title against its price, is not a gutter | habitat-L3-8, bench-L3-9, create-L3-3, incubator-L3-11, home-L3-12 (movers) |
| L4 overlap | Change | **:227–228**: a pair with a mover or prop (`layout.movers`, `layout.props`) is skipped, with two exceptions that still fire. First, two movers at one depth: feet `B(box)` within `L4.depth: 1` px. Second, a **perch**: the back one's feet land inside the front one's top `L4.perch.share 0.25`, at least `perch.min 4` px in (the totem). **:229** painted props: only entries with a `rect` | cargo-L4-3, home-L4-4, vivarium-L4-22. The totem in vivarium-away/docked still fires (resident#2/#4, 36 × 11 and 36 × 9) |
| L5a | Keep | None | — |
| L5b near-miss | Change | **:236–240**: siblings are compared only when they are neighbours (`dist ≤ L8.float × G`) or one is a pane. Two boxes that already share a left or right edge (±`edges` 1) are not compared by centre (x); likewise top/bottom for centre (y). Element against container centre lines (:241) stays | habitat-L5-19 ("alignment is to the left containers, not the elements") |
| L6 empty | Change | **:246**: `painted` entries with `fills: true` count at every level, not only the stage (`if (!c.group)` removed). A new `painted[].region` form fills the container whose own picture is that region. A container with one component and no painted fill is not measured: its place is L1's and L7b's. **:63** malformed accepts `rect` or `region` | cargo-L6-4 (the bay painting), vivarium-L6-3 (the window painting), home-L6-11 (the genome), habitat-L6-12 (one input) |
| L7a balance | Change (bug) | **:246–251**: as L6 (painted fills, one component). An axis aligned left/right or top/bottom contributes 0, because its weight sits on its side by design. Centre and fill axes are measured as before | home-L7-32 (section 2), vivarium-L7-9, habitat-L7-27 |
| L7b slack | Change | **:259–261**: the undeclared "one group" slack is measured only on centred axes (declared, or inferred as in L1). It reads "a centred block: A left, B right (equal wanted)". Fill and aligned axes no longer report: L1 reports their margins, so the double report (pane L1 loose plus L7b) is gone. Declared columns (:256–258) are kept | habitat-L7-14, home-L7-42. bench-L7-4, sitting-L7-7 and vivarium-L1-10 become one finding each (section 3) |
| L8a | Keep | None | — |
| L8b floats | Change | **:267**: movers are skipped. A component is **placed**, not floating, when it sits at the margins in a corner (two adjacent sides ±1) or is centred on both axes (within `L5.nearCentres[1]` 6) | habitat-L8-10 (the stamp in the card's corner), incubator-L8-2 (the capsule centred), vivarium-L8-1, home-L8-34 |
| L9 | Keep | None | — |
| L10a cut | Change | **:270**: skip a node whose region, or whose container's picture, is in `layout.clips` | home-L10-1, incubator-L10-1. vivarium-L10-1 is a conflict (section 3) |
| L10b | Keep (inert) | Unchanged; subjects are the AD's with UI/UX | — |
| L11 | Keep | Overlay change only (section 4) | — |

### 1a. New keys

frame.json `layout.thresholds`:
- `L3.value.bezelItems: 16`, from "C3: on a bezel the 32 column gutter is between modules; items take the field's 16".
- `L4.value.depth: 1`, from "owner 2026-10-26: one behind another is depth; two at one feet line collide".
- `L4.value.perch: { share: 0.25, min: 4 }`, from "ad.md totem: feet on the next one's head".
- `L7b.from` gains "centred axes only (owner 2026-10-26)".
- `L1.value.opposite` is no longer read; drop it.

A screen's `layout` block:
- `align` for the stage, and `containers[].align`: `"left" | "right" | "centre" | "fill"`, or `{ x: left|right|centre|fill, y: top|bottom|middle|fill }`.
- `containers[].padding`: a number or `{ left, top, right, bottom }`.
- `clips: [regions]`: windows that clip their content by design. L2 and L10a are off inside them.
- `movers: [regions]` and `props: [regions]`: creatures and scene props, placed by depth. They are out of L1, L3, L5b, L6, L7, L8b; L2 and L4 apply only as described in the table.
- `anchors: [{ region, x: "left"|"right", y: "top"|"bottom", inset: [dx, dy] }]`: fixed UI pinned in a scene's corner. It is measured at its insets and is out of its container's block.
- `painted[]` may take `region` in place of `rect`.

`malformed()` (:49–67) validates all of these: the align values, every list being a list, and an anchor having a region plus x or y.

### 1b. Proposed data (UI/UX to sign; AD for painted and movers)

- **vivarium.json**: `bleed: ["window"]`, `clips: ["window"]`, `movers: ["resident"]`, `painted: [{ id: "painting", region: "window", fills: true }]`. The owner's reasons: "a window to the environment, not a typical module"; "the vivarium can be empty"; "a mibi can be anywhere on the ground".
- **home.json**:
  - `gutter: 12`
  - `clips: ["vivarium"]`
  - `movers: ["resident"]`
  - `painted: [{ id: "genome", region: "library.window", fills: true }, { id: "painting", region: "vivarium", fills: true }]`
  - `anchors: [{ region: "away", x: "right", y: "bottom", inset: [8, 6] }]`. The build spec puts it at 64 × 64 at (556, 352), with its caption at y 418.
  - `containers: [{ region: "away", padding: { left: 4, top: 4, right: 4, bottom: 0 }, align: { x: "centre", y: "bottom" } }]`. The spec's "bottom-centred" figure.
- **habitat.json**: `containers: [{ region: "strip", align: { x: "left" } }]`. The owner: "this rail is for your mibi list, aligned to the left".
- **incubator.json**: `clips: ["shell"]`. The owner: "maintains the position of the incubator fixed".
- **panel.json**: `clips: ["panelHatched"]`. The owner: "fair clipping, the door is open".
- **cargo.json**: `movers: ["mibis"]`, `painted: [{ id: "bay", region: "bay", fills: true }]`. The owner: "a mibi in front of a crate"; "berths are empty".
- **Not declared, on purpose, until UI/UX rules**:
  - Sitting's steps strip: the owner said "if aligned to the left it's ok; if those are buttons, they don't come across as that".
  - The Incubator's two columns (the stamp column at the left, the capsule centred on 512).
  - Pods' `cardPictures partOf cardStage`.

## 2. The L7a bug (home-L7-32)

**Reproduced** on home-library-3-new and home-library-focused, container `library.window` [656, 78, 344, 362]: centroid (862.1, 422), centre (828, 259), dx +0.20, dy +0.90, as on the card.

**Cause**: the red cross is the centroid of the two captions only.
- The genome drawing is the window's own picture: sprite 1545999168, [656, 78, 344, 362], ink and solid equal to its rect. That picture is what makes `library.window` a container (paneLike, :119–120).
- A container's own picture is never part of its content. L6 and L7a fill only `comps`, its components that are not marks (:189, :246). A painted fill is counted only at the stage level (`if (!c.group)`, :246).
- The three "new" dots (12 × 12) are marks, so they are excluded too.
- So the weight is "3 new" [668, 416, 45, 12] plus "Loika genome" [882, 416, 106, 12] = (690.5 × 540 + 935 × 1272) / 1812 = 862.1 x, at y 422. The genome, which is the real weight, counted 0.
- The same cause makes home-L6-11 read "an empty 344 × 338" (the owner: "where is it empty? I see a genome"). It also explains cargo-L6-4 and vivarium-L6-3 and L7-9, where the paintings are the content.

**Fix**:
1. :246 counts `painted` fills at every level and accepts `region`.
2. home.json declares the genome `painted { region: "library.window", fills: true }`, data from UI/UX with the AD. Generated pictures with `layout.facts` keep their inner boxes as today.

After the fix: library.window has no L6 or L7a. Its L11 (the three unlabelled dots, home-L11-3, a fault) and the captions' L1 and L8b still fire.

**Overlay fix** (layout-overlay.mjs): an L7a overlay tints every box it weighed and labels the count ("weighed: 2 captions"). Then a reader can see what the red cross is the centre of. An L6 overlay names the painted fills it counted.

## 3. The owner's cards after the changes

**Fine (22): each cleared by a rule change, none by an exception.**

| Card | Cleared by |
| --- | --- |
| cargo-L4-3 | movers (mibis) |
| cargo-L6-4 | painted bay fills |
| habitat-L3-8 | L3b like with like (the notches 14, 14) |
| habitat-L5-19 | L5b edge-aligned pair (both left at 608) |
| habitat-L7-14 | strip align left |
| habitat-L8-10 | L8b placed: the stamp sits in the card's top-right corner at 16/16 |
| home-L1-64, home-L7-42 | anchors away |
| home-L10-1 | clips vivarium |
| home-L2-1 | away padding bottom 0 |
| home-L3-1 | gutter 12 |
| home-L4-4 | depth: feet 351 against 363 |
| home-L7-32 | the painted genome (section 2) |
| incubator-L10-1 | clips shell |
| incubator-L2-2 | panel clips panelHatched |
| incubator-L8-2 | L8b placed: the capsule centred, 4 and 2 px off both axes |
| vivarium-L2-1 | bleed |
| vivarium-L3-1 | L3a skips bleed |
| vivarium-L4-22 | depth: feet 467 against 470, no perch |
| vivarium-L6-3, vivarium-L7-9 | painted window |
| vivarium-L8-1 | movers |

The two unmarked cards clear by "one component in its box": habitat-L6-12 and habitat-L7-27, the namer field that holds one left-aligned text.

**Faults (53): 40 still fire under their own kind** (rule, part, node, other, container) in their states:
- bench: L1-5, L11-1, L4-1, L5b-8, L6-2, L8b-1
- cargo: L11-1, L2-1, L3a-1, L3b-11, L5b-6, L7b-11, L8b-4
- create: L11-3, L2-4, L3a-13, L4-5, L5b-4
- habitat: L11-7, L3a-10, L4-6
- home: L11-3, L5b-11
- incubator: L11-1, L4-5, L5b-22
- pods: L2-4, L3a-1, L6-2, L7a-4, L7b-6, L8b-3
- sitting: L11-1, L2-2, L4-1, L6-11, L7a-26, L8b-5
- vivarium: L11-1, L7b-11

**9 are carried by another finding of the same fault.** These are the de-duplication the gate asked for: L1 and L7b used to report one slack twice.

| Card | Now carried by |
| --- | --- |
| bench-L7-4 | bench-L1-5 (16 left, 177 right, fill: right loose) |
| sitting-L7-7 | sitting L1 steps right loose 504 (the card id sitting-L1-12) |
| cargo-L1-9 | cargo-L7-11 ("a centred block: 25 left, 364 right") and cargo-L8-4 |
| vivarium-L1-10 | vivarium-L7-11 ("a centred block: 806 left, 54 right") and vivarium-L11-1 (the bed's lone mark) |
| create-L6-2 and create-L7-9 | stamp.plate L7b "a centred block: 20 above, 61 below" (one component, so its place, not its emptiness) |
| create-L7-3 | panelSnapshot L1 "snapshot chamber bottom 6 tight", L7a +0.27 and L2 roll top 0. The owner's confirm-keep fault holds, on the axis now read as fill |
| cargo-L7-9 | cargo-L7-11 and L8b-4. The bay painting is now content, so the centroid no longer counts only the ribbon |
| pods-L3-11 | pods-L8b-3 (the hatch floats, 275) and pods L6 and L7 on the overview. A caption (thisPod) against the hatch is not a gutter; that screen's re-layout is approved |

**4 conflicts for the owner.** The owner's mark disagrees with the owner's own teaching on identical geometry.

| Card | Conflict | Recommendation |
| --- | --- | --- |
| sitting-L5-8 (fault) | Heading and cards both left at 608, centres 5.5 apart. This is the same geometry as habitat-L5-19 (fine, "alignment is to the left containers") | Follow the teaching: it clears. The deck's faults still fire (L6-11, L7a-26, L4-1) |
| vivarium-L10-1 (fault) | The window cutting the painting is the same as home-L10-1 (fine) and vivarium-L2-1 ("a window to the environment") | Clears. That overlay also shows the totem, which now fires as an L4 perch in vivarium-away. The owner confirms whether the totem is what was marked |
| vivarium-L3-15 (fault) | The gaps among twelve residents and a name tag. Under the scene teaching (home-L3-12, "mibis move … they should overlap"), movers have no gutters | Clears. If the fault was the tag far from its mibi, UI/UX declares `nameTag.labels: "resident"` and L8a catches it |
| vivarium-L5-6 (fault) | The bed (806) against the name tag (364), 442 apart: not neighbours | Clears. The bed's faults still fire (L7b-11, L11-1) |

## 4. The 21 "not sure" cards

8 of these 21 cards have notes, not 0. Each kind below has a plain explanation. The overlay changes are:
- every card states the alignment it assumed ("aligned: fill (inferred)") and draws both opposite dimension lines;
- a box under 24 px gets a ×4 inset;
- an L7a overlay tints the boxes it weighed.

| Kind | Cards | After | Plain words / overlay |
| --- | --- | --- | --- |
| L1 one-margin wording | create-L1-3, incubator-L1-8, pods-L1-6 | Become L7b | "A centred block: 93 left, 86 right; centred blocks want equal sides (±4)." The owner's own rule. Incubator: 345 against 153. The block spans the stamp column and the capsule, so it needs UI/UX's two columns; then the capsule is checked on axis 512 (L5a) |
| | habitat-L1-16 | Clears | Strip align left |
| | sitting-L1-12 | Fires | "The steps start at the left margin and leave 504 on the right. If they are a left-aligned list this is fine; if they are buttons, the row should fill or centre." Question for UI/UX |
| L2 | habitat-L2-1 | Fires | "The 14 px badge touches the stamp's top edge (0 px; 16 asked)." The ×4 inset. UI/UX: if it is a corner badge by design, declare it an anchor with inset 0 |
| L3a | bench-L3-3 | Clears (noise) | The bezel's 32 column gutter was applied to small tool plates |
| | incubator-L3-3 | Fires | "The Companion and Portrait plates are 8 apart; the screen's gutter is 16." Name the plates by their titles. It agrees with habitat-L3-10 (6, a fault) |
| L3b | bench-L3-9, create-L3-3, incubator-L3-11, home-L3-12 | All clear (noise) | The chain mixed unlike things: tool plates with a pane, a header title with its price, movers |
| L4 | pods-L4-4 | Fires | "The pod picture (88 × 92) overlaps the card's stage it stands on; one on the other by design?" UI/UX declares `cardPictures partOf cardStage` if so; then habitat-L4-6 clears too, and its fault (the proportions, the empty right panel) is not a layout rule |
| L5b | pods-L5-7 | Fires | "The cell sits 6 px below the page's middle (268 against 262)." Draw both centre lines |
| L6 | home-L6-11 | Clears | Section 2 |
| | incubator-L6-9 | Clears | One component: an empty Cross plate showing only its title. Whether an empty plate should show is a UI/UX empty-state question |
| L7a | bench-L7-2 | Fires | "The plate's content sits in its left third; the right two thirds are empty," the same as bench-L1-5. With the tint, it reads |
| | incubator-L7-25 | Clears | One component |
| L7b | incubator-L7-1 | Fires | "A centred block: 71 left, 337 right." The stamp column and the capsule are measured as one block; UI/UX's columns split it. It is the stamp column's ✓m from the sweep |
| L8b | home-L8-34 | Clears | Movers |
| L11 | pods-L11-3 | Fires | "A small picture (14 × 16) with no word beside it: what is it?" The ×4 inset |

Questions outside my remit, named with their owners:
- Depth scale: "far mibis smaller" (home-L8-34, vivarium-L4-22) and scene layers (home-L3-12). Owner: the AD.
- Whether the totem stays a fault. Owner: the AD.
- The library diagram's legibility and a navigable legend (home-L11-3). Owner: UI/UX.
- Locked pose options (sitting-L7-26). Owners: game design with UI/UX.
- Heavy crate curtains, Bay icons and the Incubator stamp frames (cargo-L5-6, home-L5-11, incubator-L8-2). Owners: the AD with UI/UX.

## 5. Builder ticket

**Layout check tuning from the owner's review.** The builder builds; the architect reviews; UI/UX signs the data.

1. `prototypes/ui/specs/layout.mjs`: the changes in section 1 at the lines named. `$S/lc2/tune-proto.diff` is the reference prototype; it ends with the spec data it ran with. Plus `malformed()` for the new keys.
2. `prototypes/ui/specs/station/frame.json`: the thresholds in 1a. The screen specs: the data in 1b, once UI/UX signs it.
3. `face/tools/layout-overlay.mjs` and the card wording in `layout-check.mjs`: the L7a tint and count, the assumed alignment on L1 and L7b, both opposite dimension lines, the ×4 inset under 24 px, and plates named by their title text.
4. Tests:
   - `ui/tests/layout.test.mjs`: one positive and one negative per change. The cases are align left, right, centre and fill; inferred centre; anchors; clips; movers at depth, perch and same depth; L3b like with like; L5b edge pair and non-neighbours; painted region at pane level; one component; L8b corner and centred.
   - Rewrite L0 (:36, the chamber is now a centred block: L7b 40 left, 360 right, not L1 right 360), L6 (:99) and L7 (:107) for the new semantics. The prototype fails exactly these 3.
   - `ui/tests/layout-cases.json`: update 7 cases to the re-expressed findings:
     - create-confirm-keep: L1 bottom 6 and L7a, in place of L7b
     - pods/compare: L7b 24 / 124
     - incubator-growing: L7b 71 / 337
     - cargo-arrival-choice: L1 cardPictures right 284
     - sitting-pose: L1 steps right 504
     - vivarium-docked: L4 resident#2 / resident#4
     - home-fresh: L3a moves to `clear`, the owner's home-L3-1
   - Add the 98 owner cards as entries generated from owner-marks.json. A fault expects its kind, or the carrier named in section 3. A fine is `clear`. An unsure follows section 4. The 4 conflicts are `pending` on the owner.
   - The fixtures are re-taken with `--refresh-cases`. The goldens moved since the review (Q1, TY1.1: cargo, habitat, sitting, vivarium states; cargo, home, panel specs), so match by kind, not by measure.
5. Proof:
   - goldens --check unchanged (golden-neutral);
   - layout.test, layout-cases, face guard and public guard green;
   - a full run with the rule × screen counts;
   - the 98-card ledger in the PR: fine 22/22 clear; faults 40 own kind plus 9 carried; unsure 8 fire, 13 clear.

Size: about 12 builder hours: layout.mjs 4, overlay and wording 2, tests and the 98-entry corpus 4, data, re-take and triage 2. Outside the builder: UI/UX about 1 h to sign 1b and answer the four questions in section 4.

Expected counts:
- On the reviewed logs: 1302 findings (Station 863), 107 cards (Station 94).
- At the current head the totals will differ, because the goldens moved. The gate is the card ledger, not the totals.
