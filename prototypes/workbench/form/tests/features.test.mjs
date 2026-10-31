// Round 2: the face at 96 and 48 (design 3). Every row of the table, the drop rule, the same bytes twice.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { buildScene } from "../mesh.mjs";
import { renderForm, INK, Lstar } from "../render.mjs";
import { SPECIES, ORDER } from "../species-trial.mjs";
import { standHeightOf } from "./helpers.mjs";

const cache = {};
const scene = (k, form = SPECIES[k], tag = k) => (cache[tag] ??= buildScene(form, { extentDiv: 120 }));
const R = (k, size, form = SPECIES[k], tag = k) => renderForm(scene(k, form, tag), form.camera, size, { ref: { height: standHeightOf(k) } });
const px = (r, x, y) => { const i = (y * r.width + x) * 4; return [r.data[i], r.data[i + 1], r.data[i + 2]]; };
const boxOfInk = (r, codes) => { let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1, n = 0; for (let y = 0; y < r.height; y++) for (let x = 0; x < r.width; x++) if (codes.includes(r.ink[y * r.width + x])) { n++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return { n, x0, x1, y0, y1 }; };

for (const size of [96, 48]) test(`the face table at ${size}: eye cores, light surround, catch light, the gap, the order, the plate`, () => {
  for (const k of ORDER) {
    const r = R(k, size), f = r.features, eyes = f.eyes.filter((e) => e.visible), want = k === "rupar" ? 1 : 2;
    assert.ok(eyes.length >= want, `${k} ${size}: ${eyes.length} eyes drawn`);
    const [mw, mh] = size === 96 ? [3, 3] : k === "rupar" ? [1, 2] : [2, 2];
    for (const e of eyes) {
      assert.ok(e.core[0] >= mw && e.core[1] >= mh, `${k}: core ${e.core}`);
      const [x0, y0, x1, y1] = e.box, ring = []; for (let x = x0 - 1; x <= x1 + 1; x++) { ring.push([x, y0 - 1, "t"], [x, y1 + 1, "b"]); } for (let y = y0; y <= y1; y++) ring.push([x0 - 1, y, "l"], [x1 + 1, y, "r"]);
      const core = px(r, x1, y1); assert.ok(Lstar(core) <= 30, `${k}: core L* ${Lstar(core)}`);
      const light = ring.filter(([x, y]) => Lstar(px(r, x, y)) >= Lstar(core) + 35);
      if (size === 96) assert.ok(light.length / ring.length >= 0.6, `${k}: surround ${light.length}/${ring.length}`);
      else assert.ok(new Set(light.map((q) => q[2])).size >= 2, `${k}: surround sides`);
      if (size === 96 && e.core[0] >= 4 && e.core[1] >= 4) assert.equal(r.ink[y0 * r.width + x0], INK.catch);
    }
    if (eyes.length === 2) { const [a, b] = eyes.map((e) => e.box).sort((p, q) => p[0] - q[0]); assert.ok(b[0] - a[2] - 1 >= (size === 96 ? 2 : 1), `${k}: eye gap ${b[0] - a[2] - 1}`); }
    // nose: 96 at least 2 px; 48 one px, only where the plate is >= 6 px tall and clear of the eyes; mouth: 96 a 1 px stroke >= 3 px, else dropped; 48 dropped
    const nose = boxOfInk(r, [INK.nose]), mouth = boxOfInk(r, [INK.mouth]), form = SPECIES[k], hasNose = form.face.nose && form.face.nose.kind !== "none", hasMouth = form.face.mouth && form.face.mouth.kind !== "none";
    if (size === 96 && hasNose && f.nose.length) assert.ok(nose.n >= 2, `${k}: nose ${nose.n} px`);
    if (size === 48) { assert.equal(mouth.n, 0, `${k}: the mouth is dropped at 48`); if (f.nose.length) assert.equal(nose.n, 1); }
    if (size === 96 && hasMouth && f.mouth) assert.ok(mouth.n >= 3, `${k}: mouth ${mouth.n} px`);
    // the order: eye line above the nose above the mouth, each >= 1 px apart
    const eyeBottom = Math.max(...eyes.map((e) => e.box[3]));
    if (f.nose.length) assert.ok(nose.y0 >= eyeBottom + 2, `${k}: nose ${nose.y0} vs eye bottom ${eyeBottom}`);
    if (f.mouth) assert.ok(mouth.y0 >= (f.nose.length ? nose.y1 + 1 : eyeBottom) + 1, `${k}: mouth order`);
    if (SPECIES[k].face.plate !== false && !SPECIES[k].face.opening) { const n = [...r.plate].filter((v, i) => v > 0 && r.coverage[i] >= 0.5).length; assert.ok(n >= (size === 96 ? 30 : 8) || k === "rupar" || k === "loika", `${k}: plate ${n} px`); }
  }
});
test("a synthetic collision drops the mouth and keeps both eyes", () => {
  const f = structuredClone(SPECIES.wickle); f.face.nose.y = -0.03; f.face.mouth.y = -0.05; f.face.mouth.w = 0.2;
  const r = R("wickle", 96, f, "wickle-collide"), eyes = r.features.eyes.filter((e) => e.visible);
  assert.equal(eyes.length, 2); assert.equal(r.features.mouth, null); assert.ok(r.features.dropped.some((d) => /^mouth/.test(d)), r.features.dropped.join("; "));
});
test("two runs give identical bytes at 96 and 48", () => {
  const h = (r) => createHash("sha256").update(Buffer.from(r.data.buffer)).digest("hex");
  for (const size of [96, 48]) assert.equal(h(R("loika", size)), h(renderForm(buildScene(SPECIES.loika, { extentDiv: 120 }), SPECIES.loika.camera, size, { ref: { height: standHeightOf("loika") } })));
});
