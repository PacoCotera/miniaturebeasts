# Library 1 gate (architect, 2026-10-24 02:10 Mexico City), c392c5e1

T-20261023-289, build/library-kit c392c5e1 on c4be3673. It is one commit, by Paco Cotera <paco@cotera.org>, with no trailers. It touches 8 files: CMakeLists, home_frame.c, face_test.c, frame.c, the new station/glint.c, words.h, metrics.json and frame.json. I gated it against the ticket's Rules, the K7 lines (k7-gate.md §5) and the Library UI/UX source.

## 1. Verdict

**FIX ROUND (one placement fix, two files, golden-neutral). After that, merge.** Everything else is built as ruled and is green on my own runs. Home's glint move is exact, the readout's x layout and edge cases are right, the rule-8 headers are present, and the merge is clean. The one open point is the readout's vertical placement, which the ticket left open. I rule it in §3, and it differs from what the builder chose:
- The text belongs on the title's baseline (24), not at the title's cap top (10).
- The mark belongs centred on its word's cap (y 13), not centred on the title rect (y 15).

The fix is §4, verbatim. I applied it in my scratch worktree on c392c5e1: native build exit 0, `face_test: 15151 checks, 0 failed`, face guard ok. It changes no node in any golden state, because no state sends `frame.top.readout`.

## 2. What I measured

All runs were in my own worktree under scratchpad/arch-lib1, with private FACE_BUILD_DIR and TMPDIR. No /tmp/bake-* directory was created.

