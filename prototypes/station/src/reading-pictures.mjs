// The reading screen's pictures (the reading screen spec §2.1, §2.3, §2.4, §3), composed in the logic process once by id and sent to the face as one picture each: the face never blurs,
// blends, tints or scales. Every soft edge was baked by the cut tool (ui/tools/readinstrument5cuts.py: the chamber's two lights, the scan cut to the body, the rim, the part
// masks and their lines, the legs cut hard at stand row 220); here the pieces are put together for one pod:
//   readchamber  the chamber at 30,70 (548 x 356, opaque): its light (overview or close), and on it the specimen at its place (overview 0.94, close 1.16, detail 1.30; the Tuikis 0.98),
//                read parts painted with the grade, the 22 % rim light, the contact shadow and the 10 % floor reflection, unread parts the dark glass volume with the mint scan, the chapter
//                in hand tinted (16 %, the legs 20 %) and outlined in its colour at the overview, tinted only (20 % screen and 20 % colour) at close and detail; the pane fades 22 px to the shelf.
//                One picture of one size for every place, so the 200 ms dither between places and the read's sweep clip run between pictures of one size (§2.1).
//   readrail     the gene-tag rail of the pod, 526 x 71 at 40,443 (clear where there is no tag): the lane caps (95 % read, 60 % unread, 30 % sealed), the tags (two copies of 31 px,
//                shown over carried with a 1 px dark divider, 63 tall at y 450, 3 px apart), an empty tag the template, a read look its colour over a 32 %-darker carried half with its
//                flat pattern, a read doing a lit bar of 1 to 3 segments or footfall dots, a sealed lane a graphite cap with a lock. `size: "small"` is the panel's and Compare's rail (§4), 272 x 40.
//   readdisc     a look's disc (round, its inner shade and a drop shadow; picture = d + 8), veiled at 28 % for a carried size; the template chips at 92 %; the unread disc of a trait
//                (the ghost of its first look and the "?" in the chapter colour).
//   readgather   the stamp moment's gathered picture: the rail's lanes at their blocks' places on the stamp box, at the stamp's size (§2.7).
// Pure: the same request gives the same bytes.
import { assetEntry, asset as assetOf, registerAsset, hasAsset, registerSlot } from "../../ui/assets.mjs";
import { layeredStand, composeStand, resample } from "./layered-stand.mjs";
import { drawnLooks } from "./looks.mjs";
import { coatMaster } from "./stands.mjs";
import { stampGenome, stampSizing } from "./genome.mjs";
import { CH, railLayout } from "./reading-rail.mjs";
export { CH, CH_TOKEN, railLayout, railLanes } from "./reading-rail.mjs";
import { stampGeometry, rasterize } from "../../genome-stamp/src/stamp.mjs";
import { lookColours } from "./specimen.mjs";
import { SIZES, shapePicture, picSizeOf } from "./trait-shape-pictures.mjs";
import { cropSpecOf, cropPixels, coverWindow, ART, CHIP_WINDOW } from "./trait-crops.mjs";
import { nurseryPicture, podPagePicture } from "./nursery-pictures.mjs";

// The crops a trait-shape request places (station-build-2): each signed master's window, reduced once to the picture size (the window is narrowed to the picture's shape, never stretched). A master that is not
// placed gives no picture there (the card or end stays as the code draws it).
export function cropOf(masterId, window, dw, dh) {
  const m = assetEntry(masterId); if (!m || m.status === "empty" || !m.file || m.w !== ART[0] || m.h !== ART[1]) return null;
  const a = assetOf(masterId);
  return cropPixels({ w: a.w, h: a.h, rgba: a.rgba() }, coverWindow(window, dw, dh), dw, dh, resample);
}
function cropPics(r) {
  const spec = r.species ? cropSpecOf(r.species, r.model) : null, sz = spec ? picSizeOf(r.model, r.size) : null; if (!sz) return null;
  if (spec.ends) return { ends: spec.ends.map((id) => cropOf(id, spec.window, sz.w, sz.h)) };
  return { cards: Object.fromEntries(Object.entries(spec.cards).map(([look, id]) => [look, cropOf(id, spec.windows[look] ?? spec.window, sz.w, sz.h)])) };
}

const MINT = [143, 227, 200], AMBER = [240, 180, 90], CREAM = [239, 233, 220];
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
// the places of §2.3: the picture's top left on the screen and its scale; the Tuikis' overview at 0.98
export const PLACES = { overview: { at: [163, 112], s: 0.94 }, close: { at: [142, 112], s: 1.16 }, detail: { at: [114, 84], s: 1.3 } };
export const CHAMBER = { at: [30, 70], size: [548, 356], fade: 22 };

// ---- the layers ----
export const placed = (id) => { const e = assetEntry(id); return !!e && !!e.file && e.status !== "empty"; };
export const pixels = (id) => (placed(id) ? assetOf(id).rgba() : null);
const CACHE = new Map();
function alphaOf(id) { const k = "a:" + id; if (CACHE.has(k)) return CACHE.get(k); const e = assetEntry(id), px = pixels(id); if (!px) return null; const a = new Float32Array(e.w * e.h); for (let i = 0; i < a.length; i++) a[i] = px[i * 4 + 3] / 255; CACHE.set(k, a); return a; }
// The species' cut layers (the cut tool's): the plain body, the scan, the rim, the face frame and the part masks with their lines; null for a species the tool did not cut.
// None is cut now (release 21a retired the S01 and S03 cuts with the earlier paintings): every kind takes the runtime scan of its 304 painting.
const CUT = {};
export const hasCut = (species) => !!CUT[species] && placed(`reading-scan-${species}-${CUT[species].w}x${CUT[species].h}`);
function cutLayers(species) {
  const c = CUT[species]; if (!c || !hasCut(species)) return null; const sz = `${c.w}x${c.h}`, m = {}, l = {};
  for (const p of c.parts) { m[p] = alphaOf(`reading-mask-${species}-${p}-${sz}`); l[p] = alphaOf(`reading-line-${species}-${p}-${sz}`); }
  return { w: c.w, h: c.h, body: alphaOf(`reading-body-${species}-${sz}`), scan: alphaOf(`reading-scan-${species}-${sz}`), rim: alphaOf(`reading-rim-${species}-${sz}`), win: alphaOf(`reading-face-window-${species}-${sz}`), masks: m, lines: l };
}
// The pod's paint: the layered stand composed with its looks (the read chapters show its own, the others the stand's modal look), else the species' painted adult master; null when neither is placed
function paintOf(fr, pod) {
  const sid = fr.species.id, stand = layeredStand(sid, "adult", [304, 312], "default");
  if (stand) { const c = composeStand(stand, drawnLooks(fr, { genome: pod.genome, read: pod.read ?? [] })); return { w: c.w, h: c.h, rgba: c.rgba() }; }
  const id = `mibi-adult-${sid}-304x312`; return placed(id) ? { w: 304, h: 312, rgba: pixels(id) } : null;
}
// A line traced on a mask: the gradient of the mask blurred 0.8 px, x 3.2 (the cut tool's rule), for a mask made here (the face with its own crest)
function lineOf(m, w, h) {
  const b = blur(m, w, h, 0.8), out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x, gx = (b[i + (x < w - 1 ? 1 : 0)] - b[i - (x > 0 ? 1 : 0)]) / (x > 0 && x < w - 1 ? 2 : 1), gy = (b[i + (y < h - 1 ? w : 0)] - b[i - (y > 0 ? w : 0)]) / (y > 0 && y < h - 1 ? 2 : 1); out[i] = clamp01(Math.hypot(gx, gy) * 3.2); }
  return out;
}
function blur(a, w, h, r) {   // a gaussian blur of an alpha plane (separable, radius r)
  const k = Math.max(1, Math.ceil(r * 3)), wt = []; let s = 0; for (let i = -k; i <= k; i++) { const v = Math.exp(-(i * i) / (2 * r * r)); wt.push(v); s += v; } for (let i = 0; i < wt.length; i++) wt[i] /= s;
  const t = new Float32Array(w * h), o = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = 0; for (let i = -k; i <= k; i++) { const xx = Math.min(w - 1, Math.max(0, x + i)); v += a[y * w + xx] * wt[i + k]; } t[y * w + x] = v; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = 0; for (let i = -k; i <= k; i++) { const yy = Math.min(h - 1, Math.max(0, y + i)); v += t[yy * w + x] * wt[i + k]; } o[y * w + x] = v; }
  return o;
}
// A plane of the source size resampled to the place's size (the logic process's one resampler, alpha in a grey picture)
function scalePlane(a, sw, sh, tw, th) {
  if (!a) return null; if (sw === tw && sh === th) return a; const src = new Uint8ClampedArray(sw * sh * 4); for (let i = 0; i < a.length; i++) { src[i * 4] = src[i * 4 + 1] = src[i * 4 + 2] = 255; src[i * 4 + 3] = Math.round(a[i] * 255); }
  const r = resample(src, sw, sh, tw, th), out = new Float32Array(tw * th); for (let i = 0; i < out.length; i++) out[i] = r[i * 4 + 3] / 255; return out;
}
// The runtime scan of a species the cut tool has not cut (its painted adult's alpha): the edge light inside the silhouette, a low fill and the display's scanlines
function scanOfBody(body, w, h) { const b = blur(body, w, h, 2.2), out = new Float32Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; out[i] = clamp01((body[i] * 0.1 + clamp01(body[i] - b[i]) * 2.6) * (y % 3 ? 0.6 : 1)); } return out; }
function rimOfBody(body, w, h) { const b = blur(body, w, h, 3.5), out = new Float32Array(w * h); for (let i = 0; i < out.length; i++) out[i] = clamp01((body[i] - b[i]) * 2 * body[i]); return out; }

// ---- compositing in straight-alpha float RGBA (W3C compositing and blending) ----
const lum = (c) => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
function setLum(c, l) { const d = l - lum(c); let r = [c[0] + d, c[1] + d, c[2] + d]; const L = lum(r), n = Math.min(...r), x = Math.max(...r); if (n < 0) r = r.map((v) => L + ((v - L) * L) / (L - n)); if (x > 1) r = r.map((v) => L + ((v - L) * (1 - L)) / (x - L)); return r; }
const softLight = (b, s) => (s <= 0.5 ? b - (1 - 2 * s) * b * (1 - b) : b + (2 * s - 1) * ((b <= 0.25 ? ((16 * b - 12) * b + 4) * b : Math.sqrt(b)) - b));
const MODES = { normal: (b, s) => s, screen: (b, s) => 1 - (1 - b) * (1 - s), softLight };
export class Pane {
  constructor(w, h) { this.w = w; this.h = h; this.c = new Float32Array(w * h * 3); this.a = new Float32Array(w * h); }
  // a source colour (rgb 0..1) at alpha `as` over pixel i, in `mode`
  put(i, s, as, mode = "normal") {
    if (as <= 0) return; const ab = this.a[i], o = i * 3;
    let cs = s;
    if (mode === "color") { const cb = [this.c[o], this.c[o + 1], this.c[o + 2]]; const mix = setLum(s, lum(cb)); cs = [0, 1, 2].map((k) => (1 - ab) * s[k] + ab * mix[k]); }
    else if (mode !== "normal") { const f = MODES[mode]; cs = [0, 1, 2].map((k) => (1 - ab) * s[k] + ab * f(this.c[o + k], s[k])); }
    const ao = as + ab * (1 - as); for (let k = 0; k < 3; k++) this.c[o + k] = ao > 0 ? (as * cs[k] + ab * this.c[o + k] * (1 - as)) / ao : 0; this.a[i] = ao;
  }
  // another pane over this one at (x, y), its alpha times `k` (a group's mask or opacity)
  over(p, x, y, k = null) { for (let yy = 0; yy < p.h; yy++) for (let xx = 0; xx < p.w; xx++) { const X = x + xx, Y = y + yy; if (X < 0 || Y < 0 || X >= this.w || Y >= this.h) continue; const j = yy * p.w + xx, al = p.a[j] * (k ? k(xx, yy, X, Y) : 1); if (al > 0) this.put(Y * this.w + X, [p.c[j * 3], p.c[j * 3 + 1], p.c[j * 3 + 2]], al); } }
  rgba() { const out = new Uint8ClampedArray(this.w * this.h * 4); for (let i = 0; i < this.w * this.h; i++) { for (let k = 0; k < 3; k++) out[i * 4 + k] = Math.round(this.c[i * 3 + k] * 255); out[i * 4 + 3] = Math.round(this.a[i] * 255); } return out; }
}
const paneOf = (rgba, w, h) => { const p = new Pane(w, h); for (let i = 0; i < w * h; i++) { for (let k = 0; k < 3; k++) p.c[i * 3 + k] = rgba[i * 4 + k] / 255; p.a[i] = rgba[i * 4 + 3] / 255; } return p; };
const grad = (stops, t) => { if (t <= stops[0][0]) return stops[0][1]; for (let i = 1; i < stops.length; i++) if (t <= stops[i][0]) { const [t0, c0] = stops[i - 1], [t1, c1] = stops[i], f = (t - t0) / (t1 - t0); return c0.map((v, k) => v + (c1[k] - v) * f); } return stops.at(-1)[1]; };

