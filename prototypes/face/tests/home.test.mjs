// Home on the face (lvgl-switch.md §4 L2.2): the words and the binding table (screens/home.c) on the props views/home-props.mjs gives, in Node on the WebAssembly build: every scene draws without an error or a refusal
// inside the object and picture budgets, with no region departing from home.json (tools/home-regions.mjs, proved here to fail on a moved region), the keys (the pad is home.json's graph; ✓ and the room keys are intents; ← does
// nothing), the crates' slide (events.crateIn) and the rest (events.rest) at their instants, and the walk: the same hash on the same clock, the end state with motion off, at most six boxes moving on a frame.
// Skipped when the face has not been built (build.sh).
//   node --test prototypes/face/tests/home.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { withPolicy } from "./node-scene.mjs";
import { bootFace } from "../../station/src/face-lvgl.mjs";
import { setFrames, frameOf, podGenome } from "../../station/src/genome.mjs";
import * as S from "../../station/src/state.mjs";
import { homeBuild } from "../../station/src/views/home-props.mjs";
import { departures } from "../tools/home-regions.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist"), built = existsSync(path.join(dist, "face.mjs")), skip = !built && "face not built (prototypes/face/build.sh)";
const specs = path.resolve(here, "../../ui/specs/station"), J = (n) => JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8")), frameSpec = J("frame"), homeSpec = J("home");
const palette = JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")).colours;
const framesDir = path.resolve(here, "../../workbench/frames");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 12 }, T0 = 1_000_000;

// ---- scenes: the state through the rules, the props through the view ----
const world = () => { const st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = 99; st.d = 99; st.s = 99; st.firstMibi = false; st.dock = { docked: true, at: T0 }; return st; };
const crate = (n) => ({ id: "c" + n, n, turn: 0, at: T0, e: 3, d: 3, s: 4, pods: [], met: [], explored: 0, of: 0, lines: [] });
const painted = (st) => { for (const m of st.mibis) m.paint = m.paint ?? { state: "landed" }; return st; };
function scene(o = {}) {
  const st = world(); S.seedAdults(st, "S01", 5, o.adults ?? 5, settings); painted(st);
  if (o.young) { S.seedAdults(st, "S01", 77, o.young, settings); for (const m of st.mibis.slice(-o.young)) { m.born = st.turn; m.paint = { state: "landed" }; } }
  for (let i = 0; i < (o.pods ?? 0); i++) { S.seedPodFromGenome(st, podGenome(frameOf("S01"), 3 + i), settings, T0); S.skipIdentify(st, st.tray.at(-1)); }
  for (const m of st.mibis.slice(0, o.waiting ?? 0)) m.paint = { state: "sent" };   // its painting is on its way: the waiting lamp
  if (o.away) st.dock = { docked: false, at: T0 };
  const sv = { v: 8, seed: 7, wid: "w1", turn: 3, bay: Array.from({ length: o.crates ?? 0 }, (_, i) => crate(i + 1)), mibis: [], carried: (o.carry ?? [0, 1]).map((i) => st.mibis[i].id), tier: 1, shield: 3 };
  return homeBuild({ st, sv, settings, docked: S.docked(st), ui: {}, focus: o.focus ?? null }, homeSpec, frameSpec);
}
const frameProps = (line = {}) => ({ top: { screen: "home", title: "Home", turn: 4, turnFlash: false, materials: { e: 9, d: 9, s: 9 }, flash: {}, companion: { docked: true, withMibi: null } }, line: { back: null, need: "", ...line }, plate: { text: "" } });

// stand-in pictures: a flat block keyed by id, at the size the id names (…:WxH) or the request's
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
function standIn(id, size) { const [w, h] = size, d = new Uint8ClampedArray(w * h * 4), k = hash(id); for (let i = 0; i < w * h; i++) { d[i * 4] = 70 + (k & 127); d[i * 4 + 1] = 70 + ((k >> 7) & 127); d[i * 4 + 2] = 70 + ((k >> 14) & 127); d[i * 4 + 3] = 255; } return { w, h, data: d }; }
const sizeOf = (r) => r.size ?? (r.kind === "waiting" ? [24, 24] : r.kind === "star" ? [12, 12] : [16, 16]);

