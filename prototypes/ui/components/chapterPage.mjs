// The chapter page (station-layouts.md, Pods §5): a deep pane with a 1 px slate edge; the heading (an emblem 24×24,
// then the chapter's word in 20 px, nothing at the right); the trait cells on the grid the spec gives by trait count
// (layout.pageGrid), each a picture rendered at its size, then 8 px, the trait's name in 16 px cream, then at most two
// lines in 16 px fog. Marks inside the picture's rectangle P: the misty seed at the bottom right (a second seed at
// P.x + 8 for a blend), the "only" base centred on the bottom edge, "asleep" at the top right, "breed to change" at
// the top left; unread: frost over the whole picture, the name shows, the line stays empty; sealed: slats with what
// opens it centred, no line. A read in progress wipes the signed frosted frame away from the top (props.wipe, 0 to 1).
// props: { marks (the spec's page.marks), diff ({ edge, inset } px), heading: { emblem, word } | null, cells: [{ picture, name, lines: [], frost, sealed, seals: asset, marks: [{ kind, asset }], wipe }],
//          colours: { pane, edge, heading, name, line, lineEmpty, wipe }, unreadFrame (the signed frosted frame's asset id), standIn (the card's word), newMark, pane, compact }
import { pageGrid, pageSize } from "../layout.mjs";
import { panel } from "./panel.mjs";
import { isFilled } from "../assets.mjs";
import { wrap } from "./text.mjs";
import { markNode } from "./mark.mjs";
import { layer } from "./specimen.mjs";

