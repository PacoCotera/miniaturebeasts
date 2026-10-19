# The focus ring's dirty area on Home's big windows (architect ruling, H1, build/t-245-home-frame 8471d2cd)

## Ruling: (c), in `prim`. Not (a), and not (b).

**Why it blows the bound.** At station-gate, `prim.c` `make()` builds a nine-slice as one container `lv_obj` the size of the whole box, holding nine `lv_image` parts, the middle included. When the ring appears, moves or goes, LVGL invalidates the container's whole area, old and new. So a ring round the Vivarium or the Library window redraws everything inside it (410,000 px measured), though only its border changes.

**The fix.** A nine-slice whose source is a ring (the asset's `ring` flag, already set for the focus ring's face-owned sources, `g_a[a].ring`), or more generally one whose middle tile is fully clear, is built **without a container and without a middle part**:
- **Eight part objects** (four corners, four edges), each an `lv_image` placed absolutely on the node's own parent (the screen, or the clip the node is in), sized to its own strip. The middle is not created.
- **One node in the face's table**, as now: same id, kind `FN_NINE`, rect and region. `prim_log_json` reports one node with the ring's box, so `ui/rings.mjs` `ringDepartures` (exactly one ring node) is unchanged. `prim_lvgl_objects` counts 8 for such a node instead of 1 + 9.
- **Moving, resizing, showing and hiding** set each part's own position and size, so LVGL invalidates only the eight strips, old and new. A move round a 600 × 500 window with an 8 px ring is about 2 × (2 × (600 + 500) × 8) ≈ 35,200 px, against 410,000 today.
- **Order:** the eight parts sit together in the sibling sequence at the node's own index, in the order corners first, then edges (`prim.c`'s ordering pass, which today skips a nine-slice's parts as "not siblings", places them consecutively instead). The ring therefore stays above what it was above.
- **Why the earlier in-prim attempt stopped drawing:** making the parts children of a smaller or zero-size container hides them (LVGL clips children to the parent unless overflow is visible, and invalidates only the parent's area when the parent moves). Don't nest them. Make them siblings on the node's parent, as above.
- **Other nine-slices** (panels, bezels, a filled middle) keep today's container form. Their middle draws, so their whole box changes anyway.

**Why not (a):** four edge strips as four face nodes breaks the one-ring-node invariant, the words' focus code and `ringDepartures`, which all spread through the views and tests to fix a problem that lives in the primitive. **Why not (b):** exemptions are for screen-level moments (a screen change, the Incubate dither), not for the most frequent move on the main screen, which would then run at four times the bound on every press.

## Tests (H1)
- In `face/tests/home.test.mjs`, each ring move's dirty rects are asserted, not just printed: every move between any two Home targets is ≤ 153,600. Vivarium↔Library, Vivarium↔Pods and Library↔Bay each print their new figure, which should be the eight strips old and new.
- The ring's pixels are unchanged: every Home and Pods golden that shows the ring matches as before (no golden moves).
- `ringDepartures` passes unchanged, and the log shows one ring node.
- `prim_lvgl_objects` for a ring node is 8, and no object is left behind after the ring goes: the count returns to its value before.
