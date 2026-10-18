// The layered stand: a base picture and, for each look a stand can show, cut-out layers placed on it, chosen by `drawnLooks` (looks.mjs). It is generic over loci: the layers are data
// (ui/assets/stands/index.json: { trait, looks: [the looks it draws for], order, op, file } per layer), so a new locus's layers plug in with no code change. A look with no layer draws as the base for that trait.
// The composition is made once in the logic process and kept in the asset cache by id, like the stamp; the face shows the picture 1:1 and never knows a layer existed.
//   op "over"   the layer's pixels are laid over the picture (straight alpha, the usual "over");
//   op "erase"  the layer's alpha is how much alpha the picture loses there (a crest taken off).
//   op "under"  the contact shadow (T-20261018-235, build-spec §3): its own 304×48 canvas, drawn before the base, its row `feetRow` on the stand's feet line (`standFeet`), for the views it names; the stand's canvas is
//               extended below to hold it, and the whole is reduced once by the figure's factor. It is not a look, so it has no trait; `figure` (the drawn bbox of the figure alone, ink alpha >= 128) never includes it.
// Layers are applied in `order`. Everything is derived down from the close stand, never scaled up (tools/make-stand-layers.py cuts every size).
import { standKey, keyToken } from "./looks.mjs";

// The art is cut once, at the close stand's 304×312. The figure is composed at the size a place wants HERE, in the logic process (the face never scales). The picture is the place's own size, because the face places a picture 1:1
// in its slot: the figure is fitted into the config's figure box by the one factor that fits, bottom-centred in the picture, transparent around it, so its feet stay on the picture's foot. The figure box is a parameter of the picture
// and goes into its variant, so another figure size is another picture id. The config is ui/specs/station/stand-sizes.json (`views`: a view's figure heights; `places`: the sizes that are standing poses). A size that is not a
// place is not a standing pose (the sleeper's curl, 96×88) and is not layered. Nothing is scaled up past the art.
let INDEX = null, PIXELS = new Map(), SIZES = null;
// index: ui/assets/stands/index.json; pixels: (file) -> { w, h, rgba() } (the page's decoder, or Node's decodePNG in the tests and the host); null clears
export function setStandLayers(index, pixels = null) {
  INDEX = index; PIXELS = new Map(); COMPOSED.clear(); CURLS.clear();
  if (index && pixels) for (const f of Object.keys(index.files)) { const p = pixels(f); if (p) PIXELS.set(f, p); }
}
export const setStandSizes = (json) => { SIZES = json ?? null; };
export const standLayersLoaded = () => !!INDEX;
export const standLayersStatus = () => INDEX?.status ?? null;
const stageKey = (stage) => (stage === "elder" ? "adult" : stage);   // an elder takes the adult's stand
const ART_SIZE = "304x312";
// The figure box a view draws a stage's stand in: the config's `views[view][stage]` is the figure's height in px (crest to feet), the box is the canvas scaled to that; a view or stage the table does not give draws
// the whole canvas fitted in the place (a tile, the Companion: unchanged). `places` lists the sizes that are standing poses.
export function figureBox(stand, place, view) {
  const h = SIZES?.views?.[view]?.[stageKey(stand.stage ?? "adult")]; if (!h) return [...place];
  const fig = INDEX.stands[stand.species][stand.stage].figure, fh = fig[3] - fig[1] + 1, [cw, ch] = ART_SIZE.split("x").map(Number), s = h / fh;
  return [Math.max(1, Math.round(cw * s)), Math.max(1, Math.round(ch * s))];
}
// the layered stand of a species and stage for a place (the size a view asks) in a view, or null: { species, stage, size (the picture: the place's), figure (the box the figure is fitted in), traits, base, layers }, every file loaded
export function layeredStand(species, stage, place, view = "default") {
  const st = stageKey(stage), set = INDEX?.stands?.[species]?.[st]; if (!set) return null;
  if (!SIZES?.places?.includes(`${place[0]}x${place[1]}`)) return null;
  const [cw, ch] = ART_SIZE.split("x").map(Number), sz = set.sizes?.[ART_SIZE]; if (!sz || !PIXELS.has(sz.base) || !Object.values(sz.bases ?? {}).every((f) => PIXELS.has(f)) || !sz.layers.every((l) => PIXELS.has(l.file))) return null;
  const stand = { species, stage: st, size: [...place], view, traits: set.traits, base: sz.base, bases: sz.bases ?? {}, layers: sz.layers }, figure = figureBox(stand, place, view);
  const fig = set.figure, sc = Math.min(figure[0] / cw, figure[1] / ch);   // never up past the art, and the figure itself (not the canvas around it) must fit its picture
  if (sc > 1 || (fig[2] - fig[0] + 1) * sc > place[0] + 0.5 || (fig[3] - fig[1] + 1) * sc > place[1] + 0.5) return null;
  return { ...stand, figure };
}
// The base a mibi's coat calls for: a coat the stand has a painted base for (the version 4 colours, recoloured by the signed ramps), else the stand's own base (charcoal, or a coat it has no ramp for)
export const baseFor = (stand, looks) => stand.bases[looks.colour] ?? stand.base;
// The layers a mibi's looks call for, in order: a layer whose trait shows exactly its look
export const layersFor = (stand, looks) => stand.layers.filter((l) => l.op !== "under" && l.looks.includes(looks[l.trait])).sort((a, b) => a.order - b.order || a.file.localeCompare(b.file));
// The stand's contact shadow layer for its view, or null (only the views the layer names get one)
export const underOf = (stand) => stand.layers.find((l) => l.op === "under" && l.views.includes(stand.view)) ?? null;
// The picture's variant key for a stand and a mibi's looks: the looks the stand HAS a layer for (a trait it cannot show, or a look it has no layer for, is the base), so two mibis that draw the same pixels are one picture
export function standVariant(stand, looks) { const shown = {}; if (stand.bases[looks.colour]) shown.colour = looks.colour; for (const l of layersFor(stand, looks)) shown[l.trait] = looks[l.trait]; const key = standKey(stand.species, stand.traits, shown) + "@" + stand.figure.join("x") + (underOf(stand) ? "+u" : ""); return { key, token: keyToken(key) }; }
export const standPictureId = (stand, looks, light = "day") => { const { token } = standVariant(stand, looks); return `mibi:${stand.species}~${token}:${stand.stage}:${stand.size[0]}x${stand.size[1]}${light === "day" ? "" : ":" + light}`; };