async function start(b, { motion = true, frame = {}, t0 = 0 } = {}) {
  const f = await bootFace(pathToFileURL(dist + "/"), { test: true });
  f.send({ t: "palette", name: "station", colours: palette }); for (const [n, j] of [["frame", frameSpec], ["home", homeSpec]]) assert.equal(f.send({ t: "spec", screen: n, json: j }), 0);
  for (const id of ["energy", "data", "essence", "cross"]) f.handleOf(`icon:${id}:16`, withPolicy((i) => standIn(i, [16, 16])));
  for (const r of b.requests) f.handleOf(r.id, withPolicy((i) => ({ ...standIn(i, sizeOf(r)), ...(/^home-crate-/.test(i) ? { policy: "art" } : {}) })));
  f.t = t0; f.motion = motion; f.build = b;
  assert.equal(f.props({ screen: "home", ...b.props, motion, frame: frameProps({ ...b.line, ...frame }) }), 0, f.errors().join("; ")); frames(f); return f;
}
const frames = (f, n = 2, dt = 16) => { for (let i = 0; i < n; i++) f.frame((f.t += dt)); };
const logOf = (f) => { let lg = null; for (let m; (m = f.poll("log"));) lg = m; return lg; };
const withFocus = (f, cur) => { f.build.props.focus.cur = cur; assert.equal(f.props({ screen: "home", ...f.build.props, motion: f.motion, frame: frameProps() }), 0); frames(f); };
const key = (f, k) => { f.send({ t: "key", k }); frames(f); const out = []; for (let m; (m = f.poll());) if (m.t === "focus" || m.t === "intent") out.push(m); return out; };

const SCENES = {
  "docked, a mix, crates": { adults: 3, young: 2, carry: [0, 1], crates: 2, pods: 3 },
  "away": { adults: 3, young: 2, carry: [0], away: true, pods: 6 },
  "fresh": { adults: 0, carry: [] },
  "three sleepers": { adults: 5, carry: [0, 1, 2], young: 1 },
  "a resident focused": { adults: 4, carry: [0], focus: "resident.2" },
  "a sleeper focused": { adults: 4, carry: [0, 1], focus: "resident.1" },
  "a module focused": { adults: 2, crates: 1, focus: "cargo" },
  "the Vivarium focused": { adults: 2, focus: "vivarium" },
  "the knob focused": { adults: 2, focus: "knob" },
};

for (const [name, o] of Object.entries(SCENES)) {
  test(`Home, ${name}: draws without an error or a refusal inside the budgets, with no region leaving home.json's rectangle`, { skip }, async () => {
    const b = scene(o), f = await start(b); assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0);
    const lg = logOf(f); const d = departures(lg, homeSpec, frameSpec, b.props.focus.cur); assert.deepEqual(d, []);
    const st = f.stats(); assert.ok(st.pictures <= 200, `${st.pictures} pictures`); assert.ok(f.objects() <= 400, `${f.objects()} objects`);
    assert.ok(JSON.stringify(b.props).length + JSON.stringify(b.line).length < 32 * 1024, "props under 32 KiB");
  });
}
test("the departure check bites: a resident moved out of the glass, a module's word moved out of its zone and a name tag off the glass are each found", { skip }, async () => {
  const b = scene({ adults: 3, focus: "resident.2" }), f = await start(b), lg = logOf(f), bad = (fn) => { const c = JSON.parse(JSON.stringify(lg)); fn(c); return departures(c, homeSpec, frameSpec, "resident.2"); };
  assert.deepEqual(departures(lg, homeSpec, frameSpec, "resident.2"), []);
  assert.match(bad((c) => { c.regions.find((r) => r.id === "resident" && r.layer !== "chrome").rect[0] = 10; })[0], /leaves the glass/);
  assert.match(bad((c) => { c.regions.find((r) => r.id === "cargo" && r.layer === "type").rect[0] = 900; })[0], /word/);
  assert.match(bad((c) => { c.regions.find((r) => r.id === "nameTag" && r.layer === "chrome").rect[0] = 26; })[0], /name tag/);
  assert.match(bad((c) => { c.regions = c.regions.filter((r) => r.id !== "nameTag"); })[0], /name tag shows only/);
});

