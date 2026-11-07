// The rounded-box composed ops `rrect` and `rcorners` (prim.h, the composed-ops comment): `rrect` is a box with rounded corners, its whole in a fill colour and a 1 px edge on its outline; `rcorners` is the four corners of a box that lie outside
// that shape. The oracle is ui/rings.mjs's integer ring mask (the ops draw with the same mask: a ring of width 4000 is the whole shape, a ring of width 1 its outline). Per op: an exact-pixel vector at radius 0, an exact-pixel vector at a typical
// radius (6, the panel's windows), a colour that is not on the palette refused, a box that leaves the picture refused, and no pixel off the palette. In Node on the WebAssembly build; skipped when the face has not been built.
//   node --test prototypes/face/tests/prim-rrect.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { ringMask } from "../../ui/rings.mjs";
import { bootFace } from "../../station/src/face-lvgl.mjs";
import { installScene } from "./node-scene.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist/node"), built = existsSync(path.join(dist, "face.mjs")), skip = !built && "face not built (prototypes/face/build.sh)";
const palette = JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")).colours;
const rgbOf = (name) => { const h = palette.find((c) => c[0] === name)[1]; return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const FILL = "panel", EDGE = "hairline", CORNER = "fog", F = rgbOf(FILL), E = rgbOf(EDGE), C = rgbOf(CORNER), PIC = [10, 10, 40, 30];   // the picture: 40 x 30 at (10, 10)
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

async function draw(ops, rect = PIC) {
  const f = installScene(await bootFace(pathToFileURL(dist + "/"), { test: true })); f.send({ t: "palette", colours: palette });
  const env = { rgb: () => [0, 0, 0], cap: () => 12, picture: () => null, slice: () => null, tile: () => 0 };
  f.scene([{ id: "c", kind: "composed", rect, ops }], env); for (let i = 0; i < 3; i++) f.frame((f.t = (f.t ?? 0) + 16));
  const bg = f.pixel(2, 2); return { f, bg, at: (x, y) => f.pixel(rect[0] + x, rect[1] + y) };
}
// what a box of w x h and radius r draws: the whole shape (fill) and its outline (edge), from the oracle
const shape = (w, h, r) => ringMask(w, h, 4000, r), outline = (w, h, r) => ringMask(w, h, 1, r);

for (const r of [0, 6]) {
  test(`rrect at radius ${r}: every pixel is the fill inside the shape, the edge on its 1 px outline, and the picture's own (clear) outside, as the ring mask gives them`, { skip }, async () => {
    const [w, h] = [40, 30], { f, bg, at } = await draw([["rrect", 0, 0, w, h, r, FILL, EDGE]]); assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0);
    const S = shape(w, h, r), O = outline(w, h, r); let bad = 0, nF = 0, nE = 0, nOut = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const p = at(x, y), want = O[y * w + x] ? E : S[y * w + x] ? F : bg; if (!same(p, want)) bad++;
      if (O[y * w + x]) nE++; else if (S[y * w + x]) nF++; else nOut++;
    }
    assert.equal(bad, 0, `${bad} of ${w * h} pixels differ from the mask`); assert.ok(nF > 0 && nE > 0, "both the fill and the edge are drawn");
    if (r === 0) { assert.equal(nOut, 0, "radius 0 is a square box: nothing outside"); assert.equal(nE, 2 * (w + h) - 4, "the edge is the box's 1 px outline"); }
    else assert.ok(nOut > 0, "radius > 0 cuts the corners");
  });
  test(`rcorners at radius ${r}: the pixels outside the rounded shape are the colour, the others untouched, as the ring mask gives them`, { skip }, async () => {
    const [w, h] = [40, 30], { f, bg, at } = await draw([["rcorners", 0, 0, w, h, r, CORNER]]); assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0);
    const S = shape(w, h, r); let bad = 0, n = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const want = S[y * w + x] ? bg : C; if (!same(at(x, y), want)) bad++; if (!S[y * w + x]) n++; }
    assert.equal(bad, 0, `${bad} pixels differ from the mask`); if (r === 0) assert.equal(n, 0, "radius 0 draws nothing"); else assert.ok(n > 0 && n <= 4 * r * r, `${n} corner pixels`);
  });
}
for (const [name, op] of [["rrect", ["rrect", 0, 0, 40, 30, 6, FILL, EDGE]], ["rcorners", ["rcorners", 0, 0, 40, 30, 6, CORNER]]]) {
  test(`${name}: a colour that is not on the palette is refused and nothing is drawn`, { skip }, async () => {
    const bad = op.slice(); bad[bad.length - 1] = "no-such-colour"; if (name === "rrect") bad[6] = "no-such-colour";
    const { f, bg, at } = await draw([bad]); assert.equal(f.refused(), 1, "the picture is refused"); for (let y = 0; y < 30; y += 7) for (let x = 0; x < 40; x += 7) assert.ok(same(at(x, y), bg), `(${x}, ${y}) is untouched`);
  });
  test(`${name}: a box that leaves its picture, or is empty, or has a negative radius, is refused`, { skip }, async () => {
    for (const [what, edit] of [["wider than the picture", (o) => { o[3] = 41; }], ["taller than the picture", (o) => { o[4] = 31; }], ["starting left of it", (o) => { o[1] = -1; }], ["starting above it", (o) => { o[2] = -1; }], ["zero wide", (o) => { o[3] = 0; }], ["a negative radius", (o) => { o[5] = -1; }]]) {
      const o = op.slice(); edit(o); const { f } = await draw([o]); assert.equal(f.refused(), 1, `${what}: refused`);
    }
  });
  test(`${name}: no pixel off the palette: every pixel of the picture is the fill, the edge, the corner colour or the ground under it`, { skip }, async () => {
    const { f, bg, at } = await draw([op]); assert.deepEqual(f.errors(), []); const ok = [F, E, C, bg]; let off = 0;
    for (let y = 0; y < 30; y++) for (let x = 0; x < 40; x++) if (!ok.some((c) => same(at(x, y), c))) off++;
    assert.equal(off, 0, `${off} pixels off the palette`);
  });
}
