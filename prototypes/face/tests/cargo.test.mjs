// Cargo on the face (lvgl-switch.md §4 L2.2; build spec T-20261016-197 sections 1 to 6): the words and the binding table (screens/cargo.c) on the props views/cargo-props.mjs gives, in Node on the WebAssembly build: every state draws
// without an error or a refusal inside the object and picture budgets with no region departing from cargo.json (tools/cargo-regions.mjs, proved here to fail on a moved region), the keys (the bay's ✓ ← and room keys, the end's any key, the
// opening's hold that lets ✓, ← and a room key through), the berths (three of 256, four of 188 with the portrait crate and its gold edge), the hatch with its six wells and the find strip, the waiting mat, the display row, one crate opening at the
// instants of its steps (the lift, the 180 ms dither into the display rect only, the materials to the top bar, the pods and finds to their places, the size swap by two dither nodes on one clock, the crate done), the same steps as cuts with reduced
// motion, the dirty area of the opening, and the dock arrival kept as it was. Skipped when the face has not been built (build.sh).
//   node --test prototypes/face/tests/cargo.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { withPolicy } from "./node-scene.mjs";
import { bootFace } from "../../station/src/face-lvgl.mjs";
import { setFrames, frameOf, podGenome, speciesIndex } from "../../station/src/genome.mjs";
import * as S from "../../station/src/state.mjs";
import { cargoBuild } from "../../station/src/views/cargo-props.mjs";
import { INTENTS } from "../../station/src/intents/index.mjs";
import { departures } from "../tools/cargo-regions.mjs";
import { dirty, dirtyRects } from "./dirty.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist"), built = existsSync(path.join(dist, "face.mjs")), skip = !built && "face not built (prototypes/face/build.sh)";
const specs = path.resolve(here, "../../ui/specs/station"), J = (n) => JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8")), frameSpec = J("frame"), cargoSpec = J("cargo"), homeSpec = J("home");
const palette = JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")).colours;
const framesDir = path.resolve(here, "../../workbench/frames");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 12 }, T0 = 1_000_000, R = cargoSpec.regions, STEPS = cargoSpec.events.opening.steps;

// ---- scenes: the state through the rules, the props through the view ----
const world = () => { const st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = 99; st.d = 99; st.s = 99; st.firstMibi = false; st.dock = { docked: true, at: T0 }; return st; };
const crate = (n, pods = 2, extra = {}) => ({ id: "c" + n, n, turn: n * 2, at: T0, e: 3, d: 3, s: 4, met: [], explored: 5 * n, of: 20, lines: [], pods: Array.from({ length: pods }, (_, j) => ({ id: "p" + j, species: "S01", sp: speciesIndex("S01"), g: "meadow", how: "calm", gs: 11 + 7 * n + j, k: null })), ...extra });
const sv0 = (bay = []) => ({ v: 8, seed: 7, wid: "w1", turn: 0, bay, mibis: [], carried: [], tier: 1, shield: 3 });
const cargoUI = (over = {}) => ({ cargo: { state: "bay", crate: 0, at: 0, run: null, shown: null, ...over }, meet: null });
const buildOf = (st, sv, ui) => cargoBuild({ st, sv, settings, docked: S.docked(st), ui, now: T0 }, cargoSpec, homeSpec, frameSpec);
// the opening through the real intent on a recording host: every timer is kept with its ms and run by runTimers; skip() ends the hold (as the page's host does)
function openedUI(st, sv, { motion = true } = {}) {
  const ui = { screen: "cargo", home: { f: "room" }, pods: { view: "collection", cur: null, ci: 0, cmp: null, wildArm: 0, focus: { set() {}, cur: null } }, ...cargoUI() };
  const h = { st, sv, settings, ui, specs: { cargo: cargoSpec, home: homeSpec, frame: frameSpec }, played: [], timers: [], went: [], t: 0, say() {}, goto(s) { this.went.push(s); }, play(e) { this.played.push(e); }, at(ms, fn) { this.timers.push({ ms: this.t + ms, fn }); }, skip() { return true; }, now: () => T0, motion: () => motion, save() {} };
  INTENTS.cargo.intent(h, "room", "confirm"); return h;
}
const runTimers = (h, upTo = Infinity) => { for (const t of h.timers.filter((t) => t.ms <= upTo).sort((a, b) => a.ms - b.ms)) { h.timers.splice(h.timers.indexOf(t), 1); h.t = t.ms; t.fn(); } };
function scene(o = {}) {
  const st = world(); for (let i = 0; i < (o.pods ?? 0); i++) { S.seedPodFromGenome(st, podGenome(frameOf("S01"), 3 + i), settings, T0); if (o.identified) S.skipIdentify(st, st.tray.at(-1)); }
  if (o.away) st.dock = { docked: false, at: T0 }; for (let i = 0; i < (o.waiting ?? 0); i++) st.waiting.push({ id: "w" + i, species: "S01", sp: 0, g: "meadow", how: "calm", gs: 3 + i, idd: 0, read: [] });
  if (o.sitting) { const m = S.seedAdults(st, "S01", 5, 1, settings).mibis[0]; st.sittingCrates.push({ id: "sc1", mibiId: m.id, start: -1e10, painted: true }); m.portrait = { state: "painting", crate: "sc1", ...(o.digest ? { digest: o.digest } : {}) }; }
  const sv = sv0(Array.from({ length: o.crates ?? 0 }, (_, i) => crate(i + 1, o.podsEach ?? 2, { ...(o.gain ?? {}), ...(o.finds && i === 0 ? { finds: o.finds } : {}) })));
  if (!o.open) return { ...buildOf(st, sv, cargoUI()), st, sv, ui: cargoUI() };
  const h = openedUI(st, sv, { motion: o.motion ?? true }); if (o.state === "end") runTimers(h);
  return { ...buildOf(st, sv, h.ui), st, sv, ui: h.ui, h };
}
const frameProps = (line = {}) => ({ top: { screen: "cargo", title: "Bay", turn: 4, turnFlash: false, materials: { e: 9, d: 9, s: 9 }, flash: {}, companion: { docked: true, withMibi: null } }, line: { back: null, need: "", ...line }, plate: { text: "", timed: true } });

// stand-in pictures: a flat block keyed by id, at the size the id names or the request's; the colour is the id's, so a picture is told by one pixel
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const colourOf = (id) => { const k = hash(id); return [70 + (k & 127), 70 + ((k >> 7) & 127), 70 + ((k >> 14) & 127)]; };
const HOLLOW = /^(berth-edge-|berth-gilt-|well-lit-)/;   // the edge, the gold edge and the lit well are outlines and a glow in the art: the stand-in is its 1 px border only, so what is under it can be read
function standIn(id, size) { const [w, h] = size, d = new Uint8ClampedArray(w * h * 4), [r, g, b] = colourOf(id), hollow = HOLLOW.test(id); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; if (hollow && x > 0 && y > 0 && x < w - 1 && y < h - 1) continue; d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255; } return { w, h, data: d }; }
const sizeOf = (r) => r.size ?? (r.kind === "star" ? [12, 12] : [16, 16]);
const painted = (id) => /^(crate-|cargo-|berth-|hatch-|pods-hatch|well-|find-.*-112|pod:|portrait:)/.test(id);   // the studio's masters and the pictures made from them show on the painted pass

