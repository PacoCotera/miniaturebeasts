// The Vivarium as props (the collection v2 design; vivarium.json): pure selectors from the state, the Vivarium's UI (UI.viv) and the presentation to the props of the face's one screen with three fields. Props name *what*, never *where*:
// ids, strings, states, seeds, flags and the focus targets by id; no rectangle, no measure, no layout rule (the words place everything from vivarium.json and rooms.json). The output is plain JSON:
// { props (state, view, regions, focus), line (the bottom line, for the frame), requests (the pictures the host makes ready before the props), top, nav }. `nav` is not sent: the card's mibi and the plates, for intents/vivarium.mjs.
// Runs in Node, tested there (tests/vivarium-props.test.mjs); the shape is vivarium.props.json.
//   m: { st, sv, settings, docked, light, focus (the ring: a target id, or null for the way in), seen (the mibi last seen up close), pin (a mibi shown in its room), last (the mibi the card showed last), view ("room"), time, now, restRules, rules, arrived, motionSets }
import * as S from "../state.mjs";
import { livingOf, mibiReq, mibiRequest, mibiVariantReq, figureOf } from "./home-props.mjs";
import { roomRegion, roomData, roomName, withLight } from "./room-props.mjs";
import { frameOf } from "../genome.mjs";
import { drawnLooks } from "../looks.mjs";
import { fill } from "./words.mjs";
import { req as reqOf, slot as slotOf, ph as phOf } from "./requests.mjs";

const sizeOf = (id) => id.match(/-(\d+)x(\d+)$/).slice(1).map(Number);
const living = (st) => st.mibis.filter((m) => !m.released);
// the mibi a target names (resident.<id>), or null
export const idOf = (t) => { const r = /^resident\.(\d+)$/.exec(t ?? ""); return r ? +r[1] : null; };
// Where a mibi is: "room" (present in a room), "carried" (with the Companion, its place kept), "coming" (coming out: its place reserved), "store" (tucked away)
export function whereOf(st, sv, m) {
  if (S.inStore(m)) return "store";
  if (S.comingOut(st, m)) return "coming";
  if (S.isCarried(st, sv, m)) return "carried";
  return "room";
}
// The tucked away in the order they went in
export const store = (st) => S.tuckedAway(st);
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
// The partners of `a` for the partner pick: every other mibi of the player with the reason one is not; the eligible ones ranked by kinship, furthest first
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

