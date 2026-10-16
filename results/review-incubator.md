---
ticket: T-20261015-12
status: done
branch: PacoCotera/miniaturebeasts:batch/B-20261016-1
head: bc866c71a237f6dee1d8b606a3bc2758e0c84739
ci: not run (review only)
---
## Verdict
- incubator-empty: **PASS**
- incubator-growing: **FAIL** (one fix)
- incubator-ready: **FAIL** (the same fix)
- incubator-hatch-1100: **FAIL** (the same fix)

Captures: prototypes/face/golden/incubator/{incubator-empty,-growing,-ready,-hatch-1100}.png at bc866c71, whole 1x (1024x600). Beside them I laid golden/home/home-knob-focused.png (Home, same head). Not available to me: the concept board 18c17261 (frame 3), which is not in this repository, and the Pods captures, which I did not open. Check 1 is therefore judged against Home only.

## Measured (from pixels; wall x 71 to 952, bottom seam 548, rail well bottom 88)
Edges are the first and last row or column where the object's lit surface or its drop shade starts or ends. Luminance values are 0.2126R+0.7152G+0.0722B on 0 to 255.

| Measure | Pixels found | Spec | Result |
|---|---|---|---|
| Left margin, left gauge rim | edge at x 88 (luminance 67 to 107 across 87/88): 88 - 71 = **17** | 17 | ok |
| Left margin, riser clamps | clamp edge x 88 (rows 106 and 175): **17**. The risers themselves start at x 94 (22) | 17 | ok (clamps) |
| Right margin, right gauge rim | last lit column 934, shade edge 935: 953 - 936 = **17** | 17 | ok |
| Right margin, right machinery group | last lit column 931, shade edge 935: **17** | 17 | ok |
| Bottom margin | gauge rim last row 529 (luminance drops 73 to 29 at 530): 548 - 530 = **18**; base block ends on the same row | 18 | ok |
| Top, columns from the well | left clamps start y 104, right group y 108: **16** (left), 20 (right group top) | 16 | left ok; right group sits 4 px lower than spec |
| Column edges (lit ink) | left 88 to 216; centre chamber and base 360 to 663 (RM unit 697 to 747); right 794 to 935 | 88-232 / 248-776 / 792-936 | inside the spec columns; edges outer 17 |
| Gutters between column ink | left to centre ink: 216 to 258 = 42; centre to right: 747 to 794 = 47 | 16 between rects | rects not measurable from pixels; ink gaps are larger, none under 16 |
| Base lip top edge | y 463 to 464 (luminance 225 at 464, x 450) | 463 | ok |
| Juvenile's paws (hatch-1100) | paw pad bottom rows y 463 to 464 at x 450 to 520, shadow on the green sill y 448 to 463 | feet row 472 (spec) | see below |

## The juvenile's feet
Zoomed 4x crop at x 400 to 620, y 420 to 490. The paws rest on the dome's lower sill and the front paw's pads touch the base's top edge at y 464. The cast shadow lies on the green sill behind them (448 to 463), and no paw pixel is covered by the lip. It reads as **standing**, not sunk. The fallback numbers (juvenile at (360,152), feet 464) are not needed. The spec's 472 is the sprite's anchor row, and the visible paw bottoms are about 8 px above it.

## The seven gate checks
Columns: empty / growing / ready / hatch-1100.

| # | Check | Evidence |
|---|---|---|
| 1 | References first | Home's Incubator module (sage case, rendered, lit top-left) beside the capture: same family. Concept board 18c17261 and Pods not laid beside it (not available / not opened). yes on Home / yes / yes / yes |
| 2 | Objects as used | chamber with a bud, the egg and the juvenile are shown as living in the dome. yes / yes / yes / yes |
| 3 | One rendered style | The machinery (risers, vents, junction boxes, gauges, hoses, dome, base) reads as the same rendered, lit, shaded style as Home's modules and Pods. **The stamp plate does not**: in growing, ready and hatch-1100 it is a flat grey square (804, 232, 120 x 120) with a code drawn on it, beside rendered objects; spec section 9.4 states it is still the code-drawn flat plate. yes / **no** / **no** / **no** |
| 4 | Grounded | Chamber stands in the base lip with a shadow on the sill, no bare wall (the old 7 px float is gone). Gauges and units are wall-mounted with a drop shade. yes / yes / yes / yes |
| 5 | Margins and grid | 17 / 17 / 18 measured above, mirrored on 512; three columns on the grid. The right machinery group's top sits at 108 against 104 for the left. yes / yes / yes / yes |
| 6 | Purpose at a glance | An incubator with a glowing dome, a leaf arc and a bud. yes / yes / yes / yes |
| 7 | The owner's words | "looks flat": the machinery is no longer flat, except the stamp plate. "issues with margins": closed (17 / 17 / 18). yes / **no** (plate) / **no** / **no** |

The machinery reads as the same rendered style as Home and Pods. The one exception is the stamp plate.

## Fixes (growing, ready, hatch-1100)
1. The stamp plate (804, 232, 120 x 120, luminance flat grey with a code) is a flat code-drawn object next to rendered machinery: gate check 3 and the owner's "looks flat". Needs a rendered plate at the board's depth (spec section 9.4 names the owner: AD or a build ticket). Not a design call for me; I do not specify the art.

## Not judged
Motion, the wipe, hatch beats other than 1100, and the mistake the build reported (fe815662 in public history), which is the lead's.
