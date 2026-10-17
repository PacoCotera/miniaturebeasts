# Editing life at the bench: what the player does and what makes it feel advanced (game designer, for T-20261016-126)

Written 2026-10-17. This is the game designer's part of T-20261016-126. It follows the owner's ruling at 04:16: "no, that was inspiration, do not replicate it. but this screen must feel like a research/crafting bench. advanced, you're editing life." The genome field references are inspiration only. This file takes their idea (the genome made visible, rich, and changed in place) and prescribes none of their layout, nodes, brackets or look. The form is UI/UX's and the creative director's, in the Station style. It builds on specs/slip-reward.md, which still holds for the founder and the moment of a change.

The rules it draws on are station-gate design/creatures-and-genomics.md (the four kinds of locus, sleeping loci, self-changing traits, chapters) and design/research-and-breeding.md (reads, glints, wishes, the detail view).

## 1. The feel in one line

**The player is the scientist at an advanced instrument, operating on a living genome.** Every action is a procedure the machine carries out, and every procedure has a visible result in the animal on the bench. It is not a menu of options and not a map to read: the player does something, the machine does it, and the creature changes.

## 2. What the bench works on

The genome the machine holds has a fixed structure, and every action works at one of its levels. This is the mechanics, not a layout; UI/UX chooses how it is drawn.

| Level | What it is | From the data |
| --- | --- | --- |
| **The species** | The frame every member shares. The bench shows it as fixed | The locked loci |
| **Chapters** | Coat, Face, Shape, Legs & Tail, Movement, Stamina, Character, Glow, Charge, as the species has them (up to eight) | The species' chapters, in ring order |
| **Traits** | What the player sees on the animal: markings, crown, eyes… | The traits of each chapter |
| **Copies** | The two inherited copies behind each trait, one shown and one hidden, or blended | Both copies of each read locus |

The whole genome is always present on the instrument at once, dense and complete, even for a deep species. That richness is the "complex and visual" the owner liked, and it is what makes the bench feel advanced rather than simple. Letters, codes and the rule between copies appear only when the player asks for them (the detail view). The locus stays abstracted on the bench itself (09-28); the deep genetics are there, optional (10-01).

## 2a. The framework shows through; letters stay one press away

The owner, 04:18: "this is the place where you get to get a glimpse of the underling genome mechanics and framework." So Create is where the real mechanics show, on the main view and not hidden behind a press. The game designer's position on the "letters off the main view" guard:

- **On the main view, the framework is shown as relations, not notation.** These are visible at a glance without reading:
  - the structure (species, chapters, traits, copies);
  - the kind of every gene (section 4);
  - **which copy shows and which hides**: the shown copy stands in front of the hidden one;
  - **a blend**: the two copies meet into one look between them;
  - **a gene asleep behind a switch**.

  This is the 10-01 depth made visible for the curious parent and the STEM player, and a child reads it as shapes.
- **Letters (Pp), the rule in words and the reference look stay in the detail view,** one free press from any gene, returning to the same spot. Letters on the main view would turn it into a lesson for most players, and 09-28 keeps the locus abstracted. One press is close enough for anyone who wants them.
- **The test:** a player who never opens the detail view can still say, pointing at the screen, "this one I can change, this one only breeding changes, this one is hiding a pale copy, this one was asleep and I woke it." That is the framework, shown.

## 3. The procedures

Each procedure is a verb the player does at the bench, what the machine does in response, and what the player sees on the founder. Keys follow today's model (the pad moves and turns, ✓ does the bottom line, ← goes back), and UI/UX places them.

| Procedure | What the machine does | What the player sees on the founder | Which genes allow it |
| --- | --- | --- | --- |
| **Isolate a gene** (focus a trait) | Brings that gene up: its two copies are shown as live samples, side by side | The part it shapes is picked out on the animal, lit by the bench | Any |
| **Choose which copy it keeps** (turn) | Sets the pair to the pod's own pair, its first copy twice, or its second copy twice. The rejected copy visibly drops out of the pair | The part rebuilds: the old look fades out as the new one settles, with a light on the part and the animal's reaction (specs/slip-reward.md) | Configurable (every look, by default) |
| **Switch a part on** (a part switch) | Opens a part that was off; the looks it carried behind it come on line | Markings, a crest or a mask appear on the animal. **The strongest moment at the bench:** the pod was carrying it, and the player woke it | Configurable switches with sleeping looks behind them |
| **Try a gene that can't be edited** | Refuses, with the reason shown as a mark, not a sentence | Nothing changes on the animal | Locked (the species' mark), inherited-only (the "breed to change" rings, pointing to the Cross), self-changing (its place badge: "its life changes this") |
| **Read a sealed chapter** | Shows the chapter's genes under frost; a glint where this pod carries something new to the species | Those parts stay frosted on the animal | Unread chapters. Proposal: ✓ offers "Read it now ◆ n", or leave it to clear while it grows (specs/slip-reward.md) |
| **Inspect** | Opens the detail view: the copies with their letters, the rule in plain words, the reference look. Returns to the same gene | — | Any read gene, free |
| **Resolve a clash** | Flags two genes that together won't build a body, linked in red, on both genes | The animal can't be grown until one changes; Grow is withheld and nothing is spent | Configurable pairs that clash |
| **Commit** (Grow) | The decision panel shows the animal as the pod would grow it beside the one the player made, with every edited part lit, and the price. On ✓ the machine writes the edited genome into the pod: the stamp prints and the pod seals | The founder the player made, fixed | — |

