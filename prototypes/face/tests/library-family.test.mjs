// The Library's Level 3 on the face (library.json l3): in Node on the WebAssembly test build (dist/node), the props built through the rules (the Loika lineage fixture, then familyBuild) are drawn.
// far: the stage, the whole lineage's picture at l3.far.rect, and the ring on the focused node's dot box plus the picture's origin; nothing else (no panel). close: the link tiles, the path's node, the slots (pictures
// and names), the panel's bezel and overview, the ring on the focused slot; the links' pixels (colours, junction dots, stubs at every edge, a bridge); the pan's steps and the budget of each frame (both figures
// printed); the 65-target cap. The pad walks l3.focus.graph with the host's selectors as ui/focus.mjs does on the real targets, ✓ and ← are intents on the focused node, and the zoom's 180 ms stage dither is
// measured frame by frame (its dirty area printed). Skipped when the test build has not been built.
//   node --test prototypes/face/tests/library-family.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { withPolicy } from "./node-scene.mjs";
import { dirty, dirtyRects } from "./dirty.mjs";
import { bootFace } from "../../station/src/face-lvgl.mjs";
import { setFrames } from "../../station/src/genome.mjs";
import * as S from "../../station/src/state.mjs";
import { familyBuild as familyBuildUnchecked } from "../../station/src/views/library-props.mjs";
import { lineCased } from "../../station/tests/fixtures/line-case.mjs";
import { buildLineage } from "../../station/tests/fixtures/lineage.mjs";
import { moveFocus } from "../../ui/focus.mjs";
import { panSteps } from "../../station/src/lineage.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist/node"), built = existsSync(path.join(dist, "face.mjs")), skip = !built && "face not built (prototypes/face/build.sh)";
const specs = path.resolve(here, "../../ui/specs/station"), J = (n) => JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8")), frameSpec = J("frame"), spec = J("library"), home = J("home");
const palette = JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")).colours;
const metrics = built ? JSON.parse(readFileSync(path.resolve(here, "../dist/metrics.json"), "utf8")) : null;
setFrames(readdirSync(path.resolve(here, "../../workbench/frames")).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.resolve(here, "../../workbench/frames", f), "utf8"))));
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 12 };
const world = (which = "full") => { const st = S.freshSt("w1", 3, 1e6); S.normalize(st); st.turn = 20; const by = buildLineage(st, which, { turn: 20 }); return { st, by }; };
const familyBuild = lineCased(familyBuildUnchecked, "library-family");
const build = (st, node, zoom = "far", last = null, mem = {}) => familyBuild({ st, settings, ui: { species: "S01", l3: { S01: { node, zoom, cam: null, ...mem } }, l3last: last }, metrics }, spec, frameSpec, home);
const frameProps = (b) => ({ top: { screen: "library.family", title: "Library", turn: 4, turnFlash: false, materials: { e: 9, d: 9, s: 9 }, flash: {}, companion: { docked: true, withMibi: null }, readout: b.top.readout }, line: { need: "", ...b.line }, plate: { text: "" } });
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
function standIn(id, [w, h]) { const d = new Uint8ClampedArray(w * h * 4), k = hash(id); for (let i = 0; i < w * h; i++) { d[i * 4] = 70 + (k & 127); d[i * 4 + 1] = 70 + ((k >> 7) & 127); d[i * 4 + 2] = 70 + ((k >> 14) & 127); d[i * 4 + 3] = 255; } return { w, h, data: d }; }
async function start(b) {
  const f = await bootFace(pathToFileURL(dist + "/"), { test: true });
  f.send({ t: "palette", name: "station", colours: palette }); for (const [n, j] of [["frame", frameSpec], ["library", spec]]) assert.equal(f.send({ t: "spec", screen: n, json: j }), 0);
  for (const id of ["energy", "data", "essence", "cross"]) f.handleOf(`icon:${id}:16`, withPolicy((i) => standIn(i, [16, 16])));
  for (const id of ["frame-companion-outline-16x24"]) f.handleOf(id, withPolicy((i) => standIn(i, [16, 24])));
  f.t = 0; f.build = b; f.setProps = (motion = false) => { for (const r of f.build.requests) f.handleOf(r.id, withPolicy((i) => standIn(i, r.size))); const p = f.build.notBuilt ? { screen: "library.family", state: "notBuilt", motion, frame: frameProps(f.build) } : { screen: "library.family", ...f.build.props, motion, frame: frameProps(f.build) }; assert.equal(f.props(p), 0, f.errors().join("; ")); for (let i = 0; i < 2; i++) f.frame((f.t += 16)); };
  f.setProps(); return f;
}
const dotOf = (b, id) => { const r = b.props.regions.far.boxes.find((q) => q.id === id).rect, o = spec.l3.far.rect; return [r[0] + o[0], r[1] + o[1], r[2], r[3]]; };

