# Species frame schema (`mb-species-frame/3`)

Companion to [species-frames.md](../species-frames.md). One JSON file per species (`species-<id>.json`), written by [frames.py](frames.py) from the real authoring catalogue (catalogue6 of `v1/prototype/generator-workbench`, 114 paired loci plus six drafts). Every locus id, allele id and guard comes from that catalogue and its resolver; nothing here is typed by hand except the species' choices. The file names and ids keep the earlier working words *hopper*, *puffcap* and *glowtail*; the names are in `species.name` and `species.clan`. Regenerate with `python3 frames.py`, and verify with `python3 frames.py --check`, which fails if a file is stale.

## Header

| Field | Meaning |
| --- | --- |
| `schema` | `"mb-species-frame/3"` (the schema this note describes). The registry's files under `prototypes/workbench/frames/` are written by `framework/species.mjs` at `"mb-species-frame/2"` today and stay as they are: /3 only adds `engine` and `band` (section "Schema /3" below), so a /2 file reads as a /3 file with `engine: "form"` and no `band`. The first /3 file is the body engine's (workbench chunk 9). The first generation, written by `frames.py` against catalogue6, was /1 |
| `species` | `id` (the working id; it is also the file name), `name` and `plural` (the approved species name: Loika, Untuva, Tuikis), `clan` (the clan name: Lophessa, Kausida, Stilbera), `order` (the order the player is expected to meet it), `summary` (one line) |
| `catalogue` | `id`, `version`, `foundationDigest` (the workbench's foundation pin), `pairs` (114), `drafts` (6). A frame is valid only against this exact pin |
| `glyph` | Five strings of five characters, `#` marked and `.` empty, each mirrored left to right. The mark at the centre of the genome ring and on the pod cap. Draft: the art director redraws it |
| `pod` | The four pod parameters: `sizeClass` (`small`, `medium`, `large`, from the frame's body size `growth.core-half-length`); `proportion` (`squat` or `tall`, from the type specimen's height to length, `heightToLength`); `shellPattern` (`segments` for a radial plan, else `soft ribs` for fur, `plates` for scales, `smooth dots` for skin); `colourPair` (two pigments, `{pigment, hex}`, from the species' pool) |
| `chapters` | The open chapters **in ring order** (Coat, Face, Shape, Legs & tail, Movement, Stamina, Character; absent chapters are skipped). Each: `id`, `name` (as the player sees it), `sealed`, `opensWith` (sealed only: the find), `findKind` (sealed only: `crystal`, `pearl`, `shard` or `null`, the find picture its words name; creatures-and-genomics, Finds), `traits` |
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

The workbench's catalogue (`prototypes/workbench/framework/catalogue.mjs`, pin `mb-genome-framework@9`) keeps every catalogue6 record exact and adds alleles under its own pin, listed in `ADDED_ALLELES` with the reason for each: hoof, webbed and root feet; one pair of legs; a huge size; tall ears; and, since pin 8, a **tiny** allele on the three head ratios (`growth.head-length-ratio` 0.22, `growth.head-width-ratio` 0.25, `growth.head-depth-ratio` 0.25), which lowers the head floor from 0.3–0.36 of a region to a quarter so a turtle's head fits (set by the programme lead). A changed range is a new pin: frames and genomes record the pin and frame version (`frameVersion` 2 from pin 8) they were built against, and a saved mibi keeps its own. Pin 9 (an owner ruling: the rig as structure and proportion calibrated to the accepted art) adds six alleles for the Loika's measures taken from Pip (a **huge** eye 0.44, a **stub** snout 0.32 that is a **full** 0.85 lower face, a **wide** 0.65 and **deep** 0.70 body, a **leaf** crown form) and two C01 branch loci (`growth.belly-field-extent`, how far up the body the belly field reaches; `growth.exterior-eye-height-ratio`, how high the eyes sit on the head); genomes keep `frameVersion` 2, since no range narrowed.

## Schema /3: `engine` and `band` (pin 11)

Written for the genome string and Tuliko's genes (a shared gene means the same name, direction and two-copy rule in every species, and each species sets its own size band). Two fields, nothing else changes.

| Field | Where | Meaning |
| --- | --- | --- |
| `engine` | frame header | `"form"` or `"body"`: the engine that draws the species. A frame on the form engine leaves it out and reads as `"form"`, so every /2 file stays valid and byte for byte as it is |
| `band` | every continuous locus row in `loci[]` of a `"body"` frame | `{ "form", "lo", "hi", "unit" }`: what the position t stands for in this species. `form` is how the engine turns t into a value (`mult`: a factor, 1 at the type; `off`: an offset, 0 at the type; `lin`: a straight line; `int`: a whole number), `lo` and `hi` are the values at t = 0 and t = 1, and `unit` is the unit the engine reads (`×`, `H`, `°`, `turns` or empty). A frame on the form engine leaves `band` out and takes the house band from the framework (foundation plan, section 1.6) |

A continuous record holds a **position**, not a size (catalogue pin 11, `measure: "position"`): its copies are t on [0, 1], either a named bin (0, 0.5, 1: the player's words, lowest to highest) or one of the 59 steps of `BLEND_STEPS`. The record fixes the id, the direction (higher t is more of the last word), the words and how two copies show; the frame's `band` fixes the size, so a Tuliko's biggest eye is not a Loika's biggest eye. A record already in absolute units (`movement.cycle-rate`, `appearance.sheen`, `appearance.emission-brightness`) has no `band`: its copy is the record's own number, in every species.

A frame names the catalogue pin it was built against in `catalogue`. From pin 11 the header also carries `digest`, the catalogue's content digest (`catalogue.mjs` `digestAt`): pin 10 named two contents (169 records on `main`, 178 on the build branches), pin 11 names one. A frame of version 6 or older names pin 10 exactly as before and has no digest. Records and alleles added at pin 11 carry `sinceFrame: 7`: a frame of version 6 or older lists none of them and sees none of the appended alleles (`appearance.marking-layout` keeps its two alleles and one bit in every older frame), which is why no existing frame or stamp code moves.

**Sleeping records (pin 11).** A record is carried and crossed whether it draws or not; only the drawing skips it. A record sleeps in one of two ways: its owner switch is off (the marking loci behind the marking switch, the whisker records behind `anatomy.whisker-presence`), or, in the new form, it names the looks that wake it. A catalogue record with `wakesWhen: { locus: [looks] }` is awake when the **shown** look of any named locus is one of the listed looks (never a copy: a bands copy beside a patches copy shows `bands-and-patches`), and a locus that is itself asleep or not carried shows nothing and wakes nothing. A frame row for such a record has `kind: "sleeping"` and carries `wakesWhen`; `wakesWhen` is part of the catalogue's content digest. The cross, the forecast (`asleep` per parent), the stamp and the genome string all treat a sleeping record as any other: both copies are written and handed down.

**One look, one record.** A frame opens at most one record of each pair in `LOOK_PAIRS` (`catalogue.mjs`): the older and the newer record of ear kind, ear droop, ear width, eye size, eye height, eye spacing and the cream reach. `buildFrame` and `tools/extract-frames.mjs` refuse a frame that opens both.

## The Loika at frame version 5

The owner's rulings: "all Loikas have a crown; the genome sets its parameters within ranges", then "crown can be tiny too. all have the gene, but not all may need to express it". Frame version 5 of S01 keeps `anatomy.crown-presence` a heritable switch (on is dominant, so a quarter of drawn pods are bare) and opens, in the same Crown trait, the three catalogue records that already existed for the crown: `growth.crown-height-ratio` (size, low 0.45 to high 1.05 of the head's half height; the low end is a small crest, still plainly visible), `growth.crest-leaf-count` (two or three leaves) and `anatomy.crown-form` (leaf or pointed; the catalogue's rounded form, a ball, is left out). Every Loika carries all four, whatever its switch: the three parameters are `sleeping` rows behind the switch, drawn only while the crown shows, and still handed down in a cross, so a bare parent passes on a crown's size. The catalogue has no record for a crown's orientation, so none is opened (a new record is a new catalogue pin). Version 4 stays in the stamp registry exactly as it was; version 5 is appended after the last frame. A version-4 genome carries no crown parameter copies, so the version-5 frame does not read it as its own: a mibi keeps the frame version it was born with.

## The Loika at frame version 6

Every Loika has ears, and the size of the ears is heritable. Frame version 6 of S01 turns the head-owned ear switch `anatomy.auricular-presence` on in the frame (a locked row, not heritable: nothing about it is stamped or crossed) and locks the form (`rounded`), the tilt (`upright`), the width (`broad`, 0.8 of the length) and the set (`side`, 0.78). It opens one record, `growth.auricular-length-ratio`, in a new Ears trait of the Face chapter: the pool is `small` 0.45, `short` 0.60 (the type) and `medium` 0.75 of the head's half height, so a copy of each end gives the type. `small` and `medium` are new alleles appended to the record with `sinceFrame: 6`; no frame of version 5 or older lists them, and the proportion picker (`nearestPair`) leaves them out for an earlier frame. The width follows the length, so the ear is one shape at every size. The rig roots the ear a little behind the crest's side leaves (0.25 on the back axis) from frame version 6 only; versions 4 and 5 draw as before.

In the stamp registry the record has five alleles beside the 60 steps of a blended copy, one past the four names six bits hold. `extract-frames.mjs` keeps the species' pool and the two ends of the catalogue's range for such a record (`short`, `tall`, `small`, `medium`), which keeps the step grid the catalogue's (0.45 to 1.4). Frame 1.6 is appended; 1.4 and 1.5 are the bytes they were.

A cross between two Loikas born on different frame versions is refused with its reason (`cross.mjs`: "born on frame version 4 cannot be bred with one born on version 5"), as is a genome that lacks a locus of the frame (a version-4 or version-5 genome under the version-6 frame). The Station's Cross refuses the pair before cost ("born on different frame versions"). There is no upgrade step: an earlier ruling that a house change may redraw every living mibi concerns the house style, not frame versions.
