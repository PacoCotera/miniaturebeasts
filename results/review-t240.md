# Review: T-240 play page layout — build/t-240-play-layout @ c90ea5a1

Base: station-gate 40f71a2c. One commit, by Paco Cotera <paco@cotera.org>, no trailers, no model or session names. I ran it in a fresh worktree against ruling.md (§1–§6, 9ab90566).

## Verdict: PASS

No blocking finding. One small follow-up (bench leftovers in index.html) is ticketed as T-20261019-243; two observations are for UI/UX.

## Checks (head c90ea5a1)
| check | result |
|---|---|
| station tests | 556 / 556 |
| ui tests | 80 / 80 |
| face tests | 563 / 563, 0 skipped |
| all prototype test files together | 1555 tests, 1554 pass, 0 fail, 1 skipped: the builder's counts exactly |
| public guard (diff vs station-gate) | exit 0 |
| face guard | ok |
| place-masters | 1001 placed, 0 problems |
| all ten golden sets | match |
| play `journey.mjs` | exit 0, no FAIL line (every A, B, C, ST, S, M, K, D, E section) |
| Station `journey.mjs` | exit 0, 0 FAILs |
| `checks.mjs`, `layer-check.mjs` | exit 0 |

## What the lead asked me to check
- **Faces never scaled at runtime.** `metrics()` sets k = max(1, floor(dpr)) and f = k/dpr; the iframes are placed at 1024 × 600 and 450 × 600 lp and never given a scale transform. The M section reads `frameBad` (the page's device pixels against the face's own `capture()`, spread k × k) for both faces at all six sizes and asserts 0 differing pixels; it passes, and in A at dpr 1.25. I also probed dpr 1.5, 1.95, 2, 2.25 and 3 myself: the frames measure 1024·f × 600·f (at 2 and 3 exactly 1024 × 600 CSS px), no key under 56, no row overflowing its tray, no sideways scroll.
- **M asserts what it claims.** I mutated the Station Down key from 56 to 52 in a scratch copy: the journey failed at all six sizes ("station Down is 52 × 52 CSS px, wanted 56 × 56"), then I reverted. The assertions cover every key against its minimum (Confirm 64) with an upper bound of one device pixel, the 17-key count, each key 4 from its row top and inside the tray, the tray as wide as its shell and 72 CSS px a row, the tray joined to the shell, the bar (40 tall, tabs ≥ 120, Dock ≥ 168), no sideways scroll, the Caddy block 808 lp wide and its place in each layout (24 under the cradle in Stack; 24 under the Station tray and right-aligned to the Station shell in Row), the Stack 1,812 tall at dpr 1 and the Row fitting 1920 × 1080 and 2560 × 1440. The row counts are a hard table: 1 and 1 at dpr 1, 1 and 2 at 1.25, 2 and 2 at 1.75, which is §6.1's. My probes agree with the ruling's table elsewhere (1.5: Companion 2 rows; 2.25: Station 924 wide, 1 row, Companion 2).
- **The dock round trip in Stack.** ST runs it twice (eased scroll and reduced motion) at 1440 × 900: the Companion tab scrolls the Companion and its tray wholly into view; Shift+D docks; after the contact beat the Station has the keys and the page is back at the top with the Station and its tray wholly in view; Later; Shift+D lifts and the Companion is in view again; a device already in view does not move the page. S repeats the dock at 1280 × 720 with both frames pixel-equal to their captures.
- **The skipped test.** The one skip is `T5: C8 marks only the partner…` in prototypes/exploration/tests/care.test.mjs, `skip: station("tripCarried", "dockKey") || …`, "C8 has not landed on main". It is byte-for-byte on the base 40f71a2c and this commit touches no test file; it is not this ticket's. (The journey's own E2 skip, for Chromium older than 141, did not trigger: it prints "E2: ok (5 ratios)".)
- **The bench code.** Removed from shell.mjs (the `BENCH` constant, the container, handle, shelf, layout and focus code, 33 lines), from the CSS, and from the Shift+C help row; README and the Layouts table follow. Leftovers: index.html still has the hidden `fBench` iframe and `tabBench` button and the Keys ? panel's whole "Bench" section (the bench's keys, on a page that cannot show the bench), and the journey asserts the hidden frame (A, C). Not a defect of behaviour; ticketed as **T-20261019-243**.
- **Nothing outside prototypes/play changed.** `git diff 40f71a2c..c90ea5a1 --name-only` lists only prototypes/play: README, index.html, src/shell.mjs, tools/journey.mjs and 21 PNGs in img/ (the new six-size, row and stack captures; the retired caddy-sheet, short, standard and wide ones removed).

## Observations (not blocking)
1. **At 1280 × 720 the Station's key row is cut at load.** A device block is 688 tall and the page below the bar is 680, so it cannot show whole (the ruling says as much: "it scrolls"); the page opens at scrollTop 0, which shows the whole screen and the top 44 of the keys' 56 px (see img/play-1280x720.png, the bottom of Confirm and the D-pad). Taking the keys by tab, click or ` scrolls the keys into view; boot does not, because the Station already owns them. Whether the page should open with the keys showing is not in the ruling: for UI/UX.
2. The journey's 4× CPU-throttled frame time prints "over" (14.3 ms against 12 ms) with exit 0; that line and its code are unchanged from the base.
3. Re-running the journey with `PLAY_CAPTURES=1` rewrites 12 of the committed captures (live screens, so not byte-stable); they are evidence, not a gate.

## Fix tickets
- T-20261019-243: remove fBench, tabBench and the Bench keys section from index.html; replace the journey's assertions on them.
