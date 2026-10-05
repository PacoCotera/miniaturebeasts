# Native builds and three-device simulation

The current playable target is `selected_lab`: native C17 rules, saved world,
focus and native frames, presented as Lab, combined Companion and Dock through
the browser transport. [Target interfaces](selected-lab/README.md),
[Pip play guide](selected-lab/V1.md) and the
[actual native gallery](../design/connected-device-review/native/README.md)
describe the integrated loop. The connected renderer uses retained Gemini resource
and creature sprites with native map/site presentation derived from the approved
expedition study. The broader catalogue remains unfinished.

| Program | Current compiler target | Evidence boundary |
| --- | --- | --- |
| Lab / selected game | Linux x86-64; Raspberry Pi4 Model B device reference | GCC, CMake, Ninja and C17; ARM build, HDMI/input drivers and Pi performance unverified. Not ESP-IDF. |
| Legacy Probe scaffold | `xiao_ble/nrf52840` (Arm Cortex-M4) | Zephyr 4.4.0 / GNU SDK 1.0.1; no physical boot or panel driver proof. Not a separate current portable. |
| Companion shared UI | `esp32s3` (Xtensa) | [Current Cargo/Probe/resident LVGL compile/link checked](../docs/evidence/native-companion-esp/README.md) under ESP-IDF5.5.5; panel/game/input/save/radio and runtime fit remain absent. |

[Devices](../specs/devices.md) owns physical roles and selected development
references. The simulator has one host authority and three logical contexts,
not independent endpoint stores or physical radio. Lab uses its accepted
cross/workspace/Back/Confirm panel; Companion uses directions/Back/Confirm;
Dock uses its depicted summary/print controls. No screen-click or touch shortcuts
are implied. [Experience](../specs/experience.md) owns action mappings.

## Current Lab build and checks

Use the installed toolchain on the established Linux build host. Fetch a clean,
committed revision through Git and verify the source revision before building;
executable and presenter must match. CMake 3.28 or later is required.

```bash
cmake -S native/lab -B native/build/lab -G Ninja \
  -DCMAKE_BUILD_TYPE=Release -DCRITTER_BUILD_SELECTED_LAB=ON
cmake --build native/build/lab
ctest --test-dir native/build/lab --output-on-failure
python3 native/tests/test_selected_presenter.py native/build/lab/selected-lab/selected_lab
```

CTest covers game domain, native input and three-device kit behavior. For changes
to the connected journey, use `python3 native/tests/test_kit_presenter.py BINARY` and
`python3 native/tests/test_v1_journey.py BINARY FRAME_DIRECTORY` as appropriate; the latter
plays the timed research/incubation/restart loop and captures native output.
Reset has `python3 native/tests/test_sandbox_reset.py BINARY`. Check results against the
actual revision; commands alone are not completed evidence. Current validation
is recorded in [status](../STATUS.md).

## Play through the browser presenter

```bash
export CRITTER_DEMO_BINARY="$PWD/native/build/lab/selected-lab/selected_lab"
export BEECHO_V1_SAVE="$HOME/beecho-saves/play-world"
mkdir -p "$(dirname "$BEECHO_V1_SAVE")"
python3 native/presenter/server.py
```

