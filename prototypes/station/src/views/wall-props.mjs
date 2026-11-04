// The Wall as props (the mibi collection's inventory page; vivarium.json `wall`): pure selectors from the state and the Wall's UI (UI.viv) to the props the face draws: the room rail, the toolbar, the wall of portraits and the footer line.
// Props name *what* (ids, strings, flags, pictures by id), never where: the face places every rectangle from vivarium.json `wall`. The rules the page reads (prices, finds, settling turns) come from state.mjs, which reads rooms-rules.json.
// m: { st, sv, settings, docked, light, focus (the ring: a target id or null), last (the mibi the card shows), sort ("room" | "kind" | "age"), filter ("all" | "<room i>" | "tucked"), pick ({ on, ids } or null), row0 (the wall's first row shown), first (the rail pane's first room),
//      time, rules (vivarium.json rules) for the sleepers, nudge (the key a press with nothing beyond leaves lit: "left" ... or null),
//      move ({ id | ids, swap: { room, chosen: [mibi ids] } | absent }: Move to, and its swap grid), pair ({ a: the mibi to breed }: the partner pick), forecastOpen (the pair card's See this pair is live) }
// Returns { props, line, requests, nav, top }: `nav` is the host's (not sent): the order shown, the geometry the key walk needs and the card's mibi; `top` is the top bar's crumb.
import * as S from "../state.mjs";
import { mibiReq, mibiRequest, mibiVariantReq, figureOf, restOf, hash } from "./home-props.mjs";
import { roomData, withLight } from "./room-props.mjs";
import { req as reqOf, slot as slotOf } from "./requests.mjs";
import { frameOf } from "../genome.mjs";
import { drawnLooks } from "../looks.mjs";
import { fill } from "./words.mjs";
import { platesOf, stateWords, breatherLeft, breatherWords, breatherAfter, youngTurns } from "./vivarium-props.mjs";