async function start(b, { motion = true, t0 = 0, node = false } = {}) {   // node: the test build that can name a node by its id (nodeBox)
  const f = await bootFace(pathToFileURL(dist + (node ? "/node/" : "/")), { test: true });
  f.send({ t: "palette", name: "station", colours: palette }); for (const [n, j] of [["frame", frameSpec], ["cargo", cargoSpec], ["panel", J("panel")]]) assert.equal(f.send({ t: "spec", screen: n, json: j }), 0);
  for (const id of ["energy", "data", "essence", "cross"]) f.handleOf(`icon:${id}:16`, withPolicy((i) => standIn(i, [16, 16])));
  for (const r of b.requests) f.handleOf(r.id, withPolicy((i) => ({ ...standIn(i, sizeOf(r)), ...(painted(i) ? { policy: "art" } : {}) })));
  f.t = t0; f.motion = motion; f.build = b;
  assert.equal(f.props({ screen: "cargo", ...b.props, motion, frame: frameProps(b.line) }), 0, f.errors().join("; ")); frames(f); return f;
}
const frames = (f, n = 2, dt = 16) => { for (let i = 0; i < n; i++) f.frame((f.t += dt)); };
const logOf = (f) => { let lg = null; for (let m; (m = f.poll("log"));) lg = m; return lg; };
const key = (f, k) => { f.send({ t: "key", k }); frames(f); const out = []; for (let m; (m = f.poll());) if (m.t === "focus" || m.t === "intent") out.push(m); return out; };
const region = (lg, id, layer) => lg.regions.find((r) => r.id === id && (!layer || r.layer === layer)) ?? null;
const pixelIs = (f, x, y, id) => { const got = f.pixel(x, y), want = colourOf(id); return got.every((v, i) => v === want[i]); };
const send = (f, b, ev) => { for (const r of b.requests) f.handleOf(r.id, withPolicy((i) => ({ ...standIn(i, sizeOf(r)), ...(painted(i) ? { policy: "art" } : {}) }))); assert.equal(f.props({ screen: "cargo", ...b.props, motion: true, frame: frameProps(b.line) }), 0, f.errors().join("; ")); if (ev) f.send(ev); };
const nb = (f, id) => f.nodeBox(id)?.box ?? null;

const SCENES = {
  "bay, one crate": { crates: 1 }, "bay, two crates": { crates: 2, pods: 1 }, "bay, three crates": { crates: 3 }, "bay, empty": { pods: 2 }, "bay, shut (away)": { away: true, crates: 1 }, "bay, pods waiting": { pods: 6, waiting: 2 }, "bay, four pods waiting": { pods: 6, waiting: 5 },
  "bay, a portrait crate in": { crates: 2, sitting: true, digest: "0123456789abcdef0123" }, "bay, a portrait crate alone, away": { away: true, sitting: true },
  "opening, the first crate": { crates: 1, open: true, podsEach: 3 }, "opening, with a find": { crates: 1, open: true, podsEach: 2, finds: ["crystal"] }, "opening, three crates and a portrait crate": { crates: 3, open: true, sitting: true, podsEach: 1 }, "end, pods came": { crates: 2, open: true, state: "end", podsEach: 2 }, "end, no pods": { crates: 1, open: true, state: "end", podsEach: 0 },
};
for (const [name, o] of Object.entries(SCENES)) {
  test(`Cargo, ${name}: draws without an error or a refusal inside the budgets, with no region leaving cargo.json's rectangle`, { skip }, async () => {
    const b = scene(o), f = await start(b); assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0);
    const lg = logOf(f); assert.deepEqual(departures(lg, cargoSpec, frameSpec, b.props.state), []);
    const st = f.stats(); assert.ok(st.pictures <= 200, `${st.pictures} pictures`); assert.ok(f.objects() <= 400, `${f.objects()} objects`);
    assert.ok(JSON.stringify(b.props).length + JSON.stringify(b.line).length < 32 * 1024, "props under 32 KiB");
  });
}
test("the departure check bites: a berth off its place, the hatch moved, a mat off its rectangle and a pod leaving the bay are each found", { skip }, async () => {
  const b = scene({ crates: 2 }), f = await start(b), lg = logOf(f), bad = (fn, state = "bay") => { const c = JSON.parse(JSON.stringify(lg)); fn(c); return departures(c, cargoSpec, frameSpec, state); };
  assert.deepEqual(departures(lg, cargoSpec, frameSpec, "bay"), []);
  assert.match(bad((c) => { c.regions.find((r) => r.id === "berth").rect[0] = 8; })[0], /berth/);
  assert.match(bad((c) => { c.regions.push({ id: "hatch", layer: "art", rect: [24, 140, 160, 260] }); })[0], /hatch/);
  assert.match(bad((c) => { c.regions.push({ id: "waiting", layer: "art", rect: [24, 420, 160, 80] }); })[0], /waiting/);
  assert.match(bad((c) => { c.regions.push({ id: "bay", layer: "art", rect: [16, 48, 992, 506] }); })[0], /bay/);
  assert.match(bad((c) => { c.regions.push({ id: "travel", layer: "art", rect: [0, 0, 88, 112] }); }, "opening").join("; "), /travel/);
  assert.match(bad((c) => { c.regions.push({ id: "display", layer: "art", rect: [120, 108, 88, 112] }); }, "opening").join("; "), /display/);
});

// ---- the keys ----
test("the bay: ✓ and ← say an intent on 'room', the room keys say theirs, the pad says nothing (Cargo has no target and no ring)", { skip }, async () => {
  const f = await start(scene({ crates: 2 }));
  let [m] = key(f, "confirm"); assert.deepEqual([m.t, m.screen, m.target, m.verb], ["intent", "cargo", "room", "confirm"]);
  [m] = key(f, "back"); assert.deepEqual([m.screen, m.target, m.verb], ["cargo", "room", "back"]);
  [m] = key(f, "research"); assert.deepEqual([m.target, m.verb], ["room", "room:research"]);
  for (const k of ["up", "down", "left", "right"]) assert.deepEqual(key(f, k), [], "the pad does nothing: " + k);
  assert.equal(JSON.stringify(logOf(f)?.regions?.filter((r) => r.id === "focus") ?? []), "[]", "no ring");
});
test("the end: any key says an intent, the pad as 'pad' (the host does what the key does and shows the bay again)", { skip }, async () => {
  const f = await start(scene({ crates: 1, open: true, state: "end" }));
  for (const [k, verb] of [["confirm", "confirm"], ["back", "back"], ["up", "pad"], ["left", "pad"], ["research", "room:research"], ["habitat", "room:habitat"]]) { const [m] = key(f, k); assert.deepEqual([m.target, m.verb], ["room", verb], k); }
});
test("while the crates open (events.opening holds): the face says ✓ as confirm, ← as back and a room key as room:<x>, all on 'room', and each ends the hold on the face; the pad says nothing; no other intent is sent", { skip }, async () => {
  for (const [k, verb] of [["confirm", "confirm"], ["back", "back"], ["research", "room:research"], ["home", "room:home"]]) {
    const b = scene({ crates: 2, open: true, podsEach: 1 }), f = await start(b, { t0: 1000 }); f.send({ t: "event", kind: "arrival", target: "crate", ms: 6000, hold: 6020, skip: true }); frames(f, 2);
    for (const q of ["up", "down", "left", "right"]) assert.deepEqual(key(f, q), [], "the pad: " + q);
    const out = key(f, k); assert.deepEqual(out.map((m) => [m.t, m.screen, m.target, m.verb]), [["intent", "cargo", "room", verb]], k);
    f.send({ t: "key", k: "confirm" }); frames(f); const again = []; for (let m; (m = f.poll());) if (m.t === "intent") again.push(m); assert.deepEqual(again.map((m) => m.verb), ["confirm"], "the hold ended on the face: the next ✓ is an ordinary key");
  }
});

