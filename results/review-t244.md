# Review: T-244 play page follow-ups — build/t-244-play-followups @ 590b435c

Base: station-gate e6a583cc. One commit, Paco Cotera <paco@cotera.org>, no trailers; only prototypes/play changed (README, index.html, src/shell.mjs, tools/journey.mjs, 11 captures).

## Verdict: PASS
This also closes my T-20261019-243 (the Bench section in Keys ?): the `<h3>Bench</h3>` list is gone from index.html, and the journey asserts the panel names no bench, Loci, Trait, Compare, Cross or Export frame while still listing Station and Companion. #fBench and #tabBench stay hidden, as ruling §7.2 item 10 accepts.

## Checks (head 590b435c)
- All prototype tests: 1555 tests, 1554 pass, 0 fail, 1 skipped (the same C8 skip on the base, not this ticket's).
- Play journey: exit 0, no FAIL line. Public guard (vs station-gate): exit 0. Face guard: ok.
- Nothing outside prototypes/play changed, so the other gates are unaffected.

## Ruling §8.1: the page opens revealed, as a cut
`layout(); reveal(owner, true)` at the end of the module; `reveal` with `cut` sets `scrollTop` to the same target the eased reveal would choose, with no tween (and cancels any running one). The journey asserts at 1280 × 720 the Station's tray bottom at 720, the face whole (≥ 40 and ≤ 720) and scrollTop > 0; at 1440 × 900 scrollTop 0, and again 0 after a reload.
I probed it myself in a fresh browser, load and then a reload after scrolling the page to 30:
- 1280 × 720 (dpr 1): scrollTop 24, tray bottom 720, face 40–640. Same after the reload.
- 1280 × 720 at dpr 1.25, 1440 × 900 at dpr 1.75, 1920 × 1080, 1920 × 790: scrollTop 0 (the device is wholly in view), the same after the reload.
- 1280 × 600: scrollTop 144, tray bottom 600, the face's top out of view (−80), which is §7.1.2's "below 720 tall the face's top may go out of view; the keys never do".

## Notes (not blocking)
- The journey's reload assertion is at 1440 × 900, where the opening is 0 either way; the 1280 × 720 reload is asserted by nobody. It holds (probe above), because the reveal computes an absolute target and the cut overwrites any restored scroll.
