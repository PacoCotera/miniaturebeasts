# The genome screen: Create as a genome-editing bench, and the same instrument on the Incubator (UI/UX)

Ticket T-20261016-126, 2026-10-16 (America/Mexico_City). It replaces the paper slip on both screens and re-lays Create around a large machine screen. It is built on the game designer's `specs/slip-reward.md`, `specs/genome-field-play.md` and `specs/editing-life.md`, and on the creative director's `specs/slip-visual-intent.md`. Wireframes: `specs/station-genome-screen/01` to `07` (1×, labelled). Art: T-20261016-130. Build: T-20261016-71 (Create, amended) and T-20261016-131 (the Incubator).

## 0. Purpose and intent

**The owner** (2026-10-17): the slip is "a wall of text that nobody will read", "can be a cool screen of the machine"; "it's a LAB, it's a genome editing machine"; "this screen must feel like a research/crafting bench. advanced, you're editing life"; "this is the place where you get to get a glimpse of the underling genome mechanics and framework". The genome-field references are inspiration only: nothing here copies their layout or look.

**What the player does on Create:** turns the drums to choose which inherited copy each gene keeps, and watches the founder change. The screen shows them, at a glance and without reading, **the whole genome they are editing**: its frame (the species, the chapters), every gene's kind (can change, only breeding changes, changes where it goes, asleep, sealed, still a surprise), which copy shows and which hides, what they changed, and what clashes. The focused gene is isolated in the sample bay: the look it makes and its two copies.

**What it is in the world, in one sentence** (the CD's): the bench's main screen, a large dark matte display let flush into the sage housing, on which the machine shows the founder's genome live as it is edited; the drums are the controls and the founder on the dish is what they make.

**The test** (`specs/editing-life.md` §2a): a player who never opens a detail view can point and say "this one I can change, this one only breeding changes, this one is hiding a pale copy, this one was asleep and I woke it".

**Words budget, hard: none on the screen.** Every state is a mark. The code at Grow is an identifier. The bottom line keeps its words. Letters, the rule between copies and the reference look stay in a detail view one press away, which is open (§8).

## 1. Create's new layout

| Region | Rect | Job | Change |
| --- | --- | --- | --- |
| `founder` | 96, 76, 304 × 312, feet 388 | What they are making; the subject, warmest | moves left from 360 |
| `dish` | 88, 364, 320 × 28 | The moss pad the founder stands on | was 312, 364, 400 × 28 (art recut) |
| `genome` | 424, 80, 512 × 312 | The machine's screen (§2) | new; replaces `slip` |
| `bank` | 88, 400, 848 × 130 | The tray of drums, the controls | unchanged |
| `port` | 96, 404, 128 × 122 | The pod's socket at the tray's left end: the drums are fed by this pod | new; replaces `well` and `geneLine` |
| `pod` | 100, 394, 112 × 136 | The player's pod, open in shape, sealed at Grow 300; Pods' renderer | moves into the port |
| bank window | x 240 to 920 | Where the drums show; the more marks at 240 and 904 | was 104 to 920 |
| `travel` | from the pod's rect to 952, 394, clipped at 953 | The sealed pod carried along the tray, over the locked drums, out at the right | grow 300 to 900 |

**Gone from Create:** `slip`, `well`, `geneLine`, `name` and `found` (the bottom line's "← {species}" names the pod; Pods carries the found-note).

**Clearances:** the founder's box ends at 400, 24 left of the screen (424); the dish ends at 408, 16 left of it. The screen ends at 392, 8 above the tray (the dish's 8, too). The pod's top (394) is 2 under the dish's foot (392); the pod's ink sits in the port, and the port is inside the tray. The founder's top margin stays 17.

**The drums' spacing** (the T-123 rule) uses the new window: g = floor((680 − 80n) / (w + 3b)), clamped 8 to 64, the gap between chapters 3g; below 8 the bank slides. S01 (5 drums, 4 chapters): g 28. Most species slide; the screen shows every gene, so a slid-off drum is never lost.

## 2. The screen

- **Housing** 424, 80, 512 × 312: sage, flush with the bench, four screws, the rubber gasket at (6, 6). **Screen** 432, 88, 496 × 296: dark matte slate; no gloss, glow halo or scanlines. **Content** 440, 96, 480 × 280.
- Two areas: the **tree** (440, 96, 296 × 280) and the **sample bay** (744, 96, 176 × 280).

### 2.1 The tree (the frame and every gene)

| Piece | Where | Drawn |
| --- | --- | --- |
| Rows | row i: top 101 + 34i, 32 tall | One per chapter the species has, in ring order; at most 8 (S03, S16), measured on all 16 frames. Looks first, then doings |
| Species hub | 440, 101 + 34L − 13, 24 × 24 (L = the number of look rows), with the lock mark 8 × 10 above it | The species' glyph: the frame every member shares. Locked loci are this and the frame line, never genes. All looks or all doings: the hub centres on the frame line |
| Frame line | 2 px at x 470, from the first row's centre to the last's | The species' frame (not the catalogue's "trunk" loci: T-135 fix 9) |
| Chapter line | 2 px at y top + 15, from the frame line to the row's last gene | The chapter |
| Emblem | 476, top + 4, 24 × 24 | The chapter's emblem, read or unread (existing `rail-emblem-*`, checked on slate). **The glint sits here**, once per chapter: the gold four-point glint 12 × 12 at (16, −4) of the emblem, on an unread chapter where the pod glints (`glint(st, p, chapterId)`: "new here, never what"). Never on a gene |
| Genes | 508 + 36j, top + 4, 24 × 24 | One per trait, in the frame's order; at most 6 (S09's Coat) ends at 712. Each gene's kind comes from the frame row: `changedBy` (`species` / `player` / `breeding` / `self`), `trait.selfChanging`, the switch and `chapter.sealed` (T-20261016-137), never from the chapter's name |
| To the Cross | a 1 px dotted line from the row's last gene to the cross mark 12 × 12 at (720, top + 10) | Drawn from a breed-only gene only (`changedBy` `breeding`): when a read row's last gene is breed-only, the line runs from it. S03's Glow row: from Duration, not from the self-changing Glow. A breed-only gene mid-row (S03 Claws) wears its rings without a line |

