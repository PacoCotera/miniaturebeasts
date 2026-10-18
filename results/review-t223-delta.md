# Review: T-223 delta (T-226 plus the two queued fixes) — integrate/b-20261016-4 @ 40f940ed

The delta is d25e80e8..40f940ed, a fast-forward: one commit by Paco Cotera <paco@cotera.org>, no trailers. I rebuilt wasm and native face at 40f940ed and ran everything myself. The earlier review is results/review-t223-integration.md.

## Verdict: PASS

## The delta (9 files)
- `journey-create.json`: the diff is only the removal of the `panel / card.grow / confirm` intent from `create-grow` (6 lines), nothing else.
- The panel wording: panel.json title "Hatch the {Species} now?" and the Hatch now card line "hatches now"; `panel-props.mjs` fills `{Species}` from the bud's species for the growNow panel; the panel-props test follows. Regenerated with the repo's tools and they agree with the code: `metrics.json` (`make-metrics-vectors.mjs --check`: "metrics vectors current: 12564 cases", exit 0), the `incubator-panel-grownow` golden and `incubator.json` hash, and `journey-incubator.json` (the two "ready at once" subjects now "hatches now").
- `layer-check.mjs`: the Incubator region checks skip `incubator-hatch-skip`, with the note that the frame after ✓ Skip is the first frame of the 180 ms hand-off dither into the Habitat meet (the state's own assertion is screen habitat). The exclusion is only for that state; every other Incubator state is still checked.

## Checks at 40f940ed
| check | result |
|---|---|
| station tests | 553 / 553 |
| ui tests | 81 / 81 |
| face tests | 506 / 528, 22 failures; the same names as station-gate c029103b (all Create) |
| public guard (vs origin/station-gate) | exit 0 |
| face guard | ok |
| place-masters | 935 placed, 0 problems |
| `journey.mjs` | no "differs from the golden" line (journey-create.json and journey-incubator.json both match); the 10 in-page FAIL lines are the environment's Data-cost steps, the same 10 as on station-gate |
| `checks.mjs` | "layer checks ok", exit 0 |
| `layer-check.mjs` | exit 0, no FAIL line (incubator-hatch-skip no longer reports) |
| goldens | create, incubator, home, habitat, idle, vivarium, cargo, library, bench match; pods fail 9 (8 on station-gate + `pods-panel-return`) |

The pods failures are what I found before: the pod art's colour drift in my environment, the same on clean station-gate; the ninth is the new panel-return state, same kind of difference (see the earlier review). The pods set needs retaking on its own; not this delta's.

## Not covered
- The 22 Create face failures and the pods drift are the base's; their cause was not looked at.
- The new panel title and card wording was not judged for art or copy; the game designer's text, as the lead gave it.

The lead can open the PR to station-gate.
