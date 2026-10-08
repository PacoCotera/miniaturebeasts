// Test conditions for the stamp: how an image is made and distorted for one
// individual, and the checks run on its decode.
import { byName, rng } from "../src/frames.mjs";
import { sameGenome } from "../src/codec.mjs";
import { stampGeometry, rasterize, imageSize } from "../src/stamp.mjs";
import { decode } from "../src/decode.mjs";
import { blank, cameraH, warp, gaussianBlur, lighting, monochrome, noise, jpeg, dotGain } from "./distort.mjs";

export const SPECIES = ["S01", "S03", "S03-pm", "future150"];
// ids are the registry's (S01 = Loika, S03 = Tuikis); the legacy ids hopper, puffcap and glowtail still decode. "S03-pm": a Tuikis carrying a 64-bit postmark
export const frameOf = (sp) => byName(sp.replace(/-pm$/, ""));

// Screen conditions at side D px (blur "scaled" = 1.5 px at 300 px)
export const SCREEN = [
  { id: "clean", label: "Clean render" },
  { id: "rot", label: "Rotation (any angle)", rot: true },
  { id: "persp15", label: "Perspective 15°", rot: true, tilt: 15 },
  { id: "persp35", label: "Perspective 35°, close (half-width ÷ distance 0.25)", rot: true, tilt: 35, rOverD: 0.25 },
  { id: "persp45", label: "Perspective 45°, close (0.25)", rot: true, tilt: 45, rOverD: 0.25 },
  { id: "blur", label: "Blur σ 1.5 px at 300 px (scaled)", blur: "scaled" },
  { id: "jpeg", label: "JPEG quality 60", jpeg: 60 },
  { id: "light", label: "Uneven lighting (100% → 35%, vignette)", light: true },
  { id: "mono", label: "Monochrome", mono: true },
  { id: "glare", label: "Glare spot", glare: true },
  { id: "warm", label: "Warm indoor light", warm: true },
  { id: "inkjet", label: "Inkjet fuzz on matte paper", inkjet: true },
  { id: "all", label: "All: rot + persp 15° + blur + light + mono + noise + JPEG 60", rot: true, tilt: 15, blur: "scaled", light: true, mono: true, noise: 0.02, jpeg: 60 },
  { id: "owner", label: "Owner's scan: persp 35° close + warm + inkjet + glare + JPEG 60", rot: true, tilt: 35, rOverD: 0.25, warm: true, inkjet: true, glare: true, jpeg: 60 },
];

export function individual(frame, seed, { read } = {}) {
  const r = rng(seed);
  const copies = {};
  for (const l of frame.heritable) { const p = l.pool ?? l.alleles; copies[l.id] = Array.from({ length: l.copies }, () => p[Math.floor(r() * p.length)]); }
  const open = frame.chapters.filter((c) => !c.sealed).map((c) => c.name);
  // about one in three individuals has some chapters unread
  const rr = rng(seed ^ 0x5bd1e995);
  const readList = read ?? (rr() < 0.35 ? open.filter(() => rr() < 0.6) : open);
  return { species: frame.species, version: frame.version, read: readList, copies };
}
export function genomeFor(sp, i, seed = 1) {
  const g = individual(frameOf(sp), seed * 100003 + i * 7 + sp.length);
  if (sp.endsWith("-pm")) { const r = rng(seed * 31 + i); g.postmark = Array.from({ length: 16 }, () => Math.floor(r() * 16).toString(16)).join(""); }
  return g;
}

export function trio(frame, seed) {
  const open = frame.chapters.filter((c) => !c.sealed).map((c) => c.name);
  const mother = individual(frame, seed, { read: open }), father = individual(frame, seed + 1, { read: open });
  const r = rng(seed + 2), copies = {};
  for (const l of frame.heritable) copies[l.id] = [mother.copies[l.id][r() < 0.5 ? 0 : 1], father.copies[l.id][r() < 0.5 ? 0 : 1]];
  return { mother, father, child: { ...mother, copies } };
}

