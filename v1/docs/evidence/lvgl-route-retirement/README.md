# Retired legacy graphics; retained domain regression

All current connected device screen composition uses retained LVGL. Old standalone Lab EXPEDITION/CARGO/DISCARD graphics, manual Lab/Kit row fallbacks and unused field/asset drawing helpers are removed. RGB/BGR serialization only transports native library output; it does not compose a GUI.

Standalone serve still supports the existing domain/input/timer/save regression commands. Those retired graphics pages return an Unsupported frame page JSON error before any positive byte-count announcement or BMP header, then remain available for status/input. Stale request errors take precedence. Unknown pages reject explicitly. Connected Lab EXPEDITION/CARGO continue the actual LVGL reception/log; connected discard is unsupported.

Maintained C tests now check zero-byte rejection, state immutability and canonical connected output. The Python journey preserves quantity, timers, suspension, research, incubation and reload assertions; its before/after haul headers are both captured from supported Samples/Overview. Existing connected Probe/reception tests own acquisition graphics. No new game rules, save format, physical controls, art, retained root or infrastructure.

Independent architecture/source review and exact clean pushed-Git caller checks on the build machine passed at source `db00bf57f146e2a3460e00e898676a280d9899bd`. The changed Lab input/frame, three-device Kit and action-route checks passed. The adapted Python journey passed real timers, repeat expedition and restart with unsupported-frame recovery and same-family before/after stock comparisons. GitHub CI220 passed. These are native software checks, not hardware/runtime or final art acceptance. [Measured result](checks.json).

One asset generator regeneration preserved22 used tables/descriptors and1,451,692 RGBA bytes plus export manifest exactly. Original assets and authored composition reference source remain retained; historical manual geometry is excluded from the current generated/compiled pipeline.

[Current route inventory](../../../native/ui/README.md#screen-coverage-and-target-evidence) · [Native actions](../native-lab-actions/README.md)
