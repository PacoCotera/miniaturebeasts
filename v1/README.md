# v1: the first prototype

This folder is the first Miniature Beasts prototype, imported unchanged from
`critter-lab` at commit `63e824f`. It is kept as a working reference while the
game is redesigned. It is not the design: the authoritative design lives in
[`../design/`](../design/).

## What it contains

| Folder | What it is | State |
| --- | --- | --- |
| `native/` | C17 + LVGL host simulator of the three devices (Companion, Station, Caddy) sharing one process, plus ESP32-S3 compile harnesses for the Companion and Caddy UIs | Builds and passes its checks. Plays one narrow loop: square-by-square map, finite pickups, sealed cargo, once-only Station acceptance, saved research, creation, incubation, reveal, resident visit |
| `prototype/generator-workbench/` | Browser genome-authoring workbench with optional image rendering | Works as a tool. Generated creature art is not accepted |
| `prototype/` (other) | Small fixtures and experiments: genetics proof, transfer, generation, platform gateway | Supporting code for the above |
| `website/` | The previous public site | Superseded; will be rebuilt |
| `design/` | Art the simulator and workbench build from (Pip sprites, core art, source studies) | Build inputs only, not accepted art direction |
| `docs/evidence/` | Captured outputs that some checks replay | Test fixtures |

## What it gets right and wrong

Worth keeping: the transaction rules underneath play. Cargo is sealed and accepted
exactly once; research findings survive shortages; creation commits one fixed
individual; saves survive restarts.

Not the target: the map is a grid of named stops with menus, the field yields
only supplies and sealed capsules, the screens predate the accepted Miniature
Lives art, and there is one creature (Pip) with one varying trait.

## Build and check

From this folder, on Linux with CMake, Ninja, a C17 compiler, Node 22 and Python 3:

```sh
cmake -S native/lab -B native/build/lab -G Ninja -DCMAKE_BUILD_TYPE=Release -DCRITTER_BUILD_SELECTED_LAB=ON
cmake --build native/build/lab
ctest --test-dir native/build/lab --output-on-failure
python3 native/tests/test_v1_journey.py "$PWD/native/build/lab/selected-lab/selected_lab" native/build/lab/journey
```

CI runs the same checks plus the ESP32-S3 and nRF52840 compiles
(`.github/workflows/`). [`BUILD.md`](BUILD.md) has the full detail.

## Old links

READMEs in this folder link to the previous specifications (`specs/`, other
`design/` studies). Those were not carried over. Read them in the archived
repository at
[critter-lab@63e824f](https://github.com/PacoCotera/critter-lab/tree/63e824f5dcae8ea5e3906b860873e1603c3c731b).
Internal names such as `critter`, `Lab` and `Beecho` are legacy identifiers.

[`../import-manifest.json`](../import-manifest.json) lists every imported file
with its original path and SHA-256.
