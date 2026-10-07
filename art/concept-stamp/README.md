# The genome stamp, styled: concept candidates

The stamp's cells are the encoder's and never move; this folder styles what the prototype's README allows around and within them (paper, the perforation's shape, the cell ink's shape, the clan border's ink and silhouette, the glyph halo, copy hues, chapter tints, unread hairlines) and shows the stamp in its three homes: the research bench, the Library's botanical tome and the Caddy's thermal paper. The brief is [`brief-stamp.md`](brief-stamp.md). **Every candidate was run through the prototype's decoder** (`node prototypes/genome-stamp/decode.mjs`); a candidate that does not decode is rejected. Decoder output per candidate is in [`decode/`](decode/), the one-line results in [`decode/results.txt`](decode/results.txt).

**How it is made.** [`tools/style-stamp.mjs`](tools/style-stamp.mjs) imports the prototype's frames and codec, so the dark/light pattern is the encoder's cell for cell, and re-dresses the marks: one engraved family per clan carried by the border cells alone (C01, the hopper frame's clan: leaf-tipped rounded cells in moss ink; C03, the glowtail frame's clan: cut-corner lantern cells in umber; a species without a clan yet: plain graphite), round perforations in every clan, copy 1 in lagoon blue and copy 2 in brick red with pale tints for zero, chapter tints keyed by chapter name so Coat is the same tint on every species, hairline outlines for unread blocks, a light halo behind the glyph corner (clipped to the 5×5 at 17×17), warm cream paper for the tome and a cool pale plate for the bench. [`tools/render-svg.cjs`](tools/render-svg.cjs) rasterizes the SVG with Chromium. The Caddy label ([`tools/caddy-label.py`](tools/caddy-label.py)) uses the encoder's own 20 mm monochrome print untouched, a rule and the code; nothing else and no name. The tome and bench surroundings are **generated** (prompts and hashes in [`prompts.json`](prompts.json)), and the real stamp is composited into their empty centre by [`tools/composite-plate.py`](tools/composite-plate.py); the composite is what gets decoded. Nothing styled is drawn by hand; nothing generated carries a cell.

![Styled faces: three species on two papers, an unread variant and two Caddy labels](contact-sheet-faces.png)

*The styled faces after the owner's decisions (round perforations everywhere, the clan in the border cells alone). Row 1: tome paper; row 2: bench plate; row 3: the glowtail with two chapters unread, and the Caddy labels. Every one decodes. The faces are encoder cells, styled in code, not generated.*

## Decode results

| Candidate | Size | Decodes | Code |
| --- | --- | --- | --- |
| hopper · C01 · tome paper | 300 px (17×17) | yes | `S11v1-0F-8898-7EC96C` |
| hopper · C01 · bench plate | 300 px | yes | same |
| glowtail · C03 · tome paper | 300 px (25×25) | yes | `S13v1-7F-82F9-08AA9F` |
| glowtail · C03 · bench plate | 300 px | yes | same |
| glowtail, two chapters unread · tome and bench | 300 px | yes | `S13v1-37-FAC1-07667D` |
| 150 loci · unassigned · tome paper | 300 px (37×37) | yes | `S22v1-FF-20AC-66DBCD` |
| 150 loci · unassigned · bench plate | 300 px | yes | same |
| hopper, glowtail, 150 loci · bench plate | 120 px | yes | each its own |
| hopper, glowtail, 150 loci · Caddy 20 mm print (203 dpi, bilevel) | 160 px | yes | each its own |
| hopper, glowtail, 150 loci · Caddy 58 mm label | 160 px stamp | yes | each its own |
| hopper, 150 loci on the C01 plates; glowtail on the round-2 C03 plates (composites) | 512 px stamps in 1024 px plates | yes, default search | each its own |
| glowtail Caddy label warped onto the photographed strip | about 330 px stamp, tilted | yes | `S13v1-7F-82F9-08AA9F` |
| glowtail on the round-1 C03 plates | 430 px stamp | **no** (a1: grid not found; a2: only with the full search) | plates rejected |

## The surroundings: generated, then the real stamp placed