// Scaling down (Lanczos 3, premultiplied alpha, separable): the canvas fitted into w×h by the one factor that fits, bottom-centred, transparent around
const lanczos = (x) => { x = Math.abs(x); if (x < 1e-9) return 1; if (x >= 3) return 0; const px = Math.PI * x; return (3 * Math.sin(px) * Math.sin(px / 3)) / (px * px); };
export function taps(n, m) {   // for each of m output samples, its source indexes and weights over n source samples
  const sc = n / m, f = Math.max(1, sc), out = [];
  for (let o = 0; o < m; o++) {
    const c = (o + 0.5) * sc, lo = Math.max(0, Math.floor(c - 3 * f)), hi = Math.min(n - 1, Math.ceil(c + 3 * f)), idx = [], wt = []; let sum = 0;
    for (let i = lo; i <= hi; i++) { const w = lanczos((i + 0.5 - c) / f); if (w !== 0) { idx.push(i); wt.push(w); sum += w; } }
    out.push({ idx, wt: wt.map((w) => w / sum) });
  }
  return out;
}
export function fitDown(src, sw, sh, bw, bh, w = bw, h = bh) {   // the sw×sh picture fitted into a bw×bh box, bottom-centred in a w×h picture
  if (bw === sw && bh === sh && w === sw && h === sh) return src;
  return fitDownBy(src, sw, sh, Math.min(bw / sw, bh / sh), w, h);
}
export function fitDownBy(src, sw, sh, s, w, h) {   // the sw×sh picture reduced by the factor s, bottom-centred in a w×h picture
  const nw = Math.max(1, Math.round(sw * s)), nh = Math.max(1, Math.round(sh * s)), tx = taps(sw, nw), ty = taps(sh, nh);
  const mid = new Float32Array(nw * sh * 4);
  for (let y = 0; y < sh; y++) for (let x = 0; x < nw; x++) { let r = 0, g = 0, b = 0, a = 0; const t = tx[x];
    for (let k = 0; k < t.idx.length; k++) { const i = (y * sw + t.idx[k]) * 4, al = src[i + 3] / 255, wgt = t.wt[k]; r += src[i] * al * wgt; g += src[i + 1] * al * wgt; b += src[i + 2] * al * wgt; a += al * wgt; }
    const o = (y * nw + x) * 4; mid[o] = r; mid[o + 1] = g; mid[o + 2] = b; mid[o + 3] = a; }
  const out = new Uint8ClampedArray(w * h * 4), ox = (w - nw) >> 1, oy = h - nh;
  for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) { let r = 0, g = 0, b = 0, a = 0; const t = ty[y];
    for (let k = 0; k < t.idx.length; k++) { const i = (t.idx[k] * nw + x) * 4, wgt = t.wt[k]; r += mid[i] * wgt; g += mid[i + 1] * wgt; b += mid[i + 2] * wgt; a += mid[i + 3] * wgt; }
    const px = ox + x, py = oy + y; if (px < 0 || px >= w || py < 0 || py >= h) continue;
    const o = (py * w + px) * 4; a = Math.min(1, Math.max(0, a)); if (a > 0) { out[o] = r / a; out[o + 1] = g / a; out[o + 2] = b / a; } out[o + 3] = Math.round(a * 255); }
  return out;
}

