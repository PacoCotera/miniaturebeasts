// Cargo on the face (lvgl-switch.md §4 L2.2): the words and the binding table (screens/cargo.c) on the props views/cargo-props.mjs gives, in Node on the WebAssembly build: every state draws without an error or a refusal inside the
// object and picture budgets with no region departing from cargo.json (tools/cargo-regions.mjs, proved here to fail on a moved region), the keys (the bay's ✓ ← and room keys, the report's any key, the pad nothing in the bay),
// the crates' slide (events.crateIn), one crate opening at the instants of its steps (events.opening.crate: the lid, the ribbon, each pod travelling to its well, landing), the same steps as cuts with reduced motion, the report
// card's height rule, and the dirty area of a refresh while three crates open. Skipped when the face has not been built (build.sh).
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

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist"), built = existsSync(path.join(dist, "face.mjs")), skip = !built && "face not built (prototypes/face/build.sh)";
const specs = path.resolve(here, "../../ui/specs/station"), J = (n) => JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8")), frameSpec = J("frame"), cargoSpec = J("cargo"), homeSpec = J("home");
const palette = JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")).colours;
const framesDir = path.resolve(here, "../../workbench/frames");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 12 }, T0 = 1_000_000, R = cargoSpec.regions, EV = cargoSpec.events, SHADOW = R.report.shadow ?? [2, 3];

// ---- scenes: the state through the rules, the props through the view ----
const world = () => { const st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = 99; st.d = 99; st.s = 99; st.firstMibi = false; st.dock = { docked: true, at: T0 }; return st; };
const crate = (n, pods = 2, extra = {}) => ({ id: "c" + n, n, turn: n * 2, at: T0, e: 3, d: 3, s: 4, met: [], explored: 5 * n, of: 20, lines: [], pods: Array.from({ length: pods }, (_, j) => ({ id: "p" + j, species: "S01", sp: speciesIndex("S01"), g: "meadow", how: "calm", gs: 11 + 7 * n + j, k: null })), ...extra });
const sv0 = (bay = []) => ({ v: 8, seed: 7, wid: "w1", turn: 0, bay, mibis: [], carried: [], tier: 1, shield: 3 });
const cargoUI = (over = {}) => ({ cargo: { state: "bay", crate: 0, at: 0, mend: null, run: null, shown: null, ...over }, meet: null });
const buildOf = (st, sv, ui) => cargoBuild({ st, sv, settings, docked: S.docked(st), ui }, cargoSpec, homeSpec, frameSpec);
// the opening through the real intent on a recording host; `upTo` ms of its timers are run (the report shows at the end)
function openedUI(st, sv, { motion = true, mend = null } = {}) {
  const ui = { screen: "cargo", home: { f: "room" }, ...cargoUI({ mend }) }, h = { st, sv, settings, ui, specs: { cargo: cargoSpec, home: homeSpec, frame: frameSpec }, played: [], timers: [], say() {}, goto() {}, play(e) { this.played.push(e); }, at(ms, fn) { this.timers.push({ ms, fn }); }, now: () => T0, motion: () => motion, save() {} };
  INTENTS.cargo.intent(h, "room", "confirm"); return h;
}
const runTimers = (h, upTo = Infinity) => { for (const t of h.timers.filter((t) => t.ms <= upTo).sort((a, b) => a.ms - b.ms)) t.fn(); };
function scene(o = {}) {
  const st = world(); for (let i = 0; i < (o.pods ?? 0); i++) { S.seedPodFromGenome(st, podGenome(frameOf("S01"), 3 + i), settings, T0); if (o.identified) S.skipIdentify(st, st.tray.at(-1)); }
  if (o.away) st.dock = { docked: false, at: T0 }; for (let i = 0; i < (o.waiting ?? 0); i++) st.waiting.push({ id: "w" + i, species: "S01", sp: 0, g: "meadow", how: "calm", gs: 3 + i, idd: 0, read: [] });
  const sv = sv0(Array.from({ length: o.crates ?? 0 }, (_, i) => crate(i + 1, o.podsEach ?? 2, i === (o.crates ?? 0) - 1 ? { lines: o.lines ?? [] } : {})));
  if (!o.open) return { ...buildOf(st, sv, cargoUI()), st, sv, ui: cargoUI() };
  const h = openedUI(st, sv, { motion: o.motion ?? true, mend: o.mend ?? null }); if (o.state === "report") runTimers(h);
  return { ...buildOf(st, sv, h.ui), st, sv, ui: h.ui, h };
}
const frameProps = (line = {}) => ({ top: { screen: "cargo", title: "Cargo", turn: 4, turnFlash: false, materials: { e: 9, d: 9, s: 9 }, flash: {}, companion: { docked: true, withMibi: null } }, line: { back: null, need: "", ...line }, plate: { text: "", timed: true } });

