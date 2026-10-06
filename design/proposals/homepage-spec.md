# Homepage design spec

**Proposal** for the next build of `website/index.html`; accepted graphics
stay. Visual reference: the v1 pitch (`v1/website/dist/`).

## 1. Intent

Entice a curious player in one scroll: real hardware, a world to explore, real
genes, made in the open. Pictures sell; copy names what they show.

**After 20 seconds a visitor can say:** "A handheld creature game: explore a
fogged world, bring pods home to a Station, raise creatures with real genes."

## 2. Information architecture

Seven sections. Each has one job, one headline, at most 40 words, one picture
and at most one action. The six-step expedition list, the three-step strip, the
supplies columns, the Punnett grid, the trait panels and the bare screen images
(D1, D2, E1) are gone. The device strip stays, as pictures.

| # | Section, job | Headline | Copy (≤ 40 words) | Picture | Action |
| --- | --- | --- | --- | --- | --- |
| 1 | **Hero** (dark): name the game and show the kit | One for the field. One for home. | A creature game you can hold. Explore a fogged world on the Companion, bring sealed pods home to the Station, and raise mibis whose genes really work. | H1 `hero-kit`, then the device strip: three crops of H1 (Companion, Station, Caddy), name plus four words each | Play the field test |
| 2 | **Expedition**: the map is the game | Walk into the fog. Bring something home. | Every step lifts the fog. Places react to you: shake a bush, wait, see who comes to eat. Storms charge stones with Energy and can break your Probe. Pick up sealed pods. | C1 `companion-map-hands`, full-bleed | none |
| 3 | **Station**: research is visual, not a report | Open the pod. Decide what it becomes. | One pod makes one mibi. Hatch it as it is, or study it first and choose from what it already carries. Energy, Data and Essence from the field power it all. | S2 `station-research-hands` (new), full-bleed; under it a supply strip of three icons with one word each | none |
| 4 | **Genetics** (sage band): real genes, felt not taught | Two plain parents. One surprise. | Pale markings can hide in plain parents. Breed two of them and, now and then, a pup shows what both were carrying. Real inheritance runs every mibi. You just play. | G1 `pip-family-portrait` (new) | none |
| 5 | **Life**: partners and families | Raise partners. Grow families. | Bond with a mibi and it comes along, digging, calming, sniffing out buried pods. It grows from juvenile to elder, and its children remember where their genes came from. | Triptych: C3 `companion-partner-hands` (new), L1 `pip-life-stages`, F1 `pip-three-generations` (new) | none |
| 6 | **FAQ**: honest answers, folded | A few fair questions. | Four questions, closed by default: Is it real? When can I get one? Can I build one myself? Do I need to know genetics? (Answers from the current page, ≤ 40 words each.) | none | none |
| 7 | **Play and source** (dark, joins the footer): the two invitations | Play it today. Read every rule. | The exploration field test runs in your browser now. The code, the design, the genetics and the hardware are open source, made in public. | `prototype-map` (rough playable, already inside the Companion frame) | Play the field test; secondary link: Source on GitHub |

Supplies (Energy, Data, Essence) fold into section 3 as a strip of three icons
(the chip, crystal and droplet from the screens) with one word each; no columns
of text. Licences move to the footer as one caption line. The Caddy appears in
the hero, in the device strip and in the footer strip (K1 `caddy-print`, see
decision 2); it has no section of its own.

Navigation: Expeditions · Station · Genetics · Play (button).
## 3. Visual system

**Background rhythm.** Dark forest only at the two ends: the masthead and hero
form one dark block (no cream masthead above a dark hero), and section 7 plus
the footer form the closing dark block. Between them the body is paper cream,
with one sage band (section 4). Nothing floats:
- the hero picture overlaps the dark/cream edge by 64 px, so the kit sits across
  the boundary and the device strip below it lands on that edge;
- every section starts with its headline on the same left grid line;
- cream sections are separated by space and a single 1 px `--line` rule at the
  content width, never by a change of tint;
- panels (tinted boxes) only where they group several items: the device strip,
  the Life triptych, the FAQ list. Copy never sits alone in a panel.

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
  screens in the Station, e-paper in the Caddy. No bare screen crops.
- Creature art on transparent ground (G1, L1, F1) sits directly on the band
  colour, with no frame.
- Captions: one size (Caption), one colour (`--muted`, or `--on-dark` at 75 %),
  under the picture, left-aligned, one line: `LABEL · what it shows`.
- No text baked into art; anything the page needs to say is page text.

## 4. Genetics without a lesson

The picture carries it: G1 is a family portrait. Two plain Pips sit at the back;
four pups in front; one pup has cream pale islands on its back and flanks. The
page draws a thin orange ring around that pup (CSS, not in the art) with a
Caption-size note beside it: "Pale, like neither parent." The copy in section 2
is the only text. No letters, no grid, no odds, no trait list. A "How the genes
work" link to the public genetics design document sits in the FAQ answer to "Do I
need to know genetics?" for the curious.

