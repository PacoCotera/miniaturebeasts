// The Vivarium's intents (vivarium.json keys): the ring is the face's (focus.graph) and the host keeps it in `h.ui.viv.f`; `focus` below is the ring landing on a target (a chip shows its room, the card follows the mibi under it).
// ✓ on a mibi opens its card's first live plate or a plate's act; ← goes to the opener. The rules are state.mjs's; the field as the props builder last drew it is views/vivarium-props.mjs vivariumBuild's `nav`.
import * as S from "../state.mjs";
import { openPanel } from "./panel.mjs";
import { fill } from "../views/words.mjs";
import { vivariumBuild, idOf, partnersOf, platesOf, pickHeld } from "../views/vivarium-props.mjs";
import { walk, wallEntry, firstLive, gridWalk } from "../views/wall-walk.mjs";
import { wallBuild } from "../views/wall-props.mjs";

export const newViv = () => ({ f: null, prev: null, view: "wall", page: 0, last: null, pin: null, sort: "room", filter: "all", pick: null, row0: 0, first: 0, nudge: null, move: null, moveFirst: 0, pair: null });
const viv = (h) => { const v = h.ui.viv; for (const [k, d] of Object.entries(newViv())) if (!(k in v)) v[k] = d; return v; };
const Sg = (h) => h.specs.vivarium.strings;
const say = (h, lines, vals = {}) => h.say((Array.isArray(lines) ? lines : [lines]).map((l) => fill(l, vals)).join("\n"));
// the field as the props builder sees it now
export const build = (h) => { const v = viv(h); if (h.vivBuild) return h.vivBuild();
  const m = { st: h.st, sv: h.sv, settings: h.settings, docked: S.docked(h.st), light: h.light ? h.light() : "day", focus: v.f };
  return v.view === "wall" ? wallBuild({ ...m, last: v.last ?? h.ui.hab.id, sort: v.sort, filter: v.filter, pick: v.pick, row0: v.row0, first: v.first, nudge: v.nudge, move: v.move, moveFirst: v.moveFirst, pair: v.pair }, h.specs.vivarium, h.specs.frame, h.specs.home, h.specs.pods)
    : vivariumBuild({ ...m, seen: h.ui.hab.id, last: v.last, view: "room", page: v.page }, h.specs.vivarium, h.specs.frame, h.specs.home, h.specs.pods); };
const motion = (h) => (h.motion ? h.motion() : true);
// show room i in the room view (the swap's dither from the room shown, host.mjs showRoom)
function toRoom(h, i) { const v = viv(h); if ((h.st.face?.room ?? 0) !== i) { v.pin = null; if (h.showRoom) h.showRoom(i); else h.st.face.room = i; } }

// ---- the ring lands (the face's `focus`) ----
export function focus(h, target) {
  const v = viv(h); v.f = target;
  const id = idOf(target); if (id != null) v.last = id;
  const r = /^room\.(\d)$/.exec(target);
  if (r) toRoom(h, +r[1]);   // the ring on a room's chip shows that room
}

function heldSay(h, p, m) {
  const H = Sg(h).msg.held, lines = H[p.plate];
  if (!lines) { if (p.why) h.say(p.why); return; }
  say(h, lines, { name: m?.name ?? "", n: m ? S.backIn(h.st, m) || 1 : 1, p: priceOf(p.price) || S.tuckPrice(h.st, h.settings), e: h.st.e });
}
const priceOf = (s) => +String(s ?? "").replace(/[^0-9]/g, "") || 0;
// the ring after a mibi left the room view's field (tucked away, returned): the nearest mibi in the room, else its chip
function ringAfterLeaving(h) { const v = viv(h); v.f = null; const b = build(h), first = b.props.focus.targets.find((t) => idOf(t.id) != null && t.group !== "plate"); v.f = first ? first.id : "room." + String(h.st.face?.room ?? 0); }

