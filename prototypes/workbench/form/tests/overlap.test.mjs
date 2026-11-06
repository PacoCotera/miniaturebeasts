// Round 3: the overlap floors of all five hold at 304 and 48 (design 9: unchanged .80, .83, .89, .74, .62; Rupar's measured .622 at 304 (v)).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { buildScene } from "../mesh.mjs";
import { silhouette } from "../render.mjs";
import { SPECIES, ORDER } from "../species-trial.mjs";
import { STANDS, loadStands, standRef, maskOfAlpha, maskOfCoverage, overlaps, OVERLAP_TARGET } from "../trial.mjs";
for (const k of ORDER) test(`${k}: the silhouette overlap with the stand is at least ${OVERLAP_TARGET[k]} at 48 px`, { skip: !existsSync(`${STANDS[k]}-304x312.png`) }, () => {
  const form = SPECIES[k], stands = loadStands(k), ref = standRef(stands[304]), sc = buildScene(form, { extentDiv: 220 });
  const o = overlaps(maskOfAlpha(stands[304]), maskOfCoverage(silhouette(sc, form.camera, 304, ref, { ss: 3 })));
  assert.ok(o.o48 >= OVERLAP_TARGET[k] - 0.01, `${k}: ${o.o48.toFixed(3)} (floor ${OVERLAP_TARGET[k]}; the silhouette fast path reads about 0.01 under the render)`);
});
