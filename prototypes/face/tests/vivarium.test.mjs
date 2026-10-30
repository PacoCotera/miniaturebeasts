// The Vivarium on the face (the collection v2 design; vivarium.json): screens/vivarium.c (the chip row, the card, the house view, the Tucked away page, the keys) and the room view's field in screens/home.c, on the props
// views/vivarium-props.mjs gives, in Node on the WebAssembly build. Every scene draws without an error or a refusal inside the object and picture budgets, with no region departing from vivarium.json (tools/vivarium-regions.mjs,
// proved here to fail on a moved region); the keys (the pad is vivarium.json's graph with the host's selectors, ✓ and ← and the room keys are intents); the room view's walk at one scale (96/304) inside the clamp, on the room's
// levels, off the bed's keep-out, the focused mibi walking and the carried one paused; the carry's hand, its silhouette and the drop spots; the mark discs; the house view's places and the cold page's boxes.
// The moving sets do not play at the room view's factor: their mechanism (the rest change, G10, facing, a large set's budget) is proved here on Idle's window, the same living-window code at 1:1.
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
import { loadStandSizesFs } from "../../station/tools/stand-layers-fs.mjs";
import { departures } from "../tools/vivarium-regions.mjs";
import { listPitch } from "../../ui/specs/derive.mjs";
import { dirty } from "./dirty.mjs";
loadStandSizesFs();   // the factor views' table (stand-sizes.json), as the page loads it

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist"), built = existsSync(path.join(dist, "face.mjs")), skip = !built && "face not built (prototypes/face/build.sh)";
// The long walk proofs (minutes of seeded walking) run in full before every merge, by the builder and the gate; a pull request into main (MB_CI_FAST=1) skips them: the owner, 2026-10-28, "stop testing everything for everything".
const slow = skip || (process.env.MB_CI_FAST === "1" && "a long walk proof: run in full locally before every merge");
const specs = path.resolve(here, "../../ui/specs/station"), J = (n) => JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8")), frameSpec = J("frame"), spec = J("vivarium"), homeSpec = J("home");
const palette = JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")).colours;
const framesDir = path.resolve(here, "../../workbench/frames");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const T0 = 1_000_000, R = spec.regions, ROOMS = J("rooms").rooms, ORDER = J("rooms").order, WIN = R.window.rect;

