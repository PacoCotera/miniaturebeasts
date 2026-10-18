# Review: T-222 the Incubator as the painted capsule — build/t-222-incubator-capsule @ 316aa0d7

Base: station-gate 124d5152. Six commits on d1dfa3f4 plus one on top (316aa0d7: Wait's readout moves into its header, UI/UX round 3); all by Paco Cotera <paco@cotera.org>, no trailers or model/session names in any message. I built wasm and native face in fresh worktrees of head and base and ran everything myself: station, ui and the full face suite, both guards, place-masters, the all-screens goldens check, `journey.mjs`, `checks.mjs`, `layer-check.mjs` and `make-metrics-vectors.mjs --check`.

## Verdict: FAIL on one item (T-20261016-229); everything else I checked holds

`node prototypes/station/tools/checks.mjs` (a step of the site workflow, run after the journey) exits 1 on 316aa0d7: `FAIL page-create-panel: Create draws the roll, the founder and the stamp label`. On station-gate it exits 0. Under the Incubate | Keep shaping panel the face deliberately does not draw Create's own words (it holds Create as one snapshot picture for the panel's right window), so the check's "roll, founder and stamp label are drawn" assertion no longer holds for that capture. The fix is in `checks.mjs`, not the build: T-229 teaches it that the panel capture draws the panel, and keeps the assertion for every other Create capture. This check was not on the builder's list.

## Checks (head 316aa0d7 vs station-gate 124d5152)
| check | head | base |
|---|---|---|
| station tests | 550 / 550 | 553 / 553 |
| ui tests | 80 / 80 | 81 / 81 |
| face tests (full suite) | 529 / 551, 22 failures | 506 / 528, 22 failures |
| face failures by name | identical to the base's 22 (all Create) | |
| public guard | exit 0 | exit 0 |
| face guard | ok | ok |
| place-masters | 980 placed, 0 problems | 935 placed, 0 problems |
| metrics vectors (`--check`) | current, 12432 cases | |
| layer-check | exit 0, no FAIL line | exit 0 |
| `journey.mjs` | no "differs from the golden" line; 9 in-page FAILs | 10 (the same, plus "after Incubate (a jump) the Incubator is built, growing 21 leaves", which the capsule retires) |
| `checks.mjs` | **exit 1** (page-create-panel) | exit 0 |
| goldens, all screens | create, incubator, home, habitat, idle, vivarium, cargo, library, bench match | the same |
| goldens, pods | 9 fail | 9 fail (the 8 and `pods-panel-return`) |

The pods drift is the known one and is identical on the base. The head has fewer tests than the base (3 station, 1 ui). I read the removed names: the three moving-set hatch tests (R2 held to 2720, the cutting key, the first hatch R5) go with `moving = false` (UI/UX ruling 5: the capsule hatches by plain steps for now), and the retired Grow this founder? panel's fixture test and its arrival and fork tests are replaced by the Incubate panel's. I did not find a removed test whose rule still stands.

## Against the authority
- **Rulings 1–5 and rounds 1–3:** the room, pod (160 tall, `podHeight` 160, no up-scale), crack (one layer, 600 to 1000), plain-step hatch, bar from its first pixel, the stamp column, the left-wall `ink` text, and Wait's readout in its header (Inter 16, `fog` on `panel`, right-aligned 12 in, on the verbs' line, no text in the window; the 4.5:1 test is in `panel.test.mjs`). The golden `incubator-panel-grownow.png` shows it.
- **Architect rulings:** the panel is Create's `confirm` state on the existing overlay; the right window is `prim_snapshot` (one face-owned picture, freed when Create is not under the panel); relit pods and juveniles are pictures through the picture table (`relit:{species}:{variant}:{light}:{w}x{h}:v{recipe}`, `RECIPE` 3), never in props.
- **The later rulings the lead listed:**
  - The Incubate dither is a named exemption in `lvgl-switch.md`, and the test holds it to the stage (`STAGE = 1024 × 522 = 534,528 px`).
  - The Hatch now door dither runs on one clock in two boxes (the glass box on even 16 ms ticks, the door box on odd), and the test holds worst frame ≤ 153,600 px and the last frame equal to the plain end state.
  - `rrect` and `rcorners` are documented in `prim.h` with per-op tests (`prim-rrect.test.mjs`: exact-pixel vector against the ring-mask oracle at radius 0 and 6, an off-palette colour refused, a box off the picture refused, no off-palette pixel).
  - The stamp-case front is `capsule-stamp-case-front-152x152`, the Incubator's only; Create and Pods keep their own (create.json and pods.json carry their own `stampCaseFront`).
- **No scaling on the face:** the new C (`incubator.c`, `panel.c`, `prim.c`, `create.c`, `home.c`) has no scale, zoom, transform or rotate call and no literal colour; the only resampling is `relight.mjs`/`layered-stand.mjs` (Lanczos 3) in the logic process, as the spec says. Every colour on the face comes from the palette (`prim-rrect` holds it for the new ops).
- **Props vs pictures:** props carry ids, sizes and strings; the pod, opened pod, juvenile, shadow and moss blades are relit pictures. `incubator-props` is held to 32 KiB by its test.
- **Refusals:** Incubate opens no panel when a bud is already growing, no bay is free or a material is short (the refusal plate shows); Hatch now opens its panel only when it is above ❀ 4 and payable, and a refused hatch spends nothing.

## Not blocking, for the lead
1. **Hatch now opens its panel with no bay free.** `intents/incubator.mjs` opens the panel when the price is above ❀ 4 and payable; it does not check for a free bay, where UI/UX (round 2 §D, round 3 §2) says a press that would be refused (short of Essence or no bay) never opens the panel. Short of Essence is handled; no bay is reachable only through a developer path (a free bay is guaranteed from Incubate to the hatch), and ✓ Hatch now then refuses with Open's words and spends nothing. Worth the one-line check when T-229 is touched.
2. **The exemption in `lvgl-switch.md`** names the Incubate dither, 180 ms, 16 levels, but not the figure (534,528 px, "exactly the stage") the architect ruled; the test asserts at most the stage. Add the figure to the doc.
3. **A stale comment** in `incubator-props.mjs` says "the glass is the host's, drawn in code along the interior's alpha"; the glass is a placed master (`glass-closed`).
4. **Size table.** The art-direction table has the decision panels' windows at 54 / 40; the signed Hatch now panel draws a juvenile about 126 tall inside the capsule close-up (UI/UX round 2 §D, an accepted reduction of the room's 146). That is a UI/UX and art direction decision, not a build defect, but the two documents say different things; one of them should say so.

## Not covered
- The 22 Create face failures and the pods drift are the base's; I did not look for their cause.
- I read the stills (growing, the hatch at 1500, the Hatch now panel) and the head's golden for the Hatch now panel; I did not review every one of the 37 for art. UI/UX passed them in round 3.
- The architect's later rulings are not filed yet, so I checked the code against the lead's list.