function plateDo(h, target, act = null) {
  const v = viv(h), st = h.st, b = build(h), card = b.nav.card, m = card != null ? S.mibiById(st, card) : null, Mg = Sg(h).msg;
  if (target === "plate.incubator") { h.goto("incubator"); return; }
  if (!m) return;
  const list = platesOf(st, h.sv, m, h.settings, Sg(h), S.docked(st)), p = act ? list.find((x) => x.act === act) : list.find((x) => x.id === target); if (!p) return;
  if (p.held) { heldSay(h, p, m); return; }   // the house rule: ✓ on a held plate plays its message plate
  switch (p.act) {
    case "look": { h.ui.hab.id = m.id; h.ui.hab.f = S.isCarried(st, h.sv, m) ? "name" : "resident"; v.last = m.id; v.f = null; const ev = h.specs.vivarium.events.look; h.goto("habitat", motion(h) ? ev.hold : 0); return; }
    case "takeAlong": { const r = S.carryAdd(st, h.sv, m); if (r.ok) h.save(); return; }
    case "bringHome": { const r = S.carryHome(st, h.sv, m); if (r.ok) h.save(); return; }
    case "tuckAway": { const r = S.tuckAway(st, h.sv, m, h.settings, h.now()); if (!r.ok) return; say(h, Mg.tucked, { name: m.name }); h.save(); ringAfterLeaving(h); return; }
    case "breed": {   // the partner pick: the Wall in a mode, A's species only, the ring on the first partner in rank order
      if (v.view !== "wall") { const best = partnersOf(st, h.sv, m, h.settings).ranked[0]; if (!best) return; h.ui.cross = { aId: m.id, bId: best.m.id, state: 0, fc: null, clash: [] }; h.goto("cross"); return; }
      v.pair = { a: m.id }; v.pick = null; const nb = build(h), first = nb.nav.order[0]; v.f = first != null ? "cell." + first : null; if (first != null) v.last = +first; return; }
    case "return": h.ui.hab.id = m.id; openPanel(h, "vivarium", "wildMibi"); return;
  }
}