// ---- scenes: the state through the rules, the props through the view ----
// o: { rooms, per: [n a room] (or adults: room 0's), young, room (shown), away, carry: [indexes with the Companion], light, view, page, focus ("resident.#i", "house.#i", any id), hand: { i } (a carry of mibi i), pick (index), set(st) }
function scene(o = {}) {
  const rooms = o.rooms ?? 1, settings = { ...S.DEFAULT_SETTINGS, economy: "decided", rooms }, st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = 99; st.d = 99; st.s = 99; st.firstMibi = false; st.dock = { docked: !o.away, at: T0 }; st.rooms = rooms;
  for (let r = 0; r < rooms; r++) { st.face.room = r; const n = (o.per ?? [o.adults ?? 0])[r] ?? 0; if (n) S.seedAdults(st, "S01", 5 + r, n, settings); }
  if (o.young) { st.face.room = 0; S.seedAdults(st, "S01", 77, o.young, settings); for (const m of st.mibis.slice(-o.young)) m.born = st.turn; }
  for (const m of st.mibis) m.paint = { state: "landed" };
  st.face.room = o.room ?? 0; if (o.set) o.set(st, settings);
  const sv = { v: 8, seed: 7, wid: "w1", turn: 3, bay: [], mibis: [], carried: (o.carry ?? []).map((i) => st.mibis[i].id), tier: 1, shield: 3 };
  const idOf = (s) => (s == null ? null : s.replace(/^(\w+)\.#(\d+)$/, (_, k, i) => k + "." + st.mibis[+i].id));
  const carry = o.hand ? { kind: "move", room: o.room ?? 0, view: o.view ?? "room", page: 0, ...o.hand, id: st.mibis[o.hand.i].id } : null;
  const b = vivariumBuild({ st, sv, settings, docked: S.docked(st), light: o.light ?? "day", focus: idOf(o.focus), seen: null, view: o.view ?? "room", page: o.page ?? 0, carry, pick: o.pick != null ? { a: st.mibis[o.pick].id } : null, last: null, motionSets: false }, spec, frameSpec, homeSpec, J("pods"));
  return { ...b, st, settings };
}
const tuck = (n) => (st) => { st.mibis.slice(0, n).forEach((m, i) => { m.tucked = { turn: 3, seq: i + 1, from: 0 }; m.room = m.slot = m.bay = null; }); st.tuckSeq = n; };   // the first n tucked away
const frameProps = (line = {}) => ({ top: { screen: "vivarium", title: "Vivarium", turn: 4, turnFlash: false, materials: { e: 9, d: 9, s: 9 }, flash: {}, companion: { docked: true, withMibi: null } }, line: { back: "Home", need: "", ...line }, plate: { text: "" } });

// stand-in pictures: a flat block keyed by id, at the size the request names (a variant's its base's)
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
function standIn(id, size) { const [w, h] = size, d = new Uint8ClampedArray(w * h * 4), k = hash(id); for (let i = 0; i < w * h; i++) { d[i * 4] = 70 + (k & 127); d[i * 4 + 1] = 70 + ((k >> 7) & 127); d[i * 4 + 2] = 70 + ((k >> 14) & 127); d[i * 4 + 3] = 255; } return { w, h, data: d }; }
const sizeOf = (r) => r.size ?? r.base?.size ?? [16, 16];
async function start(b, { motion = true, t0 = 0, node = false, rooms = J("rooms"), vspec = spec, painted = false } = {}) {
  const f = await bootFace(pathToFileURL(dist + (node ? "/node/" : "/")), { test: true });
  f.send({ t: "palette", name: "station", colours: palette }); for (const [n, j] of [["frame", frameSpec], ["vivarium", vspec], ["rooms", rooms]]) assert.equal(f.send({ t: "spec", screen: n, json: j }), 0);
  for (const px of [14, 15, 16]) for (const id of ["energy", "data", "essence", "cross"]) f.handleOf(`icon:${id}:${px}`, withPolicy((i) => standIn(i, [px, px])));
  for (const id of ["frame-companion-outline-16x24", "frame-companion-solid-16x24", "home-lamp-sky-12x12", "home-lamp-hairline-12x12", "home-lamp-sprout-12x12", "home-lamp-amber-12x12"]) f.handleOf(id, withPolicy((i) => standIn(i, id.includes("16x24") ? [16, 24] : [12, 12])));
  for (const r of b.requests) f.handleOf(r.id, withPolicy((i) => ({ ...standIn(i, sizeOf(r)), ...(painted && /^mibi:/.test(i) ? { status: "master" } : {}) })));
  f.t = t0; f.motion = motion; f.build = b;
  assert.equal(f.props({ screen: "vivarium", ...b.props, motion, frame: frameProps(b.line) }), 0, f.errors().join("; ")); frames(f); return f;
}
const frames = (f, n = 2, dt = 16) => { for (let i = 0; i < n; i++) f.frame((f.t += dt)); };
const logOf = (f) => { let lg = null; for (let m; (m = f.poll("log"));) lg = m; if (lg) f.lastLog = lg; return lg; };   // the face logs a frame it drew; lastLog keeps the latest
const send = (f) => assert.equal(f.props({ screen: "vivarium", ...f.build.props, motion: f.motion, frame: frameProps(f.build.line) }), 0, f.errors().join("; "));
// the host takes each `focus` the face says and sends the props again with the ring there; the face keeps the ring it moved when the props repeat, so a ring set by hand is sent twice
const withFocus = (f, cur) => { f.build.props.focus.cur = ""; send(f); f.build.props.focus.cur = cur; send(f); frames(f); };
const key = (f, k) => { f.send({ t: "key", k }); frames(f); const out = []; for (let m; (m = f.poll());) if (m.t === "focus" || m.t === "intent") out.push(m); else if (m.t === "log") f.lastLog = m; return out; };
const go = (f, k) => { const m = key(f, k); if (m[0]?.t === "focus") { f.build.props.focus.cur = m[0].target; send(f); frames(f); } return m; };
const tgt = (m) => m.map((x) => [x.t, x.target]);
const rg = (lg, id, layer) => lg.regions.filter((r) => r.id === id && (!layer || r.layer === layer));
const hasBed = (b) => (b.props.regions.room?.id ?? "roots") === "roots";
// the window: screen = painting − (cx, 8) (vivarium.json regions.window.painting); a node box is the window's own (its origin [0, 88])
const CX = (room) => ROOMS[room].crop[0], DY = WIN[1] - ROOMS.roots.crop[1];
const boxOf = (f, id) => { const nb = f.nodeBox(id)?.box; return nb && [nb[0] + WIN[0], nb[1] + WIN[1], nb[2], nb[3]]; };

const SCENES = {
  "docked: five at home, two with the Companion": { adults: 4, young: 3, carry: [0, 1] },
  "away: two out with the Companion": { adults: 4, young: 3, carry: [0, 1], away: true },
  "a fresh world's: no mibis, the card's incubator plate": {},
  "one": { adults: 1 },
  "eight: five walk, three rest": { adults: 8 },
  "two rooms, Reeds shown": { rooms: 2, per: [8, 3], room: 1 },
  "four full rooms, Boulders shown": { rooms: 4, per: [8, 8, 8, 8], room: 2 },
  "four full rooms, Ferns shown": { rooms: 4, per: [8, 8, 8, 8], room: 3 },
  "an empty room (Reeds) of two": { rooms: 2, per: [3, 0], room: 1 },
  "the ring on a plate": { adults: 4, focus: "plate.3" },
  "the ring on a chip": { rooms: 2, per: [4, 2], focus: "room.1" },
  "the ring on All rooms": { adults: 4, focus: "room.all" },
  "by the light of night": { adults: 4, young: 3, carry: [0, 1], light: "night" },
  "a carry: the hand on its own place": { adults: 5, hand: { i: 1 } },
  "a carry: the hand on a drop spot": { adults: 5, hand: { i: 1 }, focus: "drop.2" },
  "a carry: the hand on another mibi (a swap)": { adults: 5, hand: { i: 1 }, focus: "resident.#3" },
  "a carry into a full room": { rooms: 2, per: [8, 3], hand: { i: 9, room: 0 }, room: 0 },
  "the pick of two": { adults: 5, pick: 1, focus: "resident.#3" },
  "the house view": { rooms: 2, per: [8, 3], view: "house", focus: "house.#2" },
  "the house view, a traveller and a carry": { rooms: 2, per: [6, 3], carry: [2], view: "house", hand: { i: 4, view: "house" }, focus: "house.#0" },
  "the Tucked away page": { adults: 6, set: tuck(3), view: "tucked", focus: "tucked.#1" },
  "the Tucked away page, two pages": { rooms: 2, per: [8, 4], set: tuck(10), view: "tucked", page: 1 },
  "a mibi coming out": { adults: 4, set: (st) => { const m = st.mibis[3]; m.tucked = { turn: 3, seq: 1, from: 0, out: st.turn, spot: 1 }; } },
};
for (const [name, o] of Object.entries(SCENES)) {
  test(`the Vivarium, ${name}: draws without an error or a refusal inside the budgets, with no region departing from vivarium.json`, { skip }, async () => {
    const b = scene(o), f = await start(b, { motion: false }); assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0);
    const lg = logOf(f); assert.deepEqual(departures(lg, spec, b.props, hasBed(b)), []);
    const st = f.stats(); assert.ok(st.pictures <= 200, `${st.pictures} pictures`); assert.ok(f.objects() <= 400, `${f.objects()} objects`);
    assert.ok(JSON.stringify(b.props).length + JSON.stringify(b.line).length < 32 * 1024, "props under 32 KiB");
    if (b.props.view === "room" && b.props.state === "empty") assert.ok(!lg.regions.some((r) => ["resident", "nameTag"].includes(r.id)), "the empty room draws no people and no tag");
    assert.equal(rg(lg, "nameTag").length > 0, b.props.view === "room" && /^(resident|drop)\./.test(b.props.focus.cur), "the name tag stands only on a mibi or the hand in the room view");
    assert.equal(rg(lg, "drops").length > 0, b.props.view === "room" && (b.props.regions.drops?.items ?? []).length > 0, "the drop spots only while carrying, one a free place"); if ((b.props.regions.drops?.items ?? []).length) assert.ok(b.props.regions.carry, "drop spots with a carry only");
  });
}

test("the departure check bites: a chip off its pitch, the card and a plate moved, a lit chip's underline missing, the retired strip and tiles drawn, the bed moved, the name tag off the window, a resident out of the walk's clamp and a word in the window are each found", { skip }, async () => {
  const b = scene({ rooms: 2, per: [5, 2], focus: "resident.#2" }), f = await start(b, { motion: false }), lg = logOf(f);
  const bad = (fn) => { const c = JSON.parse(JSON.stringify(lg)); fn(c); return departures(c, spec, b.props, true).join("; "); };
  assert.deepEqual(departures(lg, spec, b.props, true), []);
  assert.match(bad((c) => { c.regions.find((r) => r.id === "chip.1" && r.layer !== "type").rect[0] += 4; }), /chip 1/);
  assert.match(bad((c) => { c.regions.find((r) => r.id === "card" && r.layer === "chrome").rect[0] += 8; }), /the card/);
  assert.match(bad((c) => { c.regions.find((r) => r.id === "plate.2" && r.layer === "chrome").rect[1] += 4; }), /plate 2/);
  assert.match(bad((c) => { c.regions = c.regions.filter((r) => r.id !== "chip.0.lit"); }), /underline missing/);
  assert.match(bad((c) => { c.regions.push({ id: "strip", layer: "painted", rect: [16, 488, 992, 64] }); }), /no strip/);
  assert.match(bad((c) => { c.regions.push({ id: "tiles", layer: "chrome", rect: [360, 496, 72, 48] }); }), /no tiles/);
  assert.match(bad((c) => { c.regions.find((r) => r.id === "bed" && r.layer !== "type").rect[0] += 8; }), /bed/);
  assert.match(bad((c) => { c.regions.find((r) => r.id === "nameTag" && r.layer === "chrome").rect[0] = 2; }), /name tag/);
  assert.match(bad((c) => { c.regions.find((x) => x.id === "resident" && x.layer === "art").rect[0] = -20; }), /clamp|leaves/);
  assert.match(bad((c) => { c.regions.push({ id: "word", layer: "type", rect: [300, 200, 80, 20] }); }), /no word/);
  const h = scene({ adults: 4, view: "house" }), g = await start(h, { motion: false }), lh = logOf(g), badH = (fn) => { const c = JSON.parse(JSON.stringify(lh)); fn(c); return departures(c, spec, h.props, true).join("; "); };
  assert.deepEqual(departures(lh, spec, h.props, true), []); assert.match(badH((c) => { c.regions.find((r) => r.id === "band.2").rect[1] += 4; }), /band 2/);
  const t = scene({ adults: 4, set: tuck(2), view: "tucked" }), k = await start(t, { motion: false }), lt = logOf(k), badT = (fn) => { const c = JSON.parse(JSON.stringify(lt)); fn(c); return departures(c, spec, t.props, true).join("; "); };
  assert.deepEqual(departures(lt, spec, t.props, true), []); assert.match(badT((c) => { c.regions = c.regions.filter((r) => r.id !== "rail.1"); }), /rail 1/); assert.match(badT((c) => { c.regions.find((r) => r.id === "tucked").rect[1] -= 6; }), /cold figures/);
});

test("the keys: ✓ and ← and the room keys are intents on the focused target; the Companion's key is not the Vivarium's", { skip }, async () => {
  const b = scene({ adults: 4, young: 3, carry: [0, 1] }), f = await start(b, { motion: false }), cur0 = b.props.focus.cur; assert.match(cur0, /^resident\./);
  for (const [k, verb] of [["confirm", "confirm"], ["back", "back"], ["home", "room:home"], ["research", "room:research"], ["library", "room:library"], ["habitat", "room:habitat"]]) { const m = key(f, k); assert.deepEqual(m.map((x) => [x.t, x.screen, x.target, x.verb]), [["intent", "vivarium", cur0, verb]], k); }
  assert.deepEqual(key(f, "dock"), []);
  withFocus(f, "plate.2"); assert.deepEqual(key(f, "confirm").map((x) => [x.target, x.verb]), [["plate.2", "confirm"]], "✓ on a plate: its intent");
  withFocus(f, "room.all"); assert.deepEqual(key(f, "confirm").map((x) => [x.target, x.verb]), [["room.all", "confirm"]]);
});

test("the focus path at rest (§3): ◀▶▲▼ walk the present mibis nearest ahead; ▶ with nothing ahead goes to the card's first live plate, ▲ with nothing above to the lit chip; ▲▼ walk the plates (held ones too) and ◀ comes back to the card's mibi; the chips go ◀▶ and ▼ into the field", { skip }, async () => {
  const b = scene({ rooms: 2, per: [5, 2] }), f = await start(b, { motion: false, node: true }), res = b.props.regions.residents.filter((r) => r.shown !== false).map((r) => r.id);
  const at = (id) => boxOf(f, "g." + id), right = res.slice().sort((a, c) => at(c)[0] - at(a)[0])[0], top = res.slice().sort((a, c) => at(a)[1] + at(a)[3] - at(c)[1] - at(c)[3])[0];
  const rs = b.props.focus.resolve; assert.match(rs["plate.first"], /^plate\.\d$/); assert.equal(rs["room.lit"], "room.0");
  withFocus(f, "resident." + right); assert.deepEqual(tgt(go(f, "right")), [["focus", rs["plate.first"]]], "▶ from the rightmost: the first live plate");
  withFocus(f, "resident." + top); assert.deepEqual(tgt(go(f, "up")), [["focus", "room.0"]], "▲ from the topmost: the lit chip");
  withFocus(f, "resident." + top); const m = key(f, "down"); assert.ok(m[0]?.t === "focus" && /^resident\./.test(m[0].target) && m[0].target !== "resident." + top, "▼: the nearest mibi below");
  withFocus(f, "plate.0"); assert.deepEqual(key(f, "up"), [], "the plates stop at the first"); for (let k = 1; k < 6; k++) assert.deepEqual(tgt(go(f, "down")), [["focus", "plate." + k]], "▼ walks the plates, held ones included");
  assert.deepEqual(key(f, "down"), [], "and stop at the last"); assert.deepEqual(tgt(go(f, "left")), [["focus", rs["card.of"]]], "◀ from a plate: the card's mibi"); assert.deepEqual(key(f, "right").length <= 1, true);
  withFocus(f, "plate.3"); assert.deepEqual(key(f, "right"), [], "▶ from a plate: nothing");
  withFocus(f, "room.0"); assert.deepEqual(key(f, "left"), [], "◀ stops at the first chip");
  for (const want of ["room.1", "room.new", "room.all", "room.tucked"]) assert.deepEqual(tgt(go(f, "right")), [["focus", want]]);
  assert.deepEqual(key(f, "right"), [], "▶ stops at Tucked away"); assert.deepEqual(key(f, "up"), [], "▲ from a chip: nothing");
  withFocus(f, "room.0"); const d = key(f, "down"); assert.ok(d[0]?.t === "focus" && /^resident\./.test(d[0].target), "▼ from a chip: the nearest mibi in the field");
});

test("the nudge (§3): a press with nothing beyond moves the ring 4 px toward it until the next key; ✓ on a room's chip, which has no ✓ cap, nudges it down", { skip }, async () => {
  const b = scene({ rooms: 2, per: [4, 2], focus: "room.0" }), f = await start(b, { motion: false }); let last = rg(logOf(f), "focus")[0]?.rect;
  const ring = () => { frames(f); logOf(f); return rg(f.lastLog, "focus")[0]?.rect; }, r0 = ring(); void last; assert.ok(r0, "the ring on the chip");
  assert.deepEqual(key(f, "left"), []); frames(f); assert.deepEqual(ring(), [r0[0] - 4, r0[1], r0[2], r0[3]], "◀ with nothing beyond: 4 px left");
  assert.deepEqual(tgt(key(f, "right")), [["focus", "room.1"]]); f.build.props.focus.cur = "room.1"; send(f); frames(f); withFocus(f, "room.0"); assert.deepEqual(ring(), r0, "the next key: back in place");
  key(f, "confirm"); frames(f); assert.deepEqual(ring(), [r0[0], r0[1] + 4, r0[2], r0[3]], "✓ on a room's chip: nudged down");
});

test("the chip row: the rooms on the row's pitch, All rooms and Tucked away at theirs, the lit chip's 2 px underline at y 80; Add a room below four rooms only", { skip }, async () => {
  for (const [rooms, per, room] of [[1, [4], 0], [2, [4, 2], 1], [4, [8, 8, 8, 8], 3]]) {
    const b = scene({ rooms, per, room }), f = await start(b, { motion: false }), lg = logOf(f), items = b.props.regions.rooms.items;
    assert.deepEqual(items.map((i) => i.kind), [...Array(rooms).fill("room"), ...(rooms < 4 ? ["new"] : []), "all", "tucked"]);
    for (let i = 0; i < rooms; i++) assert.deepEqual(rg(lg, `chip.${i}`).find((r) => r.layer !== "type").rect, listPitch(R.chips, 4, i), `${rooms} rooms: chip ${i}`);
    assert.deepEqual(rg(lg, `chip.${items.length - 2}`).find((r) => r.layer === "chrome").rect, R.chips.all); assert.deepEqual(rg(lg, `chip.${items.length - 1}`).find((r) => r.layer === "chrome").rect, R.chips.tucked);
    assert.deepEqual(rg(lg, `chip.${room}.lit`, "chrome").map((r) => r.rect), [[listPitch(R.chips, 4, room)[0], 80, 128, 2]], "the room shown's chip is lit");
    assert.deepEqual(departures(lg, spec, b.props, hasBed(b)), []);
  }
});

test("the card: its six plates on their 36 px pitch, the portrait standing on the place's foot, the name, and the looks in 120 px lines, three at most (the last looks left off when they take more)", { skip }, async () => {
  const b = scene({ adults: 8 }), f = await start(b, { motion: false }), lg = logOf(f), P = R.card.plates;
  for (let k = 0; k < 6; k++) { const held = b.props.regions.card.plates[k].held, r = rg(lg, `plate.${k}`, "chrome")[0]; if (held) assert.ok(!r, `plate ${k} is held: no hairline`); else assert.deepEqual(r.rect, [P.first[0], P.first[1] + P.pitch * k, P.first[2], P.first[3]]); assert.equal(rg(lg, `plate.${k}.verb`, "type")[0].rect[0], P.first[0] + P.verb, `plate ${k} verb`); }
  const por = rg(lg, "card.portrait", "art")[0].rect; assert.equal(por[1] + por[3], R.card.place[1] + R.card.place[3], "the portrait's foot on the place's"); assert.equal(por[2], R.card.picture[0]);
  for (const looks of [["stripes and patches", "charcoal and ash", "between"], ["a very long look of speckles", "another long look of bands", "a third long look of dots", "a fourth"], ["one"]]) {
    b.props.regions.card.looks = looks; f.build = b; send(f); frames(f); const L = rg(logOf(f), "card.looks", "type");
    assert.equal(L.length, 1); const r = L[0].rect; assert.ok(r[0] >= R.card.looks.rect[0] && r[0] + r[2] <= R.card.looks.rect[0] + R.card.looks.rect[2], `the looks ${r} are wider than their 120 px column`); assert.ok(r[3] <= 3 * R.card.looks.pitch + 2, `the looks take more than three lines: ${r}`);
    assert.deepEqual(departures(logOf(f) ?? lg, spec, b.props, true).filter((x) => /card/.test(x)), []);
  }
});

test("the room view's focused mibi keeps walking (§3: no hold under the ring), its ring and tag going with it", { skip }, async () => {
  const b = scene({ adults: 1, focus: "resident.#0" }); b.props.regions.residents[0].seed = 7919;
  const f = await start(b, { t0: 5000, node: true }), id = b.st.mibis[0].id, seen = new Set(), rings = new Set();
  for (let ms = 40; ms <= 30000; ms += 40) { f.frame(5000 + ms); seen.add(boxOf(f, "g." + id).join()); const lg = logOf(f); if (lg) for (const r of rg(lg, "focus")) rings.add(r.rect.join()); }
  assert.ok(seen.size > 20, `the focused mibi walks: ${seen.size} places`); assert.ok(rings.size > 10, "its ring goes with it");
});

test("the carry (§3): the carried one pauses where it was picked, the point it left shows its silhouette (carry.from) while the hand is elsewhere, the hand draws it raised 8 px on the drop spot's foot point with its ring; the others keep walking", { skip }, async () => {
  const b = scene({ adults: 5, hand: { i: 1 }, focus: "drop.2" }), id = String(b.st.mibis[1].id), f = await start(b, { t0: 5000, node: true });
  assert.equal(b.props.regions.carry.id, id); assert.ok(b.props.regions.residents.find((r) => r.id === id).carried);
  const pick = boxOf(f, "g." + id), others = b.props.regions.residents.filter((r) => r.id !== id && r.shown !== false).map((r) => r.id), o0 = others.map((x) => boxOf(f, "g." + x)?.join());
  let lg = logOf(f) ?? (frames(f), logOf(f)); assert.deepEqual(rg(lg, "carry.from", "art").map((r) => r.rect), [pick], "its silhouette at the point it left");
  const k = 2, [px, py] = ROOMS.roots.drops[k], fx = px - CX("roots"), feet = py - ROOMS.roots.crop[1] + WIN[1], hand = boxOf(f, `g.${id}.hand`);
  assert.ok(hand, "the hand's picture"); assert.equal(hand[0] + (hand[2] >> 1), fx, "on the drop spot's foot x"); assert.equal(hand[1] + hand[3] - 1, feet - R.resident.carry.lift, "raised 8 px over its foot point");
  const ring = rg(lg, "focus")[0].rect; assert.equal(ring[0] + (ring[2] >> 1), fx); assert.equal(ring[1] + ring[3] / 2, feet - R.resident.carry.lift, "the ring raised with it, on the raised feet");
  for (let ms = 40; ms <= 20000; ms += 40) f.frame(5000 + ms);
  assert.deepEqual(boxOf(f, "g." + id), pick, "the carried one holds"); assert.ok(others.map((x) => boxOf(f, "g." + x)?.join()).some((v, i) => v !== o0[i]), "the others walk on");
  withFocus(f, "resident." + id); lg = logOf(f); assert.equal(rg(lg, "carry.from").length, 0, "the hand on its own place: no silhouette"); assert.equal(f.nodeBox(`g.${id}.hand`), null);
  const e = scene({ adults: 5 }), g = await start(e, { motion: false }); assert.equal(rg(logOf(g), "drops").length, 0, "no carry: no drop spots");
});

test("the set-down (§3): ✓ with the hand on a drop spot stands the mibi on that spot's foot point once the props have no carry, and it resumes from there; in a swap the other one stands where the carried one was picked; any other key leaves nothing pending", { skip }, async () => {
  const lift = (b) => { delete b.props.regions.carry; b.props.regions.drops = { items: [] }; for (const r of b.props.regions.residents) delete r.carried; };   // the host's answer to the intent: the carry ended (the same room)
  { const b = scene({ adults: 5, hand: { i: 1 }, focus: "drop.2" }), id = String(b.st.mibis[1].id), f = await start(b, { t0: 5000, node: true }), [px, py] = ROOMS.roots.drops[2], fx = px - CX("roots"), feet = py + DY;
    assert.deepEqual(key(f, "confirm").map((x) => [x.target, x.verb]), [["drop.2", "confirm"]]); lift(b); b.props.focus.cur = "resident." + id; send(f); frames(f);
    const bx = boxOf(f, "g." + id); assert.equal(bx[0] + (bx[2] >> 1), fx, "on the spot's foot x");
    assert.ok(Math.abs(bx[1] + bx[3] - feet) <= 1, `its feet on the spot's foot point: ${bx} at ${feet}`);
    const at0 = bx.join(); let moved = false; for (let ms = 40; ms <= 20000 && !moved; ms += 40) { f.frame(f.t += 40); moved = boxOf(f, "g." + id).join() !== at0; } assert.ok(moved, "it resumes its walk from there"); }
  { const b = scene({ adults: 5, hand: { i: 1 }, focus: "resident.#3" }), a = String(b.st.mibis[1].id), o = String(b.st.mibis[3].id), f = await start(b, { motion: false, node: true }), pa = boxOf(f, "g." + a), po = boxOf(f, "g." + o);
    key(f, "confirm"); lift(b); send(f); frames(f);
    const na = boxOf(f, "g." + a), no = boxOf(f, "g." + o); assert.equal(na[0] + (na[2] >> 1), po[0] + (po[2] >> 1), "the carried one where the other stood"); assert.equal(no[0] + (no[2] >> 1), pa[0] + (pa[2] >> 1), "the other where the carried one was picked"); }
  { const b = scene({ adults: 5, hand: { i: 1 }, focus: "drop.2" }), id = String(b.st.mibis[1].id), f = await start(b, { motion: false, node: true }), p0 = boxOf(f, "g." + id);
    key(f, "confirm"); key(f, "back"); lift(b); send(f); frames(f); assert.deepEqual(boxOf(f, "g." + id), p0, "← after ✓: no set-down pending, it stays at the point it left"); }
});
test("the drop spots (§3): one 64 x 10 ellipse a free place, centred on the room's drop foot points in their order", { skip }, async () => {
  for (const [n, room, rooms, per] of [[5, 0, 1, [5]], [7, 0, 1, [7]], [3, 1, 2, [8, 3]]]) {
    const b = scene({ rooms, per, room, hand: { i: rooms > 1 ? 8 : 0, room } }), f = await start(b, { motion: false }), lg = logOf(f), name = ORDER[room], free = 8 - n + 1;   // the carried one's own place is free while it is in hand
    assert.equal(b.props.regions.drops.items.length, free, `${name} with ${n}, one in hand: ${free} spots`);
    const u = rg(lg, "drops", "chrome")[0].rect, pts = ROOMS[name].drops.slice(0, free).map(([x, y]) => [x - CX(name) - 32, y - ROOMS[name].crop[1] + WIN[1] - 5]);
    assert.deepEqual(u, [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])) + 64 - Math.min(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1])) + 10 - Math.min(...pts.map((p) => p[1]))], `${name}: the spots' union`);
  }
});

