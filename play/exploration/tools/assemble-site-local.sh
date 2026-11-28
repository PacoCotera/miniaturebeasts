#!/bin/sh
# Local copy of the site workflow's "Assemble the site" + bundle step, for stills from the built /play (not committed).
#   sh assemble-site-local.sh <repo> <site dir>
set -eu
repo=$1; site=$2
rm -rf "$site"; mkdir -p "$site/play"
cp -rL "$repo/website/." "$site/"
for p in "$repo"/prototypes/*/; do
  n=$(basename "$p")
  case "$n" in node_modules) continue;; esac
  mkdir -p "$site/play/$n"
  cp -rL "$p". "$site/play/$n/" 2>/dev/null || true
done
rm -rf "$site/play/exploration/node_modules" "$site/play/play/options/catalogue-out" "$site/play/play/options/node_modules"
mkdir -p "$site/art/companion-48/terrain" && cp -r "$repo/art/companion-48/terrain/meadow" "$site/art/companion-48/terrain/"
mkdir -p "$site/art/companion-48/care" && cp "$repo/art/companion-48/care/c-heart-24.png" "$repo/art/companion-48/care/c-heart-16.png" "$site/art/companion-48/care/"
mkdir -p "$site/art/day-dial/frames" && cp "$repo"/art/day-dial/frames/day-*.png "$site/art/day-dial/frames/"
out=$(mktemp -d)
MB_BUNDLE_OUT="$out" "$repo/prototypes/node_modules/.bin/vite" build --config "$repo/prototypes/vite.config.mjs" --logLevel warn
cp -r "$out/assets" "$site/play/"
cp "$out/station/index.html" "$site/play/station/index.html"
cp "$out/exploration/index.html" "$site/play/exploration/index.html"
cp "$out/play/index.html" "$site/play/index.html"
rm -rf "$out"
echo "assembled $site"
