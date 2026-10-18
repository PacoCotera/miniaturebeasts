# Review: T-216 fix round and finds — cargo/build-spec @ 165c7225 (f50c1304 + 165c7225 over ba2c26d1)

Two commits on ba2c26d1 (my earlier PASS, results/review-t216.md): f50c1304 (the art gates' fixes) and 165c7225 (the recut finds), both by Paco Cotera <paco@cotera.org>, no trailers or model/session names. I rebuilt face at 165c7225 and ran everything myself.

## Verdict: FAIL on one item (T-20261016-234); everything else holds

The lead asked about the tenth pods golden failure. It comes from the finds commit: the Pods state `chapter page, sealed` draws the crystal find (`pods.json` `sealedFindSlot` is `find-{kind}-112x112`), and 165c7225 changed that master to the alpha recut. The golden for that state was not retaken. On station-gate and at ba2c26d1 it passes. In a scratch retake the only changed pixels of that state are 9,919 inside the find's 112 x 112 box (x 392 to 503, y 256 to 367): the crystal over the pane rather than on its opaque dark-blue square. So it needs its golden retaken before merge: T-234 asks for only that state (the other twelve pods goldens stay as committed: nine of them are the known drift and must not be re-baked). In my environment the entry moves from hash 8d9b4620 to fb08c43b; the old golden matched in my environment, so the hash should agree in the builder's.

## Checks at 165c7225
| check | result |
|---|---|
| station tests | 550 / 550 |
| ui tests | 80 / 80 |
| face tests (full) | 536 / 558, 22 failures; the same names as station-gate's 22 (all Create) |
| public guard (--base origin/station-gate 12878132) | exit 0 |
| face guard | ok |
| place-masters | 1001 placed, 0 problems |
| metrics vectors | current (12369 cases) |
| `checks.mjs` | exit 0 |
| layer-check | exit 0, no FAIL line |
| `journey.mjs` | no "differs from the golden" line; the same 9 in-page FAILs as the base's |
| `cargo-cuts.py --check --cleaned` | exit 0: the lifting crates and the open hatch are still the art director's cleaned cuts byte for byte |
| goldens, all screens | cargo, create, incubator, home, habitat, idle, vivarium, library, bench match; **pods fail 10**: station-gate's 9 plus `chapter page, sealed` |

The builder's 1188 and 1166 pass: station 550 + ui 80 + face 558 = 1188, 536 pass + 550 + 80 = 1166: matches. I did not look at the cause of the nine known pods failures (the pod art's colour drift, as before).

## The fixes (uiux-rulings.md §2.3 and §6, the art director's gate)
- **The mat row by count:** `regions.waiting.pods.byCount` is 1 at 84, 2 at 60 and 108, 3 at 36, 84 and 132; four or more keep 32, 80, 128 with "+n" at 180. The mat travel target follows (a second pod of two lands at 108, minus (24, 64)); the test holds one at 84, two at 60 and 108 (pods and shadows), the travel's end and the older pod's place. The golden for three pods shows 36, 84 and 132.
- **The done crates at value × 0.6:** `cargo-cuts.py` now dims the three done cuts by 0.6, hue kept; I regenerated them (the cut script's output is pixel-identical to the files in the tree) and the end golden shows the three crates visibly darker than the sealed ones.
- **`hatch-frame-166x266`:** script-cut (a 3 px rim in the bay's sage, radius 8, a dark outline, the opening clear), placed at (21, 147) shut and open, in the painted-family policy and the props schema; the departure check and test now hold the hatch and its frame at the hatch rect grown by 3 in every state. The goldens show the rim round the shut and the open hatch.
- **The portrait in flight is the frame alone:** the props already drew the painting only when the mibi's portrait has a digest (the §8.5 no-digest rule), so the fix is the golden scenes: `crateSitting(false)` (no digest) for the bay-portrait states and the three-crate opening, replacing the test-card digest. The stills no longer show the four-colour square. One consequence: the goldens no longer exercise the with-digest path (the painting inside the frame); the station props test is where that is held.
- **The end has no pearl:** the end scene's crates carry no find; finds still draw when a crate carries them (the one-crate opening still plays the pearl).
- **The counter arrival tick:** unchanged, as the lead said (the earlier review's tests hold it).
- **The finds (165c7225):** the three 112 px masters are the alpha recuts placed over the opaque ones, their index hashes updated; `place-masters` 1001 placed, 0 problems. The pearl in the opening golden shows without the dark-blue square (cargo-opening-find). Eight Cargo goldens retaken, all from the one-crate opening that carries the pearl; they match what my environment draws.

## Not covered
- The nine known pods failures and the 22 Create face failures are the base's.
- I read the end and opening-find goldens; I did not look at all 29.