const living = (st) => st.mibis.filter((m) => !m.released);
export const SORTS = ["room", "kind", "age"];
// Where a mibi is: "room" (present), "carried" (with the Companion, its place kept), "coming" (coming out), "store" (tucked away)
export function whereOf(st, sv, m) { return S.inStore(m) ? "store" : S.comingOut(st, m) ? "coming" : S.isCarried(st, sv, m) ? "carried" : "room"; }
const num = (m) => parseInt(String(S.speciesOf(m)).replace(/\D/g, ""), 10) || 0;
const AGE = { elder: 0, adult: 1, juvenile: 2 };
// The order of the wall (spec §3): Room: rail order, Tucked away last, inside a room by species number, oldest first, name; Kind: species number, room, oldest first; Age: elder, adult, young, oldest first, name. Tucked away mibis go below the rest in every sort.
export function orderOf(st, settings, list, sort) {
  const room = (m) => (S.inStore(m) ? 1e6 : m.room ?? 1e5), old = (a, b) => (a.born | 0) - (b.born | 0), name = (a, b) => String(a.name).localeCompare(String(b.name)), stage = (m) => AGE[S.mibiStage(st, m, settings)] ?? 1;
  const by = { room: (a, b) => room(a) - room(b) || num(a) - num(b) || old(a, b) || name(a, b), kind: (a, b) => num(a) - num(b) || room(a) - room(b) || old(a, b) || name(a, b), age: (a, b) => stage(a) - stage(b) || old(a, b) || name(a, b) }[sort] ?? (() => 0);
  return list.slice().sort((a, b) => (S.inStore(a) - S.inStore(b)) || by(a, b) || a.id - b.id);
}
// The size step by the count shown (spec §3): up to 15, 100/304 on a 98 x 129 pitch, five across; above 15, 64/304 on a 70 x 83 pitch, seven across
export const stepOf = (spec, n) => spec.wall.wall.steps.find((s) => s.upTo == null || n <= s.upTo);
// One mark a portrait, the first that applies (spec §3): companion away / docked, coming out, on a breather, asleep, bonded heart, elder stick; a tucked mibi wears the cold mark
export function markOf(st, sv, m, settings, asleep = false) {
  const w = whereOf(st, sv, m);
  if (w === "store") return "tucked";
  if (w === "carried") return S.docked(st) ? "companionDocked" : "companionAway";
  if (w === "coming") return "comingOut";
  if (breatherLeft(st, m) > 0) return "breather";
  if (asleep) return "resting";
  if (m.bonded) return "bonded";
  if (S.mibiStage(st, m, settings) === "elder") return "elder";
  return null;
}
// The looks line (spec §5): the looks on which it differs from the player's other mibis of its species, in trait order; "your only {Species}" for a singleton; nothing for a twin
export function looksOf(st, m, Sg) {
  const sp = S.speciesOf(m), fr = frameOf(sp), kin = living(st).filter((x) => S.speciesOf(x) === sp);
  if (kin.length < 2) return [fill(Sg.card.only, { Species: S.spName(m) })];
  const mine = drawnLooks(fr, m), all = kin.map((x) => drawnLooks(fr, x)), out = [];
  for (const t of Object.keys(mine)) if (all.some((l) => l[t] !== mine[t])) out.push(String(mine[t]));
  return out;
}
// The partner pick (the Wall in a mode): why a mibi of A's species cannot be picked as B now, { key, text }, or null when it can. Family first (a reason that never changes: waiting will not help), then a traveller, one tucked away or coming out, one still young, one on a breather
export function pairWhy(st, sv, x, settings, Sg, a = null) {
  const W = Sg.why, P = Sg.pair, w = whereOf(st, sv, x), kin = a ? S.directKinOf(st, a, x) : null;
  if (kin) return { key: "family", text: W.partnerFamily, rel: kin.rel };
  if (w === "carried") return { key: "onboard", text: P.onboard };
  if (w === "store") return { key: "tucked", text: P.tucked };
  if (w === "coming") { const n = S.backIn(st, x); return { key: "coming", text: n === 1 ? W.comingOne : fill(W.coming, { n }) }; }
  if (S.mibiStage(st, x, settings) === "juvenile") { const n = youngTurns(st, x, settings); return { key: "young", text: n === 1 ? W.breedYoungOne : n == null ? W.breedYoung.split(" \u00b7 ")[0] : fill(W.breedYoung, { n }) }; }
  const b = breatherLeft(st, x); if (b > 0) return { key: "breather", text: breatherWords(W, b) };
  return null;
}
// The order of the pick: A's species only, A left out; first those who can breed now, then those who cannot yet, each furthest kin first and, on a tie, the oldest; family last, the oldest first
export function pairOrder(st, sv, a, settings, Sg) {
  const kin = living(st).filter((x) => x.id !== a.id && S.speciesOf(x) === S.speciesOf(a)), k = new Map(kin.map((x) => [x.id, S.kinshipOf(st, a, x)]));
  const by = (x, y) => k.get(x.id) - k.get(y.id) || (x.born | 0) - (y.born | 0) || x.id - y.id, why = (x) => pairWhy(st, sv, x, settings, Sg, a), can = (x) => !why(x), fam = (x) => why(x)?.key === "family", old = (x, y) => (x.born | 0) - (y.born | 0) || x.id - y.id;
  return [...kin.filter(can).sort(by), ...kin.filter((x) => !can(x) && !fam(x)).sort(by), ...kin.filter(fam).sort(old)];
}
// The state of a mibi as the card's lines (spec §5): each part its own line, the mark leading the first; the breather takes two ("on a breather" / "breeds in {n} turns")
export function stateLinesOf(st, sv, m, settings, Sg) {
  const S2 = Sg.state;
  if (!S.inStore(m) && !S.comingOut(st, m) && !S.isCarried(st, sv, m) && breatherLeft(st, m) > 0) { const n = breatherLeft(st, m); return n === 1 ? S2.breatherNext : S2.breather.map((l) => fill(l, { n })); }
  const one = stateWords(st, sv, m, settings, Sg); return one ? [one] : [];
}
// A partner's state on the pair card, the card's state form: each part its own line (the breather leads with its mark in the card)
export function pairStateLines(why, st, x, settings, Sg) {
  const T = Sg.pair.state, F = (l, n) => fill(l, { n });
  if (why.key === "breather") { const n = breatherLeft(st, x); return n === 1 ? T.breatherNext : T.breather.map((l) => F(l, n)); }
  if (why.key === "young") { const n = youngTurns(st, x, settings); return n === 1 || n == null ? T.youngOne : T.young.map((l) => F(l, n)); }
  if (why.key === "coming") { const n = S.backIn(st, x); return n === 1 ? T.comingOne : T.coming.map((l) => F(l, n)); }
  return [why.text];
}
export const kinBand = (k) => (k <= 0 ? "wild" : k < 1 / 16 ? "distant" : k < 1 / 8 ? "cousins" : k < 1 / 4 ? "half" : k < 1 / 2 ? "close" : "same");
export const tickOf = (i) => (i == null ? null : { n: i + 1, colour: ["sky", "sprout", "sand", "lilac", "aqua", "pink"][i % 6], hollow: i >= 6 });   // the room's place in the bought order: six hues, then the same hues broken (rooms 7 to 10)