### 2.2 A gene's mark (24 × 24, one family)

| Kind or state | Mark | What the player reads |
| --- | --- | --- |
| Configurable, as the pod is (`hides`) | An open ring with three tumbler ticks; inside, the **copy pair**: the shown copy solid in front, the carried copy as an outline behind | "I can change this; this copy shows, that one hides" |
| One look (`only`; `rollOptions` has one option) | The open ring **without ticks**, the pair as two equal discs in `fog`, unlit, no notch. ▲▼ is refused, as the other refusals. The commonest configurable state: 24 to 47% of configurable looks on real pods (T-135) | "Both copies are the same: nothing to choose" |
| A blend (`blend`) | The pair as one lens, half each copy | "The two copies meet" |
| Changed by you | The ring and pair lit in `mint` (the one lit hue on both screens; no bloom; the soft edge is one ring of `aqua`, the mint ramp's darker step, painted in the slice: palette, not alpha, T-140) and the notch 3 × 6 at (21, 9) | "I changed this" |
| Copy chosen | The pair as two of the same copy, in that copy's own colour (copy 1 `bone`, copy 2 `sand`), also when lit: the rejected copy has dropped out, and the colour says which survived (T-134) | "I chose which copy it keeps" |
| New to your field guide | The first mark, a small point-up triangle in `cream`, 10 × 8 at (16, 0); not a star. Data: `p.first`, the traits whose look was new to the field guide when read | "This look is new to my field guide" |
| Your wish, shown | The four-point glint in the wish yellow, 10 × 10 at (16, 0), on a gene whose founder shows the look pinned for that trait (`st.wish[species][trait]`). The rule is the game designer's (T-135 fix 8); this is the genome engineer's recommendation, ruled by the game designer (`specs/genome-screen-calls.md` §3): if and only if a wish is pinned for this species, this trait is pinned, and the founder as edited now shows that look; turning to it lights the glint, turning away puts it out; never on an unread trait. The drum's face that gives the pinned look carries the small yellow glint (the drum's art) | "This is the look I wished for" |
| Inherited-only | A closed disc with the joined rings. Every doing, and the one look with an `override` in all 16 frames: S03's Claws | "Only breeding changes this" |
| Self-changing | The inherited-only mark with four step marks round it (3 × 3); one place badge per trigger place, 10 × 10, stacked at (25, −2 + 11k) in the gap after the gene (Glow: cave, wood; Basking: meadow, pond edge, rock field; Phase: storm; `specs/genome-screen-calls.md`); at most 3, so the stack (31) stays inside the row. **Only on the traits the frame flags** (`changedBy` `self`, `trait.selfChanging { toward, places }`, T-20261016-137): S03 Glow (toward bright; cave, wood), S15 Basking and S16 Phase, the last two in sealed chapters. S03's Duration stays breed-only. On Create and the Incubator the steps are always unlit: only a partner moves them | "It changes where it goes" |
| Asleep | Sleeping loci sit behind their switch gene, not as genes of their own: a gate bar 2 × 20 at (26, 2) of the switch gene and one dim 3 × 3 dot per sleeping locus at (30, 3 + 4k), in the gap before the next gene (only S02's Spots and S03's Markings have sleeping loci; S01's Markings is a switch with none, so it never shows a bar). Three states: off, the bar and dim dots; the pod's switch already on, no bar and the dots in plain `bone`; woken by the player, the bar cuts away and the dots light `mint` one by one, 80 ms apart, as the markings appear on the founder. **An unread chapter shows neither bar nor dots**: asleep is this pod's state, unknown until read | "It carries this but doesn't wear it" / "I woke it" |
| Sealed chapter (`chapter.sealed`) | The find's picture 24 × 24 (`findKind`: crystal, pearl or shard) at the first gene's place and a closed bar 4 px along the row; no genes, and no drums on the tray. Opened (`settings.sealedOpen`, or the find is in): the row becomes frosted genes and then reads as any doings row. Five species: S02 Character, S09 Movement (a tide pearl), S11 and S15 Stamina, S16 Charge | "A find opens this" |
| Still a surprise | Frost 20 × 20 on each gene of an unread chapter; the chapter's glint is on its emblem (§2.1) | "Still a surprise; something new in this chapter" |
| Clash | The ring's rim `red` on **every** trait `clashTraits` returns (1 to n), mirrored on their drums; **no link** (a link implies a pair; the code returns a set: the game designer's call, `specs/genome-screen-calls.md`). The bottom line names the real traits. Unreachable with today's frames (0 of 37,946 single and paired edits, T-135): kept as the code's guard, no art priority | "These won't build together" |

