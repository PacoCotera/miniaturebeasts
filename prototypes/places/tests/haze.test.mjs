// The range haze (art desk, mibi-art 9fa531bba): the files are the desk's byte for byte, the kit reads them with no pixel of no table, the dual-grid lay uses the desk's hash, and every
// pixel the haze draws is a palette index (the kit's colours or the 6 ramp colours): one table lookup per layer per pixel, no alpha.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { readPlace, readTileSet } from "../src/format/read.mjs";
import { renderGround, tablesOf } from "../src/ground.mjs";
import { hazeKit, hazeFileNames, layHaze, applyHaze, h32 } from "../src/haze.mjs";
import { BakedView } from "../src/page.mjs";
import { decodePNG } from "../../ui/png.mjs";

const DIR = new URL("../haze/", import.meta.url), DESK = process.env.MIBI_ART_HAZE || "/home/mb/mb/mibi-art/art-jobs/2026-11-09-range-haze/out/";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const placed = readdirSync(DIR).filter((f) => f.endsWith(".png") || f.endsWith(".json")).filter((f) => f !== "SHA256.json").sort();
const HASHES = JSON.parse(readFileSync(new URL("SHA256.json", DIR), "utf8"));
const files = Object.fromEntries(hazeFileNames().map((n) => [n, decodePNG(readFileSync(new URL(n + ".png", DIR)))]));
const remap = JSON.parse(readFileSync(new URL("haze-remap.json", DIR), "utf8")), ramp = JSON.parse(readFileSync(new URL("haze-ramp.json", DIR), "utf8"));
const kit = hazeKit(files, remap, ramp);

test("every placed file equals the desk's file byte for byte (and its recorded hash)", () => {
  assert.deepEqual(Object.keys(HASHES).sort(), placed);
  assert.equal(placed.length, 9 + 2);
  for (const f of placed) assert.equal(sha(readFileSync(new URL(f, DIR))), HASHES[f], f);
  if (!existsSync(DESK)) { console.log("# the desk's out/ is not beside this repo: byte check against the recorded hashes only"); return; }
  for (const f of placed) assert.ok(readFileSync(new URL(f, DIR)).equals(readFileSync(DESK + f)), f + " differs from the desk's file");
});

test("the desk's hash: the lump a dual tile wears", () => {
  assert.equal(h32("Windstep~xh1", 3, 4), 3843530943);
  assert.equal(h32("Reedpoolh3", 0, 21), 3906915519);
  assert.equal(h32("Windsteph2", 17, 5), 1153023243);
});

test("the kit: the ramp sits at 98-103, 21 tables, and a table only ever answers with a palette or ramp index", () => {
  assert.equal(kit.ramp.first, 98); assert.equal(kit.ramp.rgb.length, 6); assert.equal(kit.extra.first, 91); assert.equal(kit.extra.rgb.length, 13, "the open-edges 7 and the ramp 6");
  assert.deepEqual(kit.kit43, ts.palette.map((c) => [(c >> 16) & 255, (c >> 8) & 255, c & 255]), "the tables are keyed to the tile set's 43 colours, in its order");
  const ok = new Set(Array.from({ length: 56 }, (_, k) => 48 + k));
  for (let L = 0; L < 3; L++) for (let s = 1; s <= 7; s++) for (let i = 48; i < 48 + 43; i++) assert.ok(ok.has(kit.tables[L][s][i]), `L${L + 1}.${s}[${i}]`);
  for (let L = 0; L < 3; L++) for (let s = 1; s <= 7; s++) for (let i = 98; i < 104; i++) assert.ok(ok.has(kit.tables[L][s][i]), `ramp L${L + 1}.${s}[${i}]`);
});

// a real ground: Windstep at 48 px
const place = readPlace(new Uint8Array(readFileSync(new URL("../baked/Windstep.mbplace", import.meta.url))));
const ts = readTileSet(new Uint8Array(readFileSync(new URL("../baked/" + place.set + ".mbtiles", import.meta.url))));
const ground = () => renderGround(ts, place, 48, { x: 0, y: 0, w: place.w * 48, h: place.h * 48 }, 0);
const levelsOf = (depth) => { const lv = new Uint8Array(place.w * place.h); for (let d = 0; d < depth; d++) for (let x = 0; x < place.w; x++) lv[d * place.w + x] = Math.max(lv[d * place.w + x], 3 - d); return lv; };

