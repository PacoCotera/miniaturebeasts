// Round 4 (Loika): the light-mark floor, the eye matte, the eye ring's own inner and soft, and the other four species unchanged.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { buildScene } from "../mesh.mjs";
import { renderForm } from "../render.mjs";
import { paintMarks } from "../material.mjs";
import { SPECIES } from "../species-trial.mjs";
import { STANDS, loadStands, standRef, SIZE_NAMES } from "../trial.mjs";
import { encodeRGBA } from "../pngrgba.mjs";

// the sha-256 of the round 3 PNG of each of the four species that round 4 must not change (cli.mjs bytes, at 304, 96 and 48)
const ROUND3_SHA = {
  curlop: { 304: "33c6f7005c8c7ce4843ef878d7d189a10cee7c0a67d09a94bea5feaa52e987f0", 96: "d7ed3d2a06a350ca2b392068dd70338d4d23027362596814868e27a55c03f8b0", 48: "bfefc4d37fc9f829deb82ed63c0c08a516a970325b0b08879975e6d043ef1adc" },
  drapet: { 304: "dd7e832d1d040a3c0b190de1cae1f9e68fdaad1955e0eccdaca5baa5e88437b5", 96: "42f5681c196dbb8a0f6306af19c2311b9732b8a0d6bb4b8bbd645377267c7338", 48: "6825cc52be50d451f0af222bd66cbb84fc8f118caa3d8eeba9f37fd320009215" },
  rupar: { 304: "d6896d9e34ae2a0d4959582bc61635efaecbe93979512f19ae47cdf4996732ff", 96: "97551e8b2d1467bb233c6647e89cca5ccb29af038f891ae636d289b82726e7ef", 48: "586c0604d08071bda2d6e8d85f5fabce047b72833bfe7fece0cc9cebc7bbc6ca" },
  wickle: { 304: "5dd86c364475ebc9ab24238e95c8a2eba6461d7a0068c079c6cdec93a2923b25", 96: "2a163d0c591672adb29a71f73ea246ba361d6f38c4e5d9dd730eec04de595203", 48: "a5f1c3c4f41d16cf119cc791c9d9662fcbf49732abc06982b2653264b3707d70" },
};

const sha = (b) => createHash("sha256").update(b).digest("hex");
test("the other four species render byte-identically to round 3", { skip: !existsSync(`${STANDS.curlop}-304x312.png`) }, () => {
  for (const key of Object.keys(ROUND3_SHA)) {
    const form = SPECIES[key], ref = standRef(loadStands(key)[304]), sc304 = buildScene(form, { extentDiv: 220 }), sc120 = buildScene(form, { extentDiv: 120 });
    for (const s of [304, 96, 48]) assert.equal(sha(encodeRGBA(renderForm(s === 304 ? sc304 : sc120, form.camera, s, { ref }))), ROUND3_SHA[key][s], `${key} ${SIZE_NAMES[s]}`);
  }
});

const skin = { kind: "skin", ampLock: 0 };
const baseLook = (extra = {}) => ({ pigments: { skin: [90, 80, 80], belly: [244, 212, 173], patch: [244, 212, 173], ring: [244, 212, 173], nail: [244, 212, 173] }, ...extra });
const ctx0 = (o = {}) => ({ p: [0, 0, 0], part: "body", group: "body", belly: 0, patch: 0, u0: 0, out: {}, ...o });
test("paintMarks reports the strength of the light marks as out.light", () => {
  const look = baseLook({ marks: [{ kind: "nails", share: 0.7, pigment: "nail" }], eyering: { outer: 1, inner: 0.5, soft: 0.25 } });
  assert.equal(ctx0().out.light, undefined);
  let c = ctx0({ belly: 1 }); paintMarks(look, skin, c, [90, 80, 80]); assert.ok(c.out.light > 0.99, "belly");
  c = ctx0({ patch: 1 }); paintMarks(look, skin, c, [90, 80, 80]); assert.ok(c.out.light > 0.99, "plate");
  c = ctx0({ group: "t0", u0: 1 }); paintMarks(look, skin, c, [90, 80, 80]); assert.ok(c.out.light > 0.99, "nail");
  c = ctx0({ p: [0.75, 0, 0], eyes: [{ hit: [0, 0, 0], r: 1 }] }); paintMarks(look, skin, c, [90, 80, 80]); assert.ok(c.out.ring > 0.99 && c.out.light > 0.99, "ring");
  c = ctx0(); paintMarks(look, skin, c, [90, 80, 80]); assert.equal(c.out.light, 0, "bare skin");
});
test("the eye ring honours inner and soft, and keeps .5 and .25 without them", () => {
  const ring = (eyering, d) => { const c = ctx0({ p: [d, 0, 0], eyes: [{ hit: [0, 0, 0], r: 1 }] }); paintMarks(baseLook({ eyering }), skin, c, [90, 80, 80]); return c.out.ring; };
  const tight = { outer: 0.77, inner: 0.45, soft: 0.04 };
  assert.ok(ring(tight, 0.65) > 0.99); // inside the tight ring
  assert.ok(ring(tight, 0.5) > 0.1 && ring({ outer: 0.77 }, 0.5) < 0.01); // inner .45 has started; the default .5 has not
  assert.ok(ring(tight, 0.79) < 0.01); // soft .04 has closed by .79
  assert.ok(ring({ outer: 0.77, inner: 0.45, soft: 0.04 }, 0.75) > 0.4 && ring({ outer: 0.77, inner: 0.45, soft: 0.04 }, 0.75) < 0.6); // half way across the soft edge, which ends at outer
  assert.ok(ring({ outer: 0.77, inner: 0.45 }, 0.7) < 0.5); // the default soft .25 is still rising there
  assert.ok(ring({ outer: 1.45 }, 1.1) > 0.99 && ring({ outer: 1.45 }, 1.6) < 0.01);
});
test("look.ramp.light lifts the shadow floor on the light marks only", () => {
  const form = SPECIES.loika, ref = standRef(loadStands("loika")[304]), sc = buildScene(form, { extentDiv: 120 });
  const f2 = structuredClone(form); f2.look.ramp = { light: 0.85 };
  const a = renderForm(sc, form.camera, 96, { ref }), b = renderForm({ ...sc, form: f2 }, form.camera, 96, { ref });
  let lifted = 0, bareChanged = 0;
  for (let i = 0; i < a.width * a.height; i++) {
    const d = b.data[i * 4] + b.data[i * 4 + 1] + b.data[i * 4 + 2] - a.data[i * 4] - a.data[i * 4 + 2] - a.data[i * 4 + 1];
    if (d > 0) lifted++;
    if (d !== 0 && a.plate[i] === 0 && a.bellyMap[i] === 0 && a.ink[i] === 0) bareChanged++;
  }
  assert.ok(lifted > 50, `${lifted} pixels lifted`); assert.ok(bareChanged < lifted * 0.1, `${bareChanged} bare pixels changed`);
});
test("meta.eyes carries the apex and the cap radius", () => {
  const form = SPECIES.loika, ref = standRef(loadStands("loika")[304]), r = renderForm(buildScene(form, { extentDiv: 120 }), form.camera, 96, { ref });
  for (const e of r.meta.eyes) { assert.equal(e.apex.length, 2); assert.ok(e.capR > 0 && e.capR < e.r); assert.ok(Math.hypot(e.apex[0] - e.at[0], e.apex[1] - e.at[1]) <= e.r + 1e-6); }
});
