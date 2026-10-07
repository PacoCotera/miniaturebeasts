# Brief: the genome stamp, styled

> Owner's ask: style the stamp so it reads as a stamp from the game, not a data grid, with the cells fixed: the perforated edge as a real stamp edge, the species border as an engraved frame family (one visual family per clan), the glyph corner, cell colours that mean something (copy 1 and copy 2 hues, pale for zero, empty blocks for unread), a surrounding plate for the Library's botanical-tome page, and a plain label layout for the Caddy's thermal paper (monochrome, 20 mm). Candidates must decode with the prototype's decoder or they are rejected.

Source of truth: `prototypes/genome-stamp/README.md` ("The face", "For the art director"). Reference renders: `prototypes/genome-stamp/img/station-*.png`, `caddy-glowtail-20mm.png`. The art director implements every rule below **in code against the encoder** (`src/stamp.mjs`), never by hand on a render. No image generation.

## 1. Purpose and where it appears

The stamp is the mibi's genome made visible and scannable: the same genome always gives the same stamp, and our own reader (not a QR scanner) decodes it. It appears: on the Pods stage plate at 300 px on the research bench; on the Library's tome page; on Create/Grow, stamped onto the shell as the code appears; on the Caddy's thermal print at 20 mm; and on a mibi's card as its seal with the code.

## 2. Fixed, and allowed

Fixed (cells never move; from the README):
- Perforation: a dot on every other cell of the outer ring (timing marks).
- Frame: one solid square line, the only heavy line (the finder).
- Species border: the same dark/light cell pairs for every member; the clan half, then the member half.
- Glyph: 5×5 cells, top-left; a one-cell gutter from 21×21 up, touching the data at 17×17.
- Block layout: chapter blocks fill from the top as column rectangles of copy pairs; the strip fills from the foot.

Allowed:
- Paper tone, and the quiet margin beyond the perforation (at least one cell clear).
- The dots' shape: solid, centred, about 0.6 cell across.
- The cell ink's shape inside its square, filling about 80% of it.
- Chapter tints behind read blocks and the hairline of unread blocks (colour only).
- The copy colours, as long as they print dark in monochrome.

Breaks reading, so rejected: anything dark inside the frame; a colour that greys light; overlapping the frame line; changing which cells are dark. On the Caddy everything is plain black dots.

## 3. The styling system

- **Paper.** Two tones, so the stamp is always a light label on any ground: a warm cream on the tome, a cooler pale plate on the bench. Margin: one clear cell minimum, two on the tome.
- **Perforation.** Round seed-heads on the tome and pinholes (a soft punched disc) on the bench; same geometry, about 0.6 cell, solid, centred.
- **Cell ink.** Rounded squares, about 80% of the cell, corners about 0.15 cell. One shape for data, strip and border; only the border's silhouette differs per clan (below).
- **Species border, one engraved family per clan.** The dark border cells take the clan's silhouette and ink, and the clan half and the member half read as one family because the same cell shape runs the whole ring; only the pattern changes. Trebola (hopper frame, 17×17): leaf-like rounded cells, pointed at one corner, in a moss-dark ink. Fanalia (glowtail frame, 25×25): cut-corner lantern cells in a deep umber. An unassigned future species (150 loci, 37×37): plain dark graphite squares. Each ink must grey as dark as the frame; the light cells of the pairs stay paper.
- **Glyph corner.** Its dark cells slightly heavier (about 88% fill) with a light halo behind the 5×5: a paler-than-paper square, light only, never dark, never past the gutter.
- **Copy colours.** Copy 1 cool (a deep slate blue), copy 2 warm (a brick red), both darker than mid grey in monochrome. Zero cells pale tints of the same two hues, light enough to read as empty to the decoder. Third and fourth copies, where a frame declares them: moss and plum, same rule.
- **Chapter tints**, one per chapter in a fixed order so a chapter has the same tint on every species: Coat, Face, Shape, Legs & tail, Movement, Stamina, Ways. All pale, warm-to-cool, under the pale-zero threshold.
- **Unread blocks.** A hairline outline in the chapter's tint darkened one step, no fill, nothing inside.

## 4. The tome plate and the bench plate

- **Tome (Library).** A paper plate around the stamp with an engraved frame in the clan's motif (leaf crest for Trebola, lantern for Fanalia; plain rule for unassigned), a pressed-specimen feel: slight paper grain, a soft shadow as if glued in, a small caption line under the stamp holding the code only, in the tome's text face. The engraving stays outside the quiet margin and never touches the perforation.
- **Bench (Pods, Create/Grow, Incubator, Cross).** A quiet glass plate under the stamp: a pale translucent pane with a thin edge, nothing engraved near the stamp, the instrument light from the top left. The stamp sits on it as a label.

## 5. The Caddy label

A 58 mm thermal strip, monochrome, one colour, no tints. The 20 mm stamp (plain black dots, nothing styled, the encoder's `--mm 20 --dpi 203` output) at the left; the code at the right in a plain face, set in one line; a thin rule under both; nothing else. No name.

## 6. Candidates to produce

Three species, each as: Station render at 300 px, 20 mm monochrome print, and the tome plate composite.
- Trebola: the hopper frame (`examples/hopper.json`, 17×17).
- Fanalia: the glowtail frame (`examples/glowtail.json`, 25×25), plus `glowtail-two-unread.json` for the unread outlines.
- Unassigned future species: `examples/future150.json` (37×37).

Decode proof per candidate: `node prototypes/genome-stamp/decode.mjs <png>` on the Station render, the tome composite and the 20 mm print, each returning `ok: true` and the encoder's code. Keep the decoder's JSON beside each candidate.

## 7. Exact strings allowed in art

None but the code in the form `S11v1-…` as the encoder prints it (`node encode.mjs … ` → `code S11v1-0F-8898-7EC96C`), and that only on the Caddy label and the tome caption. No species name, clan name or binomial: names are still being revised, so the code and the glyph alone identify a species in art.

## 8. Pass checklist

1. Decodes with `node prototypes/genome-stamp/decode.mjs`: Station render, tome composite, 20 mm print.
2. No cell moved; the dark/light pattern matches the plain encoder output cell for cell.
3. Reads as a stamp at a glance: perforation, frame, border, glyph corner.
4. One family per clan across sizes 17 to 37; the clan half and member half of the border read as one.
5. Copy colours mean copy 1 and copy 2; pale means zero; empty means unread.
6. Chapter tints consistent across species, in the fixed order.
7. Still fine in one colour: every ink greys dark, every tint greys light.
8. The Caddy label is plain and 20 mm: black dots, code, rule, nothing else.
9. No name baked in; only the code, and only on the Caddy label and the tome caption.
10. The tome plate fits the botanical tome's vibe and the bench plate the lab's.
