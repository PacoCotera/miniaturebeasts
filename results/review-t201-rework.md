# Review: T-201 rework (drawn looks, world-scale stand sizes) — build/t-201-drawn-looks @ dcd3df7b

Base: station-gate 27660cf9. Everything below was run by me in fresh worktrees of both commits, not taken from the report.

## Verdict: PASS

## Checks (head vs base)
| check | head | base |
|---|---|---|
| station tests | 470 / 470 | 452 / 452 |
| ui tests | 81 / 81 | 81 / 81 |
| face tests | 483 / 506 (23 Create failures) | 483 / 506 (same 23) |
| face_test (native + wasm) | 14690 checks, 0 failed | 14690, 0 failed |
| public guard | exit 0 | exit 0 |
| face guard | ok | ok |
| place-masters | 903 placed, 0 problems | 903 placed, 0 problems |

## Goldens
- Head: home, habitat, idle, vivarium, cargo, library, bench all match.
- Head failures: pods 8, create 16, incubator 14.
- Base failures: pods 8, create 16, incubator 17, home 8, habitat 23.
- The pods, create and incubator failures are present on the base too (the same names; head has three fewer incubator-hatch ones). They are not introduced by this change. The base claim holds: the base's own home and habitat goldens were stale, and this build regenerates them.
- The 23 face Create failures are identical on base and head: not this change's.

## Behaviour
- Hidden-copy probe (600 genomes, 302 traits with a hidden copy): drawn look moved when the hidden copy was removed 0 times.
- Figure heights (S01, composed): adult figure box 57x59 (54 px figure), juvenile 64x66 (40 px) in home / vivarium / idle; habitat 158x163 (150 px) and 177x182 (110 px). All match stand-sizes.json.
- Every picture is the place's own size, the figure bottom-centred, and nothing scaled up past the art.

## Not covered
- The Create / pods / incubator goldens fail on base and head alike, so they say nothing about this change either way.

No fix tickets.
