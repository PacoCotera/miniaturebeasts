// The top bar (station-layouts.md, "The frame"): where you are, what you hold, who is out, when. Chrome ground with a 1 px rule on its bottom
// edge; three groups between 1 px hairline rules at x 256 and 888. Title: the room's 24×24 mark at (16, 8), then the screen's one word in 20 px
// medium from x 48. Holdings: Energy, Data and Essence centred on x 512, each a 16 px icon, a 4 px gap and 16 px tabular figures, 24 px between
// counters, a tick flashing 240 ms behind a figure that changed. Who is out: the Companion's glyph 16×24 at (816, 8), its 8×8 lamp at (836, 16),
// and the mibi with you as a 24 px face on its ring at (856, 8) (an empty ring when none is with you). When: a 16 px sun mark, 4 px, then the
// world turn's figure right-aligned to x 1008. Marks are slots (components/mark.mjs): empty until their masters land.
// props: { screen, title, turn, turnFlash, materials: { e, d, s }, flash: { e, d, s }, companion: { docked, withMibi: the mibi's id | null } }
import { textRun, iconAsset } from "./text.mjs";
import { markNode, markOr } from "./mark.mjs";
import { ringAsset } from "./focusRing.mjs";

export function topBar(ctx, props) {
  const S = ctx.spec, R = S.regions, Mk = R.marks, Cc = S.colours, nodes = [];
  const [x, y, w, h] = R.top.rect;
  nodes.push({ id: "top", kind: "rect", rect: [x, y, w, h], colour: Cc.chrome, region: "top" }, { id: "top.rule", kind: "rect", rect: [x, y + h - 1, w, 1], colour: Cc.rule });
  for (const [i, rx] of R.topRules.x.entries()) nodes.push({ id: "top.sep." + i, kind: "rect", rect: [rx, R.topRules.y0, 1, R.topRules.y1 - R.topRules.y0], colour: Cc.topRule });
  // where you are: the room's mark, then the one word
  const T = R.title, room = T.marks[props.screen] ?? null;
  if (room) nodes.push(...markNode("top.room", Mk.room[room.toLowerCase()], T.mark, "the room marks (the device keys' glyphs), 24×24"));
  nodes.push(...textRun(ctx, "top.title", props.title, T.text[0], T.text[1] + 2, { px: T.px, weight: T.weight, colour: Cc.title }).nodes);
  // what you hold, centred on 512
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
  // who is out, and with whom: marks only. Docked: the glyph solid, the lamp lit, the face full; away: the glyph in outline, the lamp dark, the face on a dimmed ring.
  const Cp = R.companion, docked = props.companion.docked;
  nodes.push(...markNode("top.comp", docked ? Mk.companion.docked : Mk.companion.away, Cp.glyph, "the Companion's glyph, solid and outline, 16×24"));
  nodes.push(...markOr("top.lamp", docked ? Mk.lamp8.docked : Mk.lamp8.away, Cp.lampAt, "the 8 px lamp, one painted shape per colour", { id: "top.lamp", kind: "rect", rect: Cp.lampAt.slice(), colour: docked ? Cc.lampOn : Cc.lampOff }));
  // the mibi with you as a painted face on its ring (the same face, dimmed, while away; an empty ring when none is with you); until the face is painted, the ring alone
  const faceId = props.companion.withMibi == null ? Mk.face.empty : (docked ? Mk.face.docked : Mk.face.away).replace("{mibi}", props.companion.withMibi);
  const ring = ringAsset("ellipse", Cp.face[2], Cp.face[3], docked ? Cc.faceRing : Cc.faceRingAway, 2, 0);
  nodes.push(...markOr("top.face", faceId, Cp.face, "the mibi's 24 px face, a Station master, never a scaled Companion face", { id: "top.face.ring", kind: "sprite", rect: Cp.face.slice(), asset: ring }));
  // when: the sun mark, then the turn's figure, right-aligned to 1008
  const W = R.time, fig = S.strings.turn.replace("{n}", String(props.turn)), fw = Math.round(ctx.measure(fig, W.px, 400)), fx = W.right - fw;
  nodes.push(...markNode("top.sun", Mk.sun, [fx - W.gap - W.mark[0], W.rect[1] + 4, W.mark[0], W.mark[1]], "the sun mark, 16×16"));
  if (props.turnFlash) nodes.push({ id: "top.turn.flash", kind: "rect", rect: [fx - 3, W.rect[1], fw + 6, W.rect[3]], colour: Cc.flash });
  nodes.push({ id: "top.turn", kind: "text", rect: [fx, W.rect[1] + 4, fw, 20], text: fig, px: W.px, weight: 400, colour: props.turnFlash ? Cc.flashInk : Cc.turn, align: "left" });
  return nodes;
}
