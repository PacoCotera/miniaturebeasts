// A card (the report card, station-layouts.md, Home §5): a panel of 560 wide and at most 320 tall over the vivarium,
// its rows in 16 px (text runs with the material icons inline), each on a 20 px line.
// props: { colours: { fill, edge, text, dim }, rows: [{ text, dim? }] }; the rows are cut to fit the height, never drawn past it.
import { panel } from "./panel.mjs";
import { textRun, wrap } from "./text.mjs";

export function card(ctx, id, rect, props) {
  const [x, y, w, maxH] = rect, Cc = props.colours, pad = 16, lines = [];
  for (const r of props.rows) for (const l of wrap(ctx, r.text, w - 2 * pad, 16)) lines.push({ text: l, dim: !!r.dim });
  const fit = Math.max(0, Math.floor((maxH - 2 * pad) / 20)), shown = lines.slice(0, fit), h = Math.min(maxH, 2 * pad + shown.length * 20);
  const nodes = panel(id, [x, y, w, h], { fill: Cc.fill, edge: Cc.edge, region: "report" });
  shown.forEach((l, i) => nodes.push(...textRun(ctx, `${id}.l${i}`, l.text, x + pad, y + pad + i * 20, { px: 16, colour: l.dim ? Cc.dim : Cc.text }).nodes));
  return nodes;
}
