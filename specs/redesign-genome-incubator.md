# The genome screen and the Incubator, redesigned from purpose (UI/UX)

Tickets T-20261016-166 (the genome screen, legibility and polish) and T-20261016-163 (the Incubator), 2026-10-17.

**Corrections (2026-10-17, later the same morning).** (1) **Candling stays**: the owner, 00:43, "yes, the candling idea is ok, the execution was terrible." The Incubator concepts I1, I2 and I3 below replaced it, so they are **withdrawn**; the Incubator is re-cut as candling done well once the creative director's direction (T-20261016-168) lands. Their right column (the reveal as the founder's own part with plain words, the stamp with its text id, `mint` progress) carries over unchanged. (2) **The display ground is the guide's dark matte slate.** A deep-blue display (as in the research-hands concept) would change `design/style-guide/README.md`, and that is the owner's call; the sketches' blue is a question for the owner, not a decision. (3) The gate is the creative director (the role the lead reassigned on 2026-10-17) and the game designer. T-163, T-166 and T-169 are paused until T-168's direction. The owner rejected both at 06:38 UTC. This is the purpose, the acceptance tests and three concepts per screen, sketched for the art director to paint (art T-20261016-169). The creative director and the game designer gate them before the lead and the owner. Sketches: `specs/redesign-genome-incubator/` (composition only, not specs).

## What went wrong (UI/UX's own reading)

- **The genome screen was abstract.** Rings, copy-pair dots, ticks and glyphs on a dark slate encoded the mechanics faithfully (T-135 and T-136 verified them), but nothing on it is a thing a player recognises. A first-time player could not say "this is its coat, and I changed it". The art direction's own rule was broken: "The creature comes first … understand what changed without reading a label. The art is the interface."
- **The Incubator kept the egg** and dressed it in brown, cream and a plastic plaque. The reveal card spoke in trait jargon ("Character: unflappable") beside a pixel glyph.
- **The screens drifted from the quality bar.** The approved Station concept (`art/concept-homepage/station-research-hands.png` on station-gate) is a clean deep-blue display with one lit subject and a few readable words. Recent screens became brown on brown.

## Purpose

**The genome screen:** show the founder's genome as the body it builds. Every gene is a picture of the look it gives, placed with the part of the creature it shapes. A first-time player can point and say "that's its coat, I changed it; that's how it moves, and only breeding changes that".

**The Incubator:** show life being grown in the lab. The founder forms in a machine, the screen shows how far along it is, and each part the machine has just worked out appears as a picture of that part of the animal, with what it means in plain words.

## Acceptance tests (the owner's lines, verbatim; the owner proof must answer each)

| # | The owner, 06:38 | Answered by |
| --- | --- | --- |
| 1 | "The genome is a nice addition, but lacks polish, it's a lazy design, and you don't know what are you looking at." | Genes are pictures of their looks, grouped by the body part they shape, and painted at legible size (all concepts) |
| 2 | "The progress bar is nice, but the cream color is terrible, that doesn't communicate "tech" or "science"." | Progress in the device's own light (`mint` on deep blue), as a level, a track or lit segments |
| 3 | "an egg with a shadow is not a proper incubation allegory. and looks plain bad. the craddle with moss, and a weird egg overimposed." | Corrected by the owner at 00:43 ("the candling idea is ok, the execution was terrible"): candling stays, done well. The moss cradle, the overlaid egg and the flat shadow go. The pod is candled in a proper instrument, with its form read through the shell, per T-168's direction |
| 4 | ""just cleared" doesn't communicate what are you seeing, "character unflappable", dont know what that is." | The reveal is titled by what it is ("Revealed"), shows the founder's own body part or the behaviour painted, and says what it means in plain words (the game designer and the copywriter write them) |
| 5 | "the icon for the trait is also pixelated and impossible to understand." | No pixel glyphs carry meaning; every picture is painted at its size |
| 6 | "that panel is an ugly green border overimposed on the brown background with floating text and terrible margins." | Panels are the display's own panes (deep blue, one bevel), with text inside them on a 16 px margin and no floating text |
| 7 | "The genome code is good, but you don't show the text id, ad that metallic/plastic green plaque is also terrible." | The stamp is drawn on the display, with its text id ("K7Q 4MX P2D") beside it in `mint`, and no plaque |
| 8 | "By no means this resembles the style of miniature lives." | Painted to the Miniature Lives look and the research-hands quality bar: a sculpted, lit subject on a clean screen |
| 9 | Earlier, 04:16 and 04:18: "research/crafting bench. advanced, you're editing life" / "a glimpse of the underling genome mechanics and framework" | The whole genome is present (every chapter, every gene, the kinds), and the copies and letters are one press away (R) |

## The genome screen: three concepts (T-166)

