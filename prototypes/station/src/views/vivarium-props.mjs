// The Vivarium's whole as props (lvgl-switch.md §2.1, §4 V; vivarium.json): pure selectors from the state, the focus and the presentation to the props of the face's whole. Props name *what*, never *where*: ids, strings, states, seeds,
// flags and the focus targets by id; no rectangle, no measure, no layout rule (the words place everything from vivarium.json). The output is plain JSON:
// { props (state, regions, focus), line (the bottom line, for the frame), requests (the pictures the host makes ready before the props) }.
// Runs in Node, tested there (tests/vivarium-props.test.mjs); the shape is vivarium.props.json.
//   m: { st, sv, settings, docked, light, focus (the ring: a target id, or null for the way in), seen (the mibi last seen up close, or null) }
import * as S from "../state.mjs";
import { livingOf, mibiReq } from "./home-props.mjs";
import { paintingOf } from "./idle-props.mjs";
import { listForm } from "../../../ui/specs/derive.mjs";

const fill = (t, o) => t.replace(/\{(\w+)\}/g, (_, k) => (k in o ? o[k] : "{" + k + "}"));

export function vivariumBuild(m, spec, frame, home) {
  const { st, sv, settings } = m, requests = [], req = (r) => { requests.push(r); return r.id; }, R = spec.regions, docked = !!m.docked;
  const ph = (id, size, hollow = false) => req({ kind: "ph", id, size, hollow, until: "its master (station-layouts.md, The Vivarium: the whole)" });
  const carried = S.carriedIds(st, sv), housed = S.housed(st).slice().sort((a, b) => a.bay - b.bay), out = (mb) => carried.includes(mb.id) && !docked;   // out: with the Companion, away
  const state = housed.length ? "rest" : "empty";
  const L = frame.light, lw = livingOf({ view: "vivarium", st, sv, settings, docked, light: m.light, time: m.time, restRules: m.restRules, motionSets: m.motionSets }, R, req, ph, L);
  const bayOf = new Map(housed.map((mb, i) => [String(mb.id), i]));
  const residents = lw.residents.slice().sort((a, b) => bayOf.get(a.id) - bayOf.get(b.id));   // the walkers in bay order: the face steps them in this order
  const regions = {
    window: { picture: paintingOf(req, frame, m.light) },   // rows 120 to 560 of Idle's painting of the light, 1:1 (the face shows the window; the plates stand while it is not on the face)
    residents, bed: lw.bed,   // the bed in every state: the nest alone while docked, with its mark while away (an empty whole has no residents and no sleepers)
    tiles: { glyph: frame.regions.marks.companion.away, items: [] },   // an out mibi's tile shows the Companion's outline glyph (the top bar's away mark)
  };
  // a tile a bay: the housed mibis in bay order, then the free bays; a housed one shows its thumbnail, one out with the Companion its glyph
  const n = S.bayCount(st, settings), tw = listForm(R.tiles, n).name === "full" ? 152 : 72, slot = (id, size) => req({ kind: "slot", id, master: id, size, until: "the device plate (fix 2: placed 1:1)" });
  const tiles = housed.slice(0, n).map((mb) => ({ id: String(mb.id), state: out(mb) ? "out" : "housed", picture: out(mb) ? "" : mibiReq(req, st, mb, [48, 48], settings), well: slot(`plate-well-${tw}x48`, [tw, 48]) }));   // fix 2 F4: the tile is its well by form; a free bay draws nothing
  while (tiles.length < n) tiles.push({ id: "", state: "free", picture: "", well: "" });
  regions.strip = { plate: n ? slot("plate-device-992x64", [992, 64]) : "" };
  regions.tiles.items = tiles;
  // the focus: the residents in bay order (a sleeper in its bay's place), then the tiles in bay order; the ring on the target the way in names
  const asleep = new Set(lw.sleepers.map((p) => p.id)), atHome = new Set(residents.map((p) => p.id)), targets = [];
  for (const mb of housed) if (atHome.has(String(mb.id)) || asleep.has(String(mb.id))) targets.push({ id: "resident." + mb.id, group: "resident" });
  for (const t of tiles) if (t.state !== "free") targets.push({ id: "tile." + t.id, group: "tile" });
  const seen = m.seen != null ? String(m.seen) : null, has = (id) => targets.some((t) => t.id === id);
  const entry = state === "empty" ? "room" : seen && has("resident." + seen) ? "resident." + seen : seen && has("tile." + seen) ? "tile." + seen : targets.find((t) => t.group === "resident")?.id ?? targets[0]?.id ?? "room";
  const cur = m.focus && has(m.focus) ? m.focus : entry;
  // the selectors: the focused resident's own tile; the focused tile's mibi's resident, null when it is out with the Companion (the graph's rule then takes the first resident)
  const resolve = {};
  if (cur.startsWith("resident.")) resolve["tile.of"] = "tile." + cur.slice(9);
  if (cur.startsWith("tile.")) resolve["resident.of"] = has("resident." + cur.slice(5)) ? "resident." + cur.slice(5) : "";
  const focus = { cur, targets, resolve };

  // the bottom line (vivarium.json bottomLine): look at the focused mibi, what it is, ← Home
  const Sg = spec.strings, stageWord = (mb) => home.strings.stages[S.mibiStage(st, mb, settings)] ?? S.mibiStage(st, mb, settings);
  let line = { ok: null, subject: Sg.empty, back: Sg.back, need: null };
  if (cur !== "room") {
    const id = +cur.slice(cur.indexOf(".") + 1), mb = S.mibiById(st, id), isOut = !!mb && out(mb), sl = asleep.has(String(id));
    const wait = !!mb && !isOut && lw.residents.concat(lw.sleepers).find((p) => p.id === String(id))?.waiting;
    const words = { a: mb ? S.aAn(stageWord(mb)).split(" ")[0] : "", stage: mb ? stageWord(mb) : "", species: mb ? S.spName(mb) : "" };
    const subject = isOut ? Sg.out : wait ? Sg.painting : fill(sl ? Sg.sleeper : Sg.resident, words);
    line = { ok: mb ? fill(Sg.look, { name: mb.name }) : null, subject, back: Sg.back, need: null };
  }
  return { props: { state, regions, focus }, line, requests };
}
