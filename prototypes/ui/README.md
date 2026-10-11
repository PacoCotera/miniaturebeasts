# Tier 2 test harness

Tools for judging whole-body blends (the tier 2 method, `boards/mibi-motion/tier2-method.md`). They read masters and field maps from paths and write to `--out`; nothing is placed in the Station and nothing is drawn. The warp only moves existing pixels (backward mapping, nearest sample, no blending); a pixel the field points outside the picture is transparent.

## `tools/warp-field.mjs`: landmarks to fields

```
node prototypes/ui/tools/warp-field.mjs --landmarks s04.json --size 104x112 --out dir [--picture name] [--head-mask png] [--shadow-rows y0-y1] [--belly-y N] [--amplitude k]
```

- Input: the animator's landmarks JSON (`pictures.<name>.fixed` points at displacement 0, `moving` points with their end displacement per end, `fieldZeroRows`). Placed once at 304x312; scaled to other sizes by the size ratio and rounded, unless the file gives a picture at that size (the nap at 96x88).
- Thin-plate spline through every fixed and moving point. The first zero row is also pinned at 0 across the picture, so the spline settles before it. Rounded to whole px. 0 on the field-zero rows, inside `--head-mask` (any pixel with alpha > 0), and, with `--belly-y`, a leg below the belly row takes its root's displacement.
- Refused, with a message: |d| over 4 / 6 / 12 / 3 px at 104x112 / 144x152 / 304x312 / 96x88; gradient over 0.25 px per px (measured on the unrounded field, between neighbouring pixels); a size with no bound.
- Output: `field-<blend>-<end>-<WxH>.png`, RGB, R = dx + 128, G = dy + 128, B = 0. dx, dy move the content at t = 1; the bake samples `composite(x − t·dx, y − t·dy)`.
- `--amplitude k` scales every end displacement: a synthetic field for a dry run.

## `tools/tier2-test.mjs`: the matrix and its measures

```
node prototypes/ui/tools/tier2-test.mjs --out dir \
  --set s04-104x112 --stand stand.png [--painted-down d.png --painted-up u.png] (--field-down f.png --field-up g.png | --landmarks lm.json) \
  [--b1 b1.png --b2 b2.png] [--band y0-y1] [--pair label=a.png,b.png] [--head-mask m.png] [--shadow-rows y0-y1] [--belly-y N]
  [--set ... one per size] [--holds 700,350,700] [--phase-ms 1050] [--seconds 10] [--bg D6CEBE]
```

Writes per set the 1x PNGs (painted down, warped down, stand, warped up, painted up, the two fields), a contact sheet per set and one for all, `measures.csv`, and `vivarium-pair-<size>.apng`: two copies of the stand, the down end and the up end, breathing b0 b1 b2 b1 out of phase for 10 s at 1x on #D6CEBE (the awake pair; judge it at 104x112). The holds, the cycle order and the phase are placeholders until the animator rules; the CSV prints the values used.

Opaque means alpha > 110.

| # | Measure | Pass |
| --- | --- | --- |
| M1 | the whole render run twice | same bytes (PNGs, maps, APNG; the CSV holds a clock reading) |
| M2 | colours (alpha > 0) of a warped output that are not in the stand | 0 |
| M3 | opaque 8-connected components; transparent 4-connected regions that never reach the border (holes); opaque pixels with no opaque 8-neighbour (orphans) | 1, 0, 0; also printed: not above the stand's |
| M4 | outline pixels (opaque, with a 4-neighbour transparent or outside) whose count of outline 4-neighbours is not 2 | ≤ stand's + 5 % |
| M5 | silhouette IoU against the painted end; mean abs difference of the topline profile (highest opaque row per column, columns where both have one) | 304x312: ≥ 0.95, ≤ 2 px; 104x112: ≥ 0.93, ≤ 1 px |
| M6 | at 104x112, pairwise mean profile difference of the three bins (warped; painted when both ends are given) | ≥ 2 px |
| M7 | median warp time of one picture on this machine | ≤ 5 ms at 104x112 (confirm on the CI runner) |
| M8 | per pair (`--pair`, or `--b1` for stand/b1): changed pixels outside rows `--band`, without and with the warp | with ≤ without |

`tools/samples/` holds the dry run on the signed S04 stand with the animator's provisional topline landmarks at amplitude 0.7 (the landmarks at 1.0 are refused: gradient 0.32 at 304x312). It is not a verdict.
