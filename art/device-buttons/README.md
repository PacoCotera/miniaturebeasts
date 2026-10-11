# Device buttons

Every button on the Station, the Companion and the Caddy carries an icon and no text. The Station's keys, the Caddy's Print, back, the pad and confirm are the original concept's caps: square glossy keys (round for back and confirm, the rocker for the pad) with the concept's own glyphs printed on them; the Companion's Call and the Caddy's Left, OK, Right and Feed keep their engraved round caps. The branding on top is the only text on a front face. One drawing per meaning: the pad, back and confirm are the same on every device, and the Caddy's OK is confirm.

![Every button on the three devices](device-buttons-final.png)

*device-buttons-final.png: every button on the three devices, near real size in the bottom row. Hand-drawn master sheet, signed.*

| Device | Buttons |
| --- | --- |
| Station | pad (dark gloss), Home (a solid house, yellow `#e9b22e`), Vivarium (a leaf, green `#5ea64c`), Research (a test tube, blue `#2f7fd8`), Library (an open book, plum `#7a3f8f`), back (dark gloss), confirm (orange `#f0661a`) |
| Companion | pad, Call (a dot sending two arcs), back, confirm |
| Caddy | left, OK (confirm), right, Print (the printer, no word, charcoal gloss), Feed (a thin strip of paper running from the roll) |

## Cap masters

`caps/`: one master per cap, the 10 × 10 mm icon slot centred on the 15 mm cap (the pad: a 20 × 20 mm slot centred on its 26 mm rocker face, an arrow on each axis where the thumb presses, the centre blank), at 100 px per mm, one colour (white is the cut). Every cap shares one scale, so icons keep their relative sizes. The Station and Companion keys are cut tone on tone into the coloured cap; on the dark caps (pad, back, the Caddy's keys) the cut is filled with bone paint. Cap colours: Home ochre `#dba53a`, Vivarium green `#63a046`, Research and Call teal `#2a9f90`, Library violet `#8460cd`, confirm orange `#f0661a`, back `#454950`, pad `#2e3136`, Caddy charcoal `#33363b`. `caps/manifest.json` lists each with its hash.

## Title marks

`marks/slices/frame-room-{home,vivarium,research,library}-24.png` (with `marks/slices/manifest.json`): the Station's on-screen title marks, 24 × 24, hand-placed pixel by pixel from the same four drawings, each in one Station palette colour that matches its key (Home `#ffd441`, Research `#3084d8`, Library `#dbc0ff`, Vivarium `#5cbb4c`), with the sandbox key icons `shell-key-*-24` in the same alpha, inked for their keys (`#2f2b28` on Home and Vivarium, `#ffffff` on Research, `#f4f1ec` on Library: the signed cap inks). `frame-room-vivarium-24` replaces the habitat mark. Proofs at 1× and 8× on the bar's slate are beside them.

## Source

`source/original.py` draws the original caps, their masters, the title marks, the sandbox key icons and the sheet; `source/drawings.py` holds the engraved drawings still in use, `source/masters.py` cuts the cap masters and the sheet from them, and `source/marks.py` holds the 24 px marks as pixel grids.

## Hashes (sha256)

- `device-buttons-final.png`: `33d7916c7dc1b2cab24eff37c5227fed01017f69a68ae0fddcc26289a15a31e3`
- `marks/slices/frame-room-home-24.png`: `d4f4e3ad0c0e68ede883ab33a96529135a7bc8d3494de1a35e09956718641cd7`
- `marks/slices/frame-room-library-24.png`: `bb4ad9b4d7b635fd224e01a88b1df307e493e4e12625355822470f51e393ee3c`
- `marks/slices/frame-room-research-24.png`: `239e82dba592f147a149a96c9247bc016644b3a0d3631ea6f81e437c6a0d884d`
- `marks/slices/frame-room-vivarium-24.png`: `c38244b25463abe0700244cd2d783313f07027cce402cafe87028adcc9c56ee5`

Cap master hashes are in `caps/manifest.json`.
