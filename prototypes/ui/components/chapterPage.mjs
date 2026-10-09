// The chapter page (station-layouts.md, Pods §5): a deep pane with a 1 px slate edge; the heading (an emblem 24×24,
// then the chapter's word in 20 px, nothing at the right); the trait cells on the grid the spec gives by trait count
// (layout.pageGrid), each a picture rendered at its size, then 8 px, the trait's name in 16 px cream, then at most two
// lines in 16 px fog. Marks inside the picture's rectangle P: the misty seed at the bottom right (a second seed at
// P.x + 8 for a blend), the "only" base centred on the bottom edge, "asleep" at the top right, "breed to change" at
// the top left; unread: frost over the whole picture, the name shows, the line stays empty; sealed: slats with what
// opens it centred, no line. A read in progress wipes the frost away from the top (props.wipe, 0 to 1).
// props: { marks (the spec's page.marks), diff ({ edge, inset } px), heading: { emblem, word } | null, cells: [{ picture, name, lines: [], frost, sealed, seals: asset, marks: [{ kind, asset }], wipe }],
//          colours: { pane, edge, heading, name, line, lineEmpty, wipe }, frost and slats (the id prefixes of those pictures: `<prefix><w>x<h>`), compact }
import { pageGrid } from "../layout.mjs";
import { panel } from "./panel.mjs";
import { isFilled } from "../assets.mjs";
import { focusRing } from "./focusRing.mjs";
import { wrap } from "./text.mjs";
import { markNode } from "./mark.mjs";
import { layer } from "./specimen.mjs";

