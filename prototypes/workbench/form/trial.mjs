// The node side of the trial: the stands, the current-rig column, the sheets, the corner sweep, the visibility report and the report.
// (spine, field, mesh, render, genome and species-trial run in a browser too: no node: imports there; this file reads files.)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { decodePNG } from "../framework/png.mjs";
import { buildIndividual, typeSpecimen } from "../framework/species.mjs";
import { fitCamera, VIEWS } from "../framework/raster.mjs";
import { plainRender } from "../framework/plain.mjs";
import { encodeRGBA } from "./pngrgba.mjs";
import { buildScene } from "./mesh.mjs";
import { renderForm, silhouette, SIZES } from "./render.mjs";
import { SPECIES, SECTION3, ORDER } from "./species-trial.mjs";
import { TUNING, getPath, withinAllowance } from "./tuning.mjs";
import { LEVERS, formOf, corner, cornerCount, single, typeCopies } from "./genome.mjs";
import { maskOfAlpha, maskOfCoverage, boxOf, overlaps, overlap, featureChecks, guardsOf, OVERLAP_TARGET } from "./checks.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, "..");
export const OUT = path.join(ROOT, "out", "form");
export const RESULTS = "/home/user/iwq/results/T-20261030-shape/trial";
const FLUFFY = "/home/user/iwq/results/T-20261030-fluffy", ART = "/home/user/mp/art/station-masters/pods/adult";
export const STANDS = { curlop: `${FLUFFY}/stand-E-curlop`, wickle: `${FLUFFY}/stand-A-wickle`, drapet: `${FLUFFY}/stand-B-drapet`, loika: `${ART}/mibi-adult-S01`, rupar: `${ART}/mibi-adult-S08` };
export const SIZE_NAMES = { 304: "304x312", 96: "96x88", 48: "48x48" };
const BG = [246, 243, 236];
// the signed art's own values (measured on mibi-adult-S01-304x312.png, see the report): fractions of the creature's box
export const LOIKA_ART = { headH: [0.34, 0.46], headW: [0.55, 0.75], eyeSep: [0.25, 0.37], eyeD: [0.17, 0.26] };

export const loadPNG = (f) => decodePNG(readFileSync(f));
export function loadStands(key) { const o = {}; for (const s of [304, 96, 48]) o[s] = loadPNG(`${STANDS[key]}-${SIZE_NAMES[s]}.png`); return o; }
export const standRef = (stand304) => { const b = boxOf(maskOfAlpha(stand304)); return { height: b.y1 - b.y0, box: b }; };

