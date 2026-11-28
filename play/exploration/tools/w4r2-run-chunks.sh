#!/bin/bash
# W4 round 2 realm check: seeds 1 to 600 in chunks of 50 (the page harness grows with each world), 6 at a time. usage: w4r2-run-chunks.sh OUTDIR [--read]
OUT=$1; shift
BOT=/home/mb/mb/pool/w4-round-2/prototypes/exploration/tools/w4-bot.mjs
mkdir -p "$OUT"
for from in $(seq 1 50 551); do
  to=$((from + 49))
  while [ "$(jobs -rp | wc -l)" -ge 6 ]; do sleep 5; done
  node --max-old-space-size=7000 "$BOT" --from $from --to $to "$@" --json "$OUT/c$from.json" > "$OUT/c$from.out" 2>&1 &
done
wait
echo finished
