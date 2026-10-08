// The message plate (station-layouts.md, "The frame"): 16 px type, centred on x 512, at most 640 wide, 16 + 20 px
// a line tall, shown for 4 s; its bottom edge at y 550, or its top at y 112 when that would cover the focal box.
// props: { text, focal } (focal: the screen's focal box, or null)
import { textRun, wrap } from "./text.mjs";
import { messagePlate as placePlate } from "../layout.mjs";
import { panel } from "./panel.mjs";

export function messagePlate(ctx, props) {
  if (!props?.text) return [];
  const S = ctx.spec, P = S.regions.plate, Cc = S.colours;
  const lines = wrap(ctx, props.text, P.maxWidth - 2 * P.pad, P.px), widest = Math.max(...lines.map((l) => ctx.measure(l, P.px, 400)));
  const rect = placePlate(P, lines.length, widest, props.focal), [x, y, w, h] = rect, nodes = [];
  nodes.push({ id: "plate.shadow", kind: "rect", rect: [x, y + 3, w, h], colour: Cc.plateShadow });
  nodes.push(...panel("plate", rect, { fill: Cc.plate, edge: Cc.plateEdge, region: "plate" }));
  lines.forEach((l, i) => nodes.push(...textRun(ctx, "plate.l" + i, l, P.centre, y + Math.round(P.lead / 2) + i * P.line, { px: P.px, colour: Cc.plateText, align: "center" }).nodes));
  return nodes;
}
