# Prompt v7: one house rendering for every species

This review reads three sheets side by side against the accepted Pip (`art/miniature-lives/assets/rich-plain-300x310.png`): `sheets/lab-S01-v6.png` (the Loika, v6 set), `sheets/lab-S12-v6.png` (the Peplos, v6 set) and the bottom row of `sheets/lab-S09.png` (the Belatz, 1BG on the v5 set). Nothing here has been run, and nothing here is accepted art.

## The owner's verdict

Pro is the model. On the eyes variant (6C) the Loika's second sample is nice. The Belatz's first 1BG sample resolves the feathers well. Its second looks like a youngling: cool, but less cute. The Peplos looks flat, its surface is unreadable and its eyes are oddly shaded. Above all, the three species look as if they came from three different asset packs. v7 answers that first.

## What differed between the three species, and the words that caused it

| | Loika (v6) | Belatz (v5 + 1BG) | Peplos (v6) | Words that caused it |
| --- | --- | --- | --- | --- |
| **Medium** | a 3D vinyl render, close to Pip | a painted storybook illustration with brushed feathers | a glossy toy render, like moulded plastic | **The main cause is Image 2.** Each species gets its own reference, and the three references come from three packs: Pip is a vinyl film render, the Belatz type specimen is a fuzzy digital painting, and the Peplos type specimen is a clay toy with dot eyes. v6 says "match its surface, light, eyes and charm" and v5 says "match its material, finish and light", so each species copies its own pack. v6's "a stylised animated-film character, like a soft vinyl collectible" names two media, so the model is free to choose. |
| **Contour** | none in the painting; a dark pixel edge in the drawing | dark blue line work around the silhouette and along the feather rows | none | v5's two steps never ban outlines, and the Belatz ran on v5. S09's "each row edged with one lighter step" draws a line on every row. v6 bans only "black outlines", so a dark line in the body colour still gets through in the drawings. |
| **Light** | key from the top left, a cool underside, a warm rim | even, frontal and nearly shadowless | frontal and flat: the body is one orange value with no rim | v6's light paragraph puts the highlights on "crown, cheek and shoulder". That is Loika anatomy, so on a moth nothing says where the light lands. S12 names no volume at all. v5 has only "one key light" in a list of adjectives. |
| **Shading model** | smooth turns with occlusion | many value steps, one set per feather | one value with a soft gradient | No text gives a step count for the painting. Step 1 says "three or four value steps a colour" and step 2 says nothing. |
| **Surface detail** | felt, not seen | every feather drawn: texture noise | nothing readable, neither nap nor dust | S09 lists five touches ("small rounded contour feathers over the breast and back", down, sheen, lighter edges, scale), so each one gets drawn. S12's "fine velvet nap like a bumblebee's" contradicts v6's "texture is felt, not drawn" and "Not: hair-by-hair strands". The ban wins, and nothing is left. |
| **Eyes** | orange iris, a lid, glints (best on 6C) | a small amber iris (s1); a large dark one (s2) | a black dot in a white ball, shaded like a sphere, grey on the lower half | S09 and S12 set no iris colour. The Peplos reference has dot eyes. "A large glossy iris filling the ring" turns the moth's white ring into a sclera that the key light then shades like a ball. |
| **Background and shadow** | contact shadows despite the ban; a lighter inner panel behind some | s1 sits on a lighter inner panel | a blue cast shadow in a drawing; a gradient backdrop on 6A | "cast shadow" is banned but nothing says what grounds the creature, so the model makes up its own. The references carry their own grounds. The flat ground is stated once, at the end. |
| **Framing** | about three fifths of the frame, centred | about four fifths of the frame height | about two thirds of the width but a third of the height, floating mid-frame | "subject the same size and place as Image 1" ties the framing to each rig's control, and the rig frames each species differently. There is no shared ground line. |
| **Age and charm** | a pet | s1 an adult pet; s2 a youngling with a big head and large eyes | an insect toy | Step 2's "this young creature" invites a chick reading wherever the drawing enlarges the head. |

## What v7 does

**One recipe, stated as fixed rules in both steps.** Every species obeys it whatever its material.

