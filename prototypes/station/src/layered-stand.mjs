// The layered stand: a base picture and, for each look a stand can show, cut-out layers placed on it, chosen by `drawnLooks` (looks.mjs). It is generic over loci: the layers are data
// (ui/assets/stands/index.json: { trait, looks: [the looks it draws for], order, op, file } per layer), so a new locus's layers plug in with no code change. A look with no layer draws as the base for that trait.
// The composition is made once in the logic process and kept in the asset cache by id, like the stamp; the face shows the picture 1:1 and never knows a layer existed.
//   op "over"   the layer's pixels are laid over the picture (straight alpha, the usual "over");
//   op "erase"  the layer's alpha is how much alpha the picture loses there (a crest taken off).
// Layers are applied in `order`. Everything is derived down from the close stand, never scaled up (tools/make-stand-layers.py cuts every size).
import { standKey, keyToken } from "./looks.mjs";

// The art is cut once, at the close stand's 304×312. The figure is composed at the size a place wants HERE, in the logic process (the face never scales). The picture is the place's own size, because the face places a picture 1:1
// in its slot: the figure is fitted into the config's figure box by the one factor that fits, bottom-centred in the picture, transparent around it, so its feet stay on the picture's foot. The figure box is a parameter of the picture
// and goes into its variant, so another figure size is another picture id. The config is ui/specs/station/stand-sizes.json (`views`: a view's figure heights; `places`: the sizes that are standing poses). A size that is not a
// place is not a standing pose (the sleeper's curl, 96×88) and is not layered. Nothing is scaled up past the art.
let INDEX = null, PIXELS = new Map(), SIZES = null;
// index: ui/assets/stands/index.json; pixels: (file) -> { w, h, rgba() } (the page's decoder, or Node's decodePNG in the tests and the host); null clears
export function setStandLayers(index, pixels = null) {
  INDEX = index; PIXELS = new Map();
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
  const [cw, ch] = ART_SIZE.split("x").map(Number), sz = set.sizes?.[ART_SIZE]; if (!sz || !PIXELS.has(sz.base) || !sz.layers.every((l) => PIXELS.has(l.file))) return null;
  const stand = { species, stage: st, size: [...place], view, traits: set.traits, base: sz.base, layers: sz.layers }, figure = figureBox(stand, place, view);
  const fig = set.figure, sc = Math.min(figure[0] / cw, figure[1] / ch);   // never up past the art, and the figure itself (not the canvas around it) must fit its picture
  if (sc > 1 || (fig[2] - fig[0] + 1) * sc > place[0] + 0.5 || (fig[3] - fig[1] + 1) * sc > place[1] + 0.5) return null;
  return { ...stand, figure };
}
// The layers a mibi's looks call for, in order: a layer whose trait shows exactly its look
export const layersFor = (stand, looks) => stand.layers.filter((l) => l.looks.includes(looks[l.trait])).sort((a, b) => a.order - b.order || a.file.localeCompare(b.file));
// The picture's variant key for a stand and a mibi's looks: the looks the stand HAS a layer for (a trait it cannot show, or a look it has no layer for, is the base), so two mibis that draw the same pixels are one picture
export function standVariant(stand, looks) { const shown = {}; for (const l of layersFor(stand, looks)) shown[l.trait] = looks[l.trait]; const key = standKey(stand.species, stand.traits, shown) + "@" + stand.figure.join("x"); return { key, token: keyToken(key) }; }
export const standPictureId = (stand, looks, light = "day") => { const { token } = standVariant(stand, looks); return `mibi:${stand.species}~${token}:${stand.stage}:${stand.size[0]}x${stand.size[1]}${light === "day" ? "" : ":" + light}`; };

// Scaling down (Lanczos 3, premultiplied alpha, separable): the canvas fitted into w×h by the one factor that fits, bottom-centred, transparent around
const lanczos = (x) => { x = Math.abs(x); if (x < 1e-9) return 1; if (x >= 3) return 0; const px = Math.PI * x; return (3 * Math.sin(px) * Math.sin(px / 3)) / (px * px); };
function taps(n, m) {   // for each of m output samples, its source indexes and weights over n source samples
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
  const s = Math.min(bw / sw, bh / sh), nw = Math.max(1, Math.round(sw * s)), nh = Math.max(1, Math.round(sh * s)), tx = taps(sw, nw), ty = taps(sh, nh);
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

// The composed picture at the place's size, the figure at its box: { w, h, rgba() } with straight alpha. The layers are laid on the canvas, then the whole is fitted down once.
export function composeStand(stand, looks) {
  const [cw, ch] = ART_SIZE.split("x").map(Number), [w, h] = stand.size, [fw, fh] = stand.figure, b = PIXELS.get(stand.base).rgba(), out = new Uint8ClampedArray(b);
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
  const px = fitDown(out, cw, ch, fw, fh, w, h);
  return { w, h, rgba: () => px };
}
