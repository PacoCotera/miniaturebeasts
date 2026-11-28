// Test conditions: how a ring image is produced and distorted for one genome.
import { HOPPER } from "../src/frames.mjs";
import { randomGenome, rng, sameGenome } from "../src/codec.mjs";
import { ringGeometry } from "../src/geometry.mjs";
import { rasterize } from "../src/render.mjs";
import { decode } from "../src/decode.mjs";
import { cameraH, warp, gaussianBlur, lighting, monochrome, noise, jpeg, dotGain } from "./distort.mjs";

// Screen conditions (the Station ring at D px). blur: "scaled" = 1.5 px at 300 px.
export const SCREEN = [
  { id: "clean", label: "Clean render" },
  { id: "rot", label: "Rotation (any angle)", rot: true },
  { id: "persp", label: "Perspective 15° (+ rotation)", rot: true, tilt: 15 },
  { id: "persp35", label: "Perspective 35°, close (rim radius / distance 0.25)", rot: true, tilt: 35, rOverD: 0.25 },
  { id: "blur", label: "Blur σ 1.5 px at 300 px (scaled)", blur: "scaled" },
  { id: "blurabs", label: "Blur σ 1.5 px at every size", blur: 1.5 },
  { id: "jpeg", label: "JPEG quality 60", jpeg: 60 },
  { id: "light", label: "Uneven lighting (100% → 35%, vignette)", light: true },
  { id: "mono", label: "Monochrome (all colour removed)", mono: true },
  { id: "geo", label: "Rotation + perspective + blur", rot: true, tilt: 15, blur: "scaled" },
  { id: "photo", label: "Rotation + JPEG + lighting + mono", rot: true, jpeg: 60, light: true, mono: true },
  { id: "all", label: "All: rot + persp 15° + blur + light + mono + noise + JPEG 60", rot: true, tilt: 15, blur: "scaled", light: true, mono: true, noise: 0.02, jpeg: 60 },
];

// Beyond the targets, to find what breaks first (run at 200 px).
export const STRESS = [
  ...[2, 2.5, 3, 3.5, 4].map((b) => ({ id: `blur${b}`, label: `Blur σ ${b} px at 200 px`, blur: b })),
  ...[40, 25, 15].map((q) => ({ id: `jpeg${q}`, label: `JPEG quality ${q}`, jpeg: q })),
  ...[25, 45].map((t) => ({ id: `tilt${t}`, label: `Perspective ${t}°`, rot: true, tilt: t })),
  ...[0.05, 0.1].map((n) => ({ id: `noise${n}`, label: `Noise σ ${n * 255 | 0}/255`, noise: n })),
  { id: "dim", label: "Lighting 100% → 15%", light: true, low: 0.15 },
];

export const genomeFor = (i, seed = 1) => randomGenome(HOPPER, rng(seed * 100003 + i));

function finish(expected, img) {
  const t = Date.now();
  const r = decode(img);
  const ms = Date.now() - t;
  const got = r.ok ? r.rings[0].genome : null;
  const good = r.ok && sameGenome(HOPPER, expected, got);
  return { ok: good, falseAccept: r.ok && !good, ms, error: good ? null : r.error, margin: r.ok ? r.rings[0].minMargin : null };
}

function post(img, c, D, rand) {
  if (c.blur) img = gaussianBlur(img, c.blur === "scaled" ? (1.5 * D) / 300 : c.blur);
  if (c.light) img = lighting(img, { low: c.low ?? 0.35, angle: rand() * 360, vignette: 0.25 });
  if (c.mono) img = monochrome(img);
  if (c.noise) img = noise(img, c.noise, rand);
  if (c.jpeg) img = jpeg(img, c.jpeg);
  return img;
}

// Runs every screen condition at diameter D for genome i; returns {condId: result}.
export function runScreen(i, D, seed = 1, conds = SCREEN, { keep = false } = {}) {
  const g = genomeFor(i, seed);
  const geom = ringGeometry(g);
  const W = Math.round(D * 1.5);
  const flat = rasterize(geom, D, { size: W });
  let src = null;
  const out = {};
  conds.forEach((c, ci) => {
    const rand = rng(seed * 7919 + i * 131 + ci * 17 + D);
    let img;
    if (c.rot || c.tilt) {
      if (!src) src = rasterize(geom, 2 * D, { ss: 3, size: Math.round(2 * D * 1.25) });
      const H = cameraH({
        srcC: src.width / 2, srcR: D, outR: D / 2,
        cx: W / 2 + (rand() - 0.5) * 0.1 * D, cy: W / 2 + (rand() - 0.5) * 0.1 * D,
        tilt: c.tilt ?? 0, axis: rand() * 360, rot: rand() * 360, rOverD: c.rOverD ?? 0.15,
      });
      img = warp(src, H, W, W, { ss: 3, bg: [251, 248, 240] });
    } else img = flat;
    const final = post(img, c, D, rand);
    out[c.id] = finish(g, final);
    if (keep) out[c.id].img = final;
  });
  return out;
}

// Caddy print: bilevel at `dpi`, `mm` diameter, thermal dot gain, then a phone
// photo at `pxPerMm` (downscale, small tilt and rotation, blur, light, noise, JPEG).
export const PHOTO = { blur: 0.8, noise: 0.03, jpeg: 75, light: 0.6, tilt: 10 };
export function runPrint(i, { mm, dpi = 203, pxPerMm = 9, seed = 1, photo = PHOTO, keep = false } = {}) {
  const g = genomeFor(i, seed);
  const rand = rng(seed * 4099 + i * 37 + Math.round(mm * 10) + dpi + pxPerMm * 1000);
  const Dd = (mm / 25.4) * dpi;
  let print = rasterize(ringGeometry(g, { mono: true }), Dd, { bilevel: true, ss: 4, size: Math.round(Dd * 1.4) });
  print = dotGain(print, 0.35, 150);
  // thermal paper is not pure: ink about 40, paper about 236
  for (let k = 0; k < print.data.length; k += 4) { const v = print.data[k] ? 236 : 40; print.data[k] = print.data[k + 1] = v; print.data[k + 2] = v - 3; }
  const outR = (mm / 2) * pxPerMm, W = Math.round(outR * 3);
  const H = cameraH({
    srcC: print.width / 2, srcR: Dd / 2, outR, cx: W / 2 + (rand() - 0.5) * 0.2 * outR, cy: W / 2 + (rand() - 0.5) * 0.2 * outR,
    tilt: rand() * photo.tilt, axis: rand() * 360, rot: rand() * 360,
  });
  let img = warp(print, H, W, W, { ss: 3, bg: [236, 236, 233] });
  img = gaussianBlur(img, photo.blur);
  img = lighting(img, { low: photo.light, angle: rand() * 360, vignette: 0.15 });
  img = noise(img, photo.noise, rand);
  img = jpeg(img, photo.jpeg);
  return { ...finish(g, img), dots: Dd, ...(keep ? { print, photo: img } : {}) };
}

