// README illustrations under img/.   node tools/illustrate.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { ringGeometry } from "../src/geometry.mjs";
import { toSVG, rasterize } from "../src/render.mjs";
import { encodePNG } from "../src/png.mjs";
import { runScreen, runPrint, SCREEN } from "../tests/cases.mjs";
import { dotGain } from "../tests/distort.mjs";

const here = (p) => new URL(`../${p}`, import.meta.url);
const read = (p) => JSON.parse(readFileSync(here(p), "utf8"));
const png = (p, img, o) => writeFileSync(here(p), encodePNG(img, o));

// 1x Station size
for (const [name, file] of [["station-300", "examples/hopper.json"], ["station-300-unread", "examples/hopper-two-unread.json"], ["pip-300", "examples/pip.json"]]) {
  const geom = ringGeometry(read(file));
  png(`img/${name}.png`, rasterize(geom, 300));
  writeFileSync(here(`img/${name}.svg`), toSVG(geom, 300));
}

// Caddy prints: one pixel per printer dot, and the 20 mm one enlarged 3x
function upscale(img, k) {
  const W = img.width * k, out = new Uint8ClampedArray(W * img.height * k * 4);
  for (let y = 0; y < img.height * k; y++)
    for (let x = 0; x < W; x++) {
      const s = (((y / k) | 0) * img.width + ((x / k) | 0)) * 4, o = (y * W + x) * 4;
      out[o] = img.data[s]; out[o + 1] = img.data[s + 1]; out[o + 2] = img.data[s + 2]; out[o + 3] = 255;
    }
  return { width: W, height: img.height * k, data: out };
}
const hopper = read("examples/hopper.json");
for (const mm of [20, 30]) {
  const D = (mm / 25.4) * 203;
  const img = dotGain(rasterize(ringGeometry(hopper, { mono: true }), D, { bilevel: true }), 0.35, 150);
  png(`img/caddy-${mm}mm.png`, img, { gray: true, dpi: 203 });
  if (mm === 20) png("img/caddy-20mm-x3.png", upscale(img, 3), { gray: true });
}

// the simulated phone photo of a 20 mm Caddy print (decoder input)
const p = runPrint(0, { mm: 20, pxPerMm: 9, seed: 2, keep: true });
png("img/photo-20mm.png", p.photo);
const p16 = runPrint(0, { mm: 14, pxPerMm: 6, seed: 4, keep: true });
png("img/photo-14mm-6px.png", p16.photo);

// distortion montage at 200 px: perspective, blur, JPEG, lighting, mono, all
const ids = ["persp", "blurabs", "jpeg", "light", "mono", "all"];
const r = runScreen(3, 200, 1, SCREEN.filter((c) => ids.includes(c.id)), { keep: true });
const T = 300, M = { width: T * 3, height: T * 2, data: new Uint8ClampedArray(T * 3 * T * 2 * 4).fill(255) };
ids.forEach((id, k) => {
  const im = r[id].img, ox = (k % 3) * T, oy = ((k / 3) | 0) * T;
  for (let y = 0; y < Math.min(T, im.height); y++)
    for (let x = 0; x < Math.min(T, im.width); x++) {
      const s = (y * im.width + x) * 4, o = ((oy + y) * M.width + ox + x) * 4;
      M.data[o] = im.data[s]; M.data[o + 1] = im.data[s + 1]; M.data[o + 2] = im.data[s + 2]; M.data[o + 3] = 255;
    }
  console.log(`${id}: ${r[id].ok ? "decoded" : "FAILED " + r[id].error}`);
});
png("img/distortions-200.png", M);
console.log("img/ written");
