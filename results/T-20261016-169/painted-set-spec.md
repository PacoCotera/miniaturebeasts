# The S03 painted set: the cell-level spec (T-20261016-169, for the Station studio)

These are the 22 pictures owed in `results/T-20261016-169.md` ("Owed: the smallest honest painting set"), laid out as four 3 × 2 key sheets. No single-key fix is needed: the 22 cells fit four sheets. That makes 4 requests, with at most 2 retries (6 in all, within the lead's limit). Raw outputs come back to the art director, who cuts and signs them.

## The founder (every cell is this one individual)

- **The source** (masters-pods): `art/station-masters/pods/source/raw/mibi-juvenile-S03-a.jpg`, the signed juvenile, and its cut `art/station-masters/pods/juvenile/mibi-juvenile-S03-304x312.png`. Feed the source into each sheet as the reference for body, coat and face.
- **Its current looks:** what G2 shows. Its Colour and Eyes were changed on the bench, and the rest are its own.

| Trait | Current look |
| --- | --- |
| Colour | lagoon |
| Trim | milk-mint |
| Eyes | big, wide |
| Snout | between |
| Build | between |
| Haunch | between |
| Topline | level |
| Legs | between |

- **Its doings** are all "between" (each locus carries one low copy and one high, a blend). The doing stills show the founder doing it at that middle measure.
- **The rule for every cell:** the founder's own body, coat, pattern, crest and light, from the top left. Only the framing and the subject change. No other individual and no new features.

## The framing

- **Look close-ups** (sheets A and B): the framing and recipe of the existing close-ups.
  - On masters-pods, `art/station-masters/pods/slices/look-S03-crest-tall-crest-64x64.png` and the `look-S03-markings-*` and `look-S03-tail-*` slices; their larger `trait-S03-*-144x176` slices show the detail.
  - The part is centred and fills the cell, lit from the top left, on the same plain warm ground.
  - The close-ups are cut to 64 × 64 and 144 × 176, so paint at the larger size.
- **Doing stills** (sheets C and D): the whole founder in the act, on a plain ground, framed like the existing pose `art/station-masters/pods/source/raw/pose-S03-glow.jpg`. Square cells. The founder fills about two thirds of the cell, so the action reads at 48 and 96 px.

## The sheets

**Sheet A: looks 1** (3 × 2, close-ups)

| Cell | Picture |
| --- | --- |
| A1 | **Colour, lagoon:** the flank's coat, showing the lagoon ground colour across the body |
| A2 | **Trim, milk-mint:** the underside and throat, where the trim colour lies |
| A3 | **Eyes, big, wide:** the face, eyes large and set wide |
| A4 | **Snout, between:** the head in three-quarter view, the snout of middle length and breadth |
| A5 | **Build, between:** the whole body from the side, of middle bulk |
| A6 | **Haunch, between:** the hind body, its haunch of middle fullness |

**Sheet B: looks 2 and the Eyes neighbours** (3 × 2, close-ups)

| Cell | Picture |
| --- | --- |
| B1 | **Topline, level:** the back seen from the side, its line level from shoulder to rump |
| B2 | **Legs, between:** the legs of middle length and thickness, standing |
| B3 | **Eyes, between** (the neighbour face): the same face as A3, eyes of middle size and spacing |
| B4 | **Eyes, small, close** (the far neighbour): the same face, eyes small and close-set |
| B5 | empty: plain ground only. Don't fill it |
| B6 | empty: plain ground only. Don't fill it |

**Sheet C: the row heads and Movement** (3 × 2, doing stills)

| Cell | Picture |
| --- | --- |
| C1 | **Movement's row head:** the founder walking away across soft ground, with its footprints behind it at its own pace |
| C2 | **Stamina's row head:** the founder on a long walk along a path, far from where it started, still going |
| C3 | **Character's row head:** the founder meeting a new object (a pebble or seed it hasn't seen), neck out, sniffing |
| C4 | **Pace, between:** a steady trot, neither ambling nor dashing |
| C5 | **Stride, between:** mid-stride, steps of middle length |
| C6 | **Weave, between:** moving with a slight side-to-side sway, between a straight scurry and a weaving glide |

**Sheet D: Movement, Stamina and Character genes** (3 × 2, doing stills)

| Cell | Picture |
| --- | --- |
| D1 | **Turning, between:** mid-turn on a moderate curve |
| D2 | **Strength, between:** pushing or carrying a small load (a seed head), with effort but no strain |
| D3 | **Reserve, between:** partway along a walk, a little tired, not spent |
| D4 | **Thrift, between:** eating a small, ordinary meal |
| D5 | **Curiosity, between:** half-turned toward a sound, interested but not approaching |
| D6 | **Nerve, between:** a passing shadow overhead, the founder pausing and looking up, neither fleeing nor ignoring it |

## Not the studio's (point 6)

The scan-light pass and Glow's four steps are composition, not painting. They live in `results/T-20261016-169/make-g2.py`:
- the scan light is a screen blend toward mint on the focused part;
- Glow's steps are the gene's drawn marks (0 to 4), with the cave and wood badges.

They ride with the composite once the painted cells are cut, so there are no cells for them.