// The art of a stand's looks on the close canvas (304×312): the base with the layers laid on it
function artOf(stand, looks) {
  const [cw, ch] = ART_SIZE.split("x").map(Number), b = PIXELS.get(baseFor(stand, looks)).rgba(), out = new Uint8ClampedArray(b);
  if (out.length !== cw * ch * 4) throw new Error(`stand ${stand.species}: the base is not ${cw}×${ch}`);
  for (const l of layersFor(stand, looks)) {
    const s = PIXELS.get(l.file).rgba(); if (s.length !== out.length) throw new Error(`stand layer ${l.file} is not ${cw}×${ch}`);
    for (let i = 0; i < out.length; i += 4) {
      const sa = s[i + 3]; if (!sa) continue;
      if (l.op === "erase") { out[i + 3] = Math.max(0, out[i + 3] - sa); continue; }
      const da = out[i + 3], oa = sa + da * (255 - sa) / 255;
      if (oa <= 0) continue;
      for (let c = 0; c < 3; c++) out[i + c] = Math.round((s[i + c] * sa + out[i + c] * da * (255 - sa) / 255) / oa);
      out[i + 3] = Math.round(oa);
    }
  }
  return out;
}
// The drawn bbox of a picture, [dx, dy, W, H]: the pixels with ink alpha >= 128 (build-spec §0), or null when it has none
export function inkBox(px, w, h, alpha = 128) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (px[(y * w + x) * 4 + 3] >= alpha) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 < 0 ? null : [x0, y0, x1 - x0 + 1, y1 - y0 + 1];
}
// The shadow laid under the art on a canvas extended below to hold it: the art's rows 0..ch, the shadow's row `feetRow` on the stand's feet row; { px, h } the extended canvas
function withShadow(art, cw, ch, under, shadow) {
  const top = under.standFeet - under.feetRow, rows = Math.max(ch, top + under.canvas[1]), px = new Uint8ClampedArray(cw * rows * 4);
  const s = shadow.rgba();
  for (let y = 0; y < under.canvas[1]; y++) for (let x = 0; x < cw; x++) { const i = (y * cw + x) * 4, o = ((top + y) * cw + x) * 4; px.set(s.subarray(i, i + 4), o); }
  for (let i = 0; i < cw * ch * 4; i += 4) {   // the art over the shadow (straight alpha)
    const sa = art[i + 3]; if (!sa) continue;
    const da = px[i + 3], oa = sa + da * (255 - sa) / 255;
    for (let c = 0; c < 3; c++) px[i + c] = Math.round((art[i + c] * sa + px[i + c] * da * (255 - sa) / 255) / oa);
    px[i + 3] = Math.round(oa);
  }
  return { px, h: rows };
}
// The factor the figure is reduced by (never up past the art), and the composed picture with its figure: { w, h, rgba(), figure: [dx, dy, W, H] | null }. The layers are laid on the canvas, the shadow under them on a canvas
// extended below, then the whole is reduced once. The figure is the bbox of the same reduction without the shadow, so it is the figure's own and the shadow never moves it. Kept by the picture's variant.
const COMPOSED = new Map();
export const scaleOf = (stand) => { const [cw, ch] = ART_SIZE.split("x").map(Number); return Math.min(stand.figure[0] / cw, stand.figure[1] / ch); };
function composed(stand, looks) {
  const key = standVariant(stand, looks).key; if (COMPOSED.has(key)) return COMPOSED.get(key);
  const [cw, ch] = ART_SIZE.split("x").map(Number), [w, h] = stand.size, [fw, fh] = stand.figure, art = artOf(stand, looks), under = underOf(stand);
  let px, figure;
  if (!under) { px = fitDown(art, cw, ch, fw, fh, w, h); figure = inkBox(px, w, h); }
  else {
    const s = scaleOf(stand), full = withShadow(art, cw, ch, under, PIXELS.get(under.file)), plain = new Uint8ClampedArray(cw * full.h * 4); plain.set(art);   // the same canvas without the shadow
    px = fitDownBy(full.px, cw, full.h, s, w, h); figure = inkBox(fitDownBy(plain, cw, full.h, s, w, h), w, h);
  }
  const r = { w, h, px, figure }; COMPOSED.set(key, r); return r;
}
export function composeStand(stand, looks) { const c = composed(stand, looks); return { w: c.w, h: c.h, rgba: () => c.px, figure: c.figure }; }
// A stand's figure, [dx, dy, W, H] in its picture (build-spec §0): the logic process's, part of the stand's cache entry
export const standFigure = (stand, looks) => composed(stand, looks).figure;

