#!/bin/bash
# runs every round-2 job in parallel (200 seeds, frames L and T)
D=/home/mb/mb/pool/b-rounds-2/tools/lab-sim
for r in b1a b1b b3; do
  for f in L T; do
    node $D/rounds/run2.mjs $r 200 $D/results-b-rounds-harness-2-$r-$f.json $f > /tmp/claude-1000/b2-$r-$f.log 2>&1 &
  done
done
wait
echo done > /tmp/claude-1000/b2-all.done
