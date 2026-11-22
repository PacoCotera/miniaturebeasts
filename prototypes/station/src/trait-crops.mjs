// The pictures of a trait's scale ends and a set's cards (station-build-2; AD route fb2167): CROPS of the signed S01 coat and marking masters, nothing painted, nothing drawn by code. Each entry names the
// signed master it is cut from (ui/assets/masters/provenance.json: the coat recolour R21-COAT-V8 and the game art hand-off, both signed by the art lead) and the window of that master (x, y, w, h in its 304 x 312
// pixels). A crop is that window reduced once (Lanczos) to the size the shape picture places it at; the file for the art director to sign is the same function's output (tools/cut-trait-crops.mjs).
//   ends  per scale trait: [low, mid, high] = the master of the kind's low end, middle and high end (Tint: redder, between, yellower; Shade: dark, between, light), one square window of the coat
//   cards per set trait: look -> master (Markings: the between-between coat with the look's layout; plain is that coat bare), one wide window of the flank
// Only the Loika (S01) has them; a trait or a kind with no entry keeps its empty slots (shape-pictures slotsOf).
export const ART = [304, 312];
const COAT = (t, s) => `mibi-adult-S01-${t}-${s}-304x312`;
const LAY = (l) => `mibi-adult-S01-between-between-lay-${l}-304x312`;
export const CROPS = {
  S01: {
    ends: {
      "body-hue": { window: [88, 70, 190, 190], masters: [COAT("redder", "between"), COAT("between", "between"), COAT("yellower", "between")] },
      "body-value": { window: [88, 70, 190, 190], masters: ["mibi-adult-S01-304x312", COAT("between", "between"), COAT("between", "light")] },   // the painted stand is the between-dark coat (stands.mjs PAINTED_COAT)
    },
    // her chapter's round portraits (station-match-5; the accepted walk-4-scale): the whole master of the kind at each end and in the middle, in the dark coat of the other trait (the painted stand is between-dark)
    round: {
      "body-hue": ["mibi-adult-S01-redder-dark-304x312", "mibi-adult-S01-304x312", "mibi-adult-S01-yellower-dark-304x312"],
      "body-value": ["mibi-adult-S01-304x312", COAT("between", "between"), COAT("between", "light")],
    },
    cards: {
      // station-build-3 (AD bus 233353): each look is windowed on its marking, on the back (x 20-190, y 100-215); spotted's master faces the other way, so its window is the right flank (x 150-300, y 150-265)
      markings: { window: [30, 125, 118, 80], windows: { spotted: [150, 160, 140, 80] }, masters: { plain: COAT("between", "between"), spotted: LAY("spots"), saddle: LAY("saddle"), shaded: LAY("gradient"), bands: LAY("bands"), patches: LAY("patches") },
        // her chapter's square cards (station-match-6; the accepted walk-4-set): the same signed masters, a square window of the flank (spotted's faces the other way)
        square: [25, 90, 135, 135], squares: { spotted: [173, 125, 135, 135] } },
    },
  },
};
// The art a model has: { ends: [master ids] , window } for a scale, { cards: { look: master id }, window } for a set; null when the kind or trait has none.
export function cropSpecOf(species, model) {
  const k = CROPS[species]; if (!k) return null;
  if (model.shape === "scale") { const e = k.ends[model.id]; return e ? { window: e.window, ends: e.masters } : null; }
  const c = k.cards[model.id]; return c ? { window: c.window, windows: c.windows ?? {}, cards: c.masters } : null;
}
// The masters of a scale's round portraits on her chapter: [low, middle, high], or null for a kind or trait with none (a plain disc stands in)
export const roundOf = (species, traitId) => CROPS[species]?.round?.[traitId] ?? null;
// A set card's master and square window on her chapter: { master, window }, or null for a kind, trait or look with none
export function squareOf(species, traitId, look) {
  const c = CROPS[species]?.cards?.[traitId], master = c?.masters?.[look]; return c?.square && master ? { master, window: c.squares?.[look] ?? c.square } : null;
}
// A window of a master's pixels ({ w, h, rgba }), reduced once to dw x dh with `resample` (layered-stand.mjs); a window past the art is clipped (transparent beyond).
export function cropPixels(src, window, dw, dh, resample) {
  const [x, y, w, h] = window, crop = new Uint8ClampedArray(w * h * 4);
  for (let j = 0; j < h; j++) { const sy = y + j; if (sy < 0 || sy >= src.h) continue; for (let i = 0; i < w; i++) { const sx = x + i; if (sx < 0 || sx >= src.w) continue; crop.set(src.rgba.subarray((sy * src.w + sx) * 4, (sy * src.w + sx) * 4 + 4), (j * w + i) * 4); } }
  return { w: dw, h: dh, rgba: resample(crop, w, h, dw, dh) };
}
// The window narrowed (centred) to the shape of a dw x dh picture, so the reduction never stretches the art
export function coverWindow(window, dw, dh) {
  const [x, y, w, h] = window, nw = Math.min(w, Math.round((h * dw) / dh)), nh = Math.min(h, Math.round((w * dh) / dw));
  return [x + Math.floor((w - nw) / 2), y + Math.floor((h - nh) / 2), nw, nh];
}
// A stable token of what a model's pictures are cut from (it goes into the picture's id, so a changed crop is another picture)
export const cropKey = (spec) => (spec ? JSON.stringify([spec.window, spec.windows ?? null, spec.ends ?? spec.cards]) : "");
