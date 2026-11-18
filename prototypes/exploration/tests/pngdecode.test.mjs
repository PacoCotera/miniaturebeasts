// Bug 68: src/pngdecode.mjs reads a PNG's own bytes. Checked against the Node reference decoder on real files from art/, on every filter type
// and colour type we ship, on the refusals, and on readPixels with a canvas that adds noise (the farbling browser): the bytes path never touches it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";
import { decodePng, readPixels } from "../src/pngdecode.mjs";
import { decodePNG } from "../tools/atlas-check.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const CRC = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = b => { let c = 0xffffffff; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const t = Buffer.concat([Buffer.from(type, "latin1"), data]), o = Buffer.alloc(12 + data.length);
  o.writeUInt32BE(data.length, 0); t.copy(o, 4); o.writeUInt32BE(crc(t), 8 + data.length); return o; };
// rawRows: Buffers each starting with its filter byte.
const make = (w, h, ctype, rawRows, { depth = 8, interlace = 0, plte = null, trns = null, extra = [] } = {}) => {
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = depth; ih[9] = ctype; ih[12] = interlace;
  return new Uint8Array(Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ih), ...extra.map(([t, d]) => chunk(t, d)),
    ...(plte ? [chunk("PLTE", Buffer.from(plte))] : []), ...(trns ? [chunk("tRNS", Buffer.from(trns))] : []), chunk("IDAT", deflateSync(Buffer.concat(rawRows))), chunk("IEND", Buffer.alloc(0))]));
};
const walk = d => readdirSync(d).flatMap(f => { const p = path.join(d, f); return statSync(p).isDirectory() ? (f === "node_modules" ? [] : walk(p)) : p.endsWith(".png") ? [p] : []; });

test("real files from art/ decode to the Node reference's exact RGBA (indexed + tRNS, RGBA, RGBA with sRGB)", async () => {
  const files = walk(path.join(root, "art/companion-48")).filter(f => { try { decodePNG(readFileSync(f)); return true; } catch { return false; } });
  assert.ok(files.length >= 10, "enough real files: " + files.length);
  for (const f of files.slice(0, 60)) {
    const buf = readFileSync(f), ref = decodePNG(buf), got = await decodePng(new Uint8Array(buf));
    assert.equal(got.width, ref.w, f); assert.equal(got.height, ref.h, f); assert.deepEqual(Buffer.from(got.data), Buffer.from(ref.rgba), f);
  }
});

test("the meadow sheets decode in full", async () => {
  const dir = path.join(root, "art/companion-48/terrain/meadow");
  for (const f of readdirSync(dir).filter(n => n.endsWith(".png"))) {
    const buf = readFileSync(path.join(dir, f)), got = await decodePng(new Uint8Array(buf));
    try { assert.deepEqual(Buffer.from(got.data), Buffer.from(decodePNG(buf).rgba), f); } catch (e) { if (e.code === "ERR_ASSERTION") throw e; }   // the reference refuses colour-chunk files; ours reads them anyway
  }
});

test("every filter type, RGB, grey, grey+alpha and a PNG carrying gAMA/sRGB/iCCP-like chunks", async () => {
  // 2x3 RGB; row filters 0 none, 1 sub, 2 up, 4 paeth built from known pixels
  const px = [[10, 20, 30, 40, 50, 60], [70, 80, 90, 100, 110, 120], [130, 140, 150, 160, 170, 180]];
  const sub = r => r.map((v, i) => (v - (i >= 3 ? r[i - 3] : 0)) & 255), up = (r, p) => r.map((v, i) => (v - p[i]) & 255);
  const paeth = (a, b, c) => { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };
  const pae = (r, p) => r.map((v, i) => (v - paeth(i >= 3 ? r[i - 3] : 0, p[i], i >= 3 ? p[i - 3] : 0)) & 255);
  const rows = [Buffer.from([1, ...sub(px[0])]), Buffer.from([2, ...up(px[1], px[0])]), Buffer.from([4, ...pae(px[2], px[1])])];
  const got = await decodePng(make(2, 3, 2, rows, { extra: [["gAMA", Buffer.from([0, 1, 0, 0])], ["sRGB", Buffer.from([0])]] }));
  assert.deepEqual([...got.data], px.flatMap(r => [r[0], r[1], r[2], 255, r[3], r[4], r[5], 255]));
  // average filter (3) on a grey row pair, and grey+alpha
  const g = [[200, 100, 50], [10, 20, 30]], avg = [Buffer.from([0, ...g[0]]), Buffer.from([3, ...g[1].map((v, i) => (v - ((i ? g[1][i - 1] : 0) + g[0][i] >> 1)) & 255)])];
  assert.deepEqual([...(await decodePng(make(3, 2, 0, avg))).data].filter((_, i) => i % 4 === 0), [200, 100, 50, 10, 20, 30]);
  const ga = await decodePng(make(1, 1, 4, [Buffer.from([0, 77, 128])]));
  assert.deepEqual([...ga.data], [77, 77, 77, 128]);
});

test("a PNG kind we do not read is refused by name", async () => {
  await assert.rejects(decodePng(make(1, 1, 2, [Buffer.from([0, 1, 2, 3])], { interlace: 1 })), /interlaced/);
  await assert.rejects(decodePng(make(1, 1, 0, [Buffer.from([0, 1])], { depth: 16 })), /bit depth 16/);
  await assert.rejects(decodePng(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9])), /not a PNG/);
  await assert.rejects(decodePng(make(1, 1, 3, [Buffer.from([0, 0])])), /without PLTE/);
});

test("readPixels: the bytes are read as they are even when the canvas farbles every channel by +-1", async () => {
  const f = path.join(root, "art/companion-48/terrain/meadow/meadow-ground.png"), buf = readFileSync(f), ref = decodePNG(buf);
  const farble = im => { throw new Error("the canvas path must not run: " + im); };
  const got = await readPixels("http://x/meadow-ground.png", { fetch: async () => ({ ok: true, arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length) }), canvas: farble });
  assert.deepEqual(Buffer.from(got.data), Buffer.from(ref.rgba));
});

test("readPixels without DecompressionStream falls back to the canvas path and says so", async () => {
  const env = { inflate: false, Image: class { set src(v) { this.width = 1; this.height = 1; setTimeout(() => this.onload(), 0); } }, canvas: im => ({ width: im.width, height: im.height, data: new Uint8ClampedArray([1, 2, 3, 255]) }) };
  const got = await readPixels("http://x/a.png", env);
  assert.deepEqual([...got.data], [1, 2, 3, 255]); assert.match(env.cause, /no DecompressionStream/);
});

test("a PNG kind we do not read falls back to the canvas, naming the cause", async () => {
  const env = { fetch: async () => ({ ok: true, arrayBuffer: async () => make(1, 1, 2, [Buffer.from([0, 1, 2, 3])], { interlace: 1 }).buffer }), Image: class { set src(v) { this.width = 1; this.height = 1; setTimeout(() => this.onload(), 0); } }, canvas: im => ({ width: 1, height: 1, data: new Uint8ClampedArray(4) }) };
  await readPixels("http://x/a.png", env); assert.match(env.cause, /interlaced/);
});
