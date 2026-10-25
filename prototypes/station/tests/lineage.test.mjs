// Level 3's lineage (lineage.mjs) and its pictures (lineage-pictures.mjs), library.json l3: the rows (the founders' pods in row 0, a mibi one row below its deeper parent), the blocks (a cross joins two families,
// blocks in founding order, l3.block.gap apart), the shed-pod child, a released parent, the bud, the parents in the save's order, no reflow after a birth, the selectors in both zooms, FAR's spacing and its refusals,
// the dots, the pods' ovals and the neutral ring by the art director's pixel rule, and the mini. Nothing here is drawn on the face.   node --test prototypes/station/tests/lineage.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, podGenome } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import * as T from "../src/sitting.mjs";
import { nameBelow, extentOf, parentsOf, generation, crossDepth, lineageOf, targetsOf, resolveOf, fitsClose, camAt, walkMemo, closeRect, inView, panFor, panSteps, slotsOf, camOffset, camFromOffset, overviewBox } from "../src/lineage.mjs";
import { bodyColour, farGeometry, miniGeometry, farPicture, miniPicture } from "../src/lineage-pictures.mjs";
import { lineageInput } from "../src/views/library-props.mjs";
import { buildLineage } from "./fixtures/lineage.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const spec = JSON.parse(readFileSync(path.resolve(here, "../../ui/specs/station/library.json"), "utf8")), L3 = spec.l3, GAP = L3.block.gap, BELOW = nameBelow(L3.close, JSON.parse(readFileSync(path.resolve(here, "../../ui/specs/station/frame.json"), "utf8")));
const palette = Object.fromEntries(JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")).colours.map(([n, h]) => [n, [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))]));
const rgb = (n) => palette[n];
const world = (which = "full") => { const st = S.freshSt("w1", 3, 1e6); S.normalize(st); st.turn = 20; const by = buildLineage(st, which, { turn: 20 }); return { st, by, lin: lineageOf(st, "S01", { gap: GAP }) }; };
const nodeOf = (lin, id) => lin.nodes.find((n) => n.id === id);
const at = (lin, m) => { const n = nodeOf(lin, "node." + m.id); return [n.row, n.u]; };
const plain = (o) => JSON.parse(JSON.stringify(o));
// a mibi born into the save: a cross of two recorded parents (or a founder with none), the next id
function born(st, name, parents) { const id = st.nextMibi++, m = { id, name, species: "S01", sp: 0, genome: parents ? null : podGenome(frameOf("S01"), id), read: [], parents: parents ? parents.map((p) => ({ id: p.id, name: p.name })) : null, released: false }; st.mibis.push(m); return m; }

test("two founders and their children: each founder in row 1 under its own pod (row 0, the same u), their children one row below, both links through one bus; pods are never targets", () => {
  const { lin, by, st } = world("one");
  assert.deepEqual(at(lin, by.Reed), [1, 0]); assert.deepEqual(at(lin, by.Rush), [1, 2]);
  assert.deepEqual(plain(nodeOf(lin, "pod." + by.Reed.id)), { id: "pod." + by.Reed.id, kind: "pod", row: 0, u: 0, released: false, mibi: null, block: 0, parents: [], children: ["node." + by.Reed.id] });
  const kids = ["Hazel", "Ivy", "Dot", "Fern", "Moss", "Wren", "Sorrel", "Lark"].map((n) => at(lin, by[n]));
  assert.deepEqual(kids, [[2, 1], [2, 3], [2, 5], [2, 7], [2, 9], [2, 11], [2, 13], [2, 15]], "siblings 2 u (96 px in CLOSE) apart, the first under its parents' middle, each to the right of the last");
  assert.deepEqual(lin.links.filter((l) => l.a[0] === 0 && l.b[0] === 0).map((l) => [l.a, l.b]), [[[0, 0], [0, 1]], [[0, 1], [0, 1.5]]], "the pod's one vertical to its founder, then the founder's drop to the bus");
  assert.ok(lin.links.some((l) => l.a[1] === 1.5 && l.b[1] === 1.5 && l.a[0] === 0 && l.b[0] === 15), "the bus spans the parents and the children");
  assert.ok(targetsOf(lin).every((id) => id.startsWith("node.")) && !targetsOf(lin).some((id) => id.startsWith("pod.")), "pods are never targets");
  assert.equal(lin.blocks.length, 1); assert.equal(lin.rows, 3);
  for (const m of Object.values(by)) assert.equal(nodeOf(lin, "node." + m.id).row, generation(st, m) + 1, m.name + ": row = generation + 1");
  assert.equal(L3.close.grid.y0 + 1 * L3.close.grid.drow, 164, "the CLOSE grid puts the founders at y 164");
});

test("a joined block: Dot x Bean joins the Reed and Rush family to the Bean and Clover one; blocks go in founding order, l3.block.gap after the rightmost node of the block before", () => {
  const { lin, by, st } = world();
  assert.equal(lin.blocks.length, 2); assert.deepEqual(lin.blocks.map((b) => b.founder), [by.Reed.id, by.Nettle.id], "the joined block first (Reed founded first), then Nettle's");
  for (const n of ["Reed", "Rush", "Bean", "Clover", "Dot", "Moss", "Thistle"]) assert.equal(nodeOf(lin, "node." + by[n].id).block, 0, n + " in the joined block");
  const b0 = Math.max(...lin.nodes.filter((n) => n.block === 0).map((n) => n.u)), b1 = Math.min(...lin.nodes.filter((n) => n.block === 1).map((n) => n.u));
  assert.equal(b1 - b0, GAP, "the gap between blocks"); assert.deepEqual(at(lin, by.Bean), [1, 7], "a founder found later sits to the right of every node already in its block");
  for (const m of st.mibis) assert.equal(nodeOf(lin, "node." + m.id).row, generation(st, m) + 1, m.name + ": row = generation + 1");
});

test("a child of parents on different rows sits one row below the deeper; each parent drops to the bus half a row above it, so the shallower parent's link crosses the row between", () => {
  const { lin, by } = world();
  assert.deepEqual(at(lin, by.Dot), [2, 5]); assert.deepEqual(at(lin, by.Bean), [1, 7]); assert.deepEqual(at(lin, by.Fern), [3, 6]);
  assert.ok(lin.links.some((l) => l.a[0] === 7 && l.a[1] === 1 && l.b[0] === 7 && l.b[1] === 2.5), "Bean's drop from row 1 to the bus at 2.5");
  assert.ok(lin.links.some((l) => l.a[0] === 5 && l.a[1] === 2 && l.b[1] === 2.5), "Dot's drop");
});

test("a shed-pod child: its single parent is its genome's origin (m.parents is null, as for a founder); one link, one row below, in its parent's block, no pod of its own", () => {
  const { lin, by, st } = world();
  assert.equal(by.Thistle.parents, null); assert.equal(by.Thistle.genome.origin.kind, "shed"); assert.deepEqual(parentsOf(st, by.Thistle), [by.Ivy.id]);
  const n = nodeOf(lin, "node." + by.Thistle.id); assert.deepEqual(n.parents, ["node." + by.Ivy.id]); assert.equal(n.row, nodeOf(lin, "node." + by.Ivy.id).row + 1); assert.equal(n.block, 0);
  assert.ok(!nodeOf(lin, "pod." + by.Thistle.id), "no pod node"); assert.deepEqual(lin.links.filter((l) => l.b[0] === n.u && l.b[1] === n.row).map((l) => [l.a, l.b]), [[[3, 2], [3, 3]]], "one straight link from Ivy");
  assert.equal(generation(st, by.Thistle), generation(st, by.Ivy) + 1, "a shed step is a generation: a row");
  assert.equal(crossDepth(st, by.Thistle), crossDepth(st, by.Ivy), "a shed step is no cross: the Sitting's deep line does not count it"); assert.equal(T.lineDepth, crossDepth, "one definition: sitting.mjs's lineDepth is the lineage's crossDepth");
  assert.deepEqual([crossDepth(st, by.Sorrel), generation(st, by.Sorrel)], [3, 3], "a cross through a shed-pod child counts: Moss (2) x Thistle (1)"); assert.deepEqual([crossDepth(st, by.Reed), crossDepth(st, by.Dot), crossDepth(st, by.Moss)], [0, 1, 2]);
  assert.deepEqual(T.lineFounders(st, by.Thistle).sort(), T.lineFounders(st, by.Ivy).sort(), "a shed-pod child's line is its parent's");
});

test("a shed child recorded as the game designer ruled (parents [Ivy, Ivy], from.how shed) is no cross: crossDepth is Ivy's, generation Ivy's + 1, one link from Ivy, the line Ivy's", () => {
  const { by, st } = world(); by.Thistle.parents = [{ id: by.Ivy.id }, { id: by.Ivy.id }]; by.Thistle.from = { how: "shed" };
  assert.equal(crossDepth(st, by.Thistle), crossDepth(st, by.Ivy)); assert.equal(generation(st, by.Thistle), generation(st, by.Ivy) + 1);
  const lin = lineageOf(st, "S01", { gap: GAP }), n = nodeOf(lin, "node." + by.Thistle.id); assert.deepEqual(n.parents, ["node." + by.Ivy.id]);
  assert.equal(lin.links.filter((l) => l.b[0] === n.u && l.b[1] === n.row).length, 1, "one link from Ivy"); assert.equal(T.lineKey(st, by.Thistle), T.lineKey(st, by.Ivy));
});

test("a released parent with children: the parent is a faded node, its children normal nodes under it; the links from it are faded, the bus faded only when every parent is", () => {
  const { lin, by } = world();
  assert.equal(nodeOf(lin, "node." + by.Rush.id).released, true); assert.equal(nodeOf(lin, "node." + by.Ivy.id).released, false);
  const drop = (m) => lin.links.find((l) => l.a[0] === nodeOf(lin, "node." + m.id).u && l.a[1] === nodeOf(lin, "node." + m.id).row && l.b[1] > l.a[1]);
  assert.equal(drop(by.Rush).faded, true); assert.equal(drop(by.Reed).faded, false);
  assert.equal(lin.links.find((l) => l.a[1] === 1.5 && l.b[1] === 1.5 && l.a[0] === 0).faded, false, "Reed is not released: the bus is not faded");
  assert.equal(lin.links.find((l) => l.a[0] === nodeOf(lin, "pod." + by.Rush.id).u && l.a[1] === 0).faded, true, "a released founder's pod link is faded");
  const both = lin.links.filter((l) => l.a[1] === 1.5 && l.b[1] === 1.5 && l.a[0] >= 14); assert.equal(both.length, 1); assert.equal(both[0].faded, true, "Nettle and Yarrow both released: their bus is faded");
});

test("the bud: a pod in the generation it will take (one row below its deeper parent, a link to each, node.bud a target); a growing founder is a bud in row 1 under its own pod, and keeps that place once hatched", () => {
  const { lin, by, st } = world(), b = nodeOf(lin, "node.bud");
  assert.equal(b.kind, "bud"); assert.equal(b.row, Math.max(nodeOf(lin, "node." + by.Moss.id).row, nodeOf(lin, "node." + by.Thistle.id).row) + 1); assert.deepEqual(b.parents, ["node." + by.Moss.id, "node." + by.Thistle.id]);
  assert.ok(targetsOf(lin).includes("node.bud")); assert.equal(st.bud.parents.length, 2);
  const f = world("one"); f.st.bud = { kind: "founder", species: "S01", sp: 0, genome: f.st.mibis[0].genome, parents: null, read: [] };
  const g = lineageOf(f.st, "S01", { gap: GAP }), fb = nodeOf(g, "node.bud"), pod = nodeOf(g, "pod.bud");
  assert.equal(fb.row, 1); assert.equal(pod.row, 0); assert.equal(pod.u, fb.u); assert.deepEqual(fb.parents, ["pod.bud"]); assert.ok(!targetsOf(g).includes("pod.bud"));
  f.st.bud = null; const m = born(f.st, "Oat", null), h = lineageOf(f.st, "S01", { gap: GAP });
  assert.equal(nodeOf(h, "node." + m.id).u, fb.u, "the hatched founder takes the bud's place"); assert.equal(nodeOf(h, "pod." + m.id).u, pod.u, "and the same pod");
});

test("parents go in the order the save records them: the node's parents and the selector node.parent follow it", () => {
  const { st, by } = world(); let lin = lineageOf(st, "S01", { gap: GAP });
  assert.deepEqual(nodeOf(lin, "node." + by.Fern.id).parents, ["node." + by.Dot.id, "node." + by.Bean.id]); assert.equal(resolveOf(lin, "node." + by.Fern.id, "far")["node.parent"], "node." + by.Dot.id);
  by.Fern.parents.reverse(); lin = lineageOf(st, "S01", { gap: GAP });
  assert.deepEqual(nodeOf(lin, "node." + by.Fern.id).parents, ["node." + by.Bean.id, "node." + by.Dot.id]); assert.equal(resolveOf(lin, "node." + by.Fern.id, "far")["node.parent"], "node." + by.Bean.id);
});

test("no reflow: a birth in another block moves no node of the blocks before it; a birth that widens a block moves the blocks after it by one rigid translation and never a node inside them (no birth while a bud grows: the Incubator is busy)", () => {
  const { st, by } = world(), before = lineageOf(st, "S01", { gap: GAP }), pos = (lin) => Object.fromEntries(lin.nodes.map((n) => [n.id, [n.row, n.u, n.block]]));
  born(st, "Teasel", [by.Burdock, by.Burdock]);   // a child in the later block (its one parent recorded twice: one link)
  const after = lineageOf(st, "S01", { gap: GAP }), a = pos(before), b = pos(after);
  for (const id of Object.keys(a)) assert.deepEqual(b[id], a[id], id + " unchanged");
  assert.equal(after.nodes.length, before.nodes.length + 1);
  st.bud = null; const w = lineageOf(st, "S01", { gap: GAP }); born(st, "Rue", [by.Fern, by.Moss]); born(st, "Sage", [by.Fern, by.Moss]); born(st, "Tansy", [by.Fern, by.Moss]); born(st, "Vetch", [by.Fern, by.Moss]);
  const x = lineageOf(st, "S01", { gap: GAP }), p = pos(w), q = pos(x), shift = q["node." + by.Nettle.id][1] - p["node." + by.Nettle.id][1];
  assert.ok(shift > 0, "the first block widened");
  for (const id of Object.keys(p)) assert.deepEqual(q[id], p[id][2] === 0 ? p[id] : [p[id][0], p[id][1] + shift, p[id][2]], id + ": its block's nodes unchanged, the later block translated whole");
  const y = lineageOf(st, "S01", { gap: GAP }); assert.deepEqual(pos(y), q, "the same input gives the same layout");
});

test("the selectors in FAR and in CLOSE: node.parent the first recorded parent; after a ▲ ◀ and ▶ go to the other parent (on another row) and ▼ back to the child; otherwise the row's neighbours (within the block in CLOSE, across blocks in FAR) and the first child", () => {
  const { lin, by } = world(), id = (m) => "node." + m.id;
  for (const zoom of ["far", "close"]) {
    assert.deepEqual(resolveOf(lin, id(by.Fern), zoom), { "node.parent": id(by.Dot), "node.left": id(by.Thistle), "node.right": id(by.Moss) }, zoom + ": Fern");
    const up = resolveOf(lin, id(by.Dot), zoom, { up: id(by.Fern) });
    assert.equal(up["node.left"], id(by.Bean), zoom + ": straight after ▲ from Fern, ◀ is Bean, a row above Dot"); assert.equal(up["node.right"], id(by.Bean)); assert.equal(up["node.child"], id(by.Fern), "▼ is the child come up from");
    const plainDot = resolveOf(lin, id(by.Dot), zoom); assert.equal(plainDot["node.child"], id(by.Fern), "otherwise the first child"); assert.equal(plainDot["node.left"], id(by.Ivy)); assert.equal(plainDot["node.right"], id(by.Lark));
    assert.equal(resolveOf(lin, id(by.Moss), zoom, { up: id(by.Sorrel) })["node.child"], id(by.Sorrel));
    assert.equal(resolveOf(lin, id(by.Reed), zoom)["node.parent"], undefined, zoom + ": a founder's pod is not a target");
    assert.equal(resolveOf(lin, "node.bud", zoom)["node.left"], id(by.Sorrel)); assert.equal(resolveOf(lin, "node.bud", zoom)["node.child"], undefined);
  }
  assert.equal(resolveOf(lin, id(by.Sedge), "far")["node.right"], id(by.Burdock), "FAR walks across blocks"); assert.equal(resolveOf(lin, id(by.Sedge), "close")["node.right"], undefined, "CLOSE stays in the block");
  assert.equal(resolveOf(lin, id(by.Burdock), "far")["node.left"], id(by.Sedge)); assert.equal(resolveOf(lin, id(by.Burdock), "close")["node.left"], undefined);
  assert.deepEqual(resolveOf(lin, "pod." + by.Reed.id, "far"), {}, "a pod has no answers");
});

test("CLOSE's fit: the full lineage exceeds the view (← from close goes to FAR); a small family fits; the entry camera centres the node in the comfort zone; zoom-in puts it where its FAR dot was, clamped", () => {
  const { lin, by } = world(), small = lineageOf((() => { const st = S.freshSt("w1", 3, 1e6); S.normalize(st); const a = born(st, "Ash", null), b = born(st, "Elm", null); born(st, "Yew", [a, b]); return st; })(), "S01", { gap: GAP });
  assert.equal(fitsClose(lin, L3.close, BELOW), false); assert.equal(fitsClose(small, L3.close, BELOW), true); assert.equal(fitsClose(world("one").lin, L3.close, BELOW), false, "eight siblings are wider than the view");
  const C = L3.close, m = nodeOf(lin, "node." + by.Moss.id), cam = camAt(lin, "node." + by.Moss.id, C, null, BELOW), wx = C.grid.x0 + m.u * C.grid.du, wy = C.grid.y0 + m.row * C.grid.drow, z = C.comfort;
  assert.deepEqual([wx - cam[0], wy - cam[1]], [z[0] + z[2] / 2, z[1] + z[3] / 2], "centred in the comfort zone");
  const g = farGeometry(lineageInput(world().st, lin), spec), d = g.boxes["node." + by.Moss.id], dot = [L3.far.rect[0] + d[0] + d[2] / 2, L3.far.rect[1] + d[1] + d[3] / 2];
  const c2 = camAt(lin, "node." + by.Moss.id, C, dot, BELOW), s = [wx - c2[0], wy - c2[1]];
  assert.deepEqual(BELOW, { mibi: 53, bud: 42 }, "the name lines' bottoms: mibi y+53, bud y+42");
  { const [l, t, r, bt] = extentOf(small, C, BELOW), sid = small.nodes[0].id, cs = camAt(small, sid, C, null, BELOW); assert.deepEqual(cs, [Math.floor((l + r - 776) / 2), Math.floor((t + bt - 598) / 2)], "a fitting tree: its whole extent centred in the view");
    assert.deepEqual(camAt(small, sid, C, [300, 300], BELOW), cs, "on a zoom in too"); assert.deepEqual(camAt(small, small.nodes[1].id, C, null, BELOW), cs, "whichever node");
    for (const n of small.nodes) assert.ok(inView(C, n, cs, BELOW), n.id + " wholly in the view"); console.log(`# a fitting tree: extent ${[l, t, r, bt]}, cam ${cs}`); }
  assert.deepEqual(s, [Math.min(Math.max(dot[0], z[0] + 28), z[0] + z[2] - 28), Math.min(Math.max(dot[1], z[1] + 28), z[1] + z[3] - 28)], "where its FAR dot was, clamped so the 56 box lies inside the zone");
});

test("FAR's spacing: sx = clamp(floor(0.85 · 992 / span), 16, 48) per sibling step and sy = 1.5 sx, the tree centred; past 16 px the generator refuses naming the species and the span; a deep tree shrinks sy, past syMin it refuses naming the rows", () => {
  const { lin, st } = world(), g = farGeometry(lineageInput(st, lin), spec);
  assert.deepEqual([g.sx, g.sy, g.rows], [48, 72, 5]); assert.equal(g.span, 8);
  const xs = Object.values(g.boxes).map((b) => b[0]), ys = Object.values(g.boxes).map((b) => b[1]);
  assert.equal(Math.min(...xs) + Math.max(...xs) + 12, 992 - ((992 - (8 * 48 + 12)) % 2), "centred across"); assert.equal(Math.min(...ys), Math.floor((510 - (4 * 72 + 12)) / 2), "centred down");
  for (const b of Object.values(g.boxes)) assert.deepEqual(b.slice(2), [12, 12]);
  const wide = { species: "S01", nodes: [{ id: "a", kind: "mibi", row: 1, u: 0 }, { id: "b", kind: "mibi", row: 1, u: 120 }], links: [], span: [0, 120], rows: 2 };
  assert.equal(farGeometry({ ...wide, span: [0, 104], rows: 1 }, spec).sx, 16); assert.throws(() => farGeometry(wide, spec), /FAR of S01: a span of 60 sibling steps gives 14 px spacing, below 16/);
  const deep = (R) => ({ species: "S01", nodes: [{ id: "a", kind: "mibi", row: 0, u: 0 }, { id: "b", kind: "mibi", row: R - 1, u: 0 }], links: [], span: [0, 0], rows: R });
  assert.equal(farGeometry(deep(7), spec).sy, 72); assert.equal(farGeometry(deep(8), spec).sy, 69, "8 rows at sx 48: floor(486 / 7)"); assert.equal(farGeometry(deep(17), spec).sy, 30);
  assert.throws(() => farGeometry(deep(18), spec), /FAR of S01: 18 rows give 28 px between rows, below 30/);
});

test("the dots: the read, shown body colour (two halves for a two-tone, the first on the left), never a hidden copy; an open frostS ring when Coat is unread; the pod's oval 8 x 10 at (2, 1) in mist, the bud's in mint, 24 px of ink each; a released mibi's dot faded; the links under the nodes", () => {
  const { st, lin, by } = world(), fr = frameOf("S01");
  const two = Object.values(by).find((m) => bodyColour(fr, m)?.length === 2), one = Object.values(by).find((m) => bodyColour(fr, m)?.length === 1 && !m.released);
  assert.ok(two && one, "the fixture holds a two-tone and a single colour");
  const unread = { ...one, read: [] }; assert.equal(bodyColour(fr, unread), null, "Coat unread: neutral");
  const input = lineageInput(st, lin), pic = farPicture(input, spec, { rgb }), px = (x, y) => Array.from(pic.rgba.slice((y * pic.w + x) * 4, (y * pic.w + x) * 4 + 3)), hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  console.log(`# lineage-far: rendered in ${pic.ms.toFixed(1)} ms (${input.nodes.length} nodes, ${input.links.length} links)`);
  const box = (m) => pic.boxes["node." + m.id], c2 = bodyColour(fr, two), b2 = box(two);
  if (!two.released) { assert.deepEqual(px(b2[0] + 2, b2[1] + 6), hex(c2[0]), "the first colour on the left"); assert.deepEqual(px(b2[0] + 9, b2[1] + 6), hex(c2[1]), "the second on the right"); }
  const b1 = box(one); assert.deepEqual(px(b1[0] + 6, b1[1] + 6), hex(bodyColour(fr, one)[0])); assert.deepEqual(px(b1[0], b1[1]), rgb("libGround"), "the disc's corner is the ground");
  const ink = (b, w, h, ox, oy, c) => { let n = 0; for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (px(b[0] + ox + i, b[1] + oy + j).join() === c.join()) n++; return n; };
  const pod = pic.boxes["pod." + by.Reed.id]; assert.equal(ink(pod, 8, 10, 2, 1, rgb("mist")), 24, "the pod's oval: 24 px of mist"); assert.deepEqual(px(pod[0] + 5, pod[1] + 5), rgb("libGround"), "the ground inside");
  assert.deepEqual(px(pod[0] + 2, pod[1] + 1), rgb("libGround"), "the oval's corner is not ink"); assert.deepEqual(px(pod[0] + 4, pod[1] + 1), rgb("mist"));
  const bud = pic.boxes["node.bud"]; assert.equal(ink(bud, 8, 10, 2, 1, rgb("mint")), 24, "the bud's oval in mint");
  const neutral = farPicture({ ...input, nodes: input.nodes.map((n) => (n.id === "node." + one.id ? { ...n, colour: null } : n)) }, spec, { rgb });
  const npx = (x, y) => Array.from(neutral.rgba.slice((y * neutral.w + x) * 4, (y * neutral.w + x) * 4 + 3));
  let ring = 0; for (let j = 0; j < 12; j++) for (let i = 0; i < 12; i++) if (npx(b1[0] + i, b1[1] + j).join() === rgb("frostS").join()) ring++; assert.equal(ring, 32, "the open ring: exactly 32 px of frostS");
  const ringOf = (b, c) => { let n = 0; for (let j = 0; j < 12; j++) for (let i = 0; i < 12; i++) if (px(b[0] + i, b[1] + j).join() === c.join()) n++; return n; };
  assert.equal(ringOf(box(by.Sedge), rgb("frostS")), 32, "Sedge (Coat unread): its exact 32 px frostS ring in the picture"); assert.equal(ringOf(box(by.Hazel), [85, 86, 92]), 32, "Hazel (released, Coat unread): its ring faded, 32 px of (85,86,92)");
  assert.deepEqual(npx(b1[0] + 6, b1[1] + 4), rgb("libGround"), "no fill");
  const rel = box(by.Wren), keep = spec.faces.faded.keep, g = rgb("libGround"), wc = hex(bodyColour(fr, by.Wren)[0]);
  assert.deepEqual(px(rel[0] + 2, rel[1] + 6), wc.map((v, i) => Math.round(keep * v + (1 - keep) * g[i])), "a released mibi's dot faded as its face");
  const seen = new Set(); for (let i = 0; i < pic.rgba.length; i += 4) seen.add(Array.from(pic.rgba.slice(i, i + 3)).join());
  const allowed = new Set([..."libGround mist stone mint frostS".split(" ").map((n) => rgb(n).join()), ...input.nodes.flatMap((n) => (n.colour ?? []).flatMap((h) => [hex(h), hex(h).map((v, i) => Math.round(keep * v + (1 - keep) * g[i]))])).map((c) => c.join()), rgb("frostS").map((v, i) => Math.round(keep * v + (1 - keep) * g[i])).join()]);
  assert.deepEqual([...seen].filter((c) => !allowed.has(c)), [], "every pixel is the ground, a token or a dot's colour (flat ground: the master is not given here)");
});

test("the mini: the FAR drawing reduced by s = min(208/992, 96/510), centred (ox 11); 4 px dots within 1 px of FAR x s; scale and origin map the CLOSE grid onto it", () => {
  const { st, lin } = world(), input = lineageInput(st, lin), far = farGeometry(input, spec), m = miniGeometry(input, spec, far);
  assert.equal(m.ox, 11); assert.equal(m.oy, 0); assert.ok(Math.abs(m.s - 0.1882) < 1e-4);
  for (const n of input.nodes) { const f = far.boxes[n.id], b = m.boxes[n.id], c = [(f[0] + 6) * m.s + m.ox, (f[1] + 6) * m.s + m.oy], mc = n.kind === "mibi" ? [b[0] + 2, b[1] + 2] : [b[0], b[1]]; assert.ok(Math.abs(mc[0] - c[0]) <= 1 && Math.abs(mc[1] - c[1]) <= 1, n.id); }
  const C = L3.close.grid, toMini = (X, Y) => [m.origin[0] + (X - C.x0) * m.scale[0], m.origin[1] + (Y - C.y0) * m.scale[1]];
  for (const n of input.nodes) { const [x, y] = toMini(C.x0 + n.u * C.du, C.y0 + n.row * C.drow), f = far.boxes[n.id]; assert.ok(Math.abs(x - ((f[0] + 6) * m.s + m.ox)) < 1 && Math.abs(y - ((f[1] + 6) * m.s + m.oy)) < 1, n.id + ": the CLOSE point maps onto its mini dot"); }
  const pic = miniPicture(input, spec, { rgb }); console.log(`# lineage-mini: rendered in ${pic.ms.toFixed(1)} ms`); assert.deepEqual([pic.w, pic.h], [208, 96]);
  assert.equal(pic.rgba[3], 0, "clear outside its ink");
  const fr = frameOf("S01"), dot = input.nodes.find((n) => n.kind === "mibi" && n.colour?.length === 1 && !n.released), two = input.nodes.find((n) => n.kind === "mibi" && n.colour?.length === 2 && !n.released), mpx = (x, y) => Array.from(pic.rgba.slice((y * 208 + x) * 4, (y * 208 + x) * 4 + 4));
  assert.ok(dot && two && fr, "the fixture holds a single colour and a two-tone");
  const disc = (n) => { const b = m.boxes[n.id]; return [0, 1, 2, 3].map((j) => [0, 1, 2, 3].map((i) => (mpx(b[0] + i, b[1] + j)[3] ? "#" : ".")).join("")); };
  assert.deepEqual(disc(dot), [".##.", "####", "####", ".##."], "the mini's dot is the 4 x 4 disc by the outline rule (the art director), not a full square");
  { const { by } = world(), ringed = (m2, c) => { const n = input.nodes.find((q) => q.id === "node." + m2.id), b = m.boxes[n.id], px4 = (i, j) => mpx(b[0] + i, b[1] + j);
      assert.ok(n.colour == null, "unread Coat: no colour");
      assert.deepEqual([0, 1, 2, 3].map((j) => [0, 1, 2, 3].map((i) => (px4(i, j).join() === [...c, 255].join() ? "#" : ".")).join("")), [".##.", "#..#", "#..#", ".##."], "the inset box holds exactly 8 px of the ring in .##./#..#/#..#/.##.");
      for (const [i, j] of [[1, 1], [2, 1], [1, 2], [2, 2]]) assert.equal(px4(i, j)[3], 0, "alpha 0 at the four inner pixels"); };
    ringed(by.Sedge, rgb("frostS")); ringed(by.Hazel, [85, 86, 92]); }
  const b2 = m.boxes[two.id], hx = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)), c = two.colour.map(hx);
  assert.deepEqual([mpx(b2[0] + 1, b2[1] + 1).slice(0, 3), mpx(b2[0] + 2, b2[1] + 1).slice(0, 3)], c, "a two-tone split at i = 2");
});

