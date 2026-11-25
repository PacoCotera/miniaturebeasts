#!/bin/bash
# paths-gen-build-2: before/after stills of four places. usage: stills-run.sh <outdir>
set -e
OUT=$1; mkdir -p "$OUT"
B=/home/mb/mb/mb-worktrees/paths-gen-build-2-base/prototypes/exploration/tools/scratch-paths
A=/home/mb/mb/mb-worktrees/paths-gen-build-1/prototypes/exploration/tools/scratch-paths
for p in "64 6 0 his-place-road-rest" "64 13 0 hut" "64 3 1 outpost" "4 10 2 house"; do
  set -- $p
  node $B/dump-place.mjs $1 $2 $3 "$OUT/$4-before.json"
  node $A/dump-place.mjs $1 $2 $3 "$OUT/$4-after.json"
  python3 $A/stills.py "$OUT/$4-before.json" "$OUT/$4-after.json" "$OUT/$4.png"
done