// ---- the chamber with the specimen ----
// r: { species, pod, place, read: [chapter ids], hand: chapter id | "", outline: bool, part: the hand's part ("coat", "face", "head", "legs", "shape" or ""), tints: [[part, chapter]] } ; env: { frameOf, podById }
export function chamberPicture(r, env) {
  const [W, H] = CHAMBER.size, light = r.place === "overview" ? "overview" : "close", bgId = `reading-chamber-${light}-548x356`, bg = pixels(bgId);
  const out = bg ? paneOf(bg, W, H) : new Pane(W, H); if (!bg) for (let i = 0; i < W * H; i++) { out.c.set([6 / 255, 24 / 255, 30 / 255], i * 3); out.a[i] = 1; }
  const fr = env.frameOf(r.species), pod = env.podById(r.pod); if (!fr || !pod) return out.rgba();
  const cut = cutLayers(r.species), paint = paintOf(fr, pod);
  const sw = cut ? cut.w : 304, sh = cut ? cut.h : 312, P = PLACES[r.place] ?? PLACES.overview, s = P.s, tw = Math.round(sw * s), th = Math.round(sh * s);
  const ox = P.at[0] - CHAMBER.at[0], oy = P.at[1] - CHAMBER.at[1];
  // the planes at the source size: the body, the paint's alpha, the scan, the rim and the part masks; then what is painted (the read look chapters' parts) and what is still unread
  const N = sw * sh, read = new Set(r.read ?? []);
  const paintA = paint ? (() => { const a = new Float32Array(N); for (let i = 0; i < N; i++) a[i] = paint.rgba[i * 4 + 3] / 255; return a; })() : null;
  const body = cut ? cut.body : paintA ? paintA.map((v) => (v > 0.6 ? v : 0)) : null;   // a painted adult's own soft contact shadow is not its body
  if (!body) return out.rgba();
  const scan = cut ? cut.scan : scanOfBody(body, sw, sh), rim = cut ? cut.rim : rimOfBody(body, sw, sh);
  const masks = cut ? { ...cut.masks } : {}, lines = cut ? { ...cut.lines } : {};
  if (cut && masks.coat) { const c = new Float32Array(N); for (let i = 0; i < N; i++) c[i] = body[i] > 0 ? masks.coat[i] : 0; masks.coat = c; lines.coat = lineOf(c, sw, sh); }   // the coat inside the plain body: no light outside it (the crest's tips are the head's)
  const faceOf = (i) => (cut.win[i] > 0 || body[i] <= 0 ? Math.max(cut.win[i], body[i] <= 0 ? 1 : 0) : 0);   // the face frame, and every painted pixel outside the plain body (the crest's tips): the head's
  if (cut && cut.win && paintA) { const f = new Float32Array(N); for (let i = 0; i < N; i++) f[i] = paintA[i] * faceOf(i); masks.face = f; lines.face = lineOf(f, sw, sh); }   // the face with this pod's own crest
  // Coat paints the body outside the face frame and Face the head inside it; a species with no part masks is painted whole once its Coat is read
  let painted = null;
  if (paint && cut && cut.win) { painted = new Float32Array(N); const c = read.has("coat"), f = read.has("face"); for (let i = 0; i < N; i++) { const fw = faceOf(i); painted[i] = (c ? paintA[i] * (1 - fw) * (body[i] > 0 ? 1 : 0) : 0) + (f ? paintA[i] * fw : 0); } }
  else if (paint && !cut && read.has("coat")) painted = paintA;
  const any = !!painted && painted.some((v) => v > 0.01);
  const unreadWin = new Float32Array(N); for (let i = 0; i < N; i++) unreadWin[i] = painted ? clamp01(1 - painted[i] / Math.max(body[i], 1e-3)) : 1;
  // scale every plane to the place
  const S = (a) => scalePlane(a, sw, sh, tw, th);
  const bodyS = S(body), scanS = S(scan), rimS = S(rim), paintedS = painted ? S(painted) : null, unreadS = S(unreadWin), handM = r.part && masks[r.part] ? S(masks[r.part]) : null, handL = r.part && lines[r.part] ? S(lines[r.part]) : null;
  const paintS = paint ? resample(paint.rgba, paint.w, paint.h, tw, th) : null;
  const pane = new Pane(W, H), at = (x, y) => (y + oy) * W + (x + ox), inPane = (x, y) => x + ox >= 0 && y + oy >= 0 && x + ox < W && y + oy < H;
  // 1. the contact shadow: an ellipse under the feet
  { const [ex, ey, ew, eh, a0] = [20, sh - 34, sw - 30, 40, 0.75];
    for (let y = Math.floor(ey * s); y < Math.ceil((ey + eh) * s); y++) for (let x = Math.floor(ex * s); x < Math.ceil((ex + ew) * s); x++) { if (!inPane(x, y)) continue;
      const u = ((x + 0.5) / s - (ex + ew / 2)) / (ew / 2), v = ((y + 0.5) / s - (ey + eh / 2)) / (eh / 2), d = Math.hypot(u, v); if (d > 1) continue; pane.put(at(x, y), [2 / 255, 8 / 255, 10 / 255], a0 * clamp01(1 - d / Math.SQRT2 / 0.7)); } }
  // 2. the floor reflection: the painted parts flipped under the feet at 10 %, fading over 30 % of the height
  if (any && paintS) for (let ry = 0; ry < th; ry++) { const y = Math.round((2 * sh - 26) * s) - ry - 1, m = clamp01((ry / th - 0.7) / 0.3); if (m <= 0) continue;
    for (let x = 0; x < tw; x++) { if (!inPane(x, y)) continue; const j = ry * tw + x, al = (paintS[j * 4 + 3] / 255) * 0.1 * m * clamp01(paintedS[j] * 3); if (al > 0) pane.put(at(x, y), [paintS[j * 4] / 255, paintS[j * 4 + 1] / 255, paintS[j * 4 + 2] / 255], al); } }
  // 3. the painted parts: the paint, the grade (soft light, top teal to bottom amber) and the rim light (22 %, mint to amber), as one group masked by what is painted
  if (any && paintS) { const g = new Pane(tw, th);
    for (let y = 0; y < th; y++) { const t = y / th, gc = grad([[0, [60, 140, 150, 0.32]], [0.55, [40, 90, 100, 0.12]], [1, [240, 160, 80, 0.2]]], t), rc = grad([[0, [...MINT]], [0.5, [191, 238, 224]], [1, [...AMBER]]], t);
      for (let x = 0; x < tw; x++) { const j = y * tw + x, pa = paintS[j * 4 + 3] / 255; if (pa <= 0) continue;
        g.put(j, [paintS[j * 4] / 255, paintS[j * 4 + 1] / 255, paintS[j * 4 + 2] / 255], pa);
        g.put(j, [gc[0] / 255, gc[1] / 255, gc[2] / 255], gc[3] * pa, "softLight");
        g.put(j, [rc[0] / 255, rc[1] / 255, rc[2] / 255], 0.22 * rimS[j], "screen"); } }
    pane.over(g, ox, oy, (xx, yy) => clamp01(paintedS[yy * tw + xx] / Math.max(1e-6, g.a[yy * tw + xx]))); }
  // 4. the unread parts: the dark glass volume, then the mint scan through them
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) { if (!inPane(x, y)) continue; const j = y * tw + x, u = unreadS[j] * bodyS[j]; if (u <= 0) continue;
    const d = Math.hypot((x / tw - 0.45) / (0.55 * Math.SQRT2), (y / th - 0.35) / (0.65 * Math.SQRT2)), c = grad([[0, [20, 62, 66, 0.92]], [0.7, [6, 24, 28, 0.94]]], d); pane.put(at(x, y), [c[0] / 255, c[1] / 255, c[2] / 255], c[3] * u); }
  for (let y = 0; y < th; y++) { const c = grad([[0, [184, 240, 224]], [0.5, [...MINT]], [1, [92, 201, 176]]], y / th);
    for (let x = 0; x < tw; x++) { if (!inPane(x, y)) continue; const j = y * tw + x, a = scanS[j] * unreadS[j] * 0.78; if (a > 0) pane.put(at(x, y), [c[0] / 255, c[1] / 255, c[2] / 255], a); } }
  // 5. a species with no paint shows its read parts as their chapter's tint on the scan (the Tuikis: 22 % screen)
  for (const [part, ch] of r.tints ?? []) { const m = masks[part] ? S(masks[part]) : null; if (!m) continue; const c = hex(CH[ch] ?? "#cccccc").map((v) => v / 255);
    for (let j = 0; j < tw * th; j++) { const x = j % tw, y = (j / tw) | 0; if (inPane(x, y) && m[j] > 0) pane.put(at(x, y), c, 0.22 * m[j], "screen"); } }
  // 6. the chapter in hand: its part tinted, and at the overview outlined (a 1.5 px line at 95 %)
  if (handM) { const c = hex(CH[r.hand] ?? "#cccccc").map((v) => v / 255), k = r.outline ? (r.part === "legs" ? 0.2 : 0.16) : 0.2;
    for (let j = 0; j < tw * th; j++) { const x = j % tw, y = (j / tw) | 0; if (!inPane(x, y) || handM[j] <= 0) continue; pane.put(at(x, y), c, k * handM[j], "screen"); if (!r.outline) pane.put(at(x, y), c, 0.2 * handM[j], "color"); }
    if (r.outline && handL) for (let j = 0; j < tw * th; j++) { const x = j % tw, y = (j / tw) | 0; if (inPane(x, y) && handL[j] > 0) pane.put(at(x, y), c, 0.95 * handL[j]); } }
  // the pane over the chamber's light, fading 22 px to the shelf
  out.over(pane, 0, 0, (xx, yy) => clamp01((H - 0.5 - yy) / CHAMBER.fade));
  // 7. her page: the places on her body, interface marks drawn by code (a ring and a dot; the one in hand larger, in its chapter's colour), at a fraction of the body's box
  for (const [fx, fy, chapter, inHand] of r.marks ?? []) { const cx = Math.round(ox + fx * tw), cy = Math.round(oy + fy * th), col = hex(CH[chapter] ?? "#cccccc").map((v) => v / 255), R = inHand ? 13 : 8;
    for (let y = -R - 2; y <= R + 2; y++) for (let x = -R - 2; x <= R + 2; x++) { const d = Math.hypot(x, y), X = cx + x, Y = cy + y; if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
      const a = clamp01(1.2 - Math.abs(d - R)) * (inHand ? 0.95 : 0.6) + (d <= (inHand ? 3.5 : 2.5) ? 0.9 : 0); if (a > 0) out.put(Y * W + X, col, clamp01(a)); } }
  return out.rgba();
}

