#!/bin/sh
# Bundles the sandbox pages (station, play, exploration) with Vite and lays the result over an assembled site.
#   sh ops/sandbox/bundle-pages.sh <site root>          # <site root>/sandbox/ holds the copied prototypes (.github/workflows/site.yml "Assemble the site")
# The build (prototypes/vite.config.mjs) writes <page>/index.html and assets/<name>-<hash>.<ext>; they replace the pages and add /sandbox/assets/, which the web server keeps immutable (ops/sandbox/Caddyfile).
# Every source file stays where it was: the masters, the face, the frames and the modules the pages no longer load. Needs Node 22; npm ci installs prototypes/package-lock.json (vite, p-queue).
set -eu
root=$(cd "$(dirname "$0")/../.." && pwd)
site=${1:?usage: bundle-pages.sh <site root>}
[ -d "$site/sandbox/station" ] || { echo "bundle-pages: $site/sandbox/station is missing (assemble the site first)" >&2; exit 2; }
out=$(mktemp -d)
npm ci --prefix "$root/prototypes" --no-audit --no-fund --silent
MB_BUNDLE_OUT="$out" "$root/prototypes/node_modules/.bin/vite" build --config "$root/prototypes/vite.config.mjs" --logLevel warn
cp -r "$out"/. "$site/sandbox/"
rm -rf "$out"
# The game's public paths (owner 2026-11-16): /play/ is the play page and /play/station/ the Station. Their links are relative to the page
# (../ui/, ../assets/), so each gets its own copy of the built page with <base> pointing at where its files live (/sandbox/play/, /sandbox/station/):
# every link resolves as before, from either address. The old page addresses redirect here (ops/sandbox/Caddyfile); their files stay for the base.
mkdir -p "$site/play/station"
sed 's#<head>#<head><base href="/sandbox/play/">#' "$site/sandbox/play/index.html" > "$site/play/index.html"
sed -e 's#<head>#<head><base href="/sandbox/station/">#' -e 's#href="\.\./play/"#href="/play/"#' "$site/sandbox/station/index.html" > "$site/play/station/index.html"
grep -q '<base href="/sandbox/play/">' "$site/play/index.html" && grep -q '<base href="/sandbox/station/">' "$site/play/station/index.html" || { echo "bundle-pages: no <head> to put the base in" >&2; exit 3; }
echo "bundle-pages: $(ls "$site/sandbox/assets" | wc -l) files in $site/sandbox/assets"
