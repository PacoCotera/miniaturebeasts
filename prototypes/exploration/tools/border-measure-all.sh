#!/bin/bash
# Land shape B1: runs border-measure.mjs one seed per process (a page per seed is heavy), one result line per seed on stdout, then the sum. Usage: border-measure-all.sh <firstSeed> <count>
dir="$(dirname "$0")"
first="${1:-1}"; count="${2:-50}"
for ((s = first; s < first + count; s++)); do
  node --max-old-space-size=3000 "$dir/border-measure.mjs" "$s" 1
done