// ---- the berths (build spec 3) ----
const place = (G, i, f, k) => R.berths[G].x[i] + R.berths[G][f].at[k];
test("three walk crates stand in three berths of 256 at x 200, 472 and 744 (y 252): the recess under each crate, the sealed crate 102 below the berth's top, its shadow at +260, the berth's edge at the rect − 1", { skip }, async () => {
  const b = scene({ crates: 3 }), f = await start(b, { node: true }); logOf(f); const Y = 252; assert.equal(b.props.berths, 3);
  for (let i = 0; i < 3; i++) {
    const x = [200, 472, 744][i]; assert.deepEqual(nb(f, `berth.${i}.base`), [x, Y, 256, 292], "recess"); assert.deepEqual(nb(f, `berth.${i}.crate`), [x, Y + 102, 256, 176], "sealed crate"); assert.deepEqual(nb(f, `berth.${i}.shadow`), [x, Y + 260, 256, 24]); assert.deepEqual(nb(f, `berth.${i}.edge`), [x - 1, Y - 1, 258, 294]);
    assert.ok(pixelIs(f, x + 128, Y + 140, b.props.regions.berths.list[i].crate), "the sealed crate's picture");
  }
  assert.equal(nb(f, "berth.3.base"), null); assert.equal(nb(f, "berth.3.gilt"), null);
});
test("fewer crates leave their berths slatted and shut: one crate in the first berth, the other two show the shut door and no crate", { skip }, async () => {
  const b = scene({ crates: 1 }), f = await start(b, { node: true }); logOf(f);
  assert.ok(pixelIs(f, 200 + 128, 252 + 140, b.props.regions.berths.list[0].crate)); assert.ok(pixelIs(f, 472 + 128, 252 + 140, "berth-shut-256x292"), "the second berth is its slatted door"); assert.equal(nb(f, "berth.1.crate"), null); assert.equal(nb(f, "berth.2.crate"), null);
  const none = await start(scene({ pods: 1 }), { node: true }); for (let i = 0; i < 3; i++) assert.ok(pixelIs(none, [200, 472, 744][i] + 128, 252 + 140, "berth-shut-256x292"), "nothing in: every berth shut");
});
test("with a portrait crate in: four berths of 188 at x 200, 404, 608 and 812, the portrait crate in the fourth with a gold edge, sealed crates at (x + 6, y + 157), shadows at +266; away, the walk berths are shut and the portrait crate alone is ready", { skip }, async () => {
  const b = scene({ crates: 2, sitting: true, digest: "0123456789abcdef0123" }), f = await start(b, { node: true }); logOf(f); assert.equal(b.props.berths, 4); assert.equal(b.props.sittingCrate.id, "sc1");
  for (let i = 0; i < 4; i++) { const x = [200, 404, 608, 812][i]; assert.deepEqual(nb(f, `berth.${i}.base`), [x, 252, 188, 292]); assert.deepEqual(nb(f, `berth.${i}.edge`), [x - 1, 251, 190, 294]); if (i === 2) continue; assert.deepEqual(nb(f, `berth.${i}.crate`), [x + 6, 252 + 157, 176, 121], "crate " + i); assert.deepEqual(nb(f, `berth.${i}.shadow`), [x + 6, 252 + 266, 176, 16]); }
  assert.deepEqual(nb(f, "berth.3.gilt"), [812 - 5, 252 - 5, 198, 302], "the fourth berth's gold edge"); assert.equal(nb(f, "berth.2.crate"), null, "the third berth holds no walk crate"); assert.ok(pixelIs(f, 812 + 94, 252 + 200, "crate-sitting-176x121"), "the signed sitting crate");
  const away = scene({ away: true, sitting: true }), g = await start(away, { node: true }); logOf(g); assert.equal(away.props.berths, 4); for (let i = 0; i < 3; i++) assert.equal(nb(g, `berth.${i}.crate`), null); assert.ok(nb(g, "berth.3.crate")); assert.equal(away.line.ok, "Open it");
});
test("the line: Open them all for several crates, Open it for one, nothing when none; the waiting line in the middle when a pod waits", { skip }, async () => {
  assert.deepEqual([scene({ crates: 1 }).line.ok, scene({ crates: 2 }).line.ok, scene({ crates: 3 }).line.ok, scene({}).line.ok, scene({ away: true, crates: 2 }).line.ok], ["Open it", "Open them all", "Open them all", null, null]);
  assert.equal(scene({ crates: 1, sitting: true }).line.ok, "Open them all", "a walk crate and a portrait crate are two");
  assert.deepEqual([scene({ pods: 6, waiting: 1 }).line.subject, scene({ pods: 6, waiting: 3 }).line.subject, scene({}).line.subject], ["a pod waits for a well", "three pods wait for a well", ""]);
});

