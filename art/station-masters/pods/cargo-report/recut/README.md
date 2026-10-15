# Cargo report recut (gate batch 1: AR5r, AR6, AR7; AD, 10-15, 0 MXN)

The report now sits in the housing, like the board's modules, instead of hanging on the shutter as a raised board.

- **AR6** `cargo-bay-shut-report-976x304` (`make-report-door.py`): the signed shut door. Between slice x 200 and 776 (screen 224–800) the slats end at an 8 px moulded frame lit from the top left, around one plain sage panel. The panel is the slats' own face tone with the grooves median-filtered out, so the door's light runs across it. The roll box and the sill are untouched.
- **AR5r** `cargo-report-plate-560x288`:
  - It is the fix 2 kit: `make-device-plate.py 560 288 --floor 1c222a --sage 121.7,133.2,109.9`. The sage is the AR6 panel's mean.
  - It has a hairline, a 5 px bezel lit from the top left, an inner shade at the top and left, and a lit lip at the bottom and right. It has no raised rim and no rubber corners.
  - The floor is one step under fix 5's ground, so `mist` holds at 4.5:1 even on the brightest floor pixel. Bone is 13.5:1, and mist is 4.8:1 on average.
  - `cut-heights.py` derives the 20 shorter heights by the same middle-band cut as before, so the ids and sizes are unchanged. Sheet: `cargo-report-heights-1x.png`.
- **AR7** `label-plate-cream-216x32` (`make-label-cream.py W H OUT`): the board's cream (229, 220, 203). Matte, with r 3, a 1 px darker edge, a lit top and left arris, and no gold. `ink` reads on it at 13:1. The 7 chapter-label widths for Pods (d) use the same script.

The kit gained `--floor` and `--sage`. Without them its output is byte-identical (plate-device-320x88 re-made and checked by sha).

`proof/` holds 1× mocks with stand-in text in DejaVu, not the game's face. Sign in the builder's whole-screen captures only.
