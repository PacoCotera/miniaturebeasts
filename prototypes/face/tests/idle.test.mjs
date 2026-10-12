// Idle on the face (lvgl-switch.md §4 L2.2; frame.json idle): the whole 1024×600 with no frame, drawn by screens/home.c's living-window code on the frame spec's rectangles, in Node on the WebAssembly build: every scene draws without an error
// or a refusal inside the budgets with no region departing from frame.json (tools/idle-regions.mjs, proved here to fail on a moved region), no top bar, bottom line, plate or ring; the first key of any kind says `wake` and nothing else;
// the residents walk with their feet in the walk ground and never behind the bed (the same rules as Home's, 120 s), a quarter of the screen dirty at most; the same hash on the same clock; motion off stands at the start.
// Skipped when the face has not been built (build.sh).
//   node --test prototypes/face/tests/idle.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { withPolicy } from "./node-scene.mjs";
import { bootFace } from "../../station/src/face-lvgl.mjs";
import { setFrames, frameOf, podGenome } from "../../station/src/genome.mjs";
import * as S from "../../station/src/state.mjs";
import { idleBuild } from "../../station/src/views/idle-props.mjs";
import { departures } from "../tools/idle-regions.mjs";
import { dirty } from "./dirty.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist"), built = existsSync(path.join(dist, "face.mjs")), skip = !built && "face not built (prototypes/face/build.sh)";
const specs = path.resolve(here, "../../ui/specs/station"), J = (n) => JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8")), frameSpec = J("frame"), homeSpec = J("home"), I = frameSpec.idle, R = I.regions;
const palette = JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")).colours;
const framesDir = path.resolve(here, "../../workbench/frames");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 20 }, T0 = 1_000_000;

const world = () => { const st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = 99; st.d = 99; st.s = 99; st.firstMibi = false; st.dock = { docked: true, at: T0 }; return st; };
function scene(o = {}) {
  const st = world(); for (let left = o.adults ?? 4, seed = 5; left > 0; left -= 6, seed += 100) S.seedAdults(st, "S01", seed, Math.min(6, left), settings);   // at most six a call
  for (const m of st.mibis) m.paint = { state: "landed" };
  if (o.young) { S.seedAdults(st, "S01", 77, o.young, settings); for (const m of st.mibis.slice(-o.young)) { m.born = st.turn; m.paint = { state: "landed" }; } }
  for (const m of st.mibis.slice(0, o.waiting ?? 0)) m.paint = { state: "sent" };
  if (o.away) st.dock = { docked: false, at: T0 }; if (o.bud) st.bud = { kind: "founder", species: "S01", start: Date.now(), minutes: 5 };
  const sv = { v: 8, seed: 7, wid: "w1", turn: 3, bay: Array.from({ length: o.crates ?? 0 }, (_, i) => ({ id: "c" + i, n: i + 1, turn: 0, at: T0, e: 3, d: 3, s: 4, pods: [], met: [], explored: 0, of: 0, lines: [] })), mibis: [], carried: (o.carry ?? []).map((i) => st.mibis[i].id), tier: 1, shield: 3 };
  return idleBuild({ st, sv, settings, docked: S.docked(st), light: o.light ?? "day" }, frameSpec);
}
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
function standIn(id, size) { const [w, h] = size, d = new Uint8ClampedArray(w * h * 4), k = hash(id); for (let i = 0; i < w * h; i++) { d[i * 4] = 70 + (k & 127); d[i * 4 + 1] = 70 + ((k >> 7) & 127); d[i * 4 + 2] = 70 + ((k >> 14) & 127); d[i * 4 + 3] = 255; } return { w, h, data: d }; }
const sizeOf = (r) => r.size ?? [16, 16];
async function start(b, { motion = true, t0 = 0, noPainting = false } = {}) {
  const f = await bootFace(pathToFileURL(dist + "/"), { test: true });
  f.send({ t: "palette", name: "station", colours: palette }); for (const [n, j] of [["frame", frameSpec], ["home", homeSpec]]) assert.equal(f.send({ t: "spec", screen: n, json: j }), 0);
  for (const r of b.requests) if (!(noPainting && /^idle-vivarium/.test(r.id))) f.handleOf(r.id, withPolicy((i) => ({ ...standIn(i, sizeOf(r)), ...(/^home-bed-/.test(i) ? { policy: "art" } : {}) })));
  f.t = t0; f.motion = motion; f.build = b;
  assert.equal(f.props({ screen: "home", ...b.props, motion }), 0, f.errors().join("; ")); frames(f); return f;
}
const frames = (f, n = 2, dt = 16) => { for (let i = 0; i < n; i++) f.frame((f.t += dt)); };
const logOf = (f) => { let lg = null; for (let m; (m = f.poll("log"));) lg = m; return lg; };
const key = (f, k) => { f.send({ t: "key", k }); frames(f); const out = []; for (let m; (m = f.poll());) if (m.t === "focus" || m.t === "intent") out.push(m); return out; };

