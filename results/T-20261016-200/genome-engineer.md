# The Loika at frame version 4 (the genome engineer's part of T-20261016-200)

Built on `genome-s01-v4` at fdd575fa, from station-gate. The design was settled with the game designer: N2. Their dominance design was withdrawn, because operators belong to shared catalogue loci and changing them would change every species.

## The one list

| Trait (Coat) | Locus | Pool | Looks (words) | Share on 300 pods |
| --- | --- | --- | --- | --- |
| **Colour** (new) | `appearance.body-palette` (co-dominant: both pigments show) | charcoal, russet, plum | charcoal · russet · plum · charcoal and russet · charcoal and plum · russet and plum | each pure 9–12%; each mixed 19–26% |
| **Markings** | `appearance.marking-switch` (pool on; "off" legal only as a legacy allele) + `appearance.marking-layout` (now heritable) | layout: bands, patches | stripes · patches · stripes and patches (co-dominant: **they stack**) · plain (only from a version-3 line) | stripes 23%, patches 26%, stripes and patches 52% |
| Crown, Eyes, Drive, Efficiency | unchanged | | | crest 72% / bare 28%; eyes 26 / 45 / 29% |

**Four random Loikas all differ 89% of the time,** up from 36% (300 pods, 4,000 households). There are 89 distinct looks among 300 pods.

- **The third pigment is plum,** a catalogue pigment and one on the art director's list. It is provisional: the art director picks the third, provided it reads apart from charcoal and russet by value as well as hue, at 144 px and in four-gray. Swapping it is a one-word change.
- **Cocoa, slate, spots and saddle aren't in the catalogue.** Adding them would mean new alleles, which means a catalogue version. That is out of scope.
- **The hidden-copy lesson** is on the Crest: a crested Loika can hide a bare head.

## Rules kept

- **Starter tier:** 6 traits. The tier counts traits, and only for generated frames, so no rule change was needed.
- **A new frame version for S01 only:**
  - A frame may now carry its own version (`frameVersionOf`), and a genome is born on its frame's version. FRAME_VERSION stays 3 for the other 15.
  - The registry appended S01 v4. v3 is carried, so every v3 print still decodes.
  - **The stamp stays 25×25.** The payload grows from 12 bits to 22.
- **Nothing moves under the player:**
  - All 300 v3 Loikas sampled are valid under v4. Their charcoal and patches copies lie inside the new pools, and "off" is a legacy allele (`row.legacy`: legal for inheritance, never drawn).
  - All 300 children of a v3 parent crossed with a v4 parent are valid and build.
  - Saved pods and mibis keep their stored genomes, and their version 3.
  - Two v3 parents can still have a plain child (75% on the sample). The game designer's condition holds: an old look is described plainly.
- **Viability:** 200/200.

## For the art director

Four real version-4 pods, `podGenome(S01 v4, gs)`:

| gs | Looks | Digest | Copies (colour, layout, crown, eyes) |
| --- | --- | --- | --- |
| 165 | charcoal, patches, leaf crest, eyes between | S01-6d8bc8fb | charcoal/charcoal, patches/patches, on/off (**hides bare**), large/huge |
| 168 | russet, stripes, leaf crest, wide pale rings | S01-bfb3fa4f | russet/russet, bands/bands, off/on (**hides bare**), huge/huge |
| 10 | charcoal and plum, stripes and patches, bare head, thin rings | S01-b8ea52c4 | charcoal/plum, bands/patches, off/off, large/large |
| 116 | plum, patches, leaf crest, thin rings | S01-cf8d9def | plum/plum, patches/patches, off/on, large/large |

- **Painting:**
  - Colour is a pigment slot: one ramp per pure pigment.
  - A mixed colour is one painted two-tone look (e.g. one pigment on the back, the other on the flanks), not a blend.
  - Stripes and patches stack.
- **The modal unread default** (T-190): Colour charcoal and plum, or charcoal and russet (about 25% each, the mixed looks lead); Markings stripes and patches; crest; eyes between.

## Tests

- **Workbench 23/23,** updated: the Loika is v4, 6 traits, 7 open loci, plain is legacy.
- **Genome stamp 9/9,** updated:
  - the newest S01 is v4, and v3 is still carried;
  - only S01 moved;
  - the format-1 print is a v3 Loika's;
  - S01 is still 25/25.
- **Face 34, UI 81:** pass.
- `build-frames --check`: ok. Guard: ok.

**Station: 7 tests encode the old Loika.** They are expectations, not regressions:
- seed-specific pods are now different;
- Coat has two traits;
- the cross's firm chapters changed;
- read costs per trait changed;
- S01's newest version is 4.

They are in `prototypes/station/tests/`, which is not mine to touch, so they need a builder or the lead's exception:
- create-props 40;
- rules-fixes B2, B3, B4;
- reads 397;
- the cross 408;
- frame version 411.
