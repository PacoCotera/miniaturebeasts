# Homepage design spec

**Proposal**, owner decisions of 2026-10-06 applied, for the next build of `website/index.html`; accepted graphics
stay. Visual reference: the v1 pitch (`v1/website/dist/`).

## 1. Intent

Entice a curious player in one scroll: real hardware, a world to explore, real
genes, made in the open. Pictures sell; copy names what they show.

**After 20 seconds a visitor can say:** "A handheld creature game: explore a
fogged world, bring pods home to a Station, raise creatures with real genes."

## 2. Information architecture

Eight sections. Each has one job, one headline, at most 40 words, one picture
and at most one action. The six-step expedition list, the three-step strip, the
supplies columns, the Punnett grid, the trait panels and the bare screen images
(D1, D2) are gone. The device strip stays, as pictures.

| # | Section, job | Headline | Copy (≤ 40 words) | Picture | Action |
| --- | --- | --- | --- | --- | --- |
| 1 | **Hero** (dark): name the game and show the kit | One for the field. One for home. | A creature game you can hold. Explore a fogged world on the Companion, bring sealed pods home to the Station, and raise mibis whose genes really work. | H1 `hero-kit`, then the device strip: three crops of H1 (Companion, Station, Caddy), name plus four words each | Play the field test |
| 2 | **Expedition**: the map is the game | Walk into the fog. Bring something home. | Every step lifts the fog. Places react to you: shake a bush, wait, see who comes to eat. Storms charge stones with Energy and can break your Probe. Pick up sealed pods. | C1 `companion-map-hands`, full-bleed | none |
| 3 | **Station**: research is visual, not a report | Open the pod. Decide what it becomes. | One pod makes one mibi. Hatch it as it is, or study it first and choose from what it already carries. Energy, Data and Essence from the field power it all. | S2 `station-research-hands` (new), full-bleed; under it a supply strip of three icons with one word each | none |
| 4 | **Caddy**: the kit's home and its link | Dock the kit. Print what you find. | The Caddy charges both handhelds, lets them talk to each other and connects the kit to the cloud. Its printer is part of play: a module that answers what you do, card by card. | Left/right panel: K1 `caddy-print` left, E1 `caddy-summary-epaper` right | none |
| 5 | **Genetics** (sage band): endless families in one species | One species. Endless families. | Every pup is new: coat, markings, crown, ears, size. Some traits hide for a generation and come back. Breed for what you love; your family is yours to shape. | Genealogy tree of portraits V0–V7, composed in HTML/CSS (section 4) | none |
| 6 | **Life**: partners | Raise partners. Grow families. | Bond with a mibi and it comes along, digging, calming, sniffing out buried pods. It grows from juvenile to elder, and its children remember where their genes came from. | Left/right panel: C3 `companion-partner-hands` (new) left, L1 `pip-life-stages` right | none |
| 7 | **FAQ**: honest answers, folded | A few fair questions. | Four questions, closed by default: Is it real? When can I get one? Can I build one myself? Do I need to know genetics? (Answers from the current page, ≤ 40 words each.) | none | none |
| 8 | **Play and source** (dark, joins the footer): the two invitations | Play it today. Read every rule. | The exploration field test runs in your browser now. The code, the design, the genetics and the hardware are open source, made in public. | `prototype-map` (rough playable, already inside the Companion frame) | Play the field test; secondary link: Source on GitHub |

Supplies (Energy, Data, Essence) fold into section 3 as a strip of three icons
(the chip, crystal and droplet from the screens) with one word each; no columns
of text. Licences move to the footer as one caption line.

**Footer** (forest, after section 8): wordmark and links; licence caption line;
under it, right-aligned, the build line `build f5d8717 · 2026-10-06 19:09` in
Caption size, `--on-dark` at 45 % opacity, fed by the existing `build.json`
script. It replaces the build stamp in the sandbox band.

Navigation: Expeditions · Station · Caddy · Genetics · Play (button).
## 3. Visual system

**Background rhythm.** Dark forest only at the two ends: the masthead and hero
form one dark block (no cream masthead above a dark hero), and section 8 plus
the footer form the closing dark block. Between them the body is paper cream,
with one sage band (section 5). Nothing floats:
- the hero picture overlaps the dark/cream edge by 64 px, so the kit sits across
  the boundary and the device strip below it lands on that edge;
- every section starts with its headline on the same left grid line;
- cream sections are separated by space and a single 1 px `--line` rule at the
  content width, never by a change of tint;
- panels (tinted boxes) only where they group several items: the device strip,
  the Caddy pair, the Life pair, the FAQ list. Copy never sits alone in a panel;
- the v1 left/right panel groups two parts: copy left and picture right, or two
  pictures side by side (Caddy: K1 | E1; Life: C3 | L1); stacked on phone.

**Type: one family, four sizes.** The v1 grotesque stack:
`"Helvetica Neue", Helvetica, Arial, sans-serif`.

