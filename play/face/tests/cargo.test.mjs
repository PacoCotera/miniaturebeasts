// The Bay on the face (lvgl-switch.md §4 L2.2; the Bay design, section 2; the Bay UI spec): the words and the binding table (screens/cargo.c) on the props views/cargo-props.mjs gives, in Node on the WebAssembly face: every state of
// the Bay in both forms (the phone's 530 x 600 lp window and the 1024 x 600 device) draws without an error or a refusal inside the picture and object budgets with no region departing from cargo.json (tools/cargo-regions.mjs, proved
// here to fail on a moved panel); the words are 16 px and up; the keys (✓ and ← and the room keys on "room", the pad down is "all" while a crate waits, the rest of the pad nothing); the beat ring is round and on a crate that holds a pod.
// Skipped when the face has not been built (build.sh).
//   node --test prototypes/face/tests/cargo.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { withPolicy } from "./node-scene.mjs";
import { bootFace } from "../../station/src/face-lvgl.mjs";
import { setFrames, speciesIndex } from "../../station/src/genome.mjs";
import * as S from "../../station/src/state.mjs";
import { cargoBuild } from "../../station/src/views/cargo-props.mjs";
import { departures } from "../tools/cargo-regions.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist"), built = existsSync(path.join(dist, "face.mjs")), skip = !built && "face not built (prototypes/face/build.sh)";
const specs = path.resolve(here, "../../ui/specs/station"), J = (n) => JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8")), frameSpec = J("frame"), cargoSpec = J("cargo"), homeSpec = J("home");
const palette = JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")).colours;
const framesDir = path.resolve(here, "../../species/frames/language");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 12 }, T0 = 1_000_000;

// ---- scenes: the state through the rules, the props through the view ----
const world = () => { const st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = 9; st.d = 9; st.s = 9; st.firstMibi = false; st.dock = { docked: true, at: T0 }; st.knownIds = ["S01"]; return st; };
const crate = (n, pods = 2) => ({ id: "c" + n, n, turn: n * 2, at: T0, e: 3, d: 3, s: 4, met: [], explored: 5 * n, of: 20, lines: [], pods: Array.from({ length: pods }, (_, j) => ({ id: "p" + j, species: "S01", sp: speciesIndex("S01"), g: "meadow", how: "calm", gs: 7 + j })) });
const sv0 = (bay = []) => ({ v: 8, seed: 7, wid: "w1", turn: 0, bay, mibis: [], carried: [], tier: 1, shield: 3 });
const scene = ({ crates = 0, pods = 2, away = false, open = false, sum = null, waiting = 0 } = {}) => {
  const st = world(); if (away) st.dock = { docked: false, at: T0 }; for (let i = 0; i < waiting; i++) st.waiting.push({ id: "w" + i, species: "S01", sp: 0, g: "meadow", how: "calm", gs: 3 + i, idd: 0, read: [] });
  const sv = sv0(Array.from({ length: crates }, (_, i) => crate(i + 1, pods)));
  if (!away) S.crossCrates(st, sv); else { st.bayHeld = sv.bay.splice(0, 3); }
  return cargoBuild({ st, sv, settings, docked: S.docked(st), ui: { cargo: { state: "bay", open, sum, portrait: null, arrival: null }, meet: null }, now: T0 }, cargoSpec, homeSpec, frameSpec);
};
const frameProps = (line = {}) => ({ top: { screen: "cargo", title: "Bay", turn: 4, turnFlash: false, materials: { e: 9, d: 9, s: 9 }, flash: {}, companion: { docked: true, withMibi: null } }, line: { back: null, need: "", ...line }, plate: { text: "", timed: true } });

