# K4 code review (reviewer, Fri 2026-10-23 09:15 Mexico City), head 8d651c92

**PASS.** No blocking items.

## Blocking
None.

## Non-blocking notes
1. prototypes/face/src/vocab/common/bezel.c:~15-19 (in_round) is a copy of the static in_round in prototypes/face/src/prim/ring.c:5. It is not a v_* helper or kit component, so the kit rule is not broken. Two copies of the arc predicate can drift apart. Architect to decide whether prim should export one.
2. Headers of panel.c, bezel.c, hairline.c do not link the architect's ruling for the new props (band, dash, outline-only). Those props come from the ticket text and results/face-ui-kit.md §3.2. A one-line link in each header would satisfy "any new pattern links the architect's ruling". The lead decides whether to ask.
3. bezel.c kit_bezel: an undersized bezel (h < 2r) now draws no bevel either. Before, build_roundPanel refused the panel and the caller still drew the bevel rect. Unreachable at the current sites (all boxes are large), so no node record changed.
4. hairline.c kit_hairline: a dashed rule with len < 1 is refused with v_error and makes no node. A solid rule at len 0 is a zero-size rect. Both are consistent with the header (a dashed rule hides by colour NULL), but a future site cannot hide a dashed rule by len 0. A cap on the second form is a UX/architecture question, so it is reported only.
5. Builder choice (1), the band geometry (h rows inside the edge, then one rule row, inset = max(r, h+1+rule), rows follow the corner arcs), is unused by any screen. It needs the architect's confirmation before the Library uses it. The code matches the header, and face_test checks the edge row, the band rows, the rule row, the arc, and that nothing below the band changes. h 0 and a NULL band give a byte-identical source and nodes (checked in code and in face_test).
6. Parked sites (home.c away_frame, livingWindow.c, create.c clash, panel.c build_bezel, home_frame.c slot_outline) are left to the architect's gate. No F3/F4 site was converted with changed ids.
7. The ribbon and the plain 1 px rule sites (top.rule, bar.rule, line.rule) stay as v_rect. This is outside F3/F4 and matches the ticket.
8. Running the Station journey rewrites tracked prototypes/station/img/*.png in the checked-out tree (in my throwaway worktree only; discarded at cleanup).

## Diff review
- Metadata: author and committer are both Paco Cotera <paco@cotera.org>. The message has no trailers and no model, tool or session names. Parent is ee794f78.
- Converted sites (all 14 word_panel calls, the ribbon empty state, three bezels, bay and panel window frames) produce the same ids, kind, box and ops:
  - kit_panel keeps the order <id>, .et, .eb, .el, .er and the same rects. Slot passes the fill and edges at (x, y) with size 0. The old call sites did the same (`bar ? 0 : r[2]`), and the ribbon's hand-built slot is now the slot form. Hidden window sites (`gone ? 0 : win[2]`) still pass size 0 with slot=0 and so keep the old far-edge positions.
  - nameTag slot: edge NULL and slot=1 gives one node at (x, y, 0, 0), as before.
  - kit_bezel keeps <id>.panel and <id>.bevel. Station and bezel panels keep bevel. The console passes bevel NULL, as it had none before. The source is (2r+4)^2 with insets (r, r, r, r), as in build_roundPanel (insets are packed l, t, r, b in prim.c:361).
  - kit_windowFrame builds the same ops string as cargo.c and panel.c did.
  - kit_hairline: the bevel is the same rect, x+r, y+1, w-2r by 1.
- Band code: bounds (h <= 200, side 0 or 1, fill required, h and insets checked before drawing); corner arcs by the same predicate as the rrect op; h 0 gives identical ops and nodes. The ops buffer is the 128 KiB prim_ops, worst case about 12 KB, so the snprintf accumulation cannot overflow.
- Memory: fixed buffers (pid[96], ops[300], ops[160]) hold any palette-name argument; every snprintf has a size bound. Error paths return before any node.
- CMake: the four new files are listed. No warnings in the build log (0 matches for "warning").
- Dead code: no references to word_panel, word_hairline or build_roundPanel remain in the tree (grep: none). The home_builds.c header comment was updated. The screens.h and words.h declarations are removed or replaced.
- Contract headers (props, region and layer, node ids, return) are present on all four components. No new private helper duplicates a v_* helper (note 1 aside). No golden was retaken.

## Check lines (verbatim, my run on 8d651c92, private FACE_BUILD_DIR)
- build.sh all: exit 0; `wasm   build 51.8 s   face.wasm 666659 bytes (267606 gzipped)   face.mjs 12427 bytes`; `layout: 386 cases, 0 differ`; `face_test: 14785 checks, 0 failed`; `native build 40.6 s   LVGL 9.6.0 1024x600 hash=47e09df8 dirty=0 keys=1 last=17`
- node --test group 1 (roadmap, ui, station): `# tests 654` `# pass 654` `# fail 0`
- node --test group 2 (exploration, caddy, face, workbench framework, genome-stamp bins): `# tests 931` `# pass 930` `# fail 0` `# skipped 1` (1585 in all, 0 fail, 1 skip)
- station journey: `journey ok · screenshots in img/` (exit 0)
- play journey: `play journey ok` (exit 0)
- face guard: `guard: 75 removed paths, 314 files read, 0 failures` / `guard ok`
- layer-check: `layer check ok` (exit 0)
- goldens --check: pods, home, cargo, create, incubator, habitat, vivarium, library, bench, idle each print `<screen>: goldens match`; exit 0
- station checks.mjs: `layer checks ok` (exit 0)
- place-masters --check: `masters: 1006 placed, 0 problems`
- public guard: `public guard ok`, exit=0

Not repeated by me: the builder's node-record comparison across 181 states and the type-log comparison (I made no baseline capture, so I do not vouch for those). My adversarial read found no change in ids, kind, box or ops, and the golden, layer-check and checks.mjs runs above agree.
