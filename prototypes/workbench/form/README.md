# form: the shape model trial, round 2

A separate module beside the current geometry: one spine and an aperture along it, growth by rotation (coils), limbs that
solve to the floor, fur by per-sample inflation, a hair that hangs, a face model, a per-pixel material and a mark layer.
The designs are `shape-model.md` (round 1) and `round2/design.md` (round 2); this folder is the trial build of both, rendered
next to the stands and the current rig. Nothing outside this folder is touched.

| file | what |
| --- | --- |
| `spine.mjs` | knot chains to samples: clothoid curvature, parallel transport, monotone apertures that leave a knot with a coil's own slope, coils with the bending axis eased into the coil plane, fur depth per sample, guards |
| `limbs.mjs` | branches on the front or the tail chain (mirrored), the floor order, the shin solve, the hand reach, toes, hover |
| `field.mjs` | the implicit field F (inside positive): egg-ellipsoids with their fur, smooth min, root-local blends, the floor cut, hair with its hang law and hem of locks, the face's relief; no noise term |
| `face.mjs` | the face frame, the cast placement, plate, eyes, nose, mouth stroke, the hair opening |
| `mesh.mjs` | narrow-band surface nets, Newton projection, gradient normals, per-vertex attributes, `buildScene` |
| `material.mjs` | fur, hair and skin per pixel with the 1.5 px fade, the marks (belly, plate, spots, socks, tips, nails), the outline fringe |
| `render.mjs` | the stand camera, z-buffer, light, eyes, glow, shadow, framing, and the 96 / 48 feature pass |
| `genome.mjs` | the levers and ranges, the corners (2^k for k <= 10, else 512 Latin-hypercube points), `formOf(species, copies)` |
| `species-trial.mjs`, `tuning.mjs` | `SECTION3` (round 1, verbatim), `TRIAL1`, `ROUND2` (each §7 change with its reason), `SPECIES` = ROUND2 plus the round 2 tuning |
| `checks.mjs` | overlap, the feature checks and the round 2 checks; `trial.mjs` and `cli.mjs` the node side (stands, current rig, sheets, report) |

The files except `trial.mjs`, `cli.mjs` and `pngrgba.mjs` run in a browser (no `node:` imports). Units are U; x forward, y left, z up, the floor is z = 0.

    node prototypes/workbench/form/cli.mjs [species ...]          # renders, sheets, report: out/form/ (ignored), copied to round2/trial/ on a full run
    node prototypes/workbench/form/cli.mjs wickle --no-visibility --no-corners
    node --test prototypes/workbench/form/tests/                  # the module's tests (tests/index.js runs every file)

Paths: every outside path is in one block at the top of `trial.mjs`, read from `MB_HOME` (default: the folder that holds this checkout).
The stands are the `stand-*` images of the fluffy trial and the signed adult art of S01 and S08; the framing is the adult cut rule.

Where the numbers come from: `ROUND2` is round 1's section 3 numbers with round 1's tuning folded in plus the changes of design section 7.
The builder's tuning (at most 15 % of a ROUND2 number, a camera 10 degrees) is in `tuning.mjs`, each with its reason, and in `report.md`.
`report.json` and `report.md` carry every overlap, every check with its value, the face, limbs and joins tables, the texture energy,
the visibility of the open ranges (a lever that misses is locked and reported) and the timings. The verdict is read from the sheets.
