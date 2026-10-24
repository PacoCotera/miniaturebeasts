// The Library's Level 2 on the face, part by part (the per-node check of check 1): in Node on the WebAssembly test build (dist/node, the box probe face_test_node_box), Level 2's props (built through the rules: the state,
// then speciesBuild) are drawn and every node is where library.json l2 and the props put it (tools/library-species-regions.mjs `partDepartures`): the sheet, the glints at the generator's centres plus the sheet's origin,
// the shelf's rows by the wish, the face, the sittings and the families, the page while lit; the parts a state does not show are nodes of no size in the same order (lit: every shelf node; met-only: the shelf, the glints and
// the page). The pad walks l2.focus.sheet and l2.focus.lit as ui/focus.mjs does on the real targets, the ring is on the focused target, and ✓ and ← are intents on it. Skipped when the test build has not been built (build.sh).
//   node --test prototypes/face/tests/library-species.test.mjs
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
import { speciesBuild } from "../../station/src/views/library-props.mjs";
import { partDepartures, speciesParts, targetBox, shelfOf } from "../tools/library-species-regions.mjs";
import { moveFocus } from "../../ui/focus.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist/node"), built = existsSync(path.join(dist, "face.mjs")), skip = !built && "face not built (prototypes/face/build.sh)";
const specs = path.resolve(here, "../../ui/specs/station"), J = (n) => JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8")), frameSpec = J("frame"), spec = J("library");
const palette = JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")).colours;
const metrics = built ? JSON.parse(readFileSync(path.resolve(here, "../dist/metrics.json"), "utf8")) : null;
setFrames(readdirSync(path.resolve(here, "../../workbench/frames")).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.resolve(here, "../../workbench/frames", f), "utf8"))));
const T0 = 1_000_000, settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 12, sealedOpen: false }, SV = { v: 8, wid: "w1", turn: 0, bay: [], mibis: [], with: null, tier: 1, shield: 3 };
const findLooks = (st, id, n) => { let left = n; for (const ch of frameOf(id).chapters) for (const t of ch.traits) for (const l of currentLooks(frameOf(id), t)) { if (left <= 0) return; if (S.guideLooks(st, id, t.id).includes(l)) continue; S.guideAdd(st, id, t.id, [l]); left--; } };

// the Loika at mid: five mibis (the first its face), two wish pieces, two sittings, looks new this visit; or the Untuva met only
function scene({ species = "S01", state = "sheet", lit = null, met = false } = {}) {
  const st = S.freshSt("w1", 3, T0); S.normalize(st); st.firstMibi = false;
  if (met) st.metIds = [species];
  else {
    S.seedAdults(st, species, 5, 5, settings); st.mibis[0].portrait = { state: "delivered", stage: "adult" }; assert.ok(Lib.makeFace(st, st.mibis[0]).ok); st.libSeen = S.libSnapshot(st); findLooks(st, species, 3);
    const traits = frameOf(species).chapters.flatMap((c) => c.traits).filter((t) => st.guide[species]?.[t.id]); for (const t of traits.slice(0, 2)) assert.ok(Lib.wishPin(st, species, t.id, st.guide[species][t.id][0], settings).ok);
    st.moments = { ["guide:" + species]: 1, [`sealed:${species}:face`]: 2 };
  }
  return speciesBuild({ st, sv: SV, settings, ui: { species, state, lit, cur: null, l2: {} }, metrics }, spec, frameSpec);
}
const frameProps = (b) => ({ top: { screen: "library.species", title: "Library", turn: 4, turnFlash: false, materials: { e: 9, d: 9, s: 9 }, flash: {}, companion: { docked: true, withMibi: null }, readout: b.top.readout }, line: { need: "", ...b.line }, plate: { text: "" } });
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
function standIn(id, [w, h]) { const d = new Uint8ClampedArray(w * h * 4), k = hash(id); for (let i = 0; i < w * h; i++) { d[i * 4] = 70 + (k & 127); d[i * 4 + 1] = 70 + ((k >> 7) & 127); d[i * 4 + 2] = 70 + ((k >> 14) & 127); d[i * 4 + 3] = 255; } return { w, h, data: d }; }
const sizeOf = (r) => r.size ?? (r.kind === "star" ? [12, 12] : [16, 16]);
async function start(b) {
  const f = await bootFace(pathToFileURL(dist + "/"), { test: true });
  f.send({ t: "palette", name: "station", colours: palette }); for (const [n, j] of [["frame", frameSpec], ["library", spec]]) assert.equal(f.send({ t: "spec", screen: n, json: j }), 0);
  for (const id of ["energy", "data", "essence", "cross"]) f.handleOf(`icon:${id}:16`, withPolicy((i) => standIn(i, [16, 16])));
  for (const id of ["frame-companion-outline-16x24"]) f.handleOf(id, withPolicy((i) => standIn(i, [16, 24])));
  f.t = 0; f.build = b; f.setProps = () => { for (const r of f.build.requests) f.handleOf(r.id, withPolicy((i) => standIn(i, sizeOf(r)))); assert.equal(f.props({ screen: "library.species", ...f.build.props, motion: false, frame: frameProps(f.build) }), 0, f.errors().join("; ")); for (let i = 0; i < 2; i++) f.frame((f.t += 16)); };
  f.setProps(); return f;
}
const boxOf = (f) => (id) => f.nodeBox(id)?.box ?? null;

