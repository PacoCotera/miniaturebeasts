// The pod from its signed layers (the Pods masters, prototypes/ui/assets/masters): one painted pod per size class (shade, mask-body, mask-accent, a pattern, the band),
// recoloured by the species' colour pair in the page (ui/podlayers.mjs) and handed on as a picture at the class's size. Only when the layers are placed.
import { asset as assetOf, assetEntry, isFilled } from "../../ui/assets.mjs";
import { composePod, composeCrown, composeRackPod, patternLayer, figureComposite, figureAlpha } from "../../ui/podlayers.mjs";
import { C, RGB, rampOf } from "./pixels.mjs";

const need = (cls) => ["shade", "mask-body", "mask-accent"].map((l) => `pod-${cls}-${l}`);
export const layersPlaced = (cls) => need(cls).every(isFilled);
const pixels = (id) => { const a = assetOf(id); return { w: a.w, h: a.h, data: a.rgba() }; };

// The clan's crown layers for a pod class ("large", ..., "well", or "opened-cap"), the ones placed; null when the clan is unknown or its shade and mask are not placed (the unknown pod has no crown)
const crownIds = (cls, clan) => (clan ? { shade: `pod-${cls}-crown-${clan}-shade`, mask: `pod-${cls}-crown-${clan}-mask`, glow: `pod-${cls}-crown-${clan}-glow` } : null);
function crownOf(cls, clan) {
  const ids = crownIds(cls, clan); if (!ids || !isFilled(ids.shade) || !isFilled(ids.mask)) return null;
  return { shade: pixels(ids.shade).data, mask: pixels(ids.mask).data, glow: isFilled(ids.glow) ? pixels(ids.glow).data : null };
}
// cls: "large" | "medium" | "small"; pair: ["#rrggbb", "#rrggbb"]; shellPattern: the frame's words; patterns: the spec's word-to-layer map; sealed: the band over the pod; clan: "C01".."C20", the crown over the pod's lid (none when null)
export function podFromLayers(cls, pair, shellPattern, patterns, sealed, clan = null) {
  let px = null;
  const make = () => {
    const sh = pixels(`pod-${cls}-shade`), L = { shade: sh.data, body: pixels(`pod-${cls}-mask-body`).data, accent: pixels(`pod-${cls}-mask-accent`).data };
    const pl = patternLayer(shellPattern || "", patterns); if (pl && isFilled(`pod-${cls}-pattern-${pl}`)) { L.pattern = pixels(`pod-${cls}-pattern-${pl}`).data; if (isFilled(`pod-${cls}-pattern-${pl}-relief`)) L.relief = pixels(`pod-${cls}-pattern-${pl}-relief`).data; }
    if (sealed && isFilled(`pod-${cls}-band`)) L.band = pixels(`pod-${cls}-band`).data;
    const out = composePod(L, pair[0], pair[1], sh.w, sh.h, { sealed }), crown = crownOf(cls, clan);
    return crown ? composeCrown(out, crown, pair[1], sh.w, sh.h) : out;
  };
  const a = assetOf(`pod-${cls}-shade`), rgba = () => px || (px = make());
  return { w: a.w, h: a.h, rgba };
}

