# Current Companion shared UI: ESP-IDF compile harness

This target compiles the current
Cargo, Probe and resident LVGL compositions, the shared partial display boundary,
exact source images and antialiased Vera fonts. It is an explicitly synthetic
headless compile/link proof, not current game firmware or a physical panel driver.

Use the installed pinned ESP-IDF5.5.5/ESP32-S3 toolchain from
[toolchains.env](../toolchains.env), after sourcing its `export.sh`:

```sh
idf.py -C native/companion -B native/build/companion set-target esp32s3
idf.py -C native/companion -B native/build/companion build
idf.py -C native/companion -B native/build/companion size
```

The project produces `critter_companion_ui.elf`, `.bin` and `.map`. Compile
validation passes at `fadee5d` with independent source/artifact review; see
[current target evidence](../../docs/evidence/native-companion-esp/README.md). CI run 190 linked a 1,396,112-byte
image, exceeding the default 1 MiB factory partition. The target therefore uses
the SDK's standard 1,500 KiB single-factory partition, without OTA. This compile
configuration does not select a physical board or approve its flash budget.
No PSRAM, BSP, GPIO, screen/input driver, radio or board revision is configured.

Shared source is `native/ui/display.c`, Cargo/resident trees, Probe UI/geometry,
the existing font/image bridge and theme. No `native_ui.c`, `host_frame.c`, Kit,
game implementation, save/POSIX adapter or manual screen compositor is linked.
Probe now receives copied map facts and projected material identities; resource
classification remains in the host's game projection. No gameplay mapping changes.

`extract_assets.py` imports the established Caddy exact-byte/font selector. Its
generated C/JSON stay in the build directory. Nine current core images, the empty
habitat and all29 unchanged field sprites preserve original pixels/source hashes.
The exact five Companion font sizes are heading26/action20, body18/small16 and
quantity28, including coverage, metrics and baselines. Configured source backing
is941704 RGBA bytes and101556 glyph-coverage bytes, before descriptors/metrics.
The unchanged bridge additionally converts image pixels into heap ARGB8888.

The provisional profile is450×600 RGB888 with8-full-row-capacity partial drawing
(10800 bytes), matching the current workpiece, **not** the selected preliminary
368×448 physical panel. Geometry/driver compatibility is unvalidated. The256KiB
LVGL pool is the existing host software bound, not a board memory budget. All
three families are retained on one display; resident composition is created
lazily. Exact converted portraits plus the pool cannot be assumed to fit bare
internal RAM. This is an unresolved runtime allocation issue; successful linking
cannot establish PSRAM use, hardware fit, frame rate, responsiveness or boot.

The synthetic app visits each composition family and discards validated partial
pixels into counters/checksum. No full-frame backing, visible-frame acknowledgment,
game command or fake Kit snapshot exists. Optional logged pool/flush/warm-update
checks are instrumentation; none is a measured ESP runtime result until executed
on separately authorized hardware. Trees/group/display are destroyed before
borrowed image/font/draw backing. Failure leaves no game state to lose.

The [architecture coverage](../../native/ui/README.md#screen-coverage-and-target-evidence)
distinguishes host behavior, current shared UI compilation and physical evidence.
