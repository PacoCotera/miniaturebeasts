// Reproduces the owner's failing scan: print-sheet ring #1 (40 mm, colour,
// office printer) photographed close with a phone, so the ring is about 1000 px
// across in a 1920x1080 frame, with a warm indoor cast, a glare highlight,
// slight defocus and barrel distortion; and the owner's steep-tilt case.
// Reports each variant.
//
//   node tests/phone-large.mjs [--save]
import { readFileSync, writeFileSync } from "node:fs";
import { ringGeometry } from "../src/geometry.mjs";
import { rasterize } from "../src/render.mjs";
import { decode } from "../src/decode.mjs";
import { frameFor } from "../src/frames.mjs";
import { sameGenome, rng } from "../src/codec.mjs";
import { encodePNG } from "../src/png.mjs";
import { blank, cameraH, warp, gaussianBlur, noise, jpeg } from "./distort.mjs";

const manifest = JSON.parse(readFileSync(new URL("./print-manifest.json", import.meta.url)));
const save = process.argv.includes("--save");

// office colour print: a 600-dpi halftone-free render (vector PDF), 40 mm
const entry = manifest.find((e) => e.n === 1);
const frame = frameFor(entry.genome.species, entry.genome.version);
const dots = (entry.mm / 25.4) * 600;
const print = rasterize(ringGeometry(entry.genome), dots, { ss: 2, size: Math.round(dots * 1.6) });

function barrel(img, k) {
  // output pixel d (normalised by the half-diagonal) samples the input at d*(1 + k|d|²)
  const { width: w, height: h, data } = img, out = blank(w, h, [0, 0, 0]);
  const cx = w / 2, cy = h / 2, R = Math.hypot(cx, cy);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const dx = (x - cx) / R, dy = (y - cy) / R, s = 1 + k * (dx * dx + dy * dy);
      const u = Math.round(cx + dx * s * R), v = Math.round(cy + dy * s * R), o = (y * w + x) * 4;
      if (u < 0 || v < 0 || u >= w || v >= h) continue;
      const i = (v * w + u) * 4;
      out.data[o] = data[i]; out.data[o + 1] = data[i + 1]; out.data[o + 2] = data[i + 2];
    }
  return out;
}
function warmCast(img, [r, g, b] = [1.0, 0.82, 0.58]) {
  const d = new Uint8ClampedArray(img.data);
  for (let i = 0; i < d.length; i += 4) { d[i] *= r; d[i + 1] *= g; d[i + 2] *= b; }
  return { ...img, data: d };
}
function glare(img, gx, gy, rad, strength = 0.9) {
  const d = new Uint8ClampedArray(img.data), { width: w, height: h } = img;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const t = strength * Math.exp(-((x - gx) ** 2 + (y - gy) ** 2) / (2 * rad * rad)), o = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) d[o + c] = d[o + c] + (255 - d[o + c]) * t;
    }
  return { ...img, data: d };
}

const W = 1920, H = 1080;
const variants = [
  { id: "clean-1000", diam: 1000 },
  { id: "warm", diam: 1000, warm: true },
  { id: "glare", diam: 1000, glare: true },
  { id: "defocus", diam: 1000, blur: 2.5 },
  { id: "barrel", diam: 1000, barrel: 0.08 },
  { id: "all", diam: 1000, warm: true, glare: true, blur: 2.5, barrel: 0.08 },
  { id: "all-800", diam: 800, warm: true, glare: true, blur: 2, barrel: 0.08 },
  // the owner's 2026-10-07 scan: steep tilt, ring a third of the frame, fuzzy matte inkjet, warm light
  { id: "owner-tilt30", diam: 640, tilt: 30, warm: true, blur: 2, barrel: 0.05 },
  { id: "owner-tilt35", diam: 640, tilt: 35, warm: true, blur: 2, barrel: 0.05 },
];
let fails = 0;
for (const v of variants) {
  let okN = 0;
  const N = 6;
  for (let i = 0; i < N; i++) {
    const rand = rng(1000 + i);
    const H0 = cameraH({ srcC: print.width / 2, srcR: dots / 2, outR: v.diam / 2, cx: W / 2 + (rand() - 0.5) * 120, cy: H / 2 + (rand() - 0.5) * 40, tilt: v.tilt ?? rand() * 12, axis: rand() * 360, rot: rand() * 360, rOverD: 0.25 });
    let img = warp(print, H0, W, H, { ss: 1, bg: [238, 236, 230] });
    if (v.blur) img = gaussianBlur(img, v.blur);
    if (v.warm) img = warmCast(img);
    if (v.glare) img = glare(img, W / 2 - v.diam * 0.25 + rand() * v.diam * 0.5, H / 2 - v.diam * 0.25, v.diam * 0.12);
    if (v.barrel) img = barrel(img, v.barrel);
    img = jpeg(noise(img, 0.015, rand), 85);
    const r = decode(img);
    const good = r.ok && sameGenome(frame, entry.genome, r.rings[0].genome);
    if (r.ok && !good) throw new Error("FALSE ACCEPT");
    okN += good ? 1 : 0;
    if (save && i === 0) writeFileSync(new URL(`../img/phone-large-${v.id}.png`, import.meta.url), encodePNG(img));
    if (!good && i < 2) console.log(`  ${v.id} #${i}: ${r.error} (${r.stage ?? ""})`);
  }
  if (okN < N) fails++;
  console.log(`${v.id.padEnd(18)} ${okN}/${N}`);
}
process.exit(fails ? 1 : 0);