test("far, the Loika lineage: the stage, the lineage's picture at l3.far.rect and the ring on Moss's dot box plus the picture's origin; no panel, no other node", { skip }, async () => {
  const { st, by } = world(), b = build(st, "node." + by.Moss.id), f = await start(b); assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0);
  assert.equal(b.props.state, "far"); assert.match(b.props.regions.far.picture, /^lineage-far-S01-[0-9a-f]{8}$/);
  assert.deepEqual(f.nodeBox("far.picture").box, spec.l3.far.rect);
  const dot = dotOf(b, "node." + by.Moss.id), ring = f.nodeBox("focus")?.box; assert.ok(ring, "a ring");
  assert.deepEqual([ring[0] + ring[2] / 2, ring[1] + ring[3] / 2], [dot[0] + dot[2] / 2, dot[1] + dot[3] / 2], `the ring ${ring} is centred on Moss's dot ${dot}`);
  assert.ok(ring[2] > 12 && ring[3] > 12, "around the dot, never over it");
  assert.equal(b.line.ok, "Zoom in"); assert.equal(b.line.subject, "Moss, adult"); assert.equal(b.line.back, "Loika"); assert.deepEqual(b.top.readout, { text: "Loika family", mark: "species-mark-S01-10" });
  assert.equal(f.nodeBox("panel"), null, "no panel");
});

test("the bud's line and a long name: \"a bud, still growing\"; a name over 153 px gives the nameless step of its stage", { skip }, () => {
  const { st, by } = world(); assert.equal(build(st, "node.bud").line.subject, "a bud, still growing");
  assert.equal(build(st, "node." + by.Sorrel.id).line.subject, "Sorrel, young"); assert.equal(build(st, "node." + by.Reed.id).line.subject, "Reed, elder");
  by.Reed.name = "Wwwwwwwwwwwwwwwww"; assert.equal(build(st, "node." + by.Reed.id).line.subject, "an elder mibi");
});

test("the pad walks l3.focus.graph: every move the face says agrees with ui/focus.mjs on the real targets with the host's selectors; ✓ and ← are intents on the focused node", { skip }, async () => {
  const { st, by } = world(); let b = build(st, "node." + by.Moss.id); const f = await start(b), graph = spec.l3.focus.graph;
  const key = (k) => { for (; f.poll();); f.send({ t: "key", k }); for (let i = 0; i < 2; i++) f.frame((f.t += 16)); const out = []; for (let m; (m = f.poll());) if (m.t === "focus" || m.t === "intent") out.push(m); return out; };
  const reset = () => { f.build = build(st, "node.bud"); f.build.props.focus.cur = ""; f.setProps(); };
  let moved = 0;
  for (const from of b.props.focus.targets.map((t) => t.id)) for (const dir of ["up", "down", "left", "right"]) {
    f.build = build(st, from); f.build.props.focus.cur = ""; f.setProps(); f.build = build(st, from); f.setProps(); const T = f.build.props.focus.targets.map((t) => ({ id: t.id, group: t.group, rect: dotOf(f.build, t.id) }));
    const want = moveFocus(graph, T, from, dir, (sel) => f.build.props.focus.resolve[sel] ?? null).to, m = key(dir);
    if (want === from) assert.deepEqual(m, [], `${from} ${dir}: the ring stays`); else { moved++; assert.deepEqual(m.map((x) => [x.t, x.target]), [["focus", want]], `${from} ${dir} is ${want}`); }
  }
  assert.ok(moved >= 30, moved + " moves");
  reset(); f.build = build(st, "node." + by.Fern.id); f.setProps(); assert.deepEqual(key("up").map((x) => x.target), ["node." + by.Dot.id], "▲ from Fern: Dot, its first recorded parent");
  reset(); f.build = build(st, "node." + by.Dot.id, "far", { up: "node." + by.Fern.id }); f.setProps(); assert.deepEqual(key("left").map((x) => x.target), ["node." + by.Bean.id], "straight after ▲, ◀ is the other parent, a row above");
  reset(); f.build = build(st, "node." + by.Reed.id); f.setProps(); assert.deepEqual(key("up"), [], "a founder's ▲: its pod is not a target, the ring stays");
  assert.deepEqual(key("confirm").map((x) => [x.t, x.target, x.verb]), [["intent", "node." + by.Reed.id, "confirm"]]); assert.deepEqual(key("back").map((x) => [x.target, x.verb]), [["node." + by.Reed.id, "back"]]);
});

