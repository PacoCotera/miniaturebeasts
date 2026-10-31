// Round 3, design 5: the body's L* at the 5th percentile and the median at 304 is within +-6 of the stand's (the table of design 5).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { buildScene } from "../mesh.mjs";
import { renderForm } from "../render.mjs";
import { SPECIES, ORDER } from "../species-trial.mjs";
import { STANDS, loadStands, standRef } from "../trial.mjs";
import { surfaceValue, SURFACE_TARGET } from "../checks.mjs";
for (const k of ORDER) test(`surface.value ${k}: L* p5 and p50 at 304 within +-6 of the stand's`, { skip: !existsSync(`${STANDS[k]}-304x312.png`) }, () => {
  const f = SPECIES[k], ref = standRef(loadStands(k)[304]), sv = surfaceValue(renderForm(buildScene(f, { extentDiv: 220 }), f.camera, 304, { ref })), t = SURFACE_TARGET[k];
  assert.ok(Math.abs(sv.p5 - t[0]) <= 6 && Math.abs(sv.p50 - t[1]) <= 6, `${k}: ${JSON.stringify(sv)} against ${t}`);
});
