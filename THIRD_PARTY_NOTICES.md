# Third-party materials

Dependencies retain their original licenses; the project's licenses do not replace them. The lockfile records exact versions and license identifiers. Preserve upstream copyright, license and applicable NOTICE files when distributing dependencies or bundles.

| Direct dependency | Version | Upstream license |
| --- | --- | --- |
| qrcode | 1.5.4 | MIT |
| jsqr (development) | 1.4.0 | Apache-2.0 |
| LVGL (native device UI) | 9.6.0 /80ca777e37a2b176770726a02e07a6fb79ef0b39 | MIT |

The current lockfile also includes transitive packages under MIT and ISC. Consult the license files distributed with each installed package for full terms and authorship. This repository does not vendor those package implementations.

Optional browser-validation installations, including Playwright and Chromium, retain their own upstream terms and notices; they are not relicensed by Miniature Beasts. Any future imported fonts, sprites, models or other assets must carry source and license information before inclusion.


The native UI vendors the unmodified Bitstream Vera Sans font and derived glyph masks. Its original copyright and redistribution terms are preserved in [the font license](v1/native/shared/fonts/LICENSE.txt); [provenance and regeneration](v1/native/shared/fonts/README.md) records the exact source hash and tool version. These font assets retain those terms rather than being relicensed as original game art.

LVGL is vendored unchanged under `v1/native/vendor/lvgl`, with its upstream
`LICENCE.txt`, source provenance and retained-file hashes. Its MIT copyright and
permission notice is also included in the packaged presenter HTML alongside the
linked native binary. The project license does not replace upstream terms.
