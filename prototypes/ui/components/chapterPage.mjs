// The chapter page (station-layouts.md, Pods §5): a deep pane with a 1 px slate edge; the heading (an emblem 24×24,
// then the chapter's word in 20 px, nothing at the right); the trait cells on the grid the spec gives by trait count
// (layout.pageGrid), each a picture rendered at its size, then 8 px, the trait's name in 16 px cream, then at most two
// lines in 16 px fog. Marks inside the picture's rectangle P: the misty seed at the bottom right (a second seed at
// P.x + 8 for a blend), the "only" base centred on the bottom edge, "asleep" at the top right, "breed to change" at
// the top left; unread: frost over the whole picture, the name shows, the line stays empty; sealed: slats with what
// opens it centred, no line. A read in progress wipes the frost away from the top (props.wipe, 0 to 1).
// props: { heading: { emblem, word } | null, cells: [{ picture, name, lines: [], frost, sealed, seals: asset, marks: [{ kind, asset }], wipe }],
//          colours: { pane, edge, heading, name, line, lineEmpty, wipe }, frost(w, h) → asset id, slats(w, h) → asset id, compact }
import { pageGrid } from "../layout.mjs";
import { panel } from "./panel.mjs";
import { wrap } from "./text.mjs";

export function chapterPage(ctx, id, region, props) {
  const Cc = props.colours, nodes = panel(id, region.rect, { fill: Cc.pane, edge: Cc.edge, region: props.region ?? null });
  const [px, py] = region.rect, H = region.heading;
  if (props.heading && H) {
    nodes.push({ id: id + ".emblem", kind: "sprite", rect: [px + H[0], py + H[1], 24, 24], asset: props.heading.emblem });
    nodes.push({ id: id + ".word", kind: "text", rect: [px + H[0] + 32, py + H[1], Math.round(ctx.measure(props.heading.word, 20, 500)), 24], text: props.heading.word, px: 20, weight: 500, colour: Cc.heading, align: "left" });
    for (const [k, extra] of (props.heading.extra || []).entries()) nodes.push({ id: `${id}.hx${k}`, kind: "sprite", rect: [px + H[0] + 32 + Math.round(ctx.measure(props.heading.word, 20, 500)) + 12 + extra.dx, py + H[1] + (extra.dy || 0), extra.w, extra.h], asset: extra.asset });
  }
  const grid = pageGrid(region, props.cells.length);
  grid.cells.forEach((cell, i) => {
    const c = props.cells[i], [cx, cy] = cell, [pw, ph] = grid.picture, cid = `${id}.c${i}`, P = [cx, cy, pw, ph];
    nodes.push({ id: cid + ".pic", kind: "sprite", rect: P, asset: c.picture, region: props.cellRegion ?? null });
    if (c.sealed) { nodes.push({ id: cid + ".slats", kind: "pattern", rect: P, asset: props.slats(pw, ph) }); if (c.seals) nodes.push({ id: cid + ".key", kind: "sprite", rect: [cx + Math.round(pw / 2) - 22, cy + Math.round(ph / 2) - 32, 44, 64], asset: c.seals }); }
    else if (c.frost) nodes.push({ id: cid + ".frost", kind: "sprite", rect: P, asset: props.frost(pw, ph) });
    else {
      for (const [k, m] of (c.marks || []).entries()) {
        const small = ph < 120, sw = small ? 32 : 40, sh = small ? 40 : 52;
        const r = m.kind === "seed" ? [cx + pw - 8 - sw, cy + ph - 8 - sh, sw, sh] : m.kind === "seed2" ? [cx + 8, cy + ph - 8 - sh, sw, sh] : m.kind === "only" ? [cx + Math.round(pw / 2) - 36, cy + ph - 8, 72, 8] : m.kind === "asleep" ? [cx + pw - 32, cy + 8, 24, 16] : m.kind === "doing" ? [cx + 8, cy + 8, 28, 16] : null;
        if (r) nodes.push({ id: `${cid}.m${k}`, kind: "sprite", rect: r, asset: m.asset });
      }
      if (c.wipe != null && c.wipe < 1) { const cut = Math.round(c.wipe * ph); nodes.push({ id: cid + ".wipe", kind: "clip", rect: [cx, cy + cut, pw, ph - cut], children: [{ id: cid + ".wipefrost", kind: "sprite", rect: P, asset: props.frost(pw, ph) }] }, { id: cid + ".wipeline", kind: "rect", rect: [cx + 6, cy + cut, pw - 12, 2], colour: Cc.wipe }); }
    }
    const ny = cy + ph + 8, nw = Math.round(ctx.measure(c.name, 16, 400));
    nodes.push({ id: cid + ".name", kind: "text", rect: [cx, ny, nw, 20], text: c.name, px: 16, weight: 400, colour: Cc.name, align: "left" });
    if (!c.sealed) { const lines = wrap(ctx, (c.lines || []).join(" "), cell[2], 16).slice(0, 2); lines.forEach((l, j) => nodes.push({ id: `${cid}.l${j}`, kind: "text", rect: [cx, ny + 20 + j * 20, Math.round(ctx.measure(l, 16, 400)), 20], text: l, px: 16, weight: 400, colour: c.frost ? Cc.lineEmpty : Cc.line, align: "left" })); }
  });
  return { nodes, cells: grid.cells, picture: grid.picture, overflow: grid.overflow };
}