Nine generations (of 16 allowed), all on Pro: round 1 with two trefoil plates for C01, two lantern plates for C03, one thermal-paper strip for the Caddy and two style references; round 2 with two more C03 plates after the first two failed the decode test. The real styled stamp is composited into each plate's empty centre; the composite is what the decoder reads.

![Composites and references](contact-sheet-plates.png)

*Row 1: the three tome composites, each decoded. Row 2: the Caddy label warped onto the photographed strip (decoded), and the two style references, which are illustrations and were never decoded. Concept art, generated surroundings with real stamp faces.*

<table>
<tr>
<td align="center" valign="top"><img src="generated/ST-T-r1-a1-canvas.png" width="330" alt="ST-T-r1-a1"><br><em>ST-T-r1-a1: C01 plate, trefoil border. Kept, recommended.</em></td>
<td align="center" valign="top"><img src="generated/ST-T-r1-a2-canvas.png" width="330" alt="ST-T-r1-a2"><br><em>ST-T-r1-a2: C01 plate, lighter border. Kept as alternative.</em></td>
<td align="center" valign="top"><img src="generated/ST-F-r2-a1-canvas.png" width="330" alt="ST-F-r2-a1"><br><em>ST-F-r2-a1: C03 plate, round 2, lanterns at the corners. Kept, recommended.</em></td>
</tr>
</table>

