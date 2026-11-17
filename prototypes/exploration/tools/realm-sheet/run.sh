#!/bin/sh
# The realm sheet: dump seeds, run measure.py and measure2.py on each, then summarize.py.
#   sh tools/realm-sheet/run.sh <out dir> <seed> [<seed> ...]
# Writes <out dir>/realm-<seed>.json (dump, about 3 MB; delete after), m-<seed>.json, k-<seed>.json, summary.md. Up to 6 seeds run at once.
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$1"; shift
mkdir -p "$OUT"
one() {
  s="$1"
  node "$HERE/dump.mjs" "$s" "$OUT/realm-$s.json" > "$OUT/dump-$s.log" 2>&1
  python3 -I "$HERE/measure.py" "$OUT/realm-$s.json" "$OUT/m-$s.json" > /dev/null
  python3 -I "$HERE/measure2.py" "$OUT/realm-$s.json" "$OUT/k-$s.json" > /dev/null
  python3 -I "$HERE/check.py" "$OUT/realm-$s.json" "$OUT/c-$s.json" > /dev/null
}
n=0
for s in "$@"; do
  one "$s" &
  n=$((n + 1))
  if [ $((n % 6)) -eq 0 ]; then wait; fi
done
wait
python3 -I "$HERE/summarize.py" "$OUT" > "$OUT/summary.md"