test("the mark discs (§2): a 20 x 20 disc at the ink's top-right corner [ink right − 14, ink top − 8], held inside the window, the 16 px master centred on it", { skip }, async () => {
  const b = scene({ adults: 3 }), r0 = b.props.regions.residents[0]; r0.figure = [20, 30, 56, 69]; r0.mark = "mark-elder-16"; b.requests.push({ kind: "slot", id: "mark-elder-16", size: [16, 16] });
  const f = await start(b, { motion: false, node: true }), box = boxOf(f, "g." + r0.id), disc = boxOf(f, `g.${r0.id}.disc`) ?? boxOf(f, `resident.${r0.id}.disc`), lg = logOf(f);
  const want = [Math.max(WIN[0], Math.min(box[0] + 20 + 56 - 14, WIN[0] + WIN[2] - 20)), Math.max(WIN[1], box[1] + 30 - 8), 20, 20];
  const m = rg(lg, "marks"); assert.ok(m.length, "the disc drawn"); assert.ok(m.some((r) => r.rect[0] === want[0] && r.rect[1] === want[1] && r.rect[2] >= 16), `the disc at ${want}: ${m.map((r) => r.rect).join(" | ")}`); void disc;
  assert.deepEqual(departures(lg, spec, b.props, true), []);
});

