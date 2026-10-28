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
import { stampPicture } from "../../station/src/pictures.mjs";
import { frameOf } from "../../station/src/genome.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist/node"), built = existsSync(path.join(dist, "face.mjs")), skip = !built && "face not built (prototypes/face/build.sh)";
const specs = path.resolve(here, "../../ui/specs/station"), J = (n) => JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8")), frameSpec = J("frame"), spec = J("library"), home = J("home");
const palette = JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")).colours;
const metrics = built ? JSON.parse(readFileSync(path.resolve(here, "../dist/metrics.json"), "utf8")) : null;
setFrames(readdirSync(path.resolve(here, "../../workbench/frames")).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.resolve(here, "../../workbench/frames", f), "utf8"))));
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 12 };
const SINCE = new Date(2026, 9, 4, 12).getTime(), NOW = new Date(2026, 9, 17, 12).getTime();   // every mibi has been the player's for 13 days on the day the Library is built
const world = (which = "full") => { const st = S.freshSt("w1", 3, 1e6); S.normalize(st); st.turn = 20; const by = buildLineage(st, which, { turn: 20 }); for (const m of st.mibis) m.since = SINCE; return { st, by }; };
const familyBuild = lineCased(familyBuildUnchecked, "library-family");
const build = (st, node, zoom = "far", last = null, mem = {}) => familyBuild({ st, settings, ui: { species: "S01", l3: { S01: { node, zoom, cam: null, ...mem } }, l3last: last }, metrics, now: NOW }, spec, frameSpec, home);
const frameProps = (b) => ({ top: { screen: "library.family", title: "Library", turn: 4, turnFlash: false, materials: { e: 9, d: 9, s: 9 }, flash: {}, companion: { docked: true, withMibi: null }, readout: b.top.readout }, line: { need: "", ...b.line }, plate: { text: "" } });
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
function standIn(id, size) { const [w, h] = typeof size === "number" ? [size, size] : size; /* a stamp's request names one side */ const d = new Uint8ClampedArray(w * h * 4), k = hash(id); for (let i = 0; i < w * h; i++) { d[i * 4] = 70 + (k & 127); d[i * 4 + 1] = 70 + ((k >> 7) & 127); d[i * 4 + 2] = 70 + ((k >> 14) & 127); d[i * 4 + 3] = 255; } return { w, h, data: d }; }
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

