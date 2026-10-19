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

## 6. Addendum (2026-10-18 19:02): the builder's blocker and five gaps (T-240)

### 6.1 The key rows at dpr above 1: they wrap to two rows, never shrink a key, never widen the shell

- **The tray:**
  - Each device's keys sit in a **key tray** joined to the bottom of its shell: no gap, the same width as the shell (1040 or 466 lp, in CSS px at the current dpr), and the shell's border colour.
  - The tray is 72 CSS px tall per row of keys (each key 4 from the row's top), so 72 or 144.
  - The tray's width is the only width the keys may use. The shell never widens, and a row never overflows (except in the fallback below).
- **Groups** (CSS px, keys as in §2):

  | Device | Groups, in order |
  | --- | --- |
  | Station | **P**, the D-pad: 4 × 56, 4 apart, 236 wide. **R**, the rooms: 4 × 56, 8 apart, 248 wide. **A**: ← 56, 8, ✓ 64, 128 wide |
  | Companion | **P** (236). **A**: Call 56, 8, ← 56, 8, ✓ 64, 192 wide |

- **The gaps that may shrink:** between groups g = 16, down to 8; the side margin m = 8, down to 4. Gaps inside a group never shrink, and neither do keys.
- **The steps:**
  1. **One row** if all the groups fit at full g and m. Otherwise, try again with g and m at their minimums.
  2. **Two rows** if one row still doesn't fit:
     - Station: row 1 is P at the left and R at the right; row 2 is A, right-aligned.
     - Companion: row 1 is P, centred; row 2 is A, centred.
     - In each row, g and m shrink the same way.
- **What that gives** (the shell width in CSS px):

  | dpr | Station shell | Station rows | Companion shell | Companion rows |
  | --- | --- | --- | --- | --- |
  | 1, 2, 3 | 1040 | 1 (660 of 1040) | 466 | 1 (460 of 466) |
  | 1.25, 2.5 | 832 | 1 | 373 | 2 (252 and 208) |
  | 1.5 | 693 | 1 (660) | 311 | 2 |
  | 1.75 | 594 | **2** (516 and 144) | 266 | 2 (252 and 208) |
  | 2.25 | 924 | 1 | 414 | 2 |

  - Two rows also keep the D-pad all together, where a thumb expects it.
- **The fallback** (a dpr just under an integer, such as 1.95, where the Companion shell is 239): a row that still doesn't fit overflows its tray equally on both sides, centred, and never shrinks a key. The check in §5 runs at 1.25 and 1.75, which both fit.
- **Captures:** add 1440 × 900 at dpr 1.75 in Stack, showing two-row trays on both devices.

### 6.2 Shell height, and the Stack height

- **The shell** is the face plus its 8 lp border all round: 1040 × 616 lp and 466 × 616 lp. **The key tray is below the border, not inside it** (6.1).
- **A device block** = shell + tray: at dpr 1, 616 + 72 = **688**. The Companion adds the cradle (28 lp) under its tray, and the seat still lowers the shell 8 lp.
- **Stack height** = bar 40 + 16 + Station block + 24 + Companion block + cradle + 24 + Caddy block (6.3) + 16 bottom padding. **At dpr 1: 40 + 16 + 688 + 24 + 688 + 28 + 24 + 288 + 16 = 1,812.** This replaces "about 1,830" in §1.

### 6.3 The Caddy block, its gap and its place in Row

- **The block** is the 792 × 272 lp screen plus an 8 lp bezel: **808 × 288 lp**, aligned by its outer edge.
- **Stack:** the block sits **24** under the cradle, centred on the column.
- **Row: this changes §3.** The block sits **under the Station**, 24 below its tray, and its right edge is aligned with the Station shell's right edge, beside the Companion's cradle. The Companion column (688 + 28) is the taller one, so the Caddy under the Station is what lets the page fit.
  - At 1920 × 1080: 40 + 16 + 688 + 24 + 288 + 16 = **1,072**, which fits in 1,080. Under the Companion it would have been about 1,100, and cut off.
- **Row's threshold stays H ≥ 800.** Both devices and their keys fit whole from 772 up. Between 800 and 1,071 the Caddy may sit below the fold and the page scrolls to it. It is e-paper and keeps its last lines, so nothing is lost.

### 6.4 Units of the thresholds

- **All the thresholds (1064, 1878, 800) are CSS px:** `innerWidth` and `innerHeight`, after the bar. They are never lp.
- 1440 × 900 is Stack at every dpr. The shells shrink in CSS px as the dpr rises, but the thresholds don't move, so a high-dpr window simply has more room around the column.

### 6.5 The Station row's side margin

- It is **8 CSS px, shrinking to 4**, by the 6.1 rule. At 1.75 the Station wraps, so the one-row 585-of-594 case does not arise.
