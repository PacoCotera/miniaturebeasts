# Layout check spec (architect, 2026-10-25 23:18 Mexico City)

Base: station-gate d1ba30dc. Owner approval: 2026-10-25 23:02 (a mechanical layout check over every golden; the owner reviews its findings and teaches the rules). The prototype of L1, L2, L4, L5, L6, L7a ran over 208 node logs captured at 15b451ae (193 of 222 current goldens byte-identical).

Three things the node records cannot see today; the builder adds them to the log (no pixel changes):
- Composed content is one node: the Incubate panel's right window is one `panelSnapshot` sprite (and at 15b451ae the Library L2 sheet was one stage picture), so the owner's confirm-keep fault (niche on the window's bottom edge) is invisible until the log carries the snapshot's source nodes.
- No clip node marks the Hatch-now door cut: the capsule door is cut by a `v_sprite_window` sub-rect, not a clip.
- The log's ink box counts any alpha > 0; C9 asks for alpha ≥ 128.

## Rules

Files: `prototypes/ui/specs/layout.mjs`, pure, a sibling of `clearance.mjs`. Exports `findings(log, spec, frameSpec, screen, state, extra) -> [{ rule, node, other, measured, required, unit, container: { id, rect }, boxes: [{ role, rect }] }]`, plus `components()`, `containers()`, `unusedExceptions()`, `enforcedFinding()`.

Log additions (`prim.c`, `vocab.c` `v_sprite_window`/`v_snapshot`, `face_test.c`; log only, never pixels):
1. Each `nodes[]` entry gains `[14..17]`: the solid-ink box (alpha ≥ 128; only rows and columns with ≥ 3 such pixels, C9), computed beside `prim_asset_box`.
2. New flags: 8 = shown through a window of a larger picture; 16 = that window cuts solid ink (source alpha ≥ 128 on the row or column just outside the window); 32 = composed content (a snapshot or a generated sheet).
3. `log.snapshot = { region, from: [x, y, w, h], at: [x, y], nodes: [...] }`: the source screen's nodes clipped to `from`, recorded when `prim_snapshot` runs; the check translates them by `at − from`.
4. Generated pictures: `library-sheet.mjs` already returns the layout facts the face needs; `library.json layout.facts` names the props path to them; the check reads them as inner boxes.

Component model (C9):
- Excluded: frame bars and zones (`FRAME_REGIONS`, plus `top`, `line`, `bar`); grounds (a node covering ≥ 90 % of its container); nodes covered by a later solid node (the clearance rule; a focus ring never covers); covered screens under an open panel.
- Boxes: a sprite uses its solid ink; a nine-slice, rect or composed node its rect; text its advance × cap→baseline.
- Merging: a region merges with regions whose spec says `labels`, `under` or `partOf` it.
- Marks: larger side < 16. Count for L2, L4, L11; empty area for L6, L7 (C8).
- Focus ring: counts for L2 and L4 (T6), never L1, L6, L7.
- Containers: the screen's opening `layout.opening` (default by stage kind, C1); a strip (rail well, head band): the container's top becomes the strip's lower edge, first component 16 below (C4); every pane, window, card, bezel or strip node ≥ 48×48 enclosing content, measured with its padding and an inner gutter of 8 (C3).
- Spec data per screen, a top-level `layout` block: `stage` ("bezel" | "field" | "painting" | "exempt"), `opening`, `margin`, `gutter`, `containers: [{ id, region, padding, gutter }]`, `columns: [{ id, regions, axis, align: "fill" | "centre" }]`, `topLine`, `floorLine`, `groups: [{ id, regions, within, align }]`, `split: [{ between, gutter, reason }]`, `bleed: [regions]`, `slots: [regions]`, `painted: [{ id, rect, fills, states?, picture }]`.
- Painted props: `layout.painted` (UI/UX with the AD). `fills: true` = part of the composition (the bench tools), content for L6/L7; `fills: false` = a fixture (Pods gauge, vent), empty area, but L4 still applies.

| Id | Rule (per container) | Finding |
| --- | --- | --- |
| L0 | Blind content: a flag-32 picture ≥ 20 % of its container with no inner boxes | "not measurable"; never a silent pass |
| L1 | Margin (C1, C2, C4): per side the outermost component sits at the margin ±1, or both opposite sides ≥ margin and equal ±2 (a centred block); under a strip, 16 below it | L1 tight / loose, side and gap |
| L2 | Edge contact: a box ≤ 2 px from its container's edge or crossing it, where a margin is required (not `bleed`) | Replaces L1 for that side |
| L3 | Gutters (C3): neighbours overlapping ≥ 30 % on the other axis; (a) gap < G crowding; (b) gaps in one row/column differ by > 2 unless a declared `split` (2 × G) | Pair, gap, required |
| L4 | Overlap: sibling boxes intersect (neither encloses the other); against a `painted` prop any intersection, and text < 16 from a prop (T5 extended) | Pair, intersection |
| L5 | Alignment: (a) declared column members ±2 on its axis (C6), group left edges ±1, baselines in a row ±1; (b) undeclared near-miss: left/right edges differ 1–4, centres or baselines 1–6 | "almost aligned", both values |
| L6 | Largest empty rectangle (`layout.empty`) over content plus `fills` props; empty slots are empty (C8): share ≥ T and both sides ≥ 4 × G | Rect and share |
| L7 | Balance: (a) filled area's centroid offset from the container centre, normalised to the half-size, \|dx\| or \|dy\| > T; (b) slack symmetry (C5): one group or each declared column has slack above = below and left = right ±4; a fill column touches `topLine` and `floorLine` | Offset or slack pair |
| L8 | Groups (C7, T5): (a) a declared pair more than `within` apart (default 8); (b) undeclared: a component whose every neighbour is > 2 × G away, in no group or column: it floats | Gap, required |
| L9 | Slots (C8): a `slots` region keeps one box in every golden state of its screen (across states) | States that differ |
| L10 | Cut picture: (a) flag 16; (b) a subject picture (mibi, pod, face tile, by manifest kind) whose solid ink touches its own box edge | Edge, picture |
| L11 | Lone mark (style guide §6): a picture ≤ 24 on its larger side, outside the bars, no text within 8 px on its rows and no `labels` | Mark rect |

Identical findings across states (rule, node, other, measured) group into one finding with `states: [...]`.

## Thresholds and exceptions

All values in `frame.json layout.thresholds`, each `{ value, from }`; nothing hard-coded.

| Rule | Value | From |
| --- | --- | --- |
| L1 | Bezel 24 every side; field 16 left/right, 8 to a bar; pane padding 16; 16 under a strip; ±1 per side, ±2 between opposites | C2, C4; T3 |
| L2 | ≤ 2 px | C2 |
| L3 | 16 field, 32 bezel columns, 8 inside a pane; ±2; 30 % overlap | C3 |
| L4 | 1 px intersection; 16 text to prop | T5 |
| L5 | ±2 axis, ±1 edges/baselines; near-miss windows 1–4, 1–6 | C6; windows first value |
| L6 | ≥ 0.20 at stage level, ≥ 0.25 in a pane; sides ≥ 4 × G | First value. Worst good: Habitat 0.09; Home, Cargo, Sitting, L1, Vivarium 0.02–0.03; smallest known-bad: Pods overview 0.23 |
| L7a | 0.10 | First value. Good 0.00–0.03, bench 0.06–0.09; bad: Incubator 0.11–0.19, Create +0.22 (y), Pods overview 0.18–0.22, chapter page 0.37–0.45. Tune first (bench vs Incubator is thin) |
| L7b | ±4 | C5 |
| L8 | 8 for a label; `within` as declared; floats at 2 × G | C7, T5 |
| L9 | Exact | C8 |
| L10 | 0 px headroom | First value (AD's 4 px crest headroom may tighten) |
| L11 | ≤ 24, label within 8 | §6, T5 |
| L0 | 20 % | First value |

Structural declarations, not exceptions: `bleed` (the Vivarium window; the Incubator capsule if UI/UX declares it); `split` (Home's Pods+Incubator | Companion+Bay); `stage: "exempt"` (Idle, art only).

Allowlist: `frame.json layout.exceptions: [{ screen, state?, rule, node, other?, reason, by, date }]`; `by` is UI/UX, the AD or the owner; an unused exception fails the run.

Enforcement: `frame.json layout.enforced: { "<screen>": ["L1", …] | "all" }`, empty at first (report mode). A screen is added rule by rule as its type pass fixes it and the owner has cleared its findings. Owner review of a finding: "fault" stays and is fixed in the pass; "fine, because …" becomes an exception or a threshold/rule change; a fault no rule names becomes a miss in the case corpus.

## Output

`goldens.mjs --check --logs <dir>` writes per state the face's log and the props facts from the same frame as the hash. `face/tools/layout-check.mjs <dir> --out <out>` runs offline over those logs and the committed goldens.
- `index.json`: `{ commit, taken, thresholds, totals: { byRule, byScreen, byRuleScreen }, exceptionsUsed, exceptionsUnused, blind, findings }`; each finding `{ id: "<screen>/<rule>/<n>", screen, states, rule, enforced, node, other, measured, required, unit, container, boxes, golden, overlay }`.
- `index.md`: a rule × screen count table, then per screen: state(s) · rule · what · measured → required · overlay.
- Overlays: `<out>/<screen>/<state>--<rule>-<n>.png`, 1024×600 at 1x: the golden with the container dashed, offending boxes stroked 2 px, the gap as a dimension line with its number, a label plate ("L3 12 → 16"), L6's empty rect hatched, L7's centroid and centre as crosses. Drawn on RGBA bytes with `ui/png.mjs` and the baked 12 px glyph table, no canvas (guard rule 3).
- Exit: report mode 0; fails only on an enforced finding, an unused exception, a malformed `layout` block, or L0 on an enforced screen.

## Validation against known findings

✓m measured in the prototype; ✓e expected from the audit's numbers; ✓d only once UI/UX declares the data named.
- Owner, Pods overview: empty space and imbalance L6 0.23–0.31 ✓m, L7a 0.18–0.22 ✓m; margins (stamp right 14 vs left 110, hatch at bottom 0) L1/L2 ✓m; origin text over the gauge L4 ✓d (painted gauge ≈ [718, 100, 82, 62]); the lone pod disc: L3 ✓d once a right column is declared (no undeclared rule catches it); the badge's hard edge: none (art).
- Owner, Create confirm-keep: slack 112 above, 6 below ✓m through the snapshot rect: L1 and L7b, only with log addition 3. The capsule fringe: none (art; an alpha-fringe check of masters is the AD's).
- Owner, Create annotated (09:55): left 0/36 vs right 14/16, bottom −1 L1/L2 ✓m; ▲ 2 under the rail L1 (C4) ✓m; unequal gutters L3b ✓e; floating caption L8a ✓d (`traitLine.labels`); empty top-left L7b ✓d with columns (undeclared only L7a +0.22 fires; L6 0.14 misses it).
- UI/UX §4 sweep: decision panel 6/10 and card gutter 12 L1/L3; Pods collection 8/106 ✓m; Pods compare 24/124 ✓e; bench 19/18, bottom 7 ✓m; bench gutters 83/80 ✓e; Library L2 sheet touching both bars L2 ✓m; L3 4/7 ✓e; Home gutters 12 L3 ✓e; Incubator capsule 0/4 ✓m, stamp column 76/150 ✓m, axis L7a ✓m; Cargo 6/10 ✓m; hatch floor line L7b ✓d; Habitat/Sitting/Vivarium strip bottom 10 L1 ✓m; Habitat plate gutters L3 ✓e; Sitting deck 16/24 ✓e.
- Audit ux.md: Cargo "+2" over the pod L4 ✓e; Sitting steps 16/504 L7b, L6 ✓m; Home Bay picture centre L5b ✓m; Incubator door cut L10a ✓d; Vivarium strip vanishes L9 ✓d; empty rows/bodies L6 ✓e; Habitat notches L8a ✓d, L11 ✓e; unlabelled marks L11 ✓e.
- Audit ad.md: Vivarium totem L4 ✓m; Library crest cut L10b ✓e.
- Caught by none (human-judged or another check's job): words and hierarchy; colour roles; state logic; identity (two identical out tiles); art quality (debug and stand-in art, brown panes, fringes, pure black); inline exactness verb → price (clearance T8's job; recommend making T8 exact); felt balance on a painted stage depends on the `fills` flags. False alarm today: the bench reads L6 0.29 until its tools are declared `fills`.

## Ticket

Build the layout check, report mode (builder; architect review; UI/UX and AD own the data):
1. Face log additions 1–3 (`face/src/prim/prim.c`, `prim.h`, `vocab/vocab.c`); face_test: a soft-alpha planted sprite gives the solid-ink box; a window over a larger picture sets flags 8 and 16; a snapshot logs its source nodes. Golden-neutral.
2. `ui/specs/layout.mjs`: L0–L11, the component model, thresholds from frame.json, exceptions, enforcement.
3. Tests: `ui/tests/layout.test.mjs` (planted logs, one positive and one negative per rule; exceptions used; unused fails; enforcement fails); `ui/tests/layout-cases.test.mjs` + `layout-cases.json` + committed fixture logs for the validation states (each ✓ an expected finding; owner-cleared items "clear"); `--refresh-cases` re-takes fixtures on retakes.
4. Runner: `face/tools/goldens.mjs --logs <dir>`, `face/tools/layout-check.mjs`, `face/tools/layout-overlay.mjs`.
5. Spec data: `frame.json layout { thresholds, exceptions: [], enforced: {} }`; each screen's `layout { stage, opening }` with today's measured openings: bench family [64, 58|69|77, 890, 494|467|455], field [0, 40, 1024, 522], Home [0, 40, 1024, 560], Idle exempt. Out of the builder's scope: `painted`, `columns`, `groups`, `labels`, `slots`, `bleed` (UI/UX with the AD, starting with Pods, Create, bench).
6. CI: in `.github/workflows/site.yml`, after `goldens --check`, the log dump and `layout-check` in report mode, output uploaded as an artifact.
7. Docs: a section in `face/README.md`.
Proof: goldens --check every hash unchanged; face_test, layout.test, layout-cases, face guard, public guard green; a full run over all 222 goldens with index.md, overlays, the rule × screen counts and runtime; it reproduces every ✓m above; a planted enforcement fails and an unused exception fails.
Cost: about 25 builder hours (log 4, layout.mjs 8, tests and corpus 5, runner and overlays 5, data and CI 2, first triage 1). Outside: UI/UX with the AD about 1 h per screen for layout data; the owner's review of the first index.
