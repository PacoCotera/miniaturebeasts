// The Vivarium as props (the collection v2 design; vivarium.json): pure selectors from the state, the Vivarium's UI (UI.viv) and the presentation to the props of the face's one screen with three fields. Props name *what*, never *where*:
// ids, strings, states, seeds, flags and the focus targets by id; no rectangle, no measure, no layout rule (the words place everything from vivarium.json and rooms.json). The output is plain JSON:
// { props (state, view, regions, focus), line (the bottom line, for the frame), requests (the pictures the host makes ready before the props), top, nav }. `nav` is not sent: the house view's and the cold page's walk as the host
// resolves it (the go.* selectors are in focus.resolve) and the pages a carry flips through, for intents/vivarium.mjs. Runs in Node, tested there (tests/vivarium-props.test.mjs); the shape is vivarium.props.json.
//   m: { st, sv, settings, docked, light, focus (the ring: a target id, or null for the way in), seen (the mibi last seen up close), pin (a mibi brought into its room, shown while the room is), last (the mibi the card showed last), view ("room" | "house" | "tucked"), page (the cold page),
//        carry ({ id, kind: "move" | "out", room, view, page } or null), pick ({ a } or null: the pick of two's first parent), time, now, restRules, rules, arrived, motionSets }
import * as S from "../state.mjs";
import { livingOf, mibiReq, mibiRequest, mibiVariantReq, figureOf } from "./home-props.mjs";
import { roomRegion, roomData, withLight } from "./room-props.mjs";
import { frameOf } from "../genome.mjs";
import { drawnLooks } from "../looks.mjs";
import { fill } from "./words.mjs";
import { req as reqOf, slot as slotOf, ph as phOf } from "./requests.mjs";

export const PER_PAGE = 8, HOUSE_SHOWN = 7;
const sizeOf = (id) => id.match(/-(\d+)x(\d+)$/).slice(1).map(Number);
const living = (st) => st.mibis.filter((m) => !m.released);
// the mibi a target names (resident.<id>, house.<id>, tucked.<id>), or null
export const idOf = (t) => { const r = /^(?:resident|house|tucked)\.(\d+)$/.exec(t ?? ""); return r ? +r[1] : null; };
// Where a mibi is: "room" (present in a room), "carried" (with the Companion, its place kept), "coming" (coming out: its place reserved), "store" (tucked away)
export function whereOf(st, sv, m) {
  if (S.inStore(m)) return "store";
  if (S.comingOut(st, m)) return "coming";
  if (S.isCarried(st, sv, m)) return "carried";
  return "room";
}
// The tucked away in the order they went in
export const store = (st) => S.tuckedAway(st);
// The pages a carry flips through (§3): the rooms bought, then the cold pages (one more than the store fills when tucking away)
export function pagesOf(st, settings, carry) {
  const n = S.roomCount(st, settings), k = store(st).length, cold = carry && carry.kind !== "out" ? Math.floor(k / PER_PAGE) + 1 : Math.max(1, Math.ceil(k / PER_PAGE));
  return [...Array.from({ length: n }, (_, i) => ({ view: "room", room: i })), ...Array.from({ length: cold }, (_, p) => ({ view: "tucked", page: p }))];
}
// One mark a mibi, the first that applies (§6): the master id or null. The Companion's two only in the house view.
export function markOf(st, sv, m, settings, house = false) {
  const w = whereOf(st, sv, m);
  if (w === "carried") return house ? (S.docked(st) ? "companionDocked" : "companionAway") : null;
  if (w === "coming") return "comingOut";
  if (w === "store") return null;   // tucked away: no mark on the figure; the cold mark heads the chip and the band
  if (m.bonded) return "bonded";
  if (S.mibiStage(st, m, settings) === "elder") return "elder";
  return null;
}
// The looks line (§2): the looks on which it differs from the player's other mibis of its species (housed, carried and tucked away), in trait order, at most three; "your only {Species}" for a singleton; nothing for a twin
export function looksLine(st, m, Sg) {
  const sp = S.speciesOf(m), fr = frameOf(sp), kin = living(st).filter((x) => S.speciesOf(x) === sp);
  if (kin.length < 2) return [fill(Sg.card.only, { Species: S.spName(m) })];
  const mine = drawnLooks(fr, m), all = kin.map((x) => drawnLooks(fr, x)), out = [];
  for (const t of Object.keys(mine)) if (all.some((l) => l[t] !== mine[t])) { out.push(String(mine[t])); if (out.length === 3) break; }
  return out;
}
const kinWord = (K, k) => (k <= 0 ? K.none : k >= 0.5 ? K.line : k >= 0.25 ? K.close : k >= 0.125 ? K.half : k >= 0.0625 ? K.cousins : K.distant);
// The partners of `a` for the pick of two (manager-props partnersOf, as built): every other mibi of the player with the reason one is not; the eligible ones ranked by kinship, furthest first
export function partnersOf(st, sv, a, settings) {
  const out = [];
  for (const m of living(st)) {
    if (m.id === a.id) continue;
    const w = whereOf(st, sv, m), stage = S.mibiStage(st, m, settings);
    const why = S.speciesOf(m) !== S.speciesOf(a) ? "kind" : w === "store" || w === "coming" ? "tucked" : w === "carried" ? "out" : stage === "juvenile" ? "young" : null;
    out.push({ m, why, k: why ? null : S.kinshipOf(st, a, m) });
  }
  return { all: out, ranked: out.filter((p) => !p.why).sort((x, y) => x.k - y.k || x.m.id - y.m.id) };
}
// turns until a young one grows up (null when it does not)
const youngTurns = (st, m, settings) => { const aT = settings.adultTurns ?? S.JUVENILE_TURNS; return m.bonded && m.grownTurn == null ? null : Math.max(1, (m.born | 0) + aT - S.stageTurn(st, m)); };