test("the zoom: far to close is a state change under the 180 ms stage dither (16 levels); its refresh each frame is printed, inside the stage", { skip }, async () => {
  const { st, by } = world(), far = build(st, "node." + by.Moss.id), f = await start(far); dirty(f);
  const close = build(st, "node." + by.Moss.id, "close"); assert.equal(close.props.state, "close"); assert.equal(close.line.back, "Family", "the tree exceeds the view: ← reads Family");
  f.setProps(true); dirty(f); f.send({ t: "event", kind: "dither", target: "stage", ms: 180, hold: 180 }); f.build = close; f.setProps(true);
  const frames = []; for (let i = 0; i < 12; i++) { f.frame((f.t += 16)); const d = dirty(f); frames.push(d); for (const q of dirtyRects(f)) assert.ok(q[1] >= 40 && q[1] + q[3] <= 562, `${q} inside the stage`); }
  console.log(`# the zoom's dither (far to close), dirty px per frame: ${frames.join(", ")} (the stage is ${1024 * 522})`);
  assert.deepEqual(f.nodeBox("tree.links.0").box, [16, 44, 372, 255], "close is drawn once the dither ends");
  assert.ok(frames.some((d) => d > 0)); assert.ok(Math.max(...frames) <= 1024 * 522, "never past the stage");
});

// ---- close (l3.close) ----
const C = spec.l3.close, V = C.view, rgbOf = Object.fromEntries(palette.map(([n, h]) => [n, [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))]));
const nodeOfLin = (b, id) => b.props.regions.lineage.nodes.find((n) => n.id === id);
const closeAt = (b, id) => { const n = nodeOfLin(b, id), cam = b.props.regions.tree.cam; return [C.grid.x0 + n.u * C.grid.du - cam[0], C.grid.y0 + n.row * C.grid.drow - cam[1]]; };
const offsetOf = (b, id, cam) => { const n = nodeOfLin(b, id); return [cam[0] - (C.grid.x0 + n.u * C.grid.du), cam[1] - (C.grid.y0 + n.row * C.grid.drow)]; };
const same = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

