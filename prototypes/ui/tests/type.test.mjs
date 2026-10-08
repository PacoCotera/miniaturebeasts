// The type layer, the image format and the closed primitive set, in Node.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadTypeNode } from "../type-node.mjs";
import { SIZES } from "../type.mjs";
import { encodePNG, decodePNG } from "../png.mjs";
import { ringMask } from "../rings.mjs";
import { makeCtx } from "../context.mjs";
import { frame, chapterRail, chapterPage } from "../components/frame.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.join(here, "..");
const spec = JSON.parse(readFileSync(path.join(root, "specs/station/frame.json"), "utf8"));
const T = loadTypeNode();

test("the atlases are Inter at 16, 20 and 28 px, baked by LVGL's converter, with 4-bit coverage", () => {
  const index = JSON.parse(readFileSync(path.join(root, "fonts/atlas/index.json"), "utf8"));
  assert.deepEqual(index.faces.map((f) => [f.weight, f.px]), [[400, 16], [500, 20], [600, 28]]);
  assert.match(index.baked, /^lv_font_conv 1\./); assert.equal(index.bpp, 4); assert.equal(index.release, "4.1");
  for (const f of index.faces) {
    const img = T.images[f.id], face = T.face(f.px); assert.equal(img.width, face.size[0]); assert.equal(img.height, face.size[1]);
    const levels = new Set(); for (let i = 3; i < img.data.length; i += 4) levels.add(img.data[i]);
    assert.ok([...levels].every((v) => v % 17 === 0), "alpha on the 16 levels of 4 bpp");
    assert.ok(face.glyphs.get(0x48).h > 0 && face.cap === face.glyphs.get(0x48).h);
  }
  assert.throws(() => T.face(13), /no face for Inter/); assert.throws(() => T.face(24), /no face/);
  assert.deepEqual(Object.keys(SIZES).map(Number), [16, 20, 28]);
});

test("figures are tabular and kerning is applied from the atlas metrics", () => {
  for (const px of [16, 20, 28]) { const w = T.measure("0000", px); for (const d of "123456789") assert.equal(T.measure(d.repeat(4), px), w, `digit ${d} at ${px}`); }
  assert.ok(T.measure("\",", 28) < T.measure("\"", 28) + T.measure(",", 28), "the converter's kerning pairs apply (quote, comma)");
  const r = T.layout("Read Coat", 16); assert.equal(r.width, T.measure("Read Coat", 16)); assert.ok(r.glyphs.every((g) => g.dx >= -2 && g.dy >= -2 && g.dy + g.h <= 24));
  assert.equal(T.layout("a", 16).glyphs.length, 1); assert.equal(T.layout(" ", 16).glyphs.length, 0);
  for (const s of ["✓", "←", "·", "…", "á é í ó ú ñ ¿ ¡", "▲ ▼ ◀ ▶ ★"]) { T.missing.clear(); T.layout(s, 16); assert.equal(T.missing.size, 0, "baked: " + s); }
  T.layout("中", 16); assert.ok(T.missing.has("中")); T.missing.clear();   // an unbaked character is logged and shows '?'
});

test("PNG round-trips and decodes every filter", () => {
  const w = 5, h = 4, rgba = new Uint8Array(w * h * 4).map((_, i) => (i * 37) & 255), png = encodePNG(w, h, rgba), back = decodePNG(png);
  assert.equal(back.width, w); assert.deepEqual([...back.data], [...rgba]);
});

test("the focus ring is whole pixels: a mask of two values, 2 px thick, round corners", () => {
  const m = ringMask(20, 20, 2, 6); assert.ok(m.every((v) => v === 0 || v === 255));
  assert.equal(m[10 * 20 + 0], 255); assert.equal(m[10 * 20 + 1], 255); assert.equal(m[10 * 20 + 2], 0); assert.equal(m[0], 0, "the corner is cut");
  const e = ringMask(176, 24, 2, 0, "ellipse"); assert.equal(e[12 * 176 + 88], 0); assert.equal(e[1 * 176 + 88], 255);
});

