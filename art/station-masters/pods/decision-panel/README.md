# T-20261016-47: the decision panel's look (AD, 10-16, by hand in code)

The owner (13:26): "good with the big panels, visually we must make them very interesting. not sold on that cream color and lots of text."

The panels are the game's big moments, so they look like events, not forms: the outcome shown as the thing itself, lit on a small stage; the costs as icons on rubber chips; one short line. There is no cream paper card.

The style is `design/art-direction.md` and `design/style-guide/README.md`. Every module and card is the device's own plate ("Device plates … cut from the housing, placed 1:1 … never a fill"); the sage frame stays; no new motif. The structure, rects and words are `specs/station-decision-panel-spec.md` (T-20261016-45). No paid call.

| Id | Size, place | Job |
| --- | --- | --- |
| `panel-housing-840x440` | at (92, 80) | The panel: the house device plate (sage bezel, dark matte well), radius 12 |
| `panel-card-{248,380,776}x288` | the cards (y 152) | An option: the kit's recessed well |
| `panel-card-…-focused` | the focused card | The well one step up, so the focused option's ground lifts. The frame's ring is drawn over it by code |
| `panel-stage-{216,348,744}x48` | at (x + 16, y + 136) in a card, under the picture slot | The outcome's stage: a low moulded sage plinth topped with the vivarium's moss, in a soft pool of warm light. The picture is bottom-centred on the slot's floor (y + 168), so it stands on it |
| `panel-chip-40x20` | behind each cost group | A dark rubber pill, nine-slice (insets 10 left and right), stretched round an icon and its figure |
| `panel-veil-1024x522` | over the stage at (0, 40) | The veil: a flat layer, `stageGround` at 62 %, deeper at the edges. Not the spec's dither: the guide's flat layers are never dithered. The top bar and the bottom line stay clear |

**Colours** (the frame's roles; no new colour):
- the title in `bone` at 28 (600);
- the name in `bone` at 20 (500);
- costs in `focus` (a gain "+n" in `bone`, as `turn`);
- the line in `mist`, a loss in `amber` (`need`).

**Proofs** (`proof/`, labelled inside each image):
- `panel-grow-over-create-1x.png`: Grow this founder?, arrival mode, two cards, over station-gate 54bde362 `create-shape`.
- `panel-return-over-vivarium-1x.png`: Return Pip?, a loss and a way out, over `habitat-card`.
- **Stand-ins (the build's):** the words, the icons (cropped from the golden's top bar) and the focus ring.

## T-20261016-70: the subject stands on a lit stage; the chips; the Return outcome as one picture
The review (`results/review-art-2026-10-16b.md` §4) found four problems:
- the subject floated about 10 px over a flat coaster;
- the pool was a faint band;
- the chips were missing;
- Return was a pasted square.

**The stage, repainted** (`panel-stage-{216,348,744}x48`, at (x + 16, y + 136)):
- **The plinth has depth:** its top is a disc of the vivarium painting's own moss (the old one sampled soil from the golden). Its front face is moulded sage with a lit lip, darkening toward the floor.
- **The pool:** a warm pool lies on the top round the feet and spills onto the well beside it.

**The light, new** (both at the picture slot (x + 16, y + 16)):
- `panel-glow-{w}x160`, under the picture: the pool's warm light rising on the well's back wall, so the tile is lit, not an empty dark well.
- `panel-light-{w}x160`, over the picture: the pool lighting the subject from below at partial alpha, strongest at the feet line, so the subject is rimmed by its stage's light.

**The composite rule** (per card, in order):
1. `panel-glow-{w}x160`, or for "back to the wild" `panel-scene-wild-{w}x152`;
2. `panel-stage-{w}x48`;
3. `panel-contact-shadow-128x16`, centred on the feet line and stretched across the feet's span plus 16;
4. the picture, 1:1 and centred, with its **feet line on y + 168**. The feet line is its lowest row with alpha ≥ 128 (the mibi families' ground row). This is the slot's floor and the plinth top's centre line;
5. `panel-light-{w}x160`.

**The subject's height per tile** (the slot is 160 tall, so half is 80):

| Picture | Figure height | In the 248 / 380 / 776 tiles |
| --- | --- | --- |
| `mibi-juvenile-S01-176x128` (new) | 110 px | 69 % of the slot (fits the 216 slot width) |
| `mibi-adult-S01-144x152` | 138 px | 86 % |
| `mibi-juvenile-S01-104x112` (the spec's §1.6 picture) | 69 px | 43 %, under half: replaced in the proofs by the 176 × 128 |

- **The new juvenile:** `mibi-juvenile-S01-176x128` is made by `make-subject.py`. It is the 304 × 312 painting, its empty top cut away, reduced ×176/304 (never enlarged). UI/UX names it in §1.6 in place of the 104 × 112; other species need the same cut from their 304 juvenile.
- **The rule for any picture:** it must stand at least 80 px tall.

**The chips:** each cost group sits on `panel-chip-40x20`, nine-sliced (10 px caps, the middle stretched), with the icon 8 px in and 8 px between groups.

**The Return outcome:** `panel-scene-wild-{216,348,744}x152`, one master per card width for the outcome "back to the wild".
- **The ground:** the vivarium's own painting (`idle-vivarium-day`: sunlight through the forest, the moss in front), faded into the well at its top and sides and into the plinth's moss at its foot.
- **The mibi:** the build composites it on the scene by the rule above, 72 px right of centre, facing the light. The scene stays the same for every species.
- **"Kept":** this outcome has no scene. It is the mibi as it is, on the stage with the glow.
- **Places:** a scene per place (the meadow and the rest) would come from each place's own painting, if the game wants it.

**Proofs** (`proof/`, labelled inside each image): `panel-grow-over-create-1x.png` and `panel-return-over-vivarium-1x.png`. Stand-ins: the words, the icons and the ring.
