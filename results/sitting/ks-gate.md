# Sitting K-S gate (architect, 2026-10-24 05:31 Mexico City), 941e0b4c

T-20261024-299, branch build/sitting-kit, one commit 941e0b4c on e5db3859. This gate is also the review: I read the whole diff (12 files, +115 −26), including the new `resident.c`, both contract headers that changed, every converted call site and the 26 new face_test checks.

## Verdict: PASS, merge

No fix lines. Every ticket line holds. One ticket proof line cannot hold as written ("0 differ in order"), and I rule it below as the K6 capture noise.

## What I ran

All of it was in a scratch worktree, `arch-ks/wt`, with private FACE_BUILD_DIRs (one per side), TMPDIR and STATION_CHECKS, each command under 10 minutes. All of it is removed now.

**At 941e0b4c:**
- `build.sh all`: layout 732 cases, 0 differ; face_test 15180 checks, 0 failed (15154 at base, so +26); native hash 47e09df8.
- `goldens --check`: all 10 sets match.
- `node --test`: face 604/604 (the guard test with its planted rule 7a, 7b, ratchet, screenSpecific and 8 violations is among them); station and ui together 683/683.
- Face guard ok (K7 rules); public guard ok.
- Habitat's direct-primitive count, measured with `tools/blank.mjs` over habitat.c: **8**, equal to the lowered `kit-ratchet.json` value (was 13).
- Station journey ok; checks.mjs ok; layer-check ok.

**At e5db3859** (face rebuilt from that tree): `build.sh all` with face_test 15154 checks, 0 failed, and native hash 47e09df8; then the journey, checks.mjs and layer-check.

**Comparisons between the two sides:**
- layer-check output: byte-identical. That includes every state's objects, pictures and props bytes.
- checks.mjs output: identical once " · placeholders registered N" is stripped, as the proof line says. The count was 140 against 143 on ten shots. That count is logic-side and K-S changes no JavaScript, so it is run-to-run cache warmth.
- Type log: 44 shots, 0 differ.
- Snapshots: 44, 0 differ.
- Regions differ only in pods-identifying and page-hatch, the two real-clock timing shots from the P0 gate.

**Not run by me:** the instrumented node-record capture. I take the builder's figure: 181 states, 0 differ as sets. The 10 Pods states that differ in order only also differ in order between two captures of the base, which is what I measured at K6 (base1 against base2: 9 in order). So "0 differ in order" cannot hold literally for any capture pair. **Ruling:** the proof line reads "0 differ as sets, and any order differences are no more than two base captures show". This holds. Habitat's own states differ in nothing, and Habitat is the only screen whose emitting code moved.

**Merge.**
- `git merge-tree --write-tree 941e0b4c 113102c6` (station-gate with S1): clean, tree 2a074aa1.
- e5db3859 is an ancestor of 113102c6. The one commit between them (S1) touches no face file, so the face figures above hold for the merged tree.

## Review

**kit_resident** (vocab/station/resident.c):
- It is habitat.c's still branch, node for node: `<id>.pic` (whole, with no size while dithering, or over the out mark), `<id>.dither` only while dithering, then `<id>.out`, with the same lift and the same unlifted out slot.
- "Has" keeps its one meaning (`id && *id && wire_has_asset`, which is `wire_asset_slot >= 0`).
- The rule-8 header names Props, Region and layer, Node ids, and Returns.
- habitat.c calls it with `lift + hop_lift()` and keeps its moving branch, the swap's clock and the lamp.
- face_test covers: still, from not sent, nothing sent, out alone, both sent, and the dither at levels 1, 8 and 15 with the exact `bayerPick` ops.

**word_livingWindow:**
- `from`/`level` gate on `wire_asset_slot(from) >= 0`, the same meaning as `wire_has_asset`.
- With no from, an empty from, or a from not sent, it draws exactly as before (tested).
- With from: the master's node stays with no size and `<region>.dither` follows it.
- With from but no master: the flat plates alone.
- All four existing callers pass `NULL, 0`.

