// The bottom line (station-layouts.md, "The frame"): the one action, the context, the notice, the way back. Chrome ground with a 1 px rule on its top edge;
// hairlines at x 404 and 620. The action (16, 570, 376, 24): the ✓ key cap 16×16 and the verb in orange (mist when the player cannot pay), then the price, a
// material's icon and its figures (the figure amber when short), 24 px apart, never joined by dots, a cap 4 px before its word, no cap when its key does
// nothing. The context (408, 570, 208, 24): what the focus is on, centred on x 512 in mist, the one zone that may shrink and end in "…". The notice
// (624, 570, 280, 24): one sentence right-aligned to x 904 in amber with its 12×12 lamp 4 px to its left. The way back (928, 570, 80, 24): the ← key cap in
// stone and one word in fog, right-aligned to x 1008. The caps and lamps are slots (components/mark.mjs): empty until their masters land, their room kept.
// props: { ok (verb phrase), price, dim, short, back, subject, need }
import { textRun, clip } from "./text.mjs";
import { markNode, markOr } from "./mark.mjs";

export function bottomLine(ctx, o) {
  const S = ctx.spec, R = S.regions, Mk = R.marks, Cc = S.colours, nodes = [];
  const [x, y, w, h] = R.line.rect;
  nodes.push({ id: "line", kind: "rect", rect: [x, y, w, h], colour: Cc.chrome, region: "line" }, { id: "line.rule", kind: "rect", rect: [x, y, w, 1], colour: Cc.rule });
  for (const [i, sx] of R.separators.x.entries()) nodes.push({ id: "line.sep." + i, kind: "rect", rect: [sx, R.separators.y0, 1, R.separators.y1 - R.separators.y0], colour: Cc.dot });
  // the action: the cap, the verb, then the price
  const A = R.action, ty = A.rect[1] + 2; let ax = A.rect[0], k = 0;
  const piece = (str, colour) => { const r = textRun(ctx, "line.a." + k++, str, ax, ty, { px: A.px, colour }); nodes.push(...r.nodes); ax = r.end; };
  if (o?.ok) {
    nodes.push(...markNode("line.cap.ok", o.dim ? Mk.capConfirmDim : Mk.capConfirm, [ax, A.cap[1], A.cap[2], A.cap[3]], o.dim ? "the ✓ key cap in mist, its own slice, 16×16" : "the ✓ key cap, 16×16"));
    ax += A.capSize[0] + A.capGap;
    piece(o.ok, o.dim ? Cc.dim : Cc.verb);
    if (o.price) { ax += A.gap; piece(o.price, o.short ? Cc.need : Cc.price); }
  }
  // the context, centred on 512, clipped with "…" to its zone
  const Sj = R.subject;
  if (o?.subject) nodes.push(...textRun(ctx, "line.subject", clip(ctx, o.subject, Sj.rect[2], Sj.px), Sj.centre, Sj.rect[1] + 2, { px: Sj.px, colour: Cc.subject, align: "center" }).nodes);
  // the notice: the sentence right-aligned to 904 with its lamp 4 px to its left
  const N = R.need;
  if (o?.need) {
    const run = textRun(ctx, "line.need", o.need, N.right, N.rect[1] + 2, { px: N.px, colour: Cc.need, align: "right" }), lamp = [N.right - run.width - N.lampGap - N.lamp[0], N.rect[1] + Math.round((N.rect[3] - N.lamp[1]) / 2), N.lamp[0], N.lamp[1]];
    nodes.push(...run.nodes, ...markOr("line.need.lamp", Mk.lamp12, lamp, "the 12 px lamp", { id: "line.need.lamp", kind: "rect", rect: lamp, colour: Cc.needLamp }));
  }
  // the way back: its cap, then one word, right-aligned to 1008
  const B = R.back;
  if (o?.back) {
    const run = textRun(ctx, "line.back", o.back, B.right, B.rect[1] + 2, { px: B.px, colour: Cc.back, align: "right" });
    nodes.push(...run.nodes, ...markNode("line.cap.back", Mk.capBack, [B.right - run.width - B.capGap - B.cap[0], A.cap[1], B.cap[0], B.cap[1]], "the ← key cap, 16×16"));
  }
  return nodes;
}