test("Level 2 in sheet, the Loika at mid: every node at its place, the same nodes in the fixed order; the shelf's rows by the wish, the face, the sittings and the families", { skip }, async () => {
  const b = scene(), f = await start(b); assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0);
  assert.deepEqual(partDepartures(boxOf(f), spec, b.props), []);
  const sh = shelfOf(spec, b.props); assert.deepEqual([sh.w, sh.s, sh.n], [2, 2, 5], "the scene holds two wish pieces, two sittings and five family faces");
  assert.equal(sh.h, 30 + 12 + 24 * 2 + 64 + 20 + 16 * 2 + 12, "h = 30 + 12 + 24 w + 64 + 20 + 16 (n - 1) + 12, the three rows drawn");
  assert.deepEqual(f.nodeBox("shelf.unlocked.panel").box, [700, 50, 308, sh.h]); assert.deepEqual(f.nodeBox("shelf.wish.1.disc").box, [800, 94 + 24, 16, 16]); assert.deepEqual(f.nodeBox("shelf.wish.1.star").box, [810, 88 + 24, 12, 12]);
  const yf = 50 + 30 + 12 + 24 * 2 + 16; assert.deepEqual(f.nodeBox("shelf.face.picture").box, [800, yf, 64, 64]); assert.deepEqual(f.nodeBox("shelf.sit.1").box, [820, yf + 64 + 16 + 6, 16, 12], "sitting k at (800 + 20 k, y_s + 6), the UI/UX ruling");
  const yr = 50 + sh.h + 12; assert.deepEqual(f.nodeBox("shelf.families.panel").box, [700, yr, 308, 30 + 12 + 80 * 2 + 12]); assert.deepEqual(f.nodeBox("family.4.picture").box, [712, yr + 42 + 80, 56, 56]);
  assert.deepEqual(f.nodeBox("family.5.picture").box.slice(2), [0, 0], "the faces beyond the family's are nodes of no size"); assert.deepEqual(f.nodeBox("page.picture").box.slice(2), [0, 0], "no page in sheet");
  const g = b.props.regions.sheet.glints[0]; assert.deepEqual(f.nodeBox("sheet.glint.0").box, [16 + g[0] - 6, 40 + g[1] - 6, 12, 12], "the glint at the generator's centre plus the sheet's origin");
  assert.equal(speciesParts(spec, b.props).length, 1 + 8 + 2 + 1 + 4 * 3 + 3 + 1 + 9 + 2 + 8 * 2 + 1, "the node table");
  const ring = f.nodeBox("focus")?.box, plate = targetBox(spec, b.props, b.props.focus.cur); assert.deepEqual(ring, [plate[0] - 5, plate[1] - 5, plate[2] + 10, plate[3] + 10], "the ring on the first open plate, 5 px out");
});

test("Unlocked is drawn only when one of its rows is: nothing to unlock leaves every Unlocked node a node of no size in its fixed order and Families at y 50; the face moves up to y 92 with no wish; y_f at w 4", { skip }, async () => {
  const none = scene();
  const bare = (() => { const s = S.freshSt("w1", 3, T0);   /* the Loika with no wish, no face and no sitting: three mibis */ S.normalize(s); s.firstMibi = false; S.seedAdults(s, "S01", 5, 3, settings); s.libSeen = S.libSnapshot(s); return s; })();
  const at = (s, extra = {}) => speciesBuild({ st: s, sv: SV, settings, ui: { species: "S01", state: "sheet", lit: null, cur: null, l2: {} }, metrics, ...extra }, spec, frameSpec);
  let b = at(bare); const f = await start(b); assert.deepEqual(f.errors(), []); assert.deepEqual(partDepartures(boxOf(f), spec, b.props), []);
  const parts = speciesParts(spec, b.props); assert.deepEqual(parts.map((p) => p[0]), speciesParts(spec, none.props).map((p) => p[0]), "the same nodes in the same order");
  const unlocked = parts.filter(([id]) => /^shelf\.(unlocked|wish|face|sit)/.test(id)); assert.equal(unlocked.length, 2 + 1 + 12 + 3 + 10);
  for (const [id, shown, , kind] of unlocked) { assert.equal(shown, false, id); const box = f.nodeBox(id).box; if (kind === "text") assert.equal(box[2], 0, id + ": a line with no text"); else assert.deepEqual(box.slice(2), [0, 0], id + " is a node of no size"); }
  assert.deepEqual(f.nodeBox("shelf.families.panel").box, [700, 50, 308, 30 + 12 + 80 + 12], "Families at y 50"); assert.deepEqual(f.nodeBox("family.0.picture").box, [712, 50 + 42, 56, 56]);
  assert.ok(!b.props.focus.targets.some((t) => t.id === "wish" || t.id === "face"), "no target for a row not drawn");
  bare.mibis[0].portrait = { state: "delivered", stage: "adult" }; assert.ok(Lib.makeFace(bare, bare.mibis[0]).ok); f.build = b = at(bare); f.setProps();
  assert.deepEqual(partDepartures(boxOf(f), spec, b.props), []); assert.deepEqual(f.nodeBox("shelf.unlocked.panel").box, [700, 50, 308, 30 + 12 + 64 + 12]);
  assert.deepEqual(f.nodeBox("shelf.face.picture").box, [800, 92, 64, 64], "y_f at w 0: 92"); assert.deepEqual(f.nodeBox("shelf.families.panel").box.slice(0, 2), [700, 180], "Families at 50 + 118 + 12");
  const four = frameOf("S01").chapters.flatMap((c) => c.traits).filter((t) => bare.guide.S01?.[t.id]).slice(0, 4); assert.equal(four.length, 4);
  for (const t of four) assert.ok(Lib.wishPin(bare, "S01", t.id, bare.guide.S01[t.id][0], settings).ok); f.build = b = at(bare); f.setProps();
  assert.deepEqual(partDepartures(boxOf(f), spec, b.props), []); assert.deepEqual(f.nodeBox("shelf.face.picture").box, [800, 50 + 30 + 12 + 24 * 4 + 16, 64, 64], "y_f at w 4: 204");
});