export function chapterPage(ctx, id, region, props) {
  // the pane shortens to its content: its height by the number of traits (page.heightByCount, ranges such as "1-4" and "5-8"), its top fixed
  const n = props.count ?? (props.cells || []).length, rect = [...region.rect.slice(0, 2), ...pageSize(region, n)];   // left-aligned at the spec's x and y, the size by the trait count
  const Cc = props.colours, nodes = props.pane && isFilled(props.pane) ? [{ id, kind: "nineSlice", rect, asset: props.pane, region: props.region ?? null }] : panel(id, rect, { fill: Cc.pane, edge: Cc.edge, region: props.region ?? null });   // the pane master is a nine-slice with its own insets, drawn at the height the count gives
  const [px, py] = rect, H = region.heading;
  if (props.heading?.pod && H) {   // Compare: the pod (the list class, at podAt) and its place picture
    nodes.push({ id: id + ".pod", kind: "sprite", rect: [px + region.podAt[0], py + region.podAt[1], ...region.pod], asset: props.heading.pod });
    (props.heading.who || []).forEach((m, k) => region.who && nodes.push(...layer(`${id}.who.${k}`, [px + region.who.marks[k][0], py + region.who.marks[k][1], region.who.marks[k][2], region.who.marks[k][3]], m)));   // the marks that say who it is, as on the overview
  } else if (props.heading && H) {
    nodes.push({ id: id + ".emblem", kind: "sprite", rect: [px + H[0], py + H[1], 24, 24], asset: props.heading.emblem });
    nodes.push({ id: id + ".word", kind: "text", rect: [px + H[0] + 32, py + H[1], Math.round(ctx.measure(props.heading.word, 20, 500)), 24], text: props.heading.word, px: 20, weight: 500, colour: Cc.heading, align: "left" });
    for (const [k, extra] of (props.heading.extra || []).entries()) nodes.push({ id: `${id}.hx${k}`, kind: "sprite", rect: [px + H[0] + 32 + Math.round(ctx.measure(props.heading.word, 20, 500)) + 12 + extra.dx, py + H[1] + (extra.dy || 0), extra.w, extra.h], asset: extra.asset });
  }
  if (props.sealedFind && region.sealedFind) {   // a shut chapter: the one picture of the find that opens it (its stand-in card, the signed frame over it, the word), no cells, no names
    const F = [px + region.sealedFind[0], py + region.sealedFind[1], region.sealedFind[2], region.sealedFind[3]];
    nodes.push(...layer(id + ".findcard", F, props.sealedCard), { id: id + ".find", kind: "sprite", rect: F, asset: props.sealedFind, region: "page.seal" });
    if (props.standIn && props.sealedCard) { const w = Math.round(ctx.measure(props.standIn, 16, 400)); nodes.push({ id: id + ".findword", kind: "text", rect: [F[0] + Math.round((F[2] - w) / 2), F[1] + Math.floor((F[3] - ctx.cap(16)) / 2), w, ctx.line(16)], text: props.standIn, px: 16, weight: 400, colour: Cc.standIn, align: "left" }); }
    return { nodes, cells: [], picture: null, overflow: false };
  }
  const grid = pageGrid(region, props.cells.length);
  grid.cells.forEach((cell, i) => {
    const c = props.cells[i], [cx, cy] = cell, [pw, ph] = grid.picture, cid = `${id}.c${i}`, P = [cx, cy, pw, ph];
    nodes.push({ id: cid + ".pic", kind: "rect", rect: P, colour: Cc.pane, region: props.cellRegion ?? null });   // the cell's ground; what lies over it is the signed picture, or its stand-in card, then the signed frame
    if (c.picture && !c.frost) {
      const crop = layer(cid + ".crop", P, c.crop);
      if (crop.length) nodes.push(...crop, ...layer(cid + ".frame", P, c.frame)); else {
      const card = layer(cid + ".card", P, c.picture); if (!card.length && Cc.cardFill) nodes.push({ id: cid + ".cardfill", kind: "rect", rect: P, colour: Cc.cardFill });   // until the card is cut at this size: its fill
      nodes.push(...card, ...layer(cid + ".frame", P, c.frame));
      if (props.standIn) { const w = Math.round(ctx.measure(props.standIn, 16, 400)); nodes.push({ id: cid + ".standin", kind: "text", rect: [cx + Math.round((pw - w) / 2), cy + (ph < props.marks.smallUnder ? Math.floor((ph - props.marks.seedSmall[1] - 8 - ctx.cap(16)) / 2) : Math.floor((ph - ctx.cap(16)) / 2)), w, ctx.line(16)], text: props.standIn, px: 16, weight: 400, colour: Cc.standIn, align: "left" }); }   // the card carries no word of its own: the build sets it
      }
    }
    if (c.frost) nodes.push(props.unreadFrame && isFilled(props.unreadFrame) ? { id: cid + ".frost", kind: "sprite", rect: P, asset: props.unreadFrame } : { id: cid + ".frost", kind: "rect", rect: P, colour: Cc.frostFill || "frost" });   // the signed frosted frame; a flat frost until it is placed   // the spec's unread cell: frost fill, no picture, nothing requested
    else {
      for (const [k, m] of (c.marks || []).entries()) {
        const M = props.marks, small = ph < M.smallUnder, [sw, sh] = small ? M.seedSmall : M.seed;
        const r = m.kind === "seed" ? [cx + pw - 8 - sw, cy + ph - 8 - sh, sw, sh] : m.kind === "seed2" ? [cx + 8, cy + ph - 8 - sh, sw, sh] : m.kind === "only" ? [cx + Math.round(pw / 2) - M.only[0] / 2, cy + ph - 8, M.only[0], M.only[1]] : m.kind === "asleep" ? [cx + pw - 8 - M.asleep[0], cy + 8, M.asleep[0], M.asleep[1]] : m.kind === "doing" ? [cx + 8, cy + 8, M.doing[0], M.doing[1]] : null;
        if (r) nodes.push({ id: `${cid}.m${k}`, kind: "sprite", rect: r, asset: m.asset });
      }
      if (c.wipe != null && c.wipe < 1) { const cut = Math.round(c.wipe * ph); if (props.unreadFrame && isFilled(props.unreadFrame)) nodes.push({ id: cid + ".wipe", kind: "clip", rect: [cx, cy + cut, pw, ph - cut], children: [{ id: cid + ".wipefrost", kind: "sprite", rect: P, asset: props.unreadFrame }] }); nodes.push( { id: cid + ".wipeline", kind: "rect", rect: [cx + 6, cy + cut, pw - 12, 2], colour: Cc.wipe }); }
    }
    const gap = region.cell ? region.cell.gap : region.nameGap, line = region.cell ? region.cell.name.line : region.nameLine, ny = cy + ph + gap, nw = Math.round(ctx.measure(c.name, 16, 400)), N = region.newMark, dot = c.isNew && N && props.newMark ? N.size[0] + N.gapAfterName : 0, nx = region.cell ? cx + Math.round((pw - nw - dot) / 2) : cx;
    nodes.push({ id: cid + ".name", kind: "text", rect: [nx, ny, nw, line], text: c.name, px: 16, weight: 400, colour: Cc.name, align: "left" });
    if (c.diff && props.differs && region.differs) nodes.push(...layer(cid + ".differs", [nx + nw + region.differs.gapAfterName, ny + 4, ...region.differs.size], props.differs));   // Compare: the studio's mark on the name's line, 4 px after the name, on a trait read on both pods whose looks differ
    if (dot) nodes.push(...markNode(cid + ".new", props.newMark, [nx + nw + N.gapAfterName, ny + line / 2 - N.size[1] / 2, N.size[0], N.size[1]], "the field-guide mark master"));   // the name and the dot centred together, the dot's centre on the line's middle
    if (!c.sealed && !region.cell) { /* a cut line drops its trailing separator */ const all = wrap(ctx, (c.lines || []).join(" "), cell[2], 16), lines = all.slice(0, 2); if (all.length > 2) lines[1] = lines[1].replace(/\s*·$/, ""); lines.forEach((l, j) => nodes.push({ id: `${cid}.l${j}`, kind: "text", rect: [cx, ny + 20 + j * 20, Math.round(ctx.measure(l, 16, 400)), 20], text: l, px: 16, weight: 400, colour: c.frost ? Cc.lineEmpty : Cc.line, align: "left" })); }
  });
  return { nodes, cells: grid.cells, picture: grid.picture, overflow: grid.overflow };
}
