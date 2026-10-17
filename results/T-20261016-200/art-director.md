# The Loika's looks as painted layers: the art director's part (T-20261016-200)

The owner: "yes, finetune loikas. / also coat marks can be different between individuals." This extends T-190's layered stand (a base plus one layer per locus) with a Colour layer and coat-mark layers. Built in `make-range.py`, on `results/T-20261016-190/make-stands.py`.

`loika-range-home-size.png` shows every colour against every mark, at Home's resident size (144 × 152) at 1×, and the juvenile stand-in recoloured at its size (104 × 112).

**The looks here are provisional.** The genome engineer's new S01 frame will name the Colour looks and the coat marks, and say whether marks stack. The layers are refitted to it, and the four-Loika window is redrawn from four real pods of that frame, once it lands.

## Colour is painted, never tinted

- **A painted ramp.** Each colour is three painted stops: shadow, mid and highlight. The stand's own fur lightness picks the stop at every pixel, so the form, the top-left light and the fur's texture all stay. A flat tint would lay one hue over the shading and kill it, and the guide forbids it.
- **Shadows cool, highlights warm,** within each ramp, as the scene's light does.
- **What keeps its own colour:** the belly's cream, the eyes, the crest's leaves and the pale marks. Colour is the coat, not the whole animal.
- **No green coat.** The crest is leaf and Home's floor is moss, so a green Loika would vanish into both. That is why plum stands in the range where a moss coat would have gone.
- **The juvenile** takes the same ramp on its dark cap, so the colour carries from juvenile to adult.

## Coat marks follow the form

| Mark | The layer |
| --- | --- |
| none | the base |
| pale patches | the accepted marked/plain pair's difference (T-190) |
| spots | small pale spots spread over the flank, never clumped, their cream shaded by the fur under them so they sit on the body's curve |
| saddle | a deeper band over the back, away from the head, with soft edges |

- **One mask drives every layer.** It comes from the base stand, so a mark lands in the same place on every colour.
- **The juvenile's marks** are its own layers, to come. Its pattern is a dark cap over a cream body, not the adult's.

## How it reads at Home's size

- **The silhouette carries most:** colour across the whole coat, and the crest (T-190).
- **Then the marks:** spots and patches read at 144 × 152 on every colour. The saddle is the quietest, clearest on the light coats (russet, slate, plum) and faint on charcoal. If the frame keeps it, it gets a stronger value step on dark coats.

## Owed, and the gates

- **This is a proof.** The ramps are applied by code over the accepted painting, and the marks are drawn masks. Masters are painted layers, one per look per pose, and need the lead's approval before any request.
- **The four-Loika window** from real pods of the new frame waits for the genome engineer's pods.

## Redrawn to the likely frame (`loika-range-likely-frame.png`)

The genome engineer gave the frame's likely shape, so the range follows it. `loika-range-home-size.png` stays as the record of the method; its cocoa, plum, spots and saddle are not in the framework.

**Colour: co-dominant, three pigments, six looks.**
- **The pigments:** charcoal, russet and a third. The list is settled on the genome engineer's N2.
- **The third is periwinkle,** a catalogue pigment, as the frame requires. Sky, my first pick, isn't in the catalogue.
  - **Why not slate or plum:** both fail four-grey. Their middle value sits on russet's, so a two-tone with russet would merge.
  - **Why periwinkle:** it is the one catalogue pigment that is a value step above russet, cool against it, and not green. The three pigments read dark, middle and light (`loika-four-grey.png`), and every two-tone splits into two values.
  - It reads on Home's moss, and the cream stripes and patches still hold on it.
**The three mixed looks** (charcoal and russet, charcoal and periwinkle, russet and periwinkle) are one painted two-tone, not a blend: the first pigment over the back and head, the second over the flanks and legs. The split follows the body (a share of each column of fur from its top), with a short painted edge. A mixed Loika shows both its pigments, and a player can read which two.

