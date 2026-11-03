# Gate: Realm R5, the generator's four biomes (merged to station-gate 30347003e)


Verdict: SIGN. No fix to the generator was needed; one commit of tests added (5b16595a3). Nothing here changes what a place looks like.

## Findings
1. Determinism: holds. Same seeds in two separate processes give the same sha256 over every world (3000 seeds x 4 biomes, digest 1e9c19b12d514d75 twice) and over every place layout (44699 places, 40 seeds x 4 biomes, digest ff1a8452a0742dab twice). No Math.random, clock or storage in the diff.
2. Bounded re-rolls: every new loop has a cap (lakes 400, pools 400, pool growth ends when no cell is left, overhang 400, stone rolls 4, backstops 120, extra stairs end when no edge is left, world 8 attempts then one fallback). The only open end is genWorld4 throwing RangeError when even the fallback fails. Sweep: 20000 seeds per biome, 80000 worlds, 0 throws. Worst attempt: mixed 3, woods 3, fells 2, marsh 8 (the fallback). Marsh used the fallback on 2 of 20000 seeds (34579798 and 1654719049); both still hold 261 and 262 walkable cells and all places draw. Slowest single world 60.9 ms (marsh).
3. Old saves: same realm. A save keeps its generator (gens 1 to 3 never read the biome; NEW_GEN stays 3, GENS gains 4 only). Proved two ways. (a) Direct comparison against the station-gate source, gens 1 to 3, 64 seeds: every world, life, and 23754 places: 0 differences. (b) The vectors file for gens 1 to 3 is untouched in the diff (only gen 4 is added); the existing test checked only 6 seeds a generator, so the new test checks all 16, every place and life, and that a biome asked of an older generator changes nothing and adds no field.
4. Deliberate breaks (each reverted, tree clean):
   - world re-roll cap 8 to 2: fails (marsh land-share/no-fallback test).
   - river seed derivation changed: 20 tests fail (gen 4 vectors, gens 1 to 3 vectors, atlas, goldens).
   - Fells run-of-3 rule loosened to 4: 4 tests fail (vectors, rock count, stair gate, run test).
   - rock-place overhang count 2 to 3 (touches gen 2 and 3 places): 10 tests fail, incl. the new old-save test.
5. Timing, ms, 40 seeds, median of 3, quiet machine (a loaded run read 2 to 3 times higher on both sides alike):
   | | world | life | 286.7 places | realm total |
   | station-gate gen 3 | 1.17 | 0.12 | 32.49 | 33.79 |
   | branch gen 3 | 1.20 | 0.12 | 32.55 | 33.87 |
   | branch gen 4 mixed | 1.20 | 0.12 | 32.51 | 33.83 |
   | branch woods | 0.79 | 0.15 | 27.90 | 28.84 |
   | branch fells | 0.98 | 0.12 | 35.32 | 36.41 |
   | branch marsh | 2.84 | 0.13 | 30.51 | 33.48 |
   Old generators are unchanged within noise. Slowest single place 11.8 ms.
6. Exploration: on 6 seeds x 4 biomes (new test) and 60 seeds x 4 biomes (sweep: 67030 places, 3700 stairs, 1850 ramp edges, 432070 features): every spawn, every stair entry and every feature is reachable, every ramp edge has a stair on both places, every walkable world cell is reachable by passable steps. 0 failures. Smallest reachable floor of a place: 148 tiles of 896 (woods, seed 2408770 cell 37); gen 3 smallest is 288. Reachable, so not a fail; see carried.

## Fixes
None to the generator. Added tests (5b16595a3, prototypes/exploration/tests/world-biomes.test.mjs): old saves on all 16 vector seeds, bounded re-rolls (400 seeds a biome plus the two known marsh fallback seeds), reach and stairs of every place in every biome. world-biomes tests 27/27.

## Checks
- face build all: face_test 25889 checks, 0 failed; layout 737 cases, 0 differ. exit 0
- node suites (full list): pass 2241, fail 0, skipped 1. exit 0
- station journey: ok. exit 0. play journey: ok (E2 5 ratios). exit 0
- face guard: 0 failures. exit 0. layer check: ok. exit 0. goldens --check: match. exit 0
- station checks: ok. exit 0. place masters --check: 1471 placed, 0 problems. exit 0
- public guard: `public guard ok`, exit=0. Merge into origin/station-gate: clean.
- tools/gate/full-parallel.sh does not exist in the worktree; the template list was run in order. Station img restored, no generated pngs left.

## Carried to later tickets
- The page builds a world as genWorld(seed, gen) with no biome, so a gen 4 save is always Mixed today; the biome needs a save field and a way to choose it before Woods, Fells or Marsh reach a player. Fells art in index.html keys on G.biome.
- index.html also changes the full-map water corners for every generation (quarter-disc cuts): art on old saves' map, not their places; the art director has signed it.
- Marsh fallback (about 1 in 10000 seeds) and genWorld4's final throw: the page should catch it and re-roll the realm seed rather than crash.
- Woods has places with a small reachable floor (148 tiles); add a floor rule if the art director wants one.
