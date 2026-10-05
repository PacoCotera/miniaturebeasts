# Current Companion UI compiled for ESP32-S3

Checked source: `fadee5da15d2574f8c7385fc7cb6fb1a73950883`.
The exact clean pushed revision was retrieved through Git and built with the
installed ESP-IDF 5.5.5, pinned revision
`b774170ff46c393eeb5e495ea37936038d3f4f4f`, Xtensa toolchain and Python 3.12.
[CI run 191](https://github.com/PacoCotera/critter-lab/actions/runs/36864240546)
also passed all three native jobs, including the current shared Companion and
Dock UI. Independent architecture/source and embedded artifact reviews passed
this bounded compile/link outcome.

This replaces the old Companion scanline demo. The ELF links the same retained
Cargo, Probe and resident trees, partial display boundary, image/font bridge,
theme and pinned LVGL used by the host. Copied Probe map/material facts contain
no Kit or game authority. Registered sources and linked symbols exclude the
host frame adapter, manual compositor, game/Kit/save and legacy demo functions.
[Verification](verification.json) records the exact ELF/bin/map/config and
manifest hashes, required symbols and absent prohibited symbols.

[Static size report](size.txt) separates linked flash, DIRAM, IRAM and RTC output.

| Linked static category | Bytes |
| --- | ---: |
| Flash data | 1,105,028 |
| Flash code | 222,554 |
| DIRAM total | 316,787 |
| DIRAM BSS / data / text | 264,784 / 11,456 / 40,547 |
| Separate IRAM | 16,384 |
| RTC slow / fast | 32 / 24 |

The LVGL pool is already included in BSS. The reported 24,973-byte DIRAM remainder
is a static region remainder, not measured available runtime heap.

The app image is 1,396,112 bytes. Its measured overflow of the default 1 MiB factory
partition required the SDK's standard 1,500 KiB single-factory partition, without
OTA. This is a compile configuration, not a physical-board or flash-budget
approval.

generated manifest in its Companion artifact.

[Exact asset manifest](assets.json) includes nine current core images, the
136 × 144 empty habitat, all 29 unchanged 32 × 32 field sprites and five original
antialiased Vera font sizes: title 26, action 20, body 18, small 16 and quantity 28.
Source identities, pixels, centers, glyph coverage, metrics and baselines are
preserved. Local regeneration equals the VM manifest. Source backing totals
941,704 RGBA bytes and 101,556 glyph-coverage bytes; extraction creates no new art.

Configured allocations are a 256 KiB LVGL pool, a 10,800-byte partial draw buffer and
additional image conversion heap. All image conversions together need another
941,704 bytes. These are configured demands, not measured runtime use. Exact
decoded art plus the pool cannot fit bare internal RAM; no PSRAM/BSP is configured.
The checked450×600 RGB888 workpiece is the combined-device reference; the earlier
Runtime memory strategy and physical geometry remain unresolved.

The headless harness references synthetic Cargo/Send/Discard/Finish, Probe and
resident states, with lazy resident creation and borrowed backing destroyed
after its consumers. It discards validated partial pixels into counters; no
full frame is retained and no visible-frame acknowledgement is fabricated.
Fixture logs and warm-update checks were not executed on an ESP32 and are not
runtime evidence. No screen/control composition changed in this compile pass.

Four affected host suites passed at `19140c1` before the formatting correction;
the focused Probe check passed again at the final source. Portable `PRIu32`
formatting preserves whole-unit text across host and Xtensa typedefs.

This proof does not establish firmware gameplay, hardware boot, frame rate,
panel/input/save/radio drivers, stack/heap fit or physical performance. All known
Companion and Dock host pages used LVGL at this revision. Current all-device
Build entry: [Companion target](../../../native/companion/README.md).