// The card's six plates (§2; manager-props plates as built): { id, act, verb, price, held, why, plate (the message plate's key when held) }
export function platesOf(st, sv, m, settings, Sg, docked) {
  const W = Sg.why, P = Sg.plate, w = whereOf(st, sv, m), stage = S.mibiStage(st, m, settings), Room = m.room != null ? S.ROOM_NAMES[m.room] : "", nB = S.backIn(st, m);
  const held = (why, plate) => ({ held: true, why, plate });
  const coming = held(nB === 1 ? W.comingOne : fill(W.coming, { n: nB }), "coming"), onboard = held(W.onboard, "onboard"), tucked = held(W.tucked, "tucked");
  const out = [];
  out.push({ act: "look", verb: P.look, price: "", held: false, why: "" });
  { let h = null; if (w === "carried") h = onboard; else if (w === "coming") h = coming; else if (w === "store") h = tucked; else if (S.roomCount(st, settings) < 2 && S.inRoom(st, m.room).length < S.ROOM) h = null; out.push({ act: "move", verb: P.move, price: "", ...(h ?? { held: false, why: "" }) }); }
  { const proj = S.projectCarried(st, sv);
    if (w === "carried") out.push({ act: "bringHome", verb: P.bringhome, price: "", ...(docked ? { held: false, why: fill(W.home, { Room }) } : held(W.homeAway, "away")) });
    else { let h = null; if (w === "store") h = tucked; else if (w === "coming") h = coming; else if (!docked) h = held(W.takeOut, "out"); else if (proj.length >= S.CARRY_MAX) h = held(W.takeFull, "take");
      out.push({ act: "takeAlong", verb: P.takealong, price: "", ...(h ?? { held: false, why: fill(W.take, { k: proj.length + 1 }) }) }); } }
  if (w === "store") {
    const p = S.bringOutPrice(st, settings), b = S.bringOutBlock(st, sv, m, null, settings), four = S.roomPrice(st, settings) == null;
    const h = !b ? null : b.key === "noPlace" ? held(four ? W.noPlace4 : W.noPlace, four ? "noPlace4" : "noPlace") : held(fill(W.short, { p, e: st.e }), "short");
    out.push({ act: "bringOut", verb: P.out, price: S.priceText(p, 0, 0), ...(h ?? { held: false, why: fill(W.out, { p, n: S.TUCK.turns }) }) });
  } else {
    const p = S.tuckPrice(st, settings), b = S.tuckBlock(st, sv, m, settings);
    const h = !b ? null : b.key === "carried" ? onboard : b.key === "coming" ? coming : b.key === "last" ? held(W.last, "last") : b.key === "short" ? held(fill(W.short, { p: b.price, e: b.have }), "short") : tucked;
    out.push({ act: "tuckAway", verb: P.tuck, price: S.priceText(p, 0, 0), ...(h ?? { held: false, why: fill(W.tuck, { p: S.bringOutPrice(st, settings), n: S.TUCK.turns }) }) });
  }
  { let h = null; const nY = youngTurns(st, m, settings), four = S.roomPrice(st, settings) == null;
    if (w === "carried") h = held(Sg.why.partnerOut, "onboard"); else if (w === "store") h = tucked; else if (w === "coming") h = coming;
    else if (stage === "juvenile") h = held(nY === 1 ? W.breedYoungOne : nY == null ? W.breedYoung.split(" · ")[0] : fill(W.breedYoung, { n: nY }), "young");
    else if (st.bud) h = held(W.breedBusy, "busy");
    else if (S.vivFull(st, settings)) h = held(four ? W.breedNoPlace4 : W.breedNoPlace, four ? "noPlace4" : "noPlace");
    else if (!partnersOf(st, sv, m, settings).all.some((p) => p.why !== "kind")) h = held(W.breedOne, "one");
    else if (!partnersOf(st, sv, m, settings).ranked.length) h = held(W.breedNone, "none");
    out.push({ act: "breed", verb: P.breed, price: "", ...(h ?? { held: false, why: "" }) }); }
  { const b = S.returnMibiBlock(st, sv, m); let h = null;
    if (w === "store") h = tucked; else if (w === "coming") h = coming; else if (b === "a bonded mibi stays") h = held(W.returnBond, "bond"); else if (b === "your last mibi at home stays") h = held(W.last, "last"); else if (b) h = onboard;
    out.push({ act: "return", verb: P.return, price: "", ...(h ?? { held: false, why: "" }) }); }
  return out.map((p, k) => ({ id: "plate." + k, ...p }));
}
const firstLive = (plates) => (plates.find((p) => p.act === "move" && !p.held) ?? plates.find((p) => !p.held) ?? plates[0])?.id ?? null;

