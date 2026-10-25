// A species' lineage, Level 3's model (library.json l3): who came from whom, as one fixed graph. Pure: the save in, the nodes, the links and the selectors out; nothing here draws (views/requests.mjs names the
// pictures, lineage-pictures.mjs draws them) and no parent is ever guessed or any kinship number given.
//   - The parents of a mibi are the ones its save records, in that order (m.parents); a shed-pod child's single parent is its genome's origin (cross.mjs shedPod: origin.kind "shed", parentIds [id, id]).
//   - generation: the longest path to a founder (0 for a founder), a shed step counting as one: the rows. crossDepth: the crosses on that path, a shed step none: the Sitting's deep line (sitting.mjs lineDepth).
//   - Rows: row 0 holds the founders' pods (one per founder, never shared, never a target); a mibi's row is its generation + 1, so a child sits one row below its deeper parent with a link to each parent.
//     The bud is a pod in the generation it will take: one row below its deeper parent, or a growing founder in row 1 under its own pod.
//   - Blocks: families joined by a cross form one block, placed by its earliest founder; blocks go in founding order, l3.block.gap apart (from a block's rightmost node over all its rows to the next block's first).
//   - u is in half-sibling units (siblings are 2 apart). Within a block the nodes are placed in birth order, each to the right of every node already in its row (a founder of every node already in its block), so a birth never moves a node already placed
//     in its block; a block that widens moves the blocks after it by a rigid translation and the blocks before it never.
import { mibiById, speciesOf } from "./state.mjs";

// The parents a mibi's save records (ids, in the save's order, each once), else a shed-pod child's single parent; [] for a founder.
export function parentsOf(st, m) {
  if (!m) return [];
  if (Array.isArray(m.parents) && m.parents.length) return [...new Set(m.parents.filter((p) => p && p.id != null).map((p) => p.id))];
  const o = m.genome?.origin; if (o?.kind === "shed" && Array.isArray(o.parentIds) && o.parentIds[0] != null) return [o.parentIds[0]];
  return [];
}
// The longest path from a mibi to a founder of its recorded tree (a founder 0); released ancestors count, a parent not in the save counts as a founder beyond it, a loop in a recorded tree ends.
export function generation(st, m, seen = new Set()) {
  if (!m || seen.has(m.id)) return 0;
  const ps = parentsOf(st, m); if (!ps.length) return 0; seen.add(m.id);
  return 1 + Math.max(0, ...ps.map((id) => generation(st, mibiById(st, id), new Set(seen))));
}

// The crosses on the longest path of a mibi's recorded tree (a founder 0): a cross adds one, a shed step none (a shed-pod child carries its parent's depth; later crosses through it count). The Sitting's deep line
// (sitting.mjs lineDepth; the game designer: four generations of crosses). Released ancestors count, a parent not in the save counts as a founder beyond it, a loop in a recorded tree ends.
export function crossDepth(st, m, seen = new Set()) {
  if (!m || seen.has(m.id)) return 0; seen.add(m.id);
  const ps = parentsOf(st, m); if (!ps.length) return 0;
  if (m.genome?.origin?.kind === "shed") return crossDepth(st, mibiById(st, ps[0]), new Set(seen));
  return 1 + Math.max(0, ...ps.map((id) => crossDepth(st, mibiById(st, id), new Set(seen))));
}