test("the bud's line (no subject: the notice zone carries it) and a long name: a name over 153 px gives the nameless step of its stage, as a sentence", { skip }, () => {
  const { st, by } = world(); assert.equal(build(st, "node.bud").line.subject, "");
  assert.equal(build(st, "node." + by.Sorrel.id).line.subject, "Sorrel, young"); assert.equal(build(st, "node." + by.Reed.id).line.subject, "Reed, elder");
  by.Reed.name = "Wwwwwwwwwwwwwwwww"; assert.equal(build(st, "node." + by.Reed.id).line.subject, "An elder mibi");
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

test("close on Moss: the four link tiles over the view, the path's node and the hold mark with no size, the slots of the nodes wholly inside the view (their pictures, their names under them), the panel's bezel and its overview inset, the ring {rect: 2} on Moss's 56 box; ✓ Compare from Moss, an empty subject, ← Family", { skip }, async () => {
  const { st, by } = world(), b = build(st, "node." + by.Moss.id, "close"), f = await start(b); assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0);
  const T = b.props.regions.tree; assert.deepEqual(T.cam, [12, 105], "Moss centred in the comfort zone");
  for (const [k, box] of [[0, [16, 44, 372, 255]], [1, [388, 44, 372, 255]], [2, [16, 299, 372, 255]], [3, [388, 299, 372, 255]]]) assert.deepEqual(f.nodeBox("tree.links." + k).box, box, "tile " + k);
  assert.deepEqual(f.nodeBox("tree.path").box, [V[0], V[1], 0, 0], "the compare path's node: no size in close"); assert.deepEqual(f.nodeBox("tree.hold").box, [V[0], V[1], 0, 0], "the hold mark's node: no size, nothing held");
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
  assert.deepEqual(b.line, { ok: "Compare from Moss", subject: "", back: "Family", need: null }); assert.deepEqual(build(st, "node.bud", "close").line, { ok: null, subject: "", back: "Family", need: null }, "the bud: no ✓");
  assert.ok(JSON.stringify(b.props).length < 32 * 1024, "props " + JSON.stringify(b.props).length + " B");
  console.log(`# close on Moss: ${f.objects()} objects, props ${JSON.stringify(b.props).length} B`);
});

// ---- the info panel's rows (l3.close.panel.rows) and compare (l3.compare) ----
const PR = C.panel.rows, CH = spec.l3.compare, logOf = (f) => { let lg = null; for (let m; (m = f.poll("log"));) lg = m; return lg; };
const fnv = (t) => { let h = 2166136261; for (const ch of new TextEncoder().encode(String(t))) { h ^= ch; h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };   // the face's v_id
const onPanel = (e) => e.region === "panel" || e.region.startsWith("panel.");   // the panel's texts are in sub-regions (library.json regions.panel: head, par.0, par.1, held)
const textOf = (lg, s) => (lg?.type ?? []).find((q) => q.text === s && onPanel(q));   // a line on the panel (the tree's names are the tree's)
const hidden = (f, id) => { const q = f.nodeBox(id); return !q || q.box[2] === 0 || q.box[3] === 0; };
const lineCap = (top, role) => top + Math.floor(((frameSpec.type.roles[role].pitch ?? frameSpec.type.pitch["16"]) - 12) / 2);   // a 16 px role's cap top on its line (cap 12)
// the rows of the focused node at dy below their close places: every node where the spec puts it
function assertRows(f, b, dy, what) {
  const lg = logOf(f), R = b.props.regions.panel.rows, ox = (q) => f.nodeBox(q)?.box;
  if (R.portraitSlot) {   // the bud: the stamp slot's outline round the portrait rect, the rack pod 24 x 32 centred in it
    const pr = PR.portrait.rect, pd = PR.portraitSlot.pod; assert.equal(R.portrait, "rackpod:S01"); assert.deepEqual(ox("panel.portrait"), [pr[0] + 20, pr[1] + dy + 16, ...pd], what + ": the rack pod centred in the portrait slot");
    assert.deepEqual(ox("panel.portrait.slot.et"), [pr[0], pr[1] + dy, 64, 1], what + ": the slot's outline"); assert.deepEqual(ox("panel.portrait.slot.er"), [pr[0] + 63, pr[1] + dy, 1, 64]);
  } else { assert.ok(hidden(f, "panel.portrait.slot.et"), what + ": a mibi's portrait has no slot"); assert.deepEqual(ox("panel.portrait"), R.portrait ? [PR.portrait.rect[0], PR.portrait.rect[1] + dy, 64, 64] : ox("panel.portrait"), what + ": the portrait at 64"); }
  if (R.portrait && !R.portraitSlot) assert.match(R.portrait, /^face:\d+:64(:faded)?$/);
  const nm = (lg?.type ?? []).find((e) => e.text === R.name && onPanel(e) && e.x === PR.name.x); assert.ok(nm, what + ": the name drawn"); assert.equal(nm.x, PR.name.x); assert.equal(nm.cap, lineCap(PR.name.lineTop + dy, PR.name.role)); assert.equal(nm.role, PR.name.role); assert.ok(nm.w <= PR.name.clip);
  assert.deepEqual(ox("panel.mark"), [PR.mark.rect[0], PR.mark.rect[1] + dy, 15, 15], what + ": the species mark 15 x 15"); assert.equal(R.mark, "species-mark-S01-15");
  const a0 = textOf(lg, R.age[0]); assert.ok(a0 && a0.x === PR.age.x && a0.cap === lineCap(PR.age.lineTop[0] + dy, PR.age.role) && a0.role === PR.age.role, what + ": the age's first line");
  const SL = dy ? CH.stamp : PR.stamp;   // compare keeps the stamp where it was before the stage and Yours rows (l3.compare.stamp), not the close place plus the shift
  const rowsShown = R.stage.label ? [[R.stage.label, PR.x, PR.stage.lineTop, PR.labels.role], [R.stage.value, PR.stage.value.x, PR.stage.lineTop, PR.stage.value.role], [R.yours.label, PR.x, PR.yours.lineTop, PR.labels.role], [R.yours.value, PR.yours.value.x, PR.yours.lineTop, PR.yours.value.role], [R.yours.since, PR.yours.since.x, PR.yours.since.lineTop, PR.yours.since.role]].filter(([t]) => t) : [];
  if (!rowsShown.length) for (const id of ["panel.stage.label", "panel.stage.value", "panel.yours.label", "panel.yours.value", "panel.yours.since"]) assert.ok(hidden(f, id), `${what}: ${id} has no size`);
  for (const [s, x, top, role] of [[spec.l3.strings.panel.now, PR.x, PR.now.lineTop, PR.labels.role], [R.now, PR.now.x, PR.now.lineTop, PR.now.role], [spec.l3.strings.panel.parents, PR.x, PR.parents.lineTop, PR.labels.role], [spec.l3.strings.panel.stamp, PR.x, SL.lineTop - dy, PR.labels.role], ...rowsShown]) {
    const q = (lg?.type ?? []).find((e) => e.text === s && onPanel(e) && e.x === x && e.cap === lineCap(top + dy, role)); assert.ok(q && q.role === role, `${what}: "${s}" at ${x}, lineTop ${top + dy}, ${role}`); }
  R.parents.forEach((p, k) => { const box = p.pod ? [PR.parents.pod[0], PR.parents.pod[1] + dy, 24, 32] : [PR.parents.face[0], PR.parents.face[1] + PR.parents.pitch * k + dy, 24, 24]; assert.deepEqual(ox(`panel.par.${k}.face`), box, `${what}: parent ${k}'s ${p.pod ? "pod" : "face"}`);
    const q = (lg?.type ?? []).find((e) => e.text === p.name && onPanel(e) && e.x === PR.parents.name.x && e.cap === lineCap(PR.parents.name.lineTop + PR.parents.pitch * k + dy, PR.parents.name.role)); assert.ok(q && q.w <= PR.parents.name.clip, `${what}: parent ${k}'s name "${p.name}"`); });
  for (let k = R.parents.length; k < 2; k++) assert.ok(hidden(f, `panel.par.${k}.face`) && hidden(f, `panel.par.${k}.name`), `${what}: parent ${k} not shown`);
  const s = [SL.slot[0], SL.slot[1] - dy]; assert.deepEqual(ox("panel.stamp.slot.et"), [s[0], s[1] + dy, 104, 1], what + ": the slot's outline"); assert.deepEqual(ox("panel.stamp.slot.er"), [s[0] + 103, s[1] + dy, 1, 104]);
  const z = R.stamp.size, at = [s[0] + Math.round((104 - z) / 2), s[1] + dy + Math.round((104 - z) / 2)]; assert.deepEqual(ox("panel.stamp.picture"), [...at, z, z], what + ": the stamp centred in the slot at its stampSizing size");
  return { lg, at };
}
test("close's info panel: Moss's rows (portrait, name, mark, age, place, both parents' faces and names, the stamp centred in its outlined slot) where l3.close.panel.rows puts them, by role; the held block, divider, fact band and block light with no size; a founder's pod and place, a shed-pod child's line, the bud's own rows", { skip }, async () => {
  const { st, by } = world(), id = (n) => "node." + by[n].id, b = build(st, id("Moss"), "close"), f = await start(b); assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0);
  const R = b.props.regions.panel.rows; assert.deepEqual([R.name, R.age, R.now, R.parents.map((p) => p.name)], ["Moss", ["3 turns old", ""], "At home", ["Dot", "Bean"]]); assert.deepEqual([R.stage, R.yours], [{ label: "Adult", value: "for 1 turn" }, { label: "Yours", value: "13 days", since: "since 4 Oct" }]); assert.equal(R.stamp.size, 81); assert.match(R.stamp.picture, /^stamp:S01-[0-9a-f]+:coat,face,movement,stamina:81:k16$/);
  assertRows(f, b, 0, "Moss");
  for (const q of ["held.label", "held.name", "held.mark", "held.portrait", "held.stampLabel", "held.stamp.slot.et", "held.stamp.picture", "panel.div.0", "panel.div.1", "panel.fact.0", "panel.fact.1", ...Array.from({ length: 9 }, (_, c) => `panel.light.${c}.et`), ...Array.from({ length: 9 }, (_, c) => `held.light.${c}.in.et`)]) assert.ok(hidden(f, q), q + ": no size in close");
  // a founder: its rack pod (24 x 32 at the UI/UX box) and "{place} pod"; Bean's pod is from the meadow
  f.build = build(st, id("Bean"), "close"); f.setProps(); const fb = f.build.props.regions.panel.rows; assert.deepEqual(fb.parents, [{ face: "rackpod:S01", name: "Meadow pod", pod: true }]); assertRows(f, f.build, 0, "Bean (a founder)");
  by.Bean.from.g = "nowhere"; assert.deepEqual(build(st, id("Bean"), "close").props.regions.panel.rows.parents[0].name, "A pod", "a place the pod words do not name: a pod"); by.Bean.from.g = "meadow";
  // a shed-pod child: one face and "{Parent}'s line", only the name cut to 57
  f.build = build(st, id("Thistle"), "close"); f.setProps(); assert.deepEqual(f.build.props.regions.panel.rows.parents.map((p) => p.name), ["Ivy's line"]); assertRows(f, f.build, 0, "Thistle (a shed pod)");
  by.Ivy.name = "Wwwwwwwwwwwwwwww"; const cut = build(st, id("Thistle"), "close").props.regions.panel.rows.parents[0].name; assert.match(cut, /^Ww*…'s line$/, cut); by.Ivy.name = "Ivy";
  // the bud: "{Species} bud", "Growing", "In the Incubator", its parents' faces, no portrait
  f.build = build(st, "node.bud", "close"); f.setProps(); const bb = f.build.props.regions.panel.rows; assert.deepEqual([bb.portrait, bb.portraitSlot, bb.name, bb.age, bb.now, bb.parents.map((p) => p.name)], ["rackpod:S01", true, "Loika bud", ["Growing", ""], "In the Incubator", ["Moss", "Thistle"]]);
  assertRows(f, f.build, 0, "the bud");
  // released: the portrait and a parent's face faded, the stage word kept, no stage row and no Yours row
  const rowsOf = (n) => build(st, id(n), "close").props.regions.panel.rows, none = { label: "", value: "" }, noYours = { label: "", value: "", since: "" };
  const wren = rowsOf("Wren"); assert.match(wren.portrait, /^face:\d+:64:faded$/); assert.equal(wren.now, "In the wild"); assert.deepEqual([wren.age, wren.stage, wren.yours], [["Adult", ""], none, noYours]); f.build = build(st, id("Wren"), "close"); f.setProps(); assertRows(f, f.build, 0, "Wren (released)");
  assert.match(rowsOf("Sorrel").parents[0].face, /^face:\d+:24$/);
  // the age is in turns for every living stage, the trips are gone from it; an elder counts up from the turn it became one
  by.Moss.outings = 3; assert.deepEqual(rowsOf("Moss").age, ["3 turns old", ""], "no trips line: the age is never outings");
  const re = rowsOf("Reed"); assert.deepEqual([re.age, re.stage], [["25 turns old", ""], { label: "Elder", value: "for 7 turns" }]); by.Moss.outings = 0;
  // a young mibi: its turns to grow, or "grows with care" once bonded; a mibi born this turn reads "new this turn"
  const so = rowsOf("Sorrel"); assert.deepEqual([so.age, so.stage], [["new this turn", ""], { label: "Young", value: "adult in 2 turns" }]); by.Sorrel.born = 19; assert.equal(rowsOf("Sorrel").stage.value, "adult next turn"); assert.equal(rowsOf("Sorrel").age[0], "1 turn old"); by.Sorrel.bonded = true; assert.equal(rowsOf("Sorrel").stage.value, "grows with care"); by.Sorrel.bonded = false; by.Sorrel.born = 20;
  by.Moss.born = 18; assert.deepEqual(rowsOf("Moss").stage, { label: "Adult", value: "from this turn" }); by.Moss.born = 17;
  // Yours: the real time, then the date; today; an older save says or longer, and or before under today; no clock, no rows
  by.Moss.since = NOW; assert.deepEqual(rowsOf("Moss").yours, { label: "Yours", value: "since today", since: "since 17 Oct" }); by.Moss.sinceFloor = true; assert.deepEqual(rowsOf("Moss").yours, { label: "Yours", value: "since today", since: "or before" });
  by.Moss.since = SINCE; assert.deepEqual(rowsOf("Moss").yours, { label: "Yours", value: "13 days", since: "or longer" }); delete by.Moss.sinceFloor; by.Moss.since = new Date(2025, 9, 4, 12).getTime(); assert.deepEqual(rowsOf("Moss").yours, { label: "Yours", value: "12 months", since: "since Oct 2025" });
  delete by.Moss.since; assert.deepEqual(rowsOf("Moss").yours, noYours, "a mibi with no `since` yet shows no Yours row"); by.Moss.since = SINCE;
  // the panel's height: the whole panel with the overview inset (Moss: the tree exceeds the view), the rows' height when the inset has no size (the tree fits)
  f.build = build(st, id("Moss"), "close"); f.setProps(); const pr = () => logOf(f).regions.find((q) => q.id === "panel" && q.layer === "chrome").rect; assert.deepEqual(pr(), C.panel.rect, "with the inset: the full panel");
  { const w = world("small"); f.build = build(w.st, "node." + w.by.Reed.id, "close"); f.setProps(); assert.deepEqual(C.panel.rectFits, [776, 44, 232, 402]); assert.deepEqual(pr(), C.panel.rectFits, "no inset: the panel is the height of its rows (floor 446: the stamp slot ends at 434, and 12 more)"); }
});
test("compare, Dot held and Moss focused: the held block (label, name and its 10 px mark at the name's end + 4, the 40 px portrait, stamp label and stamp), the divider (libWell, libLine), the fact, the rows moved down 190, the block light (2 px mint) on the blocks read on both whose traits all match in both stamps, the path in mint along the recorded line, the hold mark (1 px focus at the box + 4, logged as a hold) and the ring; the line; the compare's time per ring move printed", { skip }, async () => {
  const { st, by } = world(), id = (n) => "node." + by[n].id, t0 = performance.now(), b = build(st, id("Moss"), "compare", null, { held: id("Dot") }), ms = performance.now() - t0, f = await start(b); assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0);
  assert.equal(b.props.state, "compare"); const P = b.props.regions.panel, H = P.held, ox = (q) => f.nodeBox(q)?.box;
  assert.deepEqual(b.line, { ok: "Compare from Moss", subject: "Compared with Dot", back: "Done", need: null });
  assert.equal(P.fact, "Same Crown, Eyes and Drive", "the traits read on both that show the same, in frame order, as the frames spell them, joined");
  const { lg, at } = assertRows(f, b, CH.shift, "Moss in compare");
  const hl = (lg.type ?? []).find((e) => e.text === spec.l3.strings.panel.holding && onPanel(e)); assert.ok(hl && hl.x === 788 && hl.cap === lineCap(CH.held.label.lineTop, PR.labels.role));
  const hn = textOf(lg, "Dot"); assert.ok(hn && hn.cap === lineCap(CH.held.name.lineTop, CH.held.name.role) && hn.x === 788);
  assert.deepEqual(ox("held.mark"), [788 + hn.w + CH.held.mark.gap, hn.cap + 1, 10, 10], "the mark 10 x 10 at the name's end + 4, centred on its cap"); assert.equal(H.mark, "species-mark-S01-10");
  assert.deepEqual(ox("held.portrait"), CH.held.portrait.rect); assert.match(H.portrait, /^face:\d+:56$/); assert.match(H.stamp.picture, /:k16$/, "the held stamp is dimmed as a label (colours.stampLabel.k)");
  assert.ok(hidden(f, "held.stampLabel") && !(lg.type ?? []).some((e) => e.text === "Stamp" && e.x === 788 && e.cap < 170), "the held block has no \"Stamp\" word");
  const hs = CH.held.stamp.slot, hat = [hs[0] + Math.round((104 - H.stamp.size) / 2), hs[1] + Math.round((104 - H.stamp.size) / 2)]; assert.deepEqual(ox("held.stamp.slot.et"), [hs[0], hs[1], 104, 1]); assert.deepEqual(ox("held.stamp.picture"), [...hat, H.stamp.size, H.stamp.size]);
  assert.deepEqual(ox("panel.div.0"), [776, 176, 232, 1]); assert.deepEqual(ox("panel.div.1"), [776, 177, 232, 1]);
  const px = (x, y) => f.pixel(x, y); assert.ok(same(px(800, 176), rgbOf.libWell) && same(px(800, 177), rgbOf.libLine), "libWell over libLine");
  const fl = [0, 1].map((k) => (lg.type ?? []).find((e) => onPanel(e) && e.cap === lineCap(CH.fact.lineTop + 20 * k, CH.fact.role) && e.role === CH.fact.role));
  assert.ok(fl.every((q) => q && q.w <= CH.fact.width && q.x === CH.fact.x + Math.floor((CH.fact.width - q.w + 1) / 2)) && fl.map((q) => q.text).join(" ") === P.fact, `the fact wrapped at ${CH.fact.width} on its two lines, each centred in the band: ${fl.map((q) => q?.text).join(" | ")}`);
  assert.deepEqual(fl.map((q) => q.text), ["Same Crown, Eyes", "and Drive"], "no line ends on \"and\": the break goes before it");
  // the held name and its mark are one run (T8 holds the gap to 4)
  { const rn = lg.nodes.find((n) => n[0] === fnv("held.name")), rm = lg.nodes.find((n) => n[0] === fnv("held.mark")); assert.ok(rn && rm && rn[13] !== 0 && rn[13] === rm[13], "the held name and its mark are one run"); }
  // the block light: Face (c 1) and Movement (c 2) read on both and every compared trait matching; Coat and Stamina not
  assert.deepEqual(P.rows.stamp.lights.map((q) => q.c), [1, 2]); assert.deepEqual(H.stamp.lights.map((q) => q.c), [1, 2]);
  for (const [lid, o, L] of [["panel.light", at, P.rows.stamp.lights], ["held.light", hat, H.stamp.lights]]) {
    for (const { c, rect: r } of L) { assert.deepEqual(ox(`${lid}.${c}.et`), [o[0] + r[0], o[1] + r[1], r[2], 1]); assert.deepEqual(ox(`${lid}.${c}.in.et`), [o[0] + r[0] + 1, o[1] + r[1] + 1, r[2] - 2, 1]);
      for (const [x, y] of [[o[0] + r[0], o[1] + r[1] + 3], [o[0] + r[0] + 1, o[1] + r[1] + 3]]) assert.ok(same(px(x, y), rgbOf.mint), `${lid}.${c}: 2 px mint at ${x}, ${y}`);
      assert.ok(!same(px(o[0] + r[0] + 2, o[1] + r[1] + 3), rgbOf.mint), `${lid}.${c}: only 2 px`); }
    for (const c of [0, 3, 4, 5, 6, 7, 8]) assert.ok(hidden(f, `${lid}.${c}.et`), `${lid}.${c} unlit`); }
  // the path: Dot down to her children's bus, along it, down to Moss: 2 px mint over the links, its node at its bounds
  assert.deepEqual(b.props.regions.tree.path, [{ a: [5, 4], b: [5, 5] }, { a: [5, 5], b: [8, 5] }, { a: [8, 5], b: [8, 6] }]);
  const pb = ox("tree.path"), [dx] = closeAt(b, id("Dot")), [mx, my] = closeAt(b, id("Moss")), busY = C.grid.y0 + 2.5 * C.grid.drow - b.props.regions.tree.cam[1];
  assert.ok(pb[0] === dx - 2 && pb[0] + pb[2] === mx + 2 && pb[1] + pb[3] === my - 28, `the path's node ${pb} from Dot's column to Moss's box (its junctions whole: one px wider each side)`);
  for (const jx of [dx, mx]) for (let y = busY - 2; y < busY + 2; y++) for (let x = jx - 2; x < jx + 2; x++) assert.ok(same(px(x, y), rgbOf[C.links.junction.colour]), `the path's junction at ${jx} stays whole in ${C.links.junction.colour}: (${x}, ${y})`);
  assert.ok(same(px(dx - 1, busY - 3), rgbOf.mint) && same(px(dx, busY - 3), rgbOf.mint) && !same(px(dx + 1, busY - 3), rgbOf.mint), "Dot's drop: 2 px mint");
  assert.ok(same(px(mx - 20, busY), rgbOf.mint) && same(px(mx, my - 40), rgbOf.mint), "the bus and Moss's drop in mint");
  // the hold mark on Dot's slot: 1 px focus at the box + 4 (gap) + 1, logged as a hold beside the one ring
  const [dxx, dyy] = closeAt(b, id("Dot")), o = frameSpec.focus.ring.hold.gap + 1; assert.deepEqual(ox("tree.hold"), [dxx - 28 - o, dyy - 28 - o, 56 + 2 * o, 56 + 2 * o]);
  assert.ok(same(px(dxx - 28 - o, dyy), rgbOf.focus) && !same(px(dxx - 28 - o + 1, dyy), rgbOf.focus), "1 px focus, no key band");
  const regs = lg.regions.filter((q) => q.hold), rings = lg.regions.filter((q) => q.ring && q.id !== "companion"); assert.deepEqual(regs.map((q) => [q.id, q.layer, q.hold]), [["tree", "chrome", 1]]); assert.deepEqual(rings.map((q) => [q.id, q.ring]), [["focus", 1]], "one ring (beside the top bar's companion holder), one hold");
  // the time of the one compare computation a ring move makes (the props build with it), and the stamps' renders cached by digest
  const times = []; for (const n of ["Fern", "Wren", "Moss", "Sorrel", "Lark"]) { const s = performance.now(); build(st, id(n), "compare", null, { held: id("Dot") }); times.push(performance.now() - s); }
  console.log(`# compare's props build per ring move (the comparison, the path and the stamps' requests): ${ms.toFixed(1)} ms cold, then ${times.map((x) => x.toFixed(1)).join(", ")} ms; the stamps are requested by digest (stamp:{genome digest}:{read}:{size}), so a mibi's stamp is made once`);
  const renders = ["Dot", "Moss", "Fern"].map((n) => { const s = performance.now(); stampPicture(frameOf("S01"), by[n].genome, by[n].read).build().rgba(); return performance.now() - s; });
  console.log(`# a stamp's render (made once per digest, then kept): ${renders.map((x) => x.toFixed(1)).join(", ")} ms`);
  assert.ok(Math.max(...times) < 120 && Math.max(...renders) < 120, "a ring move's compare and a stamp's render each under the 120 ms a stamp may re-render in");
});
test("compare, the ring on the held mibi: no fact, block light or path; ✓ Look at {name} (none when the held mibi is released); a released mibi may be held or focused (Compare from stays on it); the bud is never compared; no read look in common, nothing read on both; the subject's nameless steps", { skip }, async () => {
  const { st, by } = world(), id = (n) => "node." + by[n].id, cmp = (cur, held) => build(st, id(cur) ?? cur, "compare", null, { held: id(held) });
  id.bud = "node.bud";
  const on = cmp("Dot", "Dot"), f = await start(on); assert.deepEqual(f.errors(), []);
  assert.deepEqual(on.line, { ok: "Look at Dot", subject: "Holding Dot", back: "Done", need: null }); const P = on.props.regions.panel;
  assert.deepEqual([P.fact, P.rows.stamp.lights, P.held.stamp.lights, on.props.regions.tree.path], ["", [], [], []]);
  for (const q of ["panel.fact.0", "tree.path", ...Array.from({ length: 9 }, (_, c) => `panel.light.${c}.et`), ...Array.from({ length: 9 }, (_, c) => `held.light.${c}.et`)]) assert.ok(hidden(f, q), q + ": no size with the ring on the held mibi");
  assert.ok(!hidden(f, "tree.hold") && !hidden(f, "panel.div.0") && !hidden(f, "held.stamp.picture"), "the hold, the divider and the held stamp stay");
  // the hold takes the ring's outer corner: with the ring on the held mibi the tree view is the same with and without the hold (0 px)
  { const bare = cmp("Dot", "Dot"); bare.props.regions.tree.hold = ""; const g = await start(bare); let diff = 0; for (let y = V[1]; y < V[1] + V[3]; y++) for (let x = V[0]; x < V[0] + V[2]; x++) { const a = f.pixel(x, y), c = g.pixel(x, y); if (a[0] !== c[0] || a[1] !== c[1] || a[2] !== c[2]) diff++; }
    console.log(`# the hold under the ring on the held mibi: ${diff} px differ in the tree view`); assert.equal(diff, 0, "the ring covers the hold: 0 px differ"); }
  const rel = cmp("Wren", "Wren"); assert.deepEqual(rel.line, { ok: null, subject: "Holding Wren", back: "Done", need: null }, "the held mibi released: no ✓");
  assert.equal(cmp("Moss", "Wren").line.ok, "Compare from Moss"); assert.equal(cmp("Wren", "Moss").line.ok, "Compare from Wren", "Compare from stays on a released node");
  f.build = rel; f.setProps(); assert.deepEqual(f.errors(), []);
  const bud = build(st, "node.bud", "compare", null, { held: id("Dot") }); assert.deepEqual(bud.line, { ok: null, subject: "Holding Dot", back: "Done", need: null }); assert.deepEqual([bud.props.regions.panel.fact, bud.props.regions.tree.path], ["", []], "a bud is never compared");
  f.build = bud; f.setProps(); assert.deepEqual(f.errors(), []); assert.ok(hidden(f, "panel.fact.0"));
  assert.equal(cmp("Yarrow", "Nettle").props.regions.panel.fact, "No read look in common");
  const hz = cmp("Hazel", "Sedge"), unread = (() => { const keep = [by.Hazel.read, by.Sedge.read]; by.Hazel.read = ["coat"]; by.Sedge.read = ["face"]; const x = cmp("Hazel", "Sedge").props.regions.panel.fact; [by.Hazel.read, by.Sedge.read] = keep; return x; })();
  assert.equal(unread, "Nothing read on both yet"); assert.ok(hz.props.regions.panel.fact.startsWith("Same "));
  // four or more the same: the first three and "and more"; the line's nameless steps past their rooms
  assert.equal(cmp("Ivy", "Dot").props.regions.panel.fact, "Same Colour, Markings, Crown and more");
  by.Dot.name = "Wwwwwwwwww"; assert.equal(cmp("Moss", "Dot").line.subject, "Compared with a mibi"); assert.equal(cmp("Dot", "Dot").line.subject, "Holding Wwwwwwwwww"); by.Dot.name = "Wwwwwwwwwwwwwwww"; assert.equal(cmp("Dot", "Dot").line.subject, "Holding a mibi"); by.Dot.name = "Dot";
  const measure = (s) => { const F = metrics.fonts["16"]; return Array.from(s).reduce((w, ch, i, a) => w + (F.advance[ch.codePointAt(0)] ?? 0) + (i + 1 < a.length ? F.kern[ch.codePointAt(0) + "," + a[i + 1].codePointAt(0)] ?? 0 : 0), 0); };
  const W = frameSpec.regions.subject.rect[2], fit = [["Compared with ", spec.l3.strings.comparedRoom], ["Holding ", spec.l3.strings.holdingRoom]].map(([tpl, room]) => `"${tpl}" ${measure(tpl)} + ${room} = ${measure(tpl) + room}`);
  console.log(`# the subjects' name rooms with the line's capital (the subject ${W} px): ${fit.join("; ")}; "${spec.l3.strings.comparedNameless}" ${measure(spec.l3.strings.comparedNameless)}, "${spec.l3.strings.holdingNameless}" ${measure(spec.l3.strings.holdingNameless)} (the rooms are the subject less the prefix with its capital: UI/UX and the copywriter)`);
  for (const [tpl, room] of [["Compared with ", spec.l3.strings.comparedRoom], ["Holding ", spec.l3.strings.holdingRoom]]) assert.equal(measure(tpl) + room, W, `"${tpl}" and its room fill the subject`);
  for (const s of [spec.l3.strings.comparedNameless, spec.l3.strings.holdingNameless]) assert.ok(measure(s) <= W - 8, `"${s}" is at most ${W - 8} px (${measure(s)})`);
  for (const [k, s] of Object.entries(spec.l3.strings.nameless)) assert.ok(/^An? /.test(s) && measure(s) <= spec.l3.strings.nameRoom, `the nameless step ${k}: "${s}" (${measure(s)}) is a sentence within the name room`);
  for (const s of [spec.l3.strings.comparedNameless, spec.l3.strings.holdingNameless, "Compared with Dot", "Holding Dot"]) assert.ok(s.split(" ").length <= frameSpec.regions.subject.words && !s.endsWith("…"), s);
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
  const PN = C.panel.rect, LN = frameSpec.regions.line.rect, inPanel = (q) => within(q, PN) || within(q, LN);   // the panel's rows cut to the new mibi as the ring moves (l3.close.panel.rows), and the bottom line's ✓ names it: the first step only (step 0), or reduced motion's one cut
  const t0 = g.t, frames = [], inInset = (q) => q[0] >= C.inset.rect[0] && q[1] >= C.inset.rect[1] && q[0] + q[2] <= C.inset.rect[0] + C.inset.rect[2] && q[1] + q[3] <= C.inset.rect[1] + C.inset.rect[3];
  for (let i = 0; i < 16; i++) { g.frame((g.t += 16)); const rects = dirtyRects(g), d = dirty(g), tile = g.nodeBox("tree.slot.0.face")?.box; frames.push({ t: g.t - t0, d, rects, view: rects.filter(inView).reduce((s, q) => s + q[2] * q[3], 0), slot0: tile }); }
  if (process.env.PANDEBUG) for (const x of frames) if (x.d) console.log("# frame", x.t, JSON.stringify(x.rects));
  const steps = frames.filter((x) => x.view > 153600 || x.rects.some((q) => inView(q) && q[2] * q[3] > 20000)); for (const s of steps) { s.union = union(s.rects.filter(inView)); s.panel = union(s.rects.filter((q) => !inView(q) && !inInset(q) && inPanel(q))); s.all = union(s.rects); }
  console.log(`# the pan (Lark to Bean, 115 px up): dirty px per frame ${frames.map((x) => x.d).join(", ")}; steps at ${steps.map((x) => x.t).join(", ")} ms: in the view (with the labels' 5 px) ${steps.map((x) => x.view).join(", ")} px as LVGL's rectangles (overlaps counted twice), ${steps.map((x) => x.union).join(", ")} px as the pixels redrawn (the view's area ${V[2] * V[3]}); the panel's rows and the bottom line on a step's frame ${steps.map((x) => x.panel).join(", ")} px, the frame's whole union ${steps.map((x) => x.all).join(", ")} px; the key's frame ${k2} px; every other frame 0`);
  assert.equal(steps.length, 3, "three steps"); for (let i = 1; i < steps.length; i++) assert.ok(steps[i].t - steps[i - 1].t >= P.steps[i] - P.steps[i - 1], `steps at ${steps[i - 1].t} and ${steps[i].t} ms: at least their gap (${P.steps[i] - P.steps[i - 1]} ms) apart`);
  for (const s of steps) { assert.ok(s.union <= (V[2] + 2 * M) * (V[3] + 2 * M), `a step: ${s.union} px redrawn in the view`); for (const q of s.rects) assert.ok(inView(q) || inInset(q) || (s === steps[0] && inPanel(q)), `a step's rect ${q} lies in the tree view (or the overview's inset: the view box moves; or, on step 0 only, the panel: its rows cut to the new mibi, and the line)`); assert.ok(s.d - s.view <= 153600); }
  for (const x of frames) if (!steps.includes(x)) assert.ok(x.d <= 153600, `a frame between steps: ${x.d} px`); assert.ok(k2 <= 153600, "the key's frame");
  const cams = panSteps(from, to, P.frac); assert.deepEqual(cams, [[12, 48], [12, 8], [12, -10]]);
  // reduced motion: no event, one cut to the props' camera
  const h = await start(lark); dirty(h); h.send({ t: "key", k: "up" }); h.frame((h.t += 16)); dirty(h); const cut = build(st, id("Bean"), "close", null, { cam: offsetOf(lark, id("Bean"), to) }); h.build = cut;
  for (const r of cut.requests) h.handleOf(r.id, withPolicy((i) => standIn(i, r.size))); h.props({ screen: "library.family", ...cut.props, motion: false, frame: frameProps(cut) }); const one = []; let cutF = null; for (let i = 0; i < 8; i++) { h.frame((h.t += 16)); const rr = dirtyRects(h), dd = dirty(h); one.push(dd); if (dd > 153600) cutF = rr; }
  console.log(`# reduced motion: one cut, dirty px per frame ${one.join(", ")}`); assert.equal(one.filter((d) => d > 153600).length, 1, "one step at the full offset"); assert.ok(cutF, "the cut frame"); const cu = union(cutF.filter(inView)); console.log(`# reduced motion cut: ${cu} px redrawn in the view grown by 5 px (budget ${(V[2] + 2 * M) * (V[3] + 2 * M)}), LVGL's rectangle sum ${cutF.reduce((t, q) => t + q[2] * q[3], 0)}`); assert.ok(cu <= (V[2] + 2 * M) * (V[3] + 2 * M)); for (const q of cutF) assert.ok(inView(q) || inInset(q) || inPanel(q), `the cut's rect ${q}`);
});

test("the focus table holds 64 targets (focus.h FOCUS_TARGETS): with 65, a selector the host answers with the 65th is taken as unanswered (the ring goes to the group's first target); the 64th is reached", { skip }, async () => {
  const { st, by } = world(), id = (n) => "node." + by[n].id, b = build(st, id("Moss"), "close"), T = b.props.focus.targets, dot = id("Dot");
  const pad = Array.from({ length: 65 - T.length }, (_, i) => ({ id: "node." + (900 + i), group: "node", enabled: true })), list = [...T.filter((t) => t.id !== dot), ...pad, T.find((t) => t.id === dot)];
  assert.equal(list.length, 65); b.props.focus.targets = list; const f = await start(b);
  for (; f.poll();); f.send({ t: "key", k: "up" }); f.frame((f.t += 16)); const said = []; for (let m; (m = f.poll());) if (m.t === "focus") said.push(m.target);
  console.log(`# 65 targets, ▲ from Moss answered with Dot as the 65th: the face says ${said.join(", ")}`); assert.deepEqual(said, [list[0].id], "past the table: the selector is taken as unanswered, the group's first target");
  const in64 = [...list.slice(0, 63), list[64], list[63]]; b.props.focus.targets = in64; f.build = b; f.setProps(); for (; f.poll();); f.send({ t: "key", k: "up" }); f.frame((f.t += 16)); const s2 = []; for (let m; (m = f.poll());) if (m.t === "focus") s2.push(m.target); assert.deepEqual(s2, [dot], "the 64th is on the table");
});