**Pattern: every Loika is marked, three looks that stack.**
- **Stripes:** broad pale bands behind the shoulder, bowing back down the flank and tapering to a point, shaded by the fur under them. They are a full value step from the coat, so they read on charcoal at 144 × 152 (the creative director's point). They never cross the head.
- **Patches:** the accepted marked layer (T-190).
- **Stripes and patches:** both layers, stacked.

**Amount** (how much of the coat, three bins), if the frame adds it, scales the stripes' count and the patches' coverage within the same layers.

**The crest and eyes** are unchanged by N2 and are drawn as T-190's base.

## The window from four real pods (`home-window-four-v4-pods.png`, `make-window.py`)

These are the genome engineer's seeds, each drawn from its read looks on T-190's ground rows with contact shadows:

| gs | Read looks |
| --- | --- |
| 165 | charcoal, patches, leaf crest, eyes between |
| 168 | russet, stripes, leaf crest, wide pale rings |
| 10 | charcoal and periwinkle, stripes and patches, bare head, thin rings |
| 116 | periwinkle, patches, leaf crest, thin rings |

- **The four read as four at a glance,** carried first by colour, then by the marks and the crest.
- **The two hidden bare heads** (165 and 168) don't show: hidden copies never draw.
- **The creative director's check:** gs 168's stripes and gs 10's stripes and patches read as two looks.
- **Four-grey** (`home-window-four-v4-pods-four-grey.png`): the four still separate. Charcoal is dark, russet middle, periwinkle light, and the two-tone splits dark back from light legs.
- **The proof's honest limit:** the bare head and the eye rings are T-190's proof edits, and the colours and marks are applied by code. The masters are painted layers, after the lead's approval.

## The third pigment, fourth try (the creative director's not-yet, 168ae71c)

Periwinkle read as a plastic toy: the brightest, most synthetic colour on the moss. It stays only as the record (`home-window-four-v4-pods.png`). The brief: light (a value step above russet), a muted natural animal colour in the vivarium's warm light, not green, and in the catalogue.

- **The catalogue has no muted light pigment.** Its body pigments are charcoal, russet, jade, lagoon, cobalt, periwinkle, plum, raspberry, coral and marigold. The framework only names the pigment, though, and its paint is the art's. So there are two ways to meet the brief, both shown in the same window with their four-grey twins:

| Option | The window | Four-grey | Cost |
| --- | --- | --- | --- |
| **Marigold, painted as a warm fawn** (shadow #623c24, mid #bc8858, highlight #eac498) | `home-window-four-v4-pods-marigold.png` | `…-marigold-four-grey.png` | None: it is in the catalogue. Only its word in the guide reads "marigold" for a fawn coat; the genome engineer says whether the look's label can say "fawn" |
| **Ash, a dove grey-blue** (shadow #464e5a, mid #8e98a4, highlight #ccd2da) | `home-window-four-v4-pods-ash.png` | `…-ash-four-grey.png` | Not in the catalogue. Adding it is a catalogue version; the genome engineer gives the cost |

- **Both pass four-grey:** light, a clear step above russet, and every two-tone splits into two values. Both are muted, natural and not green.
- **Fawn is warm.** It sits beside russet in hue but well apart in value, and it stays clear of the cream belly. Its cream patches read softer than on the dark coats.
- **Ash is cool.** It stands apart from the moss and from both other pigments in hue as well as value, and its patches read clearly.
- **My pick:** ash, if a catalogue version is cheap. Otherwise fawn, in marigold's slot, which costs nothing now.

**Settled: ash** (catalogue 10, #8e98a4, the genome engineer at 29e291b1). The creative director passed it (24605129). The range (`loika-range-likely-frame.png`) and `loika-four-grey.png` are redrawn with ash, and `home-window-four-v4-pods-ash.png` with its four-grey twin is the window. The periwinkle and fawn files stay as the record.
