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
import { dirty } from "./dirty.mjs";

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
  if (o.bud) st.bud = { kind: "founder", species: "S01", sp: 0, gs: 5, genome: st.mibis[0].genome, sha: "bud", code: "BUD", start: Date.now() - o.bud * 60000, minutes: 20, firstEver: false, parents: null, from: { n: 0, g: "meadow", how: "ground", podId: null }, read: [], shaped: [], early: false };
  const sv = { v: 8, seed: 7, wid: "w1", turn: 3, bay: Array.from({ length: o.crates ?? 0 }, (_, i) => crate(i + 1)), mibis: [], carried: (o.carry ?? [0, 1]).map((i) => st.mibis[i].id), tier: 1, shield: 3 };
  return homeBuild({ st, sv, settings, docked: S.docked(st), ui: {}, focus: o.focus ?? null, light: o.light ?? "day" }, homeSpec, frameSpec);
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
  for (const r of b.requests) f.handleOf(r.id, withPolicy((i) => standIn(i, sizeOf(r))));
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
  const play = async (n, total) => {
    const f = await start(scene({ adults: 1, crates: n, carry: [] }), { t0: 1000 }); logOf(f); const t0 = f.t; f.send({ t: "event", kind: "arrival", target: "cargo", ms: total });
    const id = f.build.requests.find((r) => /^home-crate-/.test(r.id)).id, s = standIn(id, sizeOf({ size: homeSpec.regions.cargo.crate })), ink = [s.data[0], s.data[1], s.data[2]];
    // a crate's visible span in its column (the crate rect's centre x): [top, height] of the stand-in's colour inside the bay's clip, or null when it has not slid in; read under the production policy (the crate is a painted master)
    const span = (i) => { const x = rest[i][0] + rest[i][2] / 2; let top = -1, bot = -1; for (let y = clip[1]; y < clip[1] + clip[3]; y++) { const p = f.pixel(x, y); if (p[0] === ink[0] && p[1] === ink[1] && p[2] === ink[2]) { if (top < 0) top = y; bot = y; } } return top < 0 ? null : [top, bot - top + 1]; };
    return { f, at: (ms, i = 0) => { f.frame(t0 + ms); logOf(f); return span(i); } };
  };
  { const { f, at } = await play(1, ev.ms);
    assert.deepEqual(at(0), [clip[1], 16], "at 0 the crate is 40 px above its place: its lower 16 px show in the bay"); assert.deepEqual(f.errors(), []);
    const tops = [100, 200, 300, 400, 499].map((ms) => { const [t, h] = at(ms); return t + h - rest[0][3]; });
    assert.ok(tops.every((y, i) => y >= clip[1] - 40 && y <= rest[0][1] && (i === 0 || y >= tops[i - 1])), "it comes down and stops, never above the bay's top: " + tops);
    assert.ok(tops[0] - (clip[1] - 40) > 20, "eased out: more than half way down in the first fifth");
    assert.deepEqual(at(ev.ms + 20), [rest[0][1], rest[0][3]], "on its rectangle when its time is up"); assert.equal(f.poll("done")?.kind, "arrival"); }
  { const total = ev.ms + 2 * ev.stagger, { f, at } = await play(3, total);
    assert.equal(at(249, 1), null, "one crate before the second begins at 250"); assert.notEqual(at(260, 1), null, "the second"); assert.equal(at(499, 2), null); assert.notEqual(at(510, 2), null, "the third at 500");
    const end = [0, 1, 2].map((i) => at(total + 20, i)); assert.deepEqual(end, rest.slice(0, 3).map((r) => [r[1], r[3]]), "the three on their rectangles when it ends"); assert.equal(f.poll("done")?.kind, "arrival"); }
});
test("the rest (events.rest): the knob settles in the first 200 ms and the ring goes; the face says done at 200; the host's dither closes over the stage for 180 ms; input is held until 380 and the ring and the lift stay away", { skip }, async () => {
  const f = await start(scene({ adults: 2, focus: "knob" }), { t0: 1000 }), R = homeSpec.regions.knob.states, knob = (lg) => lg.regions.find((r) => r.id === "knob"), ring = (lg) => lg.regions.some((r) => r.id === "focus"), dither = (lg) => lg.regions.some((r) => r.id === "stage" && r.layer === "art");
  let lg = logOf(f); assert.equal(knob(lg).rect[1], R.focused.rect[1], "lifted while focused"); assert.ok(ring(lg)); assert.ok(!dither(lg));
  const t0 = f.t, ev = homeSpec.events.rest; assert.deepEqual([ev.ms, ev.hold], [200, 380]); f.send({ t: "event", kind: "rest", target: "knob", ms: ev.ms, hold: ev.hold });
  f.frame(t0 + 150); lg = logOf(f); assert.ok(!ring(lg), "the ring goes as the rest begins"); assert.equal(f.poll("done"), null);
  f.frame(t0 + 210); lg = logOf(f); assert.equal(f.poll("done")?.kind, "rest", "the event ends at 200"); assert.equal(knob(lg).rect[1], R.rest.rect[1], "settled at 546"); assert.ok(!ring(lg), "no ring while the hold runs");
  f.send({ t: "event", kind: "dither", target: "stage", ms: 180, from: 0, to: 16 }); f.frame(t0 + 330); lg = logOf(f); assert.ok(dither(lg), "the dither is closing over the stage"); const mid = f.hash(); f.frame(t0 + 370); assert.notEqual(f.hash(), mid, "it deepens");
  assert.deepEqual(key(f, "confirm"), [], "input is still held at 370"); f.frame(t0 + 400); assert.equal(f.poll("done")?.kind, "dither");
  assert.equal(f.send({ t: "event", kind: "rest", target: "knob", ms: 200, hold: true }), -1, "a boolean hold is refused"); assert.match(f.errors()[0], /hold is a whole number of ms/);
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
// one group tick a frame at most: a late frame steps the next group only, and the time past that tick is dropped by moving the walk's origin later in whole ticks
test("a late frame steps one group, and the walk after it is the walk, later", { skip }, async () => {
  const run = async (L) => {
    const f = await start(scene({ adults: 12, carry: [] }), { t0: 5000 }); for (let t = 40; t <= 4000; t += 40) f.frame(5000 + t);   // the walk is under way (they idle for the first two seconds)
    f.frame(5000 + 4000 + L); const steps = f.M._face_test_steps(), a = dirty(f); for (let i = 1; i <= 50; i++) f.frame(5000 + 4000 + L + 40 * i);
    return { steps, a, hash: f.hash() };
  };
  const base = await run(40);
  for (const L of [80, 120, 1000]) { const r = await run(L); assert.ok(r.steps <= 6, `a frame ${L} ms late stepped ${r.steps} residents`); assert.ok(r.a <= 153600, `a frame ${L} ms late redrew ${r.a} px`); assert.equal(r.hash, base.hash, `${L} ms late: fifty frames on, the walk is the walk (one tick a frame), later`); console.log(`# Home's late frame (${L} ms): ${r.steps} steps, ${r.a} px`); }
});
// the top bar live on a late frame: the counters change and flash on the frame that is late, which is the worst case for the number of areas LVGL lists
test("a late walk frame with the top bar live (counters and their flashes changing) stays inside 153,600 px and LVGL's invalid-area buffer", { skip }, async () => {
  const f = await start(scene({ adults: 12, carry: [] }), { t0: 5000 }), M = f.M, base = f.build; let worst = 0, areas = 0, k = 0;
  const MAT = [{ e: 14, d: 16, s: 10 }, { e: 2, d: 6, s: 9 }], top = (m) => ({ ...frameProps().top, materials: m, flash: { e: true, d: true, s: true } });
  for (let t = 21; t < 30000; t += 16, k++) {   // the brief's cadence: 16 ms frames, every 63rd 120 ms late, 30 s
    const late = k % 63 === 62; if (late) { t += 120; assert.equal(f.props({ screen: "home", ...base.props, motion: true, frame: { ...frameProps(base.line), top: top(MAT[(k / 63 | 0) % 2]) } }), 0, f.errors().join("; ")); }
    f.frame(5000 + t); const s = dirty(f), n = M._face_dirty_count(); assert.ok(s <= 153600, `${late ? "late " : ""}frame at ${t}: ${s} px`); assert.ok(n <= M._face_inv_cap(), `${n} flushes outside the cap`);
    if (late && s > worst) { worst = s; areas = n; }
  }
  assert.equal(f.invOverflows(), 0, "no overflow of LVGL's invalid areas"); console.log(`# Home's late frame with the top bar live: worst ${worst} px in ${areas} flushes, ${f.invOverflows()} overflows`);
});
// the dirty area of a refresh (the sum of the rectangles the face redraws) is at most a quarter of the screen over two minutes of walking, at 40 ms frames and at 16 ms frames
const WALKS = { "twelve adults": { adults: 12, carry: [] }, "six adults and six juveniles": { adults: 6, young: 6, carry: [] }, "twelve, one focused": { adults: 12, carry: [], focus: "resident.5" }, "twelve, three waiting": { adults: 12, carry: [], waiting: 3 }, "twelve, one focused, seeds whose feet cross": { adults: 12, carry: [], focus: "resident.5", seeds: [40096, 38822, 31967, 8729, 50383, 36459, 27280, 21938, 4359, 48741, 64056, 12788] } };
for (const [name, o] of Object.entries(WALKS)) for (const [step, off, late = 0] of [[40, 0], [16, 5], [16, 5, 120]]) {
  test(`the walk, ${name}, frames every ${step} ms${late ? ` (every 63rd ${late} ms late)` : ""} for 120 s: no refresh redraws more than a quarter of the screen, and no more than six residents step in one`, { skip }, async () => {
    const b = scene(o); (o.seeds ?? []).forEach((sd, i) => { b.props.regions.residents[i].seed = sd; });
    const f = await start(b, { t0: 5000 }), M = f.M; let area = 0, moved = 0, steps = 0, lateArea = 0, ordinary = 0;
    for (let t = step + off, k = 0; t < 120000; t += step, k++) {
      const isLate = late && k % 63 === 62; if (isLate) t += late;   // a frame that comes `late` ms after the one before it, the clock going on from there
      f.frame(5000 + t); const n = M._face_dirty_count(), s = dirty(f), st = M._face_test_steps();
      area = Math.max(area, s); if (n) moved++; steps = Math.max(steps, st); if (isLate) lateArea = Math.max(lateArea, s); else ordinary = Math.max(ordinary, s);
      assert.ok(st <= 6, `${st} residents stepped in the frame at ${t}${isLate ? " (late)" : ""}`);
    }
    assert.ok(steps <= 6, `${steps} residents stepped in one frame`); assert.ok(moved > 500, "the residents walk: " + moved + " frames redrawn"); assert.ok(area <= 153600, `dirty area ${area} of ${1024 * 600} (${(100 * area / (1024 * 600)).toFixed(1)}%)`);
    console.log(`# Home's walk, ${name}, frames every ${step} ms: worst refresh ${area} px (${(100 * area / (1024 * 600)).toFixed(1)}% of the screen) dirty, worst ${steps} steps`);
    if (late) console.log(`# Home's walk, ${name}: the worst late frame ${lateArea} px, the worst ordinary one ${ordinary} px`);
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

// a light change (the developer's, or the hour) is a cut, like a screen change: the glass, the bed and the residents' sprites take the next light on one refresh, under its own ceiling (the glass 640 × 488), not the 153,600 of an animation
test("a light change is a cut: Home redraws the whole of its glass at most (312,320 px), every pair of lights", { skip }, async () => {
  const LIGHTS = ["dawn", "day", "dusk", "night"];
  for (const from of LIGHTS) for (const to of LIGHTS) if (from !== to) {
    const f = await start(scene({ adults: 4, young: 2, carry: [0, 1], light: from }), { motion: false, t0: 1000 }), b = scene({ adults: 4, young: 2, carry: [0, 1], light: to });
    for (const r of b.requests) f.handleOf(r.id, withPolicy((i) => standIn(i, sizeOf(r))));
    assert.equal(f.props({ screen: "home", ...b.props, motion: false, frame: frameProps(b.line) }), 0, f.errors().join("; ")); f.frame((f.t += 16));
    const a = dirty(f); assert.ok(a <= 312320, `${from} to ${to}: dirty ${a}`); assert.deepEqual(f.errors(), []);
  }
});

// ---- Station M1 §3: Home's glass with moving sets (moving-scene.mjs: stand-in atlases synthesized at the slot sizes) ----
import { movingScene, bootScene, runFrames, rule2Run } from "./moving-scene.mjs";
for (const cadence of [[16, 0, 0], [16, 5, 120]]) {
  test(`MOVING (M1 §3): Home's glass with twelve moving residents and three bed sleepers, 30 s of frames every ${cadence[0]} ms${cadence[2] ? " (every 63rd 120 ms late)" : ""}, the top bar live: no frame over 153,600 px, no overflow, at most six changed in a frame, nothing off a group tick, no tick over 148,000 px`, { skip }, async () => {
    const f = await bootScene(movingScene("home", { adults: 6, juveniles: 5, s05: 1, sleepers: 3 })); assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0);
    const r = runFrames(f, 30000, { cadence, top: true });
    assert.ok(r.worst <= 153600, `a frame redrew ${r.worst} px`); assert.ok(r.steps <= 6, `${r.steps} changed in a frame`); assert.equal(r.offgroup, 0); assert.ok(r.worstTick <= 148000, `a tick of ${r.worstTick} px`); assert.equal(f.invOverflows(), 0);
    console.log(`# Home (moving, cadence ${cadence.join("/")}): worst frame ${r.worst} px, worst tick ${r.worstTick} px, ${r.deferred} deferred`);
  });
}
test("determinism and motion off on Home's glass (M1 §3): two faces walk alike; with motion off nothing is redrawn over 10 s", { skip }, async () => {
  const run = async () => { const f = await bootScene(movingScene("home", { adults: 6, juveniles: 5, s05: 1 })); runFrames(f, 8000); return f.hash(); };
  assert.equal(await run(), await run());
  const f = await bootScene(movingScene("home", { adults: 6, juveniles: 5, s05: 1 }), { motion: false }); assert.equal(runFrames(f, 10000).worst, 0);
});
test("rule 2 on Home's glass (M1 §3): six adult walkers at 5 px a tick on one group tick with the bed sleepers breathing: the tick stays inside 148,000 px and the budget defers, deterministically", { skip }, async () => {
  const a = await rule2Run("home"), b = await rule2Run("home");
  assert.ok(a.r.worstTick <= 148000, `a tick of ${a.r.worstTick} px`); assert.ok(a.r.deferred > 0, "the budget deferred changes"); assert.equal(a.hash, b.hash, "deterministic"); assert.equal(a.r.deferred, b.r.deferred);
  console.log(`# rule 2 (Home): worst tick ${a.r.worstTick} px, ${a.r.deferred} changes deferred in 20 s, worst frame ${a.r.worst} px`);
});
// ---- the goal in the notice zone (frame.json strings.goal; station-x10-economy.md) ----
test("the goal is drawn in the notice zone in mist with no lamp; a name too wide for the zone falls back to the nameless sibling", { skip }, async () => {
  const drawn = (f) => (logOf(f)?.type ?? []).find((t) => t.id === "line.goal" || /^line\.goal/.test(t.id ?? ""));
  const withGoal = async (goal) => { const f = await start(scene({ adults: 1, carry: [] }), { frame: { need: "", goal } }); return f; };
  let f = await withGoal({ text: "read Dot's chapters", icons: "", plain: "read the new mibi's chapters" }); logOf(f);
  f.frame((f.t += 16)); let lg = logOf(f); const inZone = (lg?.regions ?? []).filter((r) => r.id === "need"); assert.ok(inZone.length, "the notice zone carries the goal"); assert.ok(!(lg?.regions ?? []).some((r) => r.id === "need" && r.layer === "art"), "no lamp");
  const wide = await withGoal({ text: "read WWWWWWWWWW's chapters", icons: "", plain: "read the new mibi's chapters" }), narrow = await withGoal({ text: "read Dot's chapters", icons: "", plain: "read the new mibi's chapters" });
  const widthOf = (g) => { const l = logOf(g); const r = (l?.regions ?? []).find((x) => x.id === "need" && x.layer === "type")?.rect; return r ? r[2] : null; };
  const ww = widthOf(wide), wn = widthOf(narrow); assert.ok(ww !== null && wn !== null, "both goals draw"); assert.ok(ww <= 272, `the wide name's line fits the zone: ${ww}`); assert.ok(wn <= 272);
  const plainOnly = await withGoal({ text: "read the new mibi's chapters", icons: "", plain: "" }), textOnly = await withGoal({ text: "read Dot's chapters", icons: "", plain: "" });
  assert.equal(ww, widthOf(plainOnly), "too wide: the nameless sibling is what is drawn"); assert.equal(wn, widthOf(textOnly), "it fits: the words with the name are drawn"); assert.notEqual(wn, widthOf(plainOnly), "the two lines differ in width");
  // with icons: the words and 20 px an icon must fit
  const icons = await withGoal({ text: "watch your mibis for more", icons: "◆", plain: "" }); assert.ok(widthOf(icons) <= 272, "words and icons fit the zone");
  // a need holds the zone: with both, only the need is drawn (the props never carry both, but the face must not draw the goal over a need)
  const both = await start(scene({ adults: 1, carry: [] }), { frame: { need: "a new pod waits", goal: { text: "read Dot's chapters", icons: "", plain: "" } } }), only = await start(scene({ adults: 1, carry: [] }), { frame: { need: "a new pod waits" } });
  logOf(both); logOf(only); both.frame((both.t += 16)); only.frame((only.t += 16)); assert.equal(widthOf(both), widthOf(only), "the need keeps the zone");
});

// ---- the lift's send-off on the bed (T-20261016-58; home.json events.sendoff; specs/station-dock-arrival-spec.md §4, amended T-67) ----
function sendoffScene(o = {}) {
  const st = world(); S.seedAdults(st, "S01", 5, o.adults ?? 3, settings); painted(st); st.dock = { docked: false, at: T0 };   // lifted: the top bar and the Cargo module say so; the bed keeps its sleepers until the send-off ends
  const sv = { v: 8, seed: 7, wid: "w1", turn: 3, bay: [], mibis: [], carried: st.mibis.slice(0, o.sleepers ?? 3).map((m) => m.id), tier: 1, shield: 3 };
  const b = homeBuild({ st, sv, settings, docked: false, sendoff: o.sendoff ?? true, ui: {}, focus: null, light: "day" }, homeSpec, frameSpec);
  for (const p of b.props.regions.bed.sleepers) { const id = p.picture.replace(/:\d+x\d+$/, ":96x88"); b.requests.push({ kind: "mibi", id, size: [96, 88], stage: p.stage, species: "S01" }); p.picture = id; delete p.figure; }   // the nap picture at its own size: a sleeper with no nap master would sleep as its standing figure, which the send-off could not tell from its standing painting
  return b;
}
const SO = homeSpec.events.sendoff;
test("the send-off's props: the bed stays docked with its sleepers and each carries its standing painting (the resident's own, 144 × 152), the flag is on; without the send-off nothing is added and the lifted bed is away", () => {
  const b = sendoffScene(), bed = b.props.regions.bed; assert.equal(bed.state, "docked"); assert.equal(bed.sendoff, true); assert.equal(bed.sleepers.length, 3);
  for (const p of bed.sleepers) assert.match(p.stand, /^mibi:/, "the standing painting is the resident's own: " + p.stand);
  const n = sendoffScene({ sendoff: false }).props.regions.bed; assert.equal(n.state, "away"); assert.equal("sendoff" in n, false); assert.ok(n.sleepers.every((p) => !("stand" in p)));
});
test("the send-off at the instants of home.json events.sendoff: the rightmost sleeper wakes at 200 (the standing painting in its box, a cut), hops once, dithers out over 400 ms; the next 200 ms later; none is drawn after; every frame redraws at most a quarter of the screen (the worst is printed)", { skip }, async () => {
  const b = sendoffScene(), f = await start(b, { t0: 1000 }), t0 = f.t; logOf(f); dirty(f);
  const sl = b.props.regions.bed.sleepers, ns = sl.length, standColour = (p) => hash(p.stand);
  const at = (ms) => { f.frame(t0 + ms); return f; }, px = (p, i) => { const r = homeSpec.regions.bed.sleepers, foot = r.places[ns][i], box = [foot - 72, r.footY - 152, 144, 152]; return f.pixel(box[0] + 72, box[1] + 100); };
  f.send({ t: "event", kind: "sendoff", target: "bed", ms: SO.ms, hold: SO.hold }); f.frame(t0);
  const stood = (p, i) => { const c = px(p, i), k = standColour(p); return c[0] === 70 + (k & 127) && c[1] === 70 + ((k >> 7) & 127) && c[2] === 70 + ((k >> 14) & 127); };
  at(100); assert.ok(sl.every((p, i) => !stood(p, i)), "before 200 every sleeper is asleep (the nap pose)");
  at(SO.start + 40); assert.ok(stood(sl[ns - 1], ns - 1), "the rightmost wakes first"); assert.ok(!stood(sl[0], 0), "the others still sleep");
  at(SO.start + SO.stagger + 40); assert.ok(stood(sl[ns - 2], ns - 2), "the next 200 ms later");
  let worst = 0, wat = 0; f.frame(t0); dirty(f); for (let t = 16; t <= SO.ms + 100; t += 16) { f.frame(t0 + t); const d = dirty(f); if (d > worst) { worst = d; wat = t; } }
  console.log(`# the send-off, frames every 16 ms: worst refresh ${worst} px (${(100 * worst / 614400).toFixed(1)}%) at ${wat} ms`); assert.ok(worst <= 153600, `the send-off redrew ${worst} px at ${wat} ms`); assert.deepEqual(f.errors(), []);
  const g = await start(b, { t0: 1000 }), s0 = g.t; g.send({ t: "event", kind: "sendoff", target: "bed", ms: SO.ms, hold: SO.hold }); g.frame(s0); g.frame(s0 + SO.ms + 50);
  assert.ok(sl.every((p, i) => { const c = (() => { const r = homeSpec.regions.bed.sleepers, foot = r.places[ns][i]; return g.pixel(foot, r.footY - 52); })(); const k = standColour(p); return !(c[0] === 70 + (k & 127) && c[1] === 70 + ((k >> 7) & 127)); }), "after the send-off none is drawn");
});
test("with reduced motion the send-off is not drawn: the flag is never set and the bed empties to its away mark at the lift (the host's rule, intents/frame.mjs sendOff)", () => {
  const b = sendoffScene({ sendoff: false }); assert.equal(b.props.regions.bed.state, "away"); assert.equal(b.props.regions.bed.mark !== "", true, "the Companion's mark over the empty bed");
});