test("the walk (§2): a walker's figure box stays within 8 .. 680 − W, its feet on the room's levels moved to the window, its foot point off the bed's keep-out; a step is 1 px on an axis", { skip }, async () => {
  const G = R.resident.walk.ground, K = R.resident.walk.keepOut;
  for (let seed = 1; seed <= 12; seed++) {
    const b = scene({ adults: 1 }); b.props.regions.residents[0].seed = seed * 7919;
    const f = await start(b, { t0: 5000, node: true }), id = b.st.mibis[0].id; let last = null, jump = 0, moved = 0;
    for (let ms = 40; ms <= 30000; ms += 40) {
      f.frame(5000 + ms); const [x, y, w, h] = boxOf(f, "g." + id), fx = x + (w >> 1), feet = y + h - 1;
      assert.ok(x >= G[0] && x + w <= G[0] + G[2], `seed ${seed} at ${ms}: x ${x} outside the clamp`); assert.ok(!(fx >= K[0] && fx < K[0] + K[2] && feet > K[1]), `seed ${seed} at ${ms}: the foot point (${fx}, ${feet}) meets the keep-out`);
      assert.ok([0, 1].some((lv) => ROOMS.roots.levels[lv] && roomOn("roots", lv, fx, feet, 0, true)) || onJoin("roots", fx, feet), `seed ${seed} at ${ms}: (${fx}, ${feet}) off the levels`);
      if (last && (last[0] !== x || last[1] !== y)) { moved++; jump = Math.max(jump, Math.abs(last[0] - x), Math.abs(last[1] - y)); } last = [x, y];
    }
    assert.ok(jump <= 1, `seed ${seed}: a step is 1 px on an axis, not ${jump}`); if (seed === 1) assert.ok(moved > 20, "it walks: " + moved);
  }
});

test("the swap (vivarium.json events.swap): the window cross-dithers from the old room's painting in 16 levels over 200 ms, then the room alone, as if it had always been shown; with reduced motion it is a cut", { skip }, async () => {
  const old = scene({ rooms: 2, per: [3, 2], room: 0 }), next = scene({ rooms: 2, per: [3, 2], room: 1 }), oldBase = old.props.regions.window.picture;
  assert.notEqual(next.props.regions.window.picture, oldBase);
  const run = async (motion) => {
    const f = await start(next, { motion, t0: 5000 }); for (const r of old.requests) f.handleOf(r.id, withPolicy((i) => standIn(i, sizeOf(r))));
    f.send({ t: "event", kind: "dither", target: "window", from: oldBase, ms: 200, hold: 0 }); f.frame(f.t); const n0 = nodesOf(f), mid = (f.frame((f.t += 100)), nodesOf(f)), end = (f.frame((f.t += 110)), nodesOf(f));
    return { f, n0, mid, end };
  };
  { const { n0, mid, end } = await run(true); assert.ok(at(n0, "window.dither") >= 0 && at(mid, "window.dither") >= 0, "the window dithers"); assert.equal(at(end, "window.dither"), -1, "after 200 ms: gone"); }
  { const { n0, mid } = await run(false); assert.equal(at(n0, "window.dither"), -1, "reduced motion: a cut"); assert.equal(at(mid, "window.dither"), -1); }
});

test("the house view (§5): five bands [16, 88 + 96j, 672, 88], a room's places on [34 + 84k, y + 32, 48, 48] at 48/304 in house order, the ring on the place's ring box [30 + 84k, y + 28, 56, 56], a traveller darkened with its Companion mark, nobody walking", { skip }, async () => {
  const b = scene({ rooms: 2, per: [6, 3], carry: [2], view: "house", focus: "house.#1" }), f = await start(b, { motion: false }), lg = logOf(f), H = R.house;
  for (let j = 0; j < 5; j++) assert.deepEqual(rg(lg, `band.${j}`, "chrome")[0]?.rect, [16, 88 + 96 * j, 672, 88], `band ${j}`);
  const pl = b.props.regions.house.bands[0].places; assert.deepEqual(pl.map((p) => p.state), ["mibi", "mibi", "carried", "mibi", "mibi", "mibi", "free", "free"]); assert.match(pl[2].picture, /^mibi:dark-/); assert.match(pl[2].mark, /^mark-companion-solid/);
  const ring = rg(lg, "focus")[0].rect, rb = [H.place.ring[0] + H.place.pitch * 1, 88 + H.place.ring[1], 56, 56]; assert.deepEqual(ring, [rb[0] - 5, rb[1] - 5, 66, 66], "the ring outside its ring box, by the ring's reach");
  const art = rg(lg, "house.mibi", "art")[0].rect; assert.deepEqual([art[0], art[1]], [34, 88 + 32 + 48 - H.place.picture[1]], "the first place's figure on its box's foot");
  assert.equal(rg(lg, "resident").length, 0, "nobody walks in the house"); assert.ok(rg(lg, "marks").length > 0, "the traveller's mark");
  assert.deepEqual(departures(lg, spec, b.props, true), []);
});

