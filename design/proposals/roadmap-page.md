# Roadmap page: layout spec

**Proposal**, 2026-10-09 12:37 (Mexico City), UI/UX designer. For a new public page
at `website/roadmap/index.html`, served at `/roadmap/`. It renders from
`website/roadmap.json` (served at `/roadmap.json`), so the page stays current
when the file changes. Design source: `homepage-spec.md` §3 (type, palette,
spacing, components) and the Website decisions (lead with the hardware, the open
source visible, indie early-access tone). Nothing here adds a size, colour or
component the homepage does not have, except the status marks (§5) and the
light variant of the ghost button (§7).

Wireframes, rendered at 1× from a throwaway mock fed by the real data file
(Liberation Sans standing in for Helvetica Neue / Arial):

- Desktop, 1280 wide: `roadmap-page/desktop-1280.png` (1280×5042)
- Phone, 390 wide: `roadmap-page/mobile-390.png` (390×6969)

Both show the first Station item opened, everything else folded.

## 1. Purpose

Answer, at a glance, "what does each part of the kit do today, and what comes
next?" A visitor can say after ten seconds: *"Station and Companion already
play in the sandbox; the Caddy, the cloud and the hardware are mostly ahead."*
After a minute they can open any item for one sentence and its notes on GitHub.

## 2. Hierarchy (reads first to last)

1. **The glance** (dark hero, right): seven parts × four stages, one mark per
   item. The infographic: where the weight sits shows the state of the project.
2. **The headline** (hero, left): "What's here. / What's coming." and one line.
3. **The board**: one row per part (module), in file order: Station, Companion,
   Caddy first, so the hardware leads; each row split into four stage lanes.
4. **An item**: its title; opened, one sentence and "Read on GitHub".
5. **Made in the open** (closing dark block) and the footer.

## 3. Page structure

