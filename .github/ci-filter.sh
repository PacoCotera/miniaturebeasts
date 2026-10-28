#!/bin/sh
# Which checks does a pull request need? Reads `git diff --name-only` on stdin (one path per line) and prints
#   tests=   the node tests, the import guard, the placed-masters check and the font re-bake
#   station= the Station journey and the face checks that use the Station page (face-check, layer-check, goldens, layout check, layer checks)
#   testpage= the test page's journey
# each true or false. When in doubt for a path, the checks run: a path that is not under website/ or prototypes/ and is not a changed
# document runs all of them, and so does the workflow or this script. A change under website/ only runs none (the site assembly and the
# smoke check always run). An empty list runs all of them.
set -eu
tests=false station=false testpage=false
input=$(cat)
if [ -z "$input" ]; then
  echo "tests=true"; echo "station=true"; echo "testpage=true"; exit 0
fi
while IFS= read -r path; do
  [ -n "$path" ] || continue
  case $path in
    website/*) ;;
    .github/workflows/site.yml|.github/ci-filter.sh) tests=true station=true testpage=true ;;
    .github/*) tests=true ;;
    prototypes/station/*|prototypes/face/*|prototypes/ui/*|prototypes/genome-stamp/*|prototypes/caddy/*|prototypes/workbench/*)
      tests=true station=true
      case $path in prototypes/station/*) testpage=true ;; esac ;;
    prototypes/test/*|prototypes/exploration/*|prototypes/play/src/*) tests=true testpage=true ;;
    prototypes/*) tests=true ;;
    *) tests=true station=true testpage=true ;;
  esac
done <<EOF2
$input
EOF2
echo "tests=$tests"; echo "station=$station"; echo "testpage=$testpage"
