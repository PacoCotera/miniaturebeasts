# Mibi motion proof: the four key sheets (Oct 11)

The owner's yes at 14:03 (decisions.md, question 1), the programme lead's go at 14:07. Four Pro requests, one sheet each, each with its signed stand as the only input; 3:2, 1K, a 3 × 2 grid on magenta.

| Sheet | Input | Cells | Cost |
| --- | --- | --- | --- |
| `source/raw/motion-S01-juvenile-a.jpg` | `mibi-juvenile-S01-304x312` | anchor, crouch, air, curl | 3.99 MXN |
| `source/raw/motion-S01-adult-a.jpg` | Pip, `art/miniature-lives/assets/rich-plain-source.png` | anchor, crouch, air, curl, blink | 4.04 MXN |
| `source/raw/motion-S05-juvenile-a.jpg` | `mibi-juvenile-S05-304x312` | pass, stepA, stepB, crouch, curl | 3.83 MXN |
| `source/raw/motion-S01-grow-b24869689240a6df-a.jpg` | that individual's Grow portrait (600×620) | anchor, crouch, air, curl | 4.09 MXN |

Total 15.94 MXN of the 22.5 hard stop. `sheets-overview.png` puts the four side by side.

## The art director's first read (before the cut)
- **Same animal in every cell:** yes on all four. Face, eyes, markings and leaf counts hold (Pip 3 leaves, young S01 2, the individual 2–3 as its portrait). The individual stays its own animal, not Pip: the G11 test reads well on paper.
- **Air and curl:** strong on all three hoppers; the curls (eyes shut, leaves folded) are the best keys on the sheets.
- **Walk (S05):** stepA and stepB are distinct, opposite pairs forward, with the same head. Good for the head lock.
- **Weak: crouch.** Pip's crouch is almost his stand, and young S01's and S05's are only a little lower. A crouch must read as anticipation: body down, legs folded. One single-key fix edit for Pip's crouch (≈ 4 MXN, inside the hard stop) is the likeliest need; the others may pass at 1× once the cut lowers them on the ground line.
- **Young S01's sheet carries thin black cell borders** despite the prompt; the cut removes them (they sit between cells, never on a figure).
- Not cut, not signed. Next: the cut (feet on row 305, shadow split, sizes, baked breath steps), then the 1× flip test against each stand.

## The cut and the 1× flipbooks (Oct 11, 14:17)

- **Cut:** `guides/cut-motion.py` (magenta from each cell's border, 6 px inset drops the cell borders, 1 px choke, shadow split at alpha 110, feet on row 305). One scale per sheet, set so the anchor's body width equals the stand's, capped so every key fits above the feet row. Scales: young S01 0.601, Pip 0.733, young S05 0.405, the Grow individual 0.841 (stand: its `station-portrait-300x310`). Keys in `keys/` at 304×312.
- **Pip's crouch failed** before any flip: its top drops 9 % from the stand (young S01 20 %, the individual 27 %), legs barely bent. The pre-approved single-key fix edit, `source/raw/motion-S01-adult-crouch-b.jpg` (1 Pro request, 3.66 MXN, Pip's stand as the only input), is a real anticipation: body low and wide, legs folded, head pulled in. Cut at the sheet's scale matched on the iris (0.312): `keys/pip-crouch-b-304x312.png`. Its brush is a touch flatter than the sheet's; on a 160 ms beat that does not read as a different animal.
- **Flipbooks** (`guides/flipbook.py`, APNG, every change on the 80 ms tick, motion-spec.md §2 timings): three hops then curl to sleep for young S01, Pip (crouch a and crouch b side by side), the individual; young S05 walk in place then curl. Each has a `-1x-strip.png` (stand, crouch, apex, curl). The air keys already lift off their painted shadow, and the spec's arc is added on top: the apex is that much higher than the spec intends. The animator decides whether to ground the air key first.
- **Still open:** the individual's air and curl face right while its stand faces left (mirror at atlas build, or a facing rule); one magenta fleck on the individual's crouch leaf and on young S05's crouch (hand clean); baked breath steps b1, b2 and the smaller sizes are not made yet; the head lock is untested (S05's cycle is in place only).