// ---- the sleeper's curl at world size (build-spec §5, the art director's ruling) ----
// The nap picture (the 96×88 master) reduced by the standing figure's factor for its stage: the view's figure height over the standing slot's (54 / 152 for an adult, 40 / 112 for a juvenile), about 34 × 31, with the curl's own
// shadow under it, reduced by the stand's factor (the same rule as the standing shadow) and its row `feetRow` on the curl's last ink row. The picture is as wide as the curl and its shadow and as tall as both. { w, h, rgba(), figure }.
export function curlFactor(stage, view, slotH) { const h = SIZES?.views?.[view]?.[stageKey(stage)]; return h ? h / slotH : null; }
const CURLS = new Map();   // kept by the master, the stage, the factor and the view; a different master picture under the same id is a new entry
export function curlPicture(src, species, stage, factor, view = "vivarium", id = "") {
  const key = `${id}|${species}|${stage}|${factor}|${view}`, have = CURLS.get(key); if (id && have && have.src === src) return have.pic;
  const pic = curlBuild(src, species, stage, factor, view); if (id) CURLS.set(key, { src, pic }); return pic;
}
function curlBuild(src, species, stage, factor, view) {   // src: { w, h, rgba() } the nap master; stage as the master is (adult / juvenile)
  const st = stageKey(stage), set = INDEX?.stands?.[species]?.[st], shadowFile = set?.curl?.shadow, shadow = shadowFile && PIXELS.get(shadowFile);
  const nw = Math.max(1, Math.round(src.w * factor)), nh = Math.max(1, Math.round(src.h * factor)), curl = fitDownBy(src.rgba(), src.w, src.h, factor, nw, nh), cb = inkBox(curl, nw, nh);
  if (!cb) return { w: nw, h: nh, rgba: () => curl, figure: null };
  const last = cb[1] + cb[3] - 1;   // the curl's last ink row
  let sp = null, sw = 0, sh = 0, fr = 0;
  if (shadow) { const stand = layeredStand(species, stage, [144, 152], view) ?? layeredStand(species, stage, [104, 112], view); if (stand) {
    const s = scaleOf(stand), [cw] = ART_SIZE.split("x").map(Number); sw = Math.max(1, Math.round(cw * s)); sh = Math.max(1, Math.round(set.curl.canvas[1] * s)); sp = fitDownBy(shadow.rgba(), cw, set.curl.canvas[1], s, sw, sh); fr = Math.floor((set.curl.feetRow + 0.5) * s); } }
  const top = sp ? last - fr : 0, y0 = Math.min(0, top), y1 = Math.max(nh, sp ? top + sh : nh), pw = Math.max(nw, sw), ph = y1 - y0, out = new Uint8ClampedArray(pw * ph * 4);
  if (sp) for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) { const i = (y * sw + x) * 4, o = ((top - y0 + y) * pw + ((pw - sw) >> 1) + x) * 4; out.set(sp.subarray(i, i + 4), o); }
  const ox = (pw - nw) >> 1, oy = -y0;
  for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
    const i = (y * nw + x) * 4, o = ((oy + y) * pw + ox + x) * 4, sa = curl[i + 3]; if (!sa) continue;
    const da = out[o + 3], oa = sa + da * (255 - sa) / 255;
    for (let c = 0; c < 3; c++) out[o + c] = Math.round((curl[i + c] * sa + out[o + c] * da * (255 - sa) / 255) / oa);
    out[o + 3] = Math.round(oa);
  }
  const figure = [cb[0] + ox, cb[1] + oy, cb[2], cb[3]];
  return { w: pw, h: ph, rgba: () => out, figure };
}

