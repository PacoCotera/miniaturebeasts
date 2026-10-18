// The Library spread on the face, part by part (lvgl-switch.md §4 L; the per-node check of check 1): in Node on the WebAssembly test build (dist/node, the node path's box probe face_test_node_box),
// the wireframe-20 scene's props (built through the rules: the state, then libraryBuild) are drawn, and every frame's every node is where library.json puts it (tools/library-regions.mjs `partDepartures`):
// the parts the status gives at the frame's place plus their offset, the ones it does not as nodes of no size, all inside the page. Proved to fail: the spec is patched (the plate, the clan rule, the roundel and
// a progress seed each moved one pixel), sent again, and the check names that part. Skipped when the test build has not been built (build.sh).
//   node --test prototypes/face/tests/library.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { withPolicy } from "./node-scene.mjs";
import { bootFace } from "../../station/src/face-lvgl.mjs";
import { setFrames } from "../../station/src/genome.mjs";
import * as S from "../../station/src/state.mjs";
import * as Lib from "../../station/src/library.mjs";
import { frameOf } from "../../station/src/genome.mjs";
import { libraryBuild } from "../../station/src/views/library-props.mjs";
import { partDepartures } from "../tools/library-regions.mjs";
import { dirty } from "./dirty.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist/node"), built = existsSync(path.join(dist, "face.mjs")), skip = !built && "face not built (prototypes/face/build.sh)";
const specs = path.resolve(here, "../../ui/specs/station"), J = (n) => JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8")), frameSpec = J("frame"), spec = J("library");
const palette = JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")).colours;
setFrames(readdirSync(path.resolve(here, "../../workbench/frames")).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.resolve(here, "../../workbench/frames", f), "utf8"))));
const T0 = 1_000_000, settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 12, sealedOpen: true };

// the guide of a species filled to a share of its looks (a share of one reads the sealed chapters too), as the sandbox's test seam does
function fillGuide(st, id, share) {
  st.guide[id] = {}; delete st.readOnce[id]; if (share >= 1) st.readOnce[id] = frameOf(id).chapters.map((c) => c.id);
  const g = Lib.fieldGuide(st, id, settings), want = Math.ceil(share * (g.found + g.unseen)); let n = g.found;
  for (const ch of g.chapters) { if (ch.sealed) continue; for (const t of ch.traits) for (const l of t.possible) { if (n >= want) break; if (!S.guideLooks(st, id, t.id).includes(l)) { S.guideAdd(st, id, t.id, [l]); n++; } } }
}
// wireframe 20: Loika found and portrayed, Untuva, Tuikis found at progress one and three, Belatz found with its guide complete, Hiljan met, the rest empty, the ring on Tuikis
function wireframe20() {
  const st = S.freshSt("w1", 3, T0); S.normalize(st); st.firstMibi = false;
  S.seedAdults(st, "S01", 5, 1, settings); S.seedAdults(st, "S09", 9, 1, settings); st.mibis[0].portrait = { state: "delivered" }; for (const m of st.mibis) m.paint = { state: "landed" };
  st.knownIds = ["S01", "S02", "S03", "S09"]; st.metIds = ["S04"]; fillGuide(st, "S01", 0.3); fillGuide(st, "S02", 0.1); fillGuide(st, "S03", 0.55); fillGuide(st, "S09", 1);
  return libraryBuild({ st, settings, ui: { page: 0, i: 2 } }, spec, frameSpec);
}
const frameProps = (line) => ({ top: { screen: "library", title: "Library", turn: 4, turnFlash: false, materials: { e: 9, d: 9, s: 9 }, flash: {}, companion: { docked: true, withMibi: null } }, line: { back: "Home", need: "", ...line }, plate: { text: "" } });
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
function standIn(id, [w, h]) { const d = new Uint8ClampedArray(w * h * 4), k = hash(id); for (let i = 0; i < w * h; i++) { d[i * 4] = 70 + (k & 127); d[i * 4 + 1] = 70 + ((k >> 7) & 127); d[i * 4 + 2] = 70 + ((k >> 14) & 127); d[i * 4 + 3] = 255; } return { w, h, data: d }; }

