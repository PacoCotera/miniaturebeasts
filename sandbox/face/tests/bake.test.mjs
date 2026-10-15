// The image baker (lvgl-switch.md §2.4): a master's PNG becomes the LVGL 9 binary the sandbox and the Pi load as the same bytes (ARGB8888, straight alpha); the baked files match the masters' index.
//   node --test prototypes/face/tests/bake.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { bakeImage, readHeader, bakeAll, checkBaked, HEADER } from "../tools/bake-images.mjs";
import { decodePNG } from "../../ui/png.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), masters = path.resolve(here, "../../ui/assets/masters");

test("an image: the header, the pixels as B G R A, straight alpha", () => {
  const rgba = Uint8Array.from([255, 0, 0, 255, 0, 255, 0, 128, 0, 0, 255, 0, 10, 20, 30, 40, 1, 2, 3, 4, 5, 6, 7, 8]), b = bakeImage(3, 2, rgba);
  assert.deepEqual(readHeader(b), { magic: 0x19, cf: 0x10, flags: 0, w: 3, h: 2, stride: 12 }); assert.equal(b.length, HEADER + 24);
  assert.deepEqual([...b.subarray(HEADER, HEADER + 8)], [0, 0, 255, 255, 0, 255, 0, 128], "B, G, R, A in memory; the alpha is not applied to the colour");
  assert.throws(() => bakeImage(0, 1, new Uint8Array(0))); assert.throws(() => bakeImage(2, 2, new Uint8Array(4))); assert.throws(() => bakeImage(70000, 1, new Uint8Array(280000)));
});
test("every placed master bakes to its size and pixels, deterministically, and the baked files match the masters' index", () => {
  const a = mkdtempSync(path.join(tmpdir(), "bake-a-")), b = mkdtempSync(path.join(tmpdir(), "bake-b-"));
  const first = bakeAll({ masters, out: a }), second = bakeAll({ masters, out: b }), index = JSON.parse(readFileSync(path.join(masters, "index.json"), "utf8")).masters;
  assert.equal(Object.keys(first).length, Object.keys(index).length); assert.ok(Object.keys(first).length > 10);
  assert.deepEqual(first, second, "the same masters bake to the same bytes");
  assert.deepEqual(checkBaked({ masters, out: a }), []);
  // a sample decoded back against the PNG
  for (const id of Object.keys(index).slice(0, 12)) {
    const pic = decodePNG(readFileSync(path.join(masters, index[id].file))), bin = readFileSync(path.join(a, first[id].file));
    for (let i = 0; i < pic.width * pic.height; i++) { const o = HEADER + i * 4; assert.deepEqual([bin[o + 2], bin[o + 1], bin[o], bin[o + 3]], [...pic.data.subarray(i * 4, i * 4 + 4)], `${id} pixel ${i}`); }
  }
});
test("a baked file that is changed, a master that is replaced and one that is not baked are found", () => {
  const out = mkdtempSync(path.join(tmpdir(), "bake-c-")), images = bakeAll({ masters, out }), id = Object.keys(images)[0];
  writeFileSync(path.join(out, images[id].file), Buffer.concat([readFileSync(path.join(out, images[id].file)).subarray(0, HEADER), Buffer.alloc(images[id].w * images[id].h * 4, 7)]));
  assert.ok(checkBaked({ masters, out }).some((p) => p.startsWith(id) && /hash/.test(p)));
  const idx = JSON.parse(readFileSync(path.join(out, "images.json"), "utf8")); delete idx.images[Object.keys(images)[1]]; writeFileSync(path.join(out, "images.json"), JSON.stringify(idx));
  assert.ok(checkBaked({ masters, out }).some((p) => /not baked/.test(p)));
});

test("the PNG reader takes an indexed master (1, 2, 4 and 8 bits, with its alpha table)", async () => {
  const { deflateSync } = await import("node:zlib"), { crc32 } = await import("node:zlib");
  const chunk = (kind, data) => { const b = Buffer.alloc(12 + data.length); b.writeUInt32BE(data.length, 0); b.write(kind, 4, "ascii"); data.copy(b, 8); b.writeUInt32BE(crc32(Buffer.concat([Buffer.from(kind, "ascii"), data])) >>> 0, 8 + data.length); return b; };
  const png = (w, h, depth, rows, plte, trns) => { const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = depth; ih[9] = 3; const raw = Buffer.concat(rows.map((r) => Buffer.concat([Buffer.from([0]), Buffer.from(r)])));
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ih), chunk("PLTE", Buffer.from(plte)), ...(trns ? [chunk("tRNS", Buffer.from(trns))] : []), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]); };
  const pal = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120];
  let p = decodePNG(png(4, 2, 2, [[0b00011011], [0b11100100]], pal, [255, 128, 0]));   // 2 bits: indexes 0 1 2 3 / 3 2 1 0
  assert.deepEqual([p.width, p.height], [4, 2]); assert.deepEqual([...p.data.subarray(0, 16)], [10, 20, 30, 255, 40, 50, 60, 128, 70, 80, 90, 0, 100, 110, 120, 255]); assert.deepEqual([...p.data.subarray(16, 20)], [100, 110, 120, 255]);
  p = decodePNG(png(3, 1, 1, [[0b10100000]], pal.slice(0, 6), null)); assert.deepEqual([...p.data], [40, 50, 60, 255, 10, 20, 30, 255, 40, 50, 60, 255]);   // 1 bit: 1 0 1
  p = decodePNG(png(2, 1, 8, [[1, 0]], pal.slice(0, 6), null)); assert.deepEqual([...p.data], [40, 50, 60, 255, 10, 20, 30, 255]);
});
