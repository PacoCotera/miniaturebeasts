// The one scale (art desk R21-SCALE, extending R21-SITTING, 2026-11-06 23:10): every kind has ONE factor per scene class, set by the kind's STAND's figure height (the ink of its signed 304 x 312 stand, crest to feet) as a share of the
// scene's height, the same for every pose (asleep, habits, shake, calm: a pose is drawn at its stand's factor, never fitted to a box).
//   single-mibi scenes (the Habitat's glass, the Sitting): an adult is 0.40 of the scene's height
//   many-mibi scenes (Idle, the Home window, the Vivarium's rooms): an adult is 0.24 of the scene's height
//   a young mibi is 0.80 of its adult's figure height everywhere (the Pods slot excepted, as ruled)
//   the kind's size class scales both: small 0.80, medium 1.00, large 1.20 (the frame's pod.sizeClass)
//   the R21-SITTING cap still decides: no pose of the kind may pass 0.55 of the glass's width or 0.65 of its height (sittingKindScale), and when one would the whole kind is drawn smaller, in every scene, by the one ratio
// The pictures are the signed 304 x 312 coat pictures (or the painted stand of a kind with no coat) reduced once by the factor, feet on the ground line (layered-stand.mjs factorPicture); an old-art sprite never shares a scene with them.
import { asset as assetOf, manifest } from "../../ui/assets.mjs";
import { inkBox } from "./layered-stand.mjs";
import { placedAt } from "./stands.mjs";
import { frameOf } from "./genome.mjs";

export const SHARE = { single: 0.40, many: 0.24 };
export const YOUNG = 0.80;
export const SIZE_CLASS = { small: 0.80, medium: 1.00, large: 1.20 };
export const CAP = [0.55, 0.65];
// the scenes: the share class and the scene's height in px (the window's: home.json regions.window 362; Idle's whole 600; the Vivarium's window 472; the Habitat's and the Sitting's glass 408)
export const SCENES = { home: { share: "many", h: 362 }, idle: { share: "many", h: 600 }, vivarium: { share: "many", h: 472 }, habitat: { share: "single", h: 408 } };
export const GLASS = [544, 408];   // sitting.json regions.glass: the window the cap is measured on
// the views the scenes draw their mibis in (a view not here draws as before: tiles, cards, walls and thumbs keep their own sizes)
export const SCENE_OF_VIEW = { home: "home", idle: "idle", vivarium: "vivarium", habitat: "habitat" };

const INK = new Map();
// the figure height of a kind's stand, adult or juvenile (px at 304 x 312), or null when no stand is placed
export function standInk(sp, stage) {
  const ms = stage === "juvenile" ? "juvenile" : "adult", key = `${sp}|${ms}`; if (INK.has(key)) return INK.get(key);
  const id = `mibi-${ms}-${sp}-304x312`; let h = null;
  if (placedAt(id, 304, 312)) { const a = assetOf(id), b = inkBox(a.rgba(), a.w, a.h); h = b ? b[3] : null; }
  if (h != null) INK.set(key, h); return h;
}
export const classOf = (sp) => SIZE_CLASS[frameOf(sp)?.pod?.sizeClass ?? "medium"] ?? 1;

const CAPPED = new Map();
// The cap's ratio over every pose of the kind (the old sittingKindScale): the largest factor at which every placed pose (either stage) and marked picture is inside CAP of the window
export function sittingKindScale(sp, win, cap = CAP) {
  const key = `${sp}|${win}|${cap}`; if (CAPPED.has(key)) return CAPPED.get(key);
  let k = 1; const re = new RegExp(`^mibi-(?:(?:adult|juvenile)-${sp}(?:-(?:curl|shake|calm|puff|sniff|dig|glow))?|adult-${sp}-between-dark-lay-[a-z]+)-304x312$`);   // the painted pictures and the marked ones (every coat leaves the alpha alone, so one coat stands for all)
  for (const e of manifest()) { if (!re.test(e.id) || !placedAt(e.id, 304, 312)) continue; const a = assetOf(e.id), box = inkBox(a.rgba(), a.w, a.h); if (box) k = Math.min(k, cap[0] * win[0] / box[2], cap[1] * win[1] / box[3]); }
  k = Math.floor(k * 1000) / 1000; CAPPED.set(key, k); return k;
}
// the adult's figure height in px in a scene, before the cap
export const targetHeight = (sp, scene) => { const S = SCENES[scene]; return SHARE[S.share] * S.h * classOf(sp); };
// the factor (the art's reduction, 1 = the 304 cut as it is) a kind's stage is drawn at in a scene, for every pose; null when the kind has no stand placed
export function sceneFactor(sp, stage, scene) {
  const S = SCENES[scene]; if (!S) return null;
  const a = standInk(sp, "adult"); if (!a) return null;
  const single = targetHeight(sp, "habitat") / a, ratio = Math.min(1, sittingKindScale(sp, GLASS) / single);   // the cap, as one ratio over the kind's every scene
  const t = targetHeight(sp, scene) * ratio;
  if (stage !== "juvenile") return Math.floor(t / a * 10000) / 10000;
  const j = standInk(sp, "juvenile"); return j ? Math.floor(YOUNG * t / j * 10000) / 10000 : null;
}
// The table of factors: { <kind>: { <scene>: { adult, juvenile } } } for the kinds given
export function scaleTable(kinds) {
  const out = {}; for (const sp of kinds) { out[sp] = {}; for (const sc of Object.keys(SCENES)) out[sp][sc] = { adult: sceneFactor(sp, "adult", sc), juvenile: sceneFactor(sp, "juvenile", sc) }; }
  return out;
}
