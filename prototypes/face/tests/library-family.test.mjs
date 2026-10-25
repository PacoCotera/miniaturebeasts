// The Library's Level 3 on the face, in its far state (library.json l3): in Node on the WebAssembly test build (dist/node), the props built through the rules (the Loika lineage fixture, then familyBuild) are drawn:
// the stage, the whole lineage's picture at l3.far.rect, and the ring on the focused node's dot box plus the picture's origin; nothing else (no panel). The pad walks l3.focus.graph with the host's selectors as
// ui/focus.mjs does on the real targets, ✓ and ← are intents on the focused node, and the zoom's 180 ms stage dither is measured frame by frame (its dirty area printed). Skipped when the test build has not been built.
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

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist/node"), built = existsSync(path.join(dist, "face.mjs")), skip = !built && "face not built (prototypes/face/build.sh)";
const specs = path.resolve(here, "../../ui/specs/station"), J = (n) => JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8")), frameSpec = J("frame"), spec = J("library"), home = J("home");
const palette = JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")).colours;
const metrics = built ? JSON.parse(readFileSync(path.resolve(here, "../dist/metrics.json"), "utf8")) : null;
setFrames(readdirSync(path.resolve(here, "../../workbench/frames")).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.resolve(here, "../../workbench/frames", f), "utf8"))));
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 12 };
const world = (which = "full") => { const st = S.freshSt("w1", 3, 1e6); S.normalize(st); st.turn = 20; const by = buildLineage(st, which, { turn: 20 }); return { st, by }; };
const familyBuild = lineCased(familyBuildUnchecked, "library-family");
const build = (st, node, zoom = "far", last = null) => familyBuild({ st, settings, ui: { species: "S01", l3: { S01: { node, zoom, cam: null } }, l3last: last }, metrics }, spec, frameSpec, home);
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
  const close = build(st, "node." + by.Moss.id, "close"); assert.equal(close.notBuilt, true); assert.equal(close.line.back, "Family", "the tree exceeds the view: ← reads Family");
  f.setProps(true); dirty(f); f.send({ t: "event", kind: "dither", target: "stage", ms: 180, hold: 180 }); f.build = close; f.setProps(true);
  const frames = []; for (let i = 0; i < 12; i++) { f.frame((f.t += 16)); const d = dirty(f); frames.push(d); for (const q of dirtyRects(f)) assert.ok(q[1] >= 40 && q[1] + q[3] <= 562, `${q} inside the stage`); }
  console.log(`# the zoom's dither (far to close), dirty px per frame: ${frames.join(", ")} (the stage is ${1024 * 522})`);
  assert.ok(frames.some((d) => d > 0)); assert.ok(Math.max(...frames) <= 1024 * 522, "never past the stage");
});