// What holds a pick up (✓ on a mibi, §3): the message plate's { held, why, plate } for a traveller, one coming out or one tucked away (whose pick up is its Bring out), else null. The card has no Move plate (the sign-off of the build: five plates)
export function pickHeld(st, sv, m, settings, Sg, docked) {
  if (S.inStore(m)) { const p = platesOf(st, sv, m, settings, Sg, docked).find((x) => x.act === "bringOut"); return p && p.held ? p : null; }
  const W = Sg.why, w = whereOf(st, sv, m), nB = S.backIn(st, m);
  if (w === "carried") return { held: true, why: W.onboard, plate: "onboard" };
  if (w === "coming") return { held: true, why: nB === 1 ? W.comingOne : fill(W.coming, { n: nB }), plate: "coming" };
  return null;
}
// The card's five plates (§2 with the build's sign-off: Look · Take along / Bring home · Tuck away / Bring out · Breed · Return; manager-props plates as built): { id, act, verb, price, held, why, plate (the message plate's key when held) }
export function platesOf(st, sv, m, settings, Sg, docked) {
  const W = Sg.why, P = Sg.plate, w = whereOf(st, sv, m), stage = S.mibiStage(st, m, settings), Room = m.room != null ? S.roomName(st, m.room) : "", nB = S.backIn(st, m);
  const held = (why, plate) => ({ held: true, why, plate });
  const coming = held(nB === 1 ? W.comingOne : fill(W.coming, { n: nB }), "coming"), onboard = held(W.onboard, "onboard"), tucked = held(W.tucked, "tucked");
  const out = [];
  out.push({ act: "look", verb: P.look, price: "", held: false, why: "" });
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
const firstLive = (plates) => (plates.find((p) => !p.held) ?? plates[0])?.id ?? null;   // the card reach rule: ▼ from a mibi lands on its first live plate (Look)

// The state line of the card (§2, §6): its one state's words, or "" (young has no word; an adult with nothing to report has no line)
export function stateWords(st, sv, m, settings, Sg) {
  const key = markOf(st, sv, m, settings, true), T = Sg.state;
  if (S.inStore(m)) return fill(T.tucked, { n: (m.tucked.turn | 0) + 1 });   // the turn as the top bar counts it (the rules count from 0)
  if (key === "companionAway") return T.away; if (key === "companionDocked") return T.docked;
  if (key === "comingOut") { const n = S.backIn(st, m); return n === 1 ? T.comingOne : fill(T.coming, { n }); }
  if (key === "bonded") return T.bonded; if (key === "elder") return T.elder;
  return "";
}

export function vivariumBuild(m, spec, frame, home, pods) {
  const { st, sv, settings } = m, requests = [], req = reqOf(requests), R = spec.regions, Sg = spec.strings, docked = !!m.docked, light = m.light ?? "day";
  const slot = slotOf(req, "its master (the collection v2 design)"), ph = phOf(req, "its master (the collection v2 design)");
  const nRooms = S.roomCount(st, settings), shown = Math.max(0, Math.min(st.face?.room ?? 0, nRooms - 1)), view = "room";
  const all = living(st), tuckedList = S.tuckedAway(st);
  const markPic = (key) => (key ? slot(R.marks.masters[key], key === "comingOut" ? [12, 12] : [16, 16]) : "");
  const pic = (mb, size, v) => mibiReq(req, st, mb, size, settings, light, v);
  const variant = (mb, size, v, kind) => mibiVariantReq(req, mibiRequest(st, mb, size, settings, light, v), kind);
  const W96 = R.resident.adult, C144 = R.card.picture;
  const targets = [], resolve = {}, regions = {};
  const add = (id, group, extra = {}) => { targets.push({ id, group, ...extra }); };

  // ---- the field: the room shown, alive ----
  const state = S.inRoom(st, shown).length ? "rest" : "empty";
  const pin = m.pin != null ? String(m.pin) : m.seen != null ? String(m.seen) : null;   // rules.show.pin: the one brought in, the one last seen up close; the room shows it while it is
  const lw = livingOf({ view: "vivarium", st, sv, settings, docked, light, room: shown, time: m.time, now: m.now, restRules: m.restRules, rules: m.rules, ui: { focus: pin }, arrived: m.arrived, motionSets: m.motionSets }, R, req, ph, frame.light);
  const order = new Map(S.inRoom(st, shown).map((mb, i) => [String(mb.id), i]));
  const residents = lw.residents.slice().sort((a, b) => order.get(a.id) - order.get(b.id));
  for (const p of residents) { const mb = S.mibiById(st, +p.id), k = markOf(st, sv, mb, settings); if (k) p.mark = markPic(k); }
  for (const p of lw.sleepers) { const mb = S.mibiById(st, +p.id), k = markOf(st, sv, mb, settings); if (k) p.mark = markPic(k); }
  const region = roomRegion(req, shown, light), rd = roomData(shown);
  regions["window"] = { picture: region.base, edge: { crop: rd.crop, painting: [1024, 568], keep: (rd.keep ?? []).map((k) => ({ id: k.id, form: k.box, ...(k.leaves ? { leaves: k.leaves } : {}) })), joins: (rd.joins ?? []).map((j, i) => ({ id: `${region.id}-join-${i}`, form: j.rect, ...(j.leaves ? { leaves: j.leaves } : {}) })) } };
  regions.room = region; regions.residents = residents; if (lw.bed) regions.bed = lw.bed;
  // a mibi coming out: its silhouette on the drop spot it was brought out to (m.tucked.spot), else the first drop spot no other one holds
  const coming = S.inRoom(st, shown).filter((mb) => S.comingOut(st, mb)), used = new Set(), drops = rd.drops ?? [];
  const res = coming.map((mb) => { let k = Number.isInteger(mb.tucked.spot) && !used.has(mb.tucked.spot) ? mb.tucked.spot : drops.findIndex((_, i) => !used.has(i)); used.add(k);
    return { id: String(mb.id), name: mb.name, spot: k, picture: variant(mb, W96, "vivarium", "outline"), figure: figureOf(st, mb, W96, settings, "vivarium") ?? [0, 0, W96[0], W96[1]], mark: markPic("comingOut") }; });
  regions.reserved = { items: res };
  regions.drops = { items: [] };
  const present = [...residents.filter((p) => p.shown !== false).map((p) => +p.id), ...lw.sleepers.map((p) => +p.id), ...res.map((r) => +r.id)];
  for (const mb of S.inRoom(st, shown)) if (present.includes(mb.id)) add("resident." + mb.id, "resident");

  // ---- the chip row ----
  const chips = [];
  for (let i = 0; i < nRooms; i++) { const n = S.inRoom(st, i).length, c = roomData(i).chip; chips.push({ id: String(i), kind: "room", name: S.roomName(st, i), count: n >= S.ROOM ? Sg.chip.full : fill(Sg.chip.count, { a: n }), full: n >= S.ROOM, lit: i === shown, picture: c && sizeOf(c).join("x") === "128x32" ? slot(withLight(c, light), [128, 32]) : "" }); }
  if (nRooms < S.ROOM_THEMES.length && S.canAddRoom(st, settings)) { const p = S.roomPrice(st, settings); chips.push({ id: "new", kind: "new", name: Sg.chip.add, count: p == null ? "" : S.priceText(p, 0, 0), full: false, lit: false, picture: "" }); }
  regions.rooms = { items: chips };
  chips.forEach((c, i) => add("room." + c.id, "room", { index: i }));

  // ---- the ring ----
  const has = (id) => targets.some((t) => t.id === id);
  const targetOf = (id) => (id != null && has("resident." + id) ? "resident." + id : null);
  const lit = "room." + String(shown);
  const firstMibi = targets.find((t) => idOf(t.id) != null)?.id ?? null;
  const focusId = idOf(m.focus), cardFrom = (f) => idOf(f) ?? (/^plate\./.test(f ?? "") && m.last != null ? m.last : null);
  let cur = null;
  if (m.focus && (has(m.focus) || /^plate\./.test(m.focus))) cur = m.focus;
  else if (focusId != null) cur = targetOf(focusId);
  if (!cur && m.focus == null && m.seen != null) cur = targetOf(m.seen);
  if (!cur && !all.length) cur = "plate.incubator";
  if (!cur) cur = state === "empty" ? lit : firstMibi ?? lit;

  // ---- the card ----
  // the card keeps the last mibi seen: the one under the ring, else the last the card showed, else the one last seen up close, else the first of the house (the card is never blank while there is a mibi)
  const cid = cardFrom(cur), entryMibi = idOf((m.seen != null ? targetOf(m.seen) : null) ?? firstMibi), byId = (id) => { const x = id != null ? S.mibiById(st, id) : null; return x && !x.released ? x : null; };
  const houseFirst = () => { for (let i = 0; i < nRooms; i++) { const r = S.inRoom(st, i).slice().sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0)); if (r.length) return r[0]; } return tuckedList[0] ?? all[0] ?? null; };
  const cmb = cid != null ? byId(cid) : byId(m.last) ?? byId(entryMibi) ?? byId(m.seen) ?? houseFirst();
  let card, plates = [];
  if (!all.length) {
    card = { state: "empty", name: Sg.card.empty, looks: [], mark: "", words: "", picture: "", plates: [{ id: "plate.incubator", verb: Sg.plate.incubator, price: "", held: false }], why: Sg.why.incubator };
    plates = [{ id: "plate.incubator", act: "incubator", verb: Sg.plate.incubator, price: "", held: false, why: Sg.why.incubator }];
  } else if (cmb) {
    plates = platesOf(st, sv, cmb, settings, Sg, docked);
    const mk = S.inStore(cmb) ? "tucked" : markOf(st, sv, cmb, settings, true);
    card = { state: "mibi", id: String(cmb.id), name: cmb.name, looks: looksLine(st, cmb, Sg), mark: markPic(mk), words: stateWords(st, sv, cmb, settings, Sg), picture: pic(cmb, C144, "vivariumCard"), figure: figureOf(st, cmb, C144, settings, "vivariumCard") ?? [0, 0, C144[0], C144[1]],
      plates: plates.map((p) => ({ id: p.id, verb: p.verb, price: p.price, held: p.held })), why: "" };
  } else card = { state: "none", name: "", looks: [], mark: "", words: "", picture: "", plates: [], why: "" };
  regions.card = card;
  for (const p of card.plates) add(p.id, "plate", { index: +p.id.slice(6) || 0 });
  if (cur && /^plate\./.test(cur) && !has(cur)) cur = firstLive(plates) ?? lit;

  // ---- the selectors ----
  resolve["plate.first"] = firstLive(plates) ?? "";
  resolve["room.lit"] = lit;
  resolve["card.of"] = (card.id && targetOf(+card.id)) || lit;
  const nav = { targets, plates, lit };

  // ---- the bottom line and the why line ----
  const p0 = plates.find((x) => x.id === cur);
  card.why = (p0 ? p0.why : null) ?? card.why ?? "";
  const line = lineOf({ st, sv, settings, Sg, spec, cur, plates, card, pods });
  if (S.waitsForPlace(st, settings)) line.need = Sg.need.bud;
  const props = { state, view, regions, focus: { cur, targets: targets.map(({ id, group, index }) => ({ id, group, ...(index != null ? { index } : {}) })), resolve } };
  return { props, line, requests, top: {}, nav: { ...nav, cur, card: card.id != null ? +card.id : null } };
}