// ---- the current rig column --------------------------------------------------------------------------------------
const frameOf = (id) => JSON.parse(readFileSync(path.join(ROOT, "frames", `species-${id}.json`), "utf8"));
function flatten(scene) { // the scene contract's nodes as typed arrays
  const V = [], F = []; let o = 0;
  for (const n of scene.nodes) { for (const p of n.mesh.vertices) V.push(p[0], p[1], p[2]); for (const f of n.mesh.faces) { const v = f.vertices ?? f; for (let q = 1; q + 1 < v.length; q++) F.push(v[0] + o, v[q] + o, v[q + 1] + o); } o += n.mesh.vertices.length; }
  return { vertices: Float32Array.from(V), faces: Uint32Array.from(F) };
}
function silhouetteOfMesh(m, view, cam, W, H, ss = 2) {
  const SW = W * ss, SH = H * ss, V = m.vertices, F = m.faces, bits = new Uint8Array(SW * SH), nv = V.length / 3, sx = new Float32Array(nv), sy = new Float32Array(nv);
  for (let i = 0; i < nv; i++) {
    const x = V[i * 3] * view.right[0] + V[i * 3 + 1] * view.right[1] + V[i * 3 + 2] * view.right[2], y = V[i * 3] * view.up[0] + V[i * 3 + 1] * view.up[1] + V[i * 3 + 2] * view.up[2];
    sx[i] = (W / 2 + (x - cam.center[0]) * cam.scale) * ss; sy[i] = (H / 2 - (y - cam.center[1]) * cam.scale) * ss;
  }
  for (let t = 0; t < F.length; t += 3) {
    const a = F[t], b = F[t + 1], c = F[t + 2], ax = sx[a], ay = sy[a], bx = sx[b], by = sy[b], cx = sx[c], cy = sy[c], area = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay); if (!area) continue;
    const inv = 1 / area;
    for (let y = Math.max(0, Math.floor(Math.min(ay, by, cy))); y <= Math.min(SH - 1, Math.ceil(Math.max(ay, by, cy))); y++) for (let x = Math.max(0, Math.floor(Math.min(ax, bx, cx))); x <= Math.min(SW - 1, Math.ceil(Math.max(ax, bx, cx))); x++) {
      const px = x + 0.5, py = y + 0.5, w1 = ((px - ax) * (cy - ay) - (cx - ax) * (py - ay)) * inv, w2 = ((bx - ax) * (py - ay) - (px - ax) * (by - ay)) * inv;
      if (w1 >= 0 && w2 >= 0 && w1 + w2 <= 1) bits[y * SW + x] = 1;
    }
  }
  const cov = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let s = 0; for (let j = 0; j < ss; j++) for (let i = 0; i < ss; i++) s += bits[(y * ss + j) * SW + x * ss + i]; cov[y * W + x] = s / (ss * ss); }
  return { width: W, height: H, coverage: cov };
}
// the cut rule for a mesh in a view: height = the stand's, feet on the row, the box centred (a 'cam' as the rasterizer reads it)
function cutCamera(m, view, sizeKey, ref) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; const V = m.vertices;
  for (let i = 0; i < V.length; i += 3) {
    const x = V[i] * view.right[0] + V[i + 1] * view.right[1] + V[i + 2] * view.right[2], y = V[i] * view.up[0] + V[i + 1] * view.up[1] + V[i + 2] * view.up[2];
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  const [W, H] = SIZES[sizeKey], s304 = ref.height / (y1 - y0);
  const scale = sizeKey === 304 ? s304 : sizeKey === 96 ? s304 * 0.276 : Math.min(44 / (y1 - y0), 44 / (x1 - x0));
  const feet = sizeKey === 304 ? 305 : sizeKey === 96 ? 85 : 44;
  return { scale, center: [(x0 + x1) / 2, y0 + (feet + 1 - H / 2) / scale], size: [W, H] };
}
// the type specimen of the frame, at the view that overlaps its stand best (mirrored if the stand faces the other way)
export function currentRig(key, standImgs, ref) {
  const id = SPECIES[key].id, frame = frameOf(id), { scene } = buildIndividual(frame, typeSpecimen(frame)), m = flatten(scene);
  const standMask = maskOfAlpha(standImgs[304]); let best = null;
  for (const viewName of ["portrait", "side", "three-quarter"]) {
    const view = VIEWS[viewName], cam = cutCamera(m, view, 304, ref), s = silhouetteOfMesh(m, view, cam, 304, 312);
    for (const mirror of [false, true]) {
      const cov = mirror ? mirrorCov(s) : s.coverage, o = overlaps(standMask, { width: 304, height: 312, bits: Uint8Array.from(cov, (c) => (c >= 0.5 ? 1 : 0)) });
      if (!best || o.o48 > best.o48) best = { view: viewName, mirror, o48: o.o48, o96: o.o96 };
    }
  }
  const images = {};
  for (const sk of [304, 96, 48]) {
    const view = VIEWS[best.view], cam = cutCamera(m, view, sk, ref), camera = { view: best.view, scale: cam.scale, center: cam.center, size: cam.size, fixed: true };
    const img = plainRender(scene, camera, { device: sk === 48 ? "tile" : "station" });
    const sil = silhouetteOfMesh(m, view, cam, ...cam.size);
    const W = cam.size[0], H = cam.size[1], data = new Uint8ClampedArray(W * H * 4);
    for (let i = 0; i < W * H; i++) { data[i * 4] = img.data[i * 4]; data[i * 4 + 1] = img.data[i * 4 + 1]; data[i * 4 + 2] = img.data[i * 4 + 2]; data[i * 4 + 3] = 255; }
    let out = { width: W, height: H, data };
    if (best.mirror) out = mirrorImg(out);
    out.coverage = best.mirror ? mirrorCov(sil) : sil.coverage;
    images[sk] = out;
  }
  return { ...best, images, frameId: id };
}
function mirrorCov(s) { const { width: W, height: H, coverage } = s, o = new Float32Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) o[y * W + x] = coverage[y * W + (W - 1 - x)]; return o; }
function mirrorImg(im) { const { width: W, height: H, data } = im, o = new Uint8ClampedArray(data.length); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) for (let c = 0; c < 4; c++) o[(y * W + x) * 4 + c] = data[(y * W + (W - 1 - x)) * 4 + c]; return { width: W, height: H, data: o }; }