| Size | Use | Value | Weight, leading |
| --- | --- | --- | --- |
| Display | hero headline only | `clamp(2.75rem, 5vw, 4.5rem)` | 800, 0.98, tracking −0.03em |
| Section | section headlines, footer wordmark | `clamp(2rem, 3.4vw, 3.25rem)` | 800, 1.02, tracking −0.02em |
| Body | copy, buttons, nav, FAQ questions, picture titles | `1.0625rem` | 400 copy, 700 buttons, nav, questions, titles; 1.55 |
| Caption | eyebrows, captions, labels, device strip lines, licences | `0.8125rem` | 400 captions; 700 uppercase +0.08em for eyebrows and labels |

No other sizes, no third headline level: a picture title is Body 700. One
eyebrow per section at most. Headlines keep their two-line break.

**Measure.** Copy max 36em (about 60 characters); headlines max 14ch; captions
max 60ch.

**Spacing** (8 px base). Content width 1200 px; side gutter 32 px desktop,
16 px phone. Section padding 112 px top and bottom desktop, 64 px phone.
Eyebrow → headline 12 px; headline → copy 24 px; copy → picture 48 px;
picture → caption 12 px; grid gap 24 px.

**Colour tokens** (v1): `--forest #172e25` dark blocks · `--paper #f5f2e9`
body · `--sage #dce3c5` the one sage band · `--panel #e6e8dd` grouping panels ·
`--ink #222e26` text on light · `--muted #61725f` captions on light ·
`--on-dark #e5eadd` text on dark (captions at 75 %) · `--lime #dcdf9b` hero
headline second line and eyebrows on dark · `--orange #ee9b58` primary button,
the surprise-pup ring, the monogram · `--line #c9cec2` rules.
Orange is the only accent and appears at most once per screen-height.

**Image framing.**
- Device renders (H1, C1, S2, C3) run full-bleed within their band, or to the
  content width with 12 px radius; no border, no panel behind them.
- Screens appear only inside hardware: Companion screens in the Companion, Station
  screens in the Station. E1 (e-paper) is the one flat screen, always paired with
  K1, which shows it on the Caddy.
- Creature art on transparent ground (V0–V7, L1) sits directly on the band
  colour, with no frame.
- Captions: one size (Caption), one colour (`--muted`, or `--on-dark` at 75 %),
  under the picture, left-aligned, one line: `LABEL · what it shows`.
- No text baked into art; anything the page needs to say is page text.

## 4. Genetics without a lesson: the family tree

A genealogy tree, composed in HTML/CSS from single portraits so it reflows; no
odds, no letters, no grid, no trait list. Three generations, eight individuals,
all one species; names and one trait word per portrait are page text (Caption).

| Gen | Individual | Visible traits |
| --- | --- | --- |
| 1 | V0 Pip (accepted rich Pip) × V1 Rust | Pip: charcoal, plain, three leaves, short ears (carries pale, unseen). Rust: russet coat, plain, three leaves, round ears |
| 1 | V2 Sable × V3 Bramble | Sable: charcoal with cream pale islands, long ears. Bramble: charcoal, plain, five-leaf crown, large |
| 2 | V4 Ember (Pip × Rust) | russet, plain, three leaves, short ears |
| 2 | V5 Thistle (Sable × Bramble) | charcoal, plain, five leaves, long ears, small |
| 3 | V6 Moss, V7 Dapple (Ember × Thistle) | Moss: russet, plain, curled leaves, large. Dapple: russet with cream pale islands, long ears, five leaves |

Layout: generation rows top to bottom; each couple joined by a 2 px `--ink` line
at portrait mid-height with a drop line to their pup(s); the two Gen 2 pups meet
the same way above Gen 3. Portraits 160 px desktop, 76 px phone (four across
fits 390 px); lines drawn with borders, no image. Dapple gets the thin orange
ring and the note "Pale islands, last seen on grandmother Sable."

Copy: the one line in section 2. Caption: `CONCEPT · An imagined family of
Pip's species; generated portraits, not from the game.` The FAQ answer to "Do I
need to know genetics?" links to the public genetics design for the curious.

## 5. The life section

A left/right panel of two frames, each with one caption:
1. **Partner at work**: C3, the Companion in hands in a meadow, its screen showing
   the partner scene (P1) with Pip beside the player at a patch to dig.
2. **A whole life**: L1, juvenile, adult, elder; stage names as captions under
   each figure, set in the page.

**C3 `companion-partner-hands`**, 1536×1024, edit of C1 for hands, light and
device. Prompt sketch: *The same stone Companion held in two hands outdoors in
soft morning light, thumbs on pad and Confirm; on its screen the P1 scene: Pip
beside the player's pawn inside the teal Call ring, glinting soil at a dig patch;
HUD and bottom line inside the screen ("✓ Dig here · meadow · ← Wait · Leave").*

## 6. Station hardware