async function start(b) {
  const f = await bootFace(pathToFileURL(dist + "/"), { test: true });
  f.send({ t: "palette", name: "station", colours: palette }); for (const [n, j] of [["frame", frameSpec], ["library", spec]]) assert.equal(f.send({ t: "spec", screen: n, json: j }), 0);
  for (const id of ["energy", "data", "essence", "cross"]) f.handleOf(`icon:${id}:16`, withPolicy((i) => standIn(i, [16, 16])));
  for (const id of ["frame-companion-outline-16x24"]) f.handleOf(id, withPolicy((i) => standIn(i, [16, 24])));
  for (const r of b.requests) f.handleOf(r.id, withPolicy((i) => standIn(i, r.size ?? [16, 16])));
  f.t = 0; f.build = b; f.setProps = () => { assert.equal(f.props({ screen: "library", ...f.build.props, motion: false, frame: frameProps(f.build.line) }), 0, f.errors().join("; ")); for (let i = 0; i < 2; i++) f.frame((f.t += 16)); };
  f.setProps(); return f;
}
const boxOf = (f) => (id) => f.nodeBox(id)?.box ?? null;

test("the Library spread, wireframe 20: every part of every frame is at its place, the absent ones are nodes of no size, all inside the page", { skip }, async () => {
  const b = wireframe20(), f = await start(b); assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0); assert.ok(f.nodeBox, "the test build has the box probe");
  assert.deepEqual(partDepartures(boxOf(f), spec, b.props), []);
  // the scene is the wireframe's: S01 portrayed, S09 complete, S04 met, so the parts the check reads exist in both kinds
  const it = (id) => [...b.props.regions.leftPage.items, ...b.props.regions.rightPage.items].find((x) => x.id === id);
  assert.ok(it("S01").portrayed && it("S09").complete && it("S04").status === "met" && it("S05").status === "unmet");
  assert.ok(f.nodeBox("frame.S05.picture").box[2] === 0 && f.nodeBox("frame.S01.gilt").box[2] === 16 && f.nodeBox("frame.S09.seal").box[2] === 16);
});

const PATCHES = [
  ["the plate", (s) => { s.spread.item.plate.at[0] += 1; }, "picture"],
  ["the clan rule", (s) => { s.spread.item.clanRule.at[1] += 1; }, "rule"],
  ["the roundel", (s) => { s.spread.item.roundel.at[0] += 1; }, "roundel"],
  ["a progress seed", (s) => { s.spread.item.progress.places[2][0] += 1; }, "seed.2"],
];
for (const [name, patch, part] of PATCHES) {
  test(`the per-part check fails on a moved part: ${name} one pixel off, the spec sent again, names ${part}`, { skip }, async () => {
    const b = wireframe20(), f = await start(b); assert.deepEqual(partDepartures(boxOf(f), spec, b.props), []);
    const moved = JSON.parse(JSON.stringify(spec)); patch(moved); assert.equal(f.send({ t: "spec", screen: "library", json: moved }), 0);
    const cur = f.build.props.focus.cur; f.build.props.focus.cur = "frame.S01"; f.setProps(); f.build.props.focus.cur = cur; f.setProps();   // the props again: the screen is built from the new spec
    const d = partDepartures(boxOf(f), spec, b.props); assert.ok(d.length >= 1 && d.some((m) => m.includes("." + part + " ")), `a departure naming ${part}: ${JSON.stringify(d.slice(0, 3))}`);
  });
}

// A focus move is a cut: the old and the new ring boxes (2 × 106 × 122) and the bottom line's context zone (208 × 24); the picture's 2 px lift lies inside them (specs/station-library-spec.md §3: 30,856 or less).
test("a focus move on the spread redraws the two ring boxes and the context zone, 30,856 px or less", { skip }, async () => {
  const b = wireframe20(), f = await start(b); dirty(f);
  b.props.focus.cur = "frame.S04"; f.setProps(); b.props.focus.cur = "frame.S09"; assert.equal(f.props({ screen: "library", ...b.props, motion: false, frame: frameProps(b.line) }), 0); f.frame((f.t += 16));
  const px = dirty(f); console.log(`library focus move S04 -> S09: dirty area ${px.toLocaleString("en-US")} px`); assert.ok(px <= 30856, `${px} px`);
});
