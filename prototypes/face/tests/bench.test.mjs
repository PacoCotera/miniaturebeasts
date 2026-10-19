// The Probe bench on the face (lvgl-switch.md §4 P; bench.json): in Node on the WebAssembly test build (dist/node: the box probe face_test_node_box), the scenes' props (the state through the rules, then benchBuild) are drawn without an
// error or a refusal inside the budgets, every region's union and every node at the spec's numbers (tools/bench-regions.mjs, proved here to fail on a moved part), the plates per tier, the armed part 8 px out of its socket, the keys
// (the pad is bench.json's graph, ✓ ← and the room keys are intents; a hold says only a room key), and the three events on a timeline stepping face_frame: the mend at 0, 150 and 300 ms, the switch at 0, 100 and 200, the install at 0,
// 150, 300, 450, 600 and 900, with the dirty area of every frame under the architect's ceilings and the cuts (the install step jumped from 0, the install key frame with motion off, the Dock key away to docked) under theirs.
// Skipped when the test build has not been built (build.sh).
//   node --test prototypes/face/tests/bench.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { withPolicy } from "./node-scene.mjs";
import { bootFace } from "../../station/src/face-lvgl.mjs";
import { setFrames } from "../../station/src/genome.mjs";
import * as S from "../../station/src/state.mjs";
import { benchBuild } from "../../station/src/views/bench-props.mjs";
import { departures, partDepartures } from "../tools/bench-regions.mjs";
import { dirty } from "./dirty.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist/node"), built = existsSync(path.join(dist, "face.mjs")), skip = !built && "face not built (prototypes/face/build.sh)";
const specs = path.resolve(here, "../../ui/specs/station"), J = (n) => JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8")), frameSpec = J("frame"), spec = J("bench"), EV = spec.events;
const palette = JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")).colours;
setFrames(readdirSync(path.resolve(here, "../../workbench/frames")).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.resolve(here, "../../workbench/frames", f), "utf8"))));
const T0 = 1_000_000, settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 12 };