const SCENES = {
  "docked, two asleep, crates": { adults: 4, young: 2, carry: [0, 1], crates: 2 }, "away, one out": { adults: 4, young: 2, carry: [0], away: true }, "nobody carried, a bud": { adults: 3, bud: true }, "empty": { adults: 0 },
  "twelve walking": { adults: 12 }, "three asleep": { adults: 5, carry: [0, 1, 2], young: 1 }, "waiting lamps": { adults: 4, waiting: 2 },
};
for (const [name, o] of Object.entries(SCENES)) test(`Idle, ${name}: draws without an error or a refusal inside the budgets, with no region leaving frame.json's rectangles and no frame`, { skip }, async () => {
  const b = scene(o), f = await start(b); assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0);
  const lg = logOf(f); assert.deepEqual(departures(lg, frameSpec), []);
  const st = f.stats(); assert.ok(st.pictures <= 200, `${st.pictures} pictures`); assert.ok(f.objects() <= 400, `${f.objects()} objects`);
  assert.ok(JSON.stringify(b.props).length < 32 * 1024);
  if (name === "waiting lamps") assert.equal(b.props.regions.residents.filter((r) => r.waiting).length, 0, "no resident shows a waiting lamp, whatever its painting's state (Grow paints nothing)");
});
test("the departure check bites: a resident leaving the walk ground, the strip moved, a ring and a frame word are each found", { skip }, async () => {
  const f = await start(scene({ adults: 3, crates: 1 })), lg = logOf(f), bad = (fn) => { const c = JSON.parse(JSON.stringify(lg)); fn(c); return departures(c, frameSpec); };
  assert.deepEqual(departures(lg, frameSpec), []);
  assert.match(bad((c) => { c.regions.find((r) => r.id === "resident" && r.layer !== "chrome").rect[1] = 100; })[0], /feet are not in the walk ground/);
  assert.match(bad((c) => { c.regions.find((r) => r.id === "idle.strip").rect[1] = 560; })[0], /strip/);
  assert.match(bad((c) => { c.regions.push({ id: "focus", layer: "chrome", rect: [0, 0, 10, 10] }); })[0], /no focus/);
  assert.match(bad((c) => { c.regions.push({ id: "top", layer: "chrome", rect: [0, 0, 1024, 40] }); })[0], /no top/);
});
test("the line is centred on x 512 and y 584 at 16 px on its strip; no line, no text; no frame word, no ring", { skip }, async () => {
  const f = await start(scene({ adults: 2, crates: 2 })), lg = logOf(f);
  assert.deepEqual(lg.type.map((t) => [t.text, t.px, t.region]), [["two crates wait in the bay", 16, "idle.line"]]); const r = lg.regions.find((x) => x.id === "idle.line");
  assert.ok(Math.abs(r.rect[0] + r.rect[2] / 2 - 512) <= 1); assert.deepEqual(lg.regions.find((x) => x.id === "idle.strip").rect, [0, 568, 1024, 32]);
  const g = await start(scene({ adults: 2 })); assert.deepEqual(logOf(g).type, [], "none holds: no line");
});
test("any key says wake and nothing else: no focus, no room key, no ✓, no ←, no pad", { skip }, async () => {
  const f = await start(scene({ adults: 2, crates: 1 }));
  for (const k of ["confirm", "back", "up", "left", "research", "home", "habitat", "library"]) { const m = key(f, k); assert.deepEqual(m.map((x) => [x.t, x.screen, x.target, x.verb]), [["intent", "home", "idle", "wake"]], k); }
});
test("the flat plates stand until the master: forest back, clay ground with a sand top row, soil foot (idle.colours), the painting over them when sent", { skip }, async () => {
  const f = await start(scene({ adults: 0 }), { noPainting: true }), rgb = (n) => palette.find(([k]) => k === n)[1].slice(1).match(/../g).map((h) => parseInt(h, 16));
  assert.deepEqual(f.pixel(10, 10), rgb(I.colours.back)); assert.deepEqual(f.pixel(10, 500), rgb(I.colours.ground)); assert.deepEqual(f.pixel(10, R.vivarium.ground[1]), rgb(I.colours.groundTop)); assert.deepEqual(f.pixel(10, R.vivarium.foot[1] + 4), rgb(I.colours.foot));
  assert.deepEqual(f.pixel(10, 568), rgb(I.colours.rule), "the strip's 1 px void rule on its top edge"); assert.deepEqual(f.pixel(10, 590), rgb(I.colours.strip));
  const g = await start(scene({ adults: 0 })); assert.notDeepEqual(g.pixel(10, 10), rgb(I.colours.back), "the painting covers the plates once it is sent");
});