test("close on Moss: the four link tiles over the view, the path's node, the slots of the nodes wholly inside the view (their pictures, their names under them), the panel's bezel and its overview inset, the ring {rect: 2} on Moss's 56 box; no ✓, an empty subject, ← Family", { skip }, async () => {
  const { st, by } = world(), b = build(st, "node." + by.Moss.id, "close"), f = await start(b); assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0);
  const T = b.props.regions.tree; assert.deepEqual(T.cam, [12, 105], "Moss centred in the comfort zone");
  for (const [k, box] of [[0, [16, 44, 372, 255]], [1, [388, 44, 372, 255]], [2, [16, 299, 372, 255]], [3, [388, 299, 372, 255]]]) assert.deepEqual(f.nodeBox("tree.links." + k).box, box, "tile " + k);
  assert.deepEqual(f.nodeBox("tree.path").box, V, "the compare path's node: the view, nothing drawn");
  assert.ok(T.slots.length <= C.slots && T.slots.length === 12, T.slots.length + " slots"); assert.deepEqual(T.slots.map((s) => s.id), b.props.regions.lineage.nodes.filter((n) => T.slots.some((s) => s.id === n.id)).map((n) => n.id), "by row then u");
  const k = T.slots.findIndex((s) => s.id === "node." + by.Moss.id), [x, y] = closeAt(b, "node." + by.Moss.id);
  assert.deepEqual(f.nodeBox(`tree.slot.${k}.face`).box, [x - 28, y - 28, 56, 56], "Moss's face 1:1, its box centred on its grid point less the camera"); assert.match(T.slots[k].picture, /^face:\d+:56$/);
  const nm = f.nodeBox(`tree.slot.${k}.name`).box; assert.equal(nm[0] + Math.round(nm[2] / 2), x, "the name centred on x"); assert.ok(nm[2] > 0 && nm[2] <= C.names.clip);
  const bud = T.slots.findIndex((s) => s.id === "node.bud"), [bx, bby] = closeAt(b, "node.bud"); assert.deepEqual(f.nodeBox(`tree.slot.${bud}.face`).box, [bx - 12, bby - 16, 24, 32], "the bud's rack pod (x - 12, y - 16, 24, 32)"); assert.equal(T.slots[bud].picture, "rackpod:S01"); assert.equal(T.slots[bud].name, "Growing");
  const wren = T.slots.find((s) => s.id === "node." + by.Wren.id); assert.match(wren.picture, /^face:\d+:56:faded$/, "a released mibi's face faded");
  for (let j = T.slots.length; j < C.slots; j++) { const q = f.nodeBox(`tree.slot.${j}.face`); assert.ok(!q || (q.box[2] === 0 && q.box[3] === 0), `slot ${j} unused: no size`); }
  assert.ok(!T.slots.some((s) => s.id === "node." + by.Reed.id), "Reed (row 1) crosses the view's top: no slot");
  const ring = f.nodeBox("focus").box, reach = frameSpec.focus.ring.reach; assert.deepEqual(ring, [x - 28 - reach, y - 28 - reach, 56 + 2 * reach, 56 + 2 * reach], "the ring {rect: 2} round the 56 box");
  assert.deepEqual(f.nodeBox("panel.panel").box, C.panel.rect, "the panel's bezel"); assert.deepEqual(f.nodeBox("panel.ov.picture").box, C.inset.rect, "the mini at the inset");
  const ov = b.props.regions.panel.ov; assert.match(ov.picture, /^lineage-mini-S01-[0-9a-f]{8}$/); assert.deepEqual(f.nodeBox("panel.ov.box.et").box, [C.inset.rect[0] + ov.box[0], C.inset.rect[1] + ov.box[1], ov.box[2], 1], "the view box at the host's rect plus the inset's origin");
  assert.deepEqual(f.nodeBox("panel.ov.edge.el").box, [C.inset.rect[0], C.inset.rect[1], 1, C.inset.rect[3]], "the inset's outline");
  assert.deepEqual(b.line, { ok: null, subject: "", back: "Family", need: null }); assert.equal(build(st, "node.bud", "close").line.subject, "a bud, still growing");
  assert.ok(JSON.stringify(b.props).length < 32 * 1024, "props " + JSON.stringify(b.props).length + " B");
  console.log(`# close on Moss: ${f.objects()} objects, props ${JSON.stringify(b.props).length} B`);
});

