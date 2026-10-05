# Caddy shared Dock UI: ESP-IDF headless compile harness

This target compiles the **same** `native/ui/display.c` and `dock_ui.c` used by
the host Dock family, plus the unchanged Vera/image bridge in
`selected-lab/ui_assets.c`. It accepts the same plain `DockView`. It does not
compile `host_frame.c`, Kit, game authority, save/POSIX code or a manual screen
renderer. Source registration uses standard IDF components and the pinned
unchanged LVGL9.6.0 source in `native/vendor/lvgl`.

Build with the established ESP-IDF5.5.5 (`b774170ff46c393eeb5e495ea37936038d3f4f4f`)
and ESP32-S3 toolchain from [the release pins](../toolchains.env), after sourcing
that installed SDK's `export.sh`:

```sh
idf.py -C native/caddy -B native/build/caddy set-target esp32s3
idf.py -C native/caddy -B native/build/caddy build
idf.py -C native/caddy -B native/build/caddy size
```

The project name produces `critter_caddy_ui.elf`, `.bin` and `.map`. Retain those
and the size report for link/flash/static-RAM inspection. A successful build
establishes an ESP32-S3 compile/link boundary for the current shared Dock UI.
It does not establish board boot, a visible screen, physical input, radio,
storage, printer, charging, refresh time, power or available hardware memory.
No board, panel, BSP, new dependency or SDK upgrade is selected here.

The target has no full-frame allocation. Its profile is 792x272 RGB888 with an
8-row partial draw buffer (19,008 bytes with the current stride alignment).
The single Dock LVGL pool is provisionally bounded at 96 KiB. Six existing icon
images are converted by the existing bridge into 30,720 heap bytes. No PSRAM
component is included. These configured byte bounds are distinct from measured
ELF/map size and runtime heap/stack consumption; compile-only evidence cannot prove runtime
fit or arbitrary upstream allocation-failure recovery.

`app_main` is an explicitly synthetic headless fixture runner. It composes World,
Supplies, Connections, an opened World page, both print-review choices, offline
Connections and a storage error, then repeats retained updates. Its sink consumes
validated partial areas into scalar counters/checksum and immediately releases
the buffer. It does not retain an image or mark a frame visible. If run on a
separately authorized compatible device, logs report pool used/peak/free,
partial flushes/maxbytes, source/converted asset storage, font coverage,
four-gray transport counters and internal heap free/largest/minimum. Those
counters are instrumentation, not current runtime measurements. No simulator
Kit snapshot is copied into firmware or claimed authoritative.

`extract_assets.py` runs with IDF's existing Python during CMake configuration.
It selects only the six 32x40 Dock source icons and existing Vera 26px title,
22px body, 18px small and 32px quantity fonts. It preserves every selected RGBA
byte, ASCII32–126 coverage byte, baseline, bearing and advance; glyph offsets
are rebased into the subset backing. Existing source descriptors retain their
source IDs, hashes, optical centers and dimensions. Missing expected symbols,
sizes, glyph coverage or changed icon footprints fail extraction.

The generated `dock_assets.c` and `dock_assets.json` stay in the build directory.
The JSON records original table hashes, icon byte hashes, selected font coverage
and metric hashes. Current selected backing totals are 30,720 RGBA bytes and
102,296 glyph-coverage bytes, plus descriptors/metrics. Original art/font tables
remain unchanged; the subset is neither new artwork nor an independently
maintained duplicate asset set.

The local `components/lvgl` wrapper registers the vendor's unchanged source set.
The upstream ESP CMake helper names examples/demos include directories omitted
from this deliberate vendor subset; the wrapper omits those absent directories
and supplies this target's config. No vendor file is patched or downloaded.
The host and this target share software formats and widget support; only the
single-target pool bound and partial draw profile differ. Later panel/input,
storage and transport adapters require separate product scope and evidence.
