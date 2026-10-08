# The Station's face (LVGL)

The Station's screens are drawn by LVGL 9.6 in C, the same face on the sandbox (WebAssembly), the Raspberry Pi (native Linux) and, with a different display driver, the devices ([technical-architecture.md §8](../../design/proposals/technical-architecture.md#8-assessment-the-real-lvgl-face-in-the-sandbox-now)). The rules, the views, the spec files, the assets, the save and the Caddy client stay where they are: JavaScript and data, in `prototypes/station` and `prototypes/ui`. The face is thin: props in, intents out.

**Status: L0, the toolchain.** An empty 1024×600 display (the palette's `ground`), a retained framebuffer, the dirty rectangles it redrew, key input, and the page flag `?face=lvgl`. The JavaScript layer is still the default. L1 draws the frame (top bar, bottom line, message plate, focus ring) from `frame.json`.

| File | What it is |
| --- | --- |
| `lv_conf.h` | LVGL's configuration: software drawing, ARGB8888, no OS, no driver, no decoder (the same file configures every build) |
| `src/face.c`, `src/face.h` | The platform-neutral face: `face_init`, `face_frame(ms)`, the framebuffer, the dirty rectangles, `face_hash`, `face_key`. Nothing in it knows JavaScript, SDL or a device |
| `src/main_native.c` | The native Linux build: the same face run headless for a few frames; prints the framebuffer's hash (and writes a PPM when `FACE_PPM` names a file) |
| `CMakeLists.txt` | Builds LVGL from the repository's vendored tree (`v1/native/vendor/lvgl`, unmodified, nothing downloaded) and the face, as WebAssembly under Emscripten or native |
| `build.sh` | `build.sh wasm`, `native` or `all`; prints build times and sizes; output in `dist/` (not committed) |
| `emsdk.version` | The pinned Emscripten SDK (4.0.23) |
| `tests/face.test.mjs` | Node: the WebAssembly face loads, is 1024×600, redraws, takes keys and draws the same pixels as the native build |
| `tools/face-check.mjs` | The browser: the Station page with `?face=lvgl`, and the measurements below |
| `../station/src/face-lvgl.mjs` | The page's side: loads `face.mjs`, runs the frames, copies the redrawn rectangles to the canvas, passes the keys in |

## Building

```
# once: the pinned Emscripten SDK (CI does this and caches it)
git clone https://github.com/emscripten-core/emsdk.git ~/emsdk && (cd ~/emsdk && ./emsdk install $(cat <repo>/prototypes/face/emsdk.version) && ./emsdk activate $(cat <repo>/prototypes/face/emsdk.version))
EMSDK=~/emsdk prototypes/face/build.sh all     # needs cmake 3.28+, ninja, gcc for the native build
node --test prototypes/face/tests/              # the Node checks
PW_DIR=<dir with node_modules/playwright> node prototypes/face/tools/face-check.mjs
```

Open the Station with `?face=lvgl` (the build's `dist/` must sit beside the page: `prototypes/face/dist`, published at `/sandbox/face/dist`).

## What L0 measured (Chromium 1.49 headless, a development VM)

| | |
| --- | --- |
| Clean build, WebAssembly (LVGL 9.6.0 + the face, `-O2`) | 26.6 s |
| Clean build, native Linux (gcc) | 19.9 s |
| `face.wasm` | 221,847 B (89,896 B gzipped); `face.mjs` 9,251 B (3,101 B gzipped) |
| Page: fetch, compile and initialise | 5 to 7 ms (local); 17 to 20 ms with the CPU throttled 4× |
| A frame with nothing changed | 0.003 ms |
| A full 1024×600 frame copied to the canvas | 3.3 ms; 15 ms with the CPU throttled 4× (a 60 Hz frame is 16.7 ms) |
| The WebAssembly and native faces' framebuffer hashes | equal (`5fc5fdc5`) |

The full-frame copy is the worst case (LVGL redraws only what changed, and the page copies only those rectangles); on a phone it fits a frame at 4× throttling but only just, so the copy is done on 32-bit words. The sizes are the empty face: the fonts and images arrive at L1.
