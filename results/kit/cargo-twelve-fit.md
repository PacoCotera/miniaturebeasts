# Cargo counts to twelve: the fit (UI/UX, Fri Oct 23 17:42 CST 2026 Mexico City)

## Ruling
- **It fits, with no fallback.** Every count from seven to twelve, and "many", fits the bottom line's subject slot at 16 px with no ellipsis and no extra word. Nothing in layout changes.

## The room
- Both strings fill the frame's bottom-line subject: `frame.line.subject`, drawn by frame.c word_bottomLine.
  - In the bay, opening and end states, the waiting line goes there (cargo.json line, cargo-props.mjs `wait`).
  - In the arrival's show phase, the crates line goes there (`line.subject` in cargo-props.mjs).
  - Cargo has no slot of its own for these strings.
- The slot is frame.json `regions.subject`: rect (408, 570, 208, 24), centred on 512, 16 px, at most 6 words, and `shrinks` (it is clipped with an ellipsis past 208 by v_clip). The separators stand at x 404 and 620.

## How it was measured
- The widths are the committed 16 px Inter (prototypes/face/src/fonts/face_inter_16.c at 3fe61bde), summed per glyph as LVGL 9.6 sums them in lv_text_get_width: round((adv_w + kern) / 16), with the file's 244 kern pairs.
- As a check, the sum matches all 4,045 plain-text 16 px cases in tests/vectors/metrics.json. The only 47 that differ hold ✓ − × ←, which this script does not look up, and the Cargo strings contain none of them.
- Pixel check at 1x: the goldens cargo-bay-waiting.png ("two pods…") and cargo-bay-waiting-many.png ("five pods…") both sum to 178 px. Their ink runs from x 423 to 599 on rows 572–586. That is the predicted start of 512 − (178 + 1) / 2 = 423, so the sum and the drawn pixels agree.

## Widths (16 px; slot 208, 6 words)
| line | px | words | spare | drawn x (start–end) |
|---|---|---|---|---|
| eleven pods wait for a well | 199 | 6 | 9 | 412–611 |
| twelve pods wait for a well | 199 | 6 | 9 | 412–611 |
| seven pods wait for a well | 194 | 6 | 14 | 415–609 |
| many pods wait for a well | 191 | 6 | 17 | 416–607 |
| eight pods wait for a well | 187 | 6 | 21 | 418–605 |
| nine pods wait for a well | 181 | 6 | 27 | 421–602 |
| ten pods wait for a well | 173 | 6 | 35 | 425–598 |
| eleven sealed crates | 152 | 3 | 56 | 436–588 |
| twelve sealed crates | 152 | 3 | 56 | 436–588 |
| seven sealed crates | 147 | 3 | 61 | 438–585 |
| many sealed crates | 144 | 3 | 64 | 440–584 |
| eight sealed crates | 140 | 3 | 68 | 442–582 |
| nine sealed crates | 134 | 3 | 74 | 445–579 |
| ten sealed crates | 126 | 3 | 82 | 449–575 |

- The widest line is 199 px, for both eleven and twelve. Centred, it runs from x 412 to 611: 4 px inside the slot on the left and 5 px on the right, and 8 px and 9 px clear of the separators. The 6-word cap is met exactly, and "many" is no longer.
- The neighbours are unaffected. The action slot ends at 392 and the need slot starts at 624, so a long subject never meets the notice in the bay state.

## Fallback
- None is needed. If a count word ever grows past 208 px, the frame's own rule already applies: v_clip ends the subject with an ellipsis at the slot's edge. Cargo should not add a fallback of its own.