const GAP = 4, STEP = 2;
// The lineage of `species`: { species, nodes, links, rows, span: [u0, u1], blocks: [{ founder, u0, u1 }] }.
//   nodes: { id (node.<mibi id> | node.bud | pod.<founder id> | pod.bud), kind (mibi | pod | bud), row, u, released, mibi (its id, or null), block, parents (node ids, the save's order), children (node ids, birth order) }, by row, then u.
//   links: { a: [u, row], b: [u, row], faded } in grid units, orthogonal: a pod to its founder one vertical; a child of one parent on its column one vertical; otherwise each parent drops to a bus half a row above
//   its children, the bus spans the family, and each child drops from it. A link from a released parent is faded (a pod's to a released founder too); the bus and the children's drops are faded when every parent is.
// opts: { gap } (library.json l3.block.gap).
export function lineageOf(st, species, opts = {}) {
  const gap = opts.gap ?? GAP;
  const ms = st.mibis.filter((m) => speciesOf(m) === species).sort((a, b) => a.id - b.id), byId = new Map(ms.map((m) => [m.id, m]));
  const bud = st.bud && speciesOf(st.bud) === species ? st.bud : null;
  const known = (x) => parentsOf(st, x).filter((id) => byId.has(id));
  const rowOf = (m) => generation(st, m) + 1;
  // the births in order: the mibis by id, the bud last
  const births = ms.map((m) => ({ key: "node." + m.id, m, kind: "mibi", row: rowOf(m), parents: known(m).map((id) => "node." + id), founder: !parentsOf(st, m).length, released: !!m.released }));
  if (bud) { const ps = known(bud), founder = !parentsOf(st, bud).length; births.push({ key: "node.bud", m: null, kind: "bud", row: ps.length ? 1 + Math.max(...ps.map((id) => rowOf(byId.get(id)))) : 1, parents: ps.map((id) => "node." + id), founder, released: false }); }
  // the blocks: a union over every node and its known parents; a block's key is its earliest founder (founding order), else its earliest birth
  const up = new Map(births.map((b) => [b.key, b.key])), find = (k) => { while (up.get(k) !== k) { up.set(k, up.get(up.get(k))); k = up.get(k); } return k; };
  for (const b of births) for (const p of b.parents) up.set(find(b.key), find(p));
  const order = new Map(births.map((b, i) => [b.key, i])), groups = new Map();
  for (const b of births) { const r = find(b.key); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(b); }
  const keyOf = (g) => { const f = g.find((b) => b.founder); return order.get((f ?? g[0]).key); };
  const blocks = [...groups.values()].sort((a, b) => keyOf(a) - keyOf(b));
  const nodes = [], links = [], out = [];
  let off = 0;
  blocks.forEach((g, bi) => {
    const cur = new Map(), last = new Map(), at = new Map(), used = (r) => cur.get(r) ?? -STEP;
    const local = [];
    for (const b of g) {   // birth order within the block (the group keeps the births' order)
      let u;
      if (b.founder) { u = Math.max(-STEP, ...cur.values()) + STEP; cur.set(0, u); }   // a founder (or a growing one) under its own pod in row 0, to the right of every node already in its block
      else if (!b.parents.length) u = used(b.row) + STEP;   // its recorded parents are not in the save: placed, never linked
      else { const fam = b.parents.join("+"), want = last.has(fam) ? last.get(fam) + STEP : Math.floor(b.parents.reduce((s, p) => s + (at.get(p) ?? 0), 0) / b.parents.length); u = Math.max(want, used(b.row) + STEP); last.set(fam, u); }
      cur.set(b.row, Math.max(used(b.row), u)); at.set(b.key, u); local.push({ b, u });
      if (b.founder) local.push({ b: { key: b.m ? "pod." + b.m.id : "pod.bud", kind: "pod", row: 0, parents: [], released: false, m: null, pod: true, of: b.key }, u });
    }
    const max = Math.max(...local.map((x) => x.u));
    for (const { b, u } of local) nodes.push({ id: b.key, kind: b.kind, row: b.row, u: u + off, released: b.released, mibi: b.m ? b.m.id : null, block: bi, parents: b.pod ? [] : b.founder ? [b.m ? "pod." + b.m.id : "pod.bud"] : b.parents, children: [] });
    out.push({ founder: g.find((b) => b.founder)?.m?.id ?? null, u0: off, u1: off + max });
    off += max + gap;
  });
  const node = new Map(nodes.map((n) => [n.id, n]));
  for (const b of births) for (const p of node.get(b.key).parents) node.get(p)?.children.push(b.key);
  // the links: each family (the children of one set of parents) once
  const fams = new Map();
  for (const n of nodes) { if (!n.parents.length) continue; const k = n.parents.join("+"); if (!fams.has(k)) fams.set(k, []); fams.get(k).push(n); }
  for (const [k, kids] of fams) {
    const ps = k.split("+").map((id) => node.get(id)), row = kids[0].row, allFaded = ps.every((p) => p.released);
    if (ps.length === 1 && kids.length === 1 && ps[0].u === kids[0].u) { links.push({ a: [ps[0].u, ps[0].row], b: [kids[0].u, row], faded: ps[0].kind === "pod" ? kids[0].released : ps[0].released }); continue; }   // a pod to its founder: faded with a released founder
    const y = row - 0.5, xs = [...ps, ...kids].map((n) => n.u);
    for (const p of ps) links.push({ a: [p.u, p.row], b: [p.u, y], faded: p.released });
    if (Math.min(...xs) < Math.max(...xs)) links.push({ a: [Math.min(...xs), y], b: [Math.max(...xs), y], faded: allFaded });
    for (const c of kids) links.push({ a: [c.u, y], b: [c.u, row], faded: allFaded });
  }
  nodes.sort((a, b) => a.row - b.row || a.u - b.u);
  const us = nodes.map((n) => n.u);
  return { species, nodes, links, rows: nodes.length ? Math.max(...nodes.map((n) => n.row)) + 1 : 0, span: nodes.length ? [Math.min(...us), Math.max(...us)] : [0, 0], blocks: out };
}
// The focus targets: the mibis and the bud, never a pod (node ids, by row then u).
export const targetsOf = (lin) => lin.nodes.filter((n) => n.kind !== "pod").map((n) => n.id);

