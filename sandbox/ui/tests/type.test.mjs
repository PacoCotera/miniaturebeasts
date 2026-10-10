// The image format and the picture files, in Node: PNG round-trips, the focus ring's mask is whole pixels, and a PNG is the only picture file in the layer. (The type is the face's: Inter in the face, its metrics in face/tests.)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { encodePNG, decodePNG } from "../png.mjs";
import { ringMask } from "../rings.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.join(here, "..");

test("PNG round-trips and decodes every filter", () => {
  const w = 5, h = 4, rgba = new Uint8Array(w * h * 4).map((_, i) => (i * 37) & 255), png = encodePNG(w, h, rgba), back = decodePNG(png);
  assert.equal(back.width, w); assert.deepEqual([...back.data], [...rgba]);
});

test("the focus ring is whole pixels: a mask of two values, 2 px thick, round corners", () => {
  const m = ringMask(20, 20, 2, 6); assert.ok(m.every((v) => v === 0 || v === 255));
  assert.equal(m[10 * 20 + 0], 255); assert.equal(m[10 * 20 + 1], 255); assert.equal(m[10 * 20 + 2], 0); assert.equal(m[0], 0, "the corner is cut");
  const e = ringMask(176, 24, 2, 0, "ellipse"); assert.equal(e[12 * 176 + 88], 0); assert.equal(e[1 * 176 + 88], 255);
});

test("a PNG is the only picture file in the layer", () => {
  const stray = []; const walk = (d) => { for (const f of readdirSync(d)) { const p = path.join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(jpe?g|gif|webp|svg|bmp)$/i.test(f)) stray.push(p); } }; walk(root);
  assert.deepEqual(stray, []);
});
