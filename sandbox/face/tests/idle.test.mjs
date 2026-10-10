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

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist"), built = existsSync(path.join(dist, "face.mjs")), skip = !built && "face not built (prototypes/face/build.sh)";
const specs = path.resolve(here, "../../ui/specs/station"), J = (n) => JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8")), frameSpec = J("frame"), homeSpec = J("home"), I = frameSpec.idle, R = I.regions;
const palette = JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")).colours;
const framesDir = path.resolve(here, "../../workbench/frames");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 20 }, T0 = 1_000_000;

const world = () => { const st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = 99; st.d = 99; st.s = 99; st.firstMibi = false; st.dock = { docked: true, at: T0 }; return st; };
function scene(o = {}) {
  const st = world(); for (let left = o.adults ?? 4, seed = 5; left > 0; left -= 6, seed += 100) S.seedAdults(st, "S01", seed, Math.min(6, left), settings);   // at most six a call for (const m of st.mibis) m.paint = { state: "landed" };
  if (o.young) { S.seedAdults(st, "S01", 77, o.young, settings); for (const m of st.mibis.slice(-o.young)) { m.born = st.turn; m.paint = { state: "landed" }; } }
  for (const m of st.mibis.slice(0, o.waiting ?? 0)) m.paint = { state: "sent" };
  if (o.away) st.dock = { docked: false, at: T0 }; if (o.bud) st.bud = { kind: "founder", species: "S01", start: Date.now(), minutes: 5 };
  const sv = { v: 8, seed: 7, wid: "w1", turn: 3, bay: Array.from({ length: o.crates ?? 0 }, (_, i) => ({ id: "c" + i, n: i + 1, turn: 0, at: T0, e: 3, d: 3, s: 4, pods: [], met: [], explored: 0, of: 0, lines: [] })), mibis: [], carried: (o.carry ?? []).map((i) => st.mibis[i].id), tier: 1, shield: 3 };
  return idleBuild({ st, sv, settings, docked: S.docked(st) }, frameSpec);
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
for (const [name, o] of Object.entries(WALKS)) for (const [step, off] of [[40, 0], [16, 5]]) test(`the walk on Idle, ${name}, frames every ${step} ms for 120 s: no refresh redraws more than a quarter of the screen`, { skip }, async () => {
  const f = await start(scene(o), { t0: 5000 }), M = f.M; let area = 0, moved = 0;
  for (let t = step + off; t < 120000; t += step) {
    f.frame(5000 + t); const n = M._face_dirty_count(), a = M.HEAP32.subarray(M._face_dirty_rects() >> 2, (M._face_dirty_rects() >> 2) + n * 4); let s = 0;
    for (let i = 0; i < n; i++) s += a[i * 4 + 2] * a[i * 4 + 3]; area = Math.max(area, s); if (n) moved++;
  }
  assert.ok(moved > 500, "the residents walk: " + moved + " frames redrawn"); assert.ok(area <= 153600, `dirty area ${area} of ${1024 * 600} (${(100 * area / (1024 * 600)).toFixed(1)}%)`);
  console.log(`# Idle's walk, ${name}, frames every ${step} ms: worst refresh ${(100 * area / (1024 * 600)).toFixed(1)}% of the screen dirty`);
});