// stand-in pictures: a flat block keyed by id, at the size the request names; the colour is the id's, so a picture is told by one pixel
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const colourOf = (id) => { const k = hash(id); return [70 + (k & 127), 70 + ((k >> 7) & 127), 70 + ((k >> 14) & 127)]; };
function standIn(id, size) { const [w, h] = size, d = new Uint8ClampedArray(w * h * 4), [r, g, b] = colourOf(id); for (let i = 0; i < w * h; i++) { d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = 255; } return { w, h, data: d }; }
const sizeOf = (r) => r.size ?? [16, 16];
const painted = (id) => /^(crate-|cargo-|companion-|pod)/.test(id);   // the studio's masters and the pictures made from them show on the painted pass

async function start(b, { narrow = false } = {}) {
  const f = await bootFace(pathToFileURL(dist + "/"), { test: true });
  f.send({ t: "palette", name: "station", colours: palette }); for (const [n, j] of [["frame", frameSpec], ["cargo", cargoSpec], ["panel", J("panel")]]) assert.equal(f.send({ t: "spec", screen: n, json: j }), 0);
  for (const id of ["energy", "data", "essence", "cross"]) f.handleOf(`icon:${id}:16`, withPolicy((i) => standIn(i, [16, 16])));
  for (const r of b.requests) f.handleOf(r.id, withPolicy((i) => ({ ...standIn(i, sizeOf(r)), ...(painted(i) ? { policy: "art" } : {}) })));
  f.t = 0; f.narrow = narrow;
  assert.equal(f.props({ screen: "cargo", ...b.props, motion: true, narrow, frame: frameProps(b.line) }), 0, f.errors().join("; ")); frames(f); return f;
}
const frames = (f, n = 2, dt = 16) => { for (let i = 0; i < n; i++) f.frame((f.t += dt)); };
const logOf = (f) => { let lg = null; for (let m; (m = f.poll("log"));) lg = m; return lg; };
const key = (f, k) => { f.send({ t: "key", k }); frames(f); const out = []; for (let m; (m = f.poll());) if (m.t === "focus" || m.t === "intent") out.push(m); return out; };
const region = (lg, id) => lg.regions.filter((r) => r.id === id);

const SCENES = { "one crate": { crates: 1 }, "two crates": { crates: 2 }, "three crates": { crates: 3 }, "empty": {}, "away (the cradle stands empty)": { away: true, crates: 2 }, "the Bay full with a fourth aboard": { crates: 4 },
  "a crate open on the table": { crates: 3, open: true }, "a crate open with no pod": { crates: 1, pods: 0, open: true }, "the end": { sum: { crates: 3, pods: 6, newest: "x" } }, "a pod waits on the mat": { waiting: 2 } };
for (const narrow of [true, false]) for (const [name, o] of Object.entries(SCENES)) {
  test(`the Bay, ${name}, ${narrow ? "narrow (the phone)" : "wide (the device)"}: draws without an error or a refusal inside the budgets, with no region leaving cargo.json's rectangles`, { skip }, async () => {
    const b = scene(o), f = await start(b, { narrow }); assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0);
    const lg = logOf(f); assert.deepEqual(departures(lg, cargoSpec, frameSpec, b.props.state, { narrow }), []);
    const st = f.stats(); assert.ok(st.pictures <= 200, `${st.pictures} pictures`); assert.ok(f.objects() <= 400, `${f.objects()} objects`);
    assert.ok(JSON.stringify(b.props).length + JSON.stringify(b.line).length < 32 * 1024, "props under 32 KiB");
  });
}
test("the departure check bites: a panel off its place, a crate off its panel and a word under 16 px are each found", { skip }, async () => {
  const b = scene({ crates: 3 }), f = await start(b, { narrow: true }), lg = logOf(f), bad = (fn) => { const c = JSON.parse(JSON.stringify(lg)); fn(c); return departures(c, cargoSpec, frameSpec, "bay", { narrow: true }); };
  assert.deepEqual(departures(lg, cargoSpec, frameSpec, "bay", { narrow: true }), []);
  assert.match(bad((c) => { c.regions.find((r) => r.id === "ledge").rect[0] += 8; })[0], /ledge/);
  assert.match(bad((c) => { c.regions.push({ id: "ledgeCrate", layer: "art", rect: [700, 60, 64, 64] }); })[0], /ledgeCrate/);
  assert.match(bad((c) => { c.type.push({ text: "x", px: 14, region: "type" }); })[0], /14 px/);
});

