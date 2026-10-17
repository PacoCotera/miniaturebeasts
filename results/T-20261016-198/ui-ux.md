# T-198: how a held and an owed sitting show (UI/UX part)

This part is built on the game designer's rule (`specs/sittings-never-lost.md`, choice (a), the queue). It is drawn on the passed T-192 column (v2):

| File | Shows |
| --- | --- |
| `ui-ux-held.png` | one sitting held |
| `ui-ux-held-and-owed.png` | one held, more owed |
| `ui-ux-detail-3x.png` | both states, at 3× |

## Where and what

- **The held sitting:** one gilt frame, 40 × 30, in the Probe well's lower left, 8 in from the well's edges and clear of the Probe. It is today's `home-sitting` frame, moved from the old Probe plate's slot into the T-192 well, with its contact shadow. It has no lamp and no word.
- **Owed sittings:** while one or more are owed, the edge of one more frame shows behind the held one, offset 4 left and 4 up, unlit (darker gilt, no shadow of its own).
  - It is one edge whatever the count: no number, no word, no amber.
  - It reads as "another is kept for you", never as a warning.
- **When the held one is begun** (the sitting starts), it lifts away. The one behind slides forward into its place, as a device move (200–400 ms, guide §9). The edge stays while still more are owed and goes when none are.
- **Nothing held:** the well shows the Probe alone, as now.

## Words

- **Every "use your sitting first" goes:** from the slot, the price line and every screen (the game designer). The queue has no words at all.
- **The Probe's bottom line, and Home's need line,** read as today for a held sitting. They don't mention owed ones.
- **The Habitat's Portrait plate** is unchanged ("Portray {name}"). It says nothing about the queue.

## The gate, as I read it (§7)

- **Nothing negative:** gilt, unlit edge, no amber or coral, no count.
- **Pictures over words:** with the words covered, one frame reads as "a sitting held", and two stacked as "and another after it".
- **For the build:** `home.json` gets the frame's rect in the T-192 well and an `owed` edge (the same slice, unlit, offset −4, −4) drawn under the held frame when `st.owed > 0` (or `welcomePending`).

## Agreed (the creative director, 2026-10-17)

- **The mark is agreed:** the gilt frame, and the unlit edge of one more behind it while any are owed, with no number or word.
- **Its place on Home waits for the T-199 direction.** The game designer's architecture puts the held sitting on the Library's pursuit. The T-192 Probe-well placement above is superseded with T-192's Home.
- **The Habitat's Portrait plate** is today's golden (`habitat-portrait`), unchanged, with no queue edge.
