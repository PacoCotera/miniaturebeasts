// Pictures are {w, h, rgba()} (ui/assets.mjs): RGBA bytes with straight alpha, with no canvas. In Node there is no document, so a picture that answers rgba() here touched none.
//   node --test prototypes/station/tests/
import { test, describe, before, after } from "node:test";
import "./fixtures/rooms.mjs";   // the rooms spec, as the page registers it
import assert from "node:assert/strict";
import { PB, C, RGB } from "../src/pixels.mjs";
import { figureFromLayers } from "../src/podmasters.mjs";
import { registerAsset, asset, dropAsset } from "../../ui/assets.mjs";
import { dimRGBA, dimPicture, labelPlate, WARM, plateReq, plateMasterReq, PLATE_MASTER } from "../src/stamplook.mjs";
import { beamArt, UNREAD_REGION, treatmentOf, builtOf, founderArt, drawnDigest, mibiArt, dropSpecks } from "../src/art.mjs";
import { typeSpecimen, genomeDigest } from "../../workbench/framework/species.mjs";
import { fitCamera } from "../../workbench/framework/raster.mjs";
import { setFrames } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { standLook, juvenileSize } from "../src/stands.mjs";
import { treat, UNKNOWN } from "../src/unknown.mjs";
import { mibiPictureOf } from "../src/views/home-props.mjs";
import { idleBuild } from "../src/views/idle-props.mjs";
import { habitatBuild } from "../src/views/habitat-props.mjs";
import { vivariumBuild } from "../src/views/vivarium-props.mjs";
import { setStandSizes } from "../src/layered-stand.mjs";

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
import { readFileSync, readdirSync } from "node:fs";
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
test("status (M1 §1.5): an atlas is a stand-in (never in a golden but the developer switch's) while any cell is a stand-in, a master when every cell is a placed master; the play gate opens only then", () => {
  const id = movingIds("S05", "juvenile").nap; assert.equal(atlasIsMaster(id), false); assert.equal(playable("S05", "juvenile"), false);
  registerMoving(id, src); assert.equal(assetEntry(id).status, "stand-in");
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
  for (const [sp, row] of [...Object.entries(LG.juvenile104x112), ...Object.entries(LG.adult144x152 ?? {})]) {
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

// ---- fix 4: the stamp's look (stampCase), the art director's formula (masters-pods 001bcd51 make-stamp-case.py): the label's pixels multiplied in linear light by K × WARM, a 1 px hairline edge, alpha kept ----
test("the stamp label is the stamp's pixels × K × (1.00, 0.93, 0.80) in linear light, an edge of the hairline all round on the plate, alpha kept", () => {
  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }, srgb = (l) => Math.max(0, Math.min(255, (l <= 0.0031308 ? l * 12.92 : 1.055 * l ** (1 / 2.4) - 0.055) * 255));
  assert.deepEqual(WARM, [1.0, 0.93, 0.80]);
  const src = Uint8ClampedArray.from([241, 235, 223, 255, 141, 138, 166, 255, 0, 0, 0, 0, 255, 255, 255, 128]);
  for (const k of [0.2, 0.75]) { const d = dimRGBA(src, k); for (let i = 0; i < 4; i++) { for (let c = 0; c < 3; c++) assert.equal(d[i * 4 + c], Math.round(srgb(lin(src[i * 4 + c]) * k * WARM[c]))); assert.equal(d[i * 4 + 3], src[i * 4 + 3], "alpha is kept"); } }
  const bone = RGB[C.bone], hair = RGB[C.hairline], p = labelPlate(120, bone, hair, 0.2), a = p.rgba(), at = (x, y) => [...a.slice((y * 120 + x) * 4, (y * 120 + x) * 4 + 4)];
  assert.deepEqual([p.w, p.h], [120, 120]); for (const [x, y] of [[0, 0], [119, 0], [0, 119], [119, 119], [60, 0], [0, 60], [119, 60], [60, 119]]) assert.deepEqual(at(x, y), [...hair, 255], `the edge at ${x},${y}`);
  assert.deepEqual(at(1, 1), [...dimRGBA(Uint8ClampedArray.from([...bone, 255]), 0.2)], "inside the edge: the plate dimmed"); assert.deepEqual(at(60, 60), at(1, 1));
  assert.ok(at(60, 60)[0] < 130 && at(60, 60)[2] < 110, "a dim plate: " + at(60, 60)); assert.ok(at(60, 60)[0] > at(60, 60)[2]);
  const pic = dimPicture({ w: 1, h: 1, rgba: () => Uint8ClampedArray.from([200, 100, 50, 255]) }, 0.75); assert.deepEqual([pic.w, pic.h, pic.rgba().length], [1, 1, 4]);
});

// ---- fix 4: the stamp label never out-shines the specimen, measured on the goldens at 1× (the art director's luminance rule, masters-pods stamp-case/make-stamp-case.py) ----
const goldenPng = (rel) => decodePNG(readFileSync(new URL("../../face/golden/" + rel, import.meta.url)));
const lin01 = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const lumOf = (img, [x, y, w, h]) => { const out = []; for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) { const k = (j * img.width + i) * 4; out.push(0.2126 * lin01(img.data[k]) + 0.7152 * lin01(img.data[k + 1]) + 0.0722 * lin01(img.data[k + 2])); } return out; };
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
const pct = (a, p) => { const s = [...a].sort((u, v) => u - v), r = (s.length - 1) * (p / 100), lo = Math.floor(r), hi = Math.ceil(r); return s[lo] + (s[hi] - s[lo]) * (r - lo); };   // linear interpolation, as numpy.percentile
const srgbMean = (img, [x, y, w, h]) => { let t = 0; for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) { const k = (j * img.width + i) * 4; t += img.data[k] + img.data[k + 1] + img.data[k + 2]; } return t / (w * h * 3); };
const LABELS = {   // screen: [golden, the label's rect, the main object's rect (the pod, the founder, the bud, the resident), the stamp's case on it]
  pods: ["pods/pods-overview-identified-pod-focused.png", [804, 400, 120, 120], [184, 216, 144, 176]],
  create: ["create/create-shape.png", [804, 336, 120, 120], [360, 240, 304, 312]],   // the slot moved up 64 with the case (fix 5 Create)
  incubator: ["incubator/incubator-growing.png", [92, 200, 120, 120], [436, 255, 152, 160]],   // T-20261016-222: the label on the left wall, the sealed pod in the capsule
  habitat: ["habitat/habitat-card.png", [872, 64, 120, 120], [144, 80, 304, 312]],
};
for (const [screen, [file, label, main]] of Object.entries(LABELS)) test(`the stamp label on ${screen}: the label's highlights stay under the specimen's (95th percentile of linear luminance), cell contrast at least 4.11, sRGB mean at most 111 (against the 115 cap)`, () => {
  const founder = screen === "create" ? decodePNG(readFileSync(new URL("../../ui/assets/masters/pods/mibi-adult-S01-304x312.png", import.meta.url))) : null;   // AD ruling (Create founder A): the main object is the founder's own opaque pixels (alpha > 127) at (360, 240), not its 304 × 312 box
  const lumMasked = (im, [x, y, w, h]) => { const out = []; for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { if (founder.data[(j * founder.width + i) * 4 + 3] <= 127) continue; const k = ((y + j) * im.width + (x + i)) * 4; out.push(0.2126 * lin01(im.data[k]) + 0.7152 * lin01(im.data[k + 1]) + 0.0722 * lin01(im.data[k + 2])); } return out; };
  const img = goldenPng(file), L = lumOf(img, label), M = founder ? lumMasked(img, main) : lumOf(img, main), inner = lumOf(img, [label[0] + 8, label[1] + 8, 104, 104]);
  // The label's mean is no longer compared with the specimen's: the Loika v4 pod is terracotta and blue all over, so its own pixels are darker than the label's mean, though the label stays dimmer where it counts. What holds is the highlights: the label's 95th percentile stays under the specimen's, with the contrast floor and the sRGB caps.
  assert.ok(pct(L, 95) < pct(M, 95), `${screen}: label p95 ${pct(L, 95).toFixed(3)} is not under the main object's ${pct(M, 95).toFixed(3)}`);
  const contrast = (pct(inner, 95) + 0.05) / (pct(inner, 5) + 0.05); assert.ok(contrast >= 4.11, `${screen}: the stamp's cells read at ${contrast.toFixed(2)}, under 4.11`);
  if (screen === "habitat") { assert.ok(mean(L) < 0.079, `habitat: label mean ${mean(L).toFixed(3)} is not under 0.079 (GB2: the label in its well)`); assert.ok(pct(L, 95) < 0.192, `habitat: label p95 ${pct(L, 95).toFixed(3)} is not under 0.192`); }
  const cap = screen === "create" ? 115 : 111;   // Create keeps the outer cap (art director, CA2); the others their own 111
  assert.ok(srgbMean(img, label) <= cap, `${screen}: the label's sRGB mean ${srgbMean(img, label).toFixed(1)} is over ${cap} (the outer cap is 115)`);
});

