// Pictures are {w, h, rgba()} (ui/assets.mjs): RGBA bytes with straight alpha, with no canvas. In Node there is no document, so a picture that answers rgba() here touched none.
//   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { PB, C, RGB } from "../src/pixels.mjs";
import { figureFromLayers } from "../src/podmasters.mjs";
import { registerAsset, asset, dropAsset } from "../../ui/assets.mjs";
import { beamArt } from "../src/art.mjs";

test("a palette buffer is RGBA: its colours from the palette, opaque, a clear cell 0,0,0,0", () => {
  const pb = new PB(3, 1); pb.set(1, 0, C.amber); const d = pb.rgba();
  assert.ok(d instanceof Uint8ClampedArray); assert.equal(d.length, 12);
  assert.deepEqual([...d.slice(0, 4)], [0, 0, 0, 0]); assert.deepEqual([...d.slice(4, 8)], [...RGB[C.amber], 255]); assert.deepEqual([...d.slice(8, 12)], [0, 0, 0, 0]);
});
test("a figure whose layers are not placed is an empty RGBA picture of its size, with no canvas; the asset manifest hands pictures over by rgba()", () => {
  const f = figureFromLayers("t:mist", "t:clear", 1, [4, 3]); assert.equal(f.w, 4); assert.equal(f.rgba().length, 48); assert.ok(f.rgba().every((v) => v === 0));
  registerAsset({ id: "t:rgba", w: 2, h: 2, status: "placeholder", build: () => { const pb = new PB(2, 2); pb.set(0, 0, C.sky); return pb; } });
  const a = asset("t:rgba"); assert.deepEqual([a.w, a.h, a.rgba().length], [2, 2, 16]); assert.deepEqual([...a.rgba().slice(0, 4)], [...RGB[C.sky], 255]); dropAsset("t:rgba");
});
test("the beam moved to art.mjs: a cone of one colour on its own size", () => {
  const b = beamArt(40, 30), d = b.rgba(); assert.deepEqual([b.w, b.h], [40, 30]);
  const row = (y) => [...Array(40).keys()].filter((x) => d[(y * 40 + x) * 4 + 3]); assert.ok(row(0).length < row(29).length, "the cone widens downwards"); assert.deepEqual([...d.slice((29 * 40 + 20) * 4, (29 * 40 + 20) * 4 + 3)], RGB[C.tealD]);
});