// ---- scenes: the state through the rules, the props through the view ----
function scene({ docked = true, shield = 2, tier = 1, e = 14, d = 6, mendFull = false, f = null, install = false, noProbe = false } = {}) {
  const st = S.freshSt("w1", 3, T0); S.normalize(st); st.firstMibi = false; st.e = e; st.d = d; st.s = 0; st.mendFull = mendFull; st.dock = { docked, at: T0 };
  if (!noProbe) st.probe = { shield, smax: S.TIER[tier].shield, tier, seq: 1 };
  const sv = { v: 8, seed: 7, wid: "w1", turn: 3, bay: [], mibis: [], carried: [], tier: 1, shield: 3 };
  return { ...benchBuild({ st, sv, settings, docked, ui: { f, install } }, spec, frameSpec), st };
}
const SCENES = {
  "docked, tier 1, two plates of three, the ring on the plates, the switch off": { f: "plates" },
  "the ring on the slot, the switch on": { f: "slot", mendFull: true },
  "away, the switch off, the ring on the switch": { docked: false, shield: 3, f: "switch" },
  "the upgrade fitted: four plates, the ring on the slot, the switch on": { tier: 2, shield: 4, f: "slot", mendFull: true },
  "docked, tier 1, every plate whole, the ring on the switch": { shield: 3 },
  "short of ⚡: the dimmed cap on the plates, the slot dim": { e: 0, d: 0, f: "plates" },
  "a fresh world: no Probe, away": { docked: false, noProbe: true },
  "docked, tier 2, the switch off, the ring on the plates": { tier: 2, shield: 3, f: "plates" },
};
const frameProps = (line = {}, over = {}) => ({ top: { screen: "bench", title: "Probe", turn: 4, turnFlash: false, materials: { e: 9, d: 9, s: 9 }, flash: {}, companion: { docked: true, withMibi: null } }, line: { back: "Home", need: "", ...line }, plate: { text: "" }, ...over });
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
function standIn(id, [w, h]) { const dd = new Uint8ClampedArray(w * h * 4), k = hash(id); for (let i = 0; i < w * h; i++) { dd[i * 4] = 70 + (k & 127); dd[i * 4 + 1] = 70 + ((k >> 7) & 127); dd[i * 4 + 2] = 70 + ((k >> 14) & 127); dd[i * 4 + 3] = 255; } return { w, h, data: dd }; }
async function start(b, { motion = true, t0 = 1000, fixedLine = false, over = {} } = {}) {   // fixedLine: the frame's bottom line stays as it was, so a refresh is the bench's own (the architect's ceilings are the bench's objects)
  const f = await bootFace(pathToFileURL(dist + "/"), { test: true });
  f.send({ t: "palette", name: "station", colours: palette }); for (const [n, j] of [["frame", frameSpec], ["bench", spec]]) assert.equal(f.send({ t: "spec", screen: n, json: j }), 0);
  for (const id of ["energy", "data", "essence", "cross"]) f.handleOf(`icon:${id}:16`, withPolicy((i) => standIn(i, [16, 16])));
  for (const id of ["frame-companion-outline-16x24", "home-lamp-hairline-12x12", "home-lamp-sprout-12x12"]) f.handleOf(id, withPolicy((i) => standIn(i, id.includes("outline") ? [16, 24] : [12, 12])));
  f.t = t0; f.motion = motion; f.build = b; f.fixedLine = fixedLine ? b.line : null; give(f, b);
  assert.equal(f.props({ screen: "bench", ...b.props, motion, frame: frameProps(f.fixedLine ?? b.line, over) }), 0, f.errors().join("; ")); frames(f); return f;
}
const give = (f, b) => { for (const r of b.requests) f.handleOf(r.id, withPolicy((i) => standIn(i, r.size ?? [16, 16]))); };
const setProps = (f, b) => { f.build = b; give(f, b); assert.equal(f.props({ screen: "bench", ...b.props, motion: f.motion, frame: frameProps(f.fixedLine ?? b.line) }), 0, f.errors().join("; ")); };
const frames = (f, n = 2, dt = 16) => { for (let i = 0; i < n; i++) f.frame((f.t += dt)); };
const logOf = (f) => { let lg = null; for (let m; (m = f.poll("log"));) lg = m; return lg ?? f.lastLog ?? null; };
const boxOf = (f) => (id) => f.nodeBox(id)?.box ?? null;
const area = (f, o) => dirty(f, o);
const rects = (f) => { const n = f.M._face_dirty_count(), a = f.M.HEAP32.subarray(f.M._face_dirty_rects() >> 2, (f.M._face_dirty_rects() >> 2) + n * 4); const o = []; for (let i = 0; i < n; i++) o.push(Array.from(a.subarray(i * 4, i * 4 + 4))); return o; };
const key = (f, k) => { f.send({ t: "key", k }); frames(f); const out = []; for (let m; (m = f.poll());) { if (m.t === "log") f.lastLog = m; else if (m.t === "done") (f.done ??= []).push(m.kind); else if (m.t === "focus" || m.t === "intent") out.push(m); } return out; };
const play = (f, e) => f.send({ t: "event", ...e });

for (const [name, o] of Object.entries(SCENES)) {
  test(`the bench, ${name}: draws without an error or a refusal inside the budgets, every region and every node at the spec's numbers`, { skip }, async () => {
    const b = scene(o), f = await start(b); assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0); assert.ok(f.nodeBox, "the test build has the box probe");
    const cur = b.props.focus.cur, lg = logOf(f);
    assert.deepEqual(departures(lg, spec, b.props, cur), []); assert.deepEqual(partDepartures(boxOf(f), spec, b.props, cur), []);
    const st = f.stats(); assert.ok(st.pictures <= 200, `${st.pictures} pictures`); assert.ok(f.objects() <= 400, `${f.objects()} objects`); console.log(`# ${name.slice(0, 40)}: ${f.objects()} objects, ${st.pictures} pictures`);
  });
}