- **build.sh all (head c392c5e1):**
  - exit 0
  - `layout: 732 cases, 0 differ`
  - `face_test: 15151 checks, 0 failed`. The base has 15134 (builder's base build). The +17 are the 14 new glint/readout checks plus 3 metrics vectors for `markGap`.
  - `hash=47e09df8`, the same as K7.
- **goldens --check (head):** exit 0, 10 of 10 `goldens match`.
- **node --test (head):**
  - face: 604 tests, 604 pass, 0 fail.
  - caddy, exploration, genome-stamp, station, ui and workbench: 1024 tests, 1023 pass, 0 fail, 1 skipped.
  - .github/roadmap.test.mjs: 8 of 8 pass.
- **Guards (head, committed tree):**
  - face guard: `guard: 75 removed paths, 319 files read, 0 failures` / `guard ok`, exit 0.
  - public guard: `--base c4be3673` (the CI mode) gives `public guard ok`, exit 0.
  - `--tree` reports 13 "(report)" hits. All 13 are in files this commit does not touch (M1 § in wire.c, prim.c, screens and so on), so they predate it.
- **Ratchet (L5 proof line):**
  - Recounted through guard.mjs kitCounts on the head tree: bench 3, cargo 12, create 11, habitat 13, home 14, home_builds 3, **home_frame 18**, incubator 5, library 4, moving 0, namer 4, panel 28, pods 0, screens 1. prim_node and static spec accessors are 0 everywhere.
  - kit-ratchet.json is unchanged in the diff. home_frame.c stays at 18 (v_dither_window is not counted), so the ratchet is unchanged.
- **Node records, empty map, as sets.** I made my own captures: instrumented archive copies of c4be3673 and c392c5e1 outside the clone, with kit-proof instr.py and nodes.mjs.
  - Both sides: 181 states, 0 failures.
  - setcmp: `181 states, 15767 nodes, 0 differ as sets, 13 differ in order`.
  - The 13 order-only states are all Pods states. My base capture against the builder's capture of the same tree c4be3673 gives the same 13 states in order only, so this is capture order (same-side pair), as in k5, k6 and k7.
- **Type log, layer-check and checks.mjs:** I did not rerun the journey. On the builder's two journey captures:
  - tlcmp gives `44 shots, 0 differ`.
  - lc and ck are identical with ` · placeholders registered N` stripped.
- **The merge.** origin/station-gate moved during my run, from 8476056c (the brief) to a9d087f9 (T-296 lines 1–4: Library masters and palette).
  - `git merge-tree --write-tree 8476056c c392c5e1` gives tree dbdc51fd, exit 0.
  - `git merge-tree --write-tree a9d087f9 c392c5e1` gives tree d533018b, exit 0. The merged diff against a9d087f9 is exactly the branch's 8 files.
  - Both sides edit metrics.json, and the auto-merge is correct: `make-metrics-vectors --check` on the merged tree gives `metrics vectors current: 12237 cases`.
  - On the a9d087f9 merge, in its own worktree (scratch commit 9132c499, unreferenced):
    - build all: exit 0, `face_test: 15154 checks, 0 failed`, hash=47e09df8.
    - goldens --check: exit 0, 10 of 10.
    - node --test: face 604 of 604 pass. The rest plus roadmap: 1047 tests, 1046 pass, 0 fail, 1 skipped.
    - face guard: `guard ok` (320 files). public guard `--base a9d087f9`: ok, exit 0.

## 3. The placement ruling

**What the UI/UX source says about the readout.** Grepping "readout" finds it in the UI/UX Library design and words.md only. the UI/UX follow-ups and the UI/UX follow-ups have no readout line.
- the UI/UX Library design: "drawn at 16 px in `mist`, starting at x = the title's end + 8, and clipped to end by x 248;"
- the UI/UX Library design: "the mark (a 10×10 picture) 4 px before its word;"
- The architect's K-order ruling and the copywriter's words give the same x figures (123, +14 with a mark, clip at 248) and no y.
- The mock that drew the readout, the art director's mock composer, draws the word at `textBaseline = 'middle'` on y 19 and the mark with `glyphMark(o, p.mark, x, 19 - 5, …)`. The mark is centred on its word's middle line, not on the bar or the title.

**The source fixes x only.** Its one statement about the mark, "4 px before its word", ties the mark to its word, and the mock centres the mark on the word. Nothing in the source ties the mark to the title rect.

**The text: on the title's baseline, y 24. Not at the title's cap top.**
- The ticket says "on the title's row". On one row, mixed sizes share a baseline.
- The bar already does this. Its other 16 px words sit with cap top 12 on baseline 24, which is the title's baseline (title cap top 10 + v_cap(20) = 14):
  - the counters: `v_text(id, txt[i], fx, mrect[1] + 4, …)`, rect y 8;
  - the turn: `tr[1] + 4`, rect y 8.
- The builder's V_ANCHOR_CAP at 10 puts the readout's baseline at 22. That is 2 px above both the title's baseline and the counters'.

**The mark: centred on its word's cap, y 13 (13–23 inside the cap 12–24). Not centred on the title rect (y 15).**
- With the builder's cap top 10, the mark's centre at 20 sits 4 px below its word's cap middle at 16, and its foot sits 3 px below the word's baseline.
- That is the reverse of "before its word" and of the mock.
- The bar's own marks before words keep to the word's cap, not to the rect: the counter icons and the sun are at `+ 4`, the word's cap top.

**The builder's edge cases are all accepted:**
- **An empty mark ("") means no mark.** `spec_str(...) > 0` treats "" like null. This matches v_slot's own rule ("an empty id is no picture"). The text starts at the title's end + 8 and no mark node is made.
- **A readout that is not an object draws nothing.** `spec_raw` gives the raw token. A string starts with `"` and null with `n`, so only `{` draws. The props contract is an object, so this is right.
- **A named but unsent mark keeps the text after the mark's room.** This is the frame's own rule, frame.c header: "Marks are pictures the host has sent: one that is not on the face draws nothing and the layout does not move." v_slot makes no node, because v_sprite_hidden finds no slot, and x still advances by 10 + 4. When the picture lands, the text does not jump.
- **No text with a mark** (not a builder case, checked): spec_str clears the buffer, so the text node exists with no size. That is harmless.

## 4. The fix (exact lines; verified on c392c5e1 in scratch: face_test 15151 checks, 0 failed; guard ok)

prototypes/face/src/vocab/common/frame.c:
- Header comment, line 5: `on the title's row, cut by v_clip` becomes `on the title's baseline, the mark centred on its cap, cut by v_clip`.
- The two-line comment over the readout becomes:
  `/* the readout after the title (props frame.top.readout { text, mark }): its nodes only when the props carry it. The text sits on the title's baseline (24, where the bar's other 16 px words sit),`
  `   the mark (when named) first, centred on the text's cap; the text is cut with an ellipsis to end by regions.top.readout.end. A mark not on the face draws nothing and the text does not move. */`
- In the `int x = …` line, `, tr4[4]; v_srect(F, "regions.title.rect", tr4);` becomes `, base = v_si(F, "regions.title.text.1", 0) + 2 + v_cap(v_si(F, "regions.title.px", 0));`
- In the mark's v_slot, the y `tr4[1] + (tr4[3] - mh + 1) / 2` becomes `base - v_cap(px) + v_fdiv(v_cap(px) - mh, 2)`.
- The text becomes `v_line_at("top.readout.text", cut, x, base, V_ANCHOR_BASE, px, c, V_ALIGN_LEFT);`

prototypes/face/src/test/face_test.c (glint_readout):
- After the `kbox(... "top.readout.mark", mb);` line, add `int tm[4]; kbox("top.m.e", tm);   /* the Energy figure: a 16 px word of the bar, cap top 12 on baseline 24 */`.
- In the i == 0 mark check, `mb[1] == 8 + (24 - 10 + 1) / 2` becomes `mb[1] == 13 && rb[1] == tm[1]`. Its message becomes `"readout: with a mark, the 10 x 10 mark at the title's end + 8 (x 123), y 13: centred on the text's cap, 12 to 24, on the title's baseline 24 as the counters"`.
- In the i == 1 check, add `&& rb[1] == tm[1]` after `rb[0] == 123`.
- A text node's box y is the line box top, not the cap top: 8 for a 16 px cap top of 12. That is why the test compares with the counter's node instead of a literal.

The proof for the fix round: build all and face_test 0 failed, and the face guard exit 0 with the ratchet unchanged (home_frame 18). The node records cannot move, because no golden state carries the readout. goldens --check 10 of 10 is enough.

## 5. Review of the rest of the diff (no defects)

- **kit_glint_level** is the old lib_glint_level, arithmetic for arithmetic. It takes `elapsed_ms % ms` with elapsed = now − g_lib_t0, `top * up / half`, and gives top when there is no motion or ms ≤ 1, with defaults 2000 and 16. library_tick still returns 0 before reaching it when motion is off.
- **kit_glint** is the same v_dither_window call. cx − w/2 with cx = g[0] + x equals the old g[0] + x − gw/2 in integers.
- **Rule-8 headers.** Both begin `/* kit_<name> (` and hold Props, Region, Node id and Returns. word_topBar's file header gains the readout's props, spec keys and node ids (L5).
- **The readout.** The nodes are made only when `frame.top.readout` is an object. v_clip is called explicitly, as the UI/UX follow-ups:12 requires, with the room `end − x`. The colour comes through the spec key. frame.json is a spec-only addition. The metrics vectors for "markGap" are current.
- **The tests** cover every case the ticket names:
  - the levels at 0, ms/4, ms/2, 3ms/4 and ms, with and without motion;
  - the node and box at level 0 and at the top level;
  - an unsent asset;
  - the readout with a mark, without a mark, cut with "…", and absent.

## 6. Housekeeping

- My worktree under scratchpad/arch-lib1 (c392c5e1, then the scratch merge 9132c499, then back) and scratchpad/arch-lib1-x (build directories, archive copies, node captures) were removed. The worktree was pruned.
- git merge-tree and commit-tree added objects only, no refs.
- I did not commit in, check out or edit /home/user/miniaturebeasts or /home/user/lk.
