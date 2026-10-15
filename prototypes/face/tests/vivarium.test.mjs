// The Vivarium's whole on the face (lvgl-switch.md §4 V): the words and the binding table (screens/home.c, vivarium_words) on the props views/vivarium-props.mjs gives, in Node on the WebAssembly build: every scene draws without an error or a
// refusal inside the object and picture budgets, with no region departing from vivarium.json (tools/vivarium-regions.mjs, proved here to fail on a moved region), the strip's tiles on listPitch's forms, the keys (the pad is vivarium.json's graph,
// ✓ and ← and the room keys are intents) and the walk: at most six boxes moving on a frame of twelve, no refresh over a quarter of the screen, every resident's feet in the walk ground.
// Skipped when the face has not been built (build.sh).
//   node --test prototypes/face/tests/vivarium.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { withPolicy } from "./node-scene.mjs";
import { bootFace } from "../../station/src/face-lvgl.mjs";
import { setFrames } from "../../station/src/genome.mjs";
import * as S from "../../station/src/state.mjs";
import { vivariumBuild } from "../../station/src/views/vivarium-props.mjs";
import { departures } from "../tools/vivarium-regions.mjs";
import { listPitch } from "../../ui/specs/derive.mjs";
import { dirty } from "./dirty.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist"), built = existsSync(path.join(dist, "face.mjs")), skip = !built && "face not built (prototypes/face/build.sh)";
const specs = path.resolve(here, "../../ui/specs/station"), J = (n) => JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8")), frameSpec = J("frame"), spec = J("vivarium"), homeSpec = J("home");
const palette = JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")).colours;
const framesDir = path.resolve(here, "../../workbench/frames");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const T0 = 1_000_000, R = spec.regions, cfg = (bays) => ({ ...S.DEFAULT_SETTINGS, economy: "decided", bays });

// ---- scenes: the state through the rules, the props through the view ----
function scene(o = {}) {
  const settings = cfg(o.bays ?? 8), st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = 99; st.d = 99; st.s = 99; st.firstMibi = false; st.dock = { docked: !o.away, at: T0 };
  if (o.adults) S.seedAdults(st, "S01", 5, o.adults, settings);
  if (o.young) S.seedAdults(st, "S01", 77, o.young, settings);
  for (const m of st.mibis) m.paint = { state: "landed" };
  for (const m of st.mibis.slice(0, o.waiting ?? 0)) m.paint = { state: "sent" };   // its painting is on its way: the waiting lamp
  for (const m of (o.young ? st.mibis.slice(-o.young) : [])) m.born = st.turn;
  const sv = { v: 8, seed: 7, wid: "w1", turn: 3, bay: [], mibis: [], carried: (o.carry ?? []).map((i) => st.mibis[i].id), tier: 1, shield: 3 };
  const b = vivariumBuild({ st, sv, settings, docked: S.docked(st), light: o.light ?? "day", focus: o.focus ? (/^(resident|tile)\./.test(o.focus) ? o.focus : o.focus.replace(/^(\w+):(\d+)$/, (_, k, i) => k + "." + st.mibis[+i].id)) : null, seen: null }, spec, frameSpec, homeSpec);
  return { ...b, st };
}
const frameProps = (line = {}) => ({ top: { screen: "vivarium", title: "Vivarium", turn: 4, turnFlash: false, materials: { e: 9, d: 9, s: 9 }, flash: {}, companion: { docked: true, withMibi: null } }, line: { back: "Home", need: "", ...line }, plate: { text: "" } });

// stand-in pictures: a flat block keyed by id, at the size the id names (…:WxH) or the request's
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
function standIn(id, size) { const [w, h] = size, d = new Uint8ClampedArray(w * h * 4), k = hash(id); for (let i = 0; i < w * h; i++) { d[i * 4] = 70 + (k & 127); d[i * 4 + 1] = 70 + ((k >> 7) & 127); d[i * 4 + 2] = 70 + ((k >> 14) & 127); d[i * 4 + 3] = 255; } return { w, h, data: d }; }
const sizeOf = (r) => r.size ?? [16, 16];
async function start(b, { motion = true, t0 = 0, sleepersPainted = false } = {}) {
  const f = await bootFace(pathToFileURL(dist + "/"), { test: true });
  f.send({ t: "palette", name: "station", colours: palette }); for (const [n, j] of [["frame", frameSpec], ["vivarium", spec]]) assert.equal(f.send({ t: "spec", screen: n, json: j }), 0);
  for (const id of ["energy", "data", "essence", "cross"]) f.handleOf(`icon:${id}:16`, withPolicy((i) => standIn(i, [16, 16])));
  f.handleOf(R.tiles.glyph ?? "frame-companion-outline-16x24", withPolicy((i) => standIn(i, [16, 24])));
  for (const id of ["frame-companion-outline-16x24", "home-lamp-sky-12x12", "home-lamp-hairline-12x12", "home-lamp-sprout-12x12", "home-lamp-amber-12x12"]) f.handleOf(id, withPolicy((i) => standIn(i, id.includes("outline") ? [16, 24] : [12, 12])));
  for (const r of b.requests) f.handleOf(r.id, withPolicy((i) => ({ ...standIn(i, sizeOf(r)), ...(sleepersPainted && /^mibi:/.test(i) ? { status: "master" } : {}) })));
  f.t = t0; f.motion = motion; f.build = b;
  assert.equal(f.props({ screen: "vivarium", ...b.props, motion, frame: frameProps(b.line) }), 0, f.errors().join("; ")); frames(f); return f;
}
const frames = (f, n = 2, dt = 16) => { for (let i = 0; i < n; i++) f.frame((f.t += dt)); };
const logOf = (f) => { let lg = null; for (let m; (m = f.poll("log"));) lg = m; return lg; };
const withFocus = (f, cur) => { f.build.props.focus.cur = cur; assert.equal(f.props({ screen: "vivarium", ...f.build.props, motion: f.motion, frame: frameProps(f.build.line) }), 0); frames(f); };
const key = (f, k) => { f.send({ t: "key", k }); frames(f); const out = []; for (let m; (m = f.poll());) if (m.t === "focus" || m.t === "intent") out.push(m); return out; };