// The state line of the card (§2, §6): its one state's words, or "" (young has no word; an adult with nothing to report has no line)
function stateWords(st, sv, m, settings, Sg) {
  const key = markOf(st, sv, m, settings, true), T = Sg.state;
  if (S.inStore(m)) return fill(T.tucked, { n: m.tucked.turn | 0 });
  if (key === "companionAway") return T.away; if (key === "companionDocked") return T.docked;
  if (key === "comingOut") { const n = S.backIn(st, m); return n === 1 ? T.comingOne : fill(T.coming, { n }); }
  if (key === "bonded") return T.bonded; if (key === "elder") return T.elder;
  return "";
}

export function vivariumBuild(m, spec, frame, home, pods) {
  const { st, sv, settings } = m, requests = [], req = reqOf(requests), R = spec.regions, Sg = spec.strings, docked = !!m.docked, light = m.light ?? "day";
  const slot = slotOf(req, "its master (the collection v2 design)"), ph = phOf(req, "its master (the collection v2 design)");
  const nRooms = S.roomCount(st, settings), shown = Math.max(0, Math.min(st.face?.room ?? 0, nRooms - 1)), view = ["room", "house", "tucked"].includes(m.view) ? m.view : "room";
  const carry = m.carry && S.mibiById(st, m.carry.id) && !S.mibiById(st, m.carry.id).released ? m.carry : null, cm = carry ? S.mibiById(st, carry.id) : null;
  const pick = m.pick && S.mibiById(st, m.pick.a) ? m.pick : null, pa = pick ? S.mibiById(st, pick.a) : null;
  const all = living(st), tuckedList = store(st), nPages = Math.max(1, Math.ceil(tuckedList.length / PER_PAGE)), page = Math.max(0, Math.min(m.page | 0, pagesOf(st, settings, carry).filter((p) => p.view === "tucked").length - 1));
  const markPic = (key) => (key ? slot(R.marks.masters[key], key === "comingOut" ? [12, 12] : [16, 16]) : "");
  const pic = (mb, size, v) => mibiReq(req, st, mb, size, settings, light, v);
  const variant = (mb, size, v, kind) => mibiVariantReq(req, mibiRequest(st, mb, size, settings, light, v), kind);
  const W96 = R.resident.adult, H48 = R.house.place.picture, C144 = R.card.picture;
  const targets = [], resolve = {}, regions = {};
  const add = (id, group, extra = {}) => { targets.push({ id, group, ...extra }); };

  // ---- the field ----
  let state = S.inRoom(st, shown).length ? "rest" : "empty", lw = null, present = [];
  if (view === "room") {
    const pin = carry && cm.room === shown && !S.inStore(cm) ? String(cm.id) : m.pin != null ? String(m.pin) : m.seen != null ? String(m.seen) : null;   // rules.show.pin: the mibi in hand, the one brought in from the house view, the one last seen up close; the ring on a sleeper does not wake it (a ring that pinned would reshuffle the room under it)
    lw = livingOf({ view: "vivarium", st, sv, settings, docked, light, room: shown, time: m.time, now: m.now, restRules: m.restRules, rules: m.rules, ui: { focus: pin }, arrived: m.arrived, motionSets: m.motionSets }, R, req, ph, frame.light);
    const order = new Map(S.inRoom(st, shown).map((mb, i) => [String(mb.id), i]));
    const residents = lw.residents.slice().sort((a, b) => order.get(a.id) - order.get(b.id));
    for (const p of residents) { const mb = S.mibiById(st, +p.id), k = markOf(st, sv, mb, settings); if (k) p.mark = markPic(k); if (carry && +p.id === carry.id) p.carried = true; }
    for (const p of lw.sleepers) { const mb = S.mibiById(st, +p.id), k = markOf(st, sv, mb, settings); if (k) p.mark = markPic(k); }
    const region = roomRegion(req, shown, light), rd = roomData(shown);
    regions["window"] = { picture: region.base, edge: { crop: rd.crop, painting: [1024, 568], keep: (rd.keep ?? []).map((k) => ({ id: k.id, form: k.box, ...(k.leaves ? { leaves: k.leaves } : {}) })), joins: (rd.joins ?? []).map((j, i) => ({ id: `${region.id}-join-${i}`, form: j.rect })) } };   // the layout check's facts (vivarium.json layout.given), never drawn from
    regions.room = region; regions.residents = residents; if (lw.bed) regions.bed = lw.bed;
    // a mibi coming out: its silhouette on the drop spot it was brought out to (m.tucked.spot), else the first drop spot no other one holds
    const coming = S.inRoom(st, shown).filter((mb) => S.comingOut(st, mb)), used = new Set(), drops = rd.drops ?? [];
    const res = coming.map((mb) => { let k = Number.isInteger(mb.tucked.spot) && !used.has(mb.tucked.spot) ? mb.tucked.spot : drops.findIndex((_, i) => !used.has(i)); used.add(k);
      return { id: String(mb.id), name: mb.name, spot: k, picture: variant(mb, W96, "vivarium", "outline"), figure: figureOf(st, mb, W96, settings, "vivarium") ?? [0, 0, W96[0], W96[1]], mark: markPic("comingOut") }; });
    regions.reserved = { items: res };
    // the drop spots while a mibi is in hand: as many as the room has free places (its own place counts as free while it is in hand), in their order, off the reserved ones
    if (carry) { const here = S.inRoom(st, shown).filter((x) => x.id !== carry.id).length, free = Math.max(0, S.ROOM - here), items = [];
      for (let k = 0; k < drops.length && items.length < free; k++) if (!used.has(k)) items.push(k);
      regions.drops = { items }; }
    else regions.drops = { items: [] };
    present = [...residents.filter((p) => p.shown !== false).map((p) => +p.id), ...lw.sleepers.map((p) => +p.id), ...res.map((r) => +r.id)];
    const group = carry ? "hand" : "resident";
    for (const mb of S.inRoom(st, shown)) if (present.includes(mb.id)) add("resident." + mb.id, group);
    if (carry) for (const k of regions.drops.items) add("drop." + k, "hand");
  } else if (view === "tucked") {
    const items = tuckedList.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE).map((mb) => ({ id: String(mb.id), name: mb.name, picture: variant(mb, W96, "vivarium", "cold"), figure: figureOf(st, mb, W96, settings, "vivarium") ?? [0, 0, W96[0], W96[1]] }));
    const here = !!carry && carry.kind !== "out" && items.length < PER_PAGE && page === Math.floor(tuckedList.length / PER_PAGE);
    regions.tucked = { page, pages: Math.max(nPages, here ? page + 1 : 1), items, here };
    for (const it of items) add("tucked." + it.id, "house");
    if (here) add("tucked.here", "house");
    regions["window"] = { picture: "" };
  } else {
    const bands = [];
    for (let j = 0; j < 4; j++) {
      if (j < nRooms) {
        const inside = S.inRoom(st, j), places = Array.from({ length: S.ROOM }, (_, k) => {
          const mb = inside.find((x) => x.slot === k); if (!mb) return { id: carry ? `house.free.${j}.${k}` : "", state: "free", picture: "", mark: "" };
          const w = whereOf(st, sv, mb), v = w === "carried" ? "dark" : w === "coming" || (carry && carry.id === mb.id && m.focus !== "house." + mb.id) ? "outline" : null;   // the carried one's own place, the hand elsewhere: its silhouette (§3)
          return { id: "house." + mb.id, state: w === "room" ? "mibi" : w, picture: v ? variant(mb, H48, "vivariumHouse", v) : pic(mb, H48, "vivariumHouse"), mark: markPic(markOf(st, sv, mb, settings, true)) }; });
        bands.push({ kind: "room", name: S.ROOM_NAMES[j], full: inside.length >= S.ROOM, places });
      } else if (j === nRooms) { const p = S.roomPrice(st, settings); bands.push({ kind: "add", name: p == null ? "" : Sg.chip.add, price: p == null ? "" : S.priceText(p, 0, 0), full: false, places: [] }); }
      else bands.push({ kind: "later", name: "", full: false, places: [] });
    }
    { const shownN = tuckedList.length > PER_PAGE ? HOUSE_SHOWN : tuckedList.length, places = tuckedList.slice(0, shownN).map((mb) => ({ id: "house." + mb.id, state: "store", picture: variant(mb, H48, "vivariumHouse", "cold"), mark: "" }));
      if (tuckedList.length > PER_PAGE) places.push({ id: "house.more", state: "more", picture: "", mark: "", more: fill(Sg.band.more, { n: tuckedList.length - HOUSE_SHOWN }) });
      bands.push({ kind: "cold", name: Sg.band.tucked, count: String(tuckedList.length), full: false, places, mark: markPic("tucked") }); }
    regions.house = { bands };
    bands.forEach((b, j) => { for (const p of b.places) if (p.id) add(p.id, "house", { band: j }); if (b.kind === "add" && b.name && !carry) add("house.add", "house", { band: j }); if (b.kind === "cold" && carry && carry.kind !== "out" && !S.inStore(cm)) add("house.cold", "house", { band: j }); });
    regions["window"] = { picture: "" };
  }
  // the flips while carrying: the previous and next pages (§3), pseudo targets the host turns into the flip
  const pages = pagesOf(st, settings, carry), at = view === "room" ? pages.findIndex((p) => p.view === "room" && p.room === shown) : view === "tucked" ? pages.findIndex((p) => p.view === "tucked" && p.page === page) : -1;
  if (carry && at > 0) add("flip.prev", "flipprev"); if (carry && at >= 0 && at < pages.length - 1) add("flip.next", "flipnext");
  if (!carry && view === "tucked") { if (page > 0) add("flip.prev", "flipprev"); if (page < nPages - 1) add("flip.next", "flipnext"); }

  // ---- the chip row ----
  const chips = [];
  for (let i = 0; i < nRooms; i++) { const n = S.inRoom(st, i).length, c = roomData(i).chip; chips.push({ id: String(i), kind: "room", name: S.ROOM_NAMES[i], count: n >= S.ROOM ? Sg.chip.full : fill(Sg.chip.count, { a: n }), full: n >= S.ROOM, lit: view === "room" && i === shown, picture: c && sizeOf(c).join("x") === "128x32" ? slot(withLight(c, light), [128, 32]) : "" }); }
  if (nRooms < S.ROOMS_MAX) { const p = S.roomPrice(st, settings); chips.push({ id: "new", kind: "new", name: Sg.chip.add, count: p == null ? "" : S.priceText(p, 0, 0), full: false, lit: false, picture: "" }); }
  chips.push({ id: "all", kind: "all", name: Sg.chip.all, count: "", full: false, lit: view === "house", picture: "" });
  chips.push({ id: "tucked", kind: "tucked", name: Sg.chip.tucked, count: String(tuckedList.length), full: false, lit: view === "tucked", picture: markPic("tucked") });
  regions.rooms = { items: chips };
  if (!carry) chips.forEach((c, i) => add("room." + c.id, "room", { index: i }));

  // ---- the ring ----
  const has = (id) => targets.some((t) => t.id === id);
  const targetOf = (id) => { if (id == null) return null; for (const p of ["resident.", "house.", "tucked."]) if (has(p + id)) return p + id; return null; };
  const lit = "room." + (view === "house" ? "all" : view === "tucked" ? "tucked" : String(shown));
  const firstMibi = targets.find((t) => idOf(t.id) != null)?.id ?? null;
  // the card's mibi: the carried one; else the one under the ring; else the last the card showed
  const focusId = idOf(m.focus), cardFrom = (f) => (carry ? carry.id : idOf(f) ?? (/^plate\./.test(f ?? "") && m.last != null ? m.last : null));
  let cur = null;
  if (m.focus && (has(m.focus) || /^plate\./.test(m.focus))) cur = m.focus;
  else if (focusId != null) cur = targetOf(focusId);
  if (!cur && m.focus == null && m.seen != null) cur = targetOf(m.seen);
  if (!cur && carry) cur = targetOf(carry.id) ?? targets.find((t) => t.group === "hand" || t.id === "tucked.here" || t.id === "house.cold")?.id ?? null;
  if (!cur && !all.length) cur = "plate.incubator";
  if (!cur) cur = view === "room" && state === "empty" ? lit : firstMibi ?? lit;

  // ---- the card ----
  const cid = cardFrom(cur), entryMibi = idOf((m.seen != null ? targetOf(m.seen) : null) ?? firstMibi), cmb = cid != null ? S.mibiById(st, cid) : m.last != null ? S.mibiById(st, m.last) : entryMibi != null ? S.mibiById(st, entryMibi) : null;   // the card keeps the last mibi seen
  let card, plates = [];
  if (!all.length) {
    card = { state: "empty", name: Sg.card.empty, looks: [], mark: "", words: "", picture: "", plates: [{ id: "plate.incubator", verb: Sg.plate.incubator, price: "", held: false }], why: Sg.why.incubator };
    plates = [{ id: "plate.incubator", act: "incubator", verb: Sg.plate.incubator, price: "", held: false, why: Sg.why.incubator }];
  } else if (cmb && !cmb.released) {
    plates = platesOf(st, sv, cmb, settings, Sg, docked);
    const mk = S.inStore(cmb) ? "tucked" : markOf(st, sv, cmb, settings, true);
    card = { state: "mibi", id: String(cmb.id), name: cmb.name, looks: looksLine(st, cmb, Sg), mark: markPic(mk), words: stateWords(st, sv, cmb, settings, Sg), picture: pic(cmb, C144, "vivariumCard"), figure: figureOf(st, cmb, C144, settings, "vivariumCard") ?? [0, 0, C144[0], C144[1]],
      plates: plates.map((p) => ({ id: p.id, verb: p.verb, price: p.price, held: p.held })), why: "" };
  } else card = { state: "none", name: "", looks: [], mark: "", words: "", picture: "", plates: [], why: "" };
  regions.card = card;
  if (!carry && !pick) for (const p of card.plates) add(p.id, "plate", { index: +p.id.slice(6) || 0 });
  if (cur && /^plate\./.test(cur) && !has(cur)) cur = firstLive(plates) ?? lit;

  // ---- the selectors ----
  resolve["plate.first"] = firstLive(plates) ?? "";
  resolve["room.lit"] = lit;
  resolve["card.of"] = (card.id && targetOf(+card.id)) || lit;
  if (has("flip.prev")) resolve["flip.prev"] = "flip.prev"; if (has("flip.next")) resolve["flip.next"] = "flip.next";
  const nav = { pages, at, targets, plates, lit };
  if (view !== "room") Object.assign(resolve, goOf({ view, cur, targets, regions, carry, chips, lit, plateFirst: resolve["plate.first"], shown: page }));

  // ---- the pick of two and the carry, for the face ----
  if (pick && pa) regions.pick = { id: String(pa.id) };
  if (carry) {
    const own = view === "room" && cm.room === shown && !S.inStore(cm) && !S.comingOut(st, cm);
    regions.carry = { id: String(cm.id), name: cm.name, own, picture: pic(cm, view === "house" ? H48 : W96, view === "house" ? "vivariumHouse" : "vivarium"), figure: figureOf(st, cm, view === "house" ? H48 : W96, settings, view === "house" ? "vivariumHouse" : "vivarium") ?? [0, 0, W96[0], W96[1]],
      outline: own ? variant(cm, W96, "vivarium", "outline") : "", mark: markPic(markOf(st, sv, cm, settings)) };
  }

  // ---- the bottom line and the why line ----
  const why = whyOf({ st, sv, settings, Sg, cur, carry, cm, pick, pa, plates, card, view, shown, regions });
  card.why = why ?? card.why ?? "";
  const line = lineOf({ st, sv, settings, Sg, spec, cur, carry, cm, pick, pa, plates, card, pods });
  if (S.waitsForPlace(st, settings)) line.need = Sg.need.bud;
  const props = { state, view, regions, focus: { cur, targets: targets.map(({ id, group, index }) => ({ id, group, ...(index != null ? { index } : {}) })), resolve } };
  return { props, line, requests, top: {}, nav: { ...nav, cur, card: card.id != null ? +card.id : null } };
}

