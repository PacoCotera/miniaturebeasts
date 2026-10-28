// The Vivarium's whole on the face (lvgl-switch.md §4 V): the words and the binding table (screens/home.c, vivarium_words) on the props views/vivarium-props.mjs gives, in Node on the WebAssembly build: every scene draws without an error or a
// refusal inside the object and picture budgets, with no region departing from vivarium.json (tools/vivarium-regions.mjs, proved here to fail on a moved region), the strip's tiles on listPitch's forms, the keys (the pad is vivarium.json's graph,
// ✓ and ← and the room keys are intents) and the walk: at most six boxes moving on a frame of twelve, no refresh over a quarter of the screen, every resident's feet in the walk ground.
// Skipped when the face has not been built (build.sh).
//   node --test prototypes/face/tests/vivarium.test.mjs
import { test } from "node:test";
import "../../station/tests/fixtures/rooms.mjs";   // the rooms spec for the props builders, as the page registers it
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
const T0 = 1_000_000, R = spec.regions, cfg = (bays) => ({ ...S.DEFAULT_SETTINGS, economy: "decided", rooms: Math.ceil(bays / S.ROOM) });

// ---- scenes: the state through the rules, the props through the view ----
function scene(o = {}) {
  const settings = cfg(Math.max(o.bays ?? 8, ((o.room ?? 0) + 1) * S.ROOM)), st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = 99; st.d = 99; st.s = 99; st.firstMibi = false; st.dock = { docked: !o.away, at: T0 };
  if (o.adults) S.seedAdults(st, "S01", 5, o.adults, settings);
  if (o.young) S.seedAdults(st, "S01", 77, o.young, settings);
  for (const m of st.mibis) m.paint = { state: "landed" };
  for (const m of st.mibis.slice(0, o.waiting ?? 0)) m.paint = { state: "sent" };   // its painting is on its way: the waiting lamp
  for (const m of (o.young ? st.mibis.slice(-o.young) : [])) m.born = st.turn;
  if (o.room != null) { st.face.room = o.room; if (o.move) st.mibis.forEach((m, i) => { m.room = o.room; m.slot = i; }); }   // the room the whole shows (after the seeding: a seed fills the shown room first); move: the seeded mibis live in it
  const sv = { v: 8, seed: 7, wid: "w1", turn: 3, bay: [], mibis: [], carried: (o.carry ?? []).map((i) => st.mibis[i].id), tier: 1, shield: 3 };
  const b = vivariumBuild({ st, sv, settings, docked: S.docked(st), light: o.light ?? "day", focus: o.focus ? (/^(resident|tile)\./.test(o.focus) ? o.focus : o.focus.replace(/^(\w+):(\d+)$/, (_, k, i) => k + "." + st.mibis[+i].id)) : null, seen: null, prev: o.prev ?? null }, spec, frameSpec, homeSpec, J("pods"));
  return { ...b, st };
}
const frameProps = (line = {}) => ({ top: { screen: "vivarium", title: "Vivarium", turn: 4, turnFlash: false, materials: { e: 9, d: 9, s: 9 }, flash: {}, companion: { docked: true, withMibi: null } }, line: { back: "Home", need: "", ...line }, plate: { text: "" } });