test("the plates per tier: tier 1 on 408, 456, 504 and tier 2 on 384, 432, 480, 528 at y 480 (lifted 2 while the ring is on them), the tier's missing place a node of no size, away the four nodes stay with no size; the armed part stands 8 px out of its socket", { skip }, async () => {
  let f = await start(scene({ f: "switch" })); assert.deepEqual([0, 1, 2, 3].map((i) => boxOf(f)(`plates.${i}`)), [[408, 480, 32, 32], [456, 480, 32, 32], [504, 480, 32, 32], [528, 480, 0, 0]]);
  f = await start(scene({ tier: 2, shield: 4, f: "switch" })); assert.deepEqual([0, 1, 2, 3].map((i) => boxOf(f)(`plates.${i}`)), [[384, 480, 32, 32], [432, 480, 32, 32], [480, 480, 32, 32], [528, 480, 32, 32]]);
  f = await start(scene({ f: "plates" })); assert.deepEqual(boxOf(f)("plates.0"), [408, 478, 32, 32], "the ring on the plates lifts them 2 px");
  f = await start(scene({ docked: false, shield: 3, f: "switch" })); assert.deepEqual([0, 1, 2, 3].map((i) => boxOf(f)(`plates.${i}`)), [[384, 480, 0, 0], [432, 480, 0, 0], [480, 480, 0, 0], [528, 480, 0, 0]], "away: the four plate nodes stay, with no size (hidden, not destroyed)"); assert.equal(f.nodeBox("plates.seat"), null);
  const idle = await start(scene({ f: "switch" })), ring = await start(scene({ f: "slot" }));
  assert.equal(boxOf(idle)("slot.part")[1], 272 + 64, "ready: seated; there is no armed state, the part is never lifted before the install (T-20261016-53)"); assert.equal(boxOf(ring)("slot.part")[1], 272 - 2 + 64, "the module lifted 2 with the ring")
});

test("the per-part check fails on a moved part: the plate, the knob, the part and a pod moved one pixel in the spec sent again, each named", { skip }, async () => {
  const MOVES = [["plates.0", (s) => { s.regions.plates.places["1"][0][0] += 1; }], ["switch.knob", (s) => { s.regions.switch.toggle.knob.y += 1; }], ["slot.part", (s) => { s.regions.slot.part.at[0] += 1; }], ["slot.pod.1", (s) => { s.regions.slot.adds.pods.at[1] += 1; }]];
  for (const [id, patch] of MOVES) {
    const b = scene({ f: "switch" }), f = await start(b); assert.deepEqual(partDepartures(boxOf(f), spec, b.props, "switch"), []);
    const moved = JSON.parse(JSON.stringify(spec)); patch(moved); assert.equal(f.send({ t: "spec", screen: "bench", json: moved }), 0);
    const c = f.build.props.focus.cur; f.build.props.focus.cur = "plates"; setProps(f, f.build); frames(f); f.build.props.focus.cur = c; setProps(f, f.build); frames(f);
    const d = partDepartures(boxOf(f), spec, b.props, "switch"); assert.ok(d.some((m) => m.startsWith(id + " ")), `a departure naming ${id}: ${JSON.stringify(d.slice(0, 3))}`);
  }
});

