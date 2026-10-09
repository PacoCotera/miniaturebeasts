# Pod placeholders

Hand-drawn placeholder pods for the Station's Pods screen and the pod rack's wells: three size classes (160×192, 136×168, 112×144) and the well size (32×40), each with a sealed and an identified state, the species glyphs, the seal band and a still glow stand-in. Plainly placeholders: simple calm volumes, no face, no decoration, no pattern. Every pixel is on the Station's 62-colour palette ([`station.json`](../../../palettes/station.json)), drawn at 1×, with 1 px ramp outlines (never black), clean bands, no anti-aliasing and no Bayer.

**Status: signed by the art director, 2026-10-08.** Corrected and signed in the art director's pass below (the well-size pod redrawn, two pigment ramps corrected); the builder may place these in front of the owner as placeholders.

| Image | Caption | Status |
| --- | --- | --- |
| <img src="contact-1x.png" width="520" alt="contact-1x.png"> | contact-1x.png: every piece at 1× on the deep ground. Row 1: the sealed and identified bodies of each class in the base ramps. Row 2: the seal bands and glows. Rows 3 to 6: the 16 glyphs per class on the cap's slate. Row 7: one composed pod per class, sealed then identified (S02 large, S01 medium, S03 small, S01 well). Row 8: the 16 species as identified wells. | placeholder; signed by the art director, 2026-10-08 |
| <img src="contact-2x.png" width="520" alt="contact-2x.png"> | contact-2x.png: the same sheet at 2×, nearest neighbour. | placeholder; signed by the art director, 2026-10-08 |
| <img src="pod-bodies.png" width="360" alt="pod-bodies.png"> | pod-bodies.png: the sheet, 490×550, one row per class: sealed, identified, band, glow. Base ramps, not yet remapped to a species. | placeholder; signed by the art director, 2026-10-08 |
| <img src="pod-glyphs.png" width="360" alt="pod-glyphs.png"> | pod-glyphs.png: the sheet, 510×86, one row per class (large, medium, small, well), the 16 glyphs in species order, cream. | placeholder; signed by the art director, 2026-10-08 |

## Files

| File | What it is |
| --- | --- |
| `source/pod-<class>.txt` | **The drawings**, hand-editable: pieces `body` (identified pod without band or glyph), `band`, `glow`, as rows of characters (legend in `build.py`). |
| `source/glyphs.txt` | The 16 glyphs, 5×5 cells, as the frames hold them. |
| `source/layout.json` | Anchors, base ramps, pigment ramps, species table. |
| `source/lay_out.py` | Started the drawings (forms laid out by rule, then hand-corrected in the .txt). Not part of the build; running it again overwrites hand edits. |
| `build.py` | `python3 -I build.py`: packs the sheets, atlas and contact sheets. Standard library only. |
| `check.py` | `python3 -I check.py`: counts off-palette pixels and checks the rules below. Current result: 0 off-palette pixels, 0 isolated pixels, no black, all geometry rules met. |
| `pod-bodies.png`, `pod-glyphs.png`, `pod-atlas.json` | Indexed sheets (PLTE = the 62 colours in file order; index 62 transparent, tRNS) and the atlas. |

## Shape, colour and state

- One drawing per size class and state. The frames' `proportion` is null for all 16 species, so there is no tall or squat variant; `shellPattern` is not drawn (a plain shell, as directed).
- Light from the top left in three bands (light, base, shade), a small highlight, a 1 px outline in the ramp's darkest step. The shell is a squared ellipse with a flat foot. A foot ring carries the frame's second colour.
- Colour by remap: the sheet is drawn in two base ramps (A: bar to frostS, shell; B: wine to white, foot ring) and each species maps its 12 base indices to its own pigments' ramps (`species.<id>.remap`, indices to indices, one pass). The 10 pigments are matched to palette ramps (`pigments` in the atlas), checked by the art director against the frames' hexes (see the pass below).
- Cap, stem, neck and band are fixed and never remapped: stem stone, cap slate with a lit stone rim, band ink. Glyph cream on the cap's slate, whole cells, clear of the stem, rim and neck.
- Sealed = identified + band, exactly (checked). The identified state has the neck open and the glyph; it has no band.
- Glyph cell: 6 (large), 5 (medium), 4 (small), 1 (well) px.

