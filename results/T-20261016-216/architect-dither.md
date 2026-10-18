# T-20261016-216, question 2: Cargo's dithers under design/proposals/lvgl-switch.md §2.10 (architect)

Against results/T-20261016-197/build-spec.md §4 and the face's dither words (`prototypes/face/src/vocab/vocab.h`: `v_dither`, `v_dither_window`).

## Ruling

**No Cargo dither needs a stage exemption. Each is bounded by its own box, under 153,600 px a frame.**

| Dither (§4) | How it is drawn | Box |
| --- | --- | --- |
| At 200 ms, the crate's contents appear in the display | `v_dither_window(id, NULL, 0, 0, contents, 0, 0, level, 200, 60, 800, 180)`: a dither-in from clear over the display rect only, never the whole stage. The contents are composed into one 800 × 180 picture, or dithered per item over each item's box (which is smaller) | at most 144,000 |
| A pod lands (88 × 112 → 40 × 48), in a well or the waiting row | two nodes on one level clock (below) | at most 9,856 + 1,920 = 11,776 |
| A find lands (→ 16 × 16 on the strip) | the same two-node form | at most its travel box + 256 |
| The run's end, if a dither to the report or another screen remains | the screen change, the existing stage dither | the named stage exemption |

**The size-change swap uses the existing word; there is no new one.** `v_dither_window` takes `NULL` as from (a dither-in from clear) or as to (a dither-out to clear), and both its windows are the node's own size. So:
- **out:** `v_dither_window("pod.out", travelPic, 0, 0, NULL, 0, 0, level, X, Y, 88, 112)`, at the travel's last box;
- **in:** `v_dither_window("pod.in", NULL, 0, 0, wellPod, 0, 0, level, wx, wy, 40, 48)`, at the well pod's own rect (the target box plus (24, 64), the feet meeting);
- **order:** out first, in over it, both on the same level (0 to 16 over 180 ms).

`bayerPick` reads the Bayer cell at the screen position (each node passes its own x, y), so the two nodes' cells line up. Inside the 40 × 48 rect every pixel is the travel's or the pod's; outside it, the travel dithers away to what is under it. At level 16, drop the out node and replace the in node with the plain sprite (the same pixels). With reduced motion every dither is a cut (§8.3, unchanged).

**The per-frame sum:** the bound is per frame, including whatever else changes in that frame. The display dither (200–380 ms) runs alone apart from the crate's cut at 0. A pod's swap overlaps the next pod's travel (300 apart, 600 ms travels), which is two boxes of at most 11,776 plus a travel box of at most 9,856 each. The worst frame is well under 153,600. The face test prints the worst frame of the opening and asserts it.

**§2.10's text:** "Cargo's crate and end dithers" in the exemption list describes the old Cargo. Once T-216 lands, the crate dither is bounded and no longer needs it. The station-gate edit that drops it (keeping the screen change and the Incubate dither) rides with T-216's build. That is the builder's doc change, applied with the code.

## Tests (T-216)
- At levels 0, 8 and 16 of a pod swap, every pixel of the 40 × 48 rect is the travel's or the pod's, never clear. At 16 the frame equals the plain well sprite's.
- The display dither's dirty rects lie within (200, 60, 800, 180).
- The opening's worst frame is printed and is ≤ 153,600.