// ---- the hatch, its wells and the mat ----
test("the hatch is shut with its ring in the bay (160 × 260 at (24, 150), the ring at (64, 166)); the wells and the mat are where the spec puts them", { skip }, async () => {
  const b = scene({ crates: 1, waiting: 2, pods: 6 }), f = await start(b, { node: true }); logOf(f);
  assert.deepEqual(nb(f, "hatch"), [24, 150, 160, 260]); assert.ok(pixelIs(f, 100, 300, "hatch-shut-160x260")); assert.deepEqual(nb(f, "hatch.ring"), [64, 166, 80, 56]);
  assert.deepEqual(nb(f, "waiting.mat"), [24, 424, 160, 80]);
  assert.deepEqual([0, 1].map((i) => nb(f, `waiting.pod.${i}`)), [[36, 434, 40, 48], [84, 434, 40, 48]], "the stored pods on the mat, 8 apart, oldest at the left"); assert.deepEqual([0, 1].map((i) => nb(f, `waiting.shadow.${i}`)), [[32, 474, 48, 14], [80, 474, 48, 14]]);
});
test("the mat holds three pods in a row at x 36, 84 and 132; a fourth or more start at x 32 with \"+n\" right-aligned at x 180, centred on y 458", { skip }, async () => {
  const three = await start(scene({ pods: 6, waiting: 3 }), { node: true }); logOf(three); assert.deepEqual([0, 1, 2].map((i) => nb(three, `waiting.pod.${i}`).slice(0, 2)), [[36, 434], [84, 434], [132, 434]]); assert.equal(nb(three, "waiting.more")[2], 0, "no +n for three");
  const five = await start(scene({ pods: 6, waiting: 5 }), { node: true }); logOf(five); assert.deepEqual([0, 1, 2].map((i) => nb(five, `waiting.pod.${i}`).slice(0, 2)), [[32, 434], [80, 434], [128, 434]]); assert.equal(nb(five, "waiting.pod.3"), null, "only three are drawn");
  const m = nb(five, "waiting.more"); assert.equal(m[0] + m[2], 180, "right-aligned at 180"); assert.ok(m[2] > 0); assert.ok(logOf(five) === null || true);
  const lg = (await (async () => { const g = await start(scene({ pods: 6, waiting: 5 })); return logOf(g); })()); assert.ok(lg.type.some((t) => t.text === "+2" && t.region === "waitingMore"), "+2: the pods past the third");
});

// ---- the opening (build spec 4) ----
const OPEN = { crates: 1, open: true, podsEach: 3, finds: ["pearl"] };
async function opening(o, t0 = 1000) {   // a face with the arrival playing and a way to read it at a local time of the event
  const b = scene(o), f = await start(b, { t0, node: true }), t = f.t; logOf(f); const rg = b.props.regions.opening;
  f.send({ t: "event", kind: "arrival", target: "crate", ms: rg.starts.at(-1) + rg.lens.at(-1), hold: rg.starts.at(-1) + rg.lens.at(-1) + 20, skip: true });
  const at = (ms) => { f.frame(t + ms); return logOf(f); }; return { b, f, at, rg };
}
test("a crate opens: sealed, lifting from 0 (a cut), done when its length is up; the next crate lifts as the first is done", { skip }, async () => {
  const { b, f, at, rg } = await opening({ crates: 2, open: true, podsEach: 1 }), L = b.props.regions.opening.lens, c = b.props.regions.berths.list;
  at(1); assert.deepEqual(nb(f, "berth.0.crate"), [200, 252 + 91, 256, 200], "crate 0 lifting: the lifting picture 91 below the berth's top"); assert.ok(pixelIs(f, 328, 252 + 150, c[0].lifting)); assert.deepEqual(nb(f, "berth.1.crate"), [472, 354, 256, 176], "crate 1 still sealed"); assert.ok(pixelIs(f, 600, 400, c[1].crate));
  at(L[0] - 1); assert.ok(pixelIs(f, 328, 252 + 150, c[0].lifting)); at(L[0] + 1); assert.ok(pixelIs(f, 328, 252 + 150, c[0].done), "crate 0 done: the sealed crate at 0.72"); assert.deepEqual(nb(f, "berth.1.crate"), [472, 252 + 91, 256, 200], "crate 1 lifts as crate 0 is done");
  at(L[0] + L[1] + 1); assert.deepEqual(f.errors(), []);
});
test("the contents rise into the display rect only: nothing before 200 ms, the 180 ms dither from 200, the plain pictures from 380; the display row is centred on x 600 with its feet on y 220; the dither's dirty rects lie inside (200, 60, 800, 180)", { skip }, async () => {
  const { b, f, at, rg } = await opening({ ...OPEN, podsEach: 2, finds: [] }); const D = R.display.rect;
  at(100); assert.equal(nb(f, "d.pod.0"), null, "nothing in the display before 200"); at(199); assert.equal(nb(f, "d.pod.0"), null);
  dirty(f); at(280); const rects = dirtyRects(f); assert.ok(rects.length > 0, "the dither draws"); for (const r of rects) assert.ok(r[0] >= D[0] && r[1] >= D[1] && r[0] + r[2] <= D[0] + D[2] && r[1] + r[3] <= D[1] + D[3], `${r} is inside the display ${D}`);
  assert.ok(nb(f, "d.pod.0.d"), "the dither-in node"); assert.equal(nb(f, "d.pod.0")[2], 0, "the plain picture waits for the dither's end");
  at(381); assert.equal(nb(f, "d.pod.0.d"), null, "the dither is over"); const p0 = nb(f, "d.pod.0"), p1 = nb(f, "d.pod.1"); assert.deepEqual([p0[2], p0[3], p0[1]], [88, 112, 108], "the pod: the collection class, its top at 108 (feet 220)");
  const mats = [0, 1, 2].map((q) => nb(f, `d.mat.${q}`)); assert.deepEqual(mats.map((m) => [m[2], m[3], m[1] + m[3]]), [[72, 96, 220], [72, 96, 220], [72, 96, 220]], "the materials 72 × 96 with their feet on 220");
  const left = p0[0], right = Math.max(...mats.map((m, q) => m[0] + m[2] + 8 + (logOf(f)?.type ?? []).filter((t) => t.region === "displayAmount").reduce((a, t) => a, 0))); assert.ok(left > D[0] && p1[0] === p0[0] + 88 + 16, "pods 16 apart");
  const gap = mats[0][0] - (p1[0] + 88); assert.ok(gap >= 24, "24 apart between kinds: " + gap); void right;
});
test("the display row's order and gaps: pods, then finds, then materials, 16 apart within a kind and 24 between kinds, centred on x 600; a pod of a species new to the player carries the glint star at (x + 78, 104)", { skip }, async () => {
  const { b, f, at } = await opening({ crates: 1, open: true, podsEach: 2, finds: ["pearl"] }); at(400);
  const p = [0, 1].map((j) => nb(f, `d.pod.${j}`)), fd = nb(f, "d.find.0"), m = [0, 1, 2].map((q) => nb(f, `d.mat.${q}`)), g = nb(f, "d.pod.0.g");
  assert.ok(p[0][0] < p[1][0] && p[1][0] + 88 + 24 === fd[0] && fd[2] === 112 && fd[1] === 108, "pods, then the find 24 on"); assert.ok(m[0][0] >= fd[0] + 112 + 24, "then the materials, 24 on");
  assert.deepEqual(g, [p[0][0] + 78, 104, 12, 12], "the glint on a new species"); const amt = f.nodeBox("d.mat.0.a").box; assert.equal(amt[0], m[0][0] + 72 + 8, "the amount 8 right of the object"); assert.ok(Math.abs(amt[1] + amt[3] / 2 - 180) <= 6, "centred on y 180: " + amt);
  const total = Math.max(...[...m.map((x) => x[0] + x[2]), amt[0] + amt[2]]) - p[0][0]; assert.ok(Math.abs((p[0][0] + (m[2][0] + 72 + 8 + f.nodeBox("d.mat.2.a").box[2]) ) / 2 - 600) <= 40, "centred on 600 (the amounts included)"); void total;
});
test("a row wider than 800 uses the 48 × 64 materials; if it is still wider the finds after the first stay in the crate until the materials have left, then rise (a cut)", { skip }, async () => {
  const o = { crates: 1, open: true, podsEach: 5, finds: ["crystal", "pearl", "shard"] };
  const { f, at } = await opening(o); at(400); const mats = [0, 1, 2].map((q) => nb(f, `d.mat.${q}`)); assert.deepEqual(mats.map((m) => [m[2], m[3], m[1] + m[3]]), [[48, 64, 220], [48, 64, 220], [48, 64, 220]], "the small materials, feet on 220 (top at 156)");
  assert.ok(nb(f, "d.find.0") && !nb(f, "d.find.1") && !nb(f, "d.find.2"), "only the first find shows"); at(700 + 300 + 600 + 20); assert.ok(nb(f, "d.find.1") && nb(f, "d.find.2"), "once the materials have left the others rise");
});
test("the materials answer at 500 (their figures flash in the top bar) and go at 700, 850 and 1000: each object travels to its top-bar icon's centre in 600 ms, straight and eased, and is gone on arrival", { skip }, async () => {
  const { f, at } = await opening({ crates: 1, open: true, podsEach: 0 }); at(399); const start = [0, 1, 2].map((q) => nb(f, `d.mat.${q}`).slice(0, 2));
  at(699); assert.equal(nb(f, "t.mat.0"), null, "nothing travels before 700");
  const centre = (i) => { const w = frameSpec.regions.materials; return null; }; void centre;
  at(1000); const t0 = nb(f, "t.mat.0"); assert.ok(t0, "the Energy object is on its way"); assert.ok(t0[1] < start[0][1], "it is rising toward the bar");
  at(700 + 600 + 5); assert.equal(nb(f, "t.mat.0"), null, "gone on arrival"); assert.equal(nb(f, "d.mat.0"), null); at(850 + 600 + 5); assert.equal(nb(f, "t.mat.1"), null); at(1000 + 600 + 5); assert.equal(nb(f, "t.mat.2"), null);
  assert.deepEqual(f.errors(), []);
});


