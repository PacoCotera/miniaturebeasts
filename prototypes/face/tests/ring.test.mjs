// The focus ring (lvgl-switch.md §2.2): ui/rings.mjs is the integer oracle of the face's `ring` and `tabRing` ops. tests/vectors/rings.json (made from it) holds the masks' hashes; face_test runs
// the C ops on the same cases. This file: the vectors are current, the oracle refuses what the op refuses, the nine-slice of the 20x20 source equals the full-size ring, and the WebAssembly
// face draws the oracle's pixels for a ring and a tab ring. Skipped (the last) when the face has not been built.
//   node --test prototypes/face/tests/ring.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { ringMask, tabRingMask } from "../../ui/rings.mjs";
import { bootFace } from "../../station/src/face-lvgl.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist"), built = existsSync(path.join(dist, "face.mjs")), skip = !built && "face not built (prototypes/face/build.sh)";
const frame = JSON.parse(readFileSync(path.resolve(here, "../../ui/specs/station/frame.json"), "utf8")), F = frame.focus.ring, tabSpec = { tab: F.tab, width: F.width, tabTop: frame.regions.rail.y };
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
  const f = await bootFace(pathToFileURL(dist + "/"), { test: true }); f.send({ t: "palette", colours: palette });
  const focus = palette.find(([n]) => n === "focus")[1], rgb = [1, 3, 5].map((i) => parseInt(focus.slice(i, i + 2), 16));
  const tab = tabRingMask(136, tabSpec);
  const env = { rgb: () => [0, 0, 0], cap: () => 12, picture: () => null, slice: () => null, tile: () => 0 };
  f.scene([{ id: "r", kind: "composed", rect: [10, 10, 60, 40], ops: [["ring", "round", 0, 0, 60, 40, 2, 6, "focus"]] }, { id: "e", kind: "composed", rect: [100, 10, 80, 24], ops: [["ring", "ellipse", 0, 0, 80, 24, 2, 0, "focus"]] },
    { id: "t", kind: "composed", rect: [200, 10, tab.w, tab.h], ops: [["tabRing", 0, 0, 136, F.width, F.tab.slant, F.tab.outside, F.tab.top, F.tab.slantTo, F.tab.bottom, F.tab.radiusBottom, tabSpec.tabTop, "focus"]] }], env);
  for (let i = 0; i < 3; i++) f.frame((f.t = (f.t ?? 0) + 16)); assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0);
  const check = (x0, y0, mask, w, h, what) => { let bad = 0; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const on = f.pixel(x0 + x, y0 + y).every((v, k) => v === rgb[k]); if (on !== (mask[y * w + x] === 255)) bad++; } assert.equal(bad, 0, what); };
  check(10, 10, ringMask(60, 40, 2, 6), 60, 40, "round"); check(100, 10, ringMask(80, 24, 2, 0, "ellipse"), 80, 24, "ellipse"); check(200, 10, tab.mask, tab.w, tab.h, "tab");
});
