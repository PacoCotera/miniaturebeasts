// The face's WebAssembly build in Node: it loads, makes a 1024×600 display, redraws, takes keys, and draws the same pixels
// as the native Linux build (the hashes match). Skipped when the face has not been built (build.sh).
//   node --test prototypes/face/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { bootFace } from "../../station/src/face-lvgl.mjs";
import { installScene } from "./node-scene.mjs";
import { dirty } from "./dirty.mjs";

const prod = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist"), dist = path.join(prod, "node"), built = existsSync(path.join(dist, "face.mjs"));   // the test build carries the fixed scene
const load = async () => { const create = (await import(path.join(dist, "face.mjs"))).default, M = await create(); M._face_init(); return M; };

test("the WebAssembly face is LVGL 9.6 at 1024×600 and draws its empty display in the colour the page names", { skip: !built && "face not built (prototypes/face/build.sh)" }, async () => {
  const M = await load();
  assert.equal(M.UTF8ToString(M._face_version()), "LVGL 9.6.0");
  assert.deepEqual([M._face_width(), M._face_height()], [1024, 600]);
  M._face_background(0x162a37); M._face_frame(0); M._face_frame(16);
  const fb = M._face_fb(), px = M.HEAPU8.subarray(fb, fb + 4);
  assert.deepEqual([...px], [0x37, 0x2a, 0x16, 0xff]);   // B, G, R, A: the fixed scene's own ground #162a37 (its own colour, not the Station palette's)
  assert.equal(M._face_dirty_count(), 0, "a second frame with nothing changed redraws nothing");
});

test("keys go in and are counted", { skip: !built && "face not built" }, async () => {
  const M = await load(); M._face_frame(0);
  M._face_key(17, 1); M._face_key(17, 0); M._face_key(10, 1); M._face_key(10, 0); M._face_frame(16); M._face_frame(32);
  assert.equal(M._face_key_count(), 2); assert.equal(M._face_last_key(), 10);
});

test("the WebAssembly face and the native Linux face draw the same pixels", { skip: !built || !existsSync(path.join(prod, "native.hash")) ? "face not built natively" : false }, async () => {
  const M = await load(); M._face_selftest_scene(); for (let t = 0; t < 4; t++) M._face_frame(t * 16); M._face_key(17, 1); M._face_key(17, 0); M._face_frame(80);
  assert.equal((M._face_hash() >>> 0).toString(16).padStart(8, "0"), readFileSync(path.join(prod, "native.hash"), "utf8").trim());
});

// LVGL keeps LV_INV_BUF_SIZE invalid areas a refresh; the next redraws the whole screen (lv_refr.c lv_inv_area). The face counts those overflows and the suites' `dirty` throws on one.
test("the invalid-area buffer: the cap's worth of disjoint areas is listed as they are; one more is an overflow, the whole screen, and `dirty` throws", { skip: !built && "face not built" }, async () => {
  const env = { rgb: () => [255, 255, 255], cap: () => 12, picture: () => null, slice: () => null, tile: () => 0 };
  const rects = (n) => Array.from({ length: n }, (_, i) => ({ id: "r" + i, kind: "rect", rect: [4 + 8 * (i % 100), 4 + 8 * Math.floor(i / 100), 1, 1], colour: "x" }));   // 1 × 1 px, 8 px apart: no two touch
  const run = async (n) => { const f = installScene(await bootFace(pathToFileURL(dist + "/"), { test: true })); f.send({ t: "palette", colours: [["x", "#ffffff"]] }); f.scene([], env); f.frame(16); f.frame(32); dirty(f, { fullCut: true }); f.scene(rects(n), env); f.frame((f.t = 48)); return f; };
  const cap = (await run(0)).invCap(); assert.equal(cap, 128, "the face's cap is LVGL's invalid-area buffer, set in lv_conf.h");
  const a = await run(cap); assert.equal(a.invOverflows(), 0, `${cap} disjoint areas: no overflow`); assert.equal(dirty(a), cap, "each area is listed as it is: the cap's worth of pixels"); assert.deepEqual(a.errors(), []);
  const b = await run(cap + 1); assert.equal(b.invOverflows(), 1, "one more: one overflow"); assert.equal(b.M._face_dirty_count(), 1); assert.throws(() => dirty(b), /overflowed/, "`dirty` throws on an overflow");
  assert.equal(Array.from(b.M.HEAP32.subarray(b.M._face_dirty_rects() >> 2, (b.M._face_dirty_rects() >> 2) + 4)).join(","), "0,0,1024,600", "LVGL redraws the whole screen");
  const c = await run(cap + 1); assert.throws(() => dirty(c, { fullCut: true }), /overflowed/, "a full cut does not excuse an overflow");
});
test("`dirty` throws on a frame that redrew the whole screen unless it is declared a full cut", { skip: !built && "face not built" }, async () => {
  const env = { rgb: () => [255, 255, 255], cap: () => 12, picture: () => null, slice: () => null, tile: () => 0 };
  const f = installScene(await bootFace(pathToFileURL(dist + "/"), { test: true })); f.send({ t: "palette", colours: [["x", "#ffffff"]] }); f.scene([{ id: "all", kind: "rect", rect: [0, 0, 1024, 600], colour: "x" }], env); f.frame(16);
  assert.throws(() => dirty(f), /whole screen/); assert.equal(dirty(f, { fullCut: true }), 1024 * 600);
});
