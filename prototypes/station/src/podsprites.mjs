// The placeholder pod sprites (prototypes/ui/assets/placeholders/pod/, signed by the art director): two indexed sheets on
// the Station's 62-colour order and an atlas of sub-rectangles, per size class (large, medium, small, well). A pod is
// composed 1:1, never scaled: the body (sealed or identified) remapped to the species in one pass, the still glow at
// the class's glowAt remapped the same way, and, on identified pods only, the species glyph at glyphAt unmapped. A seal
// is the identified body with the band; breaking it is the band's removal (the sealed and identified pictures are
// both registered, and the Identify clip shows one above the cut and the other below).
import { PB, HEX, art } from "./pixels.mjs";
import { registerAsset, hasAsset } from "../../ui/assets.mjs";

let ATLAS = null; const SHEETS = {};   // name -> { w, h, idx: Int16Array (palette index, -1 clear) }
const hexIndex = new Map(HEX.map((h, i) => [h.toLowerCase(), i]));

// Fetch the atlas and its two sheets beside the page and decode them to palette indices (a sheet pixel's colour is one of the 62 exactly).
export async function loadPodSprites(base) {
  ATLAS = await (await fetch(new URL("pod-atlas.json", base), { cache: "no-store" })).json();
  for (const name of new Set(Object.values(ATLAS.sprites).map((s) => s.sheet))) {
    const bmp = await createImageBitmap(await (await fetch(new URL(name, base), { cache: "no-store" })).blob(), { premultiplyAlpha: "none", colorSpaceConversion: "none" });
    const cv = document.createElement("canvas"); cv.width = bmp.width; cv.height = bmp.height;
    const g = cv.getContext("2d", { willReadFrequently: true }); g.drawImage(bmp, 0, 0);
    const d = g.getImageData(0, 0, cv.width, cv.height).data, idx = new Int16Array(cv.width * cv.height);
    for (let i = 0; i < idx.length; i++) { const hx = "#" + [d[i * 4], d[i * 4 + 1], d[i * 4 + 2]].map((v) => v.toString(16).padStart(2, "0")).join(""); idx[i] = d[i * 4 + 3] < 128 ? -1 : (hexIndex.get(hx) ?? -1); }
    SHEETS[name] = { w: cv.width, h: cv.height, idx };
  }
  // the two sheets themselves are in the manifest, from the atlas's own entries (the pods are composed from their sub-rectangles)
  for (const m of ATLAS.manifest) if (!hasAsset(m.id)) registerAsset({ id: m.id, w: m.w, h: m.h, policy: m.policy, status: m.status, until: "the pod renderer's masters (research-loop.md §6)", file: m.file, build: () => { const sh = SHEETS[m.file.split("/").pop()], pb = new PB(sh.w, sh.h); for (let i = 0; i < sh.idx.length; i++) if (sh.idx[i] >= 0) pb.p[i] = sh.idx[i]; return pb; } });
}
export const podClasses = () => ATLAS.classes;
// The class whose box is exactly [w, h].
export const classOfBox = (w, h) => Object.keys(ATLAS.classes).find((k) => ATLAS.classes[k].box[0] === w && ATLAS.classes[k].box[1] === h) || null;

const remapOf = (species) => {
  const r = ATLAS.species[species]?.remap; if (r) return Object.fromEntries(Object.entries(r).map(([a, b]) => [+a, b]));
  // a pod of a species not yet known is a quiet grey one: the foot ring's ramp (B) takes the shell's (A)
  // (the light end, frostS, goes to bone so the glow's core is warm, not cold)
  const A = ATLAS.ramps.A.indices, B = ATLAS.ramps.B.indices, bone = ATLAS.palette.names.indexOf("bone"), cold = A[A.length - 1];
  return { ...Object.fromEntries(B.map((b, i) => [b, A[i] === cold ? bone : A[i]])), [cold]: bone };
};
function put(pb, id, dx, dy, remap) {
  const s = ATLAS.sprites[id], sh = SHEETS[s.sheet];
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) { const c = sh.idx[(s.y + y) * sh.w + s.x + x]; if (c >= 0) pb.set(dx + x, dy + y, remap ? remap[c] ?? c : c); }
}
// A pod of a class and state (species null: unknown, a quiet grey pod).
export function podSprite(species, cls, state) {
  return art(`podsprite:${species || "-"}:${cls}:${state}`, () => {
    const k = ATLAS.classes[cls], pb = new PB(k.box[0], k.box[1]), map = remapOf(species);
    put(pb, k[state], 0, 0, map); put(pb, k.glow, k.glowAt[0], k.glowAt[1], map);
    if (state === "identified" && species) put(pb, `glyph.${cls}.${species}`, k.glyphAt[0], k.glyphAt[1], null);
    return pb;
  });
}
