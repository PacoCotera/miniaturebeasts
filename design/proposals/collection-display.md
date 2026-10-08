# The collection display

**Proposal** from the art director and the game designer, 2026-10-08, answering the owner's verdict on the cabinet round ([`library-cabinet`](../../art/concept-station/library-cabinet/README.md)): "not sold on the looks of the boxes, seems too basic … what type of screen, furniture or display is ideal to show a collection of specimens?" Built on the [Station screens](../style-guide/station-screens.md) (Library), the [taxonomy](taxonomy.md) §3–5 and [the portrait](the-portrait.md). Figures in [`collection-display/`](collection-display/): hand-drawn wireframes, layout only.

**Decided 2026-10-08 (owner).** Unmet species show no cue at all of what they may be: no silhouettes, no shapes in the mist. The space to grow is kept. The Library is a botanical tome in vibe. The book that opens from the collection is accepted and mounts the species portrait as a framed plate.

## 1. What the display must do

1. **The whole record at a glance.** Every released species, no scrolling; sixteen today.
2. **Grows with drops.** Four species a drop (two cousins, one new clan, at most one new plan); still reads at thirty-two at the same slot size, at 1024×600, 1×.
3. **Three states by the object alone.** Found: the face and the name. Met: what the field saw, no more (decision 2). Unmet: an empty place, identical for all, saying "something is here" and nothing of what.
4. **Clan grouping that does not leak.** A clan's colour shows only once a member is met. An unmet cousin set beside Loika would say "looks like Loika", so unmet places sit apart until met (decision 3).
5. **The portrait is the face.** A portrait replaces the face, with a gilt corner: the book's plate in small.
6. **A synopsis** of the record as objects, never digits.
7. **Opens the book.** The focused slot lifts and becomes the book's plate in 300 ms.
8. **Not basic.** Depth, material, shadows, a cataloguing hand; never flat tiles. Still quiet; knowledge, never material.

## 2. Five directions

Each figure draws the cabinet round's scenario: Loika (portrayed), Untuva, Tuikis found; Hiljan met; twelve unmet; Tuikis focused. The vitrine wall and the curio cabinet with doors read as the rejected shelf at this size; their glass went to B.

**A. The specimen drawers** ([figure](collection-display/A-specimen-drawers.svg)). *A wall of shallow drawers; the found ones stand open.*
From the naturalist's specimen drawers. Unmet: a closed drawer, blank label card. Grows: drawer fronts fill the empty carcass. Not basic: drawer depth and shadow, brass, a cotton bed. Risk: an 8×4 grid of closed drawers is the rejected boxes with handles; open drawers show faces foreshortened.

**B. The specimen case** ([figure](collection-display/B-specimen-case.svg)). *A glazed case of unit trays, one tray per clan, each specimen a card on its mount with a tag.*
From the entomology case and the lepidopterist's unit trays: modular trays packed into one glass-topped drawer; collections grow by adding trays. Unmet: an empty mount and a blank tag in a plain tray at the end, all alike. Grows: a met species leaves the plain tray for its clan's tray; a drop adds blank mounts; cousins widen their clan's tray by one unit. Not basic: glass with one reflection, a linen floor, tray walls and cards casting shadows, paper tags on brass pins. Risk: pinned creatures read as dead ones, so nothing pins a mibi (decision 1); trays reflow as species are met.

**C. The herbarium folio** ([figure](collection-display/C-herbarium-folio.svg)). *Pressed sheets laid out on the table, one per species, clan folders behind.*
From the herbarium: mounted sheets with a printed label in the corner, kept in coloured genus folders. Unmet: a blank mounting sheet in a plain folder, no label. Grows: new sheets on the table. Not basic: deckled paper, linen tape straps, glassine, a pressed leaf, folders peeking. Risk: closest to the tome, but tall sheets get narrow at thirty-two; a pressed pet is unsettling.

