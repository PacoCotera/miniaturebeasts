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
- **Baked (14:35, `guides/bake.py`, 0 MXN):**
  - Magenta flecks are cleaned: 20 px on young S05's crouch, 49 and 33 px on the individual's stand and crouch.
  - The individual's air and curl are mirrored to face the way its stand does.
  - Breath steps: b1 and b2 on the stand (and on S05's pass), b1 on the curl. Rows are repeated at the chest, so the top rises 1 or 2 whole pixels and the feet stay fixed.
  - Walk sizes: 104×112 for the young (feet row 105, the stand-ins' scale) and 144×152 for the adults (feet row 145). The bed curl is at 96×88.
  - The flipbooks above were made before the bake. They show the master keys without breath.
- **Still open:** the head lock is untested (S05's cycle is in place only); the stride measure on S05 (motion-spec.md §2.2); HiBit frames (the pixel artist's).

## Flipbooks re-cut after the animator's timing review (14:21), 0 MXN

- **Air keys grounded** (`guides/ground.py`): the body sat 33 / 37 / 41 px over its shadow (young S01, Pip, the individual). It now sits on the feet row, and only the spec's arc lifts it. Measured: crouch → first air tick lifts the feet 4 px (young S01) and 8 px (Pip), within the 12 px limit.
- **Breath in every stand hold** on one clock (juvenile 2.40 s, adult 2.88 s); the top moves 1–2 whole px.
- **Crouch → curl** is a 16-level ordered dither over 180 ms; asleep breathes curl / curl·b1 on 4.8 s.
- **Young S05** plays the quick class: pass 80, steps 160 (in place; no stride measure yet).
- The individual's air and curl face its stand's way. The light flips with the mirror; at 1× the key light reads from the top right on those two keys. I accept it for the proof, and the roster sheets are painted in one facing.
- Crouch-a (Pip's failed crouch) is withdrawn from the flipbooks.

## The air keys rise alone (programme lead's note, 0 MXN)

The animator signed `juv-S05-walk-curl`. On the three hoppers, every air key still carried painted shadow ink under its feet, so the shadow rose with the arc. `guides/air-shadow.py` fixes that:
- The air key's low-alpha ink (shadow split, painted shadow, half-alpha rim) is stripped, giving `{n}-air-body`.
- The ground shadow is a soft ellipse in the shadow colour (alpha ≤ 110) spanning the stand's feet (`{n}-air-shadow`). It stays on the ground and fades to 75 % at the apex.

The flipbooks are re-rendered. Each strip shows stand, crouch, the first hop's apex and asleep.
