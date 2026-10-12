// tools/atlas-check.mjs, the art director's loader check, on PNGs and manifests made here: the forms it
// takes and refuses, the chunks that refuse a sheet, exact palette colours only, and the core set from src/atlas.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { deflateSync } from "node:zlib";
import { check, decodePNG, pageRGB, pageTables } from "../tools/atlas-check.mjs";
import { decodeExact, paletteTable, QUADS, SHORE_STATES, LIP_STATES } from "../src/atlas.mjs";

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
  assert.match(r.out, /blocking kinds with no stand-in: LIP, FACE, SIDE, ROCK \(/, "no face.w1 or material.rock: nothing stands in");
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
  assert.deepEqual(short.missing, ["lawn (2 of 3)", "water.ne.outer (frame 2 missing)"]); assert.match(short.out, /^FAIL: 0 refused, 2 core keys missing$/m);
});

test("water is complete with frames 1 and 2 exactly: other frame numbers are not water", () => {
  const swap = (from, to) => CORE.map(p => p.name === "t/water/sw-inner-f" + from ? Object.assign({}, p, { frame: to }) : p);
  assert.deepEqual(run(swap(2, 3)).missing, ["water.sw.inner (frame 2 missing)"], "frames 1 and 3");
  const zeroOne = CORE.map(p => p.kind === "shore" && p.quad === "nw" && p.state === "fill" ? Object.assign({}, p, { frame: p.frame - 1 }) : p);
  assert.deepEqual(run(zeroOne).missing, ["water.nw.fill (frame 2 missing)"], "frames 0 and 1: only frame 1 counts");
  assert.deepEqual(run(CORE).missing, []);
});
test("no stand-in: a blocking kind incomplete (any lip quarter list, face.w1, either side's mid, a boulder of 48 × 48 or less) while face.w1 or material.rock is empty", () => {
  const big = png(49, 49, new Array(49 * 49).fill(1), { plte: RGB.slice(0, 2) });
  const LIPS = QUADS.flatMap(q => LIP_STATES.map(s => piece("t/lip/" + q + "-" + s, { kind: "lip", quad: q, state: s })));
  const FULL = CORE.concat(LIPS, piece("t/face/w1", { kind: "face", cells: [1, 2] }), piece("t/side/e", { kind: "side", side: "e" }), piece("t/side/w", { kind: "side", side: "w" }),
    piece("t/boulder", { kind: "prop", type: "boulder" }));
  const files = { "s.png": SHEET(), "big.png": big }, at = r => r.out.match(/blocking kinds with no stand-in: (.*) \(stand-in/)[1];
  assert.equal(at(run(FULL, files)), "none", "every kind complete: no stand-in needed, though material.rock is empty");
  assert.equal(at(run(FULL.filter(p => p.name !== "t/lip/se-edgev0"), files)), "LIP", "one lip quarter list empty");
  assert.equal(at(run(FULL.filter(p => p.name !== "t/side/w"), files)), "SIDE", "the west side's mid empty");
  assert.equal(at(run(FULL.filter(p => p.name !== "t/face/w1").concat(piece("t/face/w3", { kind: "face", cells: [3, 2] })), files)), "FACE", "face.w3 alone: face.w1 is what the rest falls back to");
  assert.equal(at(run(FULL.filter(p => p.name !== "t/boulder").concat(piece("t/boulder-big", { kind: "prop", type: "boulder", sheet: undefined, file: "big.png" })), files)), "ROCK", "only a 49 × 49 boulder");
  const withRock = FULL.filter(p => p.name !== "t/lip/se-edgev0").concat(piece("t/rock", { kind: "material", set: "rock" }));
  assert.equal(at(run(withRock, files)), "none", "an incomplete lip with the stand-in there");
});
test("--drop: every sheet's form is printed, and a sheet that is not 8-bit indexed fails; sRGB stays refused in both modes", () => {
  const rgba = png(4, 2, RGB.slice(0, 8).flatMap(c => [...c, 255]), { ctype: 6 }), srgb = png(4, 2, [1, 1, 1, 1, 1, 1, 1, 1], { plte: RGB.slice(0, 2), extra: [["sRGB", Buffer.from([0])]] });
  const pieces = CORE.concat(piece("x/rgba", { sheet: "r" })), files = { "s.png": SHEET(), "r.png": rgba }, sheets = { s: "s.png", r: "r.png" };
  const loose = run(pieces, files, sheets); assert.equal(loose.refused, 0, loose.out);
  assert.match(loose.out, /^ {2}\S*s\.png: 8-bit indexed 4×2$/m); assert.match(loose.out, /^ {2}\S*r\.png: 8-bit RGBA 4×2$/m);
  const d = dir(); for (const [f, b] of Object.entries(files)) writeFileSync(path.join(d, f), b);
  writeFileSync(path.join(d, "meadow.json"), JSON.stringify({ sheets, pieces }));
  const q = quiet(), strict = check([path.join(d, "meadow.json")], q.log, { drop: true }), out = q.lines.join("\n");
  assert.equal(strict.refused, 1, out); assert.match(out, /REFUSED x\/rgba: sheet r\.png: 8-bit RGBA \(--drop takes 8-bit indexed only\)/);
  assert.match(out, /^ {2}REFUSED \S*r\.png: 8-bit RGBA \(--drop/m); assert.match(out, /^ {2}\S*s\.png: 8-bit indexed 4×2$/m);
  for (const drop of [false, true]) {
    const e = dir(); writeFileSync(path.join(e, "s.png"), srgb); writeFileSync(path.join(e, "m.json"), JSON.stringify({ sheets: { s: "s.png" }, pieces: [piece("x/srgb")] }));
    const q2 = quiet(); assert.equal(check([path.join(e, "m.json")], q2.log, { drop }).refused, 1); assert.match(q2.lines.join("\n"), /REFUSED x\/srgb: sheet s\.png: carries sRGB/);
  }
});

// ---- the biome palette: the core 48 unchanged, then the biome's own entries with their five tables ----
const TABLES = pageTables(), FIELDS = ["dark", "light", "dark2", "fog", "fade"];
const hexOf = c => "#" + c.map(v => v.toString(16).padStart(2, "0")).join("");
// A fixture meadow: four colours off the core, with tables over the whole table of 52: fog toward bone at .62 and fade toward stone
// at .5 by the page's mixLUT rule (the nearest entry, by its weighted distance, to the mixed colour); dark and light a step down and
// up, here the nearest entry to the colour mixed toward void and toward white; dark2 the dark of the dark, as the page's DARK2.
const MEADOW = ["#3a773b", "#418338", "#2b3b34", "#1d6888"].map(h => [1, 3, 5].map(k => parseInt(h.slice(k, k + 2), 16)));
function fixturePalette() {
  const rgb = RGB.concat(MEADOW), near = (r, g, b) => { let best = 0, bd = Infinity; rgb.forEach(([R, G, B], i) => { const d = (R - r) ** 2 * 3 + (G - g) ** 2 * 4 + (B - b) ** 2 * 2; if (d < bd) { bd = d; best = i; } }); return best; };
  const mix = (c, t, k) => near(c[0] + (t[0] - c[0]) * k, c[1] + (t[1] - c[1]) * k, c[2] + (t[2] - c[2]) * k), at = h => RGB.findIndex(c => hexOf(c) === h);
  const [VOID, WHITE, BONE, STONE] = ["#0c0a12", "#ffffff", "#f1ebdf", "#5d5974"].map(h => RGB[at(h)]);   // the page's void, white, bone and stone
  const entries = RGB.map((c, i) => ({ i, name: "core-" + i, hex: hexOf(c), ...Object.fromEntries(FIELDS.map(f => [f, TABLES[f][i]])) }));
  MEADOW.forEach((c, j) => entries.push({ i: 48 + j, name: "meadow-" + j, hex: hexOf(c), dark: mix(c, VOID, .35), light: mix(c, WHITE, .3), dark2: null, fog: mix(c, BONE, .62), fade: mix(c, STONE, .5) }));
  for (const e of entries.slice(48)) e.dark2 = entries[entries[e.i].dark].dark;
  return { biome: "meadow", entries };
}
// An indexed sheet on the fixture: index 0 transparent, then core colours and the four meadow colours (48–51).
const PAL = fixturePalette(), PAL_RGB = PAL.entries.map(e => MEADOW.concat(RGB).find(c => hexOf(c) === e.hex));
const MEADOW_SHEET = () => png(4, 2, [0, 1, 48, 49, 50, 51, 5, 6], { plte: PAL_RGB, trns: [0] });
function runPal({ pieces = CORE, files = { "s.png": MEADOW_SHEET() }, palette = "meadow", pal = PAL, drop = false, extra = null } = {}) {
  const d = dir(); for (const [f, b] of Object.entries(files)) writeFileSync(path.join(d, f), b);
  if (pal) writeFileSync(path.join(d, "meadow-palette.json"), JSON.stringify(pal));
  const man = { biome: "meadow", tile: 48, quarter: 24, sheets: { s: "s.png" }, pieces }; if (palette !== null) man.palette = palette;   // null: no palette field
  writeFileSync(path.join(d, "meadow.json"), JSON.stringify(man)); const list = [path.join(d, "meadow.json")];
  if (extra) { writeFileSync(path.join(d, "more.json"), JSON.stringify(extra)); list.push(path.join(d, "more.json")); }
  const q = quiet(); return Object.assign(check(list, q.log, { drop }), { out: q.lines.join("\n") });
}
const edit = (k, patch) => ({ biome: "meadow", entries: PAL.entries.map(e => e.i === k ? Object.assign({}, e, patch) : e) });

test("palette: the page's tables are read from index.html, 48 each, dark2 the dark of the dark", () => {
  assert.ok(MEADOW.every(c => !RGB.some(k => hexOf(k) === hexOf(c))), "the fixture's meadow colours are off the core");
  for (const f of FIELDS) assert.equal(TABLES[f].length, 48, f);
  assert.ok(TABLES.dark.every((d, i) => TABLES.dark2[i] === TABLES.dark[d]));
  assert.ok(FIELDS.every(f => TABLES[f].every(v => Number.isInteger(v) && v >= 0 && v < 48)));
});
test("palette 1: a valid biome palette passes paletteTable and the check, with its summary", () => {
  const t = paletteTable(RGB, TABLES, PAL); assert.equal(t.errors, undefined, String(t.errors));
  assert.equal(t.rgb.length, 52); assert.deepEqual(t.rgb[49], MEADOW[1]); for (const f of FIELDS) assert.equal(t[f].length, 52);
  const r = runPal(); assert.equal(r.refused, 0, r.out); assert.match(r.out, /^palette meadow \(meadow-palette\.json\): 52 entries, 4 biome entries, the core 48 and every table ok$/m); assert.match(r.out, /^PASS$/m);
});
test("palette 2: a pixel off the core but in the biome set is accepted", () => {
  const r = runPal({ pieces: CORE.concat(piece("x/meadow", { x: 2, y: 0, w: 2, h: 1 })) }); assert.equal(r.refused, 0, r.out); assert.match(r.out, /ok x\/meadow 2×1/);
});
test("palette 3: a pixel in neither the core nor the biome set is refused", () => {
  const off = png(2, 1, [...MEADOW[0], 255, 1, 2, 3, 255], { ctype: 6 });
  const r = runPal({ pieces: CORE.concat(piece("x/off", { sheet: undefined, file: "off.png" })), files: { "s.png": MEADOW_SHEET(), "off.png": off } });
  assert.equal(r.refused, 1, r.out); assert.match(r.out, /REFUSED x\/off: 1 off-palette px, first at 1,0 \(#010203\)/);
});
test("palette 4: a core entry changed (its hex or a table) is refused", () => {
  assert.match(paletteTable(RGB, TABLES, edit(7, { hex: "#000001" })).errors.join(";"), /entry 7: hex #000001 differs from the core colour/);
  assert.match(paletteTable(RGB, TABLES, edit(9, { fog: (TABLES.fog[9] + 1) % 48 })).errors.join(";"), /entry 9: fog \d+ differs from the core table/);
  const r = runPal({ pal: edit(3, { dark: (TABLES.dark[3] + 1) % 48 }) });
  assert.match(r.out, /^REFUSED palette meadow \(meadow-palette\.json\): entry 3: dark/m); assert.match(r.out, /^FAIL: /m);
});
test("palette 5: 257 entries are refused", () => {
  const big = { biome: "meadow", entries: PAL.entries.concat(Array.from({ length: 257 - 52 }, (_, j) => ({ i: 52 + j, name: "x" + j, hex: "#" + (0x100000 + j).toString(16), dark: 0, light: 0, dark2: 0, fog: 0, fade: 0 }))) };
  assert.equal(big.entries.length, 257); assert.deepEqual(paletteTable(RGB, TABLES, big).errors, ["257 entries (at most 256)"]);
  assert.match(runPal({ pal: big }).out, /REFUSED palette meadow .*257 entries \(at most 256\)/);
});
test("palette 6: a table index out of range is refused", () => {
  assert.match(paletteTable(RGB, TABLES, edit(50, { fade: 52 })).errors.join(";"), /entry 50: fade 52 outside 0 … 51/);
  assert.match(paletteTable(RGB, TABLES, edit(48, { light: -1 })).errors.join(";"), /entry 48: light -1 outside/);
  assert.match(runPal({ pal: edit(51, { dark2: 99 }) }).out, /REFUSED palette meadow .*entry 51: dark2 99 outside 0 … 51/);
});
test("palette 7: --drop refuses a sheet whose PLTE holds an entry off the palette, used or not", () => {
  const extraEntry = png(4, 2, [0, 1, 48, 49, 50, 51, 5, 6], { plte: PAL_RGB.concat([[1, 2, 3]]), trns: [0] });   // entry 52, used by no pixel
  const loose = runPal({ files: { "s.png": extraEntry } }); assert.equal(loose.refused, 0, loose.out);
  const strict = runPal({ files: { "s.png": extraEntry }, drop: true });
  assert.ok(strict.refused > 0); assert.match(strict.out, /REFUSED \S*s\.png: 1 PLTE entry not in the palette \(52 #010203\)/);
  assert.equal(runPal({ drop: true }).refused, 0, "the fixture sheet passes --drop");
});
test("palette 8: no palette (or core48) is the page's 48: a meadow colour is refused as before", () => {
  for (const palette of [null, "core48"]) {
    const r = runPal({ palette, pal: null, pieces: CORE.concat(piece("x/meadow", { x: 2, y: 0, w: 2, h: 1 })) });
    assert.match(r.out, /^palette core48: 48 entries, 0 biome entries, the page's 48$/m); assert.match(r.out, /REFUSED x\/meadow: 2 off-palette px/);
  }
});
test("palette: dark2 must be dark[dark[i]]: the fixture holds it, and one entry off it is refused", () => {
  assert.ok(PAL.entries.every(e => e.dark2 === PAL.entries[PAL.entries[e.i].dark].dark), "the fixture");
  const e = PAL.entries[49], wrong = PAL.entries.findIndex(x => x.i !== e.dark2 && x.i < 52);
  assert.deepEqual(paletteTable(RGB, TABLES, edit(49, { dark2: wrong })).errors, ["entry 49: dark2 " + wrong + " is not dark[dark[49]] (" + e.dark2 + ")"]);
  assert.match(runPal({ pal: edit(49, { dark2: wrong }) }).out, /REFUSED palette meadow .*entry 49: dark2 \d+ is not dark\[dark\[49\]\]/);
});
test("transparency: an indexed sheet's tRNS alpha 0 decodes to -1 whatever its colour; a tRNS alpha other than 0 or 255 is refused", () => {
  const d = decodeExact(Uint8Array.from([1, 2, 3, 0, ...RGB[4], 255]), 2, 1, RGB); assert.equal(d.bad, 0); assert.deepEqual([...d.px], [-1, 4]);
  // index 0 is an off-palette colour with tRNS 0 (transparent), index 1 a core colour, index 2 a core colour at tRNS 128
  const plte = [[1, 2, 3], RGB[5], RGB[6]], sheet = png(3, 1, [0, 1, 2], { plte, trns: [0, 255, 128] });
  const r = runPal({ files: { "s.png": MEADOW_SHEET(), "t.png": sheet }, pieces: CORE.concat(piece("x/clear", { sheet: undefined, file: "t.png" })) });
  assert.match(r.out, /REFUSED x\/clear: 1 px with alpha not 0 or 255, first at 2,0 \(alpha 128\)/);
  const ok = png(2, 1, [0, 1], { plte: plte.slice(0, 2), trns: [0, 255] });
  const r2 = runPal({ files: { "s.png": MEADOW_SHEET(), "t.png": ok }, pieces: CORE.concat(piece("x/clear", { sheet: undefined, file: "t.png" })) });
  assert.equal(r2.refused, 0, r2.out); assert.match(r2.out, /ok x\/clear 2×1/);
});
test("palette: an i gap, a repeated hex, and manifests naming different palettes are refused", () => {
  assert.match(paletteTable(RGB, TABLES, edit(50, { i: 53 })).errors.join(";"), /entry 50: i is 53/);
  assert.match(paletteTable(RGB, TABLES, edit(51, { hex: "#3A773B" })).errors.join(";"), /entry 51: hex #3a773b repeats entry 48/);
  const r = runPal({ extra: { palette: "core48", sheets: { s: "s.png" }, pieces: [] } });
  assert.match(r.out, /^REFUSED palette: the manifests name different palettes \(meadow, core48\)$/m); assert.ok(r.refused > 0);
});
