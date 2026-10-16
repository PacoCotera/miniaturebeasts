# T-20261016-35: the place badges at 32 (AD, 10-16, by hand)

The collection well's place badge (`specs/station-pods-purpose.md` §1, work-queue). Two sealed pods of one species look the same; where each was found is what makes it the player's own.

`make-places-32.py` paints `place-{meadow,pond,rock,wood,cave}-32x32` from the same paintings as the 48s and 64s, using `tools/build.py` `places()`'s own recipe at 32. They are never scaled from the 48 or 64. Before writing, it rebuilds all ten signed 48s and 64s byte for byte, which proves the paintings and the recipe are the signed ones.

**At 1× on the collection's well** (`proof/collection-places-32-1x.png`, the station-gate 69ea1d23 golden with the badges at their places (256 + 300c, 216 + 240r); `proof/places-32-4x.png`):
- **pond:** a ring of water.
- **rock:** grey stones on earth.
- **cave:** a dark mouth in pale rock.
- **meadow:** light grass with small flowers.
- **wood:** a canopy seen from above. It is the weakest of the five: at 1× it reads as dense wood or scrub. It stays distinct from the meadow by its darker tone and lumpy texture.

All five carry their place, and no symbol was invented. If the gate finds the wood too close to scrub, the fix is a repaint of the wood painting itself, not a symbol.
