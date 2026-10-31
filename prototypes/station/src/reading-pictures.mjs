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
import { stampGenome, stampSizing } from "./genome.mjs";
import { CH, railLayout } from "./reading-rail.mjs";
export { CH, CH_TOKEN, railLayout, railLanes } from "./reading-rail.mjs";
import { stampGeometry, rasterize } from "../../genome-stamp/src/stamp.mjs";
import { lookColours } from "./specimen.mjs";

const MINT = [143, 227, 200], AMBER = [240, 180, 90], CREAM = [239, 233, 220];
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
// the places of §2.3: the picture's top left on the screen and its scale; the Tuikis' overview at 0.98
export const PLACES = { overview: { at: [163, 112], s: 0.94 }, close: { at: [142, 112], s: 1.16 }, detail: { at: [114, 84], s: 1.3 } };
const TUIKIS = { overview: { at: [167, 118], s: 0.98 }, close: { at: [151, 112], s: 1.16 }, detail: { at: [118, 84], s: 1.3 } };
export const CHAMBER = { at: [30, 70], size: [548, 356], fade: 22 };

// ---- the layers ----
const placed = (id) => { const e = assetEntry(id); return !!e && !!e.file && e.status !== "empty"; };
const pixels = (id) => (placed(id) ? assetOf(id).rgba() : null);
const CACHE = new Map();
function alphaOf(id) { const k = "a:" + id; if (CACHE.has(k)) return CACHE.get(k); const e = assetEntry(id), px = pixels(id); if (!px) return null; const a = new Float32Array(e.w * e.h); for (let i = 0; i < a.length; i++) a[i] = px[i * 4 + 3] / 255; CACHE.set(k, a); return a; }
// The species' cut layers (the cut tool's): the plain body, the scan, the rim, the face frame and the part masks with their lines; null for a species the tool did not cut
const CUT = { S01: { w: 304, h: 312, parts: ["coat", "face", "head", "legs"] }, S03: { w: 291, h: 291, parts: ["coat", "face", "shape", "legs"] } };
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
class Pane {
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
  const cut = cutLayers(r.species), paint = paintOf(fr, pod), tuikis = r.species === "S03";
  const sw = cut ? cut.w : 304, sh = cut ? cut.h : 312, P = (tuikis ? TUIKIS : PLACES)[r.place] ?? PLACES.overview, s = P.s, tw = Math.round(sw * s), th = Math.round(sh * s);
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
  { const [ex, ey, ew, eh, a0] = tuikis ? [30, sh - 36, sw - 60, 36, 0.6] : [20, sh - 34, sw - 30, 40, 0.75];
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
  for (let y = 0; y < th; y++) { const c = grad([[0, [184, 240, 224]], [tuikis ? 0.6 : 0.5, [...MINT]], [1, [92, 201, 176]]], y / th);
    for (let x = 0; x < tw; x++) { if (!inPane(x, y)) continue; const j = y * tw + x, a = scanS[j] * unreadS[j] * (tuikis ? 0.72 : 0.78); if (a > 0) pane.put(at(x, y), [c[0] / 255, c[1] / 255, c[2] / 255], a); } }
  // 5. a species with no paint shows its read parts as their chapter's tint on the scan (the Tuikis: 22 % screen)
  for (const [part, ch] of r.tints ?? []) { const m = masks[part] ? S(masks[part]) : null; if (!m) continue; const c = hex(CH[ch] ?? "#cccccc").map((v) => v / 255);
    for (let j = 0; j < tw * th; j++) { const x = j % tw, y = (j / tw) | 0; if (inPane(x, y) && m[j] > 0) pane.put(at(x, y), c, 0.22 * m[j], "screen"); } }
  // 6. the chapter in hand: its part tinted, and at the overview outlined (a 1.5 px line at 95 %)
  if (handM) { const c = hex(CH[r.hand] ?? "#cccccc").map((v) => v / 255), k = r.outline ? (r.part === "legs" ? 0.2 : 0.16) : 0.2;
    for (let j = 0; j < tw * th; j++) { const x = j % tw, y = (j / tw) | 0; if (!inPane(x, y) || handM[j] <= 0) continue; pane.put(at(x, y), c, k * handM[j], "screen"); if (!r.outline) pane.put(at(x, y), c, 0.2 * handM[j], "color"); }
    if (r.outline && handL) for (let j = 0; j < tw * th; j++) { const x = j % tw, y = (j / tw) | 0; if (inPane(x, y) && handL[j] > 0) pane.put(at(x, y), c, 0.95 * handL[j]); } }
  // the pane over the chamber's light, fading 22 px to the shelf
  out.over(pane, 0, 0, (xx, yy) => clamp01((H - 0.5 - yy) / CHAMBER.fade));
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

// ---- registering (the picture kinds pictures.mjs hands here) ----
export function registerReading(r, env) {
  if (hasAsset(r.id)) return;
  const made = (w, h, f) => registerAsset({ id: r.id, w, h, status: "derived", until: null, build: () => { let data = null; return { w, h, rgba: () => data ?? (data = f()) }; } });
  switch (r.kind) {
    case "readchamber": return made(CHAMBER.size[0], CHAMBER.size[1], () => chamberPicture(r, env));
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
