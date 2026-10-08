# Station Library, the Cabinet: brief for the collection screen

Brief for the Library's first screen, the cabinet, after the owner rejected the shelf of the first Library round ([`../library/`](../library/README.md): the book's treatment stands). Built on the rewritten [style guide](../../../design/style-guide/station-screens.md) ("Library: Cabinet"), the [taxonomy](../../../design/proposals/taxonomy.md) (§3 the sixteen, §4 shelves by clan and hidden silhouettes) and the approved [species names](../../../design/proposals/species-names.md). Flat screen, 1024×600 at 1×, edge to edge, no bezel. Siblings: `../round3/A-r3-a1-1024x600.png` (approved Home, the device) and `../library/placed/LB-D-r3-a2-fit-stamped-named-1024x600.png` (the book's paper and ink). No image generation is part of this brief.

**Owner rules, carried in.** The whole collection at a glance, no scrolling: a box for each released species, grouped by clan with the clan's spine colour on the box edge; the cabinet grows with each drop and must still read at twice today's sixteen. Found species: a bright box with the portrait and name. Met, not researched: a slate silhouette. Unmet: a faint shape in the mist. A synopsis strip: found and hidden as filled boxes, progress, completion, clans met; pictures, never digits. The cabinet is quiet (no living window). One device with the Station (the graphite top bar and bottom line, Inter, the counters, light from the upper left). Names are never baked into a generated plate: the generator leaves the name plates empty and the names are placed afterwards as a text layer. **Loika is Pip wherever it appears:** the accepted rich asset is placed into its box after generation, never regenerated. Silhouettes reveal only what is known.

## 1. Purpose and reads first
The whole record, seen whole. **Reads first:** how much of the record is filled (three bright boxes among sixteen), within a second at 1×; then which box is focused; then the synopsis strip.

## 2. The scenario drawn
Sixteen species released, one per clan. Found: Loika (C01 Lophessa, spine moss green), Untuva (C02 Kausida, coral), Tuikis (C03 Stilbera, lagoon). Met in the field without a pod: Hiljan (C04 Lathreta), a slate cat silhouette. Unmet: the other twelve as faint shapes in the mist, each hinting only its kind (a fox, a raccoon, a badger, a goat, a big bird, an otter, a turtle, a moth, a beetle, a slug, a standing bulb with root legs, a vertical bolt). Tuikis is focused. Cousins, when they come, join their clan's box as neighbours in the same spine colour.

## 3. Two directions
- **A, the naturalist's cabinet.** A wall of small specimen drawers in pale wood with brass pulls and label frames, the tome's own furniture; each drawer front is a box with a spine strip in its clan colour; found drawers stand a little open with the portrait painted on their label card. The guide allows wood and brass here and nowhere else on the Station.
- **B, the tome's boxes.** Cream card boxes on slate, like the book's own plates, with ink borders and the clan spine strip; no wood anywhere; the cabinet is paper and slate, so the Library's two screens share one material.

## 4. Layout at 1024×600
Unit 4 px, 16 px side gutter, engraved hairlines at y 40 and y 562.
- Frame: top bar y 0–40 ("Library  T5" from x 16, counters centred on x 512, Companion state right-aligned to x 1008); stage y 40–562; bottom line y 562–600.
- **The grid, sized for thirty-two.** Eight columns at a 124 px pitch from x 16 (box 116 px wide), four rows at a 112 px pitch from y 52 (box 104 px tall). Today's sixteen fill the top two rows (y 52–156 and 164–268) in clan order C01–C16 left to right; the lower two rows (y 276–492) are the cabinet's empty carcass (A: closed blank drawer fronts without labels; B: the slate back of the cabinet with faint box outlines), where the next drops' boxes will appear. Each box: a spine strip 6 px wide along its left edge in the clan colour; a portrait area 104×72 at the top; a name plate 100×20 at the foot (empty; names are placed).
- **Found boxes** (columns 1–3 of row 1): bright cream card, the species' small portrait (Loika: the placed Pip asset; Untuva: a coral fluff under a cap of three flaps; Tuikis: a lagoon lizard with a glowing tail). Tuikis is lifted 4 px inside the warm cream focus ring.
- **Met box** (column 4 of row 1): slate card with a solid slate silhouette of a cat; an empty name plate.
- **Unmet boxes** (columns 5–8 of row 1 and all of row 2): misty slate cards with a faint shape barely darker than the mist, each its kind's silhouette; no name plate.
- **Synopsis strip** y 504–548, x 16–1008, a thin slate tray: at the left one engraved word "record"; then a row of sixteen tiny boxes (12×12 at a 16 px pitch) with three filled bright, one filled slate and twelve empty hairlines; a gap; a short bar that fills as the record does (three sixteenths filled); a gap; a row of sixteen tiny spine ticks in the clan colours, four of them solid (clans met) and twelve as hairlines. No digits.
- Bottom line: orange "✓ Open · ← Home" at left | the focused species' name centred (placed) | grey "a pod waits in the tray" right-aligned.

## 5. Light, materials, type
Cool, even light from the upper left over the whole cabinet; no warm light (the cabinet is quiet); the found boxes are bright by their cream, not by a lamp. A: pale wood, brass, cream label cards, slate silhouettes. B: cream card, slate, ink. Inter, smooth: screen name 3×, names 2× under found boxes (placed), the one engraved word 2×, top bar and bottom line 2×.
**Exact strings, nothing else in the generated art:** top bar "Library  T5", a yellow bolt "7", a blue diamond "3", a green drop "2", "Companion away · with Dot". Synopsis "record". Bottom line "✓ Open · ← Home" | (empty centre) | "a pod waits in the tray". **Placed afterwards:** "Loika", "Untuva", "Tuikis" on the three found boxes' plates; "Tuikis · Stilbera" in the bottom line's centre; the Pip asset in the Loika box.

## 6. Pass checklist (yes / no)
1. Every released species' box is seen at once with no scrolling, and the grid would hold thirty-two at the same box size.
2. Found, met and unmet are told apart at a glance by the boxes alone: bright with a portrait, slate silhouette, faint shape in the mist.
3. Boxes are grouped by clan and carry the clan's spine colour; cousins have a place to join.
4. Silhouettes reveal only what is known: a kind's shape, never a look.
5. The synopsis strip reads how much is filled, progress and clans met as pictures, with no digits.
6. The cabinet is quiet: no warm light, no living window; one device with Home.
7. Loika is the placed Pip asset; names are a placed text layer; nothing generated carries a name.
8. Reads first: how full the record is, within a second.
9. Strings exact (minor fail if garbled, major fail if an object or a light is wrong); flat screen, no bezel.
10. It would still read at twice the count.
