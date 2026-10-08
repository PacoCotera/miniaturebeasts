# Handover: the Grow painting service and the prompt lab

For a fresh session taking over the genome engineer's seat. Branch `dev`; main is the release branch and the programme lead merges. Commit as the repository's configured author, plain messages. Do not touch `art/`, `website/`, `prototypes/exploration/` or `prototypes/station/`. Merge `origin/main` into `dev` before pushing. The lead briefs by cross-session message and asks for a report after each milestone. The Station loop build is next.

## Where things stand (2026-10-08, after the v8 validation run)

- **The painting prompt is v8** (`grow/prompt-lab/v8/`, README there): the art director's v7 house rendering with the lab's 7D naturalist's finish, species notes only for what differs, no species reference image, `gemini-3-pro-image`. The owner approved it on the v7 consistency sheet. `grow/service.py` reads it (`PROMPT_SET`, prompt v5) for variant B's two steps: the part map and the colour key, then the drawing and the colour key. Three loader rules sit between the set and the call: the plan lines (a winged plan's resting wings are part of the body outline; a flat-winged plan's closed wings show only as strips on the flanks), the colour placement line written from the individual's own key (the species notes' fixed line replaced, every cell the slot check gates named with its pigment), and the framing: every individual's controls are framed by the prompt's framing rule (`frameCamera`, four fifths of the frame, feet on a ground line one tenth up), so the band, part and proportion checks mean what they say.
- **The rig** (`framework/rig.mjs`, the cute envelope `framework/envelope.mjs` E1–E9): a resting wing pair is tucked along the flanks inside the body outline (E9, the Peplos's and now the bird clan's, `roster.mjs` C09 `flapRest: "flat"`). The reference frame under `out/reference/S09/species-S09.json` (not committed, rebuilt by the reference set) was patched to `flat` by hand; a fresh checkout rebuilds it from the roster.
- **The checks**: step 1 (the drawing) is gated with a drawing's tolerances (`DRAWING_BAND_MAX` 0.18, `DRAWING_PART_MIN` 0.50, proportions 25 %), one named retry carrying the plan lines, then the plain placeholder; step 2 (the painting) is logged, not gated. A dropped connection is retried once.
- **The validation run** (`sheets/validation-<species>.png`, `-pass1.png`, `costs.json`; the README's results table): 18 individuals, portrait, one named retry. After the second pass 11 of 18 are painted (Loika 5 of 6, Belatz 5 of 6, Peplos 1 of 6), step 1 first-attempt pass 0.44, $0.38 and 2.2 calls a mibi; prompt v5 spent $12.38 over 70 calls; all Gemini spend $64.42.
- **The prompt lab** (`grow/lab.py`, `--set v5|v6|v7|v8`): v5, v6 and v7 sheets under `sheets/lab-*`; the consistency sheet `lab-consistency-v7.png` is the record the owner decided on.

## How to run

```sh
cd prototypes/workbench
node framework/build-frames.mjs && node --test tests/*.test.mjs       # after any rig, roster or catalogue change
python3 grow/service.py paint --species S09 --members 6 --control twostep --views portrait --workers 2   # the validation set of one species (paid; skips mibis already painted at this prompt version)
python3 grow/service.py paint --species S09 --genome grow/out/S09/<sha>/genome.json --control twostep --views portrait --force   # one mibi again
python3 grow/service.py recheck --complete                           # re-judge the logged drawings with the checks as they stand; paint a drawing that now passes (paid)
python3 grow/service.py report                                        # costs.json and sheets/validation-*.png
python3 grow/lab.py --set v8 --models pro --species S12 --samples 2   # the lab on the service's set (paid)
```

`GEMINI_API_KEY` comes from the environment; if it is missing, say so, do not work around it.

## Pending

1. **The Peplos is parked** (the lead, 2026-10-08, after the validation): the service is adopted for the Loika and the Belatz as it stands; the Peplos goes back to species design later, because its rig reads as a lumpy segmented bug before any prompt touches it, a plan and envelope problem, not a painting one. The evidence to pick up: five of six served plain, the painter redrawing the moth as a plump big-headed bug (thorax at twice the drawn share, the head doubled, a leg pair dropped, the abdomen drifting to the second colour); the closed-wings line holds since the tucked control.
2. **Step 2 is not gated.** Two paintings drifted off their drawing (the Peplos type specimen, whose Companion is small; S09-bd3313fe). One gated retry on step 2 would cost one call more on those.
3. **The Belatz type specimen** is served plain: its raised tail spike is drawn hanging every time. A resting bird tail that hangs is an envelope rule to add (and the `S09` kind target to redraw with it).
4. **The Loika's cream areas** (hind legs, the belly field) are drawn charcoal on about half the first attempts; the retry recovers half of those. A third attempt on a slot-only failure, or the key sent first, are the two things to try in the lab.
5. **`description.v5.md`** in `grow/prompt-lab/` is the prompter's target for the next change to `framework/describe.mjs`; owed.
6. **Kind targets** for S06, S10, S11 (and now S09) to be redrawn under the envelope.
7. The S12 token at 48 px: the tile camera fits the mesh bounds; fit it to the visible silhouette.

## Reading the results

`grow/out/<species>/<sha>/manifest.json` holds, per view, the attempts with their checks (`tolerances`, `outside`, `missing`, `parts` spans, `proportions`, `slots`, `reasons`), the status and the served outputs; `prompts.json` every call with its fields (`artDirection1/2`, `species` with the colour placement line, `description`, `planLines`, `imageOrder`), cost, seconds and checks. `step1-portrait-*.png` beside the painting is the drawing the painting was made from; a run that fails leaves none.
