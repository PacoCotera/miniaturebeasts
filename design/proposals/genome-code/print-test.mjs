// A quick print-and-photo test of the square-cell options, through the
// genome-ring prototype's own Caddy pipeline (203 dpi bilevel print, thermal
// dot gain, phone photo with tilt, blur, uneven light, noise and JPEG 75).
//   - Stamp (b): no stamp decoder exists yet, so the cells are read with the
//     true geometry (an "oracle" for finding the stamp) and the raw cell error
//     rate is counted before any parity. It measures whether cells survive
//     printing and the camera, not whether finding them works.
//   - QR (c): the simulated photos are written to a folder, and qr-check.py
//     decodes them with a real, standard QR reader (zxing-cpp).
//
//   node design/proposals/genome-code/print-test.mjs [--n 30] [--photos DIR]
import { mkdirSync, writeFileSync } from "node:fs";
import * as sp from "./species.mjs";
import * as C from "./codes.mjs";
import { rng } from "../../../prototypes/genome-ring/src/codec.mjs";
import { encodePNG } from "../../../prototypes/genome-ring/src/png.mjs";
import { cameraH, warp, gaussianBlur, lighting, noise, jpeg, dotGain } from "../../../prototypes/genome-ring/tests/distort.mjs";
import { PHOTO } from "../../../prototypes/genome-ring/tests/cases.mjs";

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const N = Number(arg("n", 30)), PHOTOS = arg("photos", null);
if (PHOTOS) mkdirSync(PHOTOS, { recursive: true });

// cells -> bilevel print at dpi (one cell = DOTS/n dots), margin in dots
function printCells(n, mm, draw, margin = 12) {
  const D = (mm / 25.4) * 203, W = Math.round(D) + 2 * margin, ss = 4, k = D / n;
  const data = new Uint8ClampedArray(W * W * 4).fill(255);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    let ink = 0;
    for (let j = 0; j < ss; j++) for (let i = 0; i < ss; i++) {
      const u = (x + (i + 0.5) / ss - margin) / k, v = (y + (j + 0.5) / ss - margin) / k;
      if (u >= 0 && v >= 0 && u < n && v < n && draw(u, v)) ink++;
    }
    const o = (y * W + x) * 4, val = ink * 2 > ss * ss ? 0 : 255;
    data[o] = data[o + 1] = data[o + 2] = val;
  }
  let img = dotGain({ width: W, height: W, data }, 0.35, 150);
  for (let q = 0; q < img.data.length; q += 4) { const v = img.data[q] ? 236 : 40; img.data[q] = img.data[q + 1] = v; img.data[q + 2] = v - 3; }
  return { img, D, margin };
}
function photo({ img, D }, mm, pxPerMm, rand) {
  const outR = (mm / 2) * pxPerMm, W = Math.round(outR * 3.2);
  const H = cameraH({ srcC: img.width / 2, srcR: D / 2, outR, cx: W / 2 + (rand() - 0.5) * 0.2 * outR, cy: W / 2 + (rand() - 0.5) * 0.2 * outR, tilt: rand() * PHOTO.tilt, axis: rand() * 360, rot: rand() * 360 });
  let p = warp(img, H, W, W, { ss: 3, bg: [236, 236, 233] });
  p = gaussianBlur(p, PHOTO.blur);
  p = lighting(p, { low: PHOTO.light, angle: rand() * 360, vignette: 0.15 });
  p = noise(p, PHOTO.noise, rand);
  p = jpeg(p, PHOTO.jpeg);
  return { p, H };
}
const apply = (H, x, y) => { const w = H[6] * x + H[7] * y + H[8]; return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w]; };
function luma(p, x, y) {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, W = p.width;
  const L = (a, b) => { const o = (Math.min(p.height - 1, Math.max(0, b)) * W + Math.min(W - 1, Math.max(0, a))) * 4; return 0.299 * p.data[o] + 0.587 * p.data[o + 1] + 0.114 * p.data[o + 2]; };
  return L(x0, y0) * (1 - fx) * (1 - fy) + L(x0 + 1, y0) * fx * (1 - fy) + L(x0, y0 + 1) * (1 - fx) * fy + L(x0 + 1, y0 + 1) * fx * fy;
}

