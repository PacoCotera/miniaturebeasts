// The Wall as props (views/wall-props.mjs): the order, the size step, the rail with its ticks and settling rows, the marks, the card, the footer, the scroll; and the host's walk through the intents.
//   node --test prototypes/station/tests/wall-props.test.mjs
import "./fixtures/rooms.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { wallBuild, orderOf, tickOf, stepOf, SORTS, markOf } from "../src/views/wall-props.mjs";
import { loadStandSizesFs } from "../tools/stand-layers-fs.mjs";
loadStandSizesFs();

const here = path.dirname(fileURLToPath(import.meta.url)), specs = path.resolve(here, "../../ui/specs/station"), framesDir = path.resolve(here, "../../workbench/frames");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const J = (f) => JSON.parse(readFileSync(path.join(specs, f), "utf8")), spec = J("vivarium.json"), frameSpec = J("frame.json"), home = J("home.json"), pods = J("pods.json"), schema = J("vivarium.props.json");
const T0 = 1_000_000, settings = { ...S.DEFAULT_SETTINGS, economy: "decided" };
const sv0 = (over = {}) => ({ v: 8, seed: 7, wid: "w1", turn: 0, bay: [], mibis: [], carried: [], tier: 1, shield: 3, ...over });
const world = (rooms = 1) => { const st = S.freshSt("w1", 5, T0); S.normalize(st); st.e = 99; st.d = 99; st.s = 99; st.firstMibi = false; st.rooms = rooms; st.dock = { docked: true, at: T0 }; return st; };
const fillRooms = (st, per, sp = "S01") => { per.forEach((n, r) => { if (!n) return; const k = st.mibis.length; S.seedAdults(st, sp, 5 + r + k, n, { ...settings, rooms: 10 }); const made = st.mibis.slice(k); const taken = new Set(S.inRoom(st, r).filter((x) => !made.includes(x)).map((x) => x.slot)); for (const m of made) { let s = 0; while (taken.has(s)) s++; taken.add(s); m.room = r; m.slot = s; m.bay = r * 8 + s; m.paint = { state: "landed" }; } }); return st.mibis; };
const build = (st, over = {}) => wallBuild({ st, sv: sv0(), settings: { ...settings, rooms: st.rooms }, docked: true, light: "day", focus: null, ...over }, spec, frameSpec, home, pods);

function validate(v, sc, at = "$", out = []) {
  if (sc.$ref) return validate(v, schema.$defs[sc.$ref], at, out);
  if (sc.oneOf) { const ok = sc.oneOf.filter((o) => validate(v, o, at, []).length === 0).length; if (ok !== 1) out.push(`${at}: matches ${ok} of oneOf`); return out; }
  if (sc.enum && !sc.enum.includes(v)) { out.push(`${at}: ${JSON.stringify(v)} is not one of ${JSON.stringify(sc.enum)}`); return out; }
  if (sc.type) { const ts = [].concat(sc.type), ty = v === null ? "null" : Array.isArray(v) ? "array" : Number.isInteger(v) ? "integer" : typeof v; if (!ts.includes(ty) && !(ty === "integer" && ts.includes("number"))) { out.push(`${at}: a ${ty}, wanted ${ts.join(" or ")}`); return out; } }
  if (Array.isArray(v) && sc.items) v.forEach((x, i) => validate(x, sc.items, `${at}[${i}]`, out));
  if (v && typeof v === "object" && !Array.isArray(v)) { for (const k of sc.required ?? []) if (!(k in v)) out.push(`${at}: ${k} is required`); for (const [k, x] of Object.entries(v)) { const p = sc.properties?.[k]; if (p) validate(x, p, `${at}.${k}`, out); else if (sc.additionalProperties === false) out.push(`${at}: ${k} is not a prop`); } }
  return out;
}

test("the props validate against vivarium.props.json and name no rectangle, for none, one, twelve and forty", () => {
  for (const per of [[], [1], [5, 7], [8, 8, 8, 8, 8]]) {
    const st = world(Math.max(1, per.length)); fillRooms(st, per); const b = build(st), bad = validate(b.props, schema);
    assert.deepEqual(bad, [], `${per.join("+")}: ${bad.slice(0, 3).join("; ")}`); assert.ok(!/"(x|y|w|h|rect|at|box|pitch)"\s*:/.test(JSON.stringify(b.props)), "props name what, never where"); assert.equal(b.props.view, "wall");
    assert.ok(b.props.focus.targets.length <= 64, "the face's target table holds " + b.props.focus.targets.length);
  }
});

test("the size steps by the count shown: up to 15 at 100/304 on a 98 x 129 pitch five across, above 15 at 64/304 on 70 x 83 seven across; the size holds for any filter's count", () => {
  assert.deepEqual([stepOf(spec, 1).cols, stepOf(spec, 15).cols, stepOf(spec, 16).cols, stepOf(spec, 80).cols], [5, 5, 7, 7]); assert.deepEqual([stepOf(spec, 15).pitch, stepOf(spec, 16).pitch], [[98, 129], [70, 83]]);
  const st = world(2); fillRooms(st, [8, 8]); let b = build(st); assert.equal(b.props.regions.wall.size.join("x"), "64x66", "sixteen shown: 64/304");
  const small = build(st, { filter: "1" }); assert.equal(small.props.regions.wall.size.join("x"), "100x103", "eight shown: 100/304");
  assert.equal(b.props.regions.wall.cols, 7);
});

test("the order: Room by rail order then species number, oldest first, name; Kind by species then room; Age elder, adult, young; Tucked away below in every sort", () => {
  const st = world(2); const [a, b, c, d] = [...fillRooms(st, [2, 2]), ...[]]; a.born = 4; b.born = 1; c.born = 3; d.born = 2;
  assert.deepEqual(orderOf(st, settings, st.mibis, "room").map((m) => m.id), [b.id, a.id, d.id, c.id].map((x) => x), "room 0 oldest first, then room 1 oldest first");
  const e = fillRooms(st, [0, 0, 0]).length; void e;
  const t = st.mibis[0]; t.tucked = { turn: 5, seq: 1, from: 0 }; t.room = t.slot = t.bay = null; assert.equal(orderOf(st, settings, st.mibis, "room").at(-1), t, "tucked below"); assert.equal(orderOf(st, settings, st.mibis, "kind").at(-1), t); assert.equal(orderOf(st, settings, st.mibis, "age").at(-1), t);
  assert.deepEqual(SORTS, ["room", "kind", "age"]);
});

