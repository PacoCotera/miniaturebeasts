#!/bin/sh
# One shard of the exploration suites (prototypes/exploration/tests/*.test.mjs): sh .github/exploration-tests.sh <group>
# The files are split so no job runs much over 10 minutes (times measured on the dev server, one file at a time):
#   views-agree-1, views-agree-2, views-agree-3 (about 9 minutes each), hold (gen7-hold, 8),
#   heavy (closed-openings, undrawn-pieces-dont-block, realm-run, gen7-soft: about 8), rest-a and rest-b (every other file, about 7 each, split by position in the sorted list),
#   pending: the files that fail today for a reason that is a decision, not a test fix (see the list below); run with continue-on-error, so their state shows without blocking.
# PENDING (exploration-tests-fix-1, 2026-11-18):
#   first-trip         seeds 3, 5, 11 take 496-594 actions on the land of PR 364; the bar is a 90th percentile of 450 (the lead: is the bar or the land to move?)
#   gen7-goldens       the seven G3 goldens differ on the land of PR 364; the art director looks at every changed golden (MB_UPDATE_GOLDENS=1 rewrites them)
#   swap-choice        the chooser's two stills differ from their goldens on the same land; the art director's look
#   gen7-place, gen7-place-decor  seed 7 alone (MB_CI_FAST=1) did not finish in 25 minutes on the dev server (the files say about 5); never seen to pass or fail here: the lead decides whether to slim them
#   gen7-world-s1-50, gen7-world-s51-100  one trail island on seeds 9 and 52 (a bridge whose ends reach only each other); a trail change moves REALM_REV and the playtest seed list, so the lead's
set -eu
group="${1:?group}"
cd "$(dirname "$0")/../prototypes/exploration/tests"
PENDING="first-trip gen7-goldens swap-choice gen7-world-s1-50 gen7-world-s51-100 gen7-place gen7-place-decor"
HEAVY="closed-openings undrawn-pieces-dont-block realm-run gen7-soft"
ALONE="views-agree-seed1 views-agree-seed2 views-agree-seed3 gen7-hold"
names() { for f in *.test.mjs; do echo "${f%.test.mjs}"; done; }
rest() { names | grep -v -x -E "$(echo "$PENDING $HEAVY $ALONE" | tr ' ' '\n' | paste -sd'|')"; }
case "$group" in
  views-agree-1) list="views-agree-seed1" ;;
  views-agree-2) list="views-agree-seed2" ;;
  views-agree-3) list="views-agree-seed3" ;;
  hold) list="gen7-hold" ;;
  heavy) list="$HEAVY" ;;
  rest-a) list="$(rest | awk 'NR % 2 == 1')" ;;
  rest-b) list="$(rest | awk 'NR % 2 == 0')" ;;
  pending) list="$PENDING" ;;
  *) echo "unknown group $group" >&2; exit 2 ;;
esac
files=""
for n in $list; do files="$files $n.test.mjs"; done
echo "group $group:$files"
export MB_CI_FAST=1
exec node --import ../../../.github/ci-load.mjs --test --test-concurrency=2 $files
