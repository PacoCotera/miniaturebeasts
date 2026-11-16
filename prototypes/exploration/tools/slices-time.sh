#!/bin/sh
# Bundles tools/slices-time.mjs for the small engine and runs it: slices-time.sh <outdir> seed ...   (also runs Node on the same bundle with NODE=1)
# esbuild folds the bare imports and the JSON of the tile set into one file; qjs is the dev server's quickjs-ng.
OUT=$1; shift
HERE=$(dirname "$0")
ESB=/home/mb/mb/wt-worldgen-smooth-1/prototypes/places/node_modules/.bin/esbuild
QJS=/home/mb/mb/hw-tools/quickjs-ng/bin/qjs
mkdir -p "$OUT"
"$ESB" "$HERE/slices-time.mjs" --bundle --format=esm --target=es2022 --outfile="$OUT/slices-time.bundle.mjs" --log-level=warning || exit 1
if [ -n "$NODE" ]; then node "$OUT/slices-time.bundle.mjs" "$@"; else "$QJS" --std "$OUT/slices-time.bundle.mjs" "$@"; fi
