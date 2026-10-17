# Each mibi drawn as itself: the genome's half (T-20261016-190)

Genome engineer, 2026-10-17. This is for the art director to plan layered stands from, and for the gate. Data: [`stand-looks.json`](stand-looks.json), with every species' look traits, their parts, the craft each needs, and how often each look occurs on real pods (300 `podGenome` pods per species, station-gate frames).

## 1. The rule (one function, used everywhere a mibi is drawn)

`drawnLooks(frame, mibi)` returns, for every **look** trait outside a sealed chapter:

- **If its chapter is read** on this mibi (`mibi.read`): the look it **shows**. This is `traitState(frame, trait, genome).shows`, the expressed look.
  - Hidden copies never draw, by construction.
  - A switch that is off draws as off, so sleeping markings stay asleep.
  - A blend draws its bin.
- **If its chapter is unread:** the stand's declared default for that trait (§4). This is never a guess at the mibi's own look.
- **Doings draw nothing on a stand.** That covers Movement, Stamina and Character, plus Glow and Charge. Glow's emission and Charge's phase already follow `builtOf`'s unread rule on the founder; on Home they would be a light effect, not a stand part.

The stand's variant key is the species, stage and size plus the sorted `trait=look` pairs of the traits the stand carries. Home, the Vivarium, a mibi up close and the Companion all call the same function, so "the same individual everywhere" holds by construction. A child read later redraws, because its key changes; nothing else does.

What a mibi has read:
- **Founders:** every look chapter is read by the time they hatch. Looks are never sealed, so a founder draws fully as itself.
- **Bred children:** only their forecast-certain chapters are read (`childKnownChapters`) until the player reads them. They draw the default for the rest, which is honest, and gives the player a reason to read their own child.

## 2. S01, the Loika: what the stand must carry

| Trait (chapter) | Locus | Stand part | Craft | Looks and share on pods |
| --- | --- | --- | --- | --- |
| Markings (Coat) | `appearance.marking-switch` (recessive switch; layout locked as patches) | the body's marking field | pattern layer, on or off | plain 78%, pale patches 22% |
| Crown (Face) | `anatomy.crown-presence` (dominant switch) | the leaf crest on the head | part on or off | leaf crest 70%, bare head 30% |
| Eyes (Face) | `growth.exterior-eye-size-ratio` (blend) | the eye rings | three sizes | thin rings 27%, between 46%, wide pale rings 27% |

Everything else on a Loika is locked: body plan, charcoal and cream, the snout, the crest's leaf form, the belly. Drive and Efficiency are doings. So a Loika stand needs:

- one base;
- one patches layer;
- one crest layer;
- three eye-ring sizes.

That is 7 pieces per stage, size and pose, composing into 12 looks. The moving sets multiply this by their cells, which is the art director's planning question, not mine.

## 3. The honest limit: four Loikas are not always four looks

The Loika has only three look traits, so 12 combinations, and the common ones are common. Of four random S01 pods, all four look different **35%** of the time. For contrast, at the gate's two-second glance:

| Species | Traits drawn | Four pods all different |
| --- | --- | --- |
| S03 | all 14 look traits | 98% |
| S03 | colour, trim and markings only | 31% |
| S09 | colour and trim only | 87% |
| S12 | colour, trim and pattern only | 95% |

So the gate line "four Loikas read as four individuals" cannot be guaranteed by the genome for S01. Two Loikas with the same three looks are, truthfully, look-alikes. Siblings will be even more alike. The genome must not be stretched to fake difference.

Recommendations:
- **The Home picture for the owner** should use four real S01 genomes whose drawn looks differ. Twelve combinations exist; I can supply four seeded pods that give four distinct looks.
- **In play,** individuality beyond the genome can come from things the genome doesn't claim: stage, pose, where each one is, the name on focus (T-191's glance). None of these may imitate a trait: no tint, no extra marking, no size.
- **For the deeper species,** the gap closes on its own. Most have 6–18 look traits, and colour plus pattern alone separate most households.

**Four real Loikas for the owner's picture.** These are `podGenome(S01 frame, gs)` on station-gate, each a different look:

| Pod seed (`gs`) | Draws | Digest | Its copies (Markings, Crown, Eyes) |
| --- | --- | --- | --- |
| 12 | plain, leaf crest, wide pale rings (the stand as painted) | S01-e2dd6eaf | off/on (**carries pale, hidden**), on/on, huge/huge |
| 13 | pale patches, leaf crest, between | S01-2a2e1a81 | on/on, off/on (carries bare), huge/large (a blend) |
| 14 | plain, bare head, thin rings | S01-676d24c7 | off/on (carries pale), off/off, large/large |
| 107 | pale patches, bare head, wide pale rings | S01-1cb031b7 | on/on, off/off, huge/huge |

Pods 12 and 14 hide a pale copy that nothing on the stand shows. That is right, and it is exactly what T-191's glance can reveal one press down.

## 4. Which "typical" an unread trait draws

The type specimen is the wrong default. It is defined as every open part switch on and the middle of each pool, so it draws S01 with pale patches, which only 22% of Loikas show. A child with an unread Coat would then wear patches it probably doesn't carry.

The proposal:
- Each stand declares its default look per trait, and that default **is the stand as painted today**. For the Loika on the Home golden that is plain, leaf crest and wide pale rings.
- The data check: each declared default must be a look the species' pool can produce. I'll add the test once the art director names the defaults.
- On Home, an unread trait draws the default **with no veil**, since the cozy window stays clean. T-191's glance marks the chapter as unread, so the player can tell "not read yet" from "this is its look" one press away.

## 5. For the other species (planning order, from `stand-looks.json`)

Group the look traits by the craft they need. Do the cheap, high-signal ones first.

1. **Palette:** Colour and Trim, which are pigment slots, a recolour of existing layers.
   - Most species have 4–10 colour looks, and colour alone separates most households.
   - Caution: a heterozygous pigment pair shows **both** pigments (the look word "two side by side" or "cobalt and jade"). Draw from the two pigments, not from the word: the word "two side by side" hides which two.
2. **Pattern layers:** Markings, Pattern, Spots, Mask, Tail rings, as on or off layers or a layer per look.
3. **Parts on or off:** crest, crown and similar presences.
4. **Proportion swaps:** eyes, snout, build, tail length, haunch. These are three bins each, and subtle at 144×152. Do them last, and only where a bin reads at that size.
5. **Form swaps:** body (egg, barrel or pear), feet, ears. These are expensive, and per species.

## 6. A defect found while mapping (mine to fix)

`lookOf` for S03's Claws (`anatomy.contact-terminal-form`, a 6-allele pool) returns raw allele ids ("root", "pad", "hoof", "webbed", …). The frame's looks for the trait are "round feet / pads / digging wedges". The stand and the bay need one vocabulary.

I'll file it as a framework ticket: make `describe.mjs` bin the six forms into the trait's three looks, or widen the trait's looks to what the pool holds. The game designer chooses the words.

## 7. For T-191's glance (the truth check)

Every mark the glance shows must come from the same `drawnLooks` / `traitState` and the mibi's `read`:
- chapter marks only for read chapters;
- the gold glint only where the code's `glint` would say so;
- no hidden copy;
- no forecast as fact.

I'll check the wireframes against the frames when they land.
