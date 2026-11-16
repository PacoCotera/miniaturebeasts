#!/bin/sh
# Bundles tools/hollow-sites-check.mjs for the small engine and runs it with -time: hollow-sites-time.sh <outdir> <srcdir: tools or tools-base> seed ...
# (the same bundling as slices-time.sh; tools-base holds the check built on the old code, src-base, for the before times)
OUT=$1; TOOLS=$2; shift; shift
HERE=$(dirname "$0")/..
ESB=/home/mb/mb/wt-worldgen-smooth-1/prototypes/places/node_modules/.bin/esbuild
QJS=/home/mb/mb/hw-tools/quickjs-ng/bin/qjs
mkdir -p "$OUT"
"$ESB" "$HERE/$TOOLS/hollow-sites-check.mjs" --bundle --format=esm --target=es2022 --external:node:fs --outfile="$OUT/$TOOLS-hsc.bundle.mjs" --log-level=warning || exit 1
"$QJS" --std "$OUT/$TOOLS-hsc.bundle.mjs" -time "$@"