**D. The jar wall** ([figure](collection-display/D-jar-wall.svg)). *Shelves of labelled jars, clan colour on the lid.*
From the seed bank and apothecary wall. Unmet: a sealed jar, paper-wrapped, plain wax, blank label. Grows: empty rings on the shelves. Risk: a creature in a jar reads as preserved; jars suggest stock to take; a shelf again.

**E. The index of plates** ([figure](collection-display/E-index-of-plates.svg)). *The tome open at its index: small plates tipped in, clan by clan.*
From the field notebook's index of plates. Unmet: an empty ruled frame with photo corners and a blank caption line. Grows: frames fill the spread; sixteen a page, thirty-two a spread, as the taxonomy's grid already says. Not basic: tissue guards, photo corners, ink rules, clan ribbons. Risk: still rectangles on paper, the flatness just rejected; past thirty-two, a page turn.

## 3. Shortlist: B and E

> **Art director:** E is the tome itself. Index, then plate: the Library is one book and the cabinet stops being a different room.
> **Game designer:** And the owner looks at it and sees the boxes again, on cream. E is a page of rectangles however good the corners are.
> **Art director:** Fair. B has what the boxes lacked: glass over depth, things standing on a floor, shadows that say "object".
> **Game designer:** It also plays. A clan is a tray; a cousin widens it by one unit; a drop slides blank mounts in.
> **Art director:** My worry is pins. Children, pets, a pin through a body.
> **Game designer:** Then no pin touches a mibi. The card stands in a mount; the pin holds only the tag.
> **Art director:** And the material stays the tome's: linen, cream card, ink tags. Glass and brass are the only case.
> **Game designer:** Unmet is the empty mount and the blank tag in the plain tray. Twelve identical gaps, nothing to read.
> **Art director:** A met species moving to its clan's tray is a small ceremony, not a reflow.
> **Game designer:** And the card is the book's plate in miniature, so the open is one gesture: the card lifts and fills the screen.
> **Art director:** E's paper goes into B: tags and ledge in the book's hand.
> **Both:** We recommend **B, the specimen case**, dressed in the tome's paper.

## 4. Brief for the next round: B, the specimen case

- **Materials.** An ebonised frame and brass corner caps; one glazed lid; a pale linen floor; cream card tray walls with a 3 px lip; deckled cream cards; paper tags on brass pins. No slate, no mist.
- **Light.** Cool, even, from the upper left; one soft reflection across the glass; short shadows to the lower right. No warm light.
- **The slot at thirty-two.** Pitch 120×108, 8×4 field (x 24–1000, y 56–488). Card 88×68 standing 3 px proud on a mount, the face or portrait in it; tag 76×14 under it, name at 2× (a placed layer); a tray's clan strip 6 px along its top edge. Portrayed: a gilt corner, top right. Met: decision 2. Unmet: bare mount, blank tag. Focus: the card lifts 4 px in the cream ring.
- **The synopsis as objects.** A brass-edged ledge (y 498–550): a string of tiny tags, one per released species (inked found, pencilled met, blank unmet); a brass slider on an engraved rule for progress; a cushion with one clan-coloured pin per clan met; completion fills the case's brass plate. No digits.
- **Strings.** Top bar "Library  T5", a yellow bolt "7", a blue diamond "3", a green drop "2", "Companion away · with Dot". Bottom line "✓ Open · ← Home" | "Tuikis · Stilbera" | "a pod waits in the tray" (the clan trays carry no word). Placed: the names, Pip in Loika's card.
- **Motion.** The card lifts and grows into the book's framed plate, 300 ms; a newly met species' card slides from the plain tray into its clan's tray at the next visit.

## 5. Decisions for the owner

1. **Is B, the specimen case, the collection display?** Recommended: yes, in the tome's paper, with no pin through any mibi (cards in mounts, pins in tags only).
2. **What does a met species show?** Recommended: a pencil field sketch on its card and its name pencilled on the tag, since the Companion saw it; inked once found. Alternative: a blank card, pencilled tag only.
3. **Where do unmet cousins wait?** Recommended: in the plain tray with every other unmet species, joining their clan's tray when met, so no grouping hints at a look. Alternative: in their clan's tray from the start; tidier, but a cue.
