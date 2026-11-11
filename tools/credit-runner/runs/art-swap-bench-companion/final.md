# art-swap-bench-companion: final report

Queue: art-swap-bench-companion. Branch build/art-swap-bench-companion off origin/station-gate (101072b1c). Worktree /home/mb/mb/wt-swapbench. Not pushed.

## What changed
- Art: bench-probe-upright-t1-288x432.png and -t2-288x432.png replaced byte for byte from origin/art/desk:art-jobs/2026-11-10-art-paint-bench-companion/out/ (blob hash of t1 checked equal: 4ac0d48f). Index and provenance rewritten through index-io.mjs (new sha256 and bytes; the old "squeezed" mark dropped, since the files are not re-squeezed). Part t2 and the empty cradle untouched.
- Strings and prose: see the [copy] list. Home's Companion action line and the bench title now say Companion. The old strings are removed, not kept beside the new ones (rule 21).
- Docs, same commit: design/style-guide/station-layouts.md (Probe bench section), bench.json prose.
- Tests that quoted the old strings updated: ui/tests/specs.test.mjs, station/tests/home-props.test.mjs, face/tests/bench.test.mjs.

## [copy] list (placeholders; the copywriter picks the final words)
| where | old | new |
|---|---|---|
| frame.json strings.titles.probe | Probe | Companion |
| frame.json strings.titles.bench | Probe | Companion |
| bench.json strings.title | Probe | Companion |
| bench.json strings.dockFirst | dock the Probe first | dock the Companion first |
| home.json strings.actions.companion | Go to the Probe bench | Go to the Companion |
| state.mjs dock message (broken plate mended) | Docked · the Probe is mended free | Docked · the shield is mended free |
| state.mjs install log line | Probe tier 2 installed | the Probe upgrade is fitted |
| state.mjs install notice | Probe tier 2 · reaches 4 cells, ... | the Probe upgrade is fitted · reaches 4 cells, ... |

Kept as the scheme says: frame step.fit, aim.probe, bench adds/fit/mendOutcome, panel fitUpgrade line.
bench.json prose rewritten to "the Companion, its sensors (the Probe)": level, note, purpose, status untouched, notes.subject, notes.away, stateRule, regions.cradle.note, masters.note. (bench.json `status` and `buildChanges` still name the old Probe section; they are history notes, left as is.)

Not changed (scheme flag for the game designer, after the freeze): the upgrade's "carries 3 pods" and "4 plates" gains.

## Tests (rule 12, MB_CI_FAST=1, once each)
- node --test ui/tests/specs.test.mjs, ui/tests/masters.test.mjs, station/tests/home-props.test.mjs, face/tests/bench.test.mjs: 99 tests, 99 pass.
- Face built in /tmp/mb-face-build-swapbench (wasm and native; face_test 27796 checks, 0 failed). Needed `npm ci --prefix prototypes` in my worktree for the page's p-queue.
- goldens.mjs --check bench on untouched station-gate: matched. After my change: 4 differ, as expected (title, new art).
- goldens.mjs --check home: 35 of 39 FAIL on untouched station-gate already (face-goldens-baseline owns that). My change moves two of them further (home-focus-companion 555e0c35 -> ebd8c93f, home-focus-companion-nosleep 28836555 -> 0a9a1b1f), both already failing. Not re-recorded.

## Goldens
Re-recorded the bench goldens only (bench, bench-panel-upgrade, bench-away, bench-tier2 in prototypes/face/golden/bench). New hashes: b3b98635, eb54839d, 3e604d24, 3a27ad49. No other golden touched. Rebase note: when face-goldens-baseline lands, the two home-focus-companion goldens will need that job's re-record with "Go to the Companion".

## Stills for the art director (1x, face-drawn)
tools/credit-runner/runs/art-swap-bench-companion/stills/bench-t1.png and bench-t2.png (the bench goldens). I looked at t1: the Companion stands in the cradle, cream body and screen, plain top, title Companion.

## Last commit
See `git -C /home/mb/mb/wt-swapbench log -1` on build/art-swap-bench-companion (one commit).
