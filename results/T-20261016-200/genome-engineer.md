# The Loika at frame version 4 (the genome engineer's part of T-20261016-200)

Built on `genome-s01-v4` at 29e291b1, from station-gate. The design was settled with the game designer: N2. Their dominance design was withdrawn, because operators belong to shared catalogue loci and changing them would change every species.

## The one list

| Trait (Coat) | Locus | Pool | Looks (words) | Share on 300 pods |
| --- | --- | --- | --- | --- |
| **Colour** (new) | `appearance.body-palette` (co-dominant: both pigments show) | charcoal, russet, ash | charcoal · russet · ash · charcoal and russet · charcoal and ash · russet and ash | each pure 9–12%; each mixed 19–26% |
| **Markings** | `appearance.marking-switch` (pool on; "off" legal only as a legacy allele) + `appearance.marking-layout` (now heritable) | layout: bands, patches | stripes · patches · stripes and patches (co-dominant: **they stack**) · plain (only from a version-3 line) | stripes 23%, patches 26%, stripes and patches 52% |
| Crown, Eyes, Drive, Efficiency | unchanged | | | crest 72% / bare 28%; eyes 26 / 45 / 29% |

**Four random Loikas all differ 89% of the time,** up from 36% (300 pods, 4,000 households). There are 89 distinct looks among 300 pods.

- **The third pigment is ash** (a dove grey-blue, #8e98a4), the creative director's and the art director's choice after cobalt, periwinkle and plum. It is new, so it costs **catalogue 10**:
  - **The catalogue:** ash is appended to `appearance.body-palette`, so every older copy keeps its index and its 4 bits.
  - **The frames:** every frame moves to **version 4**, following the catalogue-9 precedent. The stamp registry snapshots each locus's allele list, so the 15 species with an open Colour changed content. The other 15 frames are otherwise identical: same loci, pools and bits, checked field by field.
  - **The stamp registry:** all sixteen are appended at version 4, and every version-3 frame is carried, so every print decodes.
  - **Saves:** nothing moves. Saved pods and mibis keep version 3 and their genomes.
  - **New pods and children:** born at version 4. Their name codes differ from what the same seed gave before, because the version is part of the canonical text. No golden moved: face 34 and ui 81 pass unchanged.
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
| 10 | charcoal and ash, stripes and patches, bare head, thin rings | S01-cb8cd2d6 | charcoal/ash, bands/patches, off/off, large/large |
| 116 | ash, patches, leaf crest, thin rings | S01-0752656f | ash/ash, patches/patches, off/on, large/large |

- **Painting:**
  - Colour is a pigment slot: one ramp per pure pigment.
  - A mixed colour is one painted two-tone look (e.g. one pigment on the back, the other on the flanks), not a blend.
  - Stripes and patches stack.
- **The modal unread default** (T-190): Colour charcoal and ash, or charcoal and russet (about 25% each, the mixed looks lead); Markings stripes and patches; crest; eyes between.

## Tests

- **Workbench 23/23,** updated: the Loika is v4, 6 traits, 7 open loci, plain is legacy.
- **Genome stamp 9/9,** updated:
  - the newest S01 is v4, and v3 is still carried;
  - only S01 moved;
  - the format-1 print is a v3 Loika's;
  - S01 is still 25/25.
- **Face 34, UI 81:** pass.
- `build-frames --check`: ok. Guard: ok.

**Station: 446/446 after the lead's exception.** Seven expectations followed the new Loika. No production Station code changed.

| Test | Old expectation | New expectation | Why (genome) |
| --- | --- | --- | --- |
| create-props, "fix 5: the trait line names the same look" | pods gs 3 and 4 hide a bare head under the crest, as choice 1 and choice 2 | gs **13** and 4 | v4 samples Colour and the layout first, so the same seed draws a different pod. gs 3 now holds a bare head only; gs 13 is the first pod whose crest hides its bare head as choice 1 |
| rules-fixes B2, B3, B4 (`crossed()`) | `seedAdults(S01, 3)`: the pair's certain chapters are ["coat"] | `seedAdults(S01, **226**)`: still ["coat"] | Coat now holds Colour and Markings. A chapter is known only when every trait is certain, so the seed-3 pair is no longer certain in Coat. Seed 226 is the first whose two parents hold the same pure colour and pattern |
| state, "reads: 1 Data a trait" | `progress(a)` = 3/5 | **4/6** | the Loika has 6 traits; Coat (2) and Face (2) are read |
| state, "the cross: refusals before cost" | forecast traits = 5 | **6** | the Loika has 6 traits |
| state, "a mibi keeps the frame version it was born with" | sampled now = v3; v2 stamps S1v2 | sampled now = **v4**; v2 stamps S1v2, **v3 stamps S1v3**, v4 stamps S1v4; no genome = v4 | the Loika's frame is at version 4. The rule under test (a genome keeps its birth version on its stamp) is unchanged and now checked at three versions |

## The field guide (the game designer's call)

**Completion counts 14 looks: 6 colours, 3 patterns, 2 crests and 3 eyes.**
- Plain does not count, because a new player with no version-3 Loika can never breed it.
- Plain shows as a found look only once seen, never as an empty frame.
- A wish can pin plain only once it has been seen.
- This is the guide's rule, for the build (T-201 and the Library).

## Saves across the version change (the game designer's condition)

Checked on all 16 species: `genome-s01-v4` at 29e291b1, against station-gate's frames.

- **Saved genomes are kept.** The Station stores every pod's and mibi's genome in the save. `normalize()` re-derives from the seed only when a genome is missing (pre-genome saves). The Companion crate path keeps a carried genome when `checkGenome` passes.
- **Every version-3 genome is valid under version 4:** 300/300 for each of the 16 species.
- **The re-derive path** (old saves only), 500 seeds per species:
  - S02–S16 give the identical digest, 500/500 each.
  - S01 gives the new version-4 Loika, by design.
