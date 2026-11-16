#!/bin/sh
# Runs land-measure.mjs for each candidate setting in parallel (one process each) and writes <outdir>/<name>.txt. usage: land-sweep.sh <outdir> name1="--set a=1,b=2 --reach 10" name2="..."
out="$1"; shift
mkdir -p "$out"
here="$(dirname "$0")"
for spec in "$@"; do
  name="${spec%%=*}"; args="${spec#*=}"
  node "$here/land-measure.mjs" $args > "$out/$name.txt" 2>&1 &
done
wait
