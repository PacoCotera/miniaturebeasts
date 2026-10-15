// The focus ring (lvgl-switch.md §2.2): ui/rings.mjs is the integer oracle of the face's `ring` and `tabRing` ops. tests/vectors/rings.json (made from it) holds the masks' hashes; face_test runs
// the C ops on the same cases. This file: the vectors are current, the oracle refuses what the op refuses, the nine-slice of the 20x20 source equals the full-size ring, and the WebAssembly
// face draws the oracle's pixels for a ring and a tab ring. Skipped (the last) when the face has not been built.
//   node --test prototypes/face/tests/ring.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { ringMask, tabRingMask, focusRingOps, ringRaster, footprintRing } from "../../ui/rings.mjs";
import { footprintOf, footprintHeight } from "../../ui/specs/derive.mjs";
import { bootFace } from "../../station/src/face-lvgl.mjs";
import { installScene } from "./node-scene.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist/node")   /* the test build: the node path (-DFACE_NODE_API) */, built = existsSync(path.join(dist, "face.mjs")), skip = !built && "face not built (prototypes/face/build.sh)";
const frame = JSON.parse(readFileSync(path.resolve(here, "../../ui/specs/station/frame.json"), "utf8")), T = frame.focus.ring, tabTop = frame.regions.rail.y;
// the single-op ring the ops were first proven on (width 2, radius 6; the tab: outside 4, tops 42 to 84, radius 6); the cased ring is three of them (the tests below)
const F = { width: 2, tab: { slant: 16, outside: 4, top: 42, slantTo: 80, bottom: 84, radiusBottom: 6 } }, tabSpec = { tab: F.tab, width: F.width, tabTop };
const palette = JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")).colours;
const sha = (m) => createHash("sha256").update(m).digest("hex");

test("the committed ring vectors are what ui/rings.mjs gives today", () => { execFileSync(process.execPath, [path.resolve(here, "../tools/make-ring-vectors.mjs"), "--check"], { stdio: "pipe" }); });
test("the oracle: a ring is on at the edge and off inside, an ellipse touches its box, and what the op refuses throws", () => {
  const m = ringMask(40, 30, 2, 6); assert.equal(m[15 * 40 + 0], 255); assert.equal(m[15 * 40 + 1], 255); assert.equal(m[15 * 40 + 2], 0); assert.equal(m[0], 0, "the corner is cut by the radius"); assert.equal(m[0 * 40 + 20], 255);
  const e = ringMask(24, 24, 2, 0, "ellipse"); assert.equal(e[12 * 24], 255); assert.equal(e[12 * 24 + 12], 0);
  for (const bad of [[0, 20, 2, 6], [20, 0, 2, 6], [20, 20, 0, 6], [20, 20, 2, -1], [20.5, 20, 2, 6]]) assert.throws(() => ringMask(...bad));
  assert.throws(() => ringMask(20, 20, 2, 3, "ellipse")); assert.throws(() => ringMask(20, 20, 2, 6, "square"));
  assert.throws(() => tabRingMask(0, tabSpec)); assert.throws(() => tabRingMask(20, { ...tabSpec, tabTop: 80 }));
});
test("the round ring is a nine-slice of its 20x20 source (insets 8, the middle tiled), at every sampled size", () => {
  const src = ringMask(20, 20, 2, 6);
  for (let w = 16; w <= 400; w += 16) for (let h = 16; h <= 200; h += 24) {
    const full = ringMask(w, h, 2, 6), e = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const sx = x < 8 ? x : x >= w - 8 ? 20 - (w - x) : 8 + ((x - 8) % 4), sy = y < 8 ? y : y >= h - 8 ? 20 - (h - y) : 8 + ((y - 8) % 4); e[y * w + x] = src[sy * 20 + sx]; }
    assert.equal(sha(e), sha(full), `${w}x${h}`);
  }
});
test("the WebAssembly face draws the oracle's ring and tab ring", { skip }, async () => {
  const f = installScene(await bootFace(pathToFileURL(dist + "/"), { test: true })); f.send({ t: "palette", colours: palette });
  const focus = palette.find(([n]) => n === "focus")[1], rgb = [1, 3, 5].map((i) => parseInt(focus.slice(i, i + 2), 16));
  const tab = tabRingMask(136, tabSpec);
  const env = { rgb: () => [0, 0, 0], cap: () => 12, picture: () => null, slice: () => null, tile: () => 0 };
  f.scene([{ id: "r", kind: "composed", rect: [10, 10, 60, 40], ops: [["ring", "round", 0, 0, 60, 40, 2, 6, "focus"]] }, { id: "e", kind: "composed", rect: [100, 10, 80, 24], ops: [["ring", "ellipse", 0, 0, 80, 24, 2, 0, "focus"]] },
    { id: "t", kind: "composed", rect: [200, 10, tab.w, tab.h], ops: [["tabRing", 0, 0, 136, F.width, F.tab.slant, F.tab.outside, F.tab.top, F.tab.slantTo, F.tab.bottom, F.tab.radiusBottom, tabSpec.tabTop, "focus"]] }], env);
  for (let i = 0; i < 3; i++) f.frame((f.t = (f.t ?? 0) + 16)); assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0);
  const check = (x0, y0, mask, w, h, what) => { let bad = 0; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const on = f.pixel(x0 + x, y0 + y).every((v, k) => v === rgb[k]); if (on !== (mask[y * w + x] === 255)) bad++; } assert.equal(bad, 0, what); };
  check(10, 10, ringMask(60, 40, 2, 6), 60, 40, "round"); check(100, 10, ringMask(80, 24, 2, 0, "ellipse"), 80, 24, "ellipse"); check(200, 10, tab.mask, tab.w, tab.h, "tab");
});