// The host's answers to l3.focus.graph's selectors for the ring on `cur` (library.json l3.focus.selectors), in zoom `zoom` ("far" | "close"), after `last` (the move that brought the ring to cur:
// { up: <the child the ring came up from> } straight after a ▲, else null). Returns { "node.parent", "node.child", "node.left", "node.right" }, each a node id, a selector with no answer left out (the graph's "none").
//   node.parent: the first recorded parent that is a target (a founder's pod is not);
//   node.left / node.right: straight after a ▲, the other parent of the child just left (the parents may sit on different rows); otherwise the previous or next target on the row (within the block in CLOSE, across blocks in FAR);
//   node.child: the child just come up from, straight after a ▲; otherwise the first child.
export function resolveOf(lin, cur, zoom, last = null) {
  const node = new Map(lin.nodes.map((n) => [n.id, n])), n = node.get(cur), out = {}; if (!n || n.kind === "pod") return out;
  const target = (id) => node.get(id) && node.get(id).kind !== "pod";
  const p = n.parents.find(target); if (p) out["node.parent"] = p;
  const from = last?.up && node.get(last.up), other = from && from.parents.includes(cur) ? from.parents.find((q) => q !== cur && target(q)) : null;
  if (other) { out["node.left"] = other; out["node.right"] = other; }
  else {
    const row = lin.nodes.filter((q) => q.row === n.row && q.kind !== "pod" && (zoom === "far" || q.block === n.block)).sort((a, b) => a.u - b.u), i = row.findIndex((q) => q.id === cur);
    if (i > 0) out["node.left"] = row[i - 1].id; if (i >= 0 && i < row.length - 1) out["node.right"] = row[i + 1].id;
  }
  const child = from && from.parents.includes(cur) ? from.id : n.children.find(target); if (child) out["node.child"] = child;
  return out;
}

// ---- CLOSE's grid (library.json l3.close): a node's centre at x = x0 + u du - cam x, y = y0 + row drow - cam y; its box (boxes.<kind>) centred there ----
const boxOf = (C, n) => C.boxes[n.kind] ?? C.boxes.mibi;
// Whether the whole lineage fits CLOSE's view (every node's box inside it with some camera): the extent of the boxes is no wider and no taller than the view.
export function fitsClose(lin, C) {
  if (!lin.nodes.length) return true;
  const xs = lin.nodes.flatMap((n) => { const w = boxOf(C, n)[0] / 2, x = C.grid.x0 + n.u * C.grid.du; return [x - w, x + w]; }), ys = lin.nodes.flatMap((n) => { const h = boxOf(C, n)[1] / 2, y = C.grid.y0 + n.row * C.grid.drow; return [y - h, y + h]; });
  return Math.max(...xs) - Math.min(...xs) <= C.view[2] && Math.max(...ys) - Math.min(...ys) <= C.view[3];
}
// The camera [x, y] that puts node `id` at the screen point `at` clamped so its box lies inside the comfort zone (C.comfort), or, with no `at`, at the zone's centre (the entry).
export function camAt(lin, id, C, at = null) {
  const n = lin.nodes.find((q) => q.id === id); if (!n) return [0, 0];
  const [bw, bh] = boxOf(C, n), z = C.comfort, wx = C.grid.x0 + n.u * C.grid.du, wy = C.grid.y0 + n.row * C.grid.drow, clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  const sx = at ? clamp(at[0], z[0] + bw / 2, z[0] + z[2] - bw / 2) : z[0] + z[2] / 2, sy = at ? clamp(at[1], z[1] + bh / 2, z[1] + z[3] - bh / 2) : z[1] + z[3] / 2;
  return [wx - sx, wy - sy];
}