test("keys: ✓ ← and the room keys say their intent on the ring's target; the pad moves the ring by bench.json's graph (▶ from the plates is the slot, ▲ ▼ walk the module, ◀ from a module is the plates); away the plates are not in the graph", { skip }, async () => {
  const f = await start(scene({ f: "plates" }));
  for (const [k, verb] of [["confirm", "confirm"], ["back", "back"], ["home", "room:home"], ["research", "room:research"], ["library", "room:library"], ["habitat", "room:habitat"]]) assert.deepEqual(key(f, k).map((x) => [x.t, x.screen, x.target, x.verb]), [["intent", "bench", "plates", verb]], `key ${k}`);
  assert.deepEqual(key(f, "right").map((x) => [x.t, x.target]), [["focus", "slot"]]); assert.deepEqual(key(f, "up").map((x) => [x.t, x.target]), [["focus", "switch"]]); assert.deepEqual(key(f, "down").map((x) => [x.t, x.target]), [["focus", "slot"]]);
  assert.deepEqual(key(f, "left").map((x) => [x.t, x.target]), [["focus", "plates"]]); assert.deepEqual(key(f, "up"), [], "▲ from the plates stays"); assert.deepEqual(key(f, "dock"), []);
  const g = await start(scene({ docked: false, shield: 3, f: "switch" })); assert.deepEqual(key(g, "left"), [], "away: nothing to the left of the switch"); assert.deepEqual(key(g, "down").map((x) => x.target), ["slot"]);
});

