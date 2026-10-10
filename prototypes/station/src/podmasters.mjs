// The pod from its signed layers (the Pods masters, prototypes/ui/assets/masters): one painted pod per size class (shade, mask-body, mask-accent, a pattern, the band),
// recoloured by the species' colour pair in the page (ui/podlayers.mjs) and handed on as a picture at the class's size. Only when the layers are placed.
import { asset as assetOf, assetEntry, isFilled } from "../../ui/assets.mjs";
import { composePod, patternLayer, figureComposite, figureAlpha } from "../../ui/podlayers.mjs";

const need = (cls) => ["shade", "mask-body", "mask-accent"].map((l) => `pod-${cls}-${l}`);
export const layersPlaced = (cls) => need(cls).every(isFilled);
const pixels = (id) => { const a = assetOf(id); return { w: a.w, h: a.h, data: a.rgba() }; };

// cls: "large" | "medium" | "small"; pair: ["#rrggbb", "#rrggbb"]; shellPattern: the frame's words; patterns: the spec's word-to-layer map; sealed: the band over the pod
export function podFromLayers(cls, pair, shellPattern, patterns, sealed) {
  let cv = null, px = null;
  const make = () => {
    const sh = pixels(`pod-${cls}-shade`), L = { shade: sh.data, body: pixels(`pod-${cls}-mask-body`).data, accent: pixels(`pod-${cls}-mask-accent`).data };
    const pl = patternLayer(shellPattern || "", patterns); if (pl && isFilled(`pod-${cls}-pattern-${pl}`)) { L.pattern = pixels(`pod-${cls}-pattern-${pl}`).data; if (isFilled(`pod-${cls}-pattern-${pl}-relief`)) L.relief = pixels(`pod-${cls}-pattern-${pl}-relief`).data; }
    if (sealed && isFilled(`pod-${cls}-band`)) L.band = pixels(`pod-${cls}-band`).data;
    return composePod(L, pair[0], pair[1], sh.w, sh.h, { sealed });
  };
  const a = assetOf(`pod-${cls}-shade`), rgba = () => px || (px = make());
  return { w: a.w, h: a.h, rgba, canvas: () => { if (cv) return cv; cv = document.createElement("canvas"); cv.width = a.w; cv.height = a.h; const g = cv.getContext("2d"), id = g.createImageData(a.w, a.h); id.data.set(rgba()); g.putImageData(id, 0, 0); return cv; } };
}

// The figure beside the pod: the species' two slices laid one over the other (ui/podlayers.mjs figureComposite). Until both are placed it is an empty picture; a held figure shows its mist in both states.
// Its status is the least final of its slices'.
export function figureFromLayers(mistId, clearId, alpha, [w, h]) {
  let cv = null, px = null;
  const a = isFilled(mistId) ? assetOf(mistId) : null;
  const rgba = () => px || (px = !a || !isFilled(clearId) ? new Uint8ClampedArray(w * h * 4) : figureComposite(pixels(mistId).data, pixels(clearId).data, figureAlpha([assetEntry(mistId)?.status, assetEntry(clearId)?.status], alpha)));
  return { w, h, rgba, canvas: () => { if (cv) return cv; cv = document.createElement("canvas"); cv.width = w; cv.height = h; const g = cv.getContext("2d"), id = g.createImageData(w, h); id.data.set(rgba()); g.putImageData(id, 0, 0); return cv; } };
}
// The least final status among placed layers: placeholder, then held, then new, else master.
export const leastFinal = (ids) => { const order = ["placeholder", "held", "new"], got = ids.map((i) => assetEntry(i)?.status).filter((x) => order.includes(x)); return order.find((x) => got.includes(x)) ?? "master"; };
// The status a composed pod carries: the least final of its three required layers (a pod class's shade and its two masks).
export const podStatus = (cls) => leastFinal(["shade", "mask-body", "mask-accent"].map((l) => `pod-${cls}-${l}`));
// The status a figure carries: the least final of its two slices; a placeholder while either is not placed.
export const figureStatus = (mistId, clearId) => (isFilled(mistId) && isFilled(clearId) ? leastFinal([mistId, clearId]) : "placeholder");
