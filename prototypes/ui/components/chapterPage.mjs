// The chapter page (station-layouts.md, Pods §5). The chapter's page is open: no pane, no frame, no card. Its heading (an emblem 24×24, the chapter's word in 20 px), one 1 px hairline rule under it
// as wide as the grid, then the trait cells on the grid the spec gives by trait count (layout.pageGrid): each a flat rectangle of the cell's tone with the studio's crop placed 1:1 on it, 4 px, then the name
// line: the name in 16 px, its glyphs (kind, breed) and the field-guide dot, 4 px apart, centred together on the cell. An unread cell draws nothing inside. A read in progress wipes the cell in from the top
// (props.cells[i].wipe, 0 to 1). A shut chapter is one 112×112 find in a flat tone. Compare keeps its pane (region.pane, the nine-slice master) and its left-aligned names, with the amber lamp before a differing name.
// props: { heading: { emblem, word } | null, cells: [{ name, lines, crop, glyphs: [{ key, asset }], isNew, diff, frost, wipe }], colours: { cell, rule, heading, name, line, lineEmpty, wipe, pane, edge }, newMark, differs, pane, count, sealedFind }
import { pageGrid, pageSize } from "../layout.mjs";
import { panel } from "./panel.mjs";
import { isFilled } from "../assets.mjs";
import { wrap } from "./text.mjs";
import { markNode } from "./mark.mjs";
import { layer } from "./specimen.mjs";

export function chapterPage(ctx, id, region, props) {
  // the pane shortens to its content: its height by the number of traits (page.heightByCount, ranges such as "1-4" and "5-8"), its top fixed
  const n = props.count ?? (props.cells || []).length, rect = [...region.rect.slice(0, 2), ...pageSize(region, n)];   // left-aligned at the spec's x and y, the size by the trait count
  const Cc = props.colours, nodes = region.pane === null ? [] : props.pane && isFilled(props.pane) ? [{ id, kind: "nineSlice", rect, asset: props.pane, region: props.region ?? null }] : panel(id, rect, { fill: Cc.pane, edge: Cc.edge, region: props.region ?? null });   // the open page has no pane; Compare's is the nine-slice master drawn at the height the count gives
  const [px, py] = rect, H = region.heading;
  if (props.heading?.pod && H) {   // Compare: the pod (the list class, at podAt) and its place picture
    nodes.push({ id: id + ".pod", kind: "sprite", rect: [px + region.podAt[0], py + region.podAt[1], ...region.pod], asset: props.heading.pod });
    (props.heading.who || []).forEach((m, k) => region.who && nodes.push(...layer(`${id}.who.${k}`, [px + region.who.marks[k][0], py + region.who.marks[k][1], region.who.marks[k][2], region.who.marks[k][3]], m)));   // the marks that say who it is, as on the overview
  } else if (props.heading && H) {
    nodes.push({ id: id + ".emblem", kind: "sprite", rect: [px + H[0], py + H[1], 24, 24], asset: props.heading.emblem });
    nodes.push({ id: id + ".word", kind: "text", rect: [px + H[0] + 32, py + H[1], Math.round(ctx.measure(props.heading.word, 20, 500)), 24], text: props.heading.word, px: 20, weight: 500, colour: Cc.heading, align: "left" });
    for (const [k, extra] of (props.heading.extra || []).entries()) nodes.push({ id: `${id}.hx${k}`, kind: "sprite", rect: [px + H[0] + 32 + Math.round(ctx.measure(props.heading.word, 20, 500)) + 12 + extra.dx, py + H[1] + (extra.dy || 0), extra.w, extra.h], asset: extra.asset });
  }
  if (region.rule && props.heading && !props.heading.pod) { const g = pageGrid(region, Math.max(1, props.count ?? props.cells.length)), right = Math.max(...g.cells.map((q) => q[0])) + g.picture[0]; nodes.push({ id: id + ".rule", kind: "rect", rect: [px + region.rule.at[0], py + region.rule.at[1], right - (px + region.rule.at[0]), region.rule.h], colour: Cc.rule, region: "page.rule" }); }   // one hairline under the heading, from the first column's left edge to the last column's right edge
  if (props.sealedFind && region.sealedFind) {   // a shut chapter: the one picture of the find that opens it (a flat tone until it is painted), no cells, no names
    const F = [px + region.sealedFind[0], py + region.sealedFind[1], region.sealedFind[2], region.sealedFind[3]];
    nodes.push({ id: id + ".find", kind: "rect", rect: F, colour: Cc.cell, region: "page.seal" });
    return { nodes, cells: [], picture: null, overflow: false };
  }
  const grid = pageGrid(region, props.cells.length);
  grid.cells.forEach((cell, i) => {
    const c = props.cells[i], [cx, cy] = cell, [pw, ph] = grid.picture, cid = `${id}.c${i}`, P = [cx, cy, pw, ph];
    // the open page (no pane, no frame, no card): a read cell is one flat rectangle of the cell's tone with the studio's crop placed 1:1 on it; an unread one draws nothing inside (its dotted outline is a signed master's, not the build's)
    if (!c.frost) {
      const body = [{ id: cid + ".pic", kind: "rect", rect: P, colour: Cc.cell, region: props.cellRegion ?? null }, ...layer(cid + ".crop", P, c.crop)];
      if (c.wipe != null && c.wipe < 1) { const cut = Math.round(c.wipe * ph); nodes.push({ id: cid + ".wipe", kind: "clip", rect: [cx, cy, pw, cut], children: body }, { id: cid + ".wipeline", kind: "rect", rect: [cx + 6, cy + cut, pw - 12, 2], colour: Cc.wipe }); }
      else nodes.push(...body);
    }
    if (c.frost) nodes.push(...layer(cid + ".outline", P, c.outline));   // an unread cell: the studio's dotted outline, 128×160, placed 1:1 on the cell's rectangle, nothing inside; nothing is drawn until it is signed
    const gap = region.cell ? region.cell.gap : region.nameGap, line = region.cell ? region.cell.name.line : region.nameLine, ny = cy + ph + gap, nw = Math.round(ctx.measure(c.name, 16, 400)), N = region.newMark, LM = region.lineMarks;
    if (LM && !c.frost) {   // the name line: the name, then its glyphs, then the field-guide dot, 4 px apart, centred together on the cell
      const items = [...(c.glyphs || []).map((g) => ({ g, ...LM.glyphs[g.key] })), ...(c.isNew && N && props.newMark ? [{ dot: true, size: N.size, top: LM.glyphs.new.top }] : [])];
      const total = nw + items.reduce((a, q) => a + LM.gap + q.size[0], 0);
      let x = cx + Math.round((pw - total) / 2);
      nodes.push({ id: cid + ".name", kind: "text", rect: [x, ny, nw, line], text: c.name, px: 16, weight: 400, colour: Cc.name, align: "left" });
      x += nw;
      items.forEach((q, k) => { x += LM.gap; const r = [x, ny + q.top, q.size[0], q.size[1]]; nodes.push(...(q.dot ? markNode(cid + ".new", props.newMark, r, "the field-guide mark master") : layer(`${cid}.g${k}`, r, q.g.asset))); x += q.size[0]; });   // an unpainted glyph keeps its room and draws nothing
    } else {
      const lamp = c.diff && props.differs && region.differs ? region.differs.size[0] + region.differs.gapAfterLamp : 0, dot = c.isNew && N && props.newMark ? N.size[0] + N.gapAfterName : 0, nx = (region.cell ? cx + Math.round((pw - nw - dot) / 2) : cx) + lamp;
      nodes.push({ id: cid + ".name", kind: "text", rect: [nx, ny, nw, line], text: c.name, px: 16, weight: 400, colour: Cc.name, align: "left" });
      if (lamp) nodes.push(...layer(cid + ".differs", [nx - lamp, ny + 4, ...region.differs.size], props.differs));   // Compare: the studio's lamp on the name's line, before the name (the name starts 16 px in)
      if (dot) nodes.push(...markNode(cid + ".new", props.newMark, [nx + nw + N.gapAfterName, ny + line / 2 - N.size[1] / 2, N.size[0], N.size[1]], "the field-guide mark master"));
    }
    if (!c.sealed && !region.cell) { /* a cut line drops its trailing separator */ const all = wrap(ctx, (c.lines || []).join(" "), cell[2], 16), lines = all.slice(0, 2); if (all.length > 2) lines[1] = lines[1].replace(/\s*·$/, ""); lines.forEach((l, j) => nodes.push({ id: `${cid}.l${j}`, kind: "text", rect: [cx, ny + 20 + j * 20, Math.round(ctx.measure(l, 16, 400)), 20], text: l, px: 16, weight: 400, colour: c.frost ? Cc.lineEmpty : Cc.line, align: "left" })); }
  });
  return { nodes, cells: grid.cells, picture: grid.picture, overflow: grid.overflow };
}

