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
- `S01/c-token-S01-alert-32x32.png` sha256 `f45a9f86dd0ad14bb8c131cf67a3a687903b6f7ba14db3c06fd5742358ed5ab6`
- `S01/c-token-S01-eat-f0-32x32.png` sha256 `cb8960484fc767bbc98de2b8b4a7cc5bad629f1c746877c01e7c4c09390afccd`
- `S01/c-token-S01-eat-f1-32x32.png` sha256 `5856782f5dcebf2d953ec74c113c77037fd406c5b47be04a6a5e2f158eb00b82`
- `S01/c-token-S01-flee-32x32.png` sha256 `4b16555b9e0ec4ff55bd58e750fd23ba3031af761765c123633b3a1e616e7128`
- `S01/c-token-S01-huddle-32x32.png` sha256 `7d9cd6bcba1f9967209d617ad66b53b612870d6e992ec1817a02d4f48ebf260f` (grounded 10-15)
- `S01/c-token-S01-idle-32x32.png` sha256 `9f869e8bac7bea8d13f0653af617244d47a1d9f14ed2df3c7bda7c440dccdba4`
- `S01/c-token-S01-shake-f0-32x32.png` sha256 `3e6f156c4ea1e5bc7f2c1d9a35c0d04aeda06ec754ac7842eda676169d16ba41`
- `S01/c-token-S01-shake-f1-32x32.png` sha256 `385ed5dea381b4fa8e0f83b3b2767725ec9b2a5e43c60e9768678a168b9f0c76`
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
- `S02/c-token-S02-flee-32x32.png` sha256 `e633b40e257fdf62830c1b1e310b86d2d5c5992b898248a502a9af4e47b7f961`
- `S02/c-token-S02-huddle-32x32.png` sha256 `af14fec42ec265a6cfa9865b974c6e7e05a7d55ce2ef986424334286a41eea7b` (grounded 10-15)
- `S02/c-token-S02-idle-32x32.png` sha256 `9a633d709e1d419262fc02214bf76e180a09f253e29db28397ed6b661e7ab3d9`
- `S02/c-token-S02-shake-f0-32x32.png` sha256 `38d9a3e481fc55284c13351525032bbfb947fe12b605a530f0b4fd9242e35456`
- `S02/c-token-S02-shake-f1-32x32.png` sha256 `327f8d68a89a7d95397ab0a2be34f8bec12baa82edd1bff4d58f73a4084ae0bc`
- `S02/c-mini-S02-12x12.png` sha256 `fda0c37ecf036a87a3d1260cbc3afe9ed4a3aa75ed30bb7f0fafc150cfecc6c2`

**S03 signed** (art director, 2026-10-15 00:48), judged at 1× on the lawn beside the pawn and beside S01 (`S03/sheet-S03-candidate.png`), round 2 at 566c80a6. atlas-check against core48 is ok for every file:
- `S03/c-token-S03-alert-32x32.png` sha256 `f6097462b67c6720628784d3f1572900d0bdb11c9af9b61e16b27f8051d545e0`
- `S03/c-token-S03-curl-32x32.png` sha256 `9a10b4f20c9366d9a02cd3ecdb45cfcb9b68dfacf95c206b625dc7e6aa88321f` (grounded 10-15)
- `S03/c-token-S03-eat-f0-32x32.png` sha256 `9606ad293d7b108da8e0a3581da00148332716022d13940b5c91d79a3e703fe5`
- `S03/c-token-S03-eat-f1-32x32.png` sha256 `b02295fd894fefb6fddf5ceb9dad6879a57da53330953d5618b64306d31fd5dc`
- `S03/c-token-S03-flee-32x32.png` sha256 `cac0850f30359e5d1c0be4b39e46d7fb58d10a7ec02161ac1ca0839ce8592f5e`
- `S03/c-token-S03-huddle-32x32.png` sha256 `0647fef5582491e2d585b43ce9b324f1a0add71ecc4aedc5b303db96c65d6cb5` (grounded 10-15)
- `S03/c-token-S03-idle-32x32.png` sha256 `474f9be9f02db55b125495fda3afbd0b995dc23b2486faf5a9f37662a18fcf9e`
- `S03/c-token-S03-settle-32x32.png` sha256 `a6d789a5f7d2a9903c393b3504ad70fba2148e5f4ee27fe5b52f8a6d3441515d` (grounded 10-15)
- `S03/c-token-S03-shake-f0-32x32.png` sha256 `946fe35215d1c408ff7e48371041955f7ac8c17bd2bf674419c3db28b6c8ba2d`
- `S03/c-token-S03-shake-f1-32x32.png` sha256 `e5111454999459eaeb01cfd7aacab3c466ee93b2acfde9c0b8ae4cfd061b84b3`
- `S03/c-mini-S03-12x12.png` sha256 `57e75627530901af35d858d96b6df0b98a432f8bf364305fbdf43c9e1fc7db4e`

