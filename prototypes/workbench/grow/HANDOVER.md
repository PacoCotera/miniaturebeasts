# Handover: the Grow painting service and the prompt lab

For a fresh session taking over the genome engineer's seat. Branch `dev`; main is the release branch and the programme lead merges. Commit as the repository's configured author, plain messages. Do not touch `art/`, `website/`, `prototypes/exploration/` or `prototypes/station/`. Merge `origin/main` into `dev` before pushing. The lead briefs by cross-session message and asks for a report after each milestone.

## Where things stand (2026-10-08)

- **The rig** (`framework/rig.mjs`) draws every species inside the cute envelope (`framework/envelope.mjs`, rules E1–E9 with reasons; the workbench README lists them). The Loika is calibrated to the accepted Pip (catalogue 9). The leaf crest is green (the `leaf` slot); the Belatz's feet are rounded; the Peplos's resting wings fold along the body (E9). Under the envelope 13 of 16 species read as their kind by the parts check; the raccoon, the otter and the turtle sit within 0.03 of their hand-drawn targets (`frames/targets/`), which were drawn to the old shapes and are to be redrawn.
- **The Grow service** (`grow/service.py`, `grow/controls.mjs`): a genome in, the painted portrait (and side) out, with structural checks (band, part span, proportions, slots), one named retry, then the plain placeholder; derived Companion and token; layout by genome SHA-256 under `grow/out/`; every call in `grow/prompts.json`. Variant B (two steps: a HiBit drawing from the crisp key and index passes, then a treatment transfer with the species reference) is the recipe the owner is iterating. The side view is painted only at a sitting; the portrait is the standard.
- **The prompt lab** (`grow/lab.py`) runs a prompt set as written: the art prompter's v5 set `grow/prompt-lab/` (on main since c452679) and the art director's v6 set `grow/prompt-lab/v6/` (a4cebb6; the default, `--set v5` for the other; a file missing in v6 falls back to v5). v5: twelve variants, each one change, on the type specimen of S01, S09 and S12, on `gemini-3.1-flash-image` and `gemini-3-pro-image`, two samples a cell; outputs under `grow/lab/<species>/<variant>/<flash|pro>/s<k>/` with `prompt.json`; one sheet per species, `grow/sheets/lab-<species>.png`. The checks are logged, not gated: the eye decides.
- **Spend**: all Gemini calls are in `grow/prompts.json` with cost; `python3 grow/service.py report` sums them into `grow/costs.json`.

## How to run

```sh
cd prototypes/workbench
node framework/build-frames.mjs && node --test tests/*.test.mjs       # after any rig or catalogue change
node sketch/cli.mjs --species S09 --set 5                             # the reference set (controls come from it)
python3 grow/lab.py --species S09 --variants v5,1G-markings-positive --samples 2   # the lab (paid; skips cells already on disk; --models flash|pro)
python3 grow/lab.py --sheet                                           # the sheets only
python3 grow/service.py paint --species S01 --members 6 --control twostep --views portrait --sub twostep   # a full set with variant B (paid)
python3 grow/service.py report                                        # costs.json and the service's sheets
```

`GEMINI_API_KEY` comes from the environment; if it is missing, say so, do not work around it.

## Pending

1. **The v5 lab.** The owner picked Pro with 1B plus 1G's coat paragraph from the Loika sheet (the lab synthesises it as `1BG-anti-artefact-plain`). S01 and S09 priority cells are done (`sheets/lab-S01.png`, `lab-S09.png`); S12 and the remaining v5 variants are not run and are no longer asked for.
2. **The v6 lab** (the art director's set) is run and reported (d71b4c2): v6 and its three variants (6A no style line, 6B contact shadow, 6C Pip-style eyes) on Pro only, two samples, S01, S09, S12; one sheet per species `sheets/lab-<species>-v6.png` with the v5 1B Pro row on top; cells under `grow/lab/<species>/v6/`; $4.94. Findings: S01 v6 is the closest to Pip yet and 6C's eyes are the one clear gain; S09 re-lays its wings up or spread under v6 (checks fail; 1BG on Pro remains its best); S12 passes step 1 on both samples for the first time, 6A's backdrop goes photo-like without the style line. Engineer's pick: v6 with 6C's eye paragraph on Pro for the Loika and the Peplos, 1BG for the Belatz until the wing wording is settled. No full run until the owner picks.
3. **`description.v5.md`** in `grow/prompt-lab/` is the prompter's target for the next change to `framework/describe.mjs` (colours placed on parts, proportions said once, posture): not needed for the lab run, owed after it.
4. **The species references** for S09 and S12 (`grow/species/`) were painted on the old rig and carry its faults; repaint from a v6 type specimen once the prompt settles.
5. **Kind targets** for S06, S10, S11 to be redrawn under the envelope.
6. The S12 token at 48 px: the tile camera fits the mesh bounds; fit it to the visible silhouette.

## Open rig faults the prompter named

- Fixed: the Loika's crest colour (now the leaf slot, green); the Belatz's wedge feet (now rounded); the flat Peplos wing (now folded, E9).
- Fixed: the key pass and the slot map now show a coat, flap, cap or shell marking field in the second pigment, so the description's markings, the key and the slot check agree (the Loika type specimen has patches on).
- Still open: the S09 and S12 reference paintings themselves show the old block feet and plank wing; words cannot fix that, a repaint can.

## Reading the lab's results

`grow/lab/<species>/<variant>/<model>/s<k>/prompt.json` holds the variant, the model, the cost, the checks of step 1 (drawing tolerance 25 %) and step 2, and the image order sent. The step texts are in `prompts.json` under `fields.text`. A step 2 variant takes the shared drawing: the first v5 step 1 sample that passed on that model.
