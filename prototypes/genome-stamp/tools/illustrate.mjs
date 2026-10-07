// README illustrations under img/.   node tools/illustrate.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { stampGeometry, toSVG, rasterize } from "../src/stamp.mjs";
import { encodePNG } from "../src/png.mjs";
import { runScreen, printImage, SCREEN } from "../tests/cases.mjs";
import { dotGain } from "../tests/distort.mjs";
import { rng } from "../src/frames.mjs";

const here = (p) => new URL(`../${p}`, import.meta.url);
const read = (p) => JSON.parse(readFileSync(here(p), "utf8"));
const png = (p, img, o) => writeFileSync(here(p), encodePNG(img, o));

function montage(imgs, tile, cols, bg = 255) {
  const rows = Math.ceil(imgs.length / cols), W = tile * cols, H = tile * rows;
  const M = { width: W, height: H, data: new Uint8ClampedArray(W * H * 4).fill(bg) };
  imgs.forEach((im, k) => {
    const ox = (k % cols) * tile + Math.max(0, (tile - im.width) >> 1), oy = ((k / cols) | 0) * tile + Math.max(0, (tile - im.height) >> 1);
    const sx = Math.max(0, (im.width - tile) >> 1), sy = Math.max(0, (im.height - tile) >> 1);
    for (let y = 0; y < Math.min(tile, im.height); y++) for (let x = 0; x < Math.min(tile, im.width); x++) {
      const s = ((y + sy) * im.width + x + sx) * 4, o = ((oy + y) * W + ox + x) * 4;
      M.data[o] = im.data[s]; M.data[o + 1] = im.data[s + 1]; M.data[o + 2] = im.data[s + 2]; M.data[o + 3] = 255;
    }
  });
  return M;
}
function upscale(img, k) {
  const W = img.width * k, out = new Uint8ClampedArray(W * img.height * k * 4);
  for (let y = 0; y < img.height * k; y++) for (let x = 0; x < W; x++) {
    const s = (((y / k) | 0) * img.width + ((x / k) | 0)) * 4, o = (y * W + x) * 4;
    out[o] = img.data[s]; out[o + 1] = img.data[s + 1]; out[o + 2] = img.data[s + 2]; out[o + 3] = 255;
  }
  return { width: W, height: img.height * k, data: out };
}

// 1x Station size
for (const [name, file] of [["station-glowtail", "glowtail"], ["station-glowtail-unread", "glowtail-two-unread"], ["station-hopper", "hopper"], ["station-future150", "future150"], ["station-glowtail-postmark", "glowtail-postmark"]]) {
  const geom = stampGeometry(read(`examples/${file}.json`));
  png(`img/${name}.png`, rasterize(geom, 300));
  writeFileSync(here(`img/${name}.svg`), toSVG(geom, 300));
}
// growth: the same scale of cell, hopper -> glowtail -> postmarked glowtail -> 150 loci (8 px a cell)
png("img/growth.png", montage(["hopper", "glowtail", "glowtail-postmark", "future150"].map((k) => { const geom = stampGeometry(read(`examples/${k}.json`)); return rasterize(geom, geom.N * 8); }), 320, 4));
// a family at 200 px: mother, child, father
png("img/family.png", montage(["mother", "child", "father"].map((k) => rasterize(stampGeometry(read(`examples/glowtail-${k}.json`)), 200)), 232, 3));
// Caddy prints at 203 dpi, one pixel per dot, and enlarged 3x
const caddy = (file, mm) => dotGain(rasterize(stampGeometry(read(`examples/${file}.json`), { mono: true }), (mm / 25.4) * 203, { bilevel: true }), 0.35, 150);
png("img/caddy-glowtail-20mm.png", caddy("glowtail", 20), { gray: true, dpi: 203 });
png("img/caddy-glowtail-20mm-x3.png", upscale(caddy("glowtail", 20), 3), { gray: true });
png("img/caddy-future150-20mm-x3.png", upscale(caddy("future150", 20), 3), { gray: true });
png("img/caddy-glowtail-16mm.png", caddy("glowtail", 16), { gray: true, dpi: 203 });
// a phone photo of the 20 mm Caddy print (decoder input)
png("img/photo-20mm.png", printImage(read("examples/glowtail.json"), 20, { pxPerMm: 9, rand: rng(5) }).photo);
// distortions at 200 px
const ids = ["persp35", "persp45", "glare", "warm", "inkjet", "owner"];
const r = runScreen("glowtail", 3, 200, 1, SCREEN.filter((c) => ids.includes(c.id)), { keep: true });
ids.forEach((id) => console.log(`${id}: ${r[id].ok ? "decoded" : "FAILED " + r[id].error}`));
png("img/distortions-200.png", montage(ids.map((id) => r[id].img), 300, 3));
console.log("img/ written");
