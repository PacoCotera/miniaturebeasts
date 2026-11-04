**SIGNED.** Every check holds. Three points are for the owner or the next builder:
- The report's "51 goldens" is really 55.
- The cut script isn't covered by any gate job.
- The play-journey failure comes from the machine, not the branch.

Branch `build/glint-dew` at `940bac418` is clean, and nothing in the worktree was touched.

**1. Pictures and index: pass.**
- All seven swapped pictures are byte-identical to `final/` (`cmp`).
- All 1471 index entries match their files.
- The index diff touches only `sha256` and one `signed` line, so ids, sizes and placements are unchanged.
- The fade is untouched: `vocab/station/glint.c` and the 2000 ms / 16-level values in the specs are not in the diff.

**2. Cut script: pass.**
- I rebuilt the cuts with `readinstrument5cuts.py` into a scratch folder, using the layers from `<design folder>`.
- All 73 cuts match the committed files byte for byte. The script is the reason `reading-chip-86x32` and the others rebuild identically.
- There is no `iwq`, `<internal>` or `/home/mb` in the script, `art.mjs`, `specimen.mjs` or `wall.c`.
- The script needs numpy. The VM's default `python3` lacks it, so I used the editorial venv.

**3. No four-point drawers left: pass.**
- I grepped every drawer: station src (`art.mjs`, `pictures.mjs`), `specimen.mjs` and its frozen `specimen3.js`, face src (`wall.c`, `cabinet.c`, `cargo.c`) and the workbench. All now draw the dew gleam.
- Kept as asked: `regions.library.star` and the five-point `star_a` badge.
- One stale line remains: `prototypes/station/README.md:61` still says "a four-point star". It is documentation, not code.

**4. Goldens: pass.**
- I decoded old against new for all 55 retaken PNGs, not a sample.
- Every difference is 1–8 clusters of at most 12×12, or 16×16 / 20×20 for the pods read and wall rows. No other pixels changed.
- The report says 51, but its own list totals 55 and 55 PNGs changed.
- Five golden folders changed: cargo, home, library, pods and vivarium.
- bench, create, habitat, idle, incubator, settings and sitting are untouched.
- The `.json` files changed only in the hashes of those 55.

**5. Full gate: one failure, `play-journey`, and it is the machine, not the branch.**
```
tree 940bac418 …; jobs 12
station-journey              rc=0  236s | journey ok · screenshots in img/
play-journey                 rc=1  328s | play journey FAILED: 12
layer-check                  rc=0  390s | layer check ok
face-guard                   rc=0    0s | guard ok
station-checks               rc=0    1s | layer checks ok
masters                      rc=0    0s | masters: 1471 placed, 0 problems
public-guard                 rc=0    0s | public guard ok
TOTAL 402s; 162 jobs, 1 failed
```
- The 12 failures were all E2 rect-times-dpr lines (1.25 to 2), the same as the builder's.
- `paths.sh` already points the gate at the 1.56.1 install in `/home/mb/pw156`. So the failure happened under 1.56.1 and full-core load, not under the VM's 1.64.
- Run alone with 1.56.1, the branch prints `E2: ok (5 ratios)` and `play journey ok`.
- Run alone with 1.56.1, station-gate's head (`f837b000c`, built in a scratch clone) also passes.
- Station-gate's head fails the same way in the full gate: `play-journey rc=1 469s | play journey FAILED: 9`. The first failure line is `E2: the Station's rect × dpr at 1.25: 1280, wanted 1024`.
- Twelve busy loops alone did not reproduce the failure, so it needs the whole gate's load.
- In that base gate `library-sheet.test.mjs` also failed on a timing budget (`Hiljan all found: 3018 ms`). The branch passed that test.
- In the branch's solo 1.56 run, one performance line read `CPU throttled 4×: 12.48 ms … ≤ 12 ms: over`, while the run still passed. The base's solo run read 5.45 ms. That is a timing budget close to its limit, not a glint matter.
- `prototypes/station/img` was already clean, so no restore was needed.

**6. Public guard: pass.** `public guard ok` and `exit=0`.

**7. Three deliberate breaks, done in the scratch clone and reverted:**
- **One byte changed in `reading-glint-13x13.png`:** the masters check caught it. `place-masters.mjs --check` exits 1 with `FAIL reading-glint-13x13: … does not match its hash`.
- **Old `wall.c` restored (the four-point loop):** the `goldens --check vivarium` job caught it, with 4 failures (`wall-add-needs-find`, `-found-short`, `-found`, `-several`). The reported hashes are exactly the old pre-change ones. `build.sh` and `face_test` still passed (26335 checks, 0 failed), so only the goldens notice.
- **One row of the 16 map in the cut script changed:** no gate job caught it. `place-masters --check` returned rc=0, and the 265 ui, library-pictures and specimen tests passed. Only my rebuild-and-compare caught it, with `DIFF reading-glint-16x16.png`.
- The cut script needs a work folder the gate doesn't have, so the gate never runs it. It was already ungated before this branch. A drift in the script is found only by a rebuild like the one in check 2.

**Cleanup:** my `rm -rf <tmp>` also removed the harness's own task-output folder, so one background-task output could not be read. Nothing else was lost. Some `<tmp>` directories remain; the two this review created are deleted. The older ones are from earlier runs.