**Grounding** (art director, 2026-10-15 01:44): every pose's lowest opaque row is row 31, the same as its idle, because the page draws every token at one anchor. Moved down: S01 huddle by 1, S02 huddle by 1, S03 huddle by 7, S03 curl by 1, S03 settle by 1. Their hashes are updated above.

**X31 touch-up** (art director, 2026-10-15 03:21), from the creative director's note on C0:
- S03: the antenna stalk is drawn in teal, not ink, so on the dark stage the bulb stays joined to the head.
- S01: the toes are solid bone pads, not bone and night alternating, so at 8× they read as toes, not a row of dots.
- No other pixel changed. The hashes above are updated.
- X31 also: S02 flee and huddle were cut flat at the box's right edge (the front end). One body column is taken out of the middle and the front end closed with its ink outline at x 31.

## Juvenile (candidate)

The juveniles are drawn from the Station's signed juvenile stands (`mibi-juvenile-S0n-304x312.png`) with `tools/build-species-juv-token.py` and cleaned in place by `tools/species-s0n-juv-clean.py`; each set is the idle, alert, huddle, eat-f0, eat-f1 at 32x32 (lowest opaque row 31) and a 12x12 mini (lowest row 11). Review sheets are `S0n/sheet-S0n-juv-candidate.png`. Candidate, nothing signed.

**S01 juvenile (candidate):**
- `S01/c-token-S01-juv-idle-32x32.png` sha256 `c9607eab53a306f1fc85a29e177a8af5dcbdb81bd89915b604257fe0609dba2e`
- `S01/c-token-S01-juv-alert-32x32.png` sha256 `1d4ffd52f4940002292454aebbcfd0961ae3c25096fb558cc0af508d30702912`
- `S01/c-token-S01-juv-huddle-32x32.png` sha256 `acc5a65e0c3bae824bb3bf37094fe64669fb82bc8c2a53605ef3ed82f0d01fc2`
- `S01/c-token-S01-juv-eat-f0-32x32.png` sha256 `4481ce4dfd0974c5144b58afe6ad836c6743a960ddd948ae377873c980983400`
- `S01/c-token-S01-juv-eat-f1-32x32.png` sha256 `4a9ae65f0200d6623f10ccaf2a9df0d0159900f0dfd59952461e65b726111514`
- `S01/c-mini-S01-juv-12x12.png` sha256 `d075f7f80b4c23435a905080f76a1e543c34d009a7df77e70862a2b4ed06c65a`

**S02 juvenile (candidate):**
- `S02/c-token-S02-juv-idle-32x32.png` sha256 `03cdf61cd89f09d3c0c425ad757ef99b0b12545d710ced62dfcd08634bd6cd55`
- `S02/c-token-S02-juv-alert-32x32.png` sha256 `7e8d9e7bab4acea6bdb96de037cd7042369d95e15d1547bccc0ff18588dad2eb`
- `S02/c-token-S02-juv-huddle-32x32.png` sha256 `0780fe7b45697b0e5ac9ec8f35073f93d17e2ba7a13207787db11be7c893023f`
- `S02/c-token-S02-juv-eat-f0-32x32.png` sha256 `38a75c133f021829e467eb030fad973396c09c89aa87b12ce2e3a21698a97b12`
- `S02/c-token-S02-juv-eat-f1-32x32.png` sha256 `6e69ff788831cdf7c0ae0a0e2bb014621919f0680c48a433822800fb983011ad`
- `S02/c-mini-S02-juv-12x12.png` sha256 `cbdf05c2616fbfaafadac7976813a22c141aeaab933e7acf4324dce4bd5b8a36`

**S03 juvenile (candidate):**
- `S03/c-token-S03-juv-idle-32x32.png` sha256 `a3afdcda79735a54a705811d5aa9deef4980b59437eea3689543eb40fc9de449`
- `S03/c-token-S03-juv-alert-32x32.png` sha256 `f934fe406a5ce17a2033a8ea5a920cbc4c767422e27575dea472a4a7a74a9ef3`
- `S03/c-token-S03-juv-huddle-32x32.png` sha256 `574c159a4d6bf97b44c2dc6068cb2d5f6f74475e1e0e21014e5505f16c690045`
- `S03/c-token-S03-juv-eat-f0-32x32.png` sha256 `35784abfa37c709a650708fb835b0dc685384ca9217c8ea5c66f54e40201586e`
- `S03/c-token-S03-juv-eat-f1-32x32.png` sha256 `dd098daf1b4495abf68369298386e247e81148a60639e6cdc8015d410e1a83cd`
- `S03/c-mini-S03-juv-12x12.png` sha256 `5c11ef5973b4cbcef5ceadb4649af6e8f2a170b46b3eb294def51a68ae1c8e07`
