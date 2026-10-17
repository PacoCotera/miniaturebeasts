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
| Species hub | 440, 101 + 34L − 13, 24 × 24 (L = the number of look rows), with the lock mark 8 × 10 above it | The species' glyph: the frame every member shares. Locked genes are this and the trunk, never nodes. All looks or all doings: the hub centres on the trunk |
| Trunk | 2 px at x 470, from the first row's centre to the last's | The frame |
| Branch | 2 px at y top + 15, from the trunk to the row's last gene | The chapter |
| Emblem | 476, top + 4, 24 × 24 | The chapter's emblem, read or unread (existing `rail-emblem-*`, checked on slate) |
| Genes | 508 + 36j, top + 4, 24 × 24 | One per trait, in the bank's order; at most 6 (S09's Coat) ends at 712 |
| To the Cross | a 1 px dotted line from the row's last gene to the cross mark 12 × 12 at (720, top + 10) | On a doings row whose genes are all inherited-only: "only breeding changes these" |

### 2.2 A gene's mark (24 × 24, one family)

| Kind or state | Mark | What the player reads |
| --- | --- | --- |
| Configurable, as the pod is | An open ring with three tumbler ticks; inside, the **copy pair**: the shown copy solid in front, the hidden copy as an outline behind | "I can change this; this copy shows, that one hides" |
| A blend | The pair as one lens, half each copy | "The two copies meet" |
| Changed by you | The ring and pair lit in `mint` (the one lit hue on both screens; no bloom, at most a 1–2 px soft edge) and the notch 3 × 6 at (21, 9) | "I changed this" |
| Copy chosen | The pair as two of the same copy (copy 1 in `bone`, copy 2 in `sand`): the rejected copy has dropped out | "I chose which copy it keeps" |
| A first | The star 10 × 10 at (16, 0) | "No resident has this look" |
| Inherited-only | A closed disc with the joined rings | "Only breeding changes this" |
| Self-changing | A small ring with four step marks round it (3 × 3, `mint` lit, none lit on a founder) and the place badge 12 × 12 at (25, −4) | "It changes where it goes" |
| Asleep | Dark, behind a gate bar 3 × 20 at (−9, 2) of the first sleeping gene; when the switch turns on, the bar goes and the genes light one by one, 80 ms apart | "It carries this but doesn't wear it" / "I woke it" |
| Sealed chapter | The find's picture 24 × 24 at the first gene's place and a closed bar 4 px along the row | "A find opens this" |
| Still a surprise | Frost 20 × 20; the star when the pod glints there | "Still a surprise; something new under here" |
| Clash | The ring's rim `red`, and the broken red link | "These two won't build together" |

- **The clash link:** 2 px `red`, dashed 4 on 2 off, orthogonal: from gene A's left edge at its centre to x = min(A, B) − 7, then to B's row centre, then to B's left edge. It runs only in the gaps. The two drums are marked as now.
- **Focus:** four `focus` corners, arms 6 px, 2 px wide, round the focused drum's gene (−4, −4, 32 × 32). The ring on the drum is unchanged.
- **Colour is never alone:** every state is also a shape.

### 2.3 The sample bay (the focused gene, isolated)

