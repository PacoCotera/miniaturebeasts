# T-20261016-156: the world row's marks

These follow `specs/station-fix5-cargo-spec.md`, "Amendment (T-20261016-155)", and `specs/world-events.md` §5. Made by `make-world-marks.py`.

| Id | Size | What |
| --- | --- | --- |
| `world-mark-sprout` | 24 × 24 | grown |
| `world-mark-cane` | 24 × 24 | elder |
| `world-mark-lamp-low` | 24 × 24 | an outpost's lamp low: a lantern with a small cream flame |
| `world-mark-lamp-out` | 24 × 24 | an outpost's lamp out: the lantern dark |
| `world-mark-bolt` | 24 × 24 | storm |
| `world-mark-fruit` | 24 × 24 | fruit, repeated up to 3 |
| `world-mark-glint` | 24 × 24 | stirring, repeated up to 3 |
| `world-mark-pair` | 24 × 24 | young |
| `world-mark-still` | 24 × 24 | quiet |
| `world-herd-1` … `-8` | 20 × 16 | the hoof-trail arrow, turned N, NE … NW |
| `world-land` | 32 × 32 | the plain land mark for shallows and cliff, in the place badges' round cut |

- **Reused, not repainted:** the sun mark is the existing `frame-sun-16`. The place badges are the existing `place-{g}-32x32` (T-31, T-35, T-98), as the spec names them, so they aren't painted again from the 48s and 64s.
- **R6 holds on the card:** no amber, gold or white, so the stirring glint is in cream rather than the house glint's gold. The partner ring's teal is the spec's own.

**Proof** (`proof/`, labelled):
- `world-marks-1x.png` and `-4x.png`;
- `cargo-report-world-row-1x.png`: the longest card (h 264) with storm over the rock field (the partner's face), a mibi grown with the partner ring, and fruit on 3 bushes in the wood.
