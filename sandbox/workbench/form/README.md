# form: the shape model trial, round 3

A separate module beside the current geometry: one spine and an aperture along it, growth by rotation (coils), limbs that solve to the
floor, fur by per-sample inflation, hair as locks in tiers with a fringe and a face pod, a face model, a per-pixel material with a tone ramp
and tufts, a mark layer, and an eye glyph for the small sizes. The designs are the round 1 shape design, `round2/design.md` and
`round3/design.md`; this folder is the trial build, rendered next to the stands and the current rig. Nothing outside it is touched.

| file | what |
| --- | --- |
| `spine.mjs` | knot chains to samples (clothoid curvature, parallel transport, monotone apertures, coils); the smooth fur cap `furOf` |
| `limbs.mjs` | branches on the front or tail chain, the floor, the shin solve, hand reaches, toes |
| `field.mjs` | the implicit field: egg-ellipsoids with fur, smooth min, blends, the floor cut; Drapet's hair (curtain, 22 locks, 3 tiers, hem, bowl, fringe cones) and face pod |
| `face.mjs` | the face frame and cast placement, plate (bound to the mouth line for Loika), eyes (set in, or by section angle), nose, mouth, fringe line |
| `mesh.mjs` | narrow-band surface nets, Newton projection, normals, per-vertex attributes (incl. lock t, id, tip), `buildScene` |
| `material.mjs` | fur, hair and skin per pixel, tufts, marks, the outline tufts |
| `render.mjs` | camera, z-buffer, tone-ramp light, eyes, glow, shadow, framing; the 96 / 48 glyph pass |
| `genome.mjs` | levers and ranges, the region-join rule `atRegionJoin`, corners (2^k, or 512 Latin-hypercube points) |
| `species-trial.mjs`, `tuning.mjs` | `SECTION3` (round 1), `ROUND2`, `ROUND3` (round 2's tuning folded in minus design 8's rejections, plus every round 3 number with its reason), `SPECIES` = ROUND3 plus `tuning.mjs` |
| `checks.mjs` | overlap, feature and face checks, the surface table, belly, tuft band and outline measure; `trial.mjs`, `cli.mjs` the node side |

Everything except `trial.mjs`, `cli.mjs` and `pngrgba.mjs` runs in a browser (no `node:` imports). Units are U; x forward, y left, z up.

    node prototypes/workbench/form/cli.mjs [species ...]          # renders, sheets, report: out/form/ (ignored); a full run is copied to round3/trial/
    node prototypes/workbench/form/cli.mjs wickle --no-visibility --no-corners
    node --test prototypes/workbench/form/tests/                  # the module's tests

Paths: every outside path is in one block at the top of `trial.mjs`, read from `MB_HOME` (default: the folder that holds this checkout).
Stands: the `stand-*` images of the fluffy trial and the signed adult art of S01 and S08; framing is the adult cut rule.

Tuning: `tuning.mjs` holds the builder's changes (at most 15 % of a ROUND3 number, a camera 10 degrees), each with its reason; `report.md`
lists them with the round 3 numbers, every gate with its value, the surface, glyph, face, limb and join tables, the visibility of the open
ranges (a lever that misses is locked and reported) and the timings. The verdict is read from the sheets. Timings depend on the machine's load.