// stand-in pictures: a flat block keyed by id, at the size the id names or the request's; the colour is the id's, so a picture is told by one pixel
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const colourOf = (id) => { const k = hash(id); return [70 + (k & 127), 70 + ((k >> 7) & 127), 70 + ((k >> 14) & 127)]; };
function standIn(id, size) { const [w, h] = size, d = new Uint8ClampedArray(w * h * 4), [r, g, b] = colourOf(id); for (let i = 0; i < w * h; i++) { d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = 255; } return { w, h, data: d }; }
const sizeOf = (r) => r.size ?? (r.kind === "waiting" ? [24, 24] : r.kind === "star" ? [12, 12] : [16, 16]);
const ART = /^(crate-|cargo-)/;   // a placeholder plate is art until its master

async function start(b, { motion = true, t0 = 0 } = {}) {
  const f = await bootFace(pathToFileURL(dist + "/"), { test: true });
  f.send({ t: "palette", name: "station", colours: palette }); for (const [n, j] of [["frame", frameSpec], ["cargo", cargoSpec]]) assert.equal(f.send({ t: "spec", screen: n, json: j }), 0);
  for (const id of ["energy", "data", "essence", "cross"]) f.handleOf(`icon:${id}:16`, withPolicy((i) => standIn(i, [16, 16])));
  for (const r of b.requests) f.handleOf(r.id, withPolicy((i) => ({ ...standIn(i, sizeOf(r)), ...(ART.test(i) ? { policy: "art" } : {}) })));
  f.t = t0; f.motion = motion; f.build = b;
  assert.equal(f.props({ screen: "cargo", ...b.props, motion, frame: frameProps(b.line) }), 0, f.errors().join("; ")); frames(f); return f;
}
const frames = (f, n = 2, dt = 16) => { for (let i = 0; i < n; i++) f.frame((f.t += dt)); };
const logOf = (f) => { let lg = null; for (let m; (m = f.poll("log"));) lg = m; return lg; };
const key = (f, k) => { f.send({ t: "key", k }); frames(f); const out = []; for (let m; (m = f.poll());) if (m.t === "focus" || m.t === "intent") out.push(m); return out; };
const region = (lg, id, layer) => lg.regions.find((r) => r.id === id && (!layer || r.layer === layer)) ?? null;
const pixelIs = (f, x, y, id) => { const got = f.pixel(x, y), want = colourOf(id); return got.every((v, i) => v === want[i]); };