// ---- Fix 1b part 2: the founder's unread treatment keyed on the chapter (art.mjs) ----
{
  const frames = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../workbench/frames");
  const frameOf = (s) => JSON.parse(readFileSync(path.join(frames, `species-${s}.json`), "utf8"));
  const allBut = (fr, ...ids) => fr.chapters.map((c) => c.id).filter((id) => !ids.includes(id));
  const view = (fr) => { const b = builtOf(fr, typeSpecimen(fr)); return { scene: b.scene, camera: fitCamera(b.scene, "portrait", [300, 310], 0.06) }; };

  test("the table names every chapter of every frame, and an unknown chapter throws", () => {
    for (const s of ["S01", "S03", "S09", "S13", "S14", "S15", "S16"]) for (const c of frameOf(s).chapters) assert.ok(c.id in UNREAD_REGION, `${s} ${c.id}`);
    const fr = frameOf("S01");
    assert.throws(() => treatmentOf({ ...fr, chapters: [...fr.chapters, { id: "bogus", traits: [] }] }, ["coat"]), /bogus/);
    assert.throws(() => treatmentOf(fr, ["coat", "bogus"]), /bogus/);
  });

  test("nothing read is a ghost; everything read is clear", () => {
    const fr = frameOf("S15");
    assert.deepEqual(treatmentOf(fr, []), { mode: "ghost", boxes: [], groups: [], luma: false });
    assert.deepEqual(treatmentOf(fr, new Set(allBut(fr))), { mode: "clear", boxes: [], groups: [], luma: false });
  });

  test("Movement, Stamina, Character, Glow and Charge unread draw nothing: clear (Movement traits draw nothing)", () => {
    for (const [s, ids] of [["S15", ["movement"]], ["S13", ["movement", "stamina", "character"]], ["S16", ["glow", "charge", "character"]]]) {
      const fr = frameOf(s); assert.deepEqual(treatmentOf(fr, allBut(fr, ...ids)), { mode: "clear", boxes: [], groups: [], luma: false }, s);
    }
  });

  test("S13's wing-cases are Shape: unread Shape veils the whole body", () => {
    const fr = frameOf("S13"); assert.ok(fr.chapters.find((c) => c.id === "shape").traits.some((t) => t.id === "wing-cases"));
    assert.deepEqual(treatmentOf(fr, allBut(fr, "shape"), view(fr)).boxes.map((b) => b.whole), [true]);
    assert.equal(treatmentOf(fr, allBut(fr, "shape")).mode, "veil");
  });

  test("S15's rays are the leg group, its tail is the tail group; S14's skirt and S15's leaves are Shape, the whole body; a group with no part on the drawn body leaves the id", () => {
    const s15 = frameOf("S15"), all = treatmentOf(s15, allBut(s15, "legs-tail")), drawn = treatmentOf(s15, allBut(s15, "legs-tail"), view(s15).scene);
    assert.deepEqual(all.boxes.map((b) => b.parts), [["leg", "ray"], ["tail"]], "no body given: both groups"); assert.deepEqual(all.groups, ["leg", "tail"]);
    assert.equal(drawn.mode, "veil"); assert.deepEqual(drawn.groups, ["leg"], "S15 has rays and no tail part: the tail group leaves the id"); assert.deepEqual(drawn.boxes.map((b) => b.parts), [["leg", "ray"]]);
    assert.deepEqual(treatmentOf(s15, allBut(s15, "shape")).boxes, [{ whole: true }], "S15 leaves");
    const s14 = frameOf("S14"); assert.ok(s14.chapters.find((c) => c.id === "shape").traits.some((x) => x.id === "skirt"));
    assert.deepEqual(treatmentOf(s14, allBut(s14, "shape")).boxes, [{ whole: true }], "S14 skirt");
    const sc = view(s14).scene, skirt = sc.nodes.find((n) => n.id === "foot-skirt");
    assert.ok(skirt && !["leg", "ray"].some((q) => (skirt.part ?? skirt.id) === q || (skirt.part ?? skirt.id).startsWith(q + "-")), "the foot-skirt is not in the leg group");
    const s16 = frameOf("S16"); assert.deepEqual(treatmentOf(s16, allBut(s16, "face"), view(s16).scene).groups, ["face"], "S16 has a head and no leg or tail part");
  });
  test("the part groups are named in their declared order (face, leg, tail), not the frame's chapter order; Shape and Face give veil-body, never veil-body+face; with no group left the treatment is clear", () => {
    const fr = frameOf("S09"), shuffled = { ...fr, chapters: [...fr.chapters].reverse() };
    for (const f of [fr, shuffled]) assert.deepEqual(treatmentOf(f, allBut(f, "legs-tail", "face")).groups, ["face", "leg", "tail"]);
    assert.deepEqual(treatmentOf(fr, allBut(fr, "shape", "face")).groups, ["body"]); assert.deepEqual(treatmentOf(fr, allBut(fr, "coat", "shape", "face")).groups, ["coat"], "Coat wins any tie with Shape");
    const noParts = { scene: { nodes: [{ id: "body", part: "body" }] } }; assert.deepEqual(treatmentOf(fr, allBut(fr, "face", "legs-tail"), noParts.scene), { mode: "clear", boxes: [], groups: [], luma: false });
    const headOnly = { scene: { nodes: [{ id: "head", part: "head" }, { id: "tail-bulb", part: "tail" }] } }; assert.deepEqual(treatmentOf(fr, allBut(fr, "face", "legs-tail"), headOnly.scene).groups, ["face", "tail"], "a group with no part drops; tail-bulb is a tail part");
  });

  test("Coat or Shape unread wins over the groups; Face is one group; the groups of several unread chapters are a union", () => {
    const fr = frameOf("S09");
    assert.deepEqual(treatmentOf(fr, allBut(fr, "coat", "face")).boxes, [{ whole: true }]);
    assert.deepEqual(treatmentOf(fr, allBut(fr, "face")).boxes.map((b) => b.parts), [UNREAD_REGION.face[0]]);
    assert.deepEqual(treatmentOf(fr, allBut(fr, "face", "legs-tail")).boxes.map((b) => b.parts), [UNREAD_REGION.face[0], ["leg", "ray"], ["tail"]]);
  });

  test("Glow unread draws emission at none and Charge unread phase at solid; read, the mibi's own value; the genome is not changed", () => {
    const fr = frameOf("S16"), g = typeSpecimen(fr), digest = genomeDigest(g), own = builtOf(fr, g).resolved.values, all = fr.chapters.map((c) => c.id);
    assert.equal(builtOf(fr, g, all), builtOf(fr, g), "all read: the mibi's own build");
    const veiled = builtOf(fr, g, allBut(fr, "glow", "charge")).resolved.values;
    assert.equal(veiled["appearance.emission-brightness"], 0); assert.equal(veiled["physiology.phase"], 0.2);
    assert.ok(own["appearance.emission-brightness"] > 0 && own["physiology.phase"] !== undefined);
    assert.equal(builtOf(fr, g, allBut(fr, "glow")).resolved.values["physiology.phase"], own["physiology.phase"], "Charge read: its own phase");
    assert.equal(builtOf(fr, g, allBut(fr, "charge")).resolved.values["appearance.emission-brightness"], own["appearance.emission-brightness"], "Glow read: its own emission");
    assert.equal(genomeDigest(g), digest);
  });
}

