# The Grow painting service

The standard look of every mibi is its Grow painting: the cloud model's Station-size painting over the rig's control passes, derived down to the Companion and the token ([art-pipeline.md](../../../design/proposals/art-pipeline.md) v2, the lead's briefs of 2026-10-08). This is that service, run on the sandbox VM: a genome in, the painted set out, checked, with one named retry, the files laid out by genome hash, every call logged with its cost. Nothing here is accepted art; no painted master or studio screen was touched.

**Spent: $26.51** over four prompt versions, 277 Gemini calls (`gemini-3.1-flash-image`, 1K output, $0.096 a call mean). Every call is in [prompts.json](prompts.json) with its fields, image inputs by name and SHA-256, response id, usage, cost, seconds and the checks it passed or failed. No key material is stored. The current state is **prompt v4**, reported first below; v3's re-run follows; v2 (the three-field prompt with the silhouette gate) and v1 (the stage 1 template) stay in prompts.json by `promptVersion`, and each individual's v2 outputs stay under `out/<species>/<sha>/v2/`.

## What is here

- `controls.mjs` (Node, no dependencies): the control step. One genome in; under `out/<species>/<sha256[:16]>/` its `genome.json`, `controls/` (shaded, **key**, slots, index and silhouette passes at four sizes in the portrait and side views, translucency rendered flat; `legend.json` with the caption, the description in trait words, the slots with pigments, the parts with their index colours) and `plain/` (the placeholder set, `framework/plain.mjs`). Same genome, same bytes, same directory.
- `service.py` (Python, Pillow): `paint` (the calls, the checks, the retry, the derived sizes, the manifest; `--control blurred|crisp|lowres|twostep`, `--views`, `--sub` for a trial kept beside the main outputs), `calibrate` (the checks on the stage 1 paintings, or with `--previous` on the last run's raw outputs, no calls), `recheck` (every attempt of the prompt version re-judged from its logged raw output with the checks as they stand, the as-run verdicts kept, the served outputs rewritten; `--complete` makes variant B's missing step 2 calls), `report` (`costs.json` and the sheets). `GEMINI_API_KEY` comes from the environment.
- `art-direction.txt`: the fixed art direction field.
- `species/<species>/`: the species' reference painting (its type specimen, painted once with the accepted Pip as its reference) and `reference.json`. The Loika's reference is the accepted Pip itself.
- `out/<species>/<sha256[:16]>/`: per individual the painted `station-portrait-600x620.png` and `-300x310.png`, `station-side-…`, the derived `companion-280x300.png` and `token-48.png`, `manifest.json` (the genome's hashes, the description, the reference used, per view the attempts with their checks and cost, the served outputs with SHA-256); `v2/` the previous run's outputs; `variants/<trial>/` the control trials and variant B (`step1-portrait-…` the HiBit drawing beside the step 2 painting). `controls/`, `plain/` and the raw 1024² outputs (`raw/`) are not committed: the controls and the placeholder are reproducible from the genome, the raw outputs' SHA-256 are in prompts.json.
- `sheets/<species>.png`: the owner's sheet, device size at 1×, per individual: the previous run's portrait (v2), **A** the portrait and side (one step, blurred control, structural checks), the derived Companion and token, the shaded control as sent, the crisp and low-res control trials, **B** the two-step portrait (step 2, the rich treatment) and its step 1 HiBit drawing; per row the digest, the cost and per view the status, calls and scores. `sheets/prompt-v1/` keeps the first version's Loika sheet.

## The prompt lab

The owner's direction after the envelope: iterate the prompt on one reference individual per species, one change at a time, and run the full set only once a variant looks right; and if Flash is not up to it, go Pro, the cute-pet bar before cost. `lab.py` runs N prompt variants against the same controls and reference on both `gemini-3.1-flash-image` and `gemini-3-pro-image` (the two-step recipe, two calls a try: about $0.19 on Flash, $0.33 on Pro), logs every call in prompts.json with `lab: {species, variant}`, writes `lab/<species>/<variant>/` (the step 1 drawing, the step 2 painting, `prompt.json` with the fields and the changed text) and lays one sheet per species, `sheets/lab-<species>.png`: control, Flash's step 1 and step 2, Pro's step 1 and step 2, and the variant's changed text beside each with the cost per try on each model and the checks (logged, not gated). A variant may say `images: "index-key"` to send the part map first and the key second in step 1. The reference individuals are the type specimens under the cute envelope: the Loika (S01), the Belatz (S09) and the Peplos (S12), the last with its wings folded (E9).

The variants are **held** until the art prompter's prompt set lands under `grow/prompt-lab/`; the lab reads it when present (`variants.json`, a list of `{id, name, change, step1?, step2?}` whose step texts are used as written, with `{controls}`, `{description}`, `{species}`, `{artDirection1}`, `{artDirection2}`, `{generate}`, `{transfer}` as placeholders; `art-direction-step1.txt` and `art-direction-step2.txt`, the v5 blocks; `species/<species>.txt`, the material words; `description-template.txt` with `{description}` for the genome's words; a missing file falls back to the lab's own). Without the set, the lab's own eight one-change variants (surface words, anti-artefact words, posture words, eye words, a negative list, field order, the owner's craft block) stand ready in `lab.py`; only the Loika's baseline (v0) was run before the hold, as the sheet's proof of the mechanics.

The three fields the lab works separately: the art direction block (the fixed craft rules), the species sheet (`species-sheets/<species>.json`: material and signature words, the surface words, the reference painting), and the genome description (`framework/describe.mjs`: looks, colours, markings, proportions and, since this round, posture, in plain words).

## Prompt v4: the cute envelope, tested on the worst cases

The owner's reframing after the v3 re-run: the painter was faithfully painting the wrong structure, and the aim is not a Pip replica but that every genome expression yields a cute pet. So the rig got a **cute envelope** (`framework/envelope.mjs`, eight rules E1–E8 with their reasons, applied as clamps and derived ratios in the rig and as pool bounds in the frames; the workbench README lists them), with Pip's measures as one calibration point for the Loika (catalogue 9: a wide, deep, ovoid body, a huge eye at the head's middle, a stub cream snout, a belly field half the depth, rounded feet, a leaf crest). Variant B is the recipe: crisp controls, step 1 draws only the markings the description names with a drawing's proportion tolerance of 25 %, step 2 transfers the treatment with the species reference (the accepted Pip for the Loika).

**The test** (`grow/extremes.mjs`): every open proportion locus of S01, S09 and S12 rolled to its extremes and the corners (all low, all high, alternating, small head with a big body and the reverse), the controls rendered, the ugliest by my eye painted with B beside the type specimen. S09 has fourteen open proportion loci (43 cases; the twelve ugliest: the low head lift, the long beak, the thin waist, the down-bent back, the narrow body, the deep body, and the six corners); S01 and S12 have one each (eye size; hind-body taper), so their extremes collapse to two distinct genomes apiece. Contact sheets `sheets/extremes-<species>.png`; the painted sheets `sheets/extremes-<species>-B.png` (control, step 1, step 2, the locus values of the case); the Loika's calibrated individuals and the Pip-silhouette experiment `sheets/S01-pip.png`.

| | S09 worst cases (13) | S01 (2) | S12 (3) | S01 calibrated individuals (6) | Pip's own silhouette as the control |
| --- | ---: | ---: | ---: | ---: | ---: |
| step 1 passes first attempt | 3 | 1 | 0 | 2 | 0 (then yes) |
| served painted | 9 of 13 | 1 of 2 | 0 of 3 | 5 of 6 | yes |
| calls, cost | 32, $3.09 | 4, $0.39 | 6, $0.59 | 13, $1.26 | 3, $0.29 |

Prompt v4 spent $5.39 in 57 calls; all versions $26.51.

What the sheets show:

- **The Loika on the calibrated rig is a pet** (`S01-pip.png`): round body, big eyes, cream snout and belly, leaf crest; beside each the previous B on the old rig is a boxed dog. The step 2 paintings are the closest to Pip of any run. The type specimen itself failed step 1 twice on the slot check (the drawing split the body into a dark cap and a cream body) and is served plain; its five individuals passed.
- **The experiment** (last row of `S01-pip.png`): with Pip's own HiBit silhouette and pigments as the control, step 1 draws a near-Pip and step 2 paints a Pip-like Loika that passes every check. The painter does what it is given: the structure is the lever, as the owner read.
- **The bird's worst cases hold** (`extremes-S09-B.png`): under the envelope the small-head and all-low corners keep a head and eyes a pet reads with, and 9 of 13 cases are served as cute birds; the long beak with huge eyes (all-high), the alternating corner, the narrow body and the down-bent back failed step 1 twice, on the slot check (the drawing recolours the wings or the belly) and the band (a re-laid wing). Step 1 passes first attempt only 3 of 13 times: the drawing step is the loose one, the transfer is reliable.
- **The moth is the envelope's open problem** (`extremes-S12-B.png`): none of its three cases passed step 1; the drawings add coloured blobs and re-lay the flat wing. The envelope says nothing yet about a flat flap pair laid over the back, and the moth's portrait is a board with legs; its token is unreadable for the same reason. A flap rule (a resting wing pair folded along the body, not a flat plane) is the next envelope rule.
- **Under the envelope, 13 of 16 species still read as their kind** by the parts check; the raccoon, the otter and the turtle sit within 0.03 of their hand-drawn targets, drawn to the old shapes, to be redrawn.

## The call (prompt v3)

One request per view (`generateContent`, `responseModalities: ["IMAGE"]`, 1:1, 1K). Four fields, logged separately so each can be tuned:

1. **artDirection** (fixed): the Miniature Lives look and the Station treatment from the style guide, what the painter may not change, the flat ground.
2. **controls**: what images 1–3 are and what they lock: the shaded pass (form and light), the **key** pass (every slot flat in its own pigment, with the slot legend), the index pass (the part map, named as labels not paint, with the part list), the view phrase, the flat-membrane instruction for a translucent species, and since v3: "the drawings show structure and proportion only; their flat facets, hard edges and small eyes are not the look: render the volume, the softness, the face and the finish as image 4 does, over this structure".
3. **description**: the genome in the player's words (`framework/describe.mjs`): the caption, the looks per chapter as the frame names them, the proportions in plain words from the rig's ratio loci; for a type specimen the clan's "resembles" and signature. Never a locus id.
4. **reference**: image 4, the species' type specimen painting (for the Loika the accepted Pip). For the side view image 5 is the individual's own painted portrait.

The control variants: **blurred** (the default this run: the shaded pass under a 5 px Gaussian at 620, the key and index crisp), **crisp** (as rendered), **lowres** (every control at 256²). **Variant B (`twostep`)**, as the Loika itself was made ([art/miniature-lives/prompts.json](../../../art/miniature-lives/prompts.json)): step 1 draws a HiBit pixel drawing from the softened key and index passes, the description and the Loika's own generate words (rounded ceramic volumes, three or four value masses, designed on a 280×300 grid), with the Miniature Lives concept board as the material reference, checked for structure with one named retry; step 2 style-transfers the drawing to the rich treatment with the invariants stated in words ("CHANGE ONLY RENDERING TREATMENT") and the species reference as image 2, treatment only: its checks are logged, not gated. Two calls per view.

The output (JPEG 1024²) is scaled to the 620 square and cropped to the 600×620 master; the Station 300×310, the Companion 280×300 and the 48 px token are fitted to the control silhouette's bounds (the Station's rule), the Companion and token quantised to the kit's 48 colours.

## The checks (v3: structural, the painter owns the volume)

The silhouette IoU is reported, not gated. A failure is named in a second call; a second failure serves the plain placeholder for that view. Calibrated on the twelve stage 1 paintings (`calibrate`) and on the previous run's raw outputs (`calibrate --previous`); on the stage 1 set the structural gate alone passes the two mildly turned birds (their parts are still where drawn, within the band), which the slot check then rejects.

| Check | Measure | Gate |
| --- | --- | --- |
| band | the paint outside the drawn body dilated by a band of 4 % of its size, and the drawn body eroded by the band left unpainted, each as a share of the body | ≤ 10 % each |
| parts (the index pass as the second control) | for every part ≥ 2 % of the body, the share of its drawn length (along its longer axis) where the band round it holds paint: a part painted thinner or rounder passes, a part dropped, moved or re-laid fails | span ≥ 0.60 |
| proportions | for every part ≥ 5 % of the body, its painted extent within the band over the painted body's extent, against the drawn part's over the drawn body's | within 15 % + the band |
| slots | for every slot × part cell ≥ 5 % of the body, the median paint under the slot map (eroded 3 px) must not be clearly nearer another gated slot's pigment in Lab (own distance ≤ 1.5 × nearest + 8) | every cell |

The part check went through three forms this run: pixel coverage (biased against thin legs), box overlap (biased to ≈ 0.5 for any thin part) and the span above; every attempt was then re-judged from its raw output (`recheck`), so no verdict depends on which form was live when it was painted. The as-run verdicts are kept per attempt as `checksAsRun`.

## Results, prompt v3 (18 individuals: the type specimen and five random individuals each of S01, S09, S12)

| | A: one step, blurred control, both views | crisp control (6 portraits) | low-res control (6 portraits) | B: two steps (18 portraits, 3 sides) |
| --- | ---: | ---: | ---: | ---: |
| calls | 50 | 7 | 10 | 52 (46 in the manifests: the type specimens' portraits were painted twice) |
| cost | $4.75 | $0.67 | $0.97 | $5.04 |
| per individual (retries included) | $0.264 (2.78 calls, two views) | $0.111 (one view) | $0.162 (one view) | $0.249 (one view, 2.56 calls) |
| first-attempt pass | 61 % (22 of 36 views) | 83 % | 33 % | 39 % (step 1) |
| served painted | 26 of 36 views (13 portraits, 13 sides) | 6 of 6 | 5 of 6 | 7 of 18 portraits, 3 of 3 sides |
| per mibi, three stages, two views | $0.79 | | | about $1.50 |

Prompt v2 for comparison (silhouette gate, crisp control): $0.282 an individual, 53 % first attempt, 30 of 36 views served.

## What the sheets show

- **Blurring the control changes nothing about the boxiness.** The painter copies the silhouette, and the box is the rig's silhouette, not its facets; the key and index passes carry it crisp whatever the shaded pass does. Beside the v2 portraits the A portraits are the same boxy creatures, and the blur costs fidelity: crisp passes 83 % first attempt on the same six portraits, blurred 61 %, low-res 33 %. Send the control crisp.
- **Variant B is the one that rounds.** Where its step 1 drawing passes, the two-step portrait is the roundest and most Pip-like result of any run (the Loikas S01-dff664e3 and S01-f1e0907d, the birds S09-267acdba and S09-584f4353): the HiBit drawing re-sculpts the volumes, as the Loika's own making did, and step 2 keeps them. The step 2 painting then passes the structural checks it is not gated on in 7 of 8 cases: the drawing is a sound structural authority.
- **But step 1 passes structure only 39 % first attempt, and 11 of 18 portraits ended plain.** Two causes, both in the step 1 words, not in the model: the Loika's generate words carry "pale coat markings stay stronger than lighting", and the drawing invents cream spots and rings the genome does not have (the slot check rejects them, rightly: art never changes genes); and the drawing enlarges the head beyond the 15 % proportion tolerance. The fix is to say "only the markings the description names" and to give step 1 the proportion tolerance of a drawing (about 25 %), not of a repaint.
- **The structural gate is lenient on a mild turn.** On the stage 1 set the two turned birds pass band, span and proportions (their parts are still where drawn within a 4 % band); the slot check caught them. If a turned body must fail on structure alone, the band must narrow to about 2 %, at the cost of the roundness the gate was loosened for.
- **The side view is still the weak view** in A (5 of the 10 plain views) and the strong one in B (3 of 3, with the step 2 portrait as image 3).
- **The S12 token** is unreadable at 48 px for the reason noted before: the tile camera fits the type specimen's mesh bounds, which the hind flap pair widens (rig side).

## To run it again

```sh
cd prototypes/workbench
node sketch/cli.mjs --species S01 --set 6 && node sketch/cli.mjs --species S09 --set 5 && node sketch/cli.mjs --species S12 --set 5
python3 grow/service.py calibrate                                   # no calls; --previous for the last run's raw outputs
python3 grow/service.py paint --members 6 --control crisp           # paid: the species references first, then 6 individuals each of S01, S09, S12
python3 grow/service.py paint --members 6 --control twostep --views portrait --sub twostep   # variant B beside the main outputs
python3 grow/service.py recheck                                     # re-judge from the raw outputs after a change to the checks
python3 grow/service.py report                                      # costs.json and the sheets
```

`paint` skips an individual whose manifest already holds this prompt version; `--force` repaints.
