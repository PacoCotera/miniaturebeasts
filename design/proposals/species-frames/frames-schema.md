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

## Schema /4: language frames (frame version 8 and later, catalogue 13)

A frame of `frameVersion` 8 or later is a **language frame**. Its schema is `mb-species-frame/4` (the code's `SCHEMA_LANGUAGE`), a superset of /3: it may carry `engine` and `band` exactly as /3 defines them, and adds the header fields below. Every older form frame stays as it was built: schema /2, catalogue pin 12 with the digest of its own version, its own alleles. A frame studio-made on the body engine after the language (chunk 20) writes version 9 or later with `engine: "body"` into the same index, under this same schema.

| Header field | Meaning |
| --- | --- |
| `schema` | `"mb-species-frame/4"` |
| `family` | The build family (registry `families`, for example `trotter`, `loaf`, `slider`) |
| `land` | The land that fixes the colours (registry `lands`, the game's biome id, for example `marsh`) |
| `signature.part` | The one signature: `type`, `socket` (head-top, back-line, tail, neck, coat) and `accent` (`land` or `own`). The older `signature` fields (`anchor`, `second`, `feature`, `features`, `finish`) stay beside it |
| `plan.eyes` | The eye count, 2 or 3 (a plan switch, see below). Never a locus row |
| `catalogue` | `{ id, version: 13, digest, parent }`: the digest is `digestAt(frameVersion)`, the content the frame sees. A frame of version 7 or older names pin 12 and its digest, byte for byte as before (`catalogueHeader`, `pinOfFrame`) |

Catalogue 13 adds, each with `sinceFrame: 8` (a frame older than 8 never carries them, and `digestAt(7)` is still pin 12's digest):

- `anatomy.eye-count` (two, three): a **plan switch**. Locked, never in a pool, never crossed, never a row. A frame says its count in `plan.eyes`, and it must equal the registry's (`language.json`): Lehten three, every other kind two.
- `appearance.iris-colour` (amber, honey, olive, moss, hazel, teal, slate, violet, copper) and `appearance.attitude` (content, curious, deadpan, knowing): pair maps in which the first-ranked allele shows.
- `signature.size` (0.20 to 0.33 of standing height), `signature.count` (whole numbers 1 to 13; a child of two copies is their mean rounded up) and `signature.curl` (0 to 1.75 turns).
- Four alleles appended to `appearance.marking-layout` at **indices 6 to 9**, after the Tuliko's four at 2 to 5: `saddle`, `brindle`, `gradient`, `back-spots`. They have `sinceFrame: 8`, so an older frame's allele list, its stamp bits and its random draws are those it was built with. In a pair with an older layout the language layout shows; among the four, back-spots over gradient over brindle over saddle; a pair of older layouts is untouched.

`LOOK_PAIRS` gains the signature pairs: a frame opens `signature.count` or `growth.crest-leaf-count`, never both, and likewise `signature.size` with `growth.feather-crest` or `form.tail-tip-size`, and `signature.curl` with `growth.tail-curl-turn` or `form.tail-curl`.

`anatomy.exterior-eye-presence` is a plan switch for frames of version 8 and later: always on, never open.

A record the language contradicts is **retired**: `retired: "language 2026-11-05"`, with `retiredWhy` and `retiredCoveredBy` (the check a signed exception record would name, or `null`). Nothing is deleted; an older frame keeps the record byte for byte. `buildFrame` refuses to open a retired record in a frame of version 8 or later, and refuses to switch a retired part on, unless one of the kind's signed per-check exception records covers it (the anchors' records, the language design section 9: for example Loika's `face.clear` record with scope `ears` covers its ears, and `coat.pale` covers the belly field and the underside palette). A generated frame skips such traits instead of failing.

### Language frames written by the generator (chapter 5)

`framework/language-frames.mjs` writes a kind's frame of version 8 from the registry (`language.json`): `family` and `land` in the header, the eye count from the registry, and the records below. It writes all nineteen kinds (the four anchors under their exception records, and S02 to S16; S20 is a fixture and S22 a template). A kind keeps the traits of its older frame's movement, stamina and character chapters. `build-frames.mjs` writes them to `frames/language/` (`species-S01.json`… and an `index.json` of their own, `mb-frame-registry/1` on catalogue 13) and every other kind from its roster spec into `frames/`, as before.

- **Closed** (locked, never open): the named body and underside palettes (colour comes from the land); every retired record that no signed per-check exception record of the kind covers (a switch that would need one is dropped from the frame's features, while Loika's cream muzzle sits inside its excepted `coat.pale`, Wickle's tail-tip ball under its scoped `sig.one` record and Curlop's muzzle under its scoped `face.clear` record); emblem, blush, cream reach, countershade, pattern kind and the mouth at rest, each at the value the language allows; the older signature records (`growth.crest-leaf-count`, `growth.tail-curl-turn`, `growth.feather-crest`), which `signature.count`, `.curl` and `.size` stand in for.
- **Open**: `appearance.body-hue` and `appearance.body-value` (band: the land's body colour, or the anchor's own colour where its `coat.land` record holds, hue +-12 degrees and lightness +-0.07), `appearance.marking-layout` (six layouts), `appearance.iris-colour` and `appearance.attitude` (the registry's pools; the first iris and `content` are the defaults), `form.eye-spacing` and, where no `face.size` record holds, `form.eye-size` (0.122 to 0.165 of head width), the shape records within 15 percent (`form.head`, `form.torso-girth`, the leg and tail records the plan owns), and the signature's records. What the language is silent on stays as it was: the movement, stamina and character traits the kind already had.
- **`band`** on a row of a position record is the schema /3 field: `{ form, lo, hi, unit }`, with `type` the value at the type. **`clamp`** is new in /4 and is for a record whose copies are values, not positions (`signature.size`, `signature.curl`, `growth.brow-tuft-length`): `{ lo, hi, unit }`, the limits the engine holds the value to (the kind's band inside the record's whole range); `signature.count` instead lists only the whole numbers of the kind's band in its pool.
- The `face.iris` check has two parts, both on signed values (`IRIS_VALUES_SIGNED`): (a) the iris against the pupil, at least 0.30 lightness, which drops an iris from a pool when it fails, and (b) the pupil against the face zone it sits in, at least 0.30, which is reported per kind and changes no frame.
- A row may carry `weights` (allele to a share of the draw, summing to 1) for wild individuals: the stand's own look on 60 percent, the others evenly, and the coat layouts by their asked shares (plain 35, spots 20, saddle 15, gradient 12, bands 10, patches 8; plain is the marking switch off, spots is back-spots, brindle is not in a pool). `draw: "alike"` gives a wild individual two copies of one allele, so the shown share is the weight itself; it is used where the two-copy rule cannot give the shares (the layouts, where bands with patches shows a mixed look, and the signature count, where a mean rounded up leaves the ends under 5 percent). A row without `weights` draws every allele with the same chance, as every older frame does.
- No older frame file is rewritten: the four kinds' version-6 files stay in `frames/` and `frames/index.json` is as it was, so the Station and the game still load them. The stamp registry (`extract-frames.mjs` reads `frames/language/index.json` too) appends the version-8 frames after the others and keeps every older version (`1.6` beside `1.8`).

## Catalogue 14: body length (frame version 9)

Catalogue 14 adds one trunk record, `form.torso-length` (short, between, long: a position like `form.torso-girth`), with `sinceFrame: 9`. A frame of version 8 or older neither lists nor can open it (the builder refuses an open trait the species does not carry), so every frame on disk builds byte for byte as before. `digestAt(8)` is pin 13's digest and frames of version 8 keep naming pin 13; a frame of version 9 names pin 14. Its band is `mult` 0.85 to 1.15 like every other shape record. The three words are working words, owed to the copywriter.
