# kit_bezel band: the look (UI/UX, 2026-10-23 09:11 Mexico City)

The question is item 3 (1) of the K4 gate, on build/ui-kit 8d651c92 (kit_bezel's band).

## Answer

- **The band's rows: yes, as built.** The band starts on the first row inside the edge (row 1, counted from the edge row), runs h rows in `fill`, and the edge row stays the edge's.
- **The arcs: yes, as built.** Each band row spans only the inside of the outline, so the corner arcs keep their shape. No band pixel replaces an edge pixel, and no body pixel is left in a band row.
- **The rule: yes, as built.** It is one 1 px row in `rule` on row h + 1, directly against the band, clipped to the arc the same way. rule NULL means no rule row, and the body starts on row h + 1.
  - The Library's one written band is the guide's chapter panel: a 2 px band in the tint, inside the edge, then the tint lattice from row 3. That is h 2 with rule NULL.
  - The spec gives the band's rect as `tint.rule [1, 1, -2, 2]`, which is rows 1 to 2 from x 1 to w − 2. On a square panel this is exactly what the band draws.
- **The inset max(r, h + 1 + rule): yes, as built.** It keeps the whole band in the 1:1 part.
- **The bevel over a top band's first row: no.** The alternative is below.

## The alternative: a top band and a bevel are one form or the other

- **The rule.** A top band takes the bevel's row. A bezel with a top band (side 0, h > 0) has no bevel line.
  - kit_bezel refuses a call with a top band and bevel not NULL. It calls `v_error("kit_bezel: a top band takes the bevel's row; pass bevel NULL")` and makes no node, the way its other refusals do.
  - The check goes with the band's other checks, before the source is made.
  - A Library site that wants the device's lit lip uses no top band. A site that wants a top band passes bevel NULL.
- **The bevel does not move under the band.** The first body row, h + 1 + rule, is not used for it either. There it would read as a second, pale rule under the band or its rule: a separator in the bevel's colour, and the bevel is the panel's light, not a separator.
- **A bottom band is unchanged.** The bevel stays where it is: x + r, y + 1, w − 2r long, on the first row inside the top edge.
  - One edge case is refused the same way. When the bevel's row would be a band or rule row (only possible at r 1, with h < bi + 2), kit_bezel calls `v_error("kit_bezel: the bevel's row must be a body row")`.
- **No other change.** The source, the insets, the node ids and h 0 = no band all stay as they are. No screen wires a band, so the goldens are unchanged.
- **face_test:**
  - a top band with a bevel makes no node;
  - a bottom band with a bevel keeps `<id>.bevel` at (x + r, y + 1, w − 2r, 1);
  - the r 1 case is refused.

## What I measured (1x, the framebuffer)

I rendered the bezels through the native face (LVGL) on a private worktree at 8d651c92 with a private build directory. I read the framebuffer pixel by pixel at the left corner, the centre and the right corner, using the Station palette's values.

- **r 8, panel / hairline, a top band of h 2 in teal, no rule, with the bevel (the as-built answer).**
  - Row 1: teal at x 5 to 7, bevel from x 8 to w − 9, then teal again at w − 8 to w − 6.
  - Row 2: teal.
  - The 2 px band reads as 1 px of teal under a grey line, with 3 px teal ears at each end where the bevel stops at the arc.
  - The same bezel with bevel NULL shows rows 1 and 2 teal end to end, following the arc (row 1 from x 5, row 2 from x 4). That is the band.
- **r 8, a top band of h 10 in teal with a void rule.** With the bevel, row 1 is grey over teal with the same ears. With bevel NULL, rows 1 to 10 are teal following the arc, row 11 is void from x 1 to w − 2, and the body starts at row 12.
- **r 8, a top band of h 3 with a rule.** The rule is on row 4, inside the arc (from x 2), and the body starts at row 5.
- **r 8, a bottom band of h 6 with a void rule, with the bevel.**
  - The bevel is on row 1, unchanged against the plain bezel.
  - The band is on rows 53 to 58 of 60, following the arc, and the rule is on row 52.
  - The edge row 59 is hairline.
- **r 1, paper / clay, a top band of h 2 in teal, no rule (the guide panel's form).**
  - Row 0 is clay.
  - Rows 1 and 2 are teal from x 1 to x w − 2.
  - Paper starts on row 3.
  - This matches the guide panel's band rect and its lattice start (y 3).
- **r 4, the same band.** Row 1 is teal from x 2 and row 2 from x 1. The arc holds.
- **A plain bezel with no band (the Home form)** is unchanged: row 1 is fill at x 5 to 7, then the bevel.

The worktree, the build directory and the render harness are removed. The clone is unchanged.
