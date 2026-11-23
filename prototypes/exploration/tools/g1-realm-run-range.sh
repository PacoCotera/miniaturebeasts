#!/bin/bash
# usage: g1-realm-run-range.sh FROM TO   (one range of realm seeds; rows to $G1RB_OUT/rFROM-TO.json)
OUT=${G1RB_OUT:-/home/mb/mb/g1rb-out2}
TOOLS=$(dirname "$(readlink -f "$0")")
export NODE_OPTIONS=--max-old-space-size=4096
mkdir -p "$OUT"
exec node "$TOOLS/g1-realm-bot.mjs" --from "$1" --to "$2" --json "$OUT/r$1-$2.json" > "$OUT/r$1-$2.log" 2>&1
