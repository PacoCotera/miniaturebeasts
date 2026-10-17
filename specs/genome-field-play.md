# The genome field: what it shows and how it plays (game designer, for T-20261016-126)

Written 2026-10-17. This is the game designer's part of T-20261016-126, as widened at 247b4c44: the genome field (station-gate `art/references/genome-field/`, 01, 05 and 06) becomes Create's and the Incubator's main display, on the lab machine's own screen. UI/UX owns the layout and states; the creative director owns what it is in the world. It builds on specs/slip-reward.md, which still holds for the founder and the moment of a change.

The rules it draws on are station-gate design/creatures-and-genomics.md (the four kinds of locus, sleeping loci, self-changing traits, chapters) and design/research-and-breeding.md (reads, glints, wishes, the detail view).

## 1. What the field is for

**On Create,** the player edits their founder's genome, and the field is where they see the whole of it: what they changed, what the species fixes, what only breeding can move, what is asleep, and what is still hidden. The owner asked for exactly this: "the genome tree, the aleles … very complex and visual". **On the Incubator,** the same field fills in as the founder's chapters clear, so it is also how progress reads.

The field is the screen's map; the founder is still its subject. Every node leads to a part of the animal, and a change on the field is felt on the animal (specs/slip-reward.md).

## 2. What it shows: a tree that grows from the species

Of the owner's references, the skill tree is the best fit: "clean, legible, shows progression, panels with illustrations". So the field is a tree, laid out as reference 01's clustered neighbourhoods:

| Level | On the field | From the data |
| --- | --- | --- |
| **Root: the species** | One engraved hub with the species' glyph. The locked frame is the trunk and is drawn as structure, not as nodes | The locked loci: the same in every member of the species |
| **Regions: the chapters** | One neighbourhood per chapter (Coat, Face, Shape, Legs & Tail, Movement, Stamina, Character, Glow, Charge, as the species has them), marked by the chapter's emblem, not its word. Looks on one side of the root, doings on the other | The species' chapters, in ring order |
| **Nodes: the traits** | One node per trait: a small window holding the trait's look as a picture (the "panels with illustrations"), on the branch of its chapter | The traits of each chapter |
| **Copies: the loci** | Under each node, its locus or loci as a joined pair of small shapes, reference 01's "two copies, one locus". The shown copy is solid. A hidden copy is drawn behind it as an outline in its own look's colour, never as a letter | Both copies of each read locus |
| **Expression** | A line from the copies up into the node's picture: the look you see comes from these | Which copy shows, or the blend |

**Letters, codes and rules never appear on the field** (the locus is abstracted, 09-28). They appear only in the detail view (reference 06), opened on request: it shows the copies with their letters, the rule in plain words ("one shows over the other" / "they blend") and the reference look, and it returns to the same spot. That is the game's existing detail view, which serves "deep genetics, optional" (10-01).

**Scale.** A starter species has a few chapters; a deep one has eight, with up to 25 shapeable drums (S03). Regions that are not focused draw as compact clusters, their nodes as marks only. The focused region opens to its pictures, as in reference 01. The whole tree always fits on the one display, so the player never loses where they are.

## 3. How each kind of locus reads

This is the core of the ask. Every kind reads by **shape and behaviour**, never by a word, so a child can tell them apart by sight. A player who opens the detail view gets the word.

