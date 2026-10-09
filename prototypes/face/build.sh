#!/usr/bin/env bash
# Builds the Station's face: `build.sh wasm` (the sandbox's WebAssembly module into dist/), `build.sh native` (the Linux
# build, run once headless: it prints the framebuffer hash and writes dist/native.hash), `build.sh all` (both).
# The Emscripten SDK is pinned in emsdk.version; set EMSDK to its directory (CI installs it, see .github/workflows/site.yml)
# or have emcc on the PATH. Prints the build time and the sizes it produced.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
what="${1:-all}"
bld="${FACE_BUILD_DIR:-${TMPDIR:-/tmp}/mb-face-build}"   # outside the tree: the site copies prototypes/* whole
mkdir -p "$here/dist" "$bld"
now() { date +%s.%N; }
log="$bld/build.log"
run() { "$@" >"$log" 2>&1 || { cat "$log" >&2; echo "build failed: $*" >&2; exit 1; }; }   # quiet unless it fails
if [[ "$what" == wasm || "$what" == all ]]; then
  if [[ -n "${EMSDK:-}" && -f "$EMSDK/emsdk_env.sh" ]]; then export PATH="$EMSDK/upstream/emscripten:$PATH" EM_CONFIG="$EMSDK/.emscripten"; fi
  command -v emcc >/dev/null || { echo "emcc not found: set EMSDK to the pinned SDK ($(cat "$here/emsdk.version"))" >&2; exit 2; }
  t0=$(now)
  run emcmake cmake -S "$here" -B "$bld/wasm" -G Ninja -DCMAKE_BUILD_TYPE=Release -DCMAKE_C_FLAGS="-O2"
  run cmake --build "$bld/wasm" --target face_wasm
  cp "$bld/wasm/face.mjs" "$bld/wasm/face.wasm" "$here/dist/"
  t1=$(now)
  printf 'wasm   build %.1f s   face.wasm %d bytes (%d gzipped)   face.mjs %d bytes\n' "$(echo "$t1 - $t0" | bc)" "$(stat -c %s "$here/dist/face.wasm")" "$(gzip -9 -c "$here/dist/face.wasm" | wc -c)" "$(stat -c %s "$here/dist/face.mjs")"
fi
if [[ "$what" == native || "$what" == all ]]; then
  t0=$(now)
  run cmake -S "$here" -B "$bld/native" -G Ninja -DCMAKE_BUILD_TYPE=Release -DCMAKE_C_FLAGS="-O2"
  run cmake --build "$bld/native" --target face_native face_test face_metrics
  t1=$(now)
  "$bld/native/face_test" "$here/tests/vectors" "$here/../ui/specs/station" | tail -3   # the vectors on the C modules; a failure stops the build
  "$bld/native/face_metrics" "$here/dist/metrics.json"   # the compiled fonts' advances and kerning, for ui/specs/measure.mjs
  node "$here/tools/bake-images.mjs" --out "$here/dist/images" >/dev/null && node "$here/tools/bake-images.mjs" --out "$here/dist/images" --check >/dev/null   # the placed masters as LVGL binaries (the same bytes on both faces), checked against the masters' index
  out="$("$bld/native/face_native" ${FACE_PPM:+"$FACE_PPM"})"
  echo "$out" | sed -n 's/.*hash=\([0-9a-f]*\).*/\1/p' > "$here/dist/native.hash"
  printf 'native build %.1f s   %s\n' "$(echo "$t1 - $t0" | bc)" "$out"
fi
