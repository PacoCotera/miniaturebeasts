// The Vivarium's intents (the collection v2 design; vivarium.json keys): the ring is the face's (focus.graph) and the host keeps it in `h.ui.viv.f`; `focus` below is the ring landing on a target (a chip shows its view, a flip turns the page while
// carrying, the card follows the mibi under it). ✓ picks up, sets down, swaps, tucks away, brings out, and does the card's plates; ← goes to the opener, puts a carried mibi back or drops the pick of two; the Vivarium key toggles the room view
// and the house view (vivariumKey). The rules are state.mjs's; the field as the props builder last drew it is views/vivarium-props.mjs vivariumBuild's `nav`.
import * as S from "../state.mjs";
import { openPanel } from "./panel.mjs";
import { fill } from "../views/words.mjs";
import { vivariumBuild, idOf, pagesOf, partnersOf, platesOf, pickHeld, PER_PAGE } from "../views/vivarium-props.mjs";
import { roomData } from "../views/room-props.mjs";

export const newViv = () => ({ f: null, prev: null, view: "room", page: 0, carry: null, pick: null, last: null });
const viv = (h) => { const v = h.ui.viv; for (const [k, d] of Object.entries(newViv())) if (!(k in v)) v[k] = d; return v; };
const Sg = (h) => h.specs.vivarium.strings;
const say = (h, lines, vals = {}) => h.say((Array.isArray(lines) ? lines : [lines]).map((l) => fill(l, vals)).join("\n"));
// the field as the props builder sees it now
export const build = (h) => { const v = viv(h); if (h.vivBuild) return h.vivBuild(); return vivariumBuild({ st: h.st, sv: h.sv, settings: h.settings, docked: S.docked(h.st), light: h.light ? h.light() : "day", focus: v.f, seen: h.ui.hab.id, last: v.last, view: v.view, page: v.page, carry: v.carry, pick: v.pick }, h.specs.vivarium, h.specs.frame, h.specs.home, h.specs.pods); };
const motion = (h) => (h.motion ? h.motion() : true);
// show room i in the room view (the swap's dither from the room shown, host.mjs showRoom)
function toRoom(h, i) { const v = viv(h); v.view = "room"; if ((h.st.face?.room ?? 0) !== i) { v.pin = null; if (h.showRoom) h.showRoom(i); else h.st.face.room = i; } }

// ---- the ring lands (the face's `focus`) ----
export function focus(h, target) {
  const v = viv(h); v.f = target;
  const id = idOf(target); if (id != null) v.last = id;
  if (target === "flip.prev" || target === "flip.next") { flip(h, target === "flip.next" ? 1 : -1); return; }
  if (v.carry) return;
  const r = /^room\.(\d)$/.exec(target);
  if (r) { toRoom(h, +r[1]); return; }   // the ring on a room's chip shows that room
  if (target === "room.all") { v.view = "house"; return; }
  if (target === "room.tucked") { v.view = "tucked"; v.page = 0; }
}
// The flip (§3): the previous or next page while carrying (the rooms bought, then the cold pages), or the cold page's own pages at rest; the hand arrives at the nearest target on the side it came in
function flip(h, d) {
  const v = viv(h), st = h.st, n = S.roomCount(st, h.settings);
  if (!v.carry) { const k = Math.max(1, Math.ceil(S.tuckedAway(st).length / PER_PAGE)); v.page = Math.max(0, Math.min(k - 1, (v.page | 0) + d)); v.f = null; landCold(h, d); return; }
  if (v.view === "house") { if (d < 0 || v.carry.kind === "out" || S.inStore(S.mibiById(st, v.carry.id))) { v.f = null; return; } v.carry.back = "house"; v.view = "tucked"; v.page = 0; v.f = null; landCold(h, d); return; }   // a house carry: ▶ with nothing ahead is Tucked away page 1, still carrying
  if (v.view === "tucked" && d < 0 && v.carry.back === "house" && (v.page | 0) === 0) { delete v.carry.back; v.view = "house"; v.f = null; const b = build(h), res = b.props.focus.targets.filter((t) => t.group === "hand"); v.f = res.length ? res[res.length - 1].id : null; return; }   // ◀ with nothing beyond: back to the house view
  const pages = pagesOf(st, h.settings, v.carry), at = v.view === "room" ? pages.findIndex((p) => p.view === "room" && p.room === (st.face?.room ?? 0)) : pages.findIndex((p) => p.view === "tucked" && p.page === (v.page | 0)), to = pages[at + d];
  if (!to) { v.f = null; return; }
  if (to.view === "room") {
    toRoom(h, to.room); v.f = null;
    const b = build(h), drops = (b.props.regions.drops?.items ?? []).map((k) => ({ k, x: roomData(to.room).drops[k][0] }));
    if (drops.length) v.f = "drop." + drops.reduce((a, q) => ((d > 0 ? q.x < a.x : q.x > a.x) ? q : a)).k;
    else { const res = b.props.focus.targets.filter((t) => t.group === "hand"); v.f = res.length ? (d > 0 ? res[0] : res[res.length - 1]).id : null; }
  } else { v.view = "tucked"; v.page = to.page; v.f = null; landCold(h, d); }
  void n;
}
function landCold(h, d) {
  const v = viv(h), b = build(h), t = b.props.focus.targets.filter((x) => x.group === "house" || (x.group === "hand" && /^tucked\./.test(x.id)));
  v.f = t.find((x) => x.id === "tucked.here")?.id ?? (t.length ? (d > 0 ? t[0] : t[t.length - 1]).id : null);
  if (!v.f) v.f = b.props.focus.cur;
}

