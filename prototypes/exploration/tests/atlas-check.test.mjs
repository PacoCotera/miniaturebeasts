// tools/atlas-check.mjs, the art director's loader check (c2a-48px-spec.md §5.1), on PNGs and manifests made here: the forms it
// takes and refuses, the chunks that refuse a sheet, exact palette colours only, and the core set from src/atlas.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { deflateSync } from "node:zlib";
import { check, decodePNG, pageRGB } from "../tools/atlas-check.mjs";
import { decodeExact, QUADS, SHORE_STATES } from "../src/atlas.mjs";

const CRC = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = b => { let c = 0xffffffff; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const t = Buffer.concat([Buffer.from(type, "latin1"), data]), o = Buffer.alloc(12 + data.length);
  o.writeUInt32BE(data.length, 0); t.copy(o, 4); o.writeUInt32BE(crc(t), 8 + data.length); return o; };
// A PNG: rows of samples (bytes per pixel by colour type), filter 0 on every row; extra chunks go before IDAT.
function png(w, h, samples, { ctype = 3, depth = 8, interlace = 0, plte = null, trns = null, extra = [] } = {}) {
  const bpp = { 3: 1, 6: 4, 2: 3 }[ctype] * (depth / 8), raw = Buffer.alloc(h * (w * bpp + 1));
  for (let y = 0; y < h; y++) for (let i = 0; i < w * bpp; i++) raw[y * (w * bpp + 1) + 1 + i] = samples[y * w * bpp + i];
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = depth; ih[9] = ctype; ih[12] = interlace;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ih), ...extra.map(([t, d]) => chunk(t, d)),
    ...(plte ? [chunk("PLTE", Buffer.from(plte.flat()))] : []), ...(trns ? [chunk("tRNS", Buffer.from(trns))] : []), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
const RGB = pageRGB();
const dir = () => mkdtempSync(path.join(os.tmpdir(), "atlas-check-"));
const quiet = () => { const lines = []; return { lines, log: s => lines.push(s) }; };
const piece = (name, extra) => Object.assign({ name, status: "candidate", kind: "ground", set: "lawn", sheet: "s", x: 0, y: 0, w: 2, h: 2, offset: [0, 0] }, extra);
// An indexed 4×2 sheet in the page's colours: index 0 transparent (tRNS), the rest palette colours 1–7.
const SHEET = () => png(4, 2, [0, 1, 2, 3, 4, 5, 6, 7], { plte: RGB.slice(0, 8), trns: [0] });
function run(pieces, files = { "s.png": SHEET() }, sheets = { s: "s.png" }) {
  const d = dir(); for (const [f, b] of Object.entries(files)) writeFileSync(path.join(d, f), b);
  writeFileSync(path.join(d, "meadow.json"), JSON.stringify({ biome: "meadow", tile: 48, quarter: 24, palette: "core48", sheets, pieces }));
  const q = quiet(); return Object.assign(check([path.join(d, "meadow.json")], q.log), { out: q.lines.join("\n") });
}
// The core set: three lawns, a sand and every water quarter in both frames.
const CORE = [piece("t/lawn/0"), piece("t/lawn/1"), piece("t/lawn/2"), piece("t/sand/0", { set: "sand" }),
  ...QUADS.flatMap(q => SHORE_STATES.flatMap(s => [1, 2].map(f => piece("t/water/" + q + "-" + s + "-f" + f, { kind: "shore", set: "water", quad: q, state: s, frame: f }))))];

