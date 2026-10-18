// The capsule as the views show it (T-20261016-222; build spec sections 1, 5, 6a): the masters of each view's layers, and the relit pictures (the sealed pod, its cracks, the opened pod, a juvenile) that stand inside it. Props name *what*: ids and sizes;
// the places are the specs' (incubator.json regions.capsule, regions.inside, regions.juvenile; create.json; panel; home.json). Pure on the request function `req`, which registers a picture and returns its id.
import { slot } from "./pods-props.mjs";
import { RECIPE } from "../relight.mjs";
export const POD_REF_H = 160;   // the large pod's alpha height: the pod renders at height / 160 of its 144 x 176 layers (about 170 in the room, 147 in the panel, 72 in Create, 27 on Home)
const SIGNED = "signed (art director, the capsule masters list)";
const cap = (req, name, [w, h]) => slot(req, `capsule-${name}-${w}x${h}`, [0, 0, w, h], SIGNED);
// the layer masters of a view at its size: the names a view uses (the room has every layer; the others the layers the build spec names)
export function layers(req, size, names) { const o = {}; for (const n of names) o[n] = cap(req, n, size); return o; }
// the area a pod of `h` px renders in, with its shadow and blades: wide enough for the shadow, the foot's point (the anchor) at the bottom centre of the figure
export function podArea(h) { const W = 2 * Math.ceil(0.65 * h) + 2, above = h + 2, below = Math.ceil(0.2 * h) + 2; return { size: [W, above + below], anchor: [W / 2, above] }; }
// A relit pod picture. variant: "pod" (sealed), "crack1", "crack2" (the renderer's crack layer over the pod) or "opened" (the bowl and the tipped cap). h: the pod's height in px at this view. light: "day" | "dusk". bg: { id, at } the interior the blades come from,
// its top left in area coordinates. area: { size, anchor }. The id is relit:{species}:{variant}:{light}:{w}x{h}:v{recipe}.
export function relitPod(req, { species, variant, light, h, area, bg }) {
  const id = `relit:${species}:${variant}:${light}:${area.size.join("x")}:v${RECIPE}`, scale = h / POD_REF_H;
  let parts;
  if (variant === "opened") {
    const bowl = req({ kind: "podpart", id: `podpart:opened-bowl:${species}:144x150`, cls: "opened-bowl", species, size: [144, 150] }), capp = req({ kind: "podpart", id: `podpart:opened-cap:${species}:104x128`, cls: "opened-cap", species, size: [104, 128] });
    parts = [{ id: bowl }, { id: capp, side: "left" }];
  } else {
    const src = req({ kind: "pod", id: `pod:${species}:s:144x176`, species, state: "sealed", size: [144, 176] });
    parts = [{ id: src, ...(variant === "pod" ? {} : { over: ["pod-large-crack"] }) }];
  }
  return req({ kind: "relit", id, parts, scale, area: area.size, anchor: area.anchor, bg });
}
// The interior a area's blades come from: the layer's id and where its top left is on the screen, as the area sees it (its own top left is foot - anchor).
export const bgOf = (interior, foot, anchor) => ({ id: interior.id, at: [interior.at[0] - (foot[0] - anchor[0]), interior.at[1] - (foot[1] - anchor[1])] });
