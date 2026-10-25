# Library 7 gate (architect, 2026-10-25 12:37 Mexico City), 069e104f

T-20261023-295, build/library-compare 069e104f (one commit on station-gate 4b793a5c, fast-forward).

## Verdict
**One short fix round, then merge.** The rows and compare on the kit, `kit_focusRingHold` and its log flag, the one comparison in the logic process, the path and the block light, the host's notBuilt removal, golden-neutrality for every other screen and the carried Library 6 lines conform. Fix: the pan budget's text vs its test (F1); the layer check excusing focus pixels in the hold mark's whole region (F2); three models in the wrong home (F3–F5); the spec's id lines (F6). All golden-neutral.

## Fix lines
- **F1. The pan budget as built.** library.json `l3.close.pan.budget`: "a step is a camera cut: at most 392,080 px redrawn (the union of the step's dirty rects inside the tree view grown by 5 px on each side, [11, 39, 754, 520]: the names' labels invalidate 5 px out), and on the same frame rects inside the overview inset [788, 440, 208, 96] (its view box moves); the frame that carries the ring's move (step 0, or reduced motion's one cut) also redraws the move's own props, rects inside the panel [776, 44, 232, 512] (its rows cut to the new mibi) and the line [0, 562, 1024, 38] (✓ names it), printed, not budgeted here (a props frame: lvgl-switch.md, key to props applied); steps 1 and 2 redraw nothing outside the view and the inset; each step no sooner than its own gap (steps[i] - steps[i - 1]: 67, then 66 ms) after the frame that showed the one before; every other frame at most 153,600 px; LVGL's rectangle sum is printed, not budgeted". face/tests/library-family.test.mjs:259 `const PN = C.panel.rect, LN = frameSpec.regions.line.rect, inPanel = (q) => within(q, PN) || within(q, LN);` (drops `q[1] >= 562`); :266 a step's rect may be `inPanel` only on step 0; :272 (reduced motion) keeps `inPanel`; the print stays.
- **F2. The hold's exemption is its own box.** face/tools/layer-check.mjs:74 `holds = log.nodes.filter((n) => n[8] & 4).map((n) => n.slice(4, 8))` (the flagged node's own box, not its region's union); `ringDepartures` keeps counting by region.
- **F3. The heritable-trait predicate in genome.mjs.** lineage.mjs:210 `comparedTraits` moves to genome.mjs beside `traitState` as `export const heritableTraits = (frame) => …` (same body); `compareLooks` imports it; library.json `l3.compare.compute` names "genome.mjs heritableTraits"; lineage.test.mjs imports it from genome.mjs.
- **F4. The stamp request from views/requests.mjs.** Add ``export const stamp = (req) => ({ genome, read, size, k = null, ...who }) => req({ kind: "stamp", id: `stamp:${genomeDigest(genome)}:${[...read].sort().join(",")}:${size}${k == null ? "" : `:k${kPct(k)}`}`, ...who, read, size, ...(k == null ? {} : { k }) });`` (imports `genomeDigest` from ../genome.mjs, `kPct` from ../stamplook.mjs); library-props.mjs:215 `stampOf` calls it with `{ genome: g, read, size: sz.size, species: fr.species.id, ...(bud ? { bud: true } : { mibi: mb.id }) }`; ids unchanged. Carried: the five other inline stamp requests move to it when each file is next touched.
- **F5. Clip and wrap rules in their home.** library-props.mjs:244 `cutTo` and `factOf`'s local `lines` counter move to ui/specs/measure.mjs as `export function clipTo(measure, s, room)` (the v_clip rule) and `export function wrapCount(measure, s, width)` (the v_wrap greedy count); library-props.mjs imports both.
- **F6.** library.json `l3.close.panel.rows.ids` "panel.light.{c} (c 0-8)" → "panel.light.{c} and panel.light.{c}.in (c 0-8)"; `l3.compare.held.ids` "held.light.{c}" → "held.light.{c}, held.light.{c}.in".
- **Proof:** node --test 0 failures with the pan figures printed; goldens --check with no golden moving; props records 0 differ; face guard exit 0, ratchet unchanged (library_family 0); public guard after committing.

## Rulings
1. The hold mark conforms (common/focusRing.c; frame.json `focus.ring.hold { bands [{w 1, core}], gap 4 }`; one composed node at box + 5, one 1 px square ring in focus; LAYER_CHROME; `prim_hold` log flag 4, never a ring; drawn before the ring; rings.mjs allows one ring and at most one hold at chrome).
2. prim's empty composed slot accepted (no size only with ops `[]`).
3. Panel stamps as `stamp_slot` (kit_panel outline + v_slot) accepted; `kit_stamp_t` gains a stamp id field the day another screen needs two stamps or one without a plate.
4. The compare computation's homes conform apart from F3 (compareLooks and pathBetween in lineage.mjs, once a props build; whole looks of traits read on both, never Glow, Basking, Phase or the bud; `stampBlocks` from the stamp layout).
5. Block light ids `<id>.<c>.in` accepted (two nested 1 px kit_panels).
6. The host no longer sending compare as notBuilt: accepted.
7. Compare timing accepted (props 9.6–11.0 ms cold, 2.2–7.7 ms after; stamp 32–41 ms first, cached by id).
8. The pan budget as F1 words it: step 0 is also the props frame (panel rows and ✓); the camera cut stays 392,080 px. Measured: view union 380,190 / 380,125 / 379,950; panel and line +24,389 / 0 / 0; reduced motion 380,325 in the view.
9. A ring move in compare without a pan is a props frame (lvgl-switch.md budgets): worst 168,720 px union; recorded for the hardware phase.
10. The extra goldens (close-stubs, close-fits, pan-step-1..3, zoom-in) accepted: 0 px changed in the tree view, changes only in the panel and the line.
11. Carried lines done (tree.path sized; FAR fit; mini dot d 2–4).
For UI/UX and the art director: the hold mark and the ring both reach 5 px, so with the ring on the held mibi the hold's line lands on the ring's outer band and is covered; elsewhere held and focused differ only in weight. Intended, or a hold gap of at least 6?

## Checked
Diff 4b793a5c..069e104f (35 files). Own build: face_test 19,898/0; layout 732/0; hash 47e09df8; focused suites 95/0; face guard 0 failures; goldens library 30 match. Builder's records: node records 215 → 219 states, only the 7 retaken states differ; type log identical; props unchanged; full suite 1,816/0.