test("close's links, palette-exact: 2 px mist, a faded parent's stone, 4 x 4 bone junction dots where a stem meets its bus, a stub (16 px dotted, 2 on 2 off, a dot at the end) where a link leaves each edge of the view or ends at a node not drawn, a 3 px bridge where a bus crosses a stem", { skip }, async () => {
  const { st, by } = world(), id = (n) => "node." + by[n].id, moss = build(st, id("Moss"), "close"), f = await start(moss), px = (x, y) => f.pixel(x, y), mist = rgbOf.mist, stone = rgbOf.stone, bone = rgbOf.bone;
  const [fx] = closeAt(moss, id("Fern")), busY = C.grid.y0 + 2.5 * C.grid.drow - moss.props.regions.tree.cam[1];
  assert.ok(same(px(fx - 1, busY + 15), mist) && same(px(fx, busY + 15), mist) && !same(px(fx + 1, busY + 15), mist), "Fern's drop: 2 px mist, columns x - 1 and x");
  for (let j = -2; j < 2; j++) for (let i = -2; i < 2; i++) assert.ok(same(px(fx + i, busY + j), bone), `the junction dot at Fern's drop (${i}, ${j})`);
  assert.ok(same(px(fx - 3, busY), mist) && !same(px(fx - 3, busY + 2), mist), "the bus 2 px: rows y - 1 and y");
  const [rx] = closeAt(moss, id("Rush")); assert.ok(same(px(rx, 115), stone), "a released parent's drop in stone");
  // links leave every edge: from Moss ▲ Dot, then ▶ Bean (the other parent), the camera is [12, -10]
  const bean = build(st, id("Bean"), "close", null, { cam: offsetOf(moss, id("Bean"), [12, -10]) }); f.build = bean; f.setProps(); assert.deepEqual(bean.props.regions.tree.cam, [12, -10]);
  const on = (x, y, c) => same(px(x, y), c), bus = C.grid.y0 + 1.5 * C.grid.drow + 10;
  assert.ok(on(16, bus, mist) && on(17, bus, mist) && !on(18, bus, mist) && !on(19, bus, mist) && on(20, bus, mist) && on(29, bus, mist) && !on(30, bus, mist) && !on(31, bus, mist) && on(32, bus, mist), "left: Reed and Rush's bus leaves the view, its last 16 px dotted from the edge (2 on, 2 off), then solid");
  const rEdge = V[0] + V[2] - 1; assert.ok(on(rEdge, bus, stone) && on(rEdge - 1, bus, stone) && !on(rEdge - 2, bus, stone) && on(rEdge - 4, bus, stone), "right: Nettle and Yarrow's bus (both released: stone) leaves the view, dotted");
  const [px2] = closeAt(bean, id("Rush")), podBottom = C.grid.y0 + 10 + 16; assert.ok(on(px2, podBottom, stone) && on(px2, podBottom + 1, stone) && !on(px2, podBottom + 2, stone) && on(px2, podBottom + 4, stone) && on(px2, podBottom + 16, stone), "top: the pod above the view (not drawn): its link ends in a stub at the pod, the released founder's in stone");
  const [sx, sy] = closeAt(bean, id("Sorrel")); assert.ok(sy + 28 > V[1] + V[3], "Sorrel crosses the view's bottom: not drawn");
  assert.ok(on(sx, sy - 29, mist) && on(sx, sy - 30, mist) && !on(sx, sy - 31, mist) && on(sx, sy - 33, mist) && on(sx, sy - 46, mist), "bottom: Sorrel's drop ends in a stub at its box");
  // a bridge: a bus that crosses a stem (props by hand: the stem at u 2 from row 1 to row 3, the bus at row 2 from u 0 to u 4); the stem's 3 px each side of the bus show the ground, the bus whole
  const cross = JSON.parse(JSON.stringify(moss)); cross.props.regions.tree = { cam: [0, 0], slots: [], links: [{ a: [2, 2], b: [2, 6], faded: false }, { a: [0, 4], b: [4, 4], faded: false }] }; cross.props.regions.lineage.nodes = []; f.build = cross; f.setProps();
  const sxx = C.grid.x0 + 2 * C.grid.du, by2 = C.grid.y0 + 2 * C.grid.drow, ground = px(sxx + 40, by2 + 40);
  assert.ok(on(sxx, by2 - 5, mist) && on(sxx, by2 - 1, mist) && on(sxx, by2, mist) && on(sxx, by2 + 4, mist), "the stem, the bus over it");
  for (const d of [-4, -3, -2, 1, 2, 3]) assert.ok(same(px(sxx, by2 + d), ground) && same(px(sxx - 1, by2 + d), ground), `the bridge's gap at ${d}: the ground shows`);
  assert.ok(on(sxx - 3, by2 - 2, mist) === false && on(sxx - 3, by2, mist), "the bus is drawn whole across the stem");
});

