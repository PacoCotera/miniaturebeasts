#!/bin/bash
# tells-bot-min-1: run3's two-hidden round (h2), 200 seeds, frames L and T, with TELLS reading a pair by its weaker trait
D=/home/mb/mb/pool/tells-bot-min-1/tools/lab-sim
for f in L T; do
  node $D/rounds/run3.mjs h2 200 $D/results-tells-bot-min-1-h2-$f.json $f > /tmp/claude-1000/min1-$f.log 2>&1 &
done
wait
echo done > /tmp/claude-1000/min1.done
