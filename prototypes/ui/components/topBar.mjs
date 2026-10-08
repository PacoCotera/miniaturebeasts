// The top bar (station-layouts.md, "The frame"): chrome ground with a 1 px rule on its bottom edge; the screen
// name in 20 px medium and the turn in 16 px at (16, 8); Energy, Data and Essence centred on x 512, each a 16 px
// icon, a 4 px gap and 16 px tabular figures, 24 px between counters, a tick flashing 240 ms behind a figure that
// changed; the Companion state right-aligned to 1008 in 16 px with its 8 px lamp to the left of the words.
// props: { title, turn, turnFlash, materials: { e, d, s }, flash: { e, d, s }, companion: { text, lamp: "on" | "off" }, regions: ["top", ...] }
import { textRun, iconAsset, clip } from "./text.mjs";

export function topBar(ctx, props) {
  const S = ctx.spec, R = S.regions, Cc = S.colours, nodes = [];
  const [x, y, w, h] = R.top.rect;
  nodes.push({ id: "top", kind: "rect", rect: [x, y, w, h], colour: Cc.chrome, region: "top" }, { id: "top.rule", kind: "rect", rect: [x, y + h - 1, w, 1], colour: Cc.rule });
  // the screen name and the turn
  const T = R.title, title = textRun(ctx, "top.title", props.title, T.rect[0], T.rect[1] + 2, { px: T.px, weight: T.weight, colour: Cc.title });
  nodes.push(...title.nodes);
  const turnText = S.strings.turn.replace("{n}", String(props.turn)), tx = title.end + 8;
  if (props.turnFlash) nodes.push({ id: "top.turn.flash", kind: "rect", rect: [tx - 4, T.rect[1], Math.round(ctx.measure(turnText, T.turnPx, 400)) + 8, T.rect[3]], colour: Cc.flash });
  nodes.push(...textRun(ctx, "top.turn", turnText, tx, T.rect[1] + 4, { px: T.turnPx, colour: props.turnFlash ? Cc.flashInk : Cc.turn }).nodes);
  // the materials, centred on 512
  const M = R.materials, items = [["e", "energy"], ["d", "data"], ["s", "essence"]].map(([k, icon]) => ({ k, icon, text: String(props.materials[k] ?? 0) }));
  const widths = items.map((it) => M.icon + M.gap + Math.round(ctx.measure(it.text, M.px, 400))), total = widths.reduce((a, b) => a + b, 0) + M.between * (items.length - 1);
  let mx = M.centre - Math.round(total / 2);
  items.forEach((it, i) => {
    nodes.push({ id: "top.m." + it.k + ".icon", kind: "sprite", rect: [mx, M.rect[1] + 4, M.icon, M.icon], asset: iconAsset(it.icon, M.icon) });
    const fx = mx + M.icon + M.gap, fw = widths[i] - M.icon - M.gap;
    if (props.flash?.[it.k]) nodes.push({ id: "top.m." + it.k + ".flash", kind: "rect", rect: [fx - 3, M.rect[1], fw + 6, M.rect[3]], colour: Cc.flash });
    nodes.push({ id: "top.m." + it.k, kind: "text", rect: [fx, M.rect[1] + 4, fw, 20], text: it.text, px: M.px, weight: 400, colour: props.flash?.[it.k] ? Cc.flashInk : Cc.figure, align: "left" });
    mx += widths[i] + M.between;
  });
  // the Companion state, right-aligned to 1008, its lamp to the left of the words
  const Cp = R.companion, text = clip(ctx, props.companion.text, Cp.rect[2] - Cp.lamp - 8, Cp.px), tw = Math.round(ctx.measure(text, Cp.px, 400));
  nodes.push({ id: "top.comp", kind: "text", rect: [Cp.right - tw, Cp.rect[1] + 4, tw, 20], text, px: Cp.px, weight: 400, colour: props.companion.lamp === "on" ? Cc.companionDocked : Cc.companion, align: "left" });
  nodes.push({ id: "top.lamp", kind: "rect", rect: [Cp.right - tw - 8 - Cp.lamp, Cp.rect[1] + 8, Cp.lamp, Cp.lamp], colour: props.companion.lamp === "on" ? Cc.lampOn : Cc.lampOff });
  return nodes;
}