// ---- Station M1 §1.2, §1.5, §2.6: a moving set's atlas, composed by the host ----
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setMoving, compose, cellsOf, atlasIsMaster, playable, registerMoving, movingIds } from "../src/moving.mjs";
import { placeMaster, assetEntry } from "../../ui/assets.mjs";
const MV = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../ui/specs/station/moving"), sets = {};
for (const id of JSON.parse(readFileSync(path.join(MV, "index.json"), "utf8")).sets) sets[id] = JSON.parse(readFileSync(path.join(MV, id + ".json"), "utf8"));
setMoving(sets);
// a stand whose every pixel says where it is (x, y), so a shift or a mirror is read exactly
const coded = (w, h) => { const d = new Uint8ClampedArray(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) d.set([x & 255, y & 255, 77, 255], (y * w + x) * 4); return { w, h, rgba: () => d }; };
const src = { stand: (sp, st, w, h) => coded(w, h), nap: () => coded(96, 88) };
const px = (p, x, y) => Array.from(p.rgba().slice((y * p.w + x) * 4, (y * p.w + x) * 4 + 4));
test("an atlas (M1 §1.2): one row, a clear 1 px column, then the cells in the set's order at 1 + i·w; the width 1 + n·w", () => {
  const id = movingIds("S01", "juvenile").walk, a = compose(id, src), cells = cellsOf("S01", "juvenile", "walk", 104, 112);
  assert.equal(cells.length, 12); assert.deepEqual([a.w, a.h], [1 + 12 * 104, 112]);
  for (let y = 0; y < 112; y++) assert.equal(px(a, 0, y)[3], 0, "the gutter column is clear");
  assert.deepEqual(cells.slice(0, 7).map((c) => c.name), ["stand", "stand-b1", "stand-b2", "crouch", "air", "curl", "curl-b1"]); assert.ok(cells.slice(7).every((c) => c.mirror));
  assert.deepEqual(px(a, 1 + 0 * 104 + 10, 20), [10, 20, 77, 255], "cell 0, the stand as it is");
});
test("the stand-ins (M1 §1.5): b1 and b2 move rows 0..(h − 25) up 1 and 2 px with the feet fixed; the crouch moves down 2; air is the stand; the curl is the nap stand-in bottom-centred, curl·b1 its rows above the last 12 up 1", () => {
  const a = compose(movingIds("S01", "juvenile").walk, src), cell = (i) => (x, y) => px(a, 1 + i * 104 + x, y);
  assert.deepEqual(cell(1)(10, 20).slice(0, 2), [10, 21], "b1: row 20 shows row 21"); assert.deepEqual(cell(1)(10, 100).slice(0, 2), [10, 100], "b1: the feet stay");
  assert.deepEqual(cell(2)(10, 20).slice(0, 2), [10, 22], "b2: up 2"); assert.deepEqual(cell(3)(10, 20).slice(0, 2), [10, 18], "the crouch: down 2"); assert.equal(cell(3)(10, 1)[3], 0, "the crouch's top two rows are clear");
  assert.deepEqual(cell(4)(10, 20), cell(0)(10, 20), "air is the stand");
  assert.deepEqual(cell(5)(4, 24).slice(0, 2), [0, 0], "the curl: the 96 × 88 stand-in at x 4, y 24 (bottom-centred)"); assert.equal(cell(5)(3, 30)[3], 0, "clear beside it");
  assert.deepEqual(cell(6)(4 + 10, 24 + 5).slice(0, 2), [10, 6], "curl·b1: up 1 above its last 12 rows"); assert.deepEqual(cell(6)(4 + 10, 24 + 80).slice(0, 2), [10, 80], "its last 12 rows stay");
});
test("mirrors (M1 §1.2): each mirror is its cell with every row reversed, exact by pixel", () => {
  const a = compose(movingIds("S01", "adult").walk, src), w = 144, nb = 7;
  for (let k = 0; k < 5; k++) for (const [x, y] of [[0, 0], [10, 40], [143, 151], [70, 3]]) assert.deepEqual(px(a, 1 + (nb + k) * w + (w - 1 - x), y), px(a, 1 + k * w + x, y), `mirror of cell ${k} at ${x},${y}`);
});
test("the shadow (M1 §1.5, the art director's Q6): a flat ellipse of #1e1a22 at alpha 110, and shadow-75 its alpha × 3 / 4 rounded down", () => {
  const a = compose(movingIds("S01", "juvenile").shadow, src); assert.deepEqual([a.w, a.h], [1 + 2 * 104, 16]);
  assert.deepEqual(px(a, 1 + 52, 8), [0x1e, 0x1a, 0x22, 110]); assert.equal(px(a, 1 + 0, 0)[3], 0, "outside the ellipse");
  assert.deepEqual(px(a, 1 + 104 + 52, 8), [0x1e, 0x1a, 0x22, Math.floor(110 * 3 / 4)]);
});
test("status (M1 §1.5): an atlas is a placeholder while any cell is a stand-in, a master when every cell is a placed master; the play gate opens only then", () => {
  const id = movingIds("S05", "juvenile").nap; assert.equal(atlasIsMaster(id), false); assert.equal(playable("S05", "juvenile"), false);
  registerMoving(id, src); assert.equal(assetEntry(id).status, "placeholder");
  for (const c of cellsOf("S05", "juvenile", "nap", 96, 88)) placeMaster({ id: c.master, w: 96, h: 88, file: c.master + ".png", hash: "0".repeat(64), signed: "test", status: "master" }, coded(96, 88));
  assert.equal(atlasIsMaster(id), true, "every nap cell placed: the nap atlas is a master"); assert.equal(playable("S05", "juvenile"), false, "the set plays only when every atlas is");
  assert.throws(() => compose(id, src, [{ layer: "x" }]), /layers are composed in the bake slot/);
});

