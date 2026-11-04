# Gate: Peplos genome points and the Loika clan line (build/peplos-genome)

Squash-merged to station-gate 876b7507d.

Branch build/peplos-genome (dda92a93b, 8ec33ddf0) over origin/station-gate.

**SIGNED.** Nothing blocks the merge, but five small things are listed under "Notes for the builder".

I changed nothing in the repo (HEAD is still `8ec33ddf0`, tree clean). Scratch under `(scratch)` and my two `(scratch)` log directories are removed.

## 1. The six points
- **Flap-marking.** The Peplos typical is `[spots, plain]`, as ruled. A framework test asserts "one time in four". The builder measured 25.4% over 4000 crosses. I did not re-measure the rate myself.
- **Antenna form.** The values are thread, club and curl, and feather is retired. `readGenome` maps feather to curl and is called in `normalize` for pods and for mibis. It is also called in `openCrates` for returned pods. A test covers it, and break 1 below shows the test bites.
- **`flapRest: "sail"`.** It is in the rig's wings branch and in `plans.mjs`, which keeps three values. E9b is in `envelope.mjs`, with a 1.3 target and a 1.6 cap. The test checks height, one connected silhouette and a clear near eye at 8 yaws. Flat is unchanged for the big bird (C09, `S09`) and still builds for the sleep pose.
- **`anatomy.dew-tongue`.** It is a locked C12 branch locus. It has no chapter and no trait, and it is absent from every other frame.
- **Surface texture.** The Peplos is now `smooth`.

## 2. The `reset` field
It is sound. It is applied inside the seeded-roll branch, so the roll is still taken, and I diffed the S12 locus copies before against after. Only the three intended loci changed: surface-texture ridged→smooth, antenna-form feather→curl, and dew-tongue added.

I built a hash list of every species (frame version, type-specimen digest, and a digest of 40 seeded individuals) from `origin/station-gate` and from the branch. The only difference is S12:
```
< S12 fv 4 type S12-94f298de samples cd7ae44636ad
> S12 fv 5 type S12-5a20bd9f samples 9d8fee03c1ea
```
S01–S11 and S13–S16 are identical. `build-frames.mjs --check` prints `ok`.

Two weaknesses, not blocking: `reset` has only a one-line inline comment, with no README or spec note. It also has no direct test. The test covers the result (smooth), and the frames check covers "nothing else moves".

## 3. Versions
- **Catalogue and frame versions.** The catalogue is 11. Peplos is `frameVersion` 5 and global `FRAME_VERSION` is still 4. Other species' frame files changed only in their catalogue pin and absent-locus list.
- **Old saves.** I put a real catalogue-10 Peplos genome into a fresh state as a tray pod, a mibi, a returned pod and an incubating bud, then ran `normalize`. It does not crash.
  - The pod's and mibi's antenna read as curl.
  - The bud and the returned pod keep feather; only pods and mibis are mapped on load.
  - An old Peplos genome still fails `checkGenome` ("surface-texture locked copies differ"; "dew-tongue missing"), and `buildIndividual` throws. `art.builtOf` catches that throw, and cross and incubate refuse through `checkGenome` and `genomeProblems`. So an old Peplos is refused cleanly, not upgraded.
  - This is low risk because the Companion carries only S01, S02 and S03 (`SP_INDEX`). A Peplos can only come from dev seeding.

## 4. Goldens
Only `library-l1-dither`, `-mid` and `-roomkey` changed, plus `library.json` hashes. I decoded old against new:

| Golden | Changed pixels | Box |
| --- | --- | --- |
| dither | 771 | (893,240)–(972,340) |
| mid | 1562 | (891,239)–(972,340) |
| roomkey | 1562 | (891,239)–(972,340) |

Every other pixel is identical. The box is about 80×100 px, the size the builder gave for the Peplos tile. I did not map it to the tile independently. The five pod cards are pure renames (100% similarity). Nothing in the repo references the old `pattern-plain` names.

## 5. Loika line
"a leaf crest and a flat face; charcoal" is in `roster.mjs`, `frames/species-S01.json` and `taxonomy.md`. The remaining "snout" mentions are the rig brief and old grow manifests (history).

`node prototypes/face/tools/make-metrics-vectors.mjs --check` printed `metrics vectors current: 23178 cases`. I used `--check` instead of a rewrite because I may not write to the repo, and `dist/metrics.json` exists so it did not skip.

## 6. Full gate
The first run, with the default environment, failed with `TOTAL 142s; 162 jobs, 16 failed`. All 16 were `browserType.launch: Executable doesn't exist at (local)`. That is an environment problem from my session's HOME, not a branch fault. I re-ran with `PLAYWRIGHT_BROWSERS_PATH=(local)` added and got exit 0. Verbatim lines from that run:
```
play-journey                 rc=0  329s | play journey ok
layer-check                  rc=0  407s | layer check ok
face-guard                   rc=0    0s | guard ok
station-checks               rc=0    1s | layer checks ok
masters                      rc=0    0s | masters: 1471 placed, 0 problems
public-guard                 rc=0    0s | public guard ok
vivarium: ok: 5 log(s), 61 tests ran, 0 skipped by the file itself
TOTAL 544s; 162 jobs, 0 failed; logs (scratch)
```
All 12 `goldens:*` jobs read "goldens match" (bench, create, cargo, idle, incubator, sitting, home, settings, habitat, pods, library, vivarium). No golden failed under load, so none needed a solo re-run. I ran `git checkout -- prototypes/station/img` afterwards, and the tree is clean.

## 7. Public guard
`public guard ok`, `exit=0`.

## 8. Deliberate breaks
I ran these on a scratch copy of the workbench in a scratch folder, so no revert in the repo was needed. The framework test baseline there was 33 pass, 0 fail.

| Break | Result | Caught by |
| --- | --- | --- |
| Remove the feather→curl map (`readGenome = g => g`) | caught | `framework.test.mjs` test 30, "antenna form is thread, club or curl… an old feather copy reads as curl". Pass fell to 32. |
| `SAIL_HEIGHT` 1.3→1.8, cap left at 1.6 | not caught, harmless | The rig clamps to `Math.min(SAIL_HEIGHT, SAIL_HEIGHT_CAP)`, so the drawn sail stays at 1.6. |
| `SAIL_HEIGHT` and cap both 1.8 | caught | `framework.test.mjs` test 32, "flapRest has three values… E9b holds for the sail" (the 1.6 height check). |
| Loika (S01) frame carries the dew tongue | caught | Test 4 ("every frame carries only trunk loci its plan owns plus its clan's branch") and test 31 ("S01 has no tongue"). Pass 31, fail 2. |
| Loika gets the tongue in `species.mjs` source (C01 treated as a tongue clan) | not caught by the gate | The tests read committed frames, so all 33 passed. `build-frames.mjs --check` does catch it (`species-S01.json is stale`), but I found no `frames:check` wired into the gate script. |

## Notes for the builder
1. Document `reset` and give it a direct test.
2. The feather→curl map covers pods and mibis on load. A saved incubating bud and a returned pod keep feather until hatch or re-seed. This has no practical effect while Peplos is not in `SP_INDEX`.
3. Consider adding `frames:check` to the gate, so a source-level change that moves a frame is caught there.
4. The Antennae VOCAB looks in `species.mjs` ("long feathers") are still stale, as the builder already said. It stays unreachable because the form is locked in every clan.
5. Old Peplos genomes are refused rather than migrated. If Peplos ever enters `SP_INDEX`, a real migration of surface texture and the dew tongue will be needed.
