import { test } from "node:test";
import assert from "node:assert/strict";
import { composePod, patternLayer, figureComposite, figureAlpha } from "../podlayers.mjs";

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

test("the relief factor: a missing relief is 0.5 (times two, one); a lit relief brightens, a dark one darkens", () => {
  const w = 1, h = 1, L = { shade: layer(w, h, () => [128, 128, 128, 255]), body: layer(w, h, () => [0, 0, 0, 255]), accent: layer(w, h, () => [0, 0, 0, 0]) };
  const base = composePod(L, "#800000", "#0000ff", w, h)[0];
  assert.equal(composePod({ ...L, relief: layer(w, h, () => [128, 128, 128, 255]) }, "#800000", "#0000ff", w, h)[0], base, "relief 0.5 changes nothing");
  assert.ok(composePod({ ...L, relief: layer(w, h, () => [200, 200, 200, 255]) }, "#800000", "#0000ff", w, h)[0] > base); assert.ok(composePod({ ...L, relief: layer(w, h, () => [40, 40, 40, 255]) }, "#800000", "#0000ff", w, h)[0] < base);
});
test("the figure: clear laid over mist with the clear layer's alpha times t, transparent pixels add no colour, t clamped; t 0 is the mist", () => {
  const w = 4, h = 1, mist = layer(w, h, (i) => [[0, 0, 0, 0], [100, 100, 100, 255], [100, 100, 100, 128], [0, 0, 0, 0]][i]), clear = layer(w, h, (i) => [[200, 0, 0, 255], [200, 200, 200, 255], [0, 0, 0, 0], [0, 0, 0, 0]][i]);
  const at0 = figureComposite(mist, clear, 0); assert.deepEqual([...at0], [...mist].map((v, i) => (i % 4 === 3 || mist[i - (i % 4) + 3] ? v : 0)), "t 0 is the mist (transparent pixels carry no colour)");
  const half = figureComposite(mist, clear, 0.5);
  assert.deepEqual([...half.slice(0, 4)], [200, 0, 0, 128], "over transparent mist: the clear colour at half alpha, not darkened by the empty mist");
  assert.deepEqual([...half.slice(4, 8)], [150, 150, 150, 255], "over opaque mist: the halfway grey");
  assert.deepEqual([...half.slice(8, 12)], [100, 100, 100, 128], "no clear there: the mist as it was");
  assert.deepEqual([...half.slice(12, 16)], [0, 0, 0, 0], "nothing in either: nothing");
  assert.deepEqual([...figureComposite(mist, clear, 7)], [...figureComposite(mist, clear, 1)]); assert.deepEqual([...figureComposite(mist, clear, -3)], [...at0]);
  assert.deepEqual([...figureComposite(mist, clear, 1).slice(4, 8)], [200, 200, 200, 255], "t 1: the clear over the mist");
});
test("a held figure shows its mist in both states: no fade at any share of chapters read", () => {
  assert.equal(figureAlpha(["master", "held"], 0.75), 0); assert.equal(figureAlpha(["held", "held"], 1), 0); assert.equal(figureAlpha(["master", "master"], 0.75), 0.75);
  const mist = layer(1, 1, () => [90, 90, 90, 255]), clear = layer(1, 1, () => [250, 250, 250, 255]);
  assert.deepEqual([...figureComposite(mist, clear, figureAlpha(["held"], 1))], [90, 90, 90, 255]);
});