// ---- the rail (§2.4) ----
// The rail picture: 526 x 71 at 40,443 (clear where there is no tag)
export function railPicture(r) {
  const small = !!r.small, W = small ? 272 : 526, H = small ? 40 : 71, lay = railLayout(r.lanes.map((l) => l.traits.length), small), pane = new Pane(W, H);
  const colour = (ln, t, band) => (t.colour ? t.colour[band] : lookColours({ id: t.trait, chapterId: ln.id, sid: r.species }, t.look[band], t.idx[band])[0] ?? "#cccccc");
  const ox = small ? 0 : -40, capY = small ? 15 : 0, tagY = small ? 20 : 7, bh = small ? 9 : 31, th = 2 * bh + 1, rad = small ? 2 : 4;
  r.lanes.forEach((ln, li) => {
    const g = lay.lanes[li]; if (!g) return; const col = hex(CH[ln.id] ?? "#cccccc").map((v) => v / 255), x = g.x + ox;
    for (let yy = 0; yy < (small ? 2 : 3); yy++) for (let xx = 0; xx < g.w; xx++) pane.put((capY + yy) * W + x + xx, col, (ln.state === "read" ? 0.95 : ln.state === "sealed" ? 0.3 : 0.6) * capRound(xx, yy, g.w, small ? 2 : 3));   // the lane cap
    if (ln.state === "sealed") {   // a graphite cap with its lock
      const hh = small ? th + 1 : th + 2;   // the small box stops at row 38 (row 39 stays clear)
      for (let yy = -1; yy < hh - 1; yy++) for (let xx = 0; xx < g.w; xx++) { const m = rrect(xx, yy + 1, g.w, hh, rad); if (m <= 0) continue; const t = (yy + 1) / hh, c = [59 + (43 - 59) * t, 58 + (42 - 58) * t, 61 + (45 - 61) * t].map((v) => v / 255);
        const edge = rrect(xx, yy + 1, g.w, hh, rad) - rrect(xx - 1, yy, g.w - 2, th, Math.max(0, rad - 1)); pane.put((tagY + yy) * W + x + xx, c, m); if (edge > 0) pane.put((tagY + yy) * W + x + xx, col, 0.45 * clamp01(edge)); }
      lockAt(pane, W, x + g.w / 2, tagY + bh + 2, small); return;
    }
    if (ln.place && !small) for (let yy = -2; yy <= 2; yy++) for (let xx = -2; xx <= 2; xx++) { const d = Math.hypot(xx, yy); if (d <= 2.3) pane.put((4 + yy) * W + Math.round(x + g.w / 2) + xx, col, clamp01(2.8 - d) * 0.95); }   // her page: this chapter has a place on her body: a dot under its cap (interface, drawn by code)
    ln.traits.forEach((t, k) => { const tx = x + k * (lay.B + lay.gap), tw = lay.B; drawTag(pane, W, tx, tagY, tw, bh, rad, col, ln.state === "read", t.nature === "look" && ln.state === "read" ? { ...t, colour: [colour(ln, t, 0), colour(ln, t, 1)] } : t, small); });
  });
  return pane.rgba();
}
const capRound = (x, y, w, h) => (x === 0 || x === w - 1 ? (y === 0 || y === h - 1 ? 0.4 : 0.85) : 1);
function rrect(x, y, w, h, r) {   // the coverage of pixel (x, y) by a w x h rounded box at (0, 0)
  if (x < 0 || y < 0 || x >= w || y >= h) return 0; const cx = x < r ? r : x > w - 1 - r ? w - 1 - r : x, cy = y < r ? r : y > h - 1 - r ? h - 1 - r : y; if (cx === x || cy === y) return 1;
  const d = Math.hypot(x - cx, y - cy); return clamp01(r + 0.5 - d);
}
function drawTag(pane, W, tx, ty, tw, bh, rad, col, read, t, small) {
  const th = 2 * bh + 1, put = (x, y, c, a, mode) => { if (x >= 0 && y >= 0 && x < W && y < pane.h) pane.put(y * W + x, c, a, mode); }, inT = (x, y) => rrect(x, y, tw, th, rad);
  if (read && t.nature === "look") {
    if (!small) for (let yy = -1; yy <= th; yy++) for (let xx = -1; xx <= tw; xx++) { const m = inT(xx, yy); if (m < 1) { const o = Math.max(rrect(xx + 1, yy + 1, tw + 2, th + 2, rad + 1) - m, 0); if (o > 0) put(tx + xx, ty + yy, col, 0.55 * o); } }   // its 1 px edge in the chapter colour
    for (let band = 0; band < 2; band++) { const c = hex(t.colour[band]).map((v) => v / 255), y0 = band ? bh + 1 : 0, pat = t.pattern[band];
      for (let yy = 0; yy < bh; yy++) for (let xx = 0; xx < tw; xx++) { const m = inT(xx, y0 + yy); if (m <= 0) continue; put(tx + xx, ty + y0 + yy, c, m);
        if (pat && patternAt(pat, xx, yy)) put(tx + xx, ty + y0 + yy, pat === "spots" ? [20 / 255, 26 / 255, 34 / 255] : band ? [40 / 255, 34 / 255, 36 / 255] : [236 / 255, 222 / 255, 196 / 255], (pat === "spots" ? 0.85 : 0.9) * m);
        if (band) put(tx + xx, ty + y0 + yy, [6 / 255, 16 / 255, 18 / 255], 0.32 * m); } }   // the carried half 32 % darker
    for (let xx = 0; xx < tw; xx++) { put(tx + xx, ty + bh, [6 / 255, 16 / 255, 18 / 255], 0.85 * inT(xx, bh)); if (!small) for (let yy = 0; yy < 3; yy++) put(tx + xx, ty + yy, [1, 1, 1], 0.16 * (1 - yy / 3) * inT(xx, yy)); }
    return;
  }
  if (read) {   // a doing: a lit bar of 1 to 3 segments, or footfall dots, on the dark tag
    for (let yy = 0; yy < th; yy++) for (let xx = 0; xx < tw; xx++) { const m = inT(xx, yy); if (m > 0) put(tx + xx, ty + yy, [(12 + (8 - 12) * yy / th) / 255, (34 + (24 - 34) * yy / th) / 255, (38 + (27 - 38) * yy / th) / 255], m); }
    for (let band = 0; band < 2; band++) { const y0 = ty + (band ? bh + 1 : 0), a = band ? 0.6 : 1;
      if (t.nature === "gait") { const pos = { steady: [0.12, 0.32, 0.52, 0.72, 0.92], between: [0.12, 0.24, 0.5, 0.62, 0.88], bursts: [0.1, 0.19, 0.28, 0.66, 0.75, 0.84] }[t.gait[band]] ?? [0.2, 0.5, 0.8];
        pos.forEach((f, i) => dot(pane, W, tx + tw / 2 + (i % 2 ? 1 : -1) * tw * 0.12, y0 + f * bh, small ? 0.9 : 1.9, col, a)); }
      else for (let i = 0; i < 3; i++) { const on = i < t.lv[band], sh = (bh - 8 - 4) / 3, y = Math.round(bh - 4 - (i + 1) * sh - i * 2), x0 = Math.round(tw * 0.25), x1 = Math.round(tw * 0.75);
        for (let yy = 0; yy < Math.max(1, Math.round(sh)); yy++) for (let xx = x0; xx < x1; xx++) { const edge = xx === x0 || xx === x1 - 1 || yy === 0 || yy === Math.round(sh) - 1; if (on) put(tx + xx, y0 + y + yy, col, a); else if (edge) put(tx + xx, y0 + y + yy, col, a * 0.55); } } }
    for (let xx = 0; xx < tw; xx++) put(tx + xx, ty + bh, col, 0.25);
    return;
  }
  // the template: an empty tag says what kind of thing is here
  for (let yy = 0; yy < th; yy++) for (let xx = 0; xx < tw; xx++) { const m = inT(xx, yy); if (m <= 0) continue; const edge = m - rrect(xx - 1, yy - 1, tw - 2, th - 2, Math.max(0, rad - 1)); put(tx + xx, ty + yy, col, 0.045 * m); if (edge > 0.05) put(tx + xx, ty + yy, col, 0.5 * clamp01(edge)); }
  for (let xx = 3; xx < tw - 5; xx++) put(tx + xx, ty + bh, col, 0.26);
  if (small) return;
  if (t.nature === "look") { const nl = t.looks || 3; for (let i = 0; i < nl; i++) ring(pane, W, tx + tw / 2, ty + bh / 2 - ((nl - 1) * 6) / 2 + i * 6, 2.5, col, 0.45); }
  else if (t.nature === "bar") for (let i = 0; i < 3; i++) { const sh = (bh - 8 - 4) / 3, y = Math.round(bh - 4 - (i + 1) * sh - i * 2), x0 = Math.round(tw * 0.25), x1 = Math.round(tw * 0.75);
    for (let yy = 0; yy < Math.round(sh); yy++) for (let xx = x0; xx < x1; xx++) if (xx === x0 || xx === x1 - 1 || yy === 0 || yy === Math.round(sh) - 1) put(tx + xx, ty + y + yy, col, 0.7 * 0.55); }
  else for (let yy = 4; yy < bh - 4; yy++) if ((yy - 4) % 5 < 2) put(tx + Math.round(tw / 2 - 1), ty + yy, col, 0.4);
}
function patternAt(p, x, y) { if (p === "stripes") return ((x * Math.cos(-0.44) + y * Math.sin(1.13)) % 8 + 8) % 8 < 3; if (p === "spots") return Math.hypot((x % 6) - 3, (y % 6) - 3) < 1.8; if (p === "patches") { const u = x % 24, v = y % 16; return Math.hypot((u - 7.2) / 6, (v - 5.6) / 4.5) < 1 || Math.hypot((u - 16.8) / 4.5, (v - 12) / 3.5) < 1; } return false; }
function dot(pane, W, cx, cy, r, col, a) { for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++) for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) { const m = clamp01(r + 0.5 - Math.hypot(x + 0.5 - cx, y + 0.5 - cy)); if (m > 0 && x >= 0 && y >= 0 && x < W && y < pane.h) pane.put(y * W + x, col, a * m); } }
function ring(pane, W, cx, cy, r, col, a) { for (let y = Math.floor(cy - r - 2); y <= Math.ceil(cy + r + 2); y++) for (let x = Math.floor(cx - r - 2); x <= Math.ceil(cx + r + 2); x++) { const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy), m = clamp01(1 - Math.abs(d - r)); if (m > 0 && x >= 0 && y >= 0 && x < W && y < pane.h) pane.put(y * W + x, col, a * m); } }
function lockAt(pane, W, cx, cy, small) {   // the lock on a sealed cap (14 x 16, cream at 60 %), the panel's at half
  const k = small ? 0.5 : 1, put = (x, y, a) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < W && y < pane.h) pane.put(y * W + x, CREAM.map((v) => v / 255), 0.6 * a); };
  for (let y = 0; y < 8 * k; y++) for (let x = 0; x < 10 * k; x++) put(cx - 5 * k + x, cy - 2 * k + y, 1);
  for (let a = 0; a <= 20; a++) { const t = Math.PI + (a / 20) * Math.PI; put(cx + 3 * k * Math.cos(t), cy - 2 * k + 4 * k * Math.sin(t), 1); }
}

