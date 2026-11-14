# The description, v5

The description is the one field that changes with every mibi. In v4 `framework/describe.mjs` writes it in the frame's own shorthand. The painter can't use most of it, and some of it pulls the wrong way. This page shows how the v5 text should read, with one worked example per species. It is a template for a later change to `describe.mjs`. Nothing in the framework has changed yet. Until that change is made, the lab sends the v4 text inside `description-template.txt`, which tells the painter how to read the shorthand.

## What goes wrong in v4

The v4 type specimen of the Belatz:

> A juvenile Belatz: 2 body regions (B2), a head, 2 eyes, a 2-leaf crest, 2 legs, 2 flaps, a tail; feathers; upright, neck head. It is the type of its kind, a big bird: wings and a beak; big birds of open sky. Coat: colour cobalt; fluff between; sheen between; feathers between; fur reach body only; second colour butter. Face: head between; beak between; crest between; crown tall; eyes small, close. Shape: waist thick; back line level; hind body between; body egg; build between. Legs & tail: tail curl straight; tail between. Proportions: a large body, the head carried high, small eyes, a tall crest, long legs, broad feet, a thick waist, wide flaps.

- **Codes and rig words:** "B2", "regions", "flaps", "neck head", "fused head", "splayed", "plantigrade". The painter reads "flaps" as flat panels, which is how the wings came out.
- **"between"** appears seven times and tells the painter nothing.
- **Wrong covering words:** "fur reach body only" on a bird, "a 2-leaf crest" on a feathered crest, "skin" on Pip's velvet coat.
- **Colours not placed:** "colour cobalt … second colour butter" does not say which parts are butter. In v4, step 1 often recoloured the crest or the legs, and the slot check rejected those drawings.
- **Some looks are said twice** (crest, eyes): once as a chapter look and once as a proportion.
- **No posture.**

## The v5 template

Seven short sentences in a fixed order, each in the player's words. If a sentence has nothing to say, it is left out.