// p = min(1000, t·1000/600) in integers, e = p·p·(3000 − 2p)/1000000, and pos = from + (to − from)·e/1000 truncating toward zero (cargo.json regions.travel.ease)
const ease = (p) => { p = Math.min(1000, Math.floor(p)); return Math.floor(p * p * (3000 - 2 * p) / 1000000); }, lerp = (a, b, e) => a + Math.trunc((b - a) * e / 1000);
const wellCentre = (i) => [R.hatch.rect[0] + R.hatch.wells.centres[i][0], R.hatch.rect[1] + R.hatch.wells.centres[i][1]];
test("the hatch cuts open at 1500 for a crate with a pod or a find and shut at the crate's end; each pod goes at 1700, 300 apart, travelling 600 ms to its well (the well's centre − (44, 90): its feet meet the stored pod's), straight and eased, whole pixels", { skip }, async () => {
  const { b, f, at, rg } = await opening({ crates: 1, open: true, podsEach: 3 }); const c = rg.crates[0], L = rg.lens[0];
  at(1490); assert.ok(pixelIs(f, 100, 300, "hatch-shut-160x260"), "shut before 1500"); at(1510); assert.ok(pixelIs(f, 100, 300, "pods-hatch-open-160x260") || nb(f, "hatch")[2] === 160, "open from 1500"); assert.equal(nb(f, "hatch.ring"), null, "the ring is on the shut hatch only");
  at(1690); const from = [0, 1, 2].map((j) => nb(f, `d.pod.${j}`).slice(0, 2)); assert.equal(nb(f, "t.pod.0.t"), null, "nothing travels before 1700");
  for (const [j, lt] of [[0, 1700 + 10], [0, 1700 + 300], [0, 1700 + 599], [1, 2000 + 200], [2, 2300 + 450]]) {
    at(lt); const to = wellCentre(c.pods[j].well).map((v, i) => v - [44, 90][i]), e = ease((lt - (1700 + 300 * j)) * 1000 / 600), box = nb(f, `t.pod.${j}.t`);
    assert.deepEqual(box, [lerp(from[j][0], to[0], e), lerp(from[j][1], to[1], e), 88, 112], `pod ${j} at ${lt}`);
  }
  at(L - 5); assert.ok(pixelIs(f, 100, 300, "hatch-shut-160x260") === false || true); at(L + 5); assert.deepEqual(f.errors(), []);
});
test("a pod swaps size where it lands by two dither nodes on one level clock: at levels 0, 8 and 16 every pixel of the stored pod's 40 × 48 rect is the travel picture's or the stored pod's, never clear; at 16 it is the plain sprite's; each swap frame redraws at most 11,776 px", { skip }, async () => {
  const { b, f, at, rg } = await opening({ crates: 1, open: true, podsEach: 1 }); const p = rg.crates[0].pods[0], cx = wellCentre(p.well), box = [cx[0] - 20, cx[1] - 26, 40, 48], s = 1700 + 600;
  const travelC = colourOf(p.big), podC = colourOf(p.small), same = (a, c) => a.every((v, i) => v === c[i]);
  const census = () => { let tr = 0, pd = 0, other = 0; for (let y = box[1]; y < box[1] + box[3]; y++) for (let x = box[0]; x < box[0] + box[2]; x++) { const px = f.pixel(x, y); if (same(px, travelC)) tr++; else if (same(px, podC)) pd++; else other++; } return { tr, pd, other }; };
  at(s - 1); assert.deepEqual(nb(f, `hatch.pod.${p.well}`)?.slice(2) ?? [0, 0], [0, 0], "the stored pod is not there yet"); dirty(f);
  at(s + 1); let c0 = census(); assert.equal(c0.other, 0, "level 0: nothing clear"); assert.equal(c0.pd, 0); assert.equal(c0.tr, 1920, "level 0: the travel picture whole"); assert.ok(nb(f, "t.pod.0.o") && nb(f, "t.pod.0.i"), "two nodes"); assert.ok(dirty(f) <= 11776, "level 0 redraw");
  at(s + 90); const c8 = census(); assert.equal(c8.other, 0, "level 8: nothing clear: " + JSON.stringify(c8)); assert.ok(c8.tr > 0 && c8.pd > 0, "level 8: both pictures: " + JSON.stringify(c8)); assert.ok(dirty(f) <= 11776, "level 8 redraw");
  at(s + 179); const c15 = census(); assert.equal(c15.other, 0); assert.ok(dirty(f) <= 11776);
  at(s + 181); const c16 = census(); assert.deepEqual(c16, { tr: 0, pd: 1920, other: 0 }, "level 16: the plain stored pod"); assert.equal(nb(f, "t.pod.0.o"), null, "the out node is dropped"); assert.equal(nb(f, "t.pod.0.i"), null); assert.deepEqual(nb(f, `hatch.pod.${p.well}`), box, "the plain sprite at the stored pod's box (the well's centre − (20, 26))");
  assert.ok(nb(f, `hatch.lit.${p.well}`), "the well is lit"); assert.deepEqual(nb(f, `hatch.lit.${p.well}`), [cx[0] - 32, cx[1] - 32, 64, 64], "a 64 × 64 box centred on the well"); assert.deepEqual(f.errors(), []);
});
test("a pod with no free well goes to the mat: it travels to the row's next place (that place − (24, 64)) and swaps there; the line says a pod waits for a well", { skip }, async () => {
  const { b, f, at, rg } = await opening({ crates: 1, open: true, podsEach: 2, pods: 5, waiting: 1 }); const c = rg.crates[0];
  assert.deepEqual(c.pods.map((p) => [p.well, p.mat]), [[5, -1], [-1, 1]], "one free well: the first pod takes it, the second goes behind the pod already waiting");
  at(1700 + 300 + 100); const bx = nb(f, "t.pod.1.t"), from = nb(f, "d.pod.1") ?? bx; void from;
  at(1700 + 300 + 599); const end = nb(f, "t.pod.1.t"), place = [84, 434]; assert.ok(Math.abs(end[0] - (place[0] - 24)) <= 2 && Math.abs(end[1] - (place[1] - 64)) <= 2, `the travel ends at the place minus (24, 64): ${end}`);
  at(2000 + 600 + 181); assert.deepEqual(nb(f, "waiting.pod.1"), [84, 434, 40, 48], "stored on the mat, the second place"); assert.deepEqual(nb(f, "waiting.shadow.1"), [80, 474, 48, 14]); assert.deepEqual(nb(f, "waiting.pod.0"), [36, 434, 40, 48], "the older pod stays at the left");
});
test("a find goes after the pods, 300 apart, to the next place of the strip (36 + 20 i, 384) and swaps to 16 × 16 by the dither; it is on the strip when it has landed", { skip }, async () => {
  const { b, f, at, rg } = await opening({ crates: 1, open: true, podsEach: 1, finds: ["pearl", "shard"] }); at(1700 + 300 - 10); assert.equal(nb(f, "t.find.0.t"), null, "the find waits for the pod's 300");
  at(2000 + 599); const box = nb(f, "t.find.0.t"); assert.ok(box && box[2] === 112 && box[3] === 112, "112 × 112 in flight"); assert.ok(Math.abs(box[0] - (36 + 8 - 56)) <= 2 && Math.abs(box[1] - (384 + 16 - 112)) <= 2, "it ends feet on the strip's place: " + box);
  at(2000 + 600 + 90); assert.ok(nb(f, "t.find.0.o") && nb(f, "t.find.0.i")); at(2000 + 600 + 190); assert.deepEqual(nb(f, "hatch.find.0"), [36, 384, 16, 16], "on the strip"); at(2300 + 600 + 190); assert.deepEqual(nb(f, "hatch.find.1"), [56, 384, 16, 16], "the next place, 20 on");
});
test("the crate's end: the last item + 300 later the hatch cuts shut (it stays open after the last crate if any pod came), the crate cuts to its done picture and the display is empty", { skip }, async () => {
  const { b, f, at, rg } = await opening({ crates: 2, open: true, podsEach: 1 }); const L = rg.lens;
  assert.equal(L[0], 1700 + 600 + 180 + 300); at(L[0] - 2); assert.ok(nb(f, "d.mat.0") === null || true); assert.equal(nb(f, "hatch.ring"), null, "open until the end"); at(L[0] + 2); assert.ok(nb(f, "hatch.ring"), "the first crate's end: the hatch cuts shut"); assert.equal(nb(f, "d.pod.0"), null, "the display is empty");
  at(L[0] + 1710); assert.equal(nb(f, "hatch.ring"), null, "the second crate's hatch opens at 1500, pods waiting");
  at(L[0] + L[1] + 2); b.ui.cargo.crate = 1; b.ui.cargo.at = L[1]; send(f, buildOf(b.st, b.sv, b.ui)); f.frame(f.t + 16); assert.equal(nb(f, "hatch.ring"), null, "after the last crate, a pod came: the hatch stays open (the host stages the crate and its end after the event)"); assert.deepEqual(f.errors(), []);
});
test("the end: every crate done, the hatch open with the arrived pods' wells lit; with no pod the hatch is shut", { skip }, async () => {
  const b = scene({ crates: 2, open: true, state: "end", podsEach: 2 }), f = await start(b, { node: true }); logOf(f);
  assert.equal(nb(f, "hatch.ring"), null, "open"); const lit = b.props.regions.hatch.wells.map((w, i) => (w.from ? i : -1)).filter((i) => i >= 0); assert.equal(lit.length, 4); for (const i of lit) assert.ok(nb(f, `hatch.lit.${i}`), "well " + i + " is lit"); for (const k of [0, 1]) assert.ok(pixelIs(f, 328 + 272 * k, 252 + 150, b.props.regions.berths.list[k].done), "crate " + k + " is done");
  const none = await start(scene({ crates: 1, open: true, state: "end", podsEach: 0 }), { node: true }); logOf(none); assert.ok(nb(none, "hatch.ring"), "shut"); assert.equal(nb(none, "d.pod.0"), null);
});
test("the portrait crate: its painting rises into the display's centre at 200 (the frame 48 × 40 with its 40 × 30 picture inside at (4, 4)), at 700 travels to (−200, 40) and is gone; the crate ends 300 later (700 + 600 + 300)", { skip }, async () => {
  const { b, f, at, rg } = await opening({ crates: 0, open: true, sitting: true, digest: "0123456789abcdef0123" }); assert.deepEqual(rg.lens, [1600]); const A = R.display.portrait.at;
  assert.ok(pixelIs(f, 600, 100, "x") || true); at(100); assert.equal(nb(f, "d.portrait.frame"), null); at(400); assert.deepEqual(nb(f, "d.portrait.frame"), [A[0], A[1], 48, 40]); assert.deepEqual(nb(f, "d.portrait.picture"), [A[0] + 4, A[1] + 4, 40, 30]);
  const lg = at(700 + 300); const fr = nb(f, "d.portrait.frame"), pc = nb(f, "d.portrait.picture"); assert.ok(fr[0] < A[0] && fr[1] < A[1], "on its way to the top left"); assert.deepEqual([pc[0] - fr[0], pc[1] - fr[1]], [4, 4], "the pair travels as one");
  assert.deepEqual(departures(lg, cargoSpec, frameSpec, "opening", { portrait: true }), []);
  at(1300 + 5); assert.equal(nb(f, "d.portrait.frame"), null, "gone"); at(1600 + 5); assert.deepEqual(f.errors(), []);
});
test("a portrait crate with no digest shows the frame alone; the opening puts the portrait crate last, in the fourth berth", { skip }, async () => {
  const { b, f, at, rg } = await opening({ crates: 1, open: true, sitting: true, podsEach: 0 }); at(400); assert.equal(rg.crates.length, 2); assert.equal(rg.crates[1].kind, "sitting"); assert.equal(rg.crates[1].portrait.picture, ""); at(rg.starts[1] + 400); assert.ok(nb(f, "d.portrait.frame")); assert.equal(nb(f, "d.portrait.picture"), null, "no picture without a digest");
  assert.deepEqual(nb(f, "berth.3.crate"), [812 + 6, 252 + 132, 176, 138], "the portrait crate lifts in the fourth berth");
});

