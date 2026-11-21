// Writes the crops of trait-crops.mjs as PNG files (the same window, narrowing and reduction the picture uses) for the art director to sign, and a manifest of each crop's source master and window.
//   node prototypes/station/tools/cut-trait-crops.mjs <out dir>
// Files: trait-end-<trait>-<low|mid|high>-52x52.png, trait-card-<trait>-<look>-<w>x<h>.png (the pictured card, and the small card).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decodePNG, encodePNG } from "../../ui/png.mjs";
import { resample } from "../src/layered-stand.mjs";
import { CROPS, cropPixels, coverWindow } from "../src/trait-crops.mjs";
import { LAYOUT, cardsOf } from "../src/trait-shape-pictures.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), masters = path.resolve(here, "../../ui/assets/masters/pods"), out = process.argv[2];
if (!out) { console.error("usage: cut-trait-crops.mjs <out dir>"); process.exit(2); }
mkdirSync(out, { recursive: true });
const manifest = [], load = (id) => { const buf = readFileSync(path.join(masters, id + ".png")), d = decodePNG(buf); return { src: { w: d.width, h: d.height, rgba: d.data }, sha: createHash("sha256").update(buf).digest("hex") }; };
function cut(file, masterId, window, dw, dh) {
  const { src, sha } = load(masterId), win = coverWindow(window, dw, dh), px = cropPixels(src, win, dw, dh, resample), png = encodePNG(dw, dh, px.rgba);
  writeFileSync(path.join(out, file), png);
  manifest.push({ file, sha256: createHash("sha256").update(png).digest("hex"), master: masterId + ".png", masterSha256: sha, window: win, size: [dw, dh] });
}
const END = ["low", "mid", "high"], big = LAYOUT.scale.pictured.pic;
for (const [sid, k] of Object.entries(CROPS)) {
  for (const [trait, e] of Object.entries(k.ends)) e.masters.forEach((m, i) => cut(`trait-end-${trait}-${END[i]}-${big}x${big}.png`, m, e.window, big, big));
  for (const [trait, c] of Object.entries(k.cards)) {
    const n = Object.keys(c.masters).length, pw = cardsOf(n, "pictured")[0].w - 4, ph = LAYOUT.set.pictured.picH, sc = cardsOf(n, "small")[0];
    for (const [look, m] of Object.entries(c.masters)) { cut(`trait-card-${trait}-${look}-${pw}x${ph}.png`, m, c.window, pw, ph); cut(`trait-card-${trait}-${look}-${sc.w - 4}x${sc.h - 4}.png`, m, c.window, sc.w - 4, sc.h - 4); }
  }
  writeFileSync(path.join(out, "manifest-" + sid + ".json"), JSON.stringify(manifest, null, 1));
}
console.log(manifest.length + " crops in " + out);
