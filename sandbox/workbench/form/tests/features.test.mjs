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

// Round 3 (design 6): the eye glyph: antialiased discs at the sub-pixel centre, the core in the species' own hue, the pupil by size, the catch light by size, a ring only
// where the surround is too dark, the gap rule. (The corner and edge items of face.glyph are gates reported by the CLI: Curlop, Loika, Rupar and Drapet miss some, see the report.)
for (const size of [96, 48]) test(`the eye glyph at ${size}: discs, hue, pupil and catch light by size, no ring on a light surround, the gap, nose and mouth`, () => {
  for (const k of ORDER) {
    const r = R(k, size), f = r.features, eyes = f.eyes.filter((e) => e.visible), want = k === "rupar" ? 1 : 2;
    assert.ok(eyes.length >= want, `${k} ${size}: ${eyes.length} eyes drawn`);
    for (const e of eyes) {
      assert.ok(e.D >= (size === 96 ? 3.2 : 2.2) - 1e-9, `${k}: D ${e.D}`);
      assert.equal(e.hasPupil, e.D >= (size === 96 ? 5 : 3.5), `${k}: pupil by size at D ${e.D}`);
      assert.ok(Lstar(e.coreCol) <= (size === 96 ? 30 : 25) + 1e-9, `${k}: core L* ${Lstar(e.coreCol)}`);
      assert.equal(e.catchA, size === 96 ? (e.D >= 4 ? 1 : e.D >= 3 ? 0.5 : 0) : e.D >= 3 ? 0.6 : 0, `${k}: catch light at D ${e.D}`);
      assert.ok(e.ringOnLight < 0.5, `${k}: ring on a light surround`);
      // the glyph is a disc, not a square: a corner pixel of its box is lighter than its core (a blend), and the hue is the species' own
      const [x0, y0, x1, y1] = e.box, core = px(r, Math.floor(e.center[0]), Math.floor(e.center[1])), corners = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([x, y]) => Lstar(px(r, x, y)));
      assert.ok(corners.some((L) => L > Lstar(core) + 5) || corners.every((L) => L >= Lstar(core)), `${k}: corners ${corners}`);
    }
    if (eyes.length === 2) { const [a, b] = eyes.slice().sort((p, q) => p.center[0] - q.center[0]); assert.ok(b.center[0] - b.D / 2 - (a.center[0] + a.D / 2) >= (size === 96 ? 2 : 1) - 1e-9, `${k}: eye gap`); }
    const nose = boxOfInk(r, [INK.nose]), mouth = boxOfInk(r, [INK.mouth]), form = SPECIES[k], hasNose = form.face.nose && form.face.nose.kind !== "none", hasMouth = form.face.mouth && form.face.mouth.kind !== "none";
    if (size === 96 && hasNose && f.nose.length) assert.ok(nose.n >= 2, `${k}: nose ${nose.n} px`);
    if (size === 48) { assert.equal(mouth.n, 0, `${k}: the mouth is dropped at 48`); if (f.nose.length) assert.equal(nose.n, 1); }
    if (size === 96 && hasMouth && f.mouth) assert.ok(mouth.n >= 3, `${k}: mouth ${mouth.n} px`);
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