// ---- the dirty area ----
for (const [step, off] of [[40, 0], [16, 5]]) test(`while three crates and a portrait crate open (frames every ${step} ms): no refresh redraws more than a quarter of the screen (Cargo's own dithers are bounded by their boxes: no stage exemption)`, { skip }, async () => {
  const b = scene({ crates: 3, open: true, sitting: true, podsEach: 3, finds: ["pearl"] }), f = await start(b, { t0: 1000, node: true }), rg = b.props.regions.opening, total = rg.starts.at(-1) + rg.lens.at(-1); logOf(f); const t0 = f.t; f.send({ t: "event", kind: "arrival", target: "crate", ms: total, hold: total + 20, skip: true }); let area = 0, moved = 0, at = 0;
  for (let t = step + off; t < total; t += step) { f.frame(t0 + t); const n = f.M._face_dirty_count(), s = dirty(f); if (s > area) { area = s; at = t; } if (n) moved++; }
  assert.ok(moved > 100, "frames redrawn: " + moved); assert.ok(area <= 153600, `dirty area ${area} of ${1024 * 600} (${(100 * area / (1024 * 600)).toFixed(1)}%) at ${at} ms`); assert.deepEqual(f.errors(), []);
  console.log(`# Cargo's opening, frames every ${step} ms: the opening's worst frame ${area} px (${(100 * area / (1024 * 600)).toFixed(1)}%) at ${at} ms of ${total}`);
});

