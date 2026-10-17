# The Station and the Companion: the binding spec

Ticket T-20261016-172. Every builder and artist working on either device needs one place that settles every look and every communication rule, so nobody goes off the rails inventing their own.

**This document is binding.** A builder or artist with a ticket finds every look and every communication rule here. If something they need is not here, they stop and park the ticket to its owner: the art director for a look, the game designer for what something must communicate. They never invent it.

**Who writes what.** The **art director** writes the visuals: palette, materials, light, rendering, components' looks, icons and type faces (sections marked *AD*). The **game designer** writes what each screen and element must communicate: purpose, what reads first, how state, cost and outcome read, and the words budget (sections marked *GD*). The creative director signs the UI/art gate and the game designer the game design gate (specs/game-design-gate.md on work-queue).

It builds on, and where they differ overrides: design/art-direction.md, design/style-guide/README.md, station-screens.md, station-layouts.md and companion-screens.md. Every rule carries a picture: a labelled 1× PNG, a do beside a don't, in `station-companion-spec/`.

---

## 1. The look in one page

*AD writes the look.* **GD, what the devices are for:** the **Station** is the home lab, a genome-editing machine that keeps small lives going. The player reads, shapes and grows life there, and lives with it. The **Companion** is the field device the player carries out to explore, gather, and walk with their mibis. Both are the same maker's gear. Every screen on either shows something the player acts on or watches change; nothing is decoration (the purpose-first rule).

## 2. Palette

*AD.* (GD constraint: every state colour in section 6 also has a shape; colour never carries meaning alone.)

## 3. Materials and light

*AD.*

## 4. Components

*AD writes each component's look, sizes and margins.* **GD, what each component must communicate,** which its look must serve:

