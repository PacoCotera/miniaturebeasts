# The Grow painting service

The standard look of every mibi is its Grow painting: the cloud model's Station-size painting over the rig's control passes, derived down to the Companion and the token ([art-pipeline.md](../../../design/proposals/art-pipeline.md) v2, the lead's brief of 2026-10-08). This is that service, run on the sandbox VM: a genome in, the painted set out, checked, with one named retry, the files laid out by genome hash, every call logged with its cost. Nothing here is accepted art; no painted master or studio screen was touched.

**Spent: $9.68** over two prompt versions, 101 Gemini calls (`gemini-3.1-flash-image`, 1K output, $0.096 a call mean, 8.5 s). The second version, the one reported here, cost **$5.07 for 18 individuals: $0.282 an individual** (two views, retries included, 2.94 calls), **$0.845 a mibi over three life stages**, $33.80 a kit-year at 40 mibis. Every call is in [prompts.json](prompts.json) with its fields, image inputs by name and SHA-256, response id, usage, cost, seconds and the checks it passed or failed. No key material is stored.

## What is here

- `controls.mjs` (Node, no dependencies): the control step. One genome in; under `out/<species>/<sha256[:16]>/` its `genome.json`, `controls/` (shaded, **key**, slots, index and silhouette passes at four sizes in the portrait and side views, translucency rendered flat; `legend.json` with the caption, the description in trait words, the slots with pigments, the parts with their index colours) and `plain/` (the placeholder set, `framework/plain.mjs`). Same genome, same bytes, same directory.
- `service.py` (Python, Pillow): `paint` (the calls, the checks, the retry, the derived sizes, the manifest), `calibrate` (the checks on the stage 1 paintings, no calls), `report` (`costs.json` and the sheets). `GEMINI_API_KEY` comes from the environment.
- `art-direction.txt`: the fixed art direction field.
- `species/<species>/`: the species' reference painting (its type specimen, painted once with the accepted Pip as its reference) and `reference.json`. The Loika's reference is the accepted Pip itself.
- `out/<species>/<sha256[:16]>/`: per individual the painted `station-portrait-600x620.png` and `-300x310.png`, `station-side-…`, the derived `companion-280x300.png` and `token-48.png`, and `manifest.json` (the genome's hashes, the description, the reference used, per view the attempts with their checks and cost, the outputs with SHA-256). `controls/`, `plain/` and the raw 1024² outputs (`raw/`) are not committed; the controls and the placeholder are reproducible from the genome, the raw outputs' SHA-256 are in prompts.json.
- `sheets/<species>.png`: the owner's sheet, device size at 1×: the accepted Pip as the bar, then the type specimen and five individuals as the painted Station portrait and side, the derived Companion, the token at 1× and 3×, the plain placeholder and the control's shaded pass; per row the digest, the cost, and per view the status, calls and scores. `sheets/prompt-v1/` keeps the first version's Loika sheet and costs for comparison.

## The call

One request per view (`generateContent`, `responseModalities: ["IMAGE"]`, 1:1, 1K). Four fields, logged separately so each can be tuned:

1. **artDirection** (fixed): the Miniature Lives look and the Station treatment from the style guide, what the painter may not change, the flat ground.
2. **controls**: what images 1–3 are and what they lock: the shaded pass (form and light), the **key** pass (every slot flat in its own pigment, with the slot legend), the index pass (the part map, named as labels not paint, with the part list), the view phrase, and for a translucent species the flat-membrane instruction.
3. **description**: the genome in the player's words (`framework/describe.mjs`): the caption, then the looks per chapter as the frame names them ("markings pale patches; crown leaf crest; eye rings wide pale rings"), then the proportions in plain words from the rig's ratio loci ("a big head, a short muzzle, short legs, a stout build"); for a type specimen the clan's "resembles" and signature. Never a locus id.
4. **reference**: image 4, the species' type specimen painting (for the Loika the accepted Pip), "the finished look to match exactly; this creature is one of that kind and differs from it only as the description and the drawings say". For the side view image 5 is the individual's own painted portrait, so the two views are one creature.

Then the three control images at 600×620 padded to a 620 square, the reference, the portrait for the side view. The output (JPEG 1024²) is scaled to the 620 square and cropped to the 600×620 master; the Station 300×310, the Companion 280×300 and the 48 px token are fitted to the control silhouette's bounds (the Station's rule), the Companion and token quantised to the kit's 48 colours.

## The checks

Three checks on the master against its controls; a failure is named in a second call ("a previous painting was rejected because …"), and a second failure serves the plain placeholder for that view. Thresholds were calibrated on the twelve stage 1 paintings (`calibrate`), where they agree with the stage 1 README's reading row for row: the Loikas pass, the two turned birds and the two glass moths fail.

| Check | Measure | Gate |
| --- | --- | --- |
| silhouette | IoU of the painted subject (fitted by bounds) against the control silhouette | ≥ 0.85 |
| parts (the index pass as a second control) | for every part ≥ 2 % of the body, the share of its index mask (eroded 2 px) covered by paint: a turned body or a re-laid wing leaves a part uncovered | every part ≥ 0.50 |
| slots | for every slot × part cell ≥ 5 % of the body, the median paint under the slot map (eroded 3 px) must not be clearly nearer another gated slot's pigment in Lab (own distance ≤ 1.5 × nearest + 8) | every cell |

## What the sheets show

- **The painter follows the rig.** The checks hold the painting to the control, and the control is the rig's faceted mesh: so the Loika is painted as a boxy body with a spiked crest, a bulb muzzle and small eyes, cleanly shaded, and not as Pip, whose roundness, big eyes and leaves are in the sculpt. The reference painting pulls some heads and eyes toward Pip (S01-f19cba31) at the cost of silhouette drift and retries. **The Grow painting's quality is bounded by the rig's volume**: finer tessellation, rounder primitives and the eye size are the next lever, not the prompt.
- **The key pass fixed the colour leak.** The first smoke test painted a blue bird with a red torso: the slot map's label colours were read as paint. With the key pass (the pigments themselves) the slot check passes at 0.9–1.0 for most views.
- **The flat tint fixed the glass.** The moth's flaps paint as pale tinted membranes with the body's spots or bars, not as glass slabs; the slot check still rejects a flap painted in the body's colour (the S12 type specimen, twice, so its individuals used Pip as their reference).
- **The side view is the weak view**, above all for the bird: the wings in profile are one edge-on plane in the control and the painter re-lays them; 5 of the 6 views served plain are side views. The retry rate (17 of 36 views) is mostly the side.
- **Prompt v1 → v2.** Adding the description and the species reference raised the per-individual cost from $0.255 to $0.282 and lowered the first-attempt pass rate from 68 % to 53 %: the reference makes the painter sculpt toward Pip, which the silhouette check then rejects. Both sets of calls are in prompts.json by `promptVersion`.
- **The token.** The S12 token is unreadable at 48 px: the camera is fitted to the type specimen's mesh bounds, and the moth's hind flap pair widens them, so the body sits in a corner of the tile. A camera fit to the visible silhouette is the fix (rig side).

## To run it again

```sh
cd prototypes/workbench
node sketch/cli.mjs --species S01 --set 6 && node sketch/cli.mjs --species S09 --set 5 && node sketch/cli.mjs --species S12 --set 5
python3 grow/service.py calibrate                 # no calls
python3 grow/service.py paint --members 6         # paid: the species references first, then 6 individuals each of S01, S09, S12
python3 grow/service.py paint --species S09 --digest S09-bb2b96cc   # one genome, by digest or --genome g.json
python3 grow/service.py report                    # costs.json and the sheets
```

`paint` skips an individual whose manifest already holds this prompt version; `--force` repaints.