test("the Tucked away page (§6): the cold veil, two rails, four boxes a rail with each figure standing in its box, eight a page with pips; nobody walks", { skip }, async () => {
  const b = scene({ rooms: 2, per: [8, 4], set: tuck(10), view: "tucked" }), f = await start(b, { motion: false }), lg = logOf(f), T = R.tucked;
  assert.equal(b.props.regions.tucked.pages, 2); assert.equal(b.props.regions.tucked.items.length, 8);
  for (const [i, r] of T.rails.entries()) assert.ok(rg(lg, `rail.${i}`, "chrome").some((x) => x.rect.join() === r.join()), `rail ${i}`);
  const cold = rg(lg, "tucked")[0].rect; assert.deepEqual([cold[0], cold[1] + cold[3]], [T.boxes.x[0], T.boxes.tops[1] + T.boxes.size[1]], "the figures from the first box to the second rail's foot");
  assert.ok(lg.regions.some((r) => /^pip/.test(r.id)), "the pips"); assert.equal(rg(lg, "resident").length, 0);
  const p2 = scene({ rooms: 2, per: [8, 4], set: tuck(10), view: "tucked", page: 1 }); assert.equal(p2.props.regions.tucked.items.length, 2, "page 2: the other two");
});

// one group tick a frame at most: a late frame steps the next group only, and the time past that tick is dropped by moving the walk's origin later in whole ticks
test("a late frame steps one group, and the walk after it is the walk, later", { skip }, async () => {
  const run = async (L) => {
    const f = await start(scene({ adults: 8 }), { t0: 5000 }); for (let t = 40; t <= 4000; t += 40) f.frame(5000 + t);
    f.frame(5000 + 4000 + L); const steps = f.M._face_test_steps(), a = dirty(f); for (let i = 1; i <= 50; i++) f.frame(5000 + 4000 + L + 40 * i);
    return { steps, a, hash: f.hash() };
  };
  const base = await run(40);
  for (const L of [80, 120, 1000]) { const r = await run(L); assert.ok(r.steps <= 6, `a frame ${L} ms late stepped ${r.steps} residents`); assert.ok(r.a <= 153600, `a frame ${L} ms late redrew ${r.a} px`); assert.equal(r.hash, base.hash, `${L} ms late: fifty frames on, the walk is the walk, later`); }
});
test("a late walk frame with the top bar live (counters and their flashes changing) stays inside 153,600 px and LVGL's invalid-area buffer", { skip }, async () => {
  const f = await start(scene({ adults: 8 }), { t0: 5000 }), M = f.M, base = f.build; let worst = 0, k = 0;
  const MAT = [{ e: 14, d: 16, s: 10 }, { e: 2, d: 6, s: 9 }], top = (m) => ({ ...frameProps().top, materials: m, flash: { e: true, d: true, s: true } });
  for (let t = 21; t < 30000; t += 16, k++) {
    const late = k % 63 === 62; if (late) { t += 120; assert.equal(f.props({ screen: "vivarium", ...base.props, motion: true, frame: { ...frameProps(base.line), top: top(MAT[(k / 63 | 0) % 2]) } }), 0, f.errors().join("; ")); }
    f.frame(5000 + t); const s = dirty(f), n = M._face_dirty_count(); assert.ok(s <= 153600, `${late ? "late " : ""}frame at ${t}: ${s} px`); assert.ok(n <= M._face_inv_cap(), `${n} flushes outside the cap`); if (late) worst = Math.max(worst, s);
  }
  assert.equal(f.invOverflows(), 0, "no overflow of LVGL's invalid areas"); console.log(`# the Vivarium's late frame with the top bar live: worst ${worst} px`);
});
const WALKS = { "eight": { adults: 8 }, "four adults and four juveniles": { adults: 4, young: 4 }, "eight, one focused": { adults: 8, focus: "resident.#5" }, "eight, the ring on a plate": { adults: 8, focus: "plate.2" }, "eight, two with the Companion": { adults: 8, carry: [0, 1] }, "seven and a carry": { adults: 7, hand: { i: 2 }, focus: "drop.0" } };
for (const [name, o] of Object.entries(WALKS)) for (const [step, off, late = 0] of [[40, 0], [16, 5], [16, 5, 120]]) {
  test(`the walk, ${name}, frames every ${step} ms${late ? ` (every 63rd ${late} ms late)` : ""} for 120 s: no refresh redraws more than a quarter of the screen, and no more than six residents step in one`, { skip }, async () => {
    const f = await start(scene(o), { t0: 5000 }), M = f.M; let area = 0, moved = 0, steps = 0;
    for (let t = step + off, k = 0; t < 120000; t += step, k++) {
      if (late && k % 63 === 62) t += late;
      f.frame(5000 + t); const n = M._face_dirty_count(), s = dirty(f), st = M._face_test_steps(); area = Math.max(area, s); if (n) moved++; steps = Math.max(steps, st);
      assert.ok(st <= 6, `${st} residents stepped in the frame at ${t}`);
    }
    assert.ok(moved > 300, "the residents walk: " + moved + " frames redrawn"); assert.ok(area <= 153600, `dirty area ${area}`);
    console.log(`# the Vivarium's walk, ${name}, frames every ${step} ms: worst refresh ${area} px (${(100 * area / (1024 * 600)).toFixed(1)}%), worst ${steps} steps`);
  });
}

// ---- the figure's geometry at one scale: an adult's figure as the host measures it, [dx, dy, W, H] in its 96 × 99 picture ----
const FIG = [31, 68, 33, 28];
// the room data's levels in the window's coordinates, as room.c's room_on reads them: ⌈w/4⌉ inside each end of the span, top(fx) <= feet <= bottom, in no keep-out
const topAt = (l, x) => { let t = l.top[0]; l.x.slice(0, -1).forEach((x0, i) => { if (x >= x0) t = l.top[i]; }); return t; };
function roomOn(room, lv, fx, feet, w, relaxed = false) { const l = ROOMS[room].levels[lv], q = relaxed ? 0 : Math.ceil(w / 4), px = fx + CX(room), py = feet - DY;
  return px >= l.x[0] + q && px <= l.x.at(-1) - q && py >= topAt(l, px) && py <= l.bottom && !l.keepOuts.some(([x, y, kw, kh]) => px >= x && px < x + kw && py >= y && py < y + kh); }
const onJoin = (room, fx, feet) => ROOMS[room].joins.some((j) => fx + CX(room) >= j.rect[0] - 1 && fx + CX(room) <= j.rect[0] + j.rect[2] + 1 && feet - DY >= j.rect[1] - 1 && feet - DY <= j.rect[1] + j.rect[3] + 1);
const feetOf = (rect, fig = FIG) => ({ fx: rect[0] + fig[0] + Math.floor(fig[2] / 2), feetY: rect[1] + fig[1] + fig[3] - 1 });
const withFigure = (b, fig = FIG) => { for (const r of b.props.regions.residents) r.figure = fig; return b; };
test("the ring is (W + 10) × (fh + 10) on the figure's feet with no lift, the tag top is feetY + 16 and sits over the figure (feetY − H − 32) past the window's foot; the focus target is the figure box", { skip }, async () => {
  let flipped = 0, below = 0; const [W, H] = [FIG[2], FIG[3]], fh = Math.min(16, Math.max(6, 2 * Math.floor((W + 6) / 12)));
  for (let seed = 1; seed <= 40; seed++) {
    const b = withFigure(scene({ adults: 1, focus: "resident.#0" })); b.props.regions.residents[0].seed = seed * 104729;
    const f = await start(b, { motion: false, node: true }), lg = logOf(f) ?? (frames(f), logOf(f)), pic = boxOf(f, "g." + b.st.mibis[0].id);
    const { fx, feetY } = feetOf(pic), ring = rg(lg, "focus")[0].rect, tag = rg(lg, "nameTag", "chrome")[0].rect;
    assert.deepEqual(ring, [fx - Math.floor(W / 2) - 5, feetY - (fh + 10) / 2, W + 10, fh + 10], `seed ${seed}: the ring on F`);
    if (feetY + 16 + tag[3] > WIN[1] + WIN[3] - 8) { flipped++; assert.equal(tag[1], feetY - H - 32, `seed ${seed}: the tag over the figure`); } else { below++; assert.equal(tag[1], feetY + 16, `seed ${seed}: the tag top`); }
  }
  assert.ok(flipped > 0 && below > 0, `both tag places drawn: ${flipped} over, ${below} below`);
});
test("every start over 10,000 seeds is on a level of the room, inside the clamp and off the keep-out; every point of a minute of walking stays on a level (or on its join)", { skip: slow }, async () => {
  const G = R.resident.walk.ground, K = R.resident.walk.keepOut, W = FIG[2], ok = (rect, loose = false) => { const { fx, feetY } = feetOf(rect), x = fx - Math.floor(W / 2); return x >= G[0] && x + W <= G[0] + G[2] && !(fx >= K[0] && fx < K[0] + K[2] && feetY > K[1]) && [0, 1].some((lv) => roomOn("roots", lv, fx, feetY, W, loose)) || (loose && onJoin("roots", fx, feetY)); };
  const rects = (f, b) => b.st.mibis.map((m) => boxOf(f, "g." + m.id)).filter(Boolean);
  let n = 0; const b0 = withFigure(scene({ adults: 8 })), f0 = await start(b0, { motion: false, node: true });
  for (let k = 0; k < 1250; k++) { b0.props.regions.residents.forEach((r, i) => { r.seed = 1 + k * 8 + i; }); send(f0); frames(f0); for (const r of rects(f0, b0).slice(0, 8)) { n++; assert.ok(ok(r), `a start at ${r} is not walkable`); } }
  assert.ok(n >= 5000, n + " starts");
  for (let k = 0; k < 6; k++) {
    const b = withFigure(scene({ adults: 5 })); b.props.regions.residents.forEach((r, i) => { r.seed = 90001 + k * 8 + i; });
    const f = await start(b, { t0: 5000, node: true }); let moved = 0, last = null;
    for (let ms = 40; ms <= 60000; ms += 40) { f.frame(5000 + ms); const rs = rects(f, b); for (const r of rs) assert.ok(ok(r, true), `seed block ${k} at ${ms}: ${r} left the walkable ground`); const kk = rs.map((r) => r.join()).join("|"); if (last !== null && kk !== last) moved++; last = kk; }
    assert.ok(moved > 100, "they walk: " + moved);
  }
});