**kit_stamp:**
- `corner`/`cornerAt` draw a fifth fixed node, `stamp.corner`, 1:1 at its own size after the front, whether or not there is a stamp.
- NULL, "", or a corner not sent adds no node (tested). Its size is read with `v_asset_size`, the house's 1:1 rule.
- All four callers pass `NULL, {0, 0}`. The header is updated.

**Note, not blocking:** resident.c defines its own one-line `has()`, as six other files do. There is no shared `v_has` to duplicate. If a seventh copy appears, K1's `v_slot` family should gain one.

## Rulings

**(1) The still dither goes through `v_dither_window`, not `v_dither`: accepted, no fix line.**
- At window (0, 0) the pick is the same pixels; only the ops string's form differs.
- The layer is now the new picture's rather than the higher of the two. Both are mibi pictures on the art layer (a still swap is mibi to mibi), so the drawn layer does not change in practice.
- No golden or journey shot draws a still swap. face_test now pins the exact ops at three levels.
- `v_dither_window` is the line I wrote, because the Sitting glass and resident both need the window form.

**(2) "Placement from props figure": right for K-S as built. S2 carries the figure placement.**
- Habitat's props carry no figure. Its 304 × 312 picture is the composed place itself, with the figure bottom-centred by the reducer, drawn 1:1 at `regions.resident.rect`. A golden-neutral extraction had to keep exactly that, so kit_resident takes the box from a rect path and the lift from the caller. My line's "from props figure" assumed a figure Habitat never sent.
- The Sitting is different. Its spec (`sitting.json regions.resident.place`) places by figure: `x = 296 − dx − ⌊W/2⌋, y = 380 − dy − H + 1`. sitting-props already sends `regions.resident.figure`, so a curl's last solid row lands on 380 and its figure centres on the axis, not wherever the canvas happens to put it.
- **Line for S2:** `kit_resident gains an optional figure (int[4] [dx, dy, W, H] of the picture, or NULL) and the spec paths of its axis and feet: with NULL it draws at the rect as today (Habitat unchanged, golden-neutral); with a figure the picture's top-left is (axis − dx − ⌊W/2⌋, feet − dy − H + 1), its size the picture's own (v_asset_size), the lift subtracted from y as now, the dither and the out slot at the same box. sitting.c passes props regions.resident.figure with sitting.json regions.resident.axis and .feet. face_test: a figure at the anchor and at the curl (adult 130×95, juvenile 103×79) puts the last solid row on feet and the centre on the axis; NULL is byte-identical to today.`
- Habitat stays on NULL. Whether Habitat's curl (16.17) moves to the figure is that ticket's call. UI/UX C3 places it "last solid row on the feet line, centred on the stand figure's centre", so 16.17 passes the figure only while curled. That keeps every standing Habitat golden.

**(3) The corner's region `stamp.portrayed` (painted); the glass dither's node order and shared window; the existing callers' NULL, {0, 0}: all accepted.**
- `stamp.portrayed` is the name sitting.json's `drawOrder` already uses, and habitat.json takes it at S3.
- The master's node with no size, followed by `<region>.dither`, is the same slot pattern as the resident, so a dither never adds or reorders nodes.
- Both pictures read the same (sx, sy) window because a cross-dither is between two pictures of the glass's own size: Habitat's and the Sitting's `vivarium-near-*` and `sitting-backdrop-*` are all 544 × 408. **Line for S2:** the Sitting's glass dither passes only pictures of `habitat.json light.size`; sitting-props already requests them at that size.

## Carried to S2 (one line each)

- The figure placement line in ruling (2).
- The glass-dither size line in ruling (3).
- **F1 from my S1 gate:** `sitting.json home.berth.after` still has the stale ".welcome or .owed" text on station-gate 113102c6. It goes in S2's first commit, with the text in s1-gate.md.

## Cleanup

- The scratch worktree is removed and pruned, and `arch-ks/` is deleted (both build directories, TMPDIR, records, logs).
- /home/user/miniaturebeasts is unchanged and clean.
- No /tmp/bake-* exists.
- Free space on / is **5.0 GB**: tight, and lower than at the last gate. Other sessions are writing.
