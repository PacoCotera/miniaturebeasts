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
import { traitState, heritableTraits } from "./genome.mjs";

// The parents a mibi's save records (ids, in the save's order, each once), else a shed-pod child's single parent; [] for a founder.
export function parentsOf(st, m) {
  if (!m) return [];
  if (Array.isArray(m.parents) && m.parents.length) return [...new Set(m.parents.filter((p) => p && p.id != null).map((p) => p.id))];
  const o = m.genome?.origin; if (o?.kind === "shed" && Array.isArray(o.parentIds) && o.parentIds[0] != null) return [o.parentIds[0]];
  return [];
}
// A walk's memory for one call that walks many mibis (lineageOf, sitting.mjs momentsEarned): each mibi's value is found once and kept, so a walk is linear in the tree, never in its paths (sibling crosses
// share their parents: without it 16 generations are 2^16 paths). One per call: the save may change between calls.
export const walkMemo = () => ({ gen: new Map(), cross: new Map(), founders: new Map() });
// One mibi's value by a walk over its recorded parents, kept in memo[key]: `onPath` holds the mibis the walk is inside (a loop in a recorded tree ends there, as 0), `of(ps)` the value from its parents' ids.
function walked(m, memo, key, onPath, of) {
  if (!m || onPath.has(m.id)) return 0;
  if (memo[key].has(m.id)) return memo[key].get(m.id);
  onPath.add(m.id); const v = of(); onPath.delete(m.id);
  memo[key].set(m.id, v); return v;
}
// The longest path from a mibi to a founder of its recorded tree (a founder 0); released ancestors count, a parent not in the save counts as a founder beyond it, a loop in a recorded tree ends.
export function generation(st, m, memo = walkMemo(), onPath = new Set()) {
  return walked(m, memo, "gen", onPath, () => { const ps = parentsOf(st, m); return ps.length ? 1 + Math.max(0, ...ps.map((id) => generation(st, mibiById(st, id), memo, onPath))) : 0; });
}