// ---- images ----------------------------------------------------------------------------------------------------
const onBg = (img) => { const o = new Uint8ClampedArray(img.width * img.height * 4); for (let i = 0; i < img.width * img.height; i++) { const a = img.data[i * 4 + 3] / 255; for (let c = 0; c < 3; c++) o[i * 4 + c] = img.data[i * 4 + c] * a + BG[c] * (1 - a); o[i * 4 + 3] = 255; } return { width: img.width, height: img.height, data: o }; };
const zoom = (img, k) => { const W = img.width * k, H = img.height * k, o = new Uint8ClampedArray(W * H * 4); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const s = ((Math.floor(y / k)) * img.width + Math.floor(x / k)) * 4; for (let c = 0; c < 4; c++) o[(y * W + x) * 4 + c] = img.data[s + c]; } return { width: W, height: H, data: o }; };
// the stand's outline (alpha >= 128, 1 px of the 304 grid) in magenta over an image
function withOutline(img, standImg) {
  const o = new Uint8ClampedArray(img.data), W = img.width, H = img.height, m = maskOfAlpha(standImg), at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : m.bits[y * W + x]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (at(x, y) && !(at(x - 1, y) && at(x + 1, y) && at(x, y - 1) && at(x, y + 1))) { const i = (y * W + x) * 4; o[i] = 255; o[i + 1] = 0; o[i + 2] = 255; o[i + 3] = 255; }
  return { width: W, height: H, data: o };
}
// a 3 x 5 pixel font for the panel titles
const FONT = { A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110", E: "111100110100111", F: "111100110100100", G: "011100101101011", H: "101101111101101", I: "111010010010111", J: "001001001101010", K: "101101110101101", L: "100100100100111", M: "101111111101101", N: "110101101101101", O: "010101101101010", P: "110101110100100", Q: "010101101110011", R: "110101110101101", S: "011100010001110", T: "111010010010010", U: "101101101101111", V: "101101101101010", W: "101101111111101", X: "101101010101101", Y: "101101010010010", Z: "111001010100111", 0: "111101101101111", 1: "010110010010111", 2: "110001010100111", 3: "110001010001110", 4: "101101111001001", 5: "111100110001110", 6: "011100111101111", 7: "111001010010010", 8: "111101111101111", 9: "111101111001110", ".": "000000000000010", "/": "001001010100100", ":": "000010000010000", "-": "000000111000000", " ": "000000000000000" };
function drawText(img, x0, y0, text, color = [40, 36, 44], k = 2) {
  let x = x0; for (const ch of text.toUpperCase()) { const g = FONT[ch] ?? FONT[" "]; for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (g[r * 3 + c] === "1") for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) { const X = x + c * k + dx, Y = y0 + r * k + dy; if (X >= 0 && Y >= 0 && X < img.width && Y < img.height) { const i = (Y * img.width + X) * 4; img.data[i] = color[0]; img.data[i + 1] = color[1]; img.data[i + 2] = color[2]; img.data[i + 3] = 255; } } x += 4 * k; }
}
const canvas = (W, H) => { const d = new Uint8ClampedArray(W * H * 4); for (let i = 0; i < W * H; i++) { d[i * 4] = BG[0]; d[i * 4 + 1] = BG[1]; d[i * 4 + 2] = BG[2]; d[i * 4 + 3] = 255; } return { width: W, height: H, data: d }; };
function paste(dst, src, x0, y0) { for (let y = 0; y < src.height; y++) for (let x = 0; x < src.width; x++) { const X = x0 + x, Y = y0 + y; if (X < 0 || Y < 0 || X >= dst.width || Y >= dst.height) continue; const s = (y * src.width + x) * 4, d = (Y * dst.width + X) * 4; for (let c = 0; c < 4; c++) dst.data[d + c] = src.data[s + c]; } }
export function sheet(title, panels, k) {
  const pw = panels[0].img.width * k, ph = panels[0].img.height * k, gap = 12, top = 34, W = panels.length * pw + (panels.length + 1) * gap, H = ph + top + gap + 6, c = canvas(W, H);
  drawText(c, gap, 4, title, [40, 36, 44], 2);
  panels.forEach((p, i) => { const x = gap + i * (pw + gap); drawText(c, x, top - 6, p.label, [90, 84, 100], 1); paste(c, zoom(onBg(p.img), k), x, top + 4); });
  return c;
}

