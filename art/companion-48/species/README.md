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

**S02 Untuva and S03 Tuikis status (candidate, for the art director's read; nothing signed):**
- Both come from the adult 144x152 slices with `tools/build-species-token.py ... --flip --ramps S02|S03` (the new `--ramps` option; S01's defaults are unchanged: S02 body soil/bark/clay and cap clay/sand/paper, S03 coat tealD/teal/aqua and bulb gold/yellow/cream, eyes ink with a white catch-light) and are then cleaned in place by `tools/species-s02-clean.py` and `tools/species-s03-clean.py` (shared helpers in `tools/species_common.py`): the silhouette and outline are the base's; the tones, the cap and its brim shadow row, the eyes, the legs, the tail's bulb and the ears are edited by coordinates; the poses and the minis are drawn from each idle.
- S02 (8 + mini): idle, alert, flee (body 2 px longer, stubby legs splayed 3 px), huddle (the cap pulled down over the eyes, which become a 1 px line), shake-f0/f1 (the cap swings opposite), eat-f0/f1.
- S03 (10 + mini): the same eight (slender legs 2 px wide; flee with the legs stretched, not splayed) plus settle (lowered, legs folded) and curl (a ball, the tail wrapped round the front, the bulb resting on top, yellow only).
- Sheets: `S02/sheet-S02-candidate.png` and `S03/sheet-S03-candidate.png`: every piece at 8x on ink, at 1x on a 48 px lawn tile beside the pawn (the 48 px frame stands in for c-pawn-32), and S01's, S02's and S03's idles side by side at 1x. Checks: atlas-check ok on a one-piece manifest per file; alpha only 0 and 255; no void anywhere.

**S02 signed** (art director, 2026-10-15 00:48), judged at 1× on the lawn beside the pawn and beside S01 (`S02/sheet-S02-candidate.png`), round 2 at 566c80a6. atlas-check against core48 is ok for every file:
- `S02/c-token-S02-alert-32x32.png` sha256 `c60bdf85036b7636513250c49d29961c34bdd3cba0e4525b4dc88b22d32bc0c5`
- `S02/c-token-S02-eat-f0-32x32.png` sha256 `7afedb1bfade2ce7ba8ca97d0f35e97cb8c7506e0b34106751577175342e5c2d`
- `S02/c-token-S02-eat-f1-32x32.png` sha256 `f516fd1e885c0470e8114faabb7b6bcb54323bf09141e0f84ddb7ec6342a29f7`
- `S02/c-token-S02-flee-32x32.png` sha256 `72181867c9f4e3c35fbbd4c37c068543d344aa567914e7ee1cbe25d53d65e2f5`
- `S02/c-token-S02-huddle-32x32.png` sha256 `f169bb2d9e90bd0f5cee5fe0f609ccb8794338353b671a23edbb2c7eae913ac6`
- `S02/c-token-S02-idle-32x32.png` sha256 `9a633d709e1d419262fc02214bf76e180a09f253e29db28397ed6b661e7ab3d9`
- `S02/c-token-S02-shake-f0-32x32.png` sha256 `38d9a3e481fc55284c13351525032bbfb947fe12b605a530f0b4fd9242e35456`
- `S02/c-token-S02-shake-f1-32x32.png` sha256 `327f8d68a89a7d95397ab0a2be34f8bec12baa82edd1bff4d58f73a4084ae0bc`
- `S02/c-mini-S02-12x12.png` sha256 `fda0c37ecf036a87a3d1260cbc3afe9ed4a3aa75ed30bb7f0fafc150cfecc6c2`

**S03 signed** (art director, 2026-10-15 00:48), judged at 1× on the lawn beside the pawn and beside S01 (`S03/sheet-S03-candidate.png`), round 2 at 566c80a6. atlas-check against core48 is ok for every file:
- `S03/c-token-S03-alert-32x32.png` sha256 `3741961aac6cf4f0a7d8c0189ac7159ad2c5b03b8f931646e700133bb2ad5b6b`
- `S03/c-token-S03-curl-32x32.png` sha256 `ece1d5bfecc9ebbb43e6f0fab627e18d939b6cf3c6dbc6267cd1999518bb60fc`
- `S03/c-token-S03-eat-f0-32x32.png` sha256 `8ef4c7d1fd3789b708a81627bb79f0ae39f4fcdee5109c7ef81541fd6ae62975`
- `S03/c-token-S03-eat-f1-32x32.png` sha256 `3c22445530931920478f6f5c2ea1c1edebd29788e4fb503e92533fa96b276c30`
- `S03/c-token-S03-flee-32x32.png` sha256 `219542a1795bb069ca7633bf36534cc2700ff4c838822fafb269b4e5107376ec`
- `S03/c-token-S03-huddle-32x32.png` sha256 `e5239d7bff540f8052f778114d85e3831536d5af34b7a12046ec310b054ef9fa`
- `S03/c-token-S03-idle-32x32.png` sha256 `ad6be7be6083289c3ed3b0c8499ccb7b73a3f3e4cb6dfcb7269059c14bb16775`
- `S03/c-token-S03-settle-32x32.png` sha256 `1d92c52576b4a4926fc5c9b5d55556255fe12f0cc022258ef2e51c581e372807`
- `S03/c-token-S03-shake-f0-32x32.png` sha256 `29e5eba6ab18d7b669868a77ffca3bcafa48c9ddeeec9e2ef35aa8342283bf33`
- `S03/c-token-S03-shake-f1-32x32.png` sha256 `70eaa229ab49ab6b4aa7931695d28bde85be565974da4bb97211ed2854ac473d`
- `S03/c-mini-S03-12x12.png` sha256 `57e75627530901af35d858d96b6df0b98a432f8bf364305fbdf43c9e1fc7db4e`