// ---- the discs (§2.5, §3 per species) ----
// A look's picture for a disc: the stand's own pixels where the species has a layered stand (a crop of the composed stand with that look), else its colour
const CROPS = { colour: [135, 165, 100, 100], markings: [190, 135, 95, 95], crown: [52, 12, 150, 100], "eye-rings": [60, 108, 110, 90], eyes: [60, 108, 110, 90] };
const BARE = { crown: [52, 42, 150, 100] };
export function discPicture(r, env) {
  const d = r.d, P = d + 8, pane = new Pane(P, P), c = P / 2, R = d / 2, fr = env.frameOf(r.species), col = hex(CH[r.chapter] ?? "#cccccc").map((v) => v / 255);
  // the drop shadow: 0 3px 8px rgba(0,0,0,.45)
  for (let y = 0; y < P; y++) for (let x = 0; x < P; x++) { const dd = Math.hypot(x + 0.5 - c, y + 0.5 - c - 3 * (d / 92)); pane.put(y * P + x, [0, 0, 0], 0.45 * clamp01((R + 3 - dd) / 6) * clamp01(1 - Math.max(0, R - dd) / R)); }
  const inner = new Pane(d, d); let pic = null;
  if (r.look != null && fr) pic = lookPixels(fr, r, d);
  if (r.ghost && pic && !pic.flat) pic = { px: ghostOf(pic.px, d) };   // the unread disc's ghost of its first look: blurred 2.5 px, 60 % grey
  for (let y = 0; y < d; y++) for (let x = 0; x < d; x++) { const j = y * d + x, t = Math.hypot((x + 0.5) / d - 0.4, (y + 0.5) / d - 0.35) / 0.85, g = grad([[0, [23, 50, 56]], [1, [10, 23, 26]]], t);
    inner.put(j, g.map((v) => v / 255), 1);
    if (pic) { if (pic.flat) { if (!r.ghost) inner.put(j, pic.flat, 1); } else inner.put(j, [pic.px[j * 4] / 255, pic.px[j * 4 + 1] / 255, pic.px[j * 4 + 2] / 255], (pic.px[j * 4 + 3] / 255) * (r.ghost ? 0.32 : 1)); } }
  if (r.glyph) glyphMark(inner, d, r.glyph, col, r.alpha ?? 1);
  if (r.q) qMark(inner, d, col, r.carried ? 0.45 : 0.7);
  if (r.veil) for (let j = 0; j < d * d; j++) inner.put(j, [8 / 255, 20 / 255, 24 / 255], r.veil);
  // inset 0 1px 2px rgba(0,0,0,.5) and the disc's round edge
  pane.over(inner, 4, 4, (xx, yy) => { const dd = Math.hypot(xx + 0.5 - R, yy + 0.5 - R); return clamp01(R + 0.5 - dd) * (r.alpha ?? 1); });
  for (let y = 0; y < d; y++) for (let x = 0; x < d; x++) { const dd = Math.hypot(x + 0.5 - R, y + 0.5 - R - 1); const e = clamp01(R + 0.5 - Math.hypot(x + 0.5 - R, y + 0.5 - R)) * clamp01((dd - (R - 2.5)) / 2.5); if (e > 0) pane.put((y + 4) * P + x + 4, [0, 0, 0], 0.5 * e * (r.alpha ?? 1)); }
  return pane.rgba();
}
function lookPixels(fr, r, d) {
  const sid = fr.species.id, t = fr.chapters.flatMap((c) => c.traits).find((x) => x.id === r.trait), ch = fr.chapters.find((c) => c.traits.includes(t)); if (!t) return null;
  const stand = layeredStand(sid, "adult", [304, 312], "default"), win = (r.look === "bare head" && BARE[r.trait]) || CROPS[r.trait];
  if (stand && win) {
    const looks = { ...drawnLooks(fr, { genome: null, read: [] }) }; looks[r.trait] = r.look; const c = composeStand(stand, looks), px = c.rgba(), [x, y, w, h] = win, s = Math.min(w, h), cx = x + w / 2, cy = y + h / 2, x0 = Math.round(cx - s / 2), y0 = Math.round(cy - s / 2);
    const crop = new Uint8ClampedArray(s * s * 4); for (let yy = 0; yy < s; yy++) for (let xx = 0; xx < s; xx++) { const sx = x0 + xx, sy = y0 + yy; if (sx < 0 || sy < 0 || sx >= c.w || sy >= c.h) continue; crop.set(px.subarray((sy * c.w + sx) * 4, (sy * c.w + sx) * 4 + 4), (yy * s + xx) * 4); }
    return { px: resample(crop, s, s, d, d) };
  }
  const looks = Array.isArray(t.looks) ? t.looks : [], idx = Math.max(0, looks.indexOf(r.look)), c = lookColours({ id: t.id, chapterId: ch?.id, sid }, String(r.look), idx)[0] ?? "#cccccc";
  return { flat: hex(c).map((v) => v / 255) };
}
function ghostOf(px, d) {
  const a = new Float32Array(d * d), out = new Uint8ClampedArray(px.length); const ch = [0, 1, 2, 3].map((k) => { const pl = new Float32Array(d * d); for (let i = 0; i < d * d; i++) pl[i] = px[i * 4 + k] * (k < 3 ? px[i * 4 + 3] / 255 : 1); return blur(pl, d, d, 2.5); }); void a;
  for (let i = 0; i < d * d; i++) { const al = ch[3][i], c = [0, 1, 2].map((k) => (al > 0 ? ch[k][i] / (al / 255) : 0)), g = 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]; for (let k = 0; k < 3; k++) out[i * 4 + k] = Math.round(c[k] * 0.4 + g * 0.6); out[i * 4 + 3] = Math.round(al); }
  return out;
}
// The drawn template glyphs (the mock's line work): a gait's footfalls, an amount's three bars, Build's ellipse, Haunch's and Topline's curves, the eye's rings; in the chapter colour
function glyphMark(p, d, g, col, a) {
  const kind = g.replace(/\d+$/, ""), i = +(g.match(/\d+$/)?.[0] ?? 0), lw = Math.max(1, d / 28), segs = [], dots = [];
  const curve = (f) => { for (let k = 0; k <= 24; k++) segs.push(f(k / 24)); segs.push(null); };
  if (kind === "gait") { const pos = [[0.12, 0.32, 0.52, 0.72, 0.92], [0.12, 0.24, 0.5, 0.62, 0.88], [0.1, 0.19, 0.28, 0.66, 0.75, 0.84]][i % 3]; pos.forEach((f, j) => dots.push([d * (0.12 + 0.76 * f), d * (0.5 + (j % 2 ? 1 : -1) * 0.06), d * 0.05])); }
  else if (kind === "bar") { for (let j = 0; j < 3; j++) { const on = j <= i, x0 = d * (0.24 + j * 0.18); for (let y = 0; y < d; y++) for (let x = 0; x < d; x++) { const inb = x >= x0 && x < x0 + d * 0.14 && y >= d * (0.62 - (j + 1) * 0.08) && y < d * 0.66; if (inb && (on || x < x0 + lw || x >= x0 + d * 0.14 - lw || y < d * (0.62 - (j + 1) * 0.08) + lw || y >= d * 0.66 - lw)) p.put(y * d + x, col, a); } } return; }
  else if (kind === "build") { const ry = [6, 8, 10][i % 3] / 28; curve((t) => [d / 2 + Math.cos(t * 2 * Math.PI) * d * 0.34, d / 2 + 1 + Math.sin(t * 2 * Math.PI) * d * ry]); }
  else if (kind === "haunch") { const h = [0.62, 0.5, 0.38][i % 3]; curve((t) => { const u = t < 0.5 ? t * 2 : (t - 0.5) * 2, A = t < 0.5 ? [0.14, 0.66, 0.3, 0.5, 0.5, 0.56] : [0.5, 0.56, 0.7, h, 0.86, 0.66]; const q = (k) => (1 - u) * (1 - u) * A[k] + 2 * (1 - u) * u * A[k + 2] + u * u * A[k + 4]; return [q(0) * d, q(1) * d]; }); }
  else if (kind === "topline") { const tt = [0, -0.12, 0.12][i % 3], mid = tt ? 0 : -0.14; curve((u) => { const q = (a0, a1, a2) => (1 - u) * (1 - u) * a0 + 2 * (1 - u) * u * a1 + u * u * a2; return [q(0.14, 0.5, 0.86) * d, q(0.5 - tt, 0.5 + mid, 0.5 + tt) * d]; }); }
  else if (kind === "eyes") { const ring = [1.2, 2.4, 3.8][i % 3] * d / 42; for (let y = 0; y < d; y++) for (let x = 0; x < d; x++) { const r = Math.hypot(x + 0.5 - d / 2, y + 0.5 - d / 2); if (r < d * 0.3) p.put(y * d + x, r < d * 0.1 ? [26 / 255, 20 / 255, 18 / 255] : r < d * 0.3 - ring ? [200 / 255, 116 / 255, 44 / 255] : [233 / 255, 220 / 255, 192 / 255], a); } return; }
  for (let y = 0; y < d; y++) for (let x = 0; x < d; x++) { let best = 9; for (let k = 1; k < segs.length; k++) { const s0 = segs[k - 1], s1 = segs[k]; if (!s0 || !s1) continue; const dx = s1[0] - s0[0], dy = s1[1] - s0[1], L = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x + 0.5 - s0[0]) * dx + (y + 0.5 - s0[1]) * dy) / L)); best = Math.min(best, Math.hypot(x + 0.5 - s0[0] - t * dx, y + 0.5 - s0[1] - t * dy)); }
    let m = clamp01(lw / 2 + 0.5 - best); for (const [cx, cy, rr] of dots) m = Math.max(m, clamp01(rr + 0.5 - Math.hypot(x + 0.5 - cx, y + 0.5 - cy))); if (m > 0) p.put(y * d + x, col, a * m); }
}
function qMark(p, d, col, a) {   // the "?" in the chapter colour: a hook and a dot, scaled with the disc
  const s = d * 0.276, cx = d / 2, cy = d / 2 - s * 0.05, w = Math.max(1.4, s * 0.085);   // about 18 px tall in the 88 px disc, a light stroke, scaled with the disc (UI/UX 2026-10-30, S1; was 0.62 and 0.13: 42 px and heavy)
  const seg = (t) => { if (t < 0.62) { const ang = Math.PI * 1.05 - (t / 0.62) * Math.PI * 1.55; return [cx + Math.cos(ang) * s * 0.24, cy - s * 0.12 - Math.sin(ang) * s * 0.22]; } const u = (t - 0.62) / 0.38; return [cx + s * 0.02 * (1 - u), cy + s * 0.04 + u * s * 0.12]; };
  for (let y = 0; y < d; y++) for (let x = 0; x < d; x++) { let best = 9; for (let k = 0; k <= 40; k++) { const [px, py] = seg(k / 40); best = Math.min(best, Math.hypot(x + 0.5 - px, y + 0.5 - py)); }
    const dot = Math.hypot(x + 0.5 - cx, y + 0.5 - (cy + s * 0.32)); const m = Math.max(clamp01(w / 2 + 0.5 - best), clamp01(w * 0.7 + 0.5 - dot)); if (m > 0) p.put(y * d + x, col, a * m); }
}