// The crosses on the longest path of a mibi's recorded tree (a founder 0): a cross adds one, a shed step none (a shed-pod child carries its parent's depth; later crosses through it count). The Sitting's deep line
// (sitting.mjs lineDepth; the game designer: four generations of crosses). Released ancestors count, a parent not in the save counts as a founder beyond it, a loop in a recorded tree ends.
export function crossDepth(st, m, memo = walkMemo(), onPath = new Set()) {
  return walked(m, memo, "cross", onPath, () => {
    const ps = parentsOf(st, m); if (!ps.length) return 0;
    if (m.genome?.origin?.kind === "shed") return crossDepth(st, mibiById(st, ps[0]), memo, onPath);
    return 1 + Math.max(0, ...ps.map((id) => crossDepth(st, mibiById(st, id), memo, onPath)));
  });
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
  const memo = walkMemo(), rowOf = (m) => generation(st, m, memo) + 1;
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
// How far a mibi and the bud are drawn below their grid point in CLOSE: their name line's bottom (l3.close.names: its lineTop, plus the role's pitch, frame.json type), so a node wholly inside the view holds its name.
export const nameBelow = (C, frame) => { const R = frame.type.roles[C.names.role], p = R.pitch ?? frame.type.pitch[String(frame.type.fonts[R.font][0])]; return { mibi: C.names.mibi + p, bud: C.names.bud + p }; };
// The extent of the whole lineage in CLOSE's grid px at camera 0: [L, T, R, B], a named node (mibi, bud) at max(box, names.clip) wide and down to its name line's bottom (below), a pod at its box.
export function extentOf(lin, C, below) {
  const xs = [], ys = [];
  for (const n of lin.nodes) {
    const [bw, bh] = boxOf(C, n), [x, y] = worldOf(C, n), w = (n.kind === "pod" ? bw : Math.max(bw, C.names.clip)) / 2;
    xs.push(x - w, x + w); ys.push(y - bh / 2, y + (below[n.kind] ?? bh / 2));
  }
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}
// Whether the whole lineage fits CLOSE's view (every node with its name inside it with some camera): the extent is no wider and no taller than the view.
export function fitsClose(lin, C, below) {
  if (!lin.nodes.length) return true;
  const [l, t, r, b] = extentOf(lin, C, below); return r - l <= C.view[2] && b - t <= C.view[3];
}
// The camera [x, y] that puts node `id` at the screen point `at` clamped so its box lies inside the comfort zone (C.comfort), or, with no `at`, at the zone's centre (the entry); a tree that fits the view (fitsClose) has its extent centred instead, whatever `at`.
export function camAt(lin, id, C, at = null, below) {
  const n = lin.nodes.find((q) => q.id === id); if (!n) return [0, 0];
  if (fitsClose(lin, C, below)) { const [l, t, r, bt] = extentOf(lin, C, below); return [Math.floor((l + r - 776) / 2), Math.floor((t + bt - 598) / 2)]; }   // a fitting tree: its whole extent centred in the view (16 + 760, 44 + 554)
  const [bw, bh] = boxOf(C, n), z = C.comfort, wx = C.grid.x0 + n.u * C.grid.du, wy = C.grid.y0 + n.row * C.grid.drow, clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  const sx = at ? clamp(at[0], z[0] + bw / 2, z[0] + z[2] - bw / 2) : z[0] + z[2] / 2, sy = at ? clamp(at[1], z[1] + bh / 2, z[1] + z[3] - bh / 2) : z[1] + z[3] / 2;
  return [wx - sx, wy - sy];
}

// A node's grid point in CLOSE's px with no camera (x0 + u du, y0 + row drow), its centre on screen under camera cam (that less cam), and its box there: boxes.<kind> centred on the centre.
const worldOf = (C, n) => [C.grid.x0 + n.u * C.grid.du, C.grid.y0 + n.row * C.grid.drow];
export const closeRect = (C, n, cam) => { const [wx, wy] = worldOf(C, n), [w, h] = boxOf(C, n); return [wx - cam[0] - w / 2, wy - cam[1] - h / 2, w, h]; };
const holds = (z, r) => r[0] >= z[0] && r[1] >= z[1] && r[0] + r[2] <= z[0] + z[2] && r[1] + r[3] <= z[1] + z[3];
// Whether node n lies wholly inside CLOSE's view under camera cam (a node that would cross the view's edge is not drawn). below: { <kind>: px }, how far a node of that kind is drawn below its grid point
// (its name line's bottom: views/library-props.mjs nameBelow), else its box's half height.
export const inView = (C, n, cam, below = null) => { const r = closeRect(C, n, cam), b = below?.[n.kind]; return holds(C.view, b != null ? [r[0], r[1], r[2], r[3] / 2 + b] : r); };
// The pan (l3.close.camera): when node id's box lies outside the comfort zone under camera cam, the least whole-pixel move of the camera that brings it back inside, on each axis; else cam itself.
export function panFor(lin, id, C, cam) {
  const n = lin.nodes.find((q) => q.id === id); if (!n) return [...cam];
  const r = closeRect(C, n, cam), z = C.comfort, d = (lo, len, a, alen) => (lo < a ? lo - a : lo + len > a + alen ? lo + len - (a + alen) : 0);
  return [cam[0] + d(r[0], r[2], z[0], z[2]), cam[1] + d(r[1], r[3], z[1], z[3])];
}
// A pan's step cameras (l3.close.pan: frac in %, one per step): from + trunc((to - from) frac / 100) on each axis, the whole pixels the face's pan draws at (anim.c anim_pan_at).
export const panSteps = (from, to, frac) => frac.map((f) => [0, 1].map((k) => from[k] + Math.trunc(((to[k] - from[k]) * f) / 100)));
// The node slots (l3.close.slots): the nodes wholly inside the view (their names too: below, as inView) under any of the cameras (a pan's steps), the nodes under the last camera first, then those only under a pan's earlier steps, each by row then u, at most C.slots of them.
export const slotsOf = (lin, C, cams, below = null) => {
  const last = cams[cams.length - 1], fin = lin.nodes.filter((n) => inView(C, n, last, below)), early = lin.nodes.filter((n) => !fin.includes(n) && cams.some((c) => inView(C, n, c, below)));
  return [...fin, ...early].slice(0, C.slots);
};
// The camera saved as an offset from its node (UI/UX; ui.lib.l3[species].cam): the camera less the node's grid point; and the camera back from it. A node not in the lineage is at the origin.
const worldOfId = (lin, C, id) => { const n = lin.nodes.find((q) => q.id === id); return n ? worldOf(C, n) : [0, 0]; };
export const camOffset = (lin, id, C, cam) => { const w = worldOfId(lin, C, id); return [cam[0] - w[0], cam[1] - w[1]]; };
export const camFromOffset = (lin, id, C, off) => { const w = worldOfId(lin, C, id); return [w[0] + off[0], w[1] + off[1]]; };

// ---- the pictures' geometry (library.json l3.far, l3.mini): the generator's facts, pure; lineage-pictures.mjs draws on it ----
// FAR's geometry for a lineage: { sx, sy, rows, span (sibling steps), left, top (the dot box of u0, row 0), boxes: { node id: [x, y, d, d] }, X(u), Y(row) (a grid point's pixel, row may be a half) }.
export function farGeometry(lin, spec) {
  const F = spec.l3.far, [W, H] = F.rect.slice(2), d = F.dot, [u0, u1] = lin.span, span = (u1 - u0) / 2, R = Math.max(1, lin.rows);
  const fit = span > 0 ? Math.floor((F.spacing.share * W) / span) : F.spacing.max;
  if (fit < F.spacing.min) throw new Error(`FAR of ${lin.species}: a span of ${span} sibling steps gives ${fit} px spacing, below ${F.spacing.min}: it would need a camera (UI/UX)`);
  const sx = Math.min(F.spacing.max, fit), rowsFit = R >= 2 ? Math.floor((H - d - 2 * F.fit.margin) / (R - 1)) : Infinity, sy = Math.min(Math.max(Math.round(1.5 * sx), F.fit.syMin), rowsFit);
  if (rowsFit < F.fit.syMin) throw new Error(`FAR of ${lin.species}: ${R} rows give ${rowsFit} px between rows, below ${F.fit.syMin}: it would need a camera (UI/UX)`);   // the rows' fit refuses; 1.5 sx below it is the span's (sx >= 16)
  const left = Math.floor((W - (Math.round(((u1 - u0) * sx) / 2) + d)) / 2), top = Math.floor((H - ((R - 1) * sy + d)) / 2);
  const bx = (u) => left + Math.round(((u - u0) * sx) / 2), by = (row) => top + Math.round(row * sy);
  const boxes = {}; for (const n of lin.nodes) boxes[n.id] = [bx(n.u), by(n.row), d, d];
  return { sx, sy, rows: R, span, left, top, boxes, X: (u) => bx(u) + d / 2, Y: (row) => by(row) + d / 2 };
}
// The mini's geometry: one uniform s = min(208 / 992, 96 / 510) over the FAR picture, centred: { s, ox, oy, dot (d = min(4, max(2, floor(min(sx, sy) s) - 1))), boxes (the d x d dot boxes at round(centre s + origin) - floor(d / 2); a pod's and the bud's the one pixel at its centre), scale: [kx, ky] (mini px per CLOSE px),
// origin: [mx, my] (the mini position of the grid point u 0, row 0) }: a CLOSE point (X, Y) is at (mx + (X - 16) kx, my + (Y - 44) ky) in the mini.
export function miniGeometry(lin, spec, far = farGeometry(lin, spec)) {
  const M = spec.l3.mini, [FW, FH] = spec.l3.far.rect.slice(2), [MW, MH] = M.rect.slice(2), s = Math.min(MW / FW, MH / FH), ox = Math.round((MW - FW * s) / 2), oy = Math.round((MH - FH * s) / 2);
  const k = Math.min(M.dot, Math.max(M.dotMin, Math.floor(Math.min(far.sx, far.sy) * s) - 1));   // the mini dot (UI/UX): p = floor(min(sx, sy) s), d = min(4, max(2, p - 1))
  const at = (x, y) => [Math.round(x * s + ox), Math.round(y * s + oy)], boxes = {};
  for (const n of lin.nodes) { const b = far.boxes[n.id], [cx, cy] = at(b[0] + b[2] / 2, b[1] + b[3] / 2); boxes[n.id] = n.kind === "mibi" ? [cx - Math.floor(k / 2), cy - Math.floor(k / 2), k, k] : [cx, cy, 1, 1]; }
  return { s, ox, oy, dot: k, boxes, at, scale: [(s * far.sx) / 2 / spec.l3.close.grid.du, (s * far.sy) / spec.l3.close.grid.drow], origin: [ox + far.X(0) * s, oy + far.Y(0) * s] };
}

// CLOSE's view as a box in the mini (l3.mini.facts: a CLOSE point (X, Y) is at (mx + (X - grid.x0) kx, my + (Y - grid.y0) ky)) under camera cam: the view's corners, each rounded, then cut to the mini's own rect;
// [x, y, w, h] in the mini's coordinates (the inset's).
export function overviewBox(lin, spec, cam, mini = miniGeometry(lin, spec)) {
  const C = spec.l3.close, V = C.view, [kx, ky] = mini.scale, [mx, my] = mini.origin, [MW, MH] = spec.l3.mini.rect.slice(2);
  const X = (x) => Math.round(mx + (x + cam[0] - C.grid.x0) * kx), Y = (y) => Math.round(my + (y + cam[1] - C.grid.y0) * ky);
  const x0 = Math.max(0, X(V[0])), y0 = Math.max(0, Y(V[1])), x1 = Math.min(MW, X(V[0] + V[2])), y1 = Math.min(MH, Y(V[1] + V[3]));
  return [x0, y0, Math.max(0, x1 - x0), Math.max(0, y1 - y0)];
}

// ---- compare (library.json l3.compare): one computation for the fact, the block light and the path ----
// What two mibis of one species show alike, from their read looks (traitState(...).shows, the whole look: "charcoal and ash" is not "ash"), trait by trait on the traits read on both; never the stamps' patterns.
// Returns { read: [trait ids read on both], same: [the traits among them that show the same, in frame order], lit: [the chapter ids read on both whose compared traits, one or more, all show the same] }.
export function compareLooks(frame, a, b) {
  const both = (ch) => (a.read ?? []).includes(ch) && (b.read ?? []).includes(ch), read = [], same = [], per = new Map();
  for (const { chapter, trait } of heritableTraits(frame)) {
    if (!both(chapter)) continue;
    const eq = traitState(frame, trait, a.genome).shows === traitState(frame, trait, b.genome).shows; read.push(trait.id); if (eq) same.push(trait);
    const p = per.get(chapter) ?? { n: 0, eq: 0 }; p.n++; if (eq) p.eq++; per.set(chapter, p);
  }
  return { read, same, lit: frame.chapters.map((c) => c.id).filter((c) => per.has(c) && per.get(c).n > 0 && per.get(c).eq === per.get(c).n) };
}
// The recorded line between two mibis of a lineage: the shortest walk over the recorded parents and children (mibis only; a pod or the bud is never on it), as the links draw it (lineageOf's links), in grid units
// with the row in half rows ({ a: [u, h], b: [u, h] }, h = 2 row): a parent's drop to its children's bus, the bus between the two columns, the child's drop; one vertical for a lone child on its lone parent's column.
// [] when the two are one mibi, either is not a mibi of the lineage, or no recorded line joins them.
export function pathBetween(lin, from, to) {
  const node = new Map(lin.nodes.map((n) => [n.id, n])), mibi = (id) => node.get(id)?.kind === "mibi";
  if (from === to || !mibi(from) || !mibi(to)) return [];
  const prev = new Map([[from, null]]), queue = [from];
  while (queue.length && !prev.has(to)) { const id = queue.shift(), n = node.get(id); for (const q of [...n.parents, ...n.children]) if (mibi(q) && !prev.has(q)) { prev.set(q, id); queue.push(q); } }
  if (!prev.has(to)) return [];
  const walk = []; for (let id = to; id != null; id = prev.get(id)) walk.unshift(node.get(id));
  const segs = [];
  for (let i = 1; i < walk.length; i++) {
    const [x, y] = [walk[i - 1], walk[i]], [p, c] = y.parents.includes(x.id) ? [x, y] : [y, x], kids = lin.nodes.filter((q) => q.parents.join("+") === c.parents.join("+"));
    if (c.parents.length === 1 && kids.length === 1 && p.u === c.u) { segs.push({ a: [p.u, 2 * p.row], b: [c.u, 2 * c.row] }); continue; }
    const h = 2 * c.row - 1; segs.push({ a: [p.u, 2 * p.row], b: [p.u, h] }); if (p.u !== c.u) segs.push({ a: [Math.min(p.u, c.u), h], b: [Math.max(p.u, c.u), h] }); segs.push({ a: [c.u, h], b: [c.u, 2 * c.row] });
  }
  return segs;
}
