// The bottom line (station-layouts.md, "The frame"): the one action, the context, the notice. Chrome ground with a 1 px rule on its top edge; three
// zones between hairlines at x 396 and 628. The action: the ✓ key cap 16×16 at (16, 574) and the verb in orange (mist when the player cannot pay);
// then the price, a material's icon and its figures (the figure amber when short); then the way back, the ← key cap in stone and one word in fog;
// three groups 24 px apart, never joined by dots, a cap 4 px before its word, no cap when its key does nothing. The context: what the focus is on,
// centred on x 512 in mist, the one zone that may shrink and end in "…". The notice: one sentence right-aligned to x 1008 in amber with its 12×12 lamp
// 8 px to its left. The caps are slots (components/mark.mjs): empty until their masters land, their room kept.
// props: { ok (verb phrase), price, dim, short, back, subject, need }
import { textRun, clip } from "./text.mjs";
import { markNode } from "./mark.mjs";

export function bottomLine(ctx, o) {
  const S = ctx.spec, R = S.regions, Cc = S.colours, nodes = [];
  const [x, y, w, h] = R.line.rect;
  nodes.push({ id: "line", kind: "rect", rect: [x, y, w, h], colour: Cc.chrome, region: "line" }, { id: "line.rule", kind: "rect", rect: [x, y, w, 1], colour: Cc.rule });
  for (const [i, sx] of R.separators.x.entries()) nodes.push({ id: "line.sep." + i, kind: "rect", rect: [sx, R.separators.y0, 1, R.separators.y1 - R.separators.y0], colour: Cc.dot });
  // the action
  const A = R.action, ty = A.rect[1] + 2; let ax = A.rect[0], k = 0;
  const piece = (str, colour) => { const r = textRun(ctx, "line.a." + k++, str, ax, ty, { px: A.px, colour }); nodes.push(...r.nodes); ax = r.end; };
  const cap = (id, asset, at, until) => { nodes.push(...markNode(id, asset, [at, A.cap[1], A.cap[2], A.cap[3]], until)); ax = at + A.capSize[0] + A.capGap; };
  if (o?.ok) {
    cap("line.cap.ok", o.dim ? "cap:confirm:dim" : "cap:confirm", ax, "the ✓ key cap, in orange and in mist");
    piece(o.ok, o.dim ? Cc.dim : Cc.verb);
    if (o.price) { ax += A.gap; piece(o.price, o.short ? Cc.need : Cc.price); }
  }
  if (o?.back) { if (o.ok) ax += A.gap; cap("line.cap.back", "cap:back", ax, "the ← key cap, in stone"); piece(o.back, Cc.back); }
  // the context, centred on 512, clipped with "…" to its zone
  const Sj = R.subject;
  if (o?.subject) nodes.push(...textRun(ctx, "line.subject", clip(ctx, o.subject, Sj.rect[2], Sj.px), Sj.centre, Sj.rect[1] + 2, { px: Sj.px, colour: Cc.subject, align: "center" }).nodes);
  // the notice: its lamp, then the sentence right-aligned to 1008
  const N = R.need;
  if (o?.need) {
    const run = textRun(ctx, "line.need", o.need, N.right, N.rect[1] + 2, { px: N.px, colour: Cc.need, align: "right" });
    nodes.push(...run.nodes, { id: "line.need.lamp", kind: "rect", rect: [N.right - run.width - N.lampGap - N.lamp[0], N.rect[1] + Math.round((N.rect[3] - N.lamp[1]) / 2), N.lamp[0], N.lamp[1]], colour: Cc.needLamp });
  }
  return nodes;
}
