// The Library's Level 1 on the face, part by part (the per-node check of check 1): in Node on the WebAssembly test build (dist/node, the node path's box probe face_test_node_box), a mid-game catalogue's props
// (built through the rules: the state, then libraryBuild) are drawn, and every cell's every node is where library.json l1.cell puts it (tools/library-regions.mjs `partDepartures`): the parts the state gives at the cell's
// place plus their offset, the ones it does not as nodes of no size, in the same order in every cell. Proved to fail: the spec is patched (the picture, the mark, the seed and the wish mark each moved one pixel), sent again,
// and the check names that part. The pad walks l1.focus.graph over the met and found cells only, and the ring is on the focused cell. Skipped when the test build has not been built (build.sh).
//   node --test prototypes/face/tests/library.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { withPolicy } from "./node-scene.mjs";
import { bootFace } from "../../station/src/face-lvgl.mjs";
import { setFrames, frameOf } from "../../station/src/genome.mjs";
import * as S from "../../station/src/state.mjs";
import * as Lib from "../../station/src/library.mjs";
import { currentLooks } from "../../workbench/framework/describe.mjs";
import { libraryBuild } from "../../station/src/views/library-props.mjs";
import { partDepartures, cellParts } from "../tools/library-regions.mjs";
import { dirty } from "./dirty.mjs";
import { moveFocus } from "../../ui/focus.mjs";
import { listPitch } from "../../ui/specs/derive.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist/node"), built = existsSync(path.join(dist, "face.mjs")), skip = !built && "face not built (prototypes/face/build.sh)";
const specs = path.resolve(here, "../../ui/specs/station"), J = (n) => JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8")), frameSpec = J("frame"), spec = J("library");
const palette = JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")).colours;
setFrames(readdirSync(path.resolve(here, "../../workbench/frames")).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.resolve(here, "../../workbench/frames", f), "utf8"))));
const T0 = 1_000_000, settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 12, sealedOpen: true };
const findLooks = (st, id, n) => { let left = n; for (const ch of frameOf(id).chapters) for (const t of ch.traits) for (const l of currentLooks(frameOf(id), t)) { if (left <= 0) return; if (S.guideLooks(st, id, t.id).includes(l)) continue; S.guideAdd(st, id, t.id, [l]); left--; } };

// a mid-game catalogue: six found (the Loika with a face, the wish on the Tuikis, new looks on the Belatz), four met, six unmet
function midGame(l1 = "S03") {
  const st = S.freshSt("w1", 3, T0); S.normalize(st); st.firstMibi = false;
  S.seedAdults(st, "S01", 5, 1, settings); st.mibis[0].portrait = { state: "delivered" }; assert.ok(Lib.makeFace(st, st.mibis[0]).ok);
  st.knownIds = ["S01", "S02", "S03", "S07", "S09", "S12"]; st.metIds = ["S04", "S05", "S10", "S14"];
  for (const id of ["S02", "S03", "S07", "S09", "S12"]) findLooks(st, id, 4);
  S.libOpened(st); findLooks(st, "S09", 2);
  const tr = Object.keys(st.guide.S03)[0]; assert.ok(Lib.wishPin(st, "S03", tr, st.guide.S03[tr][0], settings).ok);
  return libraryBuild({ st, settings, ui: { l1 } }, spec, frameSpec);
}
const frameProps = (line) => ({ top: { screen: "library", title: "Library", turn: 4, turnFlash: false, materials: { e: 9, d: 9, s: 9 }, flash: {}, companion: { docked: true, withMibi: null }, readout: { text: "All species", mark: null } }, line: { back: "Home", need: "", ...line }, plate: { text: "" } });
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
function standIn(id, [w, h]) { const d = new Uint8ClampedArray(w * h * 4), k = hash(id); for (let i = 0; i < w * h; i++) { d[i * 4] = 70 + (k & 127); d[i * 4 + 1] = 70 + ((k >> 7) & 127); d[i * 4 + 2] = 70 + ((k >> 14) & 127); d[i * 4 + 3] = 255; } return { w, h, data: d }; }
const sizeOf = (r) => r.size ?? (r.kind === "star" ? [12, 12] : [16, 16]);

async function start(b) {
  const f = await bootFace(pathToFileURL(dist + "/"), { test: true });
  f.send({ t: "palette", name: "station", colours: palette }); for (const [n, j] of [["frame", frameSpec], ["library", spec]]) assert.equal(f.send({ t: "spec", screen: n, json: j }), 0);
  for (const id of ["energy", "data", "essence", "cross"]) f.handleOf(`icon:${id}:16`, withPolicy((i) => standIn(i, [16, 16])));
  for (const id of ["frame-companion-outline-16x24"]) f.handleOf(id, withPolicy((i) => standIn(i, [16, 24])));
  for (const r of b.requests) f.handleOf(r.id, withPolicy((i) => standIn(i, sizeOf(r))));
  f.t = 0; f.build = b; f.setProps = () => { assert.equal(f.props({ screen: "library", ...f.build.props, motion: false, frame: frameProps(f.build.line) }), 0, f.errors().join("; ")); for (let i = 0; i < 2; i++) f.frame((f.t += 16)); };
  f.setProps(); return f;
}
const boxOf = (f) => (id) => f.nodeBox(id)?.box ?? null;

