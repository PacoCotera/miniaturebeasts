# Trait names: one word each

**Status: Working rule: applied, to be seen in action.** The fifteen names are in the species frames (`prototypes/workbench/framework/species.mjs` and `roster.mjs`, frames rebuilt) and the four line changes are in the Pods trait lines (`prototypes/station/src/genome.mjs`), for the owner's and the game designer's confirmation once seen in the Station. Trait ids are unchanged.

## Why

The chapter rail shows one word per tab (the decided exception is "Legs & tail"). Trait names show on the Pods page as picture labels (16 px, a cell 120 to 184 px wide) and in the Library. Sixteen trait names in the sixteen species frames run to two words. This proposal gives each a single word, and shortens the trait lines on the Pods page that run past six words.

The words follow the decided tone: plain, a naturalist's field terms, never cute. None is taken from another game, franchise, book or toy line. Each is distinct from the other trait names in every species chapter that carries it.

## 1. The names

Sixteen current names become fifteen words: "Leg colour" and "Second colour" are the same trait (the second pigment slot, `appearance.underside-palette`) and take one name.

"Facts" are from the frame (looks, loci, `consumer`) and from `framework/describe.mjs`, which writes a trait into prose as its lower-cased name followed by the look ("ears upright", "topline arched"). "Clearance" is in section 3.

| Chapter | Species that carry it | Current | Proposed | Alternative | Facts behind it |
| --- | --- | --- | --- | --- | --- |
| Face | Loika | Eye rings | **Eyes** | none | Looks: thin rings, wide pale rings. One locus, `growth.exterior-eye-size-ratio`. "Eyes" is already the Face trait in twelve other species. |
| Coat | Untuva | Cap colour | **Tint** | none | `appearance.cap-palette`, the cap's own pigment slot. Ten looks: one colour or a pair of coral, raspberry, marigold, plum. |
| Coat | Untuva | Cap spots | **Flecks** | none | `appearance.cap-spots`: bare or spots on the cap. Untuva's Coat already has "Spots" (body markings: bands, spots), so the word has to differ. |
| Shape | Untuva | Cap size | **Span** | Brim | `growth.wing-span-ratio` and chord. Looks: small cap, wide cap. The cap is a cap of flaps; `describe.mjs` already says "short flaps" and "wide flaps" for the span ratio. |
| Coat | Tuikis | Leg colour | **Trim** | Accent | `appearance.underside-palette`, the second pigment slot, which the sketch paints on chains, flaps, ears, tail, belly and masks. Looks: milk-mint, cream, ice, slate, two side by side. |
| Coat | Azkon, Rupar, Belatz, Igara, Kilpo, Peplos, Oskol | Second colour | **Trim** | Accent | The same locus. Looks: cream, peach, ice and pairs of them. |
| Shape | Tuikis, Tepor, Pesko, Rupar, Belatz, Peplos, Oskol, Usvel, Lehten | Hind body | **Haunch** | Rump | `growth.region-taper` (how much the rear region keeps). Looks: small, full. Reads "haunch full". |
| Shape | Tuikis, Hiljan, Pesko, Belatz, Igara, Usvel | Back line | **Topline** | none | `growth.region-bend`. Looks: dipping, level, arched. `describe.mjs`: "an arched back", "a dipping back". "Topline" is the standing term for the line of an animal's back. |
| Legs & tail | Tuikis, Tepor, Belatz | Tail curl | **Carriage** | none | `growth.axial-tail-bend`. Looks: hangs, straight, curls up. `describe.mjs`: "the tail curled up", "the tail hanging". "Carriage" is the field term for how a tail is held, and sits beside "Tail" (length and thickness) without repeating it. |
| Glow | Tuikis, Blikur | Glow length | **Duration** | Linger | `appearance.emission-length`, a behaviour (how long the glow lasts). Looks: a flicker, all evening. The chapter is also called "Glow", so the word must not repeat it. |
| Coat | Azkon, Rupar, Belatz, Igara | Fur reach | **Tufts** | Brush | `appearance.fur-reach`: the fur material on the tail, and on the ears too. Looks: body only, bushy tail, bushy tail and ears. Separate from "Fluff" (length and flow). |
| Face | Azkon, Rupar, Igara | Ear tilt | **Ears** | none | `anatomy.ear-tilt`. Looks: upright, drooping. Reads "ears drooping". Rupar's Face is Eyes, Head, Ears, Horns: distinct. |
| Coat | Kilpo | Shell plates | **Scutes** | Plating | `appearance.shell-plates`: a plate field on the shell. Looks: smooth, plated. "Scute" is the zoologist's word for a shell or body plate. Kilpo's Shape chapter has "Shell" (dome height), so "Shell" is taken. |
| Coat | Peplos | Flap markings | **Pattern** | none | `appearance.flap-marking`, a marking field on thin surfaces. Looks: plain, spots, bars, bars and spots. Peplos Coat: Colour, Translucency, Pattern, Trim. |
| Shape | Oskol | Wing cases | **Sheaths** | none | `growth.wing-case-extent` and the case seam. Looks: short, closed; long, parted. A wing sheath is the beetle's own term. "Cases" was rejected (section 3). |
| Stamina | Lehten | Light feeding | **Basking** | Appetite | `energy.light-feeding`, uptake from light. Looks: shade-happy, sun-hungry. Reads "basking sun-hungry". Lehten's Stamina: Strength, Reserve, Thrift, Basking. |