// ---- the walk ----
test("a resident walks with its feet in 16..1008 × 376..551, never behind the bed (box right edge past 792 with feet below 448), 120 s at 40 ms", { skip }, async () => {
  const f = await start(scene({ adults: 1 }), { t0: 5000 }), w = R.resident.walk.ground, adult = R.resident.adult; let moved = 0, last = null; const seen = new Set();
  for (let t = 40; t < 120000; t += 40) {
    f.frame(5000 + t); const lg = logOf(f); if (!lg) continue; const r = lg.regions.find((x) => x.id === "resident" && x.layer !== "chrome"); if (!r) continue;
    const [x, y, rw, rh] = r.rect, feet = y + rh; assert.ok(x >= w[0] && x + rw <= w[0] + w[2] && feet >= w[1] && feet <= w[1] + w[3], `box ${r.rect} is inside the walk ground`);
    assert.ok(!(x + rw > R.bed.rect[0] && feet > R.bed.rect[1] - 48), `box ${r.rect} is not behind the bed`);
    if (last && (x !== last[0] || y !== last[1])) moved++; last = r.rect; seen.add(x + "," + y);
  }
  assert.ok(moved > 200 && seen.size > 200, `it walks: ${moved} moves, ${seen.size} places`);
});
test("the same props on the same clock give the same hash; with motion off the residents stand at their start", { skip }, async () => {
  const run = async (t, motion = true) => { const f = await start(scene({ adults: 4, carry: [0] }), { t0: 5000, motion }); for (let ms = 40; ms <= t; ms += 40) f.frame(5000 + ms); return f.hash(); };
  assert.equal(await run(8000), await run(8000)); assert.notEqual(await run(8000), await run(1200)); assert.equal(await run(8000, false), await run(40, false), "motion off: nothing moves");
});
// the bays hold twelve in all, so with three asleep on the bed at most nine walk
const WALKS = { "twelve adults": { adults: 12 }, "six adults and six juveniles": { adults: 6, young: 6 }, "twelve, three waiting": { adults: 12, waiting: 3 }, "nine adults, three asleep": { adults: 12, carry: [9, 10, 11] }, "three adults and six juveniles, three asleep": { adults: 6, young: 6, carry: [3, 4, 5] }, "nine, three waiting, three asleep": { adults: 12, waiting: 3, carry: [9, 10, 11] } };
for (const [name, o] of Object.entries(WALKS)) for (const [step, off, late = 0] of [[40, 0], [16, 5], [16, 5, 120]]) test(`the walk on Idle, ${name}, frames every ${step} ms${late ? ` (every 63rd ${late} ms late)` : ""} for 120 s: no refresh redraws more than a quarter of the screen, and no more than six residents step in one`, { skip }, async () => {
  const f = await start(scene(o), { t0: 5000 }), M = f.M; let area = 0, moved = 0, lateArea = 0, ordinary = 0;
  for (let t = step + off, k = 0; t < 120000; t += step, k++) {
    const isLate = late && k % 63 === 62; if (isLate) t += late;   // a frame that comes `late` ms after the one before it, the clock going on from there
    f.frame(5000 + t); const n = M._face_dirty_count(), s = dirty(f), st = M._face_test_steps(); area = Math.max(area, s); if (n) moved++; if (isLate) lateArea = Math.max(lateArea, s); else ordinary = Math.max(ordinary, s);
    assert.ok(st <= 6, `${st} residents stepped in the frame at ${t}${isLate ? " (late)" : ""}`);
  }
  assert.ok(moved > 500, "the residents walk: " + moved + " frames redrawn"); assert.ok(area <= 153600, `dirty area ${area} of ${1024 * 600} (${(100 * area / (1024 * 600)).toFixed(1)}%)`);
  console.log(`# Idle's walk, ${name}, frames every ${step} ms: worst refresh ${(100 * area / (1024 * 600)).toFixed(1)}% of the screen dirty`);
  if (late) console.log(`# Idle's walk, ${name}: the worst late frame ${lateArea} px, the worst ordinary one ${ordinary} px`);
});