// ---- the Wall (the inventory page's design §4): the key walk is wall-walk.mjs's, the host moves the ring, refilters, scrolls and nudges ----
const wallCtx = (h) => { const b = build(h), n = b.nav; return { b, n, ctx: { order: n.order.map(Number), cols: n.cols, rail: n.rail, lit: n.lit, sort: n.sort, last: n.card, plates: n.plates, picking: !!viv(h).pick, band: n.hasBand, pair: n.pair != null } }; };
const landOn = (v, to) => { v.f = to; const id = idOf(to) ?? (/^cell\.(\d+)$/.exec(to ?? "") ? +/^cell\.(\d+)$/.exec(to)[1] : null); if (id != null) v.last = id; };
function wallStep(h, dir) {
  const v = viv(h), { b, ctx, n } = wallCtx(h); v.nudge = null;
  if (n.swap) {   // the swap grid: the residents of the full room, walked as a grid; nothing beyond is a nudge
    const cur = b.props.focus.cur, to = gridWalk(n.swap.ids.map((x) => "swap." + x), n.swap.cols, cur, dir);
    if (to == null) { v.nudge = dir; v.f = cur; return; }
    v.f = to; return;
  }
  if (n.moving) {   // the room list: ▲▼ walk the rows (the window follows), ◀▶ nudge
    const cur = b.props.focus.cur, i = n.moveRows.map((x) => "move." + x).indexOf(cur), j = dir === "up" ? i - 1 : dir === "down" ? i + 1 : i;
    if ((dir !== "up" && dir !== "down") || j < 0 || j >= n.moveRows.length) { v.nudge = dir; v.f = cur; return; }
    v.f = "move." + n.moveRows[j]; return;
  }
  const r = walk(ctx, b.props.focus.cur, dir);
  if (r.to == null) { v.nudge = dir; v.f = b.props.focus.cur; return; }   // nothing beyond: a nudge, no sound
  if (r.refilter != null) { v.filter = r.refilter === "all" ? "all" : r.refilter; v.row0 = 0; }
  landOn(v, r.to);
}
function wallConfirm(h, target) {
  const v = viv(h), { b, ctx, n } = wallCtx(h), cur = target ?? b.props.focus.cur; v.nudge = null;
  if (n.swap) { const r = /^swap\.(\d+)$/.exec(cur ?? ""); if (r) swapConfirm(h, +r[1], b); return; }
  if (n.moving) { const row = /^move\.(.+)$/.exec(cur ?? ""); if (!row) return; moveConfirm(h, row[1], b); return; }
  if (n.pair != null) {   // the partner pick: ✓ on a partner is ✓ on See this pair (the footer's act): live, it opens the forecast; held, it plays the plate's message; the ring stays
    const c = /^cell\.(\d+)$/.exec(cur ?? ""); if (c) { v.last = +c[1]; const q = build(h).nav.plates[0]; if (q?.held) h.say(q.why); else if (q) { h.ui.cross = { aId: n.pair, bId: +c[1], state: 0, fc: null, clash: [] }; h.goto("cross"); } return; }
    const p = n.plates.find((x) => x.id === cur); if (p?.held) h.say(p.why); else if (p) { h.ui.cross = { aId: n.pair, bId: v.last, state: 0, fc: null, clash: [] }; h.goto("cross"); } return; }
  const cell = /^cell\.(\d+)$/.exec(cur ?? "");
  if (cell) { const m = S.mibiById(h.st, +cell[1]); if (!m) return; if (v.pick) { const ids = v.pick.ids ?? []; const w = S.inStore(m) ? "tucked" : S.comingOut(h.st, m) ? "coming" : S.isCarried(h.st, h.sv, m) ? "onboard" : null; if (w) { heldSay(h, { plate: w }, m); return; } v.pick = { on: true, ids: ids.includes(m.id) ? ids.filter((x) => x !== m.id) : [...ids, m.id] }; return; } v.last = m.id; v.f = firstLive(ctx); return; }
  const rail = /^rail\.(.+)$/.exec(cur ?? "");
  if (rail) { if (rail[1] === "add") { const row = b.props.regions.rail.rows.find((x) => x.id === "add"); if (!row) return; if (!row.live) { heldAdd(h, row); return; } openPanel(h, "vivarium", "addRoom"); return; } const to = wallEntry(ctx); if (to) landOn(v, to); else v.nudge = "right"; return; }
  const sort = /^sort\.(\w+)$/.exec(cur ?? ""); if (sort) { v.sort = sort[1]; return; }
  if (cur === "pill") { v.pick = v.pick ? null : { on: true, ids: [] }; return; }
  if (cur === "band") { const m = S.mibiById(h.st, n.card); if (m && m.room != null && !S.inStore(m)) { v.view = "room"; v.pin = m.id; h.showRoom ? h.showRoom(m.room) : (h.st.face.room = m.room); v.f = null; } return; }
  if (/^plate\./.test(cur ?? "")) { const p = n.plates.find((x) => x.id === cur); const m = S.mibiById(h.st, n.card); if (p?.act === "incubator") { h.goto("incubator"); return; } if (!p || !m) return; if (p.held) { heldSay(h, p, m); return; } if (p.act === "incubator") { h.goto("incubator"); return; } if (p.act === "moveTo") { v.move = v.pick?.ids?.length ? { ids: v.pick.ids.slice() } : { id: m.id }; v.moveFirst = 0; v.f = null; return; } if (p.act === "clearPicks") { v.pick = { on: true, ids: [] }; v.f = firstLive(ctx); return; } if (p.act === "tuckAway" && v.pick?.ids?.length) { tuckPicks(h); return; } plateDo(h, cur, p.act); }
}
// ✓ on a row of the room list: the free place takes the mibi at once and free (the card returns, the ring stays on it, the wall resorts); here, settling and full say why; Add a room opens its panel and returns here
function moveConfirm(h, id, b) {
  const v = viv(h), st = h.st, M = Sg(h).msg, m = S.mibiById(st, v.move.id ?? v.move.ids?.[0]); if (!m) { v.move = null; return; }
  const rows = b.props.regions.move.rows, row = rows.find((x) => x.id === id); if (!row) return;
  if (row.kind === "add") { if (!row.live) { heldAdd(h, row); return; } openPanel(h, "vivarium", "addRoom"); return; }
  const i = +id;
  if (row.state === "here") { say(h, M.moveHere, { name: m.name, Room: row.name }); return; }
  if (row.state === "settling") { say(h, M.moveSettling, { Room: row.name, n: row.left }); return; }
  if (row.state === "full" || row.state === "tight") { v.move = { ...v.move, swap: { room: i, chosen: [] } }; v.f = null; return; }   // the swap grid: nothing moves until the last ✓
  if (v.move.ids?.length > 1) {   // several picked: every pick at home not there yet goes, in pick order, free and at once
    let k = 0; for (const pid of v.move.ids) { const q = S.mibiById(st, pid); if (q && q.room !== i && !S.inStore(q) && S.moveMibi(st, q, i, h.settings, h.now()).ok) k++; }
    say(h, M.movedMany, { n: k, Room: row.name }); v.move = null; v.pick = null; h.save(); const nb2 = build(h); v.f = nb2.nav.order.length ? "cell." + nb2.nav.order[0] : "rail." + nb2.nav.lit; if (nb2.nav.order.length) v.last = +nb2.nav.order[0]; return;
  }
  const r = S.moveMibi(st, m, i, h.settings, h.now()); if (!r.ok) return;
  say(h, M.movedTo, { name: m.name, Room: row.name }); v.move = null; v.last = m.id; h.save();
  afterMove(h, m, b);   // the ring stays on the mibi; in a room filter the moved one has left the wall and the ring goes to the next mibi in it
}
// ✓ on a resident of the swap grid: a held one says why; one mibi moving swaps at once ("Swap Orrin with Pip"); several picked choose the leavers one by one and the last choice moves them all, the chosen taking the places the picks vacate, in pick order
function swapConfirm(h, rid, b) {
  const v = viv(h), st = h.st, M = Sg(h).msg, sw = b.nav.swap, cell = b.props.regions.move.swap.cells.find((c) => +c.id === rid), r = S.mibiById(st, rid); if (!cell || !r) return;
  if (cell.held) { const lines = M.held[cell.held]; if (lines) say(h, lines, { name: r.name, n: S.backIn(st, r) || 1, Room: b.props.regions.move.swap.room }); else h.say(cell.why); return; }
  const ids = v.move.ids ?? [v.move.id], movers = ids.map((id) => S.mibiById(st, id)).filter(Boolean);
  if (ids.length === 1) {
    const m = movers[0], k = S.swapMibis(st, h.sv, m, r, h.now()); if (!k.ok) return;
    say(h, M.swapped, { name: m.name, name2: r.name }); v.move = null; v.last = m.id; h.save(); afterMove(h, m, b); return;
  }
  const chosen = v.move.swap.chosen.slice(), at = chosen.indexOf(rid);
  if (at >= 0) { chosen.splice(at, 1); v.move.swap = { ...v.move.swap, chosen }; return; }   // ✓ again unchooses
  chosen.push(rid); v.move.swap = { ...v.move.swap, chosen };
  if (chosen.length < sw.k) return;
  const room = sw.room, out = movers.filter((q) => q.room !== room && !S.inStore(q)), free = S.ROOM - S.inRoom(st, room).length; let n = 0;
  chosen.forEach((cid, i) => { const q = out[free + i], c = S.mibiById(st, cid); if (q && c && S.swapMibis(st, h.sv, q, c, h.now()).ok) n++; });
  for (const q of out.slice(0, free)) if (S.moveMibi(st, q, room, h.settings, h.now()).ok) n++;
  say(h, M.movedMany, { n, Room: S.roomName(st, room) }); v.move = null; v.pick = null; h.save();
  const nb = build(h); v.f = nb.nav.order.length ? "cell." + nb.nav.order[0] : "rail." + nb.nav.lit; if (nb.nav.order.length) v.last = +nb.nav.order[0];
}
// after a mibi changed room: the ring stays on it; in a room filter it has left the wall and the ring goes to the next mibi of the filter
function afterMove(h, m, before) {
  const v = viv(h), nb = build(h), shown = nb.nav.order.includes(m.id);
  if (shown) v.f = "cell." + m.id;
  else { const now = nb.nav.order.map(Number), was = before.nav.order.map(Number), at = was.indexOf(m.id), next = was.slice(at + 1).concat(was.slice(0, at)).find((x) => now.includes(x)); v.f = next != null ? "cell." + next : "rail." + nb.nav.lit; if (next != null) v.last = next; }
}
// Tuck away for the picks: pays the sum, each goes to the store; the picks end, the ring goes to the next mibi of the wall
function tuckPicks(h) {
  const v = viv(h), st = h.st, ids = v.pick.ids.slice(), M = Sg(h).msg; let n = 0;
  for (const id of ids) { const m = S.mibiById(st, id); if (m && S.tuckAway(st, h.sv, m, h.settings, h.now()).ok) n++; }
  v.pick = null; say(h, M.tuckedMany, { n }); h.save(); const b = build(h); v.f = b.nav.order.length ? "cell." + b.nav.order[0] : "rail." + b.nav.lit; if (b.nav.order.length) v.last = +b.nav.order[0];
}
function heldAdd(h, row) {
  const M = Sg(h).msg; const st = h.st;
  if (row.held === "find") { h.say(M.addNeedsFind); return; }
  if (row.held === "short") { const p = +String(row.price).replace(/[^0-9]/g, "") || 0; say(h, M.addShort, { p, e: st.e }); }
}
export function intent(h, target, verb) {
  const v = viv(h);
  if (v.view === "wall") {
    if (verb === "back") { v.nudge = null; if (v.move?.swap) { const room = v.move.swap.room; v.move = { ...v.move, swap: null }; v.f = "move." + room; return; }   // the swap grid: Back returns to the room list
      if (v.pair) { const a = v.pair.a; v.pair = null; v.last = a; const nb = build(h); v.f = nb.nav.plates.find((p) => p.act === "breed")?.id ?? null; return; }   // Cancel: the Wall, the card on Breed, A kept
      if (v.move) { const id = v.move.id ?? v.move.ids?.[0]; v.move = null; v.f = "plate.1"; v.last = id; return; } if (v.pick) { v.pick = null; return; } h.ui.home.f = "vivarium"; h.goto("home"); return; }
    const k = /^step:(left|right|up|down)$/.exec(verb ?? ""); if (k) { wallStep(h, k[1]); return; }
    if (verb === "confirm") { wallConfirm(h, target); return; }
    return;
  }
  if (v.view === "room" && verb === "back") { v.view = "wall"; v.f = null; return; }
  if (verb === "back") { h.ui.home.f = "vivarium"; h.goto("home"); return; }
  if (verb !== "confirm") return;
  if (target === "room.new") { if (S.roomPrice(h.st, h.settings) !== null) openPanel(h, "vivarium", "addRoom"); return; }   // the panel opens short of Energy too, its Add card dimmed
  if (/^plate\./.test(target ?? "")) { plateDo(h, target); return; }
  const m = S.mibiById(h.st, idOf(target)); if (m) { const held = pickHeld(h.st, h.sv, m, h.settings, Sg(h), S.docked(h.st)); if (held) heldSay(h, held, m); else { v.last = m.id; const b = build(h); v.f = b.props.focus.targets.find((t) => t.group === "plate" && !b.nav.plates.find((p) => p.id === t.id)?.held)?.id ?? v.f; } }   // ✓ on a mibi: its card's first live plate
}
// The Add the room card's act (panel.json addRoom): the rule spends ⚡ and adds the room, the room view shows the new room empty with the ring on its chip, and the plate says it is ready.
export function addRoomNow(h) {
  const r = S.addRoom(h.st, h.settings); if (!r.ok) return r;
  if (h.ui.screen === "habitat") h.ui.hab.f = "room." + r.room;
  else { const v = viv(h); v.view = "room"; v.f = "room." + r.room; h.showRoom(r.room); }
  h.say(fill(h.specs.panel.strings.addRoom.done, { Room: S.roomName(h.st, r.room) }));
  h.save(); return r;
}
// The Return card's act (panel.json wildMibi, opened from the card): the rule gives the mibi back to the wild, the plate says where, the ring goes to the nearest mibi of the room, else its chip
export function returnFromCard(h) {
  const st = h.st, m = S.mibiById(st, h.ui.hab.id); if (!m) return;
  const young = S.mibiStage(st, m, h.settings) === "juvenile", r = S.returnMibi(st, h.sv, m, h.settings); if (!r.ok) return;
  h.say(h.specs.habitat.strings.releasePlate[young ? "young" : "grown"].map((l) => fill(l, { name: m.name, place: S.PLACE_WORD[m.from?.g] || "wild" })).join("\n"));
  h.ui.hab.id = null; viv(h).last = null; ringAfterLeaving(h); h.save();
}