// The house view's and the cold page's walk (§5, §3): the go.* selectors for the target under the ring, by band (or rail) and place
function goOf({ view, cur, targets, regions, carry, chips, lit, plateFirst }) {
  const out = {}, field = targets.filter((t) => t.group === "house");
  const posOf = (id) => {
    if (view === "tucked") { const T = regions.tucked, i = id === "tucked.here" ? T.items.length : T.items.findIndex((x) => "tucked." + x.id === id); return i < 0 ? null : { row: i >> 2, col: i & 3 }; }
    const B = regions.house.bands; for (let j = 0; j < B.length; j++) { if ((id === "house.add" && B[j].kind === "add") || (id === "house.cold" && B[j].kind === "cold")) return { row: j, col: id === "house.cold" ? Math.min(B[j].places.length, 7) : 0 }; const k = B[j].places.findIndex((p) => p.id === id); if (k >= 0) return { row: j, col: k }; }
    return null; };
  const items = field.map((t) => ({ id: t.id, ...posOf(t.id) })).filter((t) => t.row != null);
  const here = items.find((t) => t.id === cur);
  const near = (row, col) => { const inRow = items.filter((t) => t.row === row); return inRow.length ? inRow.reduce((b, t) => (Math.abs(t.col - col) < Math.abs(b.col - col) ? t : b)).id : null; };
  if (here) {
    const left = items.filter((t) => t.row === here.row && t.col < here.col).sort((a, b) => b.col - a.col)[0]?.id, right = items.filter((t) => t.row === here.row && t.col > here.col).sort((a, b) => a.col - b.col)[0]?.id;
    const rows = [...new Set(items.map((t) => t.row))].sort((a, b) => a - b), up = rows.filter((r) => r < here.row).pop(), down = rows.find((r) => r > here.row);
    out["go.left"] = left ?? (targets.some((t) => t.id === "flip.prev") ? "flip.prev" : "");
    out["go.right"] = right ?? (targets.some((t) => t.id === "flip.next") ? "flip.next" : carry ? "" : plateFirst);
    out["go.up"] = up != null ? near(up, here.col) : carry ? "" : lit;
    out["go.down"] = down != null ? near(down, here.col) : "";
  } else if (/^room\./.test(cur ?? "")) {   // ▼ from a chip: the field's nearest mibi under it (the chip's centre against the places')
    const i = chips.findIndex((c) => "room." + c.id === cur), cx = i < 4 ? 16 + 136 * i + 64 : i === chips.length - 1 ? 856 : 624, top = items.filter((t) => t.row === Math.min(...items.map((q) => q.row)));
    const colX = (t) => (view === "tucked" ? [64, 224, 384, 544][t.col] + 48 : 58 + 84 * t.col);
    out["go.down"] = top.length ? top.reduce((b, t) => (Math.abs(colX(t) - cx) < Math.abs(colX(b) - cx) ? t : b)).id : "";
  }
  return out;
}

