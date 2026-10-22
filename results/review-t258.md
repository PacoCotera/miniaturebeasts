# Review: Home H4, the Library specimen (T-20261019-258) — build/t-258-home-library-specimen, c2debf73 and the fix round 1d62807c

Base station-gate cec6d6a1. c2debf73 is one commit; 1d62807c one on top of it; both by Paco Cotera <paco@cotera.org>, no trailers or model/session names. I built wasm and native from c2debf73 in a fresh worktree and ran the full set with the Chromium oracle enabled (PW_DIR set), then ran the set again at 1d62807c (no C changed in the delta, so the same face build).

## Verdict: PASS (c2debf73 and 1d62807c)
No blocking finding. One small follow-up, T-20261022-260 (save the Library's seen-state when it opens); observations below. The lead's later glint-placement commit is not in this review.

## Checks
| check | c2debf73 | 1d62807c |
|---|---|---|
| station tests | 569 / 569 | 570 / 570 |
| ui tests | 80 / 80 | 80 / 80 |
| face tests | 577 / 577, 0 skipped | 578 / 578 |
| all prototype tests together | 1582: 1581 pass, 0 fail, 1 skipped (the C8 skip, on the base) | **1584: 1583 pass**, 0 fail, 1 skipped |
| native face_test | 14,732 checks, 0 failed | n/a (no C change) |
| public guard (vs the previous head) / face guard | exit 0 / ok | exit 0 / ok |
| place-masters | 1006, 0 problems | the same |
| metrics vectors `--check` | current (12,276 cases) | current |
| all ten golden sets | match | match |
| Station journey / `checks.mjs` / `layer-check.mjs` | exit 0 | exit 0 |
| play journey | exit 0 | exit 0 |
The builder's counts (1582 / 1581; 1584 / 1583) match mine exactly.

## What the lead asked me to check
- **The port's fidelity to specimen3.js.** `specimen.mjs` is `specimen3.js` with only the marked "port:" edits (the bead hook, `createCanvas` for the two canvases `finish` makes, no `document`) plus the harness at the foot; the fixture copy of specimen3.js and the four state files are byte-identical (sha256 / cmp) to the originals on work-queue. The oracle, run in Chromium against the original on three species × two found-look sets: mean difference 1.02, 1.07, 1.18, 1.29, 1.02, 1.12 (bar: 2), every bead centre equal. **The largest channel difference is 25 to 30**, so it is over the architect's first bar of 24 in four of the six sets and under the 32 it is held at (the builder's report was right and the architect has since confirmed 32). The delta adds the architect's second bar: no more than 64 channel values of a set differ by more than 24; measured **1, 11, 2, 2, 1, 8**. A lost ring or bead would move hundreds, so the bar is a real one.
- **ORACLE_MAX 32.** Four sets' maxima are 25 to 30 at the discs' and rings' edges, as the builder's note says (browser flattening against 4 × 4 coverage); the margin to 32 is two, and the over-24 count is the better guard.
- **The face guard allow-list.** `CANVAS_OK` gains `paint2d.mjs` and `specimen.mjs`; the guard's own test checks both are accepted and a third file with `getContext('2d')` still fails. Both are pure JavaScript on a Float32Array. The first commit tested `document`/`window` only in specimen.mjs; the delta tests both files.
- **st.libSeen and its migration.** The field starts `{}` on a fresh world (everything found is new until the Library is opened), a save from before it takes the guide as it stood (`libSnapshot`: nothing is new), and opening the Library takes it up to date; additive, no schema bump, tested (an old save without the field normalises to the guide). One gap: ticketed T-20261022-260 (below).
- **The species-choice cache.** The first commit memoised on `[guide, libSeen, wish, readOnce, knownIds, sealedOpen, mibis' species and births]` and the spec; I traced what `fieldGuide` and `wishOf` read and found nothing outside that key. The delta reworks it correctly: the choice and its signature (now with the mibis' ids and the bud's species) are in `wanted`, the Library reads the picture cache only and never renders on a sync (`peekSpecimen`), a miss shows the last specimen or the starter's empty form, and `warmLibrary` renders after the sync that wanted it, never while an event holds input.
- **The CI workflow.** Playwright and Chromium are installed earlier in the same job (the cache step, `npm install playwright@1.56.1`, the smoke check); the test step now sets `PLAYWRIGHT_BROWSERS_PATH="$RUNNER_TEMP/pw" PW_DIR="$RUNNER_TEMP"` as the journeys below it do, so the oracle runs in CI instead of skipping. Without PW_DIR the oracle test is skipped (as in the sandbox); I ran it with PW_DIR and it passed (8 / 8 in specimen.test.mjs).
- **The breathing swap, 124,528 px.** I removed the residents' hold on the swap frame (`library_swap_pending` in `walk_clock` and in `ent_load`) in a scratch copy and rebuilt: the swap frame then redrew **179,256 px** and two tests failed ("a swap frame … no frame passes 153,600 px" and the section-7 budget test), so the figure and the test are real. Reduced motion has no breathing or fade (asserted).

## Against the spec (§4.2)
The window is the 344 × 362 painted RGB at 1:1 with the 2 px inner shade on the top and left; the placeholder goes once the picture is on the face; "{n} new" (16, gold) at the lower left, hidden at 0, and "{Species} genome" right-aligned at x 988, y 412; at most eight glints (12 × 12 stars) fading on the 16-level dither over 2 s; four brightness levels swapped every 2 s through 1 2 3 4 3 2; render time printed (about 0.55–0.6 s at c2debf73, 0.7–0.8 s at 1d62807c with the levels' extra work, inside the 1 s bar, off the face's frame). The species rule (pinned wish; else fewest looks unfound; never one with nothing found) follows §15.1's order in the delta. The delta's render is Recipe 2 (the levels gain the form's light before the finish: the ground, grain and vignette are the same pixels at every level, asserted), glints stand 8 px beside their bead along the ray from the hub inside the 12 px margin, and with nothing found the window shows the starter's empty form captioned "Loika genome".

## Fix ticket
- **T-20261022-260.** `goScreen` calls `S.libOpened(G.st)` but writes no save, and the Home ✓ on the Library bezel (`intents/home.mjs` `toLibrary`) does not call `h.save()`; the Station has no autosave, so a reload before the next save makes the looks new again. Add the save and a round-trip test. Small; not blocking.

## Observations (not blocking)
- The breathing gains (1, 1.04, 1.08, 1.12) are the builder's reading of "four brightness levels" (the spec names no amount); the delta applies them to the form's light as the art director asked.
- The new standing kit checks (the guard and kit ratchet, no private duplicate of a `v_*` helper, component contract headers, `views/words.mjs` and `requests.mjs`) apply from the kit tickets; H4 predates them and I did not apply them.