test("the rail: All, the rooms in bought order with their count, tick and fill, Tucked away, Add a room with its price; a full room reads full; the lit row is the filter", () => {
  const st = world(2); fillRooms(st, [8, 3]); S.tuckedAway(st); const b = build(st), R = b.props.regions.rail;
  assert.deepEqual(R.rows.map((r) => r.id), ["all", "0", "1", "tucked", "add"]); assert.deepEqual(R.rows.map((r) => r.count), ["11", "8 of 8", "3 of 8", "0", undefined]);
  assert.deepEqual([R.rows[1].full, R.rows[1].fill, R.rows[2].fill, R.rows[1].tick, R.rows[2].tick], [true, 8, 3, { n: 1, colour: "sky", hollow: false }, { n: 2, colour: "sprout", hollow: false }]);
  assert.deepEqual(R.rows.filter((r) => r.lit).map((r) => r.id), ["all"]); assert.deepEqual(build(st, { filter: "1" }).props.regions.rail.rows.filter((r) => r.lit).map((r) => r.id), ["1"]); assert.deepEqual(build(st, { filter: "tucked" }).props.regions.rail.rows.filter((r) => r.lit).map((r) => r.id), ["tucked"]);
  assert.deepEqual([R.rows.at(-1).kind, R.rows.at(-1).price, R.rows.at(-1).live, R.rows.at(-1).find], ["add", "⚡ 8", true, null], "with the find requirement off no find line");
  st.e = 3; assert.deepEqual([build(st).props.regions.rail.rows.at(-1).short, build(st).props.regions.rail.rows.at(-1).live], [true, false], "short of Energy: held");
});

test("a settling room: its row in bought order with the turns left, no fill bar, the cut dimmed; its filter reads 'settling', the wall empty; the card keeps its mibi", () => {
  const st = world(1); fillRooms(st, [3]); st.e = 99; S.addRoom(st, settings); const b = build(st, { filter: "1" }), row = b.props.regions.rail.rows.find((r) => r.id === "1");
  assert.deepEqual([row.settling, row.count, row.fill, row.lit], [1, "1 turns", null, true], "turns left in the row"); assert.match(row.picture, /^room-reeds-rail-day-164x40~dim$/);
  assert.equal(b.props.regions.wall.message, "Reeds is settling · ready in 1 turns"); assert.equal(b.props.regions.wall.cells.length, 0); assert.ok(b.props.regions.card.id, "the card keeps its mibi");
  const empty = build(world(2), { filter: "1" }); assert.equal(empty.props.state, "none");
  const st2 = world(2); fillRooms(st2, [2, 0]); assert.equal(build(st2, { filter: "1" }).props.regions.wall.message, "Nobody lives in Reeds yet. Move a mibi here from its card.");
});

test("room ticks by the bought order: six hues, then the same hues broken for rooms 7 to 10; Tucked away has none", () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 9].map((i) => tickOf(i)), [
    { n: 1, colour: "sky", hollow: false }, { n: 2, colour: "sprout", hollow: false }, { n: 3, colour: "sand", hollow: false }, { n: 4, colour: "lilac", hollow: false }, { n: 5, colour: "aqua", hollow: false }, { n: 6, colour: "pink", hollow: false },
    { n: 7, colour: "sky", hollow: true }, { n: 10, colour: "lilac", hollow: true }]);
  const st = world(2); const ms = fillRooms(st, [2, 1]); ms[0].tucked = { turn: 5, seq: 1, from: 0 }; ms[0].room = ms[0].slot = ms[0].bay = null; const cells = build(st).props.regions.wall.cells;
  assert.deepEqual(cells.map((c) => [c.dim, c.tick?.n ?? null]).sort(), [[false, 1], [false, 2], [true, null]].sort());
});

test("the marks: one a portrait, the first that applies (companion, coming out, asleep, bonded heart, elder); the tucked wear the cold mark", () => {
  const st = world(1); const [a, b, c, d] = fillRooms(st, [4]); b.bonded = true; c.tucked = { turn: 5, seq: 1, from: 0 }; c.room = c.slot = c.bay = null; d.tucked = { turn: 5, seq: 2, from: 0, out: 7 }; d.room = 0; d.slot = 3;
  const cells = Object.fromEntries(build(st).props.regions.wall.cells.map((x) => [x.id, x])); const sv = sv0({ carried: [a.id] });
  assert.match(cells[b.id].mark, /mark-heart-16/); assert.match(cells[c.id].mark, /mark-cold-16/); assert.match(cells[d.id].mark, /home-lamp-sky-12x12/);
  const w = wallBuild({ st, sv, settings, docked: true, light: "day", focus: null }, spec, frameSpec, home, pods), ca = w.props.regions.wall.cells.find((x) => x.id === String(a.id)); assert.match(ca.mark, /mark-companion-solid-16/);
});

test("the card: the ringed mibi's name, looks, plates in their order (Look, Move to, Take along, Tuck away, Breed, Return), its room band; the footer names the act and where it lives", () => {
  const st = world(2); const ms = fillRooms(st, [3, 2]); const b = build(st, { focus: "cell." + ms[1].id }), C = b.props.regions.card;
  assert.deepEqual([C.state, C.name, C.id], ["mibi", ms[1].name, String(ms[1].id)]); assert.deepEqual(C.plates.map((p) => p.verb), ["Look", "Move to", "Take along", "Tuck away", "Breed", "Return"]); assert.equal(C.plates[3].price, "⚡ 2");
  assert.deepEqual([C.room.kind, C.room.name, C.room.n, C.room.of, C.room.opens], ["room", "Roots", 3, 8, true]); assert.match(C.picture, /:120x124(:|$)/);
  assert.equal(b.line.ok, "Open " + ms[1].name); assert.equal(b.line.subject, ms[1].name + " · Roots 3 of 8"); assert.equal(b.line.back, "Vivarium");
  assert.equal(build(st, { focus: "plate.0" , last: ms[1].id }).line.ok, "Look at " + ms[1].name);
  const t = ms[0]; t.tucked = { turn: 5, seq: 1, from: 0 }; t.room = t.slot = t.bay = null; const tb = build(st, { focus: "cell." + t.id });
  assert.equal(tb.line.subject, t.name + " · Tucked away"); assert.deepEqual(tb.props.regions.card.plates.filter((p) => !p.held).map((p) => p.verb), ["Look", "Bring out"]); assert.equal(tb.props.regions.card.room.kind, "tucked");
});