// The why line (§2, §3's table, §5): only when it adds something
function whyOf({ st, sv, settings, Sg, cur, carry, cm, pick, pa, plates, view, shown, regions }) {
  const W = Sg.why;
  if (carry && cm) {
    const out = carry.kind === "out" || S.inStore(cm);
    if (/^drop\./.test(cur ?? "")) { if (out) return fill(W.out, { p: S.bringOutPrice(st, settings), n: S.TUCK.turns }); if (cm.room === shown) return ""; const a = S.inRoom(st, shown).length; return fill(W.move, { Room: S.ROOM_NAMES[shown], a, b: a + 1 }); }
    if (/^house\.free\./.test(cur ?? "")) { const r = +cur.split(".")[2]; if (out) return fill(W.out, { p: S.bringOutPrice(st, settings), n: S.TUCK.turns }); if (cm.room === r) return ""; const a = S.inRoom(st, r).length; return fill(W.move, { Room: S.ROOM_NAMES[r], a, b: a + 1 }); }
    if (cur === "tucked.here" || cur === "house.cold") { const b = S.tuckBlock(st, sv, cm, settings); if (b?.key === "short") return fill(W.short, { p: b.price, e: b.have }); if (b?.key === "last") return W.last; if (b) return W.onboard; return fill(W.tuck, { p: S.bringOutPrice(st, settings), n: S.TUCK.turns }); }
    const o = S.mibiById(st, idOf(cur));
    if (o && o.id !== cm.id) {
      if (out) return W.outPlace;
      if (S.isCarried(st, sv, o)) return fill(W.away, { name: o.name });
      if (S.comingOut(st, o)) { const n = S.backIn(st, o); return fill(n === 1 ? W.keptOne : W.kept, { name: o.name, n }); }
      return o.room !== cm.room && S.inRoom(st, o.room).length >= S.ROOM ? fill(W.full, { Room: S.ROOM_NAMES[o.room] }) : "";
    }
    return "";
  }
  if (pick && pa) {
    const o = S.mibiById(st, idOf(cur)); if (!o || o.id === pa.id) return "";
    const p = partnersOf(st, sv, pa, settings).all.find((q) => q.m.id === o.id); if (!p) return "";
    if (p.why === "kind") return W.partnerKind; if (p.why === "tucked") return W.partnerTucked; if (p.why === "out") return W.partnerOut;
    if (p.why === "young") { const n = youngTurns(st, o, settings); return fill(W.partnerYoung, { n: n ?? 1 }); }
    return fill(W.pairKin, { kin: kinWord(Sg.kin, p.k) });
  }
  const p = plates.find((x) => x.id === cur); return p ? p.why : "";
}

