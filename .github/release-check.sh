#!/bin/sh
# The release check's play-throughs, one after the other (design/proposals/station-build.md §5, "The release check"): the Companion's first expedition, the Station (a crate carried home and opened,
# the pods, Create, Grow and the Incubator's hatch) with its layer checks, the play page's dock round trip, the test page's switch and dock.
# Every journey fails on a page error, a console error or a failed assertion. The full journeys are not run here: a builder runs them for what they change.
# Needs the face built (prototypes/face/dist) and Playwright's Chromium (PW_DIR and PLAYWRIGHT_BROWSERS_PATH). Prints the seconds each took and the total.
#   sh .github/release-check.sh        (from the repository root)
set -eu
cd "$(dirname "$0")/.."
start=$(date +%s)
step() {
  name=$1; shift
  t=$(date +%s)
  echo "== $name"
  "$@"
  echo "== $name: $(( $(date +%s) - t )) s"
}
step "Companion: the first expedition (a fresh world, a pod and the Data, then End: the packing screen with the crate)" node prototypes/exploration/tools/first-trip-bot.mjs --from 1 --to 1 --end
step "Companion: the speed check (4x CPU, eight map steps and End Expedition, no task over 250 ms)" node prototypes/exploration/tools/speed-check.mjs
step "Station: the journey (a crate carried home and opened, Pods, Create, Grow, the hatch)" env JOURNEY_SMALL=1 node prototypes/station/tools/journey.mjs
step "Station: the layer checks (the palette, the type, the regions)" node prototypes/station/tools/checks.mjs
step "Play page: the dock round trip" env JOURNEY_ONLY=ST node prototypes/play/tools/journey.mjs
step "Test page: the switch and the dock" env JOURNEY_SMALL=1 node prototypes/test/tools/journey.mjs
echo "release check: ok, $(( $(date +%s) - start )) s in all"