// ---- the events ----
const knobX = (f) => boxOf(f)("switch.knob")[0];
test("the mend: the plate that seats goes gone to whole by a 16-level dither over 300 ms (a node of its own from 0 to 300, gone at the end), the ring stays where it is, the event holds input for 300 ms and says done at its end", { skip }, async () => {
  const before = scene({ f: "plates" }), f = await start(before, { fixedLine: true }), t0 = f.t, ring0 = boxOf(f)("focus"), after = scene({ shield: 3, f: "plates" }); play(f, { kind: "mend", target: "plates", ms: EV.mend.ms, hold: EV.mend.hold, from: 2, to: 3 }); setProps(f, after);   // the host's order: the event, then the props that carry its end state
  f.frame(t0 + 20); assert.deepEqual(boxOf(f)("plates.seat"), [504, 478, 32, 32], "the seating plate, over its place (lifted with the ring)");
  f.frame(t0 + 170); assert.deepEqual(boxOf(f)("plates.seat"), [504, 478, 32, 32]); assert.deepEqual(boxOf(f)("plates.0"), [408, 478, 32, 32]); assert.deepEqual(boxOf(f)("focus"), ring0, "through the hold the ring stays where it is, with its lift");
  assert.deepEqual(key(f, "confirm"), [], "held: ✓ says nothing"); assert.deepEqual(key(f, "left"), [], "held: the pad moves nothing"); assert.deepEqual(key(f, "library").map((x) => x.verb), ["room:library"], "held: a room key is said");
  f.f = f.frame(t0 + 330); frames(f, 1, 16); assert.equal(f.nodeBox("plates.seat"), null, "at 300 the dither is over"); assert.deepEqual(f.errors(), []);
  for (let m; (m = f.poll());) if (m.t === "done") (f.done ??= []).push(m.kind); assert.ok(f.done.includes("mend"), "the face says done when the mend ends");
  assert.deepEqual(departures(logOf(f), spec, after.props, "plates"), [], "the end state is the props'");
});
test("the switch: the knob slides from x 16 to 56 over 200 ms in whole pixels (and back), over the track it started on; the plates of the meaning picture and the lamp change at the end; no hold", { skip }, async () => {
  const off = scene({ f: "switch", mendFull: false }), f = await start(off, { fixedLine: true }), t0 = f.t, on = scene({ f: "switch", mendFull: true }); play(f, { kind: "switch", target: "switch", ms: EV.switch.ms, hold: 0, from: 0, to: 1 }); setProps(f, on);
  const colour = (id) => Array.from(standIn(id, [1, 1]).data.slice(0, 3)), at = (px, py, id, what) => assert.deepEqual(f.pixel(px, py), colour(id), what), TG = spec.regions.switch.toggle, MN = spec.regions.switch.meaning;
  const x = []; for (const dt of [20, 100, 180]) { f.frame(t0 + dt + 16); x.push(knobX(f) - 624); if (dt === 100) { at(644, 170, TG.track.off, "mid-slide: the track is still the off one"); at(832, 170, MN.plates.gone, "mid-slide: the third meaning plate still gone (the off state)"); at(914, 112, "home-lamp-hairline-12x12", "mid-slide: the lamp still off"); } } assert.ok(x[0] > 16 && x[0] < x[1] && x[1] < x[2] && x[2] < 56 && x.every(Number.isInteger), `the knob slides in whole pixels: ${x}`);
  assert.deepEqual(key(f, "confirm").map((m) => m.verb), ["confirm"], "a switch holds nothing: ✓ is said at once");
  f.frame(t0 + 260); frames(f, 1); assert.equal(knobX(f), 624 + 56, "at 200 the knob is at x 56"); at(644, 170, TG.track.on, "at 200 the track is the on one"); at(832, 170, MN.plates.whole, "at 200 the third plate is whole"); at(914, 112, "home-lamp-sprout-12x12", "at 200 the lamp is on"); assert.deepEqual(departures(logOf(f), spec, on.props, "switch"), []);
  // and back
  const back = scene({ f: "switch", mendFull: false }); const t1 = f.t; play(f, { kind: "switch", target: "switch", ms: EV.switch.ms, hold: 0, from: 1, to: 0 }); setProps(f, back);
  f.frame(t1 + 100); const mid = knobX(f) - 624; assert.ok(mid < 56 && mid > 16, `back: the knob is ${mid}`); f.frame(t1 + 260); frames(f, 1); assert.equal(knobX(f), 624 + 16);
});
test("the install: 0 to 300 the armed part drops 8 px (y 56 to 64 in the module) and the cradle, the plates and the picture count are tier 1; at 300 they cut to tier 2 (plates on 384, 432, 480 and the fourth gone at 528, the count 4); 300 to 600 the fourth plate seats; 600 to 900 the adds dither; held 900 ms", { skip }, async () => {
  const armed = scene({ f: "slot", mendFull: true, shield: 2, install: true }), f = await start(armed, { fixedLine: true }), t0 = f.t, ring0 = boxOf(f)("focus"), fitted = scene({ f: "slot", tier: 2, shield: 4, mendFull: true, install: true }); play(f, { kind: "install", target: "slot", ms: EV.install.ms, hold: EV.install.hold, from: 2, to: 4 }); setProps(f, fitted);
  const nb = (id) => boxOf(f)(id), partY = () => nb("slot.part")[1] - (272 - 2);   // the module lifted 2: the part's y in the module
  f.frame(t0 + 20); assert.equal(partY(), 56, "0: the part still at the armed height (a whole pixel of the first frame)"); assert.deepEqual([0, 1, 2, 3].map((i) => nb(`plates.${i}`)?.slice(0, 1)[0]), [408, 456, 504, 528], "0: tier-1 places"); assert.equal(nb("plates.3")[2], 0, "0: the fourth place has no size");
  f.frame(t0 + 170); assert.deepEqual(boxOf(f)("focus"), ring0, "through the hold the ring stays where it is"); const mid = partY(); assert.ok(mid > 56 && mid < 64 && Number.isInteger(mid), `150: the part drops in whole pixels: ${mid}`); assert.equal(nb("switch.plate.3")[2], 0, "the picture count is still 3");
  f.frame(t0 + 316); assert.equal(partY(), 64, "300: seated"); assert.deepEqual([0, 1, 2, 3].map((i) => nb(`plates.${i}`)[0]), [384, 432, 480, 528], "300: tier-2 places"); assert.equal(nb("switch.plate.3")[2], 16, "the picture count cuts to 4"); assert.ok(nb("plates.seat"), "the fourth plate seats");
  f.frame(t0 + 466); assert.ok(nb("plates.seat"), "450: still seating"); f.frame(t0 + 616); assert.equal(f.nodeBox("plates.seat"), null, "600: seated"); assert.ok(f.nodeBox("slot.pod.2.dither") && f.nodeBox("slot.reach.dither") && f.nodeBox("slot.deep.dither") && f.nodeBox("slot.plate.3.dither"), "600 to 900: the adds dither from their -new slices");
  assert.deepEqual(key(f, "confirm"), [], "held"); assert.deepEqual(key(f, "home").map((x) => x.verb), ["room:home"]);
  f.frame(t0 + 920); frames(f, 1); assert.equal(f.nodeBox("slot.pod.2.dither"), null, "900: settled"); assert.deepEqual(f.errors(), []); assert.deepEqual(departures(logOf(f), spec, fitted.props, "slot"), []);
});

