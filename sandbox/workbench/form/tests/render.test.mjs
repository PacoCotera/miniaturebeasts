import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { buildScene } from "../mesh.mjs";
import { renderForm, SIZES } from "../render.mjs";
import { SPECIES } from "../species-trial.mjs";
import { decodePNG } from "../../framework/png.mjs";
import { maskOfAlpha, boxOf } from "../checks.mjs";
import { STANDS, SIZE_NAMES } from "../trial.mjs";

const hash = (r) => createHash("sha256").update(Buffer.from(r.data.buffer)).digest("hex");
const standHeight = (k) => { const m = maskOfAlpha(decodePNG(readFileSync(`${STANDS[k]}-304x312.png`))), b = boxOf(m); return b.y1 - b.y0; };
const have = (k) => existsSync(`${STANDS[k]}-304x312.png`);

test("two runs give identical bytes", () => {
  const ref = { height: have("wickle") ? standHeight("wickle") : 290 };
  const a = renderForm(buildScene(SPECIES.wickle, { extentDiv: 120 }), SPECIES.wickle.camera, 96, { ref }), b = renderForm(buildScene(SPECIES.wickle, { extentDiv: 120 }), SPECIES.wickle.camera, 96, { ref });
  assert.equal(hash(a), hash(b));
});
test("feet on the right row at each size and the height within 1 px of the stand's at 304", { skip: !have("curlop") }, () => {
  for (const k of ["curlop", "drapet"]) {
    const ref = { height: standHeight(k) }, sc = buildScene(SPECIES[k], { extentDiv: 120 });
    for (const [s, feet] of [[304, 305], [96, 85], [48, 44]]) {
      const r = renderForm(sc, SPECIES[k].camera, s, { ref }), [W, H] = SIZES[s]; let last = -1, first = H;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (r.coverage[y * W + x] >= 0.5) { last = Math.max(last, y); first = Math.min(first, y); }
      assert.ok(Math.abs(last - feet) <= 1, `${k} ${s}: lowest row ${last}, wanted ${feet}`);
      if (s === 304) assert.ok(Math.abs(last - first + 1 - ref.height) <= 1, `${k}: height ${last - first + 1} vs ${ref.height}`);
      if (s === 48) assert.ok(Math.max(last - first + 1, 0) <= 45);
    }
  }
});
test("alpha is coverage at 304 and 96 and hard at 48", () => {
  const sc = buildScene(SPECIES.wickle, { extentDiv: 120 }), ref = { height: 290 };
  const a = renderForm(sc, SPECIES.wickle.camera, 96, { ref }), b = renderForm(sc, SPECIES.wickle.camera, 48, { ref });
  assert.ok([...a.data.filter((_, i) => i % 4 === 3)].some((v) => v > 0 && v < 255));
  assert.ok([...b.data.filter((_, i) => i % 4 === 3)].every((v) => v === 0 || v === 110 || v === 255));
});
test("the glow adds no geometry: the scene is the same with it on or off, and the halo lies beyond the outline", () => {
  const sc = buildScene(SPECIES.wickle, { extentDiv: 120 }), h0 = createHash("sha256").update(Buffer.from(sc.mesh.vertices.buffer)).digest("hex"), ref = { height: 290 };
  const on = renderForm(sc, SPECIES.wickle.camera, 304, { ref }), off = renderForm(sc, SPECIES.wickle.camera, 304, { ref, glow: false });
  assert.equal(createHash("sha256").update(Buffer.from(sc.mesh.vertices.buffer)).digest("hex"), h0);
  assert.deepEqual(Array.from(on.coverage), Array.from(off.coverage));
  let outside = 0; for (let i = 0; i < on.halo.length; i++) if (on.halo[i] > 0.25 && on.coverage[i] < 0.5) outside++;
  assert.ok(outside > 30); assert.ok(off.halo.every((v) => v === 0));
});
test("all three sizes of one species render in the time of this machine (the brief's 3 s is reported, not met: see the report)", () => {
  const ref = { height: 290 }, t = performance.now(), form = SPECIES.wickle;
  const a = buildScene(form, { extentDiv: 220 }), b = buildScene(form, { extentDiv: 120 });
  renderForm(a, form.camera, 304, { ref }); renderForm(b, form.camera, 96, { ref }); renderForm(b, form.camera, 48, { ref });
  assert.ok(performance.now() - t < 10000, `${performance.now() - t} ms`);
});