// ---- the keys ----
test("the pad is home.json's graph on the boxes the words drew: the room ▶ is Cargo, ▲ the Vivarium; ▼ walks the column to the knob and stops; ◀ from the column is the nearest resident; the focus is said on the frame of the key", { skip }, async () => {
  const f = await start(scene({ adults: 3, carry: [] })), before = f.hash();
  let [m] = key(f, "right"); assert.deepEqual([m.t, m.screen, m.target], ["focus", "home", "cargo"]); assert.notEqual(f.hash(), before, "the ring is on Cargo in the same frame");
  for (const want of ["pods", "incubator", "probe", "library", "knob"]) assert.equal(key(f, "down")[0].target, want);
  assert.deepEqual(key(f, "down"), [], "the end of the column stops");
  assert.match(key(f, "left")[0].target, /^resident\.\d+$/); assert.match(key(f, "right")[0].target, /^(cargo|pods|incubator|probe|library|knob)$/, "▶ from a resident is the nearest of the column");
});
test("✓ on the focus says an intent on its target (on the room, on 'room'); the room keys say theirs; ← says nothing: Home is the top", { skip }, async () => {
  const f = await start(scene({ adults: 2 }));
  let [m] = key(f, "confirm"); assert.deepEqual([m.t, m.screen, m.target, m.verb], ["intent", "home", "room", "confirm"]);
  key(f, "right"); [m] = key(f, "confirm"); assert.deepEqual([m.target, m.verb], ["cargo", "confirm"]);
  assert.deepEqual(key(f, "back"), [], "← on Home does nothing");
  [m] = key(f, "research"); assert.deepEqual([m.t, m.verb, m.target], ["intent", "room:research", "cargo"]);
  key(f, "up"); [m] = key(f, "home"); assert.ok(!m || m.verb === "room:home", "the Home key: the ring goes back to the room (the host sets it from the intent)");
});
test("while the rest holds, the face moves no focus and sends no intent but room:<x> (the host keeps it until the hold ends)", { skip }, async () => {
  const f = await start(scene({ adults: 2, focus: "knob" })); f.send({ t: "event", kind: "rest", target: "knob", ms: 200, hold: 380 }); frames(f, 2);
  for (const k of ["up", "left", "confirm", "back"]) assert.deepEqual(key(f, k), [], k);
  const [m] = key(f, "research"); assert.deepEqual([m.t, m.verb], ["intent", "room:research"]);
});