// ---- the levels and joins in the room view (the rooms design §2, the collection v2 design §2): eight stills (adult figures), the window's coordinates. The runs that count trips take a copy of the spec with the ceiling at 8 and an
// adult's speed at 6 px a tick: the rules under test (a point on a level or on its join, the join's ends, the raised cap) do not depend on them ----
const FAST = (() => { const j = JSON.parse(JSON.stringify(spec)); j.rules.travel.max = 8; j.rules.walk.speed.adult = [6, 1]; j.rules.show.max = 8; return j; })();
const W0 = FIG[2], CAP8 = Math.max(1, Math.floor(8 / spec.rules.walk.raisedDiv));
async function levelRun(block, ms, vspec, n = 8, room = 0) {   // one face, n stills with seeds of the block; the trace of every frame: [resident, fx, feet, lv, leg, walking]
  const per = [0, 0, 0, 0]; per[room] = n; const b = withFigure(scene({ rooms: 4, per, room })); b.props.regions.residents.forEach((r, i) => { r.seed = 600001 + block * 97 + i * 7919; r.shown = true; delete r.restAt; });
  const f = await start(b, { t0: 5000, node: true, vspec }), out = [], ids = b.props.regions.residents.map((r) => r.id);
  for (let t = 40; t <= ms; t += 40) { f.frame(5000 + t); const fr = [];
    ids.forEach((id, i) => { const bx = boxOf(f, "g." + id), st = STATE(f.M._face_test_state(i)); assert.ok(bx, `resident ${i} at ${t}`); const { fx, feetY } = feetOf(bx); fr.push([i, fx, feetY, st.lv, st.leg, st.travelling ? 1 : 0]); });
    out.push(fr); }
  return out;
}
const endsOf = (room) => { const j = ROOMS[room].joins[0]; return { up: [j.ends[0][0] - CX(room), j.ends[0][1] + DY], down: [j.ends[1][0] - CX(room), j.ends[1][1] + DY] }; };
function levelProof(room, tr, block, tally) {
  const ends = endsOf(room), last = Array(8).fill(null);
  for (const fr of tr) { let raised = 0;
    for (const [i, fx, feet, lv, leg, walking] of fr) { tally.points++;
      if (leg === 2) assert.ok(onJoin(room, fx, feet), `${room} block ${block}: resident ${i} on leg 2 at ${fx},${feet} is off the join`); else assert.ok(roomOn(room, lv, fx, feet, leg ? 0 : W0, !!leg), `${room} block ${block}: resident ${i} at ${fx},${feet} is off level ${lv} (leg ${leg})`);
      if (lv > 0 || (leg === 2 && lv === 0)) raised++;
      const p = last[i]; if (p && !p[5] && walking) tally.trips++;
      if (p && p[3] !== lv) { assert.deepEqual([fx, feet], lv > 0 ? ends.up : ends.down, `${room} block ${block}: resident ${i} changed level away from the join's end`); if (lv > 0) tally.up++; else tally.down++; }
      last[i] = [i, fx, feet, lv, leg, walking]; }
    tally.maxRaised = Math.max(tally.maxRaised, raised); assert.ok(raised <= CAP8, `${room}: ${raised} on the raised levels (cap ${CAP8})`); }
}
test("levels in Roots: over 1,000 seeded trips every feet point is on its level, or on the join during leg 2; trips climb to the terrace and come back, changing level at a join's end only; the raised count never exceeds max(1, ⌊N/3⌋)", { skip: slow }, async () => {
  const t = { trips: 0, up: 0, down: 0, maxRaised: 0, points: 0 };
  for (let block = 0; t.trips < 1000 && block < 40; block++) levelProof("roots", await levelRun(block, 300000, FAST), block, t);
  assert.ok(t.trips >= 1000, t.trips + " trips"); assert.ok(t.up > 10 && t.down > 10, `climbs ${t.up}, descents ${t.down}`);
  console.log(`# levels, Roots: ${t.trips} trips, ${t.points} feet points, ${t.up} climbs and ${t.down} descents, at most ${t.maxRaised} raised (cap ${CAP8})`);
});
test("levels in every room (§2): Reeds and Ferns climb and come back at their joins' ends; in Boulders the ramp's upper end lies outside every walker's range, so nobody climbs; every feet point is on its level", { skip: slow }, async () => {
  for (const room of ["reeds", "boulders", "ferns"]) {
    const t = { trips: 0, up: 0, down: 0, maxRaised: 0, points: 0 };
    for (let block = 0; block < 3; block++) levelProof(room, await levelRun(block, 300000, FAST, 8, ORDER.indexOf(room)), block, t);
    if (room === "boulders") assert.deepEqual([t.up, t.down], [0, 0], "Boulders: no climb in the room view"); else assert.ok(t.up >= 1 && t.down >= 1, `${room}: climbs ${t.up}, descents ${t.down}`);
    console.log(`# levels, ${room}: ${t.points} feet points, ${t.up} climbs and ${t.down} descents, at most ${t.maxRaised} raised`);
  }
});
test("a scene switched from Roots to Reeds (the same residents, ids and seeds) puts every walker on a Reeds level at the first frame after the switch, from its seed", { skip }, async () => {
  const mk = (room) => { const per = [0, 0, 0, 0]; per[room] = 5; const b = withFigure(scene({ rooms: 4, per, room })); b.props.regions.residents.forEach((r, i) => { r.seed = 710001 + i * 7919; }); return b; };
  const roots = mk(0), reeds = mk(1), f = await start(roots, { t0: 5000, node: true });
  for (let t = 40; t <= 20000; t += 40) f.frame(5000 + t);
  for (const r of reeds.requests) f.handleOf(r.id, withPolicy((i) => standIn(i, sizeOf(r))));
  f.build = reeds; send(f); f.frame(5000 + 20040);
  const first = reeds.props.regions.residents.filter((r) => r.shown !== false).map((r) => boxOf(f, "g." + r.id)); assert.ok(first.every(Boolean));
  for (const r of first) { const { fx, feetY } = feetOf(r); assert.ok([0, 1].some((lv) => ROOMS.reeds.levels[lv] && roomOn("reeds", lv, fx, feetY, W0)), `${fx},${feetY} is on no Reeds level`); }
});
test("with the real ceiling and speeds the room's walkers never travel more than rules.travel.max at once over 10 minutes, a level is changed, and the walk is the same twice", { skip: slow }, async () => {
  const tr = await levelRun(900, 600000, spec, 5); let maxT = 0, changes = 0, last = null;
  for (const fr of tr) { const n = fr.reduce((a, r) => a + r[5], 0); maxT = Math.max(maxT, n); if (last) fr.forEach((r, i) => { if (r[3] !== last[i][3]) changes++; }); last = fr; }
  assert.ok(maxT <= spec.rules.travel.max, `${maxT} travelling`); assert.ok(changes > 0, "a level was changed at the real speeds");
  const a = await levelRun(5, 120000, FAST), b = await levelRun(5, 120000, FAST); assert.deepEqual(a, b, "two runs from the same seeds and clock");
});

test("an asleep still with a curl draws the curl in place, its foot on the stand's feet line, and the ring and the tag come from the curl's figure", { skip }, async () => {
  const CF = [10, 2, 34, 28], CP = [57, 36], at2 = async (asleep) => {
    const b = withFigure(scene({ adults: 1, focus: "resident.#0" })), r = b.props.regions.residents[0], id = b.st.mibis[0].id; r.seed = 5 * 104729;
    if (asleep) { r.rest = "asleep"; r.curl = "mibi:S01~c0c0c0c0:adult:57x36"; r.curlFigure = CF; b.requests.push({ kind: "mibi", id: r.curl, size: CP, stage: "adult", species: "S01" }); }
    const f = await start(b, { motion: false, node: true }), lg = logOf(f) ?? (frames(f), logOf(f));
    return { nb: boxOf(f, "g." + id), ring: rg(lg, "focus")[0].rect, tag: rg(lg, "nameTag", "chrome")[0].rect };
  };
  const awake = await at2(false), asleep = await at2(true), fa = feetOf(awake.nb), fs = { fx: asleep.nb[0] + CF[0] + Math.floor(CF[2] / 2), feetY: asleep.nb[1] + CF[1] + CF[3] - 1 };
  assert.deepEqual(asleep.nb.slice(2), CP, "the curl's own picture"); assert.deepEqual(awake.nb.slice(2), R.resident.adult, "awake: its stand at 96/304");
  assert.equal(fs.feetY, fa.feetY, "the curl's foot is on the stand's feet line"); assert.ok(Math.abs(fs.fx - fa.fx) <= 1, "on the same feet point");
  const fh = Math.min(16, Math.max(6, 2 * Math.floor((CF[2] + 6) / 12))); assert.deepEqual(asleep.ring, [fs.fx - Math.floor(CF[2] / 2) - 5, fs.feetY - (fh + 10) / 2, CF[2] + 10, fh + 10], "the ring on the curl's feet");
});