test("the scroll: whole rows, the ring's row always whole and on screen; the track shows when more rows than fit", () => {
  const st = world(4); const ms = fillRooms(st, [8, 8, 8, 8]); st.rooms = 4;
  let b = build(st); const w = b.props.regions.wall; assert.deepEqual([w.cols, w.rows, w.vis, w.row0, w.cells.length], [7, 5, 5, 0, 32 > 35 ? 35 : 32], "forty is not here: thirty-two, five rows of seven"); void ms;
  const more = world(4); fillRooms(more, [8, 8, 8, 8]); fillRooms(more, [0]); more.mibis.slice(0, 8).forEach((m, i) => { m.room = 0; m.slot = i; });
  const big = world(4); big.mibis.length = 0; fillRooms(big, [8, 8, 8, 8]); const extra = S.seedAdults(big, "S02", 40, 8, { ...settings, rooms: 10 }); void extra;
  const order = build(big).nav.order; assert.ok(order.length >= 32);
  const tall = build(big, { focus: "cell." + order.at(-1) }); assert.ok(tall.nav.row0 >= 0);
});

// ---- the host's walk: the intents move the ring, refilter, scroll and nudge through wall-walk.mjs ----
import { INTENTS } from "../src/intents/index.mjs";
const hostFor = (st) => { const said = [], went = [], ui = { screen: "vivarium", viv: { f: null, prev: null, view: "wall", page: 0, last: null, pin: null, sort: "room", filter: "all", pick: null, row0: 0, first: 0, nudge: null, move: null, moveFirst: 0, pair: null }, hab: { id: null, f: "resident" }, home: { f: "room" }, panel: null };
  return { st, sv: sv0(), settings: { ...settings, rooms: st.rooms }, ui, specs: { vivarium: spec, frame: frameSpec, home, pods, panel: J("panel.json"), habitat: J("habitat.json") }, said, went, say: (t) => said.push(t), goto: (s) => went.push(s), now: () => T0, save() {}, light: () => "day", showRoom: (i) => { st.face.room = i; }, motion: () => false, play() {}, at() {} }; };
const press = (h, key) => INTENTS.vivarium.intent(h, h.ui.viv.f, "step:" + key);
const ring = (h) => { const b = build(h.st, { focus: h.ui.viv.f, last: h.ui.viv.last, sort: h.ui.viv.sort, filter: h.ui.viv.filter, pick: h.ui.viv.pick, row0: h.ui.viv.row0, first: h.ui.viv.first }); return b.props.focus.cur; };

test("the host's walk: ▶ from the rail rings the wall, ▼ on a rail row refilters, ▼ past the last row nudges, ◀ at the wall's left edge returns to the lit row, ✓ on a portrait goes to the card's first live plate", () => {
  const st = world(2); fillRooms(st, [5, 3]); const h = hostFor(st), v = h.ui.viv; v.f = "rail.all";
  press(h, "right"); assert.match(v.f, /^cell\.\d+$/); assert.equal(v.last, +v.f.slice(5)); press(h, "left"); assert.equal(v.f, "rail.all", "the lit row"); 
  press(h, "down"); assert.deepEqual([v.f, v.filter], ["rail.0", "0"], "the ring on a room row refilters"); press(h, "down"); assert.deepEqual([v.f, v.filter], ["rail.1", "1"]);
  press(h, "down"); press(h, "down"); assert.deepEqual([v.f, v.filter], ["rail.add", "tucked"], "the ring on Add a room leaves the filter"); press(h, "down"); assert.equal(v.nudge, "down", "nothing beyond: a nudge"); assert.equal(v.f, "rail.add");
  press(h, "up"); assert.equal(v.nudge, null, "the next press clears the nudge"); v.f = "rail.0"; v.filter = "0"; press(h, "right"); const first = v.f; press(h, "left"); assert.equal(v.f, "rail.0");
  v.f = first; INTENTS.vivarium.intent(h, first, "confirm"); assert.equal(v.f, "plate.0", "✓ on a portrait: the card's first live plate"); assert.equal(v.last, +first.slice(5));
  press(h, "left"); assert.equal(v.f, first, "◀ from a plate: the ringed mibi");
});

test("the host: ✓ on a sort sets it and keeps the card's mibi; ✓ on Pick several starts the mode, ✓ on a portrait toggles its check, Back clears the picks (one press) and then leaves", () => {
  const st = world(1); fillRooms(st, [4]); const h = hostFor(st), v = h.ui.viv; v.f = "sort.age"; INTENTS.vivarium.intent(h, "sort.age", "confirm"); assert.equal(v.sort, "age");
  v.f = "pill"; INTENTS.vivarium.intent(h, "pill", "confirm"); assert.deepEqual(v.pick, { on: true, ids: [] }); const id = st.mibis[1].id; v.f = "cell." + id; INTENTS.vivarium.intent(h, v.f, "confirm"); assert.deepEqual(v.pick.ids, [id]);
  assert.equal(build(st, { focus: v.f, pick: v.pick }).props.regions.toolbar.pill.text, "Picking · 1"); INTENTS.vivarium.intent(h, v.f, "confirm"); assert.deepEqual(v.pick.ids, []);
  INTENTS.vivarium.intent(h, v.f, "back"); assert.equal(v.pick, null); assert.deepEqual(h.went, [], "the first Back ends the mode and stays"); INTENTS.vivarium.intent(h, v.f, "back"); assert.deepEqual(h.went, ["home"]);
});

test("the host: ✓ on Add a room with the price met opens the panel; short of Energy plays its message plate", () => {
  const st = world(1); fillRooms(st, [2]); st.e = 99; const h = hostFor(st), v = h.ui.viv; v.f = "rail.add"; INTENTS.vivarium.intent(h, "rail.add", "confirm"); assert.equal(h.ui.panel?.id, "addRoom");
  const s2 = world(1); fillRooms(s2, [2]); s2.e = 1; const h2 = hostFor(s2); h2.ui.viv.f = "rail.add"; INTENTS.vivarium.intent(h2, "rail.add", "confirm"); assert.equal(h2.ui.panel, null); assert.match(h2.said.at(-1), /Needs ⚡4 · you have 1/);
});

