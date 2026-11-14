#!/bin/sh
# All the stills of the run, one process per setting (the place maker keeps the stairs it found, so one setting a process):
#   greybox, face rows 3 and 2, D = 4000 5200 6500: each in its own scratch checkout (greybox-set.mjs wrote its pieces), day, with the 1 px cell lines;
#   today's signed pieces, face rows 3, the same three D, day and night: for the art director only.
# usage: land-stills-all.sh <run dir> <greybox tree, face 3> <greybox tree, face 2> <signed tree> [seeds]
run="$1"; g3="$2"; g2="$3"; signed="$4"; seeds="${5:-7,13,42}"
here="$(dirname "$0")"
for d in 4000 5200 6500; do
  node "$here/land-stills.mjs" "$g3" "$run/stills-greybox" "g-f3-d$d" --d $d --face 3 --seeds "$seeds" --grid > "$run/stills-greybox/log-f3-d$d.txt" 2>&1 &
  node "$here/land-stills.mjs" "$g2" "$run/stills-greybox" "g-f2-d$d" --d $d --face 2 --seeds "$seeds" --grid > "$run/stills-greybox/log-f2-d$d.txt" 2>&1 &
  node "$here/land-stills.mjs" "$signed" "$run/stills-signed-art-director-only" "s-f3-d$d" --d $d --face 3 --seeds "$seeds" --both > "$run/stills-signed-art-director-only/log-f3-d$d.txt" 2>&1 &
done
wait