// The name line's reach (pods.json regions.chapter.page.lineMarks.fit): a cell's line (the name, its glyphs, the dot, Compare's lamp) is centred on the cell and may run 6 px into the gap on each side, so two neighbouring lines keep 4 px apart; nothing on it rises above the line's top.
// Returns the breaches, as sentences. nodes: the page's cell nodes (id, rect); cells: the grid's cell rectangles; ph: the picture's height; { reach: how far a line may enter the gap, apart: the least between two lines, top: the line's top under the picture }.
export function nameLineBreaches(nodes, cells, ph, { reach, apart, top }) {
  const out = [], ext = cells.map(([cx, cy, cw], i) => {
    const mine = nodes.filter((n) => new RegExp(`\\.c${i}\\.(name|g\\d+|new|differs)$`).test(n.id));
    for (const n of mine) if (n.rect[1] < cy + ph + top) out.push(`${n.id} rises to ${n.rect[1]}, above its name line's top ${cy + ph + top}`);
    if (!mine.length) return null;
    const x0 = Math.min(...mine.map((n) => n.rect[0])), x1 = Math.max(...mine.map((n) => n.rect[0] + n.rect[2]));
    if (x0 < cx - reach || x1 > cx + cw + reach) out.push(`cell ${i}'s name line runs ${x0}..${x1}, more than ${reach} px outside its cell ${cx}..${cx + cw}`);
    return { i, cy, x0, x1 };
  });
  for (const a of ext) for (const b of ext) if (a && b && a.i < b.i && a.cy === b.cy && b.x0 - a.x1 < apart && b.x0 >= a.x0) out.push(`the name lines of cells ${a.i} and ${b.i} are ${b.x0 - a.x1} px apart, under ${apart}`);
  return out;
}
