#!/bin/bash
# runs every round-3 job in parallel (200 seeds, frames L and T)
D=/home/mb/mb/pool/b-rounds-3/tools/lab-sim
mkdir -p /tmp/claude-1000
for r in h2 h3; do
  for f in L T; do
    node $D/rounds/run3.mjs $r 200 $D/results-b-rounds-harness-3-$r-$f.json $f > /tmp/claude-1000/b3-$r-$f.log 2>&1 &
  done
done
wait
echo done > /tmp/claude-1000/b3-all.done
