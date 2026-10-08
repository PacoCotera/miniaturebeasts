// The face's WebAssembly build in Node: it loads, makes a 1024×600 display, redraws, takes keys, and draws the same pixels
// as the native Linux build (the hashes match). Skipped when the face has not been built (build.sh).
//   node --test prototypes/face/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist"), built = existsSync(path.join(dist, "face.mjs"));
const load = async () => { const create = (await import(path.join(dist, "face.mjs"))).default, M = await create(); M._face_init(); return M; };

test("the WebAssembly face is LVGL 9.6 at 1024×600 and draws its empty display", { skip: !built && "face not built (prototypes/face/build.sh)" }, async () => {
  const M = await load();
  assert.equal(M.UTF8ToString(M._face_version()), "LVGL 9.6.0");
  assert.deepEqual([M._face_width(), M._face_height()], [1024, 600]);
  M._face_frame(0); M._face_frame(16);
  const fb = M._face_fb(), px = M.HEAPU8.subarray(fb, fb + 4);
  assert.deepEqual([...px], [0x37, 0x2a, 0x16, 0xff]);   // B, G, R, A: the palette's `ground`, #162a37
  assert.equal(M._face_dirty_count(), 0, "a second frame with nothing changed redraws nothing");
});

test("keys go in and are counted", { skip: !built && "face not built" }, async () => {
  const M = await load(); M._face_frame(0);
  M._face_key(17, 1); M._face_key(17, 0); M._face_key(10, 1); M._face_key(10, 0); M._face_frame(16); M._face_frame(32);
  assert.equal(M._face_key_count(), 2); assert.equal(M._face_last_key(), 10);
});

test("the WebAssembly face and the native Linux face draw the same pixels", { skip: !built || !existsSync(path.join(dist, "native.hash")) ? "face not built natively" : false }, async () => {
  const M = await load(); M._face_selftest_scene(); for (let t = 0; t < 4; t++) M._face_frame(t * 16); M._face_key(17, 1); M._face_key(17, 0); M._face_frame(80);
  assert.equal((M._face_hash() >>> 0).toString(16).padStart(8, "0"), readFileSync(path.join(dist, "native.hash"), "utf8").trim());
});