test("the walks are linear in the tree (the Library 5 gate's W2): 16 generations of sibling crosses, each generation two siblings of the one before, walked under 20 ms by lineageOf, generation, crossDepth and the moments", () => {
  const st = S.freshSt("w1", 3, 1e6); S.normalize(st); st.mibis = []; st.nextMibi = 1;
  let pair = [born(st, "A0", null), born(st, "B0", null)];
  for (let g = 1; g <= 16; g++) pair = [born(st, "A" + g, pair), born(st, "B" + g, pair)];
  const top = pair[0], t0 = performance.now(), lin = lineageOf(st, "S01", { gap: GAP }), t1 = performance.now(), gen = generation(st, top), cd = crossDepth(st, top), t2 = performance.now(), mo = T.momentsEarned(st, S.DEFAULT_SETTINGS), t3 = performance.now();
  console.log(`# 16 generations of sibling crosses (${st.mibis.length} mibis): lineageOf ${(t1 - t0).toFixed(2)} ms, generation and crossDepth ${(t2 - t1).toFixed(2)} ms, momentsEarned ${(t3 - t2).toFixed(2)} ms`);
  assert.deepEqual([gen, cd], [16, 16]); assert.equal(lin.rows, 18); assert.ok(mo.some((x) => x.kind === "line"), "the deep line is earned");
  for (const [what, ms] of [["lineageOf", t1 - t0], ["generation and crossDepth", t2 - t1], ["momentsEarned", t3 - t2]]) assert.ok(ms < 20, `${what}: ${ms.toFixed(2)} ms`);
  const memo = walkMemo(); assert.equal(generation(st, top, memo), 16); assert.equal(memo.gen.size, st.mibis.length - 1, "each of its ancestors (every mibi but its sibling) walked once into the memo");
});

