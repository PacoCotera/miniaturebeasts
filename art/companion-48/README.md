# Companion 48 px redraw

The pixel masters for the Companion at 48 px tiles, per [`design/proposals/companion-48px-redraw.md`](../../design/proposals/companion-48px-redraw.md).

- [`palette/`](palette/README.md): the 48 colours, identical to the page's `PALETTE`, with the shade, dither and mix tables, signed.
- [`terrain/meadow/`](terrain/meadow/meadow.json): the meadow terrain drop for the 48 px places. It holds six 8-bit indexed sheets, `meadow.json` (each piece signed or candidate, with its offset) and `meadow-palette.json` (the core 48, then the meadow's 48, with their tables). [`tools/build-meadow-drop.py`](tools/build-meadow-drop.py) builds it from its inputs in [`terrain/grass/`](terrain/grass/README.md) (`python3 -I tools/build-meadow-drop.py OUT PROOF`).
- [`review-place/`](review-place/README.md): round 1, the meadow and pond edge in a storm, every piece at 1× as indexed sheets with atlases, contact sheets and a composed still.
- [`type/`](type/README.md): the Mibi 7×9 bitmap face as a master glyph sheet (text source, indexed PNG, JSON atlas, contact sheets at 1×, 2× and 3×), built by `tools/build-mibi.py`. Signed by the art director, 2026-10-08.
- [`tools/`](tools/): the palette loader, the down-render pipeline (key, crop, resize, quantise, despeckle, outline), the scripted pieces, the packer, the checks and the still composer. Run with `python3 -I`.
