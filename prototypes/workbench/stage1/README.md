# Stage 1 cut-off trial

The first paid run of [art-pipeline.md](../../../design/proposals/art-pipeline.md) v2 §9, on 2026-10-08, from the programme lead's brief: control sets for three individuals each of S01 Loika, S09 Belatz and S12 Peplos from the workbench CLI by genome hash; the unique Station set per individual painted by a cloud model from the controls; the smaller sizes derived two ways; one side-by-side sheet per species at device size with the cost of each cut-off beside it. This is the generation trial only: nothing here is accepted art, no painted master or studio screen was touched, and no individual render here is a product render.

**Spent: $1.69.** Twelve Gemini image calls at $0.090–0.109 each (`gemini-3.1-flash-image`, 1K output, $1.152 in all, measured from the usage metadata at the standard-tier prices of 2026-10-08) and three Retro Diffusion token calls at $0.18 each ($0.54; balance $7.62 → $7.08). Every call is in [prompts.json](prompts.json) with its prompt, image inputs by name and SHA-256, response id (Gemini `responseId`, Retro Diffusion task id), usage, cost and seconds. No key material is stored anywhere here.

## What is here

- `controls/<species>/<individual>/`: the main-view controls at the four sizes (shaded, slots, index, silhouette at tile 48, Companion 280×300, Station 300×310, large 600×620), the genome and the manifest, copied from `out/reference/` as `node sketch/cli.mjs --species S01 --set 3` writes them; the type specimen and three random individuals per species, each addressed by its genome digest and SHA-256 (`index.json`). The same digest gives the same controls on any machine.
- `unique/<species>/<individual>/`: the painted Station master at 600×620 and the Station size 300×310; the Companion 280×300 and the 48 px token **derived** from it; the Companion and token **generic** per species (the type specimen's painted set with the pigment slots remapped to the individual's pool values); for one individual per species the token **painted at size** by Retro Diffusion. The raw 1024×1024 model outputs (12 × ~0.7 MB) are not committed; their SHA-256 is in prompts.json.
- `sheets/<species>.png`: the side-by-side at 1×: unique Station, the plain version (the rig's shaded pass, not yet finished to the style guide), Companion derived and generic, token derived, generic and painted at 1× and 3×, each column with its cut-off cost, each row with the individual's digest and its validation scores.
- `measurements.json`, `costs.json`, [trial.py](trial.py) (`controls`, `paint`, `token`, `fetch`, `derive`, `sheets`; the paid steps are `paint` and `token`).

## The call

One request per individual to `gemini-3.1-flash-image` (`generateContent`, `responseModalities: ["IMAGE"]`, 1:1, 1K): the fixed template filled with frame facts (the species, the caption from the manifest, juvenile, idle) and the slot legend as the palette lock; four images in order: the shaded pass (form and light), the slot pass (the colour key), the index pass (the part map), all at 600×620 padded to a 620 square on the sketch background, and the accepted Pip at Station size (`art/miniature-lives/assets/rich-plain-300x310.png`) as the style reference. Mean 9.3 s a call (7.8–11.8), 1,356 prompt tokens (1,032 of them the four images) and 1,120 image output tokens plus the model's own text tokens, $0.096 mean. The output is JPEG at 1024²; it is scaled to the 620 square, cropped to the 600×620 master, and fitted to each control's silhouette bounds for the smaller sizes (the Station's rule in the proposal: scale and centre by bounds, quantise the subject to the 48-colour Companion palette, keep the flat background).

## Cost per mibi at each cut-off

Measured Station call $0.096; three life stages; retries at 20 percent as the proposal assumes; token at size $0.18 (Retro Diffusion `rd_pro__default`, 48², palette, two references).

| Cut-off | Calls a stage | Per mibi | With retries | Per kit-year (40 mibis) |
| --- | ---: | ---: | ---: | ---: |
| A. everything at size (Station main and side, token painted at size; the Companion derived here, since painting at 280 px needs a model that stops there) | 3 | $1.12 | $1.34 | $53.56 |
| B. down to the Companion (Station main and side; Companion derived; token generic) | 2 | $0.58 | $0.69 | $27.64 |
| C. Station main only (Companion derived; side plain; token generic) | 1 | $0.29 | $0.35 | $13.82 |
| D. adult only | ⅓ | $0.10 | $0.12 | $4.61 |

Against the proposal's assumptions ($0.10 a call): the same to the cent for C and D; B and A are within a dollar a year of its table. The side view was not painted in this trial; B and A assume it costs what the main view costs.

## What the sheets show

- **Identity holds at the Station for the Loika (S01).** All four keep the pose, parts and slots; silhouette IoU against the control 0.91–0.97. The individual with teal flank markings and a lime belly (seed 3) keeps them in the derived Companion and token and loses them in the generic ones: that is the tell-apart the proposal's blind check will ask.
- **The bird (S09) moves.** Two of four sit at 0.77: the model keeps every part but turns the body or re-lays the wings; the two at 0.88 and 0.94 are the rule, the two at 0.77 the retry case (§5: one named retry, then plain). The generic set is weakest here: the type specimen's slot colours are far from two individuals' pools, so the remap leaves the generic token a different bird from the unique one at 48 px.
- **The moth (S12) is painted thin.** The flat, half-translucent wing pair comes out as a glass slab; the body, antennae and legs hold (0.73–0.95). The translucency dither in the slot pass is read as a material, which is what the contract says it is; whether that is the look is the art director's call.
- **The token painted at size is not usable** on these three: Retro Diffusion turns the Station render into a dark silhouette with the palette's deep steps (the same failure the 10-07 trial logged for small sprites with references). The derived token (quantised from the unique Station) is the better 48 px picture in all three species, and the generic token is the same picture with the species' colours: at 48 px the two differ only by pigment, as Decided 4 expects.
- **The plain version** beside each is the rig's shaded pass as it is; §3's finish (outline from the index, quantised ramps, eye catch light) is not built yet, so the offline comparison is not yet fair to it.

## Not done, and why

The side view and the three life stages (§9.2) were not painted: the main view answers the cut-off question this run was asked for, and each adds a call per individual. The Companion painted at size (§9.3 c) needs a model that paints at 280 px; the Gemini family starts at 512. The blind checks (§9.5) need the owner and two testers with the sheets. Latency was measured per call, not per batch. The validator of §5 is the silhouette IoU only; the index-part and slot-colour checks are not built. Threshold suggestion from this run: a Station silhouette IoU under 0.85 is the retry case.

## To run it again

```sh
cd prototypes/workbench
node sketch/cli.mjs --species S01 --set 3 && node sketch/cli.mjs --species S09 --set 3 && node sketch/cli.mjs --species S12 --set 3
cd stage1 && python3 trial.py controls && python3 trial.py paint && python3 trial.py derive && python3 trial.py token && python3 trial.py sheets
```

`paint` and `token` are paid and skip any call prompts.json already holds as ok; `GEMINI_API_KEY` and `RETRO_DIFFUSION_API_KEY` come from the environment. Python 3 with Pillow is enough.
