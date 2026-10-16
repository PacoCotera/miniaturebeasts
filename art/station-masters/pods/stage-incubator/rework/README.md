# T-20261015-01: the Incubator art pass (AD, 10-15; the owner, 20:29: "doesn't quite follow the visual style of the rest, looks flat")

**What made it flat** against Home, Pods and Habitat:
1. The wall machinery (IA1) was flat sage shapes with no bevel, no light and no cast shadow, beside the rendered hoses and gauges.
2. The chamber front was a flat sage arch.
3. The base was a flat sand slab with a flat plate.
4. The leaf arc was flat pixel-art leaves, a third rendering.

**What changed** (all ids and sizes the same, so nothing to re-place in code):

| Id | How |
|---|---|
| `room-bench-stage-incubator` 1024 × 522 | Pro edit of the signed stage; only the two machinery regions taken (`cut-stage.py`) |
| `dome-front-304x272` | Pro edit; the signed alpha (`cut-dome.py`) |
| `base-336x96` | Pro edit; the signed alpha and foot light (`cut-base.py`) |
| `leaf-full-16x20`, `leaf-empty-16x20` | by hand (`paint-leaves.py`) |

3 Pro calls, 11.28 MXN.

**Proof:** `proof/mock-incubator-growing-1x.png` and `proof/before-after-1x.png`, mocked into public station-gate 93bff40f `fix14/incubator-growing.png`.

**Not in this ticket, noted for the gate:**
- The stamp label at the right is still the code-drawn flat grey plate. The fix needs no new art: the label in `plate-well-120x120`, as ruled for Habitat.
- The chamber's inside wall (`dome-back` / `dome-inside-*`) is a soft flat gradient. It is the next candidate if the gate still reads the screen as flat.