// ---- ✓ ----
function pickUp(h, m) {
  const v = viv(h), st = h.st, room = st.face?.room ?? 0;
  if (!m || m.released) return;
  const held = pickHeld(st, h.sv, m, h.settings, Sg(h), S.docked(st));
  if (held) { heldSay(h, held, m); return; }
  v.carry = { id: m.id, kind: S.inStore(m) ? "out" : "move", room: m.room ?? null, view: v.view, page: v.page | 0, from: room };
  v.pick = null; v.f = null;
  const b = build(h); v.f = b.props.focus.cur;
}
function heldSay(h, p, m) {
  const H = Sg(h).msg.held, lines = H[p.plate];
  if (!lines) { if (p.why) h.say(p.why); return; }
  say(h, lines, { name: m?.name ?? "", n: m ? S.backIn(h.st, m) || 1 : 1, p: priceOf(p.price) || S.tuckPrice(h.st, h.settings), e: h.st.e });
}
const priceOf = (s) => +String(s ?? "").replace(/[^0-9]/g, "") || 0;
// the ring after a mibi left the room view's field (tucked away, returned): the nearest mibi in the room, else its chip
function ringAfterLeaving(h) { const v = viv(h); v.f = null; const b = build(h), first = b.props.focus.targets.find((t) => idOf(t.id) != null && t.group !== "plate"); v.f = first ? first.id : "room." + (v.view === "house" ? "all" : v.view === "tucked" ? "tucked" : String(h.st.face?.room ?? 0)); }