// The bottom line (vivarium.json bottomLine): ✓ names its act with the name; no context line; ← Home, Put back or Drop the pick
function lineOf({ st, sv, settings, Sg, cur, carry, cm, pick, pa, plates, card, pods }) {
  const F = Sg.foot, line = { ok: null, subject: "", back: carry ? Sg.putBack : pick ? Sg.dropPick : Sg.back, need: null };
  if (carry && cm) {
    const out = carry.kind === "out" || S.inStore(cm), o = S.mibiById(st, idOf(cur));
    if (/^drop\.|^house\.free\./.test(cur ?? "")) { line.ok = out ? fill(F.bringOut, { name: cm.name, p: S.bringOutPrice(st, settings) }) : fill(F.setDown, { name: cm.name }); if (out && S.bringOutBlock(st, sv, cm, null, settings)) line.ok = null; }
    else if (cur === "tucked.here" || cur === "house.cold") line.ok = S.tuckBlock(st, sv, cm, settings) ? null : fill(F.tuck, { name: cm.name, p: S.tuckPrice(st, settings) });
    else if (o && o.id === cm.id) line.ok = out ? null : fill(F.setDown, { name: cm.name });
    else if (o) line.ok = out || S.swapBlock(st, sv, cm, o)?.key === "carried" || S.swapBlock(st, sv, cm, o)?.key === "coming" ? null : fill(F.swap, { a: cm.name, b: o.name });
    return line;
  }
  if (pick && pa) { const o = S.mibiById(st, idOf(cur)), p = o && partnersOf(st, sv, pa, settings).ranked.find((q) => q.m.id === o.id); line.ok = p ? fill(F.breed, { a: pa.name, b: o.name }) : null; return line; }
  if (cur === "room.new") { const p = S.roomPrice(st, settings), block = S.addRoomBlock(st, settings); line.ok = Sg.newRoom.action; line.price = S.priceText(p, 0, 0); if (block) { const icons = S.shortIcons(st, p, 0, 0); line.dim = true; line.short = icons; line.need = fill(pods.strings.needMoreFrom[S.shortFrom(st, p, 0, 0)], { icons }); } return line; }
  if (cur === "house.add") { const p = S.roomPrice(st, settings); if (p != null) { line.ok = Sg.newRoom.action; line.price = S.priceText(p, 0, 0); } return line; }
  if (cur === "house.more" || /^room\./.test(cur ?? "") || /^flip\./.test(cur ?? "")) return line;
  if (cur === "plate.incubator") { line.ok = F.plate.incubator; return line; }
  const p = plates.find((x) => x.id === cur);
  if (p) { if (p.held) return line; const key = { look: "look", move: "move", takeAlong: "takealong", bringHome: "bringhome", tuckAway: "tuck", bringOut: "out", breed: "breed", return: "return" }[p.act]; line.ok = fill(F.plate[key], { name: card.name, p: priceFig(p.price) }); return line; }
  const o = S.mibiById(st, idOf(cur)); if (o) { const mv = platesOf(st, sv, o, settings, Sg, S.docked(st)).find((x) => x.act === (S.inStore(o) ? "bringOut" : "move")); if (!mv || !mv.held) line.ok = fill(F.pickUp, { name: o.name }); }   // held (a traveller, one coming out): no ✓, the message plate
  return line;
}
const priceFig = (s) => String(s ?? "").replace(/[^0-9]/g, "");