const SCENES = {
  "bay, one crate": { crates: 1 }, "bay, two crates": { crates: 2, pods: 1 }, "bay, three crates": { crates: 3 }, "bay, empty": { pods: 2 }, "bay, shut (away)": { away: true, crates: 1 }, "bay, pods waiting": { pods: 6, waiting: 2 },
  "opening, the first crate": { crates: 1, open: true, podsEach: 3 }, "report, one crate": { crates: 1, open: true, state: "report" },
  "report, the full card": { crates: 3, podsEach: 3, open: true, state: "report", mend: { free: 0, paid: 2, broke: false }, lines: ["The mist burned off", "A pond filled", "The wood stirred"] },
};
for (const [name, o] of Object.entries(SCENES)) {
  test(`Cargo, ${name}: draws without an error or a refusal inside the budgets, with no region leaving cargo.json's rectangle`, { skip }, async () => {
    const b = scene(o), f = await start(b); assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0);
    const lg = logOf(f); assert.deepEqual(departures(lg, cargoSpec, frameSpec, b.props.state), []);
    const st = f.stats(); assert.ok(st.pictures <= 200, `${st.pictures} pictures`); assert.ok(f.objects() <= 400, `${f.objects()} objects`);
    assert.ok(JSON.stringify(b.props).length + JSON.stringify(b.line).length < 32 * 1024, "props under 32 KiB");
  });
}
test("the departure check bites: a crate off its place, the rack moved, a ribbon off its rectangle and a pod leaving the travel rectangle are each found", { skip }, async () => {
  const b = scene({ crates: 2 }), f = await start(b), lg = logOf(f), bad = (fn, state = "bay") => { const c = JSON.parse(JSON.stringify(lg)); fn(c); return departures(c, cargoSpec, frameSpec, state); };
  assert.deepEqual(departures(lg, cargoSpec, frameSpec, "bay"), []);
  assert.match(bad((c) => { c.regions.find((r) => r.id === "crates" && r.layer !== "chrome").rect[0] = 8; })[0], /leave the bay's inside/);
  assert.match(bad((c) => { c.regions.find((r) => r.id === "rack" && r.layer === "chrome").rect[1] = 380; })[0], /rack's panel/);
  assert.match(bad((c) => { c.regions.push({ id: "ribbon", layer: "chrome", rect: [208, 56, 600, 40] }); })[0], /ribbon/);
  assert.match(bad((c) => { c.regions.push({ id: "travel", layer: "art", rect: [100, 104, 88, 112] }); }, "opening").join("; "), /travel rectangle/);
  assert.match(bad((c) => { c.regions.push({ id: "report", layer: "chrome", rect: [232, 72, 562, 131] }); })[0], /report card shows only in the report/);
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
test("the report: any key says an intent, the pad as 'pad' (the host closes the card and does what the key does)", { skip }, async () => {
  const f = await start(scene({ crates: 1, open: true, state: "report" }));
  for (const [k, verb] of [["confirm", "confirm"], ["back", "back"], ["up", "pad"], ["left", "pad"], ["research", "room:research"], ["habitat", "room:habitat"]]) { const [m] = key(f, k); assert.deepEqual([m.target, m.verb], ["room", verb], k); }
});
test("while the crates open (events.opening holds crates × 3000 + 200): the face sends no intent but room:<x>, and the pad, ✓ and ← do nothing; after the hold they act", { skip }, async () => {
  const b = scene({ crates: 2, open: true, podsEach: 1 }), f = await start(b, { t0: 1000 }); f.send({ t: "event", kind: "arrival", target: "crate", ms: 6180, hold: 6200 }); frames(f, 2);
  for (const k of ["up", "left", "confirm", "back"]) assert.deepEqual(key(f, k), [], k);
  const [m] = key(f, "research"); assert.deepEqual([m.t, m.verb], ["intent", "room:research"]);
  f.t += 6000; f.frame(f.t); assert.deepEqual(key(f, "confirm"), [], "still held at 6 s"); f.t += 300; f.frame(f.t); assert.deepEqual(key(f, "back").map((x) => x.verb), ["back"], "free after the hold");
});

// ---- the crates slide in on the Dock (events.crateIn) ----
test("the crates slide in (events.crateIn): each from 64 px above over 500 ms, 250 ms apart, eased out, clipped to the bay's inside; each stands on its place when its time is up", { skip }, async () => {
  const ev = EV.crateIn.each, inside = R.bay.inside, places = R.crates.places, total = ev.ms + 2 * ev.stagger;
  const f = await start(scene({ crates: 3 }), { t0: 1000 }); logOf(f); const t0 = f.t; f.send({ t: "event", kind: "arrival", target: "crates", ms: total, hold: 0 });
  const crates = (ms) => { f.frame(t0 + ms); const lg = logOf(f); return lg.regions.find((r) => r.id === "crates" && r.layer !== "chrome")?.rect ?? null; };
  assert.deepEqual(crates(0), [places[0][0], places[0][1] + EV.crateIn.each.from[1], places[0][2], places[0][3]], "at 0 the first crate is 64 px above its place (the top of the inside), the others not yet in");
  const top = (ms) => crates(ms)?.[1]; const t = [30, 60, 120, 180, 240].map(top);
  assert.ok(t.every((y, i) => y >= inside[1] && y <= places[0][1] && (i === 0 || y >= t[i - 1])), "it comes down and never above the bay's top: " + t); assert.ok(places[0][1] - t[4] < (places[0][1] - inside[1]) / 2, "eased out: more than half the way down at 240 ms, just under half the time");
  assert.deepEqual(crates(ev.ms - 1)?.slice(0, 1), [places[0][0]]); assert.deepEqual(crates(ev.ms + ev.stagger * 2 + 20), [places[0][0], places[0][1], places[2][0] + places[2][2] - places[0][0], places[0][3]], "the three stand on their places when it ends");
  assert.equal(f.poll("done")?.kind, "arrival"); assert.deepEqual(f.errors(), []);
});

// ---- one crate opening, at the instants of its steps ----
const OPEN = { crates: 1, open: true, podsEach: 3, lines: ["The mist burned off"] };
async function opening(o, lts) {   // a face with the arrival playing and a way to read it at a local time `lt` of crate k
  const b = scene(o), f = await start(b, { t0: 1000 }), n = b.props.regions.opening.crates.length, t0 = f.t; logOf(f);
  f.send({ t: "event", kind: "arrival", target: "crate", ms: n * 3000 + 180, hold: n * 3000 + 200 });
  const at = (ms) => { f.frame(t0 + ms); return logOf(f); }; return { b, f, at, n, t0 };
}
// p = min(1000, t·1000/600) in integers, e = p·p·(3000 − 2p)/1000000, and pos = from + (to − from)·e/1000 truncating toward zero (cargo.json regions.travel.ease)
const ease = (p) => { p = Math.min(1000, Math.floor(p)); return Math.floor(p * p * (3000 - 2 * p) / 1000000); }, lerp = (a, b, e) => a + Math.trunc((b - a) * e / 1000);
test("one crate opening (events.opening.crate): sealed at 0, the tag torn at 200 and open at 500, the ribbon from 500, its pods in their places once it is open", { skip }, async () => {
  const { b, f, at } = await opening(OPEN), c = b.props.regions.opening.crates[0], cx = 332, cy = 120;   // a point of the crate not under a pod
  let lg = at(100); assert.ok(pixelIs(f, cx, cy, c.sealed), "sealed at 100"); assert.equal(region(lg, "ribbon"), null, "no ribbon before 500"); assert.equal(region(lg, "crate", "art")?.rect.join(), R.crate.rect.join(), "only the crate closer, no pod yet");
  lg = at(300); assert.ok(pixelIs(f, cx, cy, c.opening), "the tag torn, the lid lifting, at 300");
  lg = at(520); assert.ok(pixelIs(f, cx, cy, c.open), "open at 500"); assert.deepEqual(region(lg, "ribbon", "chrome").rect, R.ribbon.rect, "the ribbon shows from 500"); assert.equal(region(lg, "ribbon", "type").rect.length, 4);
  const place = (j, m) => R.crate.pods.places[m][j]; for (const j of [0, 1, 2]) assert.ok(pixelIs(f, place(j, 3)[0] + 44, place(j, 3)[1] + 56, c.pods[j].picture), `pod ${j} stands at ${place(j, 3)}`);
  assert.deepEqual(f.errors(), []);
});
test("each pod travels from its place in the crate to its well's pod place (a well + (4, 8)): 600 ms from 1200 and 150 ms apart, eased in and out, whole pixels; it is in its well after, and nothing travels before its start", { skip }, async () => {
  const { b, f, at } = await opening(OPEN), c = b.props.regions.opening.crates[0], A = EV.opening.crate[4], start = (j) => A.at + j * A.each, well = (w) => [R.rack.wells.rects[w][0] + R.rack.pod.at[0], R.rack.wells.rects[w][1] + R.rack.pod.at[1]];
  assert.equal(region(at(1190), "travel"), null, "nothing travels before 1200");
  for (const [j, lt] of [[0, 1200 + 10], [0, 1200 + 100], [0, 1200 + 149], [2, 1500 + 450 + 1], [2, 1500 + 599]]) {   // only one pod is on its way at each of these instants
    const lg = at(lt), from = R.crate.pods.places[3][j], to = well(c.pods[j].well), e = ease((lt - start(j)) * 1000 / A.ms), want = [lerp(from[0], to[0], e), lerp(from[1], to[1], e), 88, 112];
    assert.deepEqual(lg.regions.find((r) => r.id === "travel" && r.layer !== "chrome").rect, want, `pod ${j} at ${lt}`);
  }
  { const u = at(1510).regions.find((r) => r.id === "travel" && r.layer !== "chrome").rect; assert.ok(u[2] > 88 || u[3] > 112, "at 1510 two are on their way, 150 ms apart: the union is more than one pod"); }
  let lg = at(1200 + 2 * 150 + 600 + 20); assert.equal(region(lg, "travel"), null, "all landed"); for (const j of [0, 1, 2]) { const p = well(c.pods[j].well); assert.ok(pixelIs(f, p[0] + 44, p[1] + 56, c.pods[j].picture), `pod ${j} is in well ${c.pods[j].well}`); }
  assert.deepEqual(f.errors(), []);
});
test("a pod's path is straight and eased: the pod's top-left at 25%, 50% and 75% of its time lies on the line from its place to its well, nearer the end after the middle than before", { skip }, async () => {
  const { b, f, at } = await opening({ crates: 1, open: true, podsEach: 1 }), c = b.props.regions.opening.crates[0], A = EV.opening.crate[4], well = R.rack.wells.rects[c.pods[0].well], to = [well[0] + 4, well[1] + 8], from = R.crate.pods.places[1][0];
  const pos = (lt) => { const lg = at(lt), r = lg.regions.find((x) => x.id === "travel" && x.layer !== "chrome"); return r.rect.slice(0, 2); };
  const p = [0.25, 0.5, 0.75].map((q) => pos(A.at + Math.round(q * A.ms)));
  for (const [i, q] of [0.25, 0.5, 0.75].entries()) { const e = ease(q * 1000), want = [lerp(from[0], to[0], e), lerp(from[1], to[1], e)]; assert.deepEqual(p[i], want, `at ${q}`); }
  assert.ok(p[0][1] - from[1] < (to[1] - from[1]) * 0.25, "eased in: less than a quarter of the way at a quarter of the time"); assert.deepEqual(p[1], [lerp(from[0], to[0], 500), lerp(from[1], to[1], 500)], "half way at half the time");
});
test("a crate of more than three pods shows three places; each later pod rises in the middle place as the one before it sets out", { skip }, async () => {
  const { b, f, at } = await opening({ crates: 1, open: true, podsEach: 5 }), c = b.props.regions.opening.crates[0], A = EV.opening.crate[4], mid = R.crate.pods.places[3][1];
  let lg = at(A.at - 10); const inCrate = (lg) => lg.regions.filter((r) => r.id === "crate" && r.layer !== "chrome").length;
  assert.ok(pixelIs(f, R.crate.pods.places[3][0][0] + 44, R.crate.pods.places[3][0][1] + 56, c.pods[0].picture)); assert.ok(pixelIs(f, mid[0] + 44, mid[1] + 56, c.pods[1].picture), "three stand in the crate before any sets out");
  at(A.at + 2 * A.each + 10); assert.ok(f.pixel(mid[0] + 44, mid[1] + 56).every((v, i) => v === colourOf(c.pods[3].picture)[i]), "pod 3 stands in the middle place once pod 2 has set out"); assert.deepEqual(f.errors(), []);
});
test("a pod with no free well stays where it stands and no later pod appears after it (developer crates): with two free wells, pod 2 stays on the right and pods 3 and 4 never appear in the middle", { skip }, async () => {
  const st = world(); for (let i = 0; i < 4; i++) S.seedPodFromGenome(st, podGenome(frameOf("S01"), 30 + i), settings, T0);
  const sv = sv0([crate(1, 5)]), h = openedUI(st, sv), b = buildOf(st, sv, h.ui), f = await start(b, { t0: 1000 }), t0 = f.t, c = b.props.regions.opening.crates[0], pl = R.crate.pods.places[3]; logOf(f);
  assert.deepEqual(c.pods.map((p) => p.well), [4, 5, -1, -1, -1]); f.send({ t: "event", kind: "arrival", target: "crate", ms: 3180, hold: 3200 });
  f.frame(t0 + 1100); for (const j of [0, 1, 2]) assert.ok(pixelIs(f, pl[j][0] + 44, pl[j][1] + 56, c.pods[j].picture), `pod ${j} stands in its place`);
  f.frame(t0 + 2700); assert.ok(pixelIs(f, pl[2][0] + 44, pl[2][1] + 56, c.pods[2].picture), "pod 2 has no free well: it stays on the right"); assert.ok(!pixelIs(f, pl[1][0] + 44, pl[1][1] + 56, c.pods[3].picture), "pod 3 never appears in the middle"); assert.equal(region(logOf(f), "travel"), null);
  assert.deepEqual(f.errors(), []);
});
test("the second crate begins at 3000: the first crate's pods are in their wells, the second is sealed again, its ribbon shows from 500; the hold ends at crates × 3000 + 200", { skip }, async () => {
  const { b, f, at } = await opening({ crates: 2, open: true, podsEach: 2 }), cs = b.props.regions.opening.crates;
  let lg = at(2990); assert.equal(region(lg, "ribbon", "chrome") !== null, true, "the first crate's ribbon at 2990");
  lg = at(3100); assert.ok(pixelIs(f, 512, 232, cs[1].sealed), "the second crate sealed at 3100"); assert.equal(region(lg, "ribbon"), null, "no ribbon until its 500"); assert.equal(f.poll("done"), null);
  lg = at(3000 + 700); assert.ok(pixelIs(f, 332, 120, cs[1].open)); assert.equal(region(lg, "ribbon", "chrome") !== null, true);
  for (const w of b.props.regions.rack.wells.filter((w) => w.from?.crate === 0)) assert.ok(w.pod, "the first crate's pods are in the rack props");
  const mine = b.props.regions.rack.wells.map((w, i) => [w, i]).filter(([w]) => w.from?.crate === 0); for (const [w, i] of mine) { const p = [R.rack.wells.rects[i][0] + 4, R.rack.wells.rects[i][1] + 8]; assert.ok(pixelIs(f, p[0] + 44, p[1] + 56, w.pod), `crate 0's pod stands in well ${i} during crate 1`); }
  at(6180 + 20); assert.equal(f.poll("done")?.kind, "arrival", "the face says done at its end (informative)");
});
test("a pod with no free well stays in the crate: it is never drawn travelling, and every well in the rack is occupied by another pod", { skip }, async () => {
  const st = world(); for (let i = 0; i < 6; i++) S.seedPodFromGenome(st, podGenome(frameOf("S01"), 30 + i), settings, T0);
  const sv = sv0([crate(1, 2)]), h = openedUI(st, sv), b = { ...buildOf(st, sv, h.ui) }, f = await start(b, { t0: 1000 }), t0 = f.t; logOf(f);
  f.send({ t: "event", kind: "arrival", target: "crate", ms: 3180, hold: 3200 }); f.frame(t0 + 1500); assert.equal(region(logOf(f), "travel"), null, "nothing travels: the rack is full"); assert.deepEqual(b.props.regions.opening.crates[0].pods.map((p) => p.well), [-1, -1]);
  f.frame(t0 + 2800); assert.ok(f.pixel(R.crate.pods.places[2][0][0] + 44, R.crate.pods.places[2][0][1] + 56).every((v, i) => v === colourOf(b.props.regions.opening.crates[0].pods[0].picture)[i]), "the pod is still in the crate");
});

// ---- reduced motion: every step a cut at its time, staged by the host's props ----
test("reduced motion: the arrival is at its end at once, so the host stages the steps in the props: sealed at 0, the tag torn at 200, open and the ribbon at 500, each pod in its well from its start, nothing in between", { skip }, async () => {
  const b0 = scene({ ...OPEN, motion: false }), f = await start(b0, { motion: false }), cs = b0.props.regions.opening.crates[0];
  f.send({ t: "event", kind: "arrival", target: "crate", ms: 3180, hold: 3200 }); frames(f, 2); assert.equal(f.poll("done")?.kind, "arrival", "the event ends at once");
  const stage = (at) => { b0.props.regions.opening.at = at; assert.equal(f.props({ screen: "cargo", ...b0.props, motion: false, frame: frameProps(b0.line) }), 0); frames(f); return logOf(f); };
  let lg = stage(0); assert.ok(pixelIs(f, 332, 120, cs.sealed)); assert.equal(region(lg, "ribbon"), null);
  const placeCx = (j) => R.crate.pods.places[3][j][0] + 44, placeCy = (j) => R.crate.pods.places[3][j][1] + 56;
  stage(199); assert.ok(pixelIs(f, 332, 120, cs.sealed), "sealed until 200"); assert.ok(!pixelIs(f, placeCx(0), placeCy(0), cs.pods[0].picture), "no pod yet");
  lg = stage(200); assert.ok(pixelIs(f, 332, 120, cs.open), "open at 200: the opening slice is skipped"); for (const j of [0, 1, 2]) assert.ok(pixelIs(f, placeCx(j), placeCy(j), cs.pods[j].picture), `pod ${j} stands in its place at 200`); assert.equal(region(lg, "ribbon"), null, "the ribbon waits for 500");
  lg = stage(500); assert.ok(pixelIs(f, 332, 120, cs.open)); assert.notEqual(region(lg, "ribbon", "chrome"), null);
  lg = stage(800); assert.equal(region(lg, "travel"), null, "no pod ever travels with reduced motion");
  const well = (w) => [R.rack.wells.rects[w][0] + 4 + 44, R.rack.wells.rects[w][1] + 8 + 56];
  stage(1199); assert.ok(!pixelIs(f, ...well(cs.pods[0].well), cs.pods[0].picture), "before its step the pod is in the crate"); lg = stage(1200); assert.ok(pixelIs(f, ...well(cs.pods[0].well), cs.pods[0].picture), "from its step the pod stands in its well"); assert.equal(region(lg, "travel"), null);
  assert.ok(!pixelIs(f, ...well(cs.pods[1].well), cs.pods[1].picture), "the second is still in the crate until 1350"); stage(1350); assert.ok(pixelIs(f, ...well(cs.pods[1].well), cs.pods[1].picture)); assert.deepEqual(f.errors(), []);
});

// ---- the report card's height rule ----
test("the report card is 104 + 24 × (crates + Probe row) + (world lines ? 40 + 24 × lines : 0) tall at (232, 72), 560 wide, at most 312: the rule at every combination, its bottom 16 px above the rack at the fullest", { skip }, async () => {
  for (const [crates, mend, lines] of [[1, null, 0], [1, { free: 0, paid: 1, broke: false }, 0], [2, null, 1], [2, { free: 1, paid: 0, broke: false }, 2], [3, null, 3], [3, { free: 0, paid: 2, broke: false }, 3]]) {
    const b = scene({ crates, open: true, state: "report", mend, lines: ["a", "b", "c"].slice(0, lines), podsEach: 2 }), f = await start(b), lg = logOf(f), card = region(lg, "report", "chrome");
    const h = 104 + 24 * (crates + (mend ? 1 : 0)) + (lines ? 40 + 24 * lines : 0);
    assert.deepEqual(card.rect, [232, 72, 560 + SHADOW[0], h + SHADOW[1]], `${crates} crates, ${mend ? "a Probe row" : "no Probe row"}, ${lines} lines`); assert.ok(card.rect[1] + h <= 384, "its bottom is at 384 at most");
    assert.deepEqual(departures(lg, cargoSpec, frameSpec, "report"), []);
  }
});
test("the report card rows sit on the spec's y: the crates' pod icons at 128, 152, 176 (+ 4), Gathered's icons at 208, the Probe's plates at 232, the world's bullets at 296, 320, 344 (+ 10)", { skip }, async () => {
  const b = scene({ crates: 3, open: true, state: "report", mend: { free: 0, paid: 2, broke: false }, lines: ["a", "b", "c"], podsEach: 2 }), f = await start(b), lg = logOf(f), I = R.report.rows.iconAt, B = R.report.world.bullet;
  assert.deepEqual(region(lg, "report.pods").rect, [232 + 152, 128 + I, 2 * 20 - 4, 24 * 2 + 16], "two pod icons a row on a 20 px pitch from x 384, three rows from y 128 on a 24 px pitch");
  assert.deepEqual(region(lg, "report.gathered", "art").rect.slice(1, 2), [208 + I], "Gathered at 208"); assert.equal(region(lg, "report.gathered", "art").rect[3], 16);
  assert.deepEqual(region(lg, "report.probe", "art").rect.slice(0, 2), [232 + 152, 232 + I], "the Probe's plates (and the ⚡ of its words) at 232");
  assert.deepEqual(region(lg, "report.world", "chrome").rect, [232 + B[0], 296 + B[1], B[2], 24 * 2 + B[3]], "three bullets from y 296 on a 24 px pitch");
  for (const id of ["report.heading", "report.crate", "report.gathered", "report.probe", "report.world"]) assert.ok(region(lg, id, "type"), id + " has its words");
});

// ---- the dirty area ----
for (const [step, off] of [[40, 0], [16, 5]]) test(`while three crates open (9180 ms, frames every ${step} ms): no refresh redraws more than a quarter of the screen, outside the dither the host plays at each crate's start and at the end`, { skip }, async () => {
  const b = scene({ crates: 3, open: true, podsEach: 3 }), f = await start(b, { t0: 1000 }), M = f.M; logOf(f); const t0 = f.t; f.send({ t: "event", kind: "arrival", target: "crate", ms: 9180, hold: 9200 }); let area = 0, moved = 0;
  for (let t = step + off; t < 9180; t += step) {
    f.frame(t0 + t); const n = M._face_dirty_count(), a = M.HEAP32.subarray(M._face_dirty_rects() >> 2, (M._face_dirty_rects() >> 2) + n * 4); let s = 0;
    for (let i = 0; i < n; i++) s += a[i * 4 + 2] * a[i * 4 + 3]; area = Math.max(area, s); if (n) moved++;
  }
  assert.ok(moved > 30, "the pods travel: " + moved + " frames redrawn"); assert.ok(area <= 153600, `dirty area ${area} of ${1024 * 600} (${(100 * area / (1024 * 600)).toFixed(1)}%)`);
  console.log(`# Cargo's opening, frames every ${step} ms: worst refresh ${(100 * area / (1024 * 600)).toFixed(1)}% of the screen dirty`);
});
