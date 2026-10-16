# Juvenile stand-ins, all 16 species (Oct 11)

By internal `boards/station-juvenile-studio-brief.md` (b349a00). The owner approved up to 115 MXN (decisions.md 10-11 08:49,
and in the art director's session at 09:00). The programme lead's go was given at 09:02 (run here). Round 1 covers S01 Loika,
S16 Blikur and S10 Igara.

| File | Made by | Cost |
| --- | --- | --- |
| `mibi-juvenile-S01-*.png` (4 sizes) | One Pro request (`mibi-juvenile-S01-a`), then by hand | 3.66 MXN |
| `mibi-juvenile-S16-*.png` (4 sizes) | One Pro request (`mibi-juvenile-S16-a`), then by hand | 3.81 MXN |
| `mibi-juvenile-S10-*.png` (4 sizes) | One Pro request (`mibi-juvenile-S10-a`), then by hand | 3.77 MXN |
| `round1-sheet-1x.png` | Each row: the adult rig at 304×312, the juvenile at 304×312, then 104×112, 96×88 and 48×48 | 0 |

Round 1 total: 11.23 MXN of the 15.5 planned, with no retries. The set is at 11.23 of 115.

- **References:** each species' adult rig rendered at 304×312, three-quarter, from main's own `mibiArt`
  (`guides/adult-rig-SXX-304x312.png`), and its signed halo `mibi-halo-SXX-128x160-clear`. No earlier juvenile was ever an
  input. The jobs are in `source/work/mibi-juvenile-SXX-a.json`.
- **By hand:**
  - keyed off flat magenta with a 1 px choke, the painted shadow made a flat dark shadow;
  - at 304×312, 104×112 and 96×88, fitted to two thirds of the adult's height at that size, centred, feet within 6 px of the
    box's foot;
  - at 48×48, fitted to the tile (44 px), with the alpha cut to whole and shadow.
- **Flaws:**
  - S16's adult is a spindle on fins with a neck. The juvenile is chubbier, more a seal than a spindle. It reads as young, but
    less clearly as the same species.
  - S10's rendering is a little glossier than S01's matte.
  - S10 is small at 104×112 (its adult is low and long).
- Not signed and not placed. The owner sees round 1 before round 2.

## S16 redo and round 2 (owner 09:33: redo S16 once, closer to its adult; then the other 13)

- **S16:** redone as `mibi-juvenile-S16-b` (3.68 MXN). It is now the adult's own plan: an upright spindle on splayed fins,
  a short stalk neck and a round head. The first S16 (`-a`) is superseded.
- **Round 2:** S02–S09 and S11–S15, one Pro request each (`mibi-juvenile-SXX-a`), 13 requests, no retries, 49.34 MXN.
  - The same method, with each prompt naming its adult's own plan.
  - References: each adult's rig render at 304×312 (`guides/`) and its signed halo. Never an earlier juvenile.
- **The set:** 64 files (16 species × 4 sizes). Total 64.25 MXN of the 115 cap (round 1 11.23, S16 redo 3.68, round 2 49.34).
- **Re-cut:** all 16 species were re-cut to fix a keying fault. The first cut filled enclosed magenta pockets between legs
  (S03, S06, S07). Now only non-magenta holes are filled.
- **Proofs:**
  - `juvenile-sheet-1x.png`: each species as its adult, its juvenile at 304×312, then 104×112, 96×88 and 48×48.
  - `juvenile-48-row-1x.png`: the 16 at 48×48 in a row.
- **Manifest:** `manifest.json` lists every id with its size and sha256, for place-masters once signed.
- **Read at 1×:**
  - Every juvenile reads as its species and as young.
  - S13 is the smallest and darkest at 48. S02's cap is coral where the adult's is orange-brown.
  - The rendering is not perfectly even across the set: some are glossier, e.g. S10, S11.
- Not placed. The owner sees the full sheet first, and the art director signs after.

## S02 redo and the sign (owner 09:49: the set approved; redo S02 once to match its adult's colours)

- **S02:** redone as `mibi-juvenile-S02-b` (3.89 MXN), with the adult's own colours named: an ochre-tan cap with sand and
  peach highlights, a warm chestnut body, a peach blush. The first S02 (`-a`, coral) is superseded.
  `S02-before-after-1x.png` shows the adult, the coral first try and the redo.
- **The set:** 68.14 MXN of the 115 cap, across 18 Pro requests (16 species, S16 and S02 redone once each).
- **Signed** by the Station art director at 1×, 2026-10-11, all 64 files. `manifest.json` carries each id, size and sha256.
  Placement follows slot Q, with place-masters.

## Re-export: shadows and magenta specks (after #139's in-scene check)

All 64 files are re-cut from the same paintings (no new request) by `guides/cut-juveniles.py`:
- **The ground** is each picture's own magenta, read from its border. Before, one fixed threshold took the darker magenta of
  S15's and S16's painted shadows for ground, so they had none.
- **The painted shadow** is a darker magenta than the ground (or, for S03 only, a neutral grey), under the figure's lower part.
  It is kept as a flat translucent shadow (alpha 110) in every species. S03's grey shadow had come out opaque, part of the body.
- **Magenta specks:** body pixels with the ground's magenta cast are removed on the edge and repainted from their neighbours
  inside. What remains of magenta hue is the creatures' own colour (S03's pink pads, S16's lavender).
- `manifest.json` carries the new hashes. Signed again at 1×.

## S01 regraded toward Pip (fix 1a; the creative director's gap ruling, 2026-10-12 00:00), 0 MXN

S01's body is locked charcoal and Pip is canonical, so the young Loika must read as the same animal as the grown one. `regrade-S01.py` moves each colour group of the signed teal juvenile onto Pip's own colour, by hand rule with no generation. Each pixel's luminance is mapped from its group's percentiles in the juvenile onto Pip's, so the juvenile's painting and shading are kept. The groups:
- teal body → Pip's charcoal, including the body's grey-teal and grey-green lights;
- iris → Pip's amber;
- beak and feet → Pip's cream-tan;
- leaves → Pip's olive, a step brighter;
- the cream belly, the eye whites and the shadow are unchanged.

All four sizes: 0 px magenta. Proof: `S01-regrade-vivarium-1x.png` (the regraded 104 beside Pip at 144 and 96 on the day glass; the old teal juvenile on the back rock for comparison). The status is candidate until the art director signs it beside Pip in builder 2's whole-screen captures. The files are in slices/ with manifest and status entries (new).