**G1 `pip-family-portrait`**, rich Miniature Lives treatment, 1536×1024,
transparent (keyed from flat white). Prompt sketch: *Two adult Pips (rich plain
Pip reference: charcoal body, cream belly, orange eyes with cream rings, three
leaf crown lobes, plain coat) sit side by side at the back, slightly turned
toward each other. In front, four juveniles (rounder, larger eyes, bright leaf
buds), three plain, one with cream pale islands on back and flanks exactly as in
the pale-marked reference; that one looks up at the parents. Soft directional
light from upper left, flat white background, no ground, no text, no symbols.*

## 5. The life section

A triptych of three equal frames in one panel, each with one caption:
1. **Partner at work**: C3, the Companion in hands in a meadow, its screen showing
   the partner scene (P1) with Pip beside the player at a patch to dig.
2. **A whole life**: L1, juvenile, adult, elder; stage names as captions under
   each figure, set in the page.
3. **A family**: F1, three generations together.

**C3 `companion-partner-hands`**, 1536×1024, edit of C1 for hands, light and
device. Prompt sketch: *The same stone Companion held in two hands outdoors in
soft morning light, thumbs on pad and Confirm; on its screen the P1 scene: Pip
beside the player's pawn inside the teal Call ring, glinting soil at a dig patch;
HUD and bottom line inside the screen ("✓ Dig here · meadow · ← Wait · Leave").*

**F1 `pip-three-generations`**, rich treatment, 1536×1024, transparent. Prompt
sketch: *The elder Pip from L1 lies at the left, an adult pair stands at centre,
and the pale-marked juvenile from G1, now grown, stands at the right with two
small plain pups at its feet. Same identity rules; flat white background; no text.*

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

## 7. Logo slot

Masthead: left, on forest, 40 px tall, beside the wordmark "MINIATURE BEASTS"
(Body size, 800, uppercase). Footer: Section-size height beside the wordmark.
Favicon: the monogram alone, 32 and 180 px.

Constraints for the logo task: legible at 16 px; one colour (orange `#ee9b58`
on forest, forest on paper) with no gradient; works without the wordmark;
square-ish footprint; drawn, not generated, as SVG; may echo Pip's three-leaf
crown; no ball or capsule shapes. Until it exists, the slot holds the
current asterisk.

## 8. New art for the next batch

- S2 `station-research-hands`: Station section.
- G1 `pip-family-portrait`: Genetics section.
- C3 `companion-partner-hands` and F1 `pip-three-generations`: Life triptych.
- H1-D `hero-kit` string repair, only if decision 3 picks it.

Kept: H1, C1, L1, K1 (footer strip), `prototype-map` (section 7). Retired from
the page: D1, D2, E1, C2, P1 as a bare screen, `prototype-storm`, the Punnett
crops.

## 9. Wireframe (desktop, 1280)

```
████ FOREST ███████████████████████████████████████████████████
█ [mono] MINIATURE BEASTS    Expeditions Station Genetics [Play]█
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
▒▒ SAGE ▒ Two plain parents. │ G1 family portrait, one pup  ▒▒▒▒
▒▒▒▒▒▒▒▒▒ One surprise. copy │ ringed: "Pale, like neither…" ▒▒▒▒
  Raise partners. / Grow families.               copy
  ┌ panel: C3 partner │ L1 a whole life │ F1 a family ┐
  ───────────────────────────────────────────────────── rule
  A few fair questions. │ ▸ Is it real?  ▸ When…  ▸ …
████ FOREST ███████████████████████████████████████████████████
█ Play it today. / Read every rule. │ prototype-map │ [Play] Source█
█ [mono] MINIATURE BEASTS · K1 thumb · GitHub Roadmap · licences █
███████████████████████████████████████████████████████████████
```

**Phone (390).** One column. Hero: headline, picture, copy, button, in that
order; the picture overlap shrinks to 32 px. Device strip becomes a horizontal
scroll-snap row of three cards inside the band (the page itself never scrolls
sideways). Full-bleed renders go edge to edge with the caption inside the 16 px
gutter. Genetics: headline, picture, copy. Life triptych stacks; each frame keeps
its caption. Section 7: picture after copy. Display size bottoms out at 2.75rem;
nav collapses to the wordmark and the Play button.

## 10. Decisions for the owner

1. **Typeface:** keep v1's Helvetica/Arial stack (recommended, the look approved
   in v1), or one Google grotesque such as Inter Tight for consistent rendering?
2. **Caddy without its own section:** shown in the hero, the device strip and the
   footer card only. Agree, or give it a short section after Station?
3. **Hero image:** the current pass C render has three garbled screen strings
   ("Excence", "Exsence", "Happer pod"). Regenerate a repair (H1-D, one call), or
   mask the strings in the page?
4. **Genetics odds:** keep the portrait with no numbers (recommended), or add one
   caption "about one pup in four"?