// ---- the corner sweep and the visibility report ------------------------------------------------------------------
export function cornerSweep(key) {
  const n = cornerCount(key), failed = []; let built = 0;
  for (let m = 0; m < n; m++) {
    const f = corner(key, m); const g = guardsOf(f); built++;
    if (!g.ok) failed.push({ corner: m, levers: Object.fromEntries(LEVERS[key].map((l, i) => [l.id, (m >> i) & 1])), problems: g.problems });
  }
  const t = guardsOf(formOf(key, typeCopies(key)));
  return { corners: n, built, failed, type: { ok: t.ok, problems: t.problems } };
}
function imgDiff(a, b) { // pixels whose silhouette differs, or whose colour moved by more than 48 (sum of abs RGB)
  let n = 0, area = 0; const W = a.width;
  for (let i = 0; i < W * a.height; i++) {
    const ca = a.coverage[i] >= 0.5, cb = b.coverage[i] >= 0.5; if (ca) area++;
    if (ca !== cb) n++; else if (ca && Math.abs(a.data[i * 4] - b.data[i * 4]) + Math.abs(a.data[i * 4 + 1] - b.data[i * 4 + 1]) + Math.abs(a.data[i * 4 + 2] - b.data[i * 4 + 2]) > 48) n++;
  }
  return { diff: n, area };
}
export function visibility(key, ref) {
  const rows = [];
  const render = (form, sk) => { const sc = buildScene(form, { extentDiv: 120 }); return renderForm(sc, form.camera, sk, { ref }); };
  for (const l of LEVERS[key]) {
    const r = { id: l.id, doc: l.doc, range: l.range };
    for (const sk of [96, 48]) {
      const a = render(single(key, l.id, 0), sk), b = render(single(key, l.id, 1), sk), d = imgDiff(a, b);
      r[`px${sk}`] = d.diff; r[`pct${sk}`] = +((100 * d.diff) / d.area).toFixed(2);
    }
    r.reads96 = r.pct96 >= 1.5 || r.px96 >= 40; r.reads48 = r.pct48 >= 1.5 || r.px48 >= 40;
    rows.push(r);
  }
  return rows;
}

export const sha = (buf) => createHash("sha256").update(buf).digest("hex").slice(0, 16);
export function tuningReport() {
  return TUNING.map((t) => { const before = getPath(SECTION3[t.species], t.path); return { species: t.species, path: t.path, before, after: t.after, change: before ? +(100 * (t.after / before - 1)).toFixed(1) + " %" : "", ok: withinAllowance(t.path, before, t.after), why: t.why }; });
}
export { buildScene, renderForm, silhouette, featureChecks, guardsOf, maskOfAlpha, maskOfCoverage, boxOf, overlaps, overlap, OVERLAP_TARGET, SPECIES, SECTION3, ORDER, encodeRGBA, mkdirSync, writeFileSync, existsSync, readFileSync };