export function wallBuild(m, spec, frame, home, pods) {
  const { st, sv, settings } = m, requests = [], req = reqOf(requests), W = spec.wall, Sg = spec.strings, docked = !!m.docked, light = m.light ?? "day";
  const slot = slotOf(req, "its master (the collection inventory design)");
  const nRooms = S.roomCount(st, settings), all = living(st), sort = SORTS.includes(m.sort) ? m.sort : "room";
  const roomOf = (v) => (/^\d+$/.test(String(v)) && +v < nRooms ? +v : null);
  const filter = m.filter === "tucked" ? "tucked" : roomOf(m.filter) != null ? roomOf(m.filter) : "all";
  const markPic = (key) => (key ? slot(spec.regions.marks.masters[key], key === "comingOut" ? [12, 12] : [16, 16]) : "");
  const pairA = m.pair ? S.mibiById(st, m.pair.a) : null, pairing = !!pairA && !pairA.released && !m.move;   // the partner pick: the wall shows A's species only, A left out
  const pick = !pairing && m.pick && m.pick.on ? m.pick : null, picked = new Set((pick?.ids ?? []).map(String));

  // ---- what the wall shows ----
  const shownList = pairing ? pairOrder(st, sv, pairA, settings, Sg) : filter === "all" ? all : filter === "tucked" ? all.filter((x) => S.inStore(x)) : all.filter((x) => !S.inStore(x) && x.room === filter);
  const settling = !pairing && typeof filter === "number" && S.isSettling(st, filter) ? S.settlingLeft(st, filter) : 0;
  const ordered = pairing ? shownList : settling ? [] : orderOf(st, settings, shownList, sort), step = stepOf(spec, ordered.length), cols = step.cols, rowsN = Math.ceil(ordered.length / cols), vis = Math.floor(W.wall.rect[3] / step.pitch[1]);

  // ---- the ring, the card's mibi, the scroll ----
  const idOfCell = (t) => { const r = /^cell\.(\d+)$/.exec(t ?? ""); return r ? +r[1] : null; };
  const lastId = m.last != null && ordered.some((x) => x.id === m.last) ? m.last : null;
  const ringId = idOfCell(m.focus);
  const keepRow = ringId != null ? ordered.findIndex((x) => x.id === ringId) : -1;
  let row0 = Math.max(0, Math.min(m.row0 | 0, Math.max(0, rowsN - vis)));
  if (keepRow >= 0) { const r = Math.floor(keepRow / cols); if (r < row0) row0 = r; else if (r >= row0 + vis) row0 = r - vis + 1; row0 = Math.max(0, Math.min(row0, Math.max(0, rowsN - vis))); }
  const cardMibi = (id) => { const x = id != null ? S.mibiById(st, id) : null; return x && !x.released ? x : null; };
  const cmb = pairing ? cardMibi(ringId) ?? cardMibi(lastId) ?? ordered[0] ?? null : cardMibi(ringId) ?? cardMibi(m.last) ?? ordered[0] ?? all[0] ?? null;

  // ---- the sleepers (a mibi at home, by the Station time) ----
  const here = all.filter((x) => whereOf(st, sv, x) === "room"), rest = m.time != null && m.rules?.rest ? restOf(here.map((x) => ({ id: String(x.id), seed: hash(x.id), species: S.speciesOf(x), stage: S.mibiStage(st, x, settings) })), m.time, m.rules.rest) : {};

  // ---- the cells ----
  const view = step.view, size = step.size, targets = [], regions = {};
  const add = (id, group, extra = {}) => targets.push({ id, group, ...extra });
  const cells = ordered.slice(row0 * cols, (row0 + vis) * cols).map((mb, k) => {
    const w = whereOf(st, sv, mb), tucked = w === "store" || (pairing && !!pairWhy(st, sv, mb, settings, Sg, pairA)), base = mibiRequest(st, mb, size, settings, light, view);   // in the pick those who cannot breed now are dimmed as tucked ones are
    const picture = tucked ? mibiVariantReq(req, base, "dark") : req(base);
    const key = markOf(st, sv, mb, settings, rest[String(mb.id)] === "asleep");
    const cell = { id: String(mb.id), picture, figure: figureOf(st, mb, size, settings, view) ?? [0, 0, size[0], size[1]], mark: markPic(key), tick: tucked ? null : tickOf(mb.room), dim: tucked, picked: picked.has(String(mb.id)), index: row0 * cols + k };
    add("cell." + mb.id, "cell", { index: cell.index });
    return cell;
  });
  regions.wall = { size, cols, row0, rows: rowsN, vis, pick: !!pick, total: ordered.length, cells, message: "", track: rowsN > vis ? { thumb: [row0, vis, rowsN] } : null, nudge: m.nudge ?? null };
  if (!all.length) regions.wall.message = Sg.wall.none; else if (settling) regions.wall.message = fill(Sg.wall.settling, { Room: S.roomName(st, filter), n: settling }); else if (!ordered.length) regions.wall.message = typeof filter === "number" ? fill(Sg.wall.emptyRoom, { room: S.roomName(st, filter) }) : Sg.wall.none;

  // ---- the rail ----
  const rows = [], tuckedList = S.tuckedAway(st), lit = filter === "all" ? "all" : filter === "tucked" ? "tucked" : String(filter);
  rows.push({ id: "all", kind: "all", name: Sg.rail.all, count: String(all.length), lit: lit === "all" });
  const winFirst = nRooms > W.rail.pane.rows ? Math.max(0, Math.min(m.first | 0, nRooms - W.rail.pane.rows)) : 0, winN = Math.min(nRooms, W.rail.pane.rows);
  const ringRoom = /^rail\.(\d+)$/.exec(m.focus ?? ""); let first = winFirst;
  if (nRooms > W.rail.pane.rows) { const at = ringRoom ? +ringRoom[1] : typeof filter === "number" ? filter : null; if (at != null) { if (at < first) first = at; else if (at >= first + winN) first = at - winN + 1; } first = Math.max(0, Math.min(first, nRooms - winN)); }
  for (let i = first; i < first + winN; i++) {
    const n = S.inRoom(st, i).length, left = S.settlingLeft(st, i), th = roomData(S.themeIndex(st, i)), cut = th?.rail ?? null, tid = cut ? withLight(cut, light) : null;
    rows.push({ id: String(i), kind: "room", name: S.roomName(st, i), count: left ? fill(Sg.rail.turns, { n: left }) : fill(Sg.rail.count, { a: n }), full: !left && n >= S.ROOM, fill: left ? null : n, settling: left, tick: tickOf(i), lit: lit === String(i), edge: ringId != null && S.mibiById(st, ringId)?.room === i && !S.inStore(S.mibiById(st, ringId)),
      picture: !tid ? "" : left ? req({ kind: "dim", id: `${tid}~dim`, master: tid, size: W.rail.row, k: W.rail.dim }) : slot(tid, W.rail.row) });
  }
  rows.push({ id: "tucked", kind: "tucked", name: Sg.rail.tucked, count: String(tuckedList.length), lit: lit === "tucked", mark: markPic("tucked") });
  // Add a room: the price, and the find (the glint, lit when a find is home), live when a find is home (or none is needed) and the price is met
  const canAdd = nRooms < S.ROOM_THEMES.length && S.canAddRoom(st, settings), rules = S.roomRules(settings);
  if (canAdd) {
    const p = S.roomPrice(st, settings), block = S.addRoomBlock(st, settings), finds = S.findsHome(st, settings), need = rules.needFind;
    const findText = !need ? "" : finds.length > 1 ? fill(Sg.rail.found, { n: finds.length }) : finds.length === 1 ? fill(Sg.rail.foundOne, { Room: S.ROOM_NAMES[S.ROOM_THEMES.indexOf(finds[0])] }) : Sg.rail.needFind;
    rows.push({ id: "add", kind: "add", name: Sg.rail.add, price: S.priceText(p, 0, 0), short: !S.canPay(st, p, 0, 0), find: need ? { lit: finds.length > 0, text: findText } : null, live: !block, held: block ? block.key : null });
  }
  regions.rail = { n: nRooms, first, pane: nRooms > W.rail.pane.rows ? { first, rows: winN, more: { top: first > 0, bottom: first + winN < nRooms } } : null, rows };
  rows.forEach((r, i) => add("rail." + r.id, "rail", { index: i }));

  // ---- the toolbar ----
  regions.toolbar = { sorts: SORTS.map((id) => ({ id, label: Sg.toolbar[id], lit: id === sort })), pill: { text: pick ? fill(Sg.toolbar.picking, { n: picked.size }) : Sg.toolbar.pick, on: !!pick } };
  for (const s of SORTS) add("sort." + s, "tool"); add("pill", "tool");

  // ---- Move to (spec §6): the card becomes the room list of one mibi ----
  const moveIds = m.move ? (m.move.ids ?? [m.move.id]).map(Number) : [], movers = moveIds.map((id) => S.mibiById(st, id)).filter((x) => x && !x.released && (moveIds.length === 1 || whereOf(st, sv, x) === "room")), mv = movers[0] ?? null, moving = !!mv, several = movers.length > 1; let moveAll = [], swapInfo = null;
  if (moving) {
    const MV = W.move, list = [];
    for (let i = 0; i < nRooms; i++) {
      const left = S.settlingLeft(st, i), n = S.inRoom(st, i).length, inside = movers.filter((x) => x.room === i && !S.inStore(x)).length, need = movers.length - inside, free = S.ROOM - n, th = roomData(S.themeIndex(st, i)), cid = th?.move ? withLight(th.move, light) : "";
      const state = left ? "settling" : need === 0 ? "here" : need > free ? "tight" : "free", b = n + (state === "free" ? need : 0);
      list.push({ id: String(i), kind: "room", name: S.roomName(st, i), state, dots: left ? 0 : n, next: state === "free" ? n : null, of: S.ROOM, need, free,
        count: left ? fill(Sg.move.settling, { n: left }) : state === "here" ? Sg.move.here : state === "tight" ? (free === 0 ? Sg.move.full : fill(Sg.move.tight, { f: free, k: need - free })) : fill(Sg.move.count, { a: n, b }),
        picture: !cid ? "" : left ? req({ kind: "dim", id: `${cid}~dim`, master: cid, size: MV.row.slice(2), k: W.rail.dim }) : slot(cid, MV.row.slice(2)), n, after: b, left });
    }
    if (canAdd) { const p = S.roomPrice(st, settings), block = S.addRoomBlock(st, settings); list.push({ id: "add", kind: "add", name: Sg.rail.add, price: S.priceText(p, 0, 0), short: !S.canPay(st, p, 0, 0), live: !block, held: block ? block.key : null }); }
    moveAll = list.map((x) => x.id); const winN = several ? MV.pane.severalRows : MV.pane.rows; let first = Math.max(0, Math.min(m.moveFirst | 0, Math.max(0, list.length - winN)));
    const at = /^move\.(.+)$/.exec(m.focus ?? ""), ix = at ? list.findIndex((x) => x.id === at[1]) : -1; if (ix >= 0) { if (ix < first) first = ix; else if (ix >= first + winN) first = ix - winN + 1; }
    const strip = several ? { faces: movers.slice(0, MV.strip.max).map((x) => req(mibiRequest(st, x, [36, 37], settings, light, "vivariumFace36"))), more: Math.max(0, movers.length - MV.strip.max) } : {};
    regions.move = { title: fill(several ? Sg.move.titleMany : Sg.move.title, { name: mv.name, n: movers.length }), face: several ? "" : req(mibiRequest(st, mv, [36, 37], settings, light, "vivariumFace36")), ...strip, id: String(mv.id), first, n: list.length, pane: list.length > winN ? { more: { top: first > 0, bottom: first + winN < list.length } } : null, rows: list.slice(first, first + winN) };
    targets.length = 0; list.forEach((x, i) => add("move." + x.id, "move", { index: i }));
    // ---- the swap into a full room (spec §6): the card shows that room's residents, 4 across in 64 px faces; the ones that cannot move are dim and held with their reason ----
    const sr = m.move.swap != null ? list.find((x) => x.id === String(m.move.swap.room) && (x.state === "full" || x.state === "tight")) : null;
    if (sr) {
      const SW = W.move.swap, G = SW.grid, S64 = W.wall.steps[G.step], k = sr.need - sr.free, ins = new Set(movers.filter((x) => x.room === +sr.id && !S.inStore(x)).map((x) => x.id)), Wh = Sg.why;
      const cells = S.inRoom(st, +sr.id).map((x, q) => { const w = whereOf(st, sv, x), nB = S.backIn(st, x), held = w === "carried" ? { key: "onboard", why: Wh.onboard } : w === "coming" ? { key: "coming", why: nB === 1 ? Wh.comingOne : fill(Wh.coming, { n: nB }) } : ins.has(x.id) ? { key: "stays", why: fill(Wh.swapStays, { name: x.name, Room: sr.name }) } : null;
        const base = mibiRequest(st, x, S64.size, settings, light, S64.view), key = markOf(st, sv, x, settings, false);
        return { id: String(x.id), name: x.name, picture: held ? mibiVariantReq(req, base, "dark") : req(base), figure: figureOf(st, x, S64.size, settings, S64.view) ?? [0, 0, S64.size[0], S64.size[1]], mark: markPic(key), held: held ? held.key : "", why: held ? held.why : "", chosen: false, index: q }; });
      const chosen = (m.move.swap.chosen ?? []).map(String).filter((id) => cells.some((c) => c.id === id && !c.held)); for (const c of cells) c.chosen = chosen.includes(c.id);
      regions.move.swap = { room: sr.name, roomId: sr.id, k, c: chosen.length, label: several ? fill(Sg.move.choose, { k, c: chosen.length }) : "", cols: G.cols, cells, why: "" };
      swapInfo = { room: +sr.id, ids: cells.map((c) => c.id), cols: G.cols, held: Object.fromEntries(cells.filter((c) => c.held).map((c) => [c.id, c.held])), k, chosen };
      targets.length = 0; cells.forEach((c, i) => add("swap." + c.id, "swap", { index: i }));
    }
  }
  // ---- the card (spec §5): the ringed mibi, always one; Look · Move to · Take along / Bring home · Tuck away / Bring out · Breed · Return ----
  const CV = W.card.view, CS = W.card.size;
  let card, plates = [];
  if (!all.length) { plates = [{ act: "incubator", verb: Sg.plate.incubator, price: "", held: false, why: "", id: "plate.0" }]; card = { state: "none", name: Sg.wall.none, looks: [], plates: [{ id: "plate.0", verb: Sg.plate.incubator, price: "", held: false }], why: "" }; }
  else if (cmb) {
    const w = whereOf(st, sv, cmb), base = platesOf(st, sv, cmb, settings, Sg, docked), Wh = Sg.why;
    const held = (why, plate) => ({ held: true, why, plate }), nB = S.backIn(st, cmb);
    const moveTo = w === "carried" ? held(Wh.onboard, "onboard") : w === "store" ? held(Wh.tucked, "tucked") : w === "coming" ? held(nB === 1 ? Wh.comingOne : fill(Wh.coming, { n: nB }), "coming") : { held: false, why: "" };
    plates = [base[0], { act: "moveTo", verb: Sg.plate.moveTo, price: "", ...moveTo }, ...base.slice(1)].map((p, k) => ({ ...p, id: "plate." + k }));
    const key = markOf(st, sv, cmb, settings, rest[String(cmb.id)] === "asleep"), tucked = S.inStore(cmb);
    const room = tucked ? { kind: "tucked", name: Sg.rail.tucked, opens: false } : { kind: "room", name: S.roomName(st, cmb.room), n: S.inRoom(st, cmb.room).length, of: S.ROOM, picture: (() => { const th = roomData(S.themeIndex(st, cmb.room)), id = th?.band ? withLight(th.band, light) : ""; return id ? slot(id, W.card.band.slice(2)) : ""; })(), opens: !S.isSettling(st, cmb.room) };
    const st1 = stateLinesOf(st, sv, cmb, settings, Sg);
    card = { state: "mibi", id: String(cmb.id), name: cmb.name, looks: looksOf(st, cmb, Sg), bredClose: S.bredClose(st, cmb) ? Sg.card.bredClose : "", stateLines: st1, mark: markPic(key), picture: req(mibiRequest(st, cmb, CS, settings, light, CV)), figure: figureOf(st, cmb, CS, settings, CV) ?? [0, 0, CS[0], CS[1]],
      plates: plates.map((p) => ({ id: p.id, verb: p.verb, price: p.price, held: p.held })), why: "", room };
  } else card = { state: "none", name: "", looks: [], plates: [], why: "" };
  if (pick && picked.size && !moving) {   // the pick pane (spec §7): "{n} picked", the faces strip and Move to · Tuck away ⚡{total} · Clear picks
    const mine = [...picked].map((id) => S.mibiById(st, +id)).filter(Boolean), total = mine.reduce((t) => t + S.tuckPrice(st, settings), 0), homeN = S.homeMibis(st, sv).length, atHome = mine.filter((x) => S.presentAtHome(st, sv, x)).length, Wh = Sg.why;
    const out = ordered.filter((x) => picked.has(String(x.id))).length < picked.size ? picked.size - ordered.filter((x) => picked.has(String(x.id))).length : 0;
    const tuckHeld = atHome >= homeN ? { held: true, why: Wh.last, plate: "last" } : st.e < total ? { held: true, why: fill(Wh.short, { p: total, e: st.e }), plate: "short" } : { held: false, why: "" };
    plates = [{ act: "moveTo", verb: Sg.plate.moveTo, price: "", held: false, why: "" }, { act: "tuckAway", verb: Sg.plate.tuck, price: S.priceText(total, 0, 0), ...tuckHeld }, { act: "clearPicks", verb: Sg.plate.clearPicks, price: "", held: false, why: "" }].map((p, k) => ({ ...p, id: "plate." + k }));
    card = { state: "picks", name: out ? fill(Sg.card.pickedOut, { n: picked.size, m: out }) : fill(Sg.card.picked, { n: picked.size }), looks: [], faces: mine.slice(0, 4).map((x) => req(mibiRequest(st, x, [36, 37], settings, light, "vivariumFace36"))), more: Math.max(0, mine.length - 4), plates: plates.map((p) => ({ id: p.id, verb: p.verb, price: p.price, held: p.held })), why: "" };
  }
  if (pairing && cmb) {   // the pair card (the partner pick): "Breed {A} with…" and A's face, the ringed partner with its kinship, its state and the pair's breathers; the plate "See this pair"
    const P = Sg.pair, Wh = Sg.why, why = pairWhy(st, sv, cmb, settings, Sg, pairA), fam = why?.key === "family", k = S.kinshipOf(st, pairA, cmb), band = kinBand(k), n = breatherAfter(pairA), q = breatherAfter(cmb);
    const lines = fam ? [fill(P.rel[why.rel.replace(/-(\w)/g, (_, c) => c.toUpperCase())], { name: pairA.name })] : [P.kin[band], ...(S.bredClose(st, cmb) ? [Sg.card.bredClose] : [])], open = !!m.forecastOpen && !why;   // the forecast is the breeding screens': until it opens See this pair is held
    plates = [{ act: "seePair", verb: Sg.plate.seePair, price: "", held: !open, why: why ? why.text : open ? "" : Wh.pairSoon, plate: "pairHeld", id: "plate.0" }];
    card = { state: "pair", id: String(cmb.id), name: cmb.name, head: fill(P.head, { A: pairA.name }), headFace: req(mibiRequest(st, pairA, [36, 37], settings, light, "vivariumFace36")), looks: [], lines, stateLines: why && !fam ? pairStateLines(why, st, cmb, settings, Sg) : [], mark: why?.key === "breather" ? markPic("breather") : "", pairLine: fam ? "" : fill(n === 1 ? P.restOne : P.restLine, { A: pairA.name, n, B: cmb.name, m: q }), long: fam ? [] : P.long[band] ?? [],
      picture: req(mibiRequest(st, cmb, CS, settings, light, CV)), figure: figureOf(st, cmb, CS, settings, CV) ?? [0, 0, CS[0], CS[1]], plates: [{ id: "plate.0", verb: Sg.plate.seePair, price: "", held: !open }], why: "" };
  }
  regions.card = card;
  if (!moving) { for (const p of card.plates) add(p.id, "plate", { index: +p.id.slice(6) }); if (card.room?.opens) add("band", "band"); }
  if (pairing) for (let i = targets.length - 1; i >= 0; i--) if (!/^(cell|plate)$/.test(targets[i].group)) targets.splice(i, 1);   // the rail and the toolbar stay drawn and held: the ring cannot land on them
  const has = (id) => targets.some((t) => t.id === id), cardFor = (id) => (id != null && has("cell." + id) ? "cell." + id : null);
  let cur = m.focus && (has(m.focus) || (!moving && /^plate\.|^band$/.test(m.focus))) ? m.focus : null;
  if (!cur && swapInfo) cur = "swap." + (swapInfo.ids.find((id) => !swapInfo.held[id]) ?? swapInfo.ids[0]);
  if (!cur && moving) cur = (targets.find((t) => { const row = regions.move.rows.find((x) => "move." + x.id === t.id); return row && row.state === "free"; }) ?? targets[0])?.id ?? null;
  if (!cur) cur = cardFor(lastId) ?? (ordered.length ? "cell." + ordered[0].id : !all.length ? "plate.0" : "rail." + lit);
  if (swapInfo) { const w = swapInfo.held[/^swap\.(\d+)$/.exec(cur ?? "")?.[1]]; regions.move.swap.why = w ? regions.move.swap.cells.find((c) => "swap." + c.id === cur).why : ""; }
  const p0 = plates.find((x) => x.id === cur); card.why = p0 ? p0.why ?? "" : "";
  const props = { state: !all.length ? "none" : "wall", view: "wall", regions, focus: { cur, targets, resolve: {} } };
  const firstLive = (plates.find((p) => !p.held) ?? plates[0])?.id ?? null;
  const nav = { sort, filter, cols, vis, rows: rowsN, row0, first, order: ordered.map((x) => x.id), rail: rows.map((r) => r.id), canAdd, lit, card: cmb ? cmb.id : null, settling, picked: [...picked], moving: !!moving, swap: swapInfo, pair: pairing ? pairA.id : null, hasBand: !!card.room?.opens && !moving, moveRows: moveAll, moveFirst: moving ? regions.move.first : 0, plates: plates.map((p) => ({ id: p.id, act: p.act, held: !!p.held, why: p.why, plate: p.plate })), firstLive };
  const name = cmb?.name ?? "";
  // ---- the footer (spec §1): ✓ names its act with the name; the centre says where the card's mibi is; Back is the Vivarium, or Cancel while an act is under way ----
  const F = Sg.foot, line = { ok: null, subject: "", back: pick ? Sg.backCancel : Sg.backWall, need: null };
  if (cmb) line.subject = S.inStore(cmb) ? fill(F.whereTucked, { name }) : fill(F.where, { name, room: S.roomName(st, cmb.room), a: S.inRoom(st, cmb.room).length });
  const onCell = idOfCell(cur), oc = onCell != null ? S.mibiById(st, onCell) : null;
  if (oc) line.ok = pick ? fill(picked.has(String(oc.id)) ? F.unpick : F.pick, { name: oc.name }) : fill(F.open, { name: oc.name });
  else if (p0 && p0.act === "incubator") line.ok = F.plate.incubator;
  else if (p0 && !p0.held) { const kk = { look: "look", moveTo: "moveTo", takeAlong: "takealong", bringHome: "bringhome", tuckAway: "tuck", bringOut: "out", breed: "breed", return: "return" }[p0.act]; line.ok = fill(F.plate[kk] ?? p0.verb, { name, p: String(p0.price ?? "").replace(/[^0-9]/g, "") }); }
  else if (cur === "rail.add" && rows.find((r) => r.id === "add")?.live) line.ok = Sg.newRoom.action;
  else if (/^rail\./.test(cur) || /^sort\./.test(cur) || cur === "pill") line.ok = cur === "pill" ? (pick ? F.pillOff : F.pillOn) : null;
  if (pairing) { line.back = Sg.backCancel; const pp = plates[0]; line.ok = pp && !pp.held ? fill(Sg.foot.plate.seePair, { a: pairA.name, b: name }) : null; }   // See {A} and {B} on a partner the plate is live for; held, no act: ✓ plays the plate's message
  if (swapInfo) { line.back = Sg.backCancel; const sc = /^swap\.(\d+)$/.exec(cur ?? ""), c = sc ? regions.move.swap.cells.find((x) => x.id === sc[1]) : null, MS = Sg.move;
    line.subject = c ? fill(MS.swapThen, { name: c.name, Room: regions.move.swap.room, a: S.ROOM }) : ""; line.ok = null;
    if (c && !c.held) line.ok = several ? (c.chosen ? fill(MS.unchooseFoot, { name: c.name, Room: regions.move.swap.room }) : swapInfo.chosen.length + 1 === swapInfo.k ? fill(MS.footMany, { n: movers.length, Room: regions.move.swap.room }) : fill(MS.chooseFoot, { name: c.name })) : fill(MS.swapFoot, { a: mv.name, b: c.name }); }
  else if (moving) { line.back = Sg.backCancel; line.subject = ""; line.ok = null; const cr = /^move\.(.+)$/.exec(cur ?? ""), row = cr ? regions.move.rows.find((x) => x.id === cr[1]) : null;
    if (row && row.kind === "room") { line.subject = fill(Sg.move.then, { Room: row.name, a: row.n, b: row.after }); if (row.state === "free") line.ok = fill(several ? Sg.move.footMany : Sg.move.foot, { name: mv.name, n: movers.length, Room: row.name }); }
    else if (row && row.kind === "add" && row.live) line.ok = Sg.newRoom.action; }
  void frame; void home; void pods;
  return { props, line, requests, nav: { ...nav, cur }, name, top: { readout: { text: Sg.crumb, mark: null } } };
}
