// The stamp label (station-layouts.md, "The stamp label"): a 120×120 bone plate with a 1 px slate edge, the stamp
// centred on it, drawn on whole-pixel cells (cell = floor(104 / (N + 2)), never less than 2). It is never the focal
// point, never larger than 120, and never has a beam, glow, frame or pane of its own.
// props: { stamp: asset id of the stamp picture at (N + 2) × cell, size: its side in px } (stamp null: the plate alone)
import { panel } from "./panel.mjs";

export const stampCell = (N, inner = 104, least = 2) => Math.max(least, Math.floor(inner / (N + 2)));
export function stampLabel(ctx, id, rect, props, colours = { fill: "bone", edge: "slate" }) {
  const [x, y, w, h] = rect, nodes = panel(id, rect, { fill: colours.fill, edge: colours.edge, region: props.region ?? null });
  if (props.stamp && props.size) nodes.push({ id: id + ".stamp", kind: "sprite", rect: [x + Math.round((w - props.size) / 2), y + Math.round((h - props.size) / 2), props.size, props.size], asset: props.stamp, region: props.region ? props.region + ".image" : null });
  return nodes;
}
