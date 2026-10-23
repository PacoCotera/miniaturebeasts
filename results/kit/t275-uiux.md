# T-275 UI/UX check (Fri Oct 23 05:05 CST 2026 Mexico City), 9eb9d101

**Verdict: PASS.** No fixes are needed. The build does what the ruling (pods-heading-ruling.md, 03:11) asked for, and nothing more in layout.

## What was measured (1x, 1024×600 RGBA, no scaling)

- **Code.** page.c word_page now uses `v_cap_in(ry + H1, 24, 20)`. The `+ 1` and the "one pixel below its middle" comment line are gone. `v_cap_in` = top + floor((24 − 14) / 2) = top + 5. No spec keys were added, and the only line that changed is the word's y.
- **The four goldens, old vs new.** The scratchpad old/ and new/ PNGs are byte-identical to the goldens at 4e4057b1 and at 9eb9d101.
  - The word's ink is at y 196–209 in the old images and y 195–208 in the new, on all four. Its x (417–460, 417–518 or 417–511 by word) did not change.
  - The emblem box is 190–213, so the new word has **5 rows above (190–194) and 5 below (209–213)** on all four.
  - The emblem ink is unchanged: 192–212 (Coat, read and unread), 193–208 (Movement) and 192–211 (Character).
  - Changed pixels: 283 / 283 / 505 / 525, all inside x 417–518, y 195–209, and **0 changed pixels outside that box**.
  - The glyphs themselves are the old ones moved up 1 px. On solid-ink pixels the old image shifted up 1 px differs from the new by at most 2 (out of 255). The remaining differences, up to 13, are the paper texture under the anti-aliased edges (426 colours in the background; adjacent rows differ by up to 21).
  - The word's bottom now clears the rule at y 220 by 11 px (it was 10).
- **The two-row case and every chapter page, from my own draw.** I used a temporary worktree at 9eb9d101 in the scratchpad and built the face (wasm and native) there. I drew every species S01–S16 and every chapter: 94 pages, 5 of them two-row (S02 Coat, S07 Coat, S09 Coat, Face, Shape).
  - The emblem rect is (384, 190, 24, 24) on one-row pages and (384, 94, 24, 24) on two-row pages. The word label's rect top is always the box top − 2, so the cap top is at the box top + 5.
  - Measured from the pixels of the first capital: **89 pages at 195–208 in the 190–213 box, and 5 pages at 99–112 in the 94–117 box, all 5 above / 5 below.** Where the whole word's ink reaches 194, 212 or 116, that comes from the glyphs themselves (the i dot and t in "Stamina", the descender of p in "Shape" and "Charge", "Legs & Tail"), not from where the word sits.
- **The two-row case: nothing else moved.** I built 4e4057b1 in the same worktree and diffed the full framebuffers of seven scenes (S02 c0, S07 c0, S09 c0–2, S01 c0, S03 c3) against 9eb9d101.
  - Every change lies inside the word's box: x 417–474, y 99–117 on two-row pages, and x 417–517, y 194–213 on one-row pages.
  - The emblem, the rule, the cells and the frame are unchanged.
- **Checks run** (local, free):
  - The native build's face_test: 14760 checks, 0 failed. Layout: 386 cases, 0 differ.
  - `node --test` on pods-page.test.mjs and pods-words.test.mjs: 36 passed, 0 failed. The new heading check passes, and it would fail on the parent, whose cap top is at box + 6.
  - `goldens.mjs --check pods`: the goldens match, including chapter page 4bccd9e1, a doing 2c008f0a and sealed 699813fb.
- **Cleanup.** The worktree is removed and pruned. The clone is unchanged: still 9eb9d101, with a clean working tree.

## Notes (no change asked)

- The seven hash updates in pods-words.json (the lead's decision) leave every rect in those vectors as it was. The pods-words test passes with them. Their substance is outside my remit.
- Ruling point 4 is still open. The next Station journey run should rewrite page-read, pods-belatz-face, pods-belatz-legs-tail, pods-eight-chapters, pods-sealed and pods-six-traits, with the cap top at box top + 5. That cannot be checked from this build.
- The new test gets the cap top as label top + a hard-coded 7 (LABEL_ABOVE_CAP) and tells two-row pages by `cells.length > 4`. Both hold on this build. If either the label inset or the grid rule changes, the test will need updating with it.