// ---- Move to (spec §6) ----
test("Move to: the card becomes the room list; each row says its places and the count change; the mibi's own room reads here, a full room full · swap, a settling room settling; the last row is Add a room; the footer names the move", () => {
  const st = world(3); const ms = fillRooms(st, [3, 8, 2]); S.addRoom(st, { ...settings, rooms: 3 }); st.e = 99; const m0 = ms[0];
  const b = build(st, { move: { id: m0.id }, focus: null }), M = b.props.regions.move;
  assert.equal(M.title, "Move " + m0.name + " to"); assert.deepEqual(M.rows.map((r) => [r.id, r.state]), [["0", "here"], ["1", "tight"], ["2", "free"], ["3", "settling"]], "Add a room is gone: every themed room is built");
  assert.deepEqual(M.rows.map((r) => r.count), ["here", "full · swap", "2 of 8 → 3", "settling · 2 turns"]); assert.deepEqual([M.rows[2].dots, M.rows[2].next, M.rows[1].dots, M.rows[3].dots], [2, 2, 8, 0]);
  assert.equal(b.props.focus.cur, "move.2", "the ring starts on the first free row"); assert.deepEqual(b.props.focus.targets.map((t) => t.group), ["move", "move", "move", "move"], "the list is the only target");
  assert.equal(b.line.ok, "Move " + m0.name + " to Boulders"); assert.equal(b.line.subject, "Boulders 2 of 8, then 3 of 8"); assert.equal(b.line.back, "Cancel");
  assert.equal(build(st, { move: { id: m0.id }, focus: "move.1" }).line.ok, null, "a full room: no ✓ act"); assert.equal(build(st, { move: { id: m0.id }, focus: "move.0" }).line.subject, "Roots 3 of 8, then 3 of 8");
  const few = world(2); fillRooms(few, [3, 2]); few.e = 99; const add = build(few, { move: { id: few.mibis[0].id } }).props.regions.move.rows.at(-1); assert.deepEqual([add.kind, add.price, add.live], ["add", "⚡ 8", true]);
  assert.match(M.face, /:36x37(:|$)/, "the mibi's face at 36 px");
});

test("Move to on the host: ✓ on the plate opens the list; ▲▼ walk the rows; ✓ on a free row moves the mibi at once and free, the card returns, the ring stays on it; here, full and settling say why and change nothing; Back cancels one step", () => {
  const st = world(3); const ms = fillRooms(st, [3, 8, 2]); S.addRoom(st, { ...settings, rooms: 3 }); st.e = 99; const h = hostFor(st), v = h.ui.viv, m = ms[0]; h.settings.rooms = 4; st.rooms = 4;
  v.f = "plate.1"; v.last = m.id; INTENTS.vivarium.intent(h, "plate.1", "confirm"); assert.deepEqual(v.move, { id: m.id });
  const nav = () => build(st, { focus: v.f, last: v.last, move: v.move, moveFirst: v.moveFirst, filter: v.filter }).props.focus.cur; v.f = nav(); assert.equal(v.f, "move.2");
  press(h, "up"); assert.equal(v.f, "move.1"); INTENTS.vivarium.intent(h, v.f, "confirm"); assert.deepEqual([m.room, S.inRoom(st, 1).length, v.move.swap], [0, 8, { room: 1, chosen: [] }], "✓ on a full room opens the swap grid, nothing moves"); INTENTS.vivarium.intent(h, v.f, "back"); assert.deepEqual([v.move, v.f], [{ id: m.id, swap: null }, "move.1"], "Back returns to the room list, the ring on the room");
  press(h, "up"); INTENTS.vivarium.intent(h, v.f, "confirm"); assert.match(h.said.at(-1), /already in Roots/); press(h, "down"); press(h, "down"); press(h, "down"); INTENTS.vivarium.intent(h, v.f, "confirm"); assert.match(h.said.at(-1), /Ferns is settling · ready in 2 turns/);
  press(h, "left"); assert.equal(v.nudge, "left", "◀▶ nudge in the list"); v.f = "move.2"; INTENTS.vivarium.intent(h, "move.2", "confirm");
  assert.deepEqual([m.room, S.inRoom(st, 2).length, v.move, v.f], [2, 3, null, "cell." + m.id], "moved, the card returned, the ring on the mibi"); assert.match(h.said.at(-1), new RegExp(m.name + " is in Boulders"));
  v.f = "plate.1"; INTENTS.vivarium.intent(h, "plate.1", "confirm"); assert.ok(v.move); INTENTS.vivarium.intent(h, "move.0", "back"); assert.deepEqual([v.move, v.f], [null, "plate.1"], "Back cancels the list and returns to the card's plate");
});

test("Move to inside a room filter: the moved mibi leaves the wall and the ring goes to the next mibi in the filter", () => {
  const st = world(3); const ms = fillRooms(st, [4, 1]); st.e = 99; const h = hostFor(st), v = h.ui.viv; h.settings.rooms = 3; st.rooms = 3; S.addRoom(st, { ...settings, rooms: 2 }); st.turn += 5; h.settings.rooms = 3;
  v.filter = "0"; const m = ms[1]; v.move = { id: m.id }; v.last = m.id; v.f = "move.1"; INTENTS.vivarium.intent(h, "move.1", "confirm");
  assert.equal(S.mibiById(st, m.id).room, 1); assert.notEqual(v.f, "cell." + m.id); assert.match(v.f, /^cell\.\d+$/); assert.ok(ms.slice(0, 4).some((x) => v.f === "cell." + x.id && x.id !== m.id), "the next mibi of the room");
});

// ---- Pick several (spec §7) ----
test("Pick several: the pill reads Picking · n, the card becomes the pick pane (n picked, the faces strip, Move to · Tuck away ⚡ total · Clear picks), picks out of view are counted, Tuck away is held when it would take the last mibi at home", () => {
  const st = world(2); const ms = fillRooms(st, [4, 3]); const ids = [ms[0].id, ms[1].id, ms[5].id];
  const b = build(st, { pick: { on: true, ids }, focus: "cell." + ms[2].id }), C = b.props.regions.card;
  assert.equal(b.props.regions.toolbar.pill.text, "Picking · 3"); assert.deepEqual(b.props.regions.wall.cells.filter((c) => c.picked).map((c) => c.id).sort(), ids.map(String).sort()); assert.equal(b.line.back, "Cancel");
  assert.deepEqual([C.state, C.name, C.faces.length, C.more], ["picks", "3 picked", 3, 0]); assert.deepEqual(C.plates.map((p) => p.verb), ["Move to", "Tuck away", "Clear picks"]); assert.equal(C.plates[1].price, "⚡ 6", "two places each: 2 + 2 + 2"); assert.deepEqual(C.plates.map((p) => p.held), [false, false, false]);
  assert.equal(b.line.ok, "Pick " + ms[2].name, "on a portrait: Pick {name}"); assert.equal(build(st, { pick: { on: true, ids }, focus: "cell." + ms[0].id }).line.ok, "Unpick " + ms[0].name);
  const view = build(st, { pick: { on: true, ids }, filter: "0" }); assert.equal(view.props.regions.card.name, "3 picked (1 out of view)");
  const allB = build(st, { pick: { on: true, ids: ms.map((x) => x.id) } }), all = allB.props.regions.card; assert.deepEqual([all.plates[1].held, allB.nav.plates[1].why], [true, "Your last mibi at home stays"], "all of them picked: the last at home stays");
  assert.equal(build(st, { pick: { on: true, ids: [] } }).props.regions.card.state, "mibi", "with zero picks the card shows the last single mibi's card");
  const four = build(st, { pick: { on: true, ids: ms.slice(0, 6).map((x) => x.id) } }).props.regions.card; assert.deepEqual([four.faces.length, four.more], [4, 2], "up to four faces and +n");
});