// ---- Fix 1b part 3: an adult without its signed stand is its species' juvenile stand (stands.mjs, views) ----
{
  const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames"), specs = path.resolve(here, "../../ui/specs/station"), mastersDir = path.resolve(here, "../../ui/assets/masters");
  setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
  const J = (f) => JSON.parse(readFileSync(path.join(specs, f), "utf8")), home = J("home.json"), frameSpec = J("frame.json"), viv = J("vivarium.json"), hab = J("habitat.json");
  const index = JSON.parse(readFileSync(path.join(mastersDir, "index.json"), "utf8")).masters;
  const placeAll = () => { for (const [id, e] of Object.entries(index)) placeMaster({ id, w: e.w, h: e.h, file: e.file, hash: e.sha256, signed: e.signed, status: e.status ?? "master" }, { w: e.w, h: e.h, rgba: () => new Uint8ClampedArray(0) }); };
  const dropAll = () => { for (const id of Object.keys(index)) dropAsset(id); };
  describe("an owned mibi is never absent (Fix 1b part 3, stands.mjs)", () => {
    before(placeAll); after(dropAll);
    const SPECIES = Array.from({ length: 16 }, (_, i) => "S" + String(i + 1).padStart(2, "0")), PLACES = [[144, 152], [96, 88], [304, 312], [48, 48]];
    const ADULT_STANDS = SPECIES.filter((s) => PLACES.every(([w, h]) => `mibi-adult-${s}-${w}x${h}` in index)), settings = { ...S.DEFAULT_SETTINGS, economy: "decided", rooms: 1 }, T0 = 1_000_000;

    test("no S01 to S16 species reaches the genome stand-in: every one has a signed adult stand or a signed juvenile stand at every place", () => {
      for (const sp of SPECIES) for (const size of PLACES) for (const stage of ["adult", "elder"]) {
        const look = standLook(sp, stage, size); assert.notEqual(look.step, 3, `${sp} ${stage} ${size}`);
        if (ADULT_STANDS.includes(sp)) assert.deepEqual([look.stage, look.size, look.step], [stage, size, 1], `${sp}: its own stand`);
        else { const j = juvenileSize(size); assert.deepEqual([look.stage, look.size, look.step], ["juvenile", j, 2], `${sp} ${size}: the juvenile ${j}`); assert.ok(`mibi-juvenile-${sp}-${j[0]}x${j[1]}` in index); }
      }
      assert.ok(ADULT_STANDS.includes("S01") && ADULT_STANDS.includes("S02") && ADULT_STANDS.includes("S03"), "Pip, S02 and S03 have theirs");
      assert.deepEqual(juvenileSize([144, 152]), [104, 112], "the one size that differs"); assert.equal(standLook("S99", "adult", [144, 152]).step, 3, "a species with no stand at all: the rig");
      assert.deepEqual(standLook("S04", "juvenile", [104, 112]), { stage: "juvenile", size: [104, 112], step: 1 });
    });

    // Every species now has a signed adult stand; the stand-in rule (stands.mjs step 2) is still proved on S04 with its adult masters taken out of the registry for the one test
    const withoutAdult = (sp, fn) => () => { const ids = Object.keys(index).filter((id) => id.startsWith(`mibi-adult-${sp}-`)); for (const id of ids) dropAsset(id); try { fn(); } finally { for (const id of ids) { const e = index[id]; placeMaster({ id, w: e.w, h: e.h, file: e.file, hash: e.sha256, signed: e.signed, status: e.status ?? "master" }, { w: e.w, h: e.h, rgba: () => new Uint8ClampedArray(0) }); } } };
    const world = () => { const st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = 99; st.d = 99; st.s = 99; st.firstMibi = false; st.dock = { docked: true, at: T0 }; return st; };
    const sv0 = (over = {}) => ({ v: 8, seed: 7, wid: "w1", turn: 0, bay: [], mibis: [], carried: [], tier: 1, shield: 3, carryReqs: [], ...over });
    const pics = (b) => b.requests.filter((r) => r.kind === "mibi");

    test("Home and the Vivarium whole: an S04 adult is its juvenile 104×112 (a resident) and, with no nap picture, never a sleeper (R4b: a rester with no curl picture goes out), an S03 adult its own stand; the drawn stage follows", withoutAdult("S04", () => {
      const st = world(); S.seedAdults(st, "S04", 5, 1, settings); S.seedAdults(st, "S03", 9, 1, settings); const [s4, s3] = st.mibis;
      const b = idleBuild({ st, sv: sv0(), settings, docked: true, light: "day" }, frameSpec), R = b.props.regions;
      const res = (m) => R.residents.find((r) => r.id === String(m.id));
      assert.equal(res(s3).stage, "adult"); assert.equal(res(s3).picture, `mibi:${genomeDigest(s3.genome)}:adult:144x152`);
      const r4 = b.requests.find((r) => r.id === `mibi:${genomeDigest(s4.genome)}:juvenile:104x112`); assert.ok(r4, "the resident asks for the juvenile standing, at 104×112"); assert.deepEqual([r4.size, r4.stage, r4.species], [[104, 112], "juvenile", "S04"]);
      assert.equal(res(s4).stage, "juvenile"); assert.deepEqual(R.bed.sleepers, []);
      const w = world(); S.seedAdults(w, "S04", 5, 1, settings); const m = w.mibis[0];
      const b2 = idleBuild({ st: w, sv: sv0(), settings, docked: true, light: "day" }, frameSpec), p = b2.props.regions.residents[0];
      assert.deepEqual([p.stage, p.picture], ["juvenile", `mibi:${genomeDigest(m.genome)}:juvenile:104x112`]);
      assert.deepEqual(pics(b2).find((r) => r.id === p.picture).size, [104, 112]);
      assert.equal(S.mibiStage(w, m, settings), "adult", "the mibi itself is still an adult");
    }));

    test("growing up is not staged: a juvenile S04 and the same mibi grown up are the same picture at the same size", withoutAdult("S04", () => {
      const w = world(); S.seedAdults(w, "S04", 5, 1, settings); const m = w.mibis[0], adultBorn = m.born; m.born = w.turn;
      const at = () => { const b = idleBuild({ st: w, sv: sv0(), settings, docked: true, light: "day" }, frameSpec); return b.props.regions.residents[0]; };
      assert.equal(S.mibiStage(w, m, settings), "juvenile"); const young = at(); m.born = adultBorn; assert.equal(S.mibiStage(w, m, settings), "adult"); const grown = at();
      assert.deepEqual([grown.stage, grown.picture], [young.stage, young.picture]);
    }));

    test("up close and in the rosters: the 304×312 and 48×48 juvenile in the same rects; the species with its own stand keeps it", withoutAdult("S04", () => {
      const w = { st: world(), settings }; S.seedAdults(w.st, "S04", 5, 2, settings); S.seedAdults(w.st, "S01", 5, 1, settings); const [a, b0, pip] = w.st.mibis; for (const m of w.st.mibis) m.paint = { state: "landed" };
      const h = habitatBuild({ st: w.st, sv: sv0(), settings, docked: true, light: "day", focus: null, habId: a.id, meetId: null, armed: false }, hab, frameSpec, home);
      const near = h.requests.find((r) => r.id === h.props.regions.resident.picture); assert.deepEqual([near.stage, near.size], ["juvenile", [304, 312]]);
      assert.equal(mibiPictureOf(w.st, a, [304, 312], settings).id, h.props.regions.resident.picture, "the host's swap dither names the same fallback picture (host.mjs habitatFocus)");
      setStandSizes(JSON.parse(readFileSync(new URL("../../ui/specs/station/stand-sizes.json", import.meta.url), "utf8")));   // the factor views' table (stand-sizes.json), as the page loads it
      let v; try { v = vivariumBuild({ st: w.st, sv: sv0(), settings, docked: true, light: "day", focus: null, seen: null, view: "house" }, viv, frameSpec, home); } finally { setStandSizes(null); }   // the house view's places at 48/304 (the collection v2 design §5)
      const tile = (m) => v.requests.find((r) => r.id === v.props.regions.house.bands.flatMap((b) => b.places).find((t) => t.id === "house." + m.id).picture);
      assert.deepEqual([tile(a).stage, tile(a).size], ["juvenile", [48, 50]]); assert.deepEqual([tile(pip).stage, tile(pip).size], ["adult", [48, 50]]);
    }));
  });
}