// stand-in pictures: a flat block keyed by id, at the size the id names (…:WxH) or the request's
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
function standIn(id, size) { const [w, h] = size, d = new Uint8ClampedArray(w * h * 4), k = hash(id); for (let i = 0; i < w * h; i++) { d[i * 4] = 70 + (k & 127); d[i * 4 + 1] = 70 + ((k >> 7) & 127); d[i * 4 + 2] = 70 + ((k >> 14) & 127); d[i * 4 + 3] = 255; } return { w, h, data: d }; }
const sizeOf = (r) => r.size ?? [16, 16];
async function start(b, { motion = true, t0 = 0, sleepersPainted = false, node = false, rooms = J("rooms"), vspec = spec } = {}) {
  const f = await bootFace(pathToFileURL(dist + (node ? "/node/" : "/")), { test: true });
  f.send({ t: "palette", name: "station", colours: palette }); for (const [n, j] of [["frame", frameSpec], ["vivarium", vspec], ["rooms", rooms]]) assert.equal(f.send({ t: "spec", screen: n, json: j }), 0);
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
  "eight adults, a full room's eight tiles": { bays: 8, adults: 8 },
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
test("the tiles stand on listPitch's compact form: a room's eight places 72 wide on an 80 pitch, whatever the rooms; the room shown's mibis only; a free place draws nothing, a tile in the thumbnail", { skip }, async () => {
  for (const [bays, adults, room, art] of [[8, 5, 0, 5], [8, 8, 0, 8], [16, 12, 0, 8], [16, 12, 1, 4], [8, 1, 0, 1]]) {
    const b = scene({ bays, adults, room }), f = await start(b), lg = logOf(f), items = Array.from({ length: 8 }, (_, i) => listPitch(R.tiles, 8, i));
    assert.equal(b.props.regions.tiles.items.length, 8); assert.equal(items[0][2], 72); for (let i = 0; i < 8; i++) assert.deepEqual(lg.regions.find((r) => r.id === `tile.${i}` && r.layer === "chrome").rect, items[i], `${adults} housed, room ${room}: tile ${i}`);
    assert.equal(lg.regions.filter((r) => r.id.startsWith("tile.") && r.layer === "art").length, art, "a thumbnail a housed mibi of the room shown");
  }
});
test("the departure check bites: a pane moved, a chip and a tile off their pitch, the retired strip drawn, the name tag off the window, a resident out of the walk ground and a word in the window are each found", { skip }, async () => {
  const b = scene({ adults: 4, young: 3, carry: [0, 1], focus: "resident:3" }), f = await start(b), lg = logOf(f), n = b.props.regions.tiles.items.length;
  const bad = (fn) => { const c = JSON.parse(JSON.stringify(lg)); fn(c); return departures(c, spec, b.props.state, b.props.focus.cur, n); };
  assert.deepEqual(departures(lg, spec, "rest", b.props.focus.cur, n), []);
  assert.match(bad((c) => { c.regions.find((r) => r.id === "rooms" && r.layer === "chrome").rect[0] += 8; })[0], /rooms pane/);
  assert.match(bad((c) => { c.regions.find((r) => r.id === "places" && r.layer === "chrome").rect[2] -= 8; })[0], /places pane/);
  assert.match(bad((c) => { c.regions.find((r) => r.id === "chip.1" && r.layer === "chrome").rect[0] += 4; })[0], /chip 1/);
  assert.match(bad((c) => { c.regions.push({ id: "strip", layer: "painted", rect: [16, 488, 992, 64] }); })[0], /strip row is retired/);
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
    assert.match(bad((c) => { const r = c.regions.find((x) => x.id === "bed.sleepers").rect; r[3] = 60; r[1] -= 56; }).join("; "), /sleeper/);
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
test("R5: the focus edges of the rooms design: ◀ from the first place goes to the room shown's chip, ▶ goes chip to chip and from the last chip to the room shown's first place, or nowhere in an empty room; ▲ from a chip goes to the nearest resident, else nowhere; ▼ goes nowhere", { skip }, async () => {
  const b = scene({ adults: 4, young: 3, bays: 16, focus: "tile:0" }), f = await start(b), ids = b.st.mibis.map((m) => m.id), tgt = (m) => m.map((x) => [x.t, x.target]);
  const go = (k) => { const m = key(f, k); if (m[0]?.t === "focus") withFocus(f, m[0].target); return m; };
  assert.deepEqual(b.props.focus.targets.filter((t) => t.group === "room").map((t) => t.id), ["room.0", "room.1", "room.new"]);
  assert.deepEqual(tgt(go("left")), [["focus", "room.0"]], "◀ from the first place: the chip of the room shown");
  assert.deepEqual(tgt(go("right")), [["focus", "room.1"]]); assert.deepEqual(tgt(go("right")), [["focus", "room.new"]]); assert.deepEqual(tgt(go("right")), [["focus", "tile." + ids[0]]], "▶ from the right end: the room shown's first place");
  withFocus(f, "room.0"); assert.deepEqual(key(f, "left"), [], "◀ stops at the first chip"); assert.deepEqual(key(f, "down"), [], "▼ goes nowhere");
  for (const c of ["room.0", "room.1", "room.new"]) { withFocus(f, c); const m = key(f, "up"); assert.ok(m[0]?.t === "focus" && m[0].target.startsWith("resident."), `${c}: ▲ goes to a resident, ${JSON.stringify(m)}`); }
  withFocus(f, "tile." + ids[1]); assert.deepEqual(tgt(go("left")), [["focus", "tile." + ids[0]]], "◀ along the places");
  const e = scene({ adults: 3, bays: 16, room: 1 }), g = await start(e); assert.equal(e.props.state, "empty"); assert.equal(e.props.focus.cur, "room.1", "an empty room puts the ring on its chip");
  withFocus(g, "room.new"); assert.deepEqual(key(g, "right"), [], "▶ from the right end of an empty room: none"); withFocus(g, "room.1"); assert.deepEqual(tgt(key(g, "right")), [["focus", "room.new"]]); assert.deepEqual(key(g, "up"), [], "▲ with no resident: none");
});
test("R5: the ring on a chip lifts it by 2 and draws the round ring on it; the ring on a place lifts that place", { skip }, async () => {
  const b = scene({ adults: 4, bays: 16, focus: "room.1" }), f = await start(b), lg = logOf(f);
  assert.deepEqual(lg.regions.find((r) => r.id === "chip.1" && r.layer === "chrome").rect, [104, 494, 64, 48], "lifted 2"); assert.deepEqual(lg.regions.find((r) => r.id === "chip.0" && r.layer === "chrome").rect, [32, 496, 64, 48]);
  const ring = lg.regions.find((r) => r.id === "focus"); assert.deepEqual(ring.rect, [104 - 5, 494 - 5, 64 + 10, 48 + 10], "the ring is the chip as drawn grown by 5 (fix 14, rule 5)");
  assert.deepEqual(departures(lg, spec, b.props.state, b.props.focus.cur, 8), []);
  const t = scene({ adults: 4, bays: 16, focus: "tile:1" }), g = await start(t), lg2 = logOf(g); assert.deepEqual(lg2.regions.find((r) => r.id === "tile.1" && r.layer === "chrome").rect, [440, 494, 72, 48]); assert.equal(lg2.regions.filter((r) => /^chip\./.test(r.id) && r.layer === "chrome" && r.rect[1] !== 496).length, 0);
});
test("R5: the swap (vivarium.json events.swap): the window and each place's thumbnail cross-dither from the old room's in 16 levels over 200 ms, then the room alone; a place with no picture in either does not dither; with reduced motion it is a cut", { skip }, async () => {
  const old = scene({ adults: 3, bays: 16 }), oldBase = old.props.regions.window.picture, oldThumbs = old.props.regions.tiles.items.map((t) => t.picture);
  const next = scene({ adults: 2, bays: 16, room: 1, move: true, prev: { base: oldBase, tiles: oldThumbs } }), plain = scene({ adults: 2, bays: 16, room: 1, move: true });
  assert.notEqual(next.props.regions.window.picture, oldBase); assert.deepEqual(next.props.regions.tiles.items.map((t) => t.from), oldThumbs);
  const run = async (motion) => {
    const f = await start(next, { motion }); for (const r of old.requests) f.handleOf(r.id, withPolicy((i) => standIn(i, sizeOf(r))));   // the old room's pictures stay on the face while the event runs
    f.send({ t: "event", kind: "dither", target: "window", from: oldBase, ms: 200, hold: 0 }); f.frame(f.t); const n0 = nodesOf(f), mid = (f.frame(f.t += 100), nodesOf(f)), end = (f.frame(f.t += 110), nodesOf(f));
    return { f, n0, mid, end };
  };
  { const { f, n0, mid, end } = await run(true);
    for (const [name, n] of [["at its start", n0], ["half way", mid]]) { assert.ok(at(n, "window.dither") >= 0, `${name}: the window dithers`); assert.ok(at(n, "tile.0.dither") >= 0 && at(n, "tile.1.dither") >= 0, `${name}: the places the old room had dither`); assert.ok(at(n, "tile.2.dither") >= 0 === (oldThumbs[2] !== "" && oldThumbs[2] != null), `${name}: the third place dithers out to clear (the old room had a mibi there, this one none)`); assert.equal(at(n, "tile.5.dither"), -1, `${name}: a place empty in both does not dither`); }
    assert.equal(at(end, "window.dither"), -1, "after 200 ms: the dither is gone"); assert.equal(at(end, "tile.0.dither"), -1);
    const ref = await start(plain); assert.equal(f.hash(), ref.hash(), "after the swap the whole is the room's own, as if it had always been shown"); }
  { const { n0, mid } = await run(false); assert.equal(at(n0, "window.dither"), -1, "reduced motion: a cut"); assert.equal(at(mid, "tile.0.dither"), -1); }
});
test("an empty whole has no ring, no ✓ cap and no pad; ← and the room keys still say their intents on the room", { skip }, async () => {
  const b = scene({ bays: 6 }), f = await start(b); assert.equal(b.props.focus.cur, "room");
  for (const k of ["up", "down", "left", "right"]) assert.deepEqual(key(f, k), [], k);
  assert.deepEqual(key(f, "back").map((x) => [x.target, x.verb]), [["room", "back"]]);
});
// one group tick a frame at most: a late frame steps the next group only, and the time past that tick is dropped by moving the walk's origin later in whole ticks
test("a late frame steps one group, and the walk after it is the walk, later", { skip }, async () => {
  const run = async (L) => {
    const f = await start(scene({ bays: 8, adults: 8 }), { t0: 5000 }); for (let t = 40; t <= 4000; t += 40) f.frame(5000 + t);   // the walk is under way (they idle for the first two seconds)
    f.frame(5000 + 4000 + L); const steps = f.M._face_test_steps(), a = dirty(f); for (let i = 1; i <= 50; i++) f.frame(5000 + 4000 + L + 40 * i);
    return { steps, a, hash: f.hash() };
  };
  const base = await run(40);
  for (const L of [80, 120, 1000]) { const r = await run(L); assert.ok(r.steps <= 6, `a frame ${L} ms late stepped ${r.steps} residents`); assert.ok(r.a <= 153600, `a frame ${L} ms late redrew ${r.a} px`); assert.equal(r.hash, base.hash, `${L} ms late: fifty frames on, the walk is the walk (one tick a frame), later`); console.log(`# the Vivarium's late frame (${L} ms): ${r.steps} steps, ${r.a} px`); }
});
// the top bar live on a late frame: the counters change and flash on the frame that is late, which is the worst case for the number of areas LVGL lists
test("a late walk frame with the top bar live (counters and their flashes changing) stays inside 153,600 px and LVGL's invalid-area buffer", { skip }, async () => {
  const f = await start(scene({ bays: 8, adults: 8 }), { t0: 5000 }), M = f.M, base = f.build; let worst = 0, areas = 0, k = 0;
  const MAT = [{ e: 14, d: 16, s: 10 }, { e: 2, d: 6, s: 9 }], top = (m) => ({ ...frameProps().top, materials: m, flash: { e: true, d: true, s: true } });
  for (let t = 21; t < 30000; t += 16, k++) {   // the brief's cadence: 16 ms frames, every 63rd 120 ms late, 30 s
    const late = k % 63 === 62; if (late) { t += 120; assert.equal(f.props({ screen: "vivarium", ...base.props, motion: true, frame: { ...frameProps(base.line), top: top(MAT[(k / 63 | 0) % 2]) } }), 0, f.errors().join("; ")); }
    f.frame(5000 + t); const s = dirty(f), n = M._face_dirty_count(); assert.ok(s <= 153600, `${late ? "late " : ""}frame at ${t}: ${s} px`); assert.ok(n <= M._face_inv_cap(), `${n} flushes outside the cap`);
    if (late && s > worst) { worst = s; areas = n; }
  }
  assert.equal(f.invOverflows(), 0, "no overflow of LVGL's invalid areas"); console.log(`# the Vivarium's late frame with the top bar live: worst ${worst} px in ${areas} flushes, ${f.invOverflows()} overflows`);
});
const WALKS = { "eight adults": { bays: 8, adults: 8 }, "four adults and four juveniles": { bays: 8, adults: 4, young: 4 }, "eight, one focused": { bays: 8, adults: 8, focus: "resident:5" }, "eight, three waiting": { bays: 8, adults: 8, waiting: 3 }, "eight adults, the ring on a tile": { bays: 8, adults: 8, focus: "tile:3" }, "eight, two asleep on the bed": { bays: 8, adults: 8, carry: [0, 1] }, "eight, one focused, seeds whose feet cross": { bays: 8, adults: 8, focus: "resident:5", seeds: [64845, 5640, 43497, 5522, 42627, 49915, 953, 51488] } };   // a room holds eight: the window shows the room shown
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
test("a walking resident keeps its box in 16..1008 and its feet in the room's levels (the rows from the highest level's top to 471), never meets the keep-out zone, never stops short of the ground, steps 1 px at a time (an adult's speed, rules.walk.speed), and a focused one stands still", { skip }, async () => {
  const G = R.resident.walk.ground, K = R.resident.walk.keepOut, top = Math.min(...J("rooms").rooms.roots.levels.map((l) => Math.min(...l.top))) - 80;   // the whole is the painting less 80 rows
  for (let seed = 1; seed <= 12; seed++) {
    const b = scene({ adults: 1, focus: "tile:0" }); b.props.regions.residents[0].seed = seed * 7919;
    const f = await start(b, { t0: 5000 }); let last = null, jump = 0, moved = 0;
    for (let ms = 40; ms <= 30000; ms += 40) {
      f.frame(5000 + ms); const lg = logOf(f), r = lg?.regions.find((x) => x.id === "resident" && x.layer !== "chrome")?.rect; if (!r) continue;
      const [x, y, w, h] = r, feet = y + h; assert.ok(x >= G[0] && x + w <= G[0] + G[2] && feet >= top && feet <= G[1] + G[3], `seed ${seed} at ${ms}: ${r}`); assert.ok(!(x + w > K[0] && feet > K[1]), `seed ${seed} at ${ms}: ${r} meets the keep-out zone`);
      if (last && (last[0] !== x || last[1] !== y)) { moved++; jump = Math.max(jump, Math.abs(last[0] - x), Math.abs(last[1] - y)); } last = [x, y];
    }
    assert.ok(jump <= 1, `seed ${seed}: a step is 1 px on an axis, not ${jump}`); if (seed === 1) assert.ok(moved > 20, "it walks: " + moved);
  }
  const b = scene({ adults: 1, focus: "tile:0" }); b.props.regions.residents[0].seed = 7919; const f = await start(b, { t0: 5000 }); const pos = () => logOf(f).regions.find((x) => x.id === "resident" && x.layer !== "chrome").rect.join();
  for (let ms = 40; ms <= 6000; ms += 40) f.frame(5000 + ms); logOf(f);
  withFocus(f, "resident." + b.st.mibis[0].id); let t = 6000; const p0 = (f.frame(5000 + (t += 40)), pos()); for (let i = 0; i < 400; i++) f.frame(5000 + (t += 40)); assert.equal(pos(), p0, "focused: it stands on its pixel");
});

// ---- Station M1 §3: residents with moving sets (stand-in atlases synthesized at the slot sizes; moving-scene.mjs) ----
import { MOVING as MOVING_SETS, movingScene, bootScene, resend, runFrames, STATE, CLIP, ids as movingIds, rule2Run, atlasPicture } from "./moving-scene.mjs";
import { footOf } from "../../station/src/moving.mjs";
import { footprintRing } from "../../ui/rings.mjs";
const HOUSE = { adults: 4, juveniles: 3, s05: 1, sleepers: 3 };   // a room of eight: S01 adult ×4, S01 juvenile ×3, S05 juvenile ×1, three bed sleepers breathing
for (const cadence of [[16, 0, 0], [16, 5, 120]]) {
  test(`MOVING (M1 §3): eight residents with moving sets and three bed sleepers, 30 s of frames every ${cadence[0]} ms${cadence[2] ? " (every 63rd 120 ms late)" : ""}, the top bar live: no frame over 153,600 px, no overflow, at most six residents changed in a frame, nothing off a group tick, no tick over 148,000 px`, { skip }, async () => {
    const f = await bootScene(movingScene("vivarium", HOUSE)); assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0);
    const r = runFrames(f, 30000, { cadence, top: true });
    assert.ok(r.worst <= 153600, `a frame redrew ${r.worst} px`); assert.ok(r.steps <= 6, `${r.steps} residents changed in one frame`); assert.equal(r.offgroup, 0); assert.ok(r.worstTick <= 148000, `a tick of ${r.worstTick} px`); assert.equal(f.invOverflows(), 0);
    console.log(`# the Vivarium (moving, cadence ${cadence.join("/")}): worst frame ${r.worst} px, worst tick ${r.worstTick} px, ${r.deferred} deferred`);
  });
}
test("rule 2 (M1 §3), a room of eight: four adult walkers at 5 px a tick on a group tick with the bed sleepers breathing stay inside the 148,000 px tick; under a 74,000 px budget the budget defers and holds, deterministically", { skip }, async () => {
  const a = await rule2Run("vivarium"); assert.ok(a.r.worstTick <= 148000, `a tick of ${a.r.worstTick} px`);
  const b = await rule2Run("vivarium", 74000), c = await rule2Run("vivarium", 74000);
  assert.ok(b.r.worstTick <= 74000, `a tick of ${b.r.worstTick} px over the lowered budget`); assert.ok(b.r.deferred > 0, "the budget deferred changes"); assert.equal(b.hash, c.hash, "deterministic"); assert.equal(b.r.deferred, c.r.deferred);
  console.log(`# rule 2: worst tick ${a.r.worstTick} px (${a.r.deferred} deferred) at 148,000; ${b.r.worstTick} px, ${b.r.deferred} deferred in 20 s at 74,000`);
});
const SPEC_VIV = () => JSON.parse(JSON.stringify(spec));
test("eight at 160 × 154 (synthesized, S09's size) walking 5 px a tick, groups balanced: no frame over 153,600 px, no overflow, deferrals logged and deterministic (the same case on signed S09 cells: deferred to M3)", { skip }, async () => {
  const sets = (() => { const m = JSON.parse(JSON.stringify(MOVING_SETS)), j = m.S05.juvenile; m.S09 = { species: "S09", native: "right", gait: "walk", adult: { ...JSON.parse(JSON.stringify(j)), walk: { ...j.walk, size: [160, 154] }, walkCycle: { ...j.walkCycle, stride: 15 }, shadow: { walk: [160, 16], close: [304, 24] } } }; return m; })();
  const run = async () => {
    const v = SPEC_VIV(); v.regions.resident.adult = [160, 154];
    const sc = movingScene("vivarium", { adults: 8, vivSpec: v }); sc.props.regions.residents.forEach((r) => { r.moving = { set: "S09", walk: "moving:adult:S09:walk:160x154:species", shadow: "moving:adult:S09:shadow:160x16" }; r.picture = r.picture.replace("144x152", "160x154"); });
    sc.requests = sc.requests.map((q) => (q.size && q.size[0] === 144 ? { ...q, id: q.id.replace("144x152", "160x154"), size: [160, 154] } : q)); sc.requests.push({ kind: "moving", id: "moving:adult:S09:walk:160x154:species" }, { kind: "moving", id: "moving:adult:S09:shadow:160x16" });
    const f = await bootScene(sc, { moving: sets }); assert.deepEqual(f.errors(), []); for (let i = 0; i < 8; i++) assert.ok(f.M._face_test_cell(i) >= 0, "resident " + i + " moves");
    const groups = Array.from({ length: 8 }, (_, i) => f.M._face_test_mv(i, 10)); assert.equal(groups.filter((g) => g === 0).length, 4, "the large residents alternate groups");
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
    assert.equal(sc.props.regions.residents.length, 8); for (let i = 0; i < 8; i++) { const s = STATE(M._face_test_state(i)), r = sc.props.regions.residents[i], set = MOVING_SETS[r.moving.set][r.stage === "juvenile" ? "juvenile" : "adult"].walk.cells;
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
test("asleep in place (UI/UX, M1): a focused sleeper's ring is the footprint of its curl cell on the ground (fix 14), its tag's top feet − 120, and neither moves nor changes over 45 s while stirs fall due (they go to the other sleeper)", { skip }, async () => {
  const sc = movingScene("vivarium", { adults: 2, time: 23 * 3600, focus: "resident:0" }), f = await bootScene(sc);
  const x = f.M._face_test_mv(0, 0), feet = f.M._face_test_mv(0, 1), w = 144;
  f.frame((f.t += 40)); let lg = null; for (let m; (m = f.poll("log"));) lg = m; const ring = lg.regions.find((r) => r.id === "focus" && r.layer === "chrome").rect, tag = lg.regions.find((r) => r.id === "nameTag" && r.layer === "chrome").rect;
  const walk = movingIds("S01", "adult").walk, foot = footOf(walk, atlasPicture(walk), atlasPicture).curl; assert.ok(foot, "the curl cell has a footprint");
  assert.deepEqual(ring, footprintRing(foot, [x, feet - 152, w, 152]), "the ring on the curl cell's footprint, on the ground"); assert.equal(tag[1], feet - 120, "the tag over the ink, no lift");
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
test("G10 (M1 §3): eight awake for 120 s: from 2.0 s on, at every frame, min(⌈N/3⌉, max) ≤ travelling ≤ min(max, max(4, ⌈N/2⌉)), at most 2 in the air, no trip ends off its waypoint", { skip }, async () => {
  const sc = movingScene("vivarium", { adults: 4, juveniles: 3, s05: 1, focus: "tile:0" }), f = await bootScene(sc), M = f.M, N = 8, ceiling = R.rules?.travel?.max ?? spec.rules.travel.max, cap = Math.min(ceiling, Math.max(4, Math.ceil(N / 2))), floor = Math.min(Math.ceil(N / 3), cap);   // the ceiling rules.travel.max (the game designer: 2) holds the floor down with it
  const last = Array(N).fill(0), was = Array(N).fill(false); let minT = 99, maxT = 0, maxAir = 0, gap = 0, ends = 0, starts = 0, lowSince = null, worstDip = 0;
  runFrames(f, 120000, { each: (t) => {
    let trav = 0, air = 0;
    { let n = 0, started = false; for (let i = 0; i < N; i++) { const s = STATE(M._face_test_state(i)); if (s.travelling) n++; if (s.travelling && !was[i]) started = true; } if (started) { starts++; assert.ok(n <= cap, `a start took the travelling count to ${n} (cap ${cap}) at ${t}, look-ahead tick or not`); } }   // the architect's Q7
    for (let i = 0; i < N; i++) { const s = STATE(M._face_test_state(i)); if (s.travelling) { trav++; last[i] = t; } if (s.airborne) air++;
      if (was[i] && !s.travelling) { ends++; assert.deepEqual([M._face_test_mv(i, 0), M._face_test_mv(i, 1)], [M._face_test_mv(i, 8), M._face_test_mv(i, 9)], `resident ${i}'s trip ended off its waypoint at ${t}`); }
      was[i] = s.travelling; if (t > 20000) gap = Math.max(gap, t - last[i]); }
    if (t >= 2000) { if (trav < floor) { lowSince ??= t; worstDip = Math.max(worstDip, t - lowSince + 16); } else lowSince = null; minT = Math.min(minT, trav); maxT = Math.max(maxT, trav); } maxAir = Math.max(maxAir, air);   // with the ceiling at the floor a trip that ends leaves one tick short: the successor starts on the next tick, the cap never passed
  } });
  assert.ok(worstDip <= 64, `travelling fell to ${minT} (floor ${floor}) for ${worstDip} ms`); assert.ok(maxT <= cap, `travelling rose to ${maxT} (cap ${cap})`); assert.ok(maxAir <= 2, `${maxAir} in the air`); assert.ok(ends > 5, ends + " trips"); assert.ok(starts > 5);   // at the game designer's speeds and ceiling a trip lasts tens of seconds: the longest rest is printed, not bounded
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

test("R5: the strip row is two slate panes at the spec's rects: the rooms pane [16, 488, 312, 64] with a chip a room and the new-room chip on [32 + 72i, 496, 64, 48], the places pane [344, 488, 664, 64] with eight places on [360 + 80i, 496, 72, 48]; a housed place names its well by form, a free one is its recess", { skip }, async () => {
  const b = scene({ adults: 4, young: 3, carry: [0, 1], focus: "resident:3", bays: 16 }), f = await start(b), lg = logOf(f), rg = (id, layer) => lg.regions.filter((r) => r.id === id && (!layer || r.layer === layer));
  assert.deepEqual(rg("rooms", "chrome").map((r) => r.rect), [[16, 488, 312, 64]]); assert.deepEqual(rg("places", "chrome").map((r) => r.rect), [[344, 488, 664, 64]]); assert.equal(rg("strip").length, 0, "the strip is retired");
  assert.deepEqual([0, 1, 2].map((i) => rg(`chip.${i}`, "chrome")[0].rect), [[32, 496, 64, 48], [104, 496, 64, 48], [176, 496, 64, 48]], "two rooms and the new-room chip"); assert.equal(rg("chip.3").length, 0);
  assert.deepEqual(rg("chip.2").filter((r) => r.layer !== "chrome").map((r) => r.rect), [[176 + 52, 496 + 4, 8, 8]], "the new-room chip's lamp at chip + [52, 4, 8, 8]; no chip has a picture yet");
  assert.equal(rg("chip.0").filter((r) => r.layer !== "chrome").length, 0, "a room's chip: the recess alone until the art director cuts its picture");
  assert.deepEqual([0, 1, 2, 7].map((i) => rg(`tile.${i}`, "chrome")[0].rect), [0, 1, 2, 7].map((i) => [360 + 80 * i, 496, 72, 48]));
  const T = b.props.regions.tiles.items; T.forEach((t) => assert.equal(t.well, t.state === "free" ? "" : "plate-well-72x48")); assert.equal(b.props.regions.strip, undefined);
  const e = scene({ focus: null, bays: 8 }), g = await start(e), lg2 = logOf(g); assert.equal(lg2.regions.filter((r) => r.id === "tile.0" && r.layer === "painted" && r.rect[2] > 2).length, 0, "a free place draws no well: its recess");
  assert.deepEqual(lg2.regions.filter((r) => r.id === "chip.0" && r.layer === "chrome").map((r) => r.rect), [[32, 496, 64, 48]]);
});

// ---- T-20261018-235: the figure's geometry ----
const FIG = [47, 105, 49, 43];   // an adult's figure as the host measures it: [dx, dy, W, H] in its 144 × 152 picture
// the room data's levels in the whole's coordinates (the window's offset from the painting: the window's top less the painting's first row), as room.c's room_on reads them: ⌈w/4⌉ inside each end of the span, top(fx) <= feet <= bottom, in no keep-out
const ROOMS = J("rooms").rooms, DY = R.window.rect[1] - R.window.painting.rows[0];
const topAt = (l, x) => { let t = l.top[0]; l.x.slice(0, -1).forEach((x0, i) => { if (x >= x0) t = l.top[i]; }); return t; };
const roomOn = (room, lv, fx, feet, w, relaxed = false) => { const l = ROOMS[room].levels[lv], q = relaxed ? 0 : Math.ceil(w / 4), px = fx, py = feet - DY;
  return px >= l.x[0] + q && px <= l.x.at(-1) - q && py >= topAt(l, px) && py <= l.bottom && !l.keepOuts.some(([x, y, kw, kh]) => px >= x && px < x + kw && py >= y && py < y + kh); };
const onJoin = (room, fx, feet) => ROOMS[room].joins.some((j) => fx >= j.rect[0] - 1 && fx <= j.rect[0] + j.rect[2] + 1 && feet - DY >= j.rect[1] - 1 && feet - DY <= j.rect[1] + j.rect[3] + 1);
const feetOf = (rect, fig = FIG) => ({ fx: rect[0] + fig[0] + Math.floor(fig[2] / 2), feetY: rect[1] + fig[1] + fig[3] - 1 });
const withFigure = (b, fig = FIG) => { for (const r of b.props.regions.residents) r.figure = fig; return b; };
test("the ring is (W + 10) × (fh + 10) on the figure's feet, the tag top is feetY + 16 and flips to feetY − H − 34 past the window's foot; the focus target is the figure box", { skip }, async () => {
  let flipped = 0, below = 0; const [W, H] = [FIG[2], FIG[3]], fh = Math.min(16, Math.max(6, 2 * Math.floor((W + 6) / 12)));
  for (let seed = 1; seed <= 40; seed++) {
    const b = withFigure(scene({ adults: 1, focus: "tile:0" })); b.props.regions.residents[0].seed = seed * 104729;
    const f = await start(b, { motion: false, node: true }); withFocus(f, "resident." + b.st.mibis[0].id); const lg = logOf(f) ?? (frames(f), logOf(f));
    const nb = f.nodeBox("g." + b.st.mibis[0].id).box, pic = [nb[0], nb[1] + R.window.rect[1] + 2, nb[2], nb[3]];   // a node box is the window's own; the focused picture is lifted 2 px, the ring and the feet stay on the ground
    const { fx, feetY } = feetOf(pic), ring = lg.regions.find((x) => x.id === "focus").rect, tag = lg.regions.find((x) => x.id === "nameTag" && x.layer === "chrome").rect;
    assert.ok(pic[1] + FIG[1] + H - 1 === feetY, "the picture is placed so its figure's last ink row is the feet");
    assert.deepEqual(ring, [fx - Math.floor(W / 2) - 5, feetY - (fh + 10) / 2, W + 10, fh + 10], `seed ${seed}: the ring on F`); assert.equal(W + 10, 59); assert.equal(fh + 10, 18);
    const win = R.window.rect, flips = feetY + 16 + tag[3] > win[1] + win[3] - 8;
    if (flips) { flipped++; assert.equal(tag[1], feetY - H - 34, `seed ${seed}: the flipped tag`); } else { below++; assert.equal(tag[1], feetY + 16, `seed ${seed}: the tag top`); }
  }
  assert.ok(flipped > 0 && below > 0, `both tag places drawn: ${flipped} flipped, ${below} below`);
});
test("every start over 10,000 seeds is on a level of the room and off the keep-out; waypoints and every 2 px of every path stay on a level (or on its join) over a minute of walking", { skip }, async () => {
  const G = R.resident.walk.ground, K = R.resident.walk.keepOut, W = FIG[2], ok = (rect, loose = false) => { const { fx, feetY } = feetOf(rect), x = fx - Math.floor(W / 2); return x >= G[0] && x + W <= G[0] + G[2] && !(x + W > K[0] && feetY > K[1]) && [0, 1].some((lv) => roomOn("roots", lv, fx, feetY, W, loose)) || (loose && onJoin("roots", fx, feetY)); };
  const rects = (f, b) => b.st.mibis.map((m) => { const bx = f.nodeBox("g." + m.id)?.box; return bx && [bx[0], bx[1] + R.window.rect[1], bx[2], bx[3]]; });   // a node box is the window's (clipped) own
  let n = 0; const b0 = withFigure(scene({ adults: 8, bays: 8, focus: "tile:0" })), f0 = await start(b0, { motion: false, node: true });   // one face, the seeds sent again: a new seed starts from its own seed
  for (let k = 0; k < 1250; k++) {
    b0.props.regions.residents.forEach((r, i) => { r.seed = 1 + k * 8 + i; }); assert.equal(f0.props({ screen: "vivarium", ...b0.props, motion: false, frame: frameProps(b0.line) }), 0); frames(f0);
    for (const r of rects(f0, b0)) { n++; assert.ok(r && ok(r), `a start at ${r} is not walkable`); }
  }
  assert.ok(n >= 10000, n + " starts");
  for (let k = 0; k < 6; k++) {
    const b = withFigure(scene({ adults: 8, bays: 8, focus: "tile:0" })); b.props.regions.residents.forEach((r, i) => { r.seed = 90001 + k * 8 + i; });
    const f = await start(b, { t0: 5000, node: true }); let moved = 0, last = null;
    for (let ms = 40; ms <= 60000; ms += 40) { f.frame(5000 + ms); f.drain?.(); const rs = rects(f, b);
      for (const r of rs) assert.ok(r && ok(r, true), `seed block ${k} at ${ms}: ${r} left the walkable ground`); const key = rs.map((r) => r.join()).join("|"); if (last !== null && key !== last) moved++; last = key; }
    assert.ok(moved > 100, "they walk: " + moved);
  }
});

// ---- R4 (the rooms design §2), T-20261027-317): walk levels and joins. Eight stills (adult figures) in Roots, the whole's coordinates. The runs that count trips take a copy of the spec with the ceiling at 8 and an adult's speed at 6 px a tick (rules.travel.max, rules.walk.speed): the
// rules under test (a point on a level or on its join, the join's ends, the raised cap) do not depend on them, and the real numbers are run in the cases of the ceiling and of the determinism.
const FAST = (() => { const j = JSON.parse(JSON.stringify(spec)); j.rules.travel.max = 8; j.rules.walk.speed.adult = [6, 1]; return j; })();
const W0 = FIG[2], CAP8 = Math.max(1, Math.floor(8 / spec.rules.walk.raisedDiv));
async function levelRun(block, ms, vspec, n = 8, room) {   // one face, n stills with seeds of the block; the trace of every frame: [resident, fx, feet, lv, leg, walking]
  const b = withFigure(scene({ adults: n, bays: 32, room, move: true, focus: "tile:0" })); b.props.regions.residents.forEach((r, i) => { r.seed = 600001 + block * 97 + i * 7919; });
  const f = await start(b, { t0: 5000, node: true, vspec }), out = [];
  for (let t = 40; t <= ms; t += 40) { f.frame(5000 + t); const fr = [];
    b.st.mibis.slice(0, n).forEach((m, i) => { const bx = f.nodeBox("g." + m.id)?.box, st = STATE(f.M._face_test_state(i)); assert.ok(bx, `resident ${i} at ${t}`); const { fx, feetY } = feetOf([bx[0], bx[1] + R.window.rect[1], bx[2], bx[3]]); fr.push([i, fx, feetY, st.lv, st.leg, st.travelling ? 1 : 0]); });
    out.push(fr); }
  return out;
}
const endsOf = (room) => { const j = ROOMS[room].joins[0]; return { up: [j.ends[0][0], j.ends[0][1] + DY], down: [j.ends[1][0], j.ends[1][1] + DY] }; }, ENDS = endsOf("roots");
test("R4: over 2,000 seeded trips in Roots every feet point is on its level (room_on), or on the join during leg 2; some trips climb to the terrace and come back, changing level at a join's end only; the raised count never exceeds max(1, ⌊N/3⌋)", { skip }, async () => {
  let trips = 0, up = 0, down = 0, maxRaised = 0, points = 0;
  for (let block = 0; trips < 2000 && block < 60; block++) {
    const tr = await levelRun(block, 600000, FAST), last = Array(8).fill(null);
    for (const fr of tr) { let raised = 0;
      for (const [i, fx, feet, lv, leg, walking] of fr) { points++;
        if (leg === 2) assert.ok(onJoin("roots", fx, feet), `block ${block}: resident ${i} on leg 2 at ${fx},${feet} is off the join`); else assert.ok(roomOn("roots", lv, fx, feet, W0), `block ${block}: resident ${i} at ${fx},${feet} is off level ${lv} (leg ${leg})`);
        if (lv > 0 || leg === 2 && lv === 0) raised++;   // raised from the start of leg 2 upward to the end of leg 2 downward
        const p = last[i]; if (p && !p[5] && walking) trips++;
        if (p && p[3] !== lv) { const to = lv > 0 ? ENDS.up : ENDS.down; assert.deepEqual([fx, feet], to, `block ${block}: resident ${i} changed level away from the join's end`); if (lv > 0) up++; else down++; assert.equal(p[4], 2, "a change of level ends leg 2"); }
        last[i] = [i, fx, feet, lv, leg, walking]; }
      maxRaised = Math.max(maxRaised, raised); assert.ok(raised <= CAP8, `${raised} on the raised levels (cap ${CAP8})`); }
  }
  assert.ok(trips >= 2000, trips + " trips"); assert.ok(up > 20 && down > 20, `climbs ${up}, descents ${down}`); assert.equal(maxRaised, CAP8, "the cap is reached and not passed");
  console.log(`# R4: ${trips} trips, ${points} feet points, ${up} climbs and ${down} descents, at most ${maxRaised} raised (cap ${CAP8})`);
});
test("R4: proof 2 in every room: in Reeds, Boulders and Ferns, over 300 s, every feet point is on its level, on its join during leg 2, or (legs 1 and 3) on the level with w = 0; a level is changed at that room's join ends only; there are climbs and descents, and the raised count stays within max(1, ⌊8/3⌋)", { skip }, async () => {
  const order = J("rooms").order;
  for (const room of ["reeds", "boulders", "ferns"]) {
    const ends = endsOf(room); let up = 0, down = 0, maxRaised = 0, points = 0;
    for (let block = 0; block < 3; block++) {
      const tr = await levelRun(block, 300000, FAST, 8, order.indexOf(room)), last = Array(8).fill(null);
      for (const fr of tr) { let raised = 0;
        for (const [i, fx, feet, lv, leg, walking] of fr) { points++;
          if (leg === 2) assert.ok(onJoin(room, fx, feet), `${room} block ${block}: resident ${i} on leg 2 at ${fx},${feet} is off the join`); else assert.ok(roomOn(room, lv, fx, feet, 0), `${room} block ${block}: resident ${i} at ${fx},${feet} is off level ${lv} (leg ${leg})`);
          if (lv > 0 || leg === 2 && lv === 0) raised++;
          const p = last[i];
          if (p && p[3] !== lv) { const to = lv > 0 ? ends.up : ends.down; assert.deepEqual([fx, feet], to, `${room} block ${block}: resident ${i} changed level away from the join's end`); if (lv > 0) up++; else down++; }
          last[i] = [i, fx, feet, lv, leg, walking]; }
        maxRaised = Math.max(maxRaised, raised); assert.ok(raised <= CAP8, `${room}: ${raised} on the raised levels (cap ${CAP8})`); }
    }
    assert.ok(up >= 1 && down >= 1, `${room}: climbs ${up}, descents ${down}`);
    console.log(`# R4 ${room}: ${points} feet points, ${up} climbs and ${down} descents, at most ${maxRaised} raised (cap ${CAP8})`);
  }
});
test("R4c: a scene switched from Roots to Reeds (the same residents, ids and seeds) puts every walker on a Reeds level at the first frame after the switch, from its seed", { skip }, async () => {
  const order = J("rooms").order, mk = (room) => { const b = withFigure(scene({ adults: 6, bays: 32, room, move: true, focus: "tile:0" })); b.props.regions.residents.forEach((r, i) => { r.seed = 710001 + i * 7919; }); return b; };
  const rects = (f, b) => b.st.mibis.slice(0, 6).map((m) => { const bx = f.nodeBox("g." + m.id)?.box; return bx && [bx[0], bx[1] + R.window.rect[1], bx[2], bx[3]]; });
  const onReeds = (rs) => rs.map((r) => { const { fx, feetY } = feetOf(r); return [0, 1].some((lv) => ROOMS.reeds.levels[lv] && roomOn("reeds", lv, fx, feetY, W0)); });
  const roots = mk(0), reeds = mk(order.indexOf("reeds")), f = await start(roots, { t0: 5000, node: true });
  for (let t = 40; t <= 20000; t += 40) f.frame(5000 + t);   // Roots, walking for 20 s: the walkers have left their starts
  for (const r of reeds.requests) f.handleOf(r.id, withPolicy((i) => standIn(i, sizeOf(r))));
  assert.equal(f.props({ screen: "vivarium", ...reeds.props, motion: true, frame: frameProps(reeds.line) }), 0, f.errors().join("; ")); f.frame(5000 + 20040);   // the first frame after the switch
  const first = rects(f, reeds), ok = onReeds(first); assert.ok(first.every(Boolean), "six walkers drawn"); assert.deepEqual(ok, ok.map(() => true), `every walker on a Reeds level at the first frame: ${first.map((r) => feetOf(r).fx + "," + (feetOf(r).feetY - DY)).join(" ")}`);
});
test("R4: with the real ceiling and speeds eight stills never travel more than rules.travel.max at once, over 10 minutes, and a level is changed", { skip }, async () => {
  const tr = await levelRun(900, 600000, spec); let maxT = 0, changes = 0, last = null;
  for (const fr of tr) { const n = fr.reduce((a, r) => a + r[5], 0); maxT = Math.max(maxT, n); if (last) fr.forEach((r, i) => { if (r[3] !== last[i][3]) changes++; }); last = fr; }
  assert.ok(maxT <= spec.rules.travel.max, `${maxT} travelling (ceiling ${spec.rules.travel.max})`); assert.equal(maxT, spec.rules.travel.max, "the ceiling is reached"); assert.ok(changes > 0, "a level was changed at the real speeds");
  console.log(`# R4: at the real speeds, travelling at most ${maxT} (ceiling ${spec.rules.travel.max}), ${changes} changes of level in 10 minutes`);
});
test("R4: the walk is the same twice from the same seeds and clock (determinism)", { skip }, async () => {
  const a = await levelRun(5, 120000, FAST), b = await levelRun(5, 120000, FAST);
  assert.deepEqual(a, b, "two runs from the same seeds and clock");
  const c = await levelRun(6, 120000, FAST); assert.notDeepEqual(a, c, "other seeds walk otherwise");
});

test("R4: moving sets change level by the three legs (1 to the join, 2 across, 3 to the target) at the join's ends, climb and come back, never more than the raised cap up, never more than rules.travel.max travelling, and walk the same twice", { skip }, async () => {
  const run = async () => {
    const sc = movingScene("vivarium", { adults: 4, juveniles: 3, s05: 1, focus: "tile:0" }), f = await bootScene(sc), M = f.M, N = 8, fw = sc.props.regions.residents.map((r) => (r.figure ?? [0, 0, r.stage === "juvenile" ? 104 : 144, 152])[2]), prev = Array(N).fill(null), trace = [];
    let up = 0, down = 0, maxRaised = 0, maxT = 0, legs = 0;
    runFrames(f, 900000, { each: (t) => { let raised = 0, trav = 0;
      for (let i = 0; i < N; i++) { const s = STATE(M._face_test_state(i)), x = M._face_test_mv(i, 0) + Math.floor(fw[i] / 2), feet = M._face_test_mv(i, 1), p = prev[i];
        if (s.lv > 0 || (s.leg === 2 && s.lv === 0)) raised++; if (s.travelling) trav++; if (s.leg) legs++;
        if (p) { assert.ok(s.leg === 0 || s.leg >= p.leg, `resident ${i}: leg ${p.leg} to ${s.leg} at ${t}`);
          if (p.lv !== s.lv) { assert.deepEqual([x, feet], s.lv > 0 ? ENDS.up : ENDS.down, `resident ${i} changed level away from a join's end at ${t}`); if (s.lv > 0) up++; else down++; } }
        prev[i] = s; if (t % 400 === 0) trace.push(x, feet, s.lv, s.leg); }
      maxRaised = Math.max(maxRaised, raised); maxT = Math.max(maxT, trav); assert.ok(raised <= Math.max(1, Math.floor(N / spec.rules.walk.raisedDiv)), `${raised} raised at ${t}`); assert.ok(maxT <= spec.rules.travel.max, `${maxT} travelling at ${t}`); } });
    return { up, down, maxRaised, maxT, legs, trace: trace.join() };
  };
  const a = await run(); assert.ok(a.up > 0 && a.down > 0, `climbs ${a.up}, descents ${a.down}`); assert.ok(a.maxT <= spec.rules.travel.max);
  const b = await run(); assert.deepEqual(a, b, "the same twice");
  console.log(`# R4 sets: ${a.up} climbs, ${a.down} descents in 15 minutes, at most ${a.maxRaised} raised, at most ${a.maxT} travelling`);
});

test("the walk of eight figures with their shadow layers: no refresh redraws more than 153,600 px (printed)", { skip }, async () => {
  const b = withFigure(scene({ adults: 8, bays: 8 })), f = await start(b, { t0: 5000 }); let area = 0, steps = 0;
  for (let t = 16; t < 120000; t += 16) { f.frame(5000 + t); area = Math.max(area, dirty(f)); steps = Math.max(steps, f.M._face_test_steps()); }
  assert.ok(area <= 153600, `dirty area ${area}`); assert.ok(steps <= 6, `${steps} residents stepped in one frame`);
  console.log(`# the Vivarium's walk with the shadow layers, twelve figures, frames every 16 ms for 120 s: worst refresh ${area} px (${(100 * area / (1024 * 600)).toFixed(1)}% of the screen), worst ${steps} steps`);
});

test("a moving resident's ring and tag hold still on its atlas figure while its cells breathe, and the ring is the formula's on F", { skip }, async () => {
  const sc = movingScene("vivarium", { adults: 1, focus: "resident:0" }), FIGM = [30, 38, 72, 108]; sc.props.regions.residents[0].figure = FIGM;
  const f = await bootScene(sc, { motion: true }); assert.deepEqual(f.errors(), []);
  runFrames(f, 8000); const seen = new Set(); let rings = 0;
  for (let t = 0; t < 10000; t += 16) { f.frame((f.t += 16)); for (let m; (m = f.poll("log"));) { const ring = m.regions.filter((r) => r.id === "focus").map((r) => r.rect.join()); const tag = m.regions.filter((r) => r.id === "nameTag" && r.layer === "chrome").map((r) => r.rect.join()); if (ring.length) { rings++; seen.add(ring.join("|") + "#" + tag.join("|")); } } }
  assert.ok(rings > 0, "the ring is drawn"); assert.equal(seen.size, 1, "the ring and the tag stay put: " + [...seen].join(" ; "));
  const [W] = [FIGM[2]], fh = Math.min(16, Math.max(6, 2 * Math.floor((W + 6) / 12))), ring = [...seen][0].split("#")[0].split(",").map(Number); assert.deepEqual([ring[2], ring[3]], [W + 10, fh + 10], "the ring is (W + 10) × (fh + 10)");
});

test("an asleep resident with a curl draws the curl in place, its foot on the stand's feet line, and the ring and the tag come from the curl's figure; awake it draws its stand", { skip }, async () => {
  const CF = [10, 2, 34, 28], CP = [57, 36], at = async (asleep) => {
    const b = withFigure(scene({ adults: 1, focus: "tile:0" })), r = b.props.regions.residents[0], id = b.st.mibis[0].id; r.seed = 5 * 104729;
    if (asleep) { r.rest = "asleep"; r.curl = "mibi:S01~c0c0c0c0:adult:57x36"; r.curlFigure = CF; b.requests.push({ kind: "mibi", id: r.curl, size: CP, stage: "adult", species: "S01" }); }
    const f = await start(b, { motion: false, node: true }); withFocus(f, "resident." + id); const lg = logOf(f) ?? (frames(f), logOf(f)), nb = f.nodeBox("g." + id).box.slice(); nb[1] += R.window.rect[1];
    return { nb, ring: lg.regions.find((x) => x.id === "focus").rect, tag: lg.regions.find((x) => x.id === "nameTag" && x.layer === "chrome").rect };
  };
  const awake = await at(false), asleep = await at(true), fa = feetOf([awake.nb[0], awake.nb[1] + 2, 144, 152]), fs = { fx: asleep.nb[0] + CF[0] + Math.floor(CF[2] / 2), feetY: asleep.nb[1] + CF[1] + CF[3] - 1 };
  assert.deepEqual(asleep.nb.slice(2), CP, "the curl's own picture"); assert.deepEqual(awake.nb.slice(2), [144, 152], "awake: its stand");
  assert.equal(fs.feetY, fa.feetY, "the curl's foot is on the stand's feet line"); assert.ok(Math.abs(fs.fx - fa.fx) <= 1, "on the same feet point");
  const fh = Math.min(16, Math.max(6, 2 * Math.floor((CF[2] + 6) / 12))); assert.deepEqual(asleep.ring, [fs.fx - Math.floor(CF[2] / 2) - 5, fs.feetY - (fh + 10) / 2, CF[2] + 10, fh + 10], "the ring on the curl's feet, no lift");
  assert.equal(asleep.tag[1], fs.feetY + 1 - CF[3] - 32, "the tag over the curl, 32 above its top");
});

// ---- R3 (the rooms design): the room's pieces in the glass: back pieces over the base and under every walker, occluders sorted with the walkers by the feet's row ----
const fnv = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
const nodesOf = (f) => logOf(f)?.nodes ?? [], at = (nodes, id) => nodes.findIndex((n) => n[0] === fnv(id)), residents = (nodes) => nodes.filter((n) => n[3] === "resident");
const withFoot = (id, foot) => { const r = J("rooms"); r.rooms.roots.pieces.find((p) => p.id === id).foot = foot; return r; };
test("R3: a walker whose feet are 6 rows above an occluder's foot draws before it, 6 below draws after it, and on a tie the occluder is after", { skip }, async () => {
  const b = scene({ adults: 1, focus: "tile:0" }), probe = await start(b, { motion: false, sleepersPainted: true }), me = residents(nodesOf(probe)); assert.equal(me.length, 1, "one resident");
  const feet = me[0][5] + me[0][7] - 1, dy = -80;   // the node's top and height less 1: the feet's row (the box's bottom edge is the feet + 1); the whole's window is the painting less 80 rows
  const order = async (d) => { const f = await start(b, { motion: false, sleepersPainted: true, rooms: withFoot("roots-sorrel-1", feet - dy + d) }), nodes = nodesOf(f), piece = at(nodes, "p.roots-sorrel-1"), walker = nodes.findIndex((n) => n[3] === "resident"); assert.ok(piece >= 0 && walker >= 0, "both drawn"); assert.deepEqual(f.errors(), []); return piece < walker ? "piece first" : "walker first"; };
  assert.equal(await order(6), "walker first", "the walker's feet are 6 rows above the occluder's foot: the walker draws before it");
  assert.equal(await order(-6), "piece first", "6 rows below: after it");
  assert.equal(await order(0), "walker first", "a tie: the occluder goes after the walker");
});
test("R3: a back piece always draws before every walker; the nodes' names (p.<pieceId>) are stable across two frames, the bed kept in Roots", { skip }, async () => {
  const b = scene({ adults: 6, carry: [0, 1] }), f = await start(b, { motion: true, node: true });
  const n1 = nodesOf(f), back = at(n1, "p.roots-mister"); assert.ok(back >= 0, "the mister is drawn"); assert.ok(at(n1, "p.roots-sorrel-1") >= 0 && at(n1, "p.roots-stone-2") >= 0, "the occluders are drawn");
  assert.ok(at(n1, "p.roots-mist-2") >= 0, "the mist is drawn"); assert.equal(f.nodeOpa("p.roots-mist-2"), 255, "its alpha is in its file (alpha_in_file): no opacity of the placer on it"); assert.equal(f.nodeOpa("p.roots-mister"), 255, "a piece with none is opaque");
  const walkers = n1.map((n, i) => [n, i]).filter(([n]) => n[3] === "resident" || n[3] === "bed.sleepers" || n[3] === "bed"); assert.ok(walkers.length >= 5); assert.ok(walkers.every(([, i]) => back < i && at(n1, "p.roots-mist-2") < i), "the back pieces (the mist too) are before every walker, the bed and its sleepers");
  const ids = (nodes) => nodes.filter((n) => n[3] === "room").map((n) => n[0]).sort((a, c) => a - c);
  frames(f, 3, 40); const n2 = nodesOf(f); assert.deepEqual(ids(n2), ids(n1), "the same pieces, the same names, on the next frames");
  for (const id of ["roots-sorrel-1", "roots-stone-2", "roots-mister"]) assert.ok(ids(n1).includes(fnv("p." + id)), id);
  frames(f, 200, 80); const n3 = nodesOf(f); assert.deepEqual(ids(n3), ids(n1), "and after the walkers have walked on and changed places");
});
test("R3: a room's keep-outs hold for the walkers (the ground point inside the rect), a piece with a null picture keeps its keep-out and draws no node; a room with no bed draws none and keeps no bed keep-out", { skip }, async () => {
  const ROOMS = J("rooms"), r = ROOMS.rooms.reeds, dy = -80, keeps = r.levels.flatMap((l) => l.keepOuts).map((k) => [k[0], k[1] + dy, k[2], k[3]]);
  const b = scene({ adults: 6, room: 1, move: true, focus: "tile:0" }), f = await start(b, { motion: true }); assert.deepEqual(f.errors(), []);
  assert.equal(b.props.regions.room.id, "reeds"); assert.ok(!("bed" in b.props.regions), "no bed outside Roots");
  let n = nodesOf(f); assert.ok(!n.some((x) => x[3] === "bed" || x[3] === "bed.sleepers"), "no bed or sleepers drawn"); assert.equal(at(n, "p.reeds-sedge-1"), -1, "a null picture: no node"); assert.ok(at(n, "p.reeds-sedge-2") >= 0 && at(n, "p.reeds-stone-1") >= 0 && at(n, "p.reeds-raincup") >= 0, "the others are drawn");
  assert.equal(r.pieces.find((p) => p.id === "reeds-sedge-1").picture, null); assert.ok(keeps.length >= 3, "the sedge's keep-out is kept");
  let right = 0;
  for (let i = 0; i < 1500; i++) { frames(f, 1, 80); n = nodesOf(f); if (!n.length) continue; for (const w of residents(n)) { const fx = w[4] + (w[6] >> 1), feet = w[5] + w[7]; if (fx > 752 && feet > 353) right++; for (const k of keeps) assert.ok(!(fx >= k[0] && fx < k[0] + k[2] && feet >= k[1] && feet < k[1] + k[3]), `a walker's ground point (${fx}, ${feet}) is in the keep-out ${k} at step ${i}`); } }
  assert.ok(right > 0, "with no bed, the walkers go where the sleepers' keep-out was");
});
test("R3: each of the four rooms in all four lights draws without an error or a refusal inside the budgets, with no region departing from vivarium.json; only Roots has a bed; the room's pieces are the nodes p.<pieceId> that have a picture", { skip }, async () => {
  const ROOMS = J("rooms");
  for (const [ri, name] of ROOMS.order.entries()) for (const light of ["dawn", "day", "dusk", "night"]) {
    const b = scene({ adults: 6, room: ri, move: true, light, carry: ri === 0 ? [0] : [], focus: "tile:0" }), f = await start(b, { sleepersPainted: true }), lg = logOf(f), id = `${name} ${light}`;
    assert.deepEqual(f.errors(), [], id); assert.equal(f.refused(), 0, id); assert.equal(b.props.regions.room.id, name);
    assert.deepEqual(departures(lg, spec, "rest", b.props.focus.cur, b.props.regions.tiles.items.length, [], name === "roots"), [], id);
    const st = f.stats(); assert.ok(st.pictures <= 200, `${id}: ${st.pictures} pictures`); assert.ok(f.objects() <= 400, `${id}: ${f.objects()} objects`);
    const want = ROOMS.rooms[name].pieces.filter((p) => p.picture).map((p) => fnv("p." + p.id)).sort((a, c) => a - c);
    assert.deepEqual(lg.nodes.filter((n) => n[3] === "room").map((n) => n[0]).sort((a, c) => a - c), want, `${id}: the pieces that have a picture`);
    assert.equal(lg.nodes.some((n) => n[3] === "bed"), name === "roots", `${id}: the bed only in Roots`);
  }
});
