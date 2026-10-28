// The Vivarium's whole as props (lvgl-switch.md §2.1, §4 V; vivarium.json): pure selectors from the state, the focus and the presentation to the props of the face's whole. Props name *what*, never *where*: ids, strings, states, seeds,
// flags and the focus targets by id; no rectangle, no measure, no layout rule (the words place everything from vivarium.json). The output is plain JSON:
// { props (state, regions, focus), line (the bottom line, for the frame), requests (the pictures the host makes ready before the props) }.
// Runs in Node, tested there (tests/vivarium-props.test.mjs); the shape is vivarium.props.json.
//   m: { st, sv, settings, docked, light, focus (the ring: a target id, or null for the way in), seen (the mibi last seen up close, or null), prev (the room shown before the ring moved to another room's chip, while the 200 ms swap runs: { tiles: [the old places' thumbnail ids] }, or null) }
import * as S from "../state.mjs";
import { livingOf, mibiReq } from "./home-props.mjs";
import { roomRegion, roomData, withLight } from "./room-props.mjs";
import { listForm } from "../../../ui/specs/derive.mjs";
import { fill, spell } from "./words.mjs";
import { req as reqOf, slot as slotOf, ph as phOf } from "./requests.mjs";


export function vivariumBuild(m, spec, frame, home, pods) {
  const { st, sv, settings } = m, requests = [], req = reqOf(requests), R = spec.regions, docked = !!m.docked;
  const ph = phOf(req, "its master (station-layouts.md, The Vivarium: the whole)");
  const nRooms = S.roomCount(st, settings), shown = Math.min(st.face?.room ?? 0, nRooms - 1), carried = S.carriedIds(st, sv), housed = S.inRoom(st, shown), out = (mb) => carried.includes(mb.id) && !docked;   // out: with the Companion, away
  const state = housed.length ? "rest" : "empty";
  const L = frame.light, room = shown, lw = livingOf({ view: "vivarium", st, sv, settings, docked, light: m.light, room, time: m.time, restRules: m.restRules, motionSets: m.motionSets }, R, req, ph, L);
  const bayOf = new Map(housed.map((mb, i) => [String(mb.id), i]));
  const residents = lw.residents.slice().sort((a, b) => bayOf.get(a.id) - bayOf.get(b.id));   // the walkers in bay order: the face steps them in this order
  const region = roomRegion(req, room, m.light);
  const regions = {
    window: { picture: region.base },   // rows 120 to 560 of Idle's painting of the light, 1:1 (the face shows the window; the plates stand while it is not on the face)
    room: region, residents, ...(lw.bed ? { bed: lw.bed } : {}),   // the bed in every state of a room that has one (Roots): the nest alone while docked, with its mark while away (an empty whole has no residents and no sleepers)
    tiles: { glyph: frame.regions.marks.companion.away, items: [] },   // an out mibi's tile shows the Companion's outline glyph (the top bar's away mark)
  };
  // a tile a place: the room shown's mibis in slot order, then the free places; a housed one shows its thumbnail, one out with the Companion its glyph
  const n = S.ROOM, tw = listForm(R.tiles, n).first[2], slot = slotOf(req, "the device plate (fix 2: placed 1:1)");
  const tiles = housed.slice(0, n).map((mb) => ({ id: String(mb.id), state: out(mb) ? "out" : "housed", picture: out(mb) ? "" : mibiReq(req, st, mb, [48, 48], settings), well: slot(`plate-well-${tw}x48`, [tw, 48]), from: "" }));   // a housed place is its well by form (fix 2 F4); a free place is the recess the face draws
  while (tiles.length < n) tiles.push({ id: "", state: "free", picture: "", well: "", from: "" });
  tiles.forEach((t, i) => { t.from = m.prev?.tiles?.[i] ?? ""; });   // the swap: the old room's place i's thumbnail, dithered out while this one dithers in (clear when either has none)
  regions.tiles.items = tiles;
  // the rooms pane: a chip a room (the room shown one step up), then the new-room chip while a room can still be added; its lamp is mint when the next room can be paid, stone otherwise (never amber)
  const chipPic = (i) => { const c = roomData(i).chip; return c ? slot(withLight(c, m.light), [56, 40]) : ""; };   // rooms.json rooms.<id>.chip: null until the art director cuts it
  const chips = Array.from({ length: nRooms }, (_, i) => ({ id: String(i), state: i === shown ? "shown" : "room", picture: chipPic(i), lamp: "" }));
  if (nRooms < S.ROOMS_MAX) chips.push({ id: "new", state: "new", picture: "", lamp: slot(spec.regions.chips.lamps[S.addRoomBlock(st, settings) ? "short" : "payable"], [8, 8]) });
  regions.rooms = { items: chips };
  // the focus: the residents in bay order (a sleeper in its bay's place), then the tiles in bay order; the ring on the target the way in names
  const asleep = new Set(lw.sleepers.map((p) => p.id)), atHome = new Set(residents.map((p) => p.id)), targets = [];
  for (const mb of housed) if (atHome.has(String(mb.id)) || asleep.has(String(mb.id))) targets.push({ id: "resident." + mb.id, group: "resident" });
  for (const t of tiles) if (t.state !== "free") targets.push({ id: "tile." + t.id, group: "tile" });
  for (const c of chips) targets.push({ id: "room." + c.id, group: "room" });   // the chips last: the rooms, then the new-room chip
  const seen = m.seen != null ? String(m.seen) : null, has = (id) => targets.some((t) => t.id === id);
  // the way in: the mibi last seen up close in the room shown, else the first resident, else the first place; an empty room puts the ring on its chip, and the ring is on nothing only when the whole Vivarium is empty (focus.entry)
  const entry = !S.housed(st).length ? "room" : state === "empty" ? "room." + shown : seen && has("resident." + seen) ? "resident." + seen : seen && has("tile." + seen) ? "tile." + seen : targets.find((t) => t.group === "resident")?.id ?? targets[0]?.id ?? "room";
  const cur = m.focus && has(m.focus) ? m.focus : entry;
  // the selectors: the focused resident's own tile; the focused tile's mibi's resident, null when it is out with the Companion (the graph's rule then takes the first resident)
  const resolve = {};
  if (cur.startsWith("resident.")) resolve["tile.of"] = "tile." + cur.slice(9);
  if (cur.startsWith("tile.")) resolve["resident.of"] = has("resident." + cur.slice(5)) ? "resident." + cur.slice(5) : "";
  resolve["room.shown"] = "room." + shown;   // the place ◀ from the first place goes to
  const focus = { cur, targets, resolve };

  // the bottom line (vivarium.json bottomLine): look at the focused mibi, what it is, ← Home
  const Sg = spec.strings, stageWord = (mb) => home.strings.stages[S.mibiStage(st, mb, settings)] ?? S.mibiStage(st, mb, settings);
  let line = { ok: null, subject: Sg.empty, back: Sg.back, need: null };
  const placesFree = (i) => { const k = S.ROOM - S.inRoom(st, i).length; return k === S.ROOM ? Sg.empty : k === 0 ? Sg.full : k === 1 ? Sg.oneFree : fill(Sg.placesFree, { n: spell(k) }); };   // C4: where there is room
  if (cur === "room.new") {   // C2, C3: ✓ Add a room with its price, eight more places; short of Energy the dimmed cap, the short icons and pods.json's words for where it comes from
    const p = S.roomPrice(st, settings), block = S.addRoomBlock(st, settings);
    line = { ok: Sg.newRoom.action, price: S.priceText(p, 0, 0), subject: Sg.newRoom.context, back: Sg.back, need: null };
    if (block) { const icons = S.shortIcons(st, p, 0, 0); line.dim = true; line.short = icons; line.need = fill(pods.strings.needMoreFrom[S.shortFrom(st, p, 0, 0)], { icons }); }
  } else if (cur.startsWith("room.")) line = { ok: null, subject: placesFree(+cur.slice(5)), back: Sg.back, need: null };   // a room's chip: no ✓ cap; the context says where there is room
  else if (cur !== "room") {
    const id = +cur.slice(cur.indexOf(".") + 1), mb = S.mibiById(st, id), isOut = !!mb && out(mb), sl = asleep.has(String(id));
    const wait = !!mb && !isOut && lw.residents.concat(lw.sleepers).find((p) => p.id === String(id))?.waiting;
    const words = { a: mb ? S.aAn(stageWord(mb)).split(" ")[0] : "", stage: mb ? stageWord(mb) : "", species: mb ? S.spName(mb) : "" };
    const subject = isOut ? Sg.out : wait ? Sg.painting : fill(sl ? Sg.sleeper : Sg.resident, words);
    line = { ok: mb ? fill(Sg.look, { name: mb.name }) : null, subject, back: Sg.back, need: null };
  }
  const top = nRooms >= 2 ? { readout: { text: S.ROOM_NAMES[shown], mark: null } } : {};   // the crumb: the room shown's name after the title (frame.json regions.top.readout, as the Library's), only once there is more than one room
  return { props: { state, regions, focus }, line, requests, top };
}