// ---- Fix 1b part 1: the calm unknown (unknown.mjs), against the numbers of unknown-proof.py (masters-pods 71968ccc) on a synthetic 14×12 picture ----
{
  const W = 14, H = 12, inBody = (x, y) => ((x - 7) / 5.5) ** 2 + ((y - 6) / 4.5) ** 2 <= 1, rgba = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; for (let c = 0; c < 3; c++) rgba[i + c] = (x * 37 + y * 91 + c * 53 + x * y * 7) % 256; rgba[i + 3] = inBody(x, y) ? 255 : 0; }
  const pic = { w: W, h: H, rgba: () => rgba }, PTS = [[7, 6], [6, 4], [3, 3], [2, 5], [12, 6], [7, 2], [8, 10], [9, 8], [5, 3], [1, 1]];
  const px = (p, x, y) => [...p.rgba().slice((y * W + x) * 4, (y * W + x) * 4 + 3)], at = (p) => PTS.map(([x, y]) => px(p, x, y));
  test("ghost (nothing read): GHOST plus 0.12 of the luma contrast about the body's mean, no hue, alpha unchanged, a 2 px top-left rim at 50 %; the oracle's numbers", () => {
    const g = treat(pic, { mode: "ghost" });
    assert.deepEqual(at(g), [[94, 103, 119], [116, 125, 141], [124, 133, 149], [119, 128, 144], [86, 95, 111], [115, 125, 140], [88, 97, 113], [88, 97, 113], [117, 126, 142], [135, 188, 241]]);
    assert.deepEqual([...g.rgba()].filter((_, i) => i % 4 === 3), [...rgba].filter((_, i) => i % 4 === 3), "alpha unchanged"); assert.deepEqual([g.w, g.h], [W, H]);
    const [a, b, c] = px(g, 6, 4); assert.deepEqual([b - a, c - b], [UNKNOWN.GHOST[1] - UNKNOWN.GHOST[0], UNKNOWN.GHOST[2] - UNKNOWN.GHOST[1]], "one grey-blue tone: the same offset in every channel, no hue kept");
    let rim = 0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inBody(x, y) && !(x >= 2 && y >= 2 && inBody(x - 2, y - 2))) rim++; assert.equal(rim, 28, "the rim pixels: those whose (x-2, y-2) neighbour is outside the body");
    assert.deepEqual(px(g, 7, 2), [115, 125, 140], "a rim pixel is half RIM");
  });
  test("a veil on one part: an ellipse on the box grown 4 px, 6 px feather, clipped to the body, VEIL at 60 % into the picture's own colour; outside the body untouched", () => {
    const v = treat(pic, { mode: "veil", boxes: [[4, 3, 7, 6]] });
    assert.deepEqual(at(v), [[94, 120, 151], [133, 70, 96], [140, 167, 95], [99, 125, 156], [109, 41, 65], [55, 75, 97], [124, 57, 83], [57, 77, 100], [75, 99, 127], [135, 188, 241]]);
    assert.deepEqual(px(v, 7, 6), [94, 120, 151], "the centre: 0.4 × the picture + 0.6 × VEIL"); assert.deepEqual(px(v, 1, 1), px(pic, 1, 1), "outside the body: as it is");
  });
  test("where two part veils overlap the weight is the largest, never the sum", () => {
    const one = treat(pic, { mode: "veil", boxes: [[4, 3, 7, 6]] }), both = treat(pic, { mode: "veil", boxes: [[4, 3, 7, 6], [7, 5, 10, 8]] });
    assert.deepEqual(at(both), [[94, 120, 151], [133, 70, 96], [140, 167, 95], [99, 125, 156], [94, 46, 65], [55, 75, 97], [117, 60, 83], [57, 77, 100], [75, 99, 127], [135, 188, 241]]);
    assert.deepEqual(px(both, 7, 6), px(one, 7, 6), "inside both: the same as inside one, not a double veil"); assert.notDeepEqual(px(both, 12, 6), px(one, 12, 6), "the second ellipse adds its own place");
  });
  test("the whole body (Shape unread): the full alpha at weight 0.6 × alpha, the picture's colour kept; Coat unread: its own luma (grey) under the veil", () => {
    const shape = treat(pic, { mode: "veil", boxes: "body" }), coat = treat(pic, { mode: "veil", boxes: "body", luma: true });
    assert.deepEqual(at(shape), [[94, 120, 151], [133, 70, 96], [140, 167, 95], [99, 125, 156], [94, 46, 65], [55, 75, 97], [117, 60, 83], [57, 77, 100], [75, 99, 127], [135, 188, 241]]);
    assert.deepEqual(at(coat).slice(0, 9), [[112, 117, 127], [81, 86, 94], [151, 156, 166], [117, 122, 132], [54, 58, 64], [68, 72, 79], [70, 74, 81], [70, 74, 82], [92, 96, 105]]); assert.deepEqual(px(coat, 1, 1), px(pic, 1, 1));
    const [r, g, b] = px(coat, 7, 6), off = (v, c) => v - UNKNOWN.VEIL[c] * UNKNOWN.VEIL_WEIGHT; assert.ok(Math.abs(off(r, 0) - off(g, 1)) <= 1 && Math.abs(off(g, 1) - off(b, 2)) <= 1, "no hue: the same grey under the veil in every channel");
  });
  test("the whole body with part boxes is the whole body: an ellipse never weighs more than the body", () => {
    assert.deepEqual([...treat(pic, { mode: "veil", boxes: ["body", [4, 3, 7, 6], [7, 5, 10, 8]] }).rgba()], [...treat(pic, { mode: "veil", boxes: "body" }).rgba()]);
    assert.deepEqual([...treat(pic, { mode: "veil", boxes: ["body", [4, 3, 7, 6]], luma: true }).rgba()], [...treat(pic, { mode: "veil", boxes: "body", luma: true }).rgba()]);
  });
  const LUMA = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b, mk = (f) => { const a = new Uint8ClampedArray(W * H * 4); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; for (let c = 0; c < 3; c++) a[i + c] = f(x, y, c); a[i + 3] = inBody(x, y) ? 255 : 0; } return { w: W, h: H, rgba: () => a }; };
  const charcoal = mk((x, y, c) => 12 + ((x * 5 + y * 3 + c * 2) % 30)), pale = mk((x, y, c) => 200 + ((x * 3 + y * 5 + c) % 40)), meanL = (p) => { let s = 0, n = 0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inBody(x, y)) { s += LUMA(px(p, x, y)); n++; } return s / n; };
  test("never brighter, per pixel, for the veils: no veiled pixel's luma is above its picture's (a dark coat is not lifted toward the veil's grey); a pixel the veil would lighten is scaled down to the picture's luma, hue kept; black stays black", () => {
    for (const [name, p] of [["synthetic", pic], ["charcoal", charcoal], ["pale", pale]]) for (const opt of [{ boxes: [[4, 3, 7, 6]] }, { boxes: [[4, 3, 7, 6], [7, 5, 10, 8]] }, { boxes: "body" }, { boxes: "body", luma: true }]) {
      const v = treat(p, { mode: "veil", ...opt }); let brighter = 0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (LUMA(px(v, x, y)) > LUMA(px(p, x, y)) + 1e-9) brighter++;
      assert.equal(brighter, 0, `${name} ${JSON.stringify(opt.boxes).slice(0, 20)} ${opt.luma ? "coat" : ""}: ${brighter} brighter pixels`);
    }
    assert.deepEqual([px(treat(charcoal, { mode: "veil", boxes: "body", luma: true }), 7, 6), px(treat(charcoal, { mode: "veil", boxes: "body" }), 7, 6)], [[34, 36, 41], [34, 36, 41]], "the charcoal back keeps its dark: scaled to the picture's luma");
    assert.ok(LUMA(px(charcoal, 7, 6)) - LUMA([34, 36, 41]) < 1.5, "to the picture's own luma, give or take the byte");
    const black = mk(() => 0), v = treat(black, { mode: "veil", boxes: "body" }); assert.deepEqual(px(v, 7, 6), [0, 0, 0], "L_out above a picture of black is scaled to it: black stays black");
    const lighten = mk((x, y, c) => [20, 30, 40][c]), lv = treat(lighten, { mode: "veil", boxes: "body" }); assert.deepEqual(px(lv, 7, 6), [20, 30, 40].map((c, i) => px(lv, 7, 6)[i]));
    assert.ok(Math.abs(LUMA(px(lv, 7, 6)) - LUMA([20, 30, 40])) < 1.5); assert.ok(px(lv, 7, 6)[2] > px(lv, 7, 6)[0], "the hue is kept: still the cooler tint of the veil");
  });
  test("the ghost, once per silhouette: a charcoal creature darkens uniformly (rim included) to the picture's mean luma; a pale one is unchanged; never brighter on the mean", () => {
    for (const [name, p] of [["synthetic", pic], ["charcoal", charcoal], ["pale", pale]]) assert.ok(meanL(treat(p, { mode: "ghost" })) <= meanL(p) + 1e-9, `${name}: the ghost's mean luma is not above the picture's`);
    const c = treat(charcoal, { mode: "ghost" }); assert.deepEqual(at(c), [[22, 24, 28], [27, 29, 33], [27, 30, 33], [27, 30, 33], [22, 24, 28], [27, 29, 33], [22, 24, 27], [21, 24, 27], [27, 29, 33], [20, 22, 24]]);
    assert.ok(Math.abs(meanL(c) - meanL(charcoal)) < 1.5, "the whole silhouette is at the picture's mean"); assert.deepEqual(px(c, 7, 2), [27, 29, 33], "the rim is scaled with the rest");
    assert.deepEqual(at(treat(pale, { mode: "ghost" })), [[93, 102, 118], [119, 129, 144], [119, 128, 144], [119, 129, 144], [95, 104, 120], [119, 129, 144], [96, 105, 121], [95, 104, 120], [119, 129, 144], [208, 209, 210]], "a pale species: GHOST and its 12 % only");
    assert.ok(meanL(pic) > meanL(treat(pic, { mode: "ghost" })), "the synthetic picture: already above the ghost, no scale");
  });
  test("a clear treatment is the picture as it is; an unknown mode throws; the same bytes twice", () => {
    assert.deepEqual([...treat(pic, { mode: "clear" }).rgba()], [...rgba]); assert.throws(() => treat(pic, { mode: "frost" }), /frost/);
    assert.deepEqual([...treat(pic, { mode: "ghost" }).rgba()], [...treat(pic, { mode: "ghost" }).rgba()]);
  });
}

