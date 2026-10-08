# Companion 48 px redraw

The pixel masters for the Companion at 48 px tiles, per [`design/proposals/companion-48px-redraw.md`](../../design/proposals/companion-48px-redraw.md).

- [`palette/`](palette/README.md): the 48 colours, identical to the page's `PALETTE`, with the shade, dither and mix tables, signed.
- [`review-place/`](review-place/README.md): round 1, the meadow and pond edge in a storm, every piece at 1× as indexed sheets with atlases, contact sheets and a composed still.
- [`tools/`](tools/): the palette loader, the down-render pipeline (key, crop, resize, quantise, despeckle, outline), the scripted pieces, the packer, the checks and the still composer. Run with `python3 -I`.