test("Level 1, a mid-game catalogue: every part of every cell is at its place, the absent ones are nodes of no size, the same ten parts in every cell", { skip }, async () => {
  const b = midGame(), f = await start(b); assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0); assert.ok(f.nodeBox, "the test build has the box probe");
  assert.deepEqual(partDepartures(boxOf(f), spec, b.props), []);
  const c = (id) => b.props.regions.cells.find((x) => x.id === id);
  assert.ok(c("S01").face && c("S03").wish && c("S09").glint && c("S04").status === "met" && c("S06").status === "unmet", "the scene holds a face chip, the wish, a glint, a met and an unmet cell");
  assert.deepEqual(f.nodeBox("cell.S06.picture").box.slice(2), [0, 0]); assert.deepEqual(f.nodeBox("cell.S06.seed").box, [16 + 168 * 5 + 64, 57 + 64, 24, 24]);
  assert.deepEqual(f.nodeBox("cell.S01.face").box, [16 + 124, 57 + 130, 18, 18]); assert.deepEqual(f.nodeBox("cell.S03.wish").box, [16 + 168 * 2 + 130, 57 + 133, 12, 12], "the wish alone, with no face chip");
  assert.deepEqual(f.nodeBox("cell.S09.glint").box, [16 + 168 * 2 + 134, 57 + 168 + 6, 12, 12]); assert.deepEqual(f.nodeBox("cell.S04.rule").box, [16 + 168 * 3 + 10, 57 + 126, 132, 1]);
  assert.deepEqual(f.nodeBox("cell.S06.lip").box, [16 + 168 * 5 + 6, 57 + 152, 140, 1]); assert.deepEqual(f.nodeBox("cell.S01.lip").box.slice(2), [0, 1]);
  assert.equal(cellParts(spec, c("S01"), 0).length, 11, "the cell's two bezel nodes and its nine parts");
});

const PATCHES = [
  ["the picture", (s) => { s.l1.cell.picture.rect[0] += 1; }, "picture"],
  ["the species mark", (s) => { s.l1.cell.mark.rect[1] += 1; }, "mark"],
  ["the seed", (s) => { s.l1.cell.seed.rect[0] += 1; }, "seed"],
  ["the wish mark", (s) => { s.l1.cell.wish.alone[0] += 1; }, "wish"],
];
for (const [name, patch, part] of PATCHES) {
  test(`the per-part check fails on a moved part: ${name} one pixel off, the spec sent again, names ${part}`, { skip }, async () => {
    const b = midGame(), f = await start(b); assert.deepEqual(partDepartures(boxOf(f), spec, b.props), []);
    const moved = JSON.parse(JSON.stringify(spec)); patch(moved); assert.equal(f.send({ t: "spec", screen: "library", json: moved }), 0);
    const cur = f.build.props.focus.cur; f.build.props.focus.cur = "cell.S01"; f.setProps(); f.build.props.focus.cur = cur; f.setProps();   // the props again: the screen is built from the new spec
    const d = partDepartures(boxOf(f), spec, b.props); assert.ok(d.length >= 1 && d.some((m) => m.includes("." + part + " ")), `a departure naming ${part}: ${JSON.stringify(d.slice(0, 3))}`);
  });
}

test("the pad walks the met and found cells only: every move the face says agrees with ui/focus.mjs on l1.focus.graph; ✓ and ← are intents on the focused cell; the ring is on it", { skip }, async () => {
  const b = midGame("S01"), f = await start(b), T = b.props.focus.targets.map((t) => { const k = b.props.regions.cells.findIndex((c) => "cell." + c.id === t.id); return { id: t.id, rect: listPitch(spec.l1.grid.forms["16"], 16, k), group: "cell" }; });
  const key = (k) => { for (; f.poll();); f.send({ t: "key", k }); for (let i = 0; i < 2; i++) f.frame((f.t += 16)); const out = []; for (let m; (m = f.poll());) if (m.t === "focus" || m.t === "intent") out.push(m); return out; };
  assert.ok(!T.some((t) => ["cell.S06", "cell.S08", "cell.S11", "cell.S13", "cell.S15", "cell.S16"].includes(t.id)), "the unmet cells are not targets");
  let moved = 0;
  for (const from of T.map((t) => t.id)) for (const dir of ["up", "down", "left", "right"]) {
    f.build.props.focus.cur = ""; f.setProps(); f.build.props.focus.cur = from; f.setProps(); const want = moveFocus(spec.l1.focus.graph, T, from, dir).to, m = key(dir);
    if (want === from) assert.deepEqual(m, [], `${from} ${dir}: the ring stays and nothing is said`); else { moved++; assert.deepEqual(m.map((x) => [x.t, x.target]), [["focus", want]], `${from} ${dir} is ${want}`); }
  }
  assert.ok(moved >= 20, moved + " moves");
  f.build.props.focus.cur = ""; f.setProps(); f.build.props.focus.cur = "cell.S04"; f.setProps(); assert.deepEqual(key("confirm").map((x) => [x.t, x.target, x.verb]), [["intent", "cell.S04", "confirm"]]); assert.deepEqual(key("back").map((x) => [x.target, x.verb]), [["cell.S04", "back"]]);
  const ring = f.nodeBox("focus")?.box, cell = f.nodeBox("cell.S04.panel").box; assert.deepEqual(ring, [cell[0] - 5, cell[1] - 5, cell[2] + 10, cell[3] + 10], "the ring stands round the cell, 5 px out");
});

// A focus move redraws the two ring boxes and the bottom line's words, never the whole grid
test("a focus move on Level 1 redraws the two rings and the line, a small part of the screen", { skip }, async () => {
  const b = midGame("S04"), f = await start(b); dirty(f);
  b.props.focus.cur = "cell.S05"; b.line.ok = "Open " + frameOf("S05").species.name; assert.equal(f.props({ screen: "library", ...b.props, motion: false, frame: frameProps(b.line) }), 0); f.frame((f.t += 16));
  const px = dirty(f); console.log(`library focus move S04 -> S05: dirty area ${px.toLocaleString("en-US")} px`); assert.ok(px <= 2 * 162 * 162 + 1024 * 40, `${px} px`);
});
