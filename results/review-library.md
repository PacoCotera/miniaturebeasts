---
ticket: T-20261015-11
status: done
branch: PacoCotera/miniaturebeasts:batch/B-20261016-1
head: 19054cead7901a00ed382995866e78f6b20723f9
ci: not run (review only)
---
## Verdict
- library-spread (a9d5aa61): **PASS**
- library-spread-empty (6ce72361): **PASS**
- library-spread-complete (f620bf04): **PASS**

Captures: prototypes/face/golden/library/{library-spread,library-spread-empty,library-spread-complete}.png at 19054cea, judged whole at 1x (1024x600). library-book-shut was not named by the ticket and was not judged. Reference for the painted language: golden/home/home-knob-focused.png at the same head.

One finding for the CD (the ring, section 3). It is not a fail.

## The five findings of the 19:17 verdict
| # | Finding | Observation or measurement | Result |
|---|---|---|---|
| 1 | Creatures are pixel tokens | Found frames show painted, lit creatures in plates (Loika, Untuva, Tuikis, Belatz), the same rendering as Home's creatures. Met frame Hiljan shows a line study. No pixel tokens. | closed |
| 2 | Focus is a red rectangle | Focus is the cased ring: void (12,10,18), cream (255,230,173), void. No saturated red pixel (r>180, g<60, b<60) in the spread capture at all. The only red is the cloth ribbon, which is not a ring. | closed |
| 3 | "Its Book is not open yet" shut door | No message text and no plate in any of the three captures. The bottom line shows only the subject (Tuikis / an empty frame / Belatz). | closed |
| 4 | Flat clip-art, not painted language | Painted open book on leather, paper grain, cloth ribbon, bevelled frames with drop shade, rendered plates. Same material language as the accepted Home. | closed |
| 5 | Marks under 12 px | Ink boxes measured on S01: roundel 16 rows (y 89 to 104), seeds 12 rows (y 262 to 273). Gilt and seal are 16 px by the spec. | closed |

## The seven gate checks (spread / empty spread)
| # | Check | Spread | Empty |
|---|---|---|---|
| 1 | References first | yes. Laid beside Home (ring colours identical, paper plate language consistent). No Library-specific owner reference was named by the ticket. | yes |
| 2 | Objects as used | yes. Frames hold plates and studies as a collection book does. | yes |
| 3 | One rendered style | yes. Plates, frames and ribbon share one painted style. | yes |
| 4 | Grounded | yes. Frames have bevel and drop shade on the page. Creatures have contact shadow in the plate (Tuikis, Belatz). | yes |
| 5 | Margins and grid | yes on the grid and the horizontal margins: frames at 24 px from the page edge on both pages (48 against page 24; 976 against page 1000); 112 px pitch across, 184 px pitch down. Observation: vertical room is uneven by the spec's layout: 33 px from page top (56) to the roundel row (89), about 86 px from the second row's seeds (458) to page bottom (544). Book pages read this way, but the CD may rule otherwise. | same |
| 6 | Purpose at a glance | yes. It reads as a creature collection book. | yes. Empty frames read as a book waiting to be filled. |
| 7 | Owner's words | yes on the points above. No owner line was named for the Library by the ticket. | yes |

## 3. The ring on paper (pixel samples)
Sampled across one edge, inside to outside, on the focused frame. Spread: S03 (frame x 272, y 112, row y 168). Contrast is against the paper pixel just outside.

| Offset from frame | x | Pixel | Contrast vs paper |
|---|---|---|---|
| -7 | 265 | (245,234,206) | paper |
| -6 | 266 | (244,233,205) | paper |
| -5 | 267 | (12,10,18) | outer void key, about 16:1 |
| -4 | 268 | (255,230,173) | cream core |
| -3 | 269 | (255,230,173) | cream core |
| -2 | 270 | (12,10,18) | inner void key, about 16:1 |
| -1 | 271 | (246,235,207) | gap of paper |
| 0 | 272 | (159,129,100) | frame edge |

The same five values in the same order at the top edge (y 107 to 110) and at the bottom edge (y 225 to 228). Empty (S01, x 43 to 47) and complete (S09, x 539 to 543) match to within paper grain, with void at -5 and -2 and cream at -4 and -3.

- **Both void lines are visible at 1x:** yes. Each is 1 px at 12:1 to 16.6:1.
- **The cream body is visible:** it is present at the right value, but it is not distinguishable from paper by luminance. Core (255,230,173) against paper (244 to 248, 233 to 236, 204 to 210) is 1.0:1 to 1.3:1.
- **Finding (watch point 3):** at 1x the ring reads as **two dark hairlines 3 px apart with a pale band between**, not as a cream body between two dark lines. The cream core reads as a gap on paper. The ring is clearly visible, so the focus is unmistakable, and fix 14's contrast floor holds on the void lines (each 2 px of the cross-section at 3:1 or more is met by 2 void px, one on each side). The CD should judge whether a double hairline is the fix 14 form. I do not recommend the rust ring.

## Fixes
None required. The finding above is the CD's to rule on.

## Not judged
Behaviour (focus move, lift animation, presses) and library-book-shut.
