# glyph-elder-cold: final report (Queue: glyph-elder-cold)

Branch build/glyph-elder-cold in /home/mb/mb/wt-glyphs, off origin/station-gate (2060c1952). Not pushed.

## What changed
Both marks come from art/station-masters/collection/source/marks.py (a pixel script, code stays per the AD ruling). Only these two blocks changed; heart, asleep, breather and the Companion marks are byte-identical.
- **mark-elder-16**: a cane with a ROUND crook. A 2 px shaft (x 10-11, rows 5-15), a domed ring crook over rows 0-4, the hook curling 3 px down at the left (x 5-6, rows 3-5), a 3x2 hole inside. Reads as a hooked cane at 1x, not a 7 (the first try with a flat top did read as a 7; the dome fixes that).
- **mark-cold-16**: a six-arm snowflake: one arm up, one down, four at 30 degrees, a barb on each arm, a white hub. It replaces the dark dotted ring.
- Placed with prototypes/ui/tools/place-masters.mjs (--ids, --no-squeeze) into prototypes/ui/assets/masters/collection/; `place-masters --check` passes (4601 placed, 0 problems). index.json and provenance.json updated: status new, "code-drawn UI glyph, queue glyph-elder-cold 2026-11-11", **not yet AD-signed** (the AD signs after looking at the stills).
- README.md of the collection and marks.py's header lines updated to match. The proof sheets (proof-marks-1x/8x, proof-breather-1x/8x) were re-made by the same script.

## Palette entries used (station.json)
- elder: `clay` #bf9157 for the wood (the AD's #c9a46a is not on the palette; `clay` is nearest), `bark` #7d5435 for the dark edge (the AD's #6b4a2a; `bark` nearest).
- cold: `ice` #a9e6ff for the arms, `white` #ffffff for the hub.
- The disc is unchanged: `panel` fill, `bevel` rim.

## Goldens moved (prototypes/face/golden/vivarium, 51 PNGs plus vivarium.json)
Cause for all 51: every Wall view draws the cold mark on the "Tucked away" row of the left list, so every vivarium-wall-* state changed by that one glyph (none, one, twelve, forty, eighty, one-room, ten-top, ten-bottom, sort-*, filter-*, ring-*, move*, pick-*, swap*, pair*, breed-*, dawn/dusk/night, add-*, panel-add-room). Re-taken with tools/goldens.mjs vivarium. The 33 room-view vivarium goldens kept their hashes (no mark in them).
Checked and unchanged: idle, home, habitat (`--check`: goldens match). No other screen shows either mark in a golden. No golden shows the elder mark (none has an elder resident); it shows in the still below.

## Stills (tools/credit-runner/runs/glyph-elder-cold/stills/)
- marks-on-disc-1x.png, marks-on-disc-4x.png: elder and cold on the 20 px disc.
- room-both-marks-1x.png: the Vivarium (Wall view, 1x) with two elders (cane on their tiles and on the card line) and one tucked-away mibi (snowflake on its tile and on the "Tucked away" row). Made with a throwaway script in /tmp, not committed.

## Notes
- The ordinary face build needed `npm ci --prefix prototypes` in the new worktree (node_modules absent); done, untracked/ignored.
- A first `place-masters --squeeze` squeezed 85 unrelated masters; I reverted all of them (git checkout) and kept only the two marks, so the two new marks are not oxipng-squeezed (163 and 141 bytes; the squeeze of the rest is a separate, pre-existing backlog).
- Tests: no test files touched. Ran only place-masters --check and the three golden checks above (one run each); face_test ran as part of the native build (28257 checks, 0 failed).
- The old cold mark (the frost species dotted disc) is still used elsewhere as mark-species-frost-24x24; untouched.

## Last commit
See `git -C /home/mb/mb/wt-glyphs log -1` (hash below).
