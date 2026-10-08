#!/usr/bin/env node
// Bakes the Station's type atlases: Inter at 16 (Regular), 20 (Medium) and 28 px (SemiBold), glyph by glyph, with
// LVGL's font converter (lv_font_conv, MIT) run in Node as a library. For each face it writes a PNG (white with the
// glyph coverage in alpha, 4 bits quantised to 16 levels as LVGL's 4 bpp) and a JSON of metrics (placement, advance,
// kerning). The page blits the glyphs from the PNG and measures from the JSON; no text API draws a pixel.
//
//   npm install --prefix <dir> lv_font_conv@1.5.3
//   node prototypes/ui/tools/bake-type.mjs --lvfc <dir>/node_modules/lv_font_conv --ttf <dir with Inter-Regular.ttf, Inter-Medium.ttf, Inter-SemiBold.ttf>
//
// The TTFs are the Inter 4.1 release's extras/ttf (the same release as the bundled web fonts, which the converter cannot read: it takes TTF and
// WOFF, not WOFF2) with the tnum feature frozen in, so the converter's default figures are Inter's own tabular ones (it applies no OpenType features):
//   pip install opentype-feature-freezer
//   for w in Regular Medium SemiBold; do pyftfeatfreeze -f tnum Inter-$w.ttf frozen/Inter-$w.ttf; done     (then --ttf frozen)
// The bake asserts every digit has one advance; a font whose digits differ is refused.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { encodePNG } from "../png.mjs";

const arg = (k) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : null; };
const lvfc = arg("lvfc"), ttfDir = arg("ttf");
if (!lvfc || !ttfDir) { console.error("usage: bake-type.mjs --lvfc <path to node_modules/lv_font_conv> --ttf <dir>"); process.exit(2); }
const require = createRequire(import.meta.url);
const collect = require(path.resolve(lvfc, "lib/collect_font_data.js"));
const here = path.dirname(fileURLToPath(import.meta.url)), out = path.join(here, "../fonts/atlas");
mkdirSync(out, { recursive: true });

const FACES = [{ weight: 400, px: 16, file: "Inter-Regular.ttf" }, { weight: 500, px: 20, file: "Inter-Medium.ttf" }, { weight: 600, px: 28, file: "Inter-SemiBold.ttf" }];
// Basic Latin, Latin-1 and Latin Extended-A (the target markets' Spanish and the species names), general punctuation, arrows, the check, the star, the triangles.
const RANGES = [[0x20, 0x7e], [0xa0, 0x17f], [0x2010, 0x2027], [0x2190, 0x2193], [0x2605, 0x2605], [0x25b2, 0x25b2], [0x25b6, 0x25b6], [0x25bc, 0x25bc], [0x25c0, 0x25c0], [0x2713, 0x2713]];
const isDigit = (c) => c >= 0x30 && c <= 0x39;   // no kerning between figures: they stay tabular
const quant = (v) => Math.round((v / 255) * 15) * 17;
const index = { family: "Inter", release: "4.1", baked: "lv_font_conv " + JSON.parse(readFileSync(path.join(lvfc, "package.json"), "utf8")).version, bpp: 4, faces: [] };

for (const F of FACES) {
  const bin = readFileSync(path.join(ttfDir, F.file));
  const data = await collect({ font: [{ source_path: F.file, source_bin: bin, ranges: [{ range: RANGES.flatMap(([a, b]) => [a, b, a]) }] }], size: F.px, bpp: 4, format: "dump", no_kerning: false });
  const glyphs = data.glyphs.filter((g) => g.code !== 0xa0 || true);
  // tabular figures
  const digits = glyphs.filter((g) => g.code >= 0x30 && g.code <= 0x39), wmax = Math.max(...digits.map((g) => Math.round(g.advanceWidth)));
  if (digits.some((g) => Math.abs(g.advanceWidth - digits[0].advanceWidth) > 0.01)) throw new Error(F.file + ": the figures are not tabular; freeze the tnum feature into the TTF first");
  // shelf packing
  const W = 512; let x = 1, y = 1, rowH = 0; const place = {};
  for (const g of glyphs) {
    const { width: w, height: h } = g.bbox; if (!w || !h) { place[g.code] = null; continue; }
    if (x + w + 1 > W) { x = 1; y += rowH + 1; rowH = 0; }
    place[g.code] = [x, y]; x += w + 1; rowH = Math.max(rowH, h);
  }
  const H = y + rowH + 1, rgba = new Uint8Array(W * H * 4);
  for (const g of glyphs) {
    const p = place[g.code]; if (!p) continue; const { width: w, height: h } = g.bbox;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const o = ((p[1] + j) * W + p[0] + i) * 4; rgba[o] = rgba[o + 1] = rgba[o + 2] = 255; rgba[o + 3] = quant(g.pixels[j][i]); }
  }
  const png = `inter-${F.weight}-${F.px}.png`, jf = `inter-${F.weight}-${F.px}.json`;
  writeFileSync(path.join(out, png), encodePNG(W, H, rgba));
  const gl = {}, kern = {};
  for (const g of glyphs) {
    const p = place[g.code], top = g.bbox.y + g.bbox.height;   // the bbox is above the baseline by y + height
    gl[g.code] = { adv: g.advanceWidth, ...(p ? { x: p[0], y: p[1], w: g.bbox.width, h: g.bbox.height, ox: g.bbox.x, oy: -top } : {}) };
    for (const [c2, v] of Object.entries(g.kerning)) if (Math.abs(v) >= 0.05 && !(isDigit(g.code) && isDigit(+c2))) kern[g.code + "," + c2] = Math.round(v * 100) / 100;
  }
  const cap = gl[0x48].h;   // the height of the H: where the cap top sits above the baseline
  const meta = { id: `inter-${F.weight}-${F.px}`, family: "Inter", weight: F.weight, px: F.px, atlas: png, size: [W, H], cap, ascent: data.typoAscent, descent: data.typoDescent, pitch: { 16: 20, 20: 28, 28: 36 }[F.px], tabularDigits: wmax, source: F.file, sourceSha256: createHash("sha256").update(bin).digest("hex"), glyphs: gl, kern };
  writeFileSync(path.join(out, jf), JSON.stringify(meta));
  index.faces.push({ id: meta.id, weight: F.weight, px: F.px, atlas: png, metrics: jf, cap, pitch: meta.pitch, glyphs: glyphs.length, kernPairs: Object.keys(kern).length, sha256: { atlas: createHash("sha256").update(readFileSync(path.join(out, png))).digest("hex"), metrics: createHash("sha256").update(readFileSync(path.join(out, jf))).digest("hex") } });
  console.log(meta.id, glyphs.length, "glyphs", Object.keys(kern).length, "kern pairs", W + "x" + H, "cap", cap, "digits", wmax);
}
writeFileSync(path.join(out, "index.json"), JSON.stringify(index, null, 1) + "\n");
