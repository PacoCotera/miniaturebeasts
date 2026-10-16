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

# T-20261015-07: IA2, the stage recut onto the layout grid (AD, 10-15, 0 MXN, by hand)

`room-bench-stage-incubator`, the same id, 1024 × 522 at (0, 40), made by `recut-ia2.py` from the T-01 stage. Nothing is repainted in style: each object is lifted with its cast shadow as its deviation from the wall's tone and laid back at its move; the place it leaves is the wall's own tone and grain.

| Object | Move | Ink after (screen, measured) |
|---|---|---|
| Left column | (−10, +12), 4 riser rows taken out between the two lower clamps (slice rows 284–287), so the lower part moves (−10, +8) | top 104 |
| LM valve | (+3, −1) | 336–388 rows |
| RM pump | (+3, +3) | 696–750 × 336–399 |
| R group | (+1, +6) | 797–935 × 104–213 (±1) |
| Gauges | (−5, +3), (+10, +3), (+5, +3) | 88–155, 784–850, 868–934 × 470/471–528/529 |
| Hoses | wall ends kept; base ends lifted 16 px along the last bend only (x 196–296 and 700–772) | couplings at rows 493–504 and 495–502 |

- The right floor pocket (the dark ground under the hose and the gauges) stays put; only the objects and their near shadows move.
- Outside the wall nothing changes. Inside the keep-clears, only where an object left or arrived: the column's shadow in the leaf band (x 248–296), the hose ends and the LM/RM shadows in the chamber's box, and the R group's shadow at the label's top (rows 232–262).
- Zone luminance (relative, linear): L p95 0.459 / mean 0.163; R 0.315 / 0.130; LM 0.437 / 0.170; RM 0.273 / 0.099. The T-01 stage measured the same before the move (0.464 / 0.168, 0.312 / 0.124, 0.435 / 0.168, 0.251 / 0.088). The p95 cap of 0.162 does not hold: it was the IA1 gauge housings' value, and T-01's lit sage tops sit above it. All four means are under 0.287.
- The rail's well at 40 (the leaf point): it does not read. At 40 its bottom wall and lit lip sit behind the tabs (y 40–80), so only the two slanted ends show; at 48 the 5 px sage lip under the tabs is what makes it a well. No `x40` ids cut. `proof-ia2/leaf-point-well48-over-well40-1x.png` shows both, with the outer arc's top leaf at its slot (504, 90).
- **Proof** `proof-ia2/`: `mock-incubator-growing-well48-1x.png` (the IA2 stage in public station-gate cd3163ad `fix14/incubator-growing.png`, the base and its foot light lifted to 440), the same with the 40 well, `before-after-ia2-1x.png`. Made by `mock-ia2.py`.