// The picture resampled to nw x nh (Lanczos 3, premultiplied alpha, either way): the logic process's one resampler, for the pictures that are rendered at a size the art was not cut at (T-20261016-222: the capsule's pod). Returns straight-alpha RGBA.
export function resample(src, sw, sh, nw, nh) {
  if (nw === sw && nh === sh) return new Uint8ClampedArray(src);
  const tx = taps(sw, nw), ty = taps(sh, nh), mid = new Float32Array(nw * sh * 4);
  for (let y = 0; y < sh; y++) for (let x = 0; x < nw; x++) { let r = 0, g = 0, b = 0, a = 0; const t = tx[x];
    for (let k = 0; k < t.idx.length; k++) { const i = (y * sw + t.idx[k]) * 4, al = src[i + 3] / 255, wgt = t.wt[k]; r += src[i] * al * wgt; g += src[i + 1] * al * wgt; b += src[i + 2] * al * wgt; a += al * wgt; }
    const o = (y * nw + x) * 4; mid[o] = r; mid[o + 1] = g; mid[o + 2] = b; mid[o + 3] = a; }
  const out = new Uint8ClampedArray(nw * nh * 4);
  for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) { let r = 0, g = 0, b = 0, a = 0; const t = ty[y];
    for (let k = 0; k < t.idx.length; k++) { const i = (t.idx[k] * nw + x) * 4, wgt = t.wt[k]; r += mid[i] * wgt; g += mid[i + 1] * wgt; b += mid[i + 2] * wgt; a += mid[i + 3] * wgt; }
    const o = (y * nw + x) * 4; a = Math.min(1, Math.max(0, a)); if (a > 0) { out[o] = r / a; out[o + 1] = g / a; out[o + 2] = b / a; } out[o + 3] = Math.round(a * 255); }
  return out;
}