| Component | It exists to say | It must always show | It must never |
| --- | --- | --- | --- |
| **Decision panel** | "You are choosing between these futures" | One window per option, each **its outcome as a picture**; the option's name; its cost beside it; one consequence line (a loss in the loss colour) | Appear where there is no real decision (spend, commit, irreversible, a path). Show two options that look alike |
| **Card** (a reveal, a report) | "This is what just happened, or just arrived" | The thing itself as a picture (the mibi's part, the crate's contents); at most one plain line | Carry a list of sentences. Use jargon without a picture ("unflappable" alone) |
| **Display screen** (the genome screen, the bench's readouts) | "This is the machine's live reading of this mibi" | Live state that changes with the player's input or with time | Show anything that never changes (that belongs in the Library) |
| **Plate / pane** | "These things belong together" | Its contents inside its margins | Hold floating text, or exist with nothing to hold |
| **Tile** (a gene, a pod, a mibi) | "This one thing, and its state" | The thing as a picture; its state as a mark from section 6 | Carry words, beyond a name tag where the screen allows one |
| **Badge** (a place, a find, a species) | "Where / which" | A recognisable picture of the place or thing | Stand for an action |
| **Progress** (the ring) | "How far along, and how long" | The fill at the screen's scale; cuts where something will be revealed; the Incubator's minute count beside it | Use digits, except the Incubator's "ready in about n min" |
| **Genome marks** | "What this gene is doing, and what kind it is" (section 6) | One meaning per mark, the same everywhere | Draw data the frames don't have (the genome engineer verifies) |
| **Buttons and key hints** | "What this key does here" | ✓ with the verb, ← with where it leads, R with "look closer" where a detail exists | Show a ✓ cap when ✓ does nothing |

## 5. Type and the words budget

*AD writes the faces and the scale.* **GD writes the budget:** the most words each element may carry. Fewer is always allowed. A word that a picture already says is a word too many.

**Station**

| Element | Words, at most | Notes |
| --- | --- | --- |
| Top bar | the screen's title (1–2 words) | Supplies are numbers beside their icons |
| Bottom line, action | the verb (up to 4 words) + price icons | "Grow it", "Open the bay", "Look at the new pods" |
| Bottom line, context | 6 words | The one fact the screen can't draw ("Coat stays a surprise") |
| Bottom line, notice | 5 words | What needs you, from the return signals |
| Decision panel window | option name (3 words) + one consequence line (8 words) | No other words in a window |
| Reveal card | "Revealed" + "{Trait}: {plain words}" (8 words in all) | The plain words from specs/trait-words-and-doings.md |
| Ribbon (an event) | 5 words | "The Companion is home" |
| Genome screen | the chapter names only (one word each) | Letters and rules only in the R detail |
| Tiles, badges, marks, the bay, crates, progress | **0** | The picture is the meaning |
| Name tags | the name | |
| The Library | its own book pages, outside this budget | Paper lives only in the Library |

**Companion**

| Element | Words, at most | Notes |
| --- | --- | --- |
| HUD | 0, except numbers beside icons | |
| Bottom line, action | 3 words + cost | Smaller screen: shorter verbs ("Dig", "Call", "End trip") |
| Bottom line, context | 5 words | |
| Message box | 2 short lines | One note, which stays until the next action |
| Cards (expedition kind, partner) | a name (2 words) + one line (6 words) | |

**Numbers** appear only as prices, supplies and counts beside their icon, and as the Incubator's minute count. Never as progress, chances, rarity or percentages.

## 6. Icons and marks: one meaning each, on both devices

*AD writes the drawing style and the minimum legible size.* **GD, the rules:**

1. **No meaning rides on a tiny glyph or an unexplained colour.** A mark that carries meaning is drawn at the legible size the AD sets, and has a distinct shape. If a player needs a legend to read it, it fails.
2. **One mark, one meaning, everywhere.** The register below is binding on the Station and the Companion. A new mark, or a new meaning for an old one, comes back to the game designer first.
3. **Draw only what is known.** Unknown is frost, never a guess. A mark never shows data the game doesn't hold, or promises an effect that isn't designed.

| Meaning | The mark | Where |
| --- | --- | --- |
| Changed by you | Lit, with the notch | Genome, drums or tiles |
| Still a surprise (unread, unknown) | Frost | Genome, founder, pods, chapters |
| Something new here (where, never what) | The four-point glint | Pods, chapters (per chapter), the map |
| A piece of your wish | The four-point glint, lit in the wish's yellow | Genome (when the founder shows it), drum faces, forecasts |
| New to your field guide | The cream triangle | Genome, reveals |
| Clash (won't build) | Red rim, on each trait in the set | Genome, drums |
| Only breeding changes it | Joined rings, with the line toward the Cross | Genome, chapter pages |
| It changes where it goes | Step marks with the place badge | Genome, vivarium up close |
| Asleep behind a switch | Dark behind the gate bar | Genome |
| Sealed, opens with a find | The find's picture (crystal, pearl, shard) | Genome, chapter pages |
| Needs you | Amber lamp: pulsing = something new to see; steady = ready to act | Home's modules, Idle tags |
| Fills with time | The ring | Incubator, Home, Idle, the portrait crate |
| Energy / Data / Essence | Bolt / diamond / drop (cell, cartridge, vial as objects) | Everywhere |

## 7. Layout

*AD.*

## 8. Screen families: purpose and what reads first

*GD.* Each family's **purpose** is the one sentence every element earns its place against. **Reads first** is what a first-time player's eye must land on. The direction for each family's look is the creative director's (T-20261016-168).

**Station**

| Family | Purpose | Reads first |
| --- | --- | --- |
| **Home** | See that your mibis are alive and well, and what in the Station needs you next | The residents, then the lamp and line that need you |
| **Idle** | The vivarium alone; from across the room, whether anything wants you | The living window, then any amber tag |
| **Vivarium** (whole) | Watch your mibis live, and pick one | The residents |
| **A mibi up close** | Know this one mibi and act on it: take it out, cross it, return it, sit it | The mibi |
| **Pods** (collection, a pod, its chapters, compare) | Know what each pod you brought home is, read it, and choose one to create from | The pods and what is new on them, then the focused pod |
| **Create** | Edit your founder's genome and see it change, then grow it | The founder, then the gene you are turning |
| **Incubator** | Your founder grows inside its pod while the machine candles it; each visit it is further along, and you know more about it | The candled pod and its progress, then what was just revealed |
| **Cargo** (the arrival, the bay) | What the trip brought home arrives: each crate, what came out of it, and where each thing goes | The crates, then their contents flowing to the store and the rack |
| **Probe bench** | Get the Probe ready for the next trip | The Probe and its plates |
| **Library** (spread, book, guide) | Your record of every species, and what you've seen of each | The frames and how full they are |
| **Cross and Wish** | Choose two adults and see what their child could be; pin the mibi you dream of | The two parents, then the forecast |
| **Decision panels** | At a real decision, see each choice's future and its cost | The two outcome pictures |

**Companion**

| Family | Purpose | Reads first |
| --- | --- | --- |
| **Expedition choice** | Choose this trip's kind | The focused card and what it promises |
| **Start map** | Pick where the trip starts | The glints, then the range around the focused cell |
| **Reach view and map** | Walk the Probe's reach and see the world | The pawn and the cell it faces |
| **Place** | Act in a place: walk, gather, meet creatures | The pawn and what it faces |
| **Hold (cargo)** | What you carry, and what End expedition will seal | The pods carried |
| **Probe legend** | The Probe's state and what its signs mean | The Shield plates |
| **Mibis and the active mibi** | Be with the mibis you carry: tend, walk, choose the partner | The mibi |
| **End expedition** | End the trip and seal the hold | The outcome |
| **Docked, link states** | Whether the Companion is home, and whether the Station has the cargo | The crate count and the link |
| **Menu, message box** | The field's few options; one note at a time | The focused entry; the note's first words |

## 9. Motion and feedback

*AD writes the timing and easing.* **GD, what each feedback must tell the player:**

- **A press that acts** shows its result where the eye is, in the same beat. A turned gene changes the founder; a read clears its frost; a spend ticks its counter.
- **A refusal is never silent.** The thing that can't act answers with its own reason mark (the line to the Cross, the steps and badge, the lock), once. There is no plate and no sound unless the AD's motion rules give one.
- **A spend is never silent.** No key spends without the price having been on screen first. A large or irreversible spend goes through a panel.
- **A jump is announced:** the panel's choice names the destination, or the arrival line names it after.
- **Reveals are events.** A read, a clearing, a hatch and an arrival each play as a short moment, skippable with any key, never eating presses afterwards.
- **The dock and the undock** play across the three devices in step (specs/dock-moments.md): a short show, then one real choice.

## 10. How to use it

- Every visual or screen ticket cites the sections it follows ("§4 decision panel, §5 Station panel window, §6 marks: changed, frost").
- A reviewer judges against those sections and the acceptance tests on the ticket, in the device sheet.
- **Anything not covered is parked:** looks to the art director, communication to the game designer. A builder or artist never fills a gap with their own invention.
