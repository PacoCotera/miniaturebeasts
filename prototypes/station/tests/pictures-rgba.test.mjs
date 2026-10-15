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

// ---- global fix 7: the per-light grade of the residents (station/src/light-grade.mjs; the oracle is light-grade.py at masters-pods 917a4801) ----
import { createHash } from "node:crypto";
import { decodePNG } from "../../ui/png.mjs";
import { GAIN, LUT, grade, gradedOf, dropLight } from "../src/light-grade.mjs";
import { registerPictures } from "../src/pictures.mjs";
import { hasAsset } from "../../ui/assets.mjs";
import { policyOf } from "../../ui/asset-policy.mjs";
const LG = JSON.parse(readFileSync(new URL("./fixtures/light-grade.json", import.meta.url), "utf8")), sha = (b) => createHash("sha256").update(b).digest("hex");
const masterPng = (rel) => readFileSync(new URL("../../ui/assets/masters/" + rel, import.meta.url));
test("fix 7: the grade's table is the oracle's (SHA-256 per light), day is the identity, no entry is brighter than its input, and the four tie entries round to even", () => {
  for (const l of Object.keys(GAIN)) assert.equal(sha(LUT[l]), LG.lut[l], l);
  for (let c = 0; c < 3; c++) for (let v = 0; v < 256; v++) { assert.equal(LUT.day[c * 256 + v], v); for (const l of ["dawn", "dusk", "night"]) assert.ok(LUT[l][c * 256 + v] <= v, `${l} ${"RGB"[c]}${v}`); }
  assert.equal(LUT.dawn[256 + 5], LG.ties.dawn.G5); for (const k of ["G1", "G5", "G9"]) assert.equal(LUT.night[256 + +k.slice(1)], LG.ties.night[k], "night " + k);
  const frame = JSON.parse(readFileSync(new URL("../../ui/specs/station/frame.json", import.meta.url), "utf8")); assert.deepEqual(frame.light.from.map((r) => r[1]).sort(), Object.keys(GAIN).sort(), "frame.json light.from names exactly the lights with a gain");
  assert.throws(() => grade({ w: 1, h: 1, rgba: () => new Uint8ClampedArray(4) }, "dusk2"), /not a light/);
});
test("fix 7: the three juvenile masters graded at four lights equal the oracle's pixels (SHA-256 of the RGBA), alpha is the master's, no channel is brighter, day is the master itself", () => {
  for (const [sp, row] of Object.entries(LG.juvenile104x112)) {
    const buf = masterPng(row.file.replace(/^/, "")); assert.equal(sha(buf), row.source, sp + ": a recut master fails here, loudly");
    const d = decodePNG(buf), p = { w: d.w ?? d.width, h: d.h ?? d.height, rgba: () => d.rgba ?? d.data };
    for (const [l, want] of Object.entries(row.rgba)) {
      const g = grade(p, l), px = g.rgba(); assert.equal(sha(Buffer.from(px.buffer, px.byteOffset, px.byteLength)), want, `${sp} ${l}`);
      if (l === "day") assert.equal(g, p); else for (let i = 0; i < px.length; i += 4) { assert.equal(px[i + 3], p.rgba()[i + 3]); for (let c = 0; c < 3; c++) assert.ok(px[i + c] <= p.rgba()[i + c]); }
    }
  }
});
test("fix 7: a resident at night with its master placed shows the grade of the master under the suffixed id (painted, cached); with no master the rig stand-in builds ungraded as art; day and non-resident masters take no grade; dropLight removes exactly that light's entries", () => {
  const M = "mibi-juvenile-S09-104x112", id = "mibi:fixture7:juvenile:104x112:night", px = new Uint8ClampedArray(104 * 112 * 4).map((_, i) => (i % 4 === 3 ? 200 : 100 + (i % 97)));
  placeMaster({ id: M, w: 104, h: 112, file: "x.png", hash: "0".repeat(64), status: "master" }, { w: 104, h: 112, rgba: () => px });
  assert.equal(gradedOf(M, "day"), M); assert.equal(gradedOf(M, "night"), M + ":night"); assert.equal(assetEntry(M + ":night").status, "derived");
  assert.throws(() => gradedOf("mibi-halo-S01-128x160-clear", "night"), /not a resident master/); assert.throws(() => gradedOf("founder:S01:0123456789abcdef:all:112x112", "night"), /not a resident master/); assert.throws(() => gradedOf("mibi-juvenile-S01-shadow-80x16", "night"), /not a resident master/);
  registerPictures([{ kind: "mibi", id, mibi: 1, stage: "juvenile", species: "S09", size: [104, 112], light: "night" }], { frameOf: () => null, mibiGenome: () => null });
  const e = assetEntry(id), a = asset(id), want = grade({ w: 104, h: 112, rgba: () => px }, "night").rgba(); assert.equal(e.status, "master"); assert.equal(policyOf(id, e.status), "painted"); assert.deepEqual([...a.rgba()], [...want]); assert.equal(asset(id), a, "built once");
  assert.ok(hasAsset(M + ":night")); dropLight("night"); assert.ok(!hasAsset(M + ":night") && !hasAsset(id) && hasAsset(M), "the night's derived pictures go, the master stays");
  dropAsset(M);
  const none = "mibi-juvenile-S09-96x88"; assert.equal(gradedOf(none, "night"), none, "no master placed: the master's id, and the caller falls through");
});
test("fix 7: a night atlas names its light on the walk, close and nap (day adds nothing), the shadows never; its placed cells are graded, a rig or ink stand-in is not", () => {
  const N = movingIds("S05", "juvenile", "species", "night"), D = movingIds("S05", "juvenile");
  for (const k of ["walk", "close", "nap"]) { assert.equal(N[k], D[k] + ":night"); assert.ok(N[k].length < 95); }
  assert.deepEqual([N.shadow, N.closeShadow], [D.shadow, D.closeShadow], "the contact shadows are not graded");
  const a = compose(N.nap, src), t = LUT.night, want = (x, y) => [t[x & 255], t[256 + (y & 255)], t[512 + 77], 255];
  assert.deepEqual(px(a, 1 + 10, 20), want(10, 20), "a placed cell is the master's grade"); assert.deepEqual(px(compose(D.nap, src), 1 + 10, 20), [10, 20, 77, 255], "day: the master");
  const s = compose(movingIds("S01", "juvenile", "species", "night").shadow, src); assert.deepEqual(px(s, 1 + 52, 8), [0x1e, 0x1a, 0x22, 110], "the shadow ink is never graded");
  assert.equal(policyOf(N.nap, "master"), "painted"); assert.equal(policyOf(N.nap, "placeholder"), "art"); assert.equal(policyOf(N.shadow, "placeholder"), "art");
});
