# Design tokens

One source for every surface: `tokens.json` (W3C Design Tokens format). Colour values are the style guide's (`design/style-guide/README.md` §2), unchanged; spacing, type sizes, radii and motion times follow the UI design system outline.

| Group | Holds |
| --- | --- |
| `color.core` | the 48 colours the Station and the Companion share |
| `color.station` | the Station's own: instrument, housing, library, wood plate, reading screen |
| `color.companion` | the Companion's three sage colours (they differ from the Station's `sage` and `sageD`) |
| `space` | 4, 8, 16, 24, 32, 48 px |
| `size.web` / `size.station` / `size.companion` | web 12, 14, 16, 20, 28, 40 px; Station 16, 20, 28 px; Companion 2x, 3x |
| `radius` | 4, 6, 8, 12 px and round |
| `duration` | 160, 240, 300 ms |

## Build

`npm install` then `npm run build` in this folder (Style Dictionary 5.8.0). Outputs, committed in `out/`:

- `tokens.css`: CSS custom properties, every name prefixed `--mb-` (`--mb-bone`, `--mb-space-8`, `--mb-size-web-14`, `--mb-radius-6`, `--mb-duration-160`). The play page, the Station page, the Companion page and the test page link it; `ui/keys.css` and `play/options/options.css` read it.
- `station-palette.json`: the Station's palette data, same shape as `palettes/station.json`.
- `companion-colors.mjs`: the Companion's `PALETTE` (name, hex), as in `exploration/index.html`.

`npm test` compares the Station and Companion outputs with their sources, name by name.
