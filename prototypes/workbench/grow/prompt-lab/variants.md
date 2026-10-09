# The v5 variant plan

This plan is a lab, not a full run. Each species gets one reference individual, every variant changes one thing from v5, and all the results go on one sheet. The lab loader reads [variants.json](variants.json). Each entry has an `id`, a `name`, a `change` line, and `step1` and/or `step2` text that the loader uses word for word. The loader fills `{artDirection1}`, `{artDirection2}`, `{species}`, `{description}`, `{controls}`, `{generate}` and `{transfer}`. The diffs below are the exact text each variant changes.

## The individuals

| Species | Individual | Why this one |
| --- | --- | --- |
| S01 Loika | type specimen S01-45ff1025 (`out/S01/f7a2d788e5827862`) | It failed v4 step 1 twice: the dark cap over a cream body, and cream legs painted charcoal. It also shows the invented-patch problem. |
| S09 Belatz | type specimen (`out/S09/96ee0a1f32b099d2`) | It has every Belatz fault: block feet, board wings, and a crest pulled to butter by the reference. |
| S12 Peplos | type specimen (`out/S12/2af58fb73ac5cbbd`) | The plank wing, the ball feet and the coloured blobs on the legs. v4 never passed its step 1. |

## Images

`imageOrder1` and `imageOrder2` in variants.json give the order each text assumes. The text names images by number, so the order sent must match it.

- **v5 step 1:** index pass (crisp), species reference, key pass (crisp). The reference for the Loika is `art/miniature-lives/assets/rich-plain-300x310.png`; for the others it is `grow/species/<species>/portrait-600x620.png`.
- **v5 step 2:** the step 1 drawing, the species reference, the key pass. All step 2 variants for a species take the same drawing: the first v5 step 1 drawing that passes the checks.
- **1F** sets `"images": "index-key"`: index pass, key pass, then the reference.
- **v4** keeps its own images (key, index, concept board; then drawing, reference).

## Runs and the sheet

- **Both image models:** the lab runs every variant on both gemini-3.1-flash-image and gemini-3-pro-image, with two samples per cell. Flash costs 12 variants × 3 species × 2 samples ≈ 72 calls. The Pro calls are in the service log.
- **Checks:** the v4 structural checks (band, parts span, proportions at step 1's 25 %, slots) are logged and do not gate. The art director scores each image 0/1 on six faults: **box limbs**, **3D artefacts** (facets, bevels, grey untextured), **board wings**, **invented markings**, **re-laid parts** and **dull surface**. The eye score decides.
- **Sheet:** one band per species and model. The top row is v4, v5, 1A–1G; the bottom row is the shared drawing, then v5, 2A–2C. Each cell shows its two samples, with the check numbers and fault scores in the caption.

## Step 1 variants (against `art-direction-step1.txt`)

| id | Replace | With |
| --- | --- | --- |
| **1A-surface** | `Take special care over the surface the species notes name.` | `Put special care into the surface, which is the creature's beauty: render the surface the species notes name, in the drawing and as the painting will carry it, so it catches the light from the top left and reads bright, never dull.` |
| **1B-anti-artefact** | `Limbs are living limbs that taper and bend softly inside their drawn place, never boxes, posts or unfinished 3D shapes.` | `Limbs are living anatomy: each leg has a rounded thigh, a soft joint and a foot shaped as the species notes say, inside its drawn place; wings are feathers or dusted membranes with curved edges and rounded tips, never panels. No stumps, cylinders, posts, blocks, wedges or flat-sided shapes anywhere, no facets or bevels: every edge curves.` |
| **1C-posture** | `Feet planted with weight.` | `The creature is alive and at ease: its weight sinks into its planted feet, the toes spreading a little under the load, the head lifted with interest; a living pet mid-breath, never a statue or a model on a stand.` |
| **1D-eyes** | `Eyes keep their drawn size and read large, wet and lit, with a catch light.` | `Eyes keep their drawn size but are the life of the face: round, dark and glossy, set in their rings, each with a big bright catch light at the upper left and a small second glint below.` |
| **1E-negative** | `Not: boxes, blocks, facets, planks, boards, unnamed markings, dither, scene, shadow, text.` | `Never: boxes, cubes, blocks, cylinders, posts, pegs, wedges, slabs, planks or flat boards; low-poly facets, bevels, grey untextured 3D, a mannequin or unfinished model look; pale patches, spots, rings, bands or colours the description does not name; a wing re-laid, turned or moved; dither spray, noise, blur; scene, ground, shadow, text.` |
| **1F-key-second** | the image roles and the markings paragraph, with the images sent as `index-key` | `… Image 2 is the colour key: the pigment of each area. Image 3 is the species reference: material and finish only, never its shape, feet or wings.` The markings paragraph then reads `where Image 2 shows them` and `Only areas Image 2 shows pale are pale.` |
| **1G-markings-positive** | the markings paragraph | `Markings: only those the description names, where Image 3 shows them. Every area keeps the one colour Image 3 gives it, unbroken from edge to edge, shaded only by the light; the pale areas are exactly those of Image 3, no more and no larger.` |

What each tests:

- **1A:** whether rich material words make the drawing bright and specific, or only noisy.
- **1B:** the owner's "limbs do not come across as boxes or undeveloped 3D artefacts", against the rig's box silhouette.
- **1C:** life and weight without moving parts. Watch the parts check: spread toes could widen a foot past the band.
- **1D:** how much of the face the eyes carry. Watch the proportion check on the eye.
- **1E:** a long negative list. Image models sometimes draw what a negative names; if 1E is worse than v5, keep the short list.
- **1F:** the coordinator's markings test. With the key second, the drawing should see that the belly field is the only pale area.
- **1G:** Pro invents the same patches as Flash, so the cause is the words. v5 still names "pale patches" to forbid them, and naming them may be what primes them. 1G describes the plain coat positively and never names a patch.

## Step 2 variants (against `art-direction-step2.txt`)

| id | Replace | With |
| --- | --- | --- |
| **2A-surface** | `Give the surface the species notes name real care.` | `Put special care into the surface, which is the creature's beauty: paint the surface the species notes name so that it catches the light, every feather, hair or wing scale too fine to count but felt, bright and never dull.` |
| **2B-field-order** | the order `{artDirection2}`, `{species}`, `{description}` | `{species}`, `{description}`, `{artDirection2}`. No words change. |
| **2C-reference** | `Image 2 is the species reference: match its material, finish and light, not its shape, feet or wings.` | `Image 2 is the species reference and sets the finish: paint the surface as Image 2 paints its own, its fur, feathers or skin, its sheen and its light, as closely as you can. Take nothing else from it: not its shape, its pose, its feet, its legs or its wings.` |

What each tests:

- **2A:** the owner's "special care in the surface" on its own: the cure for dull surfaces.
- **2B:** whether the text the model reads first carries more weight.
- **2C:** how much finish the reference can give before its faults come through. On the Loika (Pip) it should pull the result toward Pip. On S09 and S12, whose references have block feet and a plank wing, compare the feet and wings with v5.

## Reading the lab

- A variant **wins** when its eye score beats v5 in both samples, on at least one model, and its checks stay inside v4's gates.
- Winners combine into v6, which runs on the same three individuals before any full run.
- If a variant improves the look but fails parts or slots, record it as a rig finding, not a prompt win. Art never changes genes.
