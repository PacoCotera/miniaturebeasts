#!/bin/sh
# Bundles the game's pages (station, play, exploration) with Vite and lays the result over an assembled site.
#   sh ops/sandbox/bundle-pages.sh <site root>          # <site root>/play/ holds the copied prototypes (.github/workflows/site.yml "Assemble the site")
# The build (prototypes/vite.config.mjs, base /play/) writes <page>/index.html and assets/<name>-<hash>.<ext>. The game lives wholly under /play/ (owner 2026-11-17):
#   /play/ the play page, /play/station/ the Station, /play/exploration/ the Companion, /play/assets/ the hashed files (the web server keeps them immutable, ops/sandbox/Caddyfile).
# Every source file stays where it was in /play/<folder>/: the masters, the face, the frames and the modules the pages no longer load. Needs Node 22; npm ci installs prototypes/package-lock.json (vite, p-queue).
set -eu
root=$(cd "$(dirname "$0")/../.." && pwd)
site=${1:?usage: bundle-pages.sh <site root>}
[ -d "$site/play/station" ] || { echo "bundle-pages: $site/play/station is missing (assemble the site first)" >&2; exit 2; }
out=$(mktemp -d)
npm ci --prefix "$root/prototypes" --no-audit --no-fund --silent
MB_BUNDLE_OUT="$out" "$root/prototypes/node_modules/.bin/vite" build --config "$root/prototypes/vite.config.mjs" --logLevel warn
cp -r "$out/assets" "$site/play/"
cp "$out/station/index.html" "$site/play/station/index.html"
cp "$out/exploration/index.html" "$site/play/exploration/index.html"
# the play page is the game's front door: /play/ itself (its source folder stays at /play/play/ for the modules the other pages load)
cp "$out/play/index.html" "$site/play/index.html"
rm -rf "$out"
# the Station's link to the play page is written relative to the source tree (../play/): in the build it is /play/
sed -i 's#href="\.\./play/"#href="/play/"#' "$site/play/station/index.html"
grep -q 'src="/play/assets/' "$site/play/index.html" || { echo "bundle-pages: the play page was not built with the /play/ base" >&2; exit 3; }
# the test page is a team tool, served behind the login at /admin/test/ (ops/sandbox/Caddyfile rewrites it to /play/test/): its links go to the game's folders by absolute address
sed -i -e 's#\.\./ui/#/play/ui/#g' -e 's#\.\./station/#/play/station/#g' -e 's#\.\./exploration/#/play/exploration/#g' -e 's#\.\./\.\./play/src/#/play/play/src/#g' "$site/play/test/index.html" "$site/play/test/src/page.mjs" "$site/play/test/src/layout.mjs"
echo "bundle-pages: $(ls "$site/play/assets" | wc -l) files in $site/play/assets"