const SCENES = {
  "docked: five at home, two asleep, eight bays": { adults: 4, young: 3, carry: [0, 1] },
  "away: two out with the Companion, the mark on the bed": { adults: 4, young: 3, carry: [0, 1], away: true },
  "a fresh world's: empty, six free bays, the nest alone": { bays: 6 },
  "a fresh world's, the Companion away: the nest and its mark": { bays: 6, away: true },
  "twelve adults, twelve compact tiles": { bays: 12, adults: 12 },
  "docked, nobody carried: the nest drawn empty": { adults: 3 },
  "the ring on a sleeper": { adults: 4, young: 3, carry: [0, 1], focus: "resident:1" },
  "the ring on a housed tile": { adults: 4, young: 3, carry: [0, 1], focus: "tile:4" },
  "the ring on an out mibi's tile": { adults: 4, young: 3, carry: [0, 1], away: true, focus: "tile:0" },
  "by the light of night": { adults: 4, young: 3, carry: [0, 1], light: "night" },
};
for (const [name, o] of Object.entries(SCENES)) {
  test(`the Vivarium's whole, ${name}: draws without an error or a refusal inside the budgets, with no region departing from vivarium.json`, { skip }, async () => {
    const b = scene(o), f = await start(b); assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0);
    const lg = logOf(f); assert.deepEqual(departures(lg, spec, b.props.state, b.props.focus.cur, b.props.regions.tiles.items.length), []);
    const st = f.stats(); assert.ok(st.pictures <= 200, `${st.pictures} pictures`); assert.ok(f.objects() <= 400, `${f.objects()} objects`);
    assert.ok(JSON.stringify(b.props).length + JSON.stringify(b.line).length < 32 * 1024, "props under 32 KiB");
    if (b.props.state === "empty") assert.ok(!lg.regions.some((r) => ["resident", "nameTag", "focus"].includes(r.id)), "the empty whole draws no people, tag or ring");
    assert.equal(lg.regions.some((r) => r.id === "nameTag"), /^resident\./.test(b.props.focus.cur), "the name tag stands only on a resident or a sleeper");
  });
}
test("the tiles stand on listPitch's forms: up to six bays 152 wide on a 160 pitch, seven to twelve 72 wide on an 80 pitch; a free bay draws nothing, a tile out the glyph, a tile in the thumbnail", { skip }, async () => {
  for (const [bays, adults, w] of [[6, 4, 152], [8, 5, 72], [12, 12, 72], [1, 1, 152]]) {
    const b = scene({ bays, adults }), f = await start(b), lg = logOf(f), items = Array.from({ length: bays }, (_, i) => listPitch(R.tiles, bays, i));
    assert.equal(items[0][2], w); for (let i = 0; i < bays; i++) assert.deepEqual(lg.regions.find((r) => r.id === `tile.${i}` && r.layer === "chrome").rect, items[i], `${bays} bays: tile ${i}`);
    assert.equal(lg.regions.filter((r) => r.id.startsWith("tile.") && r.layer === "art").length, adults, "a thumbnail a housed mibi");
  }
});
test("the departure check bites: the strip moved, a tile off its pitch, the name tag off the window, a resident out of the walk ground and a word in the window are each found", { skip }, async () => {
  const b = scene({ adults: 4, young: 3, carry: [0, 1], focus: "resident:3" }), f = await start(b), lg = logOf(f), n = b.props.regions.tiles.items.length;
  const bad = (fn) => { const c = JSON.parse(JSON.stringify(lg)); fn(c); return departures(c, spec, b.props.state, b.props.focus.cur, n); };
  assert.deepEqual(departures(lg, spec, "rest", b.props.focus.cur, n), []);
  assert.match(bad((c) => { c.regions.find((r) => r.id === "strip" && r.layer === "chrome").rect[0] += 8; })[0], /strip/);
  assert.match(bad((c) => { c.regions.find((r) => r.id === "tile.2" && r.layer === "chrome").rect[0] += 4; })[0], /tile 2/);
  assert.match(bad((c) => { c.regions.find((r) => r.id === "nameTag" && r.layer === "chrome").rect[0] = 2; })[0], /name tag/);
  assert.match(bad((c) => { const r = c.regions.find((x) => x.id === "resident" && x.layer !== "chrome"); r.rect[0] = 0; })[0], /walk ground/);
  assert.match(bad((c) => { c.regions.push({ id: "word", layer: "type", rect: [300, 200, 80, 20] }); })[0], /no word/);
});
test("the bed and its sleepers are two regions: a bed moved 8 px, a sleeper 56 px up are found, and sleepers on the painted layer with the bed (their masters placed) are no departure", { skip }, async () => {
  const b = scene({ adults: 4, young: 3, carry: [0, 1] }), n = b.props.regions.tiles.items.length;
  for (const painted of [false, true]) {
    const f = await start(b, { sleepersPainted: painted }), lg = logOf(f), bad = (fn) => { const c = JSON.parse(JSON.stringify(lg)); fn(c); return departures(c, spec, b.props.state, b.props.focus.cur, n); };
    assert.ok(lg.regions.some((r) => r.id === "bed.sleepers" && r.layer === (painted ? "painted" : "art")), `the sleepers are their own region on the ${painted ? "painted" : "art"} layer`);
    assert.deepEqual(departures(lg, spec, "rest", b.props.focus.cur, n), [], painted ? "sleepers painted with the bed" : "sleepers art");
    assert.match(bad((c) => { c.regions.find((r) => r.id === "bed" && r.layer === "painted").rect[0] += 8; }).join("; "), /bed is not drawn exactly/);
    assert.match(bad((c) => { c.regions.find((r) => r.id === "bed.sleepers").rect[1] -= 56; }).join("; "), /sleeper/);
  }
});
test("the keys: ✓ and ← and the room keys are intents on the focused target, the pad moves the ring by vivarium.json's graph (▼ a resident's own tile, ▲ its resident, ◀ ▶ along the tiles)", { skip }, async () => {
  const b = scene({ adults: 4, young: 3, carry: [0, 1] }), f = await start(b), ids = b.st.mibis.map((m) => m.id), cur0 = b.props.focus.cur;
  for (const [k, verb] of [["confirm", "confirm"], ["back", "back"], ["home", "room:home"], ["research", "room:research"], ["library", "room:library"], ["habitat", "room:habitat"]]) { const m = key(f, k); assert.deepEqual(m.map((x) => [x.t, x.screen, x.target, x.verb]), [["intent", "vivarium", cur0, verb]], k); }
  assert.deepEqual(key(f, "dock"), []);
  // the host takes each `focus` the face says and sends the props again with the ring there (withFocus), as the page does
  const id0 = cur0.slice(9), go = (k) => { const m = key(f, k); if (m[0]?.t === "focus") withFocus(f, m[0].target); return m; };
  let m = go("down"); assert.deepEqual(m.map((x) => [x.t, x.target]), [["focus", "tile." + id0]]);
  m = go("up"); assert.deepEqual(m.map((x) => [x.t, x.target]), [["focus", "resident." + id0]]);
  go("down"); m = go("right"); const next = m[0].target; assert.ok(next.startsWith("tile.") && next !== "tile." + id0, next); m = go("left"); assert.equal(m[0].target, "tile." + id0);
  withFocus(f, "tile." + ids[6]); assert.deepEqual(key(f, "right"), [], "the strip stops at its last tile"); assert.deepEqual(key(f, "down"), []);
  withFocus(f, "tile." + ids[0]); m = go("up"); assert.ok(m[0].target.startsWith("resident."), "a tile's resident; its mibi sleeping on the bed is a resident too");
});
test("an empty whole has no ring, no ✓ cap and no pad; ← and the room keys still say their intents on the room", { skip }, async () => {
  const b = scene({ bays: 6 }), f = await start(b); assert.equal(b.props.focus.cur, "room");
  for (const k of ["up", "down", "left", "right"]) assert.deepEqual(key(f, k), [], k);
  assert.deepEqual(key(f, "back").map((x) => [x.target, x.verb]), [["room", "back"]]);
});
// one group tick a frame at most: a late frame steps the next group only, and the time past that tick is dropped by moving the walk's origin later in whole ticks
test("a late frame steps one group, and the walk after it is the walk, later", { skip }, async () => {
  const run = async (L) => {
    const f = await start(scene({ bays: 12, adults: 12 }), { t0: 5000 }); for (let t = 40; t <= 4000; t += 40) f.frame(5000 + t);   // the walk is under way (they idle for the first two seconds)
    f.frame(5000 + 4000 + L); const steps = f.M._face_test_steps(), a = dirty(f); for (let i = 1; i <= 50; i++) f.frame(5000 + 4000 + L + 40 * i);
    return { steps, a, hash: f.hash() };
  };
  const base = await run(40);
  for (const L of [80, 120, 1000]) { const r = await run(L); assert.ok(r.steps <= 6, `a frame ${L} ms late stepped ${r.steps} residents`); assert.ok(r.a <= 153600, `a frame ${L} ms late redrew ${r.a} px`); assert.equal(r.hash, base.hash, `${L} ms late: fifty frames on, the walk is the walk (one tick a frame), later`); console.log(`# the Vivarium's late frame (${L} ms): ${r.steps} steps, ${r.a} px`); }
});
// the top bar live on a late frame: the counters change and flash on the frame that is late, which is the worst case for the number of areas LVGL lists
test("a late walk frame with the top bar live (counters and their flashes changing) stays inside 153,600 px and LVGL's invalid-area buffer", { skip }, async () => {
  const f = await start(scene({ bays: 12, adults: 12 }), { t0: 5000 }), M = f.M, base = f.build; let worst = 0, areas = 0, k = 0;
  const MAT = [{ e: 14, d: 16, s: 10 }, { e: 2, d: 6, s: 9 }], top = (m) => ({ ...frameProps().top, materials: m, flash: { e: true, d: true, s: true } });
  for (let t = 21; t < 30000; t += 16, k++) {   // the brief's cadence: 16 ms frames, every 63rd 120 ms late, 30 s
    const late = k % 63 === 62; if (late) { t += 120; assert.equal(f.props({ screen: "vivarium", ...base.props, motion: true, frame: { ...frameProps(base.line), top: top(MAT[(k / 63 | 0) % 2]) } }), 0, f.errors().join("; ")); }
    f.frame(5000 + t); const s = dirty(f), n = M._face_dirty_count(); assert.ok(s <= 153600, `${late ? "late " : ""}frame at ${t}: ${s} px`); assert.ok(n <= M._face_inv_cap(), `${n} flushes outside the cap`);
    if (late && s > worst) { worst = s; areas = n; }
  }
  assert.equal(f.invOverflows(), 0, "no overflow of LVGL's invalid areas"); console.log(`# the Vivarium's late frame with the top bar live: worst ${worst} px in ${areas} flushes, ${f.invOverflows()} overflows`);
});
const WALKS = { "twelve adults": { bays: 12, adults: 12 }, "six adults and six juveniles": { bays: 12, adults: 6, young: 6 }, "twelve, one focused": { bays: 12, adults: 12, focus: "resident:5" }, "twelve, three waiting": { bays: 12, adults: 12, waiting: 3 }, "twelve adults, the ring on a tile": { bays: 12, adults: 12, focus: "tile:3" }, "twelve, two asleep on the bed": { bays: 12, adults: 12, carry: [0, 1] }, "twelve, one focused, seeds whose feet cross": { bays: 12, adults: 12, focus: "resident:5", seeds: [64845, 5640, 43497, 5522, 42627, 49915, 953, 51488, 15488, 10859, 36680, 51651] } };
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
    console.log(`# the Vivarium's walk, ${name}, frames every ${step} ms: worst refresh ${area} px (${(100 * area / (1024 * 600)).toFixed(1)}% of the screen) dirty, worst ${steps} steps`);
    if (late) console.log(`# the Vivarium's walk, ${name}: the worst late frame ${lateArea} px, the worst ordinary one ${ordinary} px`);
  });
}
test("a walking resident keeps its box in 16..1008 and its feet in the band 296..471, never meets the keep-out zone, never stops short of the ground, steps 2 px at a time, and a focused one stands still", { skip }, async () => {
  const G = R.resident.walk.ground, K = R.resident.walk.keepOut;
  for (let seed = 1; seed <= 12; seed++) {
    const b = scene({ adults: 1, focus: "tile:0" }); b.props.regions.residents[0].seed = seed * 7919;
    const f = await start(b, { t0: 5000 }); let last = null, jump = 0, moved = 0;
    for (let ms = 40; ms <= 30000; ms += 40) {
      f.frame(5000 + ms); const lg = logOf(f), r = lg?.regions.find((x) => x.id === "resident" && x.layer !== "chrome")?.rect; if (!r) continue;
      const [x, y, w, h] = r, feet = y + h; assert.ok(x >= G[0] && x + w <= G[0] + G[2] && feet >= G[1] && feet <= G[1] + G[3], `seed ${seed} at ${ms}: ${r}`); assert.ok(!(x + w > K[0] && feet > K[1]), `seed ${seed} at ${ms}: ${r} meets the keep-out zone`);
      if (last && (last[0] !== x || last[1] !== y)) { moved++; jump = Math.max(jump, Math.abs(last[0] - x), Math.abs(last[1] - y)); } last = [x, y];
    }
    assert.ok(jump <= 2, `seed ${seed}: a step is 2 px on an axis, not ${jump}`); if (seed === 1) assert.ok(moved > 20, "it walks: " + moved);
  }
  const b = scene({ adults: 1, focus: "tile:0" }); b.props.regions.residents[0].seed = 7919; const f = await start(b, { t0: 5000 }); const pos = () => logOf(f).regions.find((x) => x.id === "resident" && x.layer !== "chrome").rect.join();
  for (let ms = 40; ms <= 6000; ms += 40) f.frame(5000 + ms); logOf(f);
  withFocus(f, "resident." + b.st.mibis[0].id); let t = 6000; const p0 = (f.frame(5000 + (t += 40)), pos()); for (let i = 0; i < 400; i++) f.frame(5000 + (t += 40)); assert.equal(pos(), p0, "focused: it stands on its pixel");
});

