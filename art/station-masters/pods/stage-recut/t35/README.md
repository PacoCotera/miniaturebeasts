# T-20261016-35: the Pods stages without the hose, gauge and vent (AD, 10-16, by hand)

The purpose (`specs/station-pods-purpose.md`, work-queue): the player gets to know each pod they brought home and picks one to create from. The hose, the wall gauge and the vent served none of that, so they go. Nothing new is painted.

`lift-props.py overview|chapter IN OUT` works the way `../clear-heading-band.py` does:
- **The props** are found only inside hand-set boxes. Those boxes start under the wall joint and stop short of the sand prints, the dish, its grass and tag.
- **Their cast shadows** go too: within 16 px of a prop and darker than the floor's filled tone, as `../../bench/stage-pa2/lift-tools.py` does.
- **The fill** is the floor's own tone (a harmonic fill) and its own grain, taken from plain floor nearby.

| Id | Lifted | Pixels changed |
| --- | --- | --- |
| `room-bench-stage-overview` | the hose (top-left wall to the ground), the wall gauge and the vent | 53,404, in slice x 79–951 × y 42–291 |
| `room-bench-stage-chapter` | the hose (it ended at x 334 since gate batch 1) | 20,526, in slice x 79–395 × y 50–291 |

**Unchanged:** the dish, its light, the found-note's place, the sand prints and everything below y 292 or right of x 160 under y 125 stay pixel for pixel (0 pixels changed there, checked).

**One faint patch:** a slightly darker patch remains where the hose bent (slice about 130–150, 95–110), within the floor's own tone variation.

Proofs at 1× on the station-gate 69ea1d23 goldens, before above and after below: `proof/pods-overview-unidentified-before-after-1x.png` and `proof/pods-chapter-page-before-after-1x.png`.
