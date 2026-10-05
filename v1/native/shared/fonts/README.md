# Native font assets

Unmodified Bitstream Vera Sans (`Vera.ttf`) and Vera Sans Bold (`VeraBd.ttf`) is supplied by the ReportLab font distribution. Its exact bundled redistribution license is in [LICENSE.txt](LICENSE.txt). Regular font SHA-256: `c4c45690b345435b2cba52ecabe275f05e49b389b39fe68ad03afbb551288d3d`.

Bold font SHA-256: `cc037385e4d55bfde89b13e03091ee93bf40c0c52ddd391ff031ab276f13b8e9`. The Bold source is copied unmodified from the same ReportLab distribution and covered by the same [license](LICENSE.txt).

Regenerate from this directory with `python generate.py` and Pillow 12.3.0. Pass
`--lab` for regular and bold Lab atlases, `--heading` for both bold atlases, or
`--heading-narrow` for the condensed variant alone. Glyphs cover ASCII 32-126;
unsupported bytes display a question mark. Copy deliberately uses ASCII
punctuation. Each intended pixel size is independently rasterized with bearing,
advance and baseline metrics; no runtime scaling or rasterization occurs.
Generated coverage uses unsigned 8-bit alpha.

`portable_font_data.c` retains 9, 11, 20 and 24px masks (47,932 coverage bytes).
`lab_font_data.c` retains its original thirteen sizes in order and appends 14,
15, 16, 17, 20, 23, 25 and 27px for the reviewed expedition composition. Its
21 sizes contain 645,309 coverage bytes and use `LAB_FONT_COUNT`.

Both bold atlases retain 26, 32, 34 and 40px, then append 20, 23, 24, 25 and
27px, followed by compact 14, 16, 17 and 18px; `LAB_HEADING_FONT_COUNT` is
thirteen. The normal bold coverage is 371,140 bytes. The narrow atlas has 296,727
bytes with coverage, bearing and advance at
80% width using Lanczos resampling. Whole-number readouts can use normal bold.
Existing coverage and glyph records remain byte-identical prefixes; unchanged
regeneration was verified. Other scenes retain their existing sizes.

Missing Lab sizes assert rather than silently substituting smaller text. Glyph
records add 24 bytes per glyph on these targets. Lab atlases and scenes link into
the Linux Lab target; portable targets retain their separate portable assets.
Actual linker size reports remain build evidence.

Coverage blends into RGB with integer alpha; Probe thresholds coverage into its independent packed 1bpp scanline. All coordinates clip as signed values before indexing. No font module knows game state, filesystem or transport.