function setDown(h, target) {
  const v = viv(h), st = h.st, sv = h.sv, c = v.carry, m = S.mibiById(st, c.id), M = Sg(h).msg; if (!m) { v.carry = null; return; }
  const out = c.kind === "out" || S.inStore(m), room = st.face?.room ?? 0;
  const done = () => { v.carry = null; v.pick = null; v.f = null; const b = build(h), t = b.props.focus.targets.find((x) => idOf(x.id) === m.id); v.f = t ? t.id : b.props.focus.cur; h.save(); };
  const drop = /^drop\.(\d+)$/.exec(target), free = /^house\.free\.(\d)\.(\d)$/.exec(target);
  if (drop || free) {
    const i = drop ? room : +free[1], k = free ? +free[2] : null;
    if (out) { const r = S.bringOut(st, sv, m, i, h.settings); if (!r.ok) { heldSay(h, { plate: r.key === "short" ? "short" : S.roomPrice(st, h.settings) == null ? "noPlace4" : "noPlace", price: S.priceText(r.price ?? S.bringOutPrice(st, h.settings), 0, 0) }, m); return; }
      if (drop) m.tucked.spot = +drop[1];
      if (k != null && !S.inRoom(st, i).some((x) => x !== m && x.slot === k)) { m.slot = k; m.bay = i * S.ROOM + k; }
      say(h, S.TUCK.turns === 1 ? M.reservedOne : M.reserved, { name: m.name, n: S.TUCK.turns }); done(); return; }
    if (m.room !== i) { const r = S.moveMibi(st, m, i, h.settings, h.now()); if (!r.ok) return; say(h, M.moved, { name: m.name, Room: S.ROOM_NAMES[i] }); }
    if (k != null && !S.inRoom(st, i).some((x) => x !== m && x.slot === k)) { m.slot = k; m.bay = i * S.ROOM + k; }   // the place chosen in the house view
    done(); return;
  }
  if (target === "tucked.here" || target === "house.cold") {
    const r = S.tuckAway(st, sv, m, h.settings, h.now());
    if (!r.ok) { const plate = r.key === "short" ? "short" : r.key === "last" ? "last" : r.key === "carried" ? "onboard" : r.key === "coming" ? "coming" : "tucked"; heldSay(h, { plate, price: S.priceText(r.price ?? 0, 0, 0) }, m); return; }
    say(h, M.tucked, { name: m.name }); done(); return;
  }
  const o = S.mibiById(st, idOf(target));
  if (!o) return;
  if (o.id === m.id) { if (out) { putBack(h); return; } done(); return; }   // set down where it stands: it resumes
  if (out) { say(h, M.held.outPlace); return; }
  if (S.isCarried(st, sv, o)) { say(h, M.held.away, { name: o.name }); return; }
  if (S.comingOut(st, o)) { say(h, M.held.coming, { name: o.name, n: S.backIn(st, o) }); return; }
  if (o.room === m.room) { [m.slot, o.slot] = [o.slot, m.slot]; [m.bay, o.bay] = [o.bay, m.bay]; say(h, M.swapped, { name: m.name, name2: o.name }); done(); return; }   // in its own room: the two change places
  const r = S.swapMibis(st, sv, m, o, h.now()); if (!r.ok) return;
  say(h, M.swapped, { name: m.name, name2: o.name }); done();
}
// ← while carrying: the carried mibi goes back to the point it left, walking on; the field returns to the page it was picked up on
export function putBack(h) {
  const v = viv(h), c = v.carry; if (!c) return; const m = S.mibiById(h.st, c.id);
  v.carry = null; v.view = c.view; v.page = c.page;
  if (c.view === "room" && c.from != null && (h.st.face?.room ?? 0) !== c.from) toRoom(h, c.from);
  v.f = null; const b = build(h), t = m && b.props.focus.targets.find((x) => idOf(x.id) === m.id); v.f = t ? t.id : b.props.focus.cur;
}
// a room key or Home drops a carry the same way (nothing paid), and the pick of two
export function dropAll(h) { const v = viv(h); if (v.carry) { const c = v.carry; v.carry = null; v.view = c.view; v.page = c.page; if (c.view === "room" && c.from != null) h.st.face.room = c.from; } v.pick = null; }

function plateDo(h, target) {
  const v = viv(h), st = h.st, b = build(h), card = b.nav.card, m = card != null ? S.mibiById(st, card) : null, Mg = Sg(h).msg;
  if (target === "plate.incubator") { h.goto("incubator"); return; }
  if (!m) return;
  const p = platesOf(st, h.sv, m, h.settings, Sg(h), S.docked(st)).find((x) => x.id === target); if (!p) return;
  if (p.held) { heldSay(h, p, m); return; }   // the house rule: ✓ on a held plate plays its message plate
  switch (p.act) {
    case "look": { h.ui.hab.id = m.id; h.ui.hab.f = S.isCarried(st, h.sv, m) ? "name" : "resident"; v.last = m.id; v.f = null; const ev = h.specs.vivarium.events.look; h.goto("habitat", motion(h) ? ev.hold : 0); return; }
    case "bringOut": pickUp(h, m); return;
    case "takeAlong": { const r = S.carryAdd(st, h.sv, m); if (r.ok) h.save(); return; }
    case "bringHome": { const r = S.carryHome(st, h.sv, m); if (r.ok) h.save(); return; }
    case "tuckAway": { const r = S.tuckAway(st, h.sv, m, h.settings, h.now()); if (!r.ok) return; say(h, Mg.tucked, { name: m.name }); h.save(); if (v.view === "room" || v.view === "tucked") ringAfterLeaving(h); return; }
    case "breed": { const best = partnersOf(st, h.sv, m, h.settings).ranked[0]; if (!best) return; v.pick = { a: m.id }; showMibi(h, best.m); return; }
    case "return": h.ui.hab.id = m.id; openPanel(h, "vivarium", "wildMibi"); return;
  }
}
// the ring onto a mibi, flipping to its room (or its band in the house view)
function showMibi(h, o) {
  const v = viv(h);
  if (v.view === "room" && o.room != null && !S.inStore(o)) toRoom(h, o.room);
  if (v.view === "tucked" && !S.inStore(o)) { v.view = "room"; if (o.room != null) toRoom(h, o.room); }
  v.f = (v.view === "house" ? "house." : S.inStore(o) ? "tucked." : "resident.") + o.id;
}
function pickConfirm(h, target) {
  const v = viv(h), st = h.st, a = S.mibiById(st, v.pick.a), o = S.mibiById(st, idOf(target)), Mg = Sg(h).msg;
  if (!a || !o || o.id === a.id) return;
  const p = partnersOf(st, h.sv, a, h.settings).all.find((q) => q.m.id === o.id);
  if (!p || p.why) { const key = { kind: "kind", tucked: "tucked", out: "onboard", young: "young" }[p?.why] ?? "none"; say(h, Mg.held[key], { name: o.name, n: 1 }); return; }
  h.ui.cross = { aId: a.id, bId: o.id, state: 0, fc: null, clash: [] }; v.pick = null; h.goto("cross");   // the built pair screen; its ← returns here
}

