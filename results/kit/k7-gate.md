# K7 gate (architect, 2026-10-23 22:58 Mexico City), db7ac61b

T-20261023-287, build/kit-rules db7ac61b on a2db600e (one commit, Paco Cotera <paco@cotera.org>, no trailers). Gated against k6-gate.md §4 "K7 must carry these lines", fg-gate.md §5 (the base line and the \bNAME\s*\( line), k5-gate.md 2b (screenSpecific) and face-ui-kit.md §5.

## 1. Verdict

**PASS. Merge.** Every K7 line is built as ruled. Every proof is green on my own runs, and the merge with origin/station-gate (ae0afe65) is clean and green. Rule 7b's reader list has one gap (§4). It is a gap in my ruling, not the builder's: the builder used the ruled list exactly, and the gap is 0 today. The first Library ticket closes it (§5, line L1).

## 2. What I measured (my worktree and archive copies under scratchpad/arch-k7, private FACE_BUILD_DIR and TMPDIR)

- **Node records, empty map.** I captured both sides on instrumented archive copies (the builder's instr.py and nodes.mjs, byte-identical to the tools README's copy) and compared them with setcmp.mjs:
  - a2db600e: 181 states, 0 failures. db7ac61b: 181 states, 0 failures.
  - Result: `181 states, 15767 nodes, 0 differ as sets, 9 differ in order`.
  - The 9 order-only states are all Pods states. The record order is prim's table order, which depends on slot reuse. k5-gate.md and k6-gate.md found the same 9 order-only states between two captures of one tree, so this is capture order.
- **Build.** On both sides `build.sh all` exits 0, with layout 775 cases and 0 differ, and native hash=47e09df8 on both sides. face_test: base 15223 checks, head 15228 checks (+5: the unsent stamp, v_clip_box and v_snapshot), 0 failed.
- **Station journey.** Each side ran from its own worktree with a private STATION_CHECKS. Both print `journey ok`.
- **layer-check and checks.mjs**, with ` · placeholders registered N` stripped: identical on both sides (191 and 95 lines). Both print `layer check ok` / `layer checks ok`.
- **Type log.** tlcmp gives `44 shots, 0 differ (every string, px, region; type-layer rects)`: 44 of 44.
- **goldens --check (head):** exit 0, 10 of 10 `goldens match`.
- **node --test (head):**
  - face: 604 tests, 604 pass, 0 fail.
  - roadmap, ui, station, exploration, caddy, workbench and genome-stamp: 1028 tests, 1027 pass, 0 fail, 1 skipped.
- **Guards (head, committed):**
  - `guard: 75 removed paths, 319 files read, 0 failures` / `guard ok`, exit 0.
  - `public guard ok`, exit=0.
- **place-masters --check:** `masters: 1006 placed, 0 problems`.
- **The ratchet, recounted** through blank(src, { js: false }) and \bNAME\s*\(, on a2db600e and on db7ac61b. The counts are the same on both trees, the same as kit-ratchet.json, and the same as k6-gate.md and fg-gate.md:
  - bench 3, cargo 12, create 11, habitat 13, home 14, home_builds 3, home_frame 18, incubator 5, library 4, moving 0, namer 4, panel 28, pods 0, screens 1.
  - Total 116, also 116 without blanking.
- **prim_node in screens.** a2db600e has five calls: cargo.c:307, cargo.c:320, home.c:550, home.c:619 and panel.c:173. db7ac61b has none.
  - The four clips call v_clip_box with the same id, box and count.
  - The snapshot calls v_snapshot, and panel.c's extra prim_tag is gone.
- **Static spec accessors in screens (rule 7b):** 0 on both trees. They are still 0 with the reader list widened as in L1.
- **My own planted violations**, run with guard.mjs --root on a copy of face/src/{screens,vocab}, removed.json and kit-ratchet.json:
  - The clean copy passes: guard ok.
  - Rule 7a:
    - `prim_node /* x */ (` in library.c fails: `library.c:25 calls prim_node (rule 7a …)`.
    - `// prim_node(1);` passes.
  - Rule 7b:
    - A one-line v_scol accessor fails: `library.c:24 defines the static spec accessor lc (rule 7b: one call of v_scol …)`.
    - A multi-line `static int lk(const char *base,\n int k) { return v_sk(S, v_fmt("%s.items", base), k); }` fails with the same message for lk and v_sk.
    - A v_sstr accessor passes. This is the gap, see §4.
    - `const char * const p` passes. This is the gap, see §4.
    - `return spec_raw(S, p, NULL) != NULL;` passes. That is correct: the body is not one call.
  - The ratchet:
    - One more v_sprite_hidden in library.c fails: `library.c makes 5 … the ratchet allows 4`.
    - The same call in a comment passes.
    - A new library_page.c with `v_rect (` fails: `… makes 1 … the ratchet allows 0`.
  - screenSpecific:
    - With the list removed, the guard fails: `has no "screenSpecific" list`.
    - With home_frames.c named, the guard fails: `names home_frames.c, which is not a file in face/src/screens/`.
  - Rule 8:
    - A header that lacks Region fails: `rail.c:81 kit_probe's header lacks Region (rule 8)`.
    - A header placed after the definition fails: `no header comment beginning "/* kit_probe ("`.
    - `/*kit_probe (` (no space) over a `static int\nkit_probe(…)` fails with the same message.
- **The builder's guard test** plants one violation for each of 7a, 7b, the ratchet, screenSpecific and 8. It also plants a comment, a comment between the name and its bracket, NAME-space-bracket, a computation over the spec, an unnamed screen, and a declaration and a call that are not definitions. It passes inside the 604.
- **kit_stamp tests "sent" itself.** The test is `asset && *asset && size != 0 && wire_has_asset(asset)`.
  - Create, the Incubator, Pods and Habitat pass the raw id. Habitat's `has(a) ? a : ""` is gone.
  - word_stampCase is a static function in stamp.c and is gone from words.h.
  - specimen.c's si, sa, srect and colour are inline v_si, v_sk, v_srect and v_scol over v_fmt.
- **The merge with origin/station-gate (ae0afe65).**
  - `git merge-tree --write-tree ae0afe65 db7ac61b` gives tree 41216b00, exit 0.
  - ae0afe65 is one commit on a2db600e (T-285, the sitting queue). It changes 5 station files and no face file, so the merged face is db7ac61b's.
  - On the merged tree, in its own worktree:
    - build all: face_test 15228 checks, 0 failed, hash=47e09df8.
    - node --test, all groups in one run: 1634 tests, 1633 pass, 0 fail, 1 skipped.
    - Station journey (private STATION_CHECKS): `journey ok`. layer-check and checks.mjs, stripped, are identical to head's. Type log against head: 44 shots, 0 differ. goldens --check: exit 0, 10 of 10 match.
    - face guard `guard ok`, exit 0; `public guard ok`, exit=0.

## 3. The builder's six choices

1. **A screen not named in kit-ratchet.json is held to 0: accepted.** This is face-ui-kit §5.3 ("a new screen's ticket states its budget, which is 0 by default"). The guard reads `counts[name] ?? 0`, and my planted library_page.c fails.
2. **Rule 7b: "on that path" means the path parameter appears anywhere in the call's arguments, including inside v_fmt, and "takes a path" means a char * parameter: accepted.** This reads the ruling's intent: specimen.c's old sa(base, key, k) is exactly that shape. The `const char *const p` form is not caught. That is a corner, closed in L1.
3. **Rule 8: "header comment" means any comment earlier in the same file that begins "/* kit_<name> (": accepted.** Each header has to begin with its own function's name, so one header cannot cover two components. A header after the definition fails, and so does a declaration or a call. The ruling did not ask for the header to sit directly above the definition, and every one of the 10 does.
4. **The ratchet file is {"counts": {screen: n}, "screenSpecific": [...]} at prototypes/face/kit-ratchet.json: accepted.** The ruling named the file and its two contents but not its place. Beside removed.json, the guard's other data file, is the right place. screenSpecific is k5-gate 2b's entry, word for word.
5. **kit_stamp's own prim_node in vocab/ stays: accepted.** Rule 7 is about screens (face-ui-kit §5.1). page.c:75 and kit_stamp are vocab. v_clip_box now exists for either of them when it is next touched (L4 for page.c).
6. **Branch build/kit-rules: accepted.** fg-gate.md's base line said build/ui-kit, but K5.1 holds that branch (T-286). The ticket's own branch line (build/kit-rules) is the later word.

## 4. Are 7a, 7b, 8 and the ratchet tight enough for the Library's six tickets?

- **7a: yes.** Any `prim_node` followed by spaces or a comment and then a bracket in screens/*.c fails, and comments are blanked. A macro alias (`#define P prim_node`) would get past it. That is adversarial and a reviewer catches it. The guard covers screens only, so page.c and rail.c (vocab) are not held by it. L4 covers page.c's one prim_node.
- **7b: not quite, by my ruling's list.** The ruled readers are spec_int, spec_str, spec_len, spec_bool, v_si, v_sk, v_srect, v_scol and v_spec_rect. The face also reads the spec through v_sstr, v_scol_or, v_token, spec_raw and spec_member, and 38 lines in screens call v_sstr, v_scol_or and spec_raw. A one-call accessor over any of these five passes the guard today (planted: a v_sstr accessor in library.c, guard ok). Separately, a `const char *const` path parameter is not recognised. With both closed, the count is 0 on a2db600e and on db7ac61b (measured with a copy of guard.mjs). L1 closes them. Like 7a, 7b covers screens only: page.c's sa, sexists and colour and rail.c's fi and fcol are not held by it. L3 keeps the k1-gate line on them.
- **The ratchet: tight against a rise, loose against a fall.** The guard fails only when a count rises. If a ticket removes direct calls and does not lower the entry, the slack lets them come back unseen. A file that is retired leaves a stale entry, which is harmless but misleading. L2 closes both.
- **8: yes.** Every kit_* definition under vocab/ (static too, with the return type on its own line or not) must have its own header, with Props, Region, Node id or Node ids, and Returns. It does not hold word_* functions, so a new look named word_* would get past it. L5 closes that.
- **screenSpecific: yes.** The guard checks that the list exists and that each file it names exists.

## 5. Lines the Library tickets must carry because of K7

- **L1 (the first Library ticket, before any change to library.c):** `Guard rule 7b's readers gain v_sstr, v_scol_or, v_token, spec_raw and spec_member (ACCESSOR_CALLS in face/tools/guard.mjs and its header comment), and a path parameter may be written "const char *const p". 0 accessors at db7ac61b with the wider list (architect, measured). The guard test plants a one-call v_sstr accessor in a copy of a screen.`
- **L2 (every Library ticket that changes library.c's direct calls):** `kit-ratchet.json's "library" entry is lowered to library.c's new count of direct v_rect, v_text, v_sprite, v_sprite_window and v_sprite_hidden calls in the same commit (4 at db7ac61b: two at :29–30, the stage's ground and picture, plus :49 and :56). A ticket that retires library.c removes the entry. A ticket that adds a screen file adds its entry at the budget its ticket states (0 by default, face-ui-kit §5.3).`
- **L3 (the ticket that first touches page.c or rail.c):** `page.c's sa, sexists and colour and rail.c's fi and fcol become inline v_si, v_sk and v_scol over v_fmt (k1-gate.md; sexists is spec_raw over v_fmt inline). Rules 7a and 7b do not cover vocab/, so the reviewer checks this line by grep: no static function in page.c or rail.c whose body is one spec read.`
- **L4 (the ticket that first touches page.c):** `page.c:75's prim_node(v_id(v_fmt("%s.wipe", cid)), FN_CLIP, cx, cy, pw, cut, 0, 1, 0) becomes v_clip_box(v_fmt("%s.wipe", cid), cx, cy, pw, cut, 1): the same node, the node records unchanged.`
- **L5 (any Library ticket that adds a look to vocab/):** `a new component is a kit_* function with its rule-8 header (beginning "/* kit_<name> (", holding Props, Region, Node id or Node ids, and Returns); a word_* is not held by rule 8.`
- **Proof line for each of them:** `face guard exit 0 and the ratchet unchanged or lower, quoted per screen that moved.`

## 6. Housekeeping

- Worktrees wt (db7ac61b), base (a2db600e) and merge (41216b00, as an unreferenced commit 96e3d92a) were under scratchpad/arch-k7. Each was removed and pruned, and so were the archive copies, the build directories and the TMPDIR. git merge-tree and commit-tree added objects only, no refs.
- I never committed in or checked out /home/user/miniaturebeasts. It was on build/ui-kit at e55c9292 when I started and at dfab4d0f when I finished: the K5.1 builder committed there during my run. Its working tree is clean. /home/user/kr (the builder's) was not touched. I created no /tmp/bake-* directory.