## 4. How the bench tells the kinds of gene apart

Every kind reads by its own mark and behaviour, never by a word, so a child can tell them apart by sight. A player who inspects gets the word.

| Kind | What the player learns | How the bench shows it |
| --- | --- | --- |
| **Locked by the species** | "This is what makes it a Loika" | Fixed and part of the frame, with the lock mark. It never turns |
| **Configurable** | "I can change this" | The only genes that turn. When changed, they wear the drum's notch and are lit |
| **Inherited-only** | "Only breeding changes this" | Closed, with the joined rings and a pointer toward the Cross |
| **Self-changing** (Glow, Basking, Phase) | "It changes where it goes" | Four step marks and the badge of the place that moves it. A founder starts with none lit: a promise the player keeps by choosing where the partner walks |
| **Sleeping** (behind a switch that is off) | "It carries this, but doesn't wear it" | Present but dark behind its switch; it comes on line when the switch turns on |
| **Sealed chapter** | "A find opens this" | Shut behind the find's picture |
| **Unread** | "Still a surprise" | Under frost, with the glint star when something new is there |

## 5. What makes it feel advanced, and what makes it rewarding

- **Cause and effect in one beat.** The copy chosen, the part rebuilt and the animal's reaction all happen together. The player always sees *which inherited copy* made *which part* of the animal. That precision is what separates a lab from a dress-up toy.
- **The whole genome, present.** Everything the species has is on the instrument at once: what the player can change, what they can't, what is asleep and what is hidden. Depth is visible even when unused.
- **Restraint by the machine.** Locked, inherited-only and self-changing genes refuse, each with its own reason. The bench has rules, and a rule shown is a goal suggested: breed for this, walk the partner there, find the crystal.
- **Discovery inside the edit.** Waking a sleeping look, a glint under frost, a star on a look no resident has, the wish mark on a pinned look (specs/slip-reward.md).
- **The commit is a procedure.** Before and after as two animals; the genome written into the pod; the stamp printed. The player leaves knowing they made this mibi.

## 6. On the Incubator

It is the same instrument, showing the same genome. While the bud grows, the founder's unread chapters clear in sequence, in step with the ring's cuts, and each clearing comes on line on the instrument and in the founder's shadow inside the pod (the Incubator concept, option B). A newly cleared look that is new to the player clears with the star. When the bud is ready, the whole genome is known.

## 7. Not decided here

- **The form and layout** of the instrument: UI/UX and the creative director.
- **Whether the instrument replaces the drum bank** or works beside it: UI/UX and the creative director. The only requirement from game design is that the genome is not shown twice in two forms.
- **The Cross.** The logic-gate reference ("how DNA is spliced and mixed in a cross") fits the Cross screen: two parents' genomes and their copies flowing into the child's. It is noted for the Cross's own ticket.
- **Numbers.** No counts or percentages on the bench; the only numbers are prices.

## 8. Needs

- **UI/UX:** the instrument's form and layout at 1024×600, how each procedure is reached with the pad and keys, the refusal marks, the clash link, and how a deep species' eight chapters stay present at once.
- **Art (AD):** the marks for each kind of gene, the copies as samples, the frost, glint, star and wish marks, and the founder's reactions (specs/slip-reward.md), in the Station's lab style as the creative director sets it.
- **Architect** (per the ticket): drawing the whole genome with live changes in LVGL on the Pi at 1024×600. Only the focused gene animates.
- **Build:** each gene's kind comes from the frame (locked, configurable, inherited-only, self-changing, sleeping behind which switch, sealed), its state from the pod (read, glint, wish, star against the residents), and the clash pair from the existing build check.
