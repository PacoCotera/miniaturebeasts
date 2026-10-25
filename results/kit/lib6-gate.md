# Library 6 gate (architect, 2026-10-25 08:33 Mexico City), 837bad32

T-20261023-294, build/library-close 837bad32 (a34924db Level 3 close + FL1; 837bad32 no ring under the dither, the links' own region, zoom-in retaken) on station-gate 15b451ae (fast-forward).

## Verdict
**One short fix round, then merge.** The screen on the kit, the links (screen-specific as ruled), the pan kind, the camera, the inset, FL1, golden-neutrality and the carried W2/W3 hold. Fix: the pan budget as written cannot be met as measured (F1); the slot cap can drop a node the final camera shows (F2); a helper's insertion displaced a comment (F3). Two UI/UX questions (T6 under the ring; the camera for a fitting tree) do not block the merge.

## Fix lines
- **F1. The pan budget as ruled.** ui/specs/station/library.json `l3.close.pan.budget` text: "a step is a camera cut: at most 392,080 px redrawn (the union of the frame's dirty rects), every rect inside the tree view grown by 5 px on each side, [11, 39, 754, 520] (the names' labels invalidate 5 px out), and on the same frame rects inside the overview inset [788, 440, 208, 96] (its view box moves); each step no sooner than its own gap (steps[i] - steps[i - 1]: 67, then 66 ms) after the frame that showed the one before; every other frame at most 153,600 px; reduced motion: one such cut; LVGL's rectangle sum is printed, not budgeted". face/tests/library-family.test.mjs: drop :157 (the "first two 67 ms apart" line); at :164 replace `assert.ok(Math.max(...one) <= V[2] * V[3] + 153600)` with the step rule on the one cut frame (union of its rects inside the view grown by 5 px ≤ 392,080; every rect inside that box or the inset); print that union beside the 416,006 rect sum.
- **F2. Slots past 32 keep the final camera's nodes.** station/src/lineage.mjs:155 `slotsOf`: first the nodes in view under the last camera (`cams[cams.length - 1]`), by row then u; then those in view only under a pan's earlier steps, by row then u; then `.slice(0, C.slots)`. library.json `l3.close.slot.rule` "by row then u" → "the nodes under the camera first, then those only under a pan's earlier steps, each by row then u". Test (lineage.test.mjs): 33 nodes in view across a pan's step cameras; every node under the final camera gets a slot. No golden pixel may move; pan states' node records may reassign slot k only.
- **F3. vocab.c:134.** Move `v_pbox` above the "An inline group: …" comment so the comment heads `v_inline` again.
- **Proof:** node --test 0 failures with the pan's figures printed; goldens --check with no golden moving; face guard exit 0, ratchet unchanged; public guard after committing.

## Rulings
1. Step spacing accepted as built: `steps [0, 67, 133]` stay; the floor is each step's own gap after the frame that showed the previous one (measured at 16 ms frames: 16, 96, 176 ms).
2. Pan budget: pixels redrawn (the union), not rectangles summed: ≤ 392,080 px = (744 + 10) × (510 + 10); rects inside [11, 39, 754, 520] or the inset [788, 440, 208, 96]. Measured union 380,190 / 380,125 / 379,950; rect sum 406,915 / 393,792 / 391,262; key frame 1,652 px; others 0. Banding a step over frames stays rejected.
3. Link structure conforms (screen-specific, four composed 372×255 tiles, segments in grid units, palette-exact: 2 px mist, stone faded, 4×4 bone junctions, 3 px bridges, 16 px stubs 2 on 2 off); how they look is the art director's.
4. "Wholly inside the view" includes the name line (mibi to y+50, bud to y+42), read from the spec on host and face.
5. Text roles conform (`names.role` label, `names.released` label.state; no px-form calls); role choice UI/UX's, "Growing" the copywriter's.
6. Camera offset confirmed (camera − node grid point, converted on every way in, zoom and pan); entering close-fits on Reed accepted for this golden.
7. Overview accepted (view box clipped to the mini; view box and link tiles on the art layer).
8. No ring while the zoom's dither holds input: accepted; the zoom-in retake accepted.
9. Device memory accepted for the Pi 4: canvases 3,035,520 B (four 372×255 tiles + the empty 744×510 path), static tables 56,576 B. Carried to T-295: size `tree.path` to the compare path's bounds and zero-size while compare is hidden.
10. T6 under the ring is UI/UX's call: 6 new T6 departures, only in the 6 ringed CLOSE states.
Carried: W2 and W3 closed; the mini disc done; the picture-box focus loop is now `v_pbox`; kit lines L3/L4 wait for a ticket touching page.c or rail.c.

## For UI/UX, the copywriter and the art director
- UI/UX (T6): CLOSE's focused mibi's name at lineTop y+30 under the {rect:2} ring with reach 5 sits 1 px from the ring's outer edge (T6 needs 4): (a) `names.mibi` 33 for every CLOSE mibi (slot extent and link start to y+53, goldens retaken), (b) a smaller reach for `l3.focus.targets.mibi`, or (c) another fix?
- UI/UX (camera): a fitting tree's row-2 entry centred in the comfort zone [165, 146, 446, 306] puts the founder pods 1 px over the view top (not drawn, stems end in stubs): should a fitting tree's entry show the whole tree (extent centred), or does the comfort-zone rule stand?
- UI/UX: confirm node names `label`, released `label.state`; the mini's sy floor and sibling spacing (Library 5 ruling 3), if not yet answered.
- Copywriter: confirm "Growing" under the bud (`strings.growing`).
- Art director: sign the 7 new goldens and the 14 FL1 retakes; judge the link geometry; is a stub at an undrawn node inside the view right, or should that stem run to the view's edge?

## Checked
Diff 15b451ae..837bad32 (55 files). Own build: face_test 19,649/0; layout 732/0; hash 47e09df8; focused node suites 157/0; pan and zoom figures as above; W2 16 generations 0.40 ms; W3 FOCUS_TARGETS 64; face guard (348 files) 0 failures; ratchet unchanged except the screenSpecific entry; goldens library 26 match, only the 14 FL1 goldens changed (245 px each), room mark pixel-identical to Level 1's; node records 208 → 215 states, 21 differ as described.