// The bottom line (vivarium.json bottomLine): ✓ names its act with the name; no context line; ← Home
function lineOf({ st, sv, settings, Sg, cur, plates, card, pods }) {
  const F = Sg.foot, line = { ok: null, subject: "", back: Sg.back, need: null };
  if (cur === "room.new") { const p = S.roomPrice(st, settings), block = S.addRoomBlock(st, settings); line.ok = Sg.newRoom.action; line.price = S.priceText(p, 0, 0); if (block) { const icons = S.shortIcons(st, p, 0, 0); line.dim = true; line.short = icons; line.need = fill(pods.strings.needMoreFrom[S.shortFrom(st, p, 0, 0)], { icons }); } return line; }
  if (/^room\./.test(cur ?? "")) return line;
  if (cur === "plate.incubator") { line.ok = F.plate.incubator; return line; }
  const p = plates.find((x) => x.id === cur);
  if (p) { if (p.held) return line; const key = { look: "look", takeAlong: "takealong", bringHome: "bringhome", tuckAway: "tuck", bringOut: "out", breed: "breed", return: "return" }[p.act]; line.ok = fill(F.plate[key], { name: card.name, p: priceFig(p.price) }); return line; }
  const o = S.mibiById(st, idOf(cur)); if (o && !pickHeld(st, sv, o, settings, Sg, S.docked(st))) line.ok = fill(F.pickUp, { name: o.name });   // held (a traveller, one coming out): no ✓, the message plate
  return line;
}
const priceFig = (s) => String(s ?? "").replace(/[^0-9]/g, "");