All three keep the verified structure (chapters in ring order, one gene per trait, the gene kinds, read and unread, sealed, clash, first and wish). What changes is what a gene **looks like**: a picture of its look (the drum's close-up), framed by its state (changed: `mint` rim and the notch; breed-only: the joined rings; one look: plain; unread: frost). The rings and copy dots move into the R detail view.

**The game designer's conditions on tiles as controls** (`specs/trait-words-and-doings.md`): ◀ ▶ walk the genes in ring order, not spatially; every gene is focusable, with R for its detail and ▲▼ playing the refusal on genes that can't turn; the focused tile shows its neighbour faces and the change lands on the founder in the same beat; the price ticks on every change. Also (`specs/purpose-briefs-b20261017-1.md`): each row is headed by a picture of the founder's own part, and focusing a row or a gene lights that part on the founder.

**The drums.** Once every gene on the screen is a picture, a separate drum tray would show the same pictures twice. So in all three concepts **the gene tiles are the controls**: the focused tile turns in place with ▲▼ and shows its neighbour faces above and below, as the drum did. The tray goes, and its 848 × 130 goes to the founder and the genome. This is the game designer's "the field is the bank" (`specs/genome-field-play.md` §5), now justified because the screen is pictures. It changes Create's focus graph: ◀ ▶ walk the genes in order, ▲▼ turn the focused one, ✓ is Grow, R is the detail.

| Concept | Sketch | What it is | Strength | Risk |
| --- | --- | --- | --- | --- |
| **G1, the genome on the body** (UI/UX's pick) | `G1-genome-on-the-body.png` | The founder, painted big and lit, is the map. Each look chapter is a callout pane pinned by a leader line to the part it shapes (Face to the head, Coat to the flank, Shape to the back, Legs & tail to the legs). Behaviour (the doings) is one pane, "how it behaves" | The strongest "you know what you're looking at": you change a picture next to the part it changes | Callout placement per rig (6 rigs). S09's 18 look genes need panes up to 6 tiles wide |
| **G2, the gene rack** | `G2-gene-rack.png` | Today's rows, but each row starts with a painted crop of the body part (or a painted behaviour picture for a doing) and its word, and each gene is a 40 px picture in a lit socket | Closest to the verified layout; the cheapest build | Less "advanced": reads as a well-made list |
| **G3, the scanner's body map** | `G3-scanner-body-map.png` | The instrument shows a sculpted reference view of the species body with gene tiles on their regions; behaviour along the bottom; the founder small at the left | The most "lab instrument" | Duplicates the founder; crowds on S09 (27 genes) |

**Words:** one word a chapter (its name) is proposed as an owner-approved budget under gate check 8: the owner's 06:38 line says the player must know what they are looking at, and a chapter name does that best. Nothing else is written on the genome.

**The Incubator's genome:** the same pictures, compact (G2's rack in I1 and I2; I3's chapter strip).

## The Incubator: three concepts (T-163)

All three share the right column. **Revealed:** the founder's own part as a painted crop (or the behaviour painted), the chapter in a word, and what it means in plain words; for example, "Stamina: walks a long way before it tires", in the game designer's and copywriter's words. **Below it, the stamp** drawn on the display with its text id beside it, and no plaque. Progress is in `mint` on deep blue, never cream. The pod from Create is the input in every concept: it docks into the machine's base.

| Concept | Sketch | The allegory | Progress | The reveal on the body |
| --- | --- | --- | --- | --- |
| **I1, the growth chamber** (UI/UX's pick) | `I1-growth-chamber.png` | A glass growth chamber on the machine; the founder forms in the nutrient fluid | A `mint` level gauge on the chamber, and the fluid level | Known parts painted; unknown parts a soft frosted volume ("draw only what is known"); a part resolves as its chapter is read |
| **I2, the scanning cradle** | `I2-scanning-cradle.png` | The founder sleeps curled on a lit platform; a gantry scans it chapter by chapter | The gantry's place on its track, and a `mint` bar | The scan line resolves each part from frost to the founder's look as it passes |
| **I3, the assembly** | `I3-assembly.png` | The genome strip feeds the chamber; each chapter assembles as a lit segment and its part appears | k of n segments lit, and the ready ring | As I1, with the strip as the genome (no separate rack) |

## Asks

- **The game designer:**
  - What each revealed trait means in plain words (one line each, for the copywriter).
  - A painted behaviour picture for each doing chapter (Movement, Stamina, Character, Glow, Charge).
  - Whether the tiles-as-controls change is acceptable for Create's loop.
- **The creative director:** the Incubator's allegory (I1, I2 or I3), and the genome concept (G1, G2 or G3), as what each is in the world.
- **The art director** (T-20261016-169): paint G1, G2, I1 and I2 at 1024 × 600, labelled, with G3 and I3 optional, to the research-hands quality bar, using S03 Tuikis (the frames' real chapters and looks).
- **The genome engineer:** re-verify the chosen concept against the frames, as in T-135, before any build.
- **The lead:** builds on these screens stay parked until the owner chooses.
