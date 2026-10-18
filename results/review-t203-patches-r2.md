# Review: T-203 delta, the patches-r2 swap — build/t-203b-colour-ramps @ 4017aeb3

The delta is f7e6a4b0 (my earlier PASS, results/review-t203-colour-ramps.md) plus one commit, 4017aeb3. I reviewed only that delta; everything else is unchanged from the earlier review. I ran it in a fresh worktree with wasm and native face built.

## Verdict: PASS

## The delta
- `git diff e73bb1fb 4017aeb3` is empty: the same tree as the old branch's commit, as the lead said.
- The commit is by Paco Cotera <paco@cotera.org>; no trailers or "generated with" in any message since f7e6a4b0.
- Files changed apart from goldens: only `ui/assets/stands/S01-adult-304x312-patches.png`, `S01-juvenile-304x312-patches.png` and `stands/index.json` (4 lines). No code, no coat base, no other layer.
- The signed layers: I took the eleven `*-patches-304x312.png` of work-queue f6bd657f (`results/T-20261016-203/patches-r2/`). The two committed stand patches are pixel-identical (RGBA, max difference 0) to the r2 anchor patches, adult and juvenile. They are not byte-identical files, since make-stand-layers.py re-saves through PIL; the pixels are the same. The other nine r2 files are the motion poses, which the stand does not use (only the anchor pose is cut), so they are not in the tree.
- All 18 files in `index.json` match their sha256 and are in the folder.

## Checks on 4017aeb3
| check | result |
|---|---|
| station tests | 478 / 478 |
| ui tests | 81 / 81 |
| face tests | 483 / 506, 23 failures; the same 23 names as f7e6a4b0 (same numbers and names on both) |
| public guard against origin/station-gate (fcf0a96f) | exit 0, "public guard ok" |
| face guard | ok |
| place-masters | 903 placed, 0 problems |
| goldens | home, habitat, idle, vivarium, cargo, library, bench match; pods 8, create 16, incubator 14 fail as on f7e6a4b0 |

One difference from the builder's report: they give face as 480/506 with "the same 22 Create failures". That is 26 failures, and not what I get. I get 483/506 on both f7e6a4b0 and 4017aeb3, 23 failures with identical names, so the delta adds none. I believe their environment differs; it does not change the verdict.

## Goldens regenerated
The diff touches 80 golden PNGs: habitat 30, home 24, vivarium 13, idle 9 and the three incubator hatch frames (1100, 1500, 2000) plus incubator.json. Those are the states that show a Loika, which is what a changed patch layer should move. The home, habitat, idle and vivarium goldens match what the code draws in my environment, so they are the stand's output. The three incubator hatch frames fall under the incubator set that fails on the base for the environment's reasons, so they cannot be checked against my rendering.

## Not covered
- Whether the repainted patches look right: that is the art director's gate (they signed r2).
- The generator itself (`make-stand-layers.py`) was not re-run: it needs the masters-pods floor keys, which this repo does not have. I checked its output files instead.

No fix tickets.