test("the pan on the face: the slots and the link tiles at each step's camera (from + trunc((to - from) frac / 100); step 0 at the pan's first frame, each next no sooner than its gap, 67 then 66 ms, after the one before), then the props' camera; each step a camera cut inside the view (at most its 379,440 px), the steps 67 ms apart or more, every other frame at most 153,600 px; reduced motion one cut; both figures printed", { skip }, async () => {
  const { st, by } = world(), id = (n) => "node." + by[n].id, lark = build(st, id("Lark"), "close", null, { cam: [12 - (16 + 8 * 48), 105 - (44 + 2 * 120)] }); assert.deepEqual(lark.props.regions.tree.cam, [12, 105]);
  const P = C.pan, from = [12, 105], to = [12, -10], bean = build(st, id("Bean"), "close", null, { cam: offsetOf(lark, id("Bean"), to), pan: { from, to } });
  assert.deepEqual(bean.props.regions.tree.cam, to); assert.ok(bean.props.regions.tree.slots.some((s) => s.id === id("Sorrel")), "the slots hold the nodes of every step (Sorrel, inside at the first)");
  const g = await start(lark); g.setProps(true); dirty(g); for (; g.poll();); g.send({ t: "key", k: "up" }); g.frame((g.t += 16)); const k2 = dirty(g); assert.deepEqual(g.poll()?.target, id("Bean"), "▲ from Lark: Bean"); for (; g.poll(););
  assert.equal(g.send({ t: "event", kind: "pan", target: P.target, from, to, steps: P.steps, frac: P.frac, hold: 0 }), 0, g.errors().join());
  for (const r of bean.requests) g.handleOf(r.id, withPolicy((i) => standIn(i, r.size))); assert.equal(g.props({ screen: "library.family", ...bean.props, motion: true, frame: frameProps(bean) }), 0, g.errors().join());
  // the tree view, and the same grown by a label's own draw margin (LVGL draws a label's ink up to line height / 4 = 5 px outside its box: a name at the view's edge invalidates that far)
  const M = 5, within = (q, r) => q[0] >= r[0] && q[1] >= r[1] && q[0] + q[2] <= r[0] + r[2] && q[1] + q[3] <= r[1] + r[3], inView = (q) => within(q, [V[0] - M, V[1] - M, V[2] + 2 * M, V[3] + 2 * M]);
  const union = (rects) => { const s = new Set(); for (const q of rects) for (let y = q[1]; y < q[1] + q[3]; y++) for (let x = q[0]; x < q[0] + q[2]; x++) s.add(y * 1024 + x); return s.size; };
  const t0 = g.t, frames = [], inInset = (q) => q[0] >= C.inset.rect[0] && q[1] >= C.inset.rect[1] && q[0] + q[2] <= C.inset.rect[0] + C.inset.rect[2] && q[1] + q[3] <= C.inset.rect[1] + C.inset.rect[3];
  for (let i = 0; i < 16; i++) { g.frame((g.t += 16)); const rects = dirtyRects(g), d = dirty(g), tile = g.nodeBox("tree.slot.0.face")?.box; frames.push({ t: g.t - t0, d, rects, view: rects.filter(inView).reduce((s, q) => s + q[2] * q[3], 0), slot0: tile }); }
  if (process.env.PANDEBUG) for (const x of frames) if (x.d) console.log("# frame", x.t, JSON.stringify(x.rects));
  const steps = frames.filter((x) => x.view > 153600 || x.rects.some((q) => inView(q) && q[2] * q[3] > 20000)); for (const s of steps) s.union = union(s.rects.filter(inView));
  console.log(`# the pan (Lark to Bean, 115 px up): dirty px per frame ${frames.map((x) => x.d).join(", ")}; steps at ${steps.map((x) => x.t).join(", ")} ms: in the view (with the labels' 5 px) ${steps.map((x) => x.view).join(", ")} px as LVGL's rectangles (overlaps counted twice), ${steps.map((x) => x.union).join(", ")} px as the pixels redrawn (the view's area ${V[2] * V[3]}); the key's frame ${k2} px; every other frame 0`);
  assert.equal(steps.length, 3, "three steps"); for (let i = 1; i < steps.length; i++) assert.ok(steps[i].t - steps[i - 1].t >= P.steps[i] - P.steps[i - 1], `steps at ${steps[i - 1].t} and ${steps[i].t} ms: at least their gap (${P.steps[i] - P.steps[i - 1]} ms) apart`);
  for (const s of steps) { assert.ok(s.union <= (V[2] + 2 * M) * (V[3] + 2 * M), `a step: ${s.union} px redrawn in the view`); for (const q of s.rects) assert.ok(inView(q) || inInset(q), `a step's rect ${q} lies in the tree view (or the overview's inset: the view box moves)`); assert.ok(s.d - s.view <= 153600); }
  for (const x of frames) if (!steps.includes(x)) assert.ok(x.d <= 153600, `a frame between steps: ${x.d} px`); assert.ok(k2 <= 153600, "the key's frame");
  const cams = panSteps(from, to, P.frac); assert.deepEqual(cams, [[12, 48], [12, 8], [12, -10]]);
  // reduced motion: no event, one cut to the props' camera
  const h = await start(lark); dirty(h); h.send({ t: "key", k: "up" }); h.frame((h.t += 16)); dirty(h); const cut = build(st, id("Bean"), "close", null, { cam: offsetOf(lark, id("Bean"), to) }); h.build = cut;
  for (const r of cut.requests) h.handleOf(r.id, withPolicy((i) => standIn(i, r.size))); h.props({ screen: "library.family", ...cut.props, motion: false, frame: frameProps(cut) }); const one = []; let cutF = null; for (let i = 0; i < 8; i++) { h.frame((h.t += 16)); const rr = dirtyRects(h), dd = dirty(h); one.push(dd); if (dd > 153600) cutF = rr; }
  console.log(`# reduced motion: one cut, dirty px per frame ${one.join(", ")}`); assert.equal(one.filter((d) => d > 153600).length, 1, "one step at the full offset"); assert.ok(cutF, "the cut frame"); const cu = union(cutF.filter(inView)); console.log(`# reduced motion cut: ${cu} px redrawn in the view grown by 5 px (budget ${(V[2] + 2 * M) * (V[3] + 2 * M)}), LVGL's rectangle sum ${cutF.reduce((t, q) => t + q[2] * q[3], 0)}`); assert.ok(cu <= (V[2] + 2 * M) * (V[3] + 2 * M)); for (const q of cutF) assert.ok(inView(q) || inInset(q), `the cut's rect ${q}`);
});