// The rack pod (home.json regions.rackPod.layers): the signed 1-bit layers of the 24×32 pod, each filled from the species' colour pair through cross.json pigmentChips and A's ramp, in the spec's order, never scaled.
// spec: the `layers` block; chips: cross.json colours.pigmentChips; patterns: pods.json podLayers.patterns; size: [w, h]. A pigment not listed draws `mist`; a pod of no known species (frame null) is A `stone`, B `fog`, no pattern.
// The clan's crown layers are named by the clan: `crown` -> `crown-C03`, `crown-glow` -> `crown-C03-glow` (home.json regions.rackPod.layers.crown); a pod of no known clan has no crown.
const rgb = (n) => RGB[C[n]];
const isCrown = (l) => l === "crown" || l.startsWith("crown-");
const layerId = (spec, layer, clan = null) => spec.id.replace("{layer}", isCrown(layer) ? (clan ? layer.replace("crown", `crown-${clan}`) : null) : layer);
const clanOfFrame = (frame) => frame?.taxonomy?.clan ?? null;
const baseLayers = (spec) => spec.order.filter((l) => l !== "pattern" && !isCrown(l));
export const rackBase = (spec) => baseLayers(spec).map((l) => layerId(spec, l));
export const rackCrownIds = (frame, spec) => { const clan = clanOfFrame(frame); return clan ? spec.order.filter(isCrown).map((l) => layerId(spec, l, clan)) : []; };
export const rackPatternId = (frame, spec, patterns) => { const name = frame ? patternLayer(frame.pod.shellPattern || "", patterns) : null; return name ? layerId(spec, `pattern-${name}`) : null; };
export const rackLayersPlaced = (spec) => rackBase(spec).every(isFilled);
export function rackPodFromLayers(frame, spec, chips, patterns, [w, h]) {
  const pig = (c) => (c && chips[c.pigment]) || "mist", A = frame ? pig(frame.pod.colourPair[0]) : "stone", B = frame ? pig(frame.pod.colourPair[1]) : "fog", ramp = rampOf(A), rampB = rampOf(B), clan = clanOfFrame(frame), glow = clan && spec.glow?.[clan];
  const FILL = { A: rgb(A), B: rgb(B), "lighter(A)": rgb(ramp.light), "darker(A)": rgb(ramp.shade), "darkest(A)": rgb(ramp.outline), "lighter(B)": rgb(rampB.light), "darker(B)": rgb(rampB.shade), ...(glow ? { glow: rgb(glow) } : {}) }, pid = rackPatternId(frame, spec, patterns);
  let px = null;
  const make = () => {
    const masks = {}, fills = {};
    for (const l of spec.order) { const id = l === "pattern" ? pid : layerId(spec, l, clan); if (!id || !isFilled(id)) continue; const a = assetOf(id); if (a.w !== w || a.h !== h) throw new Error(`${id} is ${a.w}x${a.h}, not ${w}x${h}`); masks[l] = pixels(id).data; fills[l] = FILL[spec.fill[l]]; }
    return composeRackPod(masks, spec.order, fills, w, h, spec.order.filter(isCrown));
  };
  return { w, h, rgba: () => px || (px = make()) };
}

// The figure beside the pod: the species' two slices laid one over the other (ui/podlayers.mjs figureComposite). Until both are placed it is an empty picture; a held figure shows its mist in both states.
// Its status is the least final of its slices'.
export function figureFromLayers(mistId, clearId, alpha, [w, h]) {
  let px = null;
  const a = isFilled(mistId) ? assetOf(mistId) : null;
  const rgba = () => px || (px = !a || !isFilled(clearId) ? new Uint8ClampedArray(w * h * 4) : figureComposite(pixels(mistId).data, pixels(clearId).data, figureAlpha([assetEntry(mistId)?.status, assetEntry(clearId)?.status], alpha)));
  return { w, h, rgba };
}
// The least final status among placed layers: placeholder, then held, then new, else master.
export const leastFinal = (ids) => { const order = ["placeholder", "held", "new"], got = ids.map((i) => assetEntry(i)?.status).filter((x) => order.includes(x)); return order.find((x) => got.includes(x)) ?? "master"; };
// The status a composed pod carries: the least final of its three required layers (a pod class's shade and its two masks).
export const podStatus = (cls) => leastFinal(["shade", "mask-body", "mask-accent"].map((l) => `pod-${cls}-${l}`));
// The status a figure carries: the least final of its two slices; a placeholder while either is not placed.
export const figureStatus = (mistId, clearId) => (isFilled(mistId) && isFilled(clearId) ? leastFinal([mistId, clearId]) : "placeholder");
