# The Station's face (LVGL)

The Station's screens are drawn by LVGL 9.6 in C, the same face on the sandbox (WebAssembly), the Raspberry Pi (native Linux) and, with a different display driver, the devices ([technical-architecture.md §8](../../design/proposals/technical-architecture.md#8-assessment-the-real-lvgl-face-in-the-sandbox-now)). The rules, the views, the spec files, the assets, the save and the Caddy client stay where they are: JavaScript and data, in `prototypes/station` and `prototypes/ui`. The face is thin: props in, intents out.

**The plan from here is [lvgl-switch.md](../../design/proposals/lvgl-switch.md)** (decided 2026-10-09): the face becomes props in, intents out, with the vocabulary and the layout rules in C, and every screen moves to it in order (L2.0 the platform and Pods, then L2.1 to L2.5, then L3). **The default face is still the JavaScript one**; `?face=lvgl` shows this one. From the freeze commit the JavaScript drawing layer takes no change and no new import: `deprecated.json` lists its modules with their hashes and allowed importers, `tools/freeze-check.mjs` checks it in the site workflow (and `tests/freeze.test.mjs` tests the check), and the workflow also runs on pull requests. **Where L2.0 stands (branch `l20-pods`):** the bridge, the spec loader, the primitives, the focus port, the frame's words, Pods' words and layout rules in C, the focus ring composed by the face, the animation events, the metrics table and the image baker are built and tested; the Pods screen is drawn from **props** by C words (`views/pods-props.mjs` beside the view the JavaScript drawing still uses), pixel for pixel what the JavaScript components drew in 30 scenes. Still to come in L2.0 (B4): the SDL and DRM builds, the Node host playing Pods against the face, the goldens and the journey on both faces, and Pods switched to the face by default with its JavaScript drawing deleted. The status paragraph below describes the node path, which the words replace screen by screen.