// ---- more helpers for the sheets and the report ----------------------------------------------------------------------
export const standMaskAt = (stands, s) => maskOfAlpha(stands[s]);
// the stand's outline over a render: the stand is the 304 or its own cut at each size
export function outlined(render, standImg) { return withOutline({ width: render.width, height: render.height, data: render.data }, standImg); }
export function writeContact(images, keys) {
  const rows = keys.map((k) => {
    const { stands, r } = images[k], ks = [[304, 1], [96, 2], [48, 3]];
    const cells = []; for (const [s, z] of ks) { cells.push({ img: stands[s], z }); cells.push({ img: r[s], z }); }
    return cells;
  });
  const cw = (c) => c.img.width * c.z, ch = (c) => c.img.height * c.z, gap = 8;
  const rowW = (cells) => cells.reduce((a, c) => a + cw(c) + gap, gap), W = Math.max(...rows.map(rowW)), rowH = rows.map((cells) => Math.max(...cells.map(ch)) + 18);
  const canv = canvas(W, rowH.reduce((a, b) => a + b, 0) + gap);
  let y = gap;
  rows.forEach((cells, i) => { let x = gap; drawText(canv, gap, y - 2, `${SPECIES[keys[i]].name}  STAND / NEW  304  96  48`, [40, 36, 44], 1); cells.forEach((c) => { paste(canv, zoom(onBg(c.img), c.z), x, y + 8); x += cw(c) + gap; }); y += rowH[i]; });
  writeFileSync(path.join(OUT, "contact-sheet.png"), encodeRGBA(canv));
}
export function makeReport(rec, keys) {
  const lines = [], fails = [];
  const L = (s = "") => lines.push(s);
  L("# Shape model trial: build report"); L();
  L(`Built from \`shape-model.md\` and \`trial-build-brief.md\`; repository build/genome-fluffy at dc851b36 untouched, all new files in prototypes/workbench/form/. Generated ${new Date().toISOString().slice(0, 10)}; the numbers below are measured by \`node prototypes/workbench/form/cli.mjs\`.`); L();
  L("## Overlap at 48 px (new model against the current rig)"); L();
  L("| species | new | current rig | target | 96 px new | rig view |"); L("| --- | --- | --- | --- | --- | --- |");
  for (const k of keys) { const o = rec[k].overlap; L(`| ${rec[k].name} | ${o.new.o48.toFixed(3)} | ${o.rig.o48.toFixed(3)} | ${o.target} | ${o.new.o96.toFixed(3)} | ${o.rig.view}${o.rig.mirror ? " (mirrored)" : ""} |`); }
  L(); L("## Feature checks (each gates)"); L();
  for (const k of keys) {
    L(`### ${rec[k].name} (${rec[k].id})`); L("| check | result | value | threshold |"); L("| --- | --- | --- | --- |");
    for (const c of rec[k].checks) { L(`| ${c.id}: ${c.label} | ${c.pass ? "pass" : "FAIL"} | ${JSON.stringify(c.value)} | ${c.threshold}${c.detail ? "; " + c.detail : ""} |`); if (!c.pass) fails.push(`${rec[k].name} ${c.id}: ${JSON.stringify(c.value)} (needs ${c.threshold})`); }
    L();
  }
  L("## Tuning (each change of a section 3 number, before and after)"); L();
  L("| species | number | before | after | change |"); L("| --- | --- | --- | --- | --- |");
  for (const t of tuningReport().filter((x) => keys.includes(x.species))) L(`| ${t.species} | ${t.path} | ${t.before} | ${t.after} | ${t.change}${t.ok ? "" : " OUTSIDE THE ALLOWANCE"} |`);
  L(); L("## Visibility of the open ranges (2.8): pixels that differ between t = 0 and t = 1, others at the type"); L();
  L("| species | lever | range | 96 px diff | 96 px % | reads at 96 | 48 px diff | 48 px % | reads at 48 |"); L("| --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const k of keys) for (const v of rec[k].visibility ?? []) L(`| ${rec[k].name} | ${v.id} | ${v.range.join(" ... ")} | ${v.px96} | ${v.pct96} | ${v.reads96 ? "yes" : "NO"} | ${v.px48} | ${v.pct48} | ${v.reads48 ? "yes" : "no"} |`);
  L(); L("## Timings (ms)"); L(); L("| species | mesh 1/220 | mesh 1/120 | render 304 | render 96 | render 48 | three sizes | corners | visibility |"); L("| --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const k of keys) { const t = rec[k].timing; L(`| ${rec[k].name} | ${t.mesh304} | ${t.mesh120} | ${t.render304} | ${t.render96} | ${t.render48} | ${t.total} | ${t.corners ?? ""} | ${t.visibility ?? ""} |`); }
  L(); L("## Gates not met"); L(); if (fails.length) fails.forEach((f) => L(`- ${f}`)); else L("- none");
  return { md: lines.join("\n") + "\n", json: { records: rec, tuning: tuningReport().filter((x) => keys.includes(x.species)), gatesNotMet: fails } };
}
