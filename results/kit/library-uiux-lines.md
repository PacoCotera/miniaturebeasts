# Library open lines (UI/UX, 2026-10-23 23:19 Mexico City)

Scope: layout only, read-only. Sources: results/T-20261017-library (sheet-layout.md, kit-map.md, uiux-followups.md, art/ad-kit-ruling.md, art/sheet-art.md, art/specimen3.js, words.md, words-2.md, art/frames/) and origin/station-gate (prototypes/ui/specs/station/habitat.json, fonts Inter-Regular/Medium-tnum). Fetched first.

## T-20261023-291 (the Loika's "plain")
**UI/UX ruling:** the legacy "plain" cell is its own trailing group, not a Markings cell. When found it is drawn 17x17 at sheet (252, 522), row 2 of tier L, after the last trait group; the 20 slot cells stay at x 252-663, y 502-518 and nothing else moves at that find. It is never a slot: the tier is picked from slot looks only (Loika stays L), nothing is reserved before the find (met-only and unfound sheets draw nothing at (252,522)), its glint centre is (269,522), and it takes the Coat's lit outline (1 px bone, 1 px out) with the other Coat cells.
Why: 21 cells need 432 px against the band's 416, and any in-trait placement moves every cell after Markings by 20 px; the trailing group wraps to row 2 by itself (rows 502 and 522 are tier L's own, row 2 ends y 539, band ends 549).

## T-20261023-292 (library-sitting-16x12)
**UI/UX ruling:** sitting k is placed at (800 + 20k, y_s + 6, 16, 12), k 0-8. The row keeps its 36 px, so the shelf height h is unchanged. The label stays at lineTop y_s + 2: its 16 px cap spans rows y_s + 6 to y_s + 17, the same 12 rows as the sitting, so the two share top and baseline (the 16x20 sat at y_s, 20 high).
Effect: the row's last pixel is y_s + 17 (was y_s + 19), so the shelf's bottom pad reads 14 px, not 12; no other node moves.

## T-20261023-293 (the Vivarium up-close "See the family" target)
**UI/UX ruling:** a new target `family` on the card, on the story's origin lines (founder: "from the {place}", 1 line; bred: "of {A}" and "and {B}", 2 lines), box = those lines as drawn from x 608, y 88 (24 px a line, clip 248), shape {rect:0, chip:4} as `species`, group `species`; the memory line is not part of it. No new art and no region moves; present in rest, meet and out, enabled by the same door rule as `species`.
Graph edges: species.down -> family; family.up -> species; family.down -> plate.0; family.left -> [name, resident]; family.right none; plate.up -> family (was species). Bottom line: action strings.family ("See the family", the copywriter's), jump habitat -> library.family close on the shown mibi.
Why here: the origin lines are the card's one statement of lineage, the rows above (species) and below (plates) leave no free box, and the stamp well (872,64,120,120) is not a lineage cue.

## T-20261023-295 (a) founder pod in the Parents row
**UI/UX ruling:** founder pod box (852, 146, 24, 32), 1:1, centred on the face row's centre (y 162) at the face column x 852, so the label (lineTop 154), name (x 882, lineTop 152, v_clip 114) and every other node stay put. Clearances: 4 px under the "Now" baseline (142), 36 px above the "Stamp" cap (214); pod ends x 875, 6 px short of the name as a face does.
## T-20261023-295 (b) compare divider
**UI/UX ruling:** confirmed as the ticket's stand-in, both on libPanel (#342c29): y 176 libWell (#1a1514, 1.32:1 against the panel), y 177 libLine (#4a413c, 1.37:1), x 776-1008. Dark over light reads as a groove, the bezel's libLine edge with the band rule's libWell; libHead (1.08:1) is too faint and libGround (1.24:1) is lighter than libWell. The art director confirms at 1x.

## sheet.index (for the copywriter, who decides the words)
**Fit:** yes. Measured with Inter tnum, 12 px, no kerning (+/- 2 px), over all 16 species frames' chapters, room 132: no chapter needs more than 2 lines; the longest, Belatz Coat (6 traits, "Colour · Fluff · Sheen · Feathers · Tufts · Trim", 253.9 px in Regular, 258.0 in Medium), breaks only at " · " into "Colour · Fluff · Sheen" 119.3 and "Feathers · Tufts · Trim" 124.7 (Medium 121.1 and 126.9). The widest single line anywhere is Blikur Movement "Pace · Turning · Weave", 131.2 Regular (0.8 px spare; if it wraps it is still 2 lines) or 127.2 Medium. The art director picks the weight; both fit.
**Proposed row for the copywriter:** `sheet.index | 12 | 132 | {Trait} · {Trait} | Colour · Fluff · Sheen · Feathers · Tufts · Trim | fog, the catalogue trait names as is (as sheet.trait), joined " · ", wraps only at " · ", at most 2 lines; widest line 131.2 (Regular), the longest chapter 2 lines of 119.3 and 124.7`