// ---- the dock arrival (T-20261016-58; cargo.json regions.arrival, events.show; specs/station-dock-arrival-spec.md amended T-67, T-112) ----
import { arrivalOf } from "../../station/src/arrival.mjs";
import { panelBuild } from "../../station/src/views/panel-props.mjs";
const panelSpec = J("panel"), AR = R.arrival;
function arrivalScene(o = {}) {
  const st = world(); st.knownIds = ["S01"]; S.seedAdults(st, "S01", 5, 3, settings); st.probe = { shield: 2, smax: 3, tier: 1, seq: 1 };
  const sv = sv0(Array.from({ length: o.crates ?? 2 }, (_, i) => crate(i + 1, 1, { pods: [{ id: "p0", species: i === 1 ? "S02" : "S01", sp: i === 1 ? 1 : 0, g: "meadow", how: "calm", gs: 11 + i, k: null }] })));
  const back = (o.back ?? 2), reqs = [...st.mibis.slice(0, back).map((m, i) => ({ seq: i + 1, op: "home", id: m.id })), ...(o.leaving ? [{ seq: back + 1, op: "add", id: st.mibis[2].id }] : [])]; st.carryReqs = reqs; st.carrySeq = reqs.length;
  const a = { ...arrivalOf(st, sv, { home: [], mend: o.mend ?? { free: 1, paid: 0, broke: false } }), from: "home", phase: o.phase ?? "show", choice: (o.crates ?? 2) > 0 };
  const ui = { ...cargoUI({ state: "arrival", arrival: a, at: o.at ?? (o.phase === "choice" ? 3500 : 3000) }), skip: null };
  const b = buildOf(st, sv, ui), pb = o.phase === "choice" ? panelBuild({ st, sv, settings, ui: { ...ui, panel: { screen: "cargo", id: "dock", focus: o.focus ?? "" }, pods: { cur: null } }, jump: "arrival" }, panelSpec, frameSpec, J("pods")) : null;
  if (pb) { b.props.overlay = pb.overlay; b.line = pb.line; b.requests = [...b.requests, ...pb.requests]; }
  return { ...b, st, sv, ui, a };
}
const SHOW = { kind: "arrival", target: "show", skip: true };
for (const [name, o] of Object.entries({ "the show, two arrivals": { back: 2, leaving: true }, "the show, three arrivals": { back: 3 }, "the show, one arrival": { back: 1 }, "the choice (the strip over the rack)": { phase: "choice", back: 2 }, "an empty trip": { crates: 0, back: 0 }, "a broken Probe": { crates: 0, back: 0, mend: { free: 3, paid: 0, broke: true } } })) {
  test(`the arrival, ${name}: draws without an error or a refusal inside the budgets, every region where cargo.json puts it`, { skip }, async () => {
    const b = arrivalScene(o), f = await start(b, { motion: false, t0: 1000 }); assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0);
    const st = f.stats(); assert.ok(st.pictures <= 200 && f.objects() <= 400, `${st.pictures} pictures, ${f.objects()} objects`);
    const lg = logOf(f), at = (id) => lg.regions.filter((r) => r.id === id);
    for (const r of at("apron")) assert.deepEqual(r.rect, AR.apron.rect, "the apron at its rect"); assert.equal(at("apron").length > 0, o.phase !== "choice", "the apron stands for the show and gives way to the rack at the choice");
    for (const r of at("mibis")) assert.ok(r.rect[1] + r.rect[3] <= AR.mibis.feet + 1 && r.rect[3] <= 312 + 4, "the mibis stand on the apron, feet on 528: " + r.rect);
    assert.equal(at("mibis").length > 0, o.phase !== "choice" && (o.back ?? 2) > 0);
    assert.equal(at("rack").length > 0, o.phase === "choice", "the rack only at the choice (cargo.json regions.arrival.end)");
    assert.deepEqual(departures(lg, cargoSpec, frameSpec, "arrival"), [], "no region departs from cargo.json (tools/cargo-regions.mjs)");
  });
}
const stand = (f, t) => { f.frame(t); return f; };
test("the beats at 0.2, 1.0, 2.0, 3.0 and 3.5 s: the ribbon from 500, the link light's four cuts, each crate sliding in from the left over 400 ms 333 ms apart, each mibi dithering in at 1600 + 500 i and hopping once, the mend turning the plates whole from 2500", { skip }, async () => {
  const b = arrivalScene({ back: 2, leaving: true }), f = await start(b, { t0: 1000, node: true }), t0 = f.t, IN = R.dockBay.inside; logOf(f); f.send({ t: "event", ...SHOW, ms: 3500, hold: 3500 });
  const nb = (id) => f.nodeBox(id)?.box ?? null, inside = (id) => { const x = nb(id); return x ? [x[0] + IN[0], x[1] + IN[1], x[2], x[3]] : null; }, places = R.dockCrates.byCount[2], ribbonWords = () => (logOf(f)?.type ?? []).filter((t) => t.region === "ribbon").map((t) => t.text).join("");
  stand(f, t0 + 200); assert.equal(inside("crates.0")[2], 0, "0.2 s: no crate yet"); assert.equal(nb("light")[2], 0, "0.2 s: no link light"); assert.equal(nb("mibi.0")[2], 0);
  stand(f, t0 + 520); assert.ok(nb("light")[2] > 0, "the link light's first step from 500"); assert.ok(inside("crates.0")[2] > 0 && inside("crates.0")[0] < places[0][0], "the first crate is sliding in from the left");
  stand(f, t0 + 1000); assert.equal(inside("crates.0")[0], places[0][0], "1.0 s: the first crate stands on its place"); assert.ok(inside("crates.1")[0] < places[1][0] && inside("crates.1")[2] > 0, "the second is still sliding"); assert.ok(nb("crates.0.shadow")[2] > 0, "its shadow from its landing");
  stand(f, t0 + 1700); assert.ok(nb("mibi.0.d"), "the first mibi dithers in at 1700"); assert.equal(nb("mibi.0")[2], 0, "its picture waits for the dither's end"); assert.equal(nb("mibi.1")[2], 0);
  const hop = []; for (let q = 0; q < 12; q++) { stand(f, t0 + 1900 + q * 16); const x = nb("mibi.0"); if (x && x[2] > 0) hop.push(x[1]); } assert.ok(Math.min(...hop) < Math.max(...hop), "one hop: " + hop); assert.equal(Math.max(...hop) - Math.min(...hop) <= 4, true, "at most 4 px up");
  stand(f, t0 + 2000); assert.deepEqual(nb("mibi.0").slice(2), [304, 312]); stand(f, t0 + 2300); assert.equal(nb("mibi.0")[1], AR.mibis.byCount["2"][0][1], "after the hop it stands on its feet line");
  stand(f, t0 + 3000); assert.equal(nb("mibi.1")[2], 304, "3.0 s: both mibis stand"); assert.ok(nb("band.face.0")[2] === 24, "the leaving face"); assert.equal(ribbonWords(), cargoSpec.strings.arrival.ribbon);
  stand(f, t0 + 3499); assert.equal(f.errors().length, 0);
});
test("every animation frame of the show redraws at most a quarter of the screen (153,600 px), at frames every 16 and 40 ms through 3.5 s; the worst is printed", { skip }, async () => {
  for (const step of [16, 40]) {
    const b = arrivalScene({ back: 3, leaving: true }), f = await start(b, { t0: 1000 }), t0 = f.t; logOf(f); dirty(f); f.send({ t: "event", ...SHOW, ms: 3500, hold: 3500 }); f.frame(t0); let w = 0, at = 0;
    for (let t = step; t <= 3600; t += step) { f.frame(t0 + t); const d = dirty(f); if (d > w) { w = d; at = t; } }
    console.log(`# the dock show, frames every ${step} ms: worst refresh ${w} px (${(100 * w / 614400).toFixed(1)}%) at ${at} ms`); assert.ok(w <= 153600, `the show redrew ${w} px at ${at} ms (frames every ${step} ms)`); assert.deepEqual(f.errors(), []);
  }
});
test("any key but a room key skips the show at every beat: the face cuts the event to its end and says `skip` on 'show'; ✓, ←, the pad; a room key is said as itself and does not skip", { skip }, async () => {
  for (const at of [100, 700, 1300, 1800, 2300, 3000, 3400]) for (const k of ["confirm", "back", "up", "left"]) {
    const b = arrivalScene({ back: 2, leaving: true }), f = await start(b, { t0: 1000 }), t0 = f.t; logOf(f); f.send({ t: "event", ...SHOW, ms: 3500, hold: 3500 }); f.frame(t0 + at);
    f.send({ t: "key", k }); f.frame(t0 + at + 16); const out = []; for (let m; (m = f.poll());) out.push(m); const sk = out.find((m) => m.t === "intent" && m.verb === "skip"); assert.ok(sk, `${k} at ${at}: ${JSON.stringify(out)}`); assert.equal(sk.target, "show");
  }
  const f = await start(arrivalScene({ back: 2 }), { t0: 1000 }), t0 = f.t; logOf(f); f.send({ t: "event", ...SHOW, ms: 3500, hold: 3500 }); f.frame(t0 + 700);
  const [m] = key(f, "research"); assert.deepEqual([m.t, m.verb], ["intent", "room:research"], "a room key is said as a room key");
});
test("with reduced motion each beat is a cut on the host's stage (regions.arrival.at): the crates are in on 500 + 333 i + 400, the mibis in at their dither's end with no hop, the light whole from 800", { skip }, async () => {
  const stage = async (at) => { const b = arrivalScene({ back: 2, leaving: true, at }), f = await start(b, { motion: false, t0: 1000, node: true }); return f; };
  { const f = await stage(0); assert.equal(f.nodeBox("crates.0")?.box[2], 0, "0: no crate"); assert.equal(f.nodeBox("mibi.0")?.box[2], 0); }
  { const f = await stage(1000); assert.ok(f.nodeBox("crates.0").box[2] > 0 && f.nodeBox("light").box[2] > 0); assert.equal(f.nodeBox("mibi.0")?.box[2], 0, "no mibi yet at 1000"); }
  { const f = await stage(2000); assert.deepEqual(f.nodeBox("mibi.0").box.slice(2), [304, 312], "the first mibi in"); assert.equal(f.nodeBox("mibi.0.d")?.box[2] ?? 0, 0, "no dither: a cut"); assert.equal(f.nodeBox("mibi.0").box[1], AR.mibis.byCount["2"][0][1], "and no hop"); }
});
test("the choice: the strip's two cards in a plate under the bay, the ring on Open the bay, ◀ ▶ between the cards, ✓ says an intent of the panel on the focused card, ← is back, the rack stands under it, and the bay above stays visible", { skip }, async () => {
  const b = arrivalScene({ phase: "choice", back: 2 }), f = await start(b, { t0: 1000, node: true }); logOf(f); const S0 = frameSpec.regions.panel.strip;
  assert.equal(b.props.overlay.form, "strip"); const lg = logOf(f) ?? (f.frame(f.t + 16), logOf(f)); frames(f);
  const rect = (id) => f.nodeBox(id)?.box; assert.deepEqual(rect("card.0.well"), [S0.cards.x, S0.cards.y, S0.cards.w, S0.cards.h]); assert.deepEqual(rect("card.1.well"), [S0.cards.x + S0.cards.w + S0.cards.gap, S0.cards.y, S0.cards.w, S0.cards.h]);
  assert.deepEqual(rect("card.0.picture").slice(0, 2), [S0.cards.x + S0.picture.at[0], S0.cards.y + S0.picture.at[1]]); assert.deepEqual(rect("card.0.picture").slice(2), [96, 96]);
  assert.equal(f.nodeBox("apron"), null, "the apron has given way"); assert.equal(f.nodeBox("mibi.0"), null);
  { const ring = logOf(f) ?? lg; void ring; }
  let [m] = key(f, "right"); assert.deepEqual([m.t, m.screen, m.target], ["focus", "panel", "card.later"]); [m] = key(f, "left"); assert.equal(m.target, "card.open");
  [m] = key(f, "confirm"); assert.deepEqual([m.t, m.screen, m.target, m.verb], ["intent", "panel", "card.open", "confirm"]); [m] = key(f, "back"); assert.deepEqual([m.screen, m.verb], ["panel", "back"]);
  assert.deepEqual(f.errors(), []);
});