// ---- what is on the screen ----
test("the ledge, the table, the shelf and the counters are four panels in each form; the crates wait where the spec puts them", { skip }, async () => {
  for (const narrow of [true, false]) {
    const f = await start(scene({ crates: 3 }), { narrow }), lg = logOf(f), F = cargoSpec.forms[narrow ? "narrow" : "wide"];
    assert.deepEqual(["ledge", "table", "shelf", "counters"].map((id) => region(lg, id)[0]?.rect), [F.ledge, F.table, F.shelf, F.counters], "four panels");
    assert.equal(region(lg, "tableCrate").length + region(lg, "ledgeCrate").length, 2, "the crate in hand on the table (one region) and the ledge's crates (one region)");
    assert.equal(region(lg, "tableRing").length + region(lg, "ledgeRing").length, 2, "each crate holds a pod: a ring on the table and on the ledge");
  }
});
test("a crate that holds no pod has no beat ring; the ring is two round outlines (a radius of half the height), never a corner", { skip }, async () => {
  const f = await start(scene({ crates: 3, pods: 0 })), l0 = logOf(f); assert.equal(region(l0, "tableRing").length + region(l0, "ledgeRing").length, 0);
  const g = await start(scene({ crates: 1 })), lg = logOf(g), rings = region(lg, "tableRing"); assert.equal(rings.length, 1); assert.ok(rings.every((r) => r.rect[2] > r.rect[3]), "wider than tall: an ellipse");
});
test("an open crate shows its pods and supplies; the end shows the sum in words and no crate", { skip }, async () => {
  let lg = logOf(await start(scene({ crates: 1, open: true }))); assert.equal(region(lg, "contents").length > 0, true, "its contents"); assert.equal(region(lg, "cradleSlot").length + region(lg, "openSlot").length, 2, "the cradle and the open crate are dashed slots");
  const f = await start(scene({ sum: { crates: 2, pods: 3, newest: "x" } })); lg = logOf(f); assert.ok(lg.type.some((t) => t.text === "2 crates unloaded · 3 pods home"), "the sum"); assert.equal(region(lg, "tableCrate").length + region(lg, "ledgeCrate").length, 0);
});

// ---- the keys ----
test("the Bay: ✓ and ← say an intent on 'room', the room keys say theirs, the pad down says 'all' while a crate waits and nothing else says anything (Cargo has no target and no ring)", { skip }, async () => {
  const f = await start(scene({ crates: 2 }));
  let [m] = key(f, "confirm"); assert.deepEqual([m.t, m.screen, m.target, m.verb], ["intent", "cargo", "room", "confirm"]);
  [m] = key(f, "back"); assert.deepEqual([m.screen, m.target, m.verb], ["cargo", "room", "back"]);
  [m] = key(f, "research"); assert.deepEqual([m.target, m.verb], ["room", "room:research"]);
  [m] = key(f, "down"); assert.deepEqual([m.screen, m.target, m.verb], ["cargo", "room", "all"], "▼ All at once");
  for (const k of ["up", "left", "right"]) assert.deepEqual(key(f, k), [], "the pad does nothing else: " + k);
  assert.equal(JSON.stringify(logOf(f)?.regions?.filter((r) => r.id === "focus") ?? []), "[]", "no ring");
});
test("with nothing on the table the pad down does nothing", { skip }, async () => {
  const f = await start(scene({ sum: { crates: 1, pods: 1, newest: "x" } })); assert.deepEqual(key(f, "down"), []);
});
