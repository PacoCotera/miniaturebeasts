# Fix 2: the device-material plate kit (AD, 10-15)

One kit, applied everywhere a flat app panel stands today. A plate is the housing's own construction at module scale, cut from the signed stage housing (`room-bench-stage`):
- a 1 px hairline (#3d434b);
- a rounded sage bezel (5 px) in the housing's measured sage ramp, a rail lit from the top left;
- an inset well floored with the stage wall's own paint, its grain taken from the flattest bare stretch of the signed wall;
- a soft inner shade on the top and left walls, and a lit lip bottom and right.

The floor's luminance matches today's panel (#2b3038, relative luminance 0.029), so every text colour already placed keeps its contrast. Matte: no gloss, no glow, no new style.

`make-device-plate.py W H OUT [--well]` makes any size. The ids:
- `plate-device-<w>x<h>`: a plate.
- `plate-well-<w>x<h>`: a recess with no bezel, for slots set into a plate (pose tiles, companion slots); `-shown` is the well one step up (--shown).

`plate-device-408x440` is superseded by fix 5's Compare sizes: not placed.

A size not listed below is a new id. Ask the AD; it is cut in minutes and signed in its capture.

## The inventory (PAINTED family; all placed 1:1 under their content)

| Screen | Region (x, y, w, h) | Id |
|---|---|---|
| Home | cargo, pods, incubator, probe, library modules (688, 48 / 152 / 256 / 360 / 464, 320, 88) | `plate-device-320x88` (×5) |
| Habitat | card (592, 48, 416, 208) | `plate-device-416x208` |
| Habitat | door/Companion (592, 272, 272, 96); Cross (592, 376, 272, 96) | `plate-device-272x96` (×2) |
| Habitat | Portrait (872, 272, 136, 96); Wild (872, 376, 136, 96) | `plate-device-136x96` (×2) |
| Habitat | strip (16, 488, 992, 64) | `plate-device-992x64` |
| Habitat | namer panel (592, 48, 416, 424) | `plate-device-416x424` |
| Habitat | pose tiles (152×48), companion slots (48×48) | `plate-well-152x48`, `plate-well-48x48` |
| Probe | Mend switch module (fix 5 P4: 312×128); Upgrade slot module (312×248) | `plate-device-312x128`, `plate-device-312x248` |
| Pods | Compare pages A and B (96 / 520, 112, 408, h; fix 5) | `plate-device-408x300` (1–3 traits), `plate-device-408x416` (4–6) |
| Habitat, Vivarium | compact tiles (72×48); shown tiles | `plate-well-72x48`; `plate-well-152x48-shown`, `plate-well-72x48-shown` (one step up, x1.89) |
| Habitat | namer field (636, 64, 328, 48) | `plate-well-328x48` |

**Not in the kit:**
- Library's Book shell. It is a painted book (its boards), not a plate: a separate AD piece.
- Create's stage, which is already painted.
- Cargo's bay floor and report plate, already signed (AR1, AR5).

**Proofs at 1×** (`proof/`): Home's column and Habitat's right column on their current goldens, with each panel's content lifted back over the plate.

**Gate batch 1 C5 (D1).** `plate-well-136x168` (the chapter-page cells and Compare with 1–2 traits), `plate-well-120x120` (the sealed find), `plate-well-112x168` (Compare, 3 traits) and `plate-well-112x104` (Compare, 4–6 traits) are each drawn at P − (4, 4).
- They are made with `--well --floor 1d232b --flat`.
- `--flat` holds the floor at exactly `ground` (29, 35, 43), with no grain and no fall, so the keyed crops sit in it with no seam.
- Without the switch, the kit is byte-identical.