// a light change is a cut, like a screen change: the painting (1024 × 568) is redrawn on one refresh, under its own ceiling, not the 153,600 of an animation
test("a light change is a cut: Idle redraws the whole of its painting at most (581,632 px), every pair of lights", { skip }, async () => {
  const LIGHTS = ["dawn", "day", "dusk", "night"];
  for (const from of LIGHTS) for (const to of LIGHTS) if (from !== to) {
    const f = await start(scene({ adults: 4, young: 2, carry: [0, 1], light: from }), { motion: false, t0: 1000 }), b = scene({ adults: 4, young: 2, carry: [0, 1], light: to });
    for (const r of b.requests) f.handleOf(r.id, withPolicy((i) => ({ ...standIn(i, sizeOf(r)), ...(/^home-bed-/.test(i) ? { policy: "art" } : {}) })));
    assert.equal(f.props({ screen: "home", ...b.props, motion: false }), 0, f.errors().join("; ")); f.frame((f.t += 16));
    const a = dirty(f); assert.ok(a <= 581632, `${from} to ${to}: dirty ${a}`); assert.deepEqual(f.errors(), []);
  }
});

// ---- Station M1 §3: Idle with moving sets (moving-scene.mjs: stand-in atlases synthesized at the slot sizes) ----
import { movingScene, bootScene, resend, runFrames, STATE, CLIP, rule2Run } from "./moving-scene.mjs";
for (const cadence of [[16, 0, 0], [16, 5, 120]]) {
  test(`MOVING (M1 §3): Idle with twelve moving residents and three bed sleepers, 30 s of frames every ${cadence[0]} ms${cadence[2] ? " (every 63rd 120 ms late)" : ""}: no frame over 153,600 px, no overflow, at most six changed in a frame, nothing off a group tick, no tick over 148,000 px`, { skip }, async () => {
    const f = await bootScene(movingScene("idle", { adults: 6, juveniles: 5, s05: 1, sleepers: 3 })); assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0);
    const r = runFrames(f, 30000, { cadence });
    assert.ok(r.worst <= 153600, `a frame redrew ${r.worst} px`); assert.ok(r.steps <= 6, `${r.steps} changed in a frame`); assert.equal(r.offgroup, 0); assert.ok(r.worstTick <= 148000, `a tick of ${r.worstTick} px`); assert.equal(f.invOverflows(), 0);
    console.log(`# Idle (moving, cadence ${cadence.join("/")}): worst frame ${r.worst} px, worst tick ${r.worstTick} px, ${r.deferred} deferred`);
  });
}
test("determinism and motion off on Idle (M1 §3): two faces walk alike; with motion off nothing is redrawn over 10 s", { skip }, async () => {
  const run = async () => { const f = await bootScene(movingScene("idle", { adults: 6, juveniles: 5, s05: 1, sleepers: 3 })); runFrames(f, 8000); return f.hash(); };
  assert.equal(await run(), await run());
  const f = await bootScene(movingScene("idle", { adults: 6, juveniles: 5, s05: 1, sleepers: 3 }), { motion: false }); assert.equal(runFrames(f, 10000).worst, 0);
});
test("rule 2 on Idle (M1 §3): six adult walkers at 5 px a tick on one group tick with the bed sleepers breathing: the tick stays inside 148,000 px and the budget defers, deterministically", { skip }, async () => {
  const a = await rule2Run("idle"), b = await rule2Run("idle");
  assert.ok(a.r.worstTick <= 148000, `a tick of ${a.r.worstTick} px`); assert.ok(a.r.deferred > 0, "the budget deferred changes"); assert.equal(a.hash, b.hash, "deterministic"); assert.equal(a.r.deferred, b.r.deferred);
  console.log(`# rule 2 (Idle): worst tick ${a.r.worstTick} px, ${a.r.deferred} changes deferred in 20 s, worst frame ${a.r.worst} px`);
});
// the bound of one hopping resident's frame (the architect's Q5): (cell w + the most it travels in a tick) × (cell h + the lift cap a tick, 12) + (cell w + that travel) × 16 for its shadow node; the travel is the hop's over its air ticks, rounded up
import { MOVING as MSETS } from "./moving-scene.mjs";
const hopBound = (stage) => { const s = MSETS.S01[stage], [w, h] = s.walk.size, t = Math.ceil(s.hop.travel / s.hop.lift.length); return (w + t) * (h + 12) + (w + t) * 16; };
const HOP_BOX = hopBound("adult");
test("the G7 bound (the architect's Q5): 27,720 px for an adult, 15,680 for a juvenile, from the formula", () => { assert.equal(hopBound("adult"), 27720); assert.equal(hopBound("juvenile"), 15680); });
test("G7 night (M1 §3, game designer R3): Pip alone, asleep, 6 min 10 s: 7–18 stirs 20–40 s apart and none while Pip wanders, none within 20 s of its last curl; a wanderer wakes, travels at most 200 px, rests and curls; no frame over one adult hop box and its shadow; the face asks for a few frames a second", { skip }, async () => {
  const f = await bootScene(movingScene("idle", { adults: 1, time: 23 * 3600 })), M = f.M;
  const stirs = [], wanders = []; let prev = { clip: CLIP.asleep, wanderer: false }, worst = 0, drawn = 0, frames = 0, wakeAt = null, curlEnd = 0, travelled = 0, wander = null;
  runFrames(f, 370000, { each: (t, s) => {
    frames++; if (M._face_dirty_count()) drawn++; worst = Math.max(worst, s);
    const st = STATE(M._face_test_state(0)), x = M._face_test_mv(0, 0), feet = M._face_test_mv(0, 1);
    if (st.clip === CLIP.stir && prev.clip !== CLIP.stir) { assert.ok(!st.wanderer, "no stir while Pip wanders"); assert.ok(t - curlEnd >= 20000 || curlEnd === 0, `a stir ${t - curlEnd} ms after its curl`); stirs.push(t); }
    if (st.wanderer && !prev.wanderer) { wander = { t, x, feet, max: 0, rested: false }; }
    if (wander && st.wanderer) { wander.max = Math.max(wander.max, Math.abs(x - wander.x), Math.abs(feet - wander.feet)); if (st.clip === CLIP.rest) wander.rested = true; }
    if (wander && !st.wanderer && prev.wanderer) { wanders.push(wander); wander = null; }
    if (prev.clip === CLIP.curl && st.clip !== CLIP.curl) curlEnd = t;
    prev = st;
  } });
  void wakeAt; void travelled;
  const gaps = stirs.slice(1).map((t, i) => t - stirs[i]);
  assert.ok(stirs.length >= 7 && stirs.length <= 18, `${stirs.length} stirs`); for (const g of gaps) assert.ok(g >= 20000 - 80 && g <= 40000 + 80, `stirs ${g} ms apart`);
  assert.ok(gaps.filter((g) => g > 40080).length <= wanders.length + 1, "a stir waits only while Pip wanders or after its curl");
  assert.ok(wanders.length >= 1, "a wanderer"); for (const w of wanders) { assert.ok(w.max <= 200 * 2, `it wandered ${w.max} px`); assert.ok(w.rested, "it rested"); }
  assert.ok(worst <= HOP_BOX, `a frame of ${worst} px`); assert.ok(drawn / 370 <= 15, `${(drawn / 370).toFixed(1)} frames a second`);
  console.log(`# G7 night: ${stirs.length} stirs ${Math.min(...gaps)}–${Math.max(...gaps)} ms apart, ${wanders.length} wanderer${wanders.length > 1 ? "s" : ""} (${wanders.map((w) => w.max + " px").join(", ")}), worst frame ${worst} px, ${(drawn / 370).toFixed(2)} frames drawn a second`);
});
test("asleep spots (UI/UX item 11): at night no sleeper's ground point lies in another's spot, and no waypoint (a wanderer's included) lands in another's spot", { skip }, async () => {
  const f = await bootScene(movingScene("idle", { adults: 6, juveniles: 4, time: 23 * 3600 })), M = f.M, w = (i) => (i < 6 ? 144 : 104);
  const spot = (i) => { const fx = M._face_test_mv(i, 0) + w(i) / 2, feet = M._face_test_mv(i, 1); return [fx - 56, feet - 12, 112, 24]; }, meets = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];
  const inSpot = (i, j) => { const p = spot(j), gx = M._face_test_mv(i, 0) + w(i) / 2, gf = M._face_test_mv(i, 1); return gx >= p[0] && gx < p[0] + p[2] && gf >= p[1] && gf < p[1] + p[3]; };
  for (let i = 0; i < 10; i++) for (let j = 0; j < 10; j++) if (i !== j) assert.ok(!inSpot(i, j), `resident ${i}'s ground point lies in ${j}'s spot at screen show`); void meets;
  runFrames(f, 400000, { cadence: [40, 0, 0], each: () => { for (let i = 0; i < 10; i++) { const s = STATE(M._face_test_state(i)); if (!s.travelling && !s.wanderer) continue; if (s.clip !== CLIP.hop && s.clip !== CLIP.walk) continue; const gx = M._face_test_mv(i, 8) + w(i) / 2, gf = M._face_test_mv(i, 9);
    for (let j = 0; j < 10; j++) if (j !== i && [CLIP.asleep, CLIP.curl, CLIP.stir, CLIP.wake].includes(STATE(M._face_test_state(j)).clip)) { const p = spot(j); assert.ok(!(gx >= p[0] && gx < p[0] + p[2] && gf >= p[1] && gf < p[1] + p[3]), `resident ${i}'s waypoint lands in ${j}'s spot`); } } } });
});
test("no stir begins on a focused sleeper (game designer R4; the living window's code on Home's glass, where the ring is)", { skip }, async () => {
  const f = await bootScene(movingScene("home", { adults: 3, time: 23 * 3600, focus: "resident:0" })); let s1 = 0; const p = [0, 0, 0];
  runFrames(f, 90000, { each: () => { const a = STATE(f.M._face_test_state(0)); assert.notEqual(a.clip, CLIP.stir, "the focused sleeper never stirs"); for (const i of [1, 2]) { const b = STATE(f.M._face_test_state(i)); if (b.clip === CLIP.stir && p[i] !== CLIP.stir) s1++; p[i] = b.clip; } } });
  assert.ok(s1 >= 2, "the stirs went to the others: " + s1);
});