| Kind | On the field | What the player learns from it |
| --- | --- | --- |
| **Locked by the species** | It is the trunk: solid engraved structure from the root, with no node and no focus. One small lock mark sits on the root | "This is what makes it a Loika." Nothing to do, and nothing pretends it can be changed |
| **Configurable** (every look, by default) | An open node with a turnable rim: the drum's own tumbler, set into the node. Focused, it shows ▲▼; changed, the rim wears the drum's notch and the node is lit | "I can change this." It is the only kind of node that turns |
| **Inherited-only** (every doing, by default, and species exceptions such as the Tuikis's Claws) | A closed node with the two joined rings, its branch drawn on to the edge of the field toward a cross mark | "Only breeding changes this": the branch literally leads to the Cross |
| **Self-changing** (Glow, Basking, Phase) | A node with a ring of four step ticks around it and the badge of the place that moves it (a cave and a wood for Glow; a meadow, pond edge and rock field for Basking; a storm for Phase). A founder starts with no steps lit | "It changes where it goes." The empty ticks and the place badge are a promise the player keeps by choosing where the partner walks |
| **Sleeping** (a look behind a part switch that is off) | Its branch hangs behind a closed gate mark on the switch's node. The sleeping nodes are dim but drawn, because they are carried and known | "It carries this, but doesn't wear it." Opening the gate is the best change on the screen (section 4) |
| **Sealed chapter** | The whole region is closed behind the find's picture (crystal, pearl, shard) | "A find opens this." It is a temptation, with the answer on the shut page as today |
| **Unread** | The node is frosted, and its copies are blank shapes | "Still a surprise." On the Incubator, the frost lifts |
| **Glint** (this pod carries a look the species hasn't shown) | The glint star on the frosted node | "Something new is under here" |

## 4. What feels rewarding to change, on the field

These are additions to specs/slip-reward.md, which already puts the reward on the founder (the light on the part, its reaction, the old look fading into the new).

1. **The change expands in place** (reference 05). On a turn, the focused node opens into a before-and-after pair: the pod's look and yours, side by side as pictures. The rest of the field stays visible around it. The expression line pulses from the copies, through the node, to the founder's part, which changes in the same beat. The player sees *where in the genome* the change happened and *what it did to the animal*, at once.
2. **Choosing a copy is visible.** The faces of a configurable trait are the pod's pair as it is, its first copy twice and its second copy twice. When the player sets "only the first copy", the node's pair redraws as that copy twice, and the hidden copy's outline disappears. The player sees that they chose which inherited copy the mibi keeps.
3. **Waking a sleeping branch.** When a part switch turns on (markings on, a crest on), its gate opens and the sleeping branch lights node by node. Those looks appear on the founder at the same moment. It is the strongest moment on the field: the player found out the pod was carrying something, and switched it on.
4. **A first, and a wish.** A look that no resident has wears the star on its node; a pinned wish look wears the wish mark (specs/slip-reward.md). On the field, the player can see how many of the tree's nodes carry stars and wish marks, so the shape of a good founder is visible without a number.
5. **A clash is a broken link.** Two nodes that make a body that won't build are joined across the field by a red, broken line, mirrored on their drums. Turning either one mends the line. Grow is withheld until it does, as the rules say.
6. **Progress on the Incubator.** The frost lifts node by node along the tree, region by region, in step with the ring's cuts. A newly cleared look that is new to the player clears with the star and the light. When the bud is ready, the whole tree is lit: the "shows progression" of the skill tree, made of the player's own mibi.

## 5. The field and the drums: one surface, not two

The field's configurable nodes already turn, show the look, wear the notch and carry the clash. If the drum bank stays as well, the genome is shown twice. That is the creative director's stated risk for the readout, and the owner's "wall" problem in another form. **Recommendation:** the field *is* the bank. The configurable nodes are the drums, turned in place with ▲▼, and the separate drum tray goes. Create then reads as one lab instrument: the founder on its dish, and its genome on the machine's screen, turned by hand.

That is UI/UX's and the creative director's call, since it changes the gene bench's layout (specs/station-create-bench-spec.md). If the drums stay, the field must not repeat their pictures: it becomes the map (regions, kinds, states as marks) and the drums stay the controls.

## 6. Keys

- **Pad:** moves the focus along the tree. ◀ ▶ move between neighbouring nodes and regions; ▲ ▼ turn a configurable node, as the drums do. On any other node, ▲ ▼ move the focus up or down the branch.
- **✓** follows the bottom line. On a focused node it can be "Look closer", which opens the detail view, free, and returns to the same spot. Grow stays on its own target, so ✓ never changes meaning on the same object (specs/station-decision-points.md).
- **←** goes back to the pod, as today.

## 7. Not on this screen

- **The Cross.** The logic-gate reference ("how DNA is spliced and mixed in a cross, with all the loci at play visible at a glance") is the right picture for the Cross screen: two parents' fields with their copies flowing into the child's. It is noted here for the Cross's own ticket, not designed here.
- **Numbers.** No counts or percentages; the field's shape is the measure.

## 8. Needs

- **UI/UX:** the tree's layout at 1024×600 (root, regions, compact and open clusters), the node and copy-pair sizes, the focus path, the in-place before-and-after expansion, the gate, the red broken link, and the decision on section 5.
- **Art (AD):** the node kinds as a family of shapes (open with a tumbler rim, closed with joined rings, stepped ring with a place badge, gate, sealed region with the find), the trunk and lock mark, the copy shapes per look colour, and the frost, glint, star and wish marks on nodes. All of it in the lab machine's display language, as the creative director sets it.
- **Architect** (per the ticket): drawing a tree of up to about 60 nodes with lines in LVGL on the Pi at 1024×600. The lines can be composed pictures. Only the focused region animates.
- **Build:** each node's kind comes from the frame (locked, configurable, inherited-only, self-changing, sleeping behind which switch, sealed), its state from the pod (read, glint, wish, star against the residents), and the clash pair from the existing build check.
