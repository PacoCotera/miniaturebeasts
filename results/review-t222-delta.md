# Review: T-222 delta (T-229 and the art direction row) — build/t-222-incubator-capsule @ 74a82e3b

The delta is 316aa0d7..74a82e3b: two commits (183b428f builder, 74a82e3b lead), both by Paco Cotera <paco@cotera.org>, no trailers or model/session names. I rebuilt face at 74a82e3b and ran everything myself. The earlier review is results/review-t222.md.

## Verdict: PASS

## The delta (6 files)
- **checks.mjs** (+4 lines): a Create capture that has the Incubate panel open (`panelGround` in the log) is read as the panel: the two verbs "Incubate" and "Keep shaping" in the panel headers, the price, the two bezels and two windows, the snapshot picture, and no stamp plate. The original assertion ("draws the roll, the founder and the stamp label") is the `else` branch, unchanged, for every other Create capture. Result below.
- **Hatch now opens no panel without a free bay** (`intents/incubator.mjs`): the panel's condition is now above ❀ 4, payable and `!S.bayFull`; otherwise the press falls through to `growNow`, whose rule refuses with Open's words and spends nothing. A new intents test (12 mibis in 12 bays, a growing bud) holds that the panel does not open, nothing is played, Essence is unchanged and the bud is kept. One weak spot: its message assertion falls back to the literal text "No bay free" if neither the host's `said` nor `plates` exists, so that one assertion can pass without checking anything. The refusal text itself is held by the state tests (T-219 case 5), and the code path is `growNow` → `S.instantGrow` → `h.say(msg)`; I do not count it against the delta.
- **lvgl-switch.md §2.10** now says the Incubate dither is "exactly the stage, 534,528 px". The stale glass comment in `incubator-props.mjs` is fixed ("the art director's cut master, a layer of its own").
- **design/art-direction.md**: the decision-panel row is replaced with the row from ticket T-20261016-230. I compared the committed row against the ticket's text: identical. Nothing else in the file changed (one line); no ticket id, date or name in it.

## Checks at 74a82e3b
| check | result |
|---|---|
| station tests | 550 / 550 |
| ui tests | 80 / 80 |
| face tests | 529 / 551, 22 failures; the same names as station-gate's 22 (all Create) |
| public guard (--base 124d5152) | exit 0, "public guard ok" |
| face guard | ok |
| place-masters | 980 placed, 0 problems |
| `checks.mjs` | exit 0, "layer checks ok"; `page-create-panel` reads off-palette chrome 0, 11 strings (0 off-spec), 27 drawn regions |
| layer-check | exit 0, no FAIL line |
| `journey.mjs` | no "differs from the golden" line; 9 in-page FAILs (the environment's, as before) |
| goldens, all screens | create, incubator, home, habitat, idle, vivarium, cargo, library, bench match; pods 9 fail (the base's 8 and pods-panel-return, the known drift, identical on station-gate) |

## Not covered
- The pods drift and the 22 Create face failures are the base's.
- I did not run a mutated `page-create` capture to see the old assertion still fail; I read the diff: the new branch is only for captures with `panelGround`, and the old line is the `else`.

The lead can open the PR to station-gate.