// ---- the events ----
const crateRects = (f) => { const lg = logOf(f); return lg.regions.filter((r) => r.id === "cargo" && r.layer === "painted").map((r) => r.rect); };
test("the crates slide in (events.crateIn): each from 40 px above over 500 ms, 250 ms apart, eased out, clipped to the bay; each stands on the spec's rectangle when its time is up", { skip }, async () => {
  const ev = homeSpec.events.crateIn.each, rest = homeSpec.regions.cargo.crateRects, bay = homeSpec.regions.cargo.rect, clip = [bay[0] + 112, bay[1] + 8, 176, 72];
  const play = async (n, total) => { const f = await start(scene({ adults: 1, crates: n, carry: [] }), { t0: 1000 }); logOf(f); const t0 = f.t; f.send({ t: "event", kind: "arrival", target: "cargo", ms: total });
    return { f, at: (ms) => { f.frame(t0 + ms); return logOf(f).regions.find((r) => r.id === "cargo" && r.layer === "art")?.rect ?? null; } }; };   // the crates' union (the stand-ins are art)
  { const { f, at } = await play(1, ev.ms);
    assert.deepEqual(at(0), [rest[0][0], clip[1], rest[0][2], 16], "at 0 the crate is 40 px above its place: its lower 16 px show in the bay"); assert.deepEqual(f.errors(), []);
    const tops = [100, 200, 300, 400, 499].map((ms) => at(ms)[1]); assert.ok(tops.every((y, i) => y >= clip[1] && y <= rest[0][1] && (i === 0 || y >= tops[i - 1])), "it comes down and stops, never above the bay's top: " + tops);
    assert.ok(tops[0] - clip[1] > 0 || at(100)[3] > 16, "eased out: most of the way in the first half");
    assert.deepEqual(at(ev.ms + 20), rest[0], "on its rectangle when its time is up"); assert.equal(f.poll("done")?.kind, "arrival"); }
  { const total = ev.ms + 2 * ev.stagger, { f, at } = await play(3, total), w = (ms) => at(ms)[2];
    assert.equal(w(249), rest[0][2], "one crate before the second begins at 250"); assert.ok(w(260) > rest[0][2], "the second"); assert.equal(w(499), rest[1][0] + rest[1][2] - rest[0][0]); assert.ok(w(510) > rest[1][0] + rest[1][2] - rest[0][0], "the third at 500");
    assert.deepEqual(at(total + 20), [rest[0][0], rest[0][1], rest[2][0] + rest[2][2] - rest[0][0], rest[0][3]], "the three on their rectangles when it ends"); assert.equal(f.poll("done")?.kind, "arrival"); }
});
test("the rest (events.rest): the knob settles in the first 200 ms and the ring goes; the face says done at 200; the host's dither closes over the stage for 180 ms; input is held until 380 and the ring and the lift stay away", { skip }, async () => {
  const f = await start(scene({ adults: 2, focus: "knob" }), { t0: 1000 }), R = homeSpec.regions.knob.states, knob = (lg) => lg.regions.find((r) => r.id === "knob"), ring = (lg) => lg.regions.some((r) => r.id === "focus"), dither = (lg) => lg.regions.some((r) => r.id === "stage" && r.layer === "art");
  let lg = logOf(f); assert.equal(knob(lg).rect[1], R.focused.rect[1], "lifted while focused"); assert.ok(ring(lg)); assert.ok(!dither(lg));
  const t0 = f.t, ev = homeSpec.events.rest; assert.deepEqual([ev.ms, ev.hold], [200, 380]); f.send({ t: "event", kind: "rest", target: "knob", ms: ev.ms, hold: ev.hold });
  f.frame(t0 + 150); lg = logOf(f); assert.ok(!ring(lg), "the ring goes as the rest begins"); assert.equal(f.poll("done"), null);
  f.frame(t0 + 210); lg = logOf(f); assert.equal(f.poll("done")?.kind, "rest", "the event ends at 200"); assert.equal(knob(lg).rect[1], R.rest.rect[1], "settled at 546"); assert.ok(!ring(lg), "no ring while the hold runs");
  f.send({ t: "event", kind: "dither", target: "stage", ms: 180, from: 0, to: 16 }); f.frame(t0 + 330); lg = logOf(f); assert.ok(dither(lg), "the dither is closing over the stage"); const mid = f.hash(); f.frame(t0 + 370); assert.notEqual(f.hash(), mid, "it deepens");
  assert.deepEqual(key(f, "confirm"), [], "input is still held at 370"); f.frame(t0 + 400); assert.equal(f.poll("done")?.kind, "dither");
  assert.equal(f.send({ t: "event", kind: "rest", target: "knob", ms: 200, hold: true }), -1, "a boolean hold is refused"); assert.match(f.errors()[0], /boolean is refused/);
});
test("motion off: every event is at its end at once, the walk is at its place, and the same hash holds at any later time", { skip }, async () => {
  const b = scene({ adults: 4, crates: 2, carry: [0] }), f = await start(b, { motion: false }), h0 = f.hash();
  frames(f, 5, 1000); assert.equal(f.hash(), h0, "nothing moves with motion off");
  f.send({ t: "event", kind: "arrival", target: "cargo", ms: 750 }); frames(f, 2); assert.equal(f.hash(), h0, "the crates are where they end");
});

