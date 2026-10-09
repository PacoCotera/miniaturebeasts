// The list (Pods' collection, station-layouts.md, Pods §5 A): every rack place, six on a 3 × 2 grid, each a recessed place (a panel
// picture with its hairline edge), the progress ring (160 across, one arc per chapter), the pod in the ring (the collection class),
// the name label on its plate, the find as a place picture, the can-grow mark and the glint star on the ring's band; an empty place is
// the empty ring. Then the waiting mark under the places. The focus ring is the screen's, on a place's rectangle.
// props: { places: [{ panel, ring, pod, name, plate, find, grow, glint } | null] (asset ids; a null place is not in the rack), waiting: asset id | null,
//          colours: { name } }
// Plate and name: the plate's left edge on the label's x, the name centred on the plate, the plate as wide as the name needs (at least 80, at most 224, in 16s).
import { layer } from "./specimen.mjs";

export const placeRect = (L, i) => [L.places.first[0] + L.places.pitch[0] * (i % L.places.grid[0]), L.places.first[1] + L.places.pitch[1] * Math.floor(i / L.places.grid[0]), L.places.first[2], L.places.first[3]];

export function list(ctx, id, spec, props) {
  const L = spec.regions.collection, Cc = props.colours, nodes = [];
  props.places.forEach((w, i) => {
    const r = placeRect(L, i), [x, y] = r, pid = `${id}.p${i}`;
    nodes.push({ id: pid, kind: "sprite", rect: r, asset: w.panel, region: "place" });
    nodes.push({ id: pid + ".ring", kind: "sprite", rect: [x + L.ring.centre[0] - L.ring.outer, y + L.ring.centre[1] - L.ring.outer, 2 * L.ring.outer, 2 * L.ring.outer], asset: w.ring });
    if (w.empty) return;
    if (w.pod) nodes.push({ id: pid + ".pod", kind: "sprite", rect: [x + L.pod.centre[0] - L.pod.size[0] / 2, y + L.pod.centre[1] - L.pod.size[1] / 2, L.pod.size[0], L.pod.size[1]], asset: w.pod, region: "place.pod" });
    const [nx, ny] = [x + L.name.at[0], y + L.name.at[1]], pw = w.plate ? Number(w.plate.match(/:(\d+)x/)[1]) : 0, tw = Math.round(ctx.measure(w.name, L.name.px, L.name.weight));
    nodes.push(...layer(pid + ".plate", [nx, ny, pw, L.name.plate.h], w.plate));
    nodes.push({ id: pid + ".name", kind: "text", rect: [nx + Math.round(((pw || tw) - tw) / 2), ny + Math.floor((L.name.h - ctx.cap(L.name.px)) / 2), tw, Math.round(L.name.px * 1.25)], text: w.name, px: L.name.px, weight: L.name.weight, colour: Cc.name, align: "left", region: "place.name" });
    if (w.find) nodes.push({ id: pid + ".find", kind: "sprite", rect: [x + L.place.at[0], y + L.place.at[1], L.place.at[2], L.place.at[3]], asset: w.find, region: "place.find" });
    if (w.grow) nodes.push({ id: pid + ".grow", kind: "sprite", rect: [x + L.grow.at[0], y + L.grow.at[1], L.grow.at[2], L.grow.at[3]], asset: w.grow });
    if (w.glint) nodes.push({ id: pid + ".glint", kind: "sprite", rect: [x + L.glint.at[0], y + L.glint.at[1], L.glint.at[2], L.glint.at[3]], asset: w.glint });
  });
  if (props.waiting) nodes.push({ id: id + ".waiting", kind: "sprite", rect: L.waiting.rect.slice(), asset: props.waiting, region: "waiting" });
  return nodes;
}

// The overview's kin and hatch (Pods §5 B): same-species pods as rings of 56 × 56 from (600, 224) on a 64 px pitch, the small pod (40 × 48) in each, and the
// hatch with its leaf mark. Both are focus targets, the ring the screen's.
// props: { kin: [{ ring, pod }], hatch: asset id | null }
export function kinHatch(ctx, id, spec, props, R = spec.regions.overview) {
  const K = R.kin, nodes = [];
  props.kin.forEach((k, i) => {
    const r = kinRect(K, i), kid = `${id}.k${i}`;
    nodes.push({ id: kid + ".ring", kind: "sprite", rect: r, asset: k.ring, region: "kin" });
    if (k.pod) nodes.push({ id: kid + ".pod", kind: "sprite", rect: [r[0] + (r[2] - K.pod[0]) / 2, r[1] + (r[3] - K.pod[1]) / 2, K.pod[0], K.pod[1]], asset: k.pod });
  });
  if (props.hatch) nodes.push({ id: id + ".hatch", kind: "sprite", rect: R.hatch.rect.slice(), asset: props.hatch, region: "hatch" });
  return nodes;
}
export const kinRect = (K, i) => [K.first[0] + K.pitch[0] * i, K.first[1] + K.pitch[1] * i, K.first[2], K.first[3]];