**C01 plates (the hopper frame's clan).** Both are herbarium plates with an engraved trefoil border in moss ink on deckled cream paper and a clean inner square; a1 adds a pressed leaf in the corner and a heavier frame, a2 a rule under the frame. The hopper stamp sits at half the width inside either; both composites decode. a1 is recommended: its border is denser and reads as one family with the stamp's leaf-tipped border cells.

**C03 plates (the glowtail frame's clan), round 1: both rejected by the decoder.** a1 drew the plate as an open book on a blue-grey table and a2 a flat deckled page, each with a dense lantern border inside a double rectangular frame. Both look right for the tome and both fail the test that matters: with the glowtail stamp at a safe size, a1 returns "grid not found" ([composites/rejected-glowtail-on-ST-F-r1-a1.png](composites/rejected-glowtail-on-ST-F-r1-a1.png)) and a2 decodes only when the reader is told to try every candidate square, not with its default search ([composites/glowtail-on-ST-F-r1-a2.png](composites/glowtail-on-ST-F-r1-a2.png)). The nested engraved frames are square candidates that the reader tries before the stamp. That is the brief's rule made concrete, and sharper than written: a plate must not put rectangular frames around the stamp at all, not only keep clear of its quiet margin.

<table>
<tr>
<td align="center" valign="top"><img src="generated/ST-F-r1-a1-canvas.png" width="330" alt="ST-F-r1-a1"><br><em>ST-F-r1-a1: rejected (grid not found; off-vibe table).</em></td>
<td align="center" valign="top"><img src="generated/ST-F-r1-a2-canvas.png" width="330" alt="ST-F-r1-a2"><br><em>ST-F-r1-a2: rejected (decodes only with the full candidate search).</em></td>
<td align="center" valign="top"><img src="generated/ST-F-r2-a2-canvas.png" width="330" alt="ST-F-r2-a2"><br><em>ST-F-r2-a2: round 2 on an open book. Kept as alternative; decodes.</em></td>
</tr>
</table>

**C03 plates, round 2.** The prompt dropped the inner frame and the lantern border and asked for lanterns at the four corners and one rule top and bottom. Both attempts decode with the default search; a1, a deckled page with watercolour-warm corners, is recommended, a2 (the same on an open book) the alternative. The two C01 plates passed the default search in round 1 because their border is a vine, not a frame of boxes.

**The Caddy strip.** A photograph of blank 58 mm thermal paper on a table with its left third flat. The monochrome label (the encoder's 20 mm print, a rule, the code) is warped onto the paper in perspective ([tools/composite-strip.py](tools/composite-strip.py)); the decoder reads it through the tilt.

**Style references.** R-a1 illustrates the real hopper face as a stamp among engraved leaves; R-a2 as a label on the lab's dark glass plate. Neither is decodable (the model redraws cells), and neither is a candidate; they show the owner how the stamp can feel in each room and they guided the perforation and ink choices in the code.

## Recommended

<table>
<tr>
<td align="center" valign="top"><img src="composites/hopper-on-ST-T-r1-a1.png" width="480" alt="hopper on the C01 plate"><br><em>Tome: the hopper stamp on the C01 plate. Decodes: S11v1-0F-8898-7EC96C.</em></td>
<td align="center" valign="top"><img src="composites/glowtail-on-ST-F-r2-a1.png" width="480" alt="glowtail on the C03 plate"><br><em>Tome: the glowtail stamp on the round-2 C03 plate. Decodes: S13v1-7F-82F9-08AA9F.</em></td>
</tr>
<tr>
<td align="center" valign="top"><img src="renders/glowtail-c03-bench-300.png" width="300" alt="glowtail on the bench plate"><br><em>Bench: the glowtail face on the cool plate, 300 px. Decodes.</em></td>
<td align="center" valign="top"><img src="caddy/glowtail-label-58mm.png" width="460" alt="Caddy label"><br><em>Caddy: the 58 mm label, 20 mm stamp in plain dots, rule and code. Decodes.</em></td>
</tr>
</table>

The styling system in `tools/style-stamp.mjs` is the recommendation: one engraved family per clan in the border cells alone (leaf-tipped cells for C01, cut-corner lantern cells for C03, plain graphite for a species without a clan yet), round perforations everywhere, copy 1 lagoon and copy 2 brick with pale zeros, chapter tints by name, unread blocks as hairlines, a light glyph halo, cream for the tome and a cool plate for the bench, plain black dots on the Caddy.

Checklist from the brief (section 8):

- [x] 1. Decodes with the prototype's decoder: every Station render, every kept composite, every 20 mm print and label.
- [x] 2. No cell moved: the geometry comes from the encoder's `encodeCells`; only shapes, hues and paper change.
- [x] 3. Reads as a stamp at a glance: perforation, frame, border, glyph corner.
- [x] 4. One family per clan across sizes 17 to 37, carried by the border cells alone; perforations round in every clan (the neutral family stands in for species without a clan).
- [x] 5. Copy colours mean copy 1 and copy 2; pale means zero; empty means unread.
- [x] 6. Chapter tints consistent across species, keyed by chapter name.
- [x] 7. Fine in one colour: every ink greys dark, every tint light (the 20 mm prints are the proof).
- [x] 8. The Caddy label is plain and 20 mm: black dots, a rule, the code.
- [x] 9. No name baked in: the code only, on the Caddy label and the tome caption.
- [x] 10. The tome plates fit the botanical tome; the bench plate is a quiet cool label.

## Limits

- The plates are generated and composited; the pressed-specimen caption face is a stand-in (DejaVu Serif), not the tome's chosen face.
- The 150-loci stamp has no clan, so it wears the neutral family and sits on a C01 plate only to show scale; its own plate waits for its clan.
- Plates are decode-tested with the reader's default search, which tries the five likeliest squares; a plate with rectangular frames around the stamp can pass only with the full search, and is rejected here. Plate templates need a measured quiet margin and no nested frames.
- The perforation and border shapes are tested on screen and at 203 dpi prints only through the prototype's own pipeline; a real print of the styled face is not needed, since the Caddy prints plain dots.

## Owner decisions, applied

Decided 2026-10-07 and applied in `tools/style-stamp.mjs` without new generation: perforations are round in every clan, and the border cells alone carry the clan family; copy hues stay lagoon and brick; no glint and no amber on the stamp, ever (the glint lives on the pod list); the stamp is information with some flair, nothing more, and nothing that cannot be reproduced in every printed version. Clan families are keyed by the taxonomy's codes (C01, C03), not by names, which are the copywriter's to give. Every face and composite was re-rendered and re-decoded after the change.

## Two questions left for the owner

1. **The tome caption's face.** The code under the stamp on the tome plate is set here in a stand-in serif. Should the tome use its own text face for the caption, or the device's Inter so the code reads the same everywhere?
2. **The glyph halo.** A paler-than-paper square behind the 5×5 glyph is the one piece of flair left inside the frame; it vanishes in print and the decoder ignores it. Keep it, or drop it for a flatter face?