// ---- the portrait's picture (derive.mjs, portrait-source.mjs, the "portrait" kind). PROVISIONAL: the art director signs the reducer's rule once, on real portraits ----
import { derivePortrait } from "../src/derive.mjs";
import { portraitSource, injectPortraitSource, dropPortraitSources, digestOf } from "../src/portrait-source.mjs";
import { registerPictures } from "../src/pictures.mjs";
import { policyOf as policyOfPortrait } from "../../ui/asset-policy.mjs";
{
  const OW = 528, OH = 392, opening = (fn) => { const a = new Uint8ClampedArray(OW * OH * 4); for (let y = 0; y < OH; y++) for (let x = 0; x < OW; x++) { const [r, g, b] = fn(x, y), i = (y * OW + x) * 4; a[i] = r; a[i + 1] = g; a[i + 2] = b; a[i + 3] = 255; } return a; };
  const px = (p, x, y) => [...p.rgba().slice((y * 40 + x) * 4, (y * 40 + x) * 4 + 4)], inCrop = (x, y) => x >= 4 && x < 524 && y >= 1 && y < 391;
  test("derive (provisional): flat 13×13 blocks give exactly their colour at 40×30, alpha 255", () => {
    const d = derivePortrait(opening((x, y) => (inCrop(x, y) ? [Math.floor((x - 4) / 13) * 6, Math.floor((y - 1) / 13) * 8, 200] : [0, 0, 0]))); assert.deepEqual([d.w, d.h, d.rgba().length], [40, 30, 4800]);
    for (const [x, y] of [[0, 0], [1, 0], [39, 29], [17, 12]]) assert.deepEqual(px(d, x, y), [x * 6, y * 8, 200, 255], `${x},${y}`);
  });
  test("derive (provisional): rounding half up at (sum + 84) / 169: a block sum of 84 rounds down, 85 rounds up", () => {
    const at = (n) => derivePortrait(opening((x, y) => (x === 4 && y === 1 ? [n, n, n] : [0, 0, 0]))).rgba()[0];   // one sample of the first block carries the whole sum
    assert.equal(at(84), 0); assert.equal(at(85), 1); assert.equal(at(253), 1); assert.equal(at(254), 2, "the next step up: (254 + 84) / 169 = 2");
  });
  test("derive (provisional): a red border outside the crop (4, 1, 520, 390) never reaches the output", () => {
    const d = derivePortrait(opening((x, y) => (inCrop(x, y) ? [10, 20, 30] : [255, 0, 0]))); for (let i = 0; i < 4800; i += 4) assert.deepEqual([...d.rgba().slice(i, i + 3)], [10, 20, 30]);
  });
  test("derive (provisional): a wrong size or any alpha below 255 is refused, an error and never a picture; two runs are byte-identical", () => {
    const ok = opening(() => [1, 2, 3]); assert.match(derivePortrait(ok, 527, 392).error, /528×392/); assert.match(derivePortrait(new Uint8ClampedArray(10)).error, /bytes/);
    const t = new Uint8ClampedArray(ok); t[(200 * OW + 100) * 4 + 3] = 254; const r = derivePortrait(t); assert.match(r.error, /opaque/); assert.equal(r.rgba, undefined);
    assert.deepEqual([...derivePortrait(ok).rgba()], [...derivePortrait(ok).rgba()]);
  });
  test("the portrait kind: no source is an empty slot, a source that arrives fills it (40×30, derived, painted); the id is the digest's, the source is not kept", async () => {
    const digest = "00112233445566778899aabbccddeeff", id = `portrait:${digest.slice(0, 16)}:40x30`, req = [{ kind: "portrait", id, digest, size: [40, 30] }];
    registerPictures(req, {}); assert.deepEqual([assetEntry(id).status, assetEntry(id).w, assetEntry(id).h], ["empty", 40, 30], "no source: an empty slot");
    assert.equal(injectPortraitSource(digest, opening(() => [90, 80, 70])).ok, true); registerPictures(req, {});
    const e = assetEntry(id); assert.deepEqual([e.status, e.w, e.h, e.until], ["derived", 40, 30, null]); const p = asset(id); assert.deepEqual([...p.rgba().slice(0, 4)], [90, 80, 70, 255]); assert.equal(policyOfPortrait(id, e.status), "painted");
    assert.equal(portraitSource(digest).rgba().length, 4800, "only the 4.8 KB result is kept");
    const bad = "ffffffffffffffff0000000000000000"; assert.equal(injectPortraitSource(bad, new Uint8ClampedArray(OW * OH * 4)).error.includes("opaque"), true); assert.equal(portraitSource(bad), null, "a refused source keeps nothing");
    const src = opening((x, y) => [x & 255, y & 255, 9]), d16 = await digestOf(src); assert.match(d16, /^[0-9a-f]{16}$/, "the digest: the first 16 hex of the SHA-256 of the source"); assert.equal(d16, await digestOf(new Uint8ClampedArray(src)), "what changes the pixels names it"); assert.equal(injectPortraitSource(d16, src).ok, true); assert.ok(portraitSource(d16));
    dropPortraitSources(); dropAsset(id);
  });
}

// ---- ruling (c): the Portrait picture's test card (face/tools/portrait-fixture.mjs) ----
import { portraitFixture } from "../../face/tools/portrait-fixture.mjs";
test("the Portrait test card: it derives to 40×30 with the rim, the four quadrants and none of the red outside the crop; its source injects and is byte-identical on a second run", async () => {
  const fx = portraitFixture(), d = derivePortrait(fx), at = (x, y) => [...d.rgba().slice((y * 40 + x) * 4, (y * 40 + x) * 4 + 3)];
  assert.deepEqual([d.w, d.h], [40, 30]); assert.deepEqual(at(0, 0), [24, 24, 24]); assert.deepEqual(at(1, 1), [200, 72, 64]); assert.deepEqual(at(38, 1), [72, 168, 80]); assert.deepEqual(at(1, 28), [64, 88, 200]); assert.deepEqual(at(38, 28), [232, 200, 104]);
  const px = d.rgba(); for (let i = 0; i < px.length; i += 4) assert.ok(!(px[i] === 255 && px[i + 1] === 0 && px[i + 2] === 0), "no red from outside the crop");
  const digest = await digestOf(fx); assert.deepEqual(injectPortraitSource(digest, fx), { ok: true, digest }); const a = Buffer.from(portraitSource(digest).rgba()); assert.deepEqual(injectPortraitSource(digest, portraitFixture()), { ok: true, digest }); assert.ok(a.equals(Buffer.from(portraitSource(digest).rgba())));
});
