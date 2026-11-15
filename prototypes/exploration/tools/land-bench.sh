#!/bin/bash
# land-time-1: cold window time on quickjs-ng, N runs of a prepared directory (land-qjs-prep.mjs); prints each run's JSON line.
#   land-bench.sh <prepdir> [runs=5] [script=run.mjs]
d=$1; n=${2:-5}; s=${3:-run.mjs}
for i in $(seq 1 "$n"); do /home/mb/mb/hw-tools/quickjs-ng/bin/qjs --std "$d/$s" "$d/data.json"; done
