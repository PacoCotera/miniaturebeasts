# Isolated native expedition model

This headless C model separates timed expedition progress, awards, observations,
sealed samples and Lab research. It remains a standalone compatibility experiment,
with no connected renderer, host clock worker or browser integration. The current
playable game is [selected-lab](../selected-lab/README.md); this model is not its
replacement or a second active game.

## State and disclosure

Probe receives a restricted typed projection with no research result, genetic
region or sample-content inference. Lab research consumes an explicit supply and
retains findings for free revisits. The named fixture lasts120,000 accepted ms,
awards once at30,000/90,000 ms, exposes a neutral fictional event at45,000 ms and
seals a sample at completion. These are engineering inputs, not balance or measurements.

## Clock and retries

A host adapter supplies service epoch and monotonic offset. New epochs establish
a baseline without crediting stopped-service time. Starting anchors the clock;
Check, inspection and browser viewing earn no progress. Clock cursor and command
receipt are independent. Retry identity is command name, expected revision and
operation ID; host clock metadata is excluded so restart can reconcile the same
command. Replay returns its prior effect before applying another clock observation.

## Use and boundaries

`model` owns validation, transitions, native actions and restricted views; `store`
owns explicit versioned serialization over shared atomic byte storage; `main`
is the headless command/status/tick adapter. Build with CMake in a separate build
directory, then run `native/tests/test_replacement.py` against the executable.
Checks cover thresholds, repeated ticks, restart/uncertain writes, retries,
disclosure, spending and invalid-save preservation. They do not establish worker
scheduling, graphics or physical storage safety.

Use a separate save; this fixture cannot reinterpret or migrate the connected
game's world. Retain it as bounded model/recovery evidence until its consumers
and any future reuse are resolved.
