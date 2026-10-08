// The bottom line (station-layouts.md, "The frame"): chrome ground with a 1 px rule on its top edge; three regions
// with hairlines at x 396 and 628: the action `✓ verb · price · ← where` at the left in 16 px (the ✓ cap drawn
// only when ✓ does something; dimmed in mist when the player cannot pay), the subject centred on x 512 in mist
// (the one string that may end in "…"), and what needs you right-aligned to 1008 in amber.
// props: { ok, price, dim, back, subject, need }
import { textRun, clip } from "./text.mjs";

export function bottomLine(ctx, o) {
  const S = ctx.spec, R = S.regions, Cc = S.colours, St = S.strings, nodes = [];
  const [x, y, w, h] = R.line.rect;
  nodes.push({ id: "line", kind: "rect", rect: [x, y, w, h], colour: Cc.chrome, region: "line" }, { id: "line.rule", kind: "rect", rect: [x, y, w, 1], colour: Cc.rule });
  for (const [i, sx] of R.separators.x.entries()) nodes.push({ id: "line.sep." + i, kind: "rect", rect: [sx, R.separators.y0, 1, R.separators.y1 - R.separators.y0], colour: Cc.dot });
  // the action
  const A = R.action, ty = A.rect[1] + 2; let ax = A.rect[0], k = 0;
  const piece = (str, colour) => { const r = textRun(ctx, "line.a." + k++, str, ax, ty, { px: A.px, colour }); nodes.push(...r.nodes); ax = r.end; };
  if (o?.ok) { piece(St.tick, Cc.tick); ax += 8; piece(o.ok, o.dim ? Cc.dim : Cc.verb); if (o.price) { piece(St.dot, Cc.dot); piece(o.price, o.dim ? Cc.dim : Cc.price); } }
  if (o?.back) { if (o.ok) piece(St.dot, Cc.dot); piece(St.backArrow + o.back, Cc.back); }
  // the subject, centred on 512, clipped with "…" to its region
  const Sj = R.subject;
  if (o?.subject) nodes.push(...textRun(ctx, "line.subject", clip(ctx, o.subject, Sj.rect[2], Sj.px), Sj.centre, Sj.rect[1] + 2, { px: Sj.px, colour: Cc.subject, align: "center" }).nodes);
  // what needs you, right-aligned to 1008
  const N = R.need;
  if (o?.need) nodes.push(...textRun(ctx, "line.need", o.need, N.right, N.rect[1] + 2, { px: N.px, colour: Cc.need, align: "right" }).nodes);
  return nodes;
}