test("the focus table holds 64 targets (focus.h FOCUS_TARGETS): with 65, a selector the host answers with the 65th is taken as unanswered (the ring goes to the group's first target); the 64th is reached", { skip }, async () => {
  const { st, by } = world(), id = (n) => "node." + by[n].id, b = build(st, id("Moss"), "close"), T = b.props.focus.targets, dot = id("Dot");
  const pad = Array.from({ length: 65 - T.length }, (_, i) => ({ id: "node." + (900 + i), group: "node", enabled: true })), list = [...T.filter((t) => t.id !== dot), ...pad, T.find((t) => t.id === dot)];
  assert.equal(list.length, 65); b.props.focus.targets = list; const f = await start(b);
  for (; f.poll();); f.send({ t: "key", k: "up" }); f.frame((f.t += 16)); const said = []; for (let m; (m = f.poll());) if (m.t === "focus") said.push(m.target);
  console.log(`# 65 targets, ▲ from Moss answered with Dot as the 65th: the face says ${said.join(", ")}`); assert.deepEqual(said, [list[0].id], "past the table: the selector is taken as unanswered, the group's first target");
  const in64 = [...list.slice(0, 63), list[64], list[63]]; b.props.focus.targets = in64; f.build = b; f.setProps(); for (; f.poll();); f.send({ t: "key", k: "up" }); f.frame((f.t += 16)); const s2 = []; for (let m; (m = f.poll());) if (m.t === "focus") s2.push(m.target); assert.deepEqual(s2, [dot], "the 64th is on the table");
});
