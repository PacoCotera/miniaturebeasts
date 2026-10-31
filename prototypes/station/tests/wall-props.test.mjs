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
import { wallBuild, orderOf, tickOf, stepOf, SORTS } from "../src/views/wall-props.mjs";
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
  assert.deepEqual([R.rows[1].full, R.rows[1].fill, R.rows[2].fill, R.rows[1].tick, R.rows[2].tick], [true, 8, 3, { n: 1, colour: "sky", broken: false }, { n: 2, colour: "sprout", broken: false }]);
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
    { n: 1, colour: "sky", broken: false }, { n: 2, colour: "sprout", broken: false }, { n: 3, colour: "sand", broken: false }, { n: 4, colour: "lilac", broken: false }, { n: 5, colour: "aqua", broken: false }, { n: 6, colour: "pink", broken: false },
    { n: 7, colour: "sky", broken: true }, { n: 10, colour: "lilac", broken: true }]);
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
const hostFor = (st) => { const said = [], went = [], ui = { screen: "vivarium", viv: { f: null, prev: null, view: "wall", page: 0, last: null, pin: null, sort: "room", filter: "all", pick: null, row0: 0, first: 0, nudge: null }, hab: { id: null, f: "resident" }, home: { f: "room" }, panel: null };
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
  press(h, "up"); assert.equal(v.f, "move.1"); INTENTS.vivarium.intent(h, v.f, "confirm"); assert.match(h.said.at(-1), /Reeds is full/); assert.deepEqual([m.room, S.inRoom(st, 1).length], [0, 8]);
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