| Piece | At (from 744, 96) | Content |
| --- | --- | --- |
| The look now | (8, 8), 160 × 128 | `trait-{species}-{trait}-{look}-160x128` (the Incubator card's crops). A trait with no picture: its gene mark, centred. Unread: frost 160 × 128, with the star when it glints |
| Copy 1, copy 2 | (8, 152) and (104, 152), 64 × 64 each | The faces "only the first copy" and "only the second copy" (`look-*-64x64`). The shown copy has a 2 px `mint` frame and a 64 × 2 underline at (8 or 104, 222); a hidden copy wears the dim veil; a blend frames both |
| The pair mark | (80, 179), 16 × 10 | The gene's pair (front and behind, a lens, or doubled) between the copies |
| Inherited-only | the copies' place | The joined rings and the cross mark, large |

- The bay follows the focus. A turn redraws its picture, the frames and the pair (at most 160 × 128 + 160 × 80).
- **Before and after** is on the founder (`specs/slip-reward.md` §2: the old look fades as the new one settles), not on the screen.

## 3. A turn, in step

On ▲ or ▼, in one frame: the drum cuts, the gene's mark cuts to its new state, the bay's picture and copies cut; the founder's part redraws under the existing 200 ms dither with the change light and the reaction (`specs/slip-reward.md`). **Dirty area per turn:** the drum (80 × 96), the gene with its corners (32 × 32), the bay's picture and copies (≤ 33,280), the founder's part box and the price: print it, ≤ 153,600.

## 4. Create's states

| State | The screen |
| --- | --- |
| `nothingRead` | The frame (hub, trunk, branches, emblems unread) and every gene under frost; stars where the pod glints; the bay frosted |
| `shape` | As §2. Changed genes lit with the notch |
| clash | The two red rims and the link; no ✓ cap (as now) |
| `grow` | The drums lock; the tree holds (no corners). The bay cuts to the stamp printing at **772, 112, 120 × 120** (0 to 300) and, at 300, the code at **752, 248, 160 × 25** (baseline 264, 16 px, `mint`; a 1 px `mint` rule at y 272 from 752 to 912). At 300 the pod seals in its port and travels |

## 5. The Incubator: the same instrument, compact

- **Housing** 88, 96, 208 × 312 (the slip's slot, top-aligned with the card at 96); screen 96, 104, 192 × 296; content 104, 104 (wireframe 06).
- **The compact tree:** the trunk at x 106; no hub and no emblems; rows top 109 + 34i; genes at x 114 + 28j (6 end at 278); the same 24 × 24 marks; the cross mark at (264, top + 10). No bay: the card is the reveal.
- **States:** a founder's genes as left on Create; unread chapters frosted. When a chapter clears, its frost cuts to its genes with a 400 ms `teal` 2 px pulse, on the frame the ring's cut lands; the star where the look is new to the player. Ready: every gene known. A crossed bud: all frost until it is out.
- **Gone:** the slip (208 × 408) and its blocks (name, found-note, "Your changes", "Cleared while growing", "{n} still to come", "read it when it's out").
- Not a focus target. The card, the stamp and the code are unchanged.
- **Brightness:** the pod's p95 relative luminance exceeds the screen's by at least 0.08 in every growing step and in ready. The slate ground and small lit marks make this likely; **unverified** until the art lands.

## 6. Drawing it (for the architect's check)

Every line on the screen is a run of palette rectangles: the trunk, the branches, the dotted cross line, the dashed red link, the gate bar, the focus corners, the bay's frames and the pulse. Every mark, emblem, picture and housing is a placed slice at 1:1. Nothing is drawn as an anti-aliased line or a circle by the face. The largest tree (S09, 27 genes in 7 rows) is 27 slices, 7 emblems and about 40 rectangles.

## 7. Tests

- **Specs test:** the rects of §1 and §5; the clearances; every frame's chapters ≤ 8 and genes per chapter ≤ 6, each landing inside the content; no `slip`, `well`, `geneLine`, `name` or `found` region on Create; no text on either screen but the Grow code.
- **Face test:** per state, the marks of §2.2; a turn's redraw list and dirty area (§3); a clash draws two red rims and one link; a slide moves the corners to a slid-off drum's gene; the Incubator clears exactly one row's frost per chapter cleared.
- **Goldens:** all `create-*` and `incubator-*` move; no other screen's golden.

## 8. Open, for the lead

- **The detail view** (letters, the rule in words, the reference look) one press away: ✓ is Grow from any drum, so it needs a key of its own; the lead and the game designer choose it. It opens over the sample bay and returns to the same gene.
- **"Read it now"** on ▲/▼ of an unread gene (`specs/editing-life.md` §3): if taken, the bay shows the price under the frost and the context line reads "▲ read it now ◆ n".
- **The wish mark** on genes, with the drums' wish-mark ruling.
- **Sleeping genes and sealed chapters** are drawn from the frame data (`specs/genome-field-play.md` §8, Build); the wireframes show S03's Legs with two sleeping genes as an example, not as S03's real data.