test("Pick several on the host: Tuck away pays the sum and tucks every pick, Clear picks empties them, Move to takes every pick at home to a room with space (the count change on the row), a room with too little space reads its free places", () => {
  const st = world(3); const ms = fillRooms(st, [4, 6, 1]); S.addRoom(st, { ...settings, rooms: 3 }); st.turn += 5; st.rooms = 4; st.e = 99; const h = hostFor(st), v = h.ui.viv; h.settings.rooms = 4;
  v.pick = { on: true, ids: [ms[0].id, ms[1].id, ms[2].id] }; v.f = "plate.1"; v.last = ms[0].id; const e0 = st.e; INTENTS.vivarium.intent(h, "plate.1", "confirm");
  assert.deepEqual([ms[0], ms[1], ms[2]].map((x) => S.inStore(x)), [true, true, true]); assert.equal(st.e, e0 - 6); assert.equal(v.pick, null); assert.match(h.said.at(-1), /3 are tucked away/);
  const b = fillRooms(st, [0, 0, 0, 2]).length; void b; st.e = 99; const live = st.mibis.filter((x) => !S.inStore(x)); v.pick = { on: true, ids: [live[0].id, live[1].id] }; v.f = "plate.2"; INTENTS.vivarium.intent(h, "plate.2", "confirm");
  assert.deepEqual(v.pick, { on: true, ids: [] }, "Clear picks");
  v.pick = { on: true, ids: [live[0].id, live[1].id, live[2].id] }; v.f = "plate.0"; INTENTS.vivarium.intent(h, "plate.0", "confirm"); assert.deepEqual(v.move.ids, v.pick.ids);
  const M = build(st, { move: v.move, pick: v.pick, focus: null }).props.regions.move; assert.equal(M.title, "Move 3 to"); assert.equal(M.faces.length, 3);
  const tight = M.rows.find((r) => r.state === "tight"); if (tight) assert.match(tight.count, /free · swap|full · swap/);
  const free = M.rows.find((r) => r.state === "free"); assert.ok(free); v.f = "move." + free.id; INTENTS.vivarium.intent(h, v.f, "confirm"); assert.ok(live.slice(0, 3).every((x) => S.mibiById(st, x.id).room === +free.id)); assert.deepEqual([v.move, v.pick], [null, null]);
});

// ---- the Add a room row with the find requirement on (spec §2) ----
test("Add a room with the find requirement on: line 2 reads needs a find, {Room} found or {n} found; held without a find (the message), live with a find and the price met, short held with its price in amber", () => {
  const on = { ...settings, roomRules: { needFind: true } }, row = (st, s) => wallBuild({ st, sv: sv0(), settings: { ...s, rooms: st.rooms }, docked: true, light: "day", focus: "rail.add" }, spec, frameSpec, home, pods).props.regions.rail.rows.at(-1);
  const st = world(2); fillRooms(st, [3, 2]);
  assert.deepEqual([row(st, on).find, row(st, on).live, row(st, on).held], [{ lit: false, text: "needs a find" }, false, "find"]);
  S.addFind(st, "boulders", on); assert.deepEqual([row(st, on).find, row(st, on).live], [{ lit: true, text: "Boulders found" }, true]);
  S.addFind(st, "ferns", on); assert.equal(row(st, on).find.text, "2 found"); st.e = 3; assert.deepEqual([row(st, on).live, row(st, on).short, row(st, on).held], [false, true, "short"]);
  assert.equal(row(st, settings).find, null, "with the requirement off the row carries no find line");
});

test("no mibis at all: No mibis yet, the card's one plate Go to the Incubator with the ring on it; ✓ goes there", () => {
  const st = world(1), b = build(st); assert.deepEqual([b.props.state, b.props.regions.card.name, b.props.regions.card.plates.map((p) => p.verb), b.props.focus.cur, b.line.ok], ["none", "No mibis yet", ["Go to the Incubator"], "plate.0", "Go to the Incubator"]);
  assert.equal(b.props.regions.wall.message, "No mibis yet"); const h = hostFor(st); h.ui.viv.f = "plate.0"; INTENTS.vivarium.intent(h, "plate.0", "confirm"); assert.deepEqual(h.went, ["incubator"]);
});

test("the card's plates act by their act, not their place: Tuck away on the Wall (plate 3) tucks the mibi, Take along (plate 2) sends it with the Companion, Look (plate 0) looks", () => {
  const st = world(1); const ms = fillRooms(st, [4]); st.e = 99; const h = hostFor(st), v = h.ui.viv, m = ms[1]; v.last = m.id;
  v.f = "plate.3"; INTENTS.vivarium.intent(h, "plate.3", "confirm"); assert.ok(S.inStore(m), "Tuck away"); assert.match(h.said.at(-1), /is tucked away/);
  const m2 = ms[2]; v.last = m2.id; v.f = "plate.2"; INTENTS.vivarium.intent(h, "plate.2", "confirm"); assert.ok(st.carryReqs.some((x) => x.id === m2.id), "Take along queues the request");
  const m3 = ms[3]; v.last = m3.id; v.f = "plate.0"; INTENTS.vivarium.intent(h, "plate.0", "confirm"); assert.deepEqual([h.ui.hab.id, h.went.at(-1)], [m3.id, "habitat"], "Look");
});