// ---- her page's stage (station-match-3 slice 1a; the accepted walk-3-page) ----
// One opaque picture of the phone window's size (530 x 600): the room covered to the window (centred across, 60 % down), a radial shade, her adult master at the body box, the four leader lines, the chips on her
// body (a 30 px disc with the chapter's 24 x 24 read emblem at 18, nearest), the ring on the chapter in hand (a segmented 70 px chapter mark inside a 88 px orange focus circle), the tag's pill and the two hint keys.
// The room and her are game masters; the lines, chips, ring, pill and keys are interface drawn by code (rings, bars and keys are UI marks). Text is the face's (v_say), never here.
// r: { species, size: [w, h], body: { x, y, w }, spots: [{ chapter, at: [x, y], line: [x1, y1, x2, y2], ring: "1,0,..." | "" }], hand, tag: [x, y, w, h], radius, keys: [[x, y, w, h], [x, y, w, h]] }
export const PAGE_CREAM = [246 / 255, 231 / 255, 184 / 255], PAGE_ORANGE = [240 / 255, 122 / 255, 31 / 255], PAGE_INK = [16 / 255, 20 / 255, 28 / 255], PAGE_BLUE = [143 / 255, 208 / 255, 230 / 255], PAGE_GOLD = [1, 201 / 255, 77 / 255];
export const segDist = (px, py, x1, y1, x2, y2) => { const dx = x2 - x1, dy = y2 - y1, L = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / L)); return Math.hypot(px - x1 - t * dx, py - y1 - t * dy); };
export function paintPage(out, x0, y0, x1, y1, f) { const W = out.w, H = out.h; for (let y = Math.max(0, Math.floor(y0)); y < Math.min(H, Math.ceil(y1)); y++) for (let x = Math.max(0, Math.floor(x0)); x < Math.min(W, Math.ceil(x1)); x++) { const r = f(x + 0.5, y + 0.5); if (r && r[1] > 0) out.put(y * W + x, r[0], clamp01(r[1])); } }
export const rrectSd = (px, py, x, y, w, h, r) => { const qx = Math.abs(px - (x + w / 2)) - (w / 2 - r), qy = Math.abs(py - (y + h / 2)) - (h / 2 - r); return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r; };
function pageEmblem(out, chapter, cx, cy, px) {   // the chapter's 24 x 24 read emblem, nearest-neighbour at px, centred
  const id = `rail-emblem-${chapter}-read-24x24`, src = pixels(id); if (!src) return;
  for (let y = 0; y < px; y++) for (let x = 0; x < px; x++) { const sx = Math.min(23, Math.floor((x * 24) / px)), sy = Math.min(23, Math.floor((y * 24) / px)), i = (sy * 24 + sx) * 4, a = src[i + 3] / 255, X = Math.round(cx - px / 2) + x, Y = Math.round(cy - px / 2) + y;
    if (a > 0 && X >= 0 && Y >= 0 && X < out.w && Y < out.h) out.put(Y * out.w + X, [src[i] / 255, src[i + 1] / 255, src[i + 2] / 255], a); }
}
function pageRing(out, cx, cy, S, petalStates, chapter) {   // the chapter mark of shared.css/shared.js: a disc and one round-capped petal a trait
  const n = petalStates.length, w = Math.max(5, S * 0.105), R = S / 2 - w / 2 - 1, COL = { 1: PAGE_CREAM, 0: [1, 1, 1], c: PAGE_ORANGE, g: PAGE_BLUE }, ALPHA = { 1: 1, 0: 0.5, c: 1, g: 1 }, gap = n === 1 ? 0 : 0.34;
  paintPage(out, cx - S / 2, cy - S / 2, cx + S / 2, cy + S / 2, (x, y) => { const d = Math.hypot(x - cx, y - cy); return d < R - w / 2 - 1 + 0.5 ? [PAGE_INK, 0.8 * clamp01(R - w / 2 - 1 + 0.5 - d)] : null; });
  petalStates.forEach((s, i) => { const a0 = -Math.PI / 2 + (i * 2 * Math.PI) / n + gap / 2, a1 = -Math.PI / 2 + ((i + 1) * 2 * Math.PI) / n - gap / 2;
    paintPage(out, cx - S / 2, cy - S / 2, cx + S / 2, cy + S / 2, (x, y) => { const rho = Math.hypot(x - cx, y - cy); let d;
      if (n === 1) d = Math.abs(rho - R); else { let th = Math.atan2(y - cy, x - cx); while (th < a0 - 1e-9) th += 2 * Math.PI; if (th <= a1) d = Math.abs(rho - R); else d = Math.min(Math.hypot(x - cx - R * Math.cos(a0), y - cy - R * Math.sin(a0)), Math.hypot(x - cx - R * Math.cos(a1), y - cy - R * Math.sin(a1))); }
      return [COL[s] ?? COL[0], (ALPHA[s] ?? 0.5) * clamp01(w / 2 + 0.5 - d)]; }); });
  pageEmblem(out, chapter, cx, cy, 24 * Math.max(1, Math.round(((S * 0.42) / 24) * 2) / 2));
}
export function pageStagePicture(r) {
  const [W, H] = r.size, out = new Pane(W, H), bg = pixels("vivarium-near-day-544x408");
  for (let i = 0; i < W * H; i++) { out.c.set([27 / 255, 32 / 255, 42 / 255], i * 3); out.a[i] = 1; }
  if (bg) { const s = Math.max(W / 544, H / 408), bw = Math.round(544 * s), bh = Math.round(408 * s), sc = resample(bg, 544, 408, bw, bh), ox = Math.round((W - bw) * 0.5), oy = Math.round((H - bh) * 0.6);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const X = x - ox, Y = y - oy; if (X < 0 || Y < 0 || X >= bw || Y >= bh) continue; const i = (Y * bw + X) * 4; out.put(y * W + x, [sc[i] / 255, sc[i + 1] / 255, sc[i + 2] / 255], 1); } }
  { const cx = W * 0.45, cy = H * 0.45, rx = Math.max(cx, W - cx) * Math.SQRT2, ry = Math.max(cy, H - cy) * Math.SQRT2;   // the shade: clear to 45 % of the ellipse, then 42 % of #080a10 out to the corner
    paintPage(out, 0, 0, W, H, (x, y) => { const t = Math.hypot((x - cx) / rx, (y - cy) / ry); return t <= 0.45 ? null : [[8 / 255, 10 / 255, 16 / 255], 0.42 * clamp01((t - 0.45) / 0.55)]; }); }
  const body = pixels(coatMaster(`mibi-adult-${r.species}-304x312`, r.species, r.coat));
  if (body) { const bw = r.body.w, bh = Math.round((bw * 312) / 304), sc = resample(body, 304, 312, bw, bh);
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) { const X = r.body.x + x, Y = r.body.y + y, i = (y * bw + x) * 4; if (X < 0 || Y < 0 || X >= W || Y >= H || !sc[i + 3]) continue; out.put(Y * W + X, [sc[i] / 255, sc[i + 1] / 255, sc[i + 2] / 255], sc[i + 3] / 255); } }
  for (const s of r.spots) { const [x1, y1, x2, y2] = s.line; paintPage(out, Math.min(x1, x2) - 3, Math.min(y1, y2) - 3, Math.max(x1, x2) + 3, Math.max(y1, y2) + 3, (x, y) => [PAGE_CREAM, 0.85 * clamp01(1.5 - segDist(x, y, x1, y1, x2, y2))]); }
  for (const s of r.spots) { const [cx, cy] = s.at;
    if (s.ring) { const R = 44;   // the focus circle (3 px orange, a 4 px halo at 25 %, a soft glow at 40 %) round the chapter mark
      paintPage(out, cx - R - 26, cy - R - 26, cx + R + 26, cy + R + 26, (x, y) => { const d = Math.hypot(x - cx, y - cy);
        if (d > R + 26) return null; if (d <= R - 3) return null; if (d <= R) return [PAGE_ORANGE, clamp01(R + 0.5 - d)]; if (d <= R + 4) return [PAGE_ORANGE, 0.25]; const g = clamp01(1 - (d - R - 4) / 22); return [PAGE_ORANGE, 0.4 * g * g * 0.8]; });
      pageRing(out, cx, cy, 70, s.ring.split(","), s.chapter); }
    else { paintPage(out, cx - 16, cy - 16, cx + 16, cy + 16, (x, y) => { const d = Math.hypot(x - cx, y - cy); return d <= 15.5 ? (d >= 13 ? [PAGE_CREAM, 0.8 * clamp01(15.5 - d)] : [PAGE_INK, 0.78]) : null; }); pageEmblem(out, s.chapter, cx, cy, 18); } }
  { const [x, y, w, h] = r.tag; paintPage(out, x - 1, y - 1, x + w + 1, y + h + 1, (px, py) => [PAGE_INK, 0.84 * clamp01(0.5 - rrectSd(px, py, x, y, w, h, r.radius))]); }
  { const [x, y, w, h] = r.keys[0];   // the pad key: a rounded square with a 1.5 px edge and the two small triangles
    paintPage(out, x - 1, y - 1, x + w + 1, y + h + 1, (px, py) => { const sd = rrectSd(px, py, x, y, w, h, 9), a = clamp01(0.5 - sd); return a <= 0 ? null : sd > -1.5 ? [[1, 1, 1], 0.3 * a] : [[43 / 255, 49 / 255, 64 / 255], a]; });
    const cx = x + w / 2, cy = y + h / 2; paintPage(out, cx - 9, cy - 6, cx + 9, cy + 6, (px, py) => { const u = px - cx, v = Math.abs(py - cy); const left = u < -1 && u > -8 && v < ((u + 8) / 7) * 4.5, right = u > 1 && u < 8 && v < ((8 - u) / 7) * 4.5; return left || right ? [[244 / 255, 239 / 255, 226 / 255], 1] : null; }); }
  { const [x, y, w, h] = r.keys[1], cx = x + w / 2, cy = y + h / 2;   // the ✓ key: an orange disc with a white check
    paintPage(out, x - 1, y - 1, x + w + 1, y + h + 1, (px, py) => [PAGE_ORANGE, clamp01(w / 2 + 0.5 - Math.hypot(px - cx, py - cy))]);
    const a = [cx - 6.5, cy + 0.5], b = [cx - 2, cy + 5], c = [cx + 7, cy - 5];
    paintPage(out, cx - 10, cy - 10, cx + 10, cy + 10, (px, py) => [[1, 1, 1], clamp01(1.7 - Math.min(segDist(px, py, a[0], a[1], b[0], b[1]), segDist(px, py, b[0], b[1], c[0], c[1])))]); }
  if (r.rail) pageRail(out, r.rail);
  return out.rgba();
}
// The rail band along the foot (round2.css .rail): a fade into the ink (clear at the top, 86 % 22 px down, 95 % at the foot), one 50 px chapter ring a cell and the frame on the chapter in hand (a 2.5 px orange border, 12 % orange fill, radius 14).
// rail: { y, h, ring, cy, grad: { fadeTo, alpha0, alpha1, alpha2 }, frame: { dx, top, bottom, radius, border, fillPct }, w, cells: [{ chapter, x, petals: "1,0,..", hand }] }
function pageRail(out, q) {
  const W = out.w, g = q.grad;
  paintPage(out, 0, q.y, W, q.y + q.h, (x, y) => { const t = y - q.y, a = t < g.fadeTo ? g.alpha0 + ((g.alpha1 - g.alpha0) * t) / g.fadeTo : g.alpha1 + ((g.alpha2 - g.alpha1) * (t - g.fadeTo)) / (q.h - g.fadeTo); return [PAGE_INK, a]; });
  for (const c of q.cells) if (c.hand) { const f = q.frame, x0 = c.x + f.dx, y0 = q.y + f.top, w = q.w - 2 * f.dx, h = f.bottom - f.top;
    paintPage(out, x0 - 2, y0 - 2, x0 + w + 2, y0 + h + 2, (x, y) => { const sd = rrectSd(x, y, x0, y0, w, h, f.radius), edge = clamp01(0.5 - sd), inner = clamp01(0.5 - (sd + f.border)); return edge <= 0 ? null : [PAGE_ORANGE, inner > 0.999 ? (f.fillPct / 100) : edge - inner * (1 - f.fillPct / 100)]; }); }
  for (const c of q.cells) pageRing(out, c.x + q.w / 2, q.cy, q.ring, c.petals.split(","), c.chapter);
}

