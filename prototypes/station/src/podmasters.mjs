// The pod from its signed layers (the Pods masters, prototypes/ui/assets/masters): one painted pod per size class (shade, mask-body, mask-accent, a pattern, the band),
// recoloured by the species' colour pair in the page (ui/podlayers.mjs) and handed on as a picture at the class's size. Only when the layers are placed.
import { asset as assetOf, assetEntry, isFilled } from "../../ui/assets.mjs";
import { composePod, patternLayer } from "../../ui/podlayers.mjs";

const need = (cls) => ["shade", "mask-body", "mask-accent"].map((l) => `pod-${cls}-${l}`);
export const layersPlaced = (cls) => need(cls).every(isFilled);
const pixels = (id) => { const a = assetOf(id); const g = a.canvas().getContext("2d", { willReadFrequently: true }); return { w: a.w, h: a.h, data: g.getImageData(0, 0, a.w, a.h).data }; };

// cls: "large" | "medium" | "small"; pair: ["#rrggbb", "#rrggbb"]; shellPattern: the frame's words; patterns: the spec's word-to-layer map; sealed: the band over the pod
export function podFromLayers(cls, pair, shellPattern, patterns, sealed) {
  let cv = null;
  const make = () => {
    const sh = pixels(`pod-${cls}-shade`), L = { shade: sh.data, body: pixels(`pod-${cls}-mask-body`).data, accent: pixels(`pod-${cls}-mask-accent`).data };
    const pl = patternLayer(shellPattern || "", patterns); if (pl && isFilled(`pod-${cls}-pattern-${pl}`)) { L.pattern = pixels(`pod-${cls}-pattern-${pl}`).data; if (isFilled(`pod-${cls}-pattern-${pl}-relief`)) L.relief = pixels(`pod-${cls}-pattern-${pl}-relief`).data; }
    if (sealed && isFilled(`pod-${cls}-band`)) L.band = pixels(`pod-${cls}-band`).data;
    const data = composePod(L, pair[0], pair[1], sh.w, sh.h, { sealed });
    cv = document.createElement("canvas"); cv.width = sh.w; cv.height = sh.h; const g = cv.getContext("2d"), id = g.createImageData(sh.w, sh.h); id.data.set(data); g.putImageData(id, 0, 0); return cv;
  };
  const a = assetOf(`pod-${cls}-shade`);
  return { w: a.w, h: a.h, canvas: () => cv || make() };
}

// The figure beside the pod: the species' two slices, the mist one and the clear one, laid one over the other with the clear layer's alpha (chapters read ÷ chapters); no blur.
// Until both slices are placed it is an empty picture.
export function figureFromLayers(mistId, clearId, alpha, [w, h]) {
  let cv = null;
  const a = isFilled(mistId) ? assetOf(mistId) : null;
  const make = () => {
    cv = document.createElement("canvas"); cv.width = w; cv.height = h; if (!a || !isFilled(clearId)) return cv;
    const held = assetEntry(clearId)?.status === "held" || assetEntry(mistId)?.status === "held";   // a held figure shows its mist in both states, with no fade
    const m = pixels(mistId).data, c = pixels(clearId).data, out = new Uint8ClampedArray(m.length), t = held ? 0 : Math.max(0, Math.min(1, alpha));
    for (let i = 0; i < m.length; i += 4) {   // laid over each other with the clear layer's alpha scaled by t: in premultiplied terms, so a transparent pixel adds no colour
      const am = m[i + 3] / 255, ac = (c[i + 3] / 255) * t, a = ac + am * (1 - ac);
      for (let k = 0; k < 3; k++) out[i + k] = a ? Math.round((c[i + k] * ac + m[i + k] * am * (1 - ac)) / a) : 0;
      out[i + 3] = Math.round(a * 255);
    }
    const g = cv.getContext("2d"), id = g.createImageData(w, h); id.data.set(out); g.putImageData(id, 0, 0); return cv;
  };
  return { w, h, canvas: () => cv || make() };
}
