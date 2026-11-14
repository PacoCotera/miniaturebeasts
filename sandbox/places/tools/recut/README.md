# Cliff wall re-cut

The cliff sheets the art desk signed (mibi-art c335654cc, `art-jobs/2026-11-10-art-paint-terrain-cliff/out/tiles/`) carried two flaws once the soft shade was keyed away:
opaque specks left by the dither band beyond the east wall (and under the face), and a column of five pale pixels inside the west wall at the face's south-west foot.

These sheets are the earlier cut, run again from the same painted island and the same windows (`source/cut.py`), no pixel drawn. The thin side walls, the small square top corners and the face windows are as signed. Three changes, all in `keyed()`:

- every opaque piece apart from the island (4-connected, under 10 px) is keyed out of the keyed island before the tiles are cut;
- the c3 island's east wall has nothing beyond its outer outline: the opaque dither pixels in the three columns past it (47 pixels) are keyed out too;
- inside the c3 west wall (columns 8 to 14, rows 100 to 141) the pale lip highlight (grass_pale, the five pixels) is taken to the stone tone round it (rock_w_lt), a palette-to-palette map like the one the cut already makes for the plateau's grass tones.

`cut-recut.diff` is the whole change to `cut.py`. The six sheets here replace the desk's `over-cliff`, `over-cliff~s1`, `over-cliff~s2`, `over-cliff~s3`, `over-cliff-face2~s3` and `over-cliff-face3~s3`; `tools/desk-art.mjs` reads them, brings them to the map palette with the desk's colour map (`tools/recolour.mjs`; these files stay in the old palette), keys the soft shade as before and records them in `DESK.json`.
