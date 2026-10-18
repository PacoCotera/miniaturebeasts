# Review: T-223, the integration of batch B-20261016-4 — integrate/b-20261016-4 @ d25e80e8

Base: station-gate c029103b (#234). I built wasm and native face in fresh worktrees of both and ran everything myself.

## Verdict: FAIL on one item (T-20261016-226); the rest holds

`prototypes/face/golden/journey-create.json` was not retaken. `node prototypes/station/tools/journey.mjs` on d25e80e8 fails with `FAIL journey-create.json: step create-grow differs from the golden`. The committed step still records two intents on ✓ at the roll, the second being the retired Grow this founder panel's press (`panel / card.grow / confirm`). Create's trigger for that panel is gone, so the journey now sends one. The same journey on station-gate has no such failure, so it comes from the merge. The ticket (step 4) asked for every changed golden to be retaken; `journey-incubator.json` was, this one was not. Fix ticket T-226 retakes it with the repo's tool (`JOURNEY_GOLDEN=write`). Nothing else in my checks fails because of the integration.

## Checks (head vs station-gate)
| check | head d25e80e8 | base c029103b |
|---|---|---|
| station tests | 553 / 553 | 485 / 485 |
| ui tests | 81 / 81 | 81 / 81 |
| face tests | 506 / 528, 22 failures | 484 / 506, 22 failures |
| public guard (vs origin/station-gate) | exit 0 | exit 0 |
| face guard (--base origin/station-gate) | ok | ok |
| place-masters | 935 placed, 0 problems | 903 placed, 0 problems |
| `checks.mjs` | "layer checks ok", exit 0 | same |
| goldens | pods 9 fail; create, incubator, home, habitat, idle, vivarium, cargo, library, bench match | pods 8 fail; the rest match |
| journey | one extra FAIL: journey-create.json (above) | none |

- The 22 face failures: the same names on both (only the test numbers shift), all Create tests. No new face failure.
- Commits: all by Paco Cotera <paco@cotera.org>; no trailers or model/session names in any message from station-gate to head.

## The goldens in my environment (the lead's question)
- Create, incubator, home, habitat, idle, vivarium, cargo, library and bench match what my Chromium renders, including the regenerated home, cargo, habitat and incubator ones (and incubator-panel-grownow and incubator-hatch-skip). They are tool output, not hand edits.
- Pods: the 8 base failures reproduce (the field-guide pages, overview and compare states), and the ninth is the new `pods-panel-return`. I retook the pods set in a scratch copy and compared. The panel-return difference is 6,584 px inside the pod picture at the panel's window (x 342–752, y 223–316): the committed golden draws the pod with a cream cap and dots, mine with a terracotta cap and dots. The base's eight differ the same way, in regions of the pod art (7–100 k px, x 108–895). So it is the same drift (the pod art's colour), not a panel layout or wording difference. I cannot say which side is "right"; the whole pods set is stale or drifted on clean station-gate and needs retaking on its own, as the lead already has it. I do not count the ninth as the integration's fault.

## Conflict resolutions follow the ticket
- `intents/incubator.mjs`: Incubate/Hatch now (#233) wins. Hatch now still pays, finishes and hatches in one press (`growNow` → `startHatch`); the skippable hatch hold (T-90) stays (`ev.skip`, ✓ Skip). Above ❀ 4 (`growNowAbove` 4, from panel.json) ✓ opens the Hatch now panel and spends nothing; at or below it acts in place. A refused hatch (no bay, short Essence) is the rule's own and spends nothing. The panel's Wait and ← spend nothing (tests hold both).
- The intents, incubator-props and panel tests follow: above ❀ 4 ✓ opens the panel with 0 played and Essence unchanged; Wait spends nothing; Create's ✓ Incubate opens no panel ("until T-222"); a `growNowAbove: 99` host exercises the in-place path.
- `journey.mjs` and `incubator-states.mjs` carry the new `panel-grownow` and `hatch-skip` states; `journey-incubator.json` agrees with the code. (`journey-create.json` is the one that does not; above.)

## The retired-strings fixture
`tests/fixtures/grow-panel.json` holds the retired Grow this founder? panel's title and cards, used only by `panel-props.test.mjs` and `face/tests/panel.test.mjs` to keep exercising the panel frame (`withGrow`). No product string remains in the specs (panel.json has no `grow` panel; the specs' only "Grow it" is in notes), and the fixture's note says why. I find it acceptable for now: it keeps the frame's card variants under test until T-222's Incubate | Keep shaping panel supplies real strings, after which it and `growFounder`/the arrival plate (dead code behind the removed trigger) should go with it. Nothing to change today.

## Also seen (not blockers; the lead has the first two queued)
- Two items the lead already has queued: the panel wording ("ready at once" no longer true now that Hatch now hatches), and layer-check on `incubator-hatch-skip` (I reproduce its three FAIL lines on head: stamp and code outside their labels, no focus ring).
- `checks.mjs` page-bench-panel-upgrade: not reproduced; the check passes (exit 0) on head in my environment.
- A panel card press logs a `Decision panel · … · …` line first, so above ❀ 4 Hatch now writes two log lines, where the game text asks for one ("Hatched {name} now · …"). At or below ❀ 4 it is one. A small inconsistency with the game text §1; for the game designer, not a fix I am asking for here.

## Not covered
- The 22 Create face failures and the pods drift are the base's; I did not look for their cause.
- I did not look at the new panel windows' art (UI/UX will respec them, per the ticket).
