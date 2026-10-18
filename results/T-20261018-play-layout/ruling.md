# The play page: layout ruling (UI/UX)

This is for the build ticket after T-236, on `prototypes/play/` (`index.html`, `src/shell.mjs`).

**The owner's direction (15:37):**
1. Stack the Companion under the Station; the two need not share a row.
2. The page runs in a browser, so the on-screen buttons and the D-pad must be bigger.

**Units:**
- The faces keep the pixel rule unchanged. One lp is `f = k / devicePixelRatio` CSS px, with `k = max(1, floor(dpr))`. The Station is 1024 × 600 lp and the Companion 450 × 600 lp, never scaled at runtime, and there is no 2× face (neither 2048 × 1200 nor a stacked 2× pair fits any of the four sizes).
- **The page chrome (keys, bar, controls) is sized in CSS px** and snapped to whole physical pixels. A key must be big enough for a finger and a mouse whatever the dpr, and an lp shrinks to 0.57 CSS px at a dpr of 1.75.

## 1. Arrangement

| Layout | When (CSS px window) | Arrangement |
| --- | --- | --- |
| **Stack** | 1064 ≤ W < 1878, any H; or W ≥ 1878 with H < 800 | **The Station on top, the Companion under it**, both centred on the page's axis. The page scrolls vertically when the column is taller than the window |
| **Row** | W ≥ 1878 and H ≥ 800 | the Station and the Companion side by side, as today's wide tier (the bench shelf is gone with T-236) |
| **Narrow** | W < 1064 | unchanged: one device at a time, the one with the keys |

**Why the row stays at the wide sizes:** the dock moments play on both devices at once (the arrival on the Station, "home" on the Companion). Where both fit whole, seeing both is better than stacking one below the fold. The owner's "need not share a row" allows both. *If the owner means always stacked, set the Row threshold to never; nothing else changes.*

**The four sizes at dpr 1:**

| Window | Layout | Column / row width | Fits without scrolling? |
| --- | --- | --- | --- |
| 1280 × 720 | Stack | 1040 (the Station shell); the Companion shell 466, centred | no: it scrolls, about 1,830 tall |
| 1440 × 900 | Stack | 1040; 466, centred | no: it scrolls. This is the size where the Companion was cut off at the right; now it sits whole below |
| 1920 × 1080 | Row | 1040 + 24 + 466 = 1530, centred | yes |
| 2560 × 1440 | Row | 1530, centred | yes |

**The shells and frames:**
- The shells keep their 8 lp border round each face; the key row sits under each face (§2).
- **Gaps:** 24 CSS px between the two shells (vertical in Stack, horizontal in Row), and 16 from the bar.
- **Positions** are snapped to whole physical pixels by `place` as now. The x of a centred column is ⌊(W − w) / 2⌋.
- The short tier, its in-bar keys and its band are retired: Stack plus scrolling replaces them.

## 2. Keys and the D-pad (minimum targets, in CSS px)

| Key | Size | Notes |
| --- | --- | --- |
| D-pad: ◀ ▲ ▼ ▶ | **56 × 56** each, 4 apart, in a row (236 wide) | was 44 × 40 |
| Room keys (Home, Vivarium, Research, Library) | **56 × 56**, 8 apart (248 wide) | was 40 × 40 |
| ← Back, and Call on the Companion | **56 × 56** | was 28 × 28, too small for a finger |
| ✓ Confirm | **64 × 64** | the main key, the biggest |
| Bar controls (tabs, Dock, Keys ?, Tools) | **40 tall**, tabs at least 120 wide, Dock at least 168 wide | was 32 tall |

**The key row** is 72 CSS px tall (64 plus 4 above and below), under each face.

- **Station row** (1024 lp wide): the D-pad at the left (x 8), the rooms centred, then ← and ✓ at the right (✓'s right edge 8 in).
- **Companion row** (450 lp wide): the D-pad (236), 16, Call (56), 8, ← (56), 8, ✓ (64), which is 444 and fits inside 450.
- **At dpr above 1,** a row whose keys don't fit the face's CSS width shrinks only its gaps, never a key below the sizes above.
- The glyphs scale with the key: arrows 20, marks 28, ✓ 24.

## 3. The Caddy and the Dock

- **The Dock control** stays in the bar at the right, and **the bar stays fixed at the top** while the page scrolls, so Dock and Lift are always one click away.
- **The cradle** stays under the Companion's shell (466 × 28 lp, the lamp at its left), in both Stack and Row. The seat still lowers the shell 8 lp.
- **The Caddy's screen** (792 × 272 lp) is no longer a rising sheet. With the bench gone it has a place of its own:
  - **Stack:** under the cradle, centred on the column (792 fits in the 1040 column).
  - **Row:** under the row, its right edge aligned with the Companion shell's right edge.
  - **Both:** it is always shown, because it is e-paper and keeps its last lines. It redraws only when its lines change, exactly as now, and Shift+C is retired. The bar's one-line note remains only in Narrow.

## 4. Under 900 tall: scroll, not tabs

- **Under 900 px tall the page scrolls** (Stack's column is taller than the window). The tabs stay what they are today: they give a device the keys. They don't page between devices.
- **When a device takes the keys** (a tab, `` ` ``, a click on its shell, or the Dock's contact beat), the page scrolls it fully into view, its key row included, with a 160 ms eased scroll, or a cut under reduced motion. A device already wholly in view doesn't move the page.
- **A dock seen from the Companion side:** after the contact beat the Station takes the keys (as now), so the page scrolls up to it. The arrival is seen.
- **Under 672 tall:** the same rule. A key row that is partly out of view is scrolled into view when its device takes the keys.

## 5. Checks for the builder

- **Captures at 1280 × 720, 1440 × 900, 1920 × 1080 and 2560 × 1440** (dpr 1), and at 1440 × 900 with dpr 1.25 and 1.75. Both faces stay on whole device pixels in every capture.
- **Every key's CSS box measures at least the sizes in §2** at every dpr tested.
- **The journey:** the dock round trip in Stack with the page scrolled to the Companion. After the contact beat the Station is wholly in view.
- **The Companion is never cut** at any of the four sizes.