// ---- the dirty area ----
const worst = (f, t0, from, until, step = 16) => { let w = 0; for (let t = from; t < until; t += step) { f.frame(t0 + t); w = Math.max(w, area(f)); } return w; };
test("no refresh of the events redraws more than the architect's ceilings: mend ≤ 8,192; switch end ≤ 7,568; install 0 to 300 ≤ 23,552, 300 to 600 ≤ 8,192, 600 to 900 ≤ 10,112", { skip }, async () => {
  { const f = await start(scene({ shield: 1, f: "plates" }), { fixedLine: true }); const t1 = f.t; play(f, { kind: "mend", target: "plates", ms: 300, hold: 300, from: 1, to: 2 }); setProps(f, scene({ shield: 2, f: "plates" }));
    let w = 0; for (let t = 16; t < 300; t += 16) { f.frame(t1 + t); const a = area(f); w = Math.max(w, a); } assert.ok(w <= 8192, `mend: dirty ${w}`); console.log(`# the mend: worst refresh ${w} px`); }
  { const f = await start(scene({ f: "switch" }), { fixedLine: true }); const t1 = f.t; play(f, { kind: "switch", target: "switch", ms: 200, hold: 0, from: 0, to: 1 }); setProps(f, scene({ f: "switch", mendFull: true }));
    const w = worst(f, t1, 16, 190), end = (() => { f.frame(t1 + 208); return area(f); })(); assert.ok(end <= 7568, `switch end: dirty ${end}`); console.log(`# the switch: worst slide frame ${w} px, the end ${end} px`); }
  { const f = await start(scene({ f: "slot", mendFull: true, install: true }), { fixedLine: true }); const t1 = f.t; play(f, { kind: "install", target: "slot", ms: 900, hold: 900, from: 2, to: 4 }); setProps(f, scene({ f: "slot", tier: 2, shield: 4, mendFull: true, install: true }));
    let a = 0; for (let t = 16; t < 300; t += 16) { f.frame(t1 + t); const q = area(f); a = Math.max(a, q); } f.frame(t1 + 304); const b = worst(f, t1, 320, 600), c = worst(f, t1, 616, 916); assert.ok(a <= 23552, `install 0 to 300: ${a}`); assert.ok(b <= 8192, `install 300 to 600: ${b}`); assert.ok(c <= 10112, `install 600 to 900: ${c}`); console.log(`# the install: 0-300 ${a} px · 300-600 ${b} px · 600-900 ${c} px`); }
});
test("the cuts: the install step at t = 300 jumped from 0 ≤ 173,056 px; the install key frame with motion off ≤ 191,040 px; the Dock key on the bench away to docked, the key frame printed and ≤ 221,264 px", { skip }, async () => {
  { const f = await start(scene({ f: "slot", mendFull: true, install: true }), { fixedLine: true }); const t1 = f.t; play(f, { kind: "install", target: "slot", ms: 900, hold: 900, from: 2, to: 4 }); setProps(f, scene({ f: "slot", tier: 2, shield: 4, mendFull: true, install: true }));
    f.frame(t1 + 316); const a = area(f); assert.ok(a <= 173056, `install at 300 from 0: ${a}`); console.log(`# the install step at 300 jumped from 0: ${a} px`); }
  // the key frames with the real frame: the after-props come with their own bottom line, and the Dock key with the companion docked and its message on the plate
  { const topAt = (e, d) => ({ top: { ...frameProps().top, materials: { e, d, s: 0 } } });   // the install spends ⚡ 12 ◆ 4: the counters on the top bar change with the line, as they do on the page
    const f = await start(scene({ f: "slot", mendFull: true, e: 14, d: 6 }), { motion: false, over: topAt(14, 6) }), after = scene({ f: "slot", tier: 2, shield: 4, mendFull: true, e: 2, d: 2 });
    f.build = after; give(f, after); assert.equal(f.props({ screen: "bench", ...after.props, motion: false, frame: frameProps(after.line, topAt(2, 2)) }), 0, f.errors().join("; ")); f.frame((f.t += 16));
    const a = area(f), n = f.M._face_dirty_count(); assert.equal(f.invOverflows(), 0, "no overflow of LVGL's invalid areas"); assert.ok(n <= f.invCap(), `${n} flushes outside the cap`); assert.ok(a <= 191040, `install key frame, motion off, its own line and counters: ${a}`); console.log(`# the install key frame (motion off, the line and ⚡ 14→2 ◆ 6→2): ${a} px (${(100 * a / 614400).toFixed(1)}%) in ${n} flushes, ${f.invOverflows()} overflows`); }
  { const lifted = scene({ docked: false, shield: 3, f: "switch" }), f = await start(lifted, { over: { top: { ...frameProps().top, companion: { docked: false, withMibi: null } } } }), sv0 = { v: 8, seed: 7, wid: "w1", turn: 3, bay: [], mibis: [], carried: [], tier: 1, shield: 3 };
    const r = S.dockKey(lifted.st, sv0, settings, T0 + 5); assert.ok(r.ok, "the Dock key docks"); const after = benchBuild({ st: lifted.st, sv: sv0, settings, docked: true, ui: { f: "switch", install: false } }, spec, frameSpec);
    f.build = after; give(f, after); play(f, { kind: "plate", target: "msg", ms: 4000 });
    assert.equal(f.props({ screen: "bench", ...after.props, motion: true, frame: frameProps(after.line, { plate: { text: r.msg, timed: true } }) }), 0, f.errors().join("; ")); f.frame((f.t += 16));
    const a = area(f); assert.ok(a <= 221264, `Dock, away to docked: ${a}`); console.log(`# the Dock key on the bench, away to docked (the real frame, the plate "${r.msg.slice(0, 24)}"): ${a} px (${(100 * a / 614400).toFixed(1)}%) in ${rects(f).length} rects: ${JSON.stringify(rects(f))}`); }
});
test("the short case: the dimmed cap on the plates draws without an error and the ring is where it was", { skip }, async () => {
  const b = scene({ e: 0, d: 0, f: "plates" }); assert.equal(b.line.dim, true); const f = await start(b); assert.deepEqual(f.errors(), []); assert.deepEqual(departures(logOf(f), spec, b.props, "plates"), []);
});

// fix 14, rule 6 (the Probe's ring stays through its holds): the armed twin of the slot's ring is retired with the arm (T-20261016-53)

test("the plates' ring is the drawn plates' union grown by 5, lifted: (403, 473, 138, 42) at three plates and (379, 473, 186, 42) at four (spec §5, fix 5's places)", { skip }, async () => {
  const ring = async (o) => logOf(await start(scene(o))).regions.find((q) => q.id === "focus" && q.layer === "chrome").rect;
  assert.deepEqual(await ring({ f: "plates" }), [403, 473, 138, 42]); assert.deepEqual(await ring({ tier: 2, shield: 4, f: "plates" }), [379, 473, 186, 42]);
});
