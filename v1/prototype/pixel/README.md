# Static device pixel study

Run `node prototype/pixel/export.mjs` from the repository root. Outputs are in `design/reviews/pixel-01/`; its transcript identifies all provisional fixtures. Run `node --test prototype/tests/pixel-renderer.test.mjs` for isolated validation.

`fixtures.mjs` supplies immutable read-only view data. `assets.mjs` authors 64 × 64 bitmap masks; `font.mjs` supplies 5 × 7 glyphs. `renderer.mjs` composes 320 × 240 indexed buffers without time, IO or domain mutations. `png.mjs` handles PNG encoding; only `export.mjs` writes files. Geometry is an experimental fixed layout, not a selected hardware specification.

The host buffer retains 76,800 bytes for either profile. Mono pixels are binary but are not packed into bits. PNG export uses temporary scanline/compression buffers and is not a firmware memory benchmark. Asset masks use ordinary frozen JavaScript arrays (4,096 numeric entries each), not packed flash assets. The font implements uppercase, digits and the punctuation required by these scenes; unsupported glyphs visibly fall back to a box. The proposed full 96-slot face remains future work.

These three stills have no input controller, readiness adapter, animation, persistence, scan code or real genetics connection. Family silhouette and creature art are authored placeholders awaiting UX/design review. Research progress is a supplied fixture, not elapsed time. Hardware display behavior, memory fit and native-size legibility need independent review and bench evidence.
