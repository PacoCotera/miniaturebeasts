# T-274 and T-275 code review (reviewer, Fri Oct 23 07:08 Mexico City), head 9eb9d101

**Verdict: PASS.** No blocking items.

## Diff reading
- Commits 4e4057b1 and 9eb9d101: author and committer both "Paco Cotera <paco@cotera.org>", no trailers, no model/tool/session names. 9eb9d101 touches 9 files; 4e4057b1 only prototypes/station/tools/journey.mjs.
- F1 (journey.mjs:71): after the loop `if (same < 3) fail(\`${name}: the words did not settle in 6 s of held frames\`)`, inside `!was`. As ruled.
- F2 (journey.mjs:71): `where()` = JSON.stringify([ui().screen, props().state ?? null]), read before hold() and again after the steps; differing fails with "the settle carried the shot from ${at} to ${now}". As ruled. ui/props are defined at lines 104/109, before the first shot (line 131), so no TDZ.
- F3 (journey.mjs:68): textsOf keys `r.region + "=" + r.text + "@" + r.px`. As ruled.
- F4 (journey.mjs:61): keys computed once per record (`map` to [key, r], sort, `map` back), comparator `a < b ? -1 : a > b ? 1 : 0`. As ruled. Both type and regions use it.
- frameShot/shot pass `name` to settled. Nothing else in the file changed.
- T-275 page.c: `v_cap_in(ry + H1, 24, 20)`, `+ 1` and the comment line removed. As ruled. No new helper, no private duplicate of a v_* helper or kit component.
- Goldens: exactly four PNGs and four pods.json hashes changed (chapter page 62f50609->4bccd9e1, unread b771eac6->dd8663d6, a doing 174b35b7->2c008f0a, sealed fb08c43b->699813fb). I diffed each against d2dbfd99 pixel by pixel: 283, 283, 505 and 525 pixels change, all inside x 417-518, y 195-209 (the heading word's rows), none outside. No other golden file changed, and `goldens.mjs --check` matches for all ten sets.
- pods-words.json: exactly seven `hash` values changed, all in "chapter" states, no other line touched. The pods-words test passes with them.
- New test (pods-page.test.mjs:107-115): runs over every species and chapter, takes the page art (emblem) rect and the page type rect, asserts word top + 7 == emblem top + floor((24-14)/2), and asserts both a one-row and two-row page were seen. It ran (`ok 761`, not skipped) and passes. It would fail on the old drawing (cap top at +6).

## Non-blocking notes
1. pods-page.test.mjs:109: the `rows` value (cells.length > 4) is used only in the message and the seen-set. The assertion itself does not depend on it, so a wrong row count would go unnoticed. The test also uses fixed 7 and 14 instead of calling the face's v_cap_in; independent, which is fine, but it breaks if the 20 px label box offset changes.
2. The journey rewrites about 36 tracked screenshots under prototypes/station/img on this machine (the lead's rule said the next run rewrites the Pods ones). I did not compare them to the committed ones; the committed img files at 9eb9d101 were not part of the diff (no PNG under station/img in either commit). The six heading screenshots named in the ruling are therefore not refreshed in the repository; decision for the lead whether T-275 should have carried them.
3. Across my two journey runs, 3 PNGs (page-home, page-hatch, page-meet) and the painted-layer rects of page-hatch and page-meet differ by 1 px (the idle creature animation outside a hold). The type log is not affected, but "byte-identical screenshots" does not hold; only the type log is the ticket's claim. Also check.log.frameMs differs, as expected (timing).
4. The full node --test set takes about 14 minutes here (vivarium 366 s, idle 146 s, home 57 s); a single command exceeds 10 minutes, so I ran it in groups.

## Checks (verbatim)
- `prototypes/face/build.sh all` (exit=0): `face_test: 14760 checks, 0 failed`; `layout: 386 cases, 0 differ`; `native build 45.0 s   LVGL 9.6.0 1024x600 hash=47e09df8 dirty=0 keys=1 last=17`
- node --test, run in groups (exit 0 each, 0 failed):
  - roadmap, ui, exploration, caddy, workbench, genome-stamp: `# tests 435 / # pass 434 / # fail 0 / # cancelled 0 / # skipped 1` (the skip is "T5: C8 ... # SKIP C8 has not landed on main", not from these commits)
  - station: `# tests 571 / # pass 571 / # fail 0 / # cancelled 0 / # skipped 0`
  - face, 27 files each run alone: every file `# fail 0` (passes: anim 17, bake 4, bench 18, bridge 30, cargo 53, create 42, face 5, focus 4, guard 7, habitat 33, home 59, idle 40, incubator 16, layers 55, layout 6, library 6, metrics 3, notbuilt 2, panel 23, plates 5, pods-keys 7, pods-page 6, pods-words 30, prim-rrect 10, ring 10, vivarium 56, words 32)
- Station journey, two runs: both `journey ok · screenshots in img/`, exit 0. Type logs: 44 shots in each, 0 shots differ, whole type-log array identical (JSON compare).
- `prototypes/play/tools/journey.mjs`: `play journey ok` (exit 0)
- `face/tools/guard.mjs`: `guard: 75 removed paths, 314 files read, 0 failures` / `guard ok`
- `face/tools/layer-check.mjs`: `layer check ok`
- `face/tools/goldens.mjs --check`: `pods: goldens match`, home, cargo, create, incubator, habitat, vivarium, library, bench, `idle: goldens match` (exit 0)
- `station/tools/checks.mjs`: `ink: 138 regions compared in 25 frames` / `layer checks ok` (exit 0). Output diff against the stored base output in the scratchpad (base-checks.txt, 95 lines): empty.
- `ui/tools/place-masters.mjs --check`: `masters: 1006 placed, 0 problems`
- `.github/public-guard/guard.mjs --base origin/station-gate`: `public guard ok`, `exit=0`

## Cleanup
Worktree rev-wt3, rev-build3 and old rev-build leftovers removed; /tmp/bake-c-* removed; no jobs running. (The /tmp/bake-a-* and bake-b-* directories are not mine and were left.)
