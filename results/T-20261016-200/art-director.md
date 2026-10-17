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
- **The third is sky,** a clear cerulean.
  - **Why not slate:** slate failed the four-grey test. Its value sits on russet's, so a russet-and-slate two-tone would merge.
  - **Why sky:** it is a value step above russet and cool against it, so the three pigments are dark, middle and light (`loika-four-grey.png`), and every two-tone splits into two values.
  - It reads on Home's moss, it isn't green, and the cream stripes and patches still hold on it.
  - It is saturated, not pastel, so it doesn't read as a nursery colour.
- **The three pure looks** are painted ramps, as above.
- **The three mixed looks** (charcoal and russet, charcoal and sky, russet and sky) are one painted two-tone, not a blend: the first pigment over the back and head, the second over the flanks and legs. The split follows the body (a share of each column of fur from its top), with a short painted edge. A mixed Loika shows both its pigments, and a player can read which two.

**Pattern: every Loika is marked, three looks that stack.**
- **Stripes:** broad pale bands behind the shoulder, bowing back down the flank and tapering to a point, shaded by the fur under them. They are a full value step from the coat, so they read on charcoal at 144 × 152 (the creative director's point). They never cross the head.
- **Patches:** the accepted marked layer (T-190).
- **Stripes and patches:** both layers, stacked.

**Amount** (how much of the coat, three bins), if the frame adds it, scales the stripes' count and the patches' coverage within the same layers.

**The crest and eyes** are unchanged by N2 and are drawn as T-190's base.

**Still to come:** the four real pods, for the redrawn window.