function warmCast(img, [r, g, b] = [1.0, 0.82, 0.58]) {
  const d = new Uint8ClampedArray(img.data);
  for (let i = 0; i < d.length; i += 4) { d[i] *= r; d[i + 1] *= g; d[i + 2] *= b; }
  return { ...img, data: d };
}
export function glare(img, gx, gy, rad, strength = 0.85) {
  const d = new Uint8ClampedArray(img.data), { width: w, height: h } = img;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const t = strength * Math.exp(-((x - gx) ** 2 + (y - gy) ** 2) / (2 * rad * rad)), o = (y * w + x) * 4;
    for (let c = 0; c < 3; c++) d[o + c] = d[o + c] + (255 - d[o + c]) * t;
  }
  return { ...img, data: d };
}
// inkjet on matte paper: ink spreads (blur of about a tenth of a cell, then a
// slightly dark re-weighting) and the paper has grain
function inkjet(img, cellPx, rand) {
  let b = gaussianBlur(img, Math.max(0.6, cellPx * 0.12));
  const d = new Uint8ClampedArray(b.data), { width: w, height: h } = b;
  const grain = new Float32Array(w * h);
  for (let i = 0; i < grain.length; i++) grain[i] = (rand() - 0.5) * 0.12;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = (y * w + x) * 4, gr = (grain[y * w + x] + grain[y * w + Math.min(w - 1, x + 1)] + grain[Math.min(h - 1, y + 1) * w + x]) / 3;
    for (let c = 0; c < 3; c++) d[o + c] = Math.max(0, Math.min(255, (d[o + c] / 255) ** 1.15 * 255 * (1 + gr)));
  }
  return { ...b, data: d };
}

function finish(sp, expected, img) {
  const frame = frameOf(sp);
  const t = Date.now();
  const r = decode(img);
  const ms = Date.now() - t;
  const got = r.ok ? r.stamps[0].genome : null;
  const good = r.ok && sameGenome(frame, expected, got) && (got.postmark ?? null) === (expected.postmark ?? null);
  return { ok: good, falseAccept: r.ok && !good, ms, error: good ? null : r.error, corrected: r.ok ? r.stamps[0].corrected : null, decoded: got };
}

function post(img, c, D, N, rand) {
  if (c.inkjet) img = inkjet(img, D / N, rand);
  if (c.blur) img = gaussianBlur(img, c.blur === "scaled" ? (1.5 * D) / 300 : c.blur);
  if (c.warm) img = warmCast(img);
  if (c.glare) img = glare(img, img.width * (0.35 + 0.3 * rand()), img.height * (0.35 + 0.3 * rand()), D * 0.12);
  if (c.light) img = lighting(img, { low: c.low ?? 0.35, angle: rand() * 360, vignette: 0.25 });
  if (c.mono) img = monochrome(img);
  if (c.noise) img = noise(img, c.noise, rand);
  if (c.jpeg) img = jpeg(img, c.jpeg);
  return img;
}

export function runScreen(sp, i, D, seed = 1, conds = SCREEN, { keep = false } = {}) {
  const g = genomeFor(sp, i, seed);
  const geom = stampGeometry(g);
  const W = Math.round(D * 1.6);
  const flat = rasterize(geom, D, { size: W });
  let src = null;
  const out = {};
  conds.forEach((c, ci) => {
    if (c.skip) return; // keeps the random stream of the conditions after it
    const rand = rng(seed * 7919 + i * 131 + ci * 17 + D + sp.length);
    let img;
    if (c.rot || c.tilt) {
      src ??= rasterize(geom, 2 * D, { ss: 3, size: Math.round(2 * D * 1.25) });
      const H = cameraH({
        srcC: src.width / 2, srcR: D, outR: D / 2,
        cx: W / 2 + (rand() - 0.5) * 0.1 * D, cy: W / 2 + (rand() - 0.5) * 0.1 * D,
        tilt: c.tilt ?? 0, axis: rand() * 360, rot: rand() * 360, rOverD: c.rOverD ?? 0.15,
      });
      img = warp(src, H, W, W, { ss: 3, bg: [251, 248, 240] });
    } else img = flat;
    const fin = post(img, c, D, geom.N, rand);
    out[c.id] = finish(sp, g, fin);
    if (keep) out[c.id].img = fin;
  });
  return out;
}