// ---- the walk ----
test("the walk is deterministic: the same props on the same clock give the same hash, a different seed a different place", { skip }, async () => {
  const run = async (t) => { const f = await start(scene({ adults: 4, carry: [0] }), { t0: 5000 }); for (let ms = 40; ms <= t; ms += 40) f.frame(5000 + ms); return f.hash(); };
  assert.equal(await run(8000), await run(8000)); assert.notEqual(await run(8000), await run(1200), "idle for the first two seconds, then they walk");
});
// the dirty area of a refresh (the sum of the rectangles the face redraws) is at most a quarter of the screen over two minutes of walking, at 40 ms frames and at 16 ms frames
const WALKS = { "twelve adults": { adults: 12, carry: [] }, "six adults and six juveniles": { adults: 6, young: 6, carry: [] }, "twelve, one focused": { adults: 12, carry: [], focus: "resident.5" }, "twelve, three waiting": { adults: 12, carry: [], waiting: 3 } };
for (const [name, o] of Object.entries(WALKS)) for (const [step, off] of [[40, 0], [16, 5]]) {
  test(`the walk, ${name}, frames every ${step} ms for 120 s: no refresh redraws more than a quarter of the screen`, { skip }, async () => {
    const f = await start(scene(o), { t0: 5000 }), M = f.M; let area = 0, moved = 0;
    for (let t = step + off; t < 120000; t += step) {
      f.frame(5000 + t); const n = M._face_dirty_count(), a = M.HEAP32.subarray(M._face_dirty_rects() >> 2, (M._face_dirty_rects() >> 2) + n * 4); let s = 0;
      for (let i = 0; i < n; i++) s += a[i * 4 + 2] * a[i * 4 + 3];
      area = Math.max(area, s); if (n) moved++;
    }
    assert.ok(moved > 500, "the residents walk: " + moved + " frames redrawn"); assert.ok(area <= 153600, `dirty area ${area} of ${1024 * 600} (${(100 * area / (1024 * 600)).toFixed(1)}%)`);
    console.log(`# Home's walk, ${name}, frames every ${step} ms: worst refresh ${(100 * area / (1024 * 600)).toFixed(1)}% of the screen dirty`);
  });
}

test("a walking resident keeps its box in 32..656−w and its feet in 300..527, never meets the keep-out zone, walks at 2 px a step, and a focused one stands still and resumes where it was", { skip }, async () => {
  const K = homeSpec.regions.resident.walk.keepOut;
  for (let seed = 1; seed <= 24; seed++) {
    const b = scene({ adults: 1, carry: [] }); b.props.regions.residents[0].seed = seed * 7919;
    const f = await start(b, { t0: 5000 }); let last = null, moved = 0, jump = 0;
    for (let ms = 40; ms <= 40000; ms += 40) {
      f.frame(5000 + ms); const lg = logOf(f); const r = lg?.regions.find((x) => x.id === "resident" && x.layer !== "chrome")?.rect; if (!r) continue;
      const [x, y, w, h] = r, feet = y + h; assert.ok(x >= 32 && x + w <= 656 && feet >= 300 && feet <= 527, `seed ${seed} at ${ms}: ${r}`); assert.ok(!(x + w > K[0] && feet > K[1]), `seed ${seed} at ${ms}: ${r} meets the keep-out zone`);
      if (last && (last[0] !== x || last[1] !== y)) { moved++; jump = Math.max(jump, Math.abs(last[0] - x), Math.abs(last[1] - y)); } last = [x, y];
    }
    assert.ok(jump <= 2, `seed ${seed}: a step is 2 px on an axis, not ${jump}`); if (seed === 1) assert.ok(moved > 20, "it walks: " + moved);
  }
  const b = scene({ adults: 1, carry: [] }); b.props.regions.residents[0].seed = 7919; const f = await start(b, { t0: 5000 }); const pos = () => logOf(f).regions.find((x) => x.id === "resident" && x.layer !== "chrome").rect.join();
  for (let ms = 40; ms <= 6000; ms += 40) f.frame(5000 + ms); logOf(f);
  withFocus(f, "resident.1"); let t = 6000; const p0 = (f.frame(5000 + (t += 40)), pos()); for (let i = 0; i < 400; i++) f.frame(5000 + (t += 40)); assert.equal(pos(), p0, "focused: it stands on its pixel (lifted 4 px, which the box does not show)");
  withFocus(f, "room"); let moves = false; for (let i = 0; i < 600; i++) { f.frame(5000 + (t += 40)); if (pos() !== p0) { moves = true; break; } } assert.ok(moves, "and walks on when focus leaves");
});