**Status: L2, the Pods screen on the face, after L1 (the frame) and L1b (the slanted rail).** The face draws the Pods screen whole (the room, the dish, the pod from its signed layers, the wells, the page, the rail, the rings, the frame) from the same nodes the canvas renderer takes; the frame check compares the two renderings pixel for pixel outside the type. The nine-slice reads its insets (left, top, right, bottom) and its tile from the manifest; a clip's picture is a window into a larger one. The page flag `?face=lvgl` shows the Station's frame in LVGL: the top bar, the bottom line, the message plate and the focus ring, over the stage's ground. The JavaScript views build the same scene nodes as before (from `frame.json` through the same components) and send them to the face; the face builds LVGL objects from them, places and styles, decides nothing. Text is Inter 16, 20 and 28 px through LVGL's font engine from `lv_font_conv` C files baked from the same frozen TrueType files and ranges as the type atlases; the round focus ring is a nine-slice picture and the creature's ellipse and the icons are pictures, all from the page's masks (the architecture's closed set: rectangle, picture, nine-slice, text). The chapter rail (tabs hanging from the top bar, leaning 16 px, sharing slants; sprite ends from masks, rectangles, text) is laid out from `frame.json`'s `rail`. The stage's own content comes with its screen (L2). The JavaScript layer is still the default.

| File | What it is |
| --- | --- |
| `lv_conf.h` | LVGL's configuration: software drawing, ARGB8888, no OS, no driver, no decoder (the same file configures every build) |
| `src/face.c`, `src/face.h` | The platform-neutral face: `face_init`, `face_frame(ms)`, the framebuffer, the dirty rectangles, `face_hash`, `face_key`. Nothing in it knows JavaScript, SDL or a device |
| `src/prim/prim.c`, `prim.h` | The primitives, the only code that makes LVGL objects: a rectangle, a run of Inter text, a picture 1:1 (or a window of a larger one), a nine-slice, a **clip** (a real parent object that cuts its children), and a **composed picture** (`h`, `v`, `dash`, `dot` and `lattice` drawn once into a picture the face owns: one object for what would be hundreds). Objects are kept by id between frames, in draw order; each carries its **layer** (chrome, art, painted, type) and the region that drew it; the table holds 1,024 objects and 256 pictures, and a node past either is refused and counted. The palette (from the host) and the test mode's passes and logs are here too |
| `src/bridge/wire.c`, `wire.h` | The bridge of lvgl-switch.md §2.1: JSON messages in through one buffer (`face_in_buf`, `face_send`) and out by polling (`face_poll`): in `hello`, `palette`, `spec`, `asset`, `props`, `event`, `key`; out `ready`, `error`, and in test mode `log` (`focus`, `intent` and `done` come with the focus graph and the animations). A contract other than 1 is refused; props over 32 KiB and a `seq` that goes back are refused; a refusal is an `error`, never a silent drop |
| `src/spec/spec.c`, `spec.h`, `jnum.h` | The spec loader (§2.3), in two steps. **Today:** each spec file kept whole as strict JSON (no bytes after the object, no repeated top-level key, integers exactly) and read by dotted path (`regions.stage.rect.2`), strings decoded to UTF-8. **With the words (B3):** the region tree, in which a region names its word, build or rule and one the face does not have is **refused at load**, never improvised (§2.3); and states, which **hide** regions, never destroy them. The refusals of the focus graph (§2.6.1) land in B3 with the focus port, each with a case in `bridge.test.mjs` |
| `src/vocab/vocab.c`, `vocab.h`, `words.h` | The words' toolbox and the closed vocabulary's list. `common/`: `frame.c` (top bar, bottom line, message plate, panel), `focusRing.c` (the ring in its forms: round as a nine-slice of a composed 20×20 source, feet, tab, circle). `station/`: `list.c` (Pods' rack and the bench), `specimen.c` (the pod under the beam, kin, hatch, stamp, the two captions), `rail.c` (the slanted chapter rail), `page.c` (the chapter page and Compare's). A word reads its region from the spec and its props by path, measures with the face's own Inter, and emits primitives; it never reads the save or decides content |
| `src/layout/layout.c`, `layout.h` | The spec's derived rules in integers: the plate's place and width, the slanted rail's run, the page's size and grid by trait count, the rack's and the kin's pitch, the stamp's cell. `ui/specs/derive.mjs` is the second implementation; `tests/vectors/layout.json` is run by both |
| `src/screens/screens.c`, `pods.c` | The screens' binding tables: which word draws which region of Pods' four states, then the frame; the keys (a direction moves the ring by the spec's graph on the boxes the words drew and sends `focus`, or `intent` with `step:<key>` for a stepper; ✓ ← and the room keys send `intent`); the 180 ms stage dither |
| `src/focus/focus.c`, `focus.h` | The focus graph of lvgl-switch.md §2.6.1 in integers: the four edge forms with the ordered list, `order`, `nearestIn` with `ahead`, the `roomKey` origin, the stepper; refusals at load. `ui/focus.mjs` runs the same `tests/vectors/focus.json` |
| `src/anim/anim.c`, `anim.h` | The events of §2.7 on the host's clock (seal, wipe, ribbon, plate, tick, flash, dither): progress for the words, `done` when one ends, input held while one holds, `motion: false` jumps to the end |
| `src/prim/ring.c`, `ring.h` | The `ring` and `tabRing` ops of the composed pictures, integers only (int64): the oracle is `ui/rings.mjs`, the vectors `tests/vectors/rings.json` |
| `src/test/face_test.c`, `face_metrics.c` | `face_test`: the focus, layout, metrics and ring vectors on the C modules (`build.sh` runs it); `face_metrics` writes `dist/metrics.json` (the compiled fonts' advances and kerning) |
| `tools/make-layout-vectors.mjs`, `make-ring-vectors.mjs`, `make-metrics-vectors.mjs`, `bake-images.mjs` | The vector generators (each with `--check`, which the tests run) and the baker that turns the placed masters into LVGL 9 binaries (`dist/images`, checked against the masters' index) |
| `src/vendor/jsmn.h` | jsmn, the one-header JSON tokenizer (MIT), unmodified; recorded in THIRD_PARTY_NOTICES.md |
| `src/selftest.c` | A fixed scene (rules, the three Inter sizes, a nine-slice ring, the ellipse and a picture) for the build's own parity check |
| `src/fonts/` | The Inter fonts as LVGL C sources, generated by `tools/bake-fonts.sh` (`lv_font_conv` 1.5.3) from `ui/fonts/inter/src` |
| `deprecated.json`, `tools/freeze-check.mjs`, `tests/freeze.test.mjs` | The freeze of the JavaScript drawing layer (lvgl-switch.md §5.1): every deprecated module with its SHA-256 and the files allowed to import it; the check that fails on a changed hash, a new import, a screen gaining `draw`, `nodes` or `faceNodes`, or a path leaving the list without deletion or goldens; exemptions printed on every run |
| `tests/words.test.mjs`, `pods-words.test.mjs`, `pods-keys.test.mjs`, `anim.test.mjs`, `ring.test.mjs`, `layout.test.mjs`, `metrics.test.mjs`, `bake.test.mjs`, `focus.test.mjs` | The words against the JavaScript they replace (props and the framebuffer hash the frozen components drew, in `tests/vectors/*-words.json`, so no test imports the frozen layer), the keys, the events, the ring, the layout rules, the metrics, the baker, the focus vectors |
| `tests/bridge.test.mjs` | Node, through the page's own transport on the WebAssembly face: the handshake and its version check, every message with its refusals, the spec loader, the picture table, the props budget, clip, composed pictures, test mode's log and the palette passes, the 1,024-object table |
| `tools/frame-check.mjs` | The browser: the frame against the frame spec and the canvas renderer's, both rings' rectangles and pixels, the plate's centring and timing, the counter's tick; writes `img/l1-*.png` |
| `src/main_native.c` | The native Linux build: the same face run headless for a few frames; draws the fixed scene and prints the framebuffer's hash (and writes a PPM when `FACE_PPM` names a file) |
| `CMakeLists.txt` | Builds LVGL from the repository's vendored tree (`v1/native/vendor/lvgl`, unmodified, nothing downloaded) and the face, as WebAssembly under Emscripten or native |
| `build.sh` | `build.sh wasm`, `native` or `all`; prints build times and sizes; output in `dist/` (not committed) |
| `emsdk.version` | The pinned Emscripten SDK (4.0.23) |
| `tests/plates.test.mjs` | Node: the name plates (the series `ui/specs/derive.mjs` computes from the spec, one picture per width) and the rail tab grounds, the pictures the host sends at boot and never drops: a plate that is not on the face is an error and a refused node, a long name takes the widest plate, the pinned pictures stay when the table is full |
| `tests/layers.test.mjs` | Node: the art director's layer table on Pods' words: every case of `pods-words.json` is drawn with palette-exact pictures for the ids the table calls art and pictures outside the palette for every other id; chrome and chrome + art must read 0 pixels outside the palette |
| `tools/layer-check.mjs` | The browser: the same pass-1 and pass-2 readings on the Station page's own pictures (`?face=lvgl&test`), one line a Pods state |
| `tests/face.test.mjs` | Node: the WebAssembly face loads, is 1024×600, redraws, takes keys and draws the same pixels as the native build for the fixed scene |
| `tools/face-check.mjs` | The browser: the Station page with `?face=lvgl`, and the measurements below |
| `../station/src/face-lvgl.mjs` | The page's side: loads `face.mjs`, runs the frames, copies the redrawn rectangles to the canvas, passes the keys in |

## Building

```
# once: the pinned Emscripten SDK (CI does this and caches it)
git clone https://github.com/emscripten-core/emsdk.git ~/emsdk && (cd ~/emsdk && ./emsdk install $(cat <repo>/prototypes/face/emsdk.version) && ./emsdk activate $(cat <repo>/prototypes/face/emsdk.version))
EMSDK=~/emsdk prototypes/face/build.sh all     # needs cmake 3.28+, ninja, gcc for the native build
node --test prototypes/face/tests/*.test.mjs    # the Node checks (after build.sh: some need dist/)
PW_DIR=<dir with node_modules/playwright> node prototypes/face/tools/face-check.mjs
PW_DIR=<dir with node_modules/playwright> node prototypes/face/tools/frame-check.mjs
npm install --prefix /tmp/lvfc lv_font_conv@1.5.3 && sh prototypes/face/tools/bake-fonts.sh   # only to regenerate the fonts
```

Open the Station with `?face=lvgl` (the build's `dist/` must sit beside the page: `prototypes/face/dist`, published at `/sandbox/face/dist`).

## What L0 measured (Chromium headless; a development VM and CI's ubuntu-24.04 runner)

| | Development VM | CI runner (first run, cache cold) |
| --- | --- | --- |
| Emscripten 4.0.23 install and both builds | n/a | 1 min 51 s for the whole step; later runs restore the SDK from the cache |
| Clean build, WebAssembly (LVGL 9.6.0 + the face, `-O2`) | 26.7 s | 35.0 s |
| Clean build, native Linux (gcc) | 19–20 s | 39.1 s |
| `face.wasm` | 221,847 B (89,896 B gzipped) | the same bytes |
| `face.mjs` | 9,251 B (3,101 B gzipped) | the same bytes |
| Page: fetch, compile and initialise | 5 to 7 ms; 15 to 19 ms with the CPU throttled 4× | 7.9 ms; 14.1 ms throttled 4× |
| A frame with nothing changed | 0.003 ms | 0.003 ms |
| A full 1024×600 frame copied to the canvas | 3.3 ms; 15 to 19 ms throttled 4× | 2.7 ms; 13.1 ms throttled 4× (a 60 Hz frame is 16.7 ms) |
| The WebAssembly and native faces' framebuffer hashes | equal (`5fc5fdc5`) | equal (`5fc5fdc5`) |
| The whole job (build, site, smoke, journey, face check, layer checks) | n/a | 5 min 13 s |

The full-frame copy is the worst case (LVGL redraws only what changed, and the page copies only those rectangles); on a phone it fits a frame at 4× throttling but only just, so the copy is done on 32-bit words. The sizes are the empty face: the fonts and images arrive at L1.

## What L1 added

| | Development VM |
| --- | --- |
| `face.wasm` with the three Inter fonts and the scene interpreter | 348,437 B (134,501 B gzipped); the fonts are 137 KB of it |
| Page: fetch, compile and initialise | 6.2 ms; 25.7 ms throttled 4× |
| A full 1024×600 frame copied to the canvas | 3.0 ms; 13.2 ms throttled 4× |
| Where the frame's ink lies, face against canvas renderer | title, materials and subject identical; companion and the need within 4 px of the right edge; the action's last word within 2 px |
| Fixed scene, WebAssembly against native | equal (`3456b1be`) |

LVGL rounds each glyph's advance to whole pixels; the type atlases kept fractions. The views therefore measure through the face (`FACE.measure`), so centring and clipping use the widths LVGL gives, and a string's last letters can sit 1 to 4 px from where the canvas renderer put them.