// ---- the room's pieces in the glass: back pieces over the base and under every walker, occluders sorted with the walkers by the feet's row ----
const fnv = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
const nodesOf = (f) => logOf(f)?.nodes ?? [], at = (nodes, id) => nodes.findIndex((n) => n[0] === fnv(id)), residents = (nodes) => nodes.filter((n) => n[3] === "resident");
const withFoot = (id, foot) => { const r = J("rooms"); r.rooms.roots.pieces.find((p) => p.id === id).foot = foot; return r; };
test("R3: a walker whose feet are 6 rows above an occluder's foot draws before it, 6 below draws after it, and on a tie the occluder is after", { skip }, async () => {
  const b = scene({ adults: 1, focus: "plate.0" }), probe = await start(b, { motion: false, painted: true }), me = residents(nodesOf(probe));   // the ring off the walker: the focused one is drawn last, under its ring assert.equal(me.length, 1, "one resident");
  const feet = me[0][5] + me[0][7] - 1;   // the node's top and height less 1: the feet's row, the screen's; the painting's is 8 rows lower
  const order = async (d) => { const f = await start(b, { motion: false, painted: true, rooms: withFoot("roots-sorrel-1", feet - DY + d) }), nodes = nodesOf(f), piece = at(nodes, "p.roots-sorrel-1"), walker = nodes.findIndex((n) => n[3] === "resident"); assert.ok(piece >= 0 && walker >= 0, "both drawn"); assert.deepEqual(f.errors(), []); return piece < walker ? "piece first" : "walker first"; };
  assert.equal(await order(6), "walker first"); assert.equal(await order(-6), "piece first"); assert.equal(await order(0), "walker first", "a tie: the occluder goes after the walker");
});
test("R3: a back piece always draws before every walker; the nodes' names (p.<pieceId>) are stable across frames, the bed kept in Roots", { skip }, async () => {
  const b = scene({ adults: 6 }), f = await start(b, { motion: true, node: true });
  const n1 = nodesOf(f), back = at(n1, "p.roots-mister"); assert.ok(back >= 0, "the mister is drawn"); assert.ok(at(n1, "p.roots-sorrel-1") >= 0 && at(n1, "p.roots-stone-2") >= 0, "the occluders are drawn"); assert.ok(at(n1, "p.roots-mist-2") >= 0);
  const walkers = n1.map((n, i) => [n, i]).filter(([n]) => n[3] === "resident" || n[3] === "bed.sleepers" || n[3] === "bed"); assert.ok(walkers.length >= 5); assert.ok(walkers.every(([, i]) => back < i && at(n1, "p.roots-mist-2") < i));
  const ids = (nodes) => nodes.filter((n) => n[3] === "room").map((n) => n[0]).sort((a, c) => a - c);
  frames(f, 3, 40); assert.deepEqual(ids(nodesOf(f)), ids(n1)); frames(f, 200, 80); assert.deepEqual(ids(nodesOf(f)), ids(n1), "and after the walkers have walked on");
});
test("R3: a room's keep-outs hold for the walkers (the ground point inside the rect), a piece with a null picture draws no node; a room with no bed draws none", { skip }, async () => {
  const r = ROOMS.reeds, keeps = r.levels.flatMap((l) => l.keepOuts).map((k) => [k[0] - CX("reeds"), k[1] + DY, k[2], k[3]]);
  const b = scene({ rooms: 2, per: [0, 5], room: 1 }), f = await start(b, { motion: true }); assert.deepEqual(f.errors(), []);
  assert.equal(b.props.regions.room.id, "reeds"); assert.ok(!("bed" in b.props.regions), "no bed outside Roots");
  let n = nodesOf(f); assert.ok(!n.some((x) => x[3] === "bed" || x[3] === "bed.sleepers")); assert.equal(at(n, "p.reeds-sedge-1"), -1, "a null picture: no node"); assert.equal(r.pieces.find((p) => p.id === "reeds-sedge-1").picture, null);
  for (let i = 0; i < 1500; i++) { frames(f, 1, 80); n = nodesOf(f); for (const w of residents(n)) { const fx = w[4] + (w[6] >> 1), feet = w[5] + w[7]; for (const k of keeps) assert.ok(!(fx >= k[0] && fx < k[0] + k[2] && feet >= k[1] && feet < k[1] + k[3]), `a walker's ground point (${fx}, ${feet}) is in the keep-out ${k} at step ${i}`); } }
});
test("R3: each of the four rooms in all four lights draws without an error or a refusal inside the budgets, with no region departing from vivarium.json; only Roots has a bed; the room's pieces are the nodes p.<pieceId> that have a picture", { skip }, async () => {
  for (const [ri, name] of ORDER.entries()) for (const light of ["dawn", "day", "dusk", "night"]) {
    const per = [0, 0, 0, 0]; per[ri] = 6; const b = scene({ rooms: 4, per, room: ri, light }), f = await start(b, { painted: true, motion: false }), lg = logOf(f), id = `${name} ${light}`;
    assert.deepEqual(f.errors(), [], id); assert.equal(f.refused(), 0, id); assert.equal(b.props.regions.room.id, name);
    assert.deepEqual(departures(lg, spec, b.props, name === "roots"), [], id);
    const st = f.stats(); assert.ok(st.pictures <= 200, `${id}: ${st.pictures} pictures`); assert.ok(f.objects() <= 400, `${id}: ${f.objects()} objects`);
    const want = ROOMS[name].pieces.filter((p) => p.picture && p.view !== false).map((p) => fnv("p." + p.id)).sort((a, c) => a - c);
    assert.deepEqual(lg.nodes.filter((n) => n[3] === "room").map((n) => n[0]).sort((a, c) => a - c), want, `${id}: the pieces that have a picture and stand in the window`);
    assert.equal(lg.nodes.some((n) => n[3] === "bed"), name === "roots", `${id}: the bed only in Roots`);
  }
});

test("the held plate: one plate with both lines (a \\n ends a line, each part wraps by itself); a text with no \\n wraps as before", { skip }, async () => {
  const b = scene({ adults: 3 }), f = await start(b), lines = (text) => { assert.equal(f.props({ screen: "vivarium", ...b.props, motion: true, frame: { ...frameProps(b.line), plate: { text, timed: false } } }), 0, f.errors().join("; ")); frames(f); return logOf(f).type.filter((t) => /^plate\.l\d$/.test(t.id ?? "") || t.region === "plate").map((t) => t.text); };
  assert.deepEqual(lines("Dot is out exploring\nBring Dot home when you dock"), ["Dot is out exploring", "Bring Dot home when you dock"]);
  assert.deepEqual(lines("Dot is out exploring Bring Dot home when you dock"), ["Dot is out exploring Bring Dot home when you dock"]);
  assert.deepEqual(f.errors(), []);
});

test("travellers (rules.show.travellers): a mibi with the Companion is not drawn in its room, is no target there, and keeps its place in the house view, darkened, with its Companion mark", { skip }, async () => {
  for (const away of [false, true]) {
    const b = scene({ adults: 4, young: 3, carry: [0, 1], away }), f = await start(b, { motion: false, node: true });
    for (const m of b.st.mibis.slice(0, 2)) { assert.ok(!b.props.regions.residents.some((r) => r.id === String(m.id))); assert.ok(!b.props.focus.targets.some((t) => t.id === "resident." + m.id)); assert.equal(f.nodeBox("g." + m.id), null); }
    const h = scene({ adults: 4, young: 3, carry: [0, 1], away, view: "house" }), pl = h.props.regions.house.bands[0].places;
    assert.deepEqual(pl.slice(0, 2).map((p) => [p.state, /^mibi:dark-/.test(p.picture), p.mark]), [0, 1].map(() => ["carried", true, away ? "mark-companion-outline-16" : "mark-companion-solid-16"]));
  }
});