Open `http://127.0.0.1:4180`. The presenter runs `kit-serve`. Native code owns
focus, gathering, transfer acceptance, research, incubation and persistence;
Python/JavaScript bridge controls and frames. Mode preview and action entry are
separate; fresh Accept unloads once and ends the expedition. The receipt only
closes transport metadata. [Architecture](../native/selected-lab/README.md#state-and-recovery)
owns recovery and exact authority; [V1](selected-lab/V1.md) owns provisional fixture
values. Historical resource fractions are not current inventory.

The configured save and `.kit` / `.kit.required` sidecars form one durable world.
Keep them outside release bundles and back them up together. Reset sandbox is
above the shells, preserves a recoverable world backup and rejects old input;
[target reset documentation](selected-lab/README.md#resetting-the-simulator-sandbox)
owns operator recovery. The default save derives from `CRITTER_DEMO_SAVE` plus
`.beecho-v1` if `BEECHO_V1_SAVE` is unset. Set an absolute path deliberately.

The bridge retains optional HTTP Basic authentication (`CRITTER_DEMO_PASSWORD`,
username `lab`), same-origin input validation and loopback binding. Use HTTPS
for external access. All visitors share the same simulated world. Native BMP
frames are losslessly gzip-compressed when negotiated; host scaling and transport
do not establish physical readability, display refresh or radio latency.

## Existing toolchain setup and legacy build fixtures

The commands below preserve the release-pinned setup and older compiler evidence.
They are not a requirement to rebuild unchanged MCU scaffolds for Lab work.
Legacy `critter_lab` is a separate domain CLI; `selected_lab serve` is the older
single-Lab regression fixture. The deployed current presenter uses kit mode.

## Ubuntu build environment

Use Ubuntu 24.04 x86-64 with Python 3.12. SDK sources and release versions are recorded in [toolchains.env](toolchains.env). The workflow uses the same build commands and prints toolchain and size information in its console output. Ubuntu packages and transitive Python dependencies are not fully locked, so this is a repeatable release-pinned setup, not a byte-identical toolchain archive.

For a normal passing check, record the source revision, CI run link and a concise
result when needed. The Actions console log contains routine test results;
generated frames and build scratch stay on the disposable runner. Successful
PR and push builds do not retain separate test reports, screenshots, maps,
package lists or MCU binaries by default. Original references, fixtures and
deliberately retained art or acceptance evidence remain separate.

CI retains artifacts only for these purposes:

- A push to `main` retains only the staging tarball in `native-lab-COMMIT` for
  one day, so the publication job can retrieve it after all target checks pass.
  Published releases retain the bundle and delivery provenance described in
  [the CI release guide](UPDATER.md). A delayed publication retry after artifact
  expiry requires rerunning the build jobs to recreate the handoff.
- A failed job retains available CMake, CTest or ESP-IDF diagnostic logs for
  seven days. Missing diagnostic files are ignored; the Actions console log
  remains available for failures before those files are created.
- An explicitly dispatched run with `retain_firmware` enabled retains successful
  Probe ELF/bin and Companion/Caddy ELF/bin, bootloader, partition table and
  flash arguments for seven days. These are compiled exports for inspection or
  board experiments; they do not establish physical boot or runtime performance.

From the repository root, use Bash. Keep the SDK workspace outside the repository. The following setup commands reproduce the pinned CI environment. Reuse installed SDKs for normal builds. Run legacy Probe and Companion setup in separate shells to avoid mixing their Python environments.

```bash
sudo apt-get update
sudo apt-get install -y --no-install-recommends git build-essential cmake ninja-build \
  python3.12-venv python3.12-dev gperf device-tree-compiler xz-utils \
  libffi-dev libssl-dev dfu-util
export CRITTER_SOURCE="$PWD"
export CRITTER_TOOLS="$HOME/critter-native-tools"
mkdir -p "$CRITTER_TOOLS"
source native/toolchains.env
```

### Legacy Lab fixture

```bash
native/build/lab/critter_lab --save /tmp/critter-demo-state.txt status
python3 native/tests/test_native.py native/build/lab/critter_lab
size native/build/lab/critter_lab
```

This earlier fixture starts at revision 0 with Select available. Its ELF and map
are separate from `native/build/lab/selected-lab/selected_lab`; do not substitute
its command protocol for the current game.

### Staging bundle

The Lab CI job packages the already-tested Linux x86-64 executable and the presenter
`server.py`, HTML, CSS and JavaScript from the same checkout. It also includes a
generated `release.json` and a concise `MANIFEST.txt` containing the full commit,
platform, byte sizes and SHA-256 hashes. The archive is deterministic for a given
checkout and executable: file order, ownership, permissions and timestamps are
normalized, with the commit timestamp used for its payload entries. Source metadata
records that instant as `committed_at`; the bundled `deployed_at` is always null, so
an undeployed staging input never claims an activation.

Create and independently verify the bundle from the repository root:

```bash
python3 native/package_staging.py create \
  --binary native/build/lab/selected-lab/selected_lab \
  --output native/build/lab/critter-lab-staging.tar.gz
python3 native/package_staging.py verify \
  native/build/lab/critter-lab-staging.tar.gz \
  --commit "$(git rev-parse HEAD)"
```

Creation refuses to overwrite an existing archive, including a file created during
publication, checks `GITHUB_SHA` when present, and refuses tracked presenter inputs
whose index or worktree differs from HEAD. Presenter bytes are read from HEAD's Git
objects. Verification fails closed for unexpected or unsafe
members, links, duplicate paths, non-normalized metadata, revision disagreement,
or content that does not match the manifest. The bundle is only a staging input;
it does not install, publish, run a service or provide remote access. Runtime state
is deliberately excluded: no save, lock, log, credential, environment file or
other mutable presenter data is packaged. Legacy domain callers keep `CRITTER_DEMO_SAVE` outside the
unpacked bundle when starting the presenter.

After verification and extraction, an operator may create activation metadata
before starting the presenter by atomically replacing the adjacent
`presenter/release.json`: it preserves `commit`, `subject`, and `committed_at` and
sets `deployed_at` to the actual activation instant as a timezone-aware RFC 3339
value (including the applicable `America/Mexico_City` offset). Activation is
deliberately outside this bundle creator and does not mutate the
archive, install or update software, or touch save state. Until then, the existing
footer continues to say release metadata is unavailable; once supplied, it formats
the actual activation time for Mexico City.

### Legacy domain CLI

`native/build/lab/critter_lab --save /absolute/path status` retains the earlier
saved expedition/research fixture. Its `command NAME EXPECTED_REVISION OPERATION_ID`
and `frame lab|probe REVISION` interfaces are separate from the current kit target.

### Probe

One-time setup, with `CRITTER_SOURCE`, `CRITTER_TOOLS` and manifest variables from above:

```bash
python3.12 -m venv "$CRITTER_TOOLS/zephyr-venv"
source "$CRITTER_TOOLS/zephyr-venv/bin/activate"
pip install "west==$WEST_VERSION"
west init -m https://github.com/zephyrproject-rtos/zephyr \
  --mr "$ZEPHYR_TAG" "$CRITTER_TOOLS/zephyr-workspace"
cd "$CRITTER_TOOLS/zephyr-workspace"
test "$(git -C zephyr rev-parse HEAD)" = "$ZEPHYR_REVISION"
west update hal_nordic cmsis cmsis_6
west zephyr-export
pip install -r zephyr/scripts/requirements-base.txt
west sdk install --version "$ZEPHYR_SDK_VERSION" \
  --gnu-toolchains arm-zephyr-eabi --no-hosttools
cd "$CRITTER_SOURCE"
```

Build in an activated Zephyr shell:

```bash
source native/toolchains.env
source "$CRITTER_TOOLS/zephyr-venv/bin/activate"
export ZEPHYR_BASE="$CRITTER_TOOLS/zephyr-workspace/zephyr"
export ZEPHYR_SDK_INSTALL_DIR="$HOME/zephyr-sdk-$ZEPHYR_SDK_VERSION"
export ZEPHYR_TOOLCHAIN_VARIANT=zephyr
west build -b "$PROBE_BOARD" native/probe -d native/build/probe
"$ZEPHYR_SDK_INSTALL_DIR/gnu/arm-zephyr-eabi/bin/arm-zephyr-eabi-size" \
  native/build/probe/zephyr/zephyr.elf
```

ELF, binary and map are in `native/build/probe/zephyr/`. Only the modules used by this minimal board build are fetched. Future subsystem additions must extend that set deliberately. The SDK installer verifies downloaded release archives against the publisher's checksums; it installs only the Arm compiler, without emulation/debugging host tools.

### Companion

In a fresh shell, restore the root directory, `CRITTER_SOURCE`, `CRITTER_TOOLS` and manifest variables. The SDK installer chooses tool versions from its pinned source manifest and verifies their hashes.

```bash
git clone --branch "$IDF_TAG" --depth 1 --recursive --shallow-submodules \
  https://github.com/espressif/esp-idf.git "$CRITTER_TOOLS/esp-idf"
test "$(git -C "$CRITTER_TOOLS/esp-idf" rev-parse HEAD)" = "$IDF_REVISION"
python3.12 "$CRITTER_TOOLS/esp-idf/tools/idf_tools.py" install --targets="$COMPANION_TARGET"
python3.12 "$CRITTER_TOOLS/esp-idf/tools/idf_tools.py" install-python-env
source "$CRITTER_TOOLS/esp-idf/export.sh"
idf.py -C native/companion -B "$CRITTER_SOURCE/native/build/companion" set-target "$COMPANION_TARGET"
idf.py -C native/companion -B "$CRITTER_SOURCE/native/build/companion" build
idf.py -C native/companion -B "$CRITTER_SOURCE/native/build/companion" size
```

The application ELF/bin/map, bootloader and partition binary are under `native/build/companion/`. `sdkconfig` is generated locally and ignored; no product partition or flash-capacity contract is established.

## What the evidence means

Successful target builds establish compiler/linker compatibility and the scaffold's static allocations. The Linux checks exercise the fixture's transitions, saved state, retry handling, native frames and authenticated HTTP boundary. Boot logs for the two MCU targets remain unobserved until run on physical boards. Static size reports do not measure stack/heap peaks, peripheral timing, radio behavior, display refresh, energy or thermal performance. The MCU scaffold builds do not emulate ESP32-S3 or nRF52840 hardware; the current game simulator is the separate Linux host target described above.

See the [hardware-native development requirement](../docs/builders/foundation-demo.md#what-the-experiment-isolates) and [device constraints](../specs/devices.md). Framework references: [Zephyr SDK setup](https://docs.zephyrproject.org/latest/develop/toolchains/zephyr_sdk.html), [XIAO BLE board](https://docs.zephyrproject.org/latest/boards/seeed/xiao_ble/doc/index.html), and [ESP-IDF ESP32-S3 setup](https://docs.espressif.com/projects/esp-idf/en/v5.5.5/esp32s3/get-started/linux-macos-setup.html).

## Current display and release contracts

The current kit frames are Lab 1024×600 RGB, Companion 450×600 RGB and Dock
792×272 four-gray output. Dock and every known Companion page compose through
LVGL; all current Lab host families also compose through LVGL. Native frames and BMP transport are defined in
[the selected target](selected-lab/README.md). Earlier Probe/Companion profile
sizes belong to legacy MCU fixtures; they do not describe the current simulator.
[Font provenance](shared/fonts/README.md) retains licensing and source hashes.

The presenter reads validated adjacent `release.json` metadata at startup and
exposes it through `/api/release`. The footer shows the revision and activation
time in `America/Mexico_City`; missing metadata is a development build. The
[CI release guide](UPDATER.md) owns packaging/provenance. No saved world,
credential or private deployment detail belongs in a release bundle or metadata.

Screen action labels refer to physical-control focus, not touch regions. Only
painted frames become ready for input; semantic changes reject obsolete actions,
while time-only refresh preserves an eligible gesture. Browser suspension,
overlap and uncertain acknowledgement cannot replay a stale release. These are
host transport checks, not production device/radio validation.
