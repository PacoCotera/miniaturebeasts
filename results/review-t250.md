# Review: Home H2, the Vivarium window (T-20261019-250) — build/t-250-home-vivarium-window @ 2866bf68

One commit on station-gate daa72644, Paco Cotera <paco@cotera.org>, no trailers or model/session names. I built wasm and native from the head in a fresh worktree and ran the full set.

## Verdict: PASS, with one fix ticket (T-20261019-254: rank the six by grown up as well)
UI/UX §13.2 asks for "grown up" in the ranking of the six, which the build does not do; that is the one fix, and it is not a defect of what the builder was given before §13.

## Checks (head 2866bf68 vs station-gate daa72644)
| check | head |
|---|---|
| station tests | 555 / 555 |
| ui tests | 80 / 80 |
| face tests | 562 / 562, 0 skipped |
| all prototype tests together | 1553: 1552 pass, 0 fail, 1 skipped (the C8 skip, on the base) |
| face_test (the C vectors, from build.sh) | 14,690 checks, 0 failed |
| public guard (vs station-gate) / face guard | exit 0 / ok |
| place-masters | 1001 placed, 0 problems |
| metrics vectors `--check` | current (12,234 cases) |
| all ten golden sets | match |
| Station journey / `checks.mjs` / `layer-check.mjs` | exit 0, 0 FAIL |
| play journey | exit 0 |
The builder's 1551 is one under my 1552 passes (as at H1); nothing fails.

## Against the spec
- **The crop (§3).** `painting.at [64, 194]`, rows 194–555, 604 × 362 at (24, 78): a `v_sprite_window` of the same `idle-vivarium-<light>:1024x568` picture the Vivarium uses (asserted for all four lights; no new master). The inner shade is 2 px of the palette's `void` along the top and left, drawn as rects, and a node of no size on a placeholder; the Vivarium's placeholder stays a node of no size under the painting and the Library's stays (§11.5, §13.1). The old `home-glass-*` masters are not asked for.
- **Residents.** At most six at home walk; the carried set walks too while docked (Home has no bed: `noBed`, the sleepers array empty, the bed item left out of the sort); more than six: the readout counts all of them, the window shows six; props carry no rectangle, nothing is a focus target. Stand sizes 144 × 152 and 104 × 112 as the Vivarium's.
- **Ground and keep-out.** `groundTopHome(x) = groundTop_viv(x − 24 + cx) − 36`, implemented as dx 40 and dy −36 on the Vivarium's own profile; box.x runs 32 .. 620 − W, feet from 280 to the foot 435. The keep-out [548,344,80,96] stands only while the away frame shows. The test walks six residents for 60 s with stills and with moving sets, away or not, and asserts the x range, the foot, the profile and the keep-out every frame.
- **The away frame.** 64 × 64 at (556, 352), `panel` ground and 1 px `hairline` edge, the first mibi out (bay order) at its world size, bottom-centred inside the edge and clipped to it, the caption "away" (16, `frost`) centred at x 588, y 418; none when nobody is away.
- **The event tag.** The house name tag on the one mibi with a pending meet, at feetY + 16 and flipped over the figure past the foot, no lift, slid inside the window; no meet, no tag. §13.3 drops "back from a trip" (no event marks it).
- **Budgets (§7).** On the builder's scene with ten at home (six drawn) and a Companion out: 107 objects with stills and 113 with moving sets (limit 400); props under 32 KiB; the worst frame 56,800 px (stills) and 75,221 px (moving) against 153,600; the worst household tick 69,142 px against 148,000; 0 deferred, 0 overflows. The ring with the window drawn: room↔vivarium 30,300, vivarium↔library 52,800, the worst 52,800.
- **Idle and the Vivarium's whole unchanged.** The idle and vivarium goldens match, as do both journeys; the shared walk code gains a `g_home` context (`regions.glass` → `regions.window`, the profile's dx, the keep-out only while away) and the walk clock keys on its own context (3), so entering Home from Idle or the whole restarts its walk.

## The removed walk reset (screens.c)
At daa72644 Home's draw called `home_hidden()` before `home_words()` (H1 had no walkers), which cleared the walk's origin on every redraw: with walkers that would have restarted them each frame. The head drops it for Home and keeps it for every other screen (the cargo, create, incubator, habitat, library, bench branches and the `else`). That is right, and the 60-second walk tests would fail without it. One thing to know: Pods does not call `home_hidden()` (it did not before either), so Home → Pods → Home keeps the walk, not restarting from the seeds as the comment says; the walk clock catches up by dropping the time past the first group tick, and a changed seed or id restarts that resident, so I found no visible defect.

## The fix ticket
- **T-20261019-254.** `glassOf` ranks by `born` alone and breaks ties by the larger id. §13.2 (UI/UX, confirmed by the game designer): the mibi with a pending meet is always in; the rest by the newest life event, born **or grown up**, ties in bay order. There is no stored grown-up turn: it is `born + adultTurns` once the mibi is an adult. Small, in home-props.mjs and its two tests; it needs a case where an early-born mibi that has just grown up outranks a later-born one.

## Observations (not blocking)
- The walkers test allows moving-set feet to sit 3 px above the profile (`feet >= groundTopHome(fx) − (name === "moving" ? 3 : 0)`). I removed the allowance in a scratch copy and the test still passed, so it is slack that could go (the Vivarium's own test has none).
- "Back from a trip" is not in the tag (§13.3) and "most recent activity" is life events only (§13.2): both as ruled.

## Delta: 6bd8bbd7 (T-20261019-254), checked
One commit on 2866bf68, Paco Cotera, no trailers; home-props.mjs, home-props.test.mjs and the face's home.test.mjs only. `glassOf` now ranks the mibi being met first (Infinity), then the newest life-event turn, `born + adultTurns` once that turn has come (`≤ st.turn`) else `born`, ties by the lower bay, and still shows the kept six in bay order. The new case is the right one: with `max` 1, a mibi born at 3 that grew up at 5 outranks one born at 4 still a juvenile; the mibi being met still comes first; with born 2 (grown up at 4) the first stays ahead; with born 3 the event turns tie and the lower bay wins. The nine-at-home case now expects the six lowest bays (all seeded at the same turn), and the 3 px feet allowance is gone from the walkers test. Station tests 555 / 555, ui 80 / 80, the face's home tests 43 / 43, public guard (vs 2866bf68) ok, the home, vivarium and idle goldens match (no stills change). **PASS.**
