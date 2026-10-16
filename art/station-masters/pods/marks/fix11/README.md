# Fix 11, gate batch 1 (AD, 10-15)

- `make-line-glyphs.py` writes the name-line glyphs. Each one's meaning now sits in a form at least 12 px across, in the pass 60 family's colours.
  - `mark-line-seed-12x16` (hides): ink 12 × 16. The id is unchanged.
  - `mark-line-seed-pair-20x16` (blend): two 12 × 16 seeds overlapping 4 px, with an ink keyline between them. The id is unchanged.
  - `mark-line-only-16x16` (only): a new id, top at 2. One seed stands on the signed plinth's three steps; the ink is 16 × 14. `mark-line-only-16x8` is superseded and not placed.
- `make-rail-mark-ref.py` writes `ref/rail-mark-{clash,changed}-12x12-ref.png`. These are the pixel reference for Create's composed 12 × 12 rail mark (a red ✕ and a bone diamond), for the builder's oracle only. They are never placed: the face composes the mark as chrome.
- `make-asleep-glyph.py` redraws `mark-asleep-24x16` (same id and size), because the old slim crescent read as a pointer at 1×. The new glyph is a full 13 × 13 crescent moon in the family colours, with three sleep dots rising to its right.
