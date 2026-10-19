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

## Addendum (2026-10-18 22:46): the held and owed frames, re-placed

**The owner has approved the rule:** earned sittings are never lost. They wait behind the held one as the edge of one unlit frame, with no number, word or amber, and the warning goes. This builds after the Library. The mark is as agreed above; only its places change.

### On Home: the Bay station's portrait berth (Home spec §4.3)

**The portrait berth shows whenever a sitting is held, or a portrait crate is in.** It is the fourth berth, 18 × 24, after the three walk berths.
- **The gap before it is 5 px** (2 between the walk berths), so an owed edge has room.
- The row is 105 wide while the portrait berth shows. Its right edge stays 8 in from the station's right edge.

**What the berth shows:**

| State | The portrait berth | Lamp, words |
| --- | --- | --- |
| a sitting held | `berth-portrait-18x24`, the lit gilt frame | no amber. Line 2, when the walk berths are clear: "a sitting held" (the game designer to confirm). Line 1 as the walk crates say |
| held, and one or more owed | the same, with **the edge of one unlit frame behind it**, offset −3, −3 | as held. The owed ones add no word, number or amber |
| a sitting begun (painting) | the berth shut, as its walk neighbours | the crate's wait as the portrait spec says (no clock); no amber |
| a portrait crate in | the portrait crate (Home spec §11.5) | amber; "a portrait in" / "{name}'s portrait" |
| a crate in, and a sitting also held | **the crate takes the berth.** The held frame (and any owed edge) wait unseen until the crate is opened | as the crate |
| none of these | no fourth berth | — |

- **When the held sitting is begun:** the frame goes by a cut (the berth shuts). If one is owed, the one behind becomes the held frame on the next draw, lit, and the edge stays while still more are owed. The berth is 18 × 24 and the station sits in a quiet console, so there is no slide.
- **The new master:** `berth-portrait-owed-18x24`, the unlit edge (darker gilt, no shadow), from the art director. Without it, H3 draws only the held frame.

### In the Habitat: the Portrait plate (`regions.portrait`)

- **Held:** `sitting-frame-held-48x40` at [916, 312], as today.
- **Owed:** while the plate shows a held frame and one or more sittings are owed, **the edge of one unlit frame behind it**, at [912, 308] (−4, −4), inside the plate's own rect.
  - The plate's words don't change. "Portray {name}" stays, and the owed ones add nothing.
- **Painting, portrayed and none:** these states are about this mibi, so they show no edge.
- **The new master:** `sitting-frame-owed-48x40`, from the art director, the same edge at the plate's size.

### Words, everywhere

- **Every "use your sitting first" goes:** the held frame's pulse, the price line's warning, and every screen's.
- **Nothing anywhere counts the owed sittings.**
- **The game designer rewrites** the portrait document's §7.2 (a sitting earned while one is held: it waits behind it, never lost) and the second rule of §8 (a moment while one is held: given, and it waits).
