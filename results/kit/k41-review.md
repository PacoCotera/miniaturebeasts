# K4.1 code review (reviewer, Fri 2026-10-23 11:23 Mexico City), head 2ddc2113

**PASS.** No blocking items.

## Blocking
None.

## Non-blocking notes
1. Node-record proof not independently re-captured. My instrumented capture was not built; I re-ran the builder's setcmp.mjs/map.json on the builder's own capture files (out/nodes-base1.json vs nodes-after1.json): 181 states, 15767 nodes, 0 differ as sets; renamed 20 + 124 + 124 = 268; normalised 124 glass edges, 256 windows, 140 top.rule, 140 line.rule, 32 bar.rule, 54 groundTop (counts equal the gate's). "9 differ in order" there is capture order (as in K3.2/K4); the architect gates the proof.
2. Layer-check: my output is byte-identical to the builder's base file (k41/out/lc-base.txt).
3. kit_bezel's "bevel's row must be a body row" refusal is applied only when the panel would be drawn (h >= ti + bi). Below that the panel is refused and the bevel is still drawn (builder choices 3 and 4). Reads consistent with the band ruling; only reachable at r 1. UI/UX may want to confirm.
4. kit_bezelComposed with fill NULL would write "(null)" into the ops (header says fill is a palette name; no call site passes NULL). Not required by the ruling.
5. play journey line "D: main-thread time a frame, CPU throttled 4x: 32.47 ms ... over" is printed and the journey still ends "play journey ok" (exit 0); a timing report, not a failure.
6. Running the Station journey rewrites tracked prototypes/station/img/*.png in the worktree only (discarded with it).

## Diff review (adversarial read)
- Metadata: author and committer Paco Cotera <paco@cotera.org>; message has no trailers and no model, tool or session names. Parent 91369ed4. 17 files, +134 -88.
- 2a home.c away_frame: kit_panel("away", r[0..3], fill, edge, 0): ids away, away.et/.eb/.el/.er in the old order (fill, t, b, l, r); 20 records renamed. home.test.mjs changes only box ids (away.fill -> away, away.edge.t/.l -> away.et/.el, none: away); 4 lines, nothing else.
- 2b livingWindow.c: bezel = kit_panel("bezel", ..., fill, edge, 0) then four kit_hairline with the same ids and the gate's boxes (light.t b0+1,b1+1,len b2-2 h; light.l same start, len b3-2 v; shade.b b0+1,b1+b3-2; shade.r b0+b2-2,b1+1). Glass edges = kit_panel(region, g..., NULL, COL("edge"), painted): outline-only form, ids <region>.et/.eb/.el/.er, order t b l r as before.
- 2d panel.c build_bezel: kit_bezelComposed(panel.bezel.N, box, rad, fill, edge, bevel colour) in the same region; the v_error check for inset != rad or dy != 1 is as ruled. kit_bezelComposed: one composed node at the box; ops rrect then ["h",r,1,w-2r,bevel] when bevel set; edge NULL gives ""; v_error and no node for r<1, w<2r, h<2r; contract header, declared in words.h. Ground in the node is NULL/absent (no ground in this form).
- 2e/2f home_frame.c: slot_outline deleted; kit_windowFrame(..., NULL ground, slot.edge) gives [["rrect",0,0,w,h,radius,"","edge"]], byte-equal to the old string; header sentence added. bezel_words window = kit_panel(..., win[2], win[3], f, e, gone).
- 2g zero rule / 3.4 plain rules: top.rule, line.rule, bar.rule, top.sep.N, line.sep.N, idle.strip.rule, specimen.cut, groundTop all kit_hairline with the same id, same box when shown, same call order; hidden forms are 0x1 (solid len 0). page.c untouched.
- 3.3 v_scol_or / v_token: v_scol_or = spec_str into a 16 x 24 ring, default d when spec_str <= 0 (absent or empty); v_token = v_scol_or(spec, "colours.<name>", name). panel.c col/rcol/pcol and cargo.c fcol deleted. Same fallbacks as the deleted helpers: col -> the name; rcol and pcol -> "bone" for a missing role, then the frame token; pcol reads PN then maps through F; every call site is written with the matching path. Nested calls use distinct ring slots (inner result is copied before reuse). cargo.c fcol had one call site (band.words), not two; build_bay uses v_scol (empty when absent, as spec_str into a buffer was); home_frame bar_words same.
- Band refusals (bezel.c): "kit_bezel: a top band takes the bevel's row; pass bevel NULL" (after the band's own checks, before the source is made, only with a band of h > 0, so h 0 + bevel stays valid) and "kit_bezel: the bevel's row must be a body row"; bottom bands unchanged. face_test has the three cases (kb.tb, kb.bb, kb.r1/kb.r1ok) plus kb.short; kb.t now passes bevel NULL (ruling-forced) and its two assertions are updated to match.
- Short bezel: bevel still drawn when the panel is refused (K4 review note 3 closed).
- ring_in_round: exported from prim/ring.c with a declaration and comment in ring.h; bezel.c's copy deleted and bezel.c includes prim/ring.h. Builds clean, 0 warnings.
- Kit rule: no new private helper duplicates a v_* helper or kit component (slot_outline, col, rcol, pcol, fcol all removed); every new component/helper has a contract header (kit_bezelComposed in bezel.c, v_scol_or/v_token in vocab.h, windowFrame and bezel headers updated).
- Goldens: none retaken (no golden file in the diff; goldens --check matches).

## Check lines (verbatim, my run on 2ddc2113, private FACE_BUILD_DIR)
- build.sh all: exit 0; `wasm   build 79.3 s   face.wasm 666133 bytes (267264 gzipped)   face.mjs 12427 bytes`; `layout: 386 cases, 0 differ`; `face_test: 14799 checks, 0 failed`; `native build 70.0 s   LVGL 9.6.0 1024x600 hash=47e09df8 dirty=0 keys=1 last=17`; 0 lines with "warning"
- node --test group 1 (roadmap, ui, station): `# tests 654` `# pass 654` `# fail 0` `# skipped 0`
- node --test group 2 (exploration, caddy, face, workbench framework, genome-stamp bins): `# tests 931` `# pass 930` `# fail 0` `# skipped 1`
- station journey: `journey ok · screenshots in img/` (exit 0)
- play journey: `play journey ok` (exit 0)
- face guard: `guard: 75 removed paths, 314 files read, 0 failures` / `guard ok` (exit 0)
- layer-check: `layer check ok` (exit 0)
- goldens --check: pods, home, cargo, create, incubator, habitat, vivarium, library, bench, idle each `<screen>: goldens match`; exit 0
- station checks.mjs: `layer checks ok` (exit 0)
- place-masters --check: `masters: 1006 placed, 0 problems`
- public guard: `public guard ok`, exit=0

Cleanup: the worktree is removed and pruned, rev-k41-build and logs deleted; no /tmp/bake-c-* left; no background jobs. The clone is unchanged.
