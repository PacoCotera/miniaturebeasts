#!/usr/bin/env node
// Bakes the glyph tables the logic process prints with (the Library sheet's type): Inter Regular-tnum and Medium-tnum at 12 and 14 px from the frozen TrueType files in ui/fonts/inter/src,
// by the converter face/tools/bake-fonts.sh uses (lv_font_conv 1.5.3, its dump writer with full info), 8 bpp grayscale with the face's ranges, advances and kerning.
// Each table is ui/fonts/inter/glyphs/inter-<weight>-<size>.json:
//   { font, size, bpp: 8, ascent, descent, glyphs: { <code>: [advance (1/16 px), x offset, y offset (bottom of the box above the baseline), w, h, base64 of the w x h coverage bytes, rows top first] },
//     kern: { <left code>: { <right code>: kerning (1/16 px) } } }
// The advance and the kerning are the converter's own rounding for an LVGL font (1/16 px); a glyph's pen step is (advance + kerning + 8) >> 4 whole pixels, as LVGL draws it.
//   npm install --prefix /tmp/lvfc lv_font_conv@1.5.3
//   node prototypes/ui/tools/bake-glyphs.mjs [/tmp/lvfc/node_modules/.bin/lv_font_conv]
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url)), ttf = path.resolve(here, "../fonts/inter/src"), out = path.resolve(here, "../fonts/inter/glyphs");
const conv = process.argv[2] || "/tmp/lvfc/node_modules/.bin/lv_font_conv";
const ranges = "0x20-0x7e,0xa0-0x17f,0x2010-0x2027,0x2212,0x2190-0x2193,0x2605,0x25b2,0x25b6,0x25bc,0x25c0,0x2713";   // the face's (bake-fonts.sh)
mkdirSync(out, { recursive: true });
for (const [weight, size] of [["Regular", 12], ["Regular", 14], ["Medium", 12], ["Medium", 14]]) {
  const dir = mkdtempSync(path.join(tmpdir(), "glyphs-"));
  try {
    execFileSync(conv, ["--font", path.join(ttf, `Inter-${weight}-tnum.ttf`), "--size", String(size), "--bpp", "8", "--range", ranges, "--format", "dump", "--full-info", "-o", dir], { stdio: ["ignore", "ignore", "inherit"] });
    const info = JSON.parse(readFileSync(path.join(dir, "font_info.json"), "utf8")), glyphs = {}, kern = {};
    for (const g of info.glyphs) {
      const { width: w, height: h, x, y } = g.bbox, bytes = Buffer.alloc(w * h);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) bytes[j * w + i] = g.pixels[j][i];
      glyphs[g.code] = [Math.round(g.advanceWidth * 16), x, y, w, h, bytes.toString("base64")];
      const k = Object.entries(g.kerning).map(([c, v]) => [c, Math.round(v * 16)]).filter(([, v]) => v);
      if (k.length) kern[g.code] = Object.fromEntries(k);
    }
    const file = path.join(out, `inter-${weight.toLowerCase()}-${size}.json`);
    writeFileSync(file, JSON.stringify({ font: `Inter-${weight}-tnum.ttf`, size, bpp: 8, ascent: info.ascent, descent: info.descent, glyphs, kern }) + "\n");
    console.log(`${path.relative(process.cwd(), file)}: ${info.glyphs.length} glyphs, ${Object.values(kern).reduce((n, o) => n + Object.keys(o).length, 0)} kerning pairs`);
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