// ---- her chapter: the scale (station-match-5; the accepted walk-4-scale and walk-4-copies) ----
// One opaque picture of the phone window (530 x 600): her close up with the ring on the chapter's place (a lens of the same master, enlarged), or, once the lens has been pointed at the trait, the room at dusk with the
// two copies she carries side by side in a blue lens; the tray (the chapter's ring, the trait chips with the one in hand lit), the kind's pictured ends and middle as round portraits, the bar, her gold mark, the
// others' small faces and the legend's marks. Game masters (the room, her coat variants, the 64 px faces) are cut and placed, never drawn; the ring, lens rims, chips, bar and marks are interface drawn by code.
// Text is the face's. r: { species, size: [w, h], dusk, copies, body: { left, top, w }, lens: { cx, cy, d, zoom }, halves: [master, master] | null, tray: { top, h, fade }, ring: { cx, cy, s, chapter, petals },
//   chips: [{ x, y, w, h, on, scale }], ends: [{ cx, cy, d, master }], bar: { x0, x1, y, h, over, grad: [[r, g, b] x 3], ticks: [x..], tick: [y0, y1] }, rough: [x0, x1, y, h] | null, she: { x, y, d } | null,
//   cop: { xs: [a, b], y, h } | null, link: { x0, x1, y, h } | null, pins: [{ x, top, face, her }], legend: { dot: [x, y] | null, bar: [x, y, w, h] | null } }
const sample = (rgba, sw, i) => [rgba[i * 4] / 255, rgba[i * 4 + 1] / 255, rgba[i * 4 + 2] / 255, rgba[i * 4 + 3] / 255];
export function roomRGB(W, H, id, zoom, blur) {   // the room covered to the window (centred across, 60 % down), enlarged about the centre and blurred (box passes), as RGB 0..1; null when it is not placed
  const bg = pixels(id); if (!bg) return null;
  const s = Math.max(W / 544, H / 408), bw = Math.round(544 * s), bh = Math.round(408 * s), sc = resample(bg, 544, 408, bw, bh), ox = Math.round((W - bw) * 0.5), oy = Math.round((H - bh) * 0.6), c = new Float32Array(W * H * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const X = Math.min(bw - 1, Math.max(0, Math.round((x - W / 2) / zoom + W / 2) - ox)), Y = Math.min(bh - 1, Math.max(0, Math.round((y - H / 2) / zoom + H / 2) - oy)), i = (Y * bw + X) * 4; c.set([sc[i] / 255, sc[i + 1] / 255, sc[i + 2] / 255], (y * W + x) * 3); }
  for (let pass = 0; pass < (blur ? 3 : 0); pass++) for (const horiz of [true, false]) { const t = new Float32Array(c.length), n = horiz ? W : H, m = horiz ? H : W, k = Math.round(blur * 0.55);
    for (let b = 0; b < m; b++) for (let a = 0; a < n; a++) { let r = 0, g = 0, bl = 0, cnt = 0; for (let d = -k; d <= k; d++) { const q = Math.min(n - 1, Math.max(0, a + d)), j = (horiz ? b * W + q : q * W + b) * 3; r += c[j]; g += c[j + 1]; bl += c[j + 2]; cnt++; } const o = (horiz ? b * W + a : a * W + b) * 3; t[o] = r / cnt; t[o + 1] = g / cnt; t[o + 2] = bl / cnt; }
    c.set(t); }
  return c;
}
export function sprite(out, rgba, sw, sh, left, top, w, o = {}) {   // a master placed at (left, top), w wide, through an optional brightness / contrast and a coverage clip (x, y) -> 0..1, in picture pixels
  const h = Math.round((w * sh) / sw), sc = resample(rgba, sw, sh, w, h), br = o.bright ?? 1, ct = o.contrast ?? 1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const X = Math.round(left) + x, Y = Math.round(top) + y; if (X < 0 || Y < 0 || X >= out.w || Y >= out.h) continue; const [r, g, b, a] = sample(sc, w, y * w + x); if (!a) continue; const cv = o.clip ? o.clip(X + 0.5, Y + 0.5) : 1; if (cv <= 0) continue;
    out.put(Y * out.w + X, [r, g, b].map((v) => clamp01(((v * br - 0.5) * ct) + 0.5)), a * cv); }
}
export const discClip = (cx, cy, rad) => (x, y) => clamp01(rad + 0.5 - Math.hypot(x - cx, y - cy));
function discRim(out, cx, cy, rad, wid, col, alpha, glow) {   // a ring (wid wide, inside rad), a 2 px dark ring outside it and a soft glow of the same colour
  paintPage(out, cx - rad - 40, cy - rad - 40, cx + rad + 40, cy + rad + 40, (x, y) => { const d = Math.hypot(x - cx, y - cy);
    if (d <= rad - wid) return null; if (d <= rad) return [col, alpha * clamp01(rad + 0.5 - d) * clamp01(d - (rad - wid) + 0.5)];
    if (d <= rad + 2) return [[8 / 255, 12 / 255, 16 / 255], 0.5]; const g = clamp01(1 - (d - rad - 2) / glow); return g > 0 ? [col, 0.45 * g * g] : null; });
}
export function pageScalePicture(r) {
  const [W, H] = r.size, out = new Pane(W, H), roomId = `vivarium-near-${r.dusk ? "dusk" : "day"}-544x408`, room = roomRGB(W, H, roomId, r.dusk ? 1 : 1.5, r.dusk ? 0 : 5), hex6 = (h) => hex(h).map((v) => v / 255);
  for (let i = 0; i < W * H; i++) { if (room) out.c.set(room.subarray(i * 3, i * 3 + 3), i * 3); else out.c.set([27 / 255, 32 / 255, 42 / 255], i * 3); out.a[i] = 1; }
  const body = pixels(coatMaster(`mibi-adult-${r.species}-304x312`, r.species, r.coat));
  if (body) sprite(out, body, 304, 312, r.body.left, r.body.top, r.body.w);
  { const q = r.dusk ? 0.5 : 0.16, col = r.dusk ? [6 / 255, 8 / 255, 14 / 255] : [8 / 255, 10 / 255, 16 / 255]; paintPage(out, 0, 0, W, H, () => [col, q]); }
  const L = r.lens;
  if (r.dusk && r.halves) {   // the two copies side by side: the room as it is behind, then each master, enlarged and brightened, half a lens each, a blue bar between
    const roomHi = roomRGB(W, H, roomId, 1, 0), box = [L.cx - L.d / 2, L.cy - L.d / 2], half = r.halves.length === 1 ? L.d : L.d / 2;   // one master (a set's hidden look) fills the lens
    for (const [k, id] of r.halves.entries()) { const px = pixels(id), x0 = box[0] + k * half, clip = (x, y) => (x >= x0 && x < x0 + half ? discClip(L.cx, L.cy, L.d / 2)(x, y) : 0);
      if (roomHi) paintPage(out, x0, box[1], x0 + half, box[1] + L.d, (x, y) => { const c = clip(x, y); if (c <= 0) return null; const j = (Math.floor(y) * W + Math.floor(x)) * 3; return [[Math.min(1, roomHi[j] * 1.15), Math.min(1, roomHi[j + 1] * 1.15), Math.min(1, roomHi[j + 2] * 1.15)], c]; });
      if (px) sprite(out, px, 304, 312, box[0] + (L.ox ?? -63), box[1] + (L.oy ?? -190), L.zoomW, { bright: 1.35, contrast: 1.06, clip }); }
    if (r.halves.length > 1) paintPage(out, L.cx - 2, L.cy - L.d / 2, L.cx + 2, L.cy + L.d / 2, (x, y) => [PAGE_BLUE, discClip(L.cx, L.cy, L.d / 2)(x, y)]);
    discRim(out, L.cx, L.cy, L.d / 2, 4, PAGE_BLUE, 1, 30);
  } else if (!r.dusk) {   // the ring on the chapter's place: a lens of the same master, enlarged and brightened so the fur reads
    if (body) sprite(out, body, 304, 312, L.cx - L.fx * L.zoomW, L.cy - L.fy * Math.round((L.zoomW * 312) / 304), L.zoomW, { bright: 1.3, contrast: 1.06, clip: discClip(L.cx, L.cy, L.d / 2) });
    discRim(out, L.cx, L.cy, L.d / 2, 4, PAGE_GOLD, 1, 30);
  }
  { const T = r.tray, g = (t) => (t < T.fade ? (0.92 * t) / T.fade : 0.92 + (0.05 * (t - T.fade)) / (T.h - T.fade)); paintPage(out, 0, T.top - 0, W, H, (x, y) => [PAGE_INK, g(y - T.top)]); }
  { const q = r.ring; pageRing(out, q.cx, q.cy, q.s, q.petals.split(","), q.chapter); }
  for (const c of r.chips) { paintPage(out, c.x - 1, c.y - 1, c.x + c.w + 1, c.y + c.h + 1, (x, y) => [c.on ? hex6("#f6e7b8") : [1, 1, 1], (c.on ? 1 : 0.07) * clamp01(0.5 - rrectSd(x, y, c.x, c.y, c.w, c.h, 13))]);
    const gx = c.x + 11 + 5, gy = c.y + c.h / 2, bar = c.on ? [40 / 255, 34 / 255, 22 / 255] : PAGE_CREAM, dot = c.on ? [64 / 255, 50 / 255, 19 / 255] : PAGE_GOLD;
    if (c.scale) { paintPage(out, gx - 1, gy - 3, gx + 14, gy + 3, (x, y) => [bar, (c.on ? 0.7 : 0.45) * clamp01(2.5 - Math.abs(y - gy)) * clamp01(x - gx + 1) * clamp01(gx + 14 - x)]); paintPage(out, gx + 1, gy - 6, gx + 11, gy + 6, (x, y) => [dot, clamp01(5.5 - Math.hypot(x - gx - 6, y - gy))]); }
    else for (const [k, col] of [[0, bar], [1, dot], [2, bar]]) paintPage(out, gx + k * 6, gy - 4, gx + k * 6 + 5, gy + 4, () => [col, c.on ? 0.8 : 0.6]); }
  { const Q = r.set ?? { cards: [], kin: [] }, GOLD = PAGE_GOLD, BLUE = PAGE_BLUE, dash = (x, y, cx, cy, per) => ((Math.atan2(y - cy, x - cx) + Math.PI) / (2 * Math.PI)) * per % 10 < 6;   // a set's cards (walk-4-set: .card u, 70 lp, radius 13)
    for (const c of Q.cards) { const { x, y, s } = c, cx = x + s / 2, cy = y + s / 2, per = 4 * s, own = clamp01, inside = (X, Y) => own(0.5 - rrectSd(X, Y, x, y, s, s, 13));
      paintPage(out, x - 28, y - 28, x + s + 28, y + s + 28, (px, py) => { const sd = rrectSd(px, py, x, y, s, s, 13);
        if (c.rim === "gold" && sd > 0) return sd <= 3 ? [GOLD, 0.25 * clamp01(3.5 - sd) + 0.4] : (1 - (sd - 3) / 18) > 0 ? [GOLD, 0.55 * (1 - (sd - 3) / 18) ** 2] : null;
        if (c.rim === "blue" && sd > 0) return sd > 3.5 && sd <= 7.5 ? (dash(px, py, cx, cy, per + 40) ? [BLUE, clamp01(0.5 - Math.abs(sd - 5.5) + 1.75)] : [BLUE, 0.28 * clamp01(1 - (sd - 7.5) / 12)]) : sd > 7.5 && sd < 22 ? [BLUE, 0.5 * (1 - (sd - 7.5) / 14.5) ** 2] : null;
        return null; });
      paintPage(out, x - 1, y - 1, x + s + 1, y + s + 1, (px, py) => [hex6("#141922"), inside(px, py)]);
      const px0 = c.master ? pixels(c.master) : null; if (px0) { const k = s / c.window[2]; sprite(out, px0, 304, 312, x - c.window[0] * k, y - c.window[1] * k, Math.round(304 * k), { bright: c.bright, clip: inside }); }
      const wid = c.rim === "gold" ? 4 : c.rim === "dash" ? 2 : c.rim === "blue" ? 2 : 2, col = c.rim === "gold" ? GOLD : PAGE_CREAM, al = c.rim === "gold" ? 1 : c.rim === "dash" ? 0.5 : 0.8;
      paintPage(out, x - 1, y - 1, x + s + 1, y + s + 1, (px, py) => { const sd = rrectSd(px, py, x, y, s, s, 13), e = clamp01(0.5 - sd) * clamp01(sd + wid + 0.5); if (e <= 0) return null; if (c.rim === "dash" && !dash(px, py, cx, cy, per)) return null; return [col, al * e]; });
      if (c.pill) { const P = Q.pill, pw = P.w, ph = P.h, pxx = cx - pw / 2, pyy = y + P.dy; paintPage(out, pxx - 1, pyy - 1, pxx + pw + 1, pyy + ph + 1, (px, py) => [c.pill === "blue" ? hex6("#8fd0e6") : GOLD, clamp01(0.5 - rrectSd(px, py, pxx, pyy, pw, ph, 10))]); } }
    for (const k of Q.kin) { const R = k.d / 2, cx = k.x + R, cy = k.y + R, wr = k.her ? 2 : 1.5, rim = k.her ? GOLD : PAGE_CREAM;   // the small faces: 28 lp discs in a ring (gold for her)
      paintPage(out, k.x - 1, k.y - 1, k.x + k.d + 1, k.y + k.d + 1, (px, py) => { const d = Math.hypot(px - cx, py - cy); return d <= R - wr + 0.5 ? [hex6("#141922"), clamp01(R - wr + 0.5 - d)] : null; });
      const f = k.face ? pixels(k.face) : null; if (f) sprite(out, f, 64, 64, k.x, k.y, k.d, { clip: discClip(cx, cy, R - wr) });
      paintPage(out, k.x - 1, k.y - 1, k.x + k.d + 1, k.y + k.d + 1, (px, py) => { const d = Math.hypot(px - cx, py - cy); return d > R - wr && d <= R + 0.5 ? [rim, (k.her ? 1 : 0.7) * clamp01(R + 0.5 - d) * clamp01(d - (R - wr) + 0.5)] : null; }); } }
  const S = r.sc;
  for (const e of S.ends) {   // a round portrait: the kind's coat at that end in a 2 px cream ring on #141922; none placed, the plain disc
    paintPage(out, e.cx - e.d / 2 - 1, e.cy - e.d / 2 - 1, e.cx + e.d / 2 + 1, e.cy + e.d / 2 + 1, (x, y) => { const d = Math.hypot(x - e.cx, y - e.cy); return d <= e.d / 2 - 2 + 0.5 ? [hex6("#141922"), clamp01(e.d / 2 - 2 + 0.5 - d)] : d <= e.d / 2 + 0.5 ? [PAGE_CREAM, 0.7 * clamp01(e.d / 2 + 0.5 - d) * clamp01(d - (e.d / 2 - 2) + 0.5)] : null; });
    const px = e.master ? pixels(e.master) : null, en = e.master ? assetEntry(e.master) : null;
    if (px && en.w === ART[0] && en.h === ART[1]) sprite(out, px, 304, 312, e.cx - e.d / 2 + 2 - 3, e.cy - e.d / 2 + 2 - 3, 78, { clip: discClip(e.cx, e.cy, e.d / 2 - 2) });
    else if (px) { const [wx, wy, ww] = CHIP_WINDOW, sq = cropPixels({ w: en.w, h: en.h, rgba: px }, [wx, wy, ww, ww], ww, ww, (c) => c); sprite(out, sq.rgba, ww, ww, e.cx - e.d / 2 + 2 - 3, e.cy - e.d / 2 + 2 - 3, 78, { clip: discClip(e.cx, e.cy, e.d / 2 - 2) }); } }   // a signed 128 x 160 trait chip (Signature size): the square window of it, as the trait tiles take it
  const B = S.bar ?? { x0: 0, x1: 1, over: 0, y: -9, h: 1, ticks: [], tick: [0, 0], grad: [[0, 0, 0], [0, 0, 0], [0, 0, 0]] }, bx0 = B.x0 - B.over, bx1 = B.x1 + B.over, gradAt = (t) => grad([[0, B.grad[0]], [0.5, B.grad[1]], [1, B.grad[2]]], t);
  for (const x of B.ticks) paintPage(out, x - 1, B.tick[0], x + 1, B.tick[1], () => [PAGE_CREAM, 0.55]);
  if (S.bar) paintPage(out, bx0 - 5, B.y - 5, bx1 + 5, B.y + B.h + 5, (x, y) => { const sd = rrectSd(x, y, bx0, B.y, bx1 - bx0, B.h, B.h / 2), outer = clamp01(0.5 - (sd - 3)), edge = clamp01(0.5 - sd), inner = clamp01(0.5 - (sd + 1.5)); if (outer <= 0) return null;
    if (edge <= 0) return [PAGE_INK, 0.6 * outer]; return inner > 0.99 ? [gradAt((x - bx0) / (bx1 - bx0)).map((v) => v / 1), 1] : [PAGE_CREAM, 0.75 * edge]; });
  if (S.rough) { const [x0, x1, y, h] = S.rough; paintPage(out, x0 - 2, y - 2, x1 + 2, y + h + 2, (px, py) => { const sd = rrectSd(px, py, x0, y, x1 - x0, h, h / 2), e = clamp01(0.5 - sd); return e <= 0 ? null : sd > -2 ? [PAGE_GOLD, e] : [PAGE_GOLD, 0.34 * e]; }); }
  if (S.link) { const { x0, x1, y, h } = S.link; paintPage(out, x0 - 2, y - 1, x1 + 2, y + h + 1, (px, py) => { const sd = rrectSd(px, py, x0, y - 12, x1 - x0, h + 12, 8), e = clamp01(0.5 - sd), i = clamp01(0.5 - (sd + 2)); return py < y || e <= 0 ? null : [PAGE_BLUE, e - i]; }); }
  if (S.cop) for (const x of S.cop.xs) paintPage(out, x - 8, S.cop.y - S.cop.h / 2 - 3, x + 8, S.cop.y + S.cop.h / 2 + 3, (px, py) => { const sd = rrectSd(px, py, x - 4, S.cop.y - S.cop.h / 2, 8, S.cop.h, 4), e = clamp01(0.5 - sd); if (sd > 8) return null; if (e <= 0) return [PAGE_BLUE, 0.3 * clamp01(1 - sd / 8)]; return [sd > -2 ? hex6("#10202a") : PAGE_BLUE, e]; });
  for (const p of S.pins) {   // a pin: a 9 px stem, the mibi's 64 px face as a 34 px disc in a ring (gold and 2.5 px for her)
    paintPage(out, p.x - 1, p.top, p.x + 1, p.top + 9, () => [PAGE_CREAM, 0.6]); const cy = p.top + 9 + 17, wr = p.her ? 2.5 : 1.5, rim = p.her ? PAGE_GOLD : PAGE_CREAM;
    paintPage(out, p.x - 19, cy - 19, p.x + 19, cy + 19, (x, y) => { const d = Math.hypot(x - p.x, y - cy); return d <= 17 - wr + 0.5 ? [hex6("#141922"), clamp01(17 - wr + 0.5 - d)] : null; });
    const f = p.face ? pixels(p.face) : null; if (f) sprite(out, f, 64, 64, p.x - 17, cy - 17, 34, { clip: discClip(p.x, cy, 17 - wr) });
    paintPage(out, p.x - 19, cy - 19, p.x + 19, cy + 19, (x, y) => { const d = Math.hypot(x - p.x, y - cy); return d > 17 - wr && d <= 17.5 ? [rim, (p.her ? 1 : 0.75) * clamp01(17.5 - d) * clamp01(d - (17 - wr) + 0.5)] : null; }); }
  if (S.she) { const { x, y, d } = S.she, R = d / 2;   // her gold mark: a disc with a dark 3 px ring, a gold outline and a glow
    paintPage(out, x - R - 22, y - R - 22, x + R + 22, y + R + 22, (px, py) => { const q = Math.hypot(px - x, py - y); if (q <= R - 3) return [PAGE_GOLD, clamp01(R - 3 + 0.5 - q)]; if (q <= R) return [hex6("#1b202a"), 1]; if (q <= R + 2) return [PAGE_GOLD, clamp01(R + 2.5 - q)]; const g = clamp01(1 - (q - R - 2) / 20); return g > 0 ? [PAGE_GOLD, 0.5 * g * g] : null; }); }
  const lg = S.legend;
  if (lg.dot) paintPage(out, lg.dot[0] - 12, lg.dot[1] - 12, lg.dot[0] + 12, lg.dot[1] + 12, (x, y) => { const q = Math.hypot(x - lg.dot[0], y - lg.dot[1]); return q <= 6 ? [PAGE_GOLD, clamp01(6.5 - q)] : q < 12 ? [PAGE_GOLD, 0.35 * (1 - (q - 6) / 6)] : null; });
  if (lg.bar) { const [x, y, w, h] = lg.bar; paintPage(out, x - 1, y - 1, x + w + 1, y + h + 1, (px, py) => [hex6("#8fd0e6"), clamp01(0.5 - rrectSd(px, py, x, y, w, h, 3))]); }
  return out.rgba();
}

