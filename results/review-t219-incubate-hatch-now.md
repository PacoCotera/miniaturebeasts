# Review: T-219 Incubate and Hatch now — build/t-219-incubate-hatch-now @ 7d3a9505

Base: station-gate 273881ca (three commits). Authority: results/incubate-and-hatch-now-game-text.md, plus the game designer's later rulings (Home notice "{a} {species} pod, ready to incubate"; spendText's form stays). Everything below I ran in fresh worktrees of head and base, with wasm and native face built in each.

## Verdict: FAIL on one item (T-20261016-221); the build itself is sound

The last commit breaks the public guard. `node .github/public-guard/guard.mjs --base 273881ca` exits 1 with 2 hits, both on commit 7d3a9505: `commit-trailer` (Co-Authored-By) and `commit-trailer` (Claude-Session). That commit is authored `Claude <noreply@anthropic.com>`; WORKER.md requires `Paco Cotera <paco@cotera.org>` and no trailers. The base passes this guard (exit 0), and the other two commits (0dd8f9a5, cacac215) are clean. Fix ticket T-221 asks for the same tree under clean commits, without a force push; the lead decides how. Nothing else needs to change; after that, this is a PASS.

## Checks (head vs base)
| check | head | base |
|---|---|---|
| station tests | 477 / 477 | 470 / 470 |
| ui tests | 81 / 81 | 81 / 81 |
| (station + ui) | 558 | |
| face tests | 484 / 506 (22 failures) | 483 / 506 (23 failures) |
| face_test | builds and runs in build.sh (all passed) | same |
| face guard | ok | ok |
| public guard | **exit 1, 2 hits (commit 7d3a9505)** | exit 0 |
| place-masters | 903 placed, 0 problems | 903 placed, 0 problems |
| goldens | pods 8 fail; create, incubator, home, habitat, idle, vivarium, cargo, library, bench match | pods 8, create 16, incubator 14 fail |

- The face failures: the 22 on head are the base's 23 minus #364 ("the committed metrics vectors are what the table gives today"), which now passes. The names match one for one.
- The pods goldens fail on both (the environment's Chromium drift; not this change's).

## Regenerated files are tool output, not hand edits
- `tests/vectors/metrics.json`: `node prototypes/face/tools/make-metrics-vectors.mjs --check` on head reports "metrics vectors current: 12297 cases", so the committed file is byte for byte what the tool writes from the native build's `dist/metrics.json`. The same check fails on station-gate (the file there is stale), which is the drift the builder named: head carries it forward as tool output.
- The Create and Incubator goldens: on head all of create and incubator match what my own Chromium renders. On the base 16 and 14 do not. The committed PNGs therefore agree with the code and the fonts, not with a hand edit.
- `journey-create.json` and `journey-incubator.json`: `station/tools/journey.mjs` on head reports no "differs from the golden" lines; on the base it reports six. The journey's in-page FAIL lines about Data costs (10 on head, 13 on base) are in the environment and hit the same steps either way.

## The behaviour
- `instantGrow` checks the bay first (no free bay: refuses with Open's words "No bay free · return a mibi to the wild first", spends nothing), then Essence (short: "Hatch now · {short}", spends nothing), then pays, ends the wait and hatches through the same `hatchBud` Open uses. One log line, "Hatched {name} now · {species} · juvenile · bay {n} · {spend}", no separate "Opened" line.
- **A refused Hatch never spends**: tests in rules-fixes.test.mjs hold both paths. Short Essence: Essence stays 0, no mibi added, bud and log unchanged. No bay: with every bay full while a bud grows, Essence, mibis, log, the field guide and the bud are all unchanged.
- Cases 1 to 7 of the game text are all covered: founder and bred bud hatch (read chapters as Open makes them, field guide equal to Open's twin), Open after a natural finish, the refusals, the free preset, and the intent path plays the leaves, then the hatch (a cut under reduced motion).
- Player strings follow the table: Incubate, Incubating, Hatch now, "Incubate · {block}", "Hatch now · {short}", "Incubated … founder", "incubate the {species} pod", "a pod incubates with …", and the Home notice "{a} {species} pod, ready to incubate". What is left of the old words is in comments and design notes in the specs (the doc sweep is a separate pass, as the text says).

## Not covered
- I did not look at the rendered Create and Incubator pictures for the art or width of "Incubate"; the width check is the face metrics test (passing on head).
- The doc sweep is out of scope, as the game text says.
