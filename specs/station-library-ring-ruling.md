# The Library focus ring on paper, and the spread's vertical margins: ruling

Creative director, ticket T-20261016-15. Written 2026-10-16 (America/Mexico_City). It rules the finding in results/review-library.md §3 (the ring on paper) and the observation in its check 5 (the vertical margins). Read at batch/B-20261016-1 19054cea: `prototypes/face/golden/library/library-spread.png`, `-empty`, `-complete`, with `golden/home/home-knob-focused.png` as the reference.

## 1. The ring on paper: (a) accepted as the fix 14 form

**Ruled: the double hairline on paper is the fix 14 form. Nothing changes.**

The cased ring is one cross-section on every ground: void (12,10,18) 1 px, cream (255,230,173) 2 px, void 1 px. It is cased so that it works on both kinds of ground:
- **On dark ground,** the cream carries it and the voids nearly vanish. On Home's knob (`home-knob-focused`, x 640, y 539–542 and 551–554), the ground is (25,16,14) and (29,35,43). There the ring reads as a cream band with a dark edge.
- **On light ground,** the voids carry it and the cream falls back to the ground's value. On the Library's paper (244–248, 233–236, 204–210), the voids are 12:1 to 16.6:1 and the cream is 1.0 to 1.3:1. There the ring reads as two dark hairlines with a warm band between.

These are the same pixels in the same order, so it is the same mark. Which band leads depends on the ground, and that is the point of a cased ring. It is not a defect.

The ring is also not confused with anything on the spread. The frames' own edges are a mid brown (159,129,100), and no frame edge or rule on the pages is near black. At 1× the focused frame is found at a glance in all three captures. Fix 14's floor holds on the void lines (2 px at 3:1 or more in every cross-section, measured by the review).

**Why not (b).** Any change on paper means a second form: a darker or saturated core, a wider band, or keys in another colour. A ground-specific ring is exactly what the Library spec removed. The rust core on `"ground": "paper"` was the "red rectangle" of the 19:17 verdict. One form everywhere is worth more than a cream band that shows on paper.

**One sentence superseded.** `specs/station-library-spec.md` §1 says "the cream core reads as the ring's body between two dark lines, the same mark as on Home and Pods". On paper that is not what is seen. Read it as: "the same cased ring as on Home and Pods; on paper its two dark keys carry it and the cream core reads as a warm band between them (CD ruling, specs/station-library-ring-ruling.md)". UI/UX may make that text edit with its next Library spec touch. It changes no number, test or golden.

## 2. The vertical margins: accepted

**Ruled: accept the layout as built.** It has 33 px from the page top (56) to row 1's roundel (89), and 86 px from row 2's seeds (458) to the page bottom (544).

- The 86 px is not leftover space:
  - the band 464–536 on each page is the stage's margin life (`specs/station-library-spec.md` §3, 40,464 448×72 and 536,464 400×72);
  - the grid ends 6 px above it, as the spec measures.
- The frames' block therefore sits between the page top and the margin life with 33 above it and 6 below. Within the pages, a bottom margin larger than the top is the book convention, and it reads as a book.
- Moving the rows down would push the seeds into the margin life. It would also move all 16 frame rects, their ring and core boxes, the roundels and the goldens, for no gain in reading.

**Watch point for the art, not the layout:** in these three captures, the margin life reads as bare paper. If it is still bare when the Library is judged whole at the gate, the band reads as empty bottom space. That is an art ask about what lives in the band, not a reason to move the grid.

## 3. Follow-up

- No build ticket: nothing changes in code, numbers or goldens.
- The one text edit, §1's superseded sentence, is UI/UX's. It is optional and may be made with their next Library touch.