// ---- the pictures' geometry (library.json l3.far, l3.mini): the generator's facts, pure; lineage-pictures.mjs draws on it ----
// FAR's geometry for a lineage: { sx, sy, rows, span (sibling steps), left, top (the dot box of u0, row 0), boxes: { node id: [x, y, d, d] }, X(u), Y(row) (a grid point's pixel, row may be a half) }.
export function farGeometry(lin, spec) {
  const F = spec.l3.far, [W, H] = F.rect.slice(2), d = F.dot, [u0, u1] = lin.span, span = (u1 - u0) / 2, R = Math.max(1, lin.rows);
  const fit = span > 0 ? Math.floor((F.spacing.share * W) / span) : F.spacing.max;
  if (fit < F.spacing.min) throw new Error(`FAR of ${lin.species}: a span of ${span} sibling steps gives ${fit} px spacing, below ${F.spacing.min}: it would need a camera (UI/UX)`);
  const sx = Math.min(F.spacing.max, fit), rowsFit = R >= 2 ? Math.floor((H - d - 2 * F.fit.margin) / (R - 1)) : Infinity, sy = Math.min(Math.round(1.5 * sx), rowsFit);
  if (rowsFit < F.fit.syMin) throw new Error(`FAR of ${lin.species}: ${R} rows give ${rowsFit} px between rows, below ${F.fit.syMin}: it would need a camera (UI/UX)`);   // the rows' fit refuses; 1.5 sx below it is the span's (sx >= 16)
  const left = Math.floor((W - (Math.round(((u1 - u0) * sx) / 2) + d)) / 2), top = Math.floor((H - ((R - 1) * sy + d)) / 2);
  const bx = (u) => left + Math.round(((u - u0) * sx) / 2), by = (row) => top + Math.round(row * sy);
  const boxes = {}; for (const n of lin.nodes) boxes[n.id] = [bx(n.u), by(n.row), d, d];
  return { sx, sy, rows: R, span, left, top, boxes, X: (u) => bx(u) + d / 2, Y: (row) => by(row) + d / 2 };
}
// The mini's geometry: one uniform s = min(208 / 992, 96 / 510) over the FAR picture, centred: { s, ox, oy, boxes (the 4 x 4 dot boxes; a pod's and the bud's the one pixel at its centre), scale: [kx, ky] (mini px per CLOSE px),
// origin: [mx, my] (the mini position of the grid point u 0, row 0) }: a CLOSE point (X, Y) is at (mx + (X - 16) kx, my + (Y - 44) ky) in the mini.
export function miniGeometry(lin, spec, far = farGeometry(lin, spec)) {
  const [FW, FH] = spec.l3.far.rect.slice(2), [MW, MH] = spec.l3.mini.rect.slice(2), k = spec.l3.mini.dot, s = Math.min(MW / FW, MH / FH), ox = Math.round((MW - FW * s) / 2), oy = Math.round((MH - FH * s) / 2);
  const at = (x, y) => [Math.round(x * s + ox), Math.round(y * s + oy)], boxes = {};
  for (const n of lin.nodes) { const b = far.boxes[n.id], [cx, cy] = at(b[0] + b[2] / 2, b[1] + b[3] / 2); boxes[n.id] = n.kind === "mibi" ? [cx - k / 2, cy - k / 2, k, k] : [cx, cy, 1, 1]; }
  return { s, ox, oy, boxes, at, scale: [(s * far.sx) / 2 / spec.l3.close.grid.du, (s * far.sy) / spec.l3.close.grid.drow], origin: [ox + far.X(0) * s, oy + far.Y(0) * s] };
}