1. **Who.** `A young {name}, {resembles}.` (Type specimens only: `, the type of its kind`.) Use "young", not "juvenile".
2. **Body.** The parts in one sentence, in painter's anatomy, front to back, with shape looks folded in: `It has {body form} body{, in N soft segments}, {head and neck}, {face parts}, {crest}, {wings}, {tail} and {legs}.` Leave out counts the controls already give, except for legs, wings and crest leaves.
3. **Colour.** Each pigment slot named in colour words, followed by the parts it covers, read from the legend's `slots` and `parts`: `{Colour} on the {parts}; {colour} on the {parts}.`
4. **Coat.** The covering looks, with middle values left out: `{covering}, {length}, {sheen}.`
5. **Markings.** If none are named: `No markings: the coat is plain.` If some are named: the marking's look, its colour, and where it lies, from the legend's `markingFields` ("on the flank and back"), followed by `exactly where the colour key shows them, clear of the belly and the eye rings`.
6. **Proportions.** Each look said once, as it compares with the species, merging the chapter look and the proportion word: `Its head is big for a {name} and carried high; its legs are short and stout.`
7. **Posture.** From the plan's stance and the view: `It stands still on {all four | both | all six} feet, seen from the front quarter, facing the viewer's left.`

### Word rules

| v4 word | v5 word |
| --- | --- |
| juvenile | young |
| N body regions (Bn) | a body; for B2 "a chest and a hind body"; for B3 "a body in three soft segments" |
| flaps | wings |
| neck head | a neck carrying its head |
| fused head | its head set straight on its body, no neck |
| plantigrade | standing flat-footed |
| splayed | its legs set wide |
| upright | standing upright |
| skin (Loika) | a short velvety coat |
| skin (Peplos) | a plush, softly fuzzy body |
| feathers + fur reach | feathers (fur reach left out on a feathered species) |
| a 2-leaf crest (on a feathered species) | a crest of pointed feathers |
| translucency between | half see-through |
| any "between" | left out; if the trait is a proportion, "medium" only when its absence would mislead |
| sheen glossy / matte | a glossy / a soft matte finish |
| colour "cobalt and lagoon" | "cobalt shading to lagoon" |

Never: a locus id, a plan code, a number with a unit, "between", "flap", "region", "slot".

## Worked examples

The genomes are the three type specimens used in the lab (see variants.md): S01-45ff1025, S09 `96ee0a1f32b099d2`, S12 `2af58fb73ac5cbbd`. The slots come from each manifest's slot checks.

### S01 Loika (type specimen, S01-45ff1025)

v4:

> A juvenile Loika: 1 body region (B1), a head, a snout, 2 eyes, a 3-leaf crest, 4 legs; skin, patches; plantigrade, fused head. It is the type of its kind, a round frog-hare, Pip: a leaf crest and a snout; charcoal. Coat: markings pale patches. Face: crown leaf crest; eye rings wide pale rings. Proportions: a big head, the head carried high, a tall crest, short legs, stout legs, narrow feet.

v5:

> A young Loika, a round frog-hare, the type of its kind. It has one round, wide body with its head set straight on it and no neck, a short snout, two eyes, a crest of three leaves and four legs, standing flat-footed. Charcoal on the body, the head and the crest; cream on the belly, the snout and the legs. A short velvety coat. Pale patches: a few clean cream islands on the charcoal flank and back, exactly where the colour key shows them, clear of the belly and the eye rings; wide pale rings round the eyes. Its head is big for a Loika and carried high; its crest is tall; its legs are short and stout, with narrow feet. It stands still on all four feet, seen from the front quarter, facing the viewer's left.

### S09 Belatz (type specimen)

v4: quoted at the top of this page.

v5:

> A young Belatz, a big bird of open sky, the type of its kind. It has an egg-shaped body, a chest and a hind body, with a thick neck carrying its head, a medium beak, two small eyes set close, a tall crest of pointed feathers, two wide wings folded at its sides, a straight tail and two long legs. Cobalt blue on the body, the neck, the head, the crest and the tail; butter yellow on the wings and the legs. Feathers, of medium length, with a soft sheen. No markings: the coat is plain. Its body is large, with a level back and a thick waist; its head is carried high; its eyes are small and close; its crest is tall; its legs are long, with broad feet; its wings are wide. It stands upright and still on both feet, seen from the front quarter, facing the viewer's left.

The crest is in the body slot and must stay cobalt. In v4 it was the most frequent slot failure, because the reference painting gives the Belatz a butter crest.

### S12 Peplos (type specimen)

v4:

> A juvenile Peplos: 3 body regions (B3), a head, 2 eyes, two antennae, 6 legs, 4 flaps; skin; splayed, neck head. It is the type of its kind, a moth or butterfly: patterned flaps; fliers of the flowers. Coat: colour marigold; translucency between; flap markings plain; second colour butter. Shape: hind body between. Proportions: a small body, the head carried low, big eyes, long antennae, short legs, fine legs, narrow feet, a thin waist, a dipping back, wide flaps, a slim build.

v5:

> A young Peplos, a moth of the flowers, the type of its kind. It has a slim body in three soft segments, with a short neck carrying a round head, two big eyes, two long feathered antennae, four wide wings resting over its back and six legs set wide. Marigold on the head and the body; butter on the wings and the legs. A plush, softly fuzzy body; the wings half see-through. No markings: the wings are plain, with no spots or bars. Its body is small and slim, with a thin waist and a dipping back; its head is carried low; its antennae are long; its legs are short and fine, with narrow feet; its wings are wide. It stands still on all six feet, seen from the front quarter, facing the viewer's left.

The legs are in the second slot (butter). In v4 the drawings painted them marigold, and that was the slot failure.

## Notes for the change to describe.mjs

- Sentences 3 (colour) and 5 (markings) need the legend's `slots`, `parts` and `markingFields`, which `controls.mjs` already writes. The colour names come from the frame's look labels for the palette traits. A species with no colour trait (the Loika) uses its `signature.anchor` and `signature.second`.
- The proportions sentence replaces both `proportionWords` and the shape-chapter looks. Each trait is said once.
- The field guide can use the same text. It is the player's description of their mibi.