// Stamp: square (1) or small dot (0) in each decided cell; read corners against centre.
function stampTrial(frame, i, mm, pxPerMm, cellsMode) {
  const g = sp.individual(frame, 500 + i);
  const plan = C.stampSize(frame), n = plan.N;
  const s = C.stamp(frame, g, { mono: true, plan, cells: cellsMode });
  const truth = C.stamp(frame, g, { mono: true, plan, cells: "dot" }); // every decided cell, with its bit
  const rects = s.marks.map((m) => [m.x0 * n, m.y0 * n, m.x1 * n, m.y1 * n]);
  const pr = printCells(n, mm, (u, v) => rects.some(([a, b, c, d]) => u >= a && u < c && v >= b && v < d));
  const { p, H } = photo(pr, mm, pxPerMm, rng(i * 977 + n + pxPerMm * 10 + mm));
  if (PHOTOS && i < 2) writeFileSync(`${PHOTOS}/stamp-${frame.species}-${mm}mm-${pxPerMm}px-${i}.png`, encodePNG(p));
  const k = pr.D / n, at = (u, v) => luma(p, ...apply(H, pr.margin + u * k, pr.margin + v * k));
  // decided cells and their truth: the big squares (f = 0.86) are 1, the dots 0
  const cells = [];
  for (const m of truth.marks) {
    if (m.fill !== "#000000") continue;
    const w = (m.x1 - m.x0) * n;
    if (w > 0.3 && w < 0.5) cells.push({ r: (m.y0 * n + w / 2) | 0, c: (m.x0 * n + w / 2) | 0, bit: 0 });
    else if (w > 0.8 && w < 0.9) cells.push({ r: (m.y0 * n + 0.07) | 0, c: (m.x0 * n + 0.07) | 0, bit: 1 });
  }
  for (const cl of cells) {
    cl.centre = at(cl.c + 0.5, cl.r + 0.5);
    const q = 0.3; // between the dot's edge (0.2) and the square's (0.43)
    cl.corners = [[-q, -q], [q, -q], [-q, q], [q, q]].reduce((a, [dx, dy]) => a + at(cl.c + 0.5 + dx, cl.r + 0.5 + dy), 0) / 4;
  }
  let err = 0;
  if (cellsMode === "binary") {
    const all = cells.map((o) => o.centre).sort((x, y) => x - y);
    for (const cl of cells) {
      // local ink and paper levels; where the neighbourhood is all one colour, the whole stamp's
      let cs = cells.filter((o) => Math.abs(o.r - cl.r) <= 3 && Math.abs(o.c - cl.c) <= 3).map((o) => o.centre).sort((x, y) => x - y);
      if (cs[Math.floor(cs.length * 0.9)] - cs[Math.floor(cs.length * 0.1)] < 40) cs = all;
      const lo = cs[Math.floor(cs.length * 0.1)], hi = cs[Math.floor(cs.length * 0.9)];
      if ((cl.centre < (lo + hi) / 2 ? 1 : 0) !== cl.bit) err++;
    }
    return { cells: cells.length, err, n };
  }
  for (const cl of cells) {
    const near = cells.filter((o) => Math.abs(o.r - cl.r) <= 3 && Math.abs(o.c - cl.c) <= 3);
    // every decided cell has ink at its centre: that is the local ink level
    const cs = near.map((o) => o.centre).sort((x, y) => x - y), lo = cs[cs.length >> 1], hi = Math.max(...near.map((o) => o.corners));
    if ((cl.corners < (lo + hi) / 2 ? 1 : 0) !== cl.bit) err++;
  }
  return { cells: cells.length, err, n };
}

// QR: write the photos; qr-check.py decodes them.
function qrTrial(frame, i, mm, pxPerMm) {
  const g = sp.individual(frame, 500 + i);
  const q = C.qrMatrix(C.qrPayload(frame, g));
  const qz = 4; // quiet zone, modules
  const n = q.size + 2 * qz;
  const pr = printCells(n, (mm * n) / q.size, (u, v) => { const x = Math.floor(u) - qz, y = Math.floor(v) - qz; return x >= 0 && y >= 0 && x < q.size && y < q.size && q.modules[y][x] === 1; }, 4);
  const { p } = photo(pr, (mm * n) / q.size, pxPerMm, rng(i * 977 + q.size + pxPerMm * 10 + mm));
  const name = `qr-${frame.species}-${mm}mm-${pxPerMm}px-${i}.png`;
  if (PHOTOS) writeFileSync(`${PHOTOS}/${name}`, encodePNG(p));
  return { name, hex: Buffer.from(C.qrPayload(frame, g)).toString("hex"), version: q.version };
}

const frames = [sp.HOPPER, sp.GLOWTAIL, sp.FUTURE150];
const conds = [[20, 9], [20, 6], [16, 6], [12, 6]];
const rows = [], manifest = [];
for (const f of frames) for (const [mm, px] of conds) {
  for (const mode of ["binary", "dot"]) {
    let cells = 0, err = 0, bad = 0, n = 0;
    for (let i = 0; i < N; i++) {
      const r = stampTrial(f, i, mm, px, mode);
      cells += r.cells; err += r.err; bad += r.err > 0; n = r.n;
      if (PHOTOS && mode === "binary") manifest.push({ species: f.species, mm, px, ...qrTrial(f, i, mm, px) });
    }
    rows.push({ species: f.name, cells: mode, N: n, mm, px, cellMm: mm / n, cellErrorRate: err / cells, stampsWithAnyError: bad / N });
    console.log(`stamp ${mode} ${f.name} ${n}x${n} at ${mm} mm, ${px} px/mm: cell ${(mm / n).toFixed(2)} mm, raw cell errors ${(100 * err / cells).toFixed(2)}%, stamps with any error ${bad}/${N}`);
  }
}
writeFileSync(new URL("./print-test.json", import.meta.url), JSON.stringify({ N, stamp: rows }, null, 1) + "\n");
if (PHOTOS) writeFileSync(`${PHOTOS}/manifest.json`, JSON.stringify(manifest));