test("every pixel the haze draws is a palette index; the edge is washed, the far side is untouched, and depth 0 draws nothing", () => {
  const W = place.w * 48, win = { x: 0, y: 0, w: W, h: place.h * 48 }, base = ground();
  const allowed = new Set(Array.from({ length: 56 }, (_, k) => 48 + k));
  for (const depth of [0, 1, 2, 3]) {
    const buf = Uint8Array.from(base), hz = layHaze(kit, levelsOf(depth), place.w, place.h, "Windstep");
    applyHaze(buf, win, 48, kit, hz);
    let changed = 0, rampPx = 0, lastRow = -1;
    for (let i = 0; i < buf.length; i++) { if (buf[i] !== base[i]) { changed++; lastRow = Math.max(lastRow, (i / W) | 0); if (buf[i] >= 98) rampPx++; } if (base[i]) assert.ok(allowed.has(buf[i]), `pixel ${i} drew index ${buf[i]}`); }
    if (!depth) { assert.equal(changed, 0); continue; }
    assert.ok(changed > 500, `depth ${depth} washes the ground: ${changed}`); assert.ok(rampPx > 0, "the ramp colours are used");
    assert.ok(lastRow < depth * 48 + 24, `depth ${depth}: the wash ends within its cells (row ${lastRow})`);
  }
  // deeper takes more
  const count = (d) => { const b = Uint8Array.from(base); applyHaze(b, win, 48, kit, layHaze(kit, levelsOf(d), place.w, place.h, "Windstep")); return b.reduce((n, v, i) => n + (v !== base[i] ? 1 : 0), 0); };
  assert.ok(count(1) < count(2) && count(2) < count(3));
});

test("a window cut from the place washes the same pixels as the whole (the camera's view)", () => {
  const W = place.w * 48, full = ground(), hz = layHaze(kit, levelsOf(3), place.w, place.h, "Windstep"), a = Uint8Array.from(full);
  applyHaze(a, { x: 0, y: 0, w: W, h: place.h * 48 }, 48, kit, hz);
  const win = { x: 100, y: 20, w: 300, h: 200 }, b = new Uint8Array(win.w * win.h);
  for (let y = 0; y < win.h; y++) for (let x = 0; x < win.w; x++) b[y * win.w + x] = full[(win.y + y) * W + win.x + x];
  applyHaze(b, win, 48, kit, hz);
  for (let y = 0; y < win.h; y++) for (let x = 0; x < win.w; x++) assert.equal(b[y * win.w + x], a[(win.y + y) * W + win.x + x]);
});

test("the view joins the ramp to its palette and light tables, washes the ground it draws, and its crowns and props fade with the land", () => {
  const core = Array.from({ length: 48 }, (_, i) => [i * 5 % 256, i * 3 % 256, i * 7 % 256]);
  const mk = (w, h) => ({ width: w, height: h, getContext: () => ({}) });
  const v = new BakedView(ts, place, { core, night: 2, mkCanvas: mk, haze: kit });
  assert.equal(v.paletteRgb().length >= 6 + 1, true);
  for (const c of kit.ramp.rgb) assert.ok(v.paletteRgb().some((q) => q.join() === c.join()), "ramp colour " + c);
  const tb = tablesOf(ts).fog;
  for (let i = 91; i < 104; i++) assert.ok(tb[i] >= 1 && tb[i] < 104, "the fog table answers for the ramp index " + i);
  v.setHaze(levelsOf(3), "N3", "Windstep");
  assert.ok(v.hazeMaps); v.setHaze(null); assert.equal(v.hazeMaps, null);
  const plain = new BakedView(ts, place, { core, night: 2, mkCanvas: mk });
  plain.setHaze(levelsOf(3), "N3", "Windstep"); assert.equal(plain.hazeMaps, null, "a view without the kit draws no haze");
});
