# Review: T-235 fix rounds — build/t-235-vivarium-polish @ 68594338 (bbdb1776 + 9598f73a + 3bdafbb7 + 68594338)

My first verdict (results/review-t235.md) failed 1be7ffed on the public guard (T-237); this is the review of everything since: the fix round bbdb1776 (reviewed earlier as an interim PASS) and the three commits after it, all by Paco Cotera <paco@cotera.org>, no trailers or model/session names in any message. I rebuilt face at each head and ran everything myself.

## Verdict: FAIL on one item (T-20261018-239); everything else holds

**The Vivarium, Idle and Home goldens now depend on the time of day.** At 68594338 `goldens.mjs --check vivarium idle home` fails 45 states (home 24, idle 9, vivarium 12: every state that shows a standing resident) when I run it at 20:29 UTC, and passes all three sets when I run the same check with `TZ=Pacific/Kiritimati` (10:30 local). At 3bdafbb7 the same check passed at 20:29 UTC. Cause: the last commit makes a sleeping resident draw its curl in place (`p.curl`, set when `restOf` says "asleep"), and `restOf` reads the Station time, which the host takes from the real clock; the diurnal settle time is 20:00 (`vivarium.json rules.rest.settle.diurnal`). Until this commit `rest` only changed a moving resident's picture, so a still resident's golden did not depend on the clock. The still states of the three golden harnesses set the light but not the Station time, so a golden taken by day cannot be checked at night (a UTC runner after 20:00, or before 06:00), and one taken at night would fail by day. I compared the images: by night the residents are drawn as their small curls in the places they would stand. T-239 asks for the Station time to be pinned (noon, as the moving household states already do) in the still states of the three harnesses, the sleeper states keeping their own explicit time, and for the check to be run under three clocks.

## Checks at 68594338 (all at the same clock as the failure above; only the goldens depend on it)
| check | result |
|---|---|
| station tests | 556 / 556 |
| ui tests | 80 / 80 |
| face tests (full) | 541 / 563, 22 failures; the same names as station-gate's 22 (all Create) |
| the builder's total | 556 + 80 + 563 = 1199: matches |
| public guard | exit 0, "public guard ok" (T-237 is fixed) |
| face guard | ok |
| place-masters | 1001 placed, 0 problems |
| metrics vectors | current |
| `make-keepout.mjs --check` | exit 0; keepOut [752, 356, 256, 116] |
| `checks.mjs` | exit 0 |
| layer-check | exit 0 |
| `journey.mjs` | no "differs from the golden" line; the 9 FAILs are the base's |
| goldens | cargo, create, incubator, habitat, library, bench match; pods fail 9 (known drift); **vivarium, idle and home fail at 20:29 UTC and pass by day** |

At 9598f73a and at 3bdafbb7 every one of the above, goldens included, was clean in my environment.

## The commits
- **bbdb1776 / 1b0d2b84 (the first fix round):** the section-reference comments are reworded (the public guard passes: T-237 is done); keepOut is derived by `make-keepout.mjs` (with `--check`) as [752, 356, 256, 116]; a moving resident's `figure` is the union of the ink bbox over its atlas's grounded cells (not the air frame or the curls), with its own test that holds the ring and tag still as the cells breathe; a species with no nap master sleeps as its standing figure (UI/UX accepted this; S04 onward have no master); a test that the figure excludes the shadow rows.
- **9598f73a (UI/UX's feet line, lift and tag):** the feet line is the last solid row (alpha ≥ 200) for stands and for atlases; the focus lift is 2 px at the world sizes (4 at 150 and above); the flipped tag is feetY − H − 34 (the lift is subtracted by the same code). The vivarium and home specs carry lift 2; Habitat's own lift is not in those files.
- **3bdafbb7 (moving residents, ruling 1399c54e):** a species with a layered stand draws a moving resident as its stand translated along its path (its own coat and marks, the stand's size, no moving set); species with moving sets but no layered stand have their walk, nap and shadow atlases reduced offline in the logic process by the stage's standing factor (`fitDownBy` in `moving.mjs` `compose`; the factor from the figure measured on the unreduced grounded cells over the view's 54 or 40), each cell kept in its own box. The tests: a moving atlas's figure is the standing height to a pixel (54 and 40, tolerance 1, on a synthetic body about twice world size) and in its own cell; with the moving sets on, a resident with a layered stand has the same picture and figure as with them off (the same `mibi:S01~…:adult:144x152`) and no moving set. The moving golden shows eleven stands at world size with their own coats and one fox at world size.
- **68594338 (sleeping S01 residents curl, ruling 18e36568):** `curl` and `curlFigure` props only while asleep; the curl drawn in place with its foot on the stand's feet line; no lift while asleep; the ring and tag from the curl's figure (the tag 32 above its top); a sleeping resident stays where it is. The props schemas for home, idle and vivarium carry both fields. The tests hold the foot on the feet line, the ring on the curl's feet with no lift, the tag 32 above its top, and that props carry the curl only when asleep.
- **No scaling on the face:** the face C in these commits (`home.c`) draws pictures 1:1 at positions; no scale, zoom or transform call; every reduction is offline in the logic process.

## Not covered
- The nine pods failures and the 22 Create face failures are the base's.
- The standing-sleeper fallback for species with no nap master is UI/UX's decision, accepted in their ruling.
- The moving-atlas height test uses a synthetic body, not a real atlas; the moving golden is the real-art check and shows the right size.

## Addendum: the T-239 fix — build/t-235-vivarium-polish @ 07aeabf6 — PASS
One commit on 68594338 by Paco Cotera <paco@cotera.org>, no trailers: seven tool files, one line each. The shared harness (`station-page.mjs`) puts `stationTime` "12:00" in its dev defaults, the journey does the same, and the state tools for vivarium, idle, home, habitat and incubator reset to "12:00" instead of null; the sleeper scenes keep their own explicit 23:00. That is what T-239 asks (pin the Station time at noon in the still states, sleeper states keeping their own time); no golden was re-baked, as T-239 expected (the committed goldens were taken awake).

I ran the three-clock check myself on 07aeabf6, with `goldens.mjs --check vivarium idle home habitat incubator` under four clocks:
| clock | local time | result |
|---|---|---|
| default | 20:37 (the clock that failed at 68594338) | all five sets match |
| Pacific/Kiritimati | 10:40 | all five match |
| Europe/Moscow | 23:42 (in the sleep window) | all five match |
| Asia/Tokyo | 05:45 (in the sleep window) | all five match |

Also on 07aeabf6: the public guard against 5c7e5101 exits 0; `journey.mjs` has no "differs from the golden" line (the same 9 in-page FAILs as the base's); `checks.mjs` reports "layer checks ok". Only tools changed, so the tests, the face build and the other results at 68594338 are unchanged.

Verdict for the whole branch: PASS at 07aeabf6 (T-237 and T-239 are both fixed; everything in the earlier sections holds).