// ---- the moving sets' mechanism, on Idle's and Home's windows (the room view's walkers are stills at one scale; Idle and Home play the sets with the same living-window code) ----
import { MOVING as MOVING_SETS, movingScene, bootScene, resend, runFrames, STATE, CLIP } from "./moving-scene.mjs";
const SPEC_VIV = () => JSON.parse(JSON.stringify(spec));
test("on Idle, eight at 160 × 154 (synthesized, S09's size) walking 5 px a tick, groups balanced: no frame over 153,600 px, no overflow, deferrals logged and deterministic", { skip }, async () => {
  const sets = (() => { const m = JSON.parse(JSON.stringify(MOVING_SETS)), j = m.S05.juvenile; m.S09 = { species: "S09", native: "right", gait: "walk", adult: { ...JSON.parse(JSON.stringify(j)), walk: { ...j.walk, size: [160, 154] }, walkCycle: { ...j.walkCycle, stride: 15 }, shadow: { walk: [160, 16], close: [304, 24] } } }; return m; })();
  const run = async () => {
    const v = SPEC_VIV(); v.regions.resident.adult = [160, 154];
    const sc = movingScene("idle", { adults: 8, vivSpec: v }); sc.specs.frame = JSON.parse(JSON.stringify(sc.specs.frame)); sc.specs.frame.idle.regions.resident.adult = [160, 154];   /* Idle's own slot size */ sc.props.regions.residents.forEach((r) => { r.moving = { set: "S09", walk: "moving:adult:S09:walk:160x154:species", shadow: "moving:adult:S09:shadow:160x16" }; r.picture = r.picture.replace("144x152", "160x154"); });
    sc.requests = sc.requests.map((q) => (q.size && q.size[0] === 144 ? { ...q, id: q.id.replace("144x152", "160x154"), size: [160, 154] } : q)); sc.requests.push({ kind: "moving", id: "moving:adult:S09:walk:160x154:species" }, { kind: "moving", id: "moving:adult:S09:shadow:160x16" });
    const f = await bootScene(sc, { moving: sets }); assert.deepEqual(f.errors(), []); { const seen = new Set(); for (let k = 0; k < 50; k++) { f.frame((f.t += 16)); sc.props.regions.residents.forEach((r, i) => { if (f.M._face_test_cell(i) >= 0) seen.add(i); }); } sc.props.regions.residents.forEach((r, i) => { if (r.shown !== false) assert.ok(seen.has(i), "resident " + i + " shows its atlas cells"); }); }   // a cell < 0 is a dither under way
    const r = runFrames(f, 30000, { cadence: [16, 5, 120], top: true }); return { r, hash: f.hash() };
  };
  const a = await run(), b = await run();
  assert.ok(a.r.worst <= 153600, `a frame redrew ${a.r.worst} px`); assert.equal(a.r.overflows, 0); assert.equal(a.hash, b.hash); assert.equal(a.r.deferred, b.r.deferred);
  console.log(`# eight at 160 × 154: worst frame ${a.r.worst} px, worst tick ${a.r.worstTick} px, ${a.r.deferred} deferred (deterministic)`);
});
const cellName = (sc, i, c) => { const r = sc.props.regions.residents[i], w = MOVING_SETS[r.moving.set][r.stage === "juvenile" ? "juvenile" : "adult"].walk; return c < 0 ? `dither ${-1 - c}` : c < w.cells.length ? w.cells[c] : w.mirror[c - w.cells.length] + "*"; };
const watch = (f, i, ms, until = () => false) => { for (let t = 0; t < ms; t += 40) { f.frame((f.t += 40)); const s = STATE(f.M._face_test_state(i)); if (until(s)) break; } };
const trace = (f, i, ms) => { const out = []; let last = null; for (let t = 0; t < ms; t += 40) { f.frame((f.t += 40)); const s = STATE(f.M._face_test_state(i)), row = { t, clip: s.clip, phase: s.phase, cell: cellName(f.sc, i, f.M._face_test_cell(i)), dy: f.M._face_test_mv(i, 4), level: f.M._face_test_mv(i, 5) }, k = JSON.stringify({ ...row, t: 0 }); if (k !== last) { out.push(row); last = k; } } return out; };
test("rest change (M1 §3, game designer R1): awake → asleep by props: crouch 4 ticks lowered 1 px a tick for 2, the dither at levels 4, 8, 12, 16 on four own ticks, curl, the asleep loop 800 ms after; then the wake in reverse", { skip }, async () => {
  const f = await bootScene(movingScene("idle", { adults: 1 })); runFrames(f, 3000);
  f.sc.props.regions.residents[0].rest = "asleep"; resend(f);
  watch(f, 0, 20000, (s) => s.clip === CLIP.curl);
  const tr = trace(f, 0, 2500), crouch = tr.filter((x) => x.clip === CLIP.curl && x.phase === 0), dither = tr.filter((x) => x.clip === CLIP.curl && x.phase === 1), curl = tr.find((x) => x.clip === CLIP.curl && x.phase === 2), asleep = tr.find((x) => x.clip === CLIP.asleep);
  assert.ok(crouch.every((x) => x.cell.replace("*", "") === "crouch"), JSON.stringify(crouch));
  assert.deepEqual(dither.map((x) => x.level), [4, 8, 12, 16]); assert.deepEqual(dither.map((x) => x.t - dither[0].t), [0, 80, 160, 240]);
  assert.equal(curl.cell, "curl"); assert.equal(curl.t - dither[0].t, 320); assert.equal(asleep.t - curl.t, 800);
  f.sc.props.regions.residents[0].rest = "awake"; resend(f);
  const w = trace(f, 0, 2500), wd = w.filter((x) => x.clip === CLIP.wake && x.phase === 0), cr = w.find((x) => x.clip === CLIP.wake && x.phase === 1), st = w.find((x) => x.clip === CLIP.rest);
  assert.deepEqual(wd.map((x) => x.level), [4, 8, 12, 16]); assert.equal(cr.cell.replace("*", ""), "crouch"); assert.equal(cr.dy, 2); assert.equal(st.t - cr.t, 400); assert.equal(st.cell.replace("*", ""), "stand"); assert.equal(st.dy, 0);
});
test("G10 (M1 §3), on Home: eight awake for 120 s: from 2.0 s on, at every frame, the travelling count within its floor and cap, at most 2 in the air, no trip ends off its waypoint", { skip }, async () => {
  const sc = movingScene("home", { adults: 4, juveniles: 3, s05: 1 }), f = await bootScene(sc), M = f.M, N = sc.props.regions.residents.filter((r) => r.shown !== false).length, all = sc.props.regions.residents.length, ceiling = spec.rules.travel.max, cap = Math.min(ceiling, Math.max(4, Math.ceil(N / 2))), floor = Math.min(Math.ceil(N / 3), cap);
  const was = Array(all).fill(false); let maxT = 0, maxAir = 0, ends = 0, starts = 0, lowSince = null, worstDip = 0;
  runFrames(f, 120000, { each: (t) => {
    let trav = 0, air = 0;
    for (let i = 0; i < all; i++) { const s = STATE(M._face_test_state(i)); if (s.travelling) trav++; if (s.airborne) air++; if (s.travelling && !was[i]) starts++;
      if (was[i] && !s.travelling) { ends++; assert.deepEqual([M._face_test_mv(i, 0), M._face_test_mv(i, 1)], [M._face_test_mv(i, 8), M._face_test_mv(i, 9)], `resident ${i}'s trip ended off its waypoint at ${t}`); } was[i] = s.travelling; }
    if (t >= 2000) { if (trav < floor) { lowSince ??= t; worstDip = Math.max(worstDip, t - lowSince + 16); } else lowSince = null; maxT = Math.max(maxT, trav); } maxAir = Math.max(maxAir, air);
  } });
  assert.ok(worstDip <= 64, `travelling fell under the floor ${floor} for ${worstDip} ms`); assert.ok(maxT <= cap, `travelling rose to ${maxT} (cap ${cap})`); assert.ok(maxAir <= 2); assert.ok(ends > 5, ends + " trips"); assert.ok(starts > 5);
});
test("facing (M1 §1.2): a native-left set shows the mirrored walk cells when facing right and the painted ones when facing left; the curl is never mirrored", { skip }, async () => {
  const left = JSON.parse(JSON.stringify(MOVING_SETS)); left.S01.native = "left";
  for (const [sets, native] of [[MOVING_SETS, 1], [left, 0]]) {
    const sc = movingScene("idle", { adults: 3 }), f = await bootScene(sc, { moving: sets }), nb = MOVING_SETS.S01.adult.walk.cells.length, curl = MOVING_SETS.S01.adult.walk.cells.indexOf("curl"); let seen = 0;
    runFrames(f, 20000, { each: () => { for (let i = 0; i < 3; i++) { const c = f.M._face_test_cell(i), fr = f.M._face_test_mv(i, 2); if (c < 0) continue; assert.equal(c >= nb, fr !== native, `resident ${i}: cell ${c} facing ${fr ? "right" : "left"}`); seen++; } } });
    assert.ok(seen > 100);
    sc.props.regions.residents.forEach((r) => (r.rest = "asleep")); resend(f); runFrames(f, 15000);
    for (let i = 0; i < 3; i++) assert.ok([curl, curl + 1].includes(f.M._face_test_cell(i)), "asleep: the curl as painted");
  }
});
test("no moving set plays in the room view (one scale, 96/304): the props name none, and the walkers are stills", { skip }, async () => {
  const sc = movingScene("vivarium", { adults: 4, juveniles: 3, s05: 1 }); assert.ok(sc.props.regions.residents.every((r) => !r.moving), "no moving set at the factor");
  const f = await bootScene(sc); for (let i = 0; i < sc.props.regions.residents.length; i++) assert.ok(f.M._face_test_cell(i) < 0, `resident ${i} is a still`);
});
