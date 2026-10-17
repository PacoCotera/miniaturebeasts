# How the glance sits on the living window (T-20261016-191, the art director's part)

UI/UX owns the glance's content, placement and life (`ui-ux.md`). This part covers its ground, edge and shadow, the paint for the ring and the kin mark, and whether they read on every ground. Painted at 1× on the Home golden B-20261016-4 (`make-glance.py`):

| | Shows |
| --- | --- |
| `glance-painted-moss.png` | Moss focused on the moss: the ring under its feet, the glance 8 below it, gold glint on Coat (unread). Kin on Bean, mostly behind Dot's feet |
| `glance-painted-bed.png` | Bean focused in the bed: the glance above its head (placement rule 2), no glint. Kin on Moss, on the soil |
| `glance-reading-sheet.png` | at 3×: the ring and the kin mark on moss, bed and soil; the glance's states (read, unread, sealed, glint) |

## The call: the glance is a small piece of Home's own face

The glance belongs to the instrument, not the life. So it is painted as the instrument is, and it does not pretend to be a stone in the moss.

- **Ground:** an opaque slate pane (`panel`), radius 8, with the pane's `hairline` edge and a `bevel` lip at the top left. It uses the same material as the module column, so the eye reads it as the machine reaching into the window. It is not glass, and not a label laid on the scene.
- **Marks in wells.** Each 24 px mark sits in its own small recess: `ground`, dark at the top left and lit at the bottom right, like the column's recesses (T-192, round 2). It reads as a row of sockets, not as stickers on a bar.
  - **Read:** the bone mark.
  - **Unread:** the frost mark inside a dotted `mist` edge, so the content never shows.
  - **Sealed:** the mark faint, under three slats.
- **Shadow:** the scene's one light, from the top left, gives a tight contact shadow (about 1 right, 2 down, soft over 2 px, `ground` at about 60%). This is what stops it floating. Without the shadow it is a sticker over the painting. With a long, soft shadow it would hover. Tight, it rests where it is.
- **The glint** is the one colour on the glance: the four-point glint in `gold`, 12 px, with a 1 px `ground` keyline so it holds on both the pane and the painting. It sits at (16, −4) and breaks over the pane's top edge, as on Create.
- **Quieter than the ring.** The pane has no light edge and no glow. The ring is the only focus-colour stroke on the window, so the eye goes to the animal first and to the glance second.
- **Not drawn:** no pointer or tail to the animal (that is a tooltip), no translucency, no lift. The tie to the resident comes from being centred on its footprint and appearing and leaving with the ring.

## The ring and the kin mark: on the ground, under the feet

- **Under the feet.** Both are footprints, so they lie on the ground: the build draws them before the resident's sprite, and the feet and fur stay in front. Drawn over the feet, the ring would read as a hoop around the ankles.
- **A dark keyline.** Each has a 1 px `ground` keyline just outside it. The ring reads on all three grounds in the sheet:
  - On soil it reads without help.
  - On the bed's lit moss, the 2 px `focus` stroke alone dissolves into the light, and the keyline holds it.
- **Kin** is 2 px `fog`, dashed (dashes about 4 px), with the same keyline. It is quieter than the ring in two ways: the colour (fog against focus) and the broken line. The keyline is what makes it read on moss at all, which answers the wireframe's "barely reads". Where a relative's feet are hidden, the mark is hidden with them: in `glance-painted-moss.png`, little of Bean's mark shows behind Dot.

## Two corrections to the wireframes

- **The cream tiles.** In `02` the marks sit on sand-coloured tiles. Painted that way, that is the cream-panel fault on the most-seen screen. The wells are `ground`.
- **The pane outline.** In `01` the pane has a light outline, which reads as glass. Painted, it takes only the hairline and the bevel.

## Open points

- **Above the head** (`glance-painted-bed.png`) is the weaker case. Nothing physical is under the pane there, so the same shadow carries it. It holds at 1×, because the pane stays small and dark.
- **The old stands.** The proof is painted on today's stands. The glance does not depend on T-190's individuals.

## For the build

- **No new painting.** The pane is the existing pane primitive; the marks are the Habitat's 24 px emblems; the glint is Create's.
- **The keyline and shadow** take `ground` from the palette.
- **Order:** the ring and the kin mark are drawn under the resident's sprite.
- **No paid calls** were made.
