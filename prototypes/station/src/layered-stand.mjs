// The layered stand: a base picture and, for each look a stand can show, cut-out layers placed on it, chosen by `drawnLooks` (looks.mjs). It is generic over loci: the layers are data
// (ui/assets/stands/index.json: { trait, looks: [the looks it draws for], order, op, file } per layer), so a new locus's layers plug in with no code change. A look with no layer draws as the base for that trait.
// The composition is made once in the logic process and kept in the asset cache by id, like the stamp; the face shows the picture 1:1 and never knows a layer existed.
//   op "over"   the layer's pixels are laid over the picture (straight alpha, the usual "over");
//   op "erase"  the layer's alpha is how much alpha the picture loses there (a crest taken off).
// Layers are applied in `order`. Everything is derived down from the close stand, never scaled up (tools/make-stand-layers.py cuts every size).
import { standKey, keyToken } from "./looks.mjs";

let INDEX = null, PIXELS = new Map();
// index: ui/assets/stands/index.json; pixels: (file) -> { w, h, rgba() } (the page's decoder, or Node's decodePNG in the tests and the host); null clears
export function setStandLayers(index, pixels = null) {
  INDEX = index; PIXELS = new Map();
  if (index && pixels) for (const f of Object.keys(index.files)) { const p = pixels(f); if (p) PIXELS.set(f, p); }
}
export const standLayersLoaded = () => !!INDEX;
export const standLayersStatus = () => INDEX?.status ?? null;
const stageKey = (stage) => (stage === "elder" ? "adult" : stage);   // an elder takes the adult's stand
// the layered stand of a species, stage and size, or null: { species, stage, size, traits, base, layers }, every file loaded
export function layeredStand(species, stage, [w, h]) {
  const set = INDEX?.stands?.[species]?.[stageKey(stage)]; if (!set) return null;
  const sz = set.sizes?.[`${w}x${h}`]; if (!sz || !PIXELS.has(sz.base) || !sz.layers.every((l) => PIXELS.has(l.file))) return null;
  return { species, stage: stageKey(stage), size: [w, h], traits: set.traits, base: sz.base, layers: sz.layers };
}
// The layers a mibi's looks call for, in order: a layer whose trait shows exactly its look
export const layersFor = (stand, looks) => stand.layers.filter((l) => l.looks.includes(looks[l.trait])).sort((a, b) => a.order - b.order || a.file.localeCompare(b.file));
// The picture's variant key for a stand and a mibi's looks: the looks the stand HAS a layer for (a trait it cannot show, or a look it has no layer for, is the base), so two mibis that draw the same pixels are one picture
export function standVariant(stand, looks) { const shown = {}; for (const l of layersFor(stand, looks)) shown[l.trait] = looks[l.trait]; const key = standKey(stand.species, stand.traits, shown); return { key, token: keyToken(key) }; }
export const standPictureId = (stand, looks, light = "day") => { const { token } = standVariant(stand, looks); return `mibi:${stand.species}~${token}:${stand.stage}:${stand.size[0]}x${stand.size[1]}${light === "day" ? "" : ":" + light}`; };

// The composed picture: { w, h, rgba() } with straight alpha
export function composeStand(stand, looks) {
  const [w, h] = stand.size, b = PIXELS.get(stand.base).rgba(), out = new Uint8ClampedArray(b);
  if (out.length !== w * h * 4) throw new Error(`stand ${stand.species}: the base is not ${w}×${h}`);
  for (const l of layersFor(stand, looks)) {
    const s = PIXELS.get(l.file).rgba(); if (s.length !== out.length) throw new Error(`stand layer ${l.file} is not ${w}×${h}`);
    for (let i = 0; i < out.length; i += 4) {
      const sa = s[i + 3]; if (!sa) continue;
      if (l.op === "erase") { out[i + 3] = Math.max(0, out[i + 3] - sa); continue; }
      const da = out[i + 3], oa = sa + da * (255 - sa) / 255;
      if (oa <= 0) continue;
      for (let c = 0; c < 3; c++) out[i + c] = Math.round((s[i + c] * sa + out[i + c] * da * (255 - sa) / 255) / oa);
      out[i + 3] = Math.round(oa);
    }
  }
  return { w, h, rgba: () => out };
}