The Station appears like the Companion: the device rendered whole, its screen
showing a game screen. **S2 `station-research-hands`**, 1536×1024, using H1's
sage Station as the device reference and S1 as the screen. Prompt sketch: *The
sage Station, a two-thumb handheld, held in two hands at a wooden table at home
in warm lamp light, slightly tilted toward the viewer; on its 1024×600 screen the
S1 research screen: the sealed hopper pod in its padded cradle under a pool of
light, "Hopper pod", amber "Needs 2 more Essence", Pip small at right with
"Hopper · known", header with chip 4, crystal 5, droplet 2. Physical controls as
in H1; no other text.* Screen strings that drift may be set in the page as a
masked overlay; the device itself must be right.

**Caption scheme**, on every picture and nothing else: `CONCEPT · …` for
generated art (devices, designed screens, creatures); `ROUGH PLAYABLE · …` for
captures from the browser field test. The FAQ "Is it real?" answer carries the
full honesty statement once.

## 7. Logo slot (paused: wordmark only for now)

The masthead and footer carry the wordmark alone; the spec below waits for
the logo task.

Masthead: left, on forest, 40 px tall, beside the wordmark "MINIATURE BEASTS"
(Body size, 800, uppercase). Footer: Section-size height beside the wordmark.
Favicon: the monogram alone, 32 and 180 px.

Constraints, when resumed: legible at 16 px; one colour (orange `#ee9b58`
on forest, forest on paper) with no gradient; works without the wordmark;
square-ish footprint; drawn, not generated, as SVG; may echo Pip's three-leaf
crown; no ball or capsule shapes. Until then, no mark.

## 8. New art for the next batch

- S2 `station-research-hands`: Station section.
- C3 `companion-partner-hands`: Life panel.
- V1–V7: Pip-species portraits for the family tree (one prompt template).
- H1-D `hero-kit` string repair, only if the open hero question picks it.

Prompts and checks: `art/concept-brief-homepage.md`. Kept: H1, C1, K1, E1, L1,
`prototype-map`. Retired from the page: D1, D2, C2, P1 as a bare screen,
`prototype-storm`, the Punnett crops. G1 and F1 are superseded by the tree.

## 9. Wireframe (desktop, 1280)

```
████ FOREST ███████████████████████████████████████████████████
█ MINIATURE BEASTS   Expeditions Station Caddy Genetics [Play] █
█ One for the field.             ┌─────────────────────────┐   █
█ One for home.  copy  [Play]    │ H1 hero-kit             │   █
███████████████████████████████  └─────────────────────────┘ ██
  PAPER   CONCEPT · caption           (render overlaps edge)
  ┌ panel: Companion crop │ Station crop │ Caddy crop ┐ device strip
  ───────────────────────────────────────────────────── rule
  Walk into the fog. / Bring something home.     copy
  [ C1 companion-map-hands, full-bleed                     ]
  ───────────────────────────────────────────────────── rule
  Open the pod. / Decide what it becomes.        copy
  [ S2 station-research-hands, full-bleed                  ]
   [chip] Data   [crystal] Energy   [droplet] Essence
  ───────────────────────────────────────────────────── rule
  Dock the kit. / Print what you find.           copy
  ┌ panel: K1 caddy-print          │ E1 e-paper summary  ┐
▒▒ SAGE ▒ One species. Endless families.   copy line ▒▒▒▒▒▒▒▒▒▒
▒      Pip ─┬─ Rust          Sable ─┬─ Bramble              ▒
▒         Ember ──────────┬──────── Thistle                 ▒
▒                  Moss       (Dapple)  ← orange ring       ▒
▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒
  Raise partners. / Grow families.               copy
  ┌ panel: C3 partner at work      │ L1 a whole life     ┐
  ───────────────────────────────────────────────────── rule
  A few fair questions. │ ▸ Is it real?  ▸ When…  ▸ …
████ FOREST ███████████████████████████████████████████████████
█ Play it today. / Read every rule. │ prototype-map │ [Play] Source█
█ MINIATURE BEASTS · GitHub · Roadmap · Licensing               █
█ Dirty Pawz Press · Mexico City · licences (caption)           █
█                              build f5d8717 · 2026-10-06 19:09 █
███████████████████████████████████████████████████████████████
```

**Phone (390).** One column. Hero: headline, picture, copy, button, in that
order; the picture overlap shrinks to 32 px. Device strip becomes a horizontal
scroll-snap row of three cards inside the band (the page itself never scrolls
sideways). Full-bleed renders go edge to edge with the caption inside the 16 px
gutter. Left/right panels stack (left part first). The tree keeps its three
rows at 76 px portraits. Section 8: picture after copy. Display size bottoms out
at 2.75rem; nav collapses to the wordmark and the Play button.

## 10. Owner decisions (2026-10-06)

1. **Typeface:** v1's Helvetica/Arial stack; keep v1's left/right panels.
2. **Caddy:** its own section (4), and the device strip stays.
3. **Genetics:** no odds; a family tree replaces the portrait.
4. **Logo:** paused, wordmark only.

Still open: **hero image** strings ("Excence", "Exsence", "Happer pod"):
regenerate a repair (H1-D, one call) or mask them in the page?