// ---- Station M1 §3: residents with moving sets (stand-in atlases synthesized at the slot sizes; moving-scene.mjs) ----
import { MOVING as MOVING_SETS, movingScene, bootScene, resend, runFrames, STATE, CLIP, ids as movingIds, rule2Run } from "./moving-scene.mjs";
const HOUSE = { adults: 6, juveniles: 5, s05: 1, sleepers: 3 };   // S01 adult ×6, S01 juvenile ×5, S05 juvenile ×1, three bed sleepers breathing
for (const cadence of [[16, 0, 0], [16, 5, 120]]) {
  test(`MOVING (M1 §3): twelve residents with moving sets and three bed sleepers, 30 s of frames every ${cadence[0]} ms${cadence[2] ? " (every 63rd 120 ms late)" : ""}, the top bar live: no frame over 153,600 px, no overflow, at most six residents changed in a frame, nothing off a group tick, no tick over 148,000 px`, { skip }, async () => {
    const f = await bootScene(movingScene("vivarium", HOUSE)); assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0);
    const r = runFrames(f, 30000, { cadence, top: true });
    assert.ok(r.worst <= 153600, `a frame redrew ${r.worst} px`); assert.ok(r.steps <= 6, `${r.steps} residents changed in one frame`); assert.equal(r.offgroup, 0); assert.ok(r.worstTick <= 148000, `a tick of ${r.worstTick} px`); assert.equal(f.invOverflows(), 0);
    console.log(`# the Vivarium (moving, cadence ${cadence.join("/")}): worst frame ${r.worst} px, worst tick ${r.worstTick} px, ${r.deferred} deferred`);
  });
}
test("rule 2 (M1 §3): six adult walkers at 5 px a tick on one group tick with the bed sleepers breathing: the tick stays inside 148,000 px and the budget defers, deterministically", { skip }, async () => {
  const a = await rule2Run("vivarium"), b = await rule2Run("vivarium");
  assert.ok(a.r.worstTick <= 148000, `a tick of ${a.r.worstTick} px`); assert.ok(a.r.deferred > 0, "the budget deferred changes"); assert.equal(a.hash, b.hash, "deterministic"); assert.equal(a.r.deferred, b.r.deferred);
  console.log(`# rule 2: worst tick ${a.r.worstTick} px, ${a.r.deferred} changes deferred in 20 s, worst frame ${a.r.worst} px`);
});
const SPEC_VIV = () => JSON.parse(JSON.stringify(spec));
test("twelve at 160 × 154 (synthesized, S09's size) walking 5 px a tick, groups balanced: no frame over 153,600 px, no overflow, deferrals logged and deterministic (the same case on signed S09 cells: deferred to M3)", { skip }, async () => {
  const sets = (() => { const m = JSON.parse(JSON.stringify(MOVING_SETS)), j = m.S05.juvenile; m.S09 = { species: "S09", native: "right", gait: "walk", adult: { ...JSON.parse(JSON.stringify(j)), walk: { ...j.walk, size: [160, 154] }, walkCycle: { ...j.walkCycle, stride: 15 }, shadow: { walk: [160, 16], close: [304, 24] } } }; return m; })();
  const run = async () => {
    const v = SPEC_VIV(); v.regions.resident.adult = [160, 154];
    const sc = movingScene("vivarium", { adults: 12, vivSpec: v }); sc.props.regions.residents.forEach((r) => { r.moving = { set: "S09", walk: "moving:adult:S09:walk:160x154:species", shadow: "moving:adult:S09:shadow:160x16" }; r.picture = r.picture.replace("144x152", "160x154"); });
    sc.requests = sc.requests.map((q) => (q.size && q.size[0] === 144 ? { ...q, id: q.id.replace("144x152", "160x154"), size: [160, 154] } : q)); sc.requests.push({ kind: "moving", id: "moving:adult:S09:walk:160x154:species" }, { kind: "moving", id: "moving:adult:S09:shadow:160x16" });
    const f = await bootScene(sc, { moving: sets }); assert.deepEqual(f.errors(), []); for (let i = 0; i < 12; i++) assert.ok(f.M._face_test_cell(i) >= 0, "resident " + i + " moves");
    const groups = Array.from({ length: 12 }, (_, i) => f.M._face_test_mv(i, 10)); assert.equal(groups.filter((g) => g === 0).length, 6, "the large residents alternate groups");
    const r = runFrames(f, 30000, { cadence: [16, 5, 120], top: true }); return { r, hash: f.hash() };
  };
  const a = await run(), b = await run();
  assert.ok(a.r.worst <= 153600, `a frame redrew ${a.r.worst} px`); assert.equal(a.r.overflows, 0); assert.equal(a.hash, b.hash); assert.equal(a.r.deferred, b.r.deferred);
  console.log(`# twelve at 160 × 154: worst frame ${a.r.worst} px, worst tick ${a.r.worstTick} px, ${a.r.deferred} deferred (deterministic)`);
});
test("determinism (M1 §3): the same props and frame times give the same hash in two faces; a late frame and fifty frames on give the on-time run's walk, later", { skip }, async () => {
  const run = async (L) => { const f = await bootScene(movingScene("vivarium", HOUSE)); runFrames(f, 6000, { cadence: [40, 0, 0] }); f.frame((f.t += L)); for (let i = 1; i <= 50; i++) f.frame((f.t += 40)); return f.hash(); };
  const a = await run(40), b = await run(40); assert.equal(a, b, "two faces, one walk");
  for (const L of [80, 120, 1000]) assert.equal(await run(L), a, `${L} ms late: fifty frames on, the household is the on-time household, later`);
});
test("motion off (M1 §3): every moving resident stands (curls when asleep), and nothing is redrawn over 10 s", { skip }, async () => {
  for (const time of [12 * 3600, 23 * 3600]) {
    const sc = movingScene("vivarium", { ...HOUSE, time }), f = await bootScene(sc, { motion: false }), M = f.M, I = movingIds("S01", "adult");
    for (let i = 0; i < 12; i++) { const s = STATE(M._face_test_state(i)), r = sc.props.regions.residents[i], set = MOVING_SETS[r.moving.set][r.stage === "juvenile" ? "juvenile" : "adult"].walk.cells;
      assert.equal(s.clip, time > 20 * 3600 ? CLIP.asleep : CLIP.rest); const c = M._face_test_cell(i), name = c < set.length ? set[c] : MOVING_SETS[r.moving.set][r.stage === "juvenile" ? "juvenile" : "adult"].walk.mirror[c - set.length]; assert.equal(name, time > 20 * 3600 ? "curl" : "stand", `resident ${i} at ${time / 3600} h`); }
    const r = runFrames(f, 10000); assert.equal(r.worst, 0, "dirty 0"); void I;
  }
});
// the cell names of a resident's walk atlas (painted, then mirrors)
const cellName = (sc, i, c) => { const r = sc.props.regions.residents[i], w = MOVING_SETS[r.moving.set][r.stage === "juvenile" ? "juvenile" : "adult"].walk; return c < 0 ? `dither ${-1 - c}` : c < w.cells.length ? w.cells[c] : w.mirror[c - w.cells.length] + "*"; };
// sample resident i once a group tick (40 ms frames), recording every change of its cell, until `until` returns true or `ms` pass
const watch = (f, i, ms, until = () => false) => { const out = []; let last = null; for (let t = 0; t < ms; t += 40) { f.frame((f.t += 40)); const c = f.M._face_test_cell(i), s = STATE(f.M._face_test_state(i)); const k = c + ":" + s.clip; if (k !== last) { out.push({ t, c, clip: s.clip, dy: f.M._face_test_mv(i, 4) }); last = k; } if (until(s, c)) break; } return out; };
// a resident's clip, phase, cell, dy and dither level once a group tick, recording each change
const trace = (f, i, ms) => { const out = []; let last = null; for (let t = 0; t < ms; t += 40) { f.frame((f.t += 40)); const s = STATE(f.M._face_test_state(i)), row = { t, clip: s.clip, phase: s.phase, cell: cellName(f.sc, i, f.M._face_test_cell(i)), dy: f.M._face_test_mv(i, 4), level: f.M._face_test_mv(i, 5) }, k = JSON.stringify({ ...row, t: 0 }); if (k !== last) { out.push(row); last = k; } } return out; };
test("rest change (M1 §3, game designer R1; UI/UX asleep in place): awake → asleep by props: crouch 4 ticks lowered 1 px a tick for 2, the dither at levels 4, 8, 12, 16 on four own ticks, curl, the asleep loop 800 ms after; then the wake in reverse", { skip }, async () => {
  const f = await bootScene(movingScene("vivarium", { adults: 1, focus: "tile:0" })); runFrames(f, 3000);
  f.sc.props.regions.residents[0].rest = "asleep"; resend(f);
  watch(f, 0, 20000, (s) => s.clip === CLIP.curl);   // a traveller finishes its trip first
  const tr = trace(f, 0, 2500), crouch = tr.filter((x) => x.clip === CLIP.curl && x.phase === 0), dither = tr.filter((x) => x.clip === CLIP.curl && x.phase === 1), curl = tr.find((x) => x.clip === CLIP.curl && x.phase === 2), asleep = tr.find((x) => x.clip === CLIP.asleep);
  assert.ok(crouch.every((x) => x.cell.replace("*", "") === "crouch"), JSON.stringify(crouch));   // in its facing (a mirror when it faces against its painted way) assert.equal(crouch.at(-1).dy, 2, "lowered 2 px by the end of the crouch");
  assert.deepEqual(dither.map((x) => x.level), [4, 8, 12, 16], "the four levels"); assert.deepEqual(dither.map((x) => x.t - dither[0].t), [0, 80, 160, 240], "one level an own tick (80 ms)");
  assert.equal(curl.cell, "curl"); assert.equal(curl.t - dither[0].t, 320, "curl after the four levels"); assert.equal(asleep.t - curl.t, 800, "the asleep loop 800 ms after the curl");
  f.sc.props.regions.residents[0].rest = "awake"; resend(f);
  const w = trace(f, 0, 2500), wd = w.filter((x) => x.clip === CLIP.wake && x.phase === 0), cr = w.find((x) => x.clip === CLIP.wake && x.phase === 1), st = w.find((x) => x.clip === CLIP.rest);
  assert.deepEqual(wd.map((x) => x.level), [4, 8, 12, 16], "the wake's dither, curl to crouch"); assert.equal(cr.cell.replace("*", ""), "crouch"); assert.equal(cr.dy, 2); assert.equal(st.t - cr.t, 400, "the crouch held 400 ms"); assert.equal(st.cell.replace("*", ""), "stand", "then stand, breathing from b0"); assert.equal(st.dy, 0, "risen to its line");
});
test("asleep in place (UI/UX, M1): a focused sleeper's ring is the feet form on its ink box [x + w/2 − 56, feet − 12, 112, 24], its tag's top feet − 120, and neither moves nor changes over 45 s while stirs fall due (they go to the other sleeper)", { skip }, async () => {
  const sc = movingScene("vivarium", { adults: 2, time: 23 * 3600, focus: "resident:0" }), f = await bootScene(sc);
  const x = f.M._face_test_mv(0, 0), feet = f.M._face_test_mv(0, 1), w = 144;
  f.frame((f.t += 40)); let lg = null; for (let m; (m = f.poll("log"));) lg = m; const ring = lg.regions.find((r) => r.id === "focus" && r.layer === "chrome").rect, tag = lg.regions.find((r) => r.id === "nameTag" && r.layer === "chrome").rect;
  assert.deepEqual(ring, [x + w / 2 - 56, feet - 12, 112, 24], "the ring on the ink box"); assert.equal(tag[1], feet - 120, "the tag over the ink, no lift");
  let stirs1 = 0, prev1 = 0;
  for (let t = 0; t < 45000; t += 40) { f.frame((f.t += 40)); const s0 = STATE(f.M._face_test_state(0)), s1 = STATE(f.M._face_test_state(1)); assert.notEqual(s0.clip, CLIP.stir, "no stir begins on the focused sleeper"); assert.equal(s0.clip, CLIP.asleep); if (s1.clip === CLIP.stir && prev1 !== CLIP.stir) stirs1++; prev1 = s1.clip; }
  assert.ok(stirs1 >= 1, "the due stirs went to the other sleeper: " + stirs1);
  f.poll(); f.sc.props.frame.plate = { text: "" }; resend(f); f.frame((f.t += 40));
  assert.equal(f.M._face_test_mv(0, 0), x); assert.equal(f.M._face_test_mv(0, 1), feet, "its ground point holds");
});
test("focus holds rest changes (game designer R4): a resident focused across its flip shows no curl until focus leaves, then curls on its next own tick; focused 60 s past the flip it curls under the ring; the other's flip is not moved", { skip }, async () => {
  const sc = movingScene("vivarium", { adults: 2, focus: "resident:0" }), f = await bootScene(sc); runFrames(f, 3000);
  for (const r of sc.props.regions.residents) r.rest = "asleep"; resend(f);
  let curled1 = -1;
  for (let t = 0; t < 5000; t += 40) { f.frame((f.t += 40)); assert.ok([CLIP.rest, CLIP.ack, CLIP.hop].includes(STATE(f.M._face_test_state(0)).clip), "no curl under the ring"); if (curled1 < 0 && STATE(f.M._face_test_state(1)).clip === CLIP.curl) curled1 = t; }
  assert.ok(curled1 >= 0, "the other resident curled at its own time");
  sc.props.focus.cur = "tile." + f.sc.st.mibis[0].id; resend(f);
  let curled0 = -1; for (let t = 0; t < 2000 && curled0 < 0; t += 40) { f.frame((f.t += 40)); if (STATE(f.M._face_test_state(0)).clip === CLIP.curl) curled0 = t; }
  assert.ok(curled0 >= 0 && curled0 <= 480, `focus left: it curls on its next own tick (after an acknowledge under way): ${curled0} ms`);
  // focused for 60 s past the flip: it curls at the flip + 60 s, under the ring
  const sc2 = movingScene("vivarium", { adults: 2, focus: "resident:0" }), f2 = await bootScene(sc2); runFrames(f2, 3000);
  sc2.props.regions.residents[0].rest = "asleep"; resend(f2); let at = -1;
  for (let t = 0; t < 62000 && at < 0; t += 40) { f2.frame((f2.t += 40)); if (STATE(f2.M._face_test_state(0)).clip === CLIP.curl) at = t; }
  assert.ok(at >= 60000 && at <= 60200, `under the ring it curls 60 s after its flip: ${at} ms`); assert.ok(STATE(f2.M._face_test_state(0)).focused);
});
test("G10 (M1 §3): twelve awake for 120 s: from 2.0 s on, at every frame, ⌈N/3⌉ ≤ travelling ≤ max(4, ⌈N/2⌉), at most 2 in the air, each resident travels in every 20 s window, no trip ends off its waypoint", { skip }, async () => {
  const sc = movingScene("vivarium", { adults: 6, juveniles: 5, s05: 1, focus: "tile:0" }), f = await bootScene(sc), M = f.M, N = 12, floor = Math.ceil(N / 3), cap = Math.max(4, Math.ceil(N / 2));
  const last = Array(N).fill(0), was = Array(N).fill(false); let minT = 99, maxT = 0, maxAir = 0, gap = 0, ends = 0, starts = 0;
  runFrames(f, 120000, { each: (t) => {
    let trav = 0, air = 0;
    { let n = 0, started = false; for (let i = 0; i < N; i++) { const s = STATE(M._face_test_state(i)); if (s.travelling) n++; if (s.travelling && !was[i]) started = true; } if (started) { starts++; assert.ok(n <= cap, `a start took the travelling count to ${n} (cap ${cap}) at ${t}, look-ahead tick or not`); } }   // the architect's Q7
    for (let i = 0; i < N; i++) { const s = STATE(M._face_test_state(i)); if (s.travelling) { trav++; last[i] = t; } if (s.airborne) air++;
      if (was[i] && !s.travelling) { ends++; assert.deepEqual([M._face_test_mv(i, 0), M._face_test_mv(i, 1)], [M._face_test_mv(i, 8), M._face_test_mv(i, 9)], `resident ${i}'s trip ended off its waypoint at ${t}`); }
      was[i] = s.travelling; if (t > 20000) gap = Math.max(gap, t - last[i]); }
    if (t >= 2000) { minT = Math.min(minT, trav); maxT = Math.max(maxT, trav); } maxAir = Math.max(maxAir, air);
  } });
  assert.ok(minT >= floor, `travelling fell to ${minT} (floor ${floor})`); assert.ok(maxT <= cap, `travelling rose to ${maxT} (cap ${cap})`); assert.ok(maxAir <= 2, `${maxAir} in the air`); assert.ok(gap <= 20000, `a resident rested ${gap} ms`); assert.ok(ends > 100, ends + " trips"); assert.ok(starts > 100);
  console.log(`# G10 over 120 s: travelling ${minT} to ${maxT}, at most ${maxAir} in the air, the longest rest ${gap} ms, ${ends} trips`);
});
test("facing (M1 §1.2): a native-left set shows the mirrored walk cells when facing right and the painted ones when facing left; the curl is never mirrored", { skip }, async () => {
  const left = JSON.parse(JSON.stringify(MOVING_SETS)); left.S01.native = "left";
  for (const [sets, native] of [[MOVING_SETS, 1], [left, 0]]) {
    const sc = movingScene("vivarium", { adults: 3, focus: "tile:0" }), f = await bootScene(sc, { moving: sets }), nb = MOVING_SETS.S01.adult.walk.cells.length, curl = MOVING_SETS.S01.adult.walk.cells.indexOf("curl"); let seen = 0;
    runFrames(f, 20000, { each: () => { for (let i = 0; i < 3; i++) { const c = f.M._face_test_cell(i), fr = f.M._face_test_mv(i, 2); if (c < 0) continue; const mirrored = c >= nb; assert.equal(mirrored, fr !== native, `resident ${i}: cell ${c} facing ${fr ? "right" : "left"} (native ${native ? "right" : "left"})`); seen++; } } });
    assert.ok(seen > 100);
    sc.props.regions.residents.forEach((r) => (r.rest = "asleep")); resend(f); runFrames(f, 15000);
    for (let i = 0; i < 3; i++) assert.ok([curl, curl + 1].includes(f.M._face_test_cell(i)), "asleep: the curl as painted");
  }
});
