# Companion sign pictures (core 48)

`sign-shelter-32.png`: the shelter sign, 32 × 32, 8-bit indexed, its PLTE exactly the page's 48 colours, transparent outside the art
(tRNS on the unused magenta slot). Status: signed. sha256 `bf8c1827f8d042aae7778c4a2212f958bb8ab8f1de8b8dcd8c6c7add710b4edf`.

- Source: `meadow/face/wall-1x2-h14` (meadow-walls.png), columns 8–39, the same overhang the player meets in a meadow place:
  the top lawn (piece rows 0–2), the hanging grass fringe (rows 9–14) and the face (rows 15–26), hand-remapped to the core 48
  (`source/make-sign-shelter.py`). The apron notches at the top are closed with lawn.
- Drawn by hand on top: the lit top edge in sprout (brighter toward the top left), the face turning under in slate, a soil
  underside undercut by 1 and 3 px, root drips in soil and bark, and open space below (rows 24–31 transparent but for the drips).
  No tree, no figure, no sky.
- Reads on both grounds: the sign card (ink fill, amber frame) and the Probe tile (night fill, slate edge), at 1× and 8× in
  `proof/sign-shelter-grounds.png`.
- Check: `node prototypes/exploration/tools/atlas-check.mjs --drop` on a one-piece core48 manifest: the piece is ok, 8-bit indexed, 0 off-palette pixels.
