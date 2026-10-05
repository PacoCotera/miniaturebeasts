# Same Dock UI compiled for ESP32-S3

Checked source: `c3c8a6da4dbf0a5bdf350d6067b13033309203af`.
The clean GitHub-pushed revision was retrieved through Git and built with
ESP-IDF5.5.5, pinned SDK revision `b774170ff46c393eeb5e495ea37936038d3f4f4f`,
the established ESP32-S3 Xtensa toolchain and Python3.12. Native-targets
[CI run166](https://github.com/PacoCotera/critter-lab/actions/runs/36836278938)
also passed, including the current Caddy UI step alongside the separately
labeled legacy Companion scaffold. Independent technical review consumed the
actual ELF/map, size and manifest and passed this compile/link boundary.

This headless target compiles the same `native/ui/dock_ui.c`, `display.c`, plain
DockView and existing image/font callbacks used by the host. It excludes Kit,
game/save authority, host full-frame storage and manual screen composition.
Linked symbols confirm the shared UI, LVGL labels/rendering, font and image
adapters. Registration and actual ELF symbol checks confirm excluded boundaries.
No software screen, physical panel, input or device was run by this proof.

| Measured linked output | Bytes |
| --- | ---: |
| App binary, including padding | 469584 |
| Reported total image before padding | 469469 |
| Flash code | 210870 |
| Flash data | 190180 |
| DIRAM | 152947 |
| DIRAM BSS / data / code | 100944 /11456 /40547 |
| Separate IRAM region | 16384 |
| RTC slow / fast | 32 /24 |

The ELF includes debugging information and is5723332bytes; map is3393579bytes.
These are linked file/static section measurements, not runtime heap or hardware
fit. [Artifact verification](esp32-verification.json) retains exact hashes.


under its `native-caddy-ui` artifact.

The target config reserves a96KiB LVGL pool; the792×272 RGB888 draw profile uses
eight rows,19008bytes. Six converted icons need30720heap bytes. These are
configured allocation bounds; runtime free heap, peaks, stacks and panel-compatible
buffers remain unmeasured. No PSRAM component is included. There is no full host
RGB frame in this target. Buffer consumption does not acknowledge visible output.

[Asset manifest](esp32-assets.json) records exact selected source hashes:
six existing32×40 Dock icons with unchanged pixels/identity/optical centers;
four existing Vera fonts26/22/18/32px, their baselines, all95 ASCII glyphs and
coverage hashes. Build-local extraction keeps30720RGBA and102296coverage bytes,
with glyph offsets rebased. It creates no new artwork or duplicate maintained
asset library. Original tables remain unchanged. Portable `PRIu32` formatting
preserves stock/count/visit text across host and Xtensa integer typedefs; the
focused host Dock check passes the shared correction.

Scope: current shared Dock UI compile/link only. Board boot, actual frame output,
e-paper encoding/refresh, physical controls, local authority/storage, radio,
printer, charging and measured memory/power remain separate gates.

Companion routes and every Lab family remain required LVGL migration work.
Build entry: [Caddy target](../../../native/caddy/README.md).
