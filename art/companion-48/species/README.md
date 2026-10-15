# Companion species tokens (C0), on the core 48

These replace the page's code-drawn creatures: `buildCreature` gives the 32 px token in each pose, and `i-mini` gives the 12 px mini. Each species takes its canon from its signed juvenile stand-in on the Station, so the Companion and the Station show the same animal. S01 is the charcoal Loika, regraded to Pip.

- `tools/build-species-token.py STAND SPECIES OUT [--flip]` makes the base for each species' idle and mini:
  - the stand reduced once by area;
  - each part (body, cream, crest, eyes) snapped to its own core-48 ramp by value;
  - the eye placed from the stand's own eye;
  - one ink outline round the silhouette (the crest outlined in pine), never void.
- The other poses (alert, flee, huddle, shake, eat; for S03 also curl, settle, nest and glow) are drawn from the idle and hand-cleaned by the pixel artist.
- All of it is candidate until the art director signs each master at 1× on a field capture beside the pawn.

**S01 status (candidate, round 2, nothing signed):**
- The idle and the mini are the base's own pixels, edited in place by coordinates (`tools/species-s01-clean.py`, run on the output of `build-species-token.py` for the adult 144x152 with `--flip`): the silhouette, the rooted crest and the outline are the base's; stone is a 1 px rim top-left only, the lavender patches are slate or night, both eyes keep the base's places (near 3x3, far 2x3: amber ring, orange iris, void pupil, white catch-light top-left), the muzzle is short with one night mouth line, the belly a cream oval (paper, bone, sand under), the four stubby legs charcoal with bone toes on row 30. The seven poses are drawn from that idle by the same script.
- Round 3: the AD's approved idle (c05cb474: the cream runs from the snout down the throat into the chest as one bib) is the base of the poses, which all carry the throat; flee splays its legs (back 3 px further back, front 3 px further forward, stubby, bone toes); the mini has a 2x2 paper snout with a bone top and a paper chin. The one pixel I changed in the approved idle: the outline at (27,18), which the muzzle had overwritten.
- Pieces: `c-token-S01-{idle,alert,flee,huddle,shake-f0,shake-f1,eat-f0,eat-f1}-32x32.png` and `c-mini-S01-12x12.png`; the review sheet is `sheet-S01-candidate.png` (all 9 at 8x on ink, and at 1x on a 48 px lawn tile beside the pawn; the 48 px pawn frame stands in for c-pawn-32), made by `tools/species-sheet.py`.
- Checks: `atlas-check.mjs` on a one-piece manifest per file, each piece ok against the core 48 (its 22 missing core keys are the one-piece manifest's); alpha only 0 and 255; the only void is the pupils.

**S01 signed** (art director, 2026-10-15 00:37), judged at 1× on the lawn beside the pawn (`S01/sheet-S01-candidate.png`). The idle is the art director's hand pass c05cb474, with the studio's outline pixel at (27,18). The poses and the mini are round 3, 9d36bbd6:
- `S01/c-token-S01-alert-32x32.png` sha256 `241fd5be2e19d6e49bd423feaa44c1cd886443a6ff4cc24d7ef5547be7340eec`
- `S01/c-token-S01-eat-f0-32x32.png` sha256 `286295ff49120b2af8d2942b7c3be28a2f477094d890e9514eaac707694e138d`
- `S01/c-token-S01-eat-f1-32x32.png` sha256 `452751a2ec8a0425027ffc0b37efe9be02ac6b3aea64c30829e23665cbbfae3a`
- `S01/c-token-S01-flee-32x32.png` sha256 `ad1ffee6f2cf46910bbd7ea185a90a499b662823c5d5f60e4124f4c3bedf6464`
- `S01/c-token-S01-huddle-32x32.png` sha256 `ded03942e57a284dcd7c9b0abdfa15b5d106e00465a8c0b2db62e8a18aa20e53`
- `S01/c-token-S01-idle-32x32.png` sha256 `b642ab6bf937de8bc23c2447303129cb31d023fc54b8d0374b8afb092e08a06a`
- `S01/c-token-S01-shake-f0-32x32.png` sha256 `8e106a6a919f0ea346f2c17c9e411a9e84cc542c94460b2cc30ef56ca51d0df7`
- `S01/c-token-S01-shake-f1-32x32.png` sha256 `99f8fb0f248bb45385b6051dc0ca38881a771862e468e477b4eed3c01fb2c126`
- `S01/c-mini-S01-12x12.png` sha256 `0e058cc4df269a52406afaa1e9847d991677b0efb8a0c1086a0a6d7259dddb02`
