# Prompt v6: art director's review of the Loika lab sheet

This review judges `sheets/lab-S01.png` (rows v5, 1B, 1G and 2C; columns Flash and Pro, each with a drawing and a painting) against the accepted Pip, `art/miniature-lives/assets/rich-plain-300x310.png`. The owner picked Pro with 1B, plus 1G's coat paragraph. v6 builds on that choice. Nothing here has been run, and nothing here is accepted art.

## The sheet against Pip

**What works.** Pro 1B is the best row on the sheet. Both samples pass step 1. They have one round fruit-shaped body, plump cream legs with toe bumps and leaves that read as leaves, with no boxes, facets or invented patches. Sample 1 is the closest painting to Pip of any run.

**Where Pro falls short of Pip:**
- **Surface.** Pip's skin is smooth, matte and suede-soft, with the texture felt rather than seen. Pro paints visible hair, a fuzzy halo along the back and a flocked look. The cause is v5's Loika notes, "soft charcoal fur, short and dense like velvet". The genome says `skin` and `smooth`, so the prompt asked for something the genome does not have.
- **Light.** Pip has a clear key light from the top left, a lit crown, a cool shaded underside and occlusion where the legs meet the body. The lab paintings are lit evenly from the front, and the charcoal reads as one flat value. v5 has no light paragraph in step 2, only "one key light" in a list of adjectives.
- **Eyes.** Pip's eye has a glossy orange iris, a dark pupil, a lid line and a catch light inside a cream ring. Pro sample 1 has amber eyes and sample 2 has grey "goggles". Nothing sets an iris colour, so each sample guesses.
- **Muzzle.** Pip has a cream lower face. Sample 2 paints a protruding bill, a platypus. The cause is "the snout is short, cream and rounded" placed over the rig's muzzle block.
- **Finish.** Sample 2 keeps step 1's dark contour line, a sticker outline. Pip has none. Sample 1 adds a soft cast shadow that the prompt forbids.
- **Consistency.** The two samples differ in eye colour, leg colour (sample 2 has charcoal upper legs where the key says cream) and muzzle. The two drawings already differ, so the drift starts in step 1.
- **Charm.** Pip's face is mostly eye, smile and cheek. The lab faces are mostly snout.

**Flash.** Flash is softer and noisier. Its charcoal drifts to brown, its eyes are dark with no iris, and its fur is grainy. Flash 1B lost sample 1's painting, and that drawing turned the cream legs charcoal. In the 1G and 2C rows, Flash, and Pro's 1G sample 2, turn the crest into charcoal hare ears. v5's notes say "charcoal on the body, the head and the crest". The key has since put the crest in its own green leaf slot, so the words now contradict the key.

**Patches, a rig finding.** The type specimen's genome has markings on (patches, high extent, high contrast). The description sends "Coat: markings pale patches", but the key pass shows no marking area. v5's "only those the description names" invited the patches, and the slot check then rejected them. 1G helped because it points at Image 3. Before anyone calls the patches invented, `describe.mjs` and the key pass have to agree.

## Changes (was / now / because)

| Was | Now | Because |
| --- | --- | --- |
| 1B's two limb sentences, plus "Not: boxes, blocks, facets, planks, boards…" | one sentence of anatomy and one negative list in step 1; step 1's list cut to dither, noise, black outlines, scene, shadow, text | The same words appeared twice. Negatives that are named may prime the result, and the block was 256 words. |
| v5's markings paragraph | 1G's coat paragraph, plus "Markings Image 3 does not show stay undrawn" | It makes the key the authority on colour wherever the key and the description disagree. |
| "Image 3 is the colour key: the pigment of each area" | "the colour key, the authority on colour" (both steps) | Leg and crest colours drifted. |
| "Miniature Lives: rounded, tactile, saturated, never dull" | a **Style** line in both steps | A list of adjectives is not a style. |
| Step 2: "one key light… warm highlights, cool shadows" | a **Light** paragraph: warm key from the top left, highlights on the crown, cheek and shoulder, a cool fill, the underside in shadow, occlusion, and edges that turn by light | Every painting was flat-lit. |
| Step 2: no word on outlines | "No outlines… a faint warm rim" | Sample 2's sticker line |
| "Eyes … read large, wet and lit, with a catch light" | "a large glossy iris filling the ring, a bright catch light upper left" | The eyes were empty goggles. |
| Step 2 reference: "material, finish and light" | "surface, light, eyes and charm" | Pip is the bar for the face too. |
| S01: "soft charcoal fur … like velvet" | "smooth, soft charcoal skin like suede … no visible hairs" | This matches the genome (skin, smooth) and Pip. |
| S01: crest "charcoal" | "the crest leaves are green" | This matches the key's leaf slot and ends the hare ears. |
| S01: no eye colour | "a large amber-orange iris" | The style guide fixes the Loika's orange eyes, and the samples disagreed. |
| S01: "snout … short, cream and rounded" | "a soft, full-cheeked cream pad … never a bill" | The platypus muzzle in sample 2 |
| S01: crest "standing up" | "sprouting together from the crown and fanning outward; leaves, not ears" | Pip's leaves fan out as a tuft. |

**Loosened:** step 2 lets the edges "soften a few pixels as the volume asks", inside the 4 % band, so the painter can round the rig's silhouette. Step 1 drops the restatement of the "hard edges" rule. The negative lists are shorter.

**Tightened:** the key as the colour authority, the light, the outlines, the eye, the Loika's surface, crest colour and muzzle.

**Style statement:** step 1 reads "HiBit pixel art of a soft toy creature". Step 2 reads "a stylised animated-film character, like a soft vinyl collectible: full, rounded volumes; matte, soft-touch surfaces whose texture is felt, not drawn; saturated, playful colour."

S09 and S12 are unchanged copies. `description-template.txt` is copied so the folder is a complete set. To run, point the loader's `PROMPT_SET` at `prompt-lab/v6`.

## Three single-change variants (in `variants.json`, step 2)

**6A-no-style**: tests what the style statement buys.
```diff
- Style: a stylised animated-film character, like a soft vinyl collectible: full, rounded volumes; matte, soft-touch surfaces whose texture is felt, not drawn; saturated, playful colour.
```
**6B-contact-shadow**: grounds the creature as Pip is grounded. Watch the band check.
```diff
- Not: clay or plastic sheen, hair-by-hair strands, noise, cast shadow, halo, scene, text.
+ Not: clay or plastic sheen, hair-by-hair strands, noise, halo, scene, text. Only a small, soft contact shadow under the feet.
```
**6C-eyes**: Pip's eye construction, at the drawn size.
```diff
- Eyes keep their drawn place and size: a large glossy iris filling the ring, a bright catch light upper left.
+ Eyes keep their drawn place and size and are the heart of the face: a large glossy iris and dark pupil filling the ring, a soft lid line above, a bright catch light upper left and a small glint below.
```
6B's step 2 runs to 225 words and 6C's to 238, over the 220 limit for the base blocks. That is acceptable for a single-change test.