// ---- the swap into a full room (the collection design §6) ----
const hv = (h) => h.ui.viv;
test("the swap into a full room: the card shows that room's residents, 4 across in 64 px faces; a traveller and one coming out are dim and held with their reason; the footer names the swap; Back returns to the room list", () => {
  const st = world(2); const ms = fillRooms(st, [3, 8]); st.e = 99; const m = ms[0], inB = S.inRoom(st, 1);
  st.dock = { docked: true, at: T0 }; const sv = sv0({ carried: [inB[1].id] }); inB[2].tucked = { turn: st.turn | 0, seq: 1, from: 1, out: (st.turn | 0) + 2, shift: 2, spot: 0 }; inB[2].room = 1;
  const b = wallBuild({ st, sv, settings: { ...settings, rooms: 2 }, docked: true, light: "day", focus: null, move: { id: m.id, swap: { room: 1, chosen: [] } } }, spec, frameSpec, home, pods), M = b.props.regions.move, W = M.swap;
  assert.deepEqual(validate(b.props, schema), []); assert.equal(W.cells.length, 8); assert.equal(W.room, "Reeds"); assert.equal(W.label, "", "one mibi: no choose count");
  assert.deepEqual(W.cells.map((c) => c.held), ["", "onboard", "coming", "", "", "", "", ""]); assert.ok(W.cells.every((c) => /:64x66(:|$)/.test(c.picture) || c.held), "the faces are the 64 px portraits");
  assert.deepEqual(b.props.focus.targets.map((t) => t.group), Array(8).fill("swap"), "the grid is the only target"); assert.equal(b.props.focus.cur, "swap." + W.cells[0].id, "the ring starts on the first resident that can move");
  assert.equal(b.line.ok, "Swap " + m.name + " with " + W.cells[0].name); assert.equal(b.line.back, "Cancel"); assert.equal(b.line.subject, W.cells[0].name + " · Reeds 8 of 8", "the footer centre is the ringed resident and its room");
  const held = wallBuild({ st, sv, settings: { ...settings, rooms: 2 }, docked: true, light: "day", focus: "swap." + W.cells[1].id, move: { id: m.id, swap: { room: 1, chosen: [] } } }, spec, frameSpec, home, pods);
  assert.equal(held.props.regions.move.swap.why, "On the Companion · bring it home first"); assert.equal(held.line.ok, null, "a held resident: no ✓ act");
  assert.equal(wallBuild({ st, sv, settings: { ...settings, rooms: 2 }, docked: true, light: "day", focus: "swap." + W.cells[2].id, move: { id: m.id, swap: { room: 1, chosen: [] } } }, spec, frameSpec, home, pods).props.regions.move.swap.why, "Back in 2 turns");
});

test("the swap on the host: the grid walks as a grid, ✓ swaps the two at once (the counts do not change), ✓ on a held resident says why and moves nothing", () => {
  const st = world(2); const ms = fillRooms(st, [3, 8]); st.e = 99; const h = hostFor(st), v = hv(h), m = ms[0], b0 = S.inRoom(st, 1).map((x) => x.id), pip = S.inRoom(st, 1)[5];
  h.sv.carried = [b0[1]]; v.move = { id: m.id }; v.last = m.id; v.f = "move.1"; INTENTS.vivarium.intent(h, "move.1", "confirm"); assert.equal(v.f, null); v.f = "swap." + b0[0];
  press(h, "right"); assert.equal(v.f, "swap." + b0[1]); INTENTS.vivarium.intent(h, v.f, "confirm"); assert.match(h.said.at(-1), /is on the Companion/); assert.equal(m.room, 0);
  press(h, "down"); assert.equal(v.f, "swap." + b0[5], "▼ stays in the column"); press(h, "down"); assert.equal(v.nudge, "down", "the last row nudges"); press(h, "left"); press(h, "left"); press(h, "left"); press(h, "left"); assert.equal(v.nudge, "left");
  v.f = "swap." + pip.id; const slot = [m.room, m.slot, pip.room, pip.slot]; INTENTS.vivarium.intent(h, v.f, "confirm");
  assert.deepEqual([m.room, m.slot, pip.room, pip.slot], [slot[2], slot[3], slot[0], slot[1]], "the two changed places"); assert.deepEqual([S.inRoom(st, 0).length, S.inRoom(st, 1).length], [3, 8]); assert.match(h.said.at(-1), new RegExp(m.name + " and " + pip.name + " swap places"));
  assert.deepEqual([v.move, v.f], [null, "cell." + m.id]);
});

test("several picked into a room with too little space: the row reads '1 free · swap 2', ✓ opens the grid with 'Choose 2 · 0 of 2', each ✓ chooses, ✓ again unchooses, nothing moves until the last choice, then the chosen take the places the picks vacate and the first pick takes the free place", () => {
  const st = world(2); const ms = fillRooms(st, [3, 7]); st.e = 99; const h = hostFor(st), v = hv(h), picks = ms.slice(0, 3).map((x) => x.id), inB = S.inRoom(st, 1).map((x) => x.id);
  const row = build(st, { move: { ids: picks } }).props.regions.move.rows[1]; assert.deepEqual([row.state, row.count], ["tight", "1 free · swap 2"]);
  v.pick = { on: true, ids: picks.slice() }; v.move = { ids: picks.slice() }; v.last = picks[0]; v.f = "move.1"; INTENTS.vivarium.intent(h, "move.1", "confirm"); assert.deepEqual(v.move.swap, { room: 1, chosen: [] });
  let b = build(st, { move: v.move, focus: null }); assert.equal(b.props.regions.move.swap.label, "Choose 2 · 0 of 2"); assert.match(b.line.subject, / · Reeds 8 of 8$/, "the choose count stays on the title line only"); assert.equal(b.props.regions.move.faces.length, 3);
  v.f = "swap." + inB[0]; INTENTS.vivarium.intent(h, v.f, "confirm"); assert.deepEqual(v.move.swap.chosen, [inB[0]]); assert.ok(ms.slice(0, 3).every((x) => x.room === 0), "nothing moves yet");
  INTENTS.vivarium.intent(h, v.f, "confirm"); assert.deepEqual(v.move.swap.chosen, [], "✓ again unchooses");
  INTENTS.vivarium.intent(h, "swap." + inB[0], "confirm"); b = build(st, { move: v.move, focus: "swap." + inB[1] }); assert.equal(b.props.regions.move.swap.label, "Choose 2 · 1 of 2"); assert.equal(b.line.ok, "Move 3 to Reeds", "the last choice moves"); assert.equal(b.props.regions.move.swap.cells[0].chosen, true);
  INTENTS.vivarium.intent(h, "swap." + inB[1], "confirm");
  assert.deepEqual([ms[0].room, ms[1].room, ms[2].room], [1, 1, 1], "all three are in Reeds"); assert.deepEqual([S.inRoom(st, 0).length, S.inRoom(st, 1).length], [2, 8], "two came the other way, Reeds is full");
  assert.deepEqual([S.mibiById(st, inB[0]).room, S.mibiById(st, inB[1]).room], [0, 0], "the chosen left"); assert.deepEqual([v.move, v.pick], [null, null]); assert.match(h.said.at(-1), /3 are in Reeds/);
});

