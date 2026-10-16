# PA2: the Probe stage recut for the upright cradle (AD, 10-15)

`room-bench-stage-probe` keeps its id and size (1024 × 522, at screen (0, 40)).

1. `lift-tools.py` takes the gauge, the screwdriver and the wrench off the floor. The floor under them is repainted with a harmonic tone from the floor around them plus its own grain, clamped to the floor's rows (≤ 491), so the lip and rim are untouched. Their old painted shadows go with them.
2. `compose-zone.py` lays the same painted objects, 1:1 and not rescaled, in the tools zone (screen 368, 96, 208 × 352). Each gets a contact shadow from its own alpha (+3, +4, blur 2).
   - The dock's cable runs from under the cradle's back plate through the zone, under the tools, to a plug with brass pins on the floor.
   - Check: the largest empty square in the zone is 94 (< 96). Every tool, the plug and the pins are inside the zone.

Proofs: `proof/mock-bench-{t1,away}-1x.png`, today's page-bench with the new stage, the cradle at (40, 96) and the column and strip as captured.