// ---- her board (station-match-7; the accepted walk-5-glance): every trait of her kind as one small row in its own shape, grouped by chapter ----
// One opaque picture of the phone window: the room blurred under a shade, her, a head (emblem) a chapter and a row a trait: a scale is a 124 lp bar with her gold mark, a stretch (a doing seen a few times) or
// nothing (shut: not looked at), the blue ticks of the two copies once the lens was used and small dots for your others; a set is a row of 21 lp squares (gold hers, dashed blue the one she carries, pale a look one of yours
// has), then the legend. The words (names, notes, legend) are the face's. r: { species, size, body: { left, top, w }, groups: [{ chapter, x, y, dim, rows: [{ cy, bx, shut, scale: { w, at, rough: [a, b] | null, copies: [a, b] | null, others: [t..] } | null, set: { n, step, found: [i..], shows, carries } | null }] }],
//   legend: { y, items: [{ x, kind }] } }
export function pageBoardPicture(r) {
  const [W, H] = r.size, out = new Pane(W, H), room = roomRGB(W, H, "vivarium-near-day-544x408", 1.2, 6), CREAM = PAGE_CREAM, hex6 = (h) => hex(h).map((v) => v / 255);
  for (let i = 0; i < W * H; i++) { if (room) out.c.set(room.subarray(i * 3, i * 3 + 3), i * 3); else out.c.set([27 / 255, 32 / 255, 42 / 255], i * 3); out.a[i] = 1; }
  paintPage(out, 0, 0, W, H, (x, y) => [[12 / 255, 15 / 255, 22 / 255], y < 190 ? 0.5 + (0.38 * y) / 190 : 0.88 + (0.06 * (y - 190)) / (H - 190)]);
  const body = pixels(coatMaster(`mibi-adult-${r.species}-304x312`, r.species, r.coat)); if (body) sprite(out, body, 304, 312, r.body.left, r.body.top, r.body.w);
  const dashOn = (x, y, cx, cy, per) => ((Math.atan2(y - cy, x - cx) + Math.PI) / (2 * Math.PI)) * per % 7 < 4;
  for (const a of r.alone ?? []) {   // "hers alone": a tile a line, the same marks as the legend (a gold disc: she stands at the end of a scale; a gold square: the look she shows; a dashed blue square: the look she carries)
    const cx = a.x + a.d / 2, cy = a.y + a.d / 2, R = a.d / 2, rad = a.kind === "scale" ? R : 11;
    paintPage(out, a.x - 4, a.y - 4, a.x + a.d + 4, a.y + a.d + 4, (px, py) => { const sd = rrectSd(px, py, a.x, a.y, a.d, a.d, rad), e = clamp01(0.5 - sd); if (e <= 0) return null; return sd > -3 ? [a.kind === "carries" ? CREAM : PAGE_GOLD, (a.kind === "carries" ? 0.85 : 1) * e] : [hex6("#141922"), e]; });
    const mpx = a.master ? pixels(a.master) : null;   // the signed crop where a look maps (a coat end: the whole round master as the portrait discs; a look: the card's square window), inside the tile's 3 px rim
    if (mpx && a.kind === "scale") { const k = a.d / 76; sprite(out, mpx, 304, 312, Math.round(cx - a.d / 2 + (2 - 3) * k), Math.round(cy - a.d / 2 + (2 - 3) * k), Math.round(78 * k), { clip: discClip(cx, cy, R - 3) }); }
    else if (mpx && a.window) { const k = (a.d - 6) / a.window[2], inX = a.x + 3, inY = a.y + 3, inD = a.d - 6; sprite(out, mpx, 304, 312, inX - a.window[0] * k, inY - a.window[1] * k, Math.round(304 * k), { bright: a.kind === "carries" ? 1.25 : 1, clip: (X, Y) => clamp01(0.5 - rrectSd(X, Y, inX, inY, inD, inD, 8)) }); }
    else if (a.kind === "scale") paintPage(out, cx - 9, cy - 9, cx + 9, cy + 9, (px, py) => [PAGE_GOLD, clamp01(9.5 - Math.hypot(px - cx, py - cy))]);
    else if (a.kind === "shows") paintPage(out, cx - 10, cy - 10, cx + 10, cy + 10, (px, py) => [PAGE_GOLD, clamp01(0.5 - rrectSd(px, py, cx - 9, cy - 9, 18, 18, 3))]);
    if (a.kind === "carries") paintPage(out, a.x - 8, a.y - 8, a.x + a.d + 8, a.y + a.d + 8, (px, py) => { const sd = rrectSd(px, py, a.x - 3.5, a.y - 3.5, a.d + 7, a.d + 7, 14), e = clamp01(1.75 - Math.abs(sd + 1.25)); return e > 0 && dashOn(px, py, cx, cy, 84) ? [PAGE_BLUE, e] : null; });
  }
  for (const g of r.groups) {
    pageEmblem(out, g.chapter, g.x + 12, g.y + 13, 24);
    if (g.dim) paintPage(out, g.x, g.y, g.x + 24, g.y + 26, () => [[12 / 255, 15 / 255, 22 / 255], 0.4]);
    for (const w of g.rows) {
      const cy = w.cy;
      if (w.scale) { const q = w.scale, x = (t) => w.bx + 9 + t * (q.w - 18), x0 = w.bx + 3, x1 = w.bx + q.w - 3, open = q.at != null || !!q.rough;
        paintPage(out, x0 - 2, cy - 6, x1 + 2, cy + 6, (px, py) => { const sd = rrectSd(px, py, x0, cy - 3.5, x1 - x0, 7, 3.5), e = clamp01(0.5 - sd); if (e <= 0) return null; return open ? [CREAM, 0.3 * e] : sd > -1.5 ? [CREAM, 0.42 * e] : null; });
        for (const t of q.others) paintPage(out, x(t) - 4, cy - 4, x(t) + 4, cy + 4, (px, py) => [CREAM, 0.8 * clamp01(3.7 - Math.hypot(px - x(t), py - cy))]);
        if (q.rough) { const a = x(q.rough[0]), b = x(q.rough[1]); paintPage(out, a - 2, cy - 9, b + 2, cy + 9, (px, py) => { const sd = rrectSd(px, py, a, cy - 7, b - a, 14, 7), e = clamp01(0.5 - sd); return e <= 0 ? null : sd > -1.5 ? [PAGE_GOLD, e] : [PAGE_GOLD, 0.4 * e]; }); }
        if (q.copies) { const [a, b] = q.copies.map(x).sort((p, s) => p - s); paintPage(out, a, cy + 9.2, b + 1, cy + 11.7, () => [PAGE_BLUE, 1]);
          for (const t of q.copies) paintPage(out, x(t) - 3, cy - 10, x(t) + 3, cy + 11, (px, py) => [PAGE_BLUE, clamp01(0.5 - rrectSd(px, py, x(t) - 2, cy - 9, 4, 19, 2))]); }
        if (q.at != null) paintPage(out, x(q.at) - 9, cy - 9, x(q.at) + 9, cy + 9, (px, py) => { const d = Math.hypot(px - x(q.at), py - cy); return d <= 5.75 ? [PAGE_GOLD, clamp01(6 - d)] : d <= 7.25 ? [hex6("#1b202a"), clamp01(7.5 - d)] : null; }); }
      if (w.set) { const q = w.set, sx = (i) => w.bx + 13 + i * q.step, sq = (i, h, col, al, edge) => paintPage(out, sx(i) - h - 1, cy - h - 1, sx(i) + h + 1, cy + h + 1, (px, py) => { const sd = rrectSd(px, py, sx(i) - h, cy - h, 2 * h, 2 * h, 2.5), e = clamp01(0.5 - sd); if (e <= 0) return null; return edge ? (sd > -edge ? [col, al * e] : null) : [col, al * e]; });
        for (let i = 0; i < q.n; i++) { const found = q.found.includes(i); sq(i, 5, hex6("#1a1f29"), 1); if (found) sq(i, 5, CREAM, 0.62); else sq(i, 5, CREAM, 0.42, 1.5); }
        if (q.shows != null) sq(q.shows, 7, PAGE_GOLD, 1);
        if (q.carries != null) { const cx = sx(q.carries); paintPage(out, cx - 13, cy - 13, cx + 13, cy + 13, (px, py) => { const sd = rrectSd(px, py, cx - 10.5, cy - 10.5, 21, 21, 5), e = clamp01(1.75 - Math.abs(sd + 1.25)); return e > 0 && dashOn(px, py, cx, cy, 84) ? [PAGE_BLUE, e] : null; }); } } } }
  const L = r.legend;
  for (const it of L.items) { const cy = L.y;
    if (it.kind === "scale") { paintPage(out, it.x, cy - 3, it.x + 22, cy + 3, (px, py) => [CREAM, 0.6 * clamp01(2.5 - Math.abs(py - cy))]); paintPage(out, it.x + 6, cy - 6, it.x + 16, cy + 6, (px, py) => [PAGE_GOLD, clamp01(5.5 - Math.hypot(px - it.x - 11, py - cy))]); }
    else if (it.kind === "set") for (const [k, col] of [[0, CREAM], [1, PAGE_GOLD], [2, CREAM]]) paintPage(out, it.x + k * 8, cy - 4, it.x + k * 8 + 6, cy + 4, () => [col, k === 1 ? 1 : 0.7]);
    else if (it.kind === "shows") paintPage(out, it.x, cy - 6, it.x + 12, cy + 6, () => [PAGE_GOLD, 1]);
    else if (it.kind === "carries") paintPage(out, it.x, cy - 7.5, it.x + 5, cy + 7.5, (px, py) => [PAGE_BLUE, clamp01(0.5 - rrectSd(px, py, it.x, cy - 7.5, 5, 15, 2))]);
    else if (it.kind === "others") paintPage(out, it.x, cy - 4, it.x + 7, cy + 4, (px, py) => [CREAM, 0.8 * clamp01(3.5 - Math.hypot(px - it.x - 3.5, py - cy))]); }
  return out.rgba();
}

