import { test } from "node:test";
import assert from "node:assert/strict";
import { composePod, patternLayer } from "../podlayers.mjs";

const layer = (w, h, f) => { const a = new Uint8ClampedArray(w * h * 4); for (let i = 0; i < w * h; i++) a.set(f(i), i * 4); return a; };
test("the recolour: body in A, accent and pattern in B, the shade's value doubled, its alpha kept", () => {
  const w = 4, h = 1, shade = layer(w, h, (i) => [128, 128, 128, i === 3 ? 0 : 255]), body = layer(w, h, (i) => [0, 0, 0, i === 1 ? 0 : 255]), accent = layer(w, h, (i) => [0, 0, 0, i === 1 ? 255 : 0]), pattern = layer(w, h, (i) => [0, 0, 0, i === 2 ? 255 : 0]);
  const o = composePod({ shade, body, accent, pattern }, "#ff0000", "#0000ff", w, h);
  assert.deepEqual([...o.slice(0, 4)], [255, 0, 0, 255]);     // body: A at the shade 128/255 × 2 ≈ 1
  assert.deepEqual([...o.slice(4, 8)], [0, 0, 255, 255]);     // accent: B
  assert.deepEqual([...o.slice(8, 12)], [0, 0, 255, 255]);    // pattern: B where the body is
  assert.equal(o[15], 0, "the shade's alpha is the picture's");
});
test("the band lies over the pod only when sealed", () => {
  const w = 1, h = 1, L = { shade: layer(w, h, () => [128, 128, 128, 255]), body: layer(w, h, () => [0, 0, 0, 255]), accent: layer(w, h, () => [0, 0, 0, 0]), band: layer(w, h, () => [10, 20, 30, 255]) };
  assert.deepEqual([...composePod(L, "#ff0000", "#0000ff", w, h)], [255, 0, 0, 255]);
  assert.deepEqual([...composePod(L, "#ff0000", "#0000ff", w, h, { sealed: true })], [10, 20, 30, 255]);
});
test("a shell pattern's words name a layer; smooth shells have none", () => {
  const map = { dots: "dots", ribs: "stripes", segments: "bands", plates: "bands" };
  assert.equal(patternLayer("smooth dots", map), "dots"); assert.equal(patternLayer("soft ribs", map), "stripes"); assert.equal(patternLayer("plates", map), "bands"); assert.equal(patternLayer("smooth", map), null);
});
