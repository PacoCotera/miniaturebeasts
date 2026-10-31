# form: the shape model trial

A separate module beside the current geometry: one spine and an aperture along it, growth by rotation (coils), branches
that blend only near their root, a coat and a hair that falls along its tangent, and a face anchored on the surface.
The design is `shape-model.md` (section 1 the model, 2 the genome levers, 3 the five species, 4 the renderer); this folder is
the trial build of it, rendered next to the stands and the current rig. Nothing outside this folder is touched.

| file | what |
| --- | --- |
| `spine.mjs` | knot chains to samples: clothoid curvature, parallel-transport frame, monotone-cubic apertures, coils, guards |
| `field.mjs` | the implicit field F (inside positive): egg-ellipsoids, smooth min, root-local blends, eyes, coat, hair, window, floor cut |
| `mesh.mjs` | narrow-band surface nets, Newton projection, gradient normals, per-vertex attributes, `buildScene` |
| `genome.mjs` | the levers and their ranges, `formOf(species, copies)` |
| `species-trial.mjs`, `tuning.mjs` | the five base forms (`SECTION3` verbatim, `TUNING` listed with before and after) |
| `render.mjs` | the stand camera, z-buffer, light, eyes, glow and halo, shadow, framing |
| `checks.mjs` | overlap and the feature checks; `trial.mjs` and `cli.mjs` the node side (stands, current rig, sheets, report) |

The first six files run in a browser (no `node:` imports). Units are U; x forward, y left, z up, the floor is z = 0.

    node prototypes/workbench/form/cli.mjs [species ...]          # renders, sheets, report: out/form/ (ignored), copied to the results trial/
    node prototypes/workbench/form/cli.mjs wickle --no-visibility --no-corners
    node --test prototypes/workbench/form/tests/                  # the module's tests (tests/index.js runs every file)

Where the numbers come from: the five forms are the section 3 numbers of the design; the builder's tuning (at most 15 %,
the camera 10 degrees) and the one owner-note change are in `tuning.mjs`, each with its reason, and in `report.md`.
The stands are the `stand-*` images of the fluffy trial and the signed adult art of S01 and S08; the framing is the adult cut rule.
`report.json` and `report.md` carry every overlap, every feature check with its value, the visibility of the open ranges and the timings.
