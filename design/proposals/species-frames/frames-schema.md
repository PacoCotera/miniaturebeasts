# Species frame schema (`mb-species-frame/1`)

**Proposal**, with [species-frames.md](../species-frames.md). One JSON file per species (`species-<id>.json`), written by [frames.py](frames.py) from the real authoring catalogue (catalogue6 of `v1/prototype/generator-workbench`, 114 paired loci plus six drafts). Every locus id, allele id and guard comes from that catalogue and its resolver; nothing here is typed by hand except the species' choices. The file names and ids keep the earlier working words *hopper*, *puffcap* and *glowtail*; the names are in `species.name` and `species.clan`. Regenerate with `python3 frames.py`, and verify with `python3 frames.py --check`, which fails if a file is stale.

## Header

| Field | Meaning |
| --- | --- |
| `schema` | `"mb-species-frame/1"` |
| `species` | `id` (the working id; it is also the file name), `name` and `plural` (the owner-approved species name: Loika, Untuva, Tuikis), `clan` (the clan name: Lophessa, Kausida, Stilbera), `order` (the order the player is expected to meet it), `summary` (one line) |
| `catalogue` | `id`, `version`, `foundationDigest` (the workbench's foundation pin), `pairs` (114), `drafts` (6). A frame is valid only against this exact pin |
| `glyph` | Five strings of five characters, `#` marked and `.` empty, each mirrored left to right. The mark at the centre of the genome ring and on the pod cap. Draft: the art director redraws it |
| `pod` | The four pod parameters: `sizeClass` (`small`, `medium`, `large`, from the frame's body size `growth.core-half-length`); `proportion` (`squat` or `tall`, from the type specimen's height to length, `heightToLength`); `shellPattern` (`segments` for a radial plan, else `soft ribs` for fur, `plates` for scales, `smooth dots` for skin); `colourPair` (two pigments, `{pigment, hex}`, from the species' pool) |
| `chapters` | The open chapters **in ring order** (Coat, Face, Shape, Legs & tail, Movement, Stamina, Character; absent chapters are skipped). Each: `id`, `name` (as the player sees it), `sealed`, `opensWith` (sealed only: the find), `traits` |
| `chapters[].traits[]` | `id`, `name`, `loci` (ordered list of locus ids), `looks` (the player's words for the pictures), `nature` (`look` or `doing`), `shapeable`, `override` (present only when the trait breaks the default rule, with the reason) |
| `counts` | `locked` and `lockedBy` (`switch`, `owner-off`, `fixed`, `no-consumer`), `heritableLook`, `heritableDoing`, `sleeping`, `sealed`, `total` (always 114), `byChapter` (loci and traits), `traits`, `fieldGuideLooks` (looks the species can carry, summed per open locus), `ringBitsPerTrack` (the codec's `ceil(log2(alleles))` per open locus, one copy) |
| `notYet` | `domains` with no locus yet, `drafts` (the six draft loci), `pending` (traits the species needs that the catalogue cannot express yet, each with `why`) |
| `typeSpecimen` | The genome used to check the frame (every open part switch on) and the workbench's own factual `brief` of what it builds |
| `viability` | `sampled` and `constructed`: random individuals (copies drawn from the species pools at every open locus) that the workbench resolver built. All must construct |

## Loci

`loci` lists all 114 validated loci in catalogue order. Every entry has:

| Field | Meaning |
| --- | --- |
| `id` | The catalogue locus id |
| `family` | Its domain, aliases normalized (`Structure` → `structure`) |
| `switch` | `true` for a plan switch or a part switch (see the method) |
| `kind` | `locked`, `heritable-look`, `heritable-doing`, `sleeping` or `sealed` |
| `chapter`, `trait` | Chapter and trait ids for every kind but `locked` (`null` there) |
| `looks` | The looks this locus can show in this species, derived from the operator: each colour and each pair of colours for a palette, the pair-map outcomes, the copy-mean values (`between a and b` for a mixed pair), `off`/`on` for a switch. For a locked locus, its one look |
| `shapeable` | `true` only where Create may roll it. Always `false` for `locked` |
| `guard` | Why the part is on or off here: the resolver's own reason, or the catalogue's applicability for an older record with no consumer, or which switch puts a sleeping part to sleep |

Then by kind:

| Kind | Extra fields | Meaning |
| --- | --- | --- |
| `locked` | `lockReason`, `copies` | `copies` are the species' two copies, always equal, so no cross can change them. `lockReason`: `switch` (a switch the species fixes), `owner-off` (its owner is switched off in this plan), `fixed` (its owner is on, the species fixes it), `no-consumer` (an older record nothing draws or uses yet) |
| `heritable-look` | `nature: "look"`, `alleles` | Read per pod. `alleles` is the species pool, a subset of the catalogue's alleles; a wild pod only carries these |
| `heritable-doing` | `nature: "doing"`, `alleles` | Read per pod; changes only by breeding unless overridden |
| `sleeping` | `nature`, `alleles` | Heritable copies whose owner is an open part switch. Read with the chapter, drawn asleep when the switch is off in that individual |
| `sealed` | `nature`, `alleles` | Heritable, inherited and acting, but its chapter cannot be read or shaped until the find in `opensWith` |

## Rules a consumer can rely on

- `counts.total` is 114, and every validated catalogue locus appears exactly once.
- A plan switch is never open. Every open look is drawn by the current construction when its switches are on; every open doing is in movement, energy or cognition.
- Locked copies are homozygous. A pod, founder or child whose locked copies differ from the frame is not this species.
- A trait's three Create pictures come from the pod's own copies across all the trait's loci: *as the pod is*, *only the first*, *only the second*.
- Drafts and empty domains are never given copies or a look. They are listed in `notYet`.

## Catalogue ranges beyond catalogue6

The workbench's catalogue (`prototypes/workbench/framework/catalogue.mjs`, pin `mb-genome-framework@9`) keeps every catalogue6 record exact and adds alleles under its own pin, listed in `ADDED_ALLELES` with the reason for each: hoof, webbed and root feet; one pair of legs; a huge size; tall ears; and, since pin 8, a **tiny** allele on the three head ratios (`growth.head-length-ratio` 0.22, `growth.head-width-ratio` 0.25, `growth.head-depth-ratio` 0.25), which lowers the head floor from 0.3–0.36 of a region to a quarter so a turtle's head fits (the programme lead's decision, 2026-10-08). A changed range is a new pin: frames and genomes record the pin and frame version (`frameVersion` 2 from pin 8) they were built against, and a saved mibi keeps its own. Pin 9 (the owner's decision 2026-10-08, the rig as structure and proportion calibrated to the accepted art) adds six alleles for the Loika's measures taken from Pip (a **huge** eye 0.44, a **stub** snout 0.32 that is a **full** 0.85 lower face, a **wide** 0.65 and **deep** 0.70 body, a **leaf** crown form) and two C01 branch loci (`growth.belly-field-extent`, how far up the body the belly field reaches; `growth.exterior-eye-height-ratio`, how high the eyes sit on the head); genomes keep `frameVersion` 2, since no range narrowed.
