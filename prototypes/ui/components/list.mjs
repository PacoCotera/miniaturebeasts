// The list (Pods' column of wells; station-layouts.md, Pods §5): a graphite pane with a 1 px hairline at its right
// edge; the wells in slots on a 72 px pitch, each a lit-or-quiet well, the pod in it (32×40), its progress ring (64×64)
// and its place picture (16×16, no word); then the hatch with its leaf mark. The well of the pod under the beam has its
// rim lit (never a side bar). The focus ring is the screen's, drawn on a slot's rectangle (repeat(well.rect, i, well.pitch)).
// props: { colours: { pane, edge, rule }, wells: [{ base, pod, ring, place } | null], hatch: asset id | null } (asset ids; a null well is an empty slot)
import { repeat } from "../layout.mjs";

export function list(ctx, id, spec, props) {
  const L = spec.regions.list, W = spec.regions.well, H = spec.regions.hatch, Cc = props.colours, nodes = [];
  nodes.push({ id, kind: "rect", rect: L.rect.slice(), colour: Cc.pane, region: props.region ?? "list" });
  nodes.push({ id: id + ".rule", kind: "rect", rect: [L.rule.x, L.rule.y0, 1, L.rule.y1 - L.rule.y0], colour: Cc.rule });
  props.wells.forEach((w, i) => {
    if (!w) return;
    const slot = repeat(W.rect, i, W.pitch), ring = [slot[0] + W.ring.at[0], slot[1] + W.ring.at[1], W.ring.at[2], W.ring.at[3]], wid = `${id}.w${i}`;
    nodes.push({ id: wid + ".slot", kind: "rect", rect: slot, colour: Cc.pane, region: "list.well" });   // the slot's own ground, the focus target's extent
    nodes.push({ id: wid + ".base", kind: "sprite", rect: ring, asset: w.base });
    if (w.pod) nodes.push({ id: wid + ".pod", kind: "sprite", rect: [slot[0] + W.pod.centre[0] - W.pod.size[0] / 2, slot[1] + W.pod.centre[1] - W.pod.size[1] / 2, W.pod.size[0], W.pod.size[1]], asset: w.pod });
    if (w.ring) nodes.push({ id: wid + ".ring", kind: "sprite", rect: ring, asset: w.ring });
    if (w.place) nodes.push({ id: wid + ".place", kind: "sprite", rect: [slot[0] + W.place.at[0], slot[1] + W.place.at[1], W.place.at[2], W.place.at[3]], asset: w.place });
  });
  if (props.hatch) nodes.push({ id: id + ".hatch", kind: "sprite", rect: H.rect.slice(), asset: props.hatch, region: "hatch" });
  return nodes;
}