test("nodes are plain JSON: a frame, a rail and a page survive a round trip unchanged, and use only the closed set", () => {
  const ctx = makeCtx(spec, T);
  const nodes = frame(ctx, { title: "Pods", turn: 5, materials: { e: 10, d: 8, s: 15 }, companion: { text: "Companion docked", lamp: "on" }, line: { ok: "Read Coat", price: "3 ◆", back: "Home", subject: "Loika pod", need: "something new here" }, message: "New for the Loika" });
  const rail = chapterRail(ctx, "rail", { rect: [176, 48, 832, 56] }, { tabs: [{ id: "coat", word: "Coat", emblem: "e", pips: 2, filled: 1, state: "read" }, { id: "x", word: "Legs", emblem: "e", pips: 3, filled: 0, state: "sealed", glint: true }], focused: 1, colours: { unreadFill: "frostD", unreadEdge: "slate", unreadWord: "ink", readFill: "tealD", readRim: "aqua", readWord: "mint", pip: "aqua", pipHollow: "stone", ring: "cream", changed: "amber" }, ground: "deep", slats: "s:", star: "star" }).nodes;
  const all = [...nodes, ...rail];
  assert.deepEqual(JSON.parse(JSON.stringify(all)), all);
  assert.ok(all.filter((n) => n.kind === "text").every((n) => n.rect[2] > 0 && n.rect[3] > 0), "every text node has a box, or the renderer would never paint it");
  assert.deepEqual([...new Set(all.map((n) => n.kind))].sort(), ["nineSlice", "rect", "sprite", "text"]);
});

test("no canvas path, gradient, shadow, filter, transform, global alpha or text API in the renderer, the components or the Station's drawing code", () => {
  const files = [];
  const walk = (d, skip) => { for (const f of readdirSync(d)) { const p = path.join(d, f); if (statSync(p).isDirectory()) { if (!skip.includes(f)) walk(p, skip); } else if (p.endsWith(".mjs") && !/png\.mjs$|type-node\.mjs$/.test(p)) files.push(p); } };
  walk(root, ["tests", "fonts", "tools", "node_modules"]);
  const station = path.join(root, "../station/src"); walk(station, ["views"]);
  const banned = /(fillText|strokeText|measureText|beginPath|moveTo|lineTo|\b(ctx|g|g2)\.arc\(|quadraticCurveTo|bezierCurveTo|createLinearGradient|createRadialGradient|createConicGradient|shadowBlur|shadowColor|\.filter\s*=|setTransform|\.translate\(|\.rotate\(|\.scale\(|globalAlpha|\.clip\(\)|\.stroke\(|strokeRect)/;
  const smoothing = /imageSmoothingQuality/;   // allowed only where a landed painting is derived at a smaller size (station/src/art.mjs, the painted layer)
  for (const f of files) {
    if (/station\/src\/(dev|caddy)\.mjs$/.test(f)) continue;   // the developer panel and the Caddy client draw no pixel
    const src = readFileSync(f, "utf8").split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n"), m = src.match(banned);
    assert.ok(!m, `${path.relative(root, f)} uses ${m && m[0]}`);
    if (!/station\/src\/art\.mjs$/.test(f)) assert.ok(!smoothing.test(src), `${path.relative(root, f)} uses imageSmoothingQuality`);
  }
  assert.ok(files.length > 25);
});

test("every character the Station can set is in the atlases (or is one of the icons drawn as a sprite)", () => {
  const face = T.face(16), icons = new Set(["⚡", "◆", "❀", "★", "✕"]), missing = new Map();
  const files = []; const walk = (d) => { for (const f of readdirSync(d)) { const p = path.join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(mjs|json)$/.test(f)) files.push(p); } };
  walk(path.join(root, "../station/src")); walk(path.join(root, "../workbench/frames")); files.push(path.join(root, "../workbench/framework/describe.mjs")); for (const f of readdirSync(path.join(root, "specs/station"))) files.push(path.join(root, "specs/station", f));
  for (const f of files) for (const line of readFileSync(f, "utf8").split("\n")) {
    if (/^\s*\/\//.test(line)) continue;
    for (const m of line.replace(/\/\/.*$/, "").matchAll(/"([^"\\]*(?:\\.[^"\\]*)*)"|`([^`]*)`/g)) for (const ch of m[1] ?? m[2]) if (ch.codePointAt(0) > 126 && !icons.has(ch) && !face.glyphs.has(ch.codePointAt(0))) missing.set(ch, path.basename(f));
  }
  assert.deepEqual([...missing], [], "characters in strings that the atlases lack");
});

test("a PNG is the only picture file in the layer", () => {
  const stray = []; const walk = (d) => { for (const f of readdirSync(d)) { const p = path.join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(jpe?g|gif|webp|svg|bmp)$/i.test(f)) stray.push(p); } }; walk(root);
  assert.deepEqual(stray, []);
});