test("the pan's vectors (face/tests/vectors/pan.json, which face_test runs on anim.c): the host's step cameras (panSteps, the slots' cameras) are the face's at each step", () => {
  const { cases } = JSON.parse(readFileSync(path.resolve(here, "../../face/tests/vectors/pan.json"), "utf8")); let n = 0;
  for (const c of cases.filter((q) => !q.refused)) {
    const cams = panSteps(c.from, c.to, c.frac), stepAt = (ms) => c.steps.reduce((s, at, i) => (ms >= at ? i : s), 0);
    for (const [ms, want] of c.at) { if (want === null) { assert.ok(ms >= c.steps.at(-1), c.name + ": over at its last step"); assert.deepEqual(cams.at(-1), c.to, c.name + ": the last step is `to`"); } else { assert.deepEqual(cams[stepAt(ms)], want, `${c.name} at ${ms} ms`); n++; } }
  }
  assert.ok(n >= 6, n + " step cameras compared");
});

test("CLOSE's camera and slots (l3.close): a node's box centred on its grid point less the camera; wholly inside the view or not drawn; the pan the least whole pixels into the comfort zone on each axis; the steps at trunc(frac); the slots by row then u under any step's camera, 32 at most; the camera as an offset from its node; the overview's view box in the mini", () => {
  const { lin, by } = world(), C = L3.close, node = (m) => nodeOf(lin, "node." + m.id), moss = node(by.Moss), cam = camAt(lin, moss.id, C, null, BELOW);
  assert.deepEqual(cam, [12, 105]); assert.deepEqual(closeRect(C, moss, cam), [360, 271, 56, 56], "Moss centred in the zone: its box about (388, 299)");
  assert.deepEqual(closeRect(C, nodeOf(lin, "node.bud"), cam), [16 + 7 * 48 - 12 - 12, 44 + 4 * 120 - 105 - 16, 24, 32], "the bud's box (x - 12, y - 16, 24, 32)");
  assert.equal(inView(C, node(by.Reed), cam), false, "Reed (row 1, y 59) crosses the view's top: not drawn"); assert.equal(inView(C, node(by.Sorrel), cam), true);
  assert.deepEqual(panFor(lin, moss.id, C, cam), cam, "inside the zone: no pan"); assert.deepEqual(panFor(lin, node(by.Reed).id, C, cam), [12 - 189, 105 - 115]);
  assert.deepEqual(panFor(lin, node(by.Yarrow).id, C, cam), [16 + 16 * 48 + 28 - 611, 105 - 115], "right of the zone: the box's right edge on the zone's");
  assert.deepEqual(panSteps([12, 105], [12, -10], [50, 85, 100]), [[12, 48], [12, 8], [12, -10]], "trunc toward zero, as the face's integer division"); assert.deepEqual(panSteps([0, 0], [-3, 3], [50]), [[-1, 1]]);
  const slots = slotsOf(lin, C, [cam]); assert.ok(slots.every((n) => inView(C, n, cam))); assert.deepEqual(slots.map((n) => n.id), lin.nodes.filter((n) => inView(C, n, cam)).map((n) => n.id), "every node wholly inside, by row then u");
  const both = slotsOf(lin, C, panSteps(cam, [-177, -10], C.pan.frac)); assert.ok(both.some((n) => n.id === node(by.Reed).id), "a pan's slots hold the nodes of every step"); assert.ok(both.length <= C.slots);
  const many = { nodes: Array.from({ length: 40 }, (_, i) => ({ id: "n" + i, kind: "pod", u: i % 10, row: Math.floor(i / 10) })) }; assert.equal(many.nodes.filter((n) => inView(C, n, [-30, -60])).length, 40);
  assert.deepEqual(slotsOf(many, C, [[-30, -60]]).map((n) => n.id), many.nodes.slice(0, C.slots).map((n) => n.id), "40 nodes inside: the first 32 by row then u");
  // 40 nodes in view across a pan's step cameras (row 0 only under the early steps): every node under the final camera gets a slot, the early steps' only ones fill what is left
  { const cs = [[-30, -60], [-30, -30], [-30, 0]], fin = cs[2], pan = { nodes: many.nodes };
    const under = many.nodes.filter((n) => inView(C, n, fin)), only = many.nodes.filter((n) => !under.includes(n) && cs.some((c) => inView(C, n, c)));
    assert.ok(under.length + only.length > C.slots && under.length <= C.slots && only.length > 0, `the setup: ${under.length + only.length} nodes in view across the steps, ${under.length} under the final camera`);
    const got = slotsOf(pan, C, cs).map((n) => n.id); assert.ok(under.every((n) => got.includes(n.id)), "every node under the final camera has a slot"); assert.deepEqual(got, [...under, ...only].slice(0, C.slots).map((n) => n.id), "the final camera's nodes first, then the early steps' only, each by row then u"); }
  const off = camOffset(lin, moss.id, C, cam); assert.deepEqual(off, [-388, -299], "the camera less Moss's grid point: Moss on screen at (388, 299)"); assert.deepEqual(camFromOffset(lin, moss.id, C, off), cam);
  const input = lineageInput(world().st, lin), m = miniGeometry(input, spec), box = overviewBox(input, spec, cam);
  const want = [Math.round(m.origin[0] + cam[0] * m.scale[0]), Math.round(m.origin[1] + cam[1] * m.scale[1])]; assert.deepEqual(box.slice(0, 2), want.map((v) => Math.max(0, v)), "the view's corner in the mini");
  assert.ok(box[2] > 0 && box[3] > 0 && box[0] + box[2] <= 208 && box[1] + box[3] <= 96, "inside the mini: " + box);
});

test("the pictures' requests (views/requests.mjs): lineage-far-{SNN}-{digest} and lineage-mini-{SNN}-{digest} at their sizes, one digest of what sets their pixels; a colour, a release or a new node is a new picture", async () => {
  const { lineageFar, lineageMini, req } = await import("../src/views/requests.mjs");
  const { st, lin } = world(), input = lineageInput(st, lin), out = [], r = req(out, true);
  const far = lineageFar(r)(spec, input), mini = lineageMini(r)(spec, input);
  assert.match(far, /^lineage-far-S01-[0-9a-f]{8}$/); assert.equal(mini, far.replace("far", "mini")); assert.deepEqual(out.map((q) => [q.kind, q.size]), [["lineagefar", [992, 510]], ["lineagemini", [208, 96]]]);
  const again = lineageFar(req([]))(spec, lineageInput(st, lineageOf(st, "S01", { gap: GAP }))); assert.equal(again, far, "the same lineage, the same picture");
  st.mibis.find((m) => !m.released).released = true; assert.notEqual(lineageFar(req([]))(spec, lineageInput(st, lineageOf(st, "S01", { gap: GAP }))), far, "a release is a new picture");
});