## Compositing a pod

Atlas ids: `pod.<class>.sealed|identified|band|glow` and `glyph.<class>.<species id>`, with class one of `large`, `medium`, `small`, `well`.

1. Box bottom-centred on (344, 312): x = 344 − w/2, y = 312 − h (large 264,120; medium 276,144; small 288,168). The stem's top row is the box's top, the shell's foot its last row (y 312).
2. Body (sealed or identified), remapped to the species.
3. Glow at box + `glowAt`, remapped (large 32,110; medium 27,96; small 23,83; well 9,27).
4. Identified only: the glyph at box + `glyphAt`, unmapped (large 65,24; medium 55,21; small 46,19; well 14,6).
5. To break a seal: draw the identified body, the band at box + `bandAt`, then remove the band.

Nothing is scaled. The manifest entries in the atlas (`manifest`) register the two sheets with policy `stationChrome`, status `placeholder`; `assets.mjs` has no sub-rectangle, so a builder crops sprites by the atlas rects.

## Art director's pass, 2026-10-08

Judged at 1× and 2× on the contact sheets. I checked them against the Pods directions (the pod fills its box, the still glow and the cap; [Station layouts](../../../../../design/style-guide/station-layouts.md#pods-collection-pod-overview-chapter-page)) and against [Station screens](../../../../../design/style-guide/station-screens.md) (Pods). The three stage classes held up as drawn. The well-size pod and two pigment ramps did not, and I corrected them in the sources and rebuilt.

### What changed

1. **The well-size pod, redrawn** (`source/pod-well.txt`, `well` in `layout.json`). The cap was 18×16, as tall as the 17-row shell, so the well read as a lamp or a sign on a flat disc, not as the same pod. A lit head over a small body also comes close to a figure. Now the stem is 3 rows, the cap 10×10, the neck 3 rows and the shell 24 rows across the full 32 px. The cap takes about a quarter of the height and the shell three fifths, as in the stage classes. The glyph cell is 1 (it was 2), which gives a whole 5×5 glyph at (14,6), clear by a pixel of slate. The band is 12×3 at (10,13) over the neck. The glow was 18×10 with a white core: it filled the shell and ran into the foot ring. It is now 14×8 at (9,27) in two steps (light, highlight), low in the shell, with a row of base above the foot ring.
2. **`charcoal`**: night, slate, stone, mist, fog, bone → bar, hairline, bevel, metal, enamel, bone. The pigment (#465459) is a cool blue-grey, nearest hairline (ΔE 6) and bevel (9). The old ramp turned it violet and used the cap's and stem's own fixed colours (shell base = the stem's stone, shade = the cap's slate). That affected the Loika, Pesko and Oskol shells and the Azkon, Rupar and Igara foot rings. Bone stays as the glow core, so a grey pod keeps a warm centre.
3. **`lagoon`**: tealD, teal, aqua, mint, bone, white → tealD, deepTeal, teal, aqua, mint, white. The pigment (#269fa5) is a deep teal, nearest teal (ΔE 12). The old base, aqua (28), was two steps too light and too green. This changes the Tuikis shell and the Belatz foot ring.
4. **Status**: `layout.json` holds it, and `build.py` now writes the atlas status from `layout.json` instead of a fixed string (one line).

Rebuilt with `python3 -I build.py`. `python3 -I check.py`: 0 off-palette pixels, 0 isolated pixels, no black, every geometry rule met, 0 differences from the frames.

### The two questions

1. **Shell pattern on identified pods: plain for this placeholder.** I agree with the recommendation. The pattern (dots, ribs, plates, segments) in colour B comes with the masters. An overlay pattern is the first step from a stand-in toward art, and this set has to stay plainly a placeholder. At 32×40 a pattern is noise. The identified pod already names its species with the lit glyph and the colour pair. Departure, listed: Station screens (Pods, Palette) gives pods "the species' colour pair and shell pattern". These placeholders show no pattern on any pod, sealed or identified, until the masters land.
2. **Pigment to ramp: corrected for `charcoal` and `lagoon`, the other eight accepted.** Checked against their frames' hexes: S01 Loika (charcoal, cream), S02 Untuva (coral, marigold), S03 Tuikis (lagoon, marigold) and S09 Belatz (cobalt, lagoon). Accepted, with notes:
   - `coral` reads a step hotter than its swatch. #e98268 lies between coral and peach, and a peach base would wash out the glow.
   - `plum` and `periwinkle` share the palette's one violet ramp and are kept a step apart (lilac base and plum base).
   - `jade` sits on the leaf ramp. It is as close to teal as to leaf, and leaf keeps it apart from lagoon.
   - `russet` on rust, `marigold` on amber, `cream` on sand and `cobalt` on river are sensible.
   
   The masters settle the exact hues. **The well-size pod: corrected** (above). As now drawn it is legible at 32×40 and 1× as the same pod as the stage classes. The glyph is a small whole mark, and the colour pair also tells the species.

### Sign-off, art direction column

| Line | Judged |
| --- | --- |
| From the accepted candidate, owner's notes applied (§2) | **n/a**: a placeholder, not a master. Made to the art director's Pods directions, which it meets (the lines below) |
| Station: painted light, soft shadows, no dither bands or flat fills (§2) | **n/a by kind**: placeholders are on the art layer, crisp and flat, never dithered (SS Palette and layers). Light from the top left in three bands (light, base, shade) and a small highlight: **yes** |
| On the palette, ramp outlines never black, no alpha, no dither (§2, for the Station's 62) | **yes**: 0 off-palette pixels, outlines in each ramp's darkest step, no black, transparency only (0 or 255), no Bayer, 0 isolated pixels (`check.py`) |
| At its area, never scaled (§2): the pod fills its box | **yes**: 160×192, 136×168, 112×144 and 32×40. The stem's top is on the box's top row and the shell's foot on its last row (y 312 on the stage), centred. Nothing is scaled |
| The still glow | **yes**: stepped ellipses of the shell's own lighter colours, low inside the shell, nothing outside it. Three steps at the stage classes, two at the well |
| The cap | **yes**: the glyph whole, a pixel of slate clear of stem, rim and neck, cream on the cap's own slate, no bone disc |
| Sealed | **yes**: a plain shell under a plain `ink` band. Sealed = identified + band, exactly |
| Nothing childish, no face (§2) | **yes**: calm squared-ellipse shells with no eyes, mouth, ornament or pattern. A note for the frames' owner, not held against this delivery: two species glyphs come close to readings I would not pick for a lit mark. S02 (Untuva) reads near a small skull at the large size, and S01 (Loika) near an arcade alien. These are the frames' glyphs, drawn faithfully (`check.py` matches them), and changing them changes the frames and the genome ring too |
| Same individual in four-grey and on paper (§2) | **n/a**: Station art layer only; pods are not printed |
| Plainly placeholders; pods of one species match; no shell shows an individual's genes (SS Pods) | **yes**: one drawing per class and state, colour by species remap only, registered as `placeholder` |

**A pod of a species not yet known** (placed on Pods; decided by the art director, 2026-10-08): grey. The shell keeps base ramp A and the foot ring takes ramp A, because the colour pair would show what is not yet known. The glow's core is `bone` (in that remap, `frostS` → `bone`), as on the charcoal species, so every pod keeps a warm centre. It differs from a sealed charcoal pod by its grey foot ring and its name.

**Failures:** none that hold these back. **Departures, listed:** no shell pattern (question 1); the glow is still, with no breathing and no seal-break motion (the motion departure stays with the screen build); the note on the S01 and S02 glyphs goes to the frames' owner. **Questions for the owner:** none. The builder signs the capabilities column.
