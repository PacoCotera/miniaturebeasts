# Fix 2 F11: the chapter rail's well and the cream open tab (gate batch 1, F2-A5 and F2-A6; AD, 10-15)

- **F2-A5** `plate-rail-well-{w}x48`, 18 widths, one per rail run (w = run + 16), drawn 1:1 at (x0 − 8, 40) on the painted layer before the tabs. The bottom is at y 88.
  - 1–6 full tabs: 168, 304, 440, 576, 712, 848.
  - 7–12 tabs, one open: 504, 560, 616, 672, 728, 784.
  - 7–12 compact tabs, none open: 424, 480, 536, 592, 648, 704.
  - Made with `../make-device-plate.py W 48 OUT --open-top`. It is the kit cut into the housing's top bezel and open to the top bar, so it has no top wall, no top hairline and square top corners.
  - It has 5 px sage walls on the left, right and below, the inner shade on the left wall, the lit lip at the bottom and right, and the kit's floor.
  - Without `--open-top` the kit is byte-identical; plate-device-320x88 was re-made and checked.
- **F2-A6** `rail-tab-fill-open-full-152x40` is recut as the board's cream label plate by `make-tab-open-cream.py`.
  - Only the colours change: the alpha, slant and size are the signed piece's, and pass 83's opaque right-end bevel is kept.
  - The face is cream (229, 220, 203). The signed bevel ring becomes the 1 px darker edge. The ring inside it is lit on the top row and the left slant.
  - ink reads at 12.9:1. Its word and pips go to ink, per frame.json `states.open`.
  - The open tab is always the full size, so the compact open fill is not used and was not recut.
- **Proof** `proof/mock-*-1x.png`: today's Incubator-ready and Pods chapter-page goldens with the well slid under the tabs and the open tab in cream.
  - These are mocks: the tabs are pasted back from the golden, and the word's colour is swapped by threshold.
  - The signing is in the builder's whole-screen captures after fix 2 merges.