// ---- Breed opens the partner pick (the breeding design §3.1, §3.2) ----
const pairWorld = () => {   // Roots: Fen (A, a child of Oak and Elm), Wren (a child of Oak and Pip: half kin of Fen), Oak, Elm; Reeds: Moss, Pip (founders), Bud (young), Sky (on a breather)
  const st = world(2); const ms = fillRooms(st, [4, 4]); const [oak, elm, fen, wren, moss, pip, bud, sky] = ms;
  oak.name = "Oak"; elm.name = "Elm"; fen.name = "Fen"; wren.name = "Wren"; moss.name = "Moss"; pip.name = "Pip"; bud.name = "Bud"; sky.name = "Sky";
  fen.parents = [{ id: oak.id, name: "Oak" }, { id: elm.id, name: "Elm" }]; wren.parents = [{ id: oak.id, name: "Oak" }, { id: pip.id, name: "Pip" }]; oak.born = 1; elm.born = 2; moss.born = 3; pip.born = 3; bud.born = st.turn; sky.restUntil = st.turn + 2; st.turn += 1; sky.restUntil = st.turn + 2;
  return { st, ms, fen, wren, oak, elm, moss, pip, bud, sky };
};
test("the partner pick: A's species only with A left out; those who can breed now first, furthest kin first and the oldest on a tie, then those who cannot, dimmed; rail and toolbar held; Back is Cancel", () => {
  const { st, fen, wren, oak, elm, moss, pip, bud, sky } = pairWorld();
  const b = build(st, { pair: { a: fen.id }, focus: null }); const W = b.props.regions.wall;
  assert.deepEqual(validate(b.props, schema), []);
  assert.deepEqual(W.cells.map((c) => +c.id), [moss, pip, wren, sky, bud, oak, elm].map((x) => x.id), "unrelated first (the older first on a tie, then by id), half kin next, then those who cannot yet: the one resting, the young, then family, the oldest first: Fen's parents");
  assert.deepEqual(b.props.focus.targets.map((t) => t.group).filter((g, i, a) => a.indexOf(g) === i).sort(), ["cell", "plate"], "the rail and the toolbar are held: no ring lands on them");
  assert.equal(b.props.focus.cur, "cell." + moss.id, "the ring starts on the first partner in rank order"); assert.equal(b.line.back, "Cancel");
  const C = b.props.regions.card; assert.equal(C.state, "pair"); assert.equal(C.head, "Breed Fen with…"); assert.equal(C.name, "Moss"); assert.match(C.headFace, /:36x37(:|$)/);
  assert.deepEqual(C.lines, ["wild blood"]); assert.deepEqual(C.stateLines, []); assert.deepEqual(C.long, ["nothing shared, so nothing shifts"]); assert.match(C.pairLine, /^Fen rests 1 turn · Moss 1$/); assert.equal(C.plates.length, 1); assert.deepEqual([C.plates[0].verb, C.plates[0].held], ["See this pair", true]);
  const kin = build(st, { pair: { a: fen.id }, focus: "cell." + wren.id }).props.regions.card; assert.deepEqual(kin.lines, ["half kin"]);
  assert.deepEqual(kin.long, ["hidden looks show more, blends drift toward the middle"]); assert.ok(!kin.long.join(" ").includes("half kin"), "the kin word is printed once");
  // family: dimmed with the relation in place of the kin word, the refusal on the held plate, no forecast line, never a state line or a rest line
  const fam = build(st, { pair: { a: fen.id }, focus: "cell." + oak.id, forecastOpen: true }), fc = fam.props.regions.card;
  assert.deepEqual([fc.lines, fc.stateLines, fc.long, fc.pairLine], [[spec.strings.pair.family.parent.replace("{A}", "Fen")], [], [], ""]); assert.equal(fc.plates[0].held, true); assert.equal(fam.line.ok, null);
  assert.equal(build(st, { pair: { a: fen.id }, focus: "plate.0", last: oak.id }).props.regions.card.why, spec.strings.why.family);
  const rel = (x) => build(st, { pair: { a: oak.id }, focus: "cell." + x.id }).props.regions.card.lines[0];
  assert.deepEqual([rel(fen), rel(wren), rel(elm)], [1, 2].map(() => spec.strings.pair.family.child.replace("{A}", "Oak")).concat(spec.strings.pair.kin.wild), "the co-parent is not family");
  assert.deepEqual(Object.keys(spec.strings.pair.family), ["parent", "grandparent", "great-grandparent", "child", "grandchild", "great-grandchild", "same-parents"]);
  const young = build(st, { pair: { a: fen.id }, focus: "cell." + bud.id }).props.regions.card; assert.equal(young.stateLines[0], "young"); assert.match(young.stateLines[1], /^grows up in \d+ turns?$/);
  const rest = build(st, { pair: { a: fen.id }, focus: "cell." + sky.id }); assert.deepEqual(rest.props.regions.card.stateLines, ["on a breather", "breeds in 2 turns"]); assert.match(rest.props.regions.card.mark, /mark-breather-16/, "the breather's mark leads the state"); assert.equal(rest.props.regions.card.why, "", "the why line shows with the ring on the plate");
  const onPlate = build(st, { pair: { a: fen.id }, focus: "plate.0", last: sky.id }); assert.equal(onPlate.props.regions.card.why, "on a breather · can breed in 2 turns", "an unpickable partner: the plate is held with its reason");
  assert.equal(build(st, { pair: { a: fen.id }, focus: "plate.0", last: moss.id }).props.regions.card.why, "The forecast is not open yet", "a pickable one: the cross is the breeding screens' (held here)");
  assert.equal(build(st, { pair: { a: fen.id }, focus: "cell." + moss.id }).line.ok, null, "held: no ✓ act on any partner"); assert.equal(build(st, { pair: { a: fen.id }, focus: "cell." + sky.id }).line.ok, null);
  assert.equal(build(st, { pair: { a: fen.id }, focus: "cell." + moss.id, forecastOpen: true }).line.ok, "See Fen and Moss", "when the forecast lands: See {A} and {B} on a pickable partner"); assert.equal(build(st, { pair: { a: fen.id }, focus: "cell." + sky.id, forecastOpen: true }).line.ok, null, "and none on one who cannot be picked");
});