- **Light:** a warm key from the upper left at 45 degrees, a cool fill a third as strong (3:1), and one cool rim on the upper right edge.
- **Shading:** soft volume shading, named in the text. A lit tone, two shadow steps and one soft specular on the highest lit form, plus occlusion where parts meet.
- **Contour:** no ink outline of any colour. Edges are defined by value.
- **Eyes:** the house eye, which is Pip's. Round and wet, the species iris filling the ring around a dark pupil, one lid line, and two glints at fixed positions: a large one upper left and a small one lower right.
- **Ground:** flat #f6f3ec from edge to edge, with one small soft contact shadow under the feet and nothing else.
- **Surface:** the material in two or three named touches. Everywhere else is smooth value.
- **Finish:** a soft vinyl collectible, matte with one highlight. Clay, glossy plastic, paper and brushwork are named as what it is not.
- **Framing:** the whole creature spans four fifths of the frame at its larger dimension, centred, with its feet on a ground line one tenth above the bottom.

**No species reference image.** Both steps send only the map or drawing and the colour key (`imageOrder1: index, key`; `imageOrder2: drawing, key`). The references were the strongest cause of the three-pack look, and v7's words now carry the style. The cost is that the Loika loses Pip as a direct reference. The house eye and the vinyl finish are written to stand in for it, and the Loika is judged against Pip all the same.

**The species notes say only what differs:**
- **Loika:** smooth skin, an orange iris, and a sheen on the back and crown.
- **Belatz:** feathers in layered groups, each group shaded as one form, with three touches (a scalloped group edge, down at the throat, sheen on the coverts). The wings lie folded along the body as drawn and are never re-laid. It has an amber iris, and the head keeps its drawn size, never a chick's.
- **Peplos:** dusted translucent membranes with visible veins and a fuzzy thorax. Its compound eyes are drawn as the house eye with a teal iris, never as insect eyes. Its flatness is fixed by naming where its volume lives: the thorax is the fullest form and takes the highlight, the abdomen's segments each turn from light to shadow, and each wing curls slightly along its leading edge. Its surface gets two touches: dust on the wing near the base and fuzz at the collar.

The Belatz's and Peplos's iris colours are my choices. Amber matches the Belatz's 1BG sample 1. Teal is the complement of the Peplos's marigold body.

**What was cut:** "this young creature" and the light paragraph's Loika anatomy. "Image 2: match its surface, light, eyes and charm" goes with the reference image. S09's list of five surface items is cut to three touches. S12's "velvet nap like a bumblebee's" is gone.

## Three single-change variants (both steps)

- **7A-no-eye-recipe:** the Eyes paragraph is removed and the species iris colours stay. This measures how much of the faces' sameness the recipe buys.
- **7B-strict-contour:** the Contour paragraph is made stricter: no darker line of the body colour along the edge either, and no edge darker than the shadow step beside it. Step 1 runs to 264 words and step 2 to 267, over the 240-word limit for the base blocks. That is acceptable for a single-change test.
- **7C-no-framing:** the Framing paragraph is removed and nothing replaces it. This measures how much of the spread in size and placement the rule removes.

## Before running: two lab changes and one risk

1. **`lab.py` will not load a set whose baseline is called `v7`.** `run_set` looks for a variant with id `v5` or `v6`, so line 147 has to accept `v7`. Run it with `--set v7`.
2. **The consistency test needs one combined sheet.** The lab lays out one sheet per species, and the test below needs all three species on one sheet.
3. **The framing rule moves the creature off its control,** so the band, parts and proportion checks will read low for any species that the rig frames differently from the rule. This matters most for the Peplos. In the lab the checks are logged, not gated. Before the rule goes into the service, the rig should frame its controls by the same rule.

The next step after v7 is to give the lab a style image: Pip, sent as the same Image 3 for every species. Then test that as one variant against the words alone.

## The consistency test

Run v7 and 7A–7C on Pro, two samples each, for the Loika, the Belatz and the Peplos. Lay all three species out on **one sheet**: one row per variant, with the six paintings side by side at the same size on the same ground. Judge in this order:

1. **Sameness of style first.** Cover the species names. Could one artist have made all six images, in one pack? Check each axis of the recipe in turn: the light direction and the rim, the number of values, the contour, the eye construction and where the glints sit, the amount of surface detail, the finish, the ground and shadow, and the size on the ground line. Count how many of the eight axes match across all six images.
2. **Charm second.** Is each one a pet you want to pick up, judged against Pip?

A variant that wins on charm but loses on sameness does not go forward.