test("the page's 48-colour table is read from index.html", () => {
  assert.equal(RGB.length, 48); assert.ok(RGB.every(c => c.length === 3 && c.every(v => Number.isInteger(v) && v >= 0 && v < 256)));
});
test("decode: indexed with tRNS and RGBA agree with the samples; other forms are refused and named", () => {
  const ix = decodePNG(SHEET()); assert.equal(ix.form, "8-bit indexed"); assert.deepEqual([...ix.rgba.slice(0, 8)], [...RGB[0], 0, ...RGB[1], 255]);
  const rgba = decodePNG(png(1, 1, [1, 2, 3, 255], { ctype: 6 })); assert.equal(rgba.form, "8-bit RGBA"); assert.deepEqual([...rgba.rgba], [1, 2, 3, 255]);
  assert.throws(() => decodePNG(png(1, 1, [1, 2, 3], { ctype: 2 })), /8-bit RGB \(8-bit indexed or 8-bit RGBA/);
  assert.throws(() => decodePNG(png(1, 1, [0, 1, 0, 2, 0, 3, 255, 255], { ctype: 6, depth: 16 })), /16-bit RGBA/);
  assert.throws(() => decodePNG(png(1, 1, [0], { plte: RGB.slice(0, 1), interlace: 1 })), /interlaced/);
  for (const t of ["gAMA", "iCCP", "cHRM", "sRGB"]) assert.throws(() => decodePNG(png(1, 1, [0], { plte: RGB.slice(0, 1), extra: [[t, Buffer.alloc(4)]] })), new RegExp("carries " + t));
  assert.throws(() => decodePNG(png(1, 1, [5], { plte: RGB.slice(0, 2) })), /index 5 outside PLTE/);
});
test("decodeExact: alpha 0 is -1, exact colours their index, an off-palette colour or a partial alpha is bad", () => {
  const exact = decodeExact(Uint8Array.from([...RGB[3], 255, 9, 9, 9, 0, ...RGB[47], 255, ...RGB[0], 255]), 2, 2, RGB);
  assert.equal(exact.bad, 0); assert.deepEqual([...exact.px], [3, -1, 47, 0]);
  assert.equal(decodeExact(Uint8Array.from([...RGB[3], 128]), 1, 1, RGB).bad, 1);
  assert.equal(decodeExact(Uint8Array.from([RGB[3][0] ^ 1, RGB[3][1], RGB[3][2], 255]), 1, 1, RGB).bad, 1);
});
test("a complete core set in the page's colours passes; the statuses are counted", () => {
  const r = run(CORE.map((p, i) => i === 0 ? Object.assign({}, p, { status: "signed" }) : p));
  assert.equal(r.refused, 0, r.out); assert.deepEqual(r.missing, []); assert.match(r.out, /^PASS$/m);
  assert.match(r.out, /statuses: 43 candidate, 1 signed/); assert.match(r.out, /lawn 3/); assert.match(r.out, /water\.se\.inner 2/);
  assert.match(r.out, /blocking kinds with no stand-in: FACE, SIDE, LIP, ROCK, CLIFF \(generator 1\)/, "no face.w1 or material.rock: nothing stands in");
  const withStandIn = run(CORE.concat(piece("t/face/w1", { kind: "face", cells: [1, 2] }), piece("t/rock", { kind: "material", set: "rock" })));
  assert.match(withStandIn.out, /blocking kinds with no stand-in: none \(stand-in: face\.w1 1, material\.rock 1\)/);
});
test("refusals: off-palette, partial alpha, rect outside the sheet, missing fields, a refused sheet; and a missing core key fails", () => {
  const off = png(2, 1, [...RGB[1], 255, 1, 2, 3, 255], { ctype: 6 }), half = png(1, 1, [...RGB[1], 128], { ctype: 6 });
  const gama = png(1, 1, [1], { plte: RGB.slice(0, 2), extra: [["gAMA", Buffer.from([0, 0, 177, 143])]] });
  const r = run(CORE.concat(
    piece("x/off", { sheet: undefined, file: "off.png" }), piece("x/half", { sheet: undefined, file: "half.png" }),
    piece("x/rect", { x: 3, w: 2 }), piece("x/nooffset", { offset: undefined }), piece("x/nostatus", { status: undefined }),
    piece("x/badstatus", { status: "draft" }), piece("x/gama", { sheet: "g" })),
    { "s.png": SHEET(), "off.png": off, "half.png": half, "g.png": gama }, { s: "s.png", g: "g.png" });
  assert.equal(r.refused, 7, r.out); assert.match(r.out, /^FAIL: 7 refused, 0 core keys missing$/m);
  assert.match(r.out, /REFUSED x\/off: 1 off-palette px, first at 1,0 \(#010203\)/);
  assert.match(r.out, /REFUSED x\/half: 1 px with alpha not 0 or 255, first at 0,0 \(alpha 128\)/);
  assert.match(r.out, /REFUSED x\/rect: rect 3,0,2,2 outside its sheet \(4×2\)/);
  assert.match(r.out, /REFUSED x\/nooffset: missing field offset/); assert.match(r.out, /REFUSED x\/nostatus: missing field status/);
  assert.match(r.out, /REFUSED x\/badstatus: status "draft" \(candidate or signed\)/); assert.match(r.out, /REFUSED x\/gama: sheet g\.png: carries gAMA/);
  const short = run(CORE.filter(p => p.name !== "t/water/ne-outer-f2" && p.name !== "t/lawn/2"));
  assert.deepEqual(short.missing, ["lawn (2 of 3)", "water.ne.outer (1 of 2 frames)"]); assert.match(short.out, /^FAIL: 0 refused, 2 core keys missing$/m);
});
