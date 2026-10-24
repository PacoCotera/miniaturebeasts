# K6 code review (reviewer, 2026-10-23 18:33 Mexico City), head 0cd33136

**Verdict: PASS with one blocking item (B1) that I report as a defect against the "same nodes" rule. The lead and architect decide whether it blocks the merge.** Every check I ran is green. B1 is an edge no golden or journey state reaches.

## Blocking
- **B1. kit_stamp's "sent" test is applied in Habitat only.**
  - `create.c` build_stamp (`kit_stamp(C, ..., a, size, ...)`) and `incubator.c` build_column (`v_pstr("regions.stamp.asset")`) pass the raw asset id. The old code gated on `has(a) && size`.
  - kit_stamp tests only `asset && *asset && size != 0`, so when the id is named but the picture is not yet sent the new code differs from the old:
    - the plate is shown (old: a hidden slot);
    - Create also draws a stamp.clip node with no stamp after it (old: none), and that clip applies to the next node, the case front.
  - I ran it: Create "read 2, f 1" with the stamp picture skipped gives `["stamp.plate","painted",[804,336,120,120]]` and no stampImage region. Old code gave a zero-size plate there.
  - Habitat already passes `has(a) ? a : ""`. Pods is equivalent, because it uses clipH -1 and v_sprite tests the picture.
  - Exact fix: in `create.c` build_stamp pass `has(a) ? a : ""` as the asset; in `incubator.c` build_column pass `has(v_pstr("regions.stamp.asset")) ? v_pstr("regions.stamp.asset") : ""`. A face_test case for a named but unsent asset would be good.

## Checked, no finding
- **Commit metadata:** Paco Cotera <paco@cotera.org> as author and committer, no trailers, no model, tool or session names.
- **kit_stage:**
  - Every converted spec holds the rect: bench, create, incubator, habitat, pods, frame, vivarium, `home.regions.stage.rect`. cargo reads `frame`, which holds it.
  - So no site drew a zero box before, and "no rect draws nothing" changes nothing.
  - Ids, regions, order and the ground-then-room draw are identical per site.
  - The v_scol ring (16) is not clobbered before use.
- **kit_pod:**
  - Create's shadow and box are the same arithmetic.
  - The old early return order is preserved: no class returns without nodes, and a missing picture returns with no shadow.
  - Pods and specimen: the props always set sizeClass (default "medium"), so the no-class case (the shadow is now dropped) is unreachable.
  - The specimen shadow's layer() and v_slot(on=1) are equivalent.
- **kit_stamp, other callers:**
  - Pods: plateAlone=1 matches the old plate drawn regardless of the stamp. The node order, ids and regions (stamp, stamp.image) are the same.
  - Habitat: same order. The clip is always drawn once there is a stamp, as before.
  - Create: the case is drawn in every state, as before.
- **Cargo band probe:**
  - Words x: old `px0+n*pitch+gap-(pitch-isz)` equals `last.x+last.w+gap`. The tiles test asserts it for n 1 to 4.
  - The refused fifth is covered (listPitch throws for 5). Vectors n 0 to 5 are present and pass in both implementations.
  - Note: the new `n > 0` guard on the words differs from old only for zero plates with words, which the spec rule excludes.
- **Habitat name tag:**
  - nameTag.under 24 and overGap 8 are added to the spec; build_tag has no literal 24 or 8.
  - The h default 0 is safe, because the spec holds h 32 (nameTag.c keeps its own default 24).
  - The regenerated metrics vectors differ only by the 3 "overGap" strings (px 16, 20, 28).
- **Leaves deletion:** `git grep` finds no word_leaves, leavesArc, word_bench, word_stamp or word_pod_size anywhere. Files, CMake, words.h and the README are consistent. layout_leaf_arc and its vectors stay, as the ticket says.
- **Memory safety in the new C:** no fixed buffers are written. v_fmt and vsnprintf are bounded. Pointer arguments come from the v_pstr and v_scol rings (32 and 16 deep) with at most a few calls before use. The o and shadow pointers are always non-NULL at the callers.
- **Contract headers:** present on all three components; the kit_tiles node-order header (6a) is present. No new private helper duplicates a v_* helper or kit component (new: pods.c `stamp_label`, a wrapper; cargo.c `probe_plate`, a callback).
- **No golden retaken:** goldens.mjs --check matches.

## Non-blocking notes
- `tools/habitat-regions.mjs:27` still hardcodes "feet + 24"; it could read R.nameTag.under.
- `prototypes/station/img/*.png` are rewritten by the Station journey run; I ran it in my own worktree, so nothing was touched in the builders' trees.
- The play journey prints the existing line "CPU throttled 4×: 26.18 ms ... over 12 ms", and the journey still exits ok.

## Check lines (verbatim)
- build.sh all: `layout: 775 cases, 0 differ`; `face_test: 15223 checks, 0 failed`; `native build 120.2 s   LVGL 9.6.0 1024x600 hash=47e09df8 dirty=0 keys=1 last=17`
- node --test group 1 (roadmap, ui, station, exploration, caddy): `# tests 980  # pass 979  # fail 0  # skipped 1`
- node --test group 2 (face, workbench framework, genome-stamp bins): `# tests 624  # pass 624  # fail 0  # skipped 0`. Total 1604, 1603 pass, 0 fail, 1 skip.
- station journey: `journey ok · screenshots in img/` (exit=0)
- play journey: `play journey ok`
- face guard: `guard: 75 removed paths, 318 files read, 0 failures` / `guard ok`
- layer-check: `layer check ok`
- goldens --check: `idle: goldens match`
- station checks.mjs: `layer checks ok`
- place-masters --check: `masters: 1006 placed, 0 problems`
- public guard: `public guard ok` / `exit=0`
