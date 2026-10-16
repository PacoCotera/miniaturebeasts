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
