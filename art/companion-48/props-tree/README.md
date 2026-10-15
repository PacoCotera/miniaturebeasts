# A5: the meadow tree prop (AD, 10-15, 0 MXN)

These replace the code stand-ins at their own ids and sizes, so every anchor stays as it is:

| Id | Size | Placed | sha256 (first 16) |
|---|---|---|---|
| `c-trunk-32` | 32×32 | in the cell at (8, 16), y-sorted with the sprites | `da759f8b2ac8d0b2` |
| `c-canopy-88x76` | 88×76 | the canopy overlay; the code still thins it to the checkerboard when a token is beside the trunk | `64a7ba3effdd060f` |

- **Colours.** Both pieces are in the meadow palette (`meadow-palette.json`), with nothing off it. Alpha is 0 or 255.
  - The canopy uses the meadow bushes' greens, a lime fleck and a 2 px void outline, as the bushes have.
  - The trunk uses the bridge's wood and a dithered contact shade in the bushes' ground-shadow green.
- **Canopy.**
  - Eight leaf clusters, built as domes and lit from the top left.
  - Where a front cluster stands over a back one, the back cluster's rim falls into shade.
  - The leaves are flat patches about 5.5 px apart, with points.
  - Each green's share of the canopy is matched to the signed bush-1, so the tree and the bushes read as one kit.
- **Trunk.** Short and lit from the left, with a two-root flare.
- **Build.** `make-tree-prop.py MEADOW_PROPS.png OUT` reads `terrain/meadow/meadow-props.png` for bush-1's tone shares.
- **Proof.** `proof/tree-on-lawn-{1,3}x.png`: the tree whole, the tree under the checkerboard, and bush-1, on the meadow lawn at the place's anchors.

**One placement note for the builder.** At ts 48 the overlay is drawn at `x*ts + 16 - 44`, the 32 px tile's centre. That puts the canopy 8 px left of the trunk, which is centred at 24 in the 48 cell. The proofs use `x*ts + ts/2 - 44`. The y offset (`+16 - 58`) is right as it is: the canopy's bottom lands on cell row 34, so about 10 rows of trunk and the roots show.

**Not in this piece.** The tree's shade pool on the ground is a ground or code job, not part of the overlay.

**Status.** Candidate. The AD signs it in the S1/S2 place and map captures (A7).
