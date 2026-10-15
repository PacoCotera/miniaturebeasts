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

## Juvenile (signed)

The juveniles are drawn from the Station's signed juvenile stands (`mibi-juvenile-S0n-304x312.png`) with `tools/build-species-juv-token.py` and cleaned in place by `tools/species-s0n-juv-clean.py`; each set is the idle, alert, huddle, eat-f0, eat-f1 at 32x32 (lowest opaque row 31) and a 12x12 mini (lowest row 11). Review sheets are `S0n/sheet-S0n-juv-candidate.png`. All three sets are signed by the art director (below).

**S03 juvenile signed** (art director, 2026-10-15 04:36), judged at 1× on the lawn beside the signed adult. The studio's set is ac79e3b8/03f19fca, with one AD fix: the head antenna was a gold stub, and is now a teal stalk (1f9d8f) with an ink cap above it, as the adult (a83542f0). That is 2 px in each of the 6 files, all on the core 48:
- `S03/c-token-S03-juv-idle-32x32.png` sha256 `2e30a2f514968440bd0e4c673dec8fd599195a473760001a84fb49e9c27cb8b8`
- `S03/c-token-S03-juv-alert-32x32.png` sha256 `002a4ead03ef563833f39d9d9200237ca2ab3f3391e7825225d78431f2ce337a`
- `S03/c-token-S03-juv-huddle-32x32.png` sha256 `5f086fcbfbeb455dd983ab8f4ee380f7245e69dc3d79d27d1f0889d069e87d89`
- `S03/c-token-S03-juv-eat-f0-32x32.png` sha256 `9d605405c97178dd616de76d336108b68fa685b4ac607455aa549470f70858bb`
- `S03/c-token-S03-juv-eat-f1-32x32.png` sha256 `c6dc88e6ed393307ef8ea4107e4c916684fde0bec0eee4f0a7660b22a81f0975`
- `S03/c-mini-S03-juv-12x12.png` sha256 `fa5037914614b1342a3d9c7a33fa3cd941d6ba0b9732773ba9da91344b0a7dc8`

**S01 juvenile signed** (art director, 2026-10-15 04:47), judged at 1× on the lawn beside the signed adult, round 3 at 6fd6e73e. The silhouette follows the AD's mask (juv-direction/) and the idle is the AD's face pass, 3b108bfe, carried to every pose and the mini:
- `S01/c-token-S01-juv-idle-32x32.png` sha256 `bbfb2085b6a79d732fd579cc1fee810c17db30003a86a385e11ec3c58f427e2d`
- `S01/c-token-S01-juv-alert-32x32.png` sha256 `d3b41be650000e46578a6aebff085238e8a0d92fa10559c9e0308aa58069393d`
- `S01/c-token-S01-juv-huddle-32x32.png` sha256 `bb76fe0bde424b6709c49b90a06517d4319f45b0b612f14bec8190f3de9b4950`
- `S01/c-token-S01-juv-eat-f0-32x32.png` sha256 `cd56e3470a7780961a638e1541b44551fec97d4eae4d0a6239aca00fe5db080b`
- `S01/c-token-S01-juv-eat-f1-32x32.png` sha256 `bb2223e140889e68c16598bcf884b779aa105aad8b92ed18c0a5513796fefc3b`
- `S01/c-mini-S01-juv-12x12.png` sha256 `4ed25fd9cc27aec010f8f944a71cc8650b938b8d553650923e7cd336ed8b3f5c`

**S02 juvenile signed** (art director, 2026-10-15 04:47), judged at 1× on the lawn beside the signed adult, round 3 at 6fd6e73e. The silhouette follows the AD's mask (juv-direction/), with the near eye at x 22–23:
- `S02/c-token-S02-juv-idle-32x32.png` sha256 `d4776650d605c46b58be94c2eed3033f71979822e59045d0993672e5072fe16d`
- `S02/c-token-S02-juv-alert-32x32.png` sha256 `797c55cb99c442d72e403a9b7c731c8df6d31a45e539c2eba461d6d1c6078fb2`
- `S02/c-token-S02-juv-huddle-32x32.png` sha256 `f858506536f6282e16dd0b472d9a2d29d3f7ba2125854e77d0f92c4eb0275faf`
- `S02/c-token-S02-juv-eat-f0-32x32.png` sha256 `16917dec7d62ef50da428d8f19af2386a97543443f3c2c7b86b2c5dc8ae03f49`
- `S02/c-token-S02-juv-eat-f1-32x32.png` sha256 `ccf48be513b8ea4a448ce64b4fad7af1fc963a028d6bc654d87d222397ec72b0`
- `S02/c-mini-S02-juv-12x12.png` sha256 `b60ff4ec467c9287fd95b94fdaf06938f45e5f92737a7750e96c5fe88a5f7efd`

**S01 juvenile colour split (candidate; the AD's 05:25 pass, so it matches the Station juvenile; replaces the signed round 3 files, which stay in d0208a72):** charcoal on the crown only (rows 12 to 15), cheeks, chin and throat cream, a charcoal saddle 3 to 4 px deep nape to rump, everything below cream, sand toe pads on row 30; made by `tools/species-s01-juv-split.py`; review sheet `S01/sheet-S01-juv-split-candidate.png` (the juvenile idle beside the adult token and the Station juvenile reduced to the same height).
- `S01/c-token-S01-juv-idle-32x32.png` sha256 `bbabed327ab0ad93344bfce892b0ce4fdaa7901aa809af549fe12bbefc38e8c4`
- `S01/c-token-S01-juv-alert-32x32.png` sha256 `4b08852ce35e405b8b5141977652173b6b04059bdd0b1436a47b07c66219fc03`
- `S01/c-token-S01-juv-huddle-32x32.png` sha256 `f8c615a3570dea41e91a40b336e48523a4850120297325491c97b7c30f705b87`
- `S01/c-token-S01-juv-eat-f0-32x32.png` sha256 `fb66ec749ba791b8769ba1f4a09f38b66876550f58942a6eb713687e5334599b`
- `S01/c-token-S01-juv-eat-f1-32x32.png` sha256 `2d48affd327b7eef06ff5fc3c91452b2395b18505406465cc209b86c7f0e8f98`
- `S01/c-mini-S01-juv-12x12.png` sha256 `38ec517a367bf96448e77898ca7512c24fcc64b11fa53245317c57ad2e734a16`