export function intent(h, target, verb) {
  const v = viv(h);
  if (verb === "back") {
    if (v.carry) { putBack(h); return; }
    if (v.pick) { const a = v.pick.a; v.pick = null; v.f = null; const b = build(h), t = b.props.focus.targets.find((x) => idOf(x.id) === a); v.f = t ? t.id : b.props.focus.cur; return; }
    h.ui.home.f = "vivarium"; h.goto("home"); return;
  }
  if (verb !== "confirm") return;
  if (v.carry) { setDown(h, target ?? ""); return; }
  if (v.pick) { if (/^plate\./.test(target ?? "")) return; pickConfirm(h, target ?? ""); return; }
  if (target === "room.new" || target === "house.add") { if (S.roomPrice(h.st, h.settings) !== null) openPanel(h, "vivarium", "addRoom"); return; }   // the panel opens short of Energy too, its Add card dimmed
  if (target === "house.more") { v.view = "tucked"; v.page = 1; v.f = null; landCold(h, 1); return; }
  if (/^plate\./.test(target ?? "")) { plateDo(h, target); return; }
  const m = S.mibiById(h.st, idOf(target)); if (m) pickUp(h, m);   // ✓ on a mibi: Pick up
}
// The Vivarium key in the Vivarium (§1): the room view and the house view toggle, the ring on the same mibi, a carry kept in hand. True when it acted.
export function vivariumKey(h) {
  const ui = h.ui; if (ui.screen !== "vivarium" || ui.idle) return false;
  const v = viv(h); ui.panel = null;
  const id = v.carry ? v.carry.id : idOf(v.f) ?? v.last, m = id != null ? S.mibiById(h.st, id) : null;
  if (v.view !== "house") { v.view = "house"; v.pin = null; v.f = m ? "house." + m.id : null; if (v.carry) v.f = null; return true; }
  if (v.carry) { const cm = S.mibiById(h.st, v.carry.id); v.view = "room"; if (cm && cm.room != null && !S.inStore(cm)) toRoom(h, cm.room); v.f = null; return true; }
  if (m && S.inStore(m)) { v.view = "tucked"; v.page = Math.floor(S.tuckedAway(h.st).indexOf(m) / PER_PAGE); v.f = "tucked." + m.id; return true; }
  v.view = "room";
  if (m && m.room != null) { toRoom(h, m.room); v.f = S.isCarried(h.st, h.sv, m) ? "room." + m.room : "resident." + m.id; if (!S.isCarried(h.st, h.sv, m)) v.pin = m.id; }   // a traveller: its room with the ring on the room's chip; a rester comes in pinned (rules.show.pin), and stays shown while the room is
  else v.f = null;
  return true;
}
// The Add the room card's act (panel.json addRoom): the rule spends ⚡ and adds the room, the room view shows the new room empty with the ring on its chip, and the plate says it is ready.
export function addRoomNow(h) {
  const r = S.addRoom(h.st, h.settings); if (!r.ok) return r;
  if (h.ui.screen === "habitat") h.ui.hab.f = "room." + r.room;
  else { const v = viv(h); v.view = "room"; v.f = "room." + r.room; h.showRoom(r.room); }
  h.say(fill(h.specs.panel.strings.addRoom.done, { Room: S.ROOM_NAMES[r.room] }));
  h.save(); return r;
}
// The Return card's act (panel.json wildMibi, opened from the card): the rule gives the mibi back to the wild, the plate says where, the ring goes to the nearest mibi of the room, else its chip
export function returnFromCard(h) {
  const st = h.st, m = S.mibiById(st, h.ui.hab.id); if (!m) return;
  const young = S.mibiStage(st, m, h.settings) === "juvenile", r = S.returnMibi(st, h.sv, m, h.settings); if (!r.ok) return;
  h.say(h.specs.habitat.strings.releasePlate[young ? "young" : "grown"].map((l) => fill(l, { name: m.name, place: S.PLACE_WORD[m.from?.g] || "wild" })).join("\n"));
  h.ui.hab.id = null; viv(h).last = null; ringAfterLeaving(h); h.save();
}