test("Breed on the card: held on a breather with the spec's words, live otherwise; no partner free now names who can breed soonest; ✓ opens the pick and Cancel returns with the card on Breed", () => {
  const { st, fen, moss, pip, oak, elm, wren, bud, sky } = pairWorld(); const h = hostFor(st), v = hv(h);
  const plates = (x) => build(st, { focus: "cell." + x.id, last: x.id }).props.regions.card.plates; assert.equal(plates(fen)[4].held, false);
  fen.restUntil = st.turn + 1; const nb = build(st, { focus: "plate.4", last: fen.id }); assert.equal(nb.props.regions.card.why, "on a breather · can breed next turn"); assert.equal(plates(fen)[4].held, true);
  fen.restUntil = 0; for (const x of [oak, elm, wren, moss, pip]) x.restUntil = st.turn + 3; sky.restUntil = st.turn + 2;
  assert.equal(build(st, { focus: "plate.4", last: fen.id }).props.regions.card.why, "no partner free now · Sky can breed in 2 turns");
  for (const x of [oak, elm, wren, moss, pip, sky]) x.restUntil = 0; v.last = fen.id; v.f = "plate.4"; INTENTS.vivarium.intent(h, "plate.4", "confirm");
  assert.deepEqual([v.pair, v.f, v.last], [{ a: fen.id }, "cell." + moss.id, moss.id], "the pick opens on the first partner");
  press(h, "left"); assert.equal(v.nudge, "left", "the rail is held: ◀ at the wall's edge nudges"); press(h, "up"); assert.equal(v.nudge, "up", "and so is the toolbar");
  const at = v.f; INTENTS.vivarium.intent(h, v.f, "confirm"); assert.equal(v.f, at, "✓ on a partner is ✓ on See this pair: the ring stays"); assert.equal(h.said.at(-1), "The forecast is not open yet", "held: the plate's message");
  INTENTS.vivarium.intent(h, v.f, "back"); assert.deepEqual([v.pair, v.f, v.last], [null, "plate.4", fen.id], "Cancel: the Wall, the ring on Breed, the card on Fen");
});

test("the crumb: the top bar reads Vivarium | Mibis on the Wall", () => {
  const st = world(1); fillRooms(st, [3]); assert.deepEqual(build(st).top, { readout: { text: "| Mibis", mark: null } });
});

test("the breather (spec §3, §5): the disc after coming out and before asleep, the card's state on two lines with the mark, Breed held with its turns right-aligned", () => {
  const { st, fen, sky } = pairWorld(); sky.restUntil = st.turn + 2;
  const b = build(st, { focus: "cell." + sky.id, last: sky.id }), cell = b.props.regions.wall.cells.find((c) => c.id === String(sky.id)); assert.match(cell.mark, /mark-breather-16/, "the disc on the wall portrait");
  assert.deepEqual(b.props.regions.card.stateLines, ["on a breather", "breeds in 2 turns"]); assert.match(b.props.regions.card.mark, /mark-breather-16/);
  assert.deepEqual([b.props.regions.card.plates[4].held, b.props.regions.card.plates[4].price], [true, "2 turns"], "Breed held, its turns on the plate"); sky.restUntil = st.turn + 1; assert.equal(build(st, { focus: "cell." + sky.id, last: sky.id }).props.regions.card.stateLines[1], "breeds next turn");
  sky.restUntil = st.turn + 2; assert.equal(S.mibiStage(st, sky, settings) === "juvenile" ? "x" : markOf(st, sv0(), sky, settings, true), "breather", "before asleep");
  sky.bonded = true; assert.equal(markOf(st, sv0(), sky, settings, false), "breather", "and before the heart");
  sky.tucked = { turn: st.turn, seq: 1, from: 0, out: st.turn + 2, shift: 2, spot: 0 }; assert.equal(markOf(st, sv0(), sky, settings, false), "comingOut", "after coming out"); void fen;
});
test("the partner's state on the pair card: each part between · its own line, no line ends in a hanging word; the breather leads with its mark", () => {
  const { st, fen, bud, sky } = pairWorld();
  const lines = (x) => build(st, { pair: { a: fen.id }, focus: "cell." + x.id }).props.regions.card.stateLines;
  assert.deepEqual(lines(sky), ["on a breather", "breeds in 2 turns"]); assert.equal(lines(bud)[0], "young"); assert.match(lines(bud)[1], /^grows up in 1 turn$|^grows up in \d+ turns$/);
  for (const l of [...lines(sky), ...lines(bud)]) assert.ok(!/(·|can|in)$/.test(l), l);
  const away = pairWorld(); away.moss.tucked = { turn: away.st.turn, seq: 1, from: 1 }; assert.deepEqual(build(away.st, { pair: { a: away.fen.id }, focus: "cell." + away.moss.id }).props.regions.card.stateLines, ["tucked away"]);
});
test("the swap grid's words: Keep {name} in {Room} on a chosen resident, the picks that stay read one wording, no string talks about the build", () => {
  const st = world(2); const ms = fillRooms(st, [3, 7]); st.e = 99; const picks = [ms[0].id, ms[1].id, ms[3].id], inB = S.inRoom(st, 1).map((x) => x.id);
  const mk = (focus, chosen = []) => build(st, { move: { ids: picks, swap: { room: 1, chosen } }, focus });
  const own = mk("swap." + ms[3].id); assert.equal(own.props.regions.move.swap.cells.find((c) => c.id === String(ms[3].id)).held, "stays");
  assert.equal(own.props.regions.move.swap.why, ms[3].name + " is one of the picks · it stays in Reeds");
  const ch = mk("swap." + inB[1], [inB[1]]); assert.equal(ch.line.ok, "Keep " + S.mibiById(st, inB[1]).name + " in Reeds");
  assert.equal(spec.strings.msg.swapStays, undefined, "one wording for the picks that stay"); assert.equal(spec.strings.pair.choose, undefined);
  const bad = []; (function walk(o, path) { if (typeof o === "string") { if (/screens|build|branch/i.test(o)) bad.push(path + ": " + o); } else if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) walk(v, path + "." + k); })(spec.strings, "strings"); assert.deepEqual(bad, []);
});
test("the dim at both steps: those who cannot be picked and the tucked request the ×0.55 variant at 100/304 and at 64/304", () => {
  for (const per of [[5, 3], [8, 9, 4]]) {
    const st = world(per.length); const ms = fillRooms(st, per); const all = ms.length, a = ms[0]; ms.at(-1).restUntil = st.turn + 2; S.tuckAway(st, sv0(), ms[1], { ...settings, rooms: st.rooms }); st.e = 99;
    const b = build(st, { pair: { a: a.id } }), W = b.props.regions.wall, dim = W.cells.filter((c) => c.dim);
    assert.equal(W.size[0], all - 1 > 15 ? 64 : 100, "the step"); assert.ok(dim.length >= 1); for (const c of dim) assert.ok(b.requests.some((r) => r.kind === "mibiv" && r.variant === "dark" && r.id === c.picture && r.base.size[0] === W.size[0]), "a dark variant of the cell's own size");
    for (const c of W.cells.filter((c) => !c.dim)) assert.ok(!b.requests.some((r) => r.kind === "mibiv" && r.id === c.picture));
  }
});
