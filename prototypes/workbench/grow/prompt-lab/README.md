# Prompt lab, v5

Before any full run, the v5 prompts are tested as single-change variants on one reference individual per species (S01 Loika, S09 Belatz, S12 Peplos), and every result goes on one sheet. Nothing in this folder has been run yet; nothing here is accepted art.

## Files

| File | What it is | The lab fills it as |
| --- | --- | --- |
| `art-direction-step1.txt` | The step 1 (HiBit drawing) block, 219 words: the image roles, then markings, the craft rules, the invariants and a short negative list | `{artDirection1}` |
| `art-direction-step2.txt` | The step 2 (rich transfer) block, 206 words, in the same order | `{artDirection2}` |
| `species/S01.txt`, `S09.txt`, `S12.txt` | The species notes: colour placement, surface in the drawing, surface in the painting, parts as living anatomy, posture, character | `{species}` |
| `description-template.txt` | How to read describe.mjs's v4 shorthand, wrapped around the genome's words | `{description}` |
| `description.v5.md` | The target for the next change to `framework/describe.mjs`, with one worked example per species | not sent |
| `variants.json` | The lab set: v4 as the reference row, the v5 baseline, seven step 1 and three step 2 single-change variants | read by the loader |
| `variants.md` | The plan: individuals, images, samples, the sheet, and each variant's exact diff and what it tests | not sent |

The v5 prompt is `{artDirection}` + `{species}` + `{description}`, in that order. Image order: step 1 is the index pass (crisp), the species reference and the key pass (crisp); step 2 is the step 1 drawing, the species reference and the key pass. Every variant also records its image order in variants.json.

## What changed from v4, and why

What the v4 sheets show: box limbs and block feet; the Peplos wing as a plank; Belatz wings as boards; invented cream patches and coloured blobs; re-laid wings; dull, clay-like surfaces.

- **The Loika's words were used for every species.** v4 step 1 sent Pip's generate text unchanged: "rounded ceramic/resin-like cheek, belly and back volumes" and "very restrained fine material texture". On a bird that gives a ceramic bird; on a moth it gives a resin moth. v5 adds a **species notes** field that names each surface the way the painter should hear it: "bright, layered feathers … a soft sheen along the wing coverts", "soft charcoal fur … over a warm cream lower face", "dusted membranes … with fine veins".
- **The words never said what a limb or a wing is.** v5 says limbs are living limbs, never boxes or unfinished 3D, and that feet carry weight. The species notes give the anatomy: Belatz bird feet with three toes and a back toe, the Peplos's jointed insect legs, a wing as a fan of feathers or a curved membrane.
- **v4 made the Peplos wing a board.** v4 told the painter to draw translucent wings "opaque as a flat pale tint … not as glass". v5 asks for a pale tint with veins and a lit edge in the drawing, and a dusted, faintly translucent membrane in the painting.
- **Image roles.** v4 step 1 sent softened key and index passes with the concept board. v5 sends crisp passes and **the species reference in place of the board**. Each role is stated first, and the control is "never a rendering reference". Step 2 gains the key pass as Image 3, so the transfer can see where each colour goes.
- **Markings come early and strong.** v4's "draw no marking … the description does not name" came late, inside a sentence that also told the painter that "pale coat markings stay stronger than lighting". Both Flash and Pro still invented cream patches. v5 puts markings second, straight after the image roles: "None named means a plain coat … Only areas Image 3 shows pale are pale." Variants 1F and 1G test two further fixes.
- **Contradictions removed.** v4 step 2 sent both the art direction and the transfer words: "a fine pixel grain" against "smooth"; "eyes as flat inks"; "avoid excessive gloss" (which gave dull surfaces); "the same place as in the form image" when no form image was sent. v5 has one block per step, with no conflicts.
- **The eyes.** v5 says "large, wet and lit" but keeps each eye at its drawn size. The Belatz's small eyes are inherited, and art never changes genes.
- **The description.** v4's shorthand ("B2", "flaps", "neck head", seven "between"s, "fur reach" on a bird) is translated by the template for now. `description.v5.md` is the rewrite to make in `describe.mjs`: colours placed on parts, proportions said once, and a posture.

## Not fixable by words (rig and reference findings)

- **The Loika's crest is in the charcoal body slot.** The approved Pip's crest is green, and the slot check holds the painter to charcoal. The species notes say "leaves, not ears", which helps the shape but not the colour.
- **The Belatz's foot form in the frame is `wedge`.** That is where the block feet come from. The words ask for toes inside the drawn foot, but the silhouette is still a wedge.
- **The S09 and S12 reference paintings carry the faults themselves** (block feet, a plank wing). v5 tells the painter to take material and finish from them, never shape, feet or wings, and 2C tests how hard that can be pushed. Once v6 settles, both should be repainted from a v6 type specimen.
- **The flap rule** (a resting wing pair folded along the body) is still owed by the cute envelope. Words can curve and soften the Peplos wing, but they cannot re-lay it without failing the parts check.

## Running it

See `variants.md` for the plan. The lab runs every variant on both gemini-3.1-flash-image and gemini-3-pro-image, two samples per cell, all on one sheet. Pro is rounder and more finished, but invents the same patches, so the markings problem is in the words.