The count: 16 current two-word names, 15 proposed words (one word, "Trim", serves two current names). Seven of the fifteen have an alternative (Span, Trim, Haunch, Duration, Tufts, Scutes, Basking); the other eight are a clear single pick.

### Distinct within each chapter

Checked in all sixteen frames: after the change, no species has two traits with the same word in a chapter, and none repeats its chapter's name. Chapters that change, as examples:

- Untuva Coat: Colour, Spots, Fluff, Tint, Flecks. Shape: Roundness, Body, Span.
- Tuikis Coat: Colour, Trim, Markings, Scales. Legs & tail: Legs, Claws, Tail, Carriage. Glow: Glow, Duration (the trait "Glow" sharing its chapter's name is already so in the frame and is not changed here).
- Belatz Coat: Colour, Fluff, Tufts, Trim, Sheen, Feathers.
- Kilpo Coat: Colour, Trim, Sheen, Scutes. Shape: Body, Waist, Haunch, Shell.
- Oskol Shape: Body, Waist, Haunch, Sheaths.

Two close pairs to be aware of: in Untuva's Coat, "Tint" sits beside "Colour" (the body colour) and "Flecks" beside "Spots"; the picture labels make the part obvious (the cap is drawn), but if the owner prefers the cap named, the only one-word choice is "Cap" for the colour, which this proposal does not recommend. In prose `describe.mjs` writes "span wide cap" and "scutes plated"; those two look strings can drop the repeated word ("wide", "plated" stay) when the copy is next revised.

Outside this brief, noticed in the frames: Tuikis's "Claws" has the id `feet` and looks "round feet, pads, digging wedges", so the name and the looks disagree. Not changed here.

## 2. The Pods page: trait lines past six words

The Pods line is built by `prototypes/station/src/genome.mjs` (`traitStateOf`): `shows X · hides Y`, `only X`, a blend, an asleep line, and "breed to change". Counting words, `only X` and "breed to change" never pass six. The others do, because the look is two or three words and appears twice.

Lines past six, with the longest real case for each (from the frames' own looks):

| Trait | Current longest line | Words |
| --- | --- | --- |
| Scales | shows a few fine scales · hides many coarse scales | 9 |
| Cap colour (Tint) | shows coral and raspberry · hides coral and marigold | 8 |
| Second colour (Trim) | shows cream and peach · hides cream and ice | 8 |
| Fluff | shows short and straight · hides long and swept | 8 |
| Fur reach (Tufts) | shows bushy tail and ears · hides body only | 8 |
| Colour (body, per-species pigment pairs) | shows russet and lagoon · hides russet and charcoal | 8 |
| Colour / Leg colour | shows coral · hides two side by side | 7 |
| Eye rings (Eyes) | shows wide pale rings · hides thin rings | 7 |
| Leaves | shows many long · hides a few short | 7 |
| Asleep (Spots, Pattern) | bare · asleep: bands or patches, if they wake | 8 |
| Blends: Scales, Fluff, Eye rings, Leaves, Glow length | half a few fine scales, half many coarse scales (and the like) | 7 to 10 |

### Proposed lines

Four small changes, all keeping every fact:

1. **Drop the leading "shows" on a hides line.** The picture is the thing that shows; the seed carries the hidden look. `wide pale rings · hides thin rings`. "only X" keeps its word. (This changes the decided example "shows stripes · hides spots" in `station-screens.md` and the play manual; it becomes "stripes · hides spots".)
2. **Write a pair of colours with a comma, not "and".** `coral, raspberry · hides coral, marigold` (5). The frames already use commas this way ("small, close", "short, fine").
3. **Shorten the three looks that carry a noun the trait name already gives.**

   | Trait | Current looks | Proposed looks | Line |
   | --- | --- | --- | --- |
   | Scales | a few fine scales, many coarse scales | few, fine; many, coarse | `few, fine · hides many, coarse` (5) |
   | Fluff | short and straight, long and swept | short, straight; long, swept | `short, straight · hides long, swept` (5) |
   | Tufts (Fur reach) | body only, bushy tail, bushy tail and ears | body only, tail, tail and ears | `tail and ears · hides body only` (6) |
   | Leaves | a few short, many long | few short, many long | `few short · hides many long` (5) |
   | Glow length (Duration) | a flicker, all evening | flicker, all evening | blend `flicker to all evening` (4) |

4. **Say the sleeping layout without the apology, and write a blend as "A to B".** `bare · asleep: bands or patches` (5) instead of `bare · asleep: bands or patches, if they wake`; the sleeping drawing and the play manual carry "if they wake". A blend becomes `thin rings to wide pale rings` (6) instead of `half thin rings, half wide pale rings`.

After these, the longest line in any frame is six words (`thin rings · hides wide pale rings`, `coral · hides two side by side`, `body only · hides tail and ears`, `thin rings to wide pale rings`); a script run over every pair of looks in all sixteen frames confirms none is longer. `describe.mjs` is unaffected by the line rule; it uses the look labels, so the shortened looks above also read well in its prose ("scales few, fine", "tufts tail and ears").

## 3. Clearance record

Method: every proposed word and alternative searched as `"word" creature game character toy brand` (the search returns general web results and is noisy; every hit was read). A name may coincide with something that exists only if that thing is completely unrelated. Spanish readings are for English and Mexican Spanish.

| Word | What came up | Verdict | Spanish reading |
| --- | --- | --- | --- |
| Eyes | Not searched: it is the existing decided Face trait in twelve frames, a body-part noun | Clear | ojos, the same meaning |
| Tint | Nothing named Tint. Hits were a Ty plush called Tang, Tintin figures, a Schleich creature line | Clear | "tinte" (dye) and "tinto" (red wine, Mexican): the English sense, harmless |
| Flecks | Nothing. Hits were Fuggler, Flockies, a Pokemon (Fletchling), unrelated | Clear | No meaning ("fleco" is a fringe) |
| Span | Nothing. Hits were Spawn (a comic), other toy lines | Clear | None |
| Brim | Nothing. A Gears of War creature, Brumak, came up, a different word | Clear | None |
| Trim | Nothing creature-like. A Mattel "TRIM TRK" trademark for toy vehicles and a Funko "Trim the Tree" game: unrelated | Clear | None |
| Accent | Nothing. Hits were novelty-toy makers | Clear | "acento", the same meaning |
| Haunch | Nothing. Hits were Haunt (a comic character) and a hunchback figure, different words | Clear | None |
| Rump | Nothing under the bare word. A designer-toy rhino and a toy company are named Rumpus, a different word | Clear (alternative only) | None |
| Topline | Nothing with this name in any creature, game or toy results | Clear | None |
| Carriage | Only toy carriages from doll lines (Calico Critters, Enchantimals, Disney Princess): the vehicle, unrelated | Clear | None |
| Duration | Nothing. Hits were glow-creature toys (Glimmies, Glo Pals) with other names | Clear | "duracion", the same meaning |
| Linger | Nothing | Clear (alternative only) | None |
| Tufts | Nothing. Hits were Tootsville Toots, Kinectimals, Pound Puppies | Clear | None |
| Brush | Only the fox's tail, which is the term itself; no character or brand | Clear (alternative only) | "brocha", unrelated |
| Ears | A Soosh creature game lists "Ears" as one of its trait categories (Perky, Floppy, Lop). A body-part noun used as a category, not a creature or character | Clear, as a plain noun | "orejas", the same meaning |
| Scutes | Nothing named Scutes. A toy Scutosaurus appeared, a different word | Clear | None |
| Plating | Nothing | Clear (alternative only) | None |
| Pattern | Critical Role's "The Pattern" (a tabletop-game lore item) came up; it is not a creature, trait or brand of ours, and "pattern" is a plain noun | Clear, as a plain noun | "patron", unrelated |
| Sheaths | A video-game villain named Sheath (Project X Zone 2) came up: singular, a person, unrelated | Clear | None |
| Cases | **Rejected.** "The Creature Cases" is an animated series with a toy line of animal figures: too near a creature brand | Not used | |
| Basking | Nothing. A basking-shark figure, unbranded | Clear | None |
| Appetite | Nothing. Hits were hungry-monster toys with other names | Clear (alternative only) | "apetito", the same meaning |
| Hue | **Not offered.** A puzzle game called Hue and a character of that name exist | Not used | |
| Specks | **Not offered.** A Ty Beanie Boos elephant named Specks, covered in speckles: too near | Not used | |
| Curl, Rings | **Not offered as alternatives.** Curlimals (a plush line of animals that curl up) and Lord of the Rings results: near a toy line and a franchise | Not used | |

No name needed to be dropped without a replacement: every proposed word cleared. The two weakest are "Ears" and "Pattern", both plain nouns that also appear in other places; they are the words a reader would expect, and the owner can swap them.

## 4. Questions for the owner

1. **Trim for the second pigment slot.** One word for what is "Second colour" in seven species and "Leg colour" in Tuikis. "Trim" is neutral; the cost is that Tuikis loses "leg" (its slot also paints the ears, tail and belly). Recommendation: Trim; Accent as the reserve.
2. **Dropping "shows" on the Pods lines.** It is the one change that touches a decided example ("stripes · hides spots"). Recommendation: yes, with commas for colour pairs; the alternative is to keep "shows" and shorten the looks harder, which loses facts.
3. **Untuva's cap.** "Tint", "Flecks" and "Span" name the cap's colour, spots and size without the word "cap". Recommendation: confirm; the picture shows the cap.