// The Caddy print: bilevel at dpi, thermal dot gain, paper tones, then a phone
// photo at pxPerMm (tilt up to 10°, blur, uneven light, noise, JPEG 75).
export const PHOTO = { blur: 0.8, noise: 0.03, jpeg: 75, light: 0.6, tilt: 10 };
export function printImage(g, mm, { dpi = 203, pxPerMm = 9, rand, photo = PHOTO }) {
  const Dd = (mm / 25.4) * dpi;
  const geom = stampGeometry(g, { mono: true });
  let print = rasterize(geom, Dd, { bilevel: true, ss: 4, size: Math.round(Dd * 1.4) });
  print = dotGain(print, 0.35, 150);
  for (let k = 0; k < print.data.length; k += 4) { const v = print.data[k] ? 236 : 40; print.data[k] = print.data[k + 1] = v; print.data[k + 2] = v - 3; }
  const outR = (mm / 2) * pxPerMm, W = Math.round(outR * 3.2);
  const H = cameraH({ srcC: print.width / 2, srcR: Dd / 2, outR, cx: W / 2 + (rand() - 0.5) * 0.2 * outR, cy: W / 2 + (rand() - 0.5) * 0.2 * outR, tilt: rand() * photo.tilt, axis: rand() * 360, rot: rand() * 360 });
  let img = warp(print, H, W, W, { ss: 3, bg: [236, 236, 233] });
  img = gaussianBlur(img, photo.blur);
  img = lighting(img, { low: photo.light, angle: rand() * 360, vignette: 0.15 });
  img = noise(img, photo.noise, rand);
  img = jpeg(img, photo.jpeg);
  return { print, photo: img, N: geom.N, dots: Dd };
}
export function runPrint(sp, i, { mm, dpi = 203, pxPerMm = 9, seed = 1, keep = false } = {}) {
  const g = genomeFor(sp, i, seed);
  const rand = rng(seed * 4099 + i * 37 + Math.round(mm * 10) + dpi + pxPerMm * 1000 + sp.length);
  const p = printImage(g, mm, { dpi, pxPerMm, rand });
  return { ...finish(sp, g, p.photo), N: p.N, ...(keep ? { print: p.print, photo: p.photo } : {}) };
}

// Parent/child: decode the three printed stamps (20 mm, 9 px/mm) and check that
// at every locus the child's copy-1 cells equal one of the mother's two copies'
// cells and its copy-2 cells one of the father's.
export function runTrio(sp, i, { mm = 20, pxPerMm = 9, seed = 7 } = {}) {
  const frame = frameOf(sp);
  const t = trio(frame, seed * 1000 + i);
  const dec = {};
  for (const who of ["mother", "father", "child"]) {
    const rand = rng(seed * 31 + i * 7 + who.length);
    const r = decode(printImage(t[who], mm, { pxPerMm, rand }).photo);
    if (!r.ok) return { ok: false, error: `${who}: ${r.error}` };
    dec[who] = r.stamps[0].genome;
  }
  for (const l of frame.heritable) {
    const m = dec.mother.copies[l.id], f = dec.father.copies[l.id], c = dec.child.copies[l.id];
    if (!m || !f || !c || !m.includes(c[0]) || !f.includes(c[1])) return { ok: false, error: `relatedness broken at ${l.id}` };
  }
  return { ok: true };
}
