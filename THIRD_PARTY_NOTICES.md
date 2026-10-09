# Third-party materials

Dependencies retain their original licenses; the project's licenses do not replace them. The lockfile records exact versions and license identifiers. Preserve upstream copyright, license and applicable NOTICE files when distributing dependencies or bundles.

| Direct dependency | Version | Upstream license |
| --- | --- | --- |
| qrcode | 1.5.4 | MIT |
| jsqr (development) | 1.4.0 | Apache-2.0 |
| LVGL (native device UI) | 9.6.0 /80ca777e37a2b176770726a02e07a6fb79ef0b39 | MIT |
| jsmn (the Station face's JSON tokenizer) | zserge/jsmn `jsmn.h`, unmodified (SHA-256 `c04533e9181e1e33baceb0f55ac449b05145bb936e8c68cc77dfe0d8277514fb`) | MIT |

The current lockfile also includes transitive packages under MIT and ISC. Consult the license files distributed with each installed package for full terms and authorship. This repository does not vendor those package implementations.

Optional browser-validation installations, including Playwright and Chromium, retain their own upstream terms and notices; they are not relicensed by Miniature Beasts. Any future imported fonts, sprites, models or other assets must carry source and license information before inclusion.


The native UI vendors the unmodified Bitstream Vera Sans font and derived glyph masks. Its original copyright and redistribution terms are preserved in [the font license](v1/native/shared/fonts/LICENSE.txt); [provenance and regeneration](v1/native/shared/fonts/README.md) records the exact source hash and tool version. These font assets retain those terms rather than being relicensed as original game art.

The Station page's type is Inter 4.1 by The Inter Project Authors, bundled under the SIL Open Font License 1.1 as `prototypes/ui/fonts/inter/src/` (the Regular, Medium and SemiBold TrueType files of the upstream release at https://github.com/rsms/inter/releases/tag/v4.1 with the tnum feature frozen in by opentype-feature-freezer, which is a modification the licence allows; the sources the type atlases are baked from), with the upstream licence text beside them in [LICENSE.txt](prototypes/ui/fonts/inter/LICENSE.txt). The fonts retain the OFL's terms, including its reserved font name, and are not relicensed with the project.

The Station's type is drawn from glyph atlases baked from Inter 4.1 (the same release's Regular, Medium and SemiBold TrueType files, with the tnum feature frozen in by opentype-feature-freezer so the figures are Inter's tabular ones), kept in the repository as `prototypes/ui/fonts/inter/src/` with their hashes in `SHA256SUMS` at 16, 20 and 28 px with [lv_font_conv](https://github.com/lvgl/lv_font_conv) 1.5.3 (MIT), as `prototypes/ui/fonts/atlas/` (a PNG of glyph coverage and a JSON of metrics per face; the tool is `prototypes/ui/tools/bake-type.mjs`). The atlases are derived from Inter and keep the OFL's terms; the licence text beside the bundled fonts applies to them.

LVGL is vendored unchanged under `v1/native/vendor/lvgl`, with its upstream
`LICENCE.txt`, source provenance and retained-file hashes. Its MIT copyright and
permission notice is also included in the packaged presenter HTML alongside the
linked native binary. The project license does not replace upstream terms.

jsmn, a one-header JSON tokenizer by Serge Zaitsev (MIT, copyright 2010), is vendored unchanged as `prototypes/face/src/vendor/jsmn.h` with its licence text in the file header. The Station face parses its spec files and the bridge's messages with it (design/proposals/lvgl-switch.md §2.3).
