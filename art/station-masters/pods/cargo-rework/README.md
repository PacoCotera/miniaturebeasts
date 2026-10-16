# Cargo rework (AD, 10-15 20:40; the owner rejected Cargo at 20:29: "not using the visual references we discussed")

The containers are redrawn from the owner's ref-1…10 and the 10-10 haul rulings. Three Pro calls, 11.76 MXN.

- **The pod crate** comes from ref-4: a modern hard case with a warm yellow shell, black rubber corners, black latches and a black handle. A black label plate carries a white egg on the sealed crate and a cream picture frame on the sitting crate. It is no longer the rustic sage field case.
  - The case is Pro edits of the signed crates (`rw-crate-sealed`, `rw-crate-open`), each fitted to the signed crate's bounding box in its 432 × 272 canvas. Every crate id keeps its size and box, and the open crate's three wells stay where they were.
  - `cut-crates.py` cuts the two 432 masters. `derive-crates.py` derives the opening frame (lid up 6 px at seam 176) and the 256, 80 and 48 sizes into the signed boxes.
- **The haul** shows what it carries, after the 11:42 and 11:48 rulings:
  - energy is a battery cell with a glowing amber window (ref-10 and ref-7);
  - data is a cartridge with a glyph screen and visible chips (ref-6);
  - essence is a clear vial holding glowing liquid (ref-9).
  - `cut-haul.py` cuts them from one sheet, `rw-haul-trio`, at 48 × 64 (the same ids) and at 72 × 96 (new ids, proposed).
- **Proofs** (`proof/`) are mocked into today's goldens:
  - `beside-refs-1x.png` sets the opening capture beside ref-4, 6, 7 and 9;
  - the 72 × 96 placement sketch is for UI/UX only.
- **Status:** new. These are signed only in the builder's whole Cargo 1× captures beside ref-1…10.
