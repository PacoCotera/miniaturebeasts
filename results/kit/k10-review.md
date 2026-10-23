# K10 code review (reviewer, 2026-10-23 12:37 Mexico City), head 8310599b

Verdict: **FAIL (one blocking item, trivial)**. Outputs are byte-identical on everything run; the one defect is a local `fill` the builder neither replaced nor parked.

## Blocking
1. prototypes/station/src/views/home-props.mjs:175 (in `homeBuild`): a local `fill = (t, o) => t.replace(/\{(\w+)\}/g, ...)` is still defined in the `const { st, sv, settings } = m, now = ..., docked = !!m.docked, fill = ...` line. It shadows the `fill` imported at line 17, so it is a surviving duplicate (kit rule 5; ticket "listed duplicates gone or parked with reasons"; the builder report does not park it). Exact fix: delete `, fill = (t, o) => t.replace(/\{(\w+)\}/g, (_, k) => (k in o ? o[k] : "{" + k + "}"))` from that line. Output stays identical: every template reaching it (home.json strings: stations, bay, readout) holds only `{word}` tokens (scan of all spec JSON found no non-word token outside the cargo/create/habitat/panel/incubator/bench templates), and the import is the same lookup with `k in values`.

## Adversarial read (all hold)
- req/slot/ph: key order kind,id,master,size,until / kind,id,size,hollow,until equal to the old objects; `until2 || until` equals old `until || default`; no call passes slot/ph as a callback (no stray third argument); namer/vivarium/habitat plate requests via `plateDevice` equal the old slot objects (fresh `[w,h]` array, same order).
- fill: single regex `\{([^{}]+)\}` with `k in values`. Old forms were `\w+` (cargo, goal-words, habitat, home, idle, namer, specimen, vivarium) and `[^}]+` (create, incubator, panel). Differences only arise for a non-word token that is a key in values, or a nested `{`. Scanned every JSON string with braces: the non-word tokens used by fill are `{n in words}` (bench, cargo, create, habitat, panel; one occurrence per string) and `{a/an}` (incubator, `[^}]+` form already); no nested braces in any station template. pods-props old fill was `o[k]` (undefined for an absent key, would print "undefined"); the new one keeps `{k}`; all pods callers (needMore, subjectIs, needMoreFrom, openChapter, backTo) pass every key their template holds, so no change.
- cargo `Sg.mended.replace("{n in words}", ...)` and habitat `Sg.partners.replace("{n in words}", "{n}")` + fill: each template has one `{n in words}` and nothing else, so the single fill gives the same string.
- "Unreachable" claims: bench shield max 4 (state.mjs:20 TIER 3/4; `shield+1` only when shield < smax, so at most 4); create unread chapters at most 8 (16 species frames in prototypes/workbench/frames, max 8 chapters; old table was 0-12 anyway, so only 13+ differed); home count n only when `1 <= n <= max` and every `max` in state.mjs is 3 or 6 (old COUNT 0..6, `count(1)` = "a"); habitat `Math.min(len, 11)` against a 0-11 table = same words.
- Plural swaps: cargo wait/arrival/newPods/open, create surprise (`length ? plural(...) : ...` keeps 0 on the shut branch), home line1, panel dockCards: eager evaluation of both branches is pure; same results.
- Parked sites really change output if replaced: cargo SPELL (6 then "many") and panel SPELL (12 then "many") against `spell` giving digits for uncapped counts; bench `{a|b}` fill; bench plate (different until); create ph (undefined fields, 4-arg signature); home slot (id `master:WxH`, own until); panel req (skips existing ids). Confirmed from the source lines; none could be replaced without a change.
- Unit test (9 tests, pass): meaningful for tables, key order and until override; thin on `fill` against the old forms (no test for a template with repeated or unknown names beyond two cases) and no test of the `0`/`undefined` argument to `count`/`spell`. Non-blocking.
- Commit: one commit on b0fc6c77, author and committer Paco Cotera <paco@cotera.org>, no trailers, no model/tool/session names. Message count "12 local fill copies" is off by one (11 replaced, home's inner one left).

## Flake table (Station journey, `node prototypes/station/tools/journey.mjs`, one at a time, same machine)
| Commit | Run | Result |
|---|---|---|
| 8310599b | 1 | journey ok (exit 0) |
| 8310599b | 2 | journey ok |
| 8310599b | 3 | journey ok |
| 8310599b | 4 | journey ok |
| 8310599b | 5 | journey ok |
| b0fc6c77 | 1 | journey ok |
| b0fc6c77 | 2 | journey ok |
| b0fc6c77 | 3 | journey ok |
| b0fc6c77 | 4 | journey ok |
| b0fc6c77 | 5 | journey ok |
Finding: 0 of 5 fail at 8310599b, 0 of 5 at the base. I could not reproduce "journey-bench.json: step probe-bench differs from the golden at action 2" in 10 runs, so I cannot say whether it predates K10; K10 changes nothing on the bench path except SPELL/ph/req (verified identical), and the failure was a key press landing on the wrong focus (plates to slot), which reads as a timing race in the journey, not a props change. Rate on this machine: below roughly 1 in 5 on either side. Type log (type, table, pictures, objects, dropped, refused) is identical in 44 of 44 shots across base runs 1-3 and K10 runs 2-3, and every other check field (placeholder count, log.regions, frameMs, t taken out) is identical too.

## Checks at 8310599b (verbatim)
- build.sh all (exit 0): `layout: 386 cases, 0 differ` / `face_test: 14785 checks, 0 failed` / `native build 53.2 s   LVGL 9.6.0 1024x600 hash=47e09df8 dirty=0 keys=1 last=17`
- node --test group A (roadmap, ui, station, exploration, caddy), exit 0: `# tests 980` `# pass 979` `# fail 0` `# skipped 1`
- node --test group B (face, workbench framework, genome-stamp bins), exit 0: `# tests 614` `# pass 614` `# fail 0` (total 1594, 1593 pass, 0 fail, 1 skip; words-requests.test.mjs alone: `# tests 9` `# pass 9` `# fail 0`)
- play journey: `play journey ok` (exit=0; "D: main-thread time a frame, CPU throttled 4x: 27.02 ms over 111 frames against <= 12 ms: over" is the existing informational line)
- guard.mjs: `guard: 75 removed paths, 317 files read, 0 failures` / `guard ok`
- layer-check.mjs: `layer check ok`
- goldens.mjs --check: `idle: goldens match`
- station checks.mjs: `layer checks ok` (exit 0)
- place-masters --check: `masters: 1006 placed, 0 problems`
- public guard: `public guard ok` / exit=0

## Non-blocking notes
- pods-props.mjs:27 `WORDS`/`inWords` (12 then "many") and pods-props.mjs:178 `plate-device-408x{h}` request left alone, as the builder said; both are in the "never a local number table / request helper" class and need a ruling or a follow-up. library-props.mjs (fill, req, slot) is out of scope per ticket.
- idle-props.mjs:15 is a three-way count (1, 2, 3+) not a one/many plural; left alone correctly.
- Cleanup done: both worktrees and both build dirs removed; deleted /tmp/bake-b-DNLlYg, /tmp/bake-c-6dJfyO and /tmp/bake-a-zcPn93 (mine). A backgrounded tool job ran the last five checks, finished, none left running.