| Block | Ground | Content |
| --- | --- | --- |
| Masthead | forest | wordmark → `../`; nav: Home, GitHub, Play (ghost button) |
| Hero | forest | left 5fr: eyebrow ROADMAP (lime), h1 Display, copy, "Updated 9 October 2026" (Caption, `--on-dark` 75 %). Right 7fr: the glance panel |
| Toolbar | paper | Caption "Open any item for what it does." left; "Open all" button right |
| Board | paper | seven module sections, 1 px `--line` rule between them |
| End | forest | eyebrow MADE IN THE OPEN, h2 "Play it today. / Follow every change.", copy, Play the field test (orange, the page's one accent), Source on GitHub link |
| Footer | forest | as the homepage footer; its Roadmap link points to `./` |

Copy, fixed in the page (not in the data): h1 "What’s here.<br><span>What’s
coming.</span>"; hero copy "Every part of the kit: what it does today, what is
being made and what comes after. Every item links to its notes, in the open.";
end copy "The field test runs in your browser now. The code, the design and this
roadmap are open source, made in public."

## 4. Modules by status: the board

Each module is a `<section id="{module.id}">`:

- **Head** (the homepage `.head` grid, 5fr | 6fr, gap 24/48, bottom-aligned):
  left the device thumbnail (only when the module has `image`: 80×80, radius 8,
  `alt=""`, 20 px to the name) and the name as h2 at Section size; right the
  `oneLine` as copy (Body, `--ink`).
- **Lanes**, 32 px under the head: four equal columns, gap 24, always in the
  order **Live · Building · Next · Later**. At 1280 each lane is 282 wide.
- **Lane heading** (h3): status mark 12×12 + 8 px + label in the eyebrow style
  (Caption 700 uppercase +0.08em, `--ink`). 12 px to the first card.
- **Cards**: a vertical list, gap 8. Items keep their file order inside a lane.
- **Empty lane** (desktop only): one 50 px slot, 1 px dashed `--line`, radius 8,
  no text, `aria-hidden`; a visually hidden "Nothing here yet." follows. It
  keeps the grid readable as a grid. On phone empty lanes are not drawn.

Stages, their mark and their card:

| Status | Label | Legend line | Mark (12×12 SVG, `currentColor`) | Card |
| --- | --- | --- | --- | --- |
| `live` | LIVE | in the sandbox now | filled circle r 6 | `--panel` fill |
| `building` | BUILDING | being made now | ring r 5, stroke 2, left half filled | `--panel` fill |
| `next` | NEXT | up after that | ring r 5, stroke 2 | no fill, 1 px `--line` border |
| `later` | LATER | planned, not started | ring r 5, stroke 2, dasharray 2 1.93 | no fill, 1 px `--line` border |

Solid on the left, outline on the right: what exists is filled, what is
planned is drawn. Marks are `--forest` on paper, `--lime` on forest. Status is
never carried by colour alone: shape, lane position and the lane label all say
it. An unknown `status` is skipped (and logged to the console).

### The glance panel

A `<table>` in a panel with 1 px `rgb(229 234 221 / .2)` border, radius 12,
padding 24 (16 on phone). Header row: the four marks with their labels (lime,
eyebrow style); on phone the labels are visually hidden and only the marks show.
One row per module, 36 px tall (40 on phone), 1 px rule at the same .2 alpha
between rows; the row header is the module name (Body 700; Caption 700 on
phone) linking to `#{module.id}`. Each cell holds one mark per item (12 px, gap
4; on phone 7 px, gap 2), `aria-hidden`, plus visually hidden text such as
"4 live". Under it, the legend: four lines "mark **Label** definition" in
Caption, two columns (one on phone).

## 5. How an item reads

An item is a `<details>` card, closed by default, on the homepage FAQ
disclosure pattern:

- **Summary**: the `title`, Body 700, padding 12 16, "+" / "−" at the right
  (Body 400). Closed: 50 px tall on one line, 76 on two.
- **Opened**: the `text`, Body 400 `--ink`, padding 0 16 14; then 8 px and the
  link "Read on GitHub", Caption 700, underlined.
- Link target: `https://github.com/PacoCotera/miniaturebeasts/` + `tree/main/`
  when `link` ends in `/`, else `blob/main/`, + `link`. Every link in the
  current file (27 distinct paths) resolves on `main` (checked 2026-10-09).
- **Open all** (toolbar): opens every card; label becomes "Close all";
  `aria-pressed` follows. Not persisted.

## 6. Data contract (`website/roadmap.json`)

`updated` (ISO date, shown as "Updated 9 October 2026", `en-GB` long form) and
`modules[]` in display order, each `id`, `name`, `oneLine`, optional `image`
(path under `website/`, the three device modules use the homepage strip crops)
and `items[]` of `title`, `status`, `text`, `link`. The page fetches
`../roadmap.json`. If the fetch fails, the board is replaced by one copy line:
"The roadmap did not load. Read it on GitHub." linking to `ROADMAP.md`; the same
line sits in `<noscript>`. Text is inserted as text, never as HTML.

## 7. Measured regions, desktop (1280)

From the 1× render (x, y, w, h; content x 40–1240):

| Region | Rect |
| --- | --- |
| Masthead | 8, 0, 1264, 88 |
| Hero (forest) | 0, 88, 1280, 507 (padding 48 top, 64 bottom) |
| h1 (64 px / .98, 800) | 40, 169, 480, 125 |
| Glance panel | 568, 136, 672, 395 (name column 192, lanes 107.5) |
| Toolbar | 40, 643, 1200, 40 (48 above) |
| Module 1 (Station) | 0, 684, 1280, 694 (padding 48 / 48) |
| Module head | 40, 732, 1200, 80; thumbnail 40, 732, 80, 80; h2 43.5 px |
| Lanes | 40, 844, 1200, 486; lanes at x 40, 346, 652, 958, w 282 |
| Lane heading | h 20, then 12 to cards |
| Card, closed one line | 282 × 50; two lines 282 × 76 |
| Card, opened (first Station item) | 40, 876, 282, 279 |
| End block | 0, 4385, 1280, 657 (section 112 top, 64 bottom) |

The light ghost button ("Open all"): the homepage ghost with `--ink` for the
inset 1.5 px ring and text, padding 10 18.

## 8. Phone (390)

One column, gutter 16, content 358.

- Masthead: wordmark and Play only (88 tall).
- Hero: eyebrow, h1 at 44 px (two lines), copy, updated line, then the glance
  full width at 16, 410, 358, 455 (name column 88, lanes 59, labels hidden in
  the header, legend in one column). Hero is 825 tall.
- Toolbar: 40 top padding; the caption wraps at 20ch beside the button.
- Module: padding 40 / 40; head stacked, gap 12: thumbnail 56×56 + 16 + h2 at
  32 px, then `oneLine`; Station head 124 tall.
- Lanes stack in order Live, Building, Next, Later, gap 24, 24 under the head;
  **empty lanes are omitted**. Cards 358 wide, same 50 / 76 heights.
- End block: section padding 64 / 48. Nothing scrolls sideways.

## 9. Accessibility

- Landmarks: header, main (`#board`, skip link "Skip to the roadmap"), footer.
  Headings: h1 page, h2 per module, h3 per lane; the end block h2.
- Items are native `<details>`/`<summary>`: keyboard and screen reader state
  come free. "Open all" is a `<button>` with `aria-pressed`.
- The glance is a real table with a visually hidden caption ("How many items
  each part has in each stage"), `scope` on headers and text counts per cell;
  the marks are `aria-hidden`.
- Status never by colour alone (§4). Contrast, measured from the tokens: ink on
  paper 12.6:1, ink on panel 11.4:1, muted on paper 4.6:1, lime on forest
  10.4:1, `--on-dark` 75 % on forest 7.3:1, forest on orange 6.5:1.
- **Focus on light grounds is 3 px `--ink`**, offset 4: the site's orange ring
  is 2.0:1 on paper, below 3:1. Orange stays the ring on forest. (The homepage
  has the same orange-on-paper ring; that is a follow-up for its own spec.)
- The Next/Later card border (`--line`, 1.4:1) is decoration; the card is
  identified by its title and its "+", which pass.
- Targets: every summary is at least 50 px tall and full lane width.
- No motion.

## 10. Owner decisions (structure only)

1. The four stages as lanes inside each module row (this spec), against one
   board per stage.
2. Item sentences folded behind "+" with an "Open all" button (this spec),
   against always shown, which roughly doubles the page height.
3. The three device modules carry their homepage strip photo as an 80 px
   thumbnail, via an optional `image` field added to the data file.
4. The page lives at `/roadmap/`; the homepage footer and FAQ "roadmap" links
   then point to it instead of `ROADMAP.md` on GitHub.