test("lit: every shelf node is a node of no size in its order, the page is drawn after them at its rect; clearing brings the shelf back unchanged", { skip }, async () => {
  const sheet = scene(), lit = scene({ state: "lit", lit: "coat" }), f = await start(lit);
  assert.deepEqual(partDepartures(boxOf(f), spec, lit.props), []); assert.deepEqual(f.nodeBox("page.picture").box, [700, 50, 308, 500]);
  for (const id of ["shelf.unlocked.panel", "shelf.wish.0.disc", "shelf.face.picture", "shelf.sit.0", "shelf.families.panel", "family.0.picture"]) assert.deepEqual(f.nodeBox(id).box.slice(2), [0, 0], id);
  const before = speciesParts(spec, sheet.props).map((p) => p[0]); assert.deepEqual(speciesParts(spec, lit.props).map((p) => p[0]), before, "the same nodes in the same order");
  f.build = sheet; f.setProps(); assert.deepEqual(partDepartures(boxOf(f), spec, sheet.props), [], "cleared: the shelf as before");
});

test("met-only: the met sheet; every shelf node, glint and the page a node of no size; no ring", { skip }, async () => {
  const b = scene({ species: "S02", met: true }), f = await start(b); assert.deepEqual(f.errors(), []);
  assert.deepEqual(partDepartures(boxOf(f), spec, b.props), []); assert.equal(f.nodeBox("focus"), null, "no ring");
  for (let i = 0; i < 8; i++) assert.deepEqual(f.nodeBox(`sheet.glint.${i}`).box.slice(2), [0, 0]);
});

test("the pad walks l2.focus.sheet and l2.focus.lit: every move the face says agrees with ui/focus.mjs on the real targets; ✓ and ← are intents on the focused target", { skip }, async () => {
  for (const b of [scene(), scene({ state: "lit", lit: "coat" })]) {
    const f = await start(b), graph = spec.l2.focus[b.props.state], T = b.props.focus.targets.map((t) => ({ id: t.id, group: t.group, rect: targetBox(spec, b.props, t.id) }));
    const key = (k) => { for (; f.poll();); f.send({ t: "key", k }); for (let i = 0; i < 2; i++) f.frame((f.t += 16)); const out = []; for (let m; (m = f.poll());) if (m.t === "focus" || m.t === "intent") out.push(m); return out; };
    let moved = 0;
    for (const from of T.map((t) => t.id)) for (const dir of ["up", "down", "left", "right"]) {
      f.build.props.focus.cur = ""; f.setProps(); f.build.props.focus.cur = from; f.setProps(); const want = moveFocus(graph, T, from, dir).to, m = key(dir);
      if (want === from) assert.deepEqual(m, [], `${b.props.state} ${from} ${dir}: the ring stays`); else { moved++; assert.deepEqual(m.map((x) => [x.t, x.target]), [["focus", want]], `${b.props.state} ${from} ${dir} is ${want}`); }
    }
    assert.ok(moved >= 10, b.props.state + ": " + moved + " moves");
    const right = T.filter((t) => t.group === "chapter").sort((p, q) => q.rect[0] - p.rect[0])[0].id; f.build.props.focus.cur = ""; f.setProps(); f.build.props.focus.cur = right; f.setProps();
    if (b.props.state === "sheet") assert.equal(moveFocus(graph, T, right, "right").to.startsWith("chapter.") || T.find((t) => t.id === moveFocus(graph, T, right, "right").to).group === "shelf", true);
    else assert.equal(moveFocus(graph, T, right, "right").to, T.find((t) => t.group === "look").id, "▶ from the right column: look.first");
    assert.deepEqual(key("confirm").map((x) => [x.t, x.target, x.verb]), [["intent", right, "confirm"]]); assert.deepEqual(key("back").map((x) => [x.target, x.verb]), [[right, "back"]]);
  }
});