export function chapterPage(ctx, id, region, props) {
  // the pane shortens to its content: its height by the number of traits (page.heightByCount: one, two, else the full height), its top fixed
  const hb = region.heightByCount, n = props.count ?? (props.cells || []).length, rect = region.rect.slice();
  if (hb) { const key = Object.keys(hb).find((k) => { const [a, b] = k.split("-").map(Number); return n >= a && n <= (b ?? a); }); rect[3] = hb[key] ?? hb.else ?? rect[3]; }
  const Cc = props.colours, nodes = props.pane && isFilled(props.pane) ? [{ id, kind: "nineSlice", rect, asset: props.pane, region: props.region ?? null }] : panel(id, rect, { fill: Cc.pane, edge: Cc.edge, region: props.region ?? null });   // the pane master is a nine-slice with its own insets, drawn at the height the count gives
  const [px, py] = rect, H = region.heading;
  if (props.heading?.pod && H) {   // Compare: the pod at 32×40 and its place picture
    nodes.push({ id: id + ".pod", kind: "sprite", rect: [px + H[0], py + H[1], 32, 40], asset: props.heading.pod });
    if (props.heading.place) nodes.push({ id: id + ".place", kind: "sprite", rect: [px + H[0] + 40, py + H[1] + 12, 16, 16], asset: props.heading.place });
  } else if (props.heading && H) {
    nodes.push({ id: id + ".emblem", kind: "sprite", rect: [px + H[0], py + H[1], 24, 24], asset: props.heading.emblem });
    nodes.push({ id: id + ".word", kind: "text", rect: [px + H[0] + 32, py + H[1], Math.round(ctx.measure(props.heading.word, 20, 500)), 24], text: props.heading.word, px: 20, weight: 500, colour: Cc.heading, align: "left" });
    for (const [k, extra] of (props.heading.extra || []).entries()) nodes.push({ id: `${id}.hx${k}`, kind: "sprite", rect: [px + H[0] + 32 + Math.round(ctx.measure(props.heading.word, 20, 500)) + 12 + extra.dx, py + H[1] + (extra.dy || 0), extra.w, extra.h], asset: extra.asset });
  }
  if (props.sealedFind && region.sealedFind) { const [fx, fy, fw, fh] = region.sealedFind; nodes.push({ id: id + ".find", kind: "sprite", rect: [px + fx, py + fy, fw, fh], asset: props.sealedFind, region: "page.seal" }); return { nodes, cells: [], picture: null, overflow: false }; }   // a shut chapter: the one picture of the find that opens it, no cells, no names
  const grid = pageGrid(region, props.cells.length);
  grid.cells.forEach((cell, i) => {
    const c = props.cells[i], [cx, cy] = cell, [pw, ph] = grid.picture, cid = `${id}.c${i}`, P = [cx, cy, pw, ph];
    nodes.push({ id: cid + ".pic", kind: "rect", rect: P, colour: Cc.pane, region: props.cellRegion ?? null });   // the cell's ground; what lies over it is the signed picture, or its stand-in card, then the signed frame
    if (c.picture && !c.sealed && !c.frost) { nodes.push(...layer(cid + ".card", P, c.picture)); nodes.push(...layer(cid + ".frame", P, c.frame)); }   // nothing of an unread trait is drawn: the ground, then frost or slats
    if (c.sealed) { nodes.push({ id: cid + ".slats", kind: "sprite", rect: P, asset: `${props.slats}${pw}x${ph}` }); if (c.seals) nodes.push({ id: cid + ".key", kind: "sprite", rect: [cx + Math.round(pw / 2) - 22, cy + Math.round(ph / 2) - 32, 44, 64], asset: c.seals }); }
    else if (c.frost) nodes.push(props.unreadFrame && isFilled(props.unreadFrame) ? { id: cid + ".frost", kind: "sprite", rect: P, asset: props.unreadFrame } : { id: cid + ".frost", kind: "rect", rect: P, colour: Cc.frostFill || "frost" });   // the signed frosted frame; a flat frost until it is placed   // the spec's unread cell: frost fill, no picture, nothing requested
    else {
      for (const [k, m] of (c.marks || []).entries()) {
        const M = props.marks, small = ph < M.smallUnder, [sw, sh] = small ? M.seedSmall : M.seed;
        const r = m.kind === "seed" ? [cx + pw - 8 - sw, cy + ph - 8 - sh, sw, sh] : m.kind === "seed2" ? [cx + 8, cy + ph - 8 - sh, sw, sh] : m.kind === "only" ? [cx + Math.round(pw / 2) - M.only[0] / 2, cy + ph - 8, M.only[0], M.only[1]] : m.kind === "asleep" ? [cx + pw - 8 - M.asleep[0], cy + 8, M.asleep[0], M.asleep[1]] : m.kind === "doing" ? [cx + 8, cy + 8, M.doing[0], M.doing[1]] : null;
        if (r) nodes.push({ id: `${cid}.m${k}`, kind: "sprite", rect: r, asset: m.asset });
      }
      if (c.wipe != null && c.wipe < 1) { const cut = Math.round(c.wipe * ph); nodes.push({ id: cid + ".wipe", kind: "clip", rect: [cx, cy + cut, pw, ph - cut], children: [{ id: cid + ".wipefrost", kind: "sprite", rect: P, asset: `${props.frost}${pw}x${ph}` }] }, { id: cid + ".wipeline", kind: "rect", rect: [cx + 6, cy + cut, pw - 12, 2], colour: Cc.wipe }); }
    }
    if (c.diff) {   // Compare: a trait that differs wears a 2 px aqua edge on its own rectangle (never the focus-role ring, warm cream #ffe6ad) and the 12×12 bracket, inside the picture, top centre, 8 px in
      const D = Cc.diff, e = props.diff.edge;
      nodes.push({ id: cid + ".diff.t", kind: "rect", rect: [cx, cy, pw, e], colour: D.edge, region: "page.diff" }, { id: cid + ".diff.b", kind: "rect", rect: [cx, cy + ph - e, pw, e], colour: D.edge }, { id: cid + ".diff.l", kind: "rect", rect: [cx, cy, e, ph], colour: D.edge }, { id: cid + ".diff.r", kind: "rect", rect: [cx + pw - e, cy, e, ph], colour: D.edge },
        { id: cid + ".bracket", kind: "sprite", rect: [cx + Math.round(pw / 2) - 6, cy + props.diff.inset, 12, 12], asset: props.bracket, region: "page.bracket" });
    }
    const gap = region.cell ? region.cell.gap : region.nameGap, line = region.cell ? region.cell.name.line : region.nameLine, ny = cy + ph + gap, nw = Math.round(ctx.measure(c.name, 16, 400)), N = region.newMark, dot = c.isNew && N && props.newMark ? N.size[0] + N.gapAfterName : 0, nx = region.cell ? cx + Math.round((pw - nw - dot) / 2) : cx;
    nodes.push({ id: cid + ".name", kind: "text", rect: [nx, ny, nw, line], text: c.name, px: 16, weight: 400, colour: Cc.name, align: "left" });
    if (dot) nodes.push(...markNode(cid + ".new", props.newMark, [nx + nw + N.gapAfterName, ny + line / 2 - N.size[1] / 2, N.size[0], N.size[1]], "the field-guide mark master"));   // the name and the dot centred together, the dot's centre on the line's middle
    if (!c.sealed && !region.cell) { /* a cut line drops its trailing separator */ const all = wrap(ctx, (c.lines || []).join(" "), cell[2], 16), lines = all.slice(0, 2); if (all.length > 2) lines[1] = lines[1].replace(/\s*·$/, ""); lines.forEach((l, j) => nodes.push({ id: `${cid}.l${j}`, kind: "text", rect: [cx, ny + 20 + j * 20, Math.round(ctx.measure(l, 16, 400)), 20], text: l, px: 16, weight: 400, colour: c.frost ? Cc.lineEmpty : Cc.line, align: "left" })); }
  });
  return { nodes, cells: grid.cells, picture: grid.picture, overflow: grid.overflow };
}
