// A module (station-layouts.md, Home §4, §5): a build of panel: a box of 320×120 with a lit top edge and a 1 px hairline
// edge, its one word in 16 px at the top left (engraved, quiet), a 12×12 lamp at the top right, and its objects
// (sprites the view places inside it by the spec's offsets). An arrival lifts it by the spec's lift. The focus ring is
// the screen's, round, on the module's rectangle.
// props: { colours: spec.colours.module ({ fill, top, edge, word }), word, lamp: asset, lift, items: [{ id, rect, asset }], region }
// region: the spec's module region ({ rect, word: [x, y], lamp: [x, y, w, h] }).
import { panel } from "./panel.mjs";
import { SIZES } from "../type.mjs";

export function module(ctx, id, region, props) {
  const Cc = props.colours, lift = props.lift || 0, [x, y0, w, h] = region.rect, y = y0 - lift, nodes = [];
  nodes.push(...panel(id, [x, y, w, h], { fill: Cc.fill, edge: Cc.edge, region: props.region ?? null }));
  nodes.push({ id: id + ".top", kind: "rect", rect: [x + 1, y + 1, w - 2, 1], colour: Cc.top });
  const tw = Math.round(ctx.measure(props.word, 16, 400));
  nodes.push({ id: id + ".word", kind: "text", rect: [x + region.word[0], y + region.word[1], tw, 20], text: props.word, px: 16, weight: SIZES[16], colour: Cc.word, align: "left" });
  const [lx, ly, lw, lh] = region.lamp;
  nodes.push({ id: id + ".lamp", kind: "sprite", rect: [x + lx, y + ly, lw, lh], asset: props.lamp });
  for (const it of props.items || []) nodes.push({ id: `${id}.${it.id}`, kind: "sprite", rect: [it.rect[0], it.rect[1] - lift, it.rect[2], it.rect[3]], asset: it.asset });
  return nodes;
}