// ---- registering (the picture kinds pictures.mjs hands here) ----
export function registerReading(r, env) {
  if (hasAsset(r.id)) return;
  const made = (w, h, f) => registerAsset({ id: r.id, w, h, status: "derived", until: null, build: () => { let data = null; return { w, h, rgba: () => data ?? (data = f()) }; } });
  switch (r.kind) {
    case "traitshape": return made(SIZES[r.size][0], SIZES[r.size][1], () => shapePicture(r.model, r.size, { colours: r.colours, pics: cropPics(r) }).rgba);   // a trait's scale or set (trait-shape-pictures.mjs), with its crops of the signed art (trait-crops.mjs)
    case "readchamber": return made(CHAMBER.size[0], CHAMBER.size[1], () => chamberPicture(r, env));
    case "pagestage": return made(r.size[0], r.size[1], () => pageStagePicture(r));
    case "pagescale": return made(r.size[0], r.size[1], () => pageScalePicture(r));
    case "pageboard": return made(r.size[0], r.size[1], () => pageBoardPicture(r));
    case "nursery": return made(r.size[0], r.size[1], () => nurseryPicture(r));   // the nursery and a pod's page (nursery-pictures.mjs)
    case "podpage": return made(r.size[0], r.size[1], () => podPagePicture(r));
    case "readrail": return made(r.small ? 272 : 526, r.small ? 40 : 71, () => railPicture(r));
    case "readdisc": return made(r.d + 8, r.d + 8, () => discPicture(r, env));
    case "readgather": return made(r.size, r.size, () => gatherPicture(r, env));
    case "readplate": return made(r.size, r.size, () => { const n = r.size, out = new Uint8ClampedArray(n * n * 4), bone = [241, 235, 223], hair = [61, 67, 75]; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const c = x === 0 || y === 0 || x === n - 1 || y === n - 1 ? hair : bone; out.set([...c, 255], (y * n + x) * 4); } return out; });   // the stamp's label plate: bone with a 1 px hairline edge
    case "readstamp": return made(r.size, r.size, () => { const fr = env.frameOf(r.species), p = env.podById(r.pod), sg = fr && p ? stampGenome(fr, p.genome, r.read) : null; if (!sg || sg.refused) return new Uint8ClampedArray(r.size * r.size * 4); const { N } = stampSizing(fr, p.genome); return new Uint8ClampedArray(rasterize(stampGeometry(sg), N * r.cell, { ss: 3, size: r.size }).data); });   // the stamp in progress at the reading screen's cell (§2.7)
    default: return registerSlot({ id: r.id, w: r.size?.[0] ?? 1, h: r.size?.[1] ?? 1, until: "the reading screen" });
  }
}
// The stamp moment's gathered picture: each lane of the rail picture as a frame at its block's place on the stamp's box, at the stamp's own size
export function gatherPicture(r, env) {
  const size = r.size, pane = new Pane(size, size), rail = assetOf(r.rail); if (!rail) return pane.rgba(); const px = rail.rgba(), RW = rail.w;
  for (const g of r.pieces) { const [sx, sy, w, h] = g.from, [bx, by, bw, bh] = g.to, kx = w / bw, ky = h / bh;
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) { const X = Math.min(RW - 1, Math.floor(sx + x * kx)), Y = Math.min(rail.h - 1, Math.floor(sy + y * ky)), i = (Y * RW + X) * 4, a = px[i + 3] / 255; if (a > 0 && bx + x < size && by + y < size) pane.put((by + y) * size + bx + x, [px[i] / 255, px[i + 1] / 255, px[i + 2] / 255], a); } }
  return pane.rgba();
}