- **Focus:** the house's own ring at gene scale: `genome-focus-32x32`, a 2 px `focus` ring of radius 15 centred on the focused drum's gene, placed 1:1 (T-134; no corner brackets, nothing from the genome-field references). The ring on the drum is unchanged.
- **Colour is never alone:** every state is also a shape.

### 2.3 The sample bay (the focused gene, isolated)

| Piece | At (from 744, 96) | Content |
| --- | --- | --- |
| Copy 1 | (8, 4), 160 × 128 | The look the first copy gives on its own: `trait-{species}-{trait}-{look}-160x128` (the Incubator card's crops), the largest 1:1 picture there is. The bay is 176 wide, so the two copies stack rather than sit side by side |
| Copy 2 | (8, 148), 160 × 128 | The look the second copy gives |
| The pair mark | (80, 135), 16 × 10 | Between them: front and behind, a lens, or doubled |

- **States:** the shown copy has a 2 px `mint` frame; a hidden copy wears `genome-veil-160x128`; a blend frames both; a chosen copy is framed and the dropped one veiled. The look itself is on the drum's window and the founder, so the bay does not repeat it (T-134).
- **Inherited-only:** the two copies as above, with the joined rings and the cross mark in the pair mark's place. **No picture:** the gene's mark, centred in each copy's frame. **Unread:** both frames frosted, with the glint when the pod glints.
- The bay follows the focus. A turn redraws the two frames, the veil and the pair (at most 2 × 160 × 128 + 16 × 10).
- **Before and after** is on the founder (`specs/slip-reward.md` §2: the old look fades as the new one settles), not on the screen.

**Refused turns** (the game designer's T-20261016-132, finding 3): ▲ or ▼ on a drum that cannot turn (inherited-only, one look, self-changing) answers once on its gene, about 400 ms, then cuts back. Inherited-only: the row's line from the gene to the cross mark lights, 3 px `mint`. One look: its ring flashes `mint` once. Self-changing (when flagged): its step marks and place badge frame light. Nothing else moves; the context line says why ("breed to change"), as now. No plate, no sound.

**The marks' family** (T-132, T-135): the glint (gold, four points) says "something new in this chapter" and sits only on an unread chapter's emblem; the wish glint (yellow, four points) sits only on a read gene; the first mark is a triangle, never a star. Each sits at the same corner, so a gene wears at most one: wish over first.

## 3. A turn, in step

On ▲ or ▼: in the turn's frame the drum cuts, the gene's mark cuts to its new state, and the founder's part starts its existing 200 ms dither with the change light and the reaction (`specs/slip-reward.md`); the bay's copies cut **on the next frame** (16 ms later, unseen), always, so the turn frame stays under the ceiling (T-140, the architect's T-133 change 4). **Dirty area:** the turn frame is the drum (7,680), the gene with its focus ring (1,024), the founder's part box (≤ 94,848) and the price and context labels (about 14,000): at most about 117,600. The next frame is the bay's two frames (≤ 41,120) plus the founder's dither box (≤ 94,848): at most about 136,000. Both ≤ 153,600; the face test prints both frames.

## 4. Create's states

| State | The screen |
| --- | --- |
| `nothingRead` | The frame (hub, frame line, chapter lines, emblems unread) and every gene under frost; the gold glint on the emblem of each chapter where the pod glints; no switch bar or dots; a sealed chapter shut; the bay frosted |
| `shape` | As §2. Changed genes lit with the notch |
| clash | A red rim on each trait of the set; no ✓ cap (as now) |
| `grow` | ✓ Grow it opens the decision panel first (`specs/station-decision-panel-spec.md`, T-45: the founder as the pod would grow it beside yours). This row plays after the panel's ✓. The drums lock; the tree holds (no focus ring). The bay cuts to the stamp printing at **772, 112, 120 × 120** (0 to 300) and, at 300, the code at **752, 248, 160 × 25** (baseline 264, 16 px, `mint`; a 1 px `mint` rule at y 272 from 752 to 912). At 300 the pod seals in its port and travels |

## 5. The Incubator: the same instrument, compact

- **Housing** 88, 96, 208 × 312 (the slip's slot, top-aligned with the card at 96); screen 96, 104, 192 × 296; content 104, 104 (wireframe 06).
- **The compact tree:** the frame line at x 106; no hub and no emblems; rows top 109 + 34i; genes at x 114 + 28j (6 end at 278); the same 24 × 24 marks; the cross mark at (264, top + 10). Asleep, compact: the gate bar only, 2 × 20 at (25, 2) of the switch gene, in the 4 px gap; no loci dots (no room); on waking the bar cuts away. The chapter glint (no emblem) sits at (22, −3) of the row's first gene. No bay: the card is the reveal.
- **States:** a founder's genes as left on Create; unread chapters frosted. When a chapter clears, its frost cuts to its genes with a `mint` 2 px pulse (one lit hue on both screens), on the frame the ring's cut lands. The pulse is a cut, not a fade (chrome has no opacity): four rects round each cleared gene shown at the clear's frame and removed at 400 ms; the first mark where the look is new to the field guide. **A founder:** unread chapters clear at (k + 1)/(n + 1) of the growth; a shut sealed chapter never clears, through ready; ready means every other gene known. **A crossed bud:** its forecast-certain chapters (`childKnownChapters`) are known from the start; the rest stay frosted at ready and after (T-135 fix 12).
- **Gone:** the slip (208 × 408) and its blocks (name, found-note, "Your changes", "Cleared while growing", "{n} still to come", "read it when it's out").
- Not a focus target. The card, the stamp and the code are unchanged.
- **Brightness:** the pod's p95 relative luminance exceeds the screen's by at least 0.08 in every growing step and in ready. The slate ground and small lit marks make this likely; **unverified** until the art lands.

## 6. Drawing it (for the architect's check)

Checked by the architect (`results/T-20261016-133.md`: PASS with four changes, applied here in T-140):
- **Every solid line is a run of palette rectangles:** the frame line, the chapter lines, the gate bar and loci dots, the bay's frames, the Grow code's rule, the sealed bar and the pulse.
- **The dotted line to the Cross is one composed picture** of 1 px palette dashes, using the face's `dash` op (`["dash", x, y, len, "h", 1, 1, colour]`), one node per row, never a run of rects (as rects, S01's line alone would be 94 nodes). The clash has no link (T-136), so no dashed red line is drawn.
- **No alpha on the art layer:** the lit marks' soft edge is a palette ring painted in the slice (§2.2); the pulse is a cut (§5).
- **The turn's frame** is split as §3 says, to stay under 153,600.
- Every mark, emblem, picture, the focus ring and the housing are placed slices at 1:1; nothing is drawn as an anti-aliased line or a circle by the face.
- **Counts** (the architect's measure on the built face plus the tree): Create stays under about 190 of 400 objects and about 110 of 200 pictures (S09, 27 genes in 7 rows: about 27 mark sprites, 7 emblems, hub and lock, about 40 rects, the bay's nodes).

## 7. Tests

- **Specs test:** the rects of §1 and §5; the clearances; every frame's chapters ≤ 8 and genes per chapter ≤ 6, each landing inside the content; no `slip`, `well`, `geneLine`, `name` or `found` region on Create; no text on either screen but the Grow code.
- **Face test:** per state, the marks of §2.2, each gene's kind from the frame row; a turn's redraw list and dirty area (§3); a clash set of n draws n red rims and no link; an unread chapter draws no switch bar; a shut sealed chapter draws no genes and no drums; a slide moves the focus ring to a slid-off drum's gene; the Incubator clears exactly one row's frost per chapter cleared.
- **Goldens:** all `create-*` and `incubator-*` move; no other screen's golden.

## 8. Open, for the lead

- **The detail view's key: the Research key (R)** (T-140; UI/UX and the game designer agree; the architect's options in `results/T-20261016-133.md`):
  - **While a read gene is focused on Create,** R opens its detail view over the sample bay (the copies with their letters, the rule in plain words, the reference look). R or ← closes it, back on the same drum. Nothing else on the screen moves; the turn keys do nothing while it is open.
  - **Everywhere else on Create** (a frosted or unread gene, or while Grow's panel is up), R keeps its room meaning (Pods' collection).
  - **Findable:** the bay carries the Research key's mark at its top right (12 × 12 at (156, 4) of the bay), and the bottom line's subject zone reads "R look closer" while a read gene is focused.
  - **Why R, not ✓:** ✓ stays Grow from any drum (2 presses to Grow). Moving Grow to the pod would cost a press on every Grow and every exit. The detail view is the optional depth (10-01); the loop (turn, turn, Grow) keeps its presses.
  - **A named exception, for the lead to rule:** the style guide gives each room key one meaning everywhere. R on a read gene in Create is an exception to that, narrowed to the one case. It is the same pattern as R on Pods (a room key pressed in its own room acts on that room's screen, `intents/frame.mjs`); the frame's room-key table records Create's override. Later, the game designer suggests R = "look closer on the focused read gene" could become a rule on every screen with a detail view (Pods' chapter page, the Vivarium up close, Cross): a later ticket, not this one.
  - **The Incubator:** its genome screen is not a focus target and has no detail view; R keeps its room meaning there.
- **"Read it now" (the lead's ruling, in T-134):** ▲ or ▼ on an unread gene opens the decision panel (`specs/station-decision-panel-spec.md`) for reading that chapter, with its cost and what it reveals. It never spends silently; ✓ on the panel reads, and the row's frost cuts to its genes as on the Incubator. The panel's card is the decision panel's work, not this screen's.
- **Drawn from the frames (T-136):** the wireframes use the real frames: S03 (01, 02, 03, 05, 06), S09 (04), S01 (08), S12 (09). Every gene's kind is the frame's: S03 Claws inherited-only, Shape configurable, Glow self-changing (cave, wood) and Duration breed-only; S09 Movement sealed (a tide pearl, no drums); S01 Markings a switch without sleeping loci; S12 no Legs & tail row (its legs are all frame).
- **Build (T-135 fix 11):** build the tree from the frame version the genome carries (as `stampFrameOf`), not the current frame. Drums exist only for read chapters today (`reviewTraits`); "read it now" needs drums on unread chapters, a build change.