// ---- Fix 1b part 1: the founder drawn through the treatment (art.mjs founderArt, treatmentOf's id groups) ----
{
  const frames = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../workbench/frames"), frameOf = (sp) => JSON.parse(readFileSync(path.join(frames, `species-${sp}.json`), "utf8"));
  const without = (fr, ...ids) => fr.chapters.map((c) => c.id).filter((id) => !ids.includes(id));
  test("the id's groups: Coat unread is the whole body in luma (coat), Shape alone the whole body (body), a look's parts face, leg and tail; the doings none", () => {
    const fr = frameOf("S09"), g = (...ids) => { const t = treatmentOf(fr, without(fr, ...ids)); return [t.mode, t.groups, t.luma]; };
    assert.deepEqual(g("coat"), ["veil", ["coat"], true]); assert.deepEqual(g("shape"), ["veil", ["body"], false]); assert.deepEqual(g("coat", "shape", "face"), ["veil", ["coat"], true], "the whole body wins over a part");
    assert.deepEqual(g("face"), ["veil", ["face"], false]); assert.deepEqual(g("legs-tail"), ["veil", ["leg", "tail"], false]); assert.deepEqual(g("face", "legs-tail"), ["veil", ["face", "leg", "tail"], false]);
    assert.deepEqual(g("movement", "stamina"), ["clear", [], false]);
  });
  test("N4: the founder carries no ink outside its body's connected silhouette: a component under 8 opaque pixels is residue and goes, on every species' founder, whatever is read", () => {
    const pb = new PB(20, 12); for (let y = 2; y < 9; y++) for (let x = 3; x < 12; x++) pb.set(x, y, C.bone); pb.set(16, 10, C.bone); pb.set(18, 3, C.bone); pb.set(18, 4, C.bone); pb.set(14, 1, C.bone); pb.set(15, 2, C.bone);   // a body, a lone dot, a pair, a diagonal pair
    dropSpecks(pb); const live = []; for (let i = 0; i < pb.p.length; i++) if (pb.p[i] >= 0) live.push(i); assert.equal(live.length, 7 * 9, "the body stays whole, the specks go");
    for (const sp of ["S01", "S02", "S03", "S09", "S13", "S16"]) for (const read of [[], ["coat"], null]) {
      const fr = frameOf(sp), rd = read ?? fr.chapters.map((c) => c.id), a = founderArt(fr, typeSpecimen(fr), rd, 304, 312).rgba(), seen = new Uint8Array(304 * 312);
      for (let s0 = 0; s0 < 304 * 312; s0++) { if (seen[s0] || !a[s0 * 4 + 3]) continue; let n = 0; const st = [s0]; seen[s0] = 1; while (st.length) { const q = st.pop(); n++; const x = q % 304, y = (q - x) / 304; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= 304 || ny >= 312) continue; const m = ny * 304 + nx; if (!seen[m] && a[m * 4 + 3]) { seen[m] = 1; st.push(m); } } } assert.ok(n >= 8, `${sp}: a stray component of ${n} px at ${s0 % 304},${(s0 / 304) | 0}`); }
    }
  });
  test("founderArt: clear is the palette's own rig; ghost and veil are the treatment's pixels on the rig's alpha; unread Glow and Charge are drawn at none and solid and are in the drawn digest", () => {
    const fr = frameOf("S01"), g = typeSpecimen(fr), all = fr.chapters.map((c) => c.id), [w, h] = [304, 312], base = mibiArt(fr, g, w, h, "portrait");
    const clear = founderArt(fr, g, all, w, h).rgba(), live = (a) => { let n = 0; for (let i = 3; i < a.length; i += 4) if (a[i]) n++; return n; }; assert.ok(live(clear) <= live(base.rgba()) && live(clear) > live(base.rgba()) - 60, "clear: the rig as it is, less the stray specks of its cast shadow (fix 6 N4)");
    const ghost = founderArt(fr, g, [], w, h), a = (p) => [...p.rgba()].filter((_, i) => i % 4 === 3), clearP = founderArt(fr, g, all, w, h); assert.deepEqual(a(ghost), a(clearP), "alpha unchanged"); assert.notDeepEqual([...ghost.rgba()], [...clearP.rgba()]);
    const coat = founderArt(fr, g, all.filter((c) => c !== "coat"), w, h); assert.deepEqual(a(coat), a(clearP)); assert.notDeepEqual([...coat.rgba()], [...clearP.rgba()]);
    const s16 = frameOf("S16"), g16 = typeSpecimen(s16), r16 = s16.chapters.map((c) => c.id);
    assert.equal(drawnDigest(s16, g16, r16), genomeDigest(g16)); assert.equal(drawnDigest(s16, g16, r16.filter((c) => c !== "glow" && c !== "charge")), genomeDigest(g16) + "~gc"); assert.equal(drawnDigest(fr, g, []), genomeDigest(g), "a frame with neither chapter: the genome's own");
  });
}
// ---- the portrait's picture (derive.mjs, portrait-source.mjs, the "portrait" kind). PROVISIONAL: the art director signs the reducer's rule once, on real portraits ----
import { derivePortrait } from "../src/derive.mjs";
import { portraitSource, injectPortraitSource, dropPortraitSources, digestOf } from "../src/portrait-source.mjs";
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
  test("the portrait kind: no source is an empty slot, a source that arrives fills it (40×30, derived, painted); the id is the digest's; the slot keeps only the 40×30 result", async () => {
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

// The test card is a picture for the tests and the journey only: no golden's states file imports it (a static check over face/tools/*-states.mjs), so it never enters a golden as the player's portrait.
test("no golden's states file (face/tools/*-states.mjs) imports the Portrait test card (portraitFixture)", async () => {
  const tools = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../face/tools"), files = readdirSync(tools).filter((f) => /-states\.mjs$/.test(f));
  assert.ok(files.length >= 11, "the states files are read");
  for (const f of files) assert.doesNotMatch(readFileSync(path.join(tools, f), "utf8"), /\bportraitFixture\b/, f + " imports the test card");
});

test("Create founder A (interim): with the species' placed adult master the founder is that one flat picture, clear when everything is read, and the same calm treatment over it otherwise (ghost: alpha unchanged, no hue); never the rig", () => {
  const w = 304, h = 312, d = new Uint8ClampedArray(w * h * 4); for (let y = 40; y < 290; y++) for (let x = 60; x < 250; x++) { const i = (y * w + x) * 4; d[i] = 40 + (x % 90); d[i + 1] = 120 + (y % 60); d[i + 2] = 60; d[i + 3] = 255; }
  const painted = { w, h, rgba: () => d }, fr = JSON.parse(readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../workbench/frames/species-S01.json"), "utf8")), g = typeSpecimen(fr), all = fr.chapters.map((c) => c.id);
  const clear = founderArt(fr, g, all, w, h, painted), rig = founderArt(fr, g, all, w, h);
  assert.deepEqual([...clear.rgba()], [...d], "clear: the painted picture as it is, to the pixel"); assert.notDeepEqual([...clear.rgba()], [...rig.rgba()], "and not the rig");
  const ghost = founderArt(fr, g, [], w, h, painted), a = (p) => [...p.rgba()].filter((_, i) => i % 4 === 3);
  assert.deepEqual(a(ghost), a(clear), "nothing read: the body alone is greyed, the alpha is unchanged"); assert.notDeepEqual([...ghost.rgba()], [...d]);
  assert.equal(founderArt(fr, g, all, w, h, painted), founderArt(fr, g, all, w, h, painted), "cached per picture");
});

// fix 14 (the architect's ruling): grading copies alpha and footOf reads alpha only, so a graded copy of a placed master measures as the master does, at every light
describe("a graded creature picture has its master's footprint", () => {
  test("a placed juvenile master of S01 and of S05, at dawn, dusk and night", async () => {
    const { readFileSync, readdirSync } = await import("node:fs"), { decodePNG } = await import("../../ui/png.mjs"), { grade } = await import("../src/light-grade.mjs"), { footOf } = await import("../src/moving.mjs");
    const root = new URL("../../ui/assets/masters/", import.meta.url), idx = JSON.parse(readFileSync(new URL("index.json", root), "utf8")).masters; let n = 0;
    for (const sp of ["S01", "S05"]) {
      const id = Object.keys(idx).find((k) => new RegExp(`^mibi-juvenile-${sp}-\\d+x\\d+$`).test(k)); if (!id) continue;
      const png = decodePNG(readFileSync(new URL(idx[id].file, root))), pic = { w: png.width, h: png.height, rgba: () => png.data }, day = footOf(`mibi:t${sp}:juvenile:${pic.w}x${pic.h}`, pic, () => null);
      assert.ok(day, `${id} has a footprint`);
      for (const light of ["dawn", "dusk", "night"]) { const g = grade(pic, light); assert.deepEqual(footOf(`mibi:t${sp}:juvenile:${pic.w}x${pic.h}:${light}`, { w: g.w, h: g.h, rgba: () => g.rgba() }, () => null), day, `${sp} at ${light}`); n++; }
    }
    assert.ok(n >= 3, "graded copies were measured: " + n);
  });
});

// ---- the Incubator's plate is the painted master, placed 1:1 (CD ruling, specs/station-stamp-plate-ruling.md); Create and the Habitat card keep the look's plate ----
test("the Incubator's plate is the master stamp-plate-120x120 at 1:1, no K x WARM, no hairline; Create's plate is still labelPlate(120, bone, hairline, 0.20)", () => {
  const asked = []; const req = (r) => { asked.push(r); return r.id; };
  assert.equal(plateMasterReq(req), `${PLATE_MASTER}:120x120`); assert.deepEqual(asked[0], { kind: "slot", id: "stamp-plate-120x120:120x120", master: "stamp-plate-120x120", size: [120, 120], until: asked[0].until });
  assert.equal(plateReq(req, 0.2), "stamp-plate-120-k20"); assert.deepEqual(asked[1], { kind: "stampplate", id: "stamp-plate-120-k20", size: 120, k: 0.2 }, "Create keeps the look's plate request");
  const here = new URL(".", import.meta.url), master = decodePNG(readFileSync(new URL("../../ui/assets/masters/pods/stamp-plate-120x120.png", here)));
  assert.deepEqual([master.width, master.height], [120, 120]); assert.ok(master.data.every((v, i) => i % 4 !== 3 || v === 255), "opaque");
  // on the Incubator's goldens (growing, ready, hatch-1090) the plate's pixels outside the glyph's 104 x 104 recess are the master's, untouched: the case's front master is clear over the 120 x 120 plate (it covers the frame band only)
  for (const state of ["growing", "ready", "hatch-1090"]) {
    const cap = decodePNG(readFileSync(new URL(`../../face/golden/incubator/incubator-${state}.png`, here))); let bad = 0, n = 0;
    for (let y = 0; y < 120; y++) for (let x = 0; x < 120; x++) { if (x >= 8 && x < 112 && y >= 8 && y < 112) continue; n++; for (let c = 0; c < 3; c++) if (cap.data[((200 + y) * cap.width + 92 + x) * 4 + c] !== master.data[(y * 120 + x) * 4 + c]) { bad++; break; } }
    assert.equal(bad, 0, `${state}: ${bad} of ${n} plate pixels outside the recess differ from the master`);
  }
  const bone = RGB[C.bone], hair = RGB[C.hairline]; assert.deepEqual([...labelPlate(120, bone, hair, 0.20).rgba().slice(0, 4)], [...hair, 255], "Create's plate keeps its hairline");
});
