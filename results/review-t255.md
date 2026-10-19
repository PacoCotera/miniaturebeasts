# Review: Home H3, the console's pictures (T-20261019-255) — build/t-255-home-console-pictures @ f271ea88

Two commits on station-gate 89525b55 (2d330bf7 the pictures, f271ea88 the journey golden, metrics vectors and captures), both by Paco Cotera <paco@cotera.org>, no trailers or model/session names. I built wasm and native from the head in a fresh worktree and ran the full set.

## Verdict: PASS
No blocking finding. The gates are in (UI/UX §14, art director); the fix round named by the lead (the half-progress incubator golden, the style-guide line, the docked Companion's name fixture, b150d142) stands, and I add one small ticket: T-20261019-257.

## Checks (head f271ea88 vs station-gate 89525b55)
| check | head |
|---|---|
| station tests | 555 / 555 |
| ui tests | 80 / 80 |
| face tests | 569 / 569, 0 skipped |
| all prototype tests together | **1560: 1559 pass, 0 fail, 1 skipped** (the C8 skip, on the base) |
| face_test (the C vectors, from build.sh) | 14,699 checks, 0 failed |
| public guard (vs station-gate) / face guard | exit 0 / ok |
| place-masters | **1006 placed** (1001 + the five), 0 problems |
| metrics vectors `--check` | current (12,243 cases) |
| all ten golden sets | match |
| Station journey / `checks.mjs` / `layer-check.mjs` | exit 0, 0 FAIL |
| play journey | exit 0 |

## The lead's two questions
1. **Test count (1216 vs 1553).** Not a real loss. The whole set is **1560 tests, 1559 pass** at this head: H2's 1553 plus the seven tests this ticket adds (the face's 562 → 569; the station and ui counts are unchanged at 555 and 80). The builder's 1216 comes from `runtests.sh`, a script I do not have in the public tree, which evidently runs a subset; the 343 it leaves out are directories such as exploration (10 test files), caddy, genome-stamp and workbench, none touched by this ticket. All 82 test files run green together.
2. **freeze-check.** There is nothing to skip: `face/tools/freeze-check.mjs` was retired and is listed in `prototypes/face/removed.json` (line 17), with the lvgl-switch plan naming `freeze.test.mjs` and the import guard in its place. The import guard is `face/tools/guard.mjs`, which I ran (75 removed paths, 306 files read, 0 failures), and `freeze.test.mjs` (the exploration dock-freeze test) is among the 82 files that pass. The full-tree public guard shows 13 hits, the same figure as main.

## Against the spec
- **The five signed masters are unchanged.** I compared each in `masters/home/` with the art director's file on work-queue (`results/T-20261019-home/art/`) by sha256: all five identical; the index carries each hash and size, and a test re-hashes the files. The ART family entry (companion-upright-*, berth-*) is right by the layer check (no off-palette pixels); the art director confirms the family.
- **Pods.** Six slots 24 × 32, 2 apart, 2 rows of 3 (76 × 66, 8 in, centred): the pod's layered rack pod, a hairline outline when empty, the unidentified pod the sealed generic shell (`rackpod:unknown`), the glint 12 × 12 at (12, 0) over the pod's top-right corner (ruled §14.1).
- **Incubator.** The painted capsule at 56 × 86 in its layers by state (interior and shell always; the relit pod while growing or ready; the glass while growing; the door while not growing); the lit bar a progress-clipped window of the layer from its first pixel, whole when ready (§14.2); nothing red, no minutes (asserted).
- **Companion.** The upright picture docked or away at 28 × 46; docked, the Probe's plates 12 × 24, 4 apart from (12, 64), whole then lost; away, none.
- **Bay.** Three berths 2 apart in line 1's row, the crates first, then shut, the portrait berth last (82 wide, 102 with the portrait), asserted for six scenes including five crates (three berths) and a portrait alone; line 1 stays clear of the berths.
- **Budgets (§7).** At most 400 objects, props under 32 KiB and the picture table well inside 1,024, printed and asserted for the full, growing-and-away and empty scenes. Dirty area, measured on the builder's scene: a crate arrives 15,271 px, the bud grows 30,302, the Companion goes away 32,874, the ring over a station up to **37,946**, the bar advancing 170: all far under 153,600.
- **No loosening.** The test edits are additions plus the stations' pictures added to the harness's picture handles; no existing assertion is weakened.

## The fix ticket
- **T-20261019-257.** home.json still carries three notes reading "OPEN QUESTION for UI/UX … the one value to change" (glint, bar, plates), and a face test message says "its place is an open question". §14 settled all three; the spec files are the face's contract and should not read as unsettled. Wording only: no value or golden changes.

## Observations (not blocking)
- A Bay with more than three crates shows three crate berths and "n crates in" in line 1 (asserted for five): as the spec's three berths.
- The half-progress incubator golden (UI/UX §14, in the fix round) is the one place the bar's clip is not seen in a golden; the tests assert the window's width from the bud's progress, so it holds today.
