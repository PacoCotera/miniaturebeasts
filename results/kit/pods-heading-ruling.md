# Pods chapter heading: the 1 px drop (UI/UX, Fri Oct 23 03:11 CST 2026 Mexico City)

**Ruling: No, the drop is not intended. Centre the word.** The drop is a rounding slip from the first centring pass. No spec or art reason for it exists, and centring sits on the art at least as well as the drop does.

## What was measured (1x, Pods face goldens at build/ui-kit d2dbfd99)

Heading box, one row: emblem rect (384, 190, 24, 24), word x 416. The hairline rule is at y 220 and the cell wells start at y 228.

| Golden | Emblem ink rows | Emblem ink centre | Word ink rows (cap 14) | Word cap centre |
|---|---|---|---|---|
| pods-chapter-page.png (Coat, read) | 192–212 | 202.5 | 196–209 | 203 |
| pods-chapter-page-unread.png (Coat, unread) | 192–212 | 202.5 | 196–209 | 203 |
| pods-chapter-page-a-doing.png (Movement) | 193–208 | 201 | 196–209 | 203 |
| pods-chapter-page-sealed.png (Character, sealed) | 192–211 | 202 | 196–209 | 203 |

Centres are pixel-edge coordinates. The box centre is 202. The word's cap top is 6 px below the box top, which leaves 6 px above the caps and 4 below. Centred, it would be 5 and 5.

- **Against the art:** the four emblems' ink centres range from 201 to 202.5. They differ per chapter, so a fixed drop cannot be an optical match. With the drop, the caps sit 0.5–2 px below the art. Centred (cap centre 202), they are 0–1 px off, and exactly on the Character emblem.
- **Two-row pages** (Station journey screenshot pods-six-traits.png): the box top is 94 (headingTwo y −2) and the cap top is 100, the same +6. The other journey screenshots that show the heading (page-read, pods-belatz-face, pods-belatz-legs-tail, pods-eight-chapters, pods-sealed) all put the cap top at box top + 6.
- **Other words in boxes on the face:** the rail tab word, ribbon, plates, specimen name and ribbon, the cargo band and place names all use plain `v_cap_in(top, h, px)`. None adds an offset. In the old drawing layer, the commit that introduced this heading's offset was titled "The page heading and the name lines centred in their boxes". It centred the name lines with floor((line − cap) / 2) and the heading with ceil((24 − cap + 1) / 2). When 24 − cap is even (14 at 20 px gives 10), the ceil formula lands 1 px low. The C port kept those pixels as (24 − v_cap(20) + 2) / 2, and K3.2 kept them again with "+ 1" on the box top. The design was centring all along.
- **Spec:** station-layouts.md, Pods §5 page heading: "Emblem 24×24, then the chapter's word in 20 px `bone`, 8 px after it", in the heading box (…, 24). It asks for no offset, and pods.json `regions.chapter.page.heading` / `headingTwo` hold only the box origin.

## The consequence (UI/UX ticket)

1. `prototypes/face/src/vocab/station/page.c`, word_page: the word's cap top becomes `v_cap_in(ry + H1, 24, 20)`, so the `+ 1` goes. Delete the comment line "the word sits in the 24 px box of the emblem, one pixel below its middle…". Nothing moves into the spec, and no new keys are added.
2. Resulting rows: one-row page cap top **195** (was 196), ink 195–208. Two-row page cap top **99** (was 100), ink 99–112. Only the word moves, by 1 px up. Its x (416), the emblem (384, 190 / 94), the rule (y 220 / 124) and the cells are unchanged. The word's bottom then clears the rule by 11 px (was 10).
3. Retake these Pods face goldens and their hashes in `prototypes/face/golden/pods/pods.json`: "chapter page" (pods-chapter-page.png), "chapter page, unread" (pods-chapter-page-unread.png), "chapter page, a doing" (pods-chapter-page-a-doing.png) and "chapter page, sealed" (pods-chapter-page-sealed.png). No other golden changes. Compare's heading is the pod, not the word, and nothing else calls the page word.
4. The next Station journey run rewrites the screenshots that show the heading: page-read, pods-belatz-face, pods-belatz-legs-tail, pods-eight-chapters, pods-sealed and pods-six-traits. Each should show the cap top at box top + 5.
5. No test pins the word's row today. The ticket should add one check: in both the one-row and two-row cases, the heading word's cap top equals `v_cap_in(heading box top, 24, 20)`.

Out of scope, noted only: the bar title uses the same construction (a 24×24 mark, then a 20 px word in a 24 px box at x + 32) but puts its cap top at box top + 2 (y 10 in an 8–32 box). That is a frame rule ("zone 8 + 2"), not a centring site, and this ruling does not change it.