// ---- fix 14 ----
// rule V: the bands partition. For each shape the three bands are pairwise disjoint and their union is the single op of width 4 (round radius R; tab outside 5, radius 7); the footprint's light weight is one ellipse of width 3 at inset 1.
const partition = (ring, one) => {
  const parts = ring.ops.map((op) => ringRaster({ ...ring, ops: [op] })), full = one(ring); let overlap = 0, differ = 0;
  for (let i = 0; i < full.length; i++) { let c = 0; for (const p of parts) if (p[i]) c++; if (c > 1) overlap++; if ((c > 0) !== (full[i] > 0)) differ++; }
  return { overlap, differ };
};
test("rule V: the bands of a rect ring (R 5 and 11), an oval, a circle, a footprint and a tab are pairwise disjoint and their union is the single wide op", () => {
  for (const r of [0, 6]) for (const box of [[30, 30, 40, 40], [30, 30, 300, 120], [30, 30, 2, 2]]) {
    if (box[2] < 2 * (r + T.reach) - 2 * T.reach) continue;
    const ring = focusRingOps({ rect: r }, box, T), R = r + T.reach;
    const out = partition(ring, (g) => ringRaster({ ...g, ops: [{ band: "core", shape: "round", x: 0, y: 0, w: g.S, h: g.S, width: 4, radius: R }] })); assert.deepEqual(out, { overlap: 0, differ: 0 }, `rect r ${r}`);
  }
  for (const [name, ring] of [["oval", focusRingOps("oval", [20, 20, 100, 60], T)], ["circle", focusRingOps({ circle: "box" }, [20, 20, 56, 56], T)], ["footprint", focusRingOps("footprint", [0, 0, 104, 112], T, { foot: [10, 100, 56] })]])
    assert.deepEqual(partition(ring, (g) => ringRaster({ ...g, ops: [{ band: "core", shape: "ellipse", x: 0, y: 0, w: g.w, h: g.h, width: 4, radius: 0 }] })), { overlap: 0, differ: 0 }, name);
  const light = focusRingOps("footprint", [0, 0, 104, 112], T, { foot: [10, 100, 56], light: true });
  assert.deepEqual(partition(light, (g) => ringRaster({ ...g, ops: [{ band: "core", shape: "ellipse", x: 1, y: 1, w: g.w - 2, h: g.h - 2, width: 3, radius: 0 }] })), { overlap: 0, differ: 0 }, "light");
  for (const body of [56, 136]) {
    const tab = focusRingOps("tab", [100, 40, body, 40], T, { tabTop }), t = T.shapes.tab, one = tabRingMask(body, { tab: { slant: t.slant, outside: t.outside[0], top: t.top[0], slantTo: t.slantTo, bottom: t.bottom[0], radiusBottom: t.radius[0] }, width: 4, tabTop });
    assert.deepEqual(partition(tab, () => one.mask), { overlap: 0, differ: 0 }, `tab ${body}`);
  }
});
test("the cased ring: the key bands go on paper and the core stays; the nine-slice source is 2R + 4; a ring box under 2R is refused", () => {
  const paper = focusRingOps({ rect: 0 }, [30, 30, 40, 40], T, { ground: "paper" }), dflt = focusRingOps({ rect: 0 }, [30, 30, 40, 40], T);
  assert.deepEqual(paper.ops.map((o) => o.band), ["core"]); assert.deepEqual(dflt.ops.map((o) => o.band), ["key", "core", "key"]); assert.equal(dflt.S, 14); assert.equal(focusRingOps({ rect: 6 }, [0, 0, 40, 40], T).S, 26);
  assert.deepEqual([dflt.x, dflt.y, dflt.w, dflt.h], [25, 25, 50, 50], "5 px outside, 50 x 50 on a 40 x 40 object");
  assert.throws(() => focusRingOps({ rect: 6 }, [0, 0, 10, 40], T), /under 2R/);
});
test("footprintOf: the feet band of the lowest 6 rows at alpha 128 or more, in integers; the ring's height 2 * round(w / 12) held between 6 and 16", () => {
  const pic = (w, h, ink) => ({ w, h, rgba: () => { const d = new Uint8Array(w * h * 4); for (const [x, y, a] of ink) d[4 * (y * w + x) + 3] = a; return d; } });
  const row = (y, x0, x1, a = 255) => Array.from({ length: x1 - x0 + 1 }, (_, i) => [x0 + i, y, a]);
  assert.deepEqual(footprintOf(pic(40, 30, [...row(10, 0, 39), ...row(20, 5, 14), ...row(25, 7, 30)])), [5, 26, 26], "the band is rows 20..25: leftmost 5, rightmost 30, the row under the lowest ink is 26");
  assert.equal(footprintOf(pic(10, 10, row(9, 2, 4, 127))), null, "alpha 127 is not ink"); assert.deepEqual(footprintOf(pic(10, 10, row(9, 2, 4, 128))), [2, 10, 3], "alpha 128 is");
  assert.deepEqual(footprintOf(pic(10, 10, row(9, 0, 9))), [0, 10, 10], "a band ending at the picture's last row");
  assert.deepEqual(footprintOf(pic(10, 10, [...row(9, 4, 4), ...row(3, 0, 9)])), [4, 10, 1], "ink above the 6 row band does not count");
  assert.deepEqual(footprintOf(pic(10, 10, [...row(9, 3, 5), ...row(4, 0, 9)])), [0, 10, 10], "row 4 is inside the band of rows 4..9");
  assert.deepEqual(footprintOf(pic(10, 10, [])), null, "an empty picture"); assert.deepEqual(footprintOf(pic(20, 10, [...row(9, 12, 18)]), 10, 10), [2, 10, 7], "a cell of the picture: x is relative to the cell");
  assert.deepEqual([28, 29, 30, 31, 100, 101, 102, 103].map((w) => footprintHeight(w)), [6, 6, 6, 6, 16, 16, 16, 16], "fh: 2 * round(w / 12), held to 6..16, either side of w 29 / 30 and 101 / 102");
  assert.deepEqual([47, 48, 59, 60, 71, 72].map((w) => footprintHeight(w)), [8, 8, 10, 10, 12, 12], "2 * floor((w + 6) / 12): w 47 and 48 give 4, 59 and 60 give 5, 71 and 72 give 6, doubled");
  assert.deepEqual(footprintRing([10, 100, 56], [0, 0, 104, 112]), [5, 90, 66, 20], "the juvenile walk box 104 x 112, a feet band of 56: a ring 66 x 20");
  assert.deepEqual(footprintRing([10, 100, 56], [0, 0, 104, 112], true), [33, 90, 66, 20], "a mirrored cell: x is cellW − x − w");
  for (const w of range(1, 400)) assert.equal((footprintHeight(w, { hMin: 0, hMax: 1000 }) + 10) % 2, 0, `fh + 10 is even at w ${w}`);
});
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
test("no screen or station word writes a ring, tabRing or ellipse op: the holders go through v_faceHolder and the focus ring through the focusRing word", () => {
  for (const dir of ["../src/screens", "../src/vocab/station"]) for (const f of readdirSync(path.resolve(here, dir)).filter((n) => /\.[ch]$/.test(n)))
    assert.doesNotMatch(readFileSync(path.resolve(here, dir, f), "utf8"), /\\"(ring|tabRing|ellipse)\\"/, `${dir}/${f}`);
});
